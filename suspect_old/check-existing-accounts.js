#!/usr/bin/env node

/**
 * Check Existing Accounts
 * Analyzes database for any existing login-capable accounts
 */

const { getDatabaseManager } = require('./src/database/database-manager');

async function checkExistingAccounts() {
    console.log('🔍 CHECKING FOR EXISTING LOGIN-CAPABLE ACCOUNTS');
    console.log('===============================================');
    
    const db = getDatabaseManager();
    await db.initialize();
    
    try {
        // Check for any successful registrations
        const successfulRegistrations = await db.all(`
            SELECT ra.id, ra.success, ea.email, ea.password, ss.name as site_name, ss.url, ra.automation_metadata
            FROM registration_attempts ra
            JOIN email_accounts ea ON ra.email_id = ea.id
            JOIN survey_sites ss ON ra.site_id = ss.id
            WHERE ra.success = 1
            ORDER BY ra.attempt_date DESC
        `);
        
        console.log(`📊 Found ${successfulRegistrations.length} successful registration attempts`);
        
        if (successfulRegistrations.length > 0) {
            console.log('\n✅ SUCCESSFUL REGISTRATIONS:');
            successfulRegistrations.forEach((reg, index) => {
                console.log(`   ${index + 1}. ${reg.site_name} (${reg.url})`);
                console.log(`      📧 Email: ${reg.email}`);
                console.log(`      🔑 Password: ${reg.password || 'Not stored'}`);
                
                // Try to parse metadata for login info
                try {
                    const metadata = JSON.parse(reg.automation_metadata || '{}');
                    if (metadata.loginUrl) {
                        console.log(`      🔗 Login URL: ${metadata.loginUrl}`);
                    }
                    if (metadata.canLogin) {
                        console.log(`      🎉 Login Status: Ready!`);
                    }
                } catch (e) {
                    console.log(`      📋 Metadata: ${reg.automation_metadata || 'None'}`);
                }
            });
        }
        
        // Check for stored login credentials
        const storedCredentials = await db.all(`
            SELECT response_text, form_analysis_context, timestamp
            FROM ai_interactions 
            WHERE interaction_type = 'stored_login_credentials'
            ORDER BY timestamp DESC
        `);
        
        console.log(`\n🔐 Found ${storedCredentials.length} stored login credential sets`);
        
        if (storedCredentials.length > 0) {
            console.log('\n🎉 STORED LOGIN CREDENTIALS:');
            storedCredentials.forEach((cred, index) => {
                try {
                    const data = JSON.parse(cred.response_text);
                    console.log(`   ${index + 1}. ${data.siteName}`);
                    console.log(`      🌐 Site: ${data.siteUrl}`);
                    console.log(`      📧 Email: ${data.email}`);
                    console.log(`      🔑 Password: ${data.password}`);
                    console.log(`      🔗 Login URL: ${data.loginUrl || 'Check manually'}`);
                    console.log(`      📅 Stored: ${cred.timestamp}`);
                    
                } catch (error) {
                    console.log(`   ⚠️ Error parsing credential ${index + 1}: ${error.message}`);
                }
            });
        }
        
        // Check email accounts
        const emailAccounts = await db.all(`
            SELECT email, service, password, is_verified, created_at
            FROM email_accounts
            WHERE email NOT LIKE '%example.com%' AND email NOT LIKE '%automation.test%'
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        console.log(`\n📧 Found ${emailAccounts.length} real email accounts`);
        
        if (emailAccounts.length > 0) {
            console.log('\n📬 EMAIL ACCOUNTS:');
            emailAccounts.forEach((email, index) => {
                console.log(`   ${index + 1}. ${email.email}`);
                console.log(`      🔑 Password: ${email.password || 'Not set'}`);
                console.log(`      📧 Service: ${email.service}`);
                console.log(`      ✅ Verified: ${email.is_verified ? 'Yes' : 'No'}`);
                console.log(`      📅 Created: ${email.created_at}`);
            });
        }
        
        // Summary
        console.log('\n📊 ACCOUNT STATUS SUMMARY');
        console.log('=========================');
        console.log(`✅ Successful Registrations: ${successfulRegistrations.length}`);
        console.log(`🔐 Stored Login Credentials: ${storedCredentials.length}`);
        console.log(`📧 Email Accounts: ${emailAccounts.length}`);
        
        if (successfulRegistrations.length === 0 && storedCredentials.length === 0) {
            console.log('\n❌ NO LOGIN-CAPABLE ACCOUNTS FOUND');
            console.log('   Reason: All tests were focused on analysis, not actual registration');
            console.log('   Solution: Run complete registration test with working LLM API key');
        } else {
            console.log('\n🎉 ACCOUNTS AVAILABLE FOR LOGIN!');
            console.log('   Use the credentials above to login to the respective sites');
        }
        
    } catch (error) {
        console.error('❌ Error checking accounts:', error.message);
    } finally {
        await db.close();
    }
}

if (require.main === module) {
    checkExistingAccounts().catch(console.error);
}

module.exports = checkExistingAccounts;