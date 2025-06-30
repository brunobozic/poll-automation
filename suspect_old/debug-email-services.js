#!/usr/bin/env node

/**
 * DEBUG EMAIL SERVICES
 * Quick diagnostic to see what's actually on the email service pages
 */

const { chromium } = require('playwright');

async function debugEmailServices() {
    console.log('🔍 DEBUGGING EMAIL SERVICES');
    console.log('============================');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Test TempMail
    console.log('\n1️⃣ Testing TempMail...');
    try {
        await page.goto('https://temp-mail.org', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        // Check what's actually on the page
        const title = await page.title();
        console.log('📋 Page title:', title);

        // Look for email input alternatives
        const selectors = ['#mail', '#email', 'input[type="email"]', 'input[name="email"]', '.email-input', '#copy-button'];
        
        for (const selector of selectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const value = await element.inputValue().catch(() => null);
                    const text = await element.textContent().catch(() => null);
                    console.log(`✅ Found ${selector}: value="${value}" text="${text}"`);
                } else {
                    console.log(`❌ Not found: ${selector}`);
                }
            } catch (e) {
                console.log(`❌ Error with ${selector}: ${e.message}`);
            }
        }

        // Get page source around email area
        const emailArea = await page.$('.main-content, .container, body');
        if (emailArea) {
            const html = await emailArea.innerHTML();
            console.log('📄 Page HTML snippet:', html.substring(0, 500) + '...');
        }

    } catch (error) {
        console.log('❌ TempMail failed:', error.message);
    }

    // Test 10MinuteMail
    console.log('\n2️⃣ Testing 10MinuteMail...');
    try {
        await page.goto('https://10minutemail.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const title = await page.title();
        console.log('📋 Page title:', title);

        // Check selectors
        const selectors = ['#mailAddress', '#mail', '#email', 'input[type="email"]', '.email-address', '.copy-button'];
        
        for (const selector of selectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const value = await element.inputValue().catch(() => null);
                    const text = await element.textContent().catch(() => null);
                    console.log(`✅ Found ${selector}: value="${value}" text="${text}"`);
                } else {
                    console.log(`❌ Not found: ${selector}`);
                }
            } catch (e) {
                console.log(`❌ Error with ${selector}: ${e.message}`);
            }
        }

    } catch (error) {
        console.log('❌ 10MinuteMail failed:', error.message);
    }

    await browser.close();
    console.log('\n🏁 Debug completed');
}

debugEmailServices().catch(console.error);