/**
 * Poll Automation Engine
 * Unified entry point that consolidates functionality from:
 * - enhanced-app.js
 * - app.js  
 * - enhanced-poll-automation.js
 * 
 * Provides clean, maintainable architecture with dependency injection
 */

const DIContainer = require('./DIContainer');
const ConfigurationManager = require('../config/ConfigurationManager');
const EventEmitter = require('events');
const path = require('path');

class PollAutomationEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            configPath: options.configPath || path.join(__dirname, '../../config'),
            environment: options.environment || process.env.NODE_ENV || 'development',
            ...options
        };

        // Core systems
        this.container = new DIContainer();
        this.config = new ConfigurationManager({
            configPath: this.options.configPath,
            environment: this.options.environment
        });

        // State management
        this.isInitialized = false;
        this.isRunning = false;
        this.sessionId = null;
        
        // Statistics
        this.stats = {
            emailsCreated: 0,
            sitesAttempted: 0,
            successfulRegistrations: 0,
            failedRegistrations: 0,
            challengesSolved: 0,
            captchasSolved: 0,
            attentionChecksPassed: 0,
            defensesDetected: 0,
            sessionsCompleted: 0,
            totalRuntime: 0,
            aiCostTotal: 0
        };

        // Service references
        this.services = {};
    }

    /**
     * Initialize the entire poll automation system
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🚀 ENHANCED POLL AUTOMATION ENGINE v2.0');
        console.log('==========================================');
        console.log('🔄 Initializing unified automation system...\n');

        try {
            // Step 1: Load configuration
            await this.config.initialize();
            
            // Step 2: Register all services
            await this.registerServices();
            
            // Step 3: Validate service configuration
            const validation = this.container.validateConfiguration();
            if (validation.errors.length > 0) {
                throw new Error(`Service configuration errors: ${validation.errors.join(', ')}`);
            }
            
            // Step 4: Initialize all services
            await this.container.initialize();
            
            // Step 5: Store service references for easy access
            this.services = {
                emailManager: this.container.resolve('emailManager'),
                browser: this.container.resolve('browserManager'),
                behaviorEngine: this.container.resolve('behaviorEngine'),
                networkManager: this.container.resolve('networkManager'),
                orchestrator: this.container.resolve('orchestrator'),
                database: this.container.resolve('database'),
                aiService: this.container.resolve('aiService'),
                challengeResolver: this.container.resolve('challengeResolver'),
                logger: this.container.resolve('logger')
            };

            // Step 6: Setup event handling
            this.setupEventHandling();

            this.isInitialized = true;
            
            console.log('\n✅ Enhanced Poll Automation Engine initialized successfully');
            this.displayCapabilities();
            
            this.emit('initialized', { 
                sessionId: this.generateSessionId(),
                capabilities: this.getCapabilities()
            });

        } catch (error) {
            console.error('❌ Engine initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Register all services in the dependency injection container
     */
    async registerServices() {
        console.log('📋 Registering services...');

        // Core services (no dependencies)
        this.container
            .register('config', class { constructor() { return this.config; } }, [], {
                lifecycle: 'singleton',
                initOrder: 0
            })
            .registerInstance('config', this.config);

        // Database service
        this.container.registerFactory('database', 
            (config) => {
                const RegistrationLogger = require('../database/registration-logger');
                return new RegistrationLogger(config.get('database.path'));
            }, 
            ['config'], 
            { lifecycle: 'singleton', initOrder: 1 }
        );

        // Browser management service
        this.container.registerFactory('browserManager',
            (config) => {
                const BrowserManager = require('./BrowserManager');
                return new BrowserManager({
                    headless: config.get('browser.headless'),
                    timeout: config.get('browser.timeout'),
                    args: config.get('browser.args'),
                    stealthLevel: config.get('stealth.level')
                });
            },
            ['config'],
            { lifecycle: 'singleton', initOrder: 2 }
        );

        // Network and security management
        this.container.registerFactory('networkManager',
            (config, browserManager) => {
                const NetworkSecurityManager = require('../network/NetworkSecurityManager');
                return new NetworkSecurityManager({
                    proxyEnabled: config.get('proxy.enabled'),
                    rotationInterval: config.get('proxy.rotationInterval'),
                    stealthLevel: config.get('stealth.level'),
                    browser: browserManager.getBrowser()
                });
            },
            ['config', 'browserManager'],
            { lifecycle: 'singleton', initOrder: 3 }
        );

        // Behavioral simulation engine
        this.container.registerFactory('behaviorEngine',
            (config, browserManager) => {
                const UnifiedBehaviorEngine = require('../behavioral/UnifiedBehaviorEngine');
                return new UnifiedBehaviorEngine({
                    mouseSimulation: config.get('behavioral.mouseSimulation'),
                    keystrokeSimulation: config.get('behavioral.keystrokeSimulation'),
                    personality: config.get('behavioral.personality'),
                    errorRate: config.get('behavioral.errorRate'),
                    browser: browserManager.getBrowser()
                });
            },
            ['config', 'browserManager'],
            { lifecycle: 'singleton', initOrder: 4 }
        );

        // Email management service
        this.container.registerFactory('emailManager',
            (config, browserManager) => {
                const EmailAccountManager = require('../email/email-account-manager');
                return new EmailAccountManager({
                    headless: config.get('browser.headless'),
                    debugMode: config.get('app.debugMode'),
                    timeout: config.get('app.timeout'),
                    browser: browserManager.getBrowser()
                });
            },
            ['config', 'browserManager'],
            { lifecycle: 'singleton', initOrder: 5 }
        );

        // AI service
        this.container.registerFactory('aiService',
            (config) => {
                const AIServiceManager = require('../ai/AIServiceManager');
                return new AIServiceManager({
                    serviceUrl: config.get('ai.serviceUrl'),
                    learningEnabled: config.get('ai.learningEnabled'),
                    cachingEnabled: config.get('ai.cachingEnabled'),
                    batchProcessing: config.get('ai.batchProcessing'),
                    costOptimization: config.get('ai.costOptimization')
                });
            },
            ['config'],
            { lifecycle: 'singleton', initOrder: 6 }
        );

        // Challenge resolver
        this.container.registerFactory('challengeResolver',
            (config, aiService, networkManager) => {
                const ChallengeResolver = require('../automation/ChallengeResolver');
                return new ChallengeResolver({
                    captchaEnabled: config.get('captcha.enabled'),
                    captchaTimeout: config.get('captcha.timeout'),
                    twoCaptchaKey: config.getSecret('TWOCAPTCHA_API_KEY'),
                    antiCaptchaKey: config.getSecret('ANTICAPTCHA_API_KEY'),
                    aiService: aiService,
                    networkManager: networkManager
                });
            },
            ['config', 'aiService', 'networkManager'],
            { lifecycle: 'singleton', initOrder: 7 }
        );

        // Main orchestrator
        this.container.registerFactory('orchestrator',
            (config, browserManager, behaviorEngine, networkManager, aiService, challengeResolver, database) => {
                const WorkflowOrchestrator = require('../automation/WorkflowOrchestrator');
                return new WorkflowOrchestrator({
                    browser: browserManager.getBrowser(),
                    behaviorEngine: behaviorEngine,
                    networkManager: networkManager,
                    aiService: aiService,
                    challengeResolver: challengeResolver,
                    database: database,
                    enableLearning: config.get('ai.learningEnabled'),
                    debugMode: config.get('app.debugMode'),
                    maxRetries: config.get('app.maxRetries')
                });
            },
            ['config', 'browserManager', 'behaviorEngine', 'networkManager', 'aiService', 'challengeResolver', 'database'],
            { lifecycle: 'singleton', initOrder: 8 }
        );

        // Logger service
        this.container.registerFactory('logger',
            (config, database) => {
                const Logger = require('../monitoring/Logger');
                return new Logger({
                    level: config.get('logging.level'),
                    format: config.get('logging.format'),
                    file: config.get('logging.file'),
                    console: config.get('logging.console'),
                    database: database
                });
            },
            ['config', 'database'],
            { lifecycle: 'singleton', initOrder: 9 }
        );

        console.log('✅ All services registered');
    }

    /**
     * Create optimized email account with AI profile
     */
    async createEmailAccount(service = 'guerrilla') {
        this.ensureInitialized();
        
        console.log('📧 Creating AI-optimized email account...');
        
        try {
            // Generate session ID if not exists
            if (!this.sessionId) {
                this.sessionId = this.generateSessionId();
            }

            // Create email account using the unified email manager
            const emailData = await this.services.emailManager.createEnhancedEmailAccount(service, {
                sessionId: this.sessionId,
                aiOptimized: true,
                stealthLevel: this.config.get('stealth.level')
            });

            // Update statistics
            this.stats.emailsCreated++;
            
            // Log to database
            await this.services.database.logEmailAccount(emailData);

            console.log(`✅ Email created: ${emailData.email}`);
            console.log(`🤖 AI Profile: ${emailData.profile.profileName} (Yield: ${(emailData.profile.yieldPrediction * 100).toFixed(1)}%)`);
            
            this.emit('emailCreated', emailData);
            
            return emailData;

        } catch (error) {
            console.error('❌ Email creation failed:', error.message);
            this.emit('error', { type: 'email_creation', error });
            throw error;
        }
    }

    /**
     * Execute advanced site automation
     */
    async automateSite(siteConfig, emailData = null, options = {}) {
        this.ensureInitialized();
        
        const sessionStart = Date.now();
        console.log(`\n🎯 Starting advanced site automation: ${siteConfig.name || siteConfig.url}`);
        
        try {
            // Create email if not provided
            if (!emailData) {
                emailData = await this.createEmailAccount();
            }

            // Execute automation using the orchestrator
            const result = await this.services.orchestrator.automateFullWorkflow(siteConfig, emailData, {
                sessionId: this.sessionId,
                ...options
            });

            // Update statistics
            this.updateStatsFromResult(result);
            
            const duration = Date.now() - sessionStart;
            this.stats.totalRuntime += duration;

            console.log(`✅ Site automation completed in ${Math.round(duration / 1000)}s`);
            
            this.emit('siteCompleted', {
                site: siteConfig,
                result: result,
                duration: duration
            });

            return result;

        } catch (error) {
            console.error(`❌ Site automation failed: ${error.message}`);
            this.stats.failedRegistrations++;
            this.emit('error', { type: 'site_automation', error, site: siteConfig });
            throw error;
        }
    }

    /**
     * Run comprehensive automation campaign
     */
    async runCampaign(sites, options = {}) {
        this.ensureInitialized();
        
        const {
            emailCount = 1,
            parallelProcessing = false,
            delayBetweenSites = 5000,
            delayBetweenEmails = 10000
        } = options;

        console.log(`\n🚀 ENHANCED AUTOMATION CAMPAIGN`);
        console.log('==============================');
        console.log(`📧 Emails: ${emailCount}`);
        console.log(`🎯 Sites: ${sites.length}`);
        console.log(`⚡ Parallel: ${parallelProcessing ? 'YES' : 'NO'}`);
        console.log(`🛡️ Stealth Level: ${this.config.get('stealth.level').toUpperCase()}`);

        const campaignStart = Date.now();
        const results = [];

        try {
            for (let emailIndex = 0; emailIndex < emailCount; emailIndex++) {
                console.log(`\n📧 EMAIL ${emailIndex + 1}/${emailCount}`);
                console.log('-'.repeat(40));

                try {
                    // Create email account
                    const emailData = await this.createEmailAccount();
                    
                    const emailResults = {
                        email: emailData.email,
                        profile: emailData.profile.profileName,
                        sites: []
                    };

                    // Process sites
                    if (parallelProcessing) {
                        // Parallel processing
                        const sitePromises = sites.map(site => 
                            this.automateSite(site, emailData).catch(error => ({
                                success: false,
                                error: error.message,
                                site: site
                            }))
                        );
                        
                        const siteResults = await Promise.all(sitePromises);
                        emailResults.sites = siteResults;
                        
                    } else {
                        // Sequential processing
                        for (const site of sites) {
                            try {
                                const siteResult = await this.automateSite(site, emailData);
                                emailResults.sites.push(siteResult);
                                
                                // Delay between sites
                                if (sites.indexOf(site) < sites.length - 1) {
                                    console.log(`⏳ Waiting ${delayBetweenSites / 1000}s before next site...`);
                                    await this.sleep(delayBetweenSites);
                                }
                                
                            } catch (error) {
                                emailResults.sites.push({
                                    success: false,
                                    error: error.message,
                                    site: site
                                });
                            }
                        }
                    }

                    results.push(emailResults);

                    // Delay between emails
                    if (emailIndex < emailCount - 1) {
                        console.log(`⏳ Waiting ${delayBetweenEmails / 1000}s before next email...`);
                        await this.sleep(delayBetweenEmails);
                    }

                } catch (error) {
                    console.error(`❌ Email ${emailIndex + 1} failed:`, error.message);
                }
            }

            const campaignDuration = Date.now() - campaignStart;
            this.stats.sessionsCompleted++;

            // Display campaign summary
            this.displayCampaignSummary(results, campaignDuration);

            this.emit('campaignCompleted', {
                results: results,
                duration: campaignDuration,
                stats: this.getStats()
            });

            return {
                success: true,
                results: results,
                duration: campaignDuration,
                stats: this.getStats()
            };

        } catch (error) {
            console.error('❌ Campaign failed:', error.message);
            this.emit('error', { type: 'campaign', error });
            throw error;
        }
    }

    /**
     * Test system capabilities
     */
    async testCapabilities(targetUrl = 'https://httpbin.org/forms/post') {
        this.ensureInitialized();
        
        console.log('🧪 TESTING SYSTEM CAPABILITIES');
        console.log('==============================');
        
        try {
            // Test email creation
            console.log('📧 Testing email creation...');
            const emailData = await this.createEmailAccount();
            console.log('✅ Email creation test passed');

            // Test browser automation
            console.log('🌐 Testing browser automation...');
            const browserTest = await this.services.orchestrator.testBrowserCapabilities(targetUrl);
            console.log(`✅ Browser test: ${browserTest.success ? 'PASSED' : 'FAILED'}`);

            // Test behavioral simulation
            console.log('🎭 Testing behavioral simulation...');
            const behaviorTest = await this.services.behaviorEngine.testCapabilities();
            console.log(`✅ Behavior test: ${behaviorTest.success ? 'PASSED' : 'FAILED'}`);

            // Test AI service
            console.log('🧠 Testing AI service...');
            const aiTest = await this.services.aiService.testConnection();
            console.log(`✅ AI test: ${aiTest.success ? 'PASSED' : 'FAILED'}`);

            // Test challenge resolution
            console.log('🧩 Testing challenge resolution...');
            const challengeTest = await this.services.challengeResolver.testCapabilities();
            console.log(`✅ Challenge test: ${challengeTest.success ? 'PASSED' : 'FAILED'}`);

            const allPassed = browserTest.success && behaviorTest.success && 
                            aiTest.success && challengeTest.success;

            console.log(`\n🎯 Overall test result: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

            return {
                success: allPassed,
                tests: {
                    email: true,
                    browser: browserTest.success,
                    behavior: behaviorTest.success,
                    ai: aiTest.success,
                    challenges: challengeTest.success
                }
            };

        } catch (error) {
            console.error('❌ Capability test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get comprehensive system statistics
     */
    getStats() {
        const baseStats = { ...this.stats };
        
        // Calculate derived metrics
        baseStats.successRate = baseStats.sitesAttempted > 0 ? 
            (baseStats.successfulRegistrations / baseStats.sitesAttempted * 100).toFixed(1) + '%' : '0%';
        
        baseStats.avgTimePerSite = baseStats.sitesAttempted > 0 ?
            Math.round(baseStats.totalRuntime / baseStats.sitesAttempted / 1000) + 's' : '0s';
        
        baseStats.costPerRegistration = baseStats.successfulRegistrations > 0 ?
            '$' + (baseStats.aiCostTotal / baseStats.successfulRegistrations).toFixed(4) : '$0';

        // Add service-specific stats
        if (this.isInitialized) {
            baseStats.serviceStats = {
                browser: this.services.browserManager?.getStats() || {},
                behavior: this.services.behaviorEngine?.getStats() || {},
                network: this.services.networkManager?.getStats() || {},
                ai: this.services.aiService?.getStats() || {}
            };
        }

        return baseStats;
    }

    /**
     * Get system capabilities
     */
    getCapabilities() {
        if (!this.isInitialized) {
            return { initialized: false };
        }

        return {
            initialized: true,
            version: '2.0.0',
            features: {
                advancedStealth: true,
                neuralBehavior: true,
                aiOptimization: true,
                challengeSolving: true,
                proxyRotation: this.config.get('proxy.enabled'),
                learningEnabled: this.config.get('ai.learningEnabled'),
                sessionPersistence: this.config.get('session.persistence')
            },
            services: this.container.getStats()
        };
    }

    /**
     * Setup event handling
     */
    setupEventHandling() {
        // Forward events from services
        const services = ['orchestrator', 'behaviorEngine', 'networkManager', 'aiService'];
        
        services.forEach(serviceName => {
            const service = this.services[serviceName];
            if (service && service.on) {
                service.on('error', (error) => {
                    this.emit('serviceError', { service: serviceName, error });
                });
            }
        });

        // Setup graceful shutdown
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
    }

    /**
     * Display system capabilities
     */
    displayCapabilities() {
        console.log('\n🛡️ ENHANCED CAPABILITIES ACTIVE:');
        console.log('================================');
        console.log(`✅ Unified Architecture: Advanced dependency injection`);
        console.log(`✅ Neural Behavior Engine: Human-like interaction patterns`);
        console.log(`✅ Network Security Manager: Advanced proxy & fingerprint management`);
        console.log(`✅ AI Service Integration: Cost-optimized decision making`);
        console.log(`✅ Challenge Resolution: CAPTCHA & verification handling`);
        console.log(`✅ Workflow Orchestration: Multi-modal automation flows`);
        console.log(`✅ Session Management: Persistence & recovery capabilities`);
        console.log(`✅ Real-time Adaptation: Learning from success patterns`);
    }

    /**
     * Display campaign summary
     */
    displayCampaignSummary(results, duration) {
        console.log('\n📊 ENHANCED CAMPAIGN SUMMARY');
        console.log('============================');
        
        const stats = this.getStats();
        console.log(`📧 Emails created: ${stats.emailsCreated}`);
        console.log(`🎯 Sites attempted: ${stats.sitesAttempted}`);
        console.log(`✅ Successful registrations: ${stats.successfulRegistrations}`);
        console.log(`❌ Failed registrations: ${stats.failedRegistrations}`);
        console.log(`🧩 Challenges solved: ${stats.challengesSolved}`);
        console.log(`🔒 CAPTCHAs solved: ${stats.captchasSolved}`);
        console.log(`👁️ Attention checks passed: ${stats.attentionChecksPassed}`);
        console.log(`🛡️ Defenses detected: ${stats.defensesDetected}`);
        console.log(`📈 Success rate: ${stats.successRate}`);
        console.log(`⏱️ Total runtime: ${Math.round(duration / 1000)}s`);
        console.log(`💰 AI cost: $${stats.aiCostTotal.toFixed(4)}`);
    }

    /**
     * Utility methods
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Engine not initialized. Call initialize() first.');
        }
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    updateStatsFromResult(result) {
        this.stats.sitesAttempted++;
        
        if (result.success) {
            this.stats.successfulRegistrations++;
        } else {
            this.stats.failedRegistrations++;
        }
        
        this.stats.challengesSolved += result.challengesSolved || 0;
        this.stats.captchasSolved += result.captchasSolved || 0;
        this.stats.attentionChecksPassed += result.attentionChecksPassed || 0;
        this.stats.defensesDetected += result.defensesDetected || 0;
        this.stats.aiCostTotal += result.aiCost || 0;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Graceful shutdown
     */
    async gracefulShutdown() {
        console.log('\n🛑 Shutting down Enhanced Poll Automation Engine...');
        
        try {
            this.isRunning = false;
            
            // Cleanup container (will cleanup all services)
            if (this.container) {
                await this.container.cleanup();
            }
            
            // Cleanup configuration
            if (this.config) {
                await this.config.cleanup();
            }
            
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Shutdown error:', error.message);
            process.exit(1);
        }
    }

    /**
     * Cleanup and shutdown
     */
    async cleanup() {
        await this.gracefulShutdown();
    }
}

module.exports = PollAutomationEngine;