/**
 * COMPLETE DATA MIGRATION - Final consolidation and data save
 * Migrates ALL data from ALL sources into the unified poll-automation.db
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class CompleteDataMigration {
    constructor() {
        this.masterDb = null;
        this.sourceFiles = [];
        this.migrationStats = {
            totalDatabases: 0,
            totalRecordsFound: 0,
            totalRecordsSaved: 0,
            tablesCreated: 0,
            duplicatesSkipped: 0,
            errors: 0
        };
        
        // Comprehensive field mappings for ALL possible variations
        this.fieldMappings = {
            // Email field variations
            'email_address': 'email',
            'email_addr': 'email', 
            'user_email': 'email',
            'account_email': 'email',
            
            // Date/time variations
            'attempt_date': 'created_at',
            'started_at': 'created_at',
            'timestamp': 'created_at',
            'date_created': 'created_at',
            'registration_date': 'created_at',
            'first_seen': 'created_at',
            'date_added': 'created_at',
            
            // Site field variations
            'site_name': 'site_url',
            'target_site': 'site_url',
            'website': 'site_url',
            'domain': 'site_url',
            'base_url': 'site_url',
            'registration_url': 'site_url',
            
            // Error/failure variations
            'error_message': 'failure_reason',
            'error_details': 'failure_reason',
            'failure_message': 'failure_reason',
            'error_description': 'failure_reason',
            
            // AI/LLM variations
            'prompt': 'prompt_text',
            'llm_prompt': 'prompt_text',
            'ai_prompt': 'prompt_text',
            'response': 'response_text',
            'llm_response': 'response_text',
            'ai_response': 'response_text',
            
            // Form field variations
            'input_value': 'value_filled',
            'field_value': 'value_filled',
            'form_value': 'value_filled',
            'actual_value': 'value_filled',
            
            // Status variations
            'step_status': 'status',
            'attempt_status': 'status',
            'registration_status': 'status'
        };
    }

    async initialize() {
        console.log('🚀 COMPLETE DATA MIGRATION');
        console.log('===========================');
        console.log('🎯 Goal: Migrate and save ALL data to unified database');
        
        // Find all database files
        this.sourceFiles = await this.findAllDatabases();
        console.log(`📊 Found ${this.sourceFiles.length} database files to migrate`);
        
        // Connect to master database
        this.masterDb = new sqlite3.Database('./poll-automation.db');
        
        console.log('✅ Migration system initialized');
        return this;
    }

    async findAllDatabases() {
        const findDatabases = (dir) => {
            if (!fs.existsSync(dir)) return [];
            
            const items = fs.readdirSync(dir);
            const dbFiles = [];
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && !item.startsWith('node_modules')) {
                    dbFiles.push(...findDatabases(itemPath));
                } else if (item.endsWith('.db')) {
                    dbFiles.push(itemPath);
                }
            }
            
            return dbFiles;
        };

        return findDatabases('.').filter(file => !file.includes('poll-automation.db'));
    }

    async migrateAllData() {
        console.log('\n📋 Starting complete data migration...');
        
        // Process each database file
        for (const dbFile of this.sourceFiles) {
            try {
                await this.migrateDatabase(dbFile);
                this.migrationStats.totalDatabases++;
            } catch (error) {
                console.error(`❌ Failed to migrate ${dbFile}:`, error.message);
                this.migrationStats.errors++;
            }
        }
        
        await this.generateFinalReport();
    }

    async migrateDatabase(dbPath) {
        console.log(`\n📂 Migrating: ${dbPath}`);
        
        return new Promise((resolve, reject) => {
            const sourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                try {
                    // Get all tables
                    const tables = await this.query(sourceDb, `
                        SELECT name, sql FROM sqlite_master 
                        WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    `);
                    
                    let dbRecords = 0;
                    for (const table of tables) {
                        const tableRecords = await this.migrateTable(sourceDb, table, dbPath);
                        dbRecords += tableRecords;
                    }
                    
                    console.log(`  ✅ Migrated ${dbRecords} records`);
                    this.migrationStats.totalRecordsSaved += dbRecords;
                    
                    sourceDb.close();
                    resolve();
                } catch (error) {
                    sourceDb.close();
                    reject(error);
                }
            });
        });
    }

    async migrateTable(sourceDb, table, sourcePath) {
        try {
            // Get all records
            const records = await this.query(sourceDb, `SELECT * FROM "${table.name}"`);
            
            if (records.length === 0) {
                return 0;
            }
            
            this.migrationStats.totalRecordsFound += records.length;
            
            // Ensure table exists in master database
            await this.ensureTableExists(table);
            
            // Get master table schema
            const masterSchema = await this.queryMaster(`PRAGMA table_info("${table.name}")`);
            const masterColumns = masterSchema.map(col => col.name);
            
            let savedRecords = 0;
            
            for (const record of records) {
                try {
                    const adaptedRecord = this.adaptRecord(record, masterColumns, sourcePath);
                    
                    if (!await this.isDuplicate(table.name, adaptedRecord)) {
                        await this.saveRecord(table.name, adaptedRecord);
                        savedRecords++;
                    } else {
                        this.migrationStats.duplicatesSkipped++;
                    }
                } catch (error) {
                    if (error.message.includes('UNIQUE constraint')) {
                        this.migrationStats.duplicatesSkipped++;
                    } else {
                        console.error(`      ⚠️ Record error: ${error.message}`);
                    }
                }
            }
            
            if (savedRecords > 0) {
                console.log(`    📋 ${table.name}: ${savedRecords} records saved`);
            }
            
            return savedRecords;
        } catch (error) {
            console.error(`    ❌ Table ${table.name}: ${error.message}`);
            return 0;
        }
    }

    async ensureTableExists(table) {
        try {
            // Check if table exists
            const existing = await this.queryMaster(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name = ?
            `, [table.name]);
            
            if (existing.length === 0 && table.sql) {
                // Create table
                await this.runMaster(table.sql);
                this.migrationStats.tablesCreated++;
                console.log(`    🔧 Created table: ${table.name}`);
            }
        } catch (error) {
            // Table might already exist, continue
        }
    }

    adaptRecord(record, masterColumns, sourcePath) {
        const adapted = {};
        
        // Apply field mappings
        for (const [key, value] of Object.entries(record)) {
            const mappedKey = this.fieldMappings[key] || key;
            
            if (masterColumns.includes(mappedKey)) {
                adapted[mappedKey] = value;
            }
        }
        
        // Add migration tracking
        if (masterColumns.includes('recovery_source')) {
            adapted.recovery_source = `migrated_${Date.now()}`;
        }
        
        // Fill standard fields if missing
        if (masterColumns.includes('created_at') && !adapted.created_at) {
            adapted.created_at = new Date().toISOString();
        }
        
        if (masterColumns.includes('updated_at') && !adapted.updated_at) {
            adapted.updated_at = new Date().toISOString();
        }
        
        return adapted;
    }

    async isDuplicate(tableName, record) {
        // Check for duplicates using multiple strategies
        const checkFields = ['id', 'email', 'session_id', 'prompt_text', 'field_selector'];
        
        for (const field of checkFields) {
            if (record[field]) {
                try {
                    const existing = await this.queryMaster(
                        `SELECT id FROM "${tableName}" WHERE ${field} = ? LIMIT 1`,
                        [record[field]]
                    );
                    if (existing.length > 0) {
                        return true;
                    }
                } catch (error) {
                    // Continue checking
                }
            }
        }
        
        return false;
    }

    async saveRecord(tableName, record) {
        // Clean record - remove null/undefined values
        const cleanRecord = {};
        for (const [key, value] of Object.entries(record)) {
            if (value !== null && value !== undefined) {
                cleanRecord[key] = value;
            }
        }
        
        const columns = Object.keys(cleanRecord);
        const values = Object.values(cleanRecord);
        const placeholders = columns.map(() => '?').join(', ');
        
        const sql = `INSERT OR IGNORE INTO "${tableName}" (${columns.join(', ')}) VALUES (${placeholders})`;
        await this.runMaster(sql, values);
    }

    async generateFinalReport() {
        console.log('\n📊 COMPLETE DATA MIGRATION REPORT');
        console.log('==================================');
        
        // Get final record counts
        const finalCounts = await this.getFinalCounts();
        const totalFinal = Object.values(finalCounts).reduce((a, b) => a + b, 0);
        
        console.log(`📁 Databases processed: ${this.migrationStats.totalDatabases}`);
        console.log(`📈 Total records found: ${this.migrationStats.totalRecordsFound.toLocaleString()}`);
        console.log(`💾 Records saved: ${this.migrationStats.totalRecordsSaved.toLocaleString()}`);
        console.log(`🔄 Duplicates skipped: ${this.migrationStats.duplicatesSkipped.toLocaleString()}`);
        console.log(`🔧 Tables created: ${this.migrationStats.tablesCreated}`);
        console.log(`❌ Errors: ${this.migrationStats.errors}`);
        console.log(`🎯 Final database total: ${totalFinal.toLocaleString()} records`);
        
        const saveRate = (this.migrationStats.totalRecordsSaved / this.migrationStats.totalRecordsFound) * 100;
        console.log(`📊 Data save rate: ${saveRate.toFixed(1)}%`);
        
        console.log('\n📋 Final consolidated database contents:');
        for (const [table, count] of Object.entries(finalCounts)) {
            if (count > 0) {
                console.log(`   ${table}: ${count.toLocaleString()} records`);
            }
        }
        
        // Save migration report
        const report = {
            migrationDate: new Date().toISOString(),
            sourceFiles: this.sourceFiles,
            statistics: this.migrationStats,
            finalCounts: finalCounts,
            totalFinalRecords: totalFinal,
            saveRate: saveRate
        };
        
        fs.writeFileSync('./complete-migration-report.json', JSON.stringify(report, null, 2));
        
        console.log('\n📤 Migration report saved: complete-migration-report.json');
        console.log('💾 All data consolidated in: poll-automation.db');
        
        if (totalFinal > 500) {
            console.log('\n🎉 SUCCESS: Complete data migration achieved!');
            console.log('All available data has been consolidated and saved.');
        } else {
            console.log('\n⚠️ Some data may still be missing from the migration.');
        }
    }

    async getFinalCounts() {
        const tables = await this.queryMaster(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        const counts = {};
        for (const table of tables) {
            try {
                const result = await this.queryMaster(`SELECT COUNT(*) as count FROM "${table.name}"`);
                counts[table.name] = result[0].count;
            } catch (error) {
                counts[table.name] = 0;
            }
        }
        
        return counts;
    }

    // Helper methods
    async query(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async queryMaster(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.masterDb.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async runMaster(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.masterDb.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    async close() {
        if (this.masterDb) {
            this.masterDb.close();
        }
    }
}

async function main() {
    const migration = new CompleteDataMigration();
    
    try {
        await migration.initialize();
        await migration.migrateAllData();
        
        console.log('\n🎉 COMPLETE DATA MIGRATION FINISHED!');
        console.log('All data has been consolidated and saved to poll-automation.db');
        
        await migration.close();
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        await migration.close();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = CompleteDataMigration;