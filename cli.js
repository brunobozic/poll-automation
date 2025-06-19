#!/usr/bin/env node

/**
 * Poll Automation CLI
 * Command-line interface for the survey registration automation application
 */

const PollAutomationApp = require('./src/app');
const { Command } = require('commander');
const readline = require('readline');

const program = new Command();

program
    .name('poll-automation')
    .description('AI-powered survey registration automation system')
    .version('1.0.0');

// Global app instance
let app = null;

// Initialize application
async function initializeApp(options = {}) {
    if (!app) {
        app = new PollAutomationApp({
            headless: !options.gui,
            debugMode: options.debug,
            timeout: options.timeout || 30000,
            dbPath: options.database || './data/poll-automation.db'
        });
        await app.initialize();
    }
    return app;
}

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (app) {
        await app.shutdown();
    }
    process.exit(0);
});

program
    .command('create-email')
    .description('Create a new email account with AI-optimized profile')
    .option('-s, --service <service>', 'email service (guerrilla, tempmail, 10minutemail)', 'auto')
    .option('--gui', 'show browser GUI')
    .option('--debug', 'enable debug mode')
    .action(async (options) => {
        try {
            const app = await initializeApp(options);
            const emailData = await app.createEmailAccount(options.service);
            
            console.log('\n✅ Email Account Created Successfully!');
            console.log('=' .repeat(40));
            console.log(`📧 Email: ${emailData.emailAccount.email}`);
            console.log(`🏢 Service: ${emailData.emailAccount.service}`);
            console.log(`🤖 AI Profile: ${emailData.profile.profileName}`);
            console.log(`📊 Demographics: ${emailData.profile.age}yo ${emailData.profile.gender}, ${emailData.profile.occupation}`);
            console.log(`📍 Location: ${emailData.profile.locationCity}, ${emailData.profile.locationState}`);
            console.log(`🎯 Predicted Yield: ${(emailData.profile.yieldPrediction * 100).toFixed(1)}%`);
            console.log(`⚖️ Balance Score: ${(emailData.profile.demographicBalanceScore * 100).toFixed(1)}%`);
            
            await app.shutdown();
        } catch (error) {
            console.error('❌ Failed to create email:', error.message);
            process.exit(1);
        }
    });

program
    .command('register')
    .description('Attempt registration on survey sites')
    .option('-e, --emails <count>', 'number of email accounts to create', '1')
    .option('-s, --sites <sites>', 'comma-separated list of site URLs')
    .option('--preset <preset>', 'use predefined site list (test, real, all)', 'test')
    .option('--gui', 'show browser GUI')
    .option('--debug', 'enable debug mode')
    .action(async (options) => {
        try {
            const app = await initializeApp(options);
            
            // Define site presets
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
                all: [
                    { name: 'Local Survey Site', url: 'http://localhost:3001/register', category: 'test' },
                    { name: 'HTTPBin Forms', url: 'https://httpbin.org/forms/post', category: 'test' },
                    { name: 'RewardingWays', url: 'https://www.rewardingways.com/register', category: 'survey' },
                    { name: 'PaidViewpoint', url: 'https://paidviewpoint.com/?r=register', category: 'survey' }
                ]
            };
            
            let sites = [];
            
            if (options.sites) {
                // Parse custom sites
                const urls = options.sites.split(',');
                sites = urls.map((url, index) => ({
                    name: `Custom Site ${index + 1}`,
                    url: url.trim(),
                    category: 'custom'
                }));
            } else {
                // Use preset
                sites = sitePresets[options.preset] || sitePresets.test;
            }
            
            const emailCount = parseInt(options.emails);
            
            console.log(`\n🚀 REGISTRATION CAMPAIGN`);
            console.log('=' .repeat(30));
            console.log(`📧 Emails: ${emailCount}`);
            console.log(`🎯 Sites: ${sites.length}`);
            console.log(`📋 Preset: ${options.preset}`);
            
            // Confirm with user for real sites
            if (options.preset === 'real' || options.preset === 'all') {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                
                const confirm = await new Promise(resolve => {
                    rl.question('\n⚠️ This will attempt registration on real sites. Continue? (y/N): ', resolve);
                });
                
                rl.close();
                
                if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
                    console.log('❌ Campaign cancelled');
                    await app.shutdown();
                    return;
                }
            }
            
            // Run campaign
            const results = await app.runCampaign(sites, emailCount);
            
            await app.shutdown();
            
        } catch (error) {
            console.error('❌ Registration campaign failed:', error.message);
            process.exit(1);
        }
    });

program
    .command('query')
    .description('Query correlation data')
    .option('-t, --type <type>', 'query type (email_failures, email_successes, site_emails, email_metrics)', 'email_failures')
    .option('-p, --parameter <param>', 'query parameter (email address or site name)')
    .action(async (options) => {
        try {
            const app = await initializeApp();
            
            if (!options.parameter) {
                console.error('❌ Parameter required. Use -p to specify email or site name.');
                process.exit(1);
            }
            
            const result = await app.queryData(options.type, options.parameter);
            
            console.log(`\n📊 Query returned ${Array.isArray(result) ? result.length : 1} records`);
            
            await app.shutdown();
            
        } catch (error) {
            console.error('❌ Query failed:', error.message);
            process.exit(1);
        }
    });

program
    .command('stats')
    .description('Display database statistics')
    .action(async (options) => {
        try {
            const app = await initializeApp();
            
            console.log('\n📊 DATABASE STATISTICS');
            console.log('=' .repeat(30));
            
            // Get email count
            const emails = await app.logger.allQuery('SELECT COUNT(*) as count FROM email_accounts');
            console.log(`📧 Total emails: ${emails[0].count}`);
            
            // Get registration attempts
            const attempts = await app.logger.allQuery('SELECT COUNT(*) as count FROM registration_attempts');
            console.log(`🎯 Total attempts: ${attempts[0].count}`);
            
            // Get success rate
            const successes = await app.logger.allQuery('SELECT COUNT(*) as count FROM registration_attempts WHERE success = 1');
            const successRate = attempts[0].count > 0 ? (successes[0].count / attempts[0].count * 100).toFixed(1) : 0;
            console.log(`✅ Success rate: ${successRate}%`);
            
            // Get sites
            const sites = await app.logger.allQuery('SELECT COUNT(*) as count FROM survey_sites');
            console.log(`🌐 Sites visited: ${sites[0].count}`);
            
            // Get defenses
            const defenses = await app.logger.allQuery('SELECT COUNT(*) as count FROM site_defenses');
            console.log(`🛡️ Defenses detected: ${defenses[0].count}`);
            
            // Get questions
            const questions = await app.logger.allQuery('SELECT COUNT(*) as count FROM registration_questions');
            console.log(`📝 Questions answered: ${questions[0].count}`);
            
            await app.shutdown();
            
        } catch (error) {
            console.error('❌ Stats query failed:', error.message);
            process.exit(1);
        }
    });

program
    .command('interactive')
    .description('Start interactive mode')
    .option('--gui', 'show browser GUI')
    .option('--debug', 'enable debug mode')
    .action(async (options) => {
        try {
            const app = await initializeApp(options);
            
            console.log('\n🎯 POLL AUTOMATION - INTERACTIVE MODE');
            console.log('=' .repeat(40));
            console.log('Available commands:');
            console.log('1. create-email - Create new email account');
            console.log('2. register-site <url> - Register on specific site');
            console.log('3. query <type> <param> - Query correlation data');
            console.log('4. stats - Show statistics');
            console.log('5. exit - Exit interactive mode');
            
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const runInteractive = async () => {
                const command = await new Promise(resolve => {
                    rl.question('\n> ', resolve);
                });
                
                const [cmd, ...args] = command.trim().split(' ');
                
                switch (cmd) {
                    case 'create-email':
                        const emailData = await app.createEmailAccount();
                        console.log(`✅ Created: ${emailData.emailAccount.email} (${emailData.profile.profileName})`);
                        break;
                        
                    case 'register-site':
                        if (!args[0]) {
                            console.log('❌ URL required');
                            break;
                        }
                        
                        // Use the last created email or create a new one
                        const lastEmail = await app.logger.getQuery('SELECT * FROM email_accounts ORDER BY created_at DESC LIMIT 1');
                        let emailData_reg;
                        
                        if (lastEmail) {
                            const profile = app.optimizer.generateOptimalProfile();
                            profile.email = lastEmail.email;
                            emailData_reg = {
                                emailAccount: lastEmail,
                                profile,
                                emailId: lastEmail.id
                            };
                        } else {
                            emailData_reg = await app.createEmailAccount();
                        }
                        
                        const result = await app.attemptSiteRegistration(emailData_reg, {
                            name: 'Interactive Site',
                            url: args[0],
                            category: 'interactive'
                        });
                        
                        console.log(`${result.success ? '✅' : '❌'} Registration ${result.success ? 'successful' : 'failed'}`);
                        if (result.errorMessage) console.log(`   ${result.errorMessage}`);
                        break;
                        
                    case 'query':
                        if (!args[0] || !args[1]) {
                            console.log('❌ Query type and parameter required');
                            break;
                        }
                        await app.queryData(args[0], args[1]);
                        break;
                        
                    case 'stats':
                        // Quick stats
                        const totalEmails = await app.logger.allQuery('SELECT COUNT(*) as count FROM email_accounts');
                        const totalAttempts = await app.logger.allQuery('SELECT COUNT(*) as count FROM registration_attempts');
                        console.log(`📊 Emails: ${totalEmails[0].count}, Attempts: ${totalAttempts[0].count}`);
                        break;
                        
                    case 'exit':
                        rl.close();
                        await app.shutdown();
                        return;
                        
                    default:
                        console.log('❌ Unknown command. Type "exit" to quit.');
                }
                
                await runInteractive();
            };
            
            await runInteractive();
            
        } catch (error) {
            console.error('❌ Interactive mode failed:', error.message);
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}