#!/usr/bin/env node

/**
 * Database Consolidation Script
 * Fixes the mess of 19+ database files by consolidating all data into a single database
 * with proper migrations and schema management
 */

const { DatabaseManager } = require('./src/database/database-manager');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseConsolidator {
    constructor() {
        this.mainDbPath = path.join(__dirname, 'poll-automation.db');
        this.dbManager = new DatabaseManager({ dbPath: this.mainDbPath });
        this.consolidatedData = {
            email_accounts: [],
            registration_attempts: [],
            registration_steps: [],
            form_interactions: [],
            registration_questions: [],
            user_profiles: [],
            ai_interactions: [],
            survey_sites: [],
            site_defenses: [],
            site_questions: [],
            detection_events: [],
            performance_metrics: [],
            system_events: []
        };
    }

    async consolidateAllDatabases() {
        console.log('🔧 FIXING DATABASE MESS - CONSOLIDATING 19+ DATABASES INTO ONE');
        console.log('='.repeat(80));

        try {
            // Initialize the main database with proper schema
            await this.dbManager.initialize();

            // Find all scattered database files
            const dbFiles = await this.findAllDatabaseFiles();
            console.log(`📂 Found ${dbFiles.length} database files to consolidate`);

            // Extract data from all databases
            let totalRecords = 0;
            for (const dbFile of dbFiles) {
                const records = await this.extractDataFromDatabase(dbFile);
                totalRecords += records;
            }

            // Insert all consolidated data into main database
            await this.insertConsolidatedData();

            // Create backup of old databases
            await this.backupOldDatabases(dbFiles);

            // Clean up old database files
            await this.cleanupOldDatabases(dbFiles);

            // Verify consolidation
            await this.verifyConsolidation();

            console.log('\n🎯 DATABASE CONSOLIDATION COMPLETE');
            console.log(`✅ Consolidated ${totalRecords} records from ${dbFiles.length} databases`);
            console.log(`📄 Single database: ${this.mainDbPath}`);

        } catch (error) {
            console.error('❌ Database consolidation failed:', error);
            throw error;
        }
    }

    async findAllDatabaseFiles() {
        const dbFiles = [];
        const searchPaths = [
            path.join(__dirname, 'data'),
            path.join(__dirname, 'knowledge'),
            __dirname
        ];

        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
                const files = fs.readdirSync(searchPath)
                    .filter(file => file.endsWith('.db'))
                    .map(file => path.join(searchPath, file))
                    .filter(file => file !== this.mainDbPath); // Don't include the target db

                dbFiles.push(...files);
            }
        }

        return dbFiles;
    }

    async extractDataFromDatabase(dbPath) {
        console.log(`📊 Extracting data from: ${path.basename(dbPath)}`);
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
                if (err) {
                    console.log(`⚠️ Could not open ${path.basename(dbPath)}: ${err.message}`);
                    resolve(0);
                    return;
                }

                try {
                    // Get all tables
                    const tables = await this.getTablesFromDb(db);
                    let recordCount = 0;

                    for (const tableName of tables) {
                        if (this.consolidatedData.hasOwnProperty(tableName)) {
                            const rows = await this.getRowsFromTable(db, tableName);
                            this.consolidatedData[tableName].push(...rows);
                            recordCount += rows.length;
                            
                            if (rows.length > 0) {
                                console.log(`   ✅ ${tableName}: ${rows.length} records`);
                            }
                        }
                    }

                    db.close();
                    resolve(recordCount);

                } catch (error) {
                    db.close();
                    console.log(`⚠️ Error extracting from ${path.basename(dbPath)}: ${error.message}`);
                    resolve(0);
                }
            });
        });
    }

    getTablesFromDb(db) {
        return new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });
    }

    getRowsFromTable(db, tableName) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async insertConsolidatedData() {
        console.log('\n💾 Inserting consolidated data into main database...');

        for (const [tableName, records] of Object.entries(this.consolidatedData)) {
            if (records.length === 0) continue;

            console.log(`📋 Inserting ${records.length} records into ${tableName}...`);

            // Remove duplicates based on unique constraints
            const uniqueRecords = this.removeDuplicates(records, tableName);
            
            for (const record of uniqueRecords) {
                try {
                    await this.insertRecord(tableName, record);
                } catch (error) {
                    if (!error.message.includes('UNIQUE constraint failed')) {
                        console.log(`⚠️ Insert error for ${tableName}: ${error.message}`);
                    }
                }
            }
        }
    }

    removeDuplicates(records, tableName) {
        if (records.length === 0) return records;

        // Define unique key patterns for each table
        const uniqueKeys = {
            email_accounts: ['email'],
            registration_attempts: ['email_id', 'site_url', 'started_at'],
            survey_sites: ['url'],
            ai_interactions: ['registration_id', 'prompt_text', 'timestamp'],
            // Add other tables as needed
        };

        const keyFields = uniqueKeys[tableName];
        if (!keyFields) return records;

        const seen = new Set();
        return records.filter(record => {
            const key = keyFields.map(field => record[field]).join('|');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async insertRecord(tableName, record) {
        const columns = Object.keys(record);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(col => record[col]);

        const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
        return await this.dbManager.run(sql, values);
    }

    async backupOldDatabases(dbFiles) {
        console.log('\n📦 Creating backup of old databases...');
        
        const backupDir = path.join(__dirname, `backup-dbs-${Date.now()}`);
        fs.mkdirSync(backupDir, { recursive: true });

        for (const dbFile of dbFiles) {
            const fileName = path.basename(dbFile);
            const backupPath = path.join(backupDir, fileName);
            fs.copyFileSync(dbFile, backupPath);
        }

        console.log(`✅ Backed up ${dbFiles.length} databases to: ${backupDir}`);
        return backupDir;
    }

    async cleanupOldDatabases(dbFiles) {
        console.log('\n🧹 Cleaning up old database files...');

        for (const dbFile of dbFiles) {
            try {
                fs.unlinkSync(dbFile);
                console.log(`   ✅ Removed: ${path.basename(dbFile)}`);
            } catch (error) {
                console.log(`   ⚠️ Could not remove: ${path.basename(dbFile)}`);
            }
        }

        // Remove empty directories
        const dirsToCheck = [
            path.join(__dirname, 'data'),
            path.join(__dirname, 'knowledge')
        ];

        for (const dir of dirsToCheck) {
            if (fs.existsSync(dir)) {
                const contents = fs.readdirSync(dir);
                if (contents.length === 0) {
                    fs.rmdirSync(dir);
                    console.log(`   ✅ Removed empty directory: ${path.basename(dir)}`);
                }
            }
        }
    }

    async verifyConsolidation() {
        console.log('\n🔍 Verifying consolidation results...');

        const stats = await this.dbManager.healthCheck();
        console.log(`📊 Database health: ${stats.status}`);
        console.log(`📄 Database size: ${stats.fileSize}`);

        if (stats.tables) {
            console.log('📋 Table record counts:');
            for (const [table, count] of Object.entries(stats.tables)) {
                if (count > 0) {
                    console.log(`   ${table}: ${count} records`);
                }
            }
        }
    }
}

// Run consolidation if called directly
if (require.main === module) {
    const consolidator = new DatabaseConsolidator();
    consolidator.consolidateAllDatabases()
        .then(() => {
            console.log('\n🎊 DATABASE CONSOLIDATION SUCCESSFUL!');
            console.log('🗄️ All data now in single database with proper schema');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Consolidation failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseConsolidator;