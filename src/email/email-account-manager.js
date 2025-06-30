/**
 * Email Account Manager
 * Automated email account creation and verification system
 * Supports multiple email services with verification handling
 */

const { chromium } = require('playwright');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const LLMEmailAnalyzer = require('./llm-email-analyzer');

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
        this.db = null; // Will be initialized in initialize()
        this.verificationQueue = new Set();
        this.llmAnalyzer = new LLMEmailAnalyzer(options);
    }

    
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database('poll-automation.db', (err) => {
                if (err) {
                    this.log('❌ Database connection failed: ' + err.message);
                    reject(err);
                } else {
                    this.log('✅ Database connected for email management');
                    resolve();
                }
            });
        });
    }
    
    async saveEmailToDatabase(emailData) {
        if (!this.db) {
            await this.initializeDatabase();
        }
        
        return new Promise((resolve, reject) => {
            // First check if email already exists
            const checkQuery = `SELECT id FROM email_accounts WHERE email = ?`;
            
            this.db.get(checkQuery, [emailData.email], (err, existingEmail) => {
                if (err) {
                    console.error('❌ Failed to check existing email:', err.message);
                    reject(err);
                    return;
                }
                
                if (existingEmail) {
                    console.log('⚠️ Email already exists in database, skipping:', emailData.email);
                    resolve(existingEmail.id);
                    return;
                }
                
                // Email doesn't exist, proceed with insert
                const insertQuery = `INSERT INTO email_accounts 
                    (email, service, username, password, inbox_url, service_specific_data, is_verified, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                
                this.db.run(insertQuery, [
                    emailData.email,
                    emailData.service || 'tempmail',
                    emailData.username || '',
                    emailData.password || '',
                    emailData.inboxUrl || '',
                    JSON.stringify(emailData.serviceData || {}),
                    emailData.verified ? 1 : 0,
                    1 // is_active
                ], function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            // Race condition - another process inserted the same email
                            console.log('⚠️ Email was inserted by another process, continuing:', emailData.email);
                            // Get the ID of the existing email
                            this.get(checkQuery, [emailData.email], (checkErr, existingEmail) => {
                                if (checkErr) {
                                    reject(checkErr);
                                } else {
                                    resolve(existingEmail ? existingEmail.id : null);
                                }
                            });
                        } else {
                            console.error('❌ Failed to save email to database:', err.message);
                            reject(err);
                        }
                    } else {
                        console.log('✅ Email saved to database:', emailData.email);
                        resolve(this.lastID);
                    }
                }.bind(this.db));
            });
        });
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
     * Handle modal popups and consent dialogs using LLM intelligence
     */
    async handleModalPopups() {
        try {
            // Common modal/popup selectors
            const modalSelectors = [
                '.modal', '.popup', '.overlay', '.dialog', '[role="dialog"]',
                '.consent', '.cookie', '.gdpr', '.privacy',
                '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]',
                '[id*="modal"]', '[id*="popup"]', '[id*="consent"]'
            ];

            // Check for visible modals
            for (const selector of modalSelectors) {
                try {
                    const modal = await this.page.locator(selector).first();
                    if (await modal.isVisible({ timeout: 1000 })) {
                        this.log(`🔍 Found modal: ${selector}`);
                        
                        // Get modal content for LLM analysis
                        const modalText = await modal.textContent();
                        
                        // Common consent/agreement buttons
                        const buttonSelectors = [
                            'button:has-text("Accept")', 'button:has-text("Agree")', 
                            'button:has-text("I Agree")', 'button:has-text("OK")',
                            'button:has-text("Continue")', 'button:has-text("Allow")',
                            'button:has-text("Yes")', 'button:has-text("Consent")',
                            '[class*="accept"]', '[class*="agree"]', '[class*="continue"]',
                            '.btn-primary', '.btn-accept', '.consent-btn'
                        ];
                        
                        // Try to find and click appropriate button
                        for (const btnSelector of buttonSelectors) {
                            try {
                                const button = modal.locator(btnSelector).first();
                                if (await button.isVisible({ timeout: 500 })) {
                                    this.log(`✅ Clicking consent button: ${btnSelector}`);
                                    await button.click();
                                    await this.page.waitForTimeout(1000);
                                    return true;
                                }
                            } catch (e) {
                                // Continue with next selector
                            }
                        }
                        
                        // If no standard button found, try close buttons
                        const closeSelectors = [
                            'button:has-text("×")', 'button:has-text("Close")',
                            '.close', '.dismiss', '[aria-label="Close"]'
                        ];
                        
                        for (const closeSelector of closeSelectors) {
                            try {
                                const closeBtn = modal.locator(closeSelector).first();
                                if (await closeBtn.isVisible({ timeout: 500 })) {
                                    this.log(`🚫 Closing modal: ${closeSelector}`);
                                    await closeBtn.click();
                                    await this.page.waitForTimeout(1000);
                                    return true;
                                }
                            } catch (e) {
                                // Continue
                            }
                        }
                    }
                } catch (e) {
                    // Continue with next modal selector
                }
            }
            
            return false;
        } catch (error) {
            this.log(`⚠️ Modal handling error: ${error.message}`);
            return false;
        }
    }

    /**
     * Create a new email account using the specified service
     */
    async createEmailAccount(service = 'auto', options = {}) {
        const startTime = Date.now();
        const sessionId = crypto.randomBytes(8).toString('hex');
        
        this.log(`📧 Creating new email account (Session: ${sessionId})...`);

        // Add retry logic for network issues and duplicate emails
        let lastError;
        const maxRetries = 5; // Increased retries for duplicate handling
        const triedServices = new Set();
        let currentService = service;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
                
                // Auto-select service using rotation if available
                if (currentService === 'auto') {
                    currentService = this.selectBestServiceWithRotation(options.rotationManager);
                }

                const serviceConfig = this.getServiceConfig(currentService);
                if (!serviceConfig) {
                    throw new Error(`Unsupported email service: ${currentService}`);
                }

                this.log(`🎯 Using service: ${serviceConfig.name} (${serviceConfig.difficulty})`);
                triedServices.add(serviceConfig.name);

                // Execute service-specific creation method
                const result = await this[serviceConfig.method + 'CreateAccount'](sessionId, options);
            
                if (result.success) {
                    // Check if this email already exists in database
                    if (await this.emailExistsInDatabase(result.email)) {
                        this.log(`⚠️ Email ${result.email} already exists, retrying with different service...`);
                        
                        // Try a different service if available
                        const availableServices = this.supportedServices.filter(s => 
                            !triedServices.has(s.name) && s.difficulty !== 'hard'
                        );
                        
                        if (availableServices.length > 0) {
                            currentService = availableServices[0].method;
                            this.log(`🔄 Switching to service: ${availableServices[0].name}`);
                            continue; // Try again with different service
                        } else {
                            this.log(`⚠️ All services tried, accepting duplicate email: ${result.email}`);
                        }
                    }

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
                    
                    // Save to database (now handles duplicates gracefully)
                    try {
                        this.log(`💾 Saving email to database...`);
                        const dbId = await this.saveEmailToDatabase({
                            email: result.email,
                            service: serviceConfig.name,
                            username: result.username || '',
                            password: result.password || '',
                            inboxUrl: result.inbox,
                            serviceData: result.sessionData || {},
                            verified: false
                        });
                        this.log(`✅ Email saved to database successfully (ID: ${dbId})`);
                        account.databaseId = dbId;
                    } catch (error) {
                        this.log(`⚠️ Database save failed: ${error.message}`);
                        // Don't fail the entire operation if database save fails
                        // The email account is still valid for use
                        account.databaseSaveError = error.message;
                    }
                    
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
                    
                    // Try different service on retry based on what we haven't tried
                    const availableServices = this.supportedServices.filter(s => 
                        !triedServices.has(s.name) && s.difficulty !== 'hard'
                    );
                    
                    if (availableServices.length > 0) {
                        currentService = availableServices[0].method;
                        this.log(`🔄 Switching to service: ${availableServices[0].name}`);
                    } else {
                        // Reset to original service if no alternatives available
                        currentService = service === 'auto' ? 'tempmail' : service;
                    }
                }
            }
        }
        
        this.log(`❌ All ${maxRetries} attempts failed`);
        throw lastError;
    }

    /**
     * Check if email already exists in database
     */
    async emailExistsInDatabase(email) {
        if (!this.db) {
            await this.initializeDatabase();
        }
        
        return new Promise((resolve, reject) => {
            const query = `SELECT id FROM email_accounts WHERE email = ?`;
            this.db.get(query, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    }

    /**
     * TempMail account creation
     */
    async tempmailCreateAccount(sessionId, options = {}) {
        this.log(`📨 Creating TempMail account using LLM analysis (${sessionId})...`);
        
        const maxEmailRetries = 3;
        
        for (let emailAttempt = 1; emailAttempt <= maxEmailRetries; emailAttempt++) {
            try {
                this.log(`🌐 Navigating to https://temp-mail.org (attempt ${emailAttempt}/${maxEmailRetries})...`);
                
                // Add random parameter and clear any cached sessions to get fresh email
                const randomParam = Math.random().toString(36).substring(7);
                const timestamp = Date.now();
                const url = `https://temp-mail.org?t=${randomParam}&_=${timestamp}`;
                
                // Clear cookies and local storage to ensure fresh session
                try {
                    await this.page.context().clearCookies();
                    await this.page.evaluate(() => {
                        localStorage.clear();
                        sessionStorage.clear();
                    });
                } catch (e) {
                    this.log(`⚠️ Could not clear session data: ${e.message}`);
                }
                
                const response = await this.page.goto(url, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 60000 
                });
                this.log(`📡 Navigation response: ${response.status()} ${response.statusText()}`);
                
                this.log(`⏳ Waiting for page to stabilize...`);
                await this.page.waitForTimeout(3000 + Math.random() * 2000); // Random delay
                
                // Handle any modal popups or consent dialogs
                this.log(`🔍 Checking for modals on TempMail...`);
                await this.handleModalPopups();
                await this.page.waitForTimeout(2000);
                
                // Use LLM to analyze the page
                this.log(`🧠 Using LLM to analyze TempMail page structure...`);
                const analysis = await this.llmAnalyzer.analyzeEmailPage(this.page, 'TempMail');
                
                this.log(`📊 LLM Analysis Result: ${analysis.retrievalMethod} (confidence: ${analysis.confidence})`);
                this.log(`🎯 Instructions: ${analysis.instructions}`);
                
                // Use LLM analysis to retrieve email
                const result = await this.llmAnalyzer.retrieveEmailUsingAnalysis(this.page, analysis, 'TempMail');
                
                if (!result.success) {
                    throw new Error(`LLM-powered email retrieval failed: ${result.error}`);
                }

                const email = result.email;
                this.log(`✅ LLM successfully retrieved email: ${email}`);

                // Check if this email already exists in our database before continuing
                if (await this.emailExistsInDatabase(email)) {
                    this.log(`⚠️ Email ${email} already exists in database, trying to get a new one...`);
                    
                    if (emailAttempt < maxEmailRetries) {
                        // Refresh the page to get a new email
                        this.log(`🔄 Refreshing page to get a new email...`);
                        continue;
                    } else {
                        this.log(`⚠️ All attempts returned existing emails, proceeding with: ${email}`);
                    }
                }

                // Verify inbox using LLM-suggested selector
                this.log(`🔍 Verifying inbox access with LLM selector...`);
                try {
                    await this.page.waitForSelector(analysis.inboxSelector, { timeout: 5000 });
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
                        inboxSelector: analysis.inboxSelector,
                        llmAnalysis: analysis
                    }
                };

            } catch (error) {
                this.log(`❌ TempMail attempt ${emailAttempt} failed: ${error.message}`);
                
                if (emailAttempt === maxEmailRetries) {
                    this.log(`❌ All TempMail attempts failed`);
                    return {
                        success: false,
                        error: error.message
                    };
                }
                
                // Wait before retry
                await this.page.waitForTimeout(1000 * emailAttempt);
            }
        }
    }

    /**
     * 10MinuteMail account creation
     */
    async tenminuteCreateAccount(sessionId, options = {}) {
        this.log(`📨 Creating 10MinuteMail account (${sessionId})...`);
        
        const maxEmailRetries = 3;
        
        for (let emailAttempt = 1; emailAttempt <= maxEmailRetries; emailAttempt++) {
            try {
                this.log(`🌐 Navigating to 10MinuteMail (attempt ${emailAttempt}/${maxEmailRetries})...`);
                
                // Add random parameter and clear cached sessions to get fresh email
                const randomParam = Math.random().toString(36).substring(7);
                const timestamp = Date.now();
                const url = `https://10minutemail.com?t=${randomParam}&_=${timestamp}`;
                
                // Clear cookies and local storage to ensure fresh session
                try {
                    await this.page.context().clearCookies();
                    await this.page.evaluate(() => {
                        localStorage.clear();
                        sessionStorage.clear();
                    });
                } catch (e) {
                    this.log(`⚠️ Could not clear session data: ${e.message}`);
                }
                
                await this.page.goto(url, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 60000 
                });
                await this.page.waitForTimeout(5000 + Math.random() * 2000); // Random delay

                // Handle any modal popups or consent dialogs
                this.log(`🔍 Checking for modals on 10MinuteMail...`);
                await this.handleModalPopups();
                await this.page.waitForTimeout(3000);

                this.log(`🔍 Current URL: ${this.page.url()}`);
                this.log(`📋 Page title: ${await this.page.title()}`);

                // 10MinuteMail uses different selectors - try these
                const emailSelectors = [
                    '.emailaddressbox input',   // Main email input
                    '#fe_text',                 // Alternative input
                    '.email-address',           // Email display
                    'input[readonly]',          // Readonly email input
                    '.copy-button',             // Copy button area
                    '[data-clipboard-text]'     // Clipboard data attribute
                ];
                
                let email = null;
                
                // Wait for page to fully load
                await this.page.waitForTimeout(5000);
                
                // Try to find email with various selectors
                for (const selector of emailSelectors) {
                    try {
                        this.log(`🔍 Trying selector: ${selector}`);
                        const element = await this.page.$(selector);
                        if (element) {
                            // Try different ways to get the email
                            const value = await element.inputValue().catch(() => null);
                            const text = await element.textContent().catch(() => null);
                            const dataClipboard = await element.getAttribute('data-clipboard-text').catch(() => null);
                            
                            this.log(`📧 Element found - value: "${value}" text: "${text}" clipboard: "${dataClipboard}"`);
                            
                            if (value && value.includes('@')) {
                                email = value;
                                this.log(`✅ Found email via value: ${email}`);
                                break;
                            } else if (text && text.includes('@')) {
                                email = text.trim();
                                this.log(`✅ Found email via text: ${email}`);
                                break;
                            } else if (dataClipboard && dataClipboard.includes('@')) {
                                email = dataClipboard;
                                this.log(`✅ Found email via clipboard: ${email}`);
                                break;
                            }
                        } else {
                            this.log(`❌ Selector not found: ${selector}`);
                        }
                    } catch (e) {
                        this.log(`⚠️ Selector ${selector} failed: ${e.message}`);
                        continue;
                    }
                }

                // If no email found, dump page content for debugging
                if (!email) {
                    this.log(`🔍 No email found, dumping page content for analysis...`);
                    const bodyText = await this.page.$eval('body', el => el.textContent).catch(() => 'No body text');
                    this.log(`📄 Page text: ${bodyText.substring(0, 200)}...`);
                    
                    const bodyHTML = await this.page.$eval('body', el => el.innerHTML).catch(() => 'No body HTML');
                    this.log(`📄 Page HTML: ${bodyHTML.substring(0, 300)}...`);
                    
                    throw new Error('Could not retrieve email address from 10MinuteMail - see debug output above');
                }

                // Check if this email already exists in our database before continuing
                if (await this.emailExistsInDatabase(email)) {
                    this.log(`⚠️ Email ${email} already exists in database, trying to get a new one...`);
                    
                    if (emailAttempt < maxEmailRetries) {
                        // Refresh the page to get a new email
                        this.log(`🔄 Refreshing page to get a new email...`);
                        continue;
                    } else {
                        this.log(`⚠️ All attempts returned existing emails, proceeding with: ${email}`);
                    }
                }

                // Verify inbox is working
                this.log(`🔍 Verifying inbox access...`);
                try {
                    const inboxSelector = '.messages, .mail-list, .inbox, #inboxTable';
                    await this.page.waitForSelector(inboxSelector, { timeout: 5000 });
                    this.log(`✅ Inbox verified`);
                } catch (e) {
                    this.log(`⚠️ Inbox verification failed: ${e.message}`);
                }
                
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
                this.log(`❌ 10MinuteMail attempt ${emailAttempt} failed: ${error.message}`);
                
                if (emailAttempt === maxEmailRetries) {
                    this.log(`❌ All 10MinuteMail attempts failed`);
                    return {
                        success: false,
                        error: error.message
                    };
                }
                
                // Wait before retry
                await this.page.waitForTimeout(1000 * emailAttempt);
            }
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
        // Prioritize TempMail as it's been most reliable, then others
        const preferredOrder = ['tempmail', 'guerrilla', 'tenminute'];
        
        for (const serviceMethod of preferredOrder) {
            const service = this.supportedServices.find(s => s.method === serviceMethod);
            if (service && service.difficulty !== 'hard') {
                return serviceMethod;
            }
        }
        
        // Fallback to any easy service
        const easyServices = this.supportedServices.filter(s => s.difficulty === 'easy');
        if (easyServices.length > 0) {
            return easyServices[Math.floor(Math.random() * easyServices.length)].method;
        }
        
        return this.supportedServices[0].method;
    }

    /**
     * Select best service with rotation support
     */
    selectBestServiceWithRotation(rotationManager) {
        if (rotationManager) {
            const selectedService = rotationManager.getNextEmailService();
            if (selectedService) {
                this.log(`🔄 Using rotated email service: ${selectedService.name}`);
                return selectedService.method;
            }
        }
        
        // Fallback to traditional selection
        return this.selectBestService();
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