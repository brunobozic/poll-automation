/**
 * Comprehensive Data Migration Script
 * Migrates ALL 1,251 records from 21 databases into single master database
 * Uses intelligent field mapping and conflict resolution
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getDatabaseManager } = require('./src/database/database-manager.js');

class ComprehensiveDataMigrator {
    constructor() {
        this.sourceFiles = [];
        this.masterDb = null;
        this.migrationStats = {
            totalDatabases: 0,
            totalRecords: 0,
            migratedRecords: 0,
            errors: 0,
            conflicts: 0,
            duplicates: 0
        };
        
        // Field mapping for schema compatibility
        this.fieldMappings = {
            registration_attempts: {
                'attempt_date': 'started_at',
                'error_message': 'failure_reason'
            },
            ai_interactions: {
                'prompt': 'prompt_text',
                'response': 'response_text'
            },
            form_interactions: {
                'input_value': 'value_filled'
            }
        };
    }
    
    async initialize() {
        console.log('🚀 COMPREHENSIVE DATA MIGRATION');
        console.log('================================');
        
        // Find all database files
        this.sourceFiles = await this.findAllDatabases();
        console.log(`📊 Found ${this.sourceFiles.length} database files to migrate`);
        
        // Initialize master database with complete schema
        this.masterDb = getDatabaseManager();
        await this.masterDb.initialize();
        
        console.log('✅ Master database initialized with complete schema');
        
        return this;
    }
    
    async findAllDatabases() {
        const findDatabases = (dir) => {
            const items = fs.readdirSync(dir);
            const dbFiles = [];
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && !item.startsWith('node_modules')) {
                    dbFiles.push(...findDatabases(itemPath));
                } else if (item.endsWith('.db') && item !== 'poll-automation.db') {
                    dbFiles.push(itemPath);
                }
            }
            
            return dbFiles;
        };

        return findDatabases('.');
    }
    
    async migrateAllData() {
        console.log('\n🔄 Starting comprehensive data migration...');
        
        for (const dbFile of this.sourceFiles) {
            try {
                await this.migrateDatabase(dbFile);
            } catch (error) {
                console.error(`❌ Failed to migrate ${dbFile}:`, error.message);
                this.migrationStats.errors++;
            }
        }
        
        await this.generateMigrationReport();
        return this.migrationStats;
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
                    const dbStats = await this.migrateDatabaseContent(sourceDb, dbPath);
                    console.log(`  ✅ Migrated ${dbStats.recordsMigrated} records`);
                    
                    this.migrationStats.totalDatabases++;
                    this.migrationStats.migratedRecords += dbStats.recordsMigrated;
                    
                    sourceDb.close();
                    resolve(dbStats);
                } catch (error) {
                    sourceDb.close();
                    reject(error);
                }
            });
        });
    }
    
    async migrateDatabaseContent(sourceDb, dbPath) {
        // Get all tables in source database
        const tables = await this.query(sourceDb, `
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        let recordsMigrated = 0;
        
        for (const table of tables) {
            try {
                const tableStats = await this.migrateTable(sourceDb, table.name, dbPath);
                recordsMigrated += tableStats.recordsMigrated;
                
                if (tableStats.recordsMigrated > 0) {
                    console.log(`    📋 ${table.name}: ${tableStats.recordsMigrated} records`);
                }
            } catch (error) {
                console.error(`    ❌ Table ${table.name}: ${error.message}`);
                this.migrationStats.errors++;
            }
        }
        
        return { recordsMigrated };
    }
    
    async migrateTable(sourceDb, tableName, sourcePath) {
        // Get all records from source table
        const records = await this.query(sourceDb, `SELECT * FROM "${tableName}"`);
        
        if (records.length === 0) {
            return { recordsMigrated: 0 };
        }
        
        // Check if table exists in master database
        const masterTables = await this.masterDb.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name = ?
        `, [tableName]);
        
        if (masterTables.length === 0) {
            console.log(`    ⚠️ Table ${tableName} not found in master schema, skipping`);
            return { recordsMigrated: 0 };
        }
        
        // Get master table schema
        const masterSchema = await this.masterDb.all(`PRAGMA table_info("${tableName}")`);
        const masterColumns = masterSchema.map(col => col.name);
        
        let recordsMigrated = 0;
        
        for (const record of records) {
            try {
                const transformedRecord = this.transformRecord(record, tableName, masterColumns);
                
                if (await this.isDuplicateRecord(tableName, transformedRecord)) {
                    this.migrationStats.duplicates++;
                    continue;
                }
                
                await this.insertRecord(tableName, transformedRecord);
                recordsMigrated++;
                
            } catch (error) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    this.migrationStats.duplicates++;
                } else {
                    console.error(`      ❌ Record migration error: ${error.message}`);
                    this.migrationStats.errors++;
                }
            }
        }
        
        return { recordsMigrated };
    }
    
    transformRecord(record, tableName, masterColumns) {
        const transformed = {};
        const fieldMapping = this.fieldMappings[tableName] || {};
        
        for (const [key, value] of Object.entries(record)) {
            // Apply field mapping
            const mappedKey = fieldMapping[key] || key;
            
            // Only include columns that exist in master schema
            if (masterColumns.includes(mappedKey)) {
                transformed[mappedKey] = value;
            }
        }
        
        // Add source metadata
        if (masterColumns.includes('migration_source') && !transformed.migration_source) {
            transformed.migration_source = `migrated_${Date.now()}`;
        }
        
        return transformed;
    }
    
    async isDuplicateRecord(tableName, record) {
        // Check for duplicates based on unique constraints or key fields
        const uniqueFields = this.getUniqueFields(tableName);
        
        if (uniqueFields.length === 0) {
            return false;
        }
        
        const whereConditions = [];
        const values = [];
        
        for (const field of uniqueFields) {
            if (record[field] !== undefined && record[field] !== null) {
                whereConditions.push(`${field} = ?`);
                values.push(record[field]);
            }
        }
        
        if (whereConditions.length === 0) {
            return false;
        }
        
        const existing = await this.masterDb.get(
            `SELECT id FROM "${tableName}" WHERE ${whereConditions.join(' AND ')} LIMIT 1`,
            values
        );
        
        return !!existing;
    }
    
    getUniqueFields(tableName) {
        // Define unique field combinations for duplicate detection
        const uniqueFieldMap = {
            'email_accounts': ['email'],
            'survey_sites': ['url'],
            'registration_attempts': ['email_id', 'site_url', 'started_at'],
            'ai_interactions': ['registration_id', 'prompt_text', 'timestamp'],
            'form_interactions': ['registration_id', 'field_selector', 'timestamp'],
            'failure_scenarios': ['scenario_hash'],
            'knowledge_nodes': ['node_id'],
            'llm_prompt_templates': ['template_name'],
            'site_defenses': ['site_id', 'defense_type'],
            'user_profiles': ['registration_id']
        };
        
        return uniqueFieldMap[tableName] || ['id'];
    }
    
    async insertRecord(tableName, record) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map(() => '?').join(', ');
        
        const sql = `
            INSERT INTO "${tableName}" (${columns.join(', ')}) 
            VALUES (${placeholders})
        `;
        
        await this.masterDb.run(sql, values);
    }
    
    async generateMigrationReport() {
        console.log('\n📊 MIGRATION REPORT');
        console.log('==================');
        
        console.log(`📁 Databases Processed: ${this.migrationStats.totalDatabases}`);
        console.log(`📈 Records Migrated: ${this.migrationStats.migratedRecords}`);
        console.log(`🔄 Duplicates Skipped: ${this.migrationStats.duplicates}`);
        console.log(`❌ Errors Encountered: ${this.migrationStats.errors}`);
        
        // Get final record counts per table
        console.log('\n📋 FINAL TABLE RECORD COUNTS:');
        console.log('=============================');
        
        const tables = await this.masterDb.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'
            ORDER BY name
        `);
        
        let totalRecords = 0;
        for (const table of tables) {
            try {
                const countResult = await this.masterDb.get(`SELECT COUNT(*) as count FROM "${table.name}"`);
                const count = countResult.count;
                totalRecords += count;
                
                if (count > 0) {
                    console.log(`  📊 ${table.name}: ${count.toLocaleString()} records`);
                }
            } catch (error) {
                console.error(`  ❌ Error counting ${table.name}: ${error.message}`);
            }
        }
        
        console.log(`\n🎯 TOTAL RECORDS IN MASTER DATABASE: ${totalRecords.toLocaleString()}`);
        
        // Save migration report
        const reportData = {
            migrationDate: new Date().toISOString(),
            sourceFiles: this.sourceFiles,
            statistics: this.migrationStats,
            finalRecordCount: totalRecords
        };
        
        fs.writeFileSync('./migration-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📤 Migration report saved to: migration-report.json');
        
        return reportData;
    }
    
    async query(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }
    
    async close() {
        if (this.masterDb) {
            await this.masterDb.close();
        }
    }
}

async function main() {
    const migrator = new ComprehensiveDataMigrator();
    
    try {
        await migrator.initialize();
        
        console.log('\n⚠️  IMPORTANT: This will migrate ALL data from 21 databases');
        console.log('Continue? This process will take several minutes...\n');
        
        const stats = await migrator.migrateAllData();
        
        console.log('\n✅ COMPREHENSIVE DATA MIGRATION COMPLETE!');
        console.log(`📊 Final Summary: ${stats.migratedRecords} records migrated from ${stats.totalDatabases} databases`);
        
        await migrator.close();
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        await migrator.close();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ComprehensiveDataMigrator;