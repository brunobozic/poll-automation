#!/usr/bin/env node

/**
 * Debug selector generation in page.evaluate context
 */

const { chromium } = require('playwright');

async function debugSelectorGeneration() {
    console.log('🔍 Debugging selector generation...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Test with a page that has actual form inputs
        await page.goto('https://forms.google.com/forms/d/e/1FAIpQLSf_test_example', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('📄 Page loaded, testing selector generation...');
        
        // Test the selector generation function in isolation
        const testResult = await page.evaluate(() => {
            // Define the helper function
            function generateSelector(element) {
                if (!element) return null;
                if (element.id) return `#${element.id}`;
                if (element.className) {
                    const classes = element.className.split(' ').filter(c => c.length > 0);
                    if (classes.length > 0) return `.${classes.join('.')}`;
                }
                return element.tagName.toLowerCase();
            }
            
            // Test with real elements
            const results = {};
            const inputs = document.querySelectorAll('input, select, textarea');
            
            results.totalInputs = inputs.length;
            results.selectors = [];
            results.errors = [];
            
            inputs.forEach((input, i) => {
                try {
                    const selector = generateSelector(input);
                    results.selectors.push({
                        index: i,
                        selector: selector,
                        type: input.type || input.tagName.toLowerCase(),
                        id: input.id || '',
                        className: input.className || ''
                    });
                } catch (error) {
                    results.errors.push(`Input ${i}: ${error.message}`);
                }
            });
            
            return results;
        });
        
        console.log('🎯 Test Results:');
        console.log(`   Total inputs found: ${testResult.totalInputs}`);
        console.log(`   Selectors generated: ${testResult.selectors.length}`);
        console.log(`   Errors: ${testResult.errors.length}`);
        
        if (testResult.selectors.length > 0) {
            console.log('\n📋 Generated selectors:');
            testResult.selectors.forEach(s => {
                console.log(`   ${s.index}: ${s.selector} (${s.type})`);
            });
        }
        
        if (testResult.errors.length > 0) {
            console.log('\n❌ Errors:');
            testResult.errors.forEach(e => console.log(`   ${e}`));
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await browser.close();
    }
}

debugSelectorGeneration().catch(console.error);