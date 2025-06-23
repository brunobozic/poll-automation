#!/usr/bin/env node

/**
 * Debug HTTPBin page to understand why no forms are found
 */

const StealthBrowser = require('./src/browser/stealth');

async function debugHTTPBin() {
    console.log('🔍 Debugging HTTPBin Form Detection');
    console.log('===================================\n');
    
    const browser = new StealthBrowser();
    let context = null;
    let page = null;
    
    try {
        console.log('1. 🚀 Launching browser...');
        context = await browser.launch();
        const pageObj = await browser.newPage('base');
        page = pageObj.page;
        
        console.log('2. 📄 Loading HTTPBin...');
        await page.goto('https://httpbin.org/forms/post', { 
            waitUntil: 'networkidle', 
            timeout: 15000 
        });
        
        console.log('3. 📊 Analyzing page content...');
        
        const pageAnalysis = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                bodyLength: document.body.innerHTML.length,
                bodyText: document.body.textContent.substring(0, 500),
                allForms: document.querySelectorAll('form').length,
                allInputs: document.querySelectorAll('input').length,
                allSelects: document.querySelectorAll('select').length,
                allTextareas: document.querySelectorAll('textarea').length,
                visibleForms: Array.from(document.querySelectorAll('form')).filter(form => 
                    form.offsetParent !== null && 
                    !form.hasAttribute('hidden') && 
                    form.style.display !== 'none' &&
                    form.style.visibility !== 'hidden'
                ).length,
                visibleInputs: Array.from(document.querySelectorAll('input')).filter(inp => 
                    inp.offsetParent !== null && 
                    !inp.hasAttribute('hidden') && 
                    inp.style.display !== 'none' &&
                    inp.style.visibility !== 'hidden'
                ).length,
                formsHTML: Array.from(document.querySelectorAll('form')).map(form => ({
                    innerHTML: form.innerHTML.substring(0, 200),
                    action: form.action,
                    method: form.method,
                    visible: form.offsetParent !== null && 
                            !form.hasAttribute('hidden') && 
                            form.style.display !== 'none' &&
                            form.style.visibility !== 'hidden'
                })),
                inputsDetails: Array.from(document.querySelectorAll('input')).map(inp => ({
                    name: inp.name,
                    type: inp.type,
                    value: inp.value,
                    visible: inp.offsetParent !== null && 
                            !inp.hasAttribute('hidden') && 
                            inp.style.display !== 'none' &&
                            inp.style.visibility !== 'hidden'
                }))
            };
        });
        
        console.log('HTTPBin Page Analysis:');
        console.log(`- Title: "${pageAnalysis.title}"`);
        console.log(`- URL: ${pageAnalysis.url}`);
        console.log(`- Body Length: ${pageAnalysis.bodyLength} characters`);
        console.log(`- Body Text Preview: "${pageAnalysis.bodyText.trim()}"`);
        console.log(`- All Forms: ${pageAnalysis.allForms}`);
        console.log(`- All Inputs: ${pageAnalysis.allInputs}`);
        console.log(`- All Selects: ${pageAnalysis.allSelects}`);
        console.log(`- All Textareas: ${pageAnalysis.allTextareas}`);
        console.log(`- Visible Forms: ${pageAnalysis.visibleForms}`);
        console.log(`- Visible Inputs: ${pageAnalysis.visibleInputs}`);
        
        console.log('\nForm Details:');
        pageAnalysis.formsHTML.forEach((form, i) => {
            console.log(`Form ${i + 1}:`);
            console.log(`  - Action: ${form.action}`);
            console.log(`  - Method: ${form.method}`);
            console.log(`  - Visible: ${form.visible}`);
            console.log(`  - HTML: ${form.innerHTML.substring(0, 100)}...`);
        });
        
        console.log('\nInput Details:');
        pageAnalysis.inputsDetails.forEach((inp, i) => {
            console.log(`Input ${i + 1}: ${inp.name} (${inp.type}) - Visible: ${inp.visible}`);
        });
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'httpbin-debug.png', fullPage: true });
        console.log('\n📸 Screenshot saved as httpbin-debug.png');
        
        // Wait a bit to see if content loads dynamically
        console.log('\n4. ⏳ Waiting for potential dynamic content...');
        await page.waitForTimeout(3000);
        
        const afterWait = await page.evaluate(() => {
            return {
                allForms: document.querySelectorAll('form').length,
                visibleForms: Array.from(document.querySelectorAll('form')).filter(form => 
                    form.offsetParent !== null && 
                    !form.hasAttribute('hidden') && 
                    form.style.display !== 'none' &&
                    form.style.visibility !== 'hidden'
                ).length
            };
        });
        
        console.log(`After waiting - All Forms: ${afterWait.allForms}, Visible Forms: ${afterWait.visibleForms}`);
        
        // Try alternative HTTPBin endpoint
        console.log('\n5. 🔄 Trying alternative HTTPBin endpoint...');
        try {
            await page.goto('https://httpbin.org/html', { 
                waitUntil: 'networkidle', 
                timeout: 10000 
            });
            
            const htmlPageAnalysis = await page.evaluate(() => {
                return {
                    title: document.title,
                    allForms: document.querySelectorAll('form').length,
                    bodyText: document.body.textContent.substring(0, 200)
                };
            });
            
            console.log(`Alternative endpoint - Title: "${htmlPageAnalysis.title}"`);
            console.log(`Alternative endpoint - Forms: ${htmlPageAnalysis.allForms}`);
            console.log(`Alternative endpoint - Body: "${htmlPageAnalysis.bodyText}"`);
            
        } catch (altError) {
            console.log(`Alternative endpoint failed: ${altError.message}`);
        }
        
        return pageAnalysis;
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        return null;
    } finally {
        if (page) await page.close();
        if (context) await browser.close();
    }
}

if (require.main === module) {
    debugHTTPBin().then(result => {
        if (result) {
            console.log('\n✅ Debug completed successfully');
            console.log(`Forms found: ${result.allForms}`);
            console.log(`Visible forms: ${result.visibleForms}`);
        } else {
            console.log('\n❌ Debug failed');
        }
    }).catch(error => {
        console.error('Debug execution failed:', error.message);
    });
}

module.exports = { debugHTTPBin };