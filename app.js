#!/usr/bin/env node

/**
 * Poll Automation Application
 * 
 * Professional CLI application for AI-powered form automation
 * Consolidates all functionality into a single, cohesive app
 */

const { Command } = require('commander');
const chalk = require('chalk');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const { chromium } = require('playwright');

const program = new Command();

class PollAutomationApp {
    constructor() {
        this.contentAI = new ContentUnderstandingAI();
        this.formAutomator = new UniversalFormAutomator(this.contentAI, {
            debugMode: false,
            humanLikeDelays: true,
            avoidHoneypots: true
        });
        this.emailManager = new EmailAccountManager();
        this.logger = new RegistrationLogger();
        
        this.setupCommands();
    }

    setupCommands() {
        program
            .name('poll-automation')
            .description('AI-Powered Universal Form Automation System')
            .version('2.0.0');

        // Main automation command
        program
            .command('automate')
            .description('Automated form filling with email creation and verification')
            .option('-s, --site <url>', 'Target website URL')
            .option('-e, --email <email>', 'Use existing email (otherwise creates new)')
            .option('--submit', 'Actually submit the forms (default: false)')
            .option('--headless', 'Run in headless mode')
            .option('-v, --verbose', 'Verbose logging')
            .action(async (options) => {
                await this.runFullAutomation(options);
            });

        // Form analysis command
        program
            .command('analyze')
            .description('Analyze website forms without filling them')
            .option('-s, --site <url>', 'Target website URL', 'https://surveyplanet.com')
            .option('--headless', 'Run in headless mode')
            .action(async (options) => {
                await this.analyzeForm(options);
            });

        // Multi-site testing command
        program
            .command('test-sites')
            .description('Test form automation across multiple websites')
            .option('--quick', 'Run quick test (3 sites)')
            .option('--headless', 'Run in headless mode')
            .action(async (options) => {
                await this.testMultipleSites(options);
            });

        // Email management commands
        program
            .command('email')
            .description('Email account management')
            .addCommand(this.createEmailCommands());

        // Database commands  
        program
            .command('db')
            .description('Database operations')
            .addCommand(this.createDbCommands());

        // Status command
        program
            .command('status')
            .description('Show system status and statistics')
            .option('--detailed', 'Show detailed statistics')
            .action(async (options) => {
                await this.showStatus(options);
            });
    }

    createEmailCommands() {
        const emailCmd = new Command('email');
        
        emailCmd
            .command('create')
            .description('Create a new temporary email account')
            .action(async () => {
                await this.createEmail();
            });

        emailCmd
            .command('list')
            .description('List all created email accounts')
            .action(async () => {
                await this.listEmails();
            });

        emailCmd
            .command('verify <email>')
            .description('Check and verify email inbox')
            .action(async (email) => {
                await this.verifyEmail(email);
            });

        return emailCmd;
    }

    createDbCommands() {
        const dbCmd = new Command('db');
        
        dbCmd
            .command('stats')
            .description('Show database statistics')
            .action(async () => {
                await this.showDbStats();
            });

        dbCmd
            .command('export')
            .description('Export database to JSON')
            .option('-o, --output <file>', 'Output file', 'export.json')
            .action(async (options) => {
                await this.exportDb(options);
            });

        dbCmd
            .command('cleanup')
            .description('Clean up old database entries')
            .option('--days <days>', 'Keep entries newer than X days', '30')
            .action(async (options) => {
                await this.cleanupDb(options);
            });

        return dbCmd;
    }

    async runFullAutomation(options) {
        console.log(chalk.blue('🚀 Starting Full Automation Pipeline'));
        console.log('=====================================');
        
        try {
            // Initialize database
            await this.logger.initialize();
            
            // Step 1: Email setup
            let email;
            if (options.email) {
                email = options.email;
                console.log(`📧 Using existing email: ${email}`);
            } else {
                console.log('📧 Creating new email account...');
                email = await this.emailManager.createAccount();
                console.log(`✅ Created email: ${email.address}`);
                
                // Save to database
                await this.logger.logEmailAccount(email);
            }

            // Step 2: Website automation
            const siteUrl = options.site || 'https://surveyplanet.com';
            console.log(`🌐 Targeting website: ${siteUrl}`);
            
            const browser = await chromium.launch({ 
                headless: options.headless || false,
                slowMo: 50 
            });
            
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            const page = await context.newPage();

            // Navigate to site and find registration
            await page.goto(siteUrl);
            
            // Try common registration paths
            const registrationSelectors = [
                'text=Get started', 'text=Sign up', 'text=Register', 'text=Join',
                '.signup', '#signup', '[href*="signup"]', '[href*="register"]'
            ];
            
            for (const selector of registrationSelectors) {
                try {
                    await page.click(selector, { timeout: 3000 });
                    break;
                } catch (e) {
                    continue;
                }
            }

            // Wait for registration form
            await page.waitForTimeout(2000);

            // Step 3: Form automation
            console.log('🤖 Starting form automation...');
            const userData = {
                email: email.address || email,
                firstName: 'John',
                lastName: 'Smith', 
                fullName: 'John Smith',
                password: 'SecurePass123!',
                phone: '+1-555-123-4567',
                company: 'Test Company'
            };

            const siteName = new URL(siteUrl).hostname;
            const result = await this.formAutomator.autoFillForm(page, userData, siteName, {
                autoSubmit: options.submit || false
            });

            // Log the attempt
            await this.logger.logRegistrationAttempt({
                site: siteName,
                email: email.address || email,
                success: result.success,
                fieldsProcessed: result.fieldsProcessed,
                checkboxesProcessed: result.checkboxesProcessed,
                timestamp: new Date()
            });

            console.log('\n✅ AUTOMATION COMPLETE');
            console.log('=====================');
            console.log(`📊 Success: ${result.success}`);
            console.log(`📝 Fields filled: ${result.fieldsProcessed || 0}`);
            console.log(`☑️ Checkboxes: ${result.checkboxesProcessed || 0}`);

            if (options.submit) {
                console.log('\n📧 Checking for verification emails...');
                // Wait for verification email
                await this.waitAndVerifyEmail(email, 60000);
            }

            // Keep browser open for observation
            if (!options.headless) {
                console.log('\n⏳ Keeping browser open for 10 seconds...');
                await page.waitForTimeout(10000);
            }

            await browser.close();

        } catch (error) {
            console.error(chalk.red(`❌ Automation failed: ${error.message}`));
            if (options.verbose) {
                console.error(error.stack);
            }
        }
    }

    async analyzeForm(options) {
        console.log(chalk.blue('🔍 Form Analysis Mode'));
        console.log('=====================');
        
        const browser = await chromium.launch({ 
            headless: options.headless || false 
        });
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(options.site);
            
            // Try to find registration form
            const registrationSelectors = [
                'text=Get started', 'text=Sign up', 'text=Register'
            ];
            
            for (const selector of registrationSelectors) {
                try {
                    await page.click(selector, { timeout: 3000 });
                    break;
                } catch (e) {
                    continue;
                }
            }

            await page.waitForTimeout(2000);

            const siteName = new URL(options.site).hostname;
            const analysis = await this.formAutomator.analyzeForm(page, siteName);

            console.log('\n📊 FORM ANALYSIS RESULTS');
            console.log('========================');
            console.log(`🎯 Site: ${siteName}`);
            console.log(`📝 Fields found: ${analysis.fields?.length || 0}`);
            console.log(`☑️ Checkboxes: ${analysis.checkboxes?.length || 0}`);
            console.log(`🍯 Honeypots: ${analysis.honeypots?.length || 0}`);
            console.log(`🤖 CAPTCHAs: ${analysis.captchaElements?.length || 0}`);
            console.log(`🎯 Confidence: ${((analysis.confidence || 0) * 100).toFixed(1)}%`);

            if (analysis.fields?.length > 0) {
                console.log('\n📝 DETECTED FIELDS:');
                analysis.fields.forEach((field, i) => {
                    console.log(`   ${i + 1}. ${field.purpose} (${field.selector}) - ${field.type}`);
                });
            }

            if (analysis.honeypots?.length > 0) {
                console.log('\n🍯 HONEYPOTS TO AVOID:');
                analysis.honeypots.forEach((honeypot, i) => {
                    console.log(`   ${i + 1}. ${honeypot.selector} - ${honeypot.reasoning}`);
                });
            }

            await page.waitForTimeout(5000);
            await browser.close();

        } catch (error) {
            console.error(chalk.red(`❌ Analysis failed: ${error.message}`));
            await browser.close();
        }
    }

    async testMultipleSites(options) {
        console.log(chalk.blue('🌐 Multi-Site Testing'));
        console.log('=====================');
        
        const testSites = [
            { name: 'SurveyPlanet', url: 'https://surveyplanet.com', button: 'Get started' },
            { name: 'Typeform', url: 'https://typeform.com', button: 'Get started' },
            { name: 'SurveyMonkey', url: 'https://surveymonkey.com', button: 'Sign up free' }
        ];

        const sitesToTest = options.quick ? testSites.slice(0, 2) : testSites;
        const results = [];

        for (const site of sitesToTest) {
            console.log(`\n🎯 Testing ${site.name}...`);
            
            const browser = await chromium.launch({ 
                headless: options.headless || true 
            });
            
            const page = await browser.newPage();

            try {
                await page.goto(site.url, { timeout: 30000 });
                
                if (site.button) {
                    await page.click(`text=${site.button}`, { timeout: 10000 });
                }

                await page.waitForTimeout(3000);

                const analysis = await this.formAutomator.analyzeForm(page, site.name);
                
                results.push({
                    site: site.name,
                    success: true,
                    fields: analysis.fields?.length || 0,
                    honeypots: analysis.honeypots?.length || 0,
                    confidence: analysis.confidence || 0
                });

                console.log(`   ✅ ${site.name}: ${analysis.fields?.length || 0} fields, ${analysis.honeypots?.length || 0} honeypots`);

            } catch (error) {
                results.push({
                    site: site.name,
                    success: false,
                    error: error.message
                });
                console.log(`   ❌ ${site.name}: ${error.message}`);
            } finally {
                await browser.close();
            }
        }

        console.log('\n📊 FINAL RESULTS');
        console.log('================');
        results.forEach(result => {
            if (result.success) {
                console.log(`✅ ${result.site}: ${result.fields} fields, ${result.honeypots} honeypots`);
            } else {
                console.log(`❌ ${result.site}: ${result.error}`);
            }
        });
    }

    async createEmail() {
        try {
            await this.logger.initialize();
            const email = await this.emailManager.createAccount();
            await this.logger.logEmailAccount(email);
            
            console.log(chalk.green(`✅ Created email: ${email.address}`));
            console.log(`📧 Access URL: ${email.accessUrl}`);
        } catch (error) {
            console.error(chalk.red(`❌ Failed to create email: ${error.message}`));
        }
    }

    async listEmails() {
        try {
            await this.logger.initialize();
            const emails = await this.logger.getEmailAccounts();
            
            if (emails.length === 0) {
                console.log('📭 No email accounts found');
                return;
            }

            console.log(`📧 Found ${emails.length} email accounts:`);
            emails.forEach((email, i) => {
                console.log(`   ${i + 1}. ${email.address} (${email.service})`);
            });
        } catch (error) {
            console.error(chalk.red(`❌ Failed to list emails: ${error.message}`));
        }
    }

    async verifyEmail(email) {
        try {
            console.log(`📧 Checking inbox for: ${email}`);
            const result = await this.emailManager.checkInbox(email);
            
            if (result.success && result.emails.length > 0) {
                console.log(`✅ Found ${result.emails.length} emails`);
                result.emails.forEach((mail, i) => {
                    console.log(`   ${i + 1}. ${mail.subject} (${mail.from})`);
                });
            } else {
                console.log('📭 No emails found');
            }
        } catch (error) {
            console.error(chalk.red(`❌ Failed to verify email: ${error.message}`));
        }
    }

    async showStatus(options) {
        try {
            await this.logger.initialize();
            const stats = await this.logger.getSystemStats();
            
            console.log(chalk.blue('📊 System Status'));
            console.log('================');
            console.log(`📧 Email accounts: ${stats.emailAccounts}`);
            console.log(`🌐 Registration attempts: ${stats.registrationAttempts}`);
            console.log(`✅ Successful registrations: ${stats.successfulRegistrations}`);
            console.log(`📊 Success rate: ${(stats.successRate * 100).toFixed(1)}%`);

            if (options.detailed) {
                console.log('\n🕒 Recent Activity:');
                const recent = await this.logger.getRecentActivity(10);
                recent.forEach(activity => {
                    console.log(`   ${activity.timestamp}: ${activity.action} - ${activity.details}`);
                });
            }
        } catch (error) {
            console.error(chalk.red(`❌ Failed to show status: ${error.message}`));
        }
    }

    async showDbStats() {
        try {
            await this.logger.initialize();
            const tables = await this.logger.getTableStats();
            
            console.log(chalk.blue('🗄️ Database Statistics'));
            console.log('======================');
            Object.entries(tables).forEach(([table, count]) => {
                console.log(`${table}: ${count} records`);
            });
        } catch (error) {
            console.error(chalk.red(`❌ Failed to show database stats: ${error.message}`));
        }
    }

    async exportDb(options) {
        try {
            await this.logger.initialize();
            const data = await this.logger.exportData();
            
            const fs = require('fs');
            fs.writeFileSync(options.output, JSON.stringify(data, null, 2));
            
            console.log(chalk.green(`✅ Database exported to: ${options.output}`));
        } catch (error) {
            console.error(chalk.red(`❌ Failed to export database: ${error.message}`));
        }
    }

    async cleanupDb(options) {
        try {
            await this.logger.initialize();
            const days = parseInt(options.days);
            const deleted = await this.logger.cleanupOldEntries(days);
            
            console.log(chalk.green(`✅ Cleaned up ${deleted} old entries (older than ${days} days)`));
        } catch (error) {
            console.error(chalk.red(`❌ Failed to cleanup database: ${error.message}`));
        }
    }

    async waitAndVerifyEmail(email, timeout = 60000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const result = await this.emailManager.checkInbox(email);
                if (result.success && result.emails.length > 0) {
                    console.log(`✅ Verification email received!`);
                    return result.emails[0];
                }
            } catch (error) {
                // Continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        console.log(`⏰ Timeout waiting for verification email`);
        return null;
    }

    run() {
        program.parse();
    }
}

// Initialize and run the application
if (require.main === module) {
    const app = new PollAutomationApp();
    app.run();
}

module.exports = PollAutomationApp;