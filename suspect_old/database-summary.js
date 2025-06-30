/**
 * Database Summary
 * Quick overview of the consolidated database contents
 */

const sqlite3 = require('sqlite3').verbose();

async function getDatabaseSummary() {
    console.log('📊 CONSOLIDATED DATABASE SUMMARY');
    console.log('================================');
    
    const db = new sqlite3.Database('./poll-automation.db');
    
    try {
        // Get table count
        const tables = await query(db, `
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%' 
            ORDER BY name
        `);
        
        console.log(`📋 Total Tables: ${tables.length}`);
        console.log('');
        
        // Get record counts for key tables
        const keyTables = [
            'email_accounts',
            'registration_attempts', 
            'ai_interactions',
            'llm_insights',
            'survey_sites',
            'system_events',
            'form_interactions',
            'registration_questions',
            'logs',
            'page_analysis'
        ];
        
        console.log('📊 Key Table Record Counts:');
        let totalRecords = 0;
        
        for (const tableName of keyTables) {
            try {
                const result = await query(db, `SELECT COUNT(*) as count FROM "${tableName}"`);
                const count = result[0].count;
                totalRecords += count;
                
                if (count > 0) {
                    console.log(`   ${tableName}: ${count.toLocaleString()} records`);
                }
            } catch (error) {
                // Table might not exist, skip
            }
        }
        
        console.log('');
        console.log(`🎯 Total Records in Key Tables: ${totalRecords.toLocaleString()}`);
        
        // Get overall database stats
        let allTableRecords = 0;
        console.log('\n📋 All Tables:');
        
        for (const table of tables) {
            try {
                const result = await query(db, `SELECT COUNT(*) as count FROM "${table.name}"`);
                const count = result[0].count;
                allTableRecords += count;
                
                if (count > 0) {
                    console.log(`   ${table.name}: ${count.toLocaleString()} records`);
                }
            } catch (error) {
                console.log(`   ${table.name}: ERROR (${error.message})`);
            }
        }
        
        console.log('');
        console.log(`🎯 TOTAL DATABASE RECORDS: ${allTableRecords.toLocaleString()}`);
        
        // Get database file size
        const fs = require('fs');
        const stats = fs.statSync('./poll-automation.db');
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`💾 Database File Size: ${fileSizeInMB} MB`);
        
        // Test basic query functionality
        console.log('\n🧪 Database Health Check:');
        try {
            const emailCheck = await query(db, 'SELECT COUNT(*) as count FROM email_accounts');
            console.log(`✅ Email accounts query: ${emailCheck[0].count} records`);
            
            const siteCheck = await query(db, 'SELECT COUNT(*) as count FROM survey_sites');
            console.log(`✅ Survey sites query: ${siteCheck[0].count} records`);
            
            console.log('✅ Database is healthy and responding');
        } catch (error) {
            console.log(`❌ Database health check failed: ${error.message}`);
        }
        
    } finally {
        db.close();
    }
}

function query(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

if (require.main === module) {
    getDatabaseSummary().catch(console.error);
}

module.exports = { getDatabaseSummary };