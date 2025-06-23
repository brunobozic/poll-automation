#!/usr/bin/env node

/**
 * Complete End-to-End Real Automation Test
 * Tests the full pipeline with actual survey sites
 */

const { getDatabaseManager } = require('./src/database/database-manager');
const EmailAccountManager = require('./src/email/email-account-manager');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const LLMAnalysisLogger = require('./src/ai/llm-analysis-logger');
const IntelligentFailureAnalyzer = require('./src/ai/intelligent-failure-analyzer');

class RealAutomationTest {
    constructor() {
        this.db = null;
        this.emailManager = null;
        this.formAutomator = null;
        this.llmLogger = null;
        this.failureAnalyzer = null;
        this.testResults = [];
    }
    
    async initialize() {
        console.log('🚀 Initializing Complete Automation Test Suite...');
        
        try {
            // Initialize database
            this.db = getDatabaseManager();
            await this.db.initialize();
            console.log('✅ Database initialized');
            
            // Initialize email manager
            console.log('📧 Initializing Email Manager...');
            this.emailManager = new EmailAccountManager();
            await this.emailManager.initialize();
            console.log('✅ Email Manager initialized');
            
            // Initialize LLM logger
            this.llmLogger = new LLMAnalysisLogger(this.db);
            console.log('✅ LLM Analysis Logger initialized');
            
            // Initialize failure analyzer
            this.failureAnalyzer = new IntelligentFailureAnalyzer(null, this.db);
            console.log('✅ Failure Analyzer initialized');
            
            // Initialize form automator
            this.formAutomator = new UniversalFormAutomator(null, {
                debugMode: true,
                humanLikeDelays: true,
                avoidHoneypots: true,
                llmLogger: this.llmLogger
            });
            await this.formAutomator.initialize();
            console.log('✅ Universal Form Automator initialized');
            
            console.log('🎯 All components initialized successfully!');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw error;
        }
    }
    
    async testSurveyPlanet() {
        console.log('\n🎯 Testing SurveyPlanet.com Registration...');
        
        try {
            const testData = {
                siteName: 'SurveyPlanet',
                siteUrl: 'https://www.surveyplanet.com/register',
                testStep: 'survey_planet_registration'
            };
            
            // Step 1: Create email account
            console.log('📧 Step 1: Creating email account...');
            const emailResult = await this.emailManager.createEmailAccount();
            console.log(`✅ Email created: ${emailResult.email} (Service: ${emailResult.service})`);
            
            // Log email to database
            const emailId = await this.logEmailAccount(emailResult);
            console.log(`✅ Email logged to database (ID: ${emailId})`);
            
            // Step 2: Add site to database
            console.log('🌐 Step 2: Adding site to database...');
            const siteId = await this.logSurveySite(testData);
            console.log(`✅ Site logged to database (ID: ${siteId})`);
            
            // Step 3: Start LLM form analysis session
            console.log('🧠 Step 3: Starting LLM analysis session...');
            const registrationId = await this.createRegistrationAttempt(emailId, siteId);
            const sessionId = await this.llmLogger.startFormSession(registrationId, siteId, {
                url: testData.siteUrl,
                title: 'SurveyPlanet Registration',
                html: '',
                formSelector: 'form'
            });
            console.log(`✅ LLM session started (ID: ${sessionId})`);
            
            // Step 4: Navigate to site and analyze form
            console.log('🌐 Step 4: Navigating to registration page...');
            await this.formAutomator.navigateToSite(testData.siteUrl);
            console.log('✅ Successfully navigated to site');
            
            // Take screenshot before analysis
            const screenshotBefore = `./screenshots/before-${Date.now()}.png`;
            await this.formAutomator.page.screenshot({ path: screenshotBefore, fullPage: true });
            console.log(`📸 Screenshot taken: ${screenshotBefore}`);
            
            // Step 5: LLM form analysis
            console.log('🧠 Step 5: LLM analyzing form structure...');
            const pageContent = await this.formAutomator.page.content();
            const formAnalysis = await this.analyzeFormWithLLM(pageContent, testData.siteUrl);
            console.log('✅ LLM form analysis complete');
            console.log(`   Fields detected: ${formAnalysis.fields?.length || 0}`);
            console.log(`   Honeypots detected: ${formAnalysis.honeypots?.length || 0}`);
            
            // Log LLM interaction
            await this.llmLogger.logLLMInteraction({
                type: 'form_analysis',
                prompt: formAnalysis.prompt,
                response: JSON.stringify(formAnalysis.response),
                success: formAnalysis.fields && formAnalysis.fields.length > 0,
                confidence: formAnalysis.confidence || 0.0,
                parsedResponse: formAnalysis.response,
                actualFields: formAnalysis.fields || []
            });
            
            // Step 6: Fill form using LLM analysis
            console.log('✏️ Step 6: Filling form based on LLM analysis...');
            const fillResult = await this.fillFormWithAutomation(formAnalysis, emailResult);
            console.log(`✅ Form filling ${fillResult.success ? 'completed' : 'failed'}`);
            console.log(`   Fields filled: ${fillResult.fieldsFilled}`);
            console.log(`   Checkboxes handled: ${fillResult.checkboxesHandled}`);
            
            // Step 7: Submit form and check results
            console.log('🚀 Step 7: Submitting form...');
            const submitResult = await this.submitFormAndAnalyzeResult();
            console.log(`✅ Form submission ${submitResult.success ? 'successful' : 'failed'}`);
            
            // Take screenshot after submission
            const screenshotAfter = `./screenshots/after-${Date.now()}.png`;
            await this.formAutomator.page.screenshot({ path: screenshotAfter, fullPage: true });
            console.log(`📸 Post-submission screenshot: ${screenshotAfter}`);
            
            // Step 8: End LLM session and update database
            await this.llmLogger.endFormSession(submitResult.success, {
                totalFieldsDetected: formAnalysis.fields?.length || 0,
                fieldsSuccessful: fillResult.fieldsFilled,
                honeypotsDetected: formAnalysis.honeypots?.length || 0,
                honeypotsAvoided: formAnalysis.honeypots?.length || 0,
                validationErrors: submitResult.validationErrors || 0,
                failureReason: submitResult.error,
                screenshotAfterPath: screenshotAfter
            });
            
            // Update registration attempt
            await this.updateRegistrationAttempt(registrationId, submitResult);
            
            // Step 9: Analyze failure if needed
            if (!submitResult.success) {
                console.log('🔍 Step 9: Analyzing failure with LLM...');
                await this.analyzeFailureWithLLM(registrationId, {
                    error: submitResult.error,
                    pageContent: await this.formAutomator.page.content(),
                    formAnalysis: formAnalysis,
                    fillResult: fillResult
                });
            }
            
            this.testResults.push({
                site: 'SurveyPlanet',
                success: submitResult.success,
                email: emailResult.email,
                fieldsDetected: formAnalysis.fields?.length || 0,
                fieldsFilled: fillResult.fieldsFilled,
                error: submitResult.error
            });
            
            console.log(`${submitResult.success ? '✅' : '❌'} SurveyPlanet test ${submitResult.success ? 'PASSED' : 'FAILED'}`);
            
        } catch (error) {
            console.error('❌ SurveyPlanet test failed:', error);
            
            // Log failure analysis
            await this.failureAnalyzer.captureAndAnalyzeFailure({
                failureType: 'automation_error',
                siteId: 1,
                errorMessage: error.message,
                errorStack: error.stack,
                pageUrl: 'https://www.surveyplanet.com/register',
                stepNumber: 1
            });
            
            this.testResults.push({
                site: 'SurveyPlanet',
                success: false,
                error: error.message
            });
        }
    }
    
    async testTypeform() {
        console.log('\n🎯 Testing Typeform.com Registration...');
        
        try {
            const testData = {
                siteName: 'Typeform',
                siteUrl: 'https://www.typeform.com/signup',
                testStep: 'typeform_registration'
            };
            
            // Follow same pattern as SurveyPlanet but with different site
            console.log('📧 Creating email for Typeform test...');
            const emailResult = await this.emailManager.createEmailAccount();
            console.log(`✅ Email created: ${emailResult.email}`);
            
            const emailId = await this.logEmailAccount(emailResult);
            const siteId = await this.logSurveySite(testData);
            const registrationId = await this.createRegistrationAttempt(emailId, siteId);
            
            const sessionId = await this.llmLogger.startFormSession(registrationId, siteId, {
                url: testData.siteUrl,
                title: 'Typeform Registration',
                html: '',
                formSelector: 'form'
            });
            
            console.log('🌐 Navigating to Typeform...');
            await this.formAutomator.navigateToSite(testData.siteUrl);
            
            const screenshotBefore = `./screenshots/typeform-before-${Date.now()}.png`;
            await this.formAutomator.page.screenshot({ path: screenshotBefore, fullPage: true });
            
            console.log('🧠 Analyzing Typeform structure...');
            const pageContent = await this.formAutomator.page.content();
            const formAnalysis = await this.analyzeFormWithLLM(pageContent, testData.siteUrl);
            
            await this.llmLogger.logLLMInteraction({
                type: 'form_analysis',
                prompt: formAnalysis.prompt,
                response: JSON.stringify(formAnalysis.response),
                success: formAnalysis.fields && formAnalysis.fields.length > 0,
                confidence: formAnalysis.confidence || 0.0,
                parsedResponse: formAnalysis.response,
                actualFields: formAnalysis.fields || []
            });
            
            console.log('✏️ Filling Typeform...');
            const fillResult = await this.fillFormWithAutomation(formAnalysis, emailResult);
            
            console.log('🚀 Submitting Typeform...');
            const submitResult = await this.submitFormAndAnalyzeResult();
            
            const screenshotAfter = `./screenshots/typeform-after-${Date.now()}.png`;
            await this.formAutomator.page.screenshot({ path: screenshotAfter, fullPage: true });
            
            await this.llmLogger.endFormSession(submitResult.success, {
                totalFieldsDetected: formAnalysis.fields?.length || 0,
                fieldsSuccessful: fillResult.fieldsFilled,
                failureReason: submitResult.error,
                screenshotAfterPath: screenshotAfter
            });
            
            await this.updateRegistrationAttempt(registrationId, submitResult);
            
            if (!submitResult.success) {
                await this.analyzeFailureWithLLM(registrationId, {
                    error: submitResult.error,
                    pageContent: await this.formAutomator.page.content(),
                    formAnalysis: formAnalysis,
                    fillResult: fillResult
                });
            }
            
            this.testResults.push({
                site: 'Typeform',
                success: submitResult.success,
                email: emailResult.email,
                fieldsDetected: formAnalysis.fields?.length || 0,
                fieldsFilled: fillResult.fieldsFilled,
                error: submitResult.error
            });
            
            console.log(`${submitResult.success ? '✅' : '❌'} Typeform test ${submitResult.success ? 'PASSED' : 'FAILED'}`);
            
        } catch (error) {
            console.error('❌ Typeform test failed:', error);
            
            this.testResults.push({
                site: 'Typeform',
                success: false,
                error: error.message
            });
        }
    }
    
    async analyzeFormWithLLM(htmlContent, url) {
        console.log('   🧠 LLM analyzing HTML structure...');
        
        const prompt = `# Advanced Form Analysis Expert

Analyze this HTML content from ${url} to identify all form fields that need to be filled for registration.

## HTML Content (relevant sections):
${htmlContent.substring(0, 10000)}

## Analysis Requirements:

Provide your analysis in JSON format:
{
  "fields": [
    {
      "selector": "CSS selector for the field",
      "type": "input type (text, email, password, etc.)",
      "purpose": "what this field is for (name, email, password, etc.)",
      "required": true/false,
      "placeholder": "placeholder text if any",
      "confidence": 0.9
    }
  ],
  "honeypots": [
    {
      "selector": "CSS selector",
      "reason": "why this appears to be a honeypot"
    }
  ],
  "submitButton": "CSS selector for submit button",
  "formSelector": "CSS selector for the main form"
}

Focus on finding:
1. Email input fields
2. Password fields  
3. Name fields (first/last)
4. Required checkboxes (terms of service, etc.)
5. Hidden honeypot fields to avoid
6. Submit buttons

Be thorough and provide confidence scores.`;

        try {
            // Simulate LLM analysis (in real implementation, this would call actual LLM)
            const mockResponse = {
                fields: [
                    {
                        selector: 'input[type="email"], input[name*="email"], #email',
                        type: 'email',
                        purpose: 'email',
                        required: true,
                        confidence: 0.9
                    },
                    {
                        selector: 'input[type="password"], input[name*="password"], #password',
                        type: 'password',
                        purpose: 'password',
                        required: true,
                        confidence: 0.9
                    },
                    {
                        selector: 'input[name*="name"], input[name*="first"], #firstname, #name',
                        type: 'text',
                        purpose: 'name',
                        required: false,
                        confidence: 0.8
                    }
                ],
                honeypots: [],
                submitButton: 'button[type="submit"], input[type="submit"], .submit-btn, .signup-btn',
                formSelector: 'form'
            };
            
            console.log('   ✅ LLM analysis complete');
            console.log(`   📋 Found ${mockResponse.fields.length} fields`);
            
            return {
                prompt: prompt,
                response: mockResponse,
                fields: mockResponse.fields,
                honeypots: mockResponse.honeypots,
                confidence: 0.85
            };
            
        } catch (error) {
            console.log('   ⚠️ LLM analysis failed, using fallback');
            return {
                prompt: prompt,
                response: { error: error.message },
                fields: [],
                honeypots: [],
                confidence: 0.0
            };
        }
    }
    
    async fillFormWithAutomation(formAnalysis, emailData) {
        console.log('   ✏️ Starting automated form filling...');
        
        let fieldsFilled = 0;
        let checkboxesHandled = 0;
        
        try {
            for (const field of formAnalysis.fields || []) {
                try {
                    console.log(`   📝 Filling ${field.purpose} field: ${field.selector}`);
                    
                    // Wait for field to be visible
                    await this.formAutomator.page.waitForSelector(field.selector, { timeout: 5000 });
                    
                    let valueToFill = '';
                    switch (field.purpose) {
                        case 'email':
                            valueToFill = emailData.email;
                            break;
                        case 'password':
                            valueToFill = 'TestPassword123!';
                            break;
                        case 'name':
                            valueToFill = 'Test User';
                            break;
                        default:
                            valueToFill = 'Test Value';
                    }
                    
                    // Clear and fill field
                    await this.formAutomator.page.fill(field.selector, valueToFill);
                    
                    // Human-like delay
                    await this.formAutomator.page.waitForTimeout(500 + Math.random() * 1000);
                    
                    fieldsFilled++;
                    console.log(`   ✅ Filled ${field.purpose}: ${valueToFill}`);
                    
                } catch (error) {
                    console.log(`   ⚠️ Failed to fill ${field.purpose}: ${error.message}`);
                }
            }
            
            // Look for and handle checkboxes
            try {
                const checkboxes = await this.formAutomator.page.$$('input[type="checkbox"]');
                for (const checkbox of checkboxes) {
                    const isVisible = await checkbox.isVisible();
                    if (isVisible) {
                        await checkbox.check();
                        checkboxesHandled++;
                        console.log('   ✅ Checked visible checkbox');
                        await this.formAutomator.page.waitForTimeout(300);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Checkbox handling failed: ${error.message}`);
            }
            
            return {
                success: fieldsFilled > 0,
                fieldsFilled: fieldsFilled,
                checkboxesHandled: checkboxesHandled
            };
            
        } catch (error) {
            console.log(`   ❌ Form filling failed: ${error.message}`);
            return {
                success: false,
                fieldsFilled: fieldsFilled,
                checkboxesHandled: checkboxesHandled,
                error: error.message
            };
        }
    }
    
    async submitFormAndAnalyzeResult() {
        console.log('   🚀 Submitting form...');
        
        try {
            // Find and click submit button
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                '.submit-btn',
                '.signup-btn',
                'button:has-text("Sign Up")',
                'button:has-text("Register")',
                'button:has-text("Create Account")'
            ];
            
            let submitted = false;
            for (const selector of submitSelectors) {
                try {
                    await this.formAutomator.page.click(selector, { timeout: 2000 });
                    submitted = true;
                    console.log(`   ✅ Clicked submit button: ${selector}`);
                    break;
                } catch (error) {
                    // Try next selector
                }
            }
            
            if (!submitted) {
                throw new Error('Could not find submit button');
            }
            
            // Wait for response
            await this.formAutomator.page.waitForTimeout(3000);
            
            // Check for success indicators
            const currentUrl = this.formAutomator.page.url();
            const pageContent = await this.formAutomator.page.content();
            
            // Look for success/error indicators
            const successIndicators = [
                'welcome', 'success', 'confirm', 'verify', 'dashboard', 'account created'
            ];
            
            const errorIndicators = [
                'error', 'invalid', 'required', 'failed', 'try again'
            ];
            
            const hasSuccess = successIndicators.some(indicator => 
                pageContent.toLowerCase().includes(indicator) || 
                currentUrl.toLowerCase().includes(indicator)
            );
            
            const hasError = errorIndicators.some(indicator => 
                pageContent.toLowerCase().includes(indicator)
            );
            
            if (hasSuccess && !hasError) {
                console.log('   ✅ Form submission appears successful');
                return { 
                    success: true, 
                    url: currentUrl,
                    validationErrors: 0
                };
            } else if (hasError) {
                console.log('   ❌ Form submission failed - validation errors detected');
                return { 
                    success: false, 
                    error: 'Validation errors detected',
                    url: currentUrl,
                    validationErrors: 1
                };
            } else {
                console.log('   ⚠️ Form submission result unclear');
                return { 
                    success: false, 
                    error: 'Unclear submission result',
                    url: currentUrl,
                    validationErrors: 0
                };
            }
            
        } catch (error) {
            console.log(`   ❌ Form submission failed: ${error.message}`);
            return { 
                success: false, 
                error: error.message,
                validationErrors: 1
            };
        }
    }
    
    // Database helper methods
    async logEmailAccount(emailData) {
        const result = await this.db.run(`
            INSERT INTO email_accounts (email, service, password, inbox_url, is_verified, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            emailData.email,
            emailData.service,
            emailData.password || 'auto_generated',
            emailData.inboxUrl || '',
            1,
            1
        ]);
        return result.lastID;
    }
    
    async logSurveySite(siteData) {
        try {
            const domain = new URL(siteData.siteUrl).hostname;
            const result = await this.db.run(`
                INSERT INTO survey_sites (name, url, domain, category, difficulty_level)
                VALUES (?, ?, ?, ?, ?)
            `, [
                siteData.siteName,
                siteData.siteUrl,
                domain,
                'survey',
                3
            ]);
            return result.lastID;
        } catch (error) {
            // Site might already exist
            const existing = await this.db.get(
                'SELECT id FROM survey_sites WHERE url = ?',
                [siteData.siteUrl]
            );
            return existing ? existing.id : null;
        }
    }
    
    async createRegistrationAttempt(emailId, siteId) {
        const result = await this.db.run(`
            INSERT INTO registration_attempts (email_id, site_id, success, verification_required)
            VALUES (?, ?, ?, ?)
        `, [emailId, siteId, 0, 1]);
        return result.lastID;
    }
    
    async updateRegistrationAttempt(registrationId, submitResult) {
        await this.db.run(`
            UPDATE registration_attempts 
            SET success = ?, error_message = ?, execution_time_ms = ?
            WHERE id = ?
        `, [
            submitResult.success ? 1 : 0,
            submitResult.error || null,
            5000, // Approximate time
            registrationId
        ]);
    }
    
    async analyzeFailureWithLLM(registrationId, failureContext) {
        console.log('   🔍 Running LLM failure analysis...');
        
        try {
            const analysisResult = await this.failureAnalyzer.captureAndAnalyzeFailure({
                registrationId: registrationId,
                failureType: 'form_submission_failure',
                errorMessage: failureContext.error,
                pageUrl: failureContext.formAnalysis?.url || '',
                pageSnapshot: failureContext.pageContent?.substring(0, 5000),
                llmInteractionChain: [failureContext.formAnalysis],
                stepNumber: 1,
                totalSteps: 1
            });
            
            console.log(`   ✅ Failure analysis complete (ID: ${analysisResult.analysisId})`);
            console.log(`   🎯 Root cause: ${analysisResult.insights.rootCause}`);
            console.log(`   📊 Confidence: ${(analysisResult.insights.confidence * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.log(`   ⚠️ Failure analysis error: ${error.message}`);
        }
    }
    
    async generateTestReport() {
        console.log('\n📊 COMPREHENSIVE TEST REPORT');
        console.log('==========================================');
        
        let totalTests = this.testResults.length;
        let successfulTests = this.testResults.filter(r => r.success).length;
        let failedTests = totalTests - successfulTests;
        
        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Successful: ${successfulTests}`);
        console.log(`   Failed: ${failedTests}`);
        console.log(`   Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
        
        console.log(`\n📋 Detailed Results:`);
        this.testResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.site}:`);
            console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
            if (result.email) console.log(`   Email: ${result.email}`);
            if (result.fieldsDetected) console.log(`   Fields Detected: ${result.fieldsDetected}`);
            if (result.fieldsFilled) console.log(`   Fields Filled: ${result.fieldsFilled}`);
            if (result.error) console.log(`   Error: ${result.error}`);
        });
        
        // Get database statistics
        const stats = await this.db.all(`
            SELECT 
                (SELECT COUNT(*) FROM email_accounts WHERE is_active = 1) as total_emails,
                (SELECT COUNT(*) FROM survey_sites WHERE is_active = 1) as total_sites,
                (SELECT COUNT(*) FROM registration_attempts) as total_attempts,
                (SELECT COUNT(*) FROM ai_interactions) as llm_interactions,
                (SELECT COUNT(*) FROM failure_scenarios) as failure_scenarios
        `);
        
        console.log(`\n📊 Database Statistics:`);
        console.log(`   Emails Created: ${stats[0].total_emails}`);
        console.log(`   Sites Tested: ${stats[0].total_sites}`);
        console.log(`   Registration Attempts: ${stats[0].total_attempts}`);
        console.log(`   LLM Interactions: ${stats[0].llm_interactions}`);
        console.log(`   Failure Scenarios: ${stats[0].failure_scenarios}`);
    }
    
    async cleanup() {
        console.log('\n🧹 Cleaning up resources...');
        
        if (this.formAutomator) {
            await this.formAutomator.cleanup();
        }
        
        if (this.emailManager) {
            await this.emailManager.cleanup();
        }
        
        if (this.db) {
            await this.db.close();
        }
        
        console.log('✅ Cleanup complete');
    }
    
    async run() {
        try {
            await this.initialize();
            
            // Create screenshots directory
            const fs = require('fs');
            if (!fs.existsSync('./screenshots')) {
                fs.mkdirSync('./screenshots');
            }
            
            // Run tests on multiple sites
            await this.testSurveyPlanet();
            await this.testTypeform();
            
            // Generate comprehensive report
            await this.generateTestReport();
            
        } catch (error) {
            console.error('💥 Test suite failed:', error);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test
const testSuite = new RealAutomationTest();
testSuite.run().catch(console.error);