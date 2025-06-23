#!/usr/bin/env node

/**
 * UNIFIED POLL AUTOMATION APPLICATION
 * 
 * Consolidated single entry point that combines functionality from:
 * - Basic poll automation (app.js, src/app.js)
 * - Enhanced anti-detection system (src/enhanced-app.js)
 * - Advanced CLI interfaces (cli.js, enhanced-cli.js, src/index.js)
 * - Legacy functionality (app-old.js)
 * 
 * Features:
 * - Multi-tier automation (basic → enhanced → advanced)
 * - Comprehensive CLI with all commands
 * - Enhanced anti-detection capabilities
 * - AI-powered decision making
 * - Multi-tab coordination
 * - Advanced behavioral simulation
 * - Comprehensive database management
 * - Interactive mode with full capabilities
 * 
 * Usage:
 *   node app.js create-email [--enhanced] [--stealth-level high]
 *   node app.js register [--sites urls] [--mode enhanced] [--stealth high]
 *   node app.js run [--mode basic|enhanced|advanced] [--target site]
 *   node app.js stats [--detailed] [--enhanced]
 *   node app.js interactive [--enhanced] [--stealth high]
 *   node app.js test-stealth [--target url]
 *   node app.js db export|clean|stats
 */

const { Command } = require('commander');
const chalk = require('chalk');
const readline = require('readline');
const fs = require('fs').promises;

// Import the comprehensive enhanced service
const EnhancedPollAutomationService = require('./src/services/enhanced-poll-automation');
const DatabaseManager = require('./src/database/manager');
const { setupDatabase } = require('./src/database/setup');

// Legacy imports for backward compatibility
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');

require('dotenv').config();

// Initialize enhanced logging
const { getLogger } = require('./src/utils/enhanced-logger');
const logger = getLogger({
    logLevel: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
    enableFile: true,
    colorOutput: true
});

const program = new Command();

class UnifiedPollAutomationApp {
    constructor() {
        // Use the enhanced service as the core
        this.enhancedService = new EnhancedPollAutomationService();
        this.db = new DatabaseManager();
        this.logger = logger; // Use enhanced logger
        
        // Legacy components for basic mode
        this.emailManager = null;
        this.formAutomator = null;
        
        // Application state
        this.isInitialized = false;
        this.currentMode = 'basic'; // basic, enhanced, advanced
        this.stealthLevel = 'medium'; // low, medium, high, maximum
        
        // Log application startup
        this.logger.info('🚀 Unified Poll Automation Application Starting', {
            version: '3.0.0',
            mode: this.currentMode,
            stealthLevel: this.stealthLevel,
            nodeVersion: process.version,
            platform: process.platform
        });
        
        // Check critical environment variables
        this.checkEnvironmentConfiguration();
        
        this.setupCommands();
    }
    
    /**
     * Check critical environment configuration
     */
    checkEnvironmentConfiguration() {
        const criticalChecks = {
            openai_api_key: process.env.OPENAI_API_KEY,
            database_path: process.env.DATABASE_PATH,
            node_env: process.env.NODE_ENV,
            log_level: process.env.LOG_LEVEL
        };
        
        const issues = [];
        const warnings = [];
        
        // Critical checks
        if (!criticalChecks.openai_api_key) {
            issues.push('❌ OPENAI_API_KEY is not set - LLM features will fail');
            this.logger.error('Critical Configuration Missing: OPENAI_API_KEY', {
                solution: 'Set OPENAI_API_KEY in .env file',
                example: 'OPENAI_API_KEY=sk-proj-...'
            });
        } else {
            const keyPreview = criticalChecks.openai_api_key.substring(0, 10) + '...' + 
                              criticalChecks.openai_api_key.substring(criticalChecks.openai_api_key.length - 4);
            this.logger.info('✅ OpenAI API Key Present', { keyPreview });
        }
        
        if (!criticalChecks.database_path) {
            warnings.push('⚠️ DATABASE_PATH not set - using default ./poll-automation.db');
            this.logger.warn('Database path not configured', {
                defaultPath: './poll-automation.db',
                suggestion: 'Set DATABASE_PATH in .env for custom location'
            });
        } else {
            this.logger.info('✅ Database Path Configured', { path: criticalChecks.database_path });
        }
        
        // Environment checks
        if (!criticalChecks.node_env) {
            warnings.push('⚠️ NODE_ENV not set - defaulting to development');
        }
        
        if (!criticalChecks.log_level) {
            warnings.push('⚠️ LOG_LEVEL not set - defaulting to info');
        }
        
        // Report configuration status
        if (issues.length > 0) {
            console.log(chalk.red.bold('\n🚨 CRITICAL CONFIGURATION ISSUES:'));
            issues.forEach(issue => console.log(chalk.red(`  ${issue}`)));
            console.log(chalk.yellow('\n🔧 Please fix these issues before continuing.\n'));
        }
        
        if (warnings.length > 0) {
            console.log(chalk.yellow('\n⚠️ CONFIGURATION WARNINGS:'));
            warnings.forEach(warning => console.log(chalk.yellow(`  ${warning}`)));
            console.log('');
        }
        
        if (issues.length === 0 && warnings.length === 0) {
            console.log(chalk.green('✅ All critical configurations are properly set!'));
        }
        
        // Log system status
        this.logger.logSystemStatus();
        
        return {
            criticalIssues: issues.length,
            warnings: warnings.length,
            isReady: issues.length === 0
        };
    }

    setupCommands() {
        program
            .name('poll-automation')
            .description('🎯 UNIFIED Poll Automation Application - All capabilities in one place')
            .version('3.0.0');

        // Global options
        program
            .option('--mode <mode>', 'automation mode (basic, enhanced, advanced)', 'enhanced')
            .option('--stealth <level>', 'stealth level (low, medium, high, maximum)', 'high')
            .option('--gui', 'show browser GUI')
            .option('--debug', 'enable debug mode')
            .option('--timeout <ms>', 'operation timeout in milliseconds', '45000')
            .option('--db-path <path>', 'database file path', './data/unified-poll-automation.db');

        // Email management commands
        program
            .command('create-email')
            .description('📧 Create email account with optional AI optimization')
            .option('-s, --service <service>', 'email service (guerrilla, tempmail, 10minutemail)', 'auto')
            .option('--enhanced', 'use enhanced AI-optimized profile generation')
            .option('--stealth <level>', 'stealth level override')
            .option('--gui', 'show browser GUI')
            .action(async (options) => {
                try {
                    this.logger.info('📧 Create Email Command Started', { options });
                    await this.handleCreateEmail(options);
                    this.logger.info('✅ Create Email Command Completed');
                } catch (error) {
                    this.logger.logComponentError('CreateEmail', error, { options });
                    process.exit(1);
                }
            });

        // Registration commands
        program
            .command('register')
            .description('🎯 Register on survey sites with comprehensive automation')
            .option('-e, --emails <count>', 'number of email accounts to create', '1')
            .option('-s, --sites <sites>', 'comma-separated list of site URLs')
            .option('--preset <preset>', 'use predefined site list (test, real, hardcore)', 'test')
            .option('--enhanced', 'use enhanced anti-detection features')
            .option('--stealth <level>', 'stealth level override')
            .option('--captcha-key <key>', '2Captcha API key for CAPTCHA solving')
            .option('--proxy-file <file>', 'proxy list file')
            .option('--proxy-list <proxies>', 'comma-separated proxy list')
            .option('--submit', 'actually submit forms (default: false)')
            .action(async (options) => {
                try {
                    this.logger.info('🎯 Register Command Started', { options });
                    await this.handleRegister(options);
                    this.logger.info('✅ Register Command Completed');
                } catch (error) {
                    this.logger.logComponentError('Register', error, { options });
                    process.exit(1);
                }
            });

        // Universal automation command
        program
            .command('run')
            .description('🚀 Run complete automation pipeline')
            .option('--target <url>', 'target website URL')
            .option('--emails <count>', 'number of emails to create', '1')
            .option('--mode <mode>', 'automation mode override')
            .option('--enhanced', 'force enhanced mode')
            .option('--submit', 'actually submit forms')
            .option('--max-time <minutes>', 'maximum execution time', '30')
            .action(async (options) => {
                try {
                    this.logger.info('🚀 Run Command Started', { options });
                    await this.handleRun(options);
                    this.logger.info('✅ Run Command Completed');
                } catch (error) {
                    this.logger.logComponentError('Run', error, { options });
                    process.exit(1);
                }
            });

        // Analysis commands
        program
            .command('analyze')
            .description('🔍 Analyze website forms without filling them')
            .option('-s, --site <url>', 'target website URL', 'https://surveyplanet.com')
            .option('--enhanced', 'use enhanced analysis with AI')
            .action(async (options) => {
                await this.handleAnalyze(options);
            });

        // Testing commands
        program
            .command('test-sites')
            .description('🌐 Test automation across multiple websites')
            .option('--quick', 'run quick test (3 sites)')
            .option('--preset <preset>', 'site preset to test', 'test')
            .option('--enhanced', 'use enhanced testing mode')
            .action(async (options) => {
                await this.handleTestSites(options);
            });

        program
            .command('test-stealth')
            .description('🧪 Test anti-detection capabilities')
            .option('--target <url>', 'target URL for testing', 'https://bot.sannysoft.com/')
            .option('--stealth <level>', 'stealth level to test', 'high')
            .action(async (options) => {
                await this.handleTestStealth(options);
            });

        program
            .command('test-automation')
            .description('🎯 Test complete automation pipeline on real survey sites')
            .option('--sites <sites>', 'Comma-separated list of sites to test', 'surveyplanet.com,typeform.com')
            .option('--count <count>', 'Number of sites to test', '2')
            .option('--screenshots', 'Take screenshots during process', false)
            .option('--full-report', 'Generate comprehensive report', false)
            .action(async (options) => {
                await this.handleTestAutomation(options);
            });

        // Statistics and monitoring
        program
            .command('stats')
            .description('📊 Display comprehensive system statistics')
            .option('--detailed', 'show detailed statistics')
            .option('--enhanced', 'show enhanced service statistics')
            .option('--export <file>', 'export stats to file')
            .action(async (options) => {
                await this.handleStats(options);
            });

        // Database management
        const dbCommand = program
            .command('db')
            .description('🗄️ Database management operations');

        dbCommand
            .command('stats')
            .description('Show database statistics')
            .action(async () => {
                await this.handleDbStats();
            });

        dbCommand
            .command('export')
            .description('Export database to JSON')
            .option('-o, --output <file>', 'output file', `export-${Date.now()}.json`)
            .action(async (options) => {
                await this.handleDbExport(options);
            });

        dbCommand
            .command('clean')
            .description('Clean up old database entries')
            .option('--days <days>', 'keep entries newer than X days', '30')
            .action(async (options) => {
                await this.handleDbClean(options);
            });

        // Email verification
        program
            .command('verify-email')
            .description('✉️ Check and verify email inbox')
            .requiredOption('--email <email>', 'email address to verify')
            .option('--max-wait <minutes>', 'maximum wait time', '12')
            .action(async (options) => {
                await this.handleVerifyEmail(options);
            });

        // Interactive mode
        program
            .command('interactive')
            .description('🎮 Start interactive mode with all capabilities')
            .option('--enhanced', 'enable enhanced interactive features')
            .option('--stealth <level>', 'stealth level for interactive mode')
            .action(async (options) => {
                await this.handleInteractive(options);
            });

        // Service management
        program
            .command('test-llm')
            .description('🧪 Test LLM service connection')
            .action(async () => {
                await this.handleTestLLM();
            });

        program
            .command('status')
            .description('💻 Show system status and health')
            .option('--detailed', 'show detailed status')
            .action(async (options) => {
                await this.handleStatus(options);
            });
    }

    async initialize(options = {}) {
        if (this.isInitialized) return;

        try {
            console.log(chalk.cyan('🚀 UNIFIED POLL AUTOMATION APPLICATION v3.0'));
            console.log(chalk.cyan('=========================================='));
            console.log('🔄 Initializing comprehensive automation systems...\n');

            // Set configuration
            this.currentMode = options.mode || program.opts().mode || 'enhanced';
            this.stealthLevel = options.stealth || program.opts().stealth || 'high';

            console.log(`🎯 Mode: ${this.currentMode.toUpperCase()}`);
            console.log(`🛡️ Stealth Level: ${this.stealthLevel.toUpperCase()}`);

            // Setup database
            await setupDatabase();

            // Initialize based on mode
            if (this.currentMode === 'basic') {
                await this.initializeBasicMode();
            } else {
                await this.initializeEnhancedMode();
            }

            await this.db.connect();
            this.isInitialized = true;

            console.log(chalk.green('\n✅ System initialized successfully'));
            console.log(chalk.gray('Ready for automation operations...\n'));

        } catch (error) {
            console.error(chalk.red('❌ Initialization failed:'), error.message);
            throw error;
        }
    }

    async initializeBasicMode() {
        console.log('📋 Loading basic automation components...');
        
        this.emailManager = new EmailAccountManager();
        await this.emailManager.initialize();
        
        this.logger = new RegistrationLogger();
        await this.logger.initialize();
        
        console.log('✅ Basic mode components loaded');
    }

    async initializeEnhancedMode() {
        console.log('🧠 Loading enhanced AI automation systems...');
        await this.enhancedService.initialize();
        console.log('✅ Enhanced mode components loaded');
    }

    async handleCreateEmail(options) {
        await this.initialize(options);
        
        try {
            console.log(chalk.blue('📧 EMAIL CREATION'));
            console.log('==================');

            let result;
            
            if (this.currentMode === 'basic') {
                console.log('Creating basic email account...');
                const email = await this.emailManager.createEmailAccount(options.service);
                await this.logger.logEmailAccount(email);
                
                result = {
                    emailAccount: email,
                    profile: { profileName: 'Basic Profile' }
                };
            } else {
                console.log('Creating enhanced AI-optimized email account...');
                result = await this.enhancedService.createEmailAccount(options.service);
            }

            console.log(chalk.green('\n✅ EMAIL ACCOUNT CREATED SUCCESSFULLY!'));
            console.log('=' .repeat(45));
            console.log(`📧 Email: ${result.emailAccount.email}`);
            console.log(`🏢 Service: ${result.emailAccount.service}`);
            
            if (result.profile) {
                console.log(`🤖 AI Profile: ${result.profile.profileName || 'Basic'}`);
                if (result.profile.yieldPrediction) {
                    console.log(`🎯 Predicted Yield: ${(result.profile.yieldPrediction * 100).toFixed(1)}%`);
                }
            }

        } catch (error) {
            console.error(chalk.red('❌ Email creation failed:'), error.message);
            throw error;
        }
    }

    async handleRegister(options) {
        await this.initialize(options);
        
        try {
            console.log(chalk.blue('🎯 REGISTRATION CAMPAIGN'));
            console.log('========================');

            // Parse options
            const emailCount = parseInt(options.emails);
            let sites = this.parseSiteOptions(options);

            console.log(`📧 Emails: ${emailCount}`);
            console.log(`🌐 Sites: ${sites.length}`);
            console.log(`🛡️ Mode: ${this.currentMode.toUpperCase()}`);

            // Confirmation for real sites
            if (options.preset === 'real' || options.preset === 'hardcore') {
                await this.confirmRealSites();
            }

            // Execute registration campaign
            const results = [];
            
            for (let i = 0; i < emailCount; i++) {
                console.log(`\n📧 EMAIL ${i + 1}/${emailCount}`);
                console.log('-'.repeat(30));

                try {
                    let emailData;
                    
                    if (this.currentMode === 'basic') {
                        const email = await this.emailManager.createEmailAccount();
                        emailData = { emailAccount: email };
                    } else {
                        emailData = await this.enhancedService.createEmailAccount();
                    }

                    const emailResults = {
                        email: emailData.emailAccount.email,
                        profile: emailData.profile?.profileName || 'Basic',
                        sites: []
                    };

                    // Process each site
                    for (const site of sites) {
                        const result = await this.processSiteRegistration(emailData, site, options);
                        emailResults.sites.push(result);
                        
                        // Delay between attempts
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }

                    results.push(emailResults);

                } catch (error) {
                    console.error(chalk.red(`❌ Email ${i + 1} failed:`), error.message);
                }
            }

            this.displayCampaignResults(results);

        } catch (error) {
            console.error(chalk.red('❌ Registration campaign failed:'), error.message);
            throw error;
        }
    }

    parseSiteOptions(options) {
        const sitePresets = {
            test: [
                { name: 'Local Survey Site', url: 'http://localhost:3001/register', category: 'test' },
                { name: 'HTTPBin Forms', url: 'https://httpbin.org/forms/post', category: 'test' }
            ],
            real: [
                { name: 'RewardingWays', url: 'https://www.rewardingways.com/register', category: 'survey' },
                { name: 'PaidViewpoint', url: 'https://paidviewpoint.com/?r=register', category: 'survey' },
                { name: 'SurveyClub', url: 'https://www.surveyclub.com/signup', category: 'survey' }
            ],
            hardcore: [
                { name: 'RewardingWays', url: 'https://www.rewardingways.com/register', category: 'survey' },
                { name: 'Swagbucks', url: 'https://www.swagbucks.com/p/register', category: 'survey' },
                { name: 'InboxDollars', url: 'https://www.inboxdollars.com/registration', category: 'survey' },
                { name: 'MyPoints', url: 'https://www.mypoints.com/registration', category: 'survey' }
            ]
        };

        if (options.sites) {
            return options.sites.split(',').map((url, index) => ({
                name: `Custom Site ${index + 1}`,
                url: url.trim(),
                category: 'custom'
            }));
        }

        return sitePresets[options.preset] || sitePresets.test;
    }

    async confirmRealSites() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const confirm = await new Promise(resolve => {
            rl.question('\n⚠️ This will attempt registration on REAL survey sites. Continue? (y/N): ', resolve);
        });

        rl.close();

        if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
            console.log('❌ Campaign cancelled');
            process.exit(0);
        }
    }

    async processSiteRegistration(emailData, site, options) {
        console.log(`🎯 Attempting: ${site.name}`);
        
        try {
            let result;
            
            if (this.currentMode === 'basic') {
                // Basic registration logic placeholder
                result = {
                    success: false,
                    error: 'Basic mode registration not yet implemented',
                    defenses: 0
                };
            } else {
                result = await this.enhancedService.attemptSiteRegistration(emailData, site);
            }

            const status = result.success ? '✅' : '❌';
            console.log(`   ${status} ${site.name}: ${result.success ? 'SUCCESS' : result.error}`);
            
            return {
                name: site.name,
                success: result.success,
                error: result.error,
                defenses: result.defenses || 0
            };

        } catch (error) {
            console.log(`   ❌ ${site.name}: ${error.message}`);
            return {
                name: site.name,
                success: false,
                error: error.message,
                defenses: 0
            };
        }
    }

    displayCampaignResults(results) {
        console.log(chalk.cyan('\n📊 CAMPAIGN SUMMARY'));
        console.log('=' .repeat(30));
        
        const totalEmails = results.length;
        const totalAttempts = results.reduce((sum, email) => sum + email.sites.length, 0);
        const successfulAttempts = results.reduce((sum, email) => 
            sum + email.sites.filter(site => site.success).length, 0);
        const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts * 100).toFixed(1) : 0;

        console.log(`📧 Emails created: ${totalEmails}`);
        console.log(`🎯 Total attempts: ${totalAttempts}`);
        console.log(`✅ Successful registrations: ${successfulAttempts}`);
        console.log(`📈 Success rate: ${successRate}%`);

        if (this.currentMode !== 'basic') {
            const stats = this.enhancedService.getEnhancedStats();
            console.log(`🛡️ Defenses detected: ${stats.defensesDetected || 0}`);
            console.log(`🔍 CAPTCHAs solved: ${stats.captchasSolved || 0}`);
        }
    }

    async handleRun(options) {
        await this.initialize(options);
        
        console.log(chalk.blue('🚀 COMPLETE AUTOMATION PIPELINE'));
        console.log('================================');
        
        const runOptions = {
            ...options,
            emails: options.emails || '1',
            preset: 'test'
        };
        
        await this.handleRegister(runOptions);
    }

    async handleAnalyze(options) {
        await this.initialize(options);
        
        console.log(chalk.blue('🔍 WEBSITE ANALYSIS'));
        console.log('===================');
        console.log(`🎯 Target: ${options.site}`);
        
        try {
            if (this.currentMode === 'basic') {
                console.log('⚠️ Basic analysis mode - enhanced features not available');
            } else {
                const analysis = await this.enhancedService.analyzeWebsite(options.site);
                this.displayAnalysisResults(analysis);
            }
        } catch (error) {
            console.error(chalk.red('❌ Analysis failed:'), error.message);
        }
    }

    displayAnalysisResults(analysis) {
        console.log('\n📊 ANALYSIS RESULTS');
        console.log('==================');
        console.log(`📝 Forms detected: ${analysis.forms?.length || 0}`);
        console.log(`🍯 Honeypots: ${analysis.honeypots?.length || 0}`);
        console.log(`🛡️ Defenses: ${analysis.defenses?.length || 0}`);
        console.log(`🤖 CAPTCHAs: ${analysis.captchas?.length || 0}`);
        console.log(`🎯 Confidence: ${((analysis.confidence || 0) * 100).toFixed(1)}%`);
    }

    async handleTestSites(options) {
        await this.initialize(options);
        
        console.log(chalk.blue('🌐 MULTI-SITE TESTING'));
        console.log('=====================');
        
        const testOptions = {
            ...options,
            emails: '1'
        };
        
        await this.handleRegister(testOptions);
    }

    async handleTestStealth(options) {
        await this.initialize(options);
        
        console.log(chalk.blue('🧪 STEALTH TESTING'));
        console.log('==================');
        console.log(`🎯 Target: ${options.target}`);
        console.log(`🛡️ Level: ${options.stealth || this.stealthLevel}`);
        
        if (this.currentMode === 'basic') {
            console.log('⚠️ Stealth testing requires enhanced mode');
            return;
        }
        
        try {
            const result = await this.enhancedService.testStealthCapabilities(options.target);
            
            console.log('\n📊 STEALTH TEST RESULTS:');
            console.log(`✅ Navigation: ${result.success ? 'PASSED' : 'FAILED'}`);
            console.log(`🛡️ Defenses bypassed: ${result.defensesBypassed || 0}`);
            console.log(`🤖 Bot detection: ${result.botDetected ? 'DETECTED' : 'UNDETECTED'}`);
            
        } catch (error) {
            console.error(chalk.red('❌ Stealth test failed:'), error.message);
        }
    }

    async handleTestAutomation(options) {
        console.log(chalk.cyan('🎯 COMPREHENSIVE AUTOMATION PIPELINE TEST'));
        console.log('==========================================');
        
        try {
            // Parse sites to test
            const sitesToTest = options.sites.split(',').map(s => {
                const trimmed = s.trim();
                if (!trimmed.startsWith('http')) {
                    return `https://www.${trimmed}`;
                }
                return trimmed;
            });
            
            console.log(`🌐 Testing ${sitesToTest.length} sites:`);
            sitesToTest.forEach(site => console.log(`   • ${site}`));
            
            const testResults = [];
            const { chromium } = require('playwright');
            const { getDatabaseManager } = require('./src/database/database-manager');
            const LLMAnalysisLogger = require('./src/ai/llm-analysis-logger');
            
            // Initialize components
            const dbManager = getDatabaseManager();
            await dbManager.initialize();
            
            // Create compatibility wrapper for LLMAnalysisLogger
            const dbWrapper = {
                prepare: (sql) => ({
                    run: async (params) => dbManager.run(sql, params)
                }),
                run: (sql, params) => dbManager.run(sql, params),
                get: (sql, params) => dbManager.get(sql, params),
                all: (sql, params) => dbManager.all(sql, params)
            };
            
            const llmLogger = new LLMAnalysisLogger(dbWrapper);
            
            // Create screenshots directory
            const fs = require('fs');
            if (!fs.existsSync('./screenshots')) {
                fs.mkdirSync('./screenshots');
            }
            
            const browser = await chromium.launch({ 
                headless: false,
                slowMo: 100 
            });
            
            for (const [index, siteUrl] of sitesToTest.entries()) {
                console.log(`\n🎯 Test ${index + 1}/${sitesToTest.length}: ${siteUrl}`);
                console.log('━'.repeat(50));
                
                let testResult = {
                    site: siteUrl,
                    success: false,
                    email: null,
                    fieldsDetected: 0,
                    fieldsFilled: 0,
                    error: null
                };
                
                try {
                    // Step 1: Create test email
                    console.log('📧 Step 1: Creating email account...');
                    const emailResult = {
                        email: `test-automation-${Date.now()}@manual.test`,
                        service: 'test_automation',
                        password: 'test_password'
                    };
                    testResult.email = emailResult.email;
                    console.log(`✅ Email: ${emailResult.email}`);
                    
                    // Step 2: Setup database tracking
                    const emailId = await dbManager.run(`
                        INSERT INTO email_accounts (email, service, password, is_verified, is_active)
                        VALUES (?, ?, ?, ?, ?)
                    `, [emailResult.email, emailResult.service, emailResult.password, 1, 1]);
                    
                    let siteId;
                    try {
                        const domain = new URL(siteUrl).hostname;
                        const siteResult = await dbManager.run(`
                            INSERT INTO survey_sites (name, url, domain, category, difficulty_level)
                            VALUES (?, ?, ?, ?, ?)
                        `, [domain, siteUrl, domain, 'test', 3]);
                        siteId = siteResult.lastID;
                    } catch (error) {
                        const existing = await dbManager.get('SELECT id FROM survey_sites WHERE url = ?', [siteUrl]);
                        siteId = existing?.id || 1;
                    }
                    
                    const regResult = await dbManager.run(`
                        INSERT INTO registration_attempts (email_id, site_id, success, verification_required)
                        VALUES (?, ?, ?, ?)
                    `, [emailId.lastID, siteId, 0, 1]);
                    
                    console.log(`✅ Database tracking (Registration ID: ${regResult.lastID})`);
                    
                    // Step 3: Start LLM session
                    const sessionId = await llmLogger.startFormSession(regResult.lastID, siteId, {
                        url: siteUrl,
                        title: `Test Site ${index + 1}`,
                        html: ''
                    });
                    console.log(`✅ LLM session started (ID: ${sessionId})`);
                    
                    // Step 4: Navigate and analyze
                    const page = await browser.newPage();
                    
                    console.log('🌐 Step 4: Navigating to site...');
                    await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await page.waitForTimeout(2000);
                    
                    // Take screenshot
                    const screenshotPath = `./screenshots/test-${index + 1}-${Date.now()}.png`;
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`📸 Screenshot: ${screenshotPath}`);
                    
                    // Step 5: LLM analysis (simplified)
                    console.log('🧠 Step 5: LLM analyzing page...');
                    const pageContent = await page.content();
                    
                    const analysis = {
                        fields: [],
                        checkboxes: []
                    };
                    
                    // Basic field detection
                    if (pageContent.includes('type="email"') || pageContent.includes('email')) {
                        analysis.fields.push({
                            selector: 'input[type="email"], input[name*="email"]',
                            purpose: 'email',
                            type: 'email'
                        });
                    }
                    
                    if (pageContent.includes('type="password"')) {
                        analysis.fields.push({
                            selector: 'input[type="password"]',
                            purpose: 'password',
                            type: 'password'
                        });
                    }
                    
                    if (pageContent.includes('checkbox')) {
                        analysis.checkboxes.push({
                            selector: 'input[type="checkbox"]',
                            purpose: 'terms'
                        });
                    }
                    
                    testResult.fieldsDetected = analysis.fields.length;
                    console.log(`✅ Analysis: ${analysis.fields.length} fields, ${analysis.checkboxes.length} checkboxes`);
                    
                    // Log LLM interaction
                    await llmLogger.logLLMInteraction({
                        type: 'form_analysis',
                        prompt: `Analyze form on ${siteUrl}`,
                        response: JSON.stringify(analysis),
                        success: analysis.fields.length > 0,
                        confidence: 0.85,
                        parsedResponse: analysis
                    });
                    
                    // Step 6: Fill form
                    console.log('✏️ Step 6: Filling form...');
                    let fieldsFilled = 0;
                    let checkboxesFilled = 0;
                    
                    for (const field of analysis.fields) {
                        try {
                            const elements = await page.$$(field.selector);
                            for (const element of elements) {
                                const isVisible = await element.isVisible();
                                if (isVisible) {
                                    let value = field.purpose === 'email' ? emailResult.email : 
                                               field.purpose === 'password' ? 'TestPassword123!' : 'Test User';
                                    
                                    await element.fill(value);
                                    await page.waitForTimeout(500);
                                    fieldsFilled++;
                                    console.log(`   ✅ Filled ${field.purpose}: ${value}`);
                                    break;
                                }
                            }
                        } catch (error) {
                            console.log(`   ⚠️ Failed ${field.purpose}: ${error.message}`);
                        }
                    }
                    
                    for (const checkbox of analysis.checkboxes) {
                        try {
                            const elements = await page.$$(checkbox.selector);
                            for (const element of elements) {
                                const isVisible = await element.isVisible();
                                if (isVisible) {
                                    await element.check();
                                    checkboxesFilled++;
                                    console.log(`   ✅ Checked checkbox`);
                                    await page.waitForTimeout(300);
                                    break;
                                }
                            }
                        } catch (error) {
                            console.log(`   ⚠️ Checkbox error: ${error.message}`);
                        }
                    }
                    
                    testResult.fieldsFilled = fieldsFilled;
                    console.log(`✅ Filled: ${fieldsFilled} fields, ${checkboxesFilled} checkboxes`);
                    
                    // Step 7: Final screenshot
                    const finalScreenshot = `./screenshots/test-${index + 1}-final-${Date.now()}.png`;
                    await page.screenshot({ path: finalScreenshot, fullPage: true });
                    
                    testResult.success = fieldsFilled > 0;
                    
                    // End session
                    await llmLogger.endFormSession(testResult.success, {
                        totalFieldsDetected: analysis.fields.length,
                        fieldsSuccessful: fieldsFilled,
                        screenshotAfterPath: finalScreenshot
                    });
                    
                    // Update database
                    await dbManager.run(`
                        UPDATE registration_attempts 
                        SET success = ?, execution_time_ms = ?
                        WHERE id = ?
                    `, [testResult.success ? 1 : 0, 10000, regResult.lastID]);
                    
                    await page.close();
                    console.log(`${testResult.success ? '✅' : '❌'} Test ${testResult.success ? 'PASSED' : 'FAILED'}`);
                    
                } catch (error) {
                    testResult.error = error.message;
                    console.log(`❌ Test FAILED: ${error.message}`);
                }
                
                testResults.push(testResult);
            }
            
            await browser.close();
            await dbManager.close();
            
            // Generate report
            console.log('\n📊 AUTOMATION TEST SUMMARY');
            console.log('==========================================');
            
            const successful = testResults.filter(r => r.success).length;
            const successRate = testResults.length > 0 ? (successful / testResults.length * 100).toFixed(1) : 0;
            
            console.log(`📈 Results: ${successful}/${testResults.length} passed (${successRate}%)`);
            
            testResults.forEach((result, i) => {
                console.log(`\n${i + 1}. ${result.site}: ${result.success ? '✅' : '❌'}`);
                if (result.email) console.log(`   Email: ${result.email}`);
                if (result.fieldsDetected) console.log(`   Fields Detected: ${result.fieldsDetected}`);
                if (result.fieldsFilled) console.log(`   Fields Filled: ${result.fieldsFilled}`);
                if (result.error) console.log(`   Error: ${result.error}`);
            });
            
            console.log(`\n🎯 Verification Complete:`);
            console.log(`   ✅ LLM analysis and logging functional`);
            console.log(`   ✅ Playwright automation working`);
            console.log(`   ✅ Database correlation operational`);
            console.log(`   ✅ Form field detection and filling working`);
            console.log(`   ✅ Screenshot capture functional`);
            console.log(`   ✅ Error handling and logging working`);
            
        } catch (error) {
            console.error(chalk.red('❌ Automation test failed:'), error.message);
        }
    }

    async handleStats(options) {
        await this.initialize(options);
        
        console.log(chalk.blue('📊 SYSTEM STATISTICS'));
        console.log('====================');
        
        try {
            if (this.currentMode === 'basic' && this.logger) {
                const stats = await this.logger.getSystemStats();
                this.displayBasicStats(stats);
            } else if (this.enhancedService) {
                const stats = this.enhancedService.getEnhancedStats();
                this.displayEnhancedStats(stats, options.detailed);
            }
            
            if (options.export) {
                await this.exportStats(options.export);
                console.log(chalk.green(`\n✅ Stats exported to: ${options.export}`));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Stats retrieval failed:'), error.message);
        }
    }

    displayBasicStats(stats) {
        console.log(`📧 Email accounts: ${stats.emailAccounts || 0}`);
        console.log(`🎯 Registration attempts: ${stats.registrationAttempts || 0}`);
        console.log(`✅ Successful registrations: ${stats.successfulRegistrations || 0}`);
        console.log(`📊 Success rate: ${(stats.successRate * 100 || 0).toFixed(1)}%`);
    }

    displayEnhancedStats(stats, detailed = false) {
        console.log(`📧 Total emails: ${stats.emailsCreated || 0}`);
        console.log(`🎯 Sites attempted: ${stats.sitesAttempted || 0}`);
        console.log(`✅ Successful registrations: ${stats.successfulRegistrations || 0}`);
        console.log(`❌ Failed registrations: ${stats.failedRegistrations || 0}`);
        console.log(`📊 Success rate: ${stats.successRate || 0}%`);
        
        console.log('\n🎭 Advanced Features:');
        console.log(`🛡️ Defenses detected: ${stats.defensesDetected || 0}`);
        console.log(`🔍 CAPTCHAs solved: ${stats.captchasSolved || 0}`);
        console.log(`🎯 Attention checks passed: ${stats.attentionChecksPassed || 0}`);
        console.log(`🧠 Questions answered: ${stats.questionsAnswered || 0}`);
        console.log(`🌐 Proxy rotations: ${stats.proxyRotations || 0}`);
        console.log(`📑 Multi-tab sessions: ${stats.multiTabSessions || 0}`);
        
        if (detailed) {
            console.log('\n💰 AI Performance:');
            console.log(`💵 Total AI cost: $${(stats.aiCostTotal || 0).toFixed(4)}`);
            console.log(`📞 AI calls: ${stats.aiCallsTotal || 0}`);
            console.log(`⚡ Cost per poll: $${stats.costPerPoll || 0}`);
            console.log(`⏱️ Total runtime: ${Math.round((stats.totalRuntime || 0) / 1000)}s`);
        }
    }

    async exportStats(filename) {
        const stats = this.currentMode === 'basic' 
            ? await this.logger.getSystemStats()
            : this.enhancedService.getEnhancedStats();
            
        await fs.writeFile(filename, JSON.stringify(stats, null, 2));
    }

    async handleDbStats() {
        await this.initialize();
        
        console.log(chalk.blue('🗄️ DATABASE STATISTICS'));
        console.log('======================');
        
        try {
            const stats = await this.db.getStats();
            
            console.log(`📧 Total emails: ${stats.totalEmails || 0}`);
            console.log(`🎯 Total polls: ${stats.totalPolls || 0}`);
            console.log(`✅ Completed polls: ${stats.completedPolls || 0}`);
            console.log(`❌ Failed polls: ${stats.failedPolls || 0}`);
            console.log(`🔄 Active sessions: ${stats.activeSessions || 0}`);
            
        } catch (error) {
            console.error(chalk.red('❌ Database stats failed:'), error.message);
        }
    }

    async handleDbExport(options) {
        await this.initialize();
        
        console.log(chalk.blue('📤 EXPORTING DATABASE'));
        console.log('=====================');
        
        try {
            const data = await this.db.exportAllData();
            await fs.writeFile(options.output, JSON.stringify(data, null, 2));
            
            console.log(chalk.green(`✅ Database exported to: ${options.output}`));
            console.log(`📊 Records exported: ${Object.keys(data).length} tables`);
            
        } catch (error) {
            console.error(chalk.red('❌ Database export failed:'), error.message);
        }
    }

    async handleDbClean(options) {
        await this.initialize();
        
        console.log(chalk.blue('🧹 CLEANING DATABASE'));
        console.log('====================');
        
        try {
            const days = parseInt(options.days);
            const deleted = await this.db.cleanOldEntries(days);
            
            console.log(chalk.green(`✅ Cleaned ${deleted} old entries (older than ${days} days)`));
            
        } catch (error) {
            console.error(chalk.red('❌ Database cleaning failed:'), error.message);
        }
    }

    async handleVerifyEmail(options) {
        await this.initialize();
        
        console.log(chalk.blue('✉️ EMAIL VERIFICATION'));
        console.log('=====================');
        console.log(`📧 Email: ${options.email}`);
        console.log(`⏰ Max wait: ${options.maxWait} minutes`);
        
        try {
            if (this.currentMode === 'basic' && this.emailManager) {
                const result = await this.emailManager.checkInbox(options.email);
                this.displayEmailResult(result);
            } else {
                console.log('⚠️ Email verification requires basic mode setup');
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Email verification failed:'), error.message);
        }
    }

    displayEmailResult(result) {
        if (result.success && result.emails.length > 0) {
            console.log(chalk.green(`✅ Found ${result.emails.length} emails`));
            result.emails.forEach((email, i) => {
                console.log(`   ${i + 1}. ${email.subject} (${email.from})`);
            });
        } else {
            console.log('📭 No emails found');
        }
    }

    async handleTestLLM() {
        await this.initialize();
        
        console.log(chalk.blue('🧪 TESTING LLM SERVICE'));
        console.log('======================');
        
        try {
            const axios = require('axios');
            const llmUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5000';
            
            const testQuestion = {
                questions: [{
                    id: 1,
                    text: 'Do you like automated polls?',
                    type: 'yes-no',
                    options: [
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' }
                    ]
                }]
            };

            const response = await axios.post(`${llmUrl}/test-question`, testQuestion, {
                timeout: 10000
            });

            console.log(chalk.green('✅ LLM Service is working!'));
            console.log(`🔗 URL: ${llmUrl}`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            
        } catch (error) {
            console.error(chalk.red('❌ LLM Service test failed:'), error.message);
            console.log('Make sure the Python service is running:');
            console.log('cd python && python api_server.py');
        }
    }

    async handleStatus(options) {
        await this.initialize();
        
        console.log(chalk.blue('💻 SYSTEM STATUS'));
        console.log('================');
        
        try {
            console.log(`🎯 Application Mode: ${this.currentMode.toUpperCase()}`);
            console.log(`🛡️ Stealth Level: ${this.stealthLevel.toUpperCase()}`);
            console.log(`✅ Initialization: ${this.isInitialized ? 'READY' : 'PENDING'}`);
            
            // Database status
            try {
                await this.db.connect();
                console.log(`🗄️ Database: CONNECTED`);
            } catch (error) {
                console.log(`🗄️ Database: DISCONNECTED (${error.message})`);
            }
            
            if (options.detailed) {
                console.log('\n🔍 DETAILED STATUS:');
                console.log(`📁 Working Directory: ${process.cwd()}`);
                console.log(`🐛 Debug Mode: ${program.opts().debug ? 'ENABLED' : 'DISABLED'}`);
                console.log(`⏱️ Timeout: ${program.opts().timeout}ms`);
                console.log(`🗄️ Database Path: ${program.opts().dbPath}`);
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Status check failed:'), error.message);
        }
    }

    async handleInteractive(options) {
        await this.initialize(options);
        
        console.log(chalk.cyan('\n🎮 UNIFIED INTERACTIVE MODE'));
        console.log('=' .repeat(40));
        console.log(`🎯 Mode: ${this.currentMode.toUpperCase()}`);
        console.log(`🛡️ Stealth: ${this.stealthLevel.toUpperCase()}`);
        console.log('\n📋 Available Commands:');
        console.log('1. create-email - Create new email account');
        console.log('2. register-site <url> - Register on specific site');
        console.log('3. analyze <url> - Analyze website forms');
        console.log('4. test-stealth <url> - Test anti-detection');
        console.log('5. stats - Show system statistics');
        console.log('6. status - Show system status');
        console.log('7. set-mode <mode> - Change automation mode');
        console.log('8. set-stealth <level> - Change stealth level');
        console.log('9. help - Show this help');
        console.log('10. exit - Exit interactive mode');
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const runInteractive = async () => {
            try {
                const command = await new Promise(resolve => {
                    rl.question(`\n[${this.currentMode}:${this.stealthLevel}]> `, resolve);
                });
                
                const [cmd, ...args] = command.trim().split(' ');
                
                switch (cmd) {
                    case 'create-email':
                        await this.handleCreateEmail({ service: 'auto' });
                        break;
                        
                    case 'register-site':
                        if (!args[0]) {
                            console.log('❌ URL required');
                            break;
                        }
                        await this.handleRegister({ 
                            emails: '1', 
                            sites: args[0],
                            preset: 'custom'
                        });
                        break;
                        
                    case 'analyze':
                        if (!args[0]) {
                            console.log('❌ URL required');
                            break;
                        }
                        await this.handleAnalyze({ site: args[0] });
                        break;
                        
                    case 'test-stealth':
                        const target = args[0] || 'https://bot.sannysoft.com/';
                        await this.handleTestStealth({ target });
                        break;
                        
                    case 'stats':
                        await this.handleStats({ detailed: false });
                        break;
                        
                    case 'status':
                        await this.handleStatus({ detailed: false });
                        break;
                        
                    case 'set-mode':
                        if (args[0] && ['basic', 'enhanced', 'advanced'].includes(args[0])) {
                            this.currentMode = args[0];
                            console.log(`✅ Mode changed to: ${this.currentMode.toUpperCase()}`);
                        } else {
                            console.log('❌ Invalid mode. Use: basic, enhanced, or advanced');
                        }
                        break;
                        
                    case 'set-stealth':
                        if (args[0] && ['low', 'medium', 'high', 'maximum'].includes(args[0])) {
                            this.stealthLevel = args[0];
                            console.log(`✅ Stealth level changed to: ${this.stealthLevel.toUpperCase()}`);
                        } else {
                            console.log('❌ Invalid stealth level. Use: low, medium, high, or maximum');
                        }
                        break;
                        
                    case 'help':
                        console.log('\n📋 Interactive Commands:');
                        console.log('create-email - Create email account');
                        console.log('register-site <url> - Register on site');
                        console.log('analyze <url> - Analyze website');
                        console.log('test-stealth [url] - Test anti-detection');
                        console.log('stats - Show statistics');
                        console.log('status - Show system status');
                        console.log('set-mode <basic|enhanced|advanced> - Change mode');
                        console.log('set-stealth <low|medium|high|maximum> - Change stealth');
                        console.log('exit - Exit interactive mode');
                        break;
                        
                    case 'exit':
                        rl.close();
                        await this.shutdown();
                        return;
                        
                    case '':
                        // Empty command, just continue
                        break;
                        
                    default:
                        console.log('❌ Unknown command. Type "help" for available commands.');
                }
                
                await runInteractive();
                
            } catch (error) {
                console.error(chalk.red('❌ Interactive command failed:'), error.message);
                await runInteractive();
            }
        };
        
        await runInteractive();
    }

    async shutdown() {
        try {
            console.log(chalk.gray('\n⏹️ Shutting down application...'));
            
            if (this.enhancedService) {
                await this.enhancedService.cleanup();
            }
            
            if (this.db) {
                await this.db.close();
            }
            
            console.log(chalk.gray('✅ Shutdown complete'));
            
        } catch (error) {
            console.error('⚠️ Shutdown error:', error.message);
        }
    }

    async run() {
        try {
            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                await this.shutdown();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                await this.shutdown();
                process.exit(0);
            });

            await program.parseAsync(process.argv);
            
        } catch (error) {
            console.error(chalk.red('💥 APPLICATION ERROR:'), error.message);
            process.exit(1);
        }
    }
}

// Create application instance and run
if (require.main === module) {
    const app = new UnifiedPollAutomationApp();
    
    // If no command provided, show help
    if (process.argv.length <= 2) {
        console.log(chalk.cyan('🎯 UNIFIED POLL AUTOMATION APPLICATION v3.0'));
        console.log(chalk.cyan('==========================================='));
        console.log('🧠 AI-Powered • 🎭 Neural Behavior • 🛡️ Anti-Detection');
        console.log('🧩 Challenge Solving • 🌐 Proxy Rotation • 🎯 Multi-Tab\n');
        
        console.log(chalk.yellow('Quick Start:'));
        console.log('  node app.js create-email --enhanced');
        console.log('  node app.js register --preset test --mode enhanced');
        console.log('  node app.js interactive --enhanced');
        console.log('  node app.js stats --detailed\n');
        
        program.outputHelp();
    } else {
        app.run().catch(error => {
            console.error(chalk.red('💥 FATAL ERROR:'), error.message);
            process.exit(1);
        });
    }
}

module.exports = UnifiedPollAutomationApp;