/**
 * Automatic Login System
 * 
 * Intelligent system for automatically logging into survey sites using saved credentials.
 * Features:
 * - Retrieves saved login credentials from database
 * - Handles different login form structures
 * - Bypasses CAPTCHAs and anti-bot measures
 * - Manages session persistence
 * - Handles multi-factor authentication when possible
 */

class AutomaticLoginSystem {
    constructor(page, registrationLogger, contentAI, options = {}) {
        this.page = page;
        this.registrationLogger = registrationLogger;
        this.contentAI = contentAI;
        this.options = {
            maxLoginAttempts: 3,
            loginTimeout: 30000,
            sessionPersistence: true,
            debugMode: false,
            humanLikeDelays: true,
            ...options
        };
        
        // Site-specific login patterns
        this.loginPatterns = {
            'surveyplanet.com': {
                loginUrl: 'https://surveyplanet.com/login',
                emailSelectors: ['#email', '[name="email"]', '.email-input'],
                passwordSelectors: ['#password', '[name="password"]', '.password-input'],
                submitSelectors: ['.login-btn', '.submit-btn', '[type="submit"]'],
                successIndicators: ['.dashboard', '.account', '.profile', '.surveys'],
                twoFactorSelectors: ['.two-factor', '.verification-code', '.mfa']
            },
            'swagbucks.com': {
                loginUrl: 'https://www.swagbucks.com/account/signin',
                emailSelectors: ['#emailAddress', '[name="emailAddress"]'],
                passwordSelectors: ['#password', '[name="password"]'],
                submitSelectors: ['.signInBtn', '.login-submit'],
                successIndicators: ['.dashboard', '.account-summary', '.member-dashboard']
            },
            'surveyjunkie.com': {
                loginUrl: 'https://www.surveyjunkie.com/login',
                emailSelectors: ['#email', '[name="email"]'],
                passwordSelectors: ['#password', '[name="password"]'],
                submitSelectors: ['.btn-login', '.submit-button'],
                successIndicators: ['.member-home', '.dashboard', '.available-surveys']
            },
            'toluna.com': {
                loginUrl: 'https://us.toluna.com/login',
                emailSelectors: ['#Email', '[name="Email"]'],
                passwordSelectors: ['#Password', '[name="Password"]'],
                submitSelectors: ['.login-button', '.btn-primary'],
                successIndicators: ['.home-page', '.member-area', '.polls']
            },
            'inboxdollars.com': {
                loginUrl: 'https://www.inboxdollars.com/account/signin',
                emailSelectors: ['#username', '[name="username"]'],
                passwordSelectors: ['#password', '[name="password"]'],
                submitSelectors: ['.signin-btn', '.login-submit'],
                successIndicators: ['.member-home', '.dashboard', '.earning-center']
            }
        };
        
        // Universal login patterns for unknown sites
        this.universalPatterns = {
            emailSelectors: [
                '#email', '#username', '#user', '#login', '#account',
                '[name="email"]', '[name="username"]', '[name="user"]',
                '[type="email"]', '.email', '.username', '.login-email'
            ],
            passwordSelectors: [
                '#password', '#pass', '#pwd',
                '[name="password"]', '[name="pass"]', '[name="pwd"]',
                '[type="password"]', '.password', '.pass'
            ],
            submitSelectors: [
                '[type="submit"]', '.submit', '.login', '.signin', '.sign-in',
                '.login-btn', '.signin-btn', '.submit-btn', '.btn-submit',
                'button:has-text("login")', 'button:has-text("sign in")'
            ],
            successIndicators: [
                '.dashboard', '.account', '.profile', '.member', '.home',
                '.logged-in', '.authenticated', '.user-menu'
            ]
        };
        
        this.log('🔐 Automatic Login System initialized');
    }

    /**
     * Main login method - attempts to log into a site using saved credentials
     */
    async loginToSite(email, siteUrl) {
        this.log(`🚀 Starting automatic login for ${email} on ${siteUrl}`);
        
        try {
            // Step 1: Retrieve saved credentials
            const credentials = await this.getCredentials(email, siteUrl);
            if (!credentials) {
                throw new Error(`No saved credentials found for ${email} on ${siteUrl}`);
            }
            
            // Step 2: Navigate to login page
            await this.navigateToLoginPage(siteUrl);
            
            // Step 3: Detect and analyze login form
            const loginForm = await this.detectLoginForm(siteUrl);
            if (!loginForm) {
                throw new Error('Could not detect login form on page');
            }
            
            // Step 4: Fill login form
            await this.fillLoginForm(loginForm, credentials);
            
            // Step 5: Submit form and handle response
            const loginResult = await this.submitLoginForm(loginForm);
            
            // Step 6: Verify successful login
            const isLoggedIn = await this.verifyLoginSuccess(siteUrl);
            
            if (isLoggedIn) {
                // Step 7: Save session if persistence is enabled
                if (this.options.sessionPersistence) {
                    await this.saveSession(email, siteUrl);
                }
                
                this.log('✅ Login successful');
                return {
                    success: true,
                    message: 'Successfully logged in',
                    sessionSaved: this.options.sessionPersistence
                };
            } else {
                throw new Error('Login verification failed');
            }
            
        } catch (error) {
            this.log(`❌ Login failed: ${error.message}`);
            
            // Log login failure for analysis
            await this.logLoginAttempt(email, siteUrl, false, error.message);
            
            return {
                success: false,
                error: error.message,
                suggestion: this.getLoginErrorSuggestion(error.message)
            };
        }
    }

    /**
     * Retrieve saved credentials from database
     */
    async getCredentials(email, siteUrl) {
        this.log('🔍 Retrieving saved credentials...');
        
        try {
            const domain = this.extractDomain(siteUrl);
            const registration = await this.registrationLogger.getRegistrationByEmailAndSite(email, domain);
            
            if (registration && registration.password) {
                return {
                    email: email,
                    password: registration.password,
                    loginUrl: registration.login_url || this.getDefaultLoginUrl(domain),
                    additionalData: registration.additional_data ? JSON.parse(registration.additional_data) : {}
                };
            }
            
            return null;
            
        } catch (error) {
            this.log(`⚠️ Credential retrieval failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Navigate to the login page
     */
    async navigateToLoginPage(siteUrl) {
        this.log('🧭 Navigating to login page...');
        
        const domain = this.extractDomain(siteUrl);
        const patterns = this.loginPatterns[domain];
        
        let loginUrl = siteUrl;
        if (patterns?.loginUrl) {
            loginUrl = patterns.loginUrl;
        } else {
            // Try to find login URL by navigating to site and looking for login links
            await this.page.goto(siteUrl);
            const foundLoginUrl = await this.findLoginUrl();
            if (foundLoginUrl) {
                loginUrl = foundLoginUrl;
            }
        }
        
        this.log(`📍 Navigating to: ${loginUrl}`);
        await this.page.goto(loginUrl, { waitUntil: 'networkidle' });
        
        // Wait for page to fully load
        await this.page.waitForTimeout(2000);
    }

    /**
     * Find login URL on the current page
     */
    async findLoginUrl() {
        const loginLinkSelectors = [
            'a[href*="login"]', 'a[href*="signin"]', 'a[href*="sign-in"]',
            'a:has-text("login")', 'a:has-text("sign in")', 'a:has-text("log in")',
            '.login-link', '.signin-link', '.header-login'
        ];
        
        for (const selector of loginLinkSelectors) {
            try {
                const element = await this.page.locator(selector).first();
                if (await element.isVisible()) {
                    const href = await element.getAttribute('href');
                    if (href) {
                        return href.startsWith('http') ? href : new URL(href, this.page.url()).href;
                    }
                }
            } catch (e) {
                // Continue checking other selectors
            }
        }
        
        return null;
    }

    /**
     * Detect and analyze login form on the page
     */
    async detectLoginForm(siteUrl) {
        this.log('🔍 Detecting login form...');
        
        const domain = this.extractDomain(siteUrl);
        const patterns = this.loginPatterns[domain] || this.universalPatterns;
        
        // Use LLM to analyze the page if available
        if (this.contentAI) {
            const llmAnalysis = await this.performLLMLoginAnalysis();
            if (llmAnalysis.success) {
                return llmAnalysis.form;
            }
        }
        
        // Fallback to pattern-based detection
        const form = {
            emailField: null,
            passwordField: null,
            submitButton: null,
            additionalFields: []
        };
        
        // Find email field
        for (const selector of patterns.emailSelectors) {
            try {
                const element = await this.page.locator(selector).first();
                if (await element.isVisible()) {
                    form.emailField = {
                        selector: selector,
                        element: element
                    };
                    break;
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        // Find password field
        for (const selector of patterns.passwordSelectors) {
            try {
                const element = await this.page.locator(selector).first();
                if (await element.isVisible()) {
                    form.passwordField = {
                        selector: selector,
                        element: element
                    };
                    break;
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        // Find submit button
        for (const selector of patterns.submitSelectors) {
            try {
                const element = await this.page.locator(selector).first();
                if (await element.isVisible()) {
                    form.submitButton = {
                        selector: selector,
                        element: element
                    };
                    break;
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        // Validate form completeness
        if (form.emailField && form.passwordField && form.submitButton) {
            this.log('✅ Login form detected successfully');
            return form;
        }
        
        this.log('⚠️ Incomplete login form detected');
        return null;
    }

    /**
     * Use LLM to analyze login form
     */
    async performLLMLoginAnalysis() {
        if (!this.contentAI) {
            return { success: false };
        }
        
        try {
            const pageContent = await this.page.content();
            const url = await this.page.url();
            
            const prompt = `
LOGIN FORM ANALYSIS TASK:

Analyze this login page and identify the form elements needed for automated login.

URL: ${url}

HTML CONTENT:
${pageContent.substring(0, 8000)}

Please identify and provide CSS selectors for:
1. Email/Username input field
2. Password input field  
3. Submit/Login button
4. Any additional required fields (CAPTCHA, security questions, etc.)

Respond in this JSON format:
{
    "success": true,
    "form": {
        "emailField": {
            "selector": "CSS_selector_for_email_field",
            "type": "email|username",
            "label": "field_label_text"
        },
        "passwordField": {
            "selector": "CSS_selector_for_password_field",
            "label": "field_label_text"
        },
        "submitButton": {
            "selector": "CSS_selector_for_submit_button",
            "text": "button_text"
        },
        "additionalFields": [
            {
                "selector": "CSS_selector",
                "type": "captcha|security_question|etc",
                "required": true|false
            }
        ]
    },
    "challenges": [
        "List any anti-bot challenges detected (CAPTCHA, etc.)"
    ]
}

Focus on finding the most reliable selectors for automated login.`;

            // Log prompt
            await this.logLLMPrompt('login_form_analysis', prompt);
            
            const response = await this.contentAI.generateResponse(prompt);
            
            // Log response
            await this.logLLMResponse('login_form_analysis', response);
            
            const analysis = JSON.parse(response);
            
            if (analysis.success) {
                this.log('✅ LLM login form analysis successful');
                return analysis;
            }
            
            return { success: false };
            
        } catch (error) {
            this.log(`⚠️ LLM login analysis failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fill the login form with credentials
     */
    async fillLoginForm(form, credentials) {
        this.log('📝 Filling login form...');
        
        try {
            // Fill email field
            if (form.emailField) {
                await this.fillFieldHumanLike(form.emailField.element, credentials.email);
                this.log(`✅ Email filled: ${this.maskEmail(credentials.email)}`);
            }
            
            // Human-like delay
            await this.humanDelay(500, 1200);
            
            // Fill password field
            if (form.passwordField) {
                await this.fillFieldHumanLike(form.passwordField.element, credentials.password, 'password');
                this.log('✅ Password filled: ********');
            }
            
            // Handle additional fields if any
            if (form.additionalFields && form.additionalFields.length > 0) {
                await this.handleAdditionalFields(form.additionalFields, credentials);
            }
            
            // Final delay before submission
            await this.humanDelay(800, 1500);
            
        } catch (error) {
            this.log(`❌ Form filling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit the login form
     */
    async submitLoginForm(form) {
        this.log('📤 Submitting login form...');
        
        try {
            // Click submit button
            await form.submitButton.element.click();
            
            // Wait for navigation or response
            await Promise.race([
                this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: this.options.loginTimeout }),
                this.page.waitForSelector('.error, .success, .dashboard', { timeout: this.options.loginTimeout }),
                this.page.waitForTimeout(this.options.loginTimeout)
            ]);
            
            this.log('✅ Form submitted');
            return { success: true };
            
        } catch (error) {
            this.log(`❌ Form submission failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verify that login was successful
     */
    async verifyLoginSuccess(siteUrl) {
        this.log('🔍 Verifying login success...');
        
        const domain = this.extractDomain(siteUrl);
        const patterns = this.loginPatterns[domain] || this.universalPatterns;
        
        // Check for error messages first
        const errorSelectors = [
            '.error', '.alert-danger', '.login-error', '.invalid',
            '.failed', '.incorrect', '.wrong-password'
        ];
        
        for (const selector of errorSelectors) {
            try {
                const errorElement = await this.page.locator(selector).first();
                if (await errorElement.isVisible()) {
                    const errorText = await errorElement.textContent();
                    this.log(`❌ Login error detected: ${errorText}`);
                    return false;
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        // Check for success indicators
        for (const selector of patterns.successIndicators) {
            try {
                const successElement = await this.page.locator(selector).first();
                if (await successElement.isVisible()) {
                    this.log(`✅ Success indicator found: ${selector}`);
                    return true;
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        // Check URL for login success patterns
        const currentUrl = await this.page.url();
        const successUrlPatterns = [
            'dashboard', 'account', 'profile', 'member', 'home'
        ];
        
        if (successUrlPatterns.some(pattern => currentUrl.includes(pattern))) {
            this.log(`✅ Success URL pattern detected: ${currentUrl}`);
            return true;
        }
        
        // Check if we're no longer on login page
        if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
            this.log('✅ Redirected away from login page');
            return true;
        }
        
        this.log('⚠️ Login success verification inconclusive');
        return false;
    }

    /**
     * Save session information for future use
     */
    async saveSession(email, siteUrl) {
        this.log('💾 Saving session information...');
        
        try {
            // Get cookies
            const cookies = await this.page.context().cookies();
            
            // Get local storage
            const localStorage = await this.page.evaluate(() => {
                return JSON.stringify(window.localStorage);
            });
            
            // Save session data
            await this.registrationLogger.saveSession({
                email: email,
                site: this.extractDomain(siteUrl),
                cookies: JSON.stringify(cookies),
                local_storage: localStorage,
                session_url: await this.page.url(),
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            });
            
            this.log('✅ Session saved successfully');
            
        } catch (error) {
            this.log(`⚠️ Session saving failed: ${error.message}`);
        }
    }

    /**
     * Helper methods
     */

    async fillFieldHumanLike(element, value, fieldType = 'text') {
        await element.scrollIntoViewIfNeeded();
        await this.humanDelay(200, 500);
        
        await element.focus();
        await this.humanDelay(100, 300);
        
        // Clear existing content
        await element.selectText();
        await this.humanDelay(50, 150);
        
        if (fieldType === 'password') {
            // For passwords, type without human errors
            await element.fill(value);
        } else {
            // For other fields, simulate typing
            await this.typeHumanLike(element, value);
        }
        
        await element.blur();
        await this.humanDelay(100, 200);
    }

    async typeHumanLike(element, text) {
        await element.fill('');
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            await element.type(char);
            
            const delay = 50 + Math.random() * 100; // 50-150ms between characters
            await this.page.waitForTimeout(delay);
        }
    }

    async humanDelay(min, max) {
        if (!this.options.humanLikeDelays) return;
        
        const delay = min + Math.random() * (max - min);
        await this.page.waitForTimeout(Math.round(delay));
    }

    async handleAdditionalFields(additionalFields, credentials) {
        // Handle CAPTCHA, security questions, etc.
        for (const field of additionalFields) {
            if (field.type === 'captcha') {
                this.log('⚠️ CAPTCHA detected - may require manual intervention');
                // Could implement CAPTCHA solving service integration here
            } else if (field.type === 'security_question') {
                // Try to answer from stored additional data
                const answer = credentials.additionalData?.securityAnswer;
                if (answer) {
                    const element = this.page.locator(field.selector).first();
                    await this.fillFieldHumanLike(element, answer);
                }
            }
        }
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return '';
        }
    }

    getDefaultLoginUrl(domain) {
        const common = {
            'surveyplanet.com': 'https://surveyplanet.com/login',
            'swagbucks.com': 'https://www.swagbucks.com/account/signin',
            'surveyjunkie.com': 'https://www.surveyjunkie.com/login'
        };
        
        return common[domain] || `https://${domain}/login`;
    }

    maskEmail(email) {
        const [user, domain] = email.split('@');
        return `${user.substring(0, 3)}***@${domain}`;
    }

    getLoginErrorSuggestion(errorMessage) {
        if (errorMessage.includes('credentials')) {
            return 'Check if stored credentials are correct';
        } else if (errorMessage.includes('form')) {
            return 'Login form structure may have changed';
        } else if (errorMessage.includes('CAPTCHA')) {
            return 'CAPTCHA verification required';
        } else {
            return 'Try logging in manually to verify account status';
        }
    }

    async logLoginAttempt(email, siteUrl, success, errorMessage = null) {
        try {
            await this.registrationLogger.logLoginAttempt({
                email: email,
                site: this.extractDomain(siteUrl),
                success: success ? 1 : 0,
                error_message: errorMessage,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.log(`⚠️ Login attempt logging failed: ${error.message}`);
        }
    }

    async logLLMPrompt(promptType, prompt) {
        try {
            await this.registrationLogger.logLLMInteraction({
                interaction_type: 'prompt',
                prompt_type: promptType,
                prompt_content: prompt,
                timestamp: new Date().toISOString(),
                component: 'AutomaticLoginSystem'
            });
        } catch (error) {
            this.log(`⚠️ LLM prompt logging failed: ${error.message}`);
        }
    }

    async logLLMResponse(promptType, response) {
        try {
            await this.registrationLogger.logLLMInteraction({
                interaction_type: 'response',
                prompt_type: promptType,
                response_content: response,
                timestamp: new Date().toISOString(),
                component: 'AutomaticLoginSystem'
            });
        } catch (error) {
            this.log(`⚠️ LLM response logging failed: ${error.message}`);
        }
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[AutomaticLoginSystem] ${message}`);
        }
    }
}

module.exports = AutomaticLoginSystem;