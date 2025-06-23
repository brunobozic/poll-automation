/**
 * Poll Automation Application
 * Main orchestrator that coordinates all workflows for survey registration automation
 */

const EmailAccountManager = require('./email/email-account-manager');
const RegistrationLogger = require('./database/registration-logger');
const DemographicOptimizer = require('./ai/demographic-optimizer');
const DefenseDetector = require('./security/defense-detector');
const { chromium } = require('playwright');
const readline = require('readline');

class PollAutomationApp {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false,
            debugMode: options.debugMode || false,
            timeout: options.timeout || 30000,
            maxEmails: options.maxEmails || 10,
            maxSitesPerEmail: options.maxSitesPerEmail || 5,
            dbPath: options.dbPath || './data/poll-automation.db',
            ...options
        };
        
        this.emailManager = null;
        this.logger = null;
        this.optimizer = null;
        this.defenseDetector = null;
        this.browser = null;
        this.isInitialized = false;
        
        this.stats = {
            emailsCreated: 0,
            sitesAttempted: 0,
            successfulRegistrations: 0,
            failedRegistrations: 0,
            defensesDetected: 0
        };
    }
    
    /**
     * Initialize all systems
     */
    async initialize() {
        console.log('🚀 POLL AUTOMATION APPLICATION');
        console.log('==============================');
        console.log('🔄 Initializing all systems...\n');
        
        try {
            // Initialize logger
            this.logger = new RegistrationLogger(this.options.dbPath);
            await this.logger.initialize();
            
            // Initialize email manager
            this.emailManager = new EmailAccountManager({
                headless: this.options.headless,
                debugMode: this.options.debugMode,
                timeout: this.options.timeout
            });
            await this.emailManager.initialize();
            
            // Initialize AI optimizer
            this.optimizer = new DemographicOptimizer();
            
            // Initialize defense detector
            this.defenseDetector = new DefenseDetector();
            
            // Initialize browser
            this.browser = await chromium.launch({
                headless: this.options.headless,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            
            this.isInitialized = true;
            console.log('✅ All systems initialized successfully\n');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Create email account with AI-optimized profile
     */
    async createEmailAccount(service = 'guerrilla') {
        if (!this.isInitialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        
        console.log('📧 Creating email account...');
        
        // Create email account
        const emailAccount = await this.emailManager.createEmailAccount(service);
        if (!emailAccount || !emailAccount.email) {
            throw new Error('Failed to create email account');
        }
        
        // Generate AI-optimized profile
        const profile = this.optimizer.generateOptimalProfile();
        profile.email = emailAccount.email;
        
        // Log email to database
        const emailId = await this.logger.logEmailAccount({
            email: emailAccount.email,
            service: emailAccount.service,
            password: emailAccount.password,
            sessionId: `app-${Date.now()}`,
            status: 'active',
            metadata: {
                aiOptimized: true,
                profile: profile,
                createdBy: 'PollAutomationApp'
            }
        });
        
        this.stats.emailsCreated++;
        
        console.log(`✅ Email created: ${emailAccount.email}`);
        console.log(`🤖 AI Profile: ${profile.profileName} (Yield: ${(profile.yieldPrediction * 100).toFixed(1)}%)`);
        
        return {
            emailAccount,
            profile,
            emailId
        };
    }
    
    /**
     * Attempt registration on a survey site
     */
    async attemptSiteRegistration(emailData, siteConfig) {
        const { emailAccount, profile, emailId } = emailData;
        const { name, url, category = 'survey' } = siteConfig;
        
        console.log(`\n🎯 Attempting registration: ${name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Email: ${emailAccount.email}`);
        
        const page = await this.browser.newPage();
        
        try {
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            });
            
            // Log site
            const siteId = await this.logger.logSurveysite({
                siteName: name,
                baseUrl: url,
                registrationUrl: url,
                siteCategory: category,
                notes: `Attempted by ${emailAccount.email}`
            });
            
            // Start registration attempt
            const registrationId = await this.logger.startRegistrationAttempt({
                sessionId: `app-reg-${Date.now()}`,
                emailId: emailId,
                targetSite: name,
                targetUrl: url,
                currentStep: 'navigation',
                totalSteps: 6,
                userAgent: await page.evaluate(() => navigator.userAgent),
                ipAddress: '127.0.0.1'
            });
            
            // Navigate to site
            await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: this.options.timeout 
            });
            
            console.log('   ✅ Navigation successful');
            
            // Detect defenses
            const defenses = await this.defenseDetector.detectDefenses(page, url);
            console.log(`   🛡️ Detected ${defenses.length} defenses`);
            
            // Log defenses
            for (const defense of defenses) {
                await this.logger.logSiteDefense({
                    siteId: siteId,
                    registrationId: registrationId,
                    defenseType: defense.defenseType,
                    defenseSubtype: defense.defenseSubtype,
                    severityLevel: defense.severityLevel,
                    description: defense.description,
                    detectionDetails: defense.detectionDetails,
                    bypassAttempted: false,
                    bypassSuccessful: false
                });
                
                console.log(`      🛡️ ${defense.defenseType} (Severity: ${defense.severityLevel})`);
            }
            
            this.stats.defensesDetected += defenses.length;
            
            // Analyze page for registration form
            const formAnalysis = await this.analyzeRegistrationForm(page);
            
            let success = false;
            let errorMessage = null;
            
            if (formAnalysis.isValidRegistrationPage) {
                console.log('   ✅ Valid registration form detected');
                
                // Log user profile
                await this.logger.logUserProfile({
                    registrationId: registrationId,
                    emailId: emailId,
                    profileName: profile.profileName,
                    age: profile.age,
                    gender: profile.gender,
                    incomeBracket: profile.incomeBracket,
                    educationLevel: profile.educationLevel,
                    occupation: profile.occupation,
                    locationCity: profile.locationCity,
                    locationState: profile.locationState,
                    locationCountry: profile.locationCountry,
                    maritalStatus: profile.maritalStatus,
                    householdSize: profile.householdSize,
                    interests: profile.interests,
                    aiOptimizationScore: profile.aiOptimizationScore,
                    yieldPrediction: profile.yieldPrediction,
                    demographicBalanceScore: profile.demographicBalanceScore
                });
                
                // Attempt to fill form
                const fillResult = await this.fillRegistrationForm(page, profile, registrationId, siteId);
                
                // Check for blocking defenses
                const blockingDefenses = defenses.filter(d => d.severityLevel >= 7);
                
                if (blockingDefenses.length > 0) {
                    success = false;
                    errorMessage = `Blocked by ${blockingDefenses[0].defenseType}: ${blockingDefenses[0].description}`;
                } else if (fillResult.fieldsNfilled >= 3) {
                    // Only actually submit on safe/test sites
                    if (url.includes('localhost') || url.includes('httpbin') || url.includes('test')) {
                        success = await this.submitRegistrationForm(page);
                        if (!success) {
                            errorMessage = 'Form submission failed or was rejected';
                        }
                    } else {
                        success = false;
                        errorMessage = 'Form ready but not submitted (avoiding spam on real sites)';
                    }
                } else {
                    success = false;
                    errorMessage = `Insufficient form fields filled (${fillResult.fieldsNfilled}/3 minimum)`;
                }
                
            } else {
                errorMessage = formAnalysis.reason || 'Not a valid registration page';
            }
            
            // Update registration status
            await this.logger.updateRegistrationAttempt(registrationId, {
                status: success ? 'completed' : 'failed',
                success: success ? 1 : 0,
                completed_at: new Date().toISOString(),
                current_step: success ? 'completed' : 'failed',
                error_message: errorMessage
            });
            
            // Update site stats
            await this.logger.updateSiteStats(
                siteId,
                success,
                success ? formAnalysis.questionCount : 0,
                this.defenseDetector.calculateSiteDifficulty(defenses),
                success ? profile.yieldPrediction : 0
            );
            
            if (success) {
                this.stats.successfulRegistrations++;
                console.log('   ✅ Registration successful!');
            } else {
                this.stats.failedRegistrations++;
                console.log(`   ❌ Registration failed: ${errorMessage}`);
            }
            
            this.stats.sitesAttempted++;
            
            return {
                success,
                errorMessage,
                defenses: defenses.length,
                registrationId,
                siteId
            };
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            this.stats.failedRegistrations++;
            this.stats.sitesAttempted++;
            
            return {
                success: false,
                errorMessage: error.message,
                defenses: 0
            };
            
        } finally {
            await page.close();
        }
    }
    
    /**
     * Analyze page for registration form
     */
    async analyzeRegistrationForm(page) {
        return await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], select, textarea');
            const buttons = document.querySelectorAll('button, input[type="submit"]');
            
            const visibleInputs = Array.from(inputs).filter(inp => inp.offsetParent !== null);
            const pageText = document.body.textContent.toLowerCase();
            
            const hasEmailField = visibleInputs.some(inp => 
                inp.type === 'email' || 
                inp.name?.toLowerCase().includes('email') ||
                inp.id?.toLowerCase().includes('email')
            );
            
            const hasRegistrationIndicators = 
                pageText.includes('register') || 
                pageText.includes('sign up') || 
                pageText.includes('create account') ||
                pageText.includes('join');
            
            const isValidRegistrationPage = 
                forms.length > 0 && 
                visibleInputs.length >= 2 && 
                hasEmailField && 
                hasRegistrationIndicators;
            
            let reason = null;
            if (!forms.length) reason = 'No forms found';
            else if (visibleInputs.length < 2) reason = 'Insufficient input fields';
            else if (!hasEmailField) reason = 'No email field detected';
            else if (!hasRegistrationIndicators) reason = 'No registration indicators found';
            
            return {
                isValidRegistrationPage,
                reason,
                formsCount: forms.length,
                inputsCount: visibleInputs.length,
                hasEmailField,
                hasRegistrationIndicators,
                questionCount: visibleInputs.length,
                title: document.title
            };
        });
    }
    
    /**
     * Fill registration form with AI-generated data
     */
    async fillRegistrationForm(page, profile, registrationId, siteId) {
        const commonFields = [
            { selectors: ['input[type="email"]', 'input[name*="email" i]'], value: profile.email, name: 'email', category: 'contact' },
            { selectors: ['input[name*="first" i]', 'input[name*="fname" i]'], value: profile.firstName, name: 'firstName', category: 'personal_info' },
            { selectors: ['input[name*="last" i]', 'input[name*="lname" i]'], value: profile.lastName, name: 'lastName', category: 'personal_info' },
            { selectors: ['input[name*="age" i]', 'select[name*="age" i]'], value: profile.age.toString(), name: 'age', category: 'demographics' },
            { selectors: ['select[name*="gender" i]'], value: profile.gender, name: 'gender', category: 'demographics' },
            { selectors: ['input[name*="zip" i]', 'input[name*="postal" i]'], value: '10001', name: 'zipCode', category: 'location' },
            { selectors: ['input[type="password"]'], value: 'SecurePass123!', name: 'password', category: 'authentication' }
        ];
        
        let fieldsNfilled = 0;
        
        for (const field of commonFields) {
            for (const selector of field.selectors) {
                try {
                    const element = await page.$(selector);
                    if (element && await element.isVisible()) {
                        await element.fill(field.value);
                        await page.waitForTimeout(200 + Math.random() * 300);
                        fieldsNfilled++;
                        
                        console.log(`      ✅ Filled ${field.name}: ${field.value}`);
                        
                        // Log question and answer
                        await this.logger.logSiteQuestion(siteId, {
                            questionText: `What is your ${field.name}?`,
                            questionType: selector.includes('select') ? 'select' : 'text',
                            fieldName: field.name,
                            demographicCategory: field.category,
                            isRequired: ['email', 'password'].includes(field.name),
                            hasOptions: selector.includes('select'),
                            questionOptions: [],
                            yieldImportance: field.category === 'demographics' ? 0.9 : 0.7
                        });
                        
                        await this.logger.logRegistrationQuestion({
                            registrationId: registrationId,
                            questionText: `What is your ${field.name}?`,
                            questionType: selector.includes('select') ? 'select' : 'text',
                            fieldName: field.name,
                            fieldSelector: selector,
                            answerProvided: field.value,
                            aiGenerated: true,
                            aiReasoning: `AI-optimized ${field.name} for survey targeting`,
                            demographicCategory: field.category,
                            yieldOptimizationFactor: field.category === 'demographics' ? 0.9 : 0.7
                        });
                        
                        break; // Found and filled, move to next field
                    }
                } catch (error) {
                    // Continue trying other selectors
                    continue;
                }
            }
        }
        
        // Handle checkboxes (terms, newsletter, etc.)
        const checkboxSelectors = [
            'input[type="checkbox"][name*="terms" i]',
            'input[type="checkbox"][name*="agree" i]',
            'input[type="checkbox"][name*="accept" i]'
        ];
        
        for (const selector of checkboxSelectors) {
            try {
                const checkbox = await page.$(selector);
                if (checkbox && await checkbox.isVisible()) {
                    await checkbox.check();
                    fieldsNfilled++;
                    console.log(`      ✅ Checked agreement checkbox`);
                }
            } catch (error) {
                continue;
            }
        }
        
        console.log(`   📊 Form filling complete: ${fieldsNfilled} fields filled`);
        
        return { fieldsNfilled };
    }
    
    /**
     * Submit registration form
     */
    async submitRegistrationForm(page) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Join")',
            'button:has-text("Create")'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    console.log(`   🚀 Submitting form...`);
                    await button.click();
                    await page.waitForTimeout(3000);
                    
                    // Check for success indicators
                    const content = await page.content();
                    const success = content.includes('success') || 
                                   content.includes('welcome') || 
                                   content.includes('verify') ||
                                   content.includes('confirmation');
                    
                    return success;
                }
            } catch (error) {
                continue;
            }
        }
        
        return false;
    }
    
    /**
     * Run automated registration campaign
     */
    async runCampaign(sites, emailCount = 1) {
        console.log(`\n🚀 STARTING REGISTRATION CAMPAIGN`);
        console.log(`📧 Emails to create: ${emailCount}`);
        console.log(`🎯 Sites to attempt: ${sites.length}`);
        console.log('=' .repeat(50));
        
        const results = [];
        
        for (let i = 0; i < emailCount; i++) {
            console.log(`\n📧 EMAIL ${i + 1}/${emailCount}`);
            console.log('-'.repeat(30));
            
            try {
                // Create email account
                const emailData = await this.createEmailAccount();
                
                const emailResults = {
                    email: emailData.emailAccount.email,
                    profile: emailData.profile.profileName,
                    sites: []
                };
                
                // Attempt registration on each site
                for (const site of sites) {
                    const result = await this.attemptSiteRegistration(emailData, site);
                    emailResults.sites.push({
                        name: site.name,
                        success: result.success,
                        error: result.errorMessage,
                        defenses: result.defenses
                    });
                    
                    // Wait between attempts
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                results.push(emailResults);
                
            } catch (error) {
                console.error(`❌ Email ${i + 1} failed: ${error.message}`);
            }
        }
        
        // Display campaign summary
        this.displayCampaignSummary(results);
        
        return results;
    }
    
    /**
     * Display campaign summary
     */
    displayCampaignSummary(results) {
        console.log('\n📊 CAMPAIGN SUMMARY');
        console.log('=' .repeat(50));
        console.log(`📧 Emails created: ${this.stats.emailsCreated}`);
        console.log(`🎯 Sites attempted: ${this.stats.sitesAttempted}`);
        console.log(`✅ Successful registrations: ${this.stats.successfulRegistrations}`);
        console.log(`❌ Failed registrations: ${this.stats.failedRegistrations}`);
        console.log(`🛡️ Defenses detected: ${this.stats.defensesDetected}`);
        
        const successRate = this.stats.sitesAttempted > 0 ? 
            (this.stats.successfulRegistrations / this.stats.sitesAttempted * 100).toFixed(1) : 0;
        console.log(`📈 Success rate: ${successRate}%`);
        
        console.log('\n📋 DETAILED RESULTS:');
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.email} (${result.profile})`);
            result.sites.forEach(site => {
                const status = site.success ? '✅' : '❌';
                console.log(`   ${status} ${site.name} - ${site.success ? 'Success' : site.error}`);
                if (site.defenses > 0) {
                    console.log(`      🛡️ ${site.defenses} defenses detected`);
                }
            });
        });
    }
    
    /**
     * Query correlation data
     */
    async queryData(queryType, parameter) {
        console.log(`\n📊 EXECUTING QUERY: ${queryType}`);
        console.log('-'.repeat(30));
        
        const result = await this.logger.executeCorrelationQuery(queryType, parameter);
        
        switch (queryType) {
            case 'email_failures':
                console.log(`Failed registrations for ${parameter}:`);
                result.forEach((failure, index) => {
                    console.log(`${index + 1}. ${failure.target_site} - ${failure.error_message}`);
                    console.log(`   Defenses: ${failure.failure_reasons || 'None'}`);
                });
                break;
                
            case 'email_successes':
                console.log(`Successful registrations for ${parameter}:`);
                result.forEach((success, index) => {
                    console.log(`${index + 1}. ${success.target_site} (${success.questions_answered} questions)`);
                    console.log(`   Profile: ${success.profile_name}, Yield: ${success.yield_prediction ? (success.yield_prediction * 100).toFixed(1) + '%' : 'N/A'}`);
                });
                break;
                
            case 'site_emails':
                console.log(`Successfully registered emails for ${parameter}:`);
                result.forEach((registration, index) => {
                    console.log(`${index + 1}. ${registration.email} - ${registration.profile_name}`);
                    console.log(`   Demographics: ${registration.age}yo ${registration.gender}, ${registration.occupation}`);
                });
                break;
        }
        
        return result;
    }
    
    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        console.log('\n🧹 Shutting down application...');
        
        try {
            if (this.browser) await this.browser.close();
            if (this.emailManager) await this.emailManager.cleanup();
            if (this.logger) await this.logger.close();
            
            console.log('✅ Application shutdown complete');
        } catch (error) {
            console.error('⚠️ Shutdown error:', error.message);
        }
    }
}

module.exports = PollAutomationApp;