/**
 * Poll Automation - Main Entry Point
 * Unified application for AI-powered survey registration automation
 */

const PollAutomationApp = require('./src/app');

// Default configuration
const DEFAULT_CONFIG = {
    headless: true,
    debugMode: false,
    timeout: 30000,
    maxEmails: 10,
    maxSitesPerEmail: 5,
    dbPath: './data/poll-automation.db',
    
    // Default sites to attempt
    defaultSites: [
        { name: 'Local Survey Site', url: 'http://localhost:3001/register', category: 'test' },
        { name: 'HTTPBin Forms', url: 'https://httpbin.org/forms/post', category: 'test' },
        { name: 'RewardingWays', url: 'https://www.rewardingways.com/register', category: 'survey' }
    ]
};

/**
 * Quick start function for programmatic use
 */
async function quickStart(options = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };
    
    console.log('🚀 POLL AUTOMATION - QUICK START');
    console.log('================================');
    
    const app = new PollAutomationApp(config);
    
    try {
        await app.initialize();
        
        // Create one email and attempt registrations
        const emailData = await app.createEmailAccount();
        
        console.log(`\n📧 Created email: ${emailData.emailAccount.email}`);
        console.log(`🤖 AI Profile: ${emailData.profile.profileName}`);
        
        // Attempt registration on specified sites or defaults
        const sites = options.sites || config.defaultSites.slice(0, 2); // Use first 2 by default
        
        const results = [];
        for (const site of sites) {
            console.log(`\n🎯 Attempting: ${site.name}`);
            const result = await app.attemptSiteRegistration(emailData, site);
            results.push({
                site: site.name,
                success: result.success,
                error: result.errorMessage
            });
        }
        
        // Display results
        console.log('\n📊 QUICK START RESULTS');
        console.log('======================');
        results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.site} - ${result.success ? 'Success' : result.error}`);
        });
        
        return {
            success: true,
            email: emailData.emailAccount.email,
            profile: emailData.profile,
            results
        };
        
    } catch (error) {
        console.error('❌ Quick start failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await app.shutdown();
    }
}

/**
 * Demo function showing all capabilities
 */
async function runDemo() {
    console.log('🎬 POLL AUTOMATION - FULL DEMO');
    console.log('==============================');
    
    const app = new PollAutomationApp({
        ...DEFAULT_CONFIG,
        debugMode: true
    });
    
    try {
        await app.initialize();
        
        // Demo 1: Create multiple emails
        console.log('\n📧 DEMO 1: Creating multiple email accounts');
        console.log('-'.repeat(45));
        
        const emails = [];
        for (let i = 0; i < 2; i++) {
            const emailData = await app.createEmailAccount();
            emails.push(emailData);
            console.log(`${i + 1}. ${emailData.emailAccount.email} (${emailData.profile.profileName})`);
        }
        
        // Demo 2: Registration campaign
        console.log('\n🎯 DEMO 2: Registration campaign');
        console.log('-'.repeat(32));
        
        const demoSites = [
            { name: 'Local Test Site', url: 'http://localhost:3001/register', category: 'test' },
            { name: 'HTTPBin Form', url: 'https://httpbin.org/forms/post', category: 'test' }
        ];
        
        const campaignResults = await app.runCampaign(demoSites, 1);
        
        // Demo 3: Data correlation queries
        console.log('\n📊 DEMO 3: Data correlation queries');
        console.log('-'.repeat(35));
        
        const testEmail = emails[0].emailAccount.email;
        
        console.log('\nQuery 1: Failed registrations for email');
        await app.queryData('email_failures', testEmail);
        
        console.log('\nQuery 2: Successful registrations for email');
        await app.queryData('email_successes', testEmail);
        
        console.log('\n✅ DEMO COMPLETED SUCCESSFULLY!');
        console.log('===============================');
        console.log('🎯 All major features demonstrated');
        console.log('📧 Email creation with AI optimization');
        console.log('🛡️ Defense detection and logging');
        console.log('📊 Complete data correlation');
        console.log('🔍 Advanced query capabilities');
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        await app.shutdown();
    }
}

// Export for programmatic use
module.exports = {
    PollAutomationApp,
    quickStart,
    runDemo,
    DEFAULT_CONFIG
};

// If run directly, show usage
if (require.main === module) {
    console.log('🎯 POLL AUTOMATION APPLICATION');
    console.log('==============================');
    console.log('');
    console.log('Usage options:');
    console.log('');
    console.log('1. CLI Interface:');
    console.log('   node cli.js --help');
    console.log('   node cli.js create-email');
    console.log('   node cli.js register --preset test');
    console.log('   node cli.js interactive');
    console.log('');
    console.log('2. Quick Start (programmatic):');
    console.log('   const { quickStart } = require("./index");');
    console.log('   quickStart().then(console.log);');
    console.log('');
    console.log('3. Full Demo:');
    console.log('   const { runDemo } = require("./index");');
    console.log('   runDemo().then(console.log);');
    console.log('');
    console.log('4. Custom Application:');
    console.log('   const { PollAutomationApp } = require("./index");');
    console.log('   const app = new PollAutomationApp(config);');
    console.log('');
    console.log('Examples:');
    console.log('  node cli.js create-email --service guerrilla');
    console.log('  node cli.js register --emails 2 --preset test');
    console.log('  node cli.js query --type email_failures --parameter "test@example.com"');
}