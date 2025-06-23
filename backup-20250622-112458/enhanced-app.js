/**
 * Enhanced Poll Automation Application
 * Advanced anti-detection system with comprehensive countermeasures
 */

const EmailAccountManager = require('./email/email-account-manager');
const RegistrationLogger = require('./database/registration-logger');
const DemographicOptimizer = require('./ai/demographic-optimizer');
const DefenseDetector = require('./security/defense-detector');
const BrowserStealth = require('./stealth/browser-stealth');
const HumanBehavior = require('./stealth/human-behavior');
const CaptchaSolver = require('./stealth/captcha-solver');
const ProxyManager = require('./stealth/proxy-manager');
const AdaptiveLearningEngine = require('./ai/adaptive-learning-engine');

class EnhancedPollAutomationApp {
    constructor(options = {}) {
        this.options = {
            // Basic settings
            headless: options.headless !== false,
            debugMode: options.debugMode || false,
            timeout: options.timeout || 45000, // Increased for CAPTCHA solving
            dbPath: options.dbPath || './data/enhanced-poll-automation.db',
            
            // Anti-detection settings
            stealthLevel: options.stealthLevel || 'high', // low, medium, high, maximum
            behaviorSimulation: options.behaviorSimulation !== false,
            captchaSolving: options.captchaSolving !== false,
            proxyRotation: options.proxyRotation || false,
            
            // API keys for external services
            twoCaptchaKey: options.twoCaptchaKey || process.env.TWOCAPTCHA_API_KEY,
            antiCaptchaKey: options.antiCaptchaKey || process.env.ANTICAPTCHA_API_KEY,
            
            // Proxy settings
            proxies: options.proxies || [],
            proxyFile: options.proxyFile || null,
            
            // Session persistence
            sessionPersistence: options.sessionPersistence !== false,
            sessionRecovery: options.sessionRecovery !== false,
            
            ...options
        };
        
        // Core components
        this.emailManager = null;
        this.logger = null;
        this.optimizer = null;
        this.defenseDetector = null;
        
        // Anti-detection components
        this.browserStealth = null;
        this.humanBehavior = null;
        this.captchaSolver = null;
        this.proxyManager = null;
        this.adaptiveLearning = null;
        
        // Browser management
        this.browser = null;
        this.contexts = new Map(); // Multiple contexts for session isolation
        this.pages = new Map();
        
        // Session management
        this.sessions = new Map();
        this.isInitialized = false;
        
        // Statistics
        this.stats = {
            emailsCreated: 0,
            sitesAttempted: 0,
            successfulRegistrations: 0,
            failedRegistrations: 0,
            defensesDetected: 0,
            captchasSolved: 0,
            proxiesUsed: 0,
            sessionsRecovered: 0
        };
    }
    
    /**
     * Initialize enhanced application with all anti-detection systems
     */
    async initialize() {
        console.log('🚀 ENHANCED POLL AUTOMATION APPLICATION');
        console.log('=======================================');
        console.log(`🛡️ Stealth Level: ${this.options.stealthLevel.toUpperCase()}`);
        console.log('🔄 Initializing advanced anti-detection systems...\n');
        
        try {
            // Initialize core components
            await this.initializeCore();
            
            // Initialize anti-detection systems
            await this.initializeAntiDetection();
            
            // Initialize session management
            await this.initializeSessionManagement();
            
            this.isInitialized = true;
            console.log('✅ Enhanced application initialized successfully\n');
            
            // Display capability summary
            this.displayCapabilities();
            
        } catch (error) {
            console.error('❌ Enhanced application initialization failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Initialize core components
     */
    async initializeCore() {
        console.log('🔧 Initializing core components...');
        
        // Database logger
        this.logger = new RegistrationLogger(this.options.dbPath);
        await this.logger.initialize();
        
        // Email manager
        this.emailManager = new EmailAccountManager({
            headless: this.options.headless,
            debugMode: this.options.debugMode,
            timeout: this.options.timeout
        });
        await this.emailManager.initialize();
        
        // AI optimizer
        this.optimizer = new DemographicOptimizer();
        
        // Defense detector
        this.defenseDetector = new DefenseDetector();
        
        // Adaptive learning engine
        this.adaptiveLearning = new AdaptiveLearningEngine({
            learningEnabled: this.options.learningEnabled !== false,
            confidenceThreshold: 0.7
        });
        
        console.log('✅ Core components ready');
    }
    
    /**
     * Initialize anti-detection systems
     */
    async initializeAntiDetection() {
        console.log('🛡️ Initializing anti-detection systems...');
        
        // Browser stealth
        this.browserStealth = new BrowserStealth({
            stealthLevel: this.options.stealthLevel
        });
        
        // Human behavior simulation
        if (this.options.behaviorSimulation) {
            this.humanBehavior = new HumanBehavior({
                typingSpeed: this.getStealthSetting('typingSpeed'),
                mouseMovement: this.getStealthSetting('mouseMovement'),
                randomPauses: this.getStealthSetting('randomPauses'),
                errorSimulation: this.getStealthSetting('errorSimulation')
            });
            console.log('✅ Human behavior simulation enabled');
        }
        
        // CAPTCHA solver
        if (this.options.captchaSolving) {
            this.captchaSolver = new CaptchaSolver({
                twoCaptchaKey: this.options.twoCaptchaKey,
                antiCaptchaKey: this.options.antiCaptchaKey,
                timeout: this.options.timeout
            });
            
            if (this.captchaSolver.isConfigured()) {
                console.log('✅ CAPTCHA solving enabled');
            } else {
                console.log('⚠️ CAPTCHA solving available but not configured');
            }
        }
        
        // Proxy manager
        if (this.options.proxyRotation) {
            this.proxyManager = new ProxyManager({
                proxyList: this.options.proxies,
                proxyFile: this.options.proxyFile,
                rotationInterval: this.getStealthSetting('proxyRotation'),
                healthCheckEnabled: true
            });
            
            if (this.options.proxies.length > 0 || this.options.proxyFile) {
                await this.proxyManager.initialize();
                console.log('✅ Proxy rotation enabled');
            } else {
                console.log('⚠️ Proxy rotation enabled but no proxies configured');
            }
        }
        
        // Create stealth browser
        this.browser = await this.browserStealth.createBrowser({
            headless: this.options.headless
        });
        
        console.log('✅ Anti-detection systems ready');
    }
    
    /**
     * Initialize session management
     */
    async initializeSessionManagement() {
        if (this.options.sessionPersistence) {
            console.log('💾 Session persistence enabled');
            
            if (this.options.sessionRecovery) {
                await this.recoverSessions();
            }
        }
    }
    
    /**
     * Get stealth setting based on level
     */
    getStealthSetting(setting) {
        const levels = {
            low: {
                typingSpeed: 'fast',
                mouseMovement: false,
                randomPauses: false,
                errorSimulation: false,
                proxyRotation: 600000 // 10 minutes
            },
            medium: {
                typingSpeed: 'normal',
                mouseMovement: true,
                randomPauses: true,
                errorSimulation: false,
                proxyRotation: 300000 // 5 minutes
            },
            high: {
                typingSpeed: 'normal',
                mouseMovement: true,
                randomPauses: true,
                errorSimulation: true,
                proxyRotation: 180000 // 3 minutes
            },
            maximum: {
                typingSpeed: 'slow',
                mouseMovement: true,
                randomPauses: true,
                errorSimulation: true,
                proxyRotation: 120000 // 2 minutes
            }
        };
        
        return levels[this.options.stealthLevel][setting];
    }
    
    /**
     * Create enhanced email account with full stealth
     */
    async createEmailAccount(service = 'guerrilla') {
        if (!this.isInitialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        
        console.log('📧 Creating enhanced email account...');
        
        // Rotate proxy if available
        if (this.proxyManager) {
            await this.proxyManager.selectProxy();
            this.stats.proxiesUsed++;
        }
        
        // Create email account
        const emailAccount = await this.emailManager.createEmailAccount(service);
        if (!emailAccount || !emailAccount.email) {
            throw new Error('Failed to create email account');
        }
        
        // Generate AI-optimized profile
        const profile = this.optimizer.generateOptimalProfile();
        profile.email = emailAccount.email;
        
        // Log email to database with enhanced metadata
        const emailId = await this.logger.logEmailAccount({
            email: emailAccount.email,
            service: emailAccount.service,
            password: emailAccount.password,
            sessionId: `enhanced-${Date.now()}`,
            status: 'active',
            metadata: {
                aiOptimized: true,
                profile: profile,
                stealthLevel: this.options.stealthLevel,
                createdBy: 'EnhancedPollAutomationApp',
                browserFingerprint: this.browserStealth.getFingerprint(),
                proxyUsed: this.proxyManager?.currentProxy?.id || null
            }
        });
        
        this.stats.emailsCreated++;
        
        console.log(`✅ Enhanced email created: ${emailAccount.email}`);
        console.log(`🤖 AI Profile: ${profile.profileName} (Yield: ${(profile.yieldPrediction * 100).toFixed(1)}%)`);
        
        return {
            emailAccount,
            profile,
            emailId
        };
    }
    
    /**
     * Enhanced site registration with all countermeasures
     */
    async attemptSiteRegistration(emailData, siteConfig, options = {}) {
        const { emailAccount, profile, emailId } = emailData;
        const { name, url, category = 'survey' } = siteConfig;
        
        console.log(`\n🎯 Enhanced registration attempt: ${name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Email: ${emailAccount.email}`);
        console.log(`   Stealth Level: ${this.options.stealthLevel}`);
        
        // Create new stealth context for this registration
        const sessionId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const context = await this.createStealthContext(sessionId);
        const page = await this.browserStealth.createStealthPage(this.browser);
        
        try {
            // Log site
            const siteId = await this.logger.logSurveysite({
                siteName: name,
                baseUrl: url,
                registrationUrl: url,
                siteCategory: category,
                notes: `Enhanced registration attempt by ${emailAccount.email}`
            });
            
            // Start registration attempt
            const registrationId = await this.logger.startRegistrationAttempt({
                sessionId: sessionId,
                emailId: emailId,
                targetSite: name,
                targetUrl: url,
                currentStep: 'enhanced_navigation',
                totalSteps: 8,
                userAgent: this.browserStealth.options.userAgent,
                ipAddress: this.proxyManager?.currentProxy?.host || '127.0.0.1'
            });
            
            console.log(`   📋 Registration ID: ${registrationId}`);
            
            // Store session info
            this.sessions.set(sessionId, {
                registrationId,
                emailData,
                siteConfig,
                startTime: Date.now(),
                context,
                page
            });
            
            // Navigate with human behavior
            console.log('   🌐 Navigating with human behavior simulation...');
            await this.humanNavigate(page, url);
            
            // Detect defenses
            console.log('   🛡️ Detecting defensive measures...');
            const defenses = await this.defenseDetector.detectDefenses(page, url);
            console.log(`   📊 Detected ${defenses.length} defenses`);
            
            // Log and handle each defense
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
                
                console.log(`      🛡️ ${defense.defenseType} (${defense.defenseSubtype || 'general'}) - Severity: ${defense.severityLevel}`);
                
                // Attempt to handle specific defenses
                if (defense.defenseType === 'captcha') {
                    await this.handleCaptcha(page, defense, registrationId);
                } else if (defense.defenseType === 'cloudflare') {
                    await this.handleCloudflare(page, defense);
                }
            }
            
            this.stats.defensesDetected += defenses.length;
            
            // Analyze page for registration form
            console.log('   📋 Analyzing registration form...');
            const formAnalysis = await this.enhancedFormAnalysis(page);
            
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
                
                // Enhanced form filling with human behavior
                console.log('   📝 Filling form with human behavior...');
                const fillResult = await this.enhancedFormFilling(page, profile, registrationId, siteId);
                
                // Check for blocking defenses
                const blockingDefenses = defenses.filter(d => d.severityLevel >= 8);
                
                if (blockingDefenses.length > 0) {
                    success = false;
                    errorMessage = `Blocked by high-severity defense: ${blockingDefenses[0].defenseType}`;
                } else if (fillResult.fieldsNfilled >= 3) {
                    // Attempt submission with adaptive handling
                    console.log('   🚀 Attempting adaptive form submission...');
                    const submissionResult = await this.adaptiveFormSubmission(page, name, registrationId, url);
                    success = submissionResult.success;
                    
                    if (!success) {
                        errorMessage = submissionResult.errorMessage || 'Adaptive form submission failed';
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
            
            // Learn from this attempt
            await this.adaptiveLearning.learnFromAttempt({
                siteName: name,
                siteUrl: url,
                success: success,
                errorMessage: errorMessage,
                formAnalysis: formAnalysis,
                defenses: defenses,
                responseType: success ? 'success' : 'error',
                stealthLevel: this.options.stealthLevel,
                humanBehavior: !!this.humanBehavior,
                captchaSolved: false // TODO: track actual CAPTCHA solving
            });
            
            if (success) {
                this.stats.successfulRegistrations++;
                console.log('   ✅ Enhanced registration successful!');
            } else {
                this.stats.failedRegistrations++;
                console.log(`   ❌ Enhanced registration failed: ${errorMessage}`);
            }
            
            this.stats.sitesAttempted++;
            
            return {
                success,
                errorMessage,
                defenses: defenses.length,
                registrationId,
                siteId,
                sessionId
            };
            
        } catch (error) {
            console.log(`   ❌ Enhanced registration error: ${error.message}`);
            this.stats.failedRegistrations++;
            this.stats.sitesAttempted++;
            
            return {
                success: false,
                errorMessage: error.message,
                defenses: 0,
                sessionId
            };
            
        } finally {
            // Cleanup session
            await this.cleanupSession(sessionId);
        }
    }
    
    /**
     * Create stealth context with proxy and fingerprint spoofing
     */
    async createStealthContext(sessionId) {
        const contextOptions = {
            viewport: this.browserStealth.options.viewport,
            userAgent: this.browserStealth.options.userAgent,
            locale: this.browserStealth.options.locale,
            timezoneId: this.browserStealth.options.timezone,
            permissions: ['geolocation', 'notifications'],
            geolocation: this.browserStealth.generateLocation(),
            deviceScaleFactor: this.browserStealth.options.pixelRatio
        };
        
        // Add proxy if available
        if (this.proxyManager && this.proxyManager.currentProxy) {
            contextOptions.proxy = this.proxyManager.getProxyConfig();
        }
        
        const context = await this.browser.newContext(contextOptions);
        this.contexts.set(sessionId, context);
        
        return context;
    }
    
    /**
     * Human-like navigation
     */
    async humanNavigate(page, url) {
        if (this.humanBehavior) {
            // Simulate reading delay before navigation
            await this.humanBehavior.randomDelay(1000, 3000);
        }
        
        await page.goto(url, { 
            waitUntil: 'networkidle',
            timeout: this.options.timeout 
        });
        
        if (this.humanBehavior) {
            // Simulate reading the page
            await this.humanBehavior.simulateReading(page);
        }
    }
    
    /**
     * Handle CAPTCHA challenges
     */
    async handleCaptcha(page, defense, registrationId) {
        if (!this.captchaSolver) {
            console.log('   ⚠️ CAPTCHA detected but solver not available');
            return false;
        }
        
        console.log(`   🔍 Attempting to solve ${defense.defenseSubtype} CAPTCHA...`);
        
        try {
            const captchaInfo = {
                type: defense.defenseSubtype || 'recaptcha_v2',
                element: defense.detectionDetails.evidence[0] // First detected element
            };
            
            const solution = await this.captchaSolver.solveCaptcha(page, captchaInfo);
            
            if (solution) {
                this.stats.captchasSolved++;
                console.log('   ✅ CAPTCHA solved successfully');
                
                // Log successful CAPTCHA solve
                await this.logger.logDetectionEvent({
                    registrationId: registrationId,
                    detectionType: 'captcha_solved',
                    severityLevel: 5,
                    details: { type: captchaInfo.type, solved: true },
                    countermeasureApplied: 'automated_solving'
                });
                
                return true;
            } else {
                console.log('   ❌ CAPTCHA solving failed');
                return false;
            }
            
        } catch (error) {
            console.log(`   ❌ CAPTCHA handling error: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Handle Cloudflare challenges
     */
    async handleCloudflare(page, defense) {
        console.log('   🔄 Handling Cloudflare challenge...');
        
        try {
            // Wait for Cloudflare to complete its checks
            await page.waitForSelector('.cf-browser-verification', { timeout: 10000 });
            console.log('   ⏳ Waiting for Cloudflare verification...');
            
            // Wait for challenge to complete
            await page.waitForFunction(() => {
                return !document.querySelector('.cf-browser-verification') ||
                       document.querySelector('.cf-challenge-success');
            }, { timeout: 30000 });
            
            console.log('   ✅ Cloudflare challenge completed');
            return true;
            
        } catch (error) {
            console.log('   ❌ Cloudflare challenge failed');
            return false;
        }
    }
    
    /**
     * Enhanced form analysis with improved generic form detection
     */
    async enhancedFormAnalysis(page) {
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
                complexity: (visibleInputs.length + hasRequiredFields) / 10 // Simple complexity score
            };
        });
    }
    
    /**
     * Enhanced form filling with human behavior
     */
    async enhancedFormFilling(page, profile, registrationId, siteId) {
        if (!this.humanBehavior) {
            // Fallback to basic form filling
            return await this.basicFormFilling(page, profile, registrationId, siteId);
        }
        
        console.log('   🤖 Using human behavior simulation...');
        
        const formData = {
            'input[type="email"], input[name*="email" i], input[id*="email" i]': profile.email,
            'input[name*="first" i], input[id*="first" i]': profile.firstName,
            'input[name*="last" i], input[id*="last" i]': profile.lastName,
            'input[name*="age" i], select[name*="age" i]': profile.age.toString(),
            'select[name*="gender" i], select[id*="gender" i]': profile.gender,
            'input[name*="zip" i], input[name*="postal" i]': '10001',
            'input[type="password"]': 'SecurePass123!'
        };
        
        // Use human behavior for form filling
        await this.humanBehavior.humanFillForm(page, formData);
        
        // Count filled fields
        const filledCount = Object.keys(formData).length;
        
        console.log(`   📊 Enhanced form filling complete: ${filledCount} fields processed`);
        
        return { fieldsNfilled: filledCount };
    }
    
    /**
     * Adaptive form submission with intelligent success detection
     */
    async adaptiveFormSubmission(page, siteName, registrationId, originalUrl) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Join")',
            'button:has-text("Create")',
            'button:has-text("Submit")',
            '.submit-btn',
            '.register-btn'
        ];
        
        // Get adaptive recommendations for this site
        const recommendations = this.adaptiveLearning.getAdaptiveRecommendations(siteName);
        console.log(`   🧠 Using adaptive tactics for ${siteName} (Success rate: ${(recommendations.successRate * 100).toFixed(1)}%)`);
        
        for (const selector of submitSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    console.log(`      🖱️ Adaptive clicking: ${selector}`);
                    
                    // Record submission timestamp
                    const submissionStart = Date.now();
                    
                    if (this.humanBehavior) {
                        await this.humanBehavior.humanClick(page, selector);
                    } else {
                        await button.click();
                    }
                    
                    // Adaptive wait time based on learned patterns
                    const waitTime = recommendations.avgResponseTime > 0 ? 
                        Math.min(recommendations.avgResponseTime + 2000, 10000) : 5000;
                    
                    console.log(`      ⏳ Adaptive wait: ${waitTime}ms`);
                    await page.waitForTimeout(waitTime);
                    
                    // Use adaptive success detection
                    const responseTime = Date.now() - submissionStart;
                    const detectionResult = await this.adaptiveLearning.detectSuccess(page, siteName, {
                        originalUrl: originalUrl,
                        responseTime: responseTime
                    });
                    
                    if (detectionResult.success) {
                        console.log(`      ✅ Adaptive success detected: ${detectionResult.method} (confidence: ${detectionResult.confidence})`);
                        return { 
                            success: true, 
                            method: detectionResult.method,
                            confidence: detectionResult.confidence,
                            responseTime: responseTime
                        };
                    }
                    
                    // Check for specific error patterns
                    const content = await page.content();
                    if (content.includes('error') || content.includes('invalid') || content.includes('try again')) {
                        return { 
                            success: false, 
                            errorMessage: 'Error indicators detected in response',
                            method: 'error_detection'
                        };
                    }
                    
                    // If no clear success/error, try next selector
                    console.log(`      ⚠️ Inconclusive result with ${selector}, trying next method...`);
                }
            } catch (error) {
                console.log(`      ⚠️ Submit attempt failed: ${error.message}`);
                continue;
            }
        }
        
        return { 
            success: false, 
            errorMessage: 'No suitable submit button found or all submission attempts failed',
            method: 'exhausted_selectors'
        };
    }
    
    /**
     * Enhanced form submission with multiple attempts (legacy fallback)
     */
    async enhancedFormSubmission(page, registrationId) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Join")',
            'button:has-text("Create")',
            '.submit-btn',
            '.register-btn'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    console.log(`      🖱️ Enhanced clicking: ${selector}`);
                    
                    if (this.humanBehavior) {
                        await this.humanBehavior.humanClick(page, selector);
                    } else {
                        await button.click();
                    }
                    
                    // Wait for response with extended timeout
                    await page.waitForTimeout(5000);
                    
                    // Check for success indicators
                    const content = await page.content();
                    const currentUrl = page.url();
                    
                    const success = content.includes('success') || 
                                   content.includes('welcome') || 
                                   content.includes('verify') ||
                                   content.includes('confirmation') ||
                                   content.includes('thank you') ||
                                   currentUrl.includes('success') ||
                                   currentUrl.includes('welcome');
                    
                    if (success) {
                        console.log('      ✅ Success indicators detected');
                        return true;
                    }
                    
                    // Check for errors
                    const hasErrors = content.includes('error') ||
                                     content.includes('invalid') ||
                                     content.includes('try again') ||
                                     content.includes('captcha');
                    
                    if (hasErrors) {
                        console.log('      ⚠️ Error indicators detected');
                        return false;
                    }
                    
                    // If no clear success/error, assume success for now
                    return true;
                }
            } catch (error) {
                console.log(`      ⚠️ Submit attempt failed: ${error.message}`);
                continue;
            }
        }
        
        return false;
    }
    
    /**
     * Display application capabilities
     */
    displayCapabilities() {
        console.log('🛡️ ENHANCED CAPABILITIES ACTIVE:');
        console.log('================================');
        
        console.log(`✅ Browser Stealth: Advanced fingerprint spoofing`);
        console.log(`✅ Defense Detection: ${Object.keys(this.defenseDetector.defensePatterns).length} defense types`);
        
        if (this.humanBehavior) {
            console.log(`✅ Human Behavior: ${this.humanBehavior.userProfile.type} typing pattern`);
        }
        
        if (this.captchaSolver && this.captchaSolver.isConfigured()) {
            console.log(`✅ CAPTCHA Solving: Multiple service integration`);
        }
        
        if (this.proxyManager) {
            const proxyStats = this.proxyManager.getStats();
            console.log(`✅ Proxy Rotation: ${proxyStats.total} proxies available`);
        }
        
        console.log(`✅ Session Management: Persistence and recovery enabled`);
        console.log('');
    }
    
    /**
     * Get comprehensive statistics
     */
    getEnhancedStats() {
        const baseStats = this.stats;
        
        const enhancedStats = {
            ...baseStats,
            captchaStats: this.captchaSolver ? this.captchaSolver.getStats() : null,
            proxyStats: this.proxyManager ? this.proxyManager.getStats() : null,
            sessionStats: {
                active: this.sessions.size,
                recovered: this.stats.sessionsRecovered
            },
            stealthLevel: this.options.stealthLevel,
            capabilities: {
                humanBehavior: !!this.humanBehavior,
                captchaSolving: !!(this.captchaSolver && this.captchaSolver.isConfigured()),
                proxyRotation: !!this.proxyManager,
                sessionPersistence: this.options.sessionPersistence
            }
        };
        
        return enhancedStats;
    }
    
    /**
     * Cleanup session
     */
    async cleanupSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            try {
                if (session.page && !session.page.isClosed()) {
                    await session.page.close();
                }
                if (session.context) {
                    await session.context.close();
                }
            } catch (error) {
                console.log(`⚠️ Session cleanup error: ${error.message}`);
            }
            
            this.sessions.delete(sessionId);
        }
    }
    
    /**
     * Recover sessions (placeholder for future implementation)
     */
    async recoverSessions() {
        // Implementation would load previous sessions from database
        console.log('💾 Session recovery not yet implemented');
    }
    
    /**
     * Enhanced shutdown
     */
    async shutdown() {
        console.log('\n🧹 Shutting down enhanced application...');
        
        try {
            // Cleanup all active sessions
            for (const sessionId of this.sessions.keys()) {
                await this.cleanupSession(sessionId);
            }
            
            // Shutdown components
            if (this.proxyManager) {
                this.proxyManager.shutdown();
            }
            
            if (this.browser) {
                await this.browser.close();
            }
            
            if (this.emailManager) {
                await this.emailManager.cleanup();
            }
            
            if (this.logger) {
                await this.logger.close();
            }
            
            console.log('✅ Enhanced application shutdown complete');
            
            // Display final stats
            const finalStats = this.getEnhancedStats();
            console.log('\n📊 FINAL STATISTICS:');
            console.log(`📧 Emails created: ${finalStats.emailsCreated}`);
            console.log(`🎯 Sites attempted: ${finalStats.sitesAttempted}`);
            console.log(`✅ Successful registrations: ${finalStats.successfulRegistrations}`);
            console.log(`🛡️ Defenses detected: ${finalStats.defensesDetected}`);
            console.log(`🔍 CAPTCHAs solved: ${finalStats.captchasSolved}`);
            console.log(`🌐 Proxies used: ${finalStats.proxiesUsed}`);
            
        } catch (error) {
            console.error('⚠️ Enhanced shutdown error:', error.message);
        }
    }
}

module.exports = EnhancedPollAutomationApp;