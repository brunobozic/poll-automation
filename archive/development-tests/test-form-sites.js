#!/usr/bin/env node

/**
 * Test with simpler form sites to verify automation works
 */

const { chromium } = require('playwright');
const { getDatabaseManager } = require('./src/database/database-manager');

async function testFormSites() {
    console.log('🎯 FORM AUTOMATION TEST');
    console.log('========================');
    
    let browser, page, db;
    
    try {
        // Initialize
        console.log('📊 Initializing components...');
        db = getDatabaseManager();
        await db.initialize();
        
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 500 
        });
        page = await browser.newPage();
        console.log('✅ Components ready');
        
        // Test sites with known registration forms
        const testSites = [
            { 
                name: 'HTTPBin Forms', 
                url: 'https://httpbin.org/forms/post',
                description: 'Simple test form'
            },
            { 
                name: 'JSONPlaceholder', 
                url: 'https://jsonplaceholder.typicode.com',
                description: 'API testing site'
            }
        ];
        
        for (const site of testSites) {
            await testSiteAutomation(page, db, site);
        }
        
        console.log('\n🎉 Form automation testing completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        if (db) await db.close();
    }
}

async function testSiteAutomation(page, db, site) {
    console.log(`\n🎯 Testing ${site.name}`);
    console.log(`📋 ${site.description}`);
    console.log(`🌐 URL: ${site.url}`);
    console.log('━'.repeat(60));
    
    try {
        // Step 1: Create email
        const email = `test-${Date.now()}@automation.test`;
        console.log(`📧 Test email: ${email}`);
        
        // Step 2: Navigate
        console.log('🌐 Navigating...');
        await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('✅ Navigation successful');
        
        // Step 3: Screenshot
        const screenshot = `./screenshots/${site.name.replace(/\\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
        await page.screenshot({ path: screenshot, fullPage: true });
        console.log(`📸 Screenshot: ${screenshot}`);
        
        // Step 4: Comprehensive form detection
        console.log('🔍 Detecting forms and fields...');
        
        // Check for forms
        const forms = await page.$$('form');
        console.log(`📋 Found ${forms.length} forms`);
        
        // Check for input fields
        const inputFields = await page.$$('input');
        console.log(`📝 Found ${inputFields.length} input fields`);
        
        // Analyze input types
        const fieldTypes = {};
        for (const input of inputFields) {
            try {
                const type = await input.getAttribute('type') || 'text';
                const isVisible = await input.isVisible();
                
                if (isVisible) {
                    fieldTypes[type] = (fieldTypes[type] || 0) + 1;
                }
            } catch (e) {
                // Field might be detached
            }
        }
        
        console.log('📊 Visible field types:');
        Object.entries(fieldTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        
        // Step 5: Try filling common field types
        console.log('✏️ Attempting to fill fields...');
        let filledCount = 0;
        
        // Try email fields
        try {
            const emailField = await page.$('input[type="email"]');
            if (emailField && await emailField.isVisible()) {
                await emailField.fill(email);
                filledCount++;
                console.log(`   ✅ Filled email field: ${email}`);
            }
        } catch (e) {
            console.log(`   ⚠️ Email field: ${e.message}`);
        }
        
        // Try text fields
        try {
            const textFields = await page.$$('input[type="text"]:visible');
            for (let i = 0; i < Math.min(textFields.length, 2); i++) {
                await textFields[i].fill(`Test Value ${i + 1}`);
                filledCount++;
                console.log(`   ✅ Filled text field ${i + 1}`);
                await page.waitForTimeout(300);
            }
        } catch (e) {
            console.log(`   ⚠️ Text fields: ${e.message}`);
        }
        
        // Try password fields
        try {
            const passwordField = await page.$('input[type="password"]');
            if (passwordField && await passwordField.isVisible()) {
                await passwordField.fill('TestPassword123!');
                filledCount++;
                console.log(`   ✅ Filled password field`);
            }
        } catch (e) {
            console.log(`   ⚠️ Password field: ${e.message}`);
        }
        
        // Step 6: Handle checkboxes and radio buttons
        console.log('☑️ Handling checkboxes and radio buttons...');
        let interactionCount = 0;
        
        try {
            const checkboxes = await page.$$('input[type="checkbox"]:visible');
            for (const checkbox of checkboxes.slice(0, 2)) {
                await checkbox.check();
                interactionCount++;
                console.log(`   ✅ Checked checkbox`);
                await page.waitForTimeout(200);
            }
        } catch (e) {
            console.log(`   ⚠️ Checkboxes: ${e.message}`);
        }
        
        try {
            const radioButtons = await page.$$('input[type="radio"]:visible');
            if (radioButtons.length > 0) {
                await radioButtons[0].check();
                interactionCount++;
                console.log(`   ✅ Selected radio button`);
            }
        } catch (e) {
            console.log(`   ⚠️ Radio buttons: ${e.message}`);
        }
        
        // Step 7: Look for submit buttons (but don't click for safety)
        console.log('🔍 Detecting submit options...');
        
        const submitButtons = await page.$$('button[type="submit"], input[type="submit"], button:has-text("Submit")');
        console.log(`🚀 Found ${submitButtons.length} submit buttons`);
        
        const submitLinks = await page.$$('a:has-text("Submit"), a:has-text("Send")');
        console.log(`🔗 Found ${submitLinks.length} submit links`);
        
        // Step 8: Final screenshot
        const finalScreenshot = `./screenshots/${site.name.replace(/\\s+/g, '-').toLowerCase()}-final-${Date.now()}.png`;
        await page.screenshot({ path: finalScreenshot });
        console.log(`📸 Final screenshot: ${finalScreenshot}`);
        
        // Step 9: Log to database
        const emailResult = await db.run(`
            INSERT INTO email_accounts (email, service, password, is_verified, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [email, 'automation_test', 'test_password', 1, 1]);
        
        const success = filledCount > 0 || interactionCount > 0;
        await db.run(`
            INSERT INTO registration_attempts (email_id, site_id, success, error_message, execution_time_ms)
            VALUES (?, 1, ?, ?, ?)
        `, [emailResult.lastID, success ? 1 : 0, success ? null : 'No fillable fields found', 8000]);
        
        console.log(`${success ? '✅' : '❌'} ${site.name} automation ${success ? 'SUCCESSFUL' : 'LIMITED'}`);
        console.log(`📊 Results: ${filledCount} fields filled, ${interactionCount} interactions, ${forms.length} forms detected`);
        
    } catch (error) {
        console.log(`❌ ${site.name} automation failed: ${error.message}`);
    }
}

// Ensure screenshots directory exists
const fs = require('fs');
if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots');
}

// Run the test
testFormSites().catch(console.error);