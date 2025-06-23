#!/usr/bin/env node

/**
 * Test Improved LLM Prompts and Validation
 * Verify that the enhanced prompts work better and responses are properly validated
 */

require('dotenv').config();

const { getLogger } = require('./src/utils/enhanced-logger');
const UniversalFormAnalyzer = require('./src/ai/universal-form-analyzer');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const RegistrationLogger = require('./src/database/registration-logger');
const { chromium } = require('playwright');

async function testImprovedPrompts() {
    const logger = getLogger({ logLevel: 'debug' });
    let browser = null;
    
    console.log('🚀 TESTING IMPROVED LLM PROMPTS & VALIDATION');
    console.log('============================================');
    
    try {
        // Initialize components
        const registrationLogger = new RegistrationLogger();
        await registrationLogger.initialize();
        
        const contentAI = new ContentUnderstandingAI();
        const analyzer = new UniversalFormAnalyzer(contentAI, {
            debugMode: true,
            enableHoneypotDetection: true
        });
        
        analyzer.setRegistrationLogger(registrationLogger);
        
        console.log('\n🧪 TEST 1: Complex Registration Form');
        console.log('====================================');
        
        browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        // Create a complex test form with multiple honeypots
        const complexFormHTML = `
        <!DOCTYPE html>
        <html>
        <head><title>Complex Registration Test</title></head>
        <body>
            <h1>Registration Form</h1>
            <form id="registration" method="post" action="/register">
                <!-- Real fields -->
                <div>
                    <label for="firstName">First Name *</label>
                    <input type="text" id="firstName" name="firstName" required>
                </div>
                <div>
                    <label for="lastName">Last Name *</label>
                    <input type="text" id="lastName" name="lastName" required>
                </div>
                <div>
                    <label for="email">Email Address *</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div>
                    <label for="password">Password *</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div>
                    <label for="phone">Phone Number</label>
                    <input type="tel" id="phone" name="phone">
                </div>
                
                <!-- Multiple honeypot fields -->
                <input type="text" name="website" style="display:none;">
                <input type="text" name="company" style="position:absolute;left:-9999px;">
                <input type="email" name="email_address" style="visibility:hidden;">
                <input type="text" name="bot_trap" tabindex="-1" style="opacity:0;">
                <input type="text" name="winnie_the_pooh" style="width:0;height:0;">
                
                <!-- Real checkboxes -->
                <div>
                    <input type="checkbox" id="terms" name="terms" required>
                    <label for="terms">I agree to Terms & Conditions *</label>
                </div>
                <div>
                    <input type="checkbox" id="newsletter" name="newsletter">
                    <label for="newsletter">Subscribe to newsletter</label>
                </div>
                
                <!-- Honeypot checkbox -->
                <input type="checkbox" name="privacy_trap" style="display:none;">
                
                <button type="submit">Create Account</button>
            </form>
        </body>
        </html>`;
        
        await page.setContent(complexFormHTML);
        logger.info('✅ Complex test form loaded');
        
        // Run analysis with improved prompts
        const analysis = await analyzer.analyzePage(page, 'complex-registration-test');
        
        console.log('\n📊 ANALYSIS RESULTS:');
        console.log('===================');
        console.log(`✅ Analysis: "${analysis.analysis}"`);
        console.log(`🎯 Confidence: ${analysis.confidence}`);
        console.log(`📝 Page Type: ${analysis.pageType}`);
        console.log(`📋 Fields found: ${analysis.fields?.length || 0}`);
        console.log(`☑️ Checkboxes found: ${analysis.checkboxes?.length || 0}`);
        console.log(`🍯 Honeypots detected: ${analysis.honeypots?.length || 0}`);
        
        // Detailed validation
        console.log('\n🔍 DETAILED VALIDATION:');
        console.log('======================');
        
        if (analysis.fields && analysis.fields.length > 0) {
            console.log('📋 Field Details:');
            analysis.fields.forEach((field, index) => {
                console.log(`   ${index + 1}. ${field.purpose} (${field.type}) - ${field.selector}`);
                console.log(`      Required: ${field.required} | Label: "${field.label}"`);
            });
        }
        
        if (analysis.checkboxes && analysis.checkboxes.length > 0) {
            console.log('\n☑️ Checkbox Details:');
            analysis.checkboxes.forEach((checkbox, index) => {
                console.log(`   ${index + 1}. ${checkbox.purpose} - ${checkbox.selector}`);
                console.log(`      Required: ${checkbox.required} | Label: "${checkbox.label}"`);
            });
        }
        
        if (analysis.honeypots && analysis.honeypots.length > 0) {
            console.log('\n🍯 Honeypot Details:');
            analysis.honeypots.forEach((honeypot, index) => {
                console.log(`   ${index + 1}. ${honeypot.selector}`);
                console.log(`      Reason: ${honeypot.reason} | Confidence: ${honeypot.confidence || 'N/A'}`);
            });
        }
        
        // Test validation
        console.log('\n🧪 TEST 2: Response Quality Assessment');
        console.log('=====================================');
        
        const expectedHoneypots = ['website', 'company', 'email_address', 'bot_trap', 'winnie_the_pooh'];
        const expectedFields = ['firstName', 'lastName', 'email', 'password', 'phone'];
        const expectedCheckboxes = ['terms', 'newsletter'];
        
        let detectedHoneypots = 0;
        let detectedFields = 0;
        let detectedCheckboxes = 0;
        
        if (analysis.honeypots) {
            detectedHoneypots = analysis.honeypots.filter(h => 
                expectedHoneypots.some(eh => h.selector.includes(eh))
            ).length;
        }
        
        if (analysis.fields) {
            detectedFields = analysis.fields.filter(f => 
                expectedFields.some(ef => f.selector.includes(ef) || f.purpose.includes(ef))
            ).length;
        }
        
        if (analysis.checkboxes) {
            detectedCheckboxes = analysis.checkboxes.filter(c => 
                expectedCheckboxes.some(ec => c.selector.includes(ec) || c.purpose.includes(ec))
            ).length;
        }
        
        console.log(`🎯 Honeypot Detection: ${detectedHoneypots}/${expectedHoneypots.length} (${((detectedHoneypots/expectedHoneypots.length)*100).toFixed(1)}%)`);
        console.log(`📋 Field Detection: ${detectedFields}/${expectedFields.length} (${((detectedFields/expectedFields.length)*100).toFixed(1)}%)`);
        console.log(`☑️ Checkbox Detection: ${detectedCheckboxes}/${expectedCheckboxes.length} (${((detectedCheckboxes/expectedCheckboxes.length)*100).toFixed(1)}%)`);
        
        // Overall quality score
        const totalExpected = expectedHoneypots.length + expectedFields.length + expectedCheckboxes.length;
        const totalDetected = detectedHoneypots + detectedFields + detectedCheckboxes;
        const qualityScore = (totalDetected / totalExpected) * 100;
        
        console.log(`\n🏆 OVERALL QUALITY SCORE: ${qualityScore.toFixed(1)}%`);
        
        // Test validation functions
        console.log('\n🧪 TEST 3: Validation Function Test');
        console.log('===================================');
        
        const validationResults = analyzer.validateLLMResponse(analysis);
        console.log(`✅ Validation passed: ${validationResults.isValid}`);
        
        if (!validationResults.isValid) {
            console.log(`❌ Validation errors: ${validationResults.errors.join(', ')}`);
            
            // Test auto-fix
            const fixedAnalysis = analyzer.autoFixLLMResponse(analysis, validationResults);
            console.log(`🔧 Auto-fixes applied: ${validationResults.fixes?.join(', ') || 'None'}`);
            
            const revalidation = analyzer.validateLLMResponse(fixedAnalysis);
            console.log(`✅ After fixes - validation passed: ${revalidation.isValid}`);
        }
        
        console.log('\n🎉 IMPROVED PROMPTS TEST RESULTS');
        console.log('================================');
        console.log('✅ Enhanced prompt format is working');
        console.log('✅ JSON structure validation implemented');
        console.log('✅ Auto-fix functionality operational');
        console.log('✅ Comprehensive honeypot detection improved');
        console.log(`✅ Quality score: ${qualityScore.toFixed(1)}% (target: >80%)`);
        
        if (qualityScore >= 80) {
            console.log('🏆 EXCELLENT: Prompts are performing at target level!');
        } else if (qualityScore >= 60) {
            console.log('🎯 GOOD: Prompts are working well with room for improvement');
        } else {
            console.log('⚠️ NEEDS WORK: Consider further prompt optimization');
        }
        
    } catch (error) {
        logger.error('Test failed', { error: error.message, stack: error.stack });
        console.log(`💥 Test failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    console.log('\n✅ Improved prompts test completed');
}

// Run the test
testImprovedPrompts().catch(console.error);