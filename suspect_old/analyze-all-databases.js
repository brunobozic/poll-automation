/**
 * Comprehensive Database Analysis Script
 * Analyzes ALL database files and creates complete schema inventory
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class ComprehensiveDatabaseAnalyzer {
    constructor() {
        this.allTables = new Map(); // table_name -> schema
        this.allIndexes = new Set();
        this.allViews = new Map();
        this.allTriggers = new Set();
        this.tableCounts = new Map();
        this.databaseFiles = [];
        this.schemaConflicts = [];
    }

    async findAllDatabases() {
        console.log('🔍 Finding all database files...');
        
        const findDatabases = (dir) => {
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

        this.databaseFiles = findDatabases('.');
        console.log(`📊 Found ${this.databaseFiles.length} database files:`);
        this.databaseFiles.forEach(db => console.log(`  📁 ${db}`));
        
        return this.databaseFiles;
    }

    async analyzeDatabase(dbPath) {
        console.log(`\n🔍 Analyzing: ${dbPath}`);
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
                if (err) {
                    console.error(`❌ Cannot open ${dbPath}:`, err.message);
                    resolve({ error: err.message });
                    return;
                }

                try {
                    const analysis = await this.extractDatabaseSchema(db, dbPath);
                    db.close();
                    resolve(analysis);
                } catch (error) {
                    console.error(`❌ Error analyzing ${dbPath}:`, error.message);
                    db.close();
                    resolve({ error: error.message });
                }
            });
        });
    }

    async extractDatabaseSchema(db, dbPath) {
        const analysis = {
            path: dbPath,
            tables: {},
            indexes: [],
            views: {},
            triggers: [],
            counts: {}
        };

        // Get all tables with their schemas
        const tables = await this.query(db, `
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        console.log(`  📋 Found ${tables.length} tables`);

        for (const table of tables) {
            // Get detailed column information
            const columns = await this.query(db, `PRAGMA table_info(${table.name})`);
            
            // Get row count
            try {
                const countResult = await this.query(db, `SELECT COUNT(*) as count FROM "${table.name}"`);
                analysis.counts[table.name] = countResult[0].count;
            } catch (error) {
                analysis.counts[table.name] = 0;
            }

            analysis.tables[table.name] = {
                sql: table.sql,
                columns: columns
            };

            // Track in global schema
            if (this.allTables.has(table.name)) {
                // Check for schema conflicts
                const existing = this.allTables.get(table.name);
                if (existing.sql !== table.sql) {
                    this.schemaConflicts.push({
                        table: table.name,
                        database1: existing.source,
                        schema1: existing.sql,
                        database2: dbPath,
                        schema2: table.sql
                    });
                }
            } else {
                this.allTables.set(table.name, {
                    sql: table.sql,
                    columns: columns,
                    source: dbPath
                });
            }

            // Update counts
            const existingCount = this.tableCounts.get(table.name) || 0;
            this.tableCounts.set(table.name, existingCount + analysis.counts[table.name]);
        }

        // Get indexes
        const indexes = await this.query(db, `
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type='index' AND name NOT LIKE 'sqlite_%'
        `);

        analysis.indexes = indexes;
        indexes.forEach(idx => this.allIndexes.add(idx.sql));

        // Get views
        const views = await this.query(db, `
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type='view'
        `);

        for (const view of views) {
            analysis.views[view.name] = view.sql;
            this.allViews.set(view.name, view.sql);
        }

        // Get triggers
        const triggers = await this.query(db, `
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type='trigger'
        `);

        analysis.triggers = triggers;
        triggers.forEach(trigger => this.allTriggers.add(trigger.sql));

        console.log(`    📊 ${Object.keys(analysis.tables).length} tables, ${analysis.indexes.length} indexes, ${Object.keys(analysis.views).length} views`);
        console.log(`    📈 Total records: ${Object.values(analysis.counts).reduce((a, b) => a + b, 0)}`);

        return analysis;
    }

    async query(db, sql) {
        return new Promise((resolve, reject) => {
            db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async analyzeAllDatabases() {
        await this.findAllDatabases();
        
        console.log('\n🚀 Starting comprehensive analysis...');
        
        const analyses = [];
        for (const dbPath of this.databaseFiles) {
            const analysis = await this.analyzeDatabase(dbPath);
            analyses.push(analysis);
        }

        return analyses;
    }

    generateComprehensiveReport() {
        console.log('\n📊 COMPREHENSIVE DATABASE ANALYSIS REPORT');
        console.log('==========================================');

        console.log(`\n📁 Total Databases Analyzed: ${this.databaseFiles.length}`);
        console.log(`📋 Unique Tables Found: ${this.allTables.size}`);
        console.log(`📊 Unique Indexes Found: ${this.allIndexes.size}`);
        console.log(`👁️ Unique Views Found: ${this.allViews.size}`);
        console.log(`⚡ Unique Triggers Found: ${this.allTriggers.size}`);

        console.log('\n📋 ALL TABLES WITH RECORD COUNTS:');
        console.log('=====================================');
        const sortedTables = Array.from(this.allTables.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        
        for (const [tableName, tableInfo] of sortedTables) {
            const count = this.tableCounts.get(tableName) || 0;
            console.log(`\n🏷️  TABLE: ${tableName}`);
            console.log(`   📊 Records: ${count.toLocaleString()}`);
            console.log(`   📁 Source: ${tableInfo.source}`);
            console.log(`   📋 Columns: ${tableInfo.columns.length}`);
            
            // Show column details
            for (const col of tableInfo.columns) {
                const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
                const pk = col.pk ? ' [PRIMARY KEY]' : '';
                const dflt = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
                console.log(`      ${col.name}: ${col.type} ${nullable}${dflt}${pk}`);
            }
        }

        if (this.schemaConflicts.length > 0) {
            console.log('\n⚠️  SCHEMA CONFLICTS DETECTED:');
            console.log('================================');
            for (const conflict of this.schemaConflicts) {
                console.log(`\n❌ Table: ${conflict.table}`);
                console.log(`   DB1: ${conflict.database1}`);
                console.log(`   DB2: ${conflict.database2}`);
                console.log(`   Different schemas detected!`);
            }
        }

        console.log('\n📊 SUMMARY STATISTICS:');
        console.log('======================');
        const totalRecords = Array.from(this.tableCounts.values()).reduce((a, b) => a + b, 0);
        console.log(`📈 Total Records Across All Databases: ${totalRecords.toLocaleString()}`);
        
        const topTables = Array.from(this.tableCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        console.log('\n🏆 TOP 10 TABLES BY RECORD COUNT:');
        for (const [table, count] of topTables) {
            console.log(`   ${table}: ${count.toLocaleString()} records`);
        }

        return {
            totalDatabases: this.databaseFiles.length,
            totalTables: this.allTables.size,
            totalRecords: totalRecords,
            allTables: this.allTables,
            allIndexes: this.allIndexes,
            allViews: this.allViews,
            allTriggers: this.allTriggers,
            schemaConflicts: this.schemaConflicts,
            tableCounts: this.tableCounts
        };
    }

    async exportComprehensiveSchema(outputFile = './complete-schema-analysis.json') {
        const report = this.generateComprehensiveReport();
        
        // Convert Maps and Sets to objects for JSON serialization
        const exportData = {
            ...report,
            allTables: Object.fromEntries(this.allTables),
            allIndexes: Array.from(this.allIndexes),
            allViews: Object.fromEntries(this.allViews),
            allTriggers: Array.from(this.allTriggers),
            tableCounts: Object.fromEntries(this.tableCounts),
            generatedAt: new Date().toISOString()
        };

        fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
        console.log(`\n📤 Complete schema analysis exported to: ${outputFile}`);
        
        return exportData;
    }
}

async function main() {
    console.log('🚀 COMPREHENSIVE DATABASE ANALYSIS');
    console.log('==================================');
    
    const analyzer = new ComprehensiveDatabaseAnalyzer();
    
    try {
        await analyzer.analyzeAllDatabases();
        const schemaData = await analyzer.exportComprehensiveSchema();
        
        console.log('\n✅ Analysis Complete!');
        console.log(`📊 Found ${schemaData.totalTables} unique tables across ${schemaData.totalDatabases} databases`);
        console.log(`📈 Total records: ${schemaData.totalRecords.toLocaleString()}`);
        
        if (schemaData.schemaConflicts.length > 0) {
            console.log(`⚠️  ${schemaData.schemaConflicts.length} schema conflicts need resolution`);
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ComprehensiveDatabaseAnalyzer;