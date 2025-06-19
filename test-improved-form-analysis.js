#!/usr/bin/env node

/**
 * Test Improved Form Analysis - Verify the HTTPBin issue is fixed
 */

const StealthBrowser = require('./src/browser/stealth');

async function testImprovedFormAnalysis() {
    console.log('🔧 Testing Improved Form Analysis');
    console.log('=================================\n');
    
    const browser = new StealthBrowser();
    let context = null;
    let page = null;
    
    try {
        // Initialize browser
        console.log('1. 🚀 Launching browser...');
        context = await browser.launch();
        const pageObj = await browser.newPage('base');
        page = pageObj.page;
        
        // Test cases with various form types
        const testCases = [
            {
                name: 'Local Survey Registration',
                url: 'data:text/html,' + encodeURIComponent(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Survey Registration</title></head>
                    <body>
                        <h1>Join Our Survey Panel</h1>
                        <p>Register to participate in our surveys and earn rewards!</p>
                        <form id="registration-form">
                            <label>First Name:</label>
                            <input type="text" name="firstName" required>
                            
                            <label>Email Address:</label>
                            <input type="email" name="email" required>
                            
                            <label>Age:</label>
                            <input type="number" name="age" min="18" max="100">
                            
                            <button type="submit">Register Now</button>
                        </form>
                    </body>
                    </html>
                `),
                expectedPass: true,
                expectedConfidence: 'high'
            },
            {
                name: 'HTTPBin Generic Form',
                url: 'https://httpbin.org/forms/post',
                expectedPass: true,
                expectedConfidence: 'medium'
            },
            {
                name: 'Generic Survey Form',
                url: 'data:text/html,' + encodeURIComponent(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Customer Feedback</title></head>
                    <body>
                        <h1>Customer Feedback Form</h1>
                        <p>Please provide your information and feedback</p>
                        <form>
                            <label>Customer Name:</label>
                            <input type="text" name="custname">
                            
                            <label>Email:</label>
                            <input type="email" name="custemail">
                            
                            <label>Feedback:</label>
                            <textarea name="feedback"></textarea>
                            
                            <button type="submit">Submit Feedback</button>
                        </form>
                    </body>
                    </html>
                `),
                expectedPass: true,
                expectedConfidence: 'medium'
            },
            {
                name: 'Login Form (Should Fail)',
                url: 'data:text/html,' + encodeURIComponent(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Login</title></head>
                    <body>
                        <h1>Please Login</h1>
                        <form>
                            <label>Username:</label>
                            <input type="text" name="username">
                            
                            <label>Password:</label>
                            <input type="password" name="password">
                            
                            <button type="submit">Login</button>
                        </form>
                    </body>
                    </html>
                `),
                expectedPass: false,
                expectedConfidence: 'high'
            },
            {
                name: 'Payment Form (Should Fail)',
                url: 'data:text/html,' + encodeURIComponent(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Payment</title></head>
                    <body>
                        <h1>Credit Card Payment</h1>
                        <form>
                            <label>Card Number:</label>
                            <input type="text" name="cardnumber">
                            
                            <label>CVV:</label>
                            <input type="text" name="cvv">
                            
                            <button type="submit">Pay Now</button>
                        </form>
                    </body>
                    </html>
                `),
                expectedPass: false,
                expectedConfidence: 'high'
            }
        ];
        
        const results = [];
        
        for (const testCase of testCases) {
            console.log(`2. 📄 Testing: ${testCase.name}`);
            
            try {
                await page.goto(testCase.url, { waitUntil: 'networkidle', timeout: 10000 });
                console.log(`   ✅ Page loaded: ${testCase.name}`);
                
                // Run the improved form analysis
                const analysis = await improvedFormAnalysis(page);
                
                console.log(`   📊 Analysis Results:`);
                console.log(`      - Valid Registration Page: ${analysis.isValidRegistrationPage ? '✅' : '❌'}`);
                console.log(`      - Confidence: ${analysis.confidence}`);
                console.log(`      - Forms Count: ${analysis.formsCount}`);
                console.log(`      - Inputs Count: ${analysis.inputsCount}`);
                console.log(`      - Has Email Field: ${analysis.hasEmailField ? '✅' : '❌'}`);
                console.log(`      - Has Registration Indicators: ${analysis.hasRegistrationIndicators ? '✅' : '❌'}`);
                console.log(`      - Has Generic Form Indicators: ${analysis.hasGenericFormIndicators ? '✅' : '❌'}`);
                console.log(`      - Has Inappropriate Indicators: ${analysis.hasInappropriateIndicators ? '❌' : '✅'}`);
                console.log(`      - Field Analysis:`);
                console.log(`        • Personal Info: ${analysis.fieldAnalysis.hasPersonalInfo ? '✅' : '❌'}`);
                console.log(`        • Contact Info: ${analysis.fieldAnalysis.hasContactInfo ? '✅' : '❌'}`);
                console.log(`        • Demographic Info: ${analysis.fieldAnalysis.hasDemographicInfo ? '✅' : '❌'}`);
                
                if (analysis.reason) {
                    console.log(`      - Failure Reason: ${analysis.reason}`);
                }
                
                // Check if result matches expectation
                const matchesExpected = analysis.isValidRegistrationPage === testCase.expectedPass;
                const confidenceCorrect = !testCase.expectedConfidence || analysis.confidence === testCase.expectedConfidence;
                
                results.push({
                    name: testCase.name,
                    url: testCase.url,
                    success: analysis.isValidRegistrationPage,
                    expected: testCase.expectedPass,
                    correct: matchesExpected,
                    confidence: analysis.confidence,
                    expectedConfidence: testCase.expectedConfidence,
                    confidenceCorrect: confidenceCorrect,
                    analysis: analysis
                });
                
                const testResult = matchesExpected && confidenceCorrect ? '✅ CORRECT' : '❌ INCORRECT';
                console.log(`      - Test Result: ${testResult}`);
                
            } catch (error) {
                console.log(`   ❌ Failed to test ${testCase.name}: ${error.message}`);
                results.push({
                    name: testCase.name,
                    url: testCase.url,
                    success: false,
                    expected: testCase.expectedPass,
                    correct: false,
                    error: error.message
                });
            }
            
            console.log('');
        }
        
        // Summary
        const correctResults = results.filter(r => r.correct).length;
        const totalResults = results.length;
        const accuracy = (correctResults / totalResults * 100).toFixed(1);
        
        console.log('📊 IMPROVED FORM ANALYSIS RESULTS:');
        console.log('==================================');
        console.log(`Accuracy: ${correctResults}/${totalResults} (${accuracy}%)`);
        console.log('');
        
        results.forEach((result, index) => {
            const status = result.correct ? '✅ CORRECT' : '❌ INCORRECT';
            const actualResult = result.success ? 'PASS' : 'FAIL';
            const expectedResult = result.expected ? 'PASS' : 'FAIL';
            console.log(`${index + 1}. ${result.name}: ${status}`);
            console.log(`   Expected: ${expectedResult}, Got: ${actualResult}`);
            if (result.confidence && result.expectedConfidence) {
                console.log(`   Confidence: ${result.confidence} (expected: ${result.expectedConfidence})`);
            }
            if (result.analysis && result.analysis.reason) {
                console.log(`   Reason: ${result.analysis.reason}`);
            }
        });
        
        console.log('');
        
        // Specifically check HTTPBin improvement
        const httpbinResult = results.find(r => r.name === 'HTTPBin Generic Form');
        if (httpbinResult) {
            if (httpbinResult.success) {
                console.log('🎉 SUCCESS: HTTPBin form detection is now WORKING!');
                console.log('✅ The improved analysis correctly identifies generic forms');
                console.log(`✅ Confidence level: ${httpbinResult.confidence} (appropriate for generic forms)`);
            } else {
                console.log('❌ HTTPBin form detection still failing');
                console.log(`Reason: ${httpbinResult.analysis?.reason}`);
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return [];
    } finally {
        if (page) await page.close();
        if (context) await browser.close();
    }
}

/**
 * Improved form analysis function (matches the updated enhanced-app.js)
 */
async function improvedFormAnalysis(page) {
    return await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input, select, textarea');
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        
        const visibleInputs = Array.from(inputs).filter(inp => {
            return inp.offsetParent !== null && 
                   !inp.hasAttribute('hidden') && 
                   inp.style.display !== 'none' &&
                   inp.style.visibility !== 'hidden';
        });
        
        const pageText = document.body.textContent.toLowerCase();
        const pageUrl = window.location.href.toLowerCase();
        
        // Enhanced email field detection
        const hasEmailField = visibleInputs.some(inp => 
            inp.type === 'email' || 
            inp.name?.toLowerCase().includes('email') ||
            inp.id?.toLowerCase().includes('email') ||
            inp.placeholder?.toLowerCase().includes('email')
        );
        
        // Traditional registration indicators
        const hasExplicitRegistrationIndicators = 
            pageText.includes('register') || 
            pageText.includes('sign up') || 
            pageText.includes('create account') ||
            pageText.includes('join') ||
            pageText.includes('membership') ||
            pageUrl.includes('register') ||
            pageUrl.includes('signup') ||
            document.querySelector('[href*="register"], [href*="signup"]') !== null;
        
        // Generic form indicators (broader detection)
        const hasGenericFormIndicators = 
            pageText.includes('survey') ||
            pageText.includes('poll') ||
            pageText.includes('questionnaire') ||
            pageText.includes('feedback') ||
            pageText.includes('form') ||
            pageText.includes('submit') ||
            pageText.includes('information') ||
            pageText.includes('details') ||
            pageUrl.includes('form') ||
            pageUrl.includes('survey') ||
            pageUrl.includes('poll');
        
        // Security: Block obviously inappropriate forms
        const hasInappropriateIndicators = 
            pageText.includes('login') ||
            pageText.includes('signin') ||
            pageText.includes('password') ||
            pageText.includes('credit card') ||
            pageText.includes('payment') ||
            pageText.includes('billing') ||
            pageText.includes('bank') ||
            pageText.includes('social security') ||
            pageText.includes('ssn') ||
            pageUrl.includes('login') ||
            pageUrl.includes('signin') ||
            pageUrl.includes('payment') ||
            // Check for password fields (but allow if it's clearly registration)
            (visibleInputs.some(inp => inp.type === 'password') && !hasExplicitRegistrationIndicators);
        
        // Form field analysis for better detection
        const fieldAnalysis = {
            hasPersonalInfo: visibleInputs.some(inp => {
                const name = inp.name?.toLowerCase() || '';
                const id = inp.id?.toLowerCase() || '';
                const placeholder = inp.placeholder?.toLowerCase() || '';
                return name.includes('name') || name.includes('first') || name.includes('last') ||
                       id.includes('name') || id.includes('first') || id.includes('last') ||
                       placeholder.includes('name') || placeholder.includes('first') || placeholder.includes('last');
            }),
            hasContactInfo: visibleInputs.some(inp => {
                const name = inp.name?.toLowerCase() || '';
                const id = inp.id?.toLowerCase() || '';
                const placeholder = inp.placeholder?.toLowerCase() || '';
                return inp.type === 'tel' || name.includes('phone') || name.includes('tel') ||
                       id.includes('phone') || id.includes('tel') ||
                       placeholder.includes('phone') || placeholder.includes('tel');
            }),
            hasDemographicInfo: visibleInputs.some(inp => {
                const name = inp.name?.toLowerCase() || '';
                const id = inp.id?.toLowerCase() || '';
                return name.includes('age') || name.includes('gender') || name.includes('occupation') ||
                       id.includes('age') || id.includes('gender') || id.includes('occupation');
            })
        };
        
        const hasRequiredFields = visibleInputs.filter(inp => inp.required).length;
        
        // Improved validation logic
        const baseFormRequirements = forms.length > 0 && visibleInputs.length >= 2;
        const hasDataCollection = hasEmailField || fieldAnalysis.hasPersonalInfo || fieldAnalysis.hasContactInfo;
        const hasFormContext = hasExplicitRegistrationIndicators || hasGenericFormIndicators;
        const isSecure = !hasInappropriateIndicators;
        
        // Main validation with tiered approach
        const isValidRegistrationPage = baseFormRequirements && hasDataCollection && hasFormContext && isSecure;
        
        // Enhanced reasoning
        let reason = null;
        let confidence = 'high';
        
        if (!forms.length) {
            reason = 'No forms found';
        } else if (visibleInputs.length < 2) {
            reason = 'Insufficient visible input fields';
        } else if (!hasDataCollection) {
            reason = 'No data collection fields detected (email, name, or contact info)';
        } else if (hasInappropriateIndicators) {
            reason = 'Form appears to be login, payment, or other inappropriate type';
        } else if (!hasFormContext) {
            reason = 'No form context indicators found (survey, registration, or generic form language)';
            confidence = 'low'; // This shouldn't happen with our improved detection
        } else if (!hasExplicitRegistrationIndicators && hasGenericFormIndicators) {
            confidence = 'medium'; // Generic form detected but not explicitly registration
        }
        
        // Analyze field complexity
        const fieldTypes = {};
        visibleInputs.forEach(inp => {
            const type = inp.type || inp.tagName.toLowerCase();
            fieldTypes[type] = (fieldTypes[type] || 0) + 1;
        });
        
        return {
            isValidRegistrationPage,
            reason,
            confidence,
            formsCount: forms.length,
            inputsCount: visibleInputs.length,
            requiredFields: hasRequiredFields,
            hasEmailField,
            hasRegistrationIndicators: hasExplicitRegistrationIndicators,
            hasGenericFormIndicators,
            hasInappropriateIndicators,
            fieldAnalysis,
            questionCount: visibleInputs.length,
            fieldTypes: fieldTypes,
            title: document.title,
            complexity: (visibleInputs.length + hasRequiredFields) / 10
        };
    });
}

if (require.main === module) {
    testImprovedFormAnalysis().then(results => {
        const correctCount = results.filter(r => r.correct).length;
        const httpbinFixed = results.find(r => r.name === 'HTTPBin Generic Form')?.success || false;
        
        console.log(`\n🏆 SUMMARY:`);
        console.log(`Test Accuracy: ${correctCount}/${results.length}`);
        console.log(`HTTPBin Issue Fixed: ${httpbinFixed ? '✅' : '❌'}`);
        
        process.exit(correctCount === results.length && httpbinFixed ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = { testImprovedFormAnalysis };