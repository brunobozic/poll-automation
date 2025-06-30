#!/usr/bin/env node

/**
 * CREATE MULTIPLE EMAILS
 * Quick creation of multiple email accounts for testing
 */

const EmailAccountManager = require('./src/email/email-account-manager');

async function createMultipleEmails() {
    console.log('📧 CREATING MULTIPLE EMAIL ACCOUNTS');
    console.log('====================================');

    const manager = new EmailAccountManager({
        headless: true,  // Run headless for speed
        debugMode: true
    });

    try {
        await manager.initialize();
        
        const emailCount = 2;
        const emails = [];
        
        for (let i = 1; i <= emailCount; i++) {
            console.log(`\n${i}️⃣ Creating email account ${i}/${emailCount}...`);
            
            try {
                const account = await manager.createEmailAccount('auto');
                emails.push(account);
                console.log(`✅ Email ${i} created: ${account.email}`);
            } catch (error) {
                console.log(`❌ Email ${i} failed: ${error.message}`);
            }
        }
        
        console.log('\n📊 SUMMARY:');
        console.log('===========');
        console.log(`Total emails created: ${emails.length}/${emailCount}`);
        emails.forEach((email, index) => {
            console.log(`${index + 1}. ${email.email} (${email.service})`);
        });
        
        await manager.cleanup();
        
    } catch (error) {
        console.error('❌ Failed to create emails:', error.message);
        process.exit(1);
    }
}

createMultipleEmails();