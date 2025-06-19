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
        
        this.browser = await chromium.launch({
            headless: this.options.headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--no-first-run'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set realistic user agent using headers
        await this.page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });
        await this.page.setViewportSize({ width: 1366, height: 768 });

        this.log('✅ Email Account Manager initialized');
    }

    /**
     * Create a new email account using the specified service
     */
    async createEmailAccount(service = 'auto', options = {}) {
        const startTime = Date.now();
        const sessionId = crypto.randomBytes(8).toString('hex');
        
        this.log(`📧 Creating new email account (Session: ${sessionId})...`);

        try {
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
            this.log(`❌ Email account creation failed (${sessionId}): ${error.message}`);
            throw error;
        }
    }

    /**
     * TempMail account creation
     */
    async tempmailCreateAccount(sessionId, options = {}) {
        this.log(`📨 Creating TempMail account (${sessionId})...`);
        
        try {
            await this.page.goto('https://temp-mail.org', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);

            // Get the auto-generated email address
            const emailSelector = '#mail';
            await this.page.waitForSelector(emailSelector);
            const email = await this.page.$eval(emailSelector, el => el.value);

            if (!email) {
                throw new Error('Could not retrieve email address from TempMail');
            }

            // Check if inbox is accessible
            await this.page.waitForSelector('#inbox', { timeout: 5000 });
            
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
            await this.page.goto('https://10minutemail.com', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);

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