/**
 * Simple Survey Training Demo
 * Basic training demonstration without complex dependencies
 */

const { chromium } = require('playwright');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');

class SimpleTrainingDemo {
    constructor() {
        this.browser = null;
        this.context = null;
        this.emailManager = new EmailAccountManager();
        this.logger = new RegistrationLogger();
        
        this.trainingStats = {
            sitesAnalyzed: 0,
            registrationsAttempted: 0,
            registrationsSuccessful: 0,
            errorsEncountered: 0
        };
        
        // Simple training targets
        this.trainingSites = [
            {
                name: 'SurveyPlanet Registration',
                url: 'https://surveyplanet.com/auth/register',
                type: 'registration'
            },
            {
                name: 'SurveyPlanet Demo Survey',
                url: 'https://surveyplanet.com/examples',
                type: 'survey_list'
            }
        ];
    }

    async initialize() {
        console.log('🚀 SIMPLE SURVEY TRAINING DEMO');
        console.log('==============================');
        
        // Initialize components
        await this.logger.initialize();
        await this.emailManager.initialize();
        
        // Launch browser
        this.browser = await chromium.launch({
            headless: false, // Show browser for observation
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        console.log('✅ Training demo initialized');
        console.log(`📋 Training targets: ${this.trainingSites.length} sites`);
        
        return this;
    }

    async startTraining() {
        console.log('\n🎓 Starting training demonstration...');
        
        for (const site of this.trainingSites) {
            try {
                console.log(`\n🎯 Training on: ${site.name}`);
                console.log(`🌐 URL: ${site.url}`);
                
                await this.trainOnSite(site);
                this.trainingStats.sitesAnalyzed++;
                
                // Pause between sites
                await this.sleep(3000);
                
            } catch (error) {
                console.error(`❌ Training failed for ${site.name}:`, error.message);
                this.trainingStats.errorsEncountered++;
            }
        }
        
        await this.generateReport();
    }

    async trainOnSite(site) {
        const page = await this.context.newPage();
        
        try {
            console.log(`📊 Analyzing site: ${site.url}`);
            
            // Navigate to the site
            await page.goto(site.url, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            
            // Analyze page structure
            const analysis = await this.analyzePage(page);
            console.log(`   📋 Forms found: ${analysis.formCount}`);
            console.log(`   📝 Inputs found: ${analysis.inputCount}`);
            
            if (site.type === 'registration') {
                await this.trainRegistration(page, site);
            } else if (site.type === 'survey_list') {
                await this.analyzeSurveyOptions(page, site);
            }
            
            // Log the training data
            await this.logger.logSystemEvent({
                eventType: 'training_site_analyzed',
                message: `Analyzed ${site.name}`,
                eventData: { site, analysis },
                severity: 'info'
            });
            
        } finally {
            await page.close();
        }
    }

    async analyzePage(page) {
        return await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input');
            const buttons = document.querySelectorAll('button, input[type="submit"]');
            
            return {
                title: document.title,
                url: window.location.href,
                formCount: forms.length,
                inputCount: inputs.length,
                buttonCount: buttons.length,
                hasPasswordField: !!document.querySelector('input[type="password"]'),
                hasEmailField: !!document.querySelector('input[type="email"], input[name*="email"]'),
                formData: Array.from(forms).map((form, index) => ({
                    index,
                    action: form.action,
                    method: form.method,
                    inputs: Array.from(form.querySelectorAll('input')).map(input => ({
                        type: input.type,
                        name: input.name,
                        placeholder: input.placeholder,
                        required: input.required
                    }))
                }))
            };
        });
    }

    async trainRegistration(page, site) {
        console.log(`🎓 Training registration process...`);
        this.trainingStats.registrationsAttempted++;
        
        try {
            // Get an email account for training
            const existingAccounts = this.emailManager.listAccounts();
            let emailAccount = null;
            
            if (existingAccounts.length > 0) {
                // Use first available account
                emailAccount = existingAccounts[0];
                console.log(`📧 Using existing email: ${emailAccount.email}`);
            } else {
                console.log(`⚠️ No email accounts available, creating one...`);
                emailAccount = await this.emailManager.createEmailAccount();
                if (emailAccount && emailAccount.success) {
                    console.log(`📧 Created email: ${emailAccount.email}`);
                }
            }
            
            // Analyze registration form
            const formAnalysis = await page.evaluate(() => {
                const form = document.querySelector('form');
                if (!form) return null;
                
                const inputs = Array.from(form.querySelectorAll('input'));
                return {
                    formFound: true,
                    inputFields: inputs.map(input => ({
                        type: input.type,
                        name: input.name,
                        id: input.id,
                        placeholder: input.placeholder,
                        required: input.required,
                        visible: input.offsetHeight > 0
                    })),
                    submitButton: !!form.querySelector('button[type="submit"], input[type="submit"]')
                };
            });
            
            if (formAnalysis && formAnalysis.formFound) {
                console.log(`   ✅ Registration form detected`);
                console.log(`   📝 Input fields: ${formAnalysis.inputFields.length}`);
                
                // Demo: Try to identify key fields
                const emailFields = formAnalysis.inputFields.filter(field => 
                    field.type === 'email' || 
                    field.name.toLowerCase().includes('email') ||
                    field.placeholder.toLowerCase().includes('email')
                );
                
                const passwordFields = formAnalysis.inputFields.filter(field => 
                    field.type === 'password'
                );
                
                console.log(`   📧 Email fields detected: ${emailFields.length}`);
                console.log(`   🔒 Password fields detected: ${passwordFields.length}`);
                
                // Log successful analysis
                await this.logger.logRegistrationAttempt({
                    siteUrl: site.url,
                    email: emailAccount?.email || 'demo@example.com',
                    success: true,
                    stepsCompleted: 1,
                    timeSpent: 5000
                });
                
                this.trainingStats.registrationsSuccessful++;
                
            } else {
                console.log(`   ❌ No registration form found`);
            }
            
        } catch (error) {
            console.error(`   ❌ Registration training error: ${error.message}`);
        }
    }

    async analyzeSurveyOptions(page, site) {
        console.log(`📊 Analyzing survey options...`);
        
        try {
            // Look for survey links or examples
            const surveyData = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const surveyLinks = links.filter(link => 
                    link.href.includes('survey') || 
                    link.textContent.toLowerCase().includes('survey') ||
                    link.textContent.toLowerCase().includes('example')
                );
                
                return {
                    totalLinks: links.length,
                    surveyLinks: surveyLinks.map(link => ({
                        href: link.href,
                        text: link.textContent.trim(),
                        title: link.title
                    })).slice(0, 10) // Limit to first 10
                };
            });
            
            console.log(`   🔗 Total links: ${surveyData.totalLinks}`);
            console.log(`   📋 Survey-related links: ${surveyData.surveyLinks.length}`);
            
            if (surveyData.surveyLinks.length > 0) {
                console.log(`   📝 Sample survey links found:`);
                surveyData.surveyLinks.slice(0, 3).forEach((link, index) => {
                    console.log(`      ${index + 1}. ${link.text} (${link.href})`);
                });
            }
            
        } catch (error) {
            console.error(`   ❌ Survey analysis error: ${error.message}`);
        }
    }

    async generateReport() {
        console.log('\n📊 TRAINING DEMO RESULTS');
        console.log('========================');
        
        const stats = this.trainingStats;
        console.log(`🎯 Sites Analyzed: ${stats.sitesAnalyzed}`);
        console.log(`📝 Registration Attempts: ${stats.registrationsAttempted}`);
        console.log(`✅ Successful Analyses: ${stats.registrationsSuccessful}`);
        console.log(`❌ Errors Encountered: ${stats.errorsEncountered}`);
        
        const successRate = stats.registrationsAttempted > 0 ? 
            (stats.registrationsSuccessful / stats.registrationsAttempted * 100).toFixed(1) : 0;
        console.log(`📊 Analysis Success Rate: ${successRate}%`);
        
        console.log('\n📋 Training completed successfully!');
        console.log('🔍 Check the database for logged training data:');
        console.log('   sqlite3 poll-automation.db "SELECT * FROM system_events WHERE event_type LIKE \'%training%\' ORDER BY timestamp DESC LIMIT 5;"');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
    }
}

async function main() {
    const demo = new SimpleTrainingDemo();
    
    try {
        await demo.initialize();
        await demo.startTraining();
        
    } catch (error) {
        console.error('❌ Training demo failed:', error);
    } finally {
        await demo.cleanup();
    }
}

if (require.main === module) {
    main();
}

module.exports = SimpleTrainingDemo;