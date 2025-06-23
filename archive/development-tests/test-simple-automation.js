#!/usr/bin/env node

/**
 * Simple Automation Test
 * Verifies the core automation pipeline works step by step
 */

const { chromium } = require('playwright');
const { getDatabaseManager } = require('./src/database/database-manager');

async function testAutomation() {
    console.log('🎯 SIMPLE AUTOMATION PIPELINE TEST');
    console.log('==================================');
    
    let browser, page, db;
    
    try {
        // Step 1: Initialize database
        console.log('📊 Step 1: Initializing database...');
        db = getDatabaseManager();
        await db.initialize();
        console.log('✅ Database ready');
        
        // Step 2: Initialize browser
        console.log('🌐 Step 2: Launching browser...');
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 100 
        });
        page = await browser.newPage();
        console.log('✅ Browser ready');
        
        // Step 3: Test SurveyPlanet
        await testSite(page, db, 'https://www.surveyplanet.com/register', 'SurveyPlanet');
        
        // Step 4: Test Typeform  
        await testSite(page, db, 'https://www.typeform.com/signup', 'Typeform');
        
        console.log('\n🎉 All automation tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        if (db) await db.close();
    }
}

async function testSite(page, db, url, siteName) {
    console.log(`\n🎯 Testing ${siteName} (${url})`);
    console.log('━'.repeat(50));
    
    try {
        // Step 1: Create test email
        console.log('📧 Creating test email...');
        const email = `test-${siteName.toLowerCase()}-${Date.now()}@automation.test`;
        console.log(`✅ Email: ${email}`);
        
        // Step 2: Log to database
        console.log('📊 Logging to database...');
        const emailResult = await db.run(`
            INSERT INTO email_accounts (email, service, password, is_verified, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [email, 'automation_test', 'test_password', 1, 1]);
        console.log(`✅ Email logged (ID: ${emailResult.lastID})`);
        
        // Step 3: Navigate to site
        console.log('🌐 Navigating to site...');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        console.log('✅ Navigation complete');
        
        // Step 4: Take screenshot
        const screenshotPath = `./screenshots/${siteName.toLowerCase()}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot: ${screenshotPath}`);
        
        // Step 5: Analyze form fields
        console.log('🔍 Analyzing form fields...');
        const fields = await analyzeForm(page);
        console.log(`✅ Found ${fields.length} form fields`);
        fields.forEach(field => {
            console.log(`   • ${field.type}: ${field.selector}`);
        });
        
        // Step 6: Fill form fields
        console.log('✏️ Filling form fields...');
        let filledCount = 0;
        
        for (const field of fields) {
            try {
                let value = '';
                switch (field.type) {
                    case 'email':
                        value = email;
                        break;
                    case 'password':
                        value = 'TestPassword123!';
                        break;
                    case 'text':
                        value = 'Test User';
                        break;
                }
                
                await page.fill(field.selector, value);
                await page.waitForTimeout(500);
                filledCount++;
                console.log(`   ✅ Filled ${field.type}: ${value}`);
                
            } catch (error) {
                console.log(`   ⚠️ Failed to fill ${field.type}: ${error.message}`);
            }
        }
        
        // Step 7: Handle checkboxes
        console.log('☑️ Handling checkboxes...');
        let checkboxCount = 0;
        try {
            const checkboxes = await page.$$('input[type="checkbox"]:visible');
            for (const checkbox of checkboxes) {
                await checkbox.check();
                checkboxCount++;
                await page.waitForTimeout(300);
            }
            console.log(`✅ Checked ${checkboxCount} checkboxes`);
        } catch (error) {
            console.log(`⚠️ Checkbox handling: ${error.message}`);
        }
        
        // Step 8: Final screenshot
        const finalScreenshot = `./screenshots/${siteName.toLowerCase()}-final-${Date.now()}.png`;
        await page.screenshot({ path: finalScreenshot });
        console.log(`📸 Final screenshot: ${finalScreenshot}`);
        
        // Step 9: Log results
        const success = filledCount > 0;
        await db.run(`
            INSERT INTO registration_attempts (email_id, site_id, success, error_message, execution_time_ms)
            VALUES (?, 1, ?, ?, ?)
        `, [emailResult.lastID, success ? 1 : 0, success ? null : 'Form filling incomplete', 10000]);
        
        console.log(`${success ? '✅' : '❌'} ${siteName} test ${success ? 'PASSED' : 'FAILED'}`);
        console.log(`📊 Summary: ${filledCount} fields filled, ${checkboxCount} checkboxes checked`);
        
        return { success, filledCount, checkboxCount };
        
    } catch (error) {
        console.log(`❌ ${siteName} test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function analyzeForm(page) {
    const fields = [];
    
    try {
        // Find email fields
        const emailFields = await page.$$('input[type="email"]');
        for (const field of emailFields) {
            const isVisible = await field.isVisible();
            if (isVisible) {
                fields.push({
                    type: 'email',
                    selector: 'input[type="email"]'
                });
                break;
            }
        }
        
        // Find password fields
        const passwordFields = await page.$$('input[type="password"]');
        for (const field of passwordFields) {
            const isVisible = await field.isVisible();
            if (isVisible) {
                fields.push({
                    type: 'password',
                    selector: 'input[type="password"]'
                });
                break;
            }
        }
        
        // Find text fields that might be for names
        const textFields = await page.$$('input[type="text"]');
        for (const field of textFields) {
            const isVisible = await field.isVisible();
            if (isVisible) {
                const name = await field.getAttribute('name') || '';
                const placeholder = await field.getAttribute('placeholder') || '';
                
                if (name.toLowerCase().includes('name') || placeholder.toLowerCase().includes('name')) {
                    fields.push({
                        type: 'text',
                        selector: `input[name="${name}"]`
                    });
                    break;
                }
            }
        }
        
    } catch (error) {
        console.log(`⚠️ Form analysis error: ${error.message}`);
    }
    
    return fields;
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots');
}

// Run the test
testAutomation().catch(console.error);