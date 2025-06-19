#!/usr/bin/env node

/**
 * Test Form Analysis - Reproduce the HTTPBin failure issue
 */

const StealthBrowser = require('./src/browser/stealth');

async function testFormAnalysis() {
    console.log('🔍 Testing Form Analysis with HTTPBin');
    console.log('====================================\n');
    
    const browser = new StealthBrowser();
    let context = null;
    let page = null;
    
    try {
        // Initialize browser
        console.log('1. 🚀 Launching browser...');
        context = await browser.launch();
        const pageObj = await browser.newPage('base');
        page = pageObj.page;
        
        // Test cases
        const testCases = [
            {
                name: 'Local Survey Site',
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
                `)
            },
            {
                name: 'HTTPBin Forms',
                url: 'https://httpbin.org/forms/post'
            }
        ];
        
        const results = [];
        
        for (const testCase of testCases) {
            console.log(`2. 📄 Testing: ${testCase.name}`);
            
            try {
                await page.goto(testCase.url, { waitUntil: 'networkidle', timeout: 10000 });
                console.log(`   ✅ Page loaded: ${testCase.name}`);
                
                // Run the current enhanced form analysis
                const analysis = await enhancedFormAnalysis(page);
                
                console.log(`   📊 Analysis Results:`);
                console.log(`      - Valid Registration Page: ${analysis.isValidRegistrationPage ? '✅' : '❌'}`);
                console.log(`      - Forms Count: ${analysis.formsCount}`);
                console.log(`      - Inputs Count: ${analysis.inputsCount}`);
                console.log(`      - Has Email Field: ${analysis.hasEmailField ? '✅' : '❌'}`);
                console.log(`      - Has Registration Indicators: ${analysis.hasRegistrationIndicators ? '✅' : '❌'}`);
                if (analysis.reason) {
                    console.log(`      - Failure Reason: ${analysis.reason}`);
                }
                console.log(`      - Page Title: ${analysis.title}`);
                
                results.push({
                    name: testCase.name,
                    url: testCase.url,
                    success: analysis.isValidRegistrationPage,
                    analysis: analysis
                });
                
            } catch (error) {
                console.log(`   ❌ Failed to test ${testCase.name}: ${error.message}`);
                results.push({
                    name: testCase.name,
                    url: testCase.url,
                    success: false,
                    error: error.message
                });
            }
            
            console.log('');
        }
        
        // Summary
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        const successRate = (successCount / totalCount * 100).toFixed(1);
        
        console.log('📊 FORM ANALYSIS RESULTS:');
        console.log('========================');
        console.log(`Success Rate: ${successCount}/${totalCount} (${successRate}%)`);
        console.log('');
        
        results.forEach((result, index) => {
            const status = result.success ? '✅ PASSED' : '❌ FAILED';
            console.log(`${index + 1}. ${result.name}: ${status}`);
            if (result.analysis && result.analysis.reason) {
                console.log(`   Reason: ${result.analysis.reason}`);
            }
        });
        
        console.log('');
        
        // Show the specific HTTPBin page content for debugging
        if (results.length > 1) {
            console.log('🔍 Analyzing HTTPBin page content:');
            await page.goto('https://httpbin.org/forms/post');
            
            const pageContent = await page.evaluate(() => {
                return {
                    title: document.title,
                    bodyText: document.body.textContent.toLowerCase(),
                    forms: Array.from(document.querySelectorAll('form')).map(form => ({
                        action: form.action,
                        method: form.method,
                        inputs: Array.from(form.querySelectorAll('input')).map(inp => ({
                            name: inp.name,
                            type: inp.type,
                            required: inp.required
                        }))
                    }))
                };
            });
            
            console.log('HTTPBin Page Analysis:');
            console.log(`- Title: "${pageContent.title}"`);
            console.log(`- Contains "register": ${pageContent.bodyText.includes('register')}`);
            console.log(`- Contains "sign up": ${pageContent.bodyText.includes('sign up')}`);
            console.log(`- Contains "create account": ${pageContent.bodyText.includes('create account')}`);
            console.log(`- Contains "join": ${pageContent.bodyText.includes('join')}`);
            console.log(`- Contains "membership": ${pageContent.bodyText.includes('membership')}`);
            console.log(`- Forms found: ${pageContent.forms.length}`);
            pageContent.forms.forEach((form, i) => {
                console.log(`  Form ${i + 1}: ${form.inputs.length} inputs`);
                form.inputs.forEach(inp => {
                    console.log(`    - ${inp.name} (${inp.type})`);
                });
            });
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
 * Improved enhanced form analysis function (updated with generic form detection)
 */
async function enhancedFormAnalysis(page) {
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
    testFormAnalysis().then(results => {
        const successCount = results.filter(r => r.success).length;
        process.exit(successCount === results.length ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = { testFormAnalysis };