#!/usr/bin/env node

/**
 * EMERGENCY FIX SCRIPT
 * 
 * Fixes the most critical issues that are breaking the application:
 * 1. Command binding issues in app.js
 * 2. Email database storage missing
 * 3. Basic functionality tests
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY FIX SCRIPT');
console.log('========================');

// Fix 1: Add database integration to EmailAccountManager
function fixEmailDatabaseIntegration() {
    console.log('\n🔧 Fix 1: Adding database integration to EmailAccountManager...');
    
    const emailManagerPath = './src/email/email-account-manager.js';
    let content = fs.readFileSync(emailManagerPath, 'utf8');
    
    // Add database import at the top
    if (!content.includes('require(\'sqlite3\')')) {
        content = content.replace(
            "const crypto = require('crypto');",
            `const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();`
        );
    }
    
    // Add database integration to constructor
    if (!content.includes('this.db = ')) {
        content = content.replace(
            'this.activeAccounts = new Map();',
            `this.activeAccounts = new Map();
        this.db = null; // Will be initialized in initialize()`
        );
    }
    
    // Add database initialization
    if (!content.includes('initializeDatabase')) {
        const dbInitCode = `
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database('poll-automation.db', (err) => {
                if (err) {
                    this.log('❌ Database connection failed: ' + err.message);
                    reject(err);
                } else {
                    this.log('✅ Database connected for email management');
                    resolve();
                }
            });
        });
    }
    
    async saveEmailToDatabase(emailData) {
        if (!this.db) {
            await this.initializeDatabase();
        }
        
        return new Promise((resolve, reject) => {
            const query = \`INSERT INTO email_accounts 
                (email, service, username, password, inbox_url, service_specific_data, is_verified, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`;
            
            this.db.run(query, [
                emailData.email,
                emailData.service || 'tempmail',
                emailData.username || '',
                emailData.password || '',
                emailData.inboxUrl || '',
                JSON.stringify(emailData.serviceData || {}),
                emailData.verified ? 1 : 0,
                1 // is_active
            ], function(err) {
                if (err) {
                    console.error('❌ Failed to save email to database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Email saved to database:', emailData.email);
                    resolve(this.lastID);
                }
            });
        });
    }`;
        
        content = content.replace(
            'async initialize() {',
            `${dbInitCode}
    
    async initialize() {`
        );
    }
    
    // Add database save call to email creation
    if (!content.includes('await this.saveEmailToDatabase')) {
        content = content.replace(
            /return emailAccount;/g,
            `// Save to database
            try {
                await this.saveEmailToDatabase(emailAccount);
            } catch (error) {
                this.log('⚠️ Database save failed: ' + error.message);
            }
            
            return emailAccount;`
        );
    }
    
    fs.writeFileSync(emailManagerPath, content);
    console.log('✅ Email database integration added');
}

// Fix 2: Add proper command binding to app.js  
function fixCommandBinding() {
    console.log('\n🔧 Fix 2: Fixing command binding issues...');
    
    const appPath = './app.js';
    let content = fs.readFileSync(appPath, 'utf8');
    
    // Fix all action bindings
    content = content.replace(
        /\.action\(async \(([^)]*)\) => \{/g,
        '.action(async ($1) => {'
    );
    
    content = content.replace(
        /\}\);$/gm,
        '}.bind(this));'
    );
    
    // But fix the ones that already have .bind(this)
    content = content.replace(
        /\}\.bind\(this\)\.bind\(this\)\)\;/g,
        '}.bind(this));'
    );
    
    fs.writeFileSync(appPath, content);
    console.log('✅ Command binding fixed');
}

// Fix 3: Create a simple test script
function createSimpleTest() {
    console.log('\n🔧 Fix 3: Creating simple test script...');
    
    const testScript = `#!/usr/bin/env node

// SIMPLE FUNCTIONALITY TEST

async function testBasicFunctionality() {
    console.log('🧪 BASIC FUNCTIONALITY TEST');
    console.log('============================');
    
    // Test 1: Database access
    console.log('\\n1️⃣ Testing database access...');
    try {
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('poll-automation.db');
        
        db.get("SELECT COUNT(*) as count FROM email_accounts", (err, row) => {
            if (err) {
                console.log('❌ Database test failed:', err.message);
            } else {
                console.log('✅ Database works - found', row.count, 'email accounts');
            }
            db.close();
        });
    } catch (e) {
        console.log('❌ Database test failed:', e.message);
    }
    
    // Test 2: LLM service
    console.log('\\n2️⃣ Testing LLM service...');
    try {
        const axios = require('axios');
        const response = await axios.get('http://localhost:5000/health', {timeout: 3000});
        console.log('✅ LLM service works:', response.data.service);
    } catch (e) {
        console.log('❌ LLM service failed:', e.message);
    }
    
    // Test 3: App loading
    console.log('\\n3️⃣ Testing app loading...');
    try {
        delete require.cache[require.resolve('./app.js')];
        const App = require('./app.js');
        console.log('✅ App loads successfully');
    } catch (e) {
        console.log('❌ App loading failed:', e.message);
    }
    
    console.log('\\n🏁 Basic tests completed');
}

testBasicFunctionality().catch(console.error);
`;
    
    fs.writeFileSync('./test-basic.js', testScript);
    fs.chmodSync('./test-basic.js', '755');
    console.log('✅ Basic test script created');
}

// Fix 4: Create minimal working email command
function createMinimalEmailCommand() {
    console.log('\n🔧 Fix 4: Creating minimal working email command...');
    
    const minimalScript = `#!/usr/bin/env node

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
`;
    
    fs.writeFileSync('./test-email-minimal.js', minimalScript);
    fs.chmodSync('./test-email-minimal.js', '755');
    console.log('✅ Minimal email test created');
}

// Run all fixes
async function runAllFixes() {
    try {
        fixEmailDatabaseIntegration();
        fixCommandBinding();
        createSimpleTest();
        createMinimalEmailCommand();
        
        console.log('\n🎉 ALL FIXES COMPLETED!');
        console.log('========================');
        console.log('✅ Email database integration added');
        console.log('✅ Command binding issues fixed');
        console.log('✅ Test scripts created');
        console.log('');
        console.log('🧪 Next steps:');
        console.log('  node test-basic.js          # Test basic functionality');
        console.log('  node test-email-minimal.js  # Test email creation');
        console.log('  node app.js create-email    # Test fixed command');
        console.log('  node app.js --help          # Check commands work');
        
    } catch (error) {
        console.error('💥 Fix failed:', error.message);
        process.exit(1);
    }
}

runAllFixes();