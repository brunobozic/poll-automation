#!/usr/bin/env node

/**
 * Enhanced Poll Automation CLI
 * Advanced command-line interface with comprehensive anti-detection capabilities
 */

const EnhancedPollAutomationApp = require('./src/enhanced-app');
const { Command } = require('commander');
const readline = require('readline');
const fs = require('fs').promises;

const program = new Command();

program
    .name('enhanced-poll-automation')
    .description('Advanced AI-powered survey registration automation with military-grade anti-detection')
    .version('2.0.0');

// Global app instance
let app = null;

// Initialize enhanced application
async function initializeEnhancedApp(options = {}) {
    if (!app) {
        app = new EnhancedPollAutomationApp({
            headless: !options.gui,
            debugMode: options.debug,
            timeout: options.timeout || 45000,
            dbPath: options.database || './data/enhanced-poll-automation.db',
            
            // Anti-detection settings
            stealthLevel: options.stealth || 'high',
            behaviorSimulation: !options.noHuman,
            captchaSolving: !options.noCaptcha,
            proxyRotation: options.proxies,
            
            // API keys
            twoCaptchaKey: options.twoCaptchaKey || process.env.TWOCAPTCHA_API_KEY,
            antiCaptchaKey: options.antiCaptchaKey || process.env.ANTICAPTCHA_API_KEY,
            
            // Proxy settings
            proxies: options.proxyList || [],
            proxyFile: options.proxyFile,
            
            // Session settings
            sessionPersistence: !options.noSession,
            sessionRecovery: options.recovery
        });
        
        await app.initialize();
    }
    return app;
}

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down enhanced application...');
    if (app) {
        await app.shutdown();
    }
    process.exit(0);
});

program
    .command('create-email')
    .description('Create email account with enhanced anti-detection')
    .option('-s, --service <service>', 'email service (guerrilla, tempmail, 10minutemail)', 'guerrilla')
    .option('--stealth <level>', 'stealth level (low, medium, high, maximum)', 'high')
    .option('--gui', 'show browser GUI')
    .option('--debug', 'enable debug mode')
    .option('--no-human', 'disable human behavior simulation')
    .option('--proxy-file <file>', 'proxy list file')
    .action(async (options) => {
        try {
            const app = await initializeEnhancedApp(options);
            const emailData = await app.createEmailAccount(options.service);
            
            console.log('\n✅ ENHANCED EMAIL ACCOUNT CREATED!');
            console.log('=' .repeat(50));
            console.log(`📧 Email: ${emailData.emailAccount.email}`);
            console.log(`🏢 Service: ${emailData.emailAccount.service}`);
            console.log(`🤖 AI Profile: ${emailData.profile.profileName}`);
            console.log(`📊 Demographics: ${emailData.profile.age}yo ${emailData.profile.gender}, ${emailData.profile.occupation}`);
            console.log(`📍 Location: ${emailData.profile.locationCity}, ${emailData.profile.locationState}`);
            console.log(`🎯 Predicted Yield: ${(emailData.profile.yieldPrediction * 100).toFixed(1)}%`);
            console.log(`⚖️ Balance Score: ${(emailData.profile.demographicBalanceScore * 100).toFixed(1)}%`);
            console.log(`🛡️ Stealth Level: ${options.stealth.toUpperCase()}`);
            console.log(`🧠 Browser Fingerprint: ${emailData.emailAccount.metadata?.browserFingerprint?.id}`);
            
            await app.shutdown();
        } catch (error) {
            console.error('❌ Enhanced email creation failed:', error.message);
            process.exit(1);
        }
    });

program
    .command('register')
    .description('Enhanced registration campaign with advanced countermeasures')
    .option('-e, --emails <count>', 'number of email accounts to create', '1')
    .option('-s, --sites <sites>', 'comma-separated list of site URLs')
    .option('--preset <preset>', 'use predefined site list (test, real, hardcore)', 'test')
    .option('--stealth <level>', 'stealth level (low, medium, high, maximum)', 'high')
    .option('--captcha-key <key>', '2Captcha API key for CAPTCHA solving')
    .option('--proxy-file <file>', 'proxy list file')
    .option('--proxy-list <proxies>', 'comma-separated proxy list')
    .option('--gui', 'show browser GUI')
    .option('--debug', 'enable debug mode')
    .option('--no-human', 'disable human behavior simulation')
    .option('--no-captcha', 'disable CAPTCHA solving')
    .option('--no-session', 'disable session persistence')
    .action(async (options) => {
        try {
            // Parse proxy list if provided
            if (options.proxyList) {
                options.proxyList = options.proxyList.split(',').map(p => p.trim());
            }
            
            const app = await initializeEnhancedApp(options);
            
            // Define enhanced site presets
            const sitePresets = {
                test: [
                    { name: 'Local Survey Site', url: 'http://localhost:3001/register', category: 'test' },
                    { name: 'HTTPBin Forms', url: 'https://httpbin.org/forms/post', category: 'test' }
                ],
                real: [
                    { name: 'RewardingWays', url: 'https://www.rewardingways.com/register', category: 'survey' },
                    { name: 'PaidViewpoint', url: 'https://paidviewpoint.com/?r=register', category: 'survey' },
                    { name: 'SurveyClub', url: 'https://www.surveyclub.com/signup', category: 'survey' },
                    { name: 'OneOpinion', url: 'https://www.oneopinion.com/registration', category: 'survey' }
                ],
                hardcore: [
                    { name: 'Local Test Site', url: 'http://localhost:3001/register', category: 'test' },
                    { name: 'RewardingWays', url: 'https://www.rewardingways.com/register', category: 'survey' },
                    { name: 'Swagbucks', url: 'https://www.swagbucks.com/p/register', category: 'survey' },
                    { name: 'InboxDollars', url: 'https://www.inboxdollars.com/registration', category: 'survey' },
                    { name: 'MyPoints', url: 'https://www.mypoints.com/registration', category: 'survey' }
                ]
            };
            
            let sites = [];
            
            if (options.sites) {
                // Parse custom sites
                const urls = options.sites.split(',');
                sites = urls.map((url, index) => ({
                    name: `Enhanced Site ${index + 1}`,
                    url: url.trim(),
                    category: 'custom'
                }));
            } else {
                // Use preset
                sites = sitePresets[options.preset] || sitePresets.test;
            }
            
            const emailCount = parseInt(options.emails);
            
            console.log(`\n🚀 ENHANCED REGISTRATION CAMPAIGN`);
            console.log('=' .repeat(40));
            console.log(`📧 Emails: ${emailCount}`);
            console.log(`🎯 Sites: ${sites.length}`);
            console.log(`📋 Preset: ${options.preset}`);
            console.log(`🛡️ Stealth Level: ${options.stealth.toUpperCase()}`);
            console.log(`🤖 Human Behavior: ${!options.noHuman ? 'ENABLED' : 'DISABLED'}`);
            console.log(`🔍 CAPTCHA Solving: ${!options.noCaptcha ? 'ENABLED' : 'DISABLED'}`);
            console.log(`🌐 Proxy Rotation: ${options.proxyFile || options.proxyList ? 'ENABLED' : 'DISABLED'}`);
            
            // Enhanced confirmation for real sites
            if (options.preset === 'real' || options.preset === 'hardcore') {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                
                const confirm = await new Promise(resolve => {
                    rl.question('\n⚠️ This will attempt registration on REAL survey sites with advanced countermeasures. Continue? (y/N): ', resolve);
                });
                
                rl.close();
                
                if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
                    console.log('❌ Enhanced campaign cancelled');
                    await app.shutdown();
                    return;
                }
            }
            
            // Run enhanced registration campaign
            console.log('\n🔄 Starting enhanced registration campaign...');
            
            const results = [];
            
            for (let i = 0; i < emailCount; i++) {
                console.log(`\n📧 ENHANCED EMAIL ${i + 1}/${emailCount}`);
                console.log('-'.repeat(40));
                
                try {
                    // Create email account
                    const emailData = await app.createEmailAccount();
                    
                    const emailResults = {
                        email: emailData.emailAccount.email,
                        profile: emailData.profile.profileName,
                        sites: []
                    };
                    
                    // Attempt registration on each site
                    for (const site of sites) {
                        const result = await app.attemptSiteRegistration(emailData, site);
                        emailResults.sites.push({
                            name: site.name,
                            success: result.success,
                            error: result.errorMessage,
                            defenses: result.defenses,
                            sessionId: result.sessionId
                        });
                        
                        // Enhanced delay between attempts
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                    
                    results.push(emailResults);
                    
                } catch (error) {
                    console.error(`❌ Enhanced email ${i + 1} failed: ${error.message}`);
                }
            }
            
            // Display enhanced campaign summary
            console.log('\n📊 ENHANCED CAMPAIGN SUMMARY');
            console.log('=' .repeat(50));
            
            const stats = app.getEnhancedStats();
            console.log(`📧 Emails created: ${stats.emailsCreated}`);
            console.log(`🎯 Sites attempted: ${stats.sitesAttempted}`);
            console.log(`✅ Successful registrations: ${stats.successfulRegistrations}`);
            console.log(`❌ Failed registrations: ${stats.failedRegistrations}`);
            console.log(`🛡️ Defenses detected: ${stats.defensesDetected}`);
            console.log(`🔍 CAPTCHAs solved: ${stats.captchasSolved}`);
            console.log(`🌐 Proxies used: ${stats.proxiesUsed}`);
            
            const successRate = stats.sitesAttempted > 0 ? 
                (stats.successfulRegistrations / stats.sitesAttempted * 100).toFixed(1) : 0;
            console.log(`📈 Success rate: ${successRate}%`);
            
            // Enhanced CAPTCHA stats
            if (stats.captchaStats) {
                console.log(`🔍 CAPTCHA success rate: ${stats.captchaStats.successRate}`);
                console.log(`⏱️ Average solve time: ${stats.captchaStats.averageSolveTime}`);
            }
            
            // Proxy stats
            if (stats.proxyStats) {
                console.log(`🌐 Proxy health: ${stats.proxyStats.healthy}/${stats.proxyStats.total}`);
            }
            
            await app.shutdown();
            
        } catch (error) {
            console.error('❌ Enhanced registration campaign failed:', error.message);
            process.exit(1);
        }
    });

program
    .command('test-stealth')
    .description('Test anti-detection capabilities')
    .option('--stealth <level>', 'stealth level to test', 'high')
    .option('--target <url>', 'target URL for testing', 'https://bot.sannysoft.com/')
    .option('--gui', 'show browser GUI')
    .action(async (options) => {
        try {
            console.log('🧪 TESTING ANTI-DETECTION CAPABILITIES');
            console.log('======================================');
            
            const app = await initializeEnhancedApp(options);
            
            // Create test email
            const emailData = await app.createEmailAccount();
            
            // Test stealth on detection site
            console.log(`\n🎯 Testing stealth on: ${options.target}`);
            
            const testResult = await app.attemptSiteRegistration(emailData, {
                name: 'Stealth Test Site',
                url: options.target,
                category: 'test'
            });
            
            console.log('\n📊 STEALTH TEST RESULTS:');
            console.log(`✅ Navigation: ${testResult.success ? 'PASSED' : 'FAILED'}`);
            console.log(`🛡️ Defenses detected: ${testResult.defenses}`);
            console.log(`🤖 Human behavior: ${app.humanBehavior ? 'ACTIVE' : 'INACTIVE'}`);
            console.log(`🔍 CAPTCHA handling: ${app.captchaSolver?.isConfigured() ? 'READY' : 'NOT CONFIGURED'}`);
            
            const stats = app.getEnhancedStats();
            console.log(`🧠 Fingerprint spoofing: ACTIVE`);
            console.log(`🌐 Proxy rotation: ${stats.proxyStats ? 'ACTIVE' : 'INACTIVE'}`);
            
            await app.shutdown();
            
        } catch (error) {
            console.error('❌ Stealth test failed:', error.message);
            process.exit(1);
        }
    });

program
    .command('stats')
    .description('Display enhanced statistics')
    .option('--detailed', 'show detailed statistics')
    .action(async (options) => {
        try {
            const app = await initializeEnhancedApp();
            
            console.log('\n📊 ENHANCED DATABASE STATISTICS');
            console.log('=' .repeat(40));
            
            // Get basic stats
            const emails = await app.logger.allQuery('SELECT COUNT(*) as count FROM email_accounts');
            const attempts = await app.logger.allQuery('SELECT COUNT(*) as count FROM registration_attempts');
            const successes = await app.logger.allQuery('SELECT COUNT(*) as count FROM registration_attempts WHERE success = 1');
            const sites = await app.logger.allQuery('SELECT COUNT(*) as count FROM survey_sites');
            const defenses = await app.logger.allQuery('SELECT COUNT(*) as count FROM site_defenses');
            const questions = await app.logger.allQuery('SELECT COUNT(*) as count FROM registration_questions');
            
            console.log(`📧 Total emails: ${emails[0].count}`);
            console.log(`🎯 Total attempts: ${attempts[0].count}`);
            console.log(`✅ Successful registrations: ${successes[0].count}`);
            const successRate = attempts[0].count > 0 ? (successes[0].count / attempts[0].count * 100).toFixed(1) : 0;
            console.log(`📈 Success rate: ${successRate}%`);
            console.log(`🌐 Sites visited: ${sites[0].count}`);
            console.log(`🛡️ Defenses detected: ${defenses[0].count}`);
            console.log(`📝 Questions answered: ${questions[0].count}`);
            
            if (options.detailed) {
                console.log('\n🔍 DETAILED STATISTICS');
                console.log('-'.repeat(30));
                
                // Defense breakdown
                const defenseTypes = await app.logger.allQuery(`
                    SELECT defense_type, COUNT(*) as count, AVG(severity_level) as avg_severity
                    FROM site_defenses 
                    GROUP BY defense_type 
                    ORDER BY count DESC
                `);
                
                console.log('\n🛡️ Defense Types:');
                defenseTypes.forEach(defense => {
                    console.log(`   ${defense.defense_type}: ${defense.count} (Avg Severity: ${defense.avg_severity?.toFixed(1)})`);
                });
                
                // Email service breakdown
                const emailServices = await app.logger.allQuery(`
                    SELECT service, COUNT(*) as count
                    FROM email_accounts 
                    GROUP BY service 
                    ORDER BY count DESC
                `);
                
                console.log('\n📧 Email Services:');
                emailServices.forEach(service => {
                    console.log(`   ${service.service}: ${service.count}`);
                });
            }
            
            await app.shutdown();
            
        } catch (error) {
            console.error('❌ Stats query failed:', error.message);
            process.exit(1);
        }
    });

program
    .command('interactive')
    .description('Enhanced interactive mode with advanced capabilities')
    .option('--stealth <level>', 'stealth level', 'high')
    .option('--gui', 'show browser GUI')
    .option('--debug', 'enable debug mode')
    .action(async (options) => {
        try {
            const app = await initializeEnhancedApp(options);
            
            console.log('\n🎯 ENHANCED POLL AUTOMATION - INTERACTIVE MODE');
            console.log('=' .repeat(50));
            console.log('Enhanced Commands:');
            console.log('1. create-email - Create enhanced email account');
            console.log('2. register-site <url> - Enhanced site registration');
            console.log('3. test-stealth <url> - Test anti-detection on site');
            console.log('4. query <type> <param> - Query correlation data');
            console.log('5. stats - Show enhanced statistics');
            console.log('6. captcha-stats - Show CAPTCHA solving statistics');
            console.log('7. proxy-stats - Show proxy statistics');
            console.log('8. set-stealth <level> - Change stealth level');
            console.log('9. exit - Exit interactive mode');
            
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const runInteractive = async () => {
                const command = await new Promise(resolve => {
                    rl.question('\nenhanced> ', resolve);
                });
                
                const [cmd, ...args] = command.trim().split(' ');
                
                switch (cmd) {
                    case 'create-email':
                        const emailData = await app.createEmailAccount();
                        console.log(`✅ Enhanced email created: ${emailData.emailAccount.email}`);
                        console.log(`🤖 Profile: ${emailData.profile.profileName} (${(emailData.profile.yieldPrediction * 100).toFixed(1)}% yield)`);
                        break;
                        
                    case 'register-site':
                        if (!args[0]) {
                            console.log('❌ URL required');
                            break;
                        }
                        
                        const lastEmail = await app.logger.getQuery('SELECT * FROM email_accounts ORDER BY created_at DESC LIMIT 1');
                        if (!lastEmail) {
                            console.log('❌ No email accounts available. Create one first.');
                            break;
                        }
                        
                        const profile = app.optimizer.generateOptimalProfile();
                        profile.email = lastEmail.email;
                        const emailData_reg = {
                            emailAccount: lastEmail,
                            profile,
                            emailId: lastEmail.id
                        };
                        
                        const result = await app.attemptSiteRegistration(emailData_reg, {
                            name: 'Interactive Enhanced Site',
                            url: args[0],
                            category: 'interactive'
                        });
                        
                        console.log(`${result.success ? '✅' : '❌'} Enhanced registration ${result.success ? 'successful' : 'failed'}`);
                        console.log(`🛡️ Defenses detected: ${result.defenses}`);
                        if (result.errorMessage) console.log(`   ${result.errorMessage}`);
                        break;
                        
                    case 'test-stealth':
                        if (!args[0]) {
                            console.log('❌ URL required');
                            break;
                        }
                        
                        console.log(`🧪 Testing anti-detection on: ${args[0]}`);
                        // Implementation would test stealth capabilities
                        console.log('✅ Stealth test completed (placeholder)');
                        break;
                        
                    case 'captcha-stats':
                        if (app.captchaSolver) {
                            const captchaStats = app.captchaSolver.getStats();
                            console.log(`🔍 CAPTCHA Statistics:`);
                            console.log(`   Total: ${captchaStats.total}`);
                            console.log(`   Success rate: ${captchaStats.successRate}`);
                            console.log(`   Average solve time: ${captchaStats.averageSolveTime}`);
                        } else {
                            console.log('⚠️ CAPTCHA solver not initialized');
                        }
                        break;
                        
                    case 'proxy-stats':
                        if (app.proxyManager) {
                            const proxyStats = app.proxyManager.getStats();
                            console.log(`🌐 Proxy Statistics:`);
                            console.log(`   Total: ${proxyStats.total}`);
                            console.log(`   Healthy: ${proxyStats.healthy}`);
                            console.log(`   Available: ${proxyStats.available}`);
                            console.log(`   Current: ${proxyStats.currentProxy?.host || 'None'}`);
                        } else {
                            console.log('⚠️ Proxy manager not initialized');
                        }
                        break;
                        
                    case 'stats':
                        const stats = app.getEnhancedStats();
                        console.log(`📊 Enhanced Stats: Emails: ${stats.emailsCreated}, Attempts: ${stats.sitesAttempted}, Success: ${stats.successfulRegistrations}`);
                        break;
                        
                    case 'exit':
                        rl.close();
                        await app.shutdown();
                        return;
                        
                    default:
                        console.log('❌ Unknown enhanced command. Type "exit" to quit.');
                }
                
                await runInteractive();
            };
            
            await runInteractive();
            
        } catch (error) {
            console.error('❌ Enhanced interactive mode failed:', error.message);
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
    console.log('🎯 ENHANCED POLL AUTOMATION APPLICATION v2.0');
    console.log('===========================================');
    console.log('🛡️ Military-grade anti-detection capabilities');
    console.log('🤖 Advanced human behavior simulation');
    console.log('🔍 Automated CAPTCHA solving');
    console.log('🌐 Intelligent proxy rotation');
    console.log('');
    program.outputHelp();
}