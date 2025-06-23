/**
 * Check Database Schema
 */

const sqlite3 = require('sqlite3').verbose();

async function checkDatabaseSchema() {
    console.log('🔍 Checking Database Schema...');
    console.log('==============================\n');
    
    const db = new sqlite3.Database('./data/test-registrations.db');
    
    return new Promise((resolve, reject) => {
        // Get all tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Found ${tables.length} tables:\n`);
            
            let completed = 0;
            const tableSchemas = {};
            
            if (tables.length === 0) {
                console.log('No tables found');
                resolve(tableSchemas);
                return;
            }
            
            tables.forEach(table => {
                const tableName = table.name;
                
                // Get schema for each table
                db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                    if (err) {
                        console.error(`Error getting schema for ${tableName}:`, err);
                    } else {
                        console.log(`📋 Table: ${tableName}`);
                        console.log('   Columns:');
                        
                        columns.forEach(col => {
                            const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
                            const pk = col.pk ? ' (PRIMARY KEY)' : '';
                            console.log(`     - ${col.name}: ${col.type} ${nullable}${pk}`);
                        });
                        
                        tableSchemas[tableName] = columns;
                        
                        // Get row count
                        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
                            if (!err) {
                                console.log(`   📈 Rows: ${result.count}`);
                            }
                            console.log('');
                            
                            completed++;
                            if (completed === tables.length) {
                                db.close();
                                resolve(tableSchemas);
                            }
                        });
                    }
                });
            });
        });
    });
}

async function validateRequiredStructure(schemas) {
    console.log('✅ SCHEMA VALIDATION');
    console.log('====================\n');
    
    const requiredTables = [
        'email_accounts',
        'registration_attempts', 
        'registration_steps',
        'form_interactions',
        'ai_interactions',
        'system_events',
        'performance_metrics',
        'detection_events'
    ];
    
    const requiredFields = {
        email_accounts: ['id', 'email', 'service', 'session_id', 'created_at', 'status'],
        registration_attempts: ['id', 'session_id', 'email_id', 'target_site', 'target_url', 'status', 'success'],
        registration_steps: ['id', 'registration_id', 'step_name', 'step_type', 'status'],
        form_interactions: ['id', 'step_id', 'field_name', 'input_value', 'ai_generated'],
        ai_interactions: ['id', 'registration_id', 'prompt', 'response', 'model_used', 'success']
    };
    
    let validationPassed = true;
    
    // Check required tables exist
    for (const tableName of requiredTables) {
        if (schemas[tableName]) {
            console.log(`✅ Table '${tableName}' exists`);
            
            // Check required fields
            if (requiredFields[tableName]) {
                const columnNames = schemas[tableName].map(col => col.name);
                const missingFields = requiredFields[tableName].filter(field => !columnNames.includes(field));
                
                if (missingFields.length === 0) {
                    console.log(`   ✅ All required fields present`);
                } else {
                    console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
                    validationPassed = false;
                }
            }
        } else {
            console.log(`❌ Table '${tableName}' missing`);
            validationPassed = false;
        }
    }
    
    console.log(`\n🎯 DATABASE VALIDATION: ${validationPassed ? 'PASSED' : 'FAILED'}`);
    
    if (validationPassed) {
        console.log('\n📋 Database Schema Summary:');
        console.log('✅ Email tracking with full details');
        console.log('✅ Registration attempts with email + site identification');  
        console.log('✅ Step-by-step process logging');
        console.log('✅ Form interaction tracking');
        console.log('✅ AI interaction logging');
        console.log('✅ System event logging');
        console.log('✅ Performance metrics');
        console.log('✅ Detection event tracking');
        console.log('\n🎉 Database models fully support all requirements!');
    }
    
    return validationPassed;
}

// Run the check
checkDatabaseSchema()
    .then(schemas => {
        return validateRequiredStructure(schemas);
    })
    .then(isValid => {
        if (isValid) {
            console.log('\n🟢 Database models are ready for production use!');
            process.exit(0);
        } else {
            console.log('\n🔴 Database models need adjustments');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Database check failed:', error);
        process.exit(1);
    });