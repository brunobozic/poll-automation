#!/usr/bin/env node

// MINIMAL EMAIL CREATION TEST

const EmailAccountManager = require('./src/email/email-account-manager');

async function createTestEmail() {
    console.log('📧 MINIMAL EMAIL CREATION TEST');
    console.log('==============================');
    
    try {
        const manager = new EmailAccountManager({
            headless: false,
            debugMode: true
        });
        
        console.log('🚀 Initializing email manager...');
        await manager.initialize();
        
        console.log('📨 Creating email account...');
        const emailAccount = await manager.createTempMailAccount();
        
        console.log('✅ Email created:', emailAccount.email);
        
        // Test database save
        if (manager.saveEmailToDatabase) {
            console.log('💾 Saving to database...');
            await manager.saveEmailToDatabase(emailAccount);
            console.log('✅ Saved to database successfully');
        } else {
            console.log('⚠️ No database save method found');
        }
        
        await manager.cleanup();
        console.log('🏁 Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

createTestEmail();
