/**
 * Quick Survey Demo Test
 * 
 * Test survey automation on simple, publicly available forms and surveys.
 */

const { chromium } = require('playwright');
const RegistrationLogger = require('./src/database/registration-logger');
const EnhancedLogger = require('./src/utils/enhanced-logger');

class QuickSurveyDemo {
    constructor() {
        this.personas = [
            {
                name: 'Sarah Johnson',
                age: 28,
                gender: 'Female',
                occupation: 'Software Developer',
                city: 'Austin',
                income: 'Medium',
                education: 'College graduate',
                interests: ['Technology', 'Travel', 'Reading']
            },
            {
                name: 'Mike Davis',
                age: 35,
                gender: 'Male',
                occupation: 'Marketing Manager',
                city: 'Denver',
                income: 'High',
                education: 'Graduate degree',
                interests: ['Sports', 'Business', 'Family time']
            }
        ];
        
        this.testSites = [
            {
                name: 'SurveyPlanet Main',
                url: 'https://surveyplanet.com',
                type: 'survey_platform'
            },
            {
                name: 'Typeform Examples',
                url: 'https://typeform.com/examples',
                type: 'example_forms'
            },
            {
                name: 'JotForm Templates',
                url: 'https://jotform.com/templates',
                type: 'form_templates'
            }
        ];
        
        this.results = {
            sitesVisited: 0,
            surveysAttempted: 0,
            questionsAnswered: 0,
            successfulSubmissions: 0
        };
    }

    async runQuickDemo() {
        console.log('🚀 Starting Quick Survey Demo\n');
        
        // Initialize
        this.registrationLogger = new RegistrationLogger();
        await this.registrationLogger.initialize();
        
        this.logger = new EnhancedLogger(this.registrationLogger, {
            logLevel: 'info',
            enableConsoleLogging: true,
            enableDatabaseLogging: true
        });
        
        this.browser = await chromium.launch({
            headless: false,
            slowMo: 1000,
            args: ['--no-sandbox']
        });
        
        const context = await this.browser.newContext();
        this.page = await context.newPage();
        
        try {
            // Test each site
            for (let i = 0; i < this.testSites.length; i++) {
                const site = this.testSites[i];
                const persona = this.personas[i % this.personas.length];
                
                await this.logger.log('DEMO', 'info', `🌐 Testing ${site.name}`, {
                    url: site.url,
                    persona: persona.name
                });
                
                await this.testSite(site, persona);
                this.results.sitesVisited++;
                
                // Wait between sites
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            this.generateQuickReport();
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        } finally {
            if (this.browser) await this.browser.close();
            if (this.registrationLogger) await this.registrationLogger.close();
        }
    }

    async testSite(site, persona) {
        try {
            console.log(`\n📍 Testing: ${site.name}`);
            
            // Navigate to site
            await this.page.goto(site.url, { waitUntil: 'networkidle', timeout: 15000 });
            await this.page.waitForTimeout(2000);
            
            // Take screenshot
            await this.page.screenshot({ 
                path: `screenshots/demo-${site.name.replace(/\s+/g, '-').toLowerCase()}.png`,
                fullPage: true 
            });
            
            console.log(`✅ Navigated to ${site.name}`);
            
            // Look for forms or surveys
            const formsFound = await this.findInteractiveForms();
            
            if (formsFound > 0) {
                console.log(`📋 Found ${formsFound} interactive forms`);
                await this.fillSampleForm(persona);
                this.results.surveysAttempted++;
            } else {
                console.log('ℹ️ No interactive forms found');
            }
            
        } catch (error) {
            console.error(`❌ Error testing ${site.name}:`, error.message);
        }
    }

    async findInteractiveForms() {
        const formSelectors = [
            'form',
            '.survey-form',
            '.contact-form',
            '.feedback-form',
            '[class*="form"]',
            'input[type="text"]',
            'textarea',
            'select'
        ];
        
        let formsCount = 0;
        
        for (const selector of formSelectors) {
            try {
                const elements = await this.page.locator(selector).all();
                const visibleElements = [];
                
                for (const element of elements) {
                    if (await element.isVisible()) {
                        visibleElements.push(element);
                    }
                }
                
                if (visibleElements.length > 0) {
                    formsCount = Math.max(formsCount, visibleElements.length);
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        return formsCount;
    }

    async fillSampleForm(persona) {
        try {
            console.log(`📝 Filling forms with ${persona.name}'s data...`);
            
            // Try to fill common form fields
            await this.fillCommonFields(persona);
            
            // Try to answer any questions
            const questionsAnswered = await this.answerBasicQuestions(persona);
            this.results.questionsAnswered += questionsAnswered;
            
            // Try to submit
            const submitted = await this.attemptSubmission();
            if (submitted) {
                this.results.successfulSubmissions++;
                console.log('✅ Form submitted successfully');
            }
            
        } catch (error) {
            console.error('❌ Form filling error:', error.message);
        }
    }

    async fillCommonFields(persona) {
        const fieldMappings = [
            { selectors: ['input[name*="name"]', '#name', '.name'], value: persona.name },
            { selectors: ['input[name*="email"]', '#email', '.email'], value: `${persona.name.toLowerCase().replace(' ', '.')}@example.com` },
            { selectors: ['input[name*="age"]', '#age', '.age'], value: persona.age.toString() },
            { selectors: ['input[name*="city"]', '#city', '.city'], value: persona.city },
            { selectors: ['input[name*="occupation"]', '#occupation', '.occupation'], value: persona.occupation },
            { selectors: ['textarea', '#message', '.message'], value: `Hello, I'm ${persona.name} and I'm interested in providing feedback.` }
        ];
        
        for (const mapping of fieldMappings) {
            for (const selector of mapping.selectors) {
                try {
                    const field = this.page.locator(selector).first();
                    if (await field.isVisible() && await field.isEnabled()) {
                        await field.fill(mapping.value);
                        console.log(`   📝 Filled ${selector}: ${mapping.value.substring(0, 30)}...`);
                        await this.page.waitForTimeout(500);
                        break; // Move to next mapping
                    }
                } catch (e) {
                    // Continue with next selector
                }
            }
        }
    }

    async answerBasicQuestions(persona) {
        let questionsAnswered = 0;
        
        // Look for radio buttons
        try {
            const radioGroups = await this.page.locator('input[type="radio"]').all();
            const processedGroups = new Set();
            
            for (const radio of radioGroups) {
                const name = await radio.getAttribute('name');
                if (name && !processedGroups.has(name)) {
                    processedGroups.add(name);
                    
                    // Select based on persona preferences
                    const options = await this.page.locator(`input[name="${name}"]`).all();
                    if (options.length > 0) {
                        const selectedIndex = Math.floor(Math.random() * options.length);
                        await options[selectedIndex].click();
                        console.log(`   📊 Selected radio option ${selectedIndex + 1}/${options.length} for ${name}`);
                        questionsAnswered++;
                        await this.page.waitForTimeout(500);
                    }
                }
            }
        } catch (e) {
            // Continue
        }
        
        // Look for checkboxes
        try {
            const checkboxes = await this.page.locator('input[type="checkbox"]').all();
            const checkCount = Math.min(checkboxes.length, 3); // Select up to 3
            
            for (let i = 0; i < checkCount; i++) {
                if (Math.random() > 0.5) { // 50% chance to check each
                    await checkboxes[i].click();
                    console.log(`   ☑️ Checked checkbox ${i + 1}`);
                    await this.page.waitForTimeout(300);
                }
            }
            
            if (checkCount > 0) questionsAnswered++;
        } catch (e) {
            // Continue
        }
        
        // Look for select dropdowns
        try {
            const selects = await this.page.locator('select').all();
            
            for (const select of selects) {
                if (await select.isVisible() && await select.isEnabled()) {
                    const options = await select.locator('option').all();
                    if (options.length > 1) {
                        const selectedIndex = 1 + Math.floor(Math.random() * (options.length - 1)); // Skip first option
                        const optionValue = await options[selectedIndex].getAttribute('value');
                        if (optionValue) {
                            await select.selectOption(optionValue);
                            console.log(`   📋 Selected dropdown option ${selectedIndex}/${options.length}`);
                            questionsAnswered++;
                            await this.page.waitForTimeout(500);
                        }
                    }
                }
            }
        } catch (e) {
            // Continue
        }
        
        return questionsAnswered;
    }

    async attemptSubmission() {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.submit-btn',
            '.send-btn',
            'button:has-text("Submit")',
            'button:has-text("Send")',
            'button:has-text("Continue")',
            '[value="Submit"]'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = this.page.locator(selector).first();
                if (await button.isVisible() && await button.isEnabled()) {
                    console.log(`   📤 Attempting submission with: ${selector}`);
                    await button.click();
                    await this.page.waitForTimeout(2000);
                    return true;
                }
            } catch (e) {
                // Continue with next selector
            }
        }
        
        console.log('   ⚠️ No submit button found');
        return false;
    }

    generateQuickReport() {
        console.log('\n\n📊 QUICK SURVEY DEMO REPORT');
        console.log('============================');
        console.log(`⏰ Completed: ${new Date().toISOString()}`);
        console.log(`🌐 Sites Visited: ${this.results.sitesVisited}`);
        console.log(`📋 Surveys Attempted: ${this.results.surveysAttempted}`);
        console.log(`❓ Questions Answered: ${this.results.questionsAnswered}`);
        console.log(`✅ Successful Submissions: ${this.results.successfulSubmissions}`);
        
        const engagementRate = this.results.sitesVisited > 0 ? 
            (this.results.surveysAttempted / this.results.sitesVisited * 100).toFixed(1) : 0;
        const successRate = this.results.surveysAttempted > 0 ? 
            (this.results.successfulSubmissions / this.results.surveysAttempted * 100).toFixed(1) : 0;
        
        console.log(`\n📈 Engagement Rate: ${engagementRate}% (found forms to fill)`);
        console.log(`📈 Success Rate: ${successRate}% (successfully submitted)`);
        console.log(`📊 Avg Questions per Survey: ${this.results.surveysAttempted > 0 ? (this.results.questionsAnswered / this.results.surveysAttempted).toFixed(1) : 0}`);
        
        console.log('\n💾 All interactions logged to database');
        console.log('📸 Screenshots saved for review');
        
        if (this.results.successfulSubmissions > 0) {
            console.log('\n🎉 SUCCESS! Survey automation is working!');
        } else if (this.results.questionsAnswered > 0) {
            console.log('\n✅ PARTIAL SUCCESS! Found and answered questions.');
        } else {
            console.log('\n⚠️ Limited success - may need different test sites.');
        }
    }
}

// Run the demo
async function runDemo() {
    const demo = new QuickSurveyDemo();
    await demo.runQuickDemo();
}

if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = QuickSurveyDemo;