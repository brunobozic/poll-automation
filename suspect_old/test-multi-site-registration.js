/**
 * Multi-Site Registration and Survey Completion Test
 * 
 * This script will:
 * 1. Test registration on multiple survey sites
 * 2. Fill in demographic profiles where available
 * 3. Attempt to complete actual surveys
 * 4. Log all interactions comprehensively
 */

const { chromium } = require('playwright');
const SiteSpecificSurveyDetector = require('./src/survey/site-specific-survey-detector');
const OptimalPersonaGenerator = require('./src/survey/optimal-persona-generator');
const AutomaticLoginSystem = require('./src/automation/automatic-login-system');
const SurveyNavigator = require('./src/survey/survey-navigator');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const LoggedAIWrapper = require('./src/ai/logged-ai-wrapper');
const RegistrationLogger = require('./src/database/registration-logger');
const EnhancedLogger = require('./src/utils/enhanced-logger');
const EmailAccountManager = require('./src/email/email-account-manager');

class MultiSiteRegistrationTester {
    constructor(options = {}) {
        this.options = {
            headless: false,
            debugMode: true,
            slowMo: 1500,
            maxSitesToTest: 5,
            maxSurveysPerSite: 2,
            enableRegistration: true,
            enableSurveyCompletion: true,
            ...options
        };
        
        // Test sites - mix of no-login and registration-required sites
        this.testSites = [
            {
                name: 'SurveyPlanet',
                url: 'https://surveyplanet.com',
                type: 'public_surveys',
                requiresRegistration: false,
                hasProfiles: false,
                priority: 'high'
            },
            {
                name: 'Google Forms',
                url: 'https://docs.google.com/forms',
                type: 'public_forms',
                requiresRegistration: false,
                hasProfiles: false,
                priority: 'high'
            },
            {
                name: 'Typeform',
                url: 'https://typeform.com',
                type: 'survey_platform',
                requiresRegistration: true,
                hasProfiles: true,
                priority: 'medium'
            },
            {
                name: 'SurveyMonkey',
                url: 'https://surveymonkey.com',
                type: 'survey_platform',
                requiresRegistration: true,
                hasProfiles: true,
                priority: 'medium'
            },
            {
                name: 'Qualtrics',
                url: 'https://qualtrics.com',
                type: 'enterprise_surveys',
                requiresRegistration: true,
                hasProfiles: true,
                priority: 'low'
            }
        ];
        
        this.browser = null;
        this.testResults = {
            totalSites: 0,
            successfulRegistrations: 0,
            completedSurveys: 0,
            errors: [],
            siteResults: {}
        };
        
        console.log('🚀 Multi-Site Registration Tester initialized');
        console.log(`🎯 Will test ${Math.min(this.options.maxSitesToTest, this.testSites.length)} sites`);
    }

    /**
     * Run comprehensive multi-site testing
     */
    async runMultiSiteTest() {
        console.log('\n🚀 Starting Multi-Site Registration and Survey Testing\n');
        
        try {
            // Initialize browser and components
            await this.initialize();
            
            await this.logger.log('SYSTEM', 'info', '🚀 Multi-Site Test Started', {
                maxSites: this.options.maxSitesToTest,
                enableRegistration: this.options.enableRegistration,
                enableSurveyCompletion: this.options.enableSurveyCompletion
            });
            
            // Generate personas for different sites
            await this.generateTestPersonas();
            
            // Test each site
            const sitesToTest = this.testSites
                .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority))
                .slice(0, this.options.maxSitesToTest);
                
            for (let i = 0; i < sitesToTest.length; i++) {
                const site = sitesToTest[i];
                
                await this.logger.log('SITE', 'info', `🌐 Testing Site ${i + 1}/${sitesToTest.length}: ${site.name}`, {
                    siteUrl: site.url,
                    requiresRegistration: site.requiresRegistration,
                    hasProfiles: site.hasProfiles
                });
                
                try {
                    await this.testSite(site, i + 1);
                    this.testResults.totalSites++;
                } catch (error) {
                    await this.logger.log('ERROR', 'error', `❌ Site test failed: ${site.name}`, {
                        error: error.message,
                        siteUrl: site.url
                    });
                    this.testResults.errors.push({
                        site: site.name,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Delay between sites to avoid rate limiting
                if (i < sitesToTest.length - 1) {
                    await this.logger.log('SYSTEM', 'info', '⏱️ Waiting between sites...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            
            // Generate comprehensive report
            this.generateFinalReport();
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Multi-site test failed', {
                error: error.message
            });
            console.error(`❌ Test failed: ${error.message}`);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Initialize browser and components
     */
    async initialize() {
        console.log('🔧 Initializing browser and components...');
        
        // Initialize components first
        this.registrationLogger = new RegistrationLogger();
        await this.registrationLogger.initialize();
        
        this.logger = new EnhancedLogger(this.registrationLogger, {
            logLevel: 'info', // Less verbose for multi-site testing
            enableConsoleLogging: true,
            enableDatabaseLogging: true,
            enableFileLogging: true
        });
        
        this.browser = await chromium.launch({
            headless: this.options.headless,
            slowMo: this.options.slowMo,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
        
        this.page = await context.newPage();
        
        // Initialize AI and automation components
        const baseAI = new ContentUnderstandingAI();
        this.contentAI = new LoggedAIWrapper(baseAI, this.logger);
        
        this.personaGenerator = new OptimalPersonaGenerator(
            this.registrationLogger,
            this.contentAI,
            { debugMode: this.options.debugMode }
        );
        
        this.surveyDetector = new SiteSpecificSurveyDetector(
            this.page, 
            this.contentAI, 
            { debugMode: this.options.debugMode }
        );
        
        this.formAutomator = new UniversalFormAutomator(
            this.contentAI,
            { debugMode: this.options.debugMode }
        );
        
        this.emailManager = new EmailAccountManager(this.registrationLogger);
        
        await this.logger.log('SUCCESS', 'info', '✅ Components initialized successfully');
    }

    /**
     * Generate test personas for different demographic profiles
     */
    async generateTestPersonas() {
        await this.logger.log('PERSONA', 'info', '🎭 Generating test personas...');
        
        this.personas = [
            // Persona 1: Young professional female
            {
                demographics: {
                    age: 28,
                    gender: 'Female',
                    income: 65000,
                    education: "Bachelor's degree",
                    city: 'Austin',
                    state: 'TX',
                    country: 'United States',
                    maritalStatus: 'Single',
                    householdSize: 1
                },
                identity: {
                    firstName: 'Sarah',
                    lastName: 'Johnson',
                    birthDate: new Date(1996, 3, 20),
                    phoneNumber: '512-555-0147'
                },
                professional: {
                    jobTitle: 'Software Developer',
                    industry: 'Technology',
                    employmentType: 'Full-time',
                    workExperience: 5
                },
                lifestyle: {
                    primaryLifestyle: 'Tech-savvy',
                    technologyUsage: 'Heavy',
                    interests: ['Technology', 'Gaming', 'Fitness', 'Travel']
                },
                optimizationScore: 88
            },
            // Persona 2: Middle-aged professional male
            {
                demographics: {
                    age: 42,
                    gender: 'Male',
                    income: 95000,
                    education: "Master's degree",
                    city: 'Denver',
                    state: 'CO',
                    country: 'United States',
                    maritalStatus: 'Married',
                    householdSize: 4
                },
                identity: {
                    firstName: 'Michael',
                    lastName: 'Davis',
                    birthDate: new Date(1982, 8, 10),
                    phoneNumber: '303-555-0298'
                },
                professional: {
                    jobTitle: 'Project Manager',
                    industry: 'Finance',
                    employmentType: 'Full-time',
                    workExperience: 18
                },
                lifestyle: {
                    primaryLifestyle: 'Family-oriented',
                    technologyUsage: 'Moderate',
                    interests: ['Sports', 'Investing', 'Home Improvement', 'Family Activities']
                },
                optimizationScore: 94
            },
            // Persona 3: Young female student/part-time worker
            {
                demographics: {
                    age: 22,
                    gender: 'Female',
                    income: 35000,
                    education: "Some college",
                    city: 'Seattle',
                    state: 'WA',
                    country: 'United States',
                    maritalStatus: 'Single',
                    householdSize: 1
                },
                identity: {
                    firstName: 'Emma',
                    lastName: 'Wilson',
                    birthDate: new Date(2002, 11, 5),
                    phoneNumber: '206-555-0356'
                },
                professional: {
                    jobTitle: 'Student/Barista',
                    industry: 'Education/Service',
                    employmentType: 'Part-time',
                    workExperience: 2
                },
                lifestyle: {
                    primaryLifestyle: 'Student',
                    technologyUsage: 'Heavy',
                    interests: ['Social Media', 'Music', 'Fashion', 'Sustainability']
                },
                optimizationScore: 82
            }
        ];
        
        await this.logger.log('PERSONA', 'info', `✅ Generated ${this.personas.length} test personas`, {
            personaCount: this.personas.length,
            ageRange: `${Math.min(...this.personas.map(p => p.demographics.age))}-${Math.max(...this.personas.map(p => p.demographics.age))}`,
            genderSplit: this.personas.reduce((acc, p) => {
                acc[p.demographics.gender] = (acc[p.demographics.gender] || 0) + 1;
                return acc;
            }, {})
        });
    }

    /**
     * Test a specific site
     */
    async testSite(site, siteNumber) {
        await this.logger.log('SITE', 'info', `🌐 Starting test for ${site.name}`, {
            siteUrl: site.url,
            siteNumber: siteNumber
        });
        
        const siteResult = {
            name: site.name,
            url: site.url,
            registrationAttempted: false,
            registrationSuccessful: false,
            profileFilled: false,
            surveysFound: 0,
            surveysCompleted: 0,
            errors: [],
            screenshots: []
        };
        
        try {
            // Navigate to site
            await this.logger.log('NAVIGATION', 'info', `🧭 Navigating to ${site.name}`);
            await this.page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
            await this.page.waitForTimeout(2000);
            
            // Take initial screenshot
            const initialScreenshot = `screenshots/site-${siteNumber}-${site.name.toLowerCase()}-initial.png`;
            await this.page.screenshot({ path: initialScreenshot, fullPage: true });
            siteResult.screenshots.push(initialScreenshot);
            
            await this.logger.log('SUCCESS', 'info', `✅ Successfully navigated to ${site.name}`, {
                currentUrl: await this.page.url(),
                title: await this.page.title()
            });
            
            // Check if registration is required and available
            if (site.requiresRegistration && this.options.enableRegistration) {
                await this.attemptRegistration(site, siteResult);
            }
            
            // Look for surveys regardless of registration status
            await this.findAndCompleteSurveys(site, siteResult);
            
            // Fill profile if available and we're registered
            if (site.hasProfiles && siteResult.registrationSuccessful) {
                await this.fillDemographicProfile(site, siteResult);
            }
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', `❌ Site test error: ${site.name}`, {
                error: error.message
            });
            siteResult.errors.push({
                step: 'site_test',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        this.testResults.siteResults[site.name] = siteResult;
        
        await this.logger.log('SITE', 'info', `📊 Completed test for ${site.name}`, {
            registrationSuccessful: siteResult.registrationSuccessful,
            surveysCompleted: siteResult.surveysCompleted,
            errorsCount: siteResult.errors.length
        });
    }

    /**
     * Attempt registration on a site
     */
    async attemptRegistration(site, siteResult) {
        await this.logger.log('REGISTRATION', 'info', `📝 Attempting registration on ${site.name}`);
        siteResult.registrationAttempted = true;
        
        try {
            // Create a temporary email for this registration
            const email = await this.emailManager.createEmailAccount();
            await this.logger.log('EMAIL', 'info', `📧 Created email: ${email.email}`);
            
            // Use one of our personas for this registration
            const persona = this.personas[Math.floor(Math.random() * this.personas.length)];
            
            // Look for registration/signup forms
            const registrationForms = await this.findRegistrationForms();
            
            if (registrationForms.length > 0) {
                await this.logger.log('FORM', 'info', `📋 Found ${registrationForms.length} registration forms`);
                
                // Attempt to fill the first viable registration form
                const success = await this.fillRegistrationForm(registrationForms[0], email, persona);
                
                if (success) {
                    siteResult.registrationSuccessful = true;
                    this.testResults.successfulRegistrations++;
                    
                    await this.logger.log('SUCCESS', 'info', `✅ Registration successful on ${site.name}`, {
                        email: email.email,
                        persona: `${persona.identity.firstName} ${persona.identity.lastName}`
                    });
                } else {
                    await this.logger.log('WARNING', 'warn', `⚠️ Registration form fill failed on ${site.name}`);
                }
            } else {
                await this.logger.log('INFO', 'info', `ℹ️ No registration forms found on ${site.name}`);
            }
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', `❌ Registration failed on ${site.name}`, {
                error: error.message
            });
            siteResult.errors.push({
                step: 'registration',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Find registration forms on the current page
     */
    async findRegistrationForms() {
        const registrationSelectors = [
            'form[action*="register"]',
            'form[action*="signup"]',
            'form[action*="join"]',
            'form:has(input[name*="email"]):has(input[name*="password"])',
            '.registration-form',
            '.signup-form',
            '.join-form',
            '#registration',
            '#signup',
            '[id*="register"]',
            '[class*="register"]',
            '[class*="signup"]'
        ];
        
        const forms = [];
        
        for (const selector of registrationSelectors) {
            try {
                const elements = await this.page.locator(selector).all();
                for (const element of elements) {
                    if (await element.isVisible()) {
                        forms.push({
                            element: element,
                            selector: selector,
                            type: 'registration'
                        });
                    }
                }
                
                if (forms.length > 0) break; // Found forms with this selector
            } catch (e) {
                // Continue with next selector
            }
        }
        
        return forms;
    }

    /**
     * Fill a registration form
     */
    async fillRegistrationForm(form, email, persona) {
        await this.logger.log('FORM', 'info', '📝 Filling registration form');
        
        try {
            // Use our universal form automator
            const fillResult = await this.formAutomator.fillForm(this.page, {
                email: email.email,
                password: email.password || 'TempPass123!',
                firstName: persona.identity.firstName,
                lastName: persona.identity.lastName,
                age: persona.demographics.age,
                gender: persona.demographics.gender,
                city: persona.demographics.city,
                state: persona.demographics.state,
                country: persona.demographics.country,
                phoneNumber: persona.identity.phoneNumber,
                occupation: persona.professional.jobTitle
            });
            
            if (fillResult.success) {
                // Try to submit the form
                await this.submitForm(form);
                
                // Wait for response and check for success indicators
                await this.page.waitForTimeout(3000);
                
                const successIndicators = [
                    'welcome', 'success', 'registered', 'confirmation', 
                    'verify', 'check your email', 'account created'
                ];
                
                const pageContent = await this.page.content();
                const isSuccess = successIndicators.some(indicator => 
                    pageContent.toLowerCase().includes(indicator)
                );
                
                return isSuccess;
            }
            
            return false;
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Form filling failed', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Submit a form
     */
    async submitForm(form) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.submit-btn',
            '.register-btn',
            '.signup-btn',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Join")',
            'button:has-text("Create Account")'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = form.element.locator(selector).first();
                if (await button.isVisible() && await button.isEnabled()) {
                    await button.click();
                    await this.logger.log('FORM', 'info', `📤 Submitted form using: ${selector}`);
                    return true;
                }
            } catch (e) {
                // Continue with next selector
            }
        }
        
        return false;
    }

    /**
     * Find and complete surveys on the current site
     */
    async findAndCompleteSurveys(site, siteResult) {
        await this.logger.log('SURVEY', 'info', `🔍 Looking for surveys on ${site.name}`);
        
        try {
            // Use our survey detector to find available surveys
            const surveys = await this.surveyDetector.detectSurveyOpportunities();
            
            siteResult.surveysFound = surveys.surveyEntryPoints?.length || 0;
            
            if (siteResult.surveysFound > 0) {
                await this.logger.log('SURVEY', 'info', `📊 Found ${siteResult.surveysFound} surveys on ${site.name}`);
                
                // Attempt to complete surveys up to our limit
                const surveysToComplete = Math.min(
                    siteResult.surveysFound, 
                    this.options.maxSurveysPerSite
                );
                
                for (let i = 0; i < surveysToComplete; i++) {
                    try {
                        const surveyUrl = surveys.surveyEntryPoints[i]?.url || surveys.surveyEntryPoints[i]?.selector;
                        await this.completeSurvey(surveyUrl, site, siteResult, i + 1);
                        siteResult.surveysCompleted++;
                        this.testResults.completedSurveys++;
                    } catch (error) {
                        await this.logger.log('ERROR', 'error', `❌ Survey completion failed`, {
                            surveyIndex: i + 1,
                            error: error.message
                        });
                        siteResult.errors.push({
                            step: `survey_${i + 1}`,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            } else {
                await this.logger.log('INFO', 'info', `ℹ️ No surveys found on ${site.name}`);
            }
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', `❌ Survey detection failed on ${site.name}`, {
                error: error.message
            });
            siteResult.errors.push({
                step: 'survey_detection',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Complete a specific survey
     */
    async completeSurvey(surveyUrl, site, siteResult, surveyNumber) {
        await this.logger.log('SURVEY', 'info', `📝 Completing survey ${surveyNumber} on ${site.name}`);
        
        try {
            // Navigate to survey if it's a URL
            if (surveyUrl && surveyUrl.startsWith('http')) {
                await this.page.goto(surveyUrl, { waitUntil: 'networkidle' });
            } else if (surveyUrl) {
                // It's a selector, click it
                await this.page.click(surveyUrl);
            }
            
            await this.page.waitForTimeout(2000);
            
            // Take screenshot of survey
            const surveyScreenshot = `screenshots/site-${site.name.toLowerCase()}-survey-${surveyNumber}.png`;
            await this.page.screenshot({ path: surveyScreenshot, fullPage: true });
            siteResult.screenshots.push(surveyScreenshot);
            
            // Use a random persona for survey responses
            const persona = this.personas[Math.floor(Math.random() * this.personas.length)];
            
            // Look for questions and answer them
            const questionsAnswered = await this.answerSurveyQuestions(persona);
            
            await this.logger.log('SURVEY', 'info', `✅ Survey ${surveyNumber} completed`, {
                site: site.name,
                questionsAnswered: questionsAnswered,
                persona: `${persona.identity.firstName} ${persona.identity.lastName}`
            });
            
            return true;
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', `❌ Survey completion failed`, {
                surveyNumber: surveyNumber,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Answer survey questions using persona-consistent responses
     */
    async answerSurveyQuestions(persona) {
        let questionsAnswered = 0;
        const maxQuestions = 10; // Limit to prevent infinite loops
        
        const questionSelectors = [
            '.question', '.survey-question', '.form-group',
            '.poll-question', '.quiz-question', '.sp-question',
            '[class*="question"]', '[id*="question"]'
        ];
        
        for (const selector of questionSelectors) {
            try {
                const questions = await this.page.locator(selector).all();
                
                for (let i = 0; i < Math.min(questions.length, maxQuestions); i++) {
                    const question = questions[i];
                    
                    if (await question.isVisible()) {
                        await this.answerQuestion(question, persona);
                        questionsAnswered++;
                        
                        // Human-like delay between questions
                        await this.page.waitForTimeout(1000 + Math.random() * 2000);
                    }
                }
                
                if (questionsAnswered > 0) break; // Found and answered questions
                
            } catch (e) {
                // Continue with next selector
            }
        }
        
        // Try to submit if we answered questions
        if (questionsAnswered > 0) {
            await this.trySubmitSurvey();
        }
        
        return questionsAnswered;
    }

    /**
     * Answer a single survey question
     */
    async answerQuestion(questionElement, persona) {
        try {
            const questionText = await questionElement.textContent();
            
            // Determine question type and answer appropriately
            const hasRadio = await questionElement.locator('input[type="radio"]').count() > 0;
            const hasCheckbox = await questionElement.locator('input[type="checkbox"]').count() > 0;
            const hasText = await questionElement.locator('input[type="text"], textarea').count() > 0;
            const hasSelect = await questionElement.locator('select').count() > 0;
            const hasRange = await questionElement.locator('input[type="range"]').count() > 0;
            
            if (hasRadio) {
                // Multiple choice - select based on persona preferences
                const options = await questionElement.locator('input[type="radio"]').all();
                if (options.length > 0) {
                    const selectedIndex = this.getPersonaBasedChoice(questionText, options.length, persona);
                    await options[selectedIndex].click();
                }
            } else if (hasCheckbox) {
                // Checkbox - might select multiple based on persona
                const checkboxes = await questionElement.locator('input[type="checkbox"]').all();
                const selectCount = Math.min(Math.ceil(checkboxes.length * 0.3), 3); // Select up to 30% or 3 items
                for (let i = 0; i < selectCount; i++) {
                    const index = Math.floor(Math.random() * checkboxes.length);
                    await checkboxes[index].click();
                }
            } else if (hasSelect) {
                // Dropdown selection
                const select = questionElement.locator('select').first();
                const options = await select.locator('option').all();
                if (options.length > 1) {
                    const selectedIndex = this.getPersonaBasedChoice(questionText, options.length - 1, persona) + 1; // Skip first (usually empty)
                    const optionValue = await options[selectedIndex].getAttribute('value');
                    await select.selectOption(optionValue);
                }
            } else if (hasRange) {
                // Range/slider - set based on persona characteristics
                const range = questionElement.locator('input[type="range"]').first();
                const value = this.getPersonaBasedRangeValue(questionText, persona);
                await range.fill(value.toString());
            } else if (hasText) {
                // Text input - provide persona-appropriate response
                const textInput = questionElement.locator('input[type="text"], textarea').first();
                const response = this.getPersonaBasedTextResponse(questionText, persona);
                await textInput.fill(response);
            }
            
        } catch (error) {
            await this.logger.log('WARNING', 'warn', '⚠️ Failed to answer question', {
                error: error.message
            });
        }
    }

    /**
     * Get persona-based choice for multiple choice questions
     */
    getPersonaBasedChoice(questionText, optionCount, persona) {
        const lowerQuestion = questionText.toLowerCase();
        
        // Age-based preferences
        if (lowerQuestion.includes('age') || lowerQuestion.includes('generation')) {
            if (persona.demographics.age < 30) return 0; // First option for young
            if (persona.demographics.age > 50) return optionCount - 1; // Last option for older
            return Math.floor(optionCount / 2); // Middle for middle-aged
        }
        
        // Income-based preferences
        if (lowerQuestion.includes('income') || lowerQuestion.includes('salary') || lowerQuestion.includes('budget')) {
            if (persona.demographics.income > 80000) return Math.min(optionCount - 1, Math.floor(optionCount * 0.8));
            if (persona.demographics.income < 40000) return 0;
            return Math.floor(optionCount / 2);
        }
        
        // Technology usage based
        if (lowerQuestion.includes('technology') || lowerQuestion.includes('digital') || lowerQuestion.includes('online')) {
            if (persona.lifestyle.technologyUsage === 'Heavy') return optionCount - 1;
            if (persona.lifestyle.technologyUsage === 'Light') return 0;
            return Math.floor(optionCount / 2);
        }
        
        // Default: slight preference for middle-to-positive options
        return Math.floor(Math.random() * Math.max(1, optionCount - 1)) + Math.floor(optionCount * 0.2);
    }

    /**
     * Get persona-based range value
     */
    getPersonaBasedRangeValue(questionText, persona) {
        const lowerQuestion = questionText.toLowerCase();
        
        if (lowerQuestion.includes('satisfaction') || lowerQuestion.includes('happy')) {
            return 7 + Math.floor(Math.random() * 3); // 7-9 (generally satisfied)
        }
        
        if (lowerQuestion.includes('likely') || lowerQuestion.includes('recommend')) {
            return 6 + Math.floor(Math.random() * 4); // 6-9 (likely to recommend)
        }
        
        if (lowerQuestion.includes('frequency') || lowerQuestion.includes('often')) {
            if (persona.lifestyle.technologyUsage === 'Heavy') return 8 + Math.floor(Math.random() * 2);
            return 4 + Math.floor(Math.random() * 4);
        }
        
        // Default range value
        return 5 + Math.floor(Math.random() * 4); // 5-8
    }

    /**
     * Get persona-based text response
     */
    getPersonaBasedTextResponse(questionText, persona) {
        const lowerQuestion = questionText.toLowerCase();
        
        const responses = {
            name: `${persona.identity.firstName} ${persona.identity.lastName}`,
            email: `${persona.identity.firstName.toLowerCase()}.${persona.identity.lastName.toLowerCase()}@example.com`,
            age: persona.demographics.age.toString(),
            city: persona.demographics.city,
            job: persona.professional.jobTitle,
            experience: `I have been working in ${persona.professional.industry.toLowerCase()} for ${persona.professional.workExperience} years.`,
            feedback: `As a ${persona.professional.jobTitle.toLowerCase()}, I appreciate products that are reliable and user-friendly.`,
            suggestions: `From my perspective as someone in ${persona.professional.industry.toLowerCase()}, I think there's always room for improvement in user experience.`,
            default: `This is my honest opinion based on my experience as a ${persona.demographics.age}-year-old ${persona.professional.jobTitle.toLowerCase()}.`
        };
        
        if (lowerQuestion.includes('name')) return responses.name;
        if (lowerQuestion.includes('email')) return responses.email;
        if (lowerQuestion.includes('age')) return responses.age;
        if (lowerQuestion.includes('city') || lowerQuestion.includes('location')) return responses.city;
        if (lowerQuestion.includes('job') || lowerQuestion.includes('occupation')) return responses.job;
        if (lowerQuestion.includes('experience')) return responses.experience;
        if (lowerQuestion.includes('feedback') || lowerQuestion.includes('comment')) return responses.feedback;
        if (lowerQuestion.includes('suggest') || lowerQuestion.includes('improve')) return responses.suggestions;
        
        return responses.default;
    }

    /**
     * Try to submit survey
     */
    async trySubmitSurvey() {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.submit-btn',
            '.finish-btn',
            '.complete-btn',
            'button:has-text("Submit")',
            'button:has-text("Finish")',
            'button:has-text("Complete")',
            'button:has-text("Next")',
            'button:has-text("Continue")'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = this.page.locator(selector).first();
                if (await button.isVisible() && await button.isEnabled()) {
                    await button.click();
                    await this.page.waitForTimeout(2000);
                    return true;
                }
            } catch (e) {
                // Continue with next selector
            }
        }
        
        return false;
    }

    /**
     * Fill demographic profile if available
     */
    async fillDemographicProfile(site, siteResult) {
        await this.logger.log('PROFILE', 'info', `👤 Filling demographic profile on ${site.name}`);
        
        try {
            // Look for profile/settings/demographics links
            const profileLinks = [
                'a[href*="profile"]', 'a[href*="settings"]', 'a[href*="demographic"]',
                'a:has-text("Profile")', 'a:has-text("Settings")', 'a:has-text("Demographics")',
                '.profile-link', '.settings-link'
            ];
            
            let profileFound = false;
            
            for (const selector of profileLinks) {
                try {
                    const link = this.page.locator(selector).first();
                    if (await link.isVisible()) {
                        await link.click();
                        await this.page.waitForTimeout(3000);
                        profileFound = true;
                        break;
                    }
                } catch (e) {
                    // Continue with next selector
                }
            }
            
            if (profileFound) {
                // Use a persona to fill the profile
                const persona = this.personas[0]; // Use first persona for consistency
                
                const fillResult = await this.formAutomator.fillForm(this.page, {
                    age: persona.demographics.age,
                    gender: persona.demographics.gender,
                    income: persona.demographics.income,
                    education: persona.demographics.education,
                    city: persona.demographics.city,
                    state: persona.demographics.state,
                    occupation: persona.professional.jobTitle,
                    maritalStatus: persona.demographics.maritalStatus
                });
                
                if (fillResult.success) {
                    siteResult.profileFilled = true;
                    await this.logger.log('SUCCESS', 'info', `✅ Profile filled on ${site.name}`);
                }
            }
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', `❌ Profile filling failed on ${site.name}`, {
                error: error.message
            });
            siteResult.errors.push({
                step: 'profile_filling',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Generate comprehensive final report
     */
    generateFinalReport() {
        console.log('\n\n📊 MULTI-SITE REGISTRATION & SURVEY COMPLETION REPORT');
        console.log('=======================================================');
        
        console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
        console.log(`🌐 Total Sites Tested: ${this.testResults.totalSites}`);
        console.log(`📝 Successful Registrations: ${this.testResults.successfulRegistrations}`);
        console.log(`📊 Surveys Completed: ${this.testResults.completedSurveys}`);
        console.log(`❌ Total Errors: ${this.testResults.errors.length}`);
        
        // Site-by-site breakdown
        console.log('\n📋 SITE-BY-SITE RESULTS:');
        console.log('========================');
        
        Object.entries(this.testResults.siteResults).forEach(([siteName, result]) => {
            console.log(`\n🌐 ${siteName}:`);
            console.log(`   📝 Registration: ${result.registrationAttempted ? (result.registrationSuccessful ? '✅ Success' : '❌ Failed') : '⏭️ Skipped'}`);
            console.log(`   👤 Profile Filled: ${result.profileFilled ? '✅ Yes' : '❌ No'}`);
            console.log(`   📊 Surveys Found: ${result.surveysFound}`);
            console.log(`   ✅ Surveys Completed: ${result.surveysCompleted}`);
            console.log(`   ❌ Errors: ${result.errors.length}`);
            console.log(`   📸 Screenshots: ${result.screenshots.length}`);
            
            if (result.errors.length > 0) {
                console.log(`   🔍 Error Details:`);
                result.errors.forEach((error, i) => {
                    console.log(`      ${i + 1}. ${error.step}: ${error.error}`);
                });
            }
        });
        
        // Success rate analysis
        const successRate = this.testResults.totalSites > 0 ? 
            (this.testResults.successfulRegistrations / this.testResults.totalSites * 100).toFixed(1) : 0;
        
        console.log('\n🏆 OVERALL PERFORMANCE:');
        console.log('=======================');
        console.log(`📈 Registration Success Rate: ${successRate}%`);
        console.log(`📊 Average Surveys per Site: ${this.testResults.totalSites > 0 ? (this.testResults.completedSurveys / this.testResults.totalSites).toFixed(1) : 0}`);
        console.log(`🎭 Personas Used: ${this.personas.length}`);
        
        if (successRate >= 80) {
            console.log('🎉 EXCELLENT! System performing very well across multiple sites.');
        } else if (successRate >= 60) {
            console.log('✅ GOOD! System working well with some areas for improvement.');
        } else if (successRate >= 40) {
            console.log('⚠️ MODERATE! Some sites working, others need attention.');
        } else {
            console.log('❌ NEEDS WORK! Multiple issues detected across sites.');
        }
        
        console.log('\n💾 DATABASE STATUS:');
        console.log('==================');
        console.log('📊 All interactions logged to SQLite for analysis and improvement');
        console.log('🔍 Check ./data/registrations.db for detailed logs');
        console.log('📸 Screenshots saved to ./screenshots/ directory');
    }

    /**
     * Utility methods
     */
    
    getPriorityWeight(priority) {
        const weights = { high: 1, medium: 2, low: 3 };
        return weights[priority] || 2;
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.registrationLogger) {
            await this.registrationLogger.close();
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Run the multi-site test
async function runMultiSiteTest() {
    const tester = new MultiSiteRegistrationTester({
        headless: false, // Keep visible to observe
        maxSitesToTest: 3, // Test 3 sites per run
        maxSurveysPerSite: 2, // Complete up to 2 surveys per site
        enableRegistration: true,
        enableSurveyCompletion: true,
        debugMode: true
    });
    
    await tester.runMultiSiteTest();
}

if (require.main === module) {
    runMultiSiteTest().catch(console.error);
}

module.exports = MultiSiteRegistrationTester;