/**
 * Debug Playwright API
 */

const { chromium } = require('playwright');

async function debugPlaywright() {
    console.log('🧪 Debugging Playwright API...');
    
    let browser = null;
    let page = null;
    
    try {
        console.log('🚀 Launching browser...');
        browser = await chromium.launch({ headless: true });
        
        console.log('📄 Creating new page...');
        page = await browser.newPage();
        
        console.log('🔍 Checking page methods...');
        console.log('Page object type:', typeof page);
        console.log('Has setUserAgent:', typeof page.setUserAgent);
        console.log('Has setViewportSize:', typeof page.setViewportSize);
        console.log('Available methods:', Object.getOwnPropertyNames(page).filter(name => typeof page[name] === 'function').slice(0, 10));
        
        // Try alternative method names
        if (typeof page.setUserAgent === 'function') {
            console.log('✅ setUserAgent is available');
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        } else if (typeof page.setExtraHTTPHeaders === 'function') {
            console.log('⚠️ Using setExtraHTTPHeaders instead');
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });
        }
        
        if (typeof page.setViewportSize === 'function') {
            console.log('✅ setViewportSize is available');
            await page.setViewportSize({ width: 1366, height: 768 });
        }
        
        console.log('✅ Debug test successful!');
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        console.error('Stack:', error.stack);
        return { success: false, error: error.message };
        
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

debugPlaywright();