/**
 * Debug script to test form analysis on SurveyPlanet signup page
 */

const { chromium } = require('playwright');

async function debugFormAnalysis() {
    console.log('🔍 DEBUGGING FORM ANALYSIS');
    console.log('==========================');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to SurveyPlanet signup
        console.log('🌐 Navigating to SurveyPlanet...');
        await page.goto('https://surveyplanet.com');
        
        console.log('🔍 Looking for "Get started" button...');
        await page.click('text=Get started');
        
        console.log('📍 Current URL:', page.url());
        
        // Wait for form to load (SurveyPlanet uses dynamic loading)
        console.log('⏳ Waiting for form to load...');
        await page.waitForTimeout(3000);
        
        // Try to wait for some input fields to appear
        try {
            await page.waitForSelector('input', { timeout: 10000 });
            console.log('✅ Input fields detected');
        } catch (e) {
            console.log('⚠️ No input fields detected within 10 seconds');
        }
        
        // Extract basic form information
        console.log('\n📋 ANALYZING FORM DATA');
        console.log('=====================');
        
        const formData = await page.evaluate(() => {
            const data = {
                url: window.location.href,
                title: document.title,
                forms: [],
                allInputs: []
            };
            
            // Find all forms
            document.querySelectorAll('form').forEach((form, i) => {
                const formInfo = {
                    index: i,
                    action: form.action || '',
                    method: form.method || 'GET',
                    fields: []
                };
                
                // Get all inputs in this form
                form.querySelectorAll('input, textarea, select').forEach((field, j) => {
                    const fieldInfo = {
                        index: j,
                        type: field.type || field.tagName.toLowerCase(),
                        name: field.name || '',
                        id: field.id || '',
                        className: field.className || '',
                        placeholder: field.placeholder || '',
                        required: field.required,
                        visible: field.offsetParent !== null
                    };
                    formInfo.fields.push(fieldInfo);
                });
                
                data.forms.push(formInfo);
            });
            
            // Also get all inputs (even outside forms)
            document.querySelectorAll('input, textarea, select').forEach((field, i) => {
                const fieldInfo = {
                    index: i,
                    type: field.type || field.tagName.toLowerCase(),
                    name: field.name || '',
                    id: field.id || '',
                    className: field.className || '',
                    placeholder: field.placeholder || '',
                    required: field.required,
                    visible: field.offsetParent !== null,
                    inForm: !!field.closest('form')
                };
                data.allInputs.push(fieldInfo);
            });
            
            return data;
        });
        
        console.log(`📊 Found ${formData.forms.length} forms`);
        console.log(`📊 Found ${formData.allInputs.length} total input fields`);
        
        formData.forms.forEach((form, i) => {
            console.log(`\n📝 Form ${i}:`);
            console.log(`   Action: ${form.action}`);
            console.log(`   Method: ${form.method}`);
            console.log(`   Fields: ${form.fields.length}`);
            
            form.fields.forEach((field, j) => {
                console.log(`     ${j}: ${field.type} - name:"${field.name}" id:"${field.id}" placeholder:"${field.placeholder}" required:${field.required}`);
            });
        });
        
        console.log('\n📋 ALL INPUT FIELDS:');
        formData.allInputs.forEach((field, i) => {
            console.log(`  ${i}: ${field.type} - name:"${field.name}" id:"${field.id}" placeholder:"${field.placeholder}" required:${field.required} inForm:${field.inForm} visible:${field.visible}`);
        });
        
        // Test filling
        console.log('\n🖊️ TESTING FORM FILLING');
        console.log('========================');
        
        const testData = {
            email: 'test@example.com',
            fullName: 'John Doe',
            password: 'TestPass123!'
        };
        
        // Try to fill fields by common patterns
        const fillAttempts = [
            { selector: 'input[name*="email"]:not([name*="confirm"])', value: testData.email, label: 'Email' },
            { selector: 'input[name*="email"][name*="confirm"]', value: testData.email, label: 'Confirm Email' },
            { selector: 'input[name*="name"]', value: testData.fullName, label: 'Full Name' },
            { selector: 'input[type="password"]', value: testData.password, label: 'Password' },
            { selector: 'input[type="checkbox"]', value: null, label: 'Terms Checkbox' }
        ];
        
        for (const attempt of fillAttempts) {
            try {
                const elements = await page.locator(attempt.selector);
                const count = await elements.count();
                console.log(`🔍 ${attempt.label}: Found ${count} elements with selector "${attempt.selector}"`);
                
                if (count > 0) {
                    if (attempt.value) {
                        await elements.first().fill(attempt.value);
                        console.log(`✅ Filled ${attempt.label} with "${attempt.value}"`);
                    } else {
                        await elements.first().check();
                        console.log(`✅ Checked ${attempt.label}`);
                    }
                }
            } catch (error) {
                console.log(`❌ Failed to fill ${attempt.label}: ${error.message}`);
            }
        }
        
        // Wait a bit to see the filled form
        console.log('\n⏳ Waiting 5 seconds to see filled form...');
        await page.waitForTimeout(5000);
        
        console.log('\n✅ Form analysis complete');
        
    } catch (error) {
        console.error(`❌ Debug failed: ${error.message}`);
    } finally {
        await browser.close();
    }
}

debugFormAnalysis().catch(console.error);