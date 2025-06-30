/**
 * Debug SQL Logging
 * Direct database debugging to find the root cause
 */

const sqlite3 = require('sqlite3').verbose();

async function debugSQLLogging() {
    console.log('🔍 DEBUGGING SQL LOGGING');
    console.log('========================');
    
    const db = new sqlite3.Database('./poll-automation.db');
    
    // Test direct SQL insertion
    console.log('1. Testing direct SQL insertion...');
    
    const query = `
        INSERT INTO system_events (
            session_id, event_type, event_data, severity, 
            source_component, event_message
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        'debug-session',
        'debug_test',
        JSON.stringify({ test: 'data', features: { count: 5, success: true } }),
        'info',
        'debug_component',
        'Direct SQL test event'
    ];
    
    return new Promise((resolve) => {
        db.run(query, values, function(err) {
            if (err) {
                console.log(`❌ Direct SQL failed: ${err.message}`);
            } else {
                console.log(`✅ Direct SQL success: Row ID ${this.lastID}`);
            }
            
            // Check what was stored
            db.get(`
                SELECT event_type, event_data, severity, event_message 
                FROM system_events 
                WHERE id = ?
            `, [this.lastID], (err, row) => {
                if (err) {
                    console.log(`❌ Read failed: ${err.message}`);
                } else if (row) {
                    console.log(`✅ Stored data:`);
                    console.log(`   Type: ${row.event_type}`);
                    console.log(`   Data: ${row.event_data}`);
                    console.log(`   Severity: ${row.severity}`);
                    console.log(`   Message: ${row.event_message}`);
                } else {
                    console.log(`❌ No row found`);
                }
                
                // Test the RegistrationLogger method
                console.log('\\n2. Testing RegistrationLogger method...');
                testRegistrationLogger().then(() => {
                    db.close();
                    resolve();
                });
            });
        });
    });
}

async function testRegistrationLogger() {
    const RegistrationLogger = require('./src/database/registration-logger.js');
    const logger = new RegistrationLogger();
    
    try {
        await logger.initialize();
        
        console.log('   Testing logSystemEvent method...');
        
        // Add debug logging to see what's happening
        const originalRunQuery = logger.runQuery.bind(logger);
        logger.runQuery = function(query, params) {
            console.log(`   🔍 SQL Query: ${query.trim()}`);
            console.log(`   🔍 Parameters: ${JSON.stringify(params)}`);
            return originalRunQuery(query, params);
        };
        
        await logger.logSystemEvent({
            sessionId: 'debug-logger-session',
            eventType: 'debug_logger_test',
            eventData: { 
                testFeature: 'value',
                mlData: { field1: 'test', field2: 123 }
            },
            severity: 'warning',
            sourceComponent: 'debug_logger',
            message: 'RegistrationLogger test event'
        });
        
        console.log('   ✅ logSystemEvent completed');
        
        // Check if it was stored
        const result = await logger.allQuery(`
            SELECT event_type, event_data, severity 
            FROM system_events 
            WHERE event_message = 'RegistrationLogger test event'
            ORDER BY timestamp DESC LIMIT 1
        `);
        
        if (result.length > 0) {
            console.log(`   ✅ Found stored event:`);
            console.log(`      Type: ${result[0].event_type}`);
            console.log(`      Data: ${result[0].event_data}`);
            console.log(`      Severity: ${result[0].severity}`);
        } else {
            console.log(`   ❌ Event not found in database`);
        }
        
        await logger.close();
        
    } catch (error) {
        console.log(`   ❌ RegistrationLogger test failed: ${error.message}`);
    }
}

if (require.main === module) {
    debugSQLLogging();
}