#!/usr/bin/env node

/**
 * Simple Database Test
 * Test database operations without email manager to verify the core functionality
 */

const { getDatabaseManager } = require('./src/database/database-manager');

async function testDatabase() {
    console.log('🧪 Testing Database Operations...');
    
    try {
        // Initialize database
        const db = getDatabaseManager();
        await db.initialize();
        
        console.log('✅ Database initialized successfully');
        
        // Test basic email account insertion
        const testEmail = `test-${Date.now()}@example.com`;
        const result = await db.run(`
            INSERT INTO email_accounts (email, service, password, is_verified, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [testEmail, 'manual_test', 'test_password', 1, 1]);
        
        console.log(`✅ Test email inserted: ${testEmail} (ID: ${result.lastID})`);
        
        // Test reading emails
        const emails = await db.all('SELECT * FROM email_accounts WHERE service = ?', ['manual_test']);
        console.log(`✅ Found ${emails.length} test emails in database`);
        
        // Test survey sites
        const timestamp = Date.now();
        const siteResult = await db.run(`
            INSERT INTO survey_sites (name, url, domain, category, difficulty_level)
            VALUES (?, ?, ?, ?, ?)
        `, [`Test Site ${timestamp}`, `https://test-${timestamp}.example.com`, `test-${timestamp}.example.com`, 'test', 1]);
        
        console.log(`✅ Test survey site inserted (ID: ${siteResult.lastID})`);
        
        // Test registration attempt
        const attemptResult = await db.run(`
            INSERT INTO registration_attempts (email_id, site_id, success, error_message, execution_time_ms)
            VALUES (?, ?, ?, ?, ?)
        `, [result.lastID, siteResult.lastID, 0, 'Test failure for demonstration', 5000]);
        
        console.log(`✅ Test registration attempt logged (ID: ${attemptResult.lastID})`);
        
        // Test failure analysis insertion
        const analysisResult = await db.run(`
            INSERT INTO failure_scenarios (
                registration_id, scenario_hash, failure_type, site_id, email_id,
                error_message, page_url, step_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            attemptResult.lastID, 'test_hash_123', 'timeout', siteResult.lastID, result.lastID,
            'Test timeout error', 'https://test.example.com', 1
        ]);
        
        console.log(`✅ Test failure scenario logged (ID: ${analysisResult.lastID})`);
        
        // Test comprehensive query
        const dashboard = await db.all(`
            SELECT 
                ea.email,
                ss.name as site_name,
                ra.success,
                ra.error_message,
                ra.attempt_date
            FROM registration_attempts ra
            JOIN email_accounts ea ON ra.email_id = ea.id
            JOIN survey_sites ss ON ra.site_id = ss.id
            WHERE ea.service = 'manual_test'
            ORDER BY ra.attempt_date DESC
        `);
        
        console.log(`✅ Dashboard query returned ${dashboard.length} records`);
        dashboard.forEach(record => {
            console.log(`   📧 ${record.email} -> ${record.site_name}: ${record.success ? 'SUCCESS' : 'FAILED'}`);
            if (!record.success) {
                console.log(`      Error: ${record.error_message}`);
            }
        });
        
        // Cleanup test data
        await db.run('DELETE FROM failure_scenarios WHERE registration_id = ?', [attemptResult.lastID]);
        await db.run('DELETE FROM registration_attempts WHERE id = ?', [attemptResult.lastID]);
        await db.run('DELETE FROM survey_sites WHERE id = ?', [siteResult.lastID]);
        await db.run('DELETE FROM email_accounts WHERE id = ?', [result.lastID]);
        
        console.log('✅ Test data cleaned up');
        
        // Get database statistics
        const stats = db.getStatistics();
        console.log('📊 Database Statistics:');
        console.log(`   Path: ${stats.dbPath}`);
        console.log(`   Connections: ${stats.connections}`);
        console.log(`   Queries: ${stats.queries}`);
        console.log(`   Errors: ${stats.errors}`);
        
        console.log('\n🎉 All database tests passed! The core functionality works correctly.');
        
        await db.close();
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        process.exit(1);
    }
}

// Run the test
testDatabase();