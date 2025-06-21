/**
 * Email Account Manager
 * Automated email account creation and verification system
 * Supports multiple email services with verification handling
 */

const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class EmailAccountManager {
    constructor(options = {}) {
        this.options = {
            headless: false,
            timeout: 30000,
            retryAttempts: 3,
            debugMode: true,
            ...options
        };

        this.browser = null;
        this.page = null;
        this.supportedServices = [
            {
                name: 'TempMail',
                url: 'https://temp-mail.org',
                method: 'tempmail',
                difficulty: 'easy',
                verificationSupport: true
            },
            {
                name: '10MinuteMail',
                url: 'https://10minutemail.com',
                method: 'tenminute',
                difficulty: 'easy',
                verificationSupport: true
            },
            {
                name: 'Guerrilla Mail',
                url: 'https://www.guerrillamail.com',
                method: 'guerrilla',
                difficulty: 'medium',
                verificationSupport: true
            },
            {
                name: 'ProtonMail',
                url: 'https://proton.me',
                method: 'proton',
                difficulty: 'hard',
                verificationSupport: true
            }
        ];

        this.activeAccounts = new Map();
        this.verificationQueue = new Set();
    }

    async initialize() {
        this.log('🚀 Initializing Email Account Manager...');
        
        try {
            this.browser = await chromium.launch({
                headless: this.options.headless,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--no-first-run',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--no-sandbox',
                    '--disable-dev-shm-usage'
                ]
            });
            
            this.log('🌐 Browser launched successfully');

            const context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                viewport: { width: 1366, height: 768 },
                locale: 'en-US',
                timezoneId: 'America/New_York'
            });
            
            this.page = await context.newPage();
            this.log('📄 New page created');
            
            // Add error handlers
            this.page.on('close', () => this.log('⚠️ Page closed'));
            this.page.on('crash', () => this.log('💥 Page crashed'));
            this.browser.on('close', () => this.log('⚠️ Browser closed'));
            
            this.log('✅ Email Account Manager initialized');
            
        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a new email account using the specified service
     */
    async createEmailAccount(service = 'auto', options = {}) {
        const startTime = Date.now();
        const sessionId = crypto.randomBytes(8).toString('hex');
        
        this.log(`📧 Creating new email account (Session: ${sessionId})...`);

        // Add retry logic for network issues
        let lastError;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
                
                // Auto-select service if not specified
                if (service === 'auto') {
                    service = this.selectBestService();
                }

                const serviceConfig = this.getServiceConfig(service);
                if (!serviceConfig) {
                    throw new Error(`Unsupported email service: ${service}`);
                }

                this.log(`🎯 Using service: ${serviceConfig.name} (${serviceConfig.difficulty})`);

                // Execute service-specific creation method
                const result = await this[serviceConfig.method + 'CreateAccount'](sessionId, options);
            
                if (result.success) {
                    const account = {
                        ...result,
                        service: serviceConfig.name,
                        sessionId: sessionId,
                        createdAt: Date.now(),
                        duration: Date.now() - startTime,
                        status: 'active',
                        verificationPending: false
                    };

                    this.activeAccounts.set(result.email, account);
                    this.log(`✅ Email account created: ${result.email} (${account.duration}ms)`);
                    
                    return account;
                } else {
                    throw new Error(result.error || 'Account creation failed');
                }

            } catch (error) {
                lastError = error;
                this.log(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < maxRetries) {
                    this.log(`⏳ Waiting before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                    
                    // Try different service on retry
                    if (attempt === 2 && service === 'tempmail') {
                        service = 'tenminute';
                        this.log(`🔄 Switching to backup service: 10MinuteMail`);
                    }
                }
            }
        }
        
        this.log(`❌ All ${maxRetries} attempts failed`);
        throw lastError;
    }

    /**
     * TempMail account creation
     */
    async tempmailCreateAccount(sessionId, options = {}) {
        this.log(`📨 Creating TempMail account (${sessionId})...`);
        
        try {
            this.log(`🌐 Navigating to https://temp-mail.org...`);
            const response = await this.page.goto('https://temp-mail.org', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            this.log(`📡 Navigation response: ${response.status()} ${response.statusText()}`);
            
            this.log(`⏳ Waiting for page to stabilize...`);
            await this.page.waitForTimeout(3000);
            
            this.log(`🔍 Current URL: ${this.page.url()}`);
            this.log(`📋 Page title: ${await this.page.title()}`);

            // Get the auto-generated email address
            const emailSelector = '#mail';
            this.log(`🔍 Looking for email input: ${emailSelector}`);
            
            try {
                await this.page.waitForSelector(emailSelector, { timeout: 10000 });
                this.log(`✅ Found email input field`);
            } catch (e) {
                this.log(`❌ Email input not found, page content: ${(await this.page.content()).substring(0, 500)}...`);
                throw new Error(`Email input selector not found: ${emailSelector}`);
            }
            
            // Wait for the email to actually load (not just "Loading...")
            this.log(`⏳ Waiting for email to be generated...`);
            let email = null;
            let attempts = 0;
            const maxEmailAttempts = 10;
            
            while (attempts < maxEmailAttempts) {
                email = await this.page.$eval(emailSelector, el => el.value);
                this.log(`📧 Email attempt ${attempts + 1}: ${email}`);
                
                if (email && email !== 'Loading...' && email.includes('@')) {
                    this.log(`✅ Valid email retrieved: ${email}`);
                    break;
                }
                
                attempts++;
                await this.page.waitForTimeout(2000);
            }

            if (!email || email === 'Loading...' || !email.includes('@')) {
                throw new Error(`Could not retrieve valid email address from TempMail after ${maxEmailAttempts} attempts`);
            }

            // Check if inbox is accessible
            this.log(`🔍 Looking for inbox: #inbox`);
            try {
                await this.page.waitForSelector('#inbox', { timeout: 10000 });
                this.log(`✅ Inbox found and accessible`);
            } catch (e) {
                this.log(`⚠️ Inbox not immediately accessible, but email retrieved successfully`);
            }
            
            return {
                success: true,
                email: email,
                password: null, // TempMail doesn't use passwords
                inbox: 'https://temp-mail.org',
                sessionData: {
                    serviceUrl: 'https://temp-mail.org',
                    inboxSelector: '#inbox'
                }
            };

        } catch (error) {
            this.log(`❌ TempMail creation failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 10MinuteMail account creation
     */
    async tenminuteCreateAccount(sessionId, options = {}) {
        this.log(`📨 Creating 10MinuteMail account (${sessionId})...`);
        
        try {
            await this.page.goto('https://10minutemail.com', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            await this.page.waitForTimeout(3000);

            // Get the auto-generated email address
            const emailSelector = '#mailAddress';
            await this.page.waitForSelector(emailSelector);
            const email = await this.page.$eval(emailSelector, el => el.value);

            if (!email) {
                throw new Error('Could not retrieve email address from 10MinuteMail');
            }

            // Verify inbox is working
            const inboxSelector = '.messages';
            await this.page.waitForSelector(inboxSelector, { timeout: 5000 });
            
            return {
                success: true,
                email: email,
                password: null,
                inbox: 'https://10minutemail.com',
                sessionData: {
                    serviceUrl: 'https://10minutemail.com',
                    inboxSelector: '.messages'
                }
            };

        } catch (error) {
            this.log(`❌ 10MinuteMail creation failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Guerrilla Mail account creation
     */
    async guerrillaCreateAccount(sessionId, options = {}) {
        this.log(`📨 Creating Guerrilla Mail account (${sessionId})...`);
        
        try {
            await this.page.goto('https://www.guerrillamail.com', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);

            // Get the email address
            const emailSelector = '#email-widget';
            await this.page.waitForSelector(emailSelector);
            const emailText = await this.page.$eval(emailSelector, el => el.textContent);
            
            // Extract email from text
            const emailMatch = emailText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (!emailMatch) {
                throw new Error('Could not extract email address from Guerrilla Mail');
            }

            const email = emailMatch[0];

            // Verify inbox accessibility
            await this.page.waitForSelector('#email_list', { timeout: 5000 });
            
            return {
                success: true,
                email: email,
                password: null,
                inbox: 'https://www.guerrillamail.com',
                sessionData: {
                    serviceUrl: 'https://www.guerrillamail.com',
                    inboxSelector: '#email_list'
                }
            };

        } catch (error) {
            this.log(`❌ Guerrilla Mail creation failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ProtonMail account creation (more complex)
     */
    async protonCreateAccount(sessionId, options = {}) {
        this.log(`📨 Creating ProtonMail account (${sessionId})...`);
        
        try {
            await this.page.goto('https://proton.me/mail', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);

            // Click create account
            const createAccountSelector = 'a[href*="signup"], button:has-text("Create account"), .create-account';
            await this.page.waitForSelector(createAccountSelector, { timeout: 10000 });
            await this.page.click(createAccountSelector);
            
            await this.page.waitForTimeout(2000);

            // Generate account details
            const username = this.generateUsername();
            const password = this.generatePassword();

            // Fill username
            const usernameSelector = 'input[name="username"], input[id*="username"], #username';
            await this.page.waitForSelector(usernameSelector);
            await this.typeWithHumanBehavior(usernameSelector, username);

            // Fill password
            const passwordSelector = 'input[name="password"], input[type="password"]';
            await this.page.waitForSelector(passwordSelector);
            await this.typeWithHumanBehavior(passwordSelector, password);

            // Fill confirm password if exists
            try {
                const confirmPasswordSelector = 'input[name="confirmPassword"], input[name="password-confirm"]';
                const confirmField = await this.page.$(confirmPasswordSelector);
                if (confirmField) {
                    await this.typeWithHumanBehavior(confirmPasswordSelector, password);
                }
            } catch (e) {
                // Confirm password field might not exist
            }

            // Handle any additional required fields
            await this.handleProtonSignupFlow();

            const email = `${username}@proton.me`;
            
            return {
                success: true,
                email: email,
                password: password,
                inbox: 'https://mail.proton.me',
                sessionData: {
                    serviceUrl: 'https://mail.proton.me',
                    username: username,
                    password: password
                }
            };

        } catch (error) {
            this.log(`❌ ProtonMail creation failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle ProtonMail signup flow complexities
     */
    async handleProtonSignupFlow() {
        try {
            // Skip phone verification if possible
            const skipButton = await this.page.$('button:has-text("Skip"), .skip-verification, [data-testid="skip"]');
            if (skipButton) {
                await skipButton.click();
                await this.page.waitForTimeout(1000);
            }

            // Handle free plan selection
            const freePlanButton = await this.page.$('button:has-text("Free"), .plan-free, [data-plan="free"]');
            if (freePlanButton) {
                await freePlanButton.click();
                await this.page.waitForTimeout(1000);
            }

            // Submit the form
            const submitButton = await this.page.$('button[type="submit"], button:has-text("Create"), .submit-button');
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForTimeout(3000);
            }

        } catch (error) {
            this.log(`⚠️ ProtonMail signup flow handling: ${error.message}`);
        }
    }

    /**
     * Check for new emails in the account
     */
    async checkEmails(email, options = {}) {
        const account = this.activeAccounts.get(email);
        if (!account) {
            throw new Error(`Account not found: ${email}`);
        }

        this.log(`📬 Checking emails for: ${email}`);

        try {
            // Navigate to inbox
            await this.page.goto(account.sessionData.serviceUrl, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);

            // Service-specific email checking
            const serviceMethod = account.service.toLowerCase().replace(/\s+/g, '');
            const emails = await this[`check${serviceMethod}Emails`]();

            this.log(`📧 Found ${emails.length} emails in ${email}`);
            return emails;

        } catch (error) {
            this.log(`❌ Email check failed for ${email}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check TempMail emails
     */
    async checktemmailEmails() {
        const emails = [];
        
        try {
            const emailElements = await this.page.$$('#inbox .message, .inbox-databox tr');
            
            for (const element of emailElements) {
                try {
                    const sender = await element.$eval('.sender, td:nth-child(1)', el => el.textContent?.trim());
                    const subject = await element.$eval('.subject, td:nth-child(2)', el => el.textContent?.trim());
                    const time = await element.$eval('.time, td:nth-child(3)', el => el.textContent?.trim());
                    
                    if (sender && subject) {
                        emails.push({
                            sender: sender,
                            subject: subject,
                            time: time,
                            element: element
                        });
                    }
                } catch (e) {
                    // Skip malformed emails
                }
            }
        } catch (error) {
            this.log(`⚠️ Error parsing TempMail emails: ${error.message}`);
        }

        return emails;
    }

    /**
     * Check 10MinuteMail emails
     */
    async check10minutemailEmails() {
        const emails = [];
        
        try {
            const emailElements = await this.page.$$('.messages .message, .inbox tr');
            
            for (const element of emailElements) {
                try {
                    const sender = await element.$eval('.sender, .from', el => el.textContent?.trim());
                    const subject = await element.$eval('.subject', el => el.textContent?.trim());
                    
                    if (sender && subject) {
                        emails.push({
                            sender: sender,
                            subject: subject,
                            element: element
                        });
                    }
                } catch (e) {
                    // Skip malformed emails
                }
            }
        } catch (error) {
            this.log(`⚠️ Error parsing 10MinuteMail emails: ${error.message}`);
        }

        return emails;
    }

    /**
     * Click verification link in email
     */
    async clickVerificationLink(email, emailIndex = 0) {
        this.log(`🔗 Looking for verification link in email: ${email}`);
        
        const account = this.activeAccounts.get(email);
        if (!account) {
            throw new Error(`Account not found: ${email}`);
        }

        try {
            const emails = await this.checkEmails(email);
            
            if (emails.length === 0) {
                throw new Error('No emails found');
            }

            if (emailIndex >= emails.length) {
                throw new Error(`Email index ${emailIndex} out of range (${emails.length} emails)`);
            }

            const targetEmail = emails[emailIndex];
            this.log(`📧 Opening email: "${targetEmail.subject}" from ${targetEmail.sender}`);

            // Click on the email to open it
            await targetEmail.element.click();
            await this.page.waitForTimeout(2000);

            // Look for verification links
            const linkSelectors = [
                'a[href*="verify"]',
                'a[href*="confirm"]',
                'a[href*="activate"]',
                'a:has-text("Verify")',
                'a:has-text("Confirm")',
                'a:has-text("Activate")',
                'a:has-text("Click here")'
            ];

            for (const selector of linkSelectors) {
                const link = await this.page.$(selector);
                if (link) {
                    const href = await link.getAttribute('href');
                    this.log(`🔗 Found verification link: ${href?.substring(0, 50)}...`);
                    
                    // Open in new tab to avoid losing email page
                    const newPage = await this.browser.newPage();
                    await newPage.goto(href, { waitUntil: 'networkidle' });
                    
                    // Wait for verification to complete
                    await newPage.waitForTimeout(3000);
                    
                    // Check for success indicators
                    const successIndicators = [
                        'verified',
                        'confirmed',
                        'activated',
                        'success',
                        'welcome'
                    ];

                    const pageContent = await newPage.content();
                    const isVerified = successIndicators.some(indicator => 
                        pageContent.toLowerCase().includes(indicator)
                    );

                    if (isVerified) {
                        this.log(`✅ Email verification successful for: ${email}`);
                        account.status = 'verified';
                        account.verifiedAt = Date.now();
                    } else {
                        this.log(`⚠️ Verification status unclear for: ${email}`);
                    }

                    await newPage.close();
                    return { success: isVerified, url: href };
                }
            }

            throw new Error('No verification link found in email');

        } catch (error) {
            this.log(`❌ Verification link handling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Utility methods
     */
    selectBestService() {
        // Prefer easier services first
        const easyServices = this.supportedServices.filter(s => s.difficulty === 'easy');
        if (easyServices.length > 0) {
            return easyServices[Math.floor(Math.random() * easyServices.length)].method;
        }
        
        return this.supportedServices[0].method;
    }

    getServiceConfig(service) {
        return this.supportedServices.find(s => s.method === service || s.name.toLowerCase() === service.toLowerCase());
    }

    generateUsername() {
        const adjectives = ['quick', 'smart', 'cool', 'fast', 'nice', 'good', 'new', 'free'];
        const nouns = ['user', 'person', 'member', 'guest', 'test', 'demo', 'sample'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 9999);
        
        return `${adjective}${noun}${number}`;
    }

    generatePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    async typeWithHumanBehavior(selector, text) {
        await this.page.focus(selector);
        await this.page.waitForTimeout(100 + Math.random() * 200);
        
        for (const char of text) {
            await this.page.keyboard.type(char, { 
                delay: 80 + Math.random() * 120 
            });
        }
    }

    /**
     * Get account information
     */
    getAccount(email) {
        return this.activeAccounts.get(email);
    }

    /**
     * List all active accounts
     */
    listAccounts() {
        return Array.from(this.activeAccounts.values());
    }

    /**
     * Close account and cleanup
     */
    async closeAccount(email) {
        const account = this.activeAccounts.get(email);
        if (account) {
            account.status = 'closed';
            account.closedAt = Date.now();
            this.log(`🗑️ Account closed: ${email}`);
        }
    }

    /**
     * Cleanup and shutdown
     */
    async cleanup() {
        this.log('🧹 Cleaning up Email Account Manager...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        this.log('✅ Email Account Manager cleanup complete');
    }

    log(message) {
        if (this.options.debugMode) {
            console.log(`[EmailManager] ${message}`);
        }
    }
}

module.exports = EmailAccountManager;