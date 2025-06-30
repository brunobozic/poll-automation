/**
 * Test Individual Components
 * Tests each component separately to identify what's causing the timeout
 */

async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    const sqlite3 = require('sqlite3').verbose();
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./poll-automation.db', (err) => {
            if (err) {
                console.error('❌ Database connection failed:', err);
                reject(err);
            } else {
                console.log('✅ Database connected successfully');
                
                // Test a simple query
                db.all('SELECT COUNT(*) as count FROM email_accounts', (err, rows) => {
                    if (err) {
                        console.error('❌ Query failed:', err);
                        reject(err);
                    } else {
                        console.log(`✅ Query successful: ${rows[0].count} email accounts`);
                        db.close();
                        resolve();
                    }
                });
            }
        });
    });
}

async function testRegistrationLogger() {
    console.log('🔍 Testing RegistrationLogger...');
    try {
        const RegistrationLogger = require('./src/database/registration-logger');
        const logger = new RegistrationLogger();
        await logger.initialize();
        console.log('✅ RegistrationLogger initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ RegistrationLogger failed:', error.message);
        return false;
    }
}

async function testDatabaseManager() {
    console.log('🔍 Testing DatabaseManager...');
    try {
        const DatabaseManager = require('./src/database/manager');
        const manager = new DatabaseManager();
        await manager.connect();
        console.log('✅ DatabaseManager connected successfully');
        return true;
    } catch (error) {
        console.error('❌ DatabaseManager failed:', error.message);
        return false;
    }
}

async function testPageAnalysisLogger() {
    console.log('🔍 Testing PageAnalysisLogger...');
    try {
        const PageAnalysisLogger = require('./src/services/page-analysis-logger');
        const logger = new PageAnalysisLogger();
        await logger.initialize();
        console.log('✅ PageAnalysisLogger initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ PageAnalysisLogger failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🧪 COMPONENT TESTING');
    console.log('====================');
    
    const tests = [
        { name: 'Database Connection', test: testDatabaseConnection },
        { name: 'RegistrationLogger', test: testRegistrationLogger },
        { name: 'DatabaseManager', test: testDatabaseManager },
        { name: 'PageAnalysisLogger', test: testPageAnalysisLogger }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const { name, test } of tests) {
        try {
            const result = await test();
            if (result !== false) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`❌ ${name} test failed:`, error.message);
            failed++;
        }
        console.log(''); // Empty line between tests
    }
    
    console.log('📊 TEST RESULTS');
    console.log('===============');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
        console.log('🎉 All core components working correctly!');
    } else {
        console.log('⚠️ Some components need fixing before full app will work');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testDatabaseConnection, testRegistrationLogger, testDatabaseManager, testPageAnalysisLogger };