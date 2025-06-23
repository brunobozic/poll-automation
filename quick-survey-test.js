#!/usr/bin/env node

/**
 * Quick Survey Site Analysis
 * Faster test focused on LLM prompt evaluation
 */

require('dotenv').config();

const { getLogger } = require('./src/utils/enhanced-logger');
const UniversalFormAnalyzer = require('./src/ai/universal-form-analyzer');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const RegistrationLogger = require('./src/database/registration-logger');
const { chromium } = require('playwright');

async function quickSurveyTest() {
    const logger = getLogger({ logLevel: 'debug' });
    let browser = null;
    
    console.log('⚡ QUICK SURVEY SITE LLM EVALUATION');
    console.log('===================================');
    
    const results = [];
    
    try {
        const registrationLogger = new RegistrationLogger();
        await registrationLogger.initialize();
        
        const contentAI = new ContentUnderstandingAI();
        const analyzer = new UniversalFormAnalyzer(contentAI, {
            debugMode: true,
            enableHoneypotDetection: true
        });
        
        analyzer.setRegistrationLogger(registrationLogger);
        
        browser = await chromium.launch({ headless: false });
        
        // Test different survey site types with mock forms
        const testCases = [
            {
                name: 'SurveyPlanet Style',
                html: `
                <form id="signup" method="post">
                    <input type="text" name="first_name" placeholder="First Name" required>
                    <input type="text" name="last_name" placeholder="Last Name" required>
                    <input type="email" name="email" placeholder="Email" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <input type="text" name="company" style="display:none;">
                    <input type="checkbox" name="terms" required> I agree to terms
                    <button type="submit">Sign Up</button>
                </form>`,
                expectedFields: 4,
                expectedHoneypots: 1,
                expectedCheckboxes: 1
            },
            {
                name: 'Typeform Style',
                html: `
                <div class="typeform-signup">
                    <input type="email" name="email" placeholder="What's your email?">
                    <input type="text" name="full_name" placeholder="Your full name">
                    <input type="password" name="password" placeholder="Choose a password">
                    <input type="text" name="website" style="position:absolute;left:-9999px;">
                    <input type="text" name="bot_trap" tabindex="-1" style="opacity:0;">
                    <div class="consent">
                        <input type="checkbox" name="newsletter"> Email me tips
                        <input type="checkbox" name="terms"> I accept terms
                    </div>
                    <button class="create-account">Create my account</button>
                </div>`,
                expectedFields: 3,
                expectedHoneypots: 2,
                expectedCheckboxes: 2
            },
            {
                name: 'SurveyMonkey Style',
                html: `
                <form class="registration-form">
                    <fieldset>
                        <legend>Account Information</legend>
                        <input type="email" name="username" placeholder="Email address" required>
                        <input type="password" name="password" placeholder="Password" required>
                        <input type="text" name="firstName" placeholder="First name" required>
                        <input type="text" name="lastName" placeholder="Last name" required>
                    </fieldset>
                    <fieldset>
                        <legend>Organization (Optional)</legend>
                        <input type="text" name="organization" placeholder="Organization">
                        <input type="text" name="winnie_the_pooh" style="width:0;height:0;border:0;">
                    </fieldset>
                    <div class="agreements">
                        <input type="checkbox" name="terms" required> 
                        <label>I agree to SurveyMonkey's Terms of Use</label>
                        <input type="checkbox" name="privacy" required>
                        <label>I agree to Privacy Policy</label>
                    </div>
                    <button type="submit" class="btn-primary">Create Account</button>
                </form>`,
                expectedFields: 5,
                expectedHoneypots: 1,
                expectedCheckboxes: 2
            }
        ];
        
        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            console.log(`\n🧪 TEST ${i + 1}/3: ${testCase.name}`);
            console.log('===============================');
            
            const page = await browser.newPage();
            
            try {
                // Create test page
                const fullHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${testCase.name} Registration</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .form-container { max-width: 500px; margin: 0 auto; }
                        input, button { margin: 10px 0; padding: 10px; width: 100%; }
                        button { background: #007bff; color: white; border: none; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <div class="form-container">
                        <h1>${testCase.name} Registration</h1>
                        ${testCase.html}
                    </div>
                </body>
                </html>`;
                
                await page.setContent(fullHTML);
                
                console.log(`📄 Test page loaded for ${testCase.name}`);
                
                // Run LLM analysis
                const startTime = Date.now();
                const analysis = await analyzer.analyzePage(page, `test-${testCase.name.toLowerCase().replace(' ', '-')}`);
                const analysisTime = Date.now() - startTime;
                
                // Evaluate results
                const result = {
                    testCase: testCase.name,
                    analysis: analysis,
                    analysisTime: analysisTime,
                    expected: {
                        fields: testCase.expectedFields,
                        honeypots: testCase.expectedHoneypots,
                        checkboxes: testCase.expectedCheckboxes
                    },
                    actual: {
                        fields: analysis.fields?.length || 0,
                        honeypots: analysis.honeypots?.length || 0,
                        checkboxes: analysis.checkboxes?.length || 0
                    }
                };
                
                // Calculate accuracy scores
                result.accuracy = {
                    fields: Math.min(result.actual.fields / result.expected.fields, 1) * 100,
                    honeypots: result.actual.honeypots >= result.expected.honeypots ? 100 : (result.actual.honeypots / result.expected.honeypots) * 100,
                    checkboxes: Math.min(result.actual.checkboxes / result.expected.checkboxes, 1) * 100
                };
                
                result.overallAccuracy = (result.accuracy.fields + result.accuracy.honeypots + result.accuracy.checkboxes) / 3;
                
                console.log(`\n📊 RESULTS for ${testCase.name}:`);
                console.log(`   🎯 Confidence: ${analysis.confidence}`);
                console.log(`   📝 Page Type: ${analysis.pageType}`);
                console.log(`   📋 Fields: ${result.actual.fields}/${result.expected.fields} (${result.accuracy.fields.toFixed(1)}%)`);
                console.log(`   🍯 Honeypots: ${result.actual.honeypots}/${result.expected.honeypots} (${result.accuracy.honeypots.toFixed(1)}%)`);
                console.log(`   ☑️ Checkboxes: ${result.actual.checkboxes}/${result.expected.checkboxes} (${result.accuracy.checkboxes.toFixed(1)}%)`);
                console.log(`   ⏱️ Analysis Time: ${analysisTime}ms`);
                console.log(`   🎯 Overall Accuracy: ${result.overallAccuracy.toFixed(1)}%`);
                
                results.push(result);
                
            } catch (error) {
                console.log(`❌ ${testCase.name} failed: ${error.message}`);
                results.push({
                    testCase: testCase.name,
                    error: error.message,
                    success: false
                });
            } finally {
                await page.close();
            }
        }
        
        // Overall evaluation
        console.log('\n📈 OVERALL LLM PERFORMANCE EVALUATION');
        console.log('====================================');
        
        const successfulTests = results.filter(r => !r.error);
        const avgAccuracy = successfulTests.reduce((sum, r) => sum + r.overallAccuracy, 0) / successfulTests.length;
        const avgTime = successfulTests.reduce((sum, r) => sum + r.analysisTime, 0) / successfulTests.length;
        
        console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
        console.log(`🎯 Average accuracy: ${avgAccuracy.toFixed(1)}%`);
        console.log(`⏱️ Average analysis time: ${Math.round(avgTime)}ms`);
        
        // Detailed accuracy breakdown
        console.log('\n📊 ACCURACY BREAKDOWN:');
        const fieldAccuracy = successfulTests.reduce((sum, r) => sum + r.accuracy.fields, 0) / successfulTests.length;
        const honeypotAccuracy = successfulTests.reduce((sum, r) => sum + r.accuracy.honeypots, 0) / successfulTests.length;
        const checkboxAccuracy = successfulTests.reduce((sum, r) => sum + r.accuracy.checkboxes, 0) / successfulTests.length;
        
        console.log(`📋 Field Detection: ${fieldAccuracy.toFixed(1)}%`);
        console.log(`🍯 Honeypot Detection: ${honeypotAccuracy.toFixed(1)}%`);
        console.log(`☑️ Checkbox Detection: ${checkboxAccuracy.toFixed(1)}%`);
        
        // Performance assessment
        console.log('\n🎭 PERFORMANCE ASSESSMENT:');
        if (avgAccuracy >= 90) {
            console.log('🏆 EXCELLENT: LLM prompts are performing exceptionally well!');
        } else if (avgAccuracy >= 80) {
            console.log('🎯 GOOD: LLM prompts are working well with room for improvement');
        } else if (avgAccuracy >= 70) {
            console.log('⚠️ MODERATE: LLM prompts need optimization');
        } else {
            console.log('❌ POOR: LLM prompts require significant improvement');
        }
        
        // Save results
        const fs = require('fs').promises;
        await fs.writeFile('./quick-survey-test-results.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: results.length,
                successfulTests: successfulTests.length,
                averageAccuracy: avgAccuracy,
                averageTime: avgTime,
                fieldAccuracy: fieldAccuracy,
                honeypotAccuracy: honeypotAccuracy,
                checkboxAccuracy: checkboxAccuracy
            },
            results: results
        }, null, 2));
        
        console.log('\n📊 Results saved to: quick-survey-test-results.json');
        
        return {
            success: true,
            averageAccuracy: avgAccuracy,
            results: results
        };
        
    } catch (error) {
        logger.error('Quick survey test failed', { error: error.message, stack: error.stack });
        console.log(`💥 Test failed: ${error.message}`);
        return { success: false, error: error.message };
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
quickSurveyTest().catch(console.error);