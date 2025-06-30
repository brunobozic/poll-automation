/**
 * Database Table Usage Analysis
 * Check which tables are being used and which are empty
 */

const sqlite3 = require('sqlite3').verbose();

class TableUsageAnalyzer {
    constructor() {
        this.db = null;
        this.tableStats = {};
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database('./poll-automation.db', (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📊 Connected to database for table analysis');
                    resolve();
                }
            });
        });
    }

    async analyzeAllTables() {
        console.log('🔍 DATABASE TABLE USAGE ANALYSIS');
        console.log('================================');
        
        // Get all table names
        const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        
        console.log(`📋 Found ${tables.length} tables in database\n`);
        
        const usedTables = [];
        const emptyTables = [];
        const unknownTables = [];
        
        for (const table of tables) {
            const tableName = table.name;
            
            try {
                const countResult = await this.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                const count = countResult[0].count;
                
                this.tableStats[tableName] = {
                    count: count,
                    status: count > 0 ? 'USED' : 'EMPTY'
                };
                
                if (count > 0) {
                    usedTables.push({ name: tableName, count: count });
                    console.log(`✅ ${tableName}: ${count} records`);
                } else {
                    emptyTables.push(tableName);
                    console.log(`❌ ${tableName}: 0 records (EMPTY)`);
                }
                
            } catch (error) {
                unknownTables.push({ name: tableName, error: error.message });
                console.log(`⚠️ ${tableName}: Error - ${error.message}`);
            }
        }
        
        this.generateSummaryReport(usedTables, emptyTables, unknownTables);
        await this.analyzeDataFlow(usedTables);
        await this.investigateEmptyTables(emptyTables);
    }

    generateSummaryReport(usedTables, emptyTables, unknownTables) {
        console.log('\n📊 SUMMARY REPORT');
        console.log('=================');
        
        console.log(`✅ Tables with data: ${usedTables.length}`);
        console.log(`❌ Empty tables: ${emptyTables.length}`);
        console.log(`⚠️ Problem tables: ${unknownTables.length}`);
        
        const totalRecords = usedTables.reduce((sum, table) => sum + table.count, 0);
        console.log(`📈 Total records across all tables: ${totalRecords}`);
        
        if (usedTables.length > 0) {
            console.log('\n🏆 TOP USED TABLES:');
            usedTables
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .forEach((table, index) => {
                    console.log(`   ${index + 1}. ${table.name}: ${table.count} records`);
                });
        }
        
        if (emptyTables.length > 0) {
            console.log('\n🚫 EMPTY TABLES (Need Investigation):');
            emptyTables.forEach(table => {
                console.log(`   • ${table}`);
            });
        }
    }

    async analyzeDataFlow(usedTables) {
        console.log('\n🔄 DATA FLOW ANALYSIS');
        console.log('=====================');
        
        // Check core workflow tables
        const coreWorkflowTables = [
            'email_accounts',
            'registration_attempts', 
            'registration_steps',
            'system_events',
            'ai_interactions',
            'user_profiles',
            'registration_questions'
        ];
        
        console.log('📋 Core Workflow Tables Status:');
        for (const tableName of coreWorkflowTables) {
            const stats = this.tableStats[tableName];
            if (stats) {
                const status = stats.count > 0 ? '✅' : '❌';
                console.log(`   ${status} ${tableName}: ${stats.count} records`);
            } else {
                console.log(`   ⚠️ ${tableName}: Table not found`);
            }
        }
        
        // Analyze ML learning tables
        const mlTables = [
            'learning_patterns',
            'learning_iterations', 
            'learning_intelligence',
            'llm_insights',
            'predictive_insights'
        ];
        
        console.log('\n🧠 ML Learning Tables Status:');
        for (const tableName of mlTables) {
            const stats = this.tableStats[tableName];
            if (stats) {
                const status = stats.count > 0 ? '✅' : '❌';
                console.log(`   ${status} ${tableName}: ${stats.count} records`);
            } else {
                console.log(`   ⚠️ ${tableName}: Table not found`);
            }
        }
    }

    async investigateEmptyTables(emptyTables) {
        console.log('\n🔍 INVESTIGATING EMPTY TABLES');
        console.log('=============================');
        
        const categorizeTable = (tableName) => {
            if (tableName.includes('email') || tableName.includes('account')) return 'Email Management';
            if (tableName.includes('registration') || tableName.includes('attempt')) return 'Registration Flow';
            if (tableName.includes('ai') || tableName.includes('llm') || tableName.includes('learning')) return 'AI/ML System';
            if (tableName.includes('survey') || tableName.includes('poll')) return 'Survey System';
            if (tableName.includes('site') || tableName.includes('form')) return 'Site Intelligence';
            if (tableName.includes('error') || tableName.includes('failure')) return 'Error Handling';
            if (tableName.includes('performance') || tableName.includes('metric')) return 'Analytics';
            return 'Other';
        };
        
        const categories = {};
        emptyTables.forEach(table => {
            const category = categorizeTable(table);
            if (!categories[category]) categories[category] = [];
            categories[category].push(table);
        });
        
        Object.entries(categories).forEach(([category, tables]) => {
            console.log(`\n📂 ${category} (${tables.length} empty tables):`);
            tables.forEach(table => {
                console.log(`   • ${table}`);
            });
        });
        
        // Provide recommendations
        console.log('\n💡 RECOMMENDATIONS');
        console.log('==================');
        
        if (categories['Registration Flow']) {
            console.log('🎯 Registration Flow: Tables exist but not being populated');
            console.log('   → Check if registration logger methods are being called');
            console.log('   → Verify data pipeline from training system to database');
        }
        
        if (categories['AI/ML System']) {
            console.log('🧠 AI/ML System: Learning tables not being populated');
            console.log('   → Verify ML logging methods are integrated');
            console.log('   → Check if LLM interactions are being captured');
        }
        
        if (categories['Email Management']) {
            console.log('📧 Email Management: Email workflow may not be complete');
            console.log('   → Check email account creation and logging');
        }
        
        if (emptyTables.length > 20) {
            console.log('⚠️ WARNING: Too many empty tables suggests incomplete integration');
            console.log('   → Many tables were created but data pipelines never connected');
            console.log('   → Consider cleaning up unused tables or implementing missing logic');
        }
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Database close error:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
                resolve();
            });
        });
    }
}

async function main() {
    const analyzer = new TableUsageAnalyzer();
    
    try {
        await analyzer.initialize();
        await analyzer.analyzeAllTables();
    } catch (error) {
        console.error('❌ Analysis failed:', error);
    } finally {
        await analyzer.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = TableUsageAnalyzer;