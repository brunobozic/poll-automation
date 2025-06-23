#!/usr/bin/env node

/**
 * Unified Poll Automation System
 * Main entry point for the refactored architecture
 * 
 * This replaces the functionality of:
 * - enhanced-app.js
 * - app.js  
 * - enhanced-poll-automation.js
 * - Various CLI scripts
 * 
 * Usage:
 *   node unified-automation.js --config=config/development.json --site="https://example.com"
 *   node unified-automation.js --help
 */

const path = require('path');
const fs = require('fs').promises;

// Import the unified architecture components
const DIContainer = require('./src/core/DIContainer');
const ConfigurationManager = require('./src/config/ConfigurationManager');
const PollAutomationEngine = require('./src/core/PollAutomationEngine');

class UnifiedAutomationApp {
    constructor() {
        this.container = null;
        this.engine = null;
        this.isInitialized = false;
    }

    /**
     * Parse command line arguments
     */
    parseArguments() {
        const args = process.argv.slice(2);
        const options = {
            config: 'config/base.json',
            environment: process.env.NODE_ENV || 'development',
            site: null,
            email: null,
            profile: null,
            headless: null,
            proxy: null,
            debug: false,
            help: false
        };

        for (const arg of args) {
            if (arg.startsWith('--config=')) {
                options.config = arg.split('=')[1];
            } else if (arg.startsWith('--environment=') || arg.startsWith('--env=')) {
                options.environment = arg.split('=')[1];
            } else if (arg.startsWith('--site=')) {
                options.site = arg.split('=')[1];
            } else if (arg.startsWith('--email=')) {
                options.email = arg.split('=')[1];
            } else if (arg.startsWith('--profile=')) {
                options.profile = arg.split('=')[1];
            } else if (arg.startsWith('--headless=')) {
                options.headless = arg.split('=')[1] === 'true';
            } else if (arg.startsWith('--proxy=')) {
                options.proxy = arg.split('=')[1];
            } else if (arg === '--debug') {
                options.debug = true;
            } else if (arg === '--help' || arg === '-h') {
                options.help = true;
            }
        }

        return options;
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log(`
🤖 Unified Poll Automation System

Usage:
  node unified-automation.js [options]

Options:
  --config=<file>        Configuration file path (default: config/base.json)
  --environment=<env>    Environment (development|production|testing)
  --site=<url>           Target site URL to automate
  --email=<email>        Email address to use for registration
  --profile=<file>       User profile JSON file
  --headless=<bool>      Run browser in headless mode (true|false)
  --proxy=<proxy>        Proxy server (http://user:pass@host:port)
  --debug               Enable debug mode
  --help, -h            Show this help message

Examples:
  # Basic usage with development config
  node unified-automation.js --environment=development --site="https://example.com"

  # Production run with proxy
  node unified-automation.js --environment=production --proxy="http://proxy:8080"

  # Testing with custom configuration
  node unified-automation.js --config=config/testing.json --debug

Configuration Files:
  config/base.json         - Base configuration
  config/development.json  - Development environment
  config/production.json   - Production environment  
  config/testing.json      - Testing environment
  config/example.json      - Example with all options

Environment Variables:
  NODE_ENV                 - Environment (development|production|testing)
  PROXY_LIST              - Comma-separated proxy list
  TWOCAPTCHA_API_KEY      - 2captcha API key
  ANTICAPTCHA_API_KEY     - Anti-captcha API key

The system automatically consolidates functionality from:
✅ enhanced-app.js       - Enhanced automation features
✅ app.js               - Basic automation functionality  
✅ enhanced-poll-automation.js - Poll-specific automation
✅ All CLI components   - Command-line interfaces
✅ Stealth systems      - Anti-detection measures
✅ AI integration       - Intelligent automation
✅ Behavioral simulation - Human-like interactions
✅ Proxy management     - Network security
✅ Challenge solving    - CAPTCHA and attention checks
        `);
    }

    /**
     * Initialize the unified automation system
     */
    async initialize(options) {
        if (this.isInitialized) return;

        try {
            console.log('🚀 Initializing Unified Poll Automation System...');
            console.log(`   Environment: ${options.environment}`);
            console.log(`   Configuration: ${options.config}`);

            // Create dependency injection container
            this.container = new DIContainer();

            // Initialize configuration manager
            const configManager = new ConfigurationManager({
                baseConfigPath: options.config,
                environment: options.environment,
                enableWatching: options.environment === 'development'
            });
            await configManager.initialize();

            // Override configuration with command line options
            this.applyCommandLineOverrides(configManager, options);

            // Register configuration in container
            this.container.registerInstance('config', configManager);

            // Create and initialize the main automation engine
            this.engine = new PollAutomationEngine({
                container: this.container,
                config: configManager
            });

            await this.engine.initialize();

            this.isInitialized = true;
            console.log('✅ System initialization complete');

        } catch (error) {
            console.error('❌ System initialization failed:', error.message);
            if (options.debug) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }

    /**
     * Apply command line overrides to configuration
     */
    applyCommandLineOverrides(configManager, options) {
        const overrides = {};

        if (options.headless !== null) {
            overrides['browser.headless'] = options.headless;
        }

        if (options.debug) {
            overrides['logging.level'] = 'debug';
            overrides['workflow.debugMode'] = true;
        }

        if (options.proxy) {
            overrides['network.proxyEnabled'] = true;
            // Parse and set proxy configuration
            // This would be handled by the NetworkSecurityManager
        }

        // Apply overrides
        for (const [key, value] of Object.entries(overrides)) {
            configManager.set(key, value);
        }
    }

    /**
     * Run automation for a specific site
     */
    async runAutomation(siteUrl, emailData, profile) {
        if (!this.isInitialized) {
            throw new Error('System not initialized. Call initialize() first.');
        }

        console.log(`🎯 Starting automation for: ${siteUrl}`);

        try {
            const siteConfig = {
                url: siteUrl,
                name: new URL(siteUrl).hostname
            };

            const result = await this.engine.automateFullWorkflow(siteConfig, emailData, {
                profile: profile
            });

            console.log(`✅ Automation completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            
            if (result.success) {
                console.log(`   Phases: ${result.phases}`);
                console.log(`   Challenges: ${result.challenges}`);
                console.log(`   Forms: ${result.forms}`);
            } else {
                console.log(`   Error: ${result.error}`);
            }

            return result;

        } catch (error) {
            console.error(`❌ Automation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load user profile from file
     */
    async loadProfile(profilePath) {
        try {
            const profileData = await fs.readFile(profilePath, 'utf8');
            return JSON.parse(profileData);
        } catch (error) {
            console.warn(`⚠️ Could not load profile: ${profilePath}`);
            return this.getDefaultProfile();
        }
    }

    /**
     * Get default user profile
     */
    getDefaultProfile() {
        return {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            age: 25,
            gender: 'male',
            zipCode: '10001',
            country: 'US'
        };
    }

    /**
     * Show system status
     */
    async showStatus() {
        if (!this.isInitialized) {
            console.log('❌ System not initialized');
            return;
        }

        try {
            const stats = await this.engine.getSystemStats();
            
            console.log('\n📊 System Status:');
            console.log(`   Browser: ${stats.browser.isInitialized ? '✅ Ready' : '❌ Not Ready'}`);
            console.log(`   Network: ${stats.network.isInitialized ? '✅ Ready' : '❌ Not Ready'}`);
            console.log(`   AI Service: ${stats.ai.isServiceAvailable ? '✅ Available' : '⚠️ Offline'}`);
            console.log(`   Behavior Engine: ${stats.behavior.isInitialized ? '✅ Ready' : '❌ Not Ready'}`);
            console.log(`   Challenge Resolver: ${stats.challenges ? '✅ Ready' : '❌ Not Ready'}`);
            
            if (stats.network.currentProxy) {
                console.log(`   Current Proxy: ${stats.network.currentProxy.host}:${stats.network.currentProxy.port}`);
            }
            
            console.log(`   Total Workflows: ${stats.performance?.totalWorkflows || 0}`);
            console.log(`   Success Rate: ${stats.performance?.successRate || 'N/A'}`);

        } catch (error) {
            console.error('❌ Could not retrieve system status:', error.message);
        }
    }

    /**
     * Test system capabilities
     */
    async testCapabilities() {
        if (!this.isInitialized) {
            console.log('❌ System not initialized');
            return;
        }

        console.log('🧪 Testing system capabilities...');

        try {
            const testResults = await this.engine.testCapabilities();
            
            console.log('\n📋 Test Results:');
            for (const [component, result] of Object.entries(testResults)) {
                const status = result.success ? '✅' : '❌';
                console.log(`   ${component}: ${status} ${result.success ? 'OK' : result.error}`);
            }

        } catch (error) {
            console.error('❌ System testing failed:', error.message);
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.engine) {
            console.log('🧹 Cleaning up system resources...');
            await this.engine.cleanup();
        }
    }
}

/**
 * Main application entry point
 */
async function main() {
    const app = new UnifiedAutomationApp();
    
    // Handle process termination
    process.on('SIGINT', async () => {
        console.log('\n⏹️ Shutting down...');
        await app.cleanup();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n⏹️ Terminating...');
        await app.cleanup();
        process.exit(0);
    });

    try {
        const options = app.parseArguments();

        if (options.help) {
            app.showHelp();
            return;
        }

        // Initialize the system
        await app.initialize(options);

        // If no site specified, show status and exit
        if (!options.site) {
            await app.showStatus();
            console.log('\nℹ️ Specify --site=<url> to run automation or --help for usage information');
            return;
        }

        // Load user profile
        const profile = options.profile ? 
            await app.loadProfile(options.profile) : 
            app.getDefaultProfile();

        // Override email if specified
        if (options.email) {
            profile.email = options.email;
        }

        const emailData = {
            profile: profile,
            email: profile.email
        };

        // Run the automation
        const result = await app.runAutomation(options.site, emailData, profile);

        // Exit with appropriate code
        process.exit(result.success ? 0 : 1);

    } catch (error) {
        console.error('❌ Application error:', error.message);
        process.exit(1);
    }
}

// Run the application if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = UnifiedAutomationApp;