/**
 * Debug HTML analysis on SurveyPlanet signup page
 */

const { chromium } = require('playwright');

async function debugHTMLAnalysis() {
    console.log('🔍 DEBUGGING HTML ANALYSIS');
    console.log('===========================');
    
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
        
        // Wait for form to load
        console.log('⏳ Waiting for form to load...');
        await page.waitForTimeout(3000);
        
        try {
            await page.waitForSelector('input', { timeout: 10000 });
            console.log('✅ Input fields detected');
        } catch (e) {
            console.log('⚠️ No input fields detected');
        }
        
        // Get HTML source
        const htmlSource = await page.content();
        console.log(`📄 HTML source length: ${htmlSource.length} characters`);
        
        // Extract form-relevant HTML
        function extractFormRelevantHTML(htmlSource) {
            // Remove script tags, style tags, and comments to reduce noise
            let cleanHTML = htmlSource
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            // Try to find form sections
            const formMatches = cleanHTML.match(/<form[^>]*>[\s\S]*?<\/form>/gi);
            if (formMatches && formMatches.length > 0) {
                return formMatches.join('\n\n');
            }

            // If no form tags, look for input fields and surrounding context
            const inputRegex = /<[^>]*(?:input|textarea|select|button)[^>]*>/gi;
            const inputs = cleanHTML.match(inputRegex) || [];
            
            if (inputs.length > 0) {
                // Return the inputs plus some surrounding context
                return inputs.join('\n') + '\n\n' + cleanHTML.substring(0, 2000);
            }

            // Return first 3000 characters as fallback
            return cleanHTML.substring(0, 3000);
        }
        
        const formRelevantHTML = extractFormRelevantHTML(htmlSource);
        console.log(`📄 Form-relevant HTML length: ${formRelevantHTML.length} characters`);
        console.log('📄 Form-relevant HTML content:');
        console.log('=' .repeat(50));
        console.log(formRelevantHTML);
        console.log('=' .repeat(50));
        
        // Extract elements using regex
        const inputRegex = /<input[^>]*>/gi;
        const inputs = formRelevantHTML.match(inputRegex) || [];
        
        console.log(`\n🔍 Found ${inputs.length} input elements:`);
        inputs.forEach((input, i) => {
            console.log(`${i + 1}: ${input}`);
        });
        
        // Check for form tags
        const formMatches = formRelevantHTML.match(/<form[^>]*>/gi) || [];
        console.log(`\n📝 Found ${formMatches.length} form tags:`);
        formMatches.forEach((form, i) => {
            console.log(`${i + 1}: ${form}`);
        });
        
        console.log('\n✅ HTML analysis debug complete');
        
    } catch (error) {
        console.error(`❌ Debug failed: ${error.message}`);
    } finally {
        await browser.close();
    }
}

debugHTMLAnalysis().catch(console.error);