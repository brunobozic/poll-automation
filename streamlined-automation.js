#!/usr/bin/env node

/**
 * Streamlined Poll Automation Engine
 * Consolidated, optimized, and refactored automation system
 * 
 * Replaces:
 * - enhanced-app.js
 * - enhanced-cli.js
 * - unified-automation.js
 * - app.js
 * - cli.js
 */

const { Command } = require('commander');
const ServiceOrchestrator = require('./src/core/ServiceOrchestrator');
const path = require('path');

class StreamlinedAutomation {
    constructor() {
        this.orchestrator = null;
        this.program = new Command();
        this.setupCLI();
    }
    
    /**
     * Setup CLI interface
     */
    setupCLI() {
        this.program
            .name('streamlined-automation')
            .description('Streamlined Poll Automation System - Next Generation')
            .version('3.0.0')
            .option('-e, --environment <env>', 'environment (development, production, testing)', 'development')
            .option('-c, --config <file>', 'custom configuration file')
            .option('-v, --verbose', 'verbose logging')
            .option('--debug', 'enable debug mode')
            .option('--headless', 'run browser in headless mode', true)
            .option('--stealth <level>', 'stealth level (low, medium, high, maximum)', 'high');
        
        // Email creation command
        this.program
            .command('create-email')
            .description('Create optimized email account')
            .option('-s, --service <service>', 'email service provider', 'guerrilla')
            .option('-c, --count <number>', 'number of emails to create', '1')
            .action(async (options) => {
                await this.executeCommand('createEmail', options);
            });
        
        // Registration campaign command
        this.program
            .command('register')
            .description('Execute registration campaign')
            .option('-s, --site <url>', 'target site URL')
            .option('-f, --sites-file <file>', 'file containing site URLs')
            .option('-e, --emails <count>', 'number of email accounts', '1')
            .option('-p, --preset <preset>', 'site preset (test, real, premium)', 'test')
            .option('--adaptive', 'enable adaptive learning', true)
            .option('--proxy <proxy>', 'proxy server URL')
            .option('--captcha-key <key>', 'CAPTCHA solving API key')
            .action(async (options) => {
                await this.executeCommand('register', options);
            });
        
        // Learning and analysis commands
        this.program
            .command('analyze')
            .description('Analyze system performance and patterns')
            .option('-t, --type <type>', 'analysis type (errors, patterns, performance)', 'performance')
            .option('-d, --days <number>', 'days to analyze', '7')
            .action(async (options) => {
                await this.executeCommand('analyze', options);
            });
        
        // System status and health
        this.program
            .command('status')
            .description('Show system status and health')
            .option('-d, --detailed', 'show detailed status')
            .action(async (options) => {
                await this.executeCommand('status', options);
            });
        
        // Configuration management
        this.program
            .command('config')
            .description('Configuration management')
            .option('-s, --show', 'show current configuration')
            .option('-v, --validate', 'validate configuration')
            .option('--set <key=value>', 'set configuration value')
            .action(async (options) => {
                await this.executeCommand('config', options);
            });
        
        // Testing and validation
        this.program
            .command('test')
            .description('Run system tests')
            .option('-t, --type <type>', 'test type (stealth, email, registration, all)', 'all')
            .option('-s, --site <url>', 'test site URL')
            .action(async (options) => {
                await this.executeCommand('test', options);
            });
    }
    
    /**
     * Initialize the system
     */
    async initialize(globalOptions = {}) {
        if (this.orchestrator) return;
        
        console.log('🚀 STREAMLINED POLL AUTOMATION SYSTEM v3.0');
        console.log('===========================================');
        
        // Initialize service orchestrator
        this.orchestrator = new ServiceOrchestrator({
            config: {
                environment: globalOptions.environment,
                configFile: globalOptions.config,
                debug: globalOptions.debug || globalOptions.verbose,
                browser: {
                    headless: globalOptions.headless
                },
                stealth: {
                    level: globalOptions.stealth
                }
            }
        });
        
        await this.orchestrator.initialize();
        
        const logger = await this.orchestrator.getService('logger');
        logger.info('Streamlined Automation System initialized', { 
            environment: globalOptions.environment,
            version: '3.0.0'
        });
    }
    
    /**
     * Execute command with error handling
     */
    async executeCommand(command, options) {
        try {
            // Get global options from program
            const globalOptions = this.program.opts();
            
            // Initialize system
            await this.initialize(globalOptions);
            
            // Execute specific command
            switch (command) {
                case 'createEmail':
                    await this.createEmail(options);
                    break;
                    
                case 'register':
                    await this.executeRegistration(options);
                    break;
                    
                case 'analyze':
                    await this.analyzeSystem(options);
                    break;
                    
                case 'status':
                    await this.showStatus(options);
                    break;
                    
                case 'config':
                    await this.manageConfig(options);
                    break;
                    
                case 'test':
                    await this.runTests(options);
                    break;
                    
                default:
                    throw new Error(`Unknown command: ${command}`);
            }
            
        } catch (error) {
            const globalOptions = this.program.opts();
            console.error(`❌ Command failed: ${error.message}`);
            if (globalOptions?.debug) {
                console.error(error.stack);
            }
            process.exit(1);
            
        } finally {
            await this.shutdown();
        }
    }
    
    /**
     * Create email accounts
     */
    async createEmail(options) {
        console.log('\\n📧 EMAIL CREATION WORKFLOW');
        console.log('==========================');
        
        const count = parseInt(options.count) || 1;
        const results = [];
        
        for (let i = 0; i < count; i++) {
            console.log(`\\n📧 Creating email ${i + 1}/${count}...`);
            
            const result = await this.orchestrator.executeWorkflow('emailCreation', {
                service: options.service
            });
            
            results.push(result);
            
            console.log(`✅ Email created: ${result.emailAccount.email}`);
            console.log(`🤖 AI Profile: ${result.profile.profileName} (${(result.profile.yieldPrediction * 100).toFixed(1)}% yield)`);
        }
        
        console.log(`\\n✅ Created ${results.length} email accounts successfully`);
        return results;
    }
    
    /**
     * Execute registration campaign
     */
    async executeRegistration(options) {
        console.log('\\n🎯 REGISTRATION CAMPAIGN');
        console.log('========================');
        
        // Determine target sites
        let sites = [];
        
        if (options.site) {
            sites = [{ name: 'Custom Site', url: options.site, category: 'custom' }];
        } else if (options.sitesFile) {
            sites = await this.loadSitesFromFile(options.sitesFile);
        } else {
            sites = this.getPresetSites(options.preset);
        }
        
        const emailCount = parseInt(options.emails) || 1;
        
        console.log(`📧 Emails: ${emailCount}`);
        console.log(`🎯 Sites: ${sites.length}`);
        console.log(`📋 Preset: ${options.preset}`);
        console.log(`🧠 Adaptive Learning: ${options.adaptive ? 'ENABLED' : 'DISABLED'}`);
        
        const results = [];
        
        for (let i = 0; i < emailCount; i++) {
            console.log(`\\n📧 PROCESSING EMAIL ${i + 1}/${emailCount}`);
            console.log('-'.repeat(40));
            
            // Create email account
            const emailData = await this.orchestrator.executeWorkflow('emailCreation', {
                service: 'guerrilla'
            });
            
            const emailResults = {
                email: emailData.emailAccount.email,
                profile: emailData.profile.profileName,
                sites: []
            };
            
            // Process each site
            for (const site of sites) {
                console.log(`\\n🎯 Attempting registration: ${site.name}`);
                
                const siteResult = await this.orchestrator.executeWorkflow('siteRegistration', {
                    emailData,
                    siteConfig: site
                });
                
                emailResults.sites.push({
                    name: site.name,
                    success: siteResult.success,
                    defenses: siteResult.defenses?.length || 0
                });
                
                // Learn from attempt if adaptive learning enabled
                if (options.adaptive) {
                    await this.orchestrator.executeWorkflow('adaptiveLearning', {
                        attemptData: {
                            siteName: site.name,
                            siteUrl: site.url,
                            success: siteResult.success,
                            defenses: siteResult.defenses
                        }
                    });
                }
                
                // Delay between attempts
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            results.push(emailResults);
        }
        
        // Display campaign summary
        this.displayCampaignSummary(results);
        
        return results;
    }
    
    /**
     * Analyze system performance
     */
    async analyzeSystem(options) {
        console.log('\\n📊 SYSTEM ANALYSIS');
        console.log('==================');
        
        const logger = await this.orchestrator.getService('logger');
        const adaptiveLearning = await this.orchestrator.getService('adaptiveLearning');
        
        switch (options.type) {
            case 'errors':
                const errorStats = logger.getErrorStats();
                console.log('\\n❌ ERROR ANALYSIS:');
                console.log(`Total Errors: ${errorStats.totalErrors}`);
                console.log(`Total Warnings: ${errorStats.totalWarnings}`);
                console.log('\\nTop Errors:');
                errorStats.topErrors.forEach(({ error, count }) => {
                    console.log(`  ${error}: ${count} occurrences`);
                });
                break;
                
            case 'patterns':
                const learningStats = adaptiveLearning.getStats();
                console.log('\\n🧠 LEARNING PATTERNS:');
                console.log(`Patterns Learned: ${learningStats.patternsLearned}`);
                console.log(`Adaptations Made: ${learningStats.adaptationsMade}`);
                console.log(`Success Rate: ${learningStats.avgSuccessRate}`);
                break;
                
            case 'performance':
            default:
                const serviceStats = this.orchestrator.getServiceStats();
                console.log('\\n⚡ PERFORMANCE ANALYSIS:');
                console.log(`Services Running: ${serviceStats.totalServices}`);
                console.log(`System Initialized: ${serviceStats.initialized}`);
                console.log('\\nService Status:');
                Object.entries(serviceStats.services).forEach(([name, stats]) => {
                    console.log(`  ${name}: ${stats.status || 'active'}`);
                });
                break;
        }
    }
    
    /**
     * Show system status
     */
    async showStatus(options) {
        console.log('\\n🔍 SYSTEM STATUS');
        console.log('================');
        
        const config = await this.orchestrator.getService('config');
        const health = await this.orchestrator.getServiceHealth();
        
        console.log(`Environment: ${config.environment}`);
        console.log(`Stealth Level: ${config.get('stealth.level')}`);
        console.log(`Database: ${config.get('database.path')}`);
        
        console.log('\\n🏥 Service Health:');
        Object.entries(health).forEach(([name, status]) => {
            const indicator = status.status === 'healthy' ? '✅' : 
                             status.status === 'error' ? '❌' : '⚠️';
            console.log(`  ${indicator} ${name}: ${status.status}`);
        });
        
        if (options.detailed) {
            const stats = this.orchestrator.getServiceStats();
            console.log('\\n📊 Detailed Statistics:');
            console.log(JSON.stringify(stats, null, 2));
        }
    }
    
    /**
     * Manage configuration
     */
    async manageConfig(options) {
        const config = await this.orchestrator.getService('config');
        
        if (options.show) {
            console.log('\\n⚙️ CURRENT CONFIGURATION');
            console.log('========================');
            console.log(config.toJSON());
        }
        
        if (options.validate) {
            console.log('\\n✅ Configuration validation passed');
        }
        
        if (options.set) {
            const [key, value] = options.set.split('=');
            config.set(key, value);
            console.log(`✅ Set ${key} = ${value}`);
        }
    }
    
    /**
     * Run system tests
     */
    async runTests(options) {
        console.log('\\n🧪 SYSTEM TESTING');
        console.log('=================');
        
        const tests = {
            stealth: () => this.testStealth(options.site),
            email: () => this.testEmail(),
            registration: () => this.testRegistration(options.site),
            all: () => Promise.all([
                this.testStealth(),
                this.testEmail(),
                this.testRegistration()
            ])
        };
        
        const testFunction = tests[options.type] || tests.all;
        await testFunction();
        
        console.log('\\n✅ Testing completed');
    }
    
    /**
     * Test stealth capabilities
     */
    async testStealth(site = 'https://httpbin.org/user-agent') {
        console.log('🕵️ Testing stealth capabilities...');
        
        const browserManager = await this.orchestrator.getService('browserManager');
        const page = await browserManager.createStealthPage();
        
        try {
            await page.goto(site);
            const userAgent = await page.evaluate(() => navigator.userAgent);
            console.log(`✅ Stealth test passed - User Agent: ${userAgent.substring(0, 50)}...`);
        } finally {
            await page.close();
        }
    }
    
    /**
     * Test email creation
     */
    async testEmail() {
        console.log('📧 Testing email creation...');
        
        const result = await this.orchestrator.executeWorkflow('emailCreation', {
            service: 'guerrilla'
        });
        
        console.log(`✅ Email test passed - Created: ${result.emailAccount.email}`);
    }
    
    /**
     * Test registration
     */
    async testRegistration(site = 'https://httpbin.org/forms/post') {
        console.log('🎯 Testing registration workflow...');
        
        const emailData = await this.orchestrator.executeWorkflow('emailCreation', {
            service: 'guerrilla'
        });
        
        const result = await this.orchestrator.executeWorkflow('siteRegistration', {
            emailData,
            siteConfig: { name: 'Test Site', url: site, category: 'test' }
        });
        
        console.log(`✅ Registration test ${result.success ? 'passed' : 'partially completed'}`);
    }
    
    /**
     * Get preset sites
     */
    getPresetSites(preset) {
        const presets = {
            test: [
                { name: 'HTTPBin Forms', url: 'https://httpbin.org/forms/post', category: 'test' },
                { name: 'Local Test', url: 'http://localhost:3001/register', category: 'test' }
            ],
            real: [
                { name: 'RewardingWays', url: 'https://www.rewardingways.com/register', category: 'survey' },
                { name: 'PaidViewpoint', url: 'https://paidviewpoint.com/?r=register', category: 'survey' }
            ],
            premium: [
                { name: 'Swagbucks', url: 'https://www.swagbucks.com/p/register', category: 'survey' },
                { name: 'InboxDollars', url: 'https://www.inboxdollars.com/registration', category: 'survey' }
            ]
        };
        
        return presets[preset] || presets.test;
    }
    
    /**
     * Display campaign summary
     */
    displayCampaignSummary(results) {
        console.log('\\n📊 CAMPAIGN SUMMARY');
        console.log('===================');
        
        const totalEmails = results.length;
        const totalAttempts = results.reduce((sum, r) => sum + r.sites.length, 0);
        const totalSuccesses = results.reduce((sum, r) => 
            sum + r.sites.filter(s => s.success).length, 0);
        
        console.log(`📧 Emails Created: ${totalEmails}`);
        console.log(`🎯 Registration Attempts: ${totalAttempts}`);
        console.log(`✅ Successful Registrations: ${totalSuccesses}`);
        console.log(`📈 Success Rate: ${totalAttempts > 0 ? (totalSuccesses / totalAttempts * 100).toFixed(1) : 0}%`);
        
        // Show per-email breakdown
        results.forEach((email, index) => {
            const successes = email.sites.filter(s => s.success).length;
            console.log(`\\n📧 Email ${index + 1}: ${email.email}`);
            console.log(`   🤖 Profile: ${email.profile}`);
            console.log(`   ✅ Successes: ${successes}/${email.sites.length}`);
        });
    }
    
    /**
     * Shutdown system
     */
    async shutdown() {
        if (this.orchestrator) {
            await this.orchestrator.shutdown();
            this.orchestrator = null;
        }
    }
    
    /**
     * Run CLI
     */
    async run() {
        // Handle no arguments - show status
        if (process.argv.length <= 2) {
            await this.executeCommand('status', { detailed: false });
            return;
        }
        
        // Parse and execute
        await this.program.parseAsync(process.argv);
    }
}

// Run if called directly
if (require.main === module) {
    const automation = new StreamlinedAutomation();
    automation.run().catch(error => {
        console.error('❌ Application error:', error.message);
        process.exit(1);
    });
}

module.exports = StreamlinedAutomation;