#!/usr/bin/env node

/**
 * Enhanced LLM Insights Testing
 * Tests different types of survey/form sites to gather diverse LLM reasoning data
 */

const { chromium } = require('playwright');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');

async function testEnhancedLLMInsights() {
    console.log('🧠 ENHANCED LLM INSIGHTS TESTING');
    console.log('=================================');
    console.log('🎯 Goal: Capture deep LLM reasoning patterns across diverse site types\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 100
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();

    try {
        // Initialize the form automator with enhanced debug mode
        const contentAI = new ContentUnderstandingAI();
        const automator = new UniversalFormAutomator(contentAI, {
            debugMode: true,  // Enable enhanced debug logging
            humanLikeDelays: true
        });
        
        // Test different types of sites to gather diverse insights
        const testSites = [
            { 
                name: 'Wufoo', 
                url: 'https://wufoo.com',
                type: 'form_builder',
                signupSelector: 'text=Sign Up',
                expectedComplexity: 'medium',
                notes: 'Professional form builder - likely has sophisticated anti-bot measures'
            },
            { 
                name: 'Formstack', 
                url: 'https://formstack.com',
                type: 'enterprise_forms',
                signupSelector: 'text=Start Free Trial',
                expectedComplexity: 'high',
                notes: 'Enterprise form solution - complex registration flow expected'
            },
            { 
                name: 'Cognito Forms', 
                url: 'https://cognitoforms.com',
                type: 'form_platform',
                signupSelector: 'text=Sign Up Free',
                expectedComplexity: 'medium',
                notes: 'Form platform with potential multi-step registration'
            }
        ];
        
        for (const site of testSites) {
            console.log(`\n🌐 TESTING: ${site.name} (${site.type.toUpperCase()})`);
            console.log('='.repeat(70));
            console.log(`📍 URL: ${site.url}`);
            console.log(`🔍 Expected Complexity: ${site.expectedComplexity}`);
            console.log(`📝 Notes: ${site.notes}`);
            console.log('');
            
            const startTime = Date.now();
            
            try {
                // Navigate to site
                console.log(`📍 Navigating to ${site.url}...`);
                await page.goto(site.url, { timeout: 30000 });
                
                // Handle cookies with enhanced logging
                console.log('🍪 Comprehensive cookie consent handling...');
                const cookieSelectors = [
                    'text=Accept All', 'text=Accept all cookies', 'text=Accept', 'text=Allow all',
                    'text=OK', 'text=I understand', 'text=Continue', 'text=Agree',
                    'button*=Accept', 'button*=Allow', 'button*=OK', 'button*=Continue',
                    '[id*="accept"]', '[class*="accept"]', '[data-testid*="accept"]',
                    '#cookie-accept', '.cookie-accept', '.accept-cookies'
                ];
                
                let cookiesHandled = false;
                for (const selector of cookieSelectors) {
                    try {
                        await page.click(selector, { timeout: 2000 });
                        console.log(`✅ Accepted cookies: ${selector}`);
                        cookiesHandled = true;
                        await page.waitForTimeout(1000);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!cookiesHandled) {
                    console.log('ℹ️ No cookie consent detected or already handled');
                }
                
                // Enhanced signup button detection
                console.log(`🔍 Searching for signup button: ${site.signupSelector}`);
                const signupSelectors = [
                    site.signupSelector,
                    'text=Sign Up', 'text=Sign up', 'text=SIGN UP',
                    'text=Get Started', 'text=Start Free', 'text=Free Trial',
                    'text=Register', 'text=Join', 'text=Create Account',
                    'button*=Sign', 'button*=Start', 'button*=Free',
                    'a*=Sign Up', 'a*=Get Started', 'a*=Free Trial',
                    '[data-testid*="signup"]', '[data-testid*="register"]'
                ];
                
                let signupFound = false;
                for (const selector of signupSelectors) {
                    try {
                        await page.click(selector, { timeout: 3000 });
                        console.log(`✅ Clicked signup: ${selector}`);
                        signupFound = true;
                        await page.waitForTimeout(3000);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!signupFound) {
                    console.log('⚠️ No signup button found, analyzing current page...');
                }
                
                // Capture timing for performance analysis
                const navigationTime = Date.now() - startTime;
                
                // Enhanced form analysis with reasoning capture
                console.log(`🤖 Starting enhanced LLM-powered form analysis...`);
                console.log(`⏱️ Navigation completed in ${navigationTime}ms`);
                
                const analysisStartTime = Date.now();
                const analysis = await automator.analyzeForm(page, site.name);
                const analysisTime = Date.now() - analysisStartTime;
                
                // Log enhanced analysis results
                console.log(`\n📊 ENHANCED ANALYSIS RESULTS FOR ${site.name}:`);
                console.log(`   ⏱️ Analysis time: ${analysisTime}ms`);
                console.log(`   🎯 Site type: ${site.type}`);
                console.log(`   📝 Fields found: ${analysis.fields?.length || 0}`);
                console.log(`   ☑️ Checkboxes: ${analysis.checkboxes?.length || 0}`);
                console.log(`   🍯 Honeypots detected: ${analysis.honeypots?.length || 0}`);
                console.log(`   🎯 Confidence: ${((analysis.confidence || 0) * 100).toFixed(1)}%`);
                console.log(`   🧠 Analysis method: ${analysis.source || 'LLM + Fallback'}`);
                
                // Detailed breakdown for insights
                if (analysis.fields?.length > 0) {
                    console.log(`\n   📝 FIELD ANALYSIS:`);
                    const fieldsByPurpose = {};
                    analysis.fields.forEach(field => {
                        if (!fieldsByPurpose[field.purpose]) fieldsByPurpose[field.purpose] = 0;
                        fieldsByPurpose[field.purpose]++;
                    });
                    Object.entries(fieldsByPurpose).forEach(([purpose, count]) => {
                        console.log(`      ${purpose}: ${count} field(s)`);
                    });
                }
                
                if (analysis.honeypots?.length > 0) {
                    console.log(`\n   🍯 HONEYPOT ANALYSIS:`);
                    const honeypotsByType = {};
                    analysis.honeypots.forEach(honeypot => {
                        const type = honeypot.reasoning?.split(':')[0] || 'unknown';
                        if (!honeypotsByType[type]) honeypotsByType[type] = 0;
                        honeypotsByType[type]++;
                    });
                    Object.entries(honeypotsByType).forEach(([type, count]) => {
                        console.log(`      ${type}: ${count} trap(s)`);
                    });
                }
                
                // Capture site-specific insights
                const siteInsights = {
                    siteType: site.type,
                    expectedComplexity: site.expectedComplexity,
                    actualComplexity: analysis.fields?.length > 10 ? 'high' : analysis.fields?.length > 5 ? 'medium' : 'low',
                    navigationTime: navigationTime,
                    analysisTime: analysisTime,
                    cookiesHandled: cookiesHandled,
                    signupFound: signupFound,
                    totalElements: (analysis.fields?.length || 0) + (analysis.checkboxes?.length || 0) + (analysis.honeypots?.length || 0)
                };
                
                console.log(`\n   📈 SITE INSIGHTS:`);
                console.log(`      Expected vs Actual complexity: ${site.expectedComplexity} → ${siteInsights.actualComplexity}`);
                console.log(`      Total interactive elements: ${siteInsights.totalElements}`);
                console.log(`      Cookie handling: ${cookiesHandled ? 'Success' : 'Not needed'}`);
                console.log(`      Signup detection: ${signupFound ? 'Success' : 'Failed'}`);
                
            } catch (error) {
                console.error(`❌ Error testing ${site.name}: ${error.message}`);
                console.log(`   Error type: ${error.constructor.name}`);
                console.log(`   Likely cause: ${this.diagnoseFai‌lure(error.message)}`);
            }
            
            // Wait between tests to avoid rate limiting
            console.log('\n⏳ Waiting before next test...');
            await page.waitForTimeout(3000);
        }
        
        console.log('\n✅ ENHANCED LLM INSIGHTS TEST COMPLETE');
        console.log('=====================================');
        console.log('🔍 Check logs/llm-insights-YYYY-MM-DD.jsonl for detailed reasoning analysis');
        console.log('📊 Enhanced logs now include:');
        console.log('   • Token count estimates for cost analysis');
        console.log('   • Prompt complexity metrics');
        console.log('   • LLM reasoning pattern detection');
        console.log('   • Decision pattern identification');
        console.log('   • Context clue analysis');
        console.log('   • Performance correlation data');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
}

function diagnoseFai‌lure(errorMessage) {
    if (errorMessage.includes('timeout')) return 'Page loading timeout or element not found';
    if (errorMessage.includes('Navigation')) return 'Site navigation or access issue';
    if (errorMessage.includes('401')) return 'API authentication problem';
    if (errorMessage.includes('blocked')) return 'Site blocking automation';
    return 'Unknown error - check logs for details';
}

if (require.main === module) {
    testEnhancedLLMInsights().catch(console.error);
}

module.exports = { testEnhancedLLMInsights };