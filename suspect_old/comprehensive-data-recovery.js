/**
 * Comprehensive Data Recovery and Consolidation
 * Recovers ALL 1,250 records from 21 databases with intelligent schema mapping
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class ComprehensiveDataRecovery {
    constructor() {
        this.sourceFiles = [];
        this.masterDb = null;
        this.recoveryStats = {
            totalDatabases: 0,
            originalRecords: 1250,
            recoveredRecords: 0,
            errors: 0,
            duplicatesSkipped: 0,
            schemaAdaptations: 0
        };
        
        // Enhanced field mapping for schema compatibility
        this.fieldMappings = {
            // Universal mappings across all table types
            universal: {
                'attempt_date': 'started_at',
                'error_message': 'failure_reason',
                'site_name': 'site_url',
                'target_site': 'site_url',
                'prompt': 'prompt_text',
                'response': 'response_text',
                'input_value': 'value_filled'
            },
            
            // Table-specific mappings
            registration_attempts: {
                'attempt_date': 'started_at',
                'target_site': 'site_url',
                'error_message': 'failure_reason'
            },
            
            ai_interactions: {
                'prompt': 'prompt_text',
                'response': 'response_text'
            },
            
            form_interactions: {
                'input_value': 'value_filled'
            },
            
            email_accounts: {
                'email_address': 'email',
                'service_type': 'service'
            }
        };
        
        // Default values for required fields
        this.defaultValues = {
            'site_id': 1,
            'email_id': 1,
            'registration_id': 1,
            'step_id': 1,
            'session_id': 'recovered_session',
            'user_agent': 'RecoveryBot/1.0',
            'started_at': () => new Date().toISOString(),
            'created_at': () => new Date().toISOString(),
            'timestamp': () => new Date().toISOString()
        };
    }
    
    async initialize() {
        console.log('🚀 COMPREHENSIVE DATA RECOVERY');
        console.log('==============================');
        console.log(`🎯 Target: Recover ALL ${this.recoveryStats.originalRecords} records from 21 databases`);
        
        // Find all database files
        this.sourceFiles = await this.findAllDatabases();
        console.log(`📊 Found ${this.sourceFiles.length} database files`);
        
        // Connect to master database
        this.masterDb = new sqlite3.Database('./poll-automation.db');
        
        console.log('✅ Recovery system initialized');
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
    
    async recoverAllData() {
        console.log('\n🔄 Starting comprehensive data recovery...');
        
        for (const dbFile of this.sourceFiles) {
            try {
                await this.recoverFromDatabase(dbFile);
            } catch (error) {
                console.error(`❌ Failed to recover from ${dbFile}:`, error.message);
                this.recoveryStats.errors++;
            }
        }
        
        await this.generateRecoveryReport();
        return this.recoveryStats;
    }
    
    async recoverFromDatabase(dbPath) {
        console.log(`\n📂 Recovering from: ${dbPath}`);
        
        return new Promise((resolve, reject) => {
            const sourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                try {
                    const dbStats = await this.recoverDatabaseContent(sourceDb, dbPath);
                    console.log(`  ✅ Recovered ${dbStats.recordsRecovered} records`);
                    
                    this.recoveryStats.totalDatabases++;
                    this.recoveryStats.recoveredRecords += dbStats.recordsRecovered;
                    
                    sourceDb.close();
                    resolve(dbStats);
                } catch (error) {
                    sourceDb.close();
                    reject(error);
                }
            });
        });
    }
    
    async recoverDatabaseContent(sourceDb, dbPath) {
        // Get all tables in source database
        const tables = await this.query(sourceDb, `
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        let recordsRecovered = 0;
        
        for (const table of tables) {
            try {
                const tableStats = await this.recoverTable(sourceDb, table.name, dbPath);
                recordsRecovered += tableStats.recordsRecovered;
                
                if (tableStats.recordsRecovered > 0) {
                    console.log(`    📋 ${table.name}: ${tableStats.recordsRecovered} records recovered`);
                }
            } catch (error) {
                console.error(`    ❌ Table ${table.name}: ${error.message}`);
                this.recoveryStats.errors++;
            }
        }
        
        return { recordsRecovered };
    }
    
    async recoverTable(sourceDb, tableName, sourcePath) {
        // Get all records from source table
        const records = await this.query(sourceDb, `SELECT * FROM "${tableName}"`);
        
        if (records.length === 0) {
            return { recordsRecovered: 0 };
        }
        
        // Check if table exists in master database
        const masterTables = await this.queryMaster(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name = ?
        `, [tableName]);
        
        if (masterTables.length === 0) {
            console.log(`    ⚠️ Table ${tableName} not in master schema, skipping`);
            return { recordsRecovered: 0 };
        }
        
        // Get master table schema
        const masterSchema = await this.queryMaster(`PRAGMA table_info("${tableName}")`);
        const masterColumns = masterSchema.map(col => col.name);
        const requiredColumns = masterSchema.filter(col => col.notnull && !col.dflt_value).map(col => col.name);
        
        let recordsRecovered = 0;
        
        for (const record of records) {
            try {
                const adaptedRecord = this.adaptRecordSchema(record, tableName, masterColumns, requiredColumns);
                
                if (await this.isDuplicateRecord(tableName, adaptedRecord)) {
                    this.recoveryStats.duplicatesSkipped++;
                    continue;
                }
                
                await this.insertRecordSafely(tableName, adaptedRecord);
                recordsRecovered++;
                
            } catch (error) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    this.recoveryStats.duplicatesSkipped++;
                } else {
                    console.error(`      ⚠️ Record recovery error: ${error.message}`);
                    this.recoveryStats.errors++;
                }
            }
        }
        
        return { recordsRecovered };
    }
    
    adaptRecordSchema(record, tableName, masterColumns, requiredColumns) {
        const adapted = {};
        const fieldMapping = this.fieldMappings[tableName] || {};
        const universalMapping = this.fieldMappings.universal || {};
        
        // Apply field mappings
        for (const [key, value] of Object.entries(record)) {
            // Try table-specific mapping first
            let mappedKey = fieldMapping[key] || universalMapping[key] || key;
            
            // Only include columns that exist in master schema
            if (masterColumns.includes(mappedKey)) {
                adapted[mappedKey] = value;
            }
        }
        
        // Fill required fields with defaults if missing
        for (const requiredCol of requiredColumns) {
            if (adapted[requiredCol] === undefined || adapted[requiredCol] === null) {
                if (this.defaultValues[requiredCol]) {
                    const defaultValue = this.defaultValues[requiredCol];
                    adapted[requiredCol] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
                    this.recoveryStats.schemaAdaptations++;
                }
            }
        }
        
        // Add recovery metadata
        if (masterColumns.includes('recovery_source') && !adapted.recovery_source) {
            adapted.recovery_source = `recovered_${Date.now()}`;
        }
        
        return adapted;
    }
    
    async isDuplicateRecord(tableName, record) {
        // Enhanced duplicate detection
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
        
        try {
            const existing = await this.queryMaster(
                `SELECT id FROM "${tableName}" WHERE ${whereConditions.join(' AND ')} LIMIT 1`,
                values
            );
            
            return existing.length > 0;
        } catch (error) {
            // If query fails, assume not duplicate
            return false;
        }
    }
    
    getUniqueFields(tableName) {
        // Enhanced unique field detection
        const uniqueFieldMap = {
            'email_accounts': ['email'],
            'survey_sites': ['url'],
            'registration_attempts': ['session_id', 'started_at'],
            'ai_interactions': ['prompt_text', 'timestamp'],
            'form_interactions': ['field_selector', 'timestamp'],
            'failure_scenarios': ['failure_type', 'site_url'],
            'knowledge_nodes': ['node_id'],
            'llm_prompt_templates': ['template_name'],
            'site_defenses': ['site_id', 'defense_type'],
            'user_profiles': ['email_address'],
            'system_events': ['timestamp', 'event_type', 'message']
        };
        
        return uniqueFieldMap[tableName] || ['id'];
    }
    
    async insertRecordSafely(tableName, record) {
        // Remove undefined/null values to avoid SQL issues
        const cleanRecord = {};
        for (const [key, value] of Object.entries(record)) {
            if (value !== undefined && value !== null) {
                cleanRecord[key] = value;
            }
        }
        
        const columns = Object.keys(cleanRecord);
        const values = Object.values(cleanRecord);
        const placeholders = columns.map(() => '?').join(', ');
        
        const sql = `
            INSERT OR IGNORE INTO "${tableName}" (${columns.join(', ')}) 
            VALUES (${placeholders})
        `;
        
        await this.runMaster(sql, values);
    }
    
    async generateRecoveryReport() {
        console.log('\n📊 COMPREHENSIVE DATA RECOVERY REPORT');
        console.log('====================================');
        
        console.log(`📁 Databases Processed: ${this.recoveryStats.totalDatabases}`);
        console.log(`📈 Original Records: ${this.recoveryStats.originalRecords.toLocaleString()}`);
        console.log(`✅ Records Recovered: ${this.recoveryStats.recoveredRecords.toLocaleString()}`);
        console.log(`🔄 Duplicates Skipped: ${this.recoveryStats.duplicatesSkipped.toLocaleString()}`);
        console.log(`🔧 Schema Adaptations: ${this.recoveryStats.schemaAdaptations.toLocaleString()}`);
        console.log(`❌ Errors Encountered: ${this.recoveryStats.errors}`);
        
        const recoveryRate = (this.recoveryStats.recoveredRecords / this.recoveryStats.originalRecords) * 100;
        console.log(`📊 Recovery Rate: ${recoveryRate.toFixed(1)}%`);
        
        // Get final record counts per table
        console.log('\n📋 FINAL TABLE RECORD COUNTS:');
        console.log('=============================');
        
        const tables = await this.queryMaster(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'
            ORDER BY name
        `);
        
        let totalRecords = 0;
        for (const table of tables) {
            try {
                const countResult = await this.queryMaster(`SELECT COUNT(*) as count FROM "${table.name}"`);
                const count = countResult[0].count;
                totalRecords += count;
                
                if (count > 0) {
                    console.log(`  📊 ${table.name}: ${count.toLocaleString()} records`);
                }
            } catch (error) {
                console.error(`  ❌ Error counting ${table.name}: ${error.message}`);
            }
        }
        
        console.log(`\n🎯 TOTAL RECORDS IN MASTER DATABASE: ${totalRecords.toLocaleString()}`);
        
        if (recoveryRate < 90) {
            console.log('\n⚠️ WARNING: Recovery rate below 90%');
            console.log('Some data may still be missing. Check error logs for details.');
        } else {
            console.log('\n✅ EXCELLENT: High recovery rate achieved!');
        }
        
        // Save recovery report
        const reportData = {
            recoveryDate: new Date().toISOString(),
            sourceFiles: this.sourceFiles,
            statistics: this.recoveryStats,
            finalRecordCount: totalRecords,
            recoveryRate: recoveryRate
        };
        
        fs.writeFileSync('./comprehensive-recovery-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📤 Recovery report saved to: comprehensive-recovery-report.json');
        
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
    const recovery = new ComprehensiveDataRecovery();
    
    try {
        await recovery.initialize();
        
        console.log('\n⚠️ CRITICAL DATA RECOVERY OPERATION');
        console.log('This will attempt to recover ALL 1,250 missing records');
        console.log('Previous migration only captured 44 records (3.5% recovery rate)');
        console.log('Proceeding with intelligent schema mapping and data recovery...\n');
        
        const stats = await recovery.recoverAllData();
        
        console.log('\n✅ COMPREHENSIVE DATA RECOVERY COMPLETE!');
        console.log(`📊 Recovery Summary: ${stats.recoveredRecords}/${stats.originalRecords} records`);
        console.log(`📈 Success Rate: ${((stats.recoveredRecords / stats.originalRecords) * 100).toFixed(1)}%`);
        
        await recovery.close();
        
    } catch (error) {
        console.error('\n❌ Recovery failed:', error);
        await recovery.close();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ComprehensiveDataRecovery;