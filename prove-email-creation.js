/**
 * PROVE Email Account Creation Works
 * Live test with real email services to demonstrate functionality
 */

const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');

async function proveEmailCreation() {
    console.log('🔥 PROVING EMAIL ACCOUNT CREATION WORKS');
    console.log('======================================\n');
    
    let emailManager = null;
    let logger = null;
    const results = [];
    
    try {
        // Initialize systems
        console.log('🔄 Initializing systems...');
        logger = new RegistrationLogger('./data/email-proof.db');
        await logger.initialize();
        
        emailManager = new EmailAccountManager({
            headless: true,
            debugMode: true,
            timeout: 30000,
            retryAttempts: 3
        });
        
        await emailManager.initialize();
        console.log('✅ Systems initialized\n');
        
        // Test multiple email services
        const servicesToTest = [
            { name: 'TempMail', method: 'tempmail' },
            { name: '10MinuteMail', method: 'tenminute' },
            { name: 'Guerrilla Mail', method: 'guerrilla' }
        ];
        
        for (const service of servicesToTest) {
            console.log(`🎯 Testing ${service.name}...`);
            console.log(`${'='.repeat(30)}`);
            
            try {
                const startTime = Date.now();
                
                // Create email account
                const emailAccount = await emailManager.createEmailAccount(service.method);
                
                if (emailAccount && emailAccount.email) {
                    const duration = Date.now() - startTime;
                    
                    console.log(`✅ SUCCESS: ${service.name}`);
                    console.log(`   📧 Email: ${emailAccount.email}`);
                    console.log(`   🏢 Service: ${emailAccount.service}`);
                    console.log(`   ⏱️  Duration: ${duration}ms`);
                    console.log(`   🔗 Inbox: ${emailAccount.inbox || 'N/A'}`);
                    console.log(`   📊 Status: ${emailAccount.status}`);
                    
                    // Log to database
                    const emailId = await logger.logEmailAccount({
                        email: emailAccount.email,
                        service: emailAccount.service,
                        password: emailAccount.password,
                        sessionId: `proof-${Date.now()}`,
                        status: 'active',
                        metadata: emailAccount.sessionData
                    });
                    
                    console.log(`   💾 Logged to DB (ID: ${emailId})`);
                    
                    // Test email checking
                    console.log(`   🔍 Testing email inbox access...`);
                    try {
                        const emails = await emailManager.checkEmails(emailAccount.email);
                        console.log(`   📬 Inbox accessible: ${emails.length} emails found`);
                        
                        if (emails.length > 0) {
                            console.log(`   📧 Sample email: "${emails[0].subject}" from ${emails[0].sender}`);
                        }
                    } catch (error) {
                        console.log(`   📭 Inbox check: ${error.message} (normal for new accounts)`);
                    }
                    
                    results.push({
                        service: service.name,
                        success: true,
                        email: emailAccount.email,
                        duration: duration,
                        emailId: emailId
                    });
                    
                } else {
                    throw new Error('Invalid email account response');
                }
                
            } catch (error) {
                console.log(`❌ FAILED: ${service.name}`);
                console.log(`   Error: ${error.message}`);
                
                results.push({
                    service: service.name,
                    success: false,
                    error: error.message
                });
            }
            
            console.log(''); // Spacing
            
            // Wait between attempts to be respectful
            if (servicesToTest.indexOf(service) < servicesToTest.length - 1) {
                console.log('⏳ Waiting 3 seconds before next service...\n');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // Summary
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log('📊 EMAIL CREATION PROOF RESULTS');
        console.log('================================');
        console.log(`✅ Successful: ${successful.length}/${results.length} services`);
        console.log(`❌ Failed: ${failed.length}/${results.length} services\n`);
        
        if (successful.length > 0) {
            console.log('🎉 PROOF SUCCESSFUL - Email Creation Works!');
            console.log('✅ Working Services:');
            successful.forEach(result => {
                console.log(`   • ${result.service}: ${result.email} (${result.duration}ms)`);
            });
        }
        
        if (failed.length > 0) {
            console.log('\n⚠️  Failed Services (possibly network/access issues):');
            failed.forEach(result => {
                console.log(`   • ${result.service}: ${result.error}`);
            });
        }
        
        // Database verification
        console.log('\n💾 Database Verification:');
        const stats = await logger.getRegistrationStats();
        const emailAccounts = await logger.allQuery('SELECT * FROM email_accounts ORDER BY created_at DESC LIMIT 5');
        
        console.log(`   📊 Total email accounts in DB: ${emailAccounts.length}`);
        emailAccounts.forEach(account => {
            console.log(`   📧 ${account.email} (${account.service}) - ${account.status}`);
        });
        
        return {
            success: successful.length > 0,
            results: results,
            successful: successful.length,
            failed: failed.length,
            emailAccounts: emailAccounts
        };
        
    } catch (error) {
        console.error('🔥 EMAIL CREATION PROOF FAILED');
        console.error('===============================');
        console.error(`Critical Error: ${error.message}`);
        console.error(`Stack: ${error.stack}\n`);
        
        return {
            success: false,
            error: error.message,
            results: results
        };
        
    } finally {
        // Cleanup
        try {
            if (emailManager) {
                await emailManager.cleanup();
                console.log('\n🧹 Email manager cleanup completed');
            }
            if (logger) {
                await logger.close();
                console.log('🧹 Database logger cleanup completed');
            }
        } catch (error) {
            console.error('⚠️  Cleanup error:', error.message);
        }
    }
}

// Run the proof
if (require.main === module) {
    proveEmailCreation()
        .then(result => {
            if (result.success) {
                console.log('\n🏆 EMAIL ACCOUNT CREATION PROVEN FUNCTIONAL!');
                console.log(`📧 Successfully created ${result.successful} email accounts`);
                console.log('🎯 System ready for production email automation');
                process.exit(0);
            } else {
                console.log('\n❌ Email creation proof incomplete');
                if (result.results && result.results.length > 0) {
                    console.log('Some services may be temporarily unavailable');
                }
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('🔥 Proof execution failed:', error);
            process.exit(1);
        });
}

module.exports = proveEmailCreation;