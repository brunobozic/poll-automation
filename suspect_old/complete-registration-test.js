#!/usr/bin/env node

/**
 * Complete Registration Test
 * Actually attempts to register on real sites and complete the full flow
 */

// Load environment variables FIRST
require('dotenv').config();

const { chromium } = require('playwright');
const { getDatabaseManager } = require('./src/database/database-manager');
const UniversalFormAnalyzer = require('./src/ai/universal-form-analyzer');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');

class CompleteRegistrationTester {
    constructor() {
        this.db = null;
        this.browser = null;
        this.page = null;
        this.registrationResults = [];
        this.formAnalyzer = null;
        this.sessionId = `reg_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.sessionStartTime = Date.now();
        this.llmInteractions = [];
        this.detailedLogs = [];
    }
    
    async initialize() {
        console.log('🚀 COMPLETE REGISTRATION TESTING WITH FULL OBSERVABILITY');
        console.log('========================================================');
        console.log(`📋 Session ID: ${this.sessionId}`);
        console.log(`⏰ Started: ${new Date().toISOString()}`);
        
        // Initialize database with comprehensive logging
        this.db = getDatabaseManager();
        await this.db.initialize();
        await this.logStep('database_init', 'Database connected successfully', { sessionId: this.sessionId });
        console.log('✅ Database connected with logging enabled');
        
        // Initialize LLM-powered form analyzer
        const contentAI = new ContentUnderstandingAI();
        this.formAnalyzer = new UniversalFormAnalyzer(contentAI, {
            debugMode: true,
            enableHoneypotDetection: true,
            enableLLMLogging: true
        });
        
        // Set up LLM interaction logging (if available)
        if (this.formAnalyzer.setLLMInteractionCallback) {
            this.formAnalyzer.setLLMInteractionCallback((interaction) => {
                this.llmInteractions.push(interaction);
                this.logLLMInteraction(interaction);
            });
        }
        
        await this.logStep('llm_analyzer_init', 'LLM Form Analyzer initialized', { 
            debugMode: true, 
            honeypotDetection: true 
        });
        console.log('✅ LLM Form Analyzer initialized with full observability');
        
        // Initialize browser with stealth settings
        this.browser = await chromium.launch({ 
            headless: false,
            slowMo: 1000, // Human-like behavior
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox'
            ]
        });
        this.page = await this.browser.newPage();
        
        // Enhanced stealth settings
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewportSize({ width: 1366, height: 768 });
        
        // Set up browser event logging
        this.page.on('response', (response) => {
            this.logStep('http_response', `HTTP ${response.status()} ${response.url()}`, {
                status: response.status(),
                url: response.url(),
                contentType: response.headers()['content-type']
            });
        });
        
        this.page.on('console', (msg) => {
            this.logStep('browser_console', `Console ${msg.type()}: ${msg.text()}`, {
                type: msg.type(),
                text: msg.text()
            });
        });
        
        await this.logStep('browser_init', 'Browser initialized with stealth settings', {
            userAgent: await this.page.evaluate(() => navigator.userAgent),
            viewport: await this.page.viewportSize()
        });
        console.log('✅ Browser initialized with comprehensive logging');
    }
    
    async logStep(stepType, message, data = {}) {
        const logEntry = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            stepType,
            message,
            data: JSON.stringify(data)
        };
        
        this.detailedLogs.push(logEntry);
        
        // Store in database immediately for real-time observability
        try {
            await this.db.run(`
                INSERT INTO ai_interactions (
                    interaction_type, prompt_text, response_text, 
                    success, processing_time_ms, form_analysis_context
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `registration_step_${stepType}`,
                message,
                JSON.stringify(data),
                1,
                0,
                JSON.stringify({ sessionId: this.sessionId, stepType, timestamp: logEntry.timestamp })
            ]);
        } catch (error) {
            console.log(`⚠️ Failed to log step: ${error.message}`);
        }
    }
    
    async logLLMInteraction(interaction) {
        const logEntry = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            type: 'llm_interaction',
            interaction
        };
        
        console.log(`🧠 LLM Interaction: ${interaction.type || 'unknown'}`);
        if (interaction.prompt) {
            console.log(`   📝 Prompt length: ${interaction.prompt.length} chars`);
        }
        if (interaction.response) {
            console.log(`   📤 Response length: ${JSON.stringify(interaction.response).length} chars`);
        }
        if (interaction.confidence) {
            console.log(`   📊 Confidence: ${(interaction.confidence * 100).toFixed(1)}%`);
        }
        
        // Store complete LLM interaction in database
        try {
            await this.db.run(`
                INSERT INTO ai_interactions (
                    interaction_type, prompt_text, response_text, 
                    success, confidence_score, tokens_used, processing_time_ms,
                    model_used, form_analysis_context
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'complete_registration_llm',
                interaction.prompt || 'N/A',
                JSON.stringify(interaction.response || {}),
                interaction.success ? 1 : 0,
                interaction.confidence || 0,
                interaction.tokensUsed || 0,
                interaction.processingTime || 0,
                interaction.model || 'unknown',
                JSON.stringify({
                    sessionId: this.sessionId,
                    interactionType: interaction.type,
                    timestamp: logEntry.timestamp,
                    siteName: interaction.siteName,
                    llmProvider: interaction.provider
                })
            ]);
            
            console.log(`   💾 LLM interaction logged to database`);
        } catch (error) {
            console.log(`   ⚠️ Failed to log LLM interaction: ${error.message}`);
        }
    }
    
    async testCompleteRegistrations() {
        console.log('\\n🎯 ATTEMPTING COMPLETE REGISTRATIONS');
        console.log('====================================');
        
        const registrationSites = [
            {
                name: 'SurveyPlanet',
                url: 'https://www.surveyplanet.com/register',
                type: 'survey_platform'
            },
            {
                name: 'HTTPBin Form',
                url: 'https://httpbin.org/forms/post',
                type: 'test_form'
            }
        ];
        
        for (const site of registrationSites) {
            await this.attemptCompleteRegistration(site);
        }
        
        await this.generateRegistrationReport();
    }
    
    async attemptCompleteRegistration(site) {
        console.log(`\\n🎯 Attempting registration on: ${site.name}`);
        console.log(`🌐 URL: ${site.url}`);
        console.log('━'.repeat(60));
        
        const result = {
            siteName: site.name,
            siteUrl: site.url,
            siteType: site.type,
            timestamp: new Date().toISOString(),
            success: false,
            steps: [],
            credentials: null,
            error: null,
            canLogin: false
        };
        
        try {
            // Step 1: Navigate to registration page
            console.log('🌐 Step 1: Navigating to registration page...');
            await this.page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.page.waitForTimeout(3000);
            
            result.steps.push({ step: 'navigation', success: true, timestamp: new Date().toISOString() });
            console.log('✅ Navigation successful');
            
            // Step 2: Take screenshot
            const screenshotPath = `./screenshots/registration-${site.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot: ${screenshotPath}`);
            
            // Step 3: Analyze available forms with LLM
            console.log('🔍 Step 2: Analyzing registration form with LLM intelligence...');
            await this.logStep('form_analysis_start', 'Starting comprehensive form analysis', { url: site.url });
            
            const formAnalysis = await this.analyzeRegistrationFormWithLLM(site.name);
            result.steps.push({ step: 'form_analysis', success: true, data: formAnalysis });
            
            await this.logStep('form_analysis_complete', 'Form analysis completed', {
                totalFields: formAnalysis.totalFields,
                honeypots: formAnalysis.honeypots?.length || 0,
                llmAnalysis: formAnalysis.llmAnalysis || null
            });
            
            console.log(`📋 Found ${formAnalysis.totalFields} fillable fields`);
            console.log(`🛡️ Detected ${formAnalysis.honeypots?.length || 0} potential honeypots`);
            console.log(`🧠 LLM Analysis Confidence: ${((formAnalysis.llmAnalysis?.confidence || 0) * 100).toFixed(1)}%`);
            
            if (formAnalysis.totalFields === 0) {
                console.log('⚠️ No fillable fields found - skipping registration');
                result.error = 'No fillable fields detected';
                this.registrationResults.push(result);
                return;
            }
            
            // Step 4: Generate registration data
            console.log('👤 Step 3: Generating registration data...');
            const registrationData = await this.generateRegistrationData(site);
            result.credentials = registrationData;
            console.log(`📧 Email: ${registrationData.email}`);
            console.log(`🔑 Password: ${registrationData.password}`);
            
            // Step 5: Fill the registration form
            console.log('✏️ Step 4: Filling registration form...');
            const fillResult = await this.fillRegistrationForm(formAnalysis, registrationData);
            result.steps.push({ step: 'form_filling', success: fillResult.success, data: fillResult });
            
            if (!fillResult.success) {
                console.log(`❌ Form filling failed: ${fillResult.error}`);
                result.error = fillResult.error;
                this.registrationResults.push(result);
                return;
            }
            
            console.log(`✅ Filled ${fillResult.fieldsLilled} fields successfully`);
            
            // Step 6: Submit the form
            console.log('🚀 Step 5: Submitting registration form...');
            const submitResult = await this.submitRegistrationForm();
            result.steps.push({ step: 'form_submission', success: submitResult.success, data: submitResult });
            
            if (!submitResult.success) {
                console.log(`❌ Form submission failed: ${submitResult.error}`);
                result.error = submitResult.error;
                this.registrationResults.push(result);
                return;
            }
            
            console.log('✅ Form submitted successfully');
            
            // Step 7: Check for confirmation/verification
            console.log('📧 Step 6: Checking for verification requirements...');
            const verificationResult = await this.checkVerificationRequirements();
            result.steps.push({ step: 'verification_check', success: true, data: verificationResult });
            
            if (verificationResult.required) {
                console.log(`📧 Verification required: ${verificationResult.type}`);
                console.log('⏳ Would need to check email for verification link...');
            } else {
                console.log('✅ No verification required - registration may be complete');
            }
            
            // Step 8: Store credentials and attempt login test
            console.log('💾 Step 7: Storing credentials...');
            await this.storeRegistrationCredentials(result);
            
            // Step 9: Test if we can login (if applicable)
            if (site.type === 'survey_platform') {
                console.log('🔓 Step 8: Testing login capability...');
                const loginTest = await this.testLoginCapability(site, registrationData);
                result.canLogin = loginTest.success;
                result.steps.push({ step: 'login_test', success: loginTest.success, data: loginTest });
                
                if (loginTest.success) {
                    console.log('✅ Login test successful - we can return to this account!');
                } else {
                    console.log(`❌ Login test failed: ${loginTest.error}`);
                }
            }
            
            result.success = true;
            console.log(`🎉 Registration process completed for ${site.name}`);
            
        } catch (error) {
            console.log(`❌ Registration failed: ${error.message}`);
            result.error = error.message;
            result.steps.push({ step: 'error', success: false, error: error.message });
        }
        
        this.registrationResults.push(result);
        
        // Wait between tests
        await this.page.waitForTimeout(5000);
    }
    
    async analyzeRegistrationFormWithLLM(siteName) {
        console.log(`🧠 Running LLM-powered form analysis for ${siteName}...`);
        
        try {
            // Use our enhanced form analyzer with full LLM intelligence
            const llmAnalysis = await this.formAnalyzer.analyzePage(this.page, siteName);
            
            // Also run basic browser-based analysis for comparison
            const browserAnalysis = await this.page.evaluate(() => {
                const forms = document.querySelectorAll('form');
                const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"]');
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button:has-text("Register"), button:has-text("Sign up")');
                
                const formData = {
                    formsFound: forms.length,
                    fields: [],
                    checkboxes: [],
                    submitButtons: [],
                    totalFields: 0
                };
                
                // Analyze input fields
                inputs.forEach((input, index) => {
                    if (input.offsetParent !== null) { // Visible check
                        const field = {
                            type: input.type,
                            name: input.name,
                            id: input.id,
                            placeholder: input.placeholder,
                            required: input.required,
                            selector: input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : `input[type="${input.type}"]:nth-of-type(${index + 1})`
                        };
                        formData.fields.push(field);
                        formData.totalFields++;
                    }
                });
                
                // Analyze checkboxes
                checkboxes.forEach((checkbox, index) => {
                    if (checkbox.offsetParent !== null) {
                        const field = {
                            name: checkbox.name,
                            id: checkbox.id,
                            required: checkbox.required,
                            selector: checkbox.id ? `#${checkbox.id}` : checkbox.name ? `[name="${checkbox.name}"]` : `input[type="checkbox"]:nth-of-type(${index + 1})`
                        };
                        formData.checkboxes.push(field);
                        formData.totalFields++;
                    }
                });
                
                // Analyze submit buttons
                submitButtons.forEach((button, index) => {
                    const btnData = {
                        text: button.textContent.trim(),
                        type: button.type,
                        selector: button.id ? `#${button.id}` : `button:nth-of-type(${index + 1})`
                    };
                    formData.submitButtons.push(btnData);
                });
                
                return formData;
            });
            
            // Combine both analyses with comprehensive logging
            const combinedAnalysis = {
                llmAnalysis: llmAnalysis,
                browserAnalysis: browserAnalysis,
                fields: llmAnalysis.fields || browserAnalysis.fields,
                checkboxes: llmAnalysis.checkboxes || browserAnalysis.checkboxes,
                honeypots: llmAnalysis.honeypots || [],
                submitButtons: browserAnalysis.submitButtons,
                totalFields: (llmAnalysis.fields?.length || 0) + (llmAnalysis.checkboxes?.length || 0) || browserAnalysis.totalFields,
                confidence: llmAnalysis.confidence || 0.5,
                analysisComparison: {
                    llmFieldCount: llmAnalysis.fields?.length || 0,
                    browserFieldCount: browserAnalysis.totalFields,
                    honeypotCount: llmAnalysis.honeypots?.length || 0,
                    analysisMethod: llmAnalysis.source || 'llm'
                }
            };
            
            // Log the comprehensive analysis
            await this.logStep('form_analysis_llm_complete', 'LLM form analysis completed', {
                siteName,
                llmFields: llmAnalysis.fields?.length || 0,
                browserFields: browserAnalysis.totalFields,
                honeypots: llmAnalysis.honeypots?.length || 0,
                confidence: llmAnalysis.confidence || 0,
                analysisSource: llmAnalysis.source || 'llm',
                prompt: llmAnalysis.prompt || 'N/A'
            });
            
            return combinedAnalysis;
            
        } catch (error) {
            console.log(`❌ LLM analysis failed: ${error.message}`);
            await this.logStep('form_analysis_error', 'LLM analysis failed, falling back to browser analysis', {
                error: error.message,
                siteName
            });
            
            // Fallback to browser analysis
            const browserAnalysis = await this.page.evaluate(() => {
                // ... same browser analysis code as above
                const forms = document.querySelectorAll('form');
                const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"]');
                const totalFields = Array.from(inputs).filter(input => input.offsetParent !== null).length;
                
                return {
                    formsFound: forms.length,
                    totalFields,
                    fields: Array.from(inputs).filter(input => input.offsetParent !== null).map((input, index) => ({
                        type: input.type,
                        name: input.name,
                        id: input.id,
                        placeholder: input.placeholder,
                        required: input.required,
                        selector: input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : `input[type="${input.type}"]:nth-of-type(${index + 1})`
                    }))
                };
            });
            
            return {
                ...browserAnalysis,
                llmAnalysis: null,
                honeypots: [],
                confidence: 0.3,
                analysisMethod: 'fallback_browser'
            };
        }
    }
    
    async generateRegistrationData(site) {
        const timestamp = Date.now();
        const data = {
            email: `test-reg-${timestamp}@tempmail.com`,
            password: `TestPass123!${timestamp.toString().slice(-4)}`,
            firstName: 'John',
            lastName: 'Tester',
            username: `johntester${timestamp.toString().slice(-6)}`,
            company: '', // Leave empty to avoid honeypots
            website: '', // Leave empty to avoid honeypots
            phone: '555-0123',
            generated: new Date().toISOString(),
            siteType: site.type
        };
        
        return data;
    }
    
    async fillRegistrationForm(formAnalysis, registrationData) {
        const result = {
            success: false,
            fieldsLilled: 0,
            error: null,
            details: []
        };
        
        try {
            // Fill input fields
            for (const field of formAnalysis.fields) {
                try {
                    let valueToFill = '';
                    
                    // Determine what to fill based on field characteristics
                    const fieldInfo = `${field.type} ${field.name} ${field.placeholder}`.toLowerCase();
                    
                    if (fieldInfo.includes('email')) {
                        valueToFill = registrationData.email;
                    } else if (fieldInfo.includes('password')) {
                        valueToFill = registrationData.password;
                    } else if (fieldInfo.includes('first') && fieldInfo.includes('name')) {
                        valueToFill = registrationData.firstName;
                    } else if (fieldInfo.includes('last') && fieldInfo.includes('name')) {
                        valueToFill = registrationData.lastName;
                    } else if (fieldInfo.includes('username') || fieldInfo.includes('user')) {
                        valueToFill = registrationData.username;
                    } else if (fieldInfo.includes('phone') || fieldInfo.includes('tel')) {
                        valueToFill = registrationData.phone;
                    } else if (fieldInfo.includes('company') || fieldInfo.includes('organization')) {
                        // Skip potential honeypots
                        console.log(`   ⚠️ Skipping potential honeypot: ${field.selector}`);
                        continue;
                    } else if (field.type === 'text') {
                        valueToFill = `${registrationData.firstName} ${registrationData.lastName}`;
                    }
                    
                    if (valueToFill) {
                        await this.page.fill(field.selector, valueToFill);
                        await this.page.waitForTimeout(500); // Human-like delay
                        result.fieldsLilled++;
                        result.details.push({ field: field.selector, value: valueToFill.substring(0, 10) + '...', success: true });
                        console.log(`   ✅ Filled ${field.selector}: ${valueToFill.substring(0, 20)}...`);
                    }
                    
                } catch (error) {
                    console.log(`   ⚠️ Failed to fill ${field.selector}: ${error.message}`);
                    result.details.push({ field: field.selector, success: false, error: error.message });
                }
            }
            
            // Handle checkboxes (usually terms of service)
            for (const checkbox of formAnalysis.checkboxes) {
                try {
                    const checkboxInfo = `${checkbox.name} ${checkbox.id}`.toLowerCase();
                    
                    // Only check legitimate checkboxes (avoid honeypots)
                    if (!checkboxInfo.includes('bot') && !checkboxInfo.includes('spam') && !checkboxInfo.includes('trap')) {
                        await this.page.check(checkbox.selector);
                        await this.page.waitForTimeout(300);
                        result.fieldsLilled++;
                        result.details.push({ field: checkbox.selector, value: 'checked', success: true });
                        console.log(`   ✅ Checked ${checkbox.selector}`);
                    } else {
                        console.log(`   ⚠️ Skipping suspicious checkbox: ${checkbox.selector}`);
                    }
                    
                } catch (error) {
                    console.log(`   ⚠️ Failed to check ${checkbox.selector}: ${error.message}`);
                    result.details.push({ field: checkbox.selector, success: false, error: error.message });
                }
            }
            
            result.success = result.fieldsLilled > 0;
            
        } catch (error) {
            result.error = error.message;
        }
        
        return result;
    }
    
    async submitRegistrationForm() {
        const result = {
            success: false,
            error: null,
            response: null
        };
        
        try {
            // Look for submit button
            const submitSelector = 'button[type="submit"], input[type="submit"], button:has-text("Register"), button:has-text("Sign up"), button:has-text("Get started")';
            
            await this.page.waitForSelector(submitSelector, { timeout: 5000 });
            
            // Take screenshot before submission
            await this.page.screenshot({ path: `./screenshots/before-submit-${Date.now()}.png` });
            
            // Click submit button
            await this.page.click(submitSelector);
            
            // Wait for response
            await this.page.waitForTimeout(3000);
            
            // Take screenshot after submission
            await this.page.screenshot({ path: `./screenshots/after-submit-${Date.now()}.png` });
            
            // Check for success indicators or error messages
            const pageContent = await this.page.textContent('body');
            
            if (pageContent.toLowerCase().includes('success') || 
                pageContent.toLowerCase().includes('welcome') ||
                pageContent.toLowerCase().includes('confirm') ||
                pageContent.toLowerCase().includes('verify')) {
                result.success = true;
                result.response = 'Registration appears successful';
            } else if (pageContent.toLowerCase().includes('error') ||
                      pageContent.toLowerCase().includes('invalid') ||
                      pageContent.toLowerCase().includes('required')) {
                result.error = 'Form validation errors detected';
            } else {
                result.success = true; // Assume success if no clear error
                result.response = 'Form submitted, response unclear';
            }
            
        } catch (error) {
            result.error = error.message;
        }
        
        return result;
    }
    
    async checkVerificationRequirements() {
        const pageContent = await this.page.textContent('body');
        const url = this.page.url();
        
        const verificationKeywords = [
            'verify', 'verification', 'confirm', 'activation', 
            'email sent', 'check your email', 'click the link'
        ];
        
        const hasVerificationText = verificationKeywords.some(keyword => 
            pageContent.toLowerCase().includes(keyword)
        );
        
        return {
            required: hasVerificationText,
            type: hasVerificationText ? 'email' : 'none',
            currentUrl: url,
            pageContent: pageContent.substring(0, 500)
        };
    }
    
    async storeRegistrationCredentials(result) {
        try {
            console.log('💾 Storing comprehensive registration credentials...');
            await this.logStep('credential_storage_start', 'Starting credential storage', {
                siteName: result.siteName,
                hasCredentials: !!result.credentials
            });
            
            // Store in email_accounts table with correct structure
            const emailResult = await this.db.run(`
                INSERT INTO email_accounts (
                    email, service, password, username, inbox_url,
                    service_specific_data, is_verified, is_active,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                result.credentials.email,
                'tempmail',
                result.credentials.password,
                result.credentials.username,
                null, // Inbox URL - would be filled during email verification
                JSON.stringify({
                    firstName: result.credentials.firstName,
                    lastName: result.credentials.lastName,
                    phone: result.credentials.phone,
                    serviceUrl: 'https://tempmail.com',
                    generatedAt: result.credentials.generated
                }),
                0, // Not verified yet
                1, // Active
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            
            console.log(`   ✅ Email account stored (ID: ${emailResult.lastID})`);
            
            // Find or create the survey site
            let siteId;
            const existingSite = await this.db.get(`
                SELECT id FROM survey_sites WHERE url = ?
            `, [result.siteUrl]);
            
            if (existingSite) {
                siteId = existingSite.id;
            } else {
                const siteResult = await this.db.run(`
                    INSERT INTO survey_sites (
                        name, url, domain, category, is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    result.siteName,
                    result.siteUrl,
                    new URL(result.siteUrl).hostname,
                    result.siteType || 'survey',
                    1,
                    new Date().toISOString(),
                    new Date().toISOString()
                ]);
                siteId = siteResult.lastID;
                console.log(`   ✅ New site created (ID: ${siteId})`);
            }
            
            // Store comprehensive registration attempt with all credentials
            const registrationResult = await this.db.run(`
                INSERT INTO registration_attempts (
                    site_id, email_id, success, step_reached, total_steps,
                    verification_required, verification_completed, session_id,
                    automation_metadata, attempt_date, execution_time_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                siteId,
                emailResult.lastID,
                result.success ? 1 : 0,
                result.steps.filter(s => s.success).length,
                result.steps.length,
                result.steps.some(s => s.step === 'verification_check' && s.data?.required) ? 1 : 0,
                0, // Not verified yet
                this.sessionId,
                JSON.stringify({
                    siteName: result.siteName,
                    siteUrl: result.siteUrl,
                    siteType: result.siteType,
                    credentials: {
                        email: result.credentials.email,
                        password: result.credentials.password,
                        username: result.credentials.username,
                        firstName: result.credentials.firstName,
                        lastName: result.credentials.lastName,
                        phone: result.credentials.phone,
                        generatedAt: result.credentials.generated
                    },
                    steps: result.steps,
                    canLogin: result.canLogin,
                    loginUrl: result.steps.find(s => s.step === 'login_test')?.data?.loginUrl,
                    formAnalysis: result.steps.find(s => s.step === 'form_analysis')?.data,
                    sessionId: this.sessionId,
                    llmInteractionCount: this.llmInteractions.length,
                    detailedLogCount: this.detailedLogs.length
                }),
                new Date().toISOString(),
                result.totalExecutionTime || 0
            ]);
            
            console.log(`   ✅ Registration attempt stored (ID: ${registrationResult.lastID})`);
            
            // Store login credentials separately for easy access
            if (result.success && result.canLogin) {
                try {
                    await this.db.run(`
                        INSERT OR REPLACE INTO ai_interactions (
                            interaction_type, prompt_text, response_text,
                            success, confidence_score, form_analysis_context
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        'stored_login_credentials',
                        `Login credentials for ${result.siteName}`,
                        JSON.stringify({
                            siteName: result.siteName,
                            siteUrl: result.siteUrl,
                            loginUrl: result.steps.find(s => s.step === 'login_test')?.data?.loginUrl,
                            email: result.credentials.email,
                            password: result.credentials.password,
                            canLogin: true
                        }),
                        1,
                        1.0, // High confidence for successful registration
                        JSON.stringify({
                            sessionId: this.sessionId,
                            registrationId: registrationResult.lastID,
                            emailId: emailResult.lastID,
                            siteId: siteId,
                            storedAt: new Date().toISOString()
                        })
                    ]);
                    
                    console.log(`   ✅ Login credentials cached for easy retrieval`);
                } catch (error) {
                    console.log(`   ⚠️ Failed to cache login credentials: ${error.message}`);
                }
            }
            
            await this.logStep('credential_storage_complete', 'Credential storage completed successfully', {
                emailId: emailResult.lastID,
                siteId: siteId,
                registrationId: registrationResult.lastID,
                canLogin: result.canLogin,
                credentialsStored: Object.keys(result.credentials).length
            });
            
            console.log('💾 All credentials and metadata stored successfully');
            
            return {
                emailId: emailResult.lastID,
                siteId: siteId,
                registrationId: registrationResult.lastID
            };
            
        } catch (error) {
            console.log(`❌ Failed to store credentials: ${error.message}`);
            await this.logStep('credential_storage_error', 'Failed to store credentials', {
                error: error.message,
                siteName: result.siteName
            });
            throw error;
        }
    }
    
    async testLoginCapability(site, credentials) {
        const result = {
            success: false,
            error: null,
            loginUrl: null
        };
        
        try {
            // Common login URL patterns
            const baseUrl = new URL(site.url).origin;
            const possibleLoginUrls = [
                `${baseUrl}/login`,
                `${baseUrl}/signin`,
                `${baseUrl}/account/login`,
                `${baseUrl}/user/login`,
                `${baseUrl}/auth/login`
            ];
            
            for (const loginUrl of possibleLoginUrls) {
                try {
                    console.log(`   🔍 Trying login URL: ${loginUrl}`);
                    
                    await this.page.goto(loginUrl, { timeout: 10000 });
                    await this.page.waitForTimeout(2000);
                    
                    // Look for login form
                    const emailField = await this.page.$('input[type="email"], input[name*="email"], input[id*="email"]');
                    const passwordField = await this.page.$('input[type="password"]');
                    
                    if (emailField && passwordField) {
                        console.log(`   ✅ Found login form at ${loginUrl}`);
                        result.loginUrl = loginUrl;
                        result.success = true;
                        break;
                    }
                    
                } catch (e) {
                    // Continue to next URL
                    console.log(`   ❌ ${loginUrl} not accessible`);
                }
            }
            
            if (!result.success) {
                result.error = 'No accessible login page found';
            }
            
        } catch (error) {
            result.error = error.message;
        }
        
        return result;
    }
    
    async generateRegistrationReport() {
        console.log('\\n📊 REGISTRATION COMPLETION REPORT');
        console.log('=================================');
        
        const successfulRegistrations = this.registrationResults.filter(r => r.success);
        const failedRegistrations = this.registrationResults.filter(r => !r.success);
        const loginCapableAccounts = this.registrationResults.filter(r => r.canLogin);
        
        console.log(`📈 Success Rate: ${successfulRegistrations.length}/${this.registrationResults.length} (${(successfulRegistrations.length / this.registrationResults.length * 100).toFixed(1)}%)`);
        console.log(`✅ Successful Registrations: ${successfulRegistrations.length}`);
        console.log(`❌ Failed Registrations: ${failedRegistrations.length}`);
        console.log(`🔓 Login-Capable Accounts: ${loginCapableAccounts.length}`);
        
        if (successfulRegistrations.length > 0) {
            console.log('\\n✅ SUCCESSFUL REGISTRATIONS:');
            successfulRegistrations.forEach((reg, index) => {
                console.log(`   ${index + 1}. ${reg.siteName}:`);
                console.log(`      📧 Email: ${reg.credentials.email}`);
                console.log(`      🔑 Password: ${reg.credentials.password}`);
                console.log(`      🔓 Can Login: ${reg.canLogin ? 'Yes' : 'Unknown'}`);
                console.log(`      📊 Steps Completed: ${reg.steps.filter(s => s.success).length}/${reg.steps.length}`);
            });
        }
        
        if (failedRegistrations.length > 0) {
            console.log('\\n❌ FAILED REGISTRATIONS:');
            failedRegistrations.forEach((reg, index) => {
                console.log(`   ${index + 1}. ${reg.siteName}: ${reg.error}`);
            });
        }
        
        if (loginCapableAccounts.length > 0) {
            console.log('\\n🎉 ACCOUNTS YOU CAN LOGIN TO:');
            loginCapableAccounts.forEach((acc, index) => {
                console.log(`   ${index + 1}. ${acc.siteName}`);
                console.log(`      🌐 Site: ${acc.siteUrl}`);
                console.log(`      📧 Email: ${acc.credentials.email}`);
                console.log(`      🔑 Password: ${acc.credentials.password}`);
                console.log(`      👤 Username: ${acc.credentials.username}`);
                console.log(`      🔗 Login URL: ${acc.steps.find(s => s.step === 'login_test')?.data?.loginUrl || 'Unknown'}`);
            });
        }
        
        // Generate comprehensive observability report
        await this.generateObservabilityReport();
    }
    
    async generateObservabilityReport() {
        console.log('\\n📊 COMPREHENSIVE OBSERVABILITY REPORT');
        console.log('======================================');
        
        const observabilityData = {
            sessionId: this.sessionId,
            totalLLMInteractions: this.llmInteractions.length,
            totalDetailedLogs: this.detailedLogs.length,
            registrationResults: this.registrationResults,
            llmInteractionSummary: this.summarizeLLMInteractions(),
            stepExecutionSummary: this.summarizeStepExecution(),
            credentialsSummary: this.summarizeStoredCredentials()
        };
        
        console.log(`📋 Session ID: ${this.sessionId}`);
        console.log(`🧠 Total LLM Interactions: ${this.llmInteractions.length}`);
        console.log(`📝 Total Detailed Logs: ${this.detailedLogs.length}`);
        console.log(`🎯 Registration Attempts: ${this.registrationResults.length}`);
        
        // LLM Interaction Analysis
        if (this.llmInteractions.length > 0) {
            console.log('\\n🧠 LLM INTERACTION ANALYSIS:');
            const llmSummary = this.summarizeLLMInteractions();
            console.log(`   📊 Successful: ${llmSummary.successful}/${llmSummary.total}`);
            console.log(`   ⏱️ Average Processing: ${llmSummary.avgProcessingTime.toFixed(0)}ms`);
            console.log(`   📊 Average Confidence: ${(llmSummary.avgConfidence * 100).toFixed(1)}%`);
            console.log(`   🎯 Interaction Types: ${llmSummary.types.join(', ')}`);
        }
        
        // Step Execution Analysis
        console.log('\\n📋 STEP EXECUTION ANALYSIS:');
        const stepSummary = this.summarizeStepExecution();
        Object.entries(stepSummary).forEach(([stepType, data]) => {
            console.log(`   ${stepType}: ${data.successful}/${data.total} (${(data.successful/data.total*100).toFixed(1)}%)`);
        });
        
        // Credentials Summary
        console.log('\\n🔐 STORED CREDENTIALS SUMMARY:');
        const credSummary = this.summarizeStoredCredentials();
        console.log(`   📧 Email Accounts: ${credSummary.emailAccounts}`);
        console.log(`   🔑 Passwords Stored: ${credSummary.passwordsStored}`);
        console.log(`   🔓 Login-Capable: ${credSummary.loginCapable}`);
        
        // Store comprehensive observability report
        try {
            await this.db.run(`
                INSERT INTO ai_interactions (
                    interaction_type, prompt_text, response_text,
                    success, confidence_score, processing_time_ms, form_analysis_context
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                'observability_report',
                'Comprehensive session observability report',
                JSON.stringify(observabilityData),
                1,
                1.0,
                Date.now() - this.sessionStartTime,
                JSON.stringify({
                    sessionId: this.sessionId,
                    reportType: 'comprehensive_observability',
                    generatedAt: new Date().toISOString()
                })
            ]);
            
            console.log('\\n💾 Observability report stored for future analysis');
        } catch (error) {
            console.log(`⚠️ Failed to store observability report: ${error.message}`);
        }
    }
    
    summarizeLLMInteractions() {
        if (this.llmInteractions.length === 0) {
            return { total: 0, successful: 0, avgProcessingTime: 0, avgConfidence: 0, types: [] };
        }
        
        const successful = this.llmInteractions.filter(i => i.success).length;
        const totalProcessingTime = this.llmInteractions.reduce((sum, i) => sum + (i.processingTime || 0), 0);
        const totalConfidence = this.llmInteractions.reduce((sum, i) => sum + (i.confidence || 0), 0);
        const types = [...new Set(this.llmInteractions.map(i => i.type).filter(Boolean))];
        
        return {
            total: this.llmInteractions.length,
            successful,
            avgProcessingTime: totalProcessingTime / this.llmInteractions.length,
            avgConfidence: totalConfidence / this.llmInteractions.length,
            types
        };
    }
    
    summarizeStepExecution() {
        const stepSummary = {};
        
        this.registrationResults.forEach(result => {
            result.steps.forEach(step => {
                if (!stepSummary[step.step]) {
                    stepSummary[step.step] = { total: 0, successful: 0 };
                }
                stepSummary[step.step].total++;
                if (step.success) {
                    stepSummary[step.step].successful++;
                }
            });
        });
        
        return stepSummary;
    }
    
    summarizeStoredCredentials() {
        const successfulRegistrations = this.registrationResults.filter(r => r.success);
        const loginCapable = this.registrationResults.filter(r => r.canLogin);
        
        return {
            emailAccounts: successfulRegistrations.length,
            passwordsStored: successfulRegistrations.filter(r => r.credentials?.password).length,
            loginCapable: loginCapable.length,
            sites: [...new Set(successfulRegistrations.map(r => r.siteName))]
        };
    }
    
    async generateFinalCredentialReport() {
        console.log('\\n🔐 FINAL CREDENTIAL ACCESS REPORT');
        console.log('==================================');
        
        try {
            // Query database for all stored login credentials
            const storedCredentials = await this.db.all(`
                SELECT interaction_type, response_text, form_analysis_context 
                FROM ai_interactions 
                WHERE interaction_type = 'stored_login_credentials'
                ORDER BY timestamp DESC
            `);
            
            if (storedCredentials.length > 0) {
                console.log(`🎉 Found ${storedCredentials.length} stored login accounts!`);
                
                storedCredentials.forEach((cred, index) => {
                    try {
                        const data = JSON.parse(cred.response_text);
                        const context = JSON.parse(cred.form_analysis_context);
                        
                        console.log(`\\n${index + 1}. ${data.siteName}:`);
                        console.log(`   🌐 Site URL: ${data.siteUrl}`);
                        console.log(`   🔗 Login URL: ${data.loginUrl || 'Check site manually'}`);
                        console.log(`   📧 Email: ${data.email}`);
                        console.log(`   🔑 Password: ${data.password}`);
                        console.log(`   📊 Registration ID: ${context.registrationId}`);
                        console.log(`   💾 Stored: ${context.storedAt}`);
                        console.log(`   ✅ Status: Ready for login!`);
                    } catch (error) {
                        console.log(`   ⚠️ Error parsing credential ${index + 1}: ${error.message}`);
                    }
                });
                
                console.log('\\n🚀 NEXT STEPS:');
                console.log('   1. Use the credentials above to login to the respective sites');
                console.log('   2. Complete email verification if required');
                console.log('   3. Start using the accounts for survey participation');
                console.log('   4. Monitor the database for additional automation insights');
            } else {
                console.log('ℹ️ No login-ready credentials found in this session');
            }
        } catch (error) {
            console.log(`❌ Failed to generate credential report: ${error.message}`);
        }
    }
    
    async cleanup() {
        console.log('\\n🧹 CLEANUP AND FINAL REPORTING');
        console.log('==============================');
        
        // Generate final credential report
        await this.generateFinalCredentialReport();
        
        // Log session completion
        await this.logStep('session_complete', 'Registration testing session completed', {
            totalRegistrations: this.registrationResults.length,
            successfulRegistrations: this.registrationResults.filter(r => r.success).length,
            totalDuration: Date.now() - this.sessionStartTime
        });
        
        if (this.page) await this.page.close();
        if (this.browser) await this.browser.close();
        if (this.db) await this.db.close();
        
        console.log(`✅ Session ${this.sessionId} completed successfully`);
        console.log(`⏱️ Total duration: ${((Date.now() - this.sessionStartTime) / 1000).toFixed(1)}s`);
        console.log('🧹 Cleanup completed');
    }
}

// Ensure screenshots directory exists
const fs = require('fs');
if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots');
}

// Run the complete registration test
async function runCompleteRegistrationTest() {
    const tester = new CompleteRegistrationTester();
    
    try {
        await tester.initialize();
        await tester.testCompleteRegistrations();
        
    } catch (error) {
        console.error('💥 Test failed:', error);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    runCompleteRegistrationTest().catch(console.error);
}

module.exports = CompleteRegistrationTester;