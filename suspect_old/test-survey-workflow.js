/**
 * Real Survey Site Testing Script
 * 
 * Iterative testing of survey workflow on real sites:
 * 1. Find demographics/profile setup
 * 2. Fill out profile if it exists
 * 3. Find where new surveys are started
 * 4. Start and complete a survey
 */

const { chromium } = require('playwright');
const SiteSpecificSurveyDetector = require('./src/survey/site-specific-survey-detector');
const OptimalPersonaGenerator = require('./src/survey/optimal-persona-generator');
const AutomaticLoginSystem = require('./src/automation/automatic-login-system');
const SurveyNavigator = require('./src/survey/survey-navigator');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const LoggedAIWrapper = require('./src/ai/logged-ai-wrapper');
const RegistrationLogger = require('./src/database/registration-logger');
const EnhancedLogger = require('./src/utils/enhanced-logger');

class SurveyWorkflowTester {
    constructor(options = {}) {
        this.options = {
            headless: false, // Keep visible for testing
            debugMode: true,
            slowMo: 1000, // Slow down for observation
            site: 'https://www.swagbucks.com', // Default test site
            ...options
        };
        
        this.browser = null;
        this.page = null;
        this.testResults = {
            demographics: null,
            profileFilling: null,
            surveyDiscovery: null,
            surveyCompletion: null
        };
        
        console.log('🧪 Survey Workflow Tester initialized');
        console.log(`🎯 Target site: ${this.options.site}`);
    }

    /**
     * Run complete workflow test
     */
    async runCompleteTest() {
        console.log('\n🚀 Starting Complete Survey Workflow Test\n');
        
        try {
            // Initialize browser and components
            await this.initialize();
            
            // Now we can use the logger
            await this.logger.log('SYSTEM', 'info', '🚀 Survey Workflow Test Started', {
                site: this.options.site,
                headless: this.options.headless
            });
            
            // Step 1: Test demographics detection
            await this.logger.log('DETECTION', 'info', '📋 STEP 1: Testing Demographics Detection');
            await this.testDemographicsDetection();
            
            // Step 2: Test profile filling
            await this.logger.log('PERSONA', 'info', '👤 STEP 2: Testing Profile Filling');
            await this.testProfileFilling();
            
            // Step 3: Test survey discovery
            await this.logger.log('SURVEY', 'info', '🔍 STEP 3: Testing Survey Discovery');
            await this.testSurveyDiscovery();
            
            // Step 4: Test survey initiation and completion
            await this.logger.log('SURVEY', 'info', '📝 STEP 4: Testing Survey Completion');
            await this.testSurveyCompletion();
            
            // Generate final report
            this.generateTestReport();
            
        } catch (error) {
            console.error(`❌ Test failed: ${error.message}`);
            console.error(error.stack);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Initialize browser and components
     */
    async initialize() {
        console.log('🔧 Initializing browser and components...');
        
        this.browser = await chromium.launch({
            headless: this.options.headless,
            slowMo: this.options.slowMo,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
        
        this.page = await context.newPage();
        
        // Initialize components
        this.registrationLogger = new RegistrationLogger();
        
        // Initialize enhanced logger first
        this.logger = new EnhancedLogger(this.registrationLogger, {
            logLevel: 'debug',
            enableConsoleLogging: true,
            enableDatabaseLogging: true,
            enableFileLogging: true
        });
        
        // Initialize AI with comprehensive logging wrapper
        const baseAI = new ContentUnderstandingAI();
        this.contentAI = new LoggedAIWrapper(baseAI, this.logger);
        
        this.surveyDetector = new SiteSpecificSurveyDetector(
            this.page, 
            this.contentAI, 
            { debugMode: this.options.debugMode }
        );
        
        this.personaGenerator = new OptimalPersonaGenerator(
            this.registrationLogger,
            this.contentAI,
            { debugMode: this.options.debugMode }
        );
        
        this.loginSystem = new AutomaticLoginSystem(
            this.page,
            this.registrationLogger,
            this.contentAI,
            { debugMode: this.options.debugMode }
        );
        
        this.surveyNavigator = new SurveyNavigator(
            this.page,
            { debugMode: this.options.debugMode }
        );
        
        console.log('✅ Components initialized successfully');
    }

    /**
     * Test Step 1: Demographics Detection
     */
    async testDemographicsDetection() {
        console.log('🔍 Navigating to site and detecting demographics...');
        
        try {
            // Navigate to the site
            await this.page.goto(this.options.site, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);
            
            console.log(`📍 Current URL: ${await this.page.url()}`);
            
            // Use survey detector to find demographics
            const detection = await this.surveyDetector.detectSurveyOpportunities();
            
            console.log('\n📊 DEMOGRAPHICS DETECTION RESULTS:');
            console.log('=====================================');
            
            if (detection.demographicsForm) {
                console.log('✅ Demographics form found!');
                console.log(`📝 Type: ${detection.demographicsForm.type}`);
                console.log(`📍 Location: ${detection.demographicsForm.selector}`);
                console.log(`🎯 Confidence: ${detection.demographicsForm.confidence}`);
                console.log(`📋 Fields found: ${detection.demographicsForm.fields?.length || 0}`);
                
                if (detection.demographicsForm.fields?.length > 0) {
                    console.log('\n📝 Demographics fields detected:');
                    detection.demographicsForm.fields.forEach((field, i) => {
                        console.log(`   ${i + 1}. ${field.name} (${field.type}) - ${field.label}`);
                    });
                }
                
                this.testResults.demographics = {
                    success: true,
                    form: detection.demographicsForm
                };
            } else {
                console.log('ℹ️ No demographics form detected on main page');
                console.log('🔍 Checking for profile/account setup links...');
                
                // Look for profile setup links
                const profileLinks = await this.findProfileSetupLinks();
                
                if (profileLinks.length > 0) {
                    console.log(`✅ Found ${profileLinks.length} profile setup links:`);
                    profileLinks.forEach((link, i) => {
                        console.log(`   ${i + 1}. ${link.text} - ${link.href}`);
                    });
                    
                    this.testResults.demographics = {
                        success: true,
                        profileLinks: profileLinks
                    };
                } else {
                    console.log('❌ No demographics setup found');
                    this.testResults.demographics = {
                        success: false,
                        reason: 'No demographics form or profile links found'
                    };
                }
            }
            
            // Take screenshot for analysis
            await this.page.screenshot({ 
                path: `screenshots/demographics-detection-${Date.now()}.png`,
                fullPage: true 
            });
            
        } catch (error) {
            console.error(`❌ Demographics detection failed: ${error.message}`);
            this.testResults.demographics = {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Find profile setup links on the page
     */
    async findProfileSetupLinks() {
        const profileSelectors = [
            'a[href*="profile"]',
            'a[href*="account"]',
            'a[href*="settings"]',
            'a[href*="demographic"]',
            'a:has-text("profile")',
            'a:has-text("account")',
            'a:has-text("complete")',
            'a:has-text("setup")',
            '.profile-link',
            '.account-link',
            '.setup-profile'
        ];
        
        const links = [];
        
        for (const selector of profileSelectors) {
            try {
                const elements = await this.page.locator(selector).all();
                
                for (const element of elements) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        const text = await element.textContent();
                        const href = await element.getAttribute('href');
                        
                        if (text && text.trim() && href) {
                            links.push({
                                text: text.trim(),
                                href: href,
                                selector: selector
                            });
                        }
                    }
                }
            } catch (e) {
                // Continue checking other selectors
            }
        }
        
        return links;
    }

    /**
     * Test Step 2: Profile Filling
     */
    async testProfileFilling() {
        if (!this.testResults.demographics?.success) {
            console.log('⏭️ Skipping profile filling - no demographics detected');
            return;
        }
        
        try {
            console.log('🎭 Generating optimal persona for profile filling...');
            
            // Generate optimal persona
            const persona = await this.personaGenerator.generateOptimalPersona({
                url: await this.page.url(),
                domain: this.extractDomain(this.options.site)
            }, 'test@example.com');
            
            console.log('\n👤 GENERATED PERSONA:');
            console.log('====================');
            console.log(`👤 Name: ${persona.identity?.firstName} ${persona.identity?.lastName}`);
            console.log(`🎂 Age: ${persona.demographics?.age}`);
            console.log(`⚧ Gender: ${persona.demographics?.gender}`);
            console.log(`💰 Income: $${persona.demographics?.income?.toLocaleString()}`);
            console.log(`🎓 Education: ${persona.demographics?.education}`);
            console.log(`📍 Location: ${persona.demographics?.city}, ${persona.demographics?.state}`);
            console.log(`💼 Job: ${persona.professional?.jobTitle}`);
            
            // If we have a direct demographics form, fill it
            if (this.testResults.demographics.form) {
                console.log('\n📝 Filling demographics form...');
                await this.fillDemographicsForm(this.testResults.demographics.form, persona);
            }
            // If we have profile links, navigate and fill
            else if (this.testResults.demographics.profileLinks) {
                console.log('\n🔗 Navigating to profile setup...');
                const firstLink = this.testResults.demographics.profileLinks[0];
                await this.navigateAndFillProfile(firstLink, persona);
            }
            
            this.testResults.profileFilling = {
                success: true,
                persona: persona
            };
            
        } catch (error) {
            console.error(`❌ Profile filling failed: ${error.message}`);
            this.testResults.profileFilling = {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fill demographics form with persona data
     */
    async fillDemographicsForm(form, persona) {
        console.log('📝 Filling demographics form fields...');
        
        try {
            // Navigate to form if needed
            if (form.element) {
                await form.element.scrollIntoViewIfNeeded();
            }
            
            // Fill each detected field
            for (const field of form.fields || []) {
                try {
                    const value = this.getPersonaValueForField(field, persona);
                    if (value) {
                        console.log(`   📝 Filling ${field.name}: ${this.maskSensitiveValue(value, field.name)}`);
                        
                        const element = this.page.locator(field.selector).first();
                        await element.scrollIntoViewIfNeeded();
                        await this.page.waitForTimeout(500);
                        
                        if (field.type === 'select') {
                            await element.selectOption(value);
                        } else {
                            await element.fill(value.toString());
                        }
                        
                        await this.page.waitForTimeout(1000);
                    }
                } catch (fieldError) {
                    console.warn(`   ⚠️ Failed to fill ${field.name}: ${fieldError.message}`);
                }
            }
            
            // Look for submit button
            await this.submitDemographicsForm();
            
            console.log('✅ Demographics form filled successfully');
            
        } catch (error) {
            console.error(`❌ Demographics form filling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get persona value for a specific field
     */
    getPersonaValueForField(field, persona) {
        const fieldName = field.name.toLowerCase();
        
        if (fieldName.includes('age')) {
            return persona.demographics?.age;
        } else if (fieldName.includes('gender') || fieldName.includes('sex')) {
            return persona.demographics?.gender;
        } else if (fieldName.includes('income') || fieldName.includes('salary')) {
            return persona.demographics?.income;
        } else if (fieldName.includes('education')) {
            return persona.demographics?.education;
        } else if (fieldName.includes('city') || fieldName.includes('location')) {
            return persona.demographics?.city;
        } else if (fieldName.includes('state')) {
            return persona.demographics?.state;
        } else if (fieldName.includes('country')) {
            return persona.demographics?.country || 'United States';
        } else if (fieldName.includes('job') || fieldName.includes('occupation')) {
            return persona.professional?.jobTitle;
        } else if (fieldName.includes('marital')) {
            return persona.demographics?.maritalStatus;
        } else if (fieldName.includes('household')) {
            return persona.demographics?.householdSize;
        } else if (fieldName.includes('first') && fieldName.includes('name')) {
            return persona.identity?.firstName;
        } else if (fieldName.includes('last') && fieldName.includes('name')) {
            return persona.identity?.lastName;
        }
        
        return null;
    }

    /**
     * Submit demographics form
     */
    async submitDemographicsForm() {
        const submitSelectors = [
            '[type="submit"]', '.submit', '.save', '.continue',
            '.next', '.update-profile', '.save-profile'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = this.page.locator(selector).first();
                if (await button.isVisible()) {
                    console.log(`   📤 Submitting form using: ${selector}`);
                    await button.click();
                    await this.page.waitForTimeout(2000);
                    break;
                }
            } catch (e) {
                // Continue trying other selectors
            }
        }
    }

    /**
     * Test Step 3: Survey Discovery
     */
    async testSurveyDiscovery() {
        console.log('🔍 Discovering available surveys...');
        
        try {
            // Use survey detector to find surveys
            const surveys = await this.surveyNavigator.detectSurveys();
            
            console.log('\n📊 SURVEY DISCOVERY RESULTS:');
            console.log('=============================');
            
            if (surveys.length > 0) {
                console.log(`✅ Found ${surveys.length} potential surveys:`);
                
                surveys.forEach((survey, i) => {
                    console.log(`\n   ${i + 1}. ${survey.title || 'Untitled Survey'}`);
                    console.log(`      📍 URL: ${survey.url || 'Embedded'}`);
                    console.log(`      📝 Description: ${survey.description || 'No description'}`);
                    console.log(`      🎯 Type: ${survey.isEmbedded ? 'Embedded' : 'External'}`);
                });
                
                this.testResults.surveyDiscovery = {
                    success: true,
                    surveys: surveys,
                    count: surveys.length
                };
            } else {
                console.log('❌ No surveys found on current page');
                
                // Try to find survey navigation
                const surveyNavigation = await this.findSurveyNavigation();
                
                if (surveyNavigation.length > 0) {
                    console.log('✅ Found survey navigation links:');
                    surveyNavigation.forEach((nav, i) => {
                        console.log(`   ${i + 1}. ${nav.text} - ${nav.href}`);
                    });
                    
                    this.testResults.surveyDiscovery = {
                        success: true,
                        navigation: surveyNavigation
                    };
                } else {
                    this.testResults.surveyDiscovery = {
                        success: false,
                        reason: 'No surveys or navigation found'
                    };
                }
            }
            
            // Take screenshot
            await this.page.screenshot({ 
                path: `screenshots/survey-discovery-${Date.now()}.png`,
                fullPage: true 
            });
            
        } catch (error) {
            console.error(`❌ Survey discovery failed: ${error.message}`);
            this.testResults.surveyDiscovery = {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Find survey navigation elements
     */
    async findSurveyNavigation() {
        const navSelectors = [
            'a[href*="survey"]',
            'a[href*="poll"]',
            'a[href*="quiz"]',
            'a:has-text("survey")',
            'a:has-text("poll")',
            'a:has-text("questionnaire")',
            '.survey-nav',
            '.poll-nav',
            '.surveys-link'
        ];
        
        const navigation = [];
        
        for (const selector of navSelectors) {
            try {
                const elements = await this.page.locator(selector).all();
                
                for (const element of elements) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        const text = await element.textContent();
                        const href = await element.getAttribute('href');
                        
                        if (text && text.trim() && href) {
                            navigation.push({
                                text: text.trim(),
                                href: href,
                                selector: selector
                            });
                        }
                    }
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        return navigation;
    }

    /**
     * Test Step 4: Survey Completion
     */
    async testSurveyCompletion() {
        if (!this.testResults.surveyDiscovery?.success) {
            console.log('⏭️ Skipping survey completion - no surveys discovered');
            return;
        }
        
        try {
            console.log('📝 Testing survey completion...');
            
            let selectedSurvey = null;
            
            // Select a survey to test
            if (this.testResults.surveyDiscovery.surveys?.length > 0) {
                selectedSurvey = this.testResults.surveyDiscovery.surveys[0];
                console.log(`🎯 Selected survey: ${selectedSurvey.title}`);
                
                // Navigate to the survey
                const navResult = await this.surveyNavigator.navigateToSurvey(selectedSurvey);
                
                if (navResult.success) {
                    console.log('✅ Successfully navigated to survey');
                    
                    // Try to complete first few questions
                    await this.attemptSurveyQuestions();
                } else {
                    throw new Error(`Navigation failed: ${navResult.error}`);
                }
            } else if (this.testResults.surveyDiscovery.navigation?.length > 0) {
                // Navigate to survey section first
                const navLink = this.testResults.surveyDiscovery.navigation[0];
                console.log(`🔗 Navigating to survey section: ${navLink.text}`);
                
                await this.page.click(`text="${navLink.text}"`);
                await this.page.waitForTimeout(3000);
                
                // Re-detect surveys on new page
                const newSurveys = await this.surveyNavigator.detectSurveys();
                if (newSurveys.length > 0) {
                    selectedSurvey = newSurveys[0];
                    const navResult = await this.surveyNavigator.navigateToSurvey(selectedSurvey);
                    
                    if (navResult.success) {
                        await this.attemptSurveyQuestions();
                    }
                }
            }
            
            this.testResults.surveyCompletion = {
                success: true,
                selectedSurvey: selectedSurvey?.title || 'Unknown'
            };
            
        } catch (error) {
            console.error(`❌ Survey completion failed: ${error.message}`);
            this.testResults.surveyCompletion = {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Attempt to answer survey questions
     */
    async attemptSurveyQuestions() {
        console.log('📝 Attempting to answer survey questions...');
        
        try {
            // Look for questions on the page
            const questionSelectors = [
                '.question', '.survey-question', '.form-group',
                '.poll-question', '.quiz-question'
            ];
            
            let questionsFound = 0;
            
            for (const selector of questionSelectors) {
                try {
                    const questions = await this.page.locator(selector).all();
                    
                    for (let i = 0; i < Math.min(questions.length, 3); i++) { // Limit to first 3 questions
                        const question = questions[i];
                        const isVisible = await question.isVisible();
                        
                        if (isVisible) {
                            questionsFound++;
                            const questionText = await question.textContent();
                            console.log(`\n   ❓ Question ${questionsFound}: ${questionText?.substring(0, 100)}...`);
                            
                            // Try to answer the question
                            await this.answerQuestion(question, questionsFound);
                        }
                    }
                    
                    if (questionsFound > 0) break;
                    
                } catch (e) {
                    // Continue with next selector
                }
            }
            
            if (questionsFound === 0) {
                console.log('ℹ️ No recognizable questions found on page');
            } else {
                console.log(`✅ Processed ${questionsFound} questions`);
            }
            
            // Take final screenshot
            await this.page.screenshot({ 
                path: `screenshots/survey-questions-${Date.now()}.png`,
                fullPage: true 
            });
            
        } catch (error) {
            console.error(`❌ Question answering failed: ${error.message}`);
        }
    }

    /**
     * Answer a single question
     */
    async answerQuestion(questionElement, questionNumber) {
        try {
            // Check for different input types
            const hasRadio = await questionElement.locator('input[type="radio"]').count() > 0;
            const hasCheckbox = await questionElement.locator('input[type="checkbox"]').count() > 0;
            const hasText = await questionElement.locator('input[type="text"], textarea').count() > 0;
            const hasSelect = await questionElement.locator('select').count() > 0;
            
            if (hasRadio) {
                console.log(`      📊 Multiple choice question - selecting first option`);
                const firstRadio = questionElement.locator('input[type="radio"]').first();
                await firstRadio.click();
                await this.page.waitForTimeout(1000);
            } else if (hasCheckbox) {
                console.log(`      ☑️ Checkbox question - selecting first option`);
                const firstCheckbox = questionElement.locator('input[type="checkbox"]').first();
                await firstCheckbox.click();
                await this.page.waitForTimeout(1000);
            } else if (hasSelect) {
                console.log(`      📋 Dropdown question - selecting second option`);
                const select = questionElement.locator('select').first();
                const options = await select.locator('option').all();
                if (options.length > 1) {
                    const optionValue = await options[1].getAttribute('value');
                    await select.selectOption(optionValue);
                }
                await this.page.waitForTimeout(1000);
            } else if (hasText) {
                console.log(`      📝 Text question - providing sample answer`);
                const textInput = questionElement.locator('input[type="text"], textarea').first();
                await textInput.fill('This is a sample response for testing purposes.');
                await this.page.waitForTimeout(1000);
            } else {
                console.log(`      ❓ Unknown question type - skipping`);
            }
            
        } catch (error) {
            console.warn(`      ⚠️ Failed to answer question: ${error.message}`);
        }
    }

    /**
     * Navigate to profile and fill it
     */
    async navigateAndFillProfile(profileLink, persona) {
        console.log(`🔗 Navigating to profile: ${profileLink.text}`);
        
        try {
            if (profileLink.href.startsWith('http')) {
                await this.page.goto(profileLink.href);
            } else {
                await this.page.click(`text="${profileLink.text}"`);
            }
            
            await this.page.waitForTimeout(3000);
            
            // Re-detect demographics on new page
            const detection = await this.surveyDetector.detectSurveyOpportunities();
            
            if (detection.demographicsForm) {
                await this.fillDemographicsForm(detection.demographicsForm, persona);
            } else {
                console.log('ℹ️ No demographics form found on profile page');
            }
            
        } catch (error) {
            console.error(`❌ Profile navigation failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log('\n\n📊 COMPREHENSIVE TEST REPORT');
        console.log('===============================');
        
        console.log(`🎯 Target Site: ${this.options.site}`);
        console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
        
        console.log('\n📋 STEP RESULTS:');
        console.log('================');
        
        // Demographics Detection
        console.log(`\n1. 👤 DEMOGRAPHICS DETECTION: ${this.testResults.demographics?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (this.testResults.demographics?.success) {
            if (this.testResults.demographics.form) {
                console.log(`   📝 Form found with ${this.testResults.demographics.form.fields?.length || 0} fields`);
            } else if (this.testResults.demographics.profileLinks) {
                console.log(`   🔗 Found ${this.testResults.demographics.profileLinks.length} profile links`);
            }
        } else {
            console.log(`   ❌ Reason: ${this.testResults.demographics?.reason || this.testResults.demographics?.error}`);
        }
        
        // Profile Filling
        console.log(`\n2. 📝 PROFILE FILLING: ${this.testResults.profileFilling?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (this.testResults.profileFilling?.success) {
            console.log(`   🎭 Persona generated and applied successfully`);
        } else {
            console.log(`   ❌ Error: ${this.testResults.profileFilling?.error}`);
        }
        
        // Survey Discovery
        console.log(`\n3. 🔍 SURVEY DISCOVERY: ${this.testResults.surveyDiscovery?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (this.testResults.surveyDiscovery?.success) {
            if (this.testResults.surveyDiscovery.surveys) {
                console.log(`   📊 Found ${this.testResults.surveyDiscovery.count} surveys`);
            } else if (this.testResults.surveyDiscovery.navigation) {
                console.log(`   🔗 Found navigation to survey sections`);
            }
        } else {
            console.log(`   ❌ Reason: ${this.testResults.surveyDiscovery?.reason || this.testResults.surveyDiscovery?.error}`);
        }
        
        // Survey Completion
        console.log(`\n4. 📝 SURVEY COMPLETION: ${this.testResults.surveyCompletion?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (this.testResults.surveyCompletion?.success) {
            console.log(`   🎯 Survey: ${this.testResults.surveyCompletion.selectedSurvey}`);
        } else {
            console.log(`   ❌ Error: ${this.testResults.surveyCompletion?.error}`);
        }
        
        // Overall Assessment
        const successCount = Object.values(this.testResults).filter(result => result?.success).length;
        const totalSteps = Object.keys(this.testResults).length;
        
        console.log('\n🏆 OVERALL ASSESSMENT:');
        console.log('======================');
        console.log(`📊 Success Rate: ${successCount}/${totalSteps} (${Math.round(successCount/totalSteps*100)}%)`);
        
        if (successCount === totalSteps) {
            console.log('🎉 ALL TESTS PASSED! System is ready for production.');
        } else if (successCount >= totalSteps * 0.75) {
            console.log('✅ MOSTLY SUCCESSFUL! Minor adjustments needed.');
        } else if (successCount >= totalSteps * 0.5) {
            console.log('⚠️ PARTIALLY SUCCESSFUL! Significant improvements needed.');
        } else {
            console.log('❌ MAJOR ISSUES! Requires substantial debugging.');
        }
        
        console.log('\n📸 Screenshots saved to screenshots/ directory for analysis');
    }

    /**
     * Helper methods
     */
    
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return '';
        }
    }

    maskSensitiveValue(value, fieldName) {
        if (fieldName.includes('income') || fieldName.includes('salary')) {
            return `$${value?.toLocaleString ? value.toLocaleString() : value}`;
        }
        return value;
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        if (this.browser) {
            await this.browser.close();
        }
        console.log('✅ Cleanup completed');
    }
}

// Script execution
async function runTest() {
    // You can change the target site here
    const targetSites = [
        'https://surveyplanet.com', // No login required
        'https://www.swagbucks.com', // Requires login
        'https://www.surveyjunkie.com', // Requires login
        'https://us.toluna.com', // Requires login
        'https://www.inboxdollars.com' // Requires login
    ];
    
    console.log('🎯 Available test sites:');
    targetSites.forEach((site, i) => {
        console.log(`   ${i + 1}. ${site}`);
    });
    
    // Default to first site (SurveyPlanet - no login required)
    const tester = new SurveyWorkflowTester({
        site: targetSites[0], // Change index to test different sites
        headless: false, // Set to true for headless testing
        debugMode: true
    });
    
    await tester.runCompleteTest();
}

// Run the test
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = SurveyWorkflowTester;