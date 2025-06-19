/**
 * Simple Playwright Test
 */

const { chromium } = require('playwright');

async function testPlaywright() {
    console.log('🧪 Testing Playwright functionality...');
    
    let browser = null;
    let page = null;
    
    try {
        console.log('🚀 Launching browser...');
        browser = await chromium.launch({ headless: true });
        
        console.log('📄 Creating new page...');
        page = await browser.newPage();
        
        console.log('🌐 Setting user agent...');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        console.log('📐 Setting viewport...');
        await page.setViewportSize({ width: 1366, height: 768 });
        
        console.log('🔗 Navigating to test page...');
        await page.goto('https://temp-mail.org', { timeout: 15000 });
        
        console.log('✅ Playwright test successful!');
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Playwright test failed:', error.message);
        return { success: false, error: error.message };
        
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

testPlaywright()
    .then(result => {
        if (result.success) {
            console.log('🎉 Playwright is working correctly!');
            process.exit(0);
        } else {
            console.log('❌ Playwright needs attention');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('🔥 Test failed:', error);
        process.exit(1);
    });