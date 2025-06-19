/**
 * Simple Email Test - Manual Navigation
 */

const { chromium } = require('playwright');

async function testSimpleEmail() {
    console.log('🧪 Testing simple email access...');
    
    let browser = null;
    let page = null;
    
    try {
        browser = await chromium.launch({ headless: true }); // Run in headless mode for WSL
        page = await browser.newPage();
        
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        
        console.log('🌐 Testing TempMail...');
        await page.goto('https://temp-mail.org', { waitUntil: 'networkidle', timeout: 30000 });
        
        // Take screenshot to see what we're dealing with
        await page.screenshot({ path: 'tempmail-debug.png' });
        console.log('📸 Screenshot saved as tempmail-debug.png');
        
        // Check what selectors are available
        const emailInputs = await page.$$('input[type="email"], input[id*="mail"], input[class*="mail"]');
        console.log(`Found ${emailInputs.length} potential email inputs`);
        
        const allInputs = await page.$$('input');
        console.log(`Total inputs found: ${allInputs.length}`);
        
        for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
            const input = allInputs[i];
            const id = await input.getAttribute('id');
            const className = await input.getAttribute('class');
            const type = await input.getAttribute('type');
            const placeholder = await input.getAttribute('placeholder');
            
            console.log(`Input ${i + 1}: id="${id}", class="${className}", type="${type}", placeholder="${placeholder}"`);
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Simple email test failed:', error.message);
        return { success: false, error: error.message };
        
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

testSimpleEmail();