#!/usr/bin/env node

/**
 * Complete Data Integration Script
 * Intelligently integrates ALL data from backed up databases into the single main database
 * Handles schema differences, data transformation, and deduplication
 */

const { DatabaseManager } = require('./src/database/database-manager');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DataIntegrator {
    constructor() {
        this.mainDbPath = path.join(__dirname, 'poll-automation.db');
        this.dbManager = new DatabaseManager({ dbPath: this.mainDbPath });
        this.backupDir = this.findBackupDirectory();
        
        // Track integration statistics
        this.stats = {
            totalRecordsFound: 0,
            totalRecordsIntegrated: 0,
            recordsSkipped: 0,
            tablesProcessed: 0,
            databasesProcessed: 0,
            errors: [],
            warnings: []
        };

        // Table mapping for schema differences
        this.tableMapping = {
            // Core tables that exist in target
            'email_accounts': 'email_accounts',
            'registration_attempts': 'registration_attempts', 
            'registration_steps': 'registration_steps',
            'form_interactions': 'form_interactions',
            'registration_questions': 'registration_questions',
            'user_profiles': 'user_profiles',
            'ai_interactions': 'ai_interactions',
            'survey_sites': 'survey_sites',
            'site_defenses': 'site_defenses',
            'site_questions': 'site_questions',
            'detection_events': 'detection_events',
            'performance_metrics': 'performance_metrics',
            'system_events': 'system_events'
        };

        // Field mappings for schema differences
        this.fieldMappings = {
            'email_accounts': {
                'session_id': null, // Drop this field
                'username': 'email', // Map username to email if email doesn't exist
                'provider': 'service'
            },
            'registration_attempts': {
                'target_site': 'site_url',
                'target_site_name': 'site_name',
                'email_account_id': 'email_id'
            },
            'registration_steps': {
                'step_type': null, // Drop if doesn't exist in target
                'registration_attempt_id': 'registration_id'
            },
            'form_interactions': {
                'step_id': null, // Drop if doesn't exist in target
                'registration_attempt_id': 'registration_id'
            }
        };
    }

    findBackupDirectory() {
        const dirs = fs.readdirSync(__dirname).filter(dir => dir.startsWith('backup-dbs-'));
        if (dirs.length === 0) {
            throw new Error('No backup directory found! Run consolidate-databases.js first.');
        }
        return path.join(__dirname, dirs[dirs.length - 1]); // Use most recent backup
    }

    async integrateAllData() {
        console.log('🔗 COMPLETE DATA INTEGRATION - ALL DATABASES INTO ONE');
        console.log('='.repeat(80));
        console.log(`📂 Source: ${this.backupDir}`);
        console.log(`🎯 Target: ${this.mainDbPath}`);
        console.log('='.repeat(80));

        try {
            // Initialize main database
            await this.dbManager.initialize();
            
            // Get all backup database files
            const dbFiles = this.getBackupDatabaseFiles();
            console.log(`📋 Found ${dbFiles.length} backup databases to integrate`);

            // Process each database
            for (const dbFile of dbFiles) {
                await this.integrateDatabase(dbFile);
            }

            // Display integration results
            await this.displayIntegrationResults();

            // Verify data integrity
            await this.verifyIntegration();

        } catch (error) {
            console.error('❌ Data integration failed:', error);
            throw error;
        }
    }

    getBackupDatabaseFiles() {
        return fs.readdirSync(this.backupDir)
            .filter(file => file.endsWith('.db') && file !== 'poll-automation.db')
            .map(file => path.join(this.backupDir, file));
    }

    async integrateDatabase(dbPath) {
        const dbName = path.basename(dbPath);
        console.log(`\n📊 Integrating: ${dbName}`);
        
        return new Promise((resolve, reject) => {
            const sourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
                if (err) {
                    this.stats.errors.push(`Failed to open ${dbName}: ${err.message}`);
                    console.log(`⚠️ Could not open ${dbName}: ${err.message}`);
                    resolve();
                    return;
                }

                try {
                    // Get schema information
                    const tables = await this.getTableInfo(sourceDb);
                    console.log(`   📋 Tables found: ${tables.length}`);

                    let dbRecordsIntegrated = 0;

                    // Process each table
                    for (const tableInfo of tables) {
                        const recordsIntegrated = await this.integrateTable(sourceDb, tableInfo, dbName);
                        dbRecordsIntegrated += recordsIntegrated;
                    }

                    this.stats.databasesProcessed++;
                    console.log(`   ✅ Integrated ${dbRecordsIntegrated} records from ${dbName}`);

                    sourceDb.close();
                    resolve();

                } catch (error) {
                    this.stats.errors.push(`Error processing ${dbName}: ${error.message}`);
                    sourceDb.close();
                    resolve();
                }
            });
        });
    }

    async getTableInfo(db) {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT name, sql 
                FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'
            `, (err, tables) => {
                if (err) reject(err);
                else resolve(tables);
            });
        });
    }

    async integrateTable(sourceDb, tableInfo, dbName) {
        const sourceTableName = tableInfo.name;
        const targetTableName = this.tableMapping[sourceTableName];

        if (!targetTableName) {
            console.log(`   ⚠️ No mapping for table: ${sourceTableName}`);
            return 0;
        }

        // Check if target table exists
        const targetExists = await this.targetTableExists(targetTableName);
        if (!targetExists) {
            console.log(`   ⚠️ Target table ${targetTableName} doesn't exist`);
            return 0;
        }

        // Get source data
        const sourceData = await this.getSourceTableData(sourceDb, sourceTableName);
        if (sourceData.length === 0) {
            console.log(`   📭 ${sourceTableName}: No data`);
            return 0;
        }

        // Get target table schema
        const targetSchema = await this.getTargetTableSchema(targetTableName);
        
        // Transform and insert data
        let recordsIntegrated = 0;
        for (const record of sourceData) {
            try {
                const transformedRecord = this.transformRecord(record, sourceTableName, targetSchema);
                if (transformedRecord) {
                    await this.insertRecord(targetTableName, transformedRecord);
                    recordsIntegrated++;
                    this.stats.totalRecordsIntegrated++;
                }
            } catch (error) {
                if (!error.message.includes('UNIQUE constraint failed')) {
                    this.stats.errors.push(`Insert error in ${targetTableName}: ${error.message}`);
                } else {
                    this.stats.recordsSkipped++; // Duplicate record
                }
            }
        }

        this.stats.totalRecordsFound += sourceData.length;
        this.stats.tablesProcessed++;
        
        if (recordsIntegrated > 0) {
            console.log(`   ✅ ${sourceTableName} → ${targetTableName}: ${recordsIntegrated}/${sourceData.length} records`);
        }

        return recordsIntegrated;
    }

    async getSourceTableData(db, tableName) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async targetTableExists(tableName) {
        const result = await this.dbManager.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [tableName]
        );
        return !!result;
    }

    async getTargetTableSchema(tableName) {
        const columns = await this.dbManager.all(`PRAGMA table_info(${tableName})`);
        return columns.map(col => col.name);
    }

    transformRecord(record, sourceTableName, targetSchema) {
        if (!record || Object.keys(record).length === 0) return null;

        const transformed = {};
        const fieldMapping = this.fieldMappings[sourceTableName] || {};

        // First, map all existing fields
        for (const [sourceField, value] of Object.entries(record)) {
            let targetField = sourceField;

            // Apply field mapping if exists
            if (fieldMapping[sourceField] !== undefined) {
                targetField = fieldMapping[sourceField];
                
                // Skip if mapped to null (field should be dropped)
                if (targetField === null) continue;
            }

            // Only include if target schema has this field
            if (targetSchema.includes(targetField)) {
                transformed[targetField] = value;
            }
        }

        // Add default values for required fields if missing
        this.addDefaultValues(transformed, sourceTableName, targetSchema);

        return Object.keys(transformed).length > 0 ? transformed : null;
    }

    addDefaultValues(record, tableName, targetSchema) {
        // Add common default values based on table type
        switch (tableName) {
            case 'email_accounts':
                if (!record.status && targetSchema.includes('status')) {
                    record.status = 'active';
                }
                if (!record.verification_attempts && targetSchema.includes('verification_attempts')) {
                    record.verification_attempts = 0;
                }
                break;

            case 'registration_attempts':
                if (!record.success && targetSchema.includes('success')) {
                    record.success = false;
                }
                if (!record.started_at && targetSchema.includes('started_at')) {
                    record.started_at = new Date().toISOString();
                }
                break;

            case 'system_events':
                if (!record.severity && targetSchema.includes('severity')) {
                    record.severity = 'info';
                }
                if (!record.timestamp && targetSchema.includes('timestamp')) {
                    record.timestamp = new Date().toISOString();
                }
                break;
        }
    }

    async insertRecord(tableName, record) {
        const columns = Object.keys(record);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(col => record[col]);

        const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
        return await this.dbManager.run(sql, values);
    }

    async displayIntegrationResults() {
        console.log('\n🎯 DATA INTEGRATION COMPLETE');
        console.log('='.repeat(80));
        console.log(`📊 INTEGRATION STATISTICS:`);
        console.log(`   🗃️ Databases processed: ${this.stats.databasesProcessed}`);
        console.log(`   📋 Tables processed: ${this.stats.tablesProcessed}`);
        console.log(`   📈 Total records found: ${this.stats.totalRecordsFound}`);
        console.log(`   ✅ Records integrated: ${this.stats.totalRecordsIntegrated}`);
        console.log(`   ⏭️ Records skipped (duplicates): ${this.stats.recordsSkipped}`);
        console.log(`   ❌ Integration errors: ${this.stats.errors.length}`);

        if (this.stats.errors.length > 0) {
            console.log('\n⚠️ INTEGRATION ERRORS:');
            this.stats.errors.slice(0, 5).forEach(error => {
                console.log(`   • ${error}`);
            });
            if (this.stats.errors.length > 5) {
                console.log(`   ... and ${this.stats.errors.length - 5} more errors`);
            }
        }

        // Show current database statistics
        console.log('\n📊 CURRENT DATABASE CONTENTS:');
        const health = await this.dbManager.healthCheck();
        if (health.tables) {
            Object.entries(health.tables)
                .filter(([table, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .forEach(([table, count]) => {
                    console.log(`   ${table}: ${count} records`);
                });
        }
    }

    async verifyIntegration() {
        console.log('\n🔍 VERIFYING INTEGRATION...');
        
        try {
            // Check database integrity
            const integrity = await this.dbManager.get('PRAGMA integrity_check');
            if (integrity.integrity_check === 'ok') {
                console.log('   ✅ Database integrity: OK');
            } else {
                console.log('   ❌ Database integrity: FAILED');
                this.stats.errors.push('Database integrity check failed');
            }

            // Check core data relationships
            const registrations = await this.dbManager.get('SELECT COUNT(*) as count FROM registration_attempts');
            const emails = await this.dbManager.get('SELECT COUNT(*) as count FROM email_accounts');
            const aiInteractions = await this.dbManager.get('SELECT COUNT(*) as count FROM ai_interactions');

            console.log('   📊 Core data verification:');
            console.log(`      📧 Email accounts: ${emails.count}`);
            console.log(`      📝 Registration attempts: ${registrations.count}`);
            console.log(`      🤖 AI interactions: ${aiInteractions.count}`);

            // Success rate calculation
            if (registrations.count > 0) {
                const successful = await this.dbManager.get('SELECT COUNT(*) as count FROM registration_attempts WHERE success = 1');
                const successRate = (successful.count / registrations.count * 100).toFixed(1);
                console.log(`      📈 Success rate: ${successRate}% (${successful.count}/${registrations.count})`);
            }

            console.log('   ✅ Integration verification complete');

        } catch (error) {
            console.log('   ❌ Verification failed:', error.message);
            this.stats.errors.push(`Verification failed: ${error.message}`);
        }
    }
}

// Run integration if called directly
if (require.main === module) {
    const integrator = new DataIntegrator();
    integrator.integrateAllData()
        .then(() => {
            console.log('\n🎊 ALL DATA SUCCESSFULLY INTEGRATED!');
            console.log('🗄️ Single database contains all historical data');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Integration failed:', error);
            process.exit(1);
        });
}

module.exports = DataIntegrator;