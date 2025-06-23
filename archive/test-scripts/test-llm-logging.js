#!/usr/bin/env node

/**
 * Test LLM Logging and Form Analysis
 * This test will analyze forms on different sites and capture all LLM interactions
 */

const { chromium } = require('playwright');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');

async function testLLMLogging() {
    console.log('🧪 TESTING LLM LOGGING AND FORM ANALYSIS');
    console.log('=========================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 100
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();

    try {
        // Initialize the form automator with debug mode enabled
        const contentAI = new ContentUnderstandingAI();
        const automator = new UniversalFormAutomator(contentAI, {
            debugMode: true,  // Enable debug logging
            humanLikeDelays: true
        });
        
        // Test sites to analyze
        const testSites = [
            { 
                name: 'SurveyMonkey', 
                url: 'https://surveymonkey.com',
                signupSelector: 'text=Sign up free'
            },
            { 
                name: 'JotForm', 
                url: 'https://jotform.com',
                signupSelector: 'text=Sign Up'
            },
            { 
                name: 'Google Forms', 
                url: 'https://forms.google.com',
                signupSelector: 'text=Go to Forms'
            }
        ];
        
        for (const site of testSites) {
            console.log(`\n🌐 TESTING: ${site.name} (${site.url})`);
            console.log('='.repeat(60));
            
            try {
                // Navigate to site
                console.log(`📍 Navigating to ${site.url}...`);
                await page.goto(site.url);
                
                // Handle cookies
                console.log('🍪 Checking for cookie consent...');
                const cookieSelectors = [
                    'text=Accept All', 'text=Accept all cookies', 'text=Accept', 'text=Allow all',
                    'button*=Accept', 'button*=Allow', '[id*="accept"]'
                ];
                
                for (const selector of cookieSelectors) {
                    try {
                        await page.click(selector, { timeout: 2000 });
                        console.log(`✅ Accepted cookies: ${selector}`);
                        await page.waitForTimeout(1000);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                // Try to find and click signup
                console.log(`🔍 Looking for signup button: ${site.signupSelector}`);
                try {
                    await page.click(site.signupSelector, { timeout: 5000 });
                    console.log(`✅ Clicked signup button`);
                    await page.waitForTimeout(3000);
                } catch (e) {
                    console.log(`⚠️ Signup button not found, analyzing current page...`);
                }
                
                // Analyze the form using LLM (this will generate logs)
                console.log(`🤖 Starting LLM-powered form analysis...`);
                const analysis = await automator.analyzeForm(page, site.name);
                
                console.log(`📊 ANALYSIS RESULTS FOR ${site.name}:`);
                console.log(`   📝 Fields found: ${analysis.fields?.length || 0}`);
                console.log(`   ☑️ Checkboxes: ${analysis.checkboxes?.length || 0}`);
                console.log(`   🍯 Honeypots detected: ${analysis.honeypots?.length || 0}`);
                console.log(`   🎯 Confidence: ${((analysis.confidence || 0) * 100).toFixed(1)}%`);
                
                if (analysis.fields?.length > 0) {
                    console.log(`\n   📝 DETECTED FIELDS:`);
                    analysis.fields.forEach((field, i) => {
                        console.log(`      ${i + 1}. ${field.purpose} (${field.selector})`);
                    });
                }
                
                if (analysis.honeypots?.length > 0) {
                    console.log(`\n   🍯 HONEYPOTS TO AVOID:`);
                    analysis.honeypots.forEach((honeypot, i) => {
                        console.log(`      ${i + 1}. ${honeypot.selector} - ${honeypot.reasoning}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error testing ${site.name}: ${error.message}`);
            }
            
            // Wait between tests
            await page.waitForTimeout(2000);
        }
        
        console.log('\n✅ LLM LOGGING TEST COMPLETE');
        console.log('============================');
        console.log('🔍 Check the logs/ directory for detailed LLM interactions');
        console.log('📁 Log files are saved as: logs/llm-interactions-YYYY-MM-DD.jsonl');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    testLLMLogging().catch(console.error);
}

module.exports = { testLLMLogging };