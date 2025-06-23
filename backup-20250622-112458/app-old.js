#!/usr/bin/env node
/**
 * Poll Automation Application
 * Complete automated survey registration and completion system
 * 
 * Usage:
 *   node app.js                          # Run complete automation
 *   node app.js --email-only             # Only create email
 *   node app.js --register-only          # Only register (requires existing email)
 *   node app.js --verify-only            # Only verify email
 *   node app.js --complete-surveys       # Only complete surveys
 *   node app.js --target=sitename        # Target specific site
 *   node app.js --headless=false         # Run with visible browser
 */

const { Command } = require('commander');
const CompleteAttackWithDatabase = require('./test-complete-attack-with-db');

class PollAutomationApp {
    constructor() {
        this.program = new Command();
        this.setupCommands();
        this.attackSystem = null;
    }

    setupCommands() {
        this.program
            .name('poll-automation')
            .description('Automated survey registration and completion system')
            .version('1.0.0');

        // Main automation command
        this.program
            .command('run')
            .description('Run complete automation (default)')
            .option('--target <site>', 'Target specific survey site')
            .option('--headless <boolean>', 'Run headless browser', 'true')
            .option('--max-time <minutes>', 'Maximum execution time in minutes', '30')
            .option('--email-service <service>', 'Email service to use (tempmail, tenminute)', 'auto')
            .action(async (options) => {
                await this.runCompleteAutomation(options);
            });

        // Email-only command
        this.program
            .command('create-email')
            .description('Create temporary email account only')
            .option('--service <service>', 'Email service to use', 'auto')
            .action(async (options) => {
                await this.createEmailOnly(options);
            });

        // Registration-only command
        this.program
            .command('register')
            .description('Register on survey site using existing email')
            .requiredOption('--email <email>', 'Email address to use')
            .option('--target <site>', 'Target site name')
            .option('--headless <boolean>', 'Run headless browser', 'true')
            .action(async (options) => {
                await this.registerOnly(options);
            });

        // Verification-only command
        this.program
            .command('verify-email')
            .description('Check and verify email for existing registration')
            .requiredOption('--email <email>', 'Email address to verify')
            .option('--max-wait <minutes>', 'Maximum wait time for verification email', '12')
            .action(async (options) => {
                await this.verifyEmailOnly(options);
            });

        // Survey completion command
        this.program
            .command('complete-surveys')
            .description('Complete surveys on registered sites')
            .requiredOption('--email <email>', 'Email address with registrations')
            .option('--max-surveys <number>', 'Maximum surveys to complete', '5')
            .action(async (options) => {
                await this.completeSurveysOnly(options);
            });

        // Status/report command
        this.program
            .command('status')
            .description('Show application status and statistics')
            .option('--detailed', 'Show detailed report')
            .action(async (options) => {
                await this.showStatus(options);
            });

        // Database management commands
        this.program
            .command('db')
            .description('Database management commands')
            .addCommand(
                new Command('export')
                    .description('Export database to JSON')
                    .option('--output <file>', 'Output file name')
                    .action(async (options) => {
                        await this.exportDatabase(options);
                    })
            )
            .addCommand(
                new Command('clean')
                    .description('Clean old database records')
                    .option('--days <number>', 'Records older than N days', '7')
                    .action(async (options) => {
                        await this.cleanDatabase(options);
                    })
            )
            .addCommand(
                new Command('stats')
                    .description('Show database statistics')
                    .action(async () => {
                        await this.showDatabaseStats();
                    })
            );

        // Default action (run complete automation)
        this.program
            .argument('[command]', 'command to run (optional)', 'run')
            .action(async (command) => {
                if (command === 'run' || !command) {
                    await this.runCompleteAutomation({});
                }
            });
    }

    async runCompleteAutomation(options = {}) {
        console.log('🚀 POLL AUTOMATION APPLICATION - COMPLETE AUTOMATION');
        console.log('=====================================================');
        console.log(`⚔️ Full end-to-end automation starting...`);
        console.log(`📧 Email creation + Registration + Verification + Surveys`);
        console.log(`🗄️ Full database logging enabled`);
        console.log(`⏱️ Maximum execution time: ${options.maxTime || 30} minutes\n`);

        try {
            this.attackSystem = new CompleteAttackWithDatabase();
            
            // Set execution timeout
            const maxTime = parseInt(options.maxTime || 30) * 60 * 1000;
            const timeout = setTimeout(() => {
                console.log(`⏰ TIMEOUT: Automation stopped after ${options.maxTime || 30} minutes`);
                process.exit(1);
            }, maxTime);

            const result = await this.attackSystem.executeCompleteAttack();
            
            clearTimeout(timeout);
            
            console.log('\n✅ COMPLETE AUTOMATION FINISHED');
            console.log('================================');
            this.printResults(result);
            
            return result;
            
        } catch (error) {
            console.error(`💥 AUTOMATION FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async createEmailOnly(options = {}) {
        console.log('📧 EMAIL CREATION MODE');
        console.log('======================');
        
        try {
            this.attackSystem = new CompleteAttackWithDatabase();
            await this.attackSystem.initializeSystems();
            
            console.log(`📨 Creating email account using ${options.service || 'auto'} service...`);
            const emailAccount = await this.attackSystem.createAndLogEmail(options.service);
            
            console.log('\n✅ EMAIL CREATED SUCCESSFULLY');
            console.log('=============================');
            console.log(`📧 Email: ${emailAccount.email}`);
            console.log(`🏷️ Service: ${emailAccount.service}`);
            console.log(`🗄️ Database ID: ${emailAccount.id || 'N/A'}`);
            console.log(`⏱️ Creation time: ${emailAccount.duration || 0}ms`);
            
            await this.attackSystem.cleanup();
            return emailAccount;
            
        } catch (error) {
            console.error(`❌ EMAIL CREATION FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async registerOnly(options) {
        console.log('📝 REGISTRATION MODE');
        console.log('====================');
        console.log(`📧 Using email: ${options.email}`);
        console.log(`🎯 Target: ${options.target || 'auto-selected'}`);
        
        try {
            this.attackSystem = new CompleteAttackWithDatabase();
            await this.attackSystem.initializeSystems();
            
            // Create email account object
            const emailAccount = {
                email: options.email,
                service: 'external',
                status: 'active'
            };
            
            // Select target
            const target = await this.attackSystem.selectAndAnalyzeTarget(options.target);
            
            // Execute registration
            const result = await this.attackSystem.performLoggedRegistration(target, emailAccount);
            
            console.log('\n✅ REGISTRATION COMPLETED');
            console.log('=========================');
            this.printResults(result);
            
            await this.attackSystem.cleanup();
            return result;
            
        } catch (error) {
            console.error(`❌ REGISTRATION FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async verifyEmailOnly(options) {
        console.log('✉️ EMAIL VERIFICATION MODE');
        console.log('==========================');
        console.log(`📧 Email: ${options.email}`);
        console.log(`⏰ Max wait: ${options.maxWait || 12} minutes`);
        
        try {
            this.attackSystem = new CompleteAttackWithDatabase();
            await this.attackSystem.initializeSystems();
            
            const emailAccount = {
                email: options.email,
                service: 'external',
                status: 'active'
            };
            
            const result = await this.attackSystem.handleEmailVerification(emailAccount);
            
            console.log('\n✅ EMAIL VERIFICATION COMPLETED');
            console.log('===============================');
            console.log(`📧 Email found: ${result.emailFound ? 'YES' : 'NO'}`);
            console.log(`✅ Verified: ${result.verified ? 'YES' : 'NO'}`);
            console.log(`📊 Total checks: ${result.totalChecks || 0}`);
            console.log(`⏱️ Time elapsed: ${result.timeElapsed || 0}s`);
            
            if (result.verificationUrl) {
                console.log(`🔗 Verification URL: ${result.verificationUrl}`);
            }
            
            await this.attackSystem.cleanup();
            return result;
            
        } catch (error) {
            console.error(`❌ EMAIL VERIFICATION FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async completeSurveysOnly(options) {
        console.log('📋 SURVEY COMPLETION MODE');
        console.log('=========================');
        console.log(`📧 Email: ${options.email}`);
        console.log(`📊 Max surveys: ${options.maxSurveys || 5}`);
        
        try {
            this.attackSystem = new CompleteAttackWithDatabase();
            await this.attackSystem.initializeSystems();
            
            // In a real implementation, this would find registered sites for the email
            // and complete available surveys
            console.log('📋 Survey completion functionality coming soon...');
            
            await this.attackSystem.cleanup();
            
        } catch (error) {
            console.error(`❌ SURVEY COMPLETION FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async showStatus(options) {
        console.log('📊 POLL AUTOMATION STATUS');
        console.log('=========================');
        
        try {
            const RegistrationLogger = require('./src/database/registration-logger');
            const logger = new RegistrationLogger('./data/complete-attack-system.db');
            await logger.initialize();
            
            const stats = await logger.getRegistrationStats();
            
            console.log('\n📈 OVERALL STATISTICS:');
            console.log(`   🎯 Total registration attempts: ${stats.totalAttempts || 0}`);
            console.log(`   ✅ Successful registrations: ${stats.successfulRegistrations || 0}`);
            console.log(`   📧 Email accounts created: ${stats.emailAccounts || 0}`);
            console.log(`   📊 Success rate: ${stats.successRate || 0}%`);
            
            if (options.detailed) {
                console.log('\n🗄️ DATABASE TABLES:');
                const tables = await logger.runQuery("SELECT name FROM sqlite_master WHERE type='table'");
                for (const table of tables) {
                    const count = await logger.runQuery(`SELECT COUNT(*) as count FROM ${table.name}`);
                    console.log(`   📋 ${table.name}: ${count[0].count} records`);
                }
            }
            
            await logger.close();
            
        } catch (error) {
            console.error(`❌ STATUS CHECK FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async exportDatabase(options) {
        console.log('📤 EXPORTING DATABASE');
        console.log('=====================');
        
        try {
            const RegistrationLogger = require('./src/database/registration-logger');
            const logger = new RegistrationLogger('./data/complete-attack-system.db');
            await logger.initialize();
            
            const outputFile = options.output || `export-${Date.now()}.json`;
            
            // Export all relevant data
            const exportData = {
                timestamp: new Date().toISOString(),
                emailAccounts: await logger.runQuery('SELECT * FROM email_accounts'),
                registrationAttempts: await logger.runQuery('SELECT * FROM registration_attempts'),
                systemEvents: await logger.runQuery('SELECT * FROM system_events ORDER BY timestamp DESC LIMIT 1000'),
                stats: await logger.getRegistrationStats()
            };
            
            const fs = require('fs');
            fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
            
            console.log(`✅ Database exported to: ${outputFile}`);
            console.log(`📊 Records exported: ${Object.keys(exportData).length} tables`);
            
            await logger.close();
            
        } catch (error) {
            console.error(`❌ DATABASE EXPORT FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async cleanDatabase(options) {
        console.log('🧹 CLEANING DATABASE');
        console.log('====================');
        
        try {
            const RegistrationLogger = require('./src/database/registration-logger');
            const logger = new RegistrationLogger('./data/complete-attack-system.db');
            await logger.initialize();
            
            const days = parseInt(options.days || 7);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            console.log(`🗑️ Removing records older than ${days} days (before ${cutoffDate.toISOString()})...`);
            
            // Clean old records
            const result = await logger.runQuery(
                'DELETE FROM system_events WHERE timestamp < ?',
                [cutoffDate.toISOString()]
            );
            
            console.log(`✅ Cleaned ${result.changes || 0} old system events`);
            
            await logger.close();
            
        } catch (error) {
            console.error(`❌ DATABASE CLEANING FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    async showDatabaseStats() {
        console.log('📊 DATABASE STATISTICS');
        console.log('======================');
        
        try {
            const RegistrationLogger = require('./src/database/registration-logger');
            const logger = new RegistrationLogger('./data/complete-attack-system.db');
            await logger.initialize();
            
            // Get table statistics
            const tables = await logger.runQuery("SELECT name FROM sqlite_master WHERE type='table'");
            
            console.log('\n📋 TABLE STATISTICS:');
            for (const table of tables) {
                const count = await logger.runQuery(`SELECT COUNT(*) as count FROM ${table.name}`);
                console.log(`   ${table.name}: ${count[0].count} records`);
            }
            
            // Get recent activity
            const recentEvents = await logger.runQuery(
                'SELECT eventType, COUNT(*) as count FROM system_events WHERE timestamp > datetime("now", "-24 hours") GROUP BY eventType ORDER BY count DESC'
            );
            
            if (recentEvents.length > 0) {
                console.log('\n🕒 RECENT ACTIVITY (24h):');
                for (const event of recentEvents) {
                    console.log(`   ${event.eventType}: ${event.count} times`);
                }
            }
            
            await logger.close();
            
        } catch (error) {
            console.error(`❌ DATABASE STATS FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    printResults(result) {
        if (result && typeof result === 'object') {
            Object.keys(result).forEach(key => {
                console.log(`   ${key}: ${result[key]}`);
            });
        }
    }

    async run() {
        try {
            await this.program.parseAsync(process.argv);
        } catch (error) {
            console.error(`❌ APPLICATION ERROR: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run the application
if (require.main === module) {
    const app = new PollAutomationApp();
    app.run().catch(error => {
        console.error(`💥 FATAL ERROR: ${error.message}`);
        process.exit(1);
    });
}

module.exports = PollAutomationApp;