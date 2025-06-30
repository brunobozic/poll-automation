/**
 * Final Database Merge - Combines all consolidated data into single database
 * Merges poll-automation-consolidated.db back into poll-automation.db
 */

const sqlite3 = require('sqlite3').verbose();

class FinalDatabaseMerge {
    constructor() {
        this.sourceDb = null;
        this.targetDb = null;
        this.mergeStats = {
            totalRecords: 0,
            tablesProcessed: 0,
            duplicatesSkipped: 0,
            recordsMerged: 0
        };
    }

    async initialize() {
        console.log('🔄 FINAL DATABASE MERGE');
        console.log('=======================');
        console.log('🎯 Goal: Merge ALL data into single database');
        
        this.sourceDb = new sqlite3.Database('./poll-automation-consolidated.db', sqlite3.OPEN_READONLY);
        this.targetDb = new sqlite3.Database('./poll-automation.db');
        
        console.log('✅ Database connections established');
        return this;
    }

    async mergeAllData() {
        console.log('\n📊 Starting final merge process...');
        
        // Get all tables from consolidated database
        const tables = await this.querySource(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);
        
        console.log(`📋 Found ${tables.length} tables to merge`);
        
        for (const table of tables) {
            try {
                await this.mergeTable(table.name);
                this.mergeStats.tablesProcessed++;
            } catch (error) {
                console.error(`❌ Error merging table ${table.name}:`, error.message);
            }
        }
        
        await this.generateMergeReport();
    }

    async mergeTable(tableName) {
        console.log(`\n📂 Merging table: ${tableName}`);
        
        // Get all records from source table
        const records = await this.querySource(`SELECT * FROM "${tableName}"`);
        
        if (records.length === 0) {
            console.log(`   ⚪ No records to merge`);
            return;
        }
        
        // Get target table schema
        const targetSchema = await this.queryTarget(`PRAGMA table_info("${tableName}")`);
        if (targetSchema.length === 0) {
            console.log(`   ⚠️ Table ${tableName} not in target schema`);
            return;
        }
        
        const targetColumns = targetSchema.map(col => col.name);
        let recordsMerged = 0;
        
        for (const record of records) {
            try {
                // Adapt record to target schema
                const adaptedRecord = this.adaptRecord(record, targetColumns);
                
                // Check for duplicates
                if (await this.isDuplicate(tableName, adaptedRecord)) {
                    this.mergeStats.duplicatesSkipped++;
                    continue;
                }
                
                // Insert record
                await this.insertRecord(tableName, adaptedRecord);
                recordsMerged++;
                this.mergeStats.recordsMerged++;
                
            } catch (error) {
                if (error.message.includes('UNIQUE constraint')) {
                    this.mergeStats.duplicatesSkipped++;
                } else {
                    console.error(`   ⚠️ Record error: ${error.message}`);
                }
            }
        }
        
        if (recordsMerged > 0) {
            console.log(`   ✅ ${recordsMerged} records merged`);
        }
        
        this.mergeStats.totalRecords += records.length;
    }

    adaptRecord(record, targetColumns) {
        const adapted = {};
        
        for (const [key, value] of Object.entries(record)) {
            if (targetColumns.includes(key)) {
                adapted[key] = value;
            }
        }
        
        return adapted;
    }

    async isDuplicate(tableName, record) {
        const uniqueFields = ['id', 'email', 'session_id', 'created_at'];
        
        for (const field of uniqueFields) {
            if (record[field]) {
                try {
                    const existing = await this.queryTarget(
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

    async insertRecord(tableName, record) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map(() => '?').join(', ');
        
        const sql = `INSERT OR IGNORE INTO "${tableName}" (${columns.join(', ')}) VALUES (${placeholders})`;
        await this.runTarget(sql, values);
    }

    async generateMergeReport() {
        console.log('\n📊 FINAL MERGE REPORT');
        console.log('=====================');
        
        // Get final counts
        const finalCounts = await this.getFinalCounts();
        const totalFinal = Object.values(finalCounts).reduce((a, b) => a + b, 0);
        
        console.log(`📋 Tables processed: ${this.mergeStats.tablesProcessed}`);
        console.log(`📈 Total source records: ${this.mergeStats.totalRecords.toLocaleString()}`);
        console.log(`✅ Records merged: ${this.mergeStats.recordsMerged.toLocaleString()}`);
        console.log(`🔄 Duplicates skipped: ${this.mergeStats.duplicatesSkipped.toLocaleString()}`);
        console.log(`🎯 Final database total: ${totalFinal.toLocaleString()} records`);
        
        const mergeRate = (this.mergeStats.recordsMerged / this.mergeStats.totalRecords) * 100;
        console.log(`📊 Merge rate: ${mergeRate.toFixed(1)}%`);
        
        console.log('\n📋 Final consolidated record counts:');
        for (const [table, count] of Object.entries(finalCounts)) {
            if (count > 0) {
                console.log(`   ${table}: ${count.toLocaleString()} records`);
            }
        }
        
        if (totalFinal > 1000) {
            console.log('\n🎉 EXCELLENT: Successfully consolidated over 1,000 records!');
        } else if (totalFinal > 500) {
            console.log('\n✅ GOOD: Substantial data consolidation achieved');
        }
    }

    async getFinalCounts() {
        const tables = await this.queryTarget(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        const counts = {};
        for (const table of tables) {
            try {
                const result = await this.queryTarget(`SELECT COUNT(*) as count FROM "${table.name}"`);
                counts[table.name] = result[0].count;
            } catch (error) {
                counts[table.name] = 0;
            }
        }
        
        return counts;
    }

    // Helper methods
    async querySource(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.sourceDb.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async queryTarget(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.targetDb.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async runTarget(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.targetDb.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    async close() {
        if (this.sourceDb) this.sourceDb.close();
        if (this.targetDb) this.targetDb.close();
    }
}

async function main() {
    const merger = new FinalDatabaseMerge();
    
    try {
        await merger.initialize();
        await merger.mergeAllData();
        
        console.log('\n🎉 FINAL DATABASE MERGE COMPLETE!');
        console.log('All available data has been consolidated into poll-automation.db');
        
        await merger.close();
        
    } catch (error) {
        console.error('\n❌ Final merge failed:', error);
        await merger.close();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = FinalDatabaseMerge;