/**
 * AI-Driven Survey Site Registration System
 * Automatically registers for survey sites using AI-generated responses
 */

const { chromium } = require('playwright');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

const EmailAccountManager = require('../email/email-account-manager');
const RegistrationLogger = require('../database/registration-logger');
const AIService = require('../ai/ai-service');
const MasterBypassCoordinator = require('../integration/master-bypass-coordinator');

class AISurveyRegistrar {
    constructor(options = {}) {
        this.options = {
            headless: false,
            debugMode: true,
            screenshotOnError: true,
            retryAttempts: 3,
            aiModel: 'gpt-3.5-turbo',
            enableAdvancedBypass: true,
            ...options
        };

        this.browser = null;
        this.page = null;
        this.emailManager = null;
        this.logger = null;
        this.aiService = null;
        this.bypassCoordinator = null;

        this.currentSession = null;
        this.registrationSteps = [];
        this.detectedChallenges = [];
    }

    async initialize() {
        console.log('🚀 Initializing AI Survey Registrar...');
        
        // Initialize database logger
        this.logger = new RegistrationLogger();
        await this.logger.initialize();

        // Initialize AI service
        this.aiService = new AIService(process.env.OPENAI_API_KEY);
        
        // Initialize email manager
        this.emailManager = new EmailAccountManager({
            headless: this.options.headless,
            debugMode: this.options.debugMode
        });

        // Start browser
        this.browser = await chromium.launch({
            headless: this.options.headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-extensions'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set realistic user agent and viewport
        await this.page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });
        await this.page.setViewportSize({ width: 1366, height: 768 });

        // Initialize bypass coordinator if enabled
        if (this.options.enableAdvancedBypass) {
            try {
                this.bypassCoordinator = new MasterBypassCoordinator(this.page, {
                    enableNeuralMouse: true,
                    enableAdvancedKeystrokes: true,
                    enableChallengeSolving: true,
                    debugMode: this.options.debugMode
                });
                await this.bypassCoordinator.initialize();
                console.log('✅ Advanced bypass coordinator enabled');
            } catch (error) {
                console.log('⚠️ Bypass coordinator initialization failed, using basic mode:', error.message);
            }
        }

        console.log('✅ AI Survey Registrar initialized');
    }

    /**
     * Complete end-to-end registration process
     */
    async registerForSurvey(targetSite, options = {}) {
        const sessionId = crypto.randomBytes(8).toString('hex');
        const startTime = Date.now();
        
        console.log(`🎯 Starting registration for: ${targetSite.name} (Session: ${sessionId})`);
        
        this.currentSession = {
            sessionId: sessionId,
            targetSite: targetSite,
            startTime: startTime,
            currentStep: 'initialization',
            totalSteps: 6,
            emailAccount: null,
            registrationId: null
        };

        try {
            // Log system event
            await this.logger.logSystemEvent({
                sessionId: sessionId,
                eventType: 'registration_started',
                severity: 'info',
                sourceComponent: 'ai-survey-registrar',
                message: `Registration started for ${targetSite.name}`,
                eventData: { targetSite }
            });

            // Step 1: Create email account
            await this.executeStep('email_creation', async () => {
                console.log('📧 Step 1: Creating email account...');
                
                await this.emailManager.initialize();
                const emailAccount = await this.emailManager.createEmailAccount('auto');
                
                const emailId = await this.logger.logEmailAccount({
                    email: emailAccount.email,
                    service: emailAccount.service,
                    password: emailAccount.password,
                    sessionId: sessionId,
                    status: 'active',
                    metadata: emailAccount.sessionData
                });

                this.currentSession.emailAccount = { ...emailAccount, id: emailId };
                
                console.log(`✅ Email account created: ${emailAccount.email}`);
                return { email: emailAccount.email, service: emailAccount.service };
            });

            // Step 2: Navigate to registration page
            await this.executeStep('navigation', async () => {
                console.log('🌐 Step 2: Navigating to registration page...');
                
                await this.page.goto(targetSite.registrationUrl, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                
                await this.page.waitForTimeout(2000);
                
                // Take screenshot for analysis
                const screenshotPath = await this.takeScreenshot('navigation');
                
                return { url: this.page.url(), screenshotPath };
            });

            // Step 3: Analyze registration form
            await this.executeStep('form_analysis', async () => {
                console.log('🔍 Step 3: Analyzing registration form...');
                
                const formAnalysis = await this.analyzeRegistrationForm();
                return formAnalysis;
            });

            // Step 4: Fill registration form
            await this.executeStep('form_completion', async () => {
                console.log('📝 Step 4: Filling registration form...');
                
                const formData = await this.generateRegistrationData();
                await this.fillRegistrationForm(formData);
                
                return formData;
            });

            // Step 5: Handle verification challenges
            await this.executeStep('verification_handling', async () => {
                console.log('🧩 Step 5: Handling verification challenges...');
                
                const challenges = await this.detectAndHandleChallenges();
                return { challenges: challenges.length, resolved: challenges.filter(c => c.resolved).length };
            });

            // Step 6: Complete registration and verify email
            await this.executeStep('email_verification', async () => {
                console.log('✉️ Step 6: Completing registration and verifying email...');
                
                const verificationResult = await this.completeRegistrationAndVerify();
                return verificationResult;
            });

            // Update registration as successful
            await this.logger.updateRegistrationAttempt(this.currentSession.registrationId, {
                status: 'completed',
                success: 1,
                completed_at: new Date().toISOString(),
                current_step: 'completed'
            });

            const duration = Date.now() - startTime;
            console.log(`✅ Registration completed successfully in ${Math.round(duration / 1000)}s`);
            
            // Log performance metrics
            await this.logger.logPerformanceMetric({
                registrationId: this.currentSession.registrationId,
                metricName: 'total_duration',
                metricValue: duration,
                metricUnit: 'milliseconds'
            });

            await this.logger.logSystemEvent({
                sessionId: sessionId,
                eventType: 'registration_completed',
                severity: 'info',
                sourceComponent: 'ai-survey-registrar',
                message: `Registration completed successfully for ${targetSite.name}`,
                eventData: { duration, email: this.currentSession.emailAccount.email }
            });

            return {
                success: true,
                sessionId: sessionId,
                email: this.currentSession.emailAccount.email,
                duration: duration,
                steps: this.registrationSteps.length,
                challenges: this.detectedChallenges.length
            };

        } catch (error) {
            console.error(`❌ Registration failed (${sessionId}): ${error.message}`);
            
            // Log error
            await this.logger.updateRegistrationAttempt(this.currentSession.registrationId, {
                status: 'failed',
                success: 0,
                error_message: error.message,
                completed_at: new Date().toISOString()
            });

            await this.logger.logSystemEvent({
                sessionId: sessionId,
                eventType: 'registration_failed',
                severity: 'error',
                sourceComponent: 'ai-survey-registrar',
                message: `Registration failed: ${error.message}`,
                eventData: { error: error.stack }
            });

            // Take error screenshot
            if (this.options.screenshotOnError) {
                await this.takeScreenshot('error');
            }

            throw error;
        }
    }

    /**
     * Execute a registration step with logging
     */
    async executeStep(stepName, stepFunction) {
        const stepNumber = this.registrationSteps.length + 1;
        const startTime = Date.now();
        
        console.log(`⚡ Executing step ${stepNumber}: ${stepName}`);
        
        // Start registration attempt if this is the first step
        if (stepNumber === 1) {
            this.currentSession.registrationId = await this.logger.startRegistrationAttempt({
                sessionId: this.currentSession.sessionId,
                emailId: this.currentSession.emailAccount?.id || null,
                targetSite: this.currentSession.targetSite.name,
                targetUrl: this.currentSession.targetSite.registrationUrl,
                currentStep: stepName,
                totalSteps: this.currentSession.totalSteps,
                userAgent: await this.page.evaluate(() => navigator.userAgent),
                ipAddress: 'unknown' // Could be enhanced with IP detection
            });
        } else {
            // Update current step
            await this.logger.updateRegistrationAttempt(this.currentSession.registrationId, {
                current_step: stepName
            });
        }

        try {
            const result = await stepFunction();
            const duration = Date.now() - startTime;
            
            // Log step completion
            const stepId = await this.logger.logRegistrationStep({
                registrationId: this.currentSession.registrationId,
                stepNumber: stepNumber,
                stepName: stepName,
                stepType: 'automated',
                completedAt: new Date().toISOString(),
                durationMs: duration,
                status: 'completed',
                inputData: {},
                outputData: result,
                aiAnalysis: null
            });

            this.registrationSteps.push({
                stepId: stepId,
                stepNumber: stepNumber,
                stepName: stepName,
                duration: duration,
                result: result
            });

            console.log(`✅ Step ${stepNumber} completed: ${stepName} (${duration}ms)`);
            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Log step failure
            await this.logger.logRegistrationStep({
                registrationId: this.currentSession.registrationId,
                stepNumber: stepNumber,
                stepName: stepName,
                stepType: 'automated',
                durationMs: duration,
                status: 'failed',
                errorDetails: error.message,
                screenshotPath: await this.takeScreenshot(`step_${stepNumber}_error`)
            });

            console.log(`❌ Step ${stepNumber} failed: ${stepName} - ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze registration form using AI
     */
    async analyzeRegistrationForm() {
        console.log('🔍 Analyzing registration form with AI...');
        
        try {
            // Take screenshot for AI analysis
            const screenshot = await this.page.screenshot({ fullPage: false });
            
            // Get form HTML structure
            const formData = await this.page.evaluate(() => {
                const forms = Array.from(document.querySelectorAll('form'));
                const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
                
                return {
                    formCount: forms.length,
                    inputCount: inputs.length,
                    inputs: inputs.map(input => ({
                        type: input.type,
                        name: input.name,
                        id: input.id,
                        placeholder: input.placeholder,
                        required: input.required,
                        className: input.className
                    })),
                    pageTitle: document.title,
                    url: window.location.href
                };
            });

            // AI analysis prompt
            const analysisPrompt = `Analyze this registration form for a survey website. The form has ${formData.inputCount} input fields.

Form inputs detected:
${formData.inputs.map(input => `- ${input.type} field: ${input.name || input.id || 'unnamed'} (${input.placeholder || 'no placeholder'})`).join('\\n')}

Please provide a JSON response with:
{
  "formType": "survey_registration|newsletter|user_account",
  "complexity": "simple|moderate|complex",
  "requiredFields": ["field1", "field2"],
  "optionalFields": ["field3", "field4"],
  "expectedChallenges": ["captcha", "email_verification", "phone_verification"],
  "registrationStrategy": "direct|multi_step|email_first",
  "estimatedDifficulty": 1-10,
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on identifying what personal information is required and any potential anti-bot measures.`;

            const aiAnalysisResult = await this.aiService.analyze({
                prompt: analysisPrompt,
                model: this.options.aiModel,
                temperature: 0.1
            });

            // Log AI interaction
            await this.logger.logAIInteraction({
                registrationId: this.currentSession.registrationId,
                prompt: analysisPrompt,
                response: aiAnalysisResult,
                modelUsed: this.options.aiModel,
                success: true
            });

            const analysis = JSON.parse(aiAnalysisResult);
            
            console.log(`📊 Form analysis: ${analysis.formType} (${analysis.complexity}) - Difficulty: ${analysis.estimatedDifficulty}/10`);
            
            return { ...analysis, formData };

        } catch (error) {
            console.error('❌ Form analysis failed:', error.message);
            
            await this.logger.logAIInteraction({
                registrationId: this.currentSession.registrationId,
                prompt: 'Form analysis failed',
                response: null,
                modelUsed: this.options.aiModel,
                success: false,
                errorMessage: error.message
            });

            throw error;
        }
    }

    /**
     * Generate registration data using AI
     */
    async generateRegistrationData() {
        console.log('🤖 Generating registration data with AI...');
        
        const generationPrompt = `Generate realistic personal information for registering on a survey website. Create a fictional but believable profile.

Generate JSON response with:
{
  "personalInfo": {
    "firstName": "realistic first name",
    "lastName": "realistic last name", 
    "email": "${this.currentSession.emailAccount.email}",
    "dateOfBirth": "YYYY-MM-DD (age 25-45)",
    "gender": "male|female|other",
    "address": {
      "street": "realistic street address",
      "city": "realistic city name",
      "state": "realistic state/province",
      "zipCode": "realistic zip code",
      "country": "United States"
    }
  },
  "demographics": {
    "occupation": "realistic job title",
    "education": "high_school|some_college|bachelors|masters|doctorate",
    "income": "under_25k|25k_50k|50k_75k|75k_100k|over_100k",
    "maritalStatus": "single|married|divorced|widowed",
    "householdSize": 1-6
  },
  "preferences": {
    "communicationMethod": "email|phone|mail",
    "interests": ["interest1", "interest2", "interest3"],
    "surveyFrequency": "daily|weekly|monthly"
  }
}

Make the profile consistent and realistic. Avoid obviously fake information.`;

        try {
            const aiResponse = await this.aiService.analyze({
                prompt: generationPrompt,
                model: this.options.aiModel,
                temperature: 0.7
            });

            await this.logger.logAIInteraction({
                registrationId: this.currentSession.registrationId,
                prompt: generationPrompt,
                response: aiResponse,
                modelUsed: this.options.aiModel,
                success: true
            });

            const generatedData = JSON.parse(aiResponse);
            
            console.log(`👤 Generated profile: ${generatedData.personalInfo.firstName} ${generatedData.personalInfo.lastName}`);
            console.log(`📍 Location: ${generatedData.personalInfo.address.city}, ${generatedData.personalInfo.address.state}`);
            console.log(`💼 Occupation: ${generatedData.demographics.occupation}`);
            
            return generatedData;

        } catch (error) {
            console.error('❌ Data generation failed:', error.message);
            
            await this.logger.logAIInteraction({
                registrationId: this.currentSession.registrationId,
                prompt: generationPrompt,
                response: null,
                modelUsed: this.options.aiModel,
                success: false,
                errorMessage: error.message
            });

            throw error;
        }
    }

    /**
     * Fill registration form with generated data
     */
    async fillRegistrationForm(formData) {
        console.log('📝 Filling registration form...');
        
        const currentStepId = this.registrationSteps[this.registrationSteps.length - 1]?.stepId;
        
        // Map common field names to generated data
        const fieldMappings = {
            // Names
            'firstName': formData.personalInfo.firstName,
            'first_name': formData.personalInfo.firstName,
            'fname': formData.personalInfo.firstName,
            'name': formData.personalInfo.firstName,
            
            'lastName': formData.personalInfo.lastName,
            'last_name': formData.personalInfo.lastName,
            'lname': formData.personalInfo.lastName,
            'surname': formData.personalInfo.lastName,
            
            // Email
            'email': formData.personalInfo.email,
            'email_address': formData.personalInfo.email,
            'emailAddress': formData.personalInfo.email,
            
            // Password (if needed)
            'password': 'Survey123!@#',
            'confirmPassword': 'Survey123!@#',
            'password_confirm': 'Survey123!@#',
            
            // Demographics
            'gender': formData.personalInfo.gender,
            'age': this.calculateAge(formData.personalInfo.dateOfBirth),
            'dateOfBirth': formData.personalInfo.dateOfBirth,
            'dob': formData.personalInfo.dateOfBirth,
            
            // Address
            'address': formData.personalInfo.address.street,
            'street': formData.personalInfo.address.street,
            'city': formData.personalInfo.address.city,
            'state': formData.personalInfo.address.state,
            'zip': formData.personalInfo.address.zipCode,
            'zipCode': formData.personalInfo.address.zipCode,
            'postal_code': formData.personalInfo.address.zipCode,
            'country': formData.personalInfo.address.country,
            
            // Additional info
            'occupation': formData.demographics.occupation,
            'income': formData.demographics.income,
            'education': formData.demographics.education
        };

        // Find and fill form fields
        const fields = await this.page.$$('input, select, textarea');
        let filledCount = 0;

        for (const field of fields) {
            try {
                const fieldInfo = await field.evaluate(el => ({
                    type: el.type,
                    name: el.name,
                    id: el.id,
                    placeholder: el.placeholder,
                    tagName: el.tagName.toLowerCase()
                }));

                // Skip hidden fields, buttons, and submits
                if (['hidden', 'submit', 'button'].includes(fieldInfo.type)) {
                    continue;
                }

                // Determine field value
                let value = null;
                const fieldIdentifier = fieldInfo.name || fieldInfo.id || fieldInfo.placeholder?.toLowerCase();
                
                // Try to match field to data
                for (const [key, mappedValue] of Object.entries(fieldMappings)) {
                    if (fieldIdentifier?.toLowerCase().includes(key.toLowerCase())) {
                        value = mappedValue;
                        break;
                    }
                }

                // Handle special field types
                if (!value) {
                    if (fieldInfo.type === 'checkbox' && fieldIdentifier?.includes('agree')) {
                        // Accept terms/agreements
                        await field.check();
                        value = 'checked';
                    } else if (fieldInfo.type === 'radio') {
                        // Skip radio buttons for now
                        continue;
                    } else if (fieldInfo.tagName === 'select') {
                        // Handle dropdowns
                        const options = await field.$$('option');
                        if (options.length > 1) {
                            // Select second option (first is usually "Select...")
                            await field.selectOption({ index: 1 });
                            value = 'option_selected';
                        }
                    }
                }

                if (value && fieldInfo.type !== 'checkbox') {
                    // Fill text fields with human-like behavior
                    await this.fillFieldWithBehavior(field, value.toString());
                    filledCount++;

                    // Log interaction
                    await this.logger.logFormInteraction({
                        stepId: currentStepId,
                        fieldName: fieldIdentifier || 'unknown',
                        fieldType: fieldInfo.type,
                        fieldSelector: fieldInfo.name ? `[name="${fieldInfo.name}"]` : `#${fieldInfo.id}`,
                        inputValue: value.toString(),
                        aiGenerated: true,
                        interactionType: 'fill',
                        success: true
                    });

                    console.log(`✅ Filled ${fieldIdentifier}: ${value.toString().substring(0, 20)}...`);
                }

            } catch (error) {
                console.log(`⚠️ Failed to fill field: ${error.message}`);
            }
        }

        console.log(`📝 Filled ${filledCount} form fields`);
        
        // Submit form
        await this.submitForm();
    }

    /**
     * Fill field with human-like behavior
     */
    async fillFieldWithBehavior(field, value) {
        try {
            await field.focus();
            await this.page.waitForTimeout(100 + Math.random() * 200);
            
            // Clear existing content
            await field.selectText();
            await this.page.waitForTimeout(50);
            
            // Type with human-like delays
            if (this.bypassCoordinator && this.bypassCoordinator.keystrokeSimulator) {
                // Use advanced keystroke simulation if available
                const session = await this.bypassCoordinator.keystrokeSimulator.simulateTyping(value, 'normal');
                for (const keystroke of session.keystrokes) {
                    await this.page.keyboard.type(keystroke.key, { delay: keystroke.delay });
                }
            } else {
                // Basic human-like typing
                for (const char of value) {
                    await this.page.keyboard.type(char, { 
                        delay: 80 + Math.random() * 120 
                    });
                }
            }
            
            await this.page.waitForTimeout(100 + Math.random() * 200);
            
        } catch (error) {
            // Fallback to simple fill
            await field.fill(value);
        }
    }

    /**
     * Submit the registration form
     */
    async submitForm() {
        console.log('📤 Submitting registration form...');
        
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Join")',
            'button:has-text("Create Account")',
            '.submit-button',
            '.register-button'
        ];

        for (const selector of submitSelectors) {
            try {
                const button = await this.page.$(selector);
                if (button) {
                    console.log(`🖱️ Clicking submit button: ${selector}`);
                    
                    if (this.bypassCoordinator) {
                        await this.bypassCoordinator.fillFieldWithBehavior(selector, '', {});
                    } else {
                        await button.click();
                    }
                    
                    await this.page.waitForTimeout(2000);
                    return;
                }
            } catch (error) {
                continue;
            }
        }

        throw new Error('No submit button found');
    }

    /**
     * Detect and handle verification challenges
     */
    async detectAndHandleChallenges() {
        console.log('🧩 Detecting verification challenges...');
        
        const challenges = [];
        
        // Common challenge selectors
        const challengeTypes = [
            {
                name: 'CAPTCHA',
                selectors: ['.captcha', '#captcha', '[class*="captcha"]', '.recaptcha'],
                handler: 'handleCaptcha'
            },
            {
                name: 'Email Verification',
                selectors: ['.email-verification', '[class*="verify"]', '.verification-notice'],
                handler: 'handleEmailVerification'
            },
            {
                name: 'Phone Verification',
                selectors: ['.phone-verification', '[name*="phone"]', '#phone'],
                handler: 'handlePhoneVerification'
            },
            {
                name: 'Terms Agreement',
                selectors: ['[name*="terms"]', '[name*="agree"]', '.terms-checkbox'],
                handler: 'handleTermsAgreement'
            }
        ];

        for (const challengeType of challengeTypes) {
            for (const selector of challengeType.selectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        console.log(`🎯 Detected challenge: ${challengeType.name}`);
                        
                        const challenge = {
                            type: challengeType.name,
                            selector: selector,
                            element: element,
                            resolved: false
                        };

                        // Handle challenge
                        try {
                            await this[challengeType.handler](element);
                            challenge.resolved = true;
                            console.log(`✅ Resolved challenge: ${challengeType.name}`);
                        } catch (error) {
                            console.log(`❌ Failed to resolve challenge: ${challengeType.name} - ${error.message}`);
                            challenge.error = error.message;
                        }

                        challenges.push(challenge);
                        this.detectedChallenges.push(challenge);
                    }
                } catch (error) {
                    // Continue checking other selectors
                }
            }
        }

        return challenges;
    }

    /**
     * Handle CAPTCHA challenges
     */
    async handleCaptcha(element) {
        console.log('🧩 Handling CAPTCHA challenge...');
        
        if (this.bypassCoordinator && this.bypassCoordinator.challengeSolver) {
            try {
                const result = await this.bypassCoordinator.challengeSolver.solveCaptcha({
                    element: element,
                    type: 'unknown'
                });
                
                if (result.success) {
                    console.log('✅ CAPTCHA solved successfully');
                } else {
                    throw new Error('CAPTCHA solving failed');
                }
            } catch (error) {
                console.log('⚠️ CAPTCHA solver failed, using fallback strategy');
                // Wait and hope it's optional
                await this.page.waitForTimeout(5000);
            }
        } else {
            console.log('⚠️ No CAPTCHA solver available, skipping');
            await this.page.waitForTimeout(3000);
        }
    }

    /**
     * Handle email verification
     */
    async handleEmailVerification(element) {
        console.log('✉️ Handling email verification...');
        
        // Wait for verification email
        await this.page.waitForTimeout(5000);
        
        try {
            const emails = await this.emailManager.checkEmails(this.currentSession.emailAccount.email);
            
            if (emails.length > 0) {
                // Look for verification email
                const verificationEmail = emails.find(email => 
                    email.subject.toLowerCase().includes('verify') ||
                    email.subject.toLowerCase().includes('confirm') ||
                    email.subject.toLowerCase().includes('activate')
                );

                if (verificationEmail) {
                    console.log('📧 Found verification email, clicking link...');
                    await this.emailManager.clickVerificationLink(this.currentSession.emailAccount.email, 0);
                    console.log('✅ Email verification completed');
                } else {
                    console.log('⚠️ No verification email found yet');
                }
            }
        } catch (error) {
            console.log(`⚠️ Email verification handling failed: ${error.message}`);
        }
    }

    /**
     * Handle terms agreement
     */
    async handleTermsAgreement(element) {
        console.log('📋 Handling terms agreement...');
        
        try {
            if (await element.isChecked()) {
                console.log('✅ Terms already agreed');
                return;
            }

            await element.check();
            console.log('✅ Terms agreement checked');
        } catch (error) {
            console.log(`⚠️ Terms agreement failed: ${error.message}`);
        }
    }

    /**
     * Handle phone verification (skip for now)
     */
    async handlePhoneVerification(element) {
        console.log('📱 Phone verification detected - skipping for now');
        // Most survey sites don't require phone verification
        // Could be enhanced to use temporary phone services
    }

    /**
     * Complete registration and verify email
     */
    async completeRegistrationAndVerify() {
        console.log('🏁 Completing registration process...');
        
        // Wait for potential redirects
        await this.page.waitForTimeout(3000);
        
        // Check if we're on a success page
        const currentUrl = this.page.url();
        const pageContent = await this.page.content();
        
        const successIndicators = [
            'thank you',
            'registration complete',
            'welcome',
            'success',
            'account created',
            'check your email'
        ];

        const isSuccess = successIndicators.some(indicator => 
            pageContent.toLowerCase().includes(indicator)
        );

        if (isSuccess) {
            console.log('✅ Registration appears successful');
            
            // Wait a bit longer for verification email
            await this.page.waitForTimeout(10000);
            
            try {
                const emails = await this.emailManager.checkEmails(this.currentSession.emailAccount.email);
                console.log(`📧 Found ${emails.length} emails in inbox`);
                
                if (emails.length > 0) {
                    // Try to verify email
                    await this.emailManager.clickVerificationLink(this.currentSession.emailAccount.email, 0);
                    console.log('✅ Email verification completed');
                }
            } catch (error) {
                console.log(`⚠️ Email verification failed: ${error.message}`);
            }
        }

        return {
            success: isSuccess,
            currentUrl: currentUrl,
            emailsReceived: 0 // Could be enhanced
        };
    }

    /**
     * Utility methods
     */
    calculateAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age.toString();
    }

    async takeScreenshot(context) {
        try {
            const screenshotDir = path.join(__dirname, '../../data/screenshots');
            await fs.mkdir(screenshotDir, { recursive: true });
            
            const filename = `${this.currentSession.sessionId}_${context}_${Date.now()}.png`;
            const screenshotPath = path.join(screenshotDir, filename);
            
            await this.page.screenshot({ path: screenshotPath, fullPage: false });
            console.log(`📸 Screenshot saved: ${filename}`);
            
            return screenshotPath;
        } catch (error) {
            console.log(`⚠️ Screenshot failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Get registration statistics
     */
    async getRegistrationStats() {
        return await this.logger.getRegistrationStats();
    }

    /**
     * Export registration data
     */
    async exportData(outputPath) {
        return await this.logger.exportData(outputPath);
    }

    /**
     * Cleanup and shutdown
     */
    async cleanup() {
        console.log('🧹 Cleaning up AI Survey Registrar...');
        
        if (this.emailManager) {
            await this.emailManager.cleanup();
        }
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.logger) {
            await this.logger.close();
        }
        
        console.log('✅ AI Survey Registrar cleanup complete');
    }
}

module.exports = AISurveyRegistrar;