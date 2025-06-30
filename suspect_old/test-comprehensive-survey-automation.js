/**
 * Comprehensive Survey Automation Test
 * 
 * This script will run multiple iterations of:
 * 1. Creating email accounts
 * 2. Registering on survey sites  
 * 3. Filling demographic profiles
 * 4. Finding and completing surveys
 * 5. Comprehensive logging and reporting
 */

const { chromium } = require('playwright');
const EmailAccountManager = require('./src/email/email-account-manager');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const SiteSpecificSurveyDetector = require('./src/survey/site-specific-survey-detector');
const OptimalPersonaGenerator = require('./src/survey/optimal-persona-generator');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const LoggedAIWrapper = require('./src/ai/logged-ai-wrapper');
const RegistrationLogger = require('./src/database/registration-logger');
const EnhancedLogger = require('./src/utils/enhanced-logger');

class ComprehensiveSurveyAutomation {
    constructor(options = {}) {
        this.options = {
            headless: false,
            iterations: 3,
            maxSitesPerIteration: 2,
            enableEmailCreation: true,
            enableRegistration: true,
            enableProfileFilling: true,
            enableSurveyCompletion: true,
            debugMode: true,
            ...options
        };
        
        // Focus on sites that are more likely to work for registration
        this.targetSites = [
            {
                name: 'Rewards Survey Site',
                baseUrl: 'https://www.rewardingways.com',
                registrationPath: '/join',
                type: 'reward_site',
                hasProfiles: true,
                difficulty: 'medium'
            },
            {
                name: 'Survey Junkie Clone',
                baseUrl: 'https://www.surveysavvy.com', 
                registrationPath: '/register',
                type: 'survey_site',
                hasProfiles: true,
                difficulty: 'medium'
            },
            {
                name: 'Test Survey Platform',
                baseUrl: 'https://www.surveyrewardz.com',
                registrationPath: '/signup',
                type: 'test_platform',
                hasProfiles: false,
                difficulty: 'easy'
            }
        ];
        
        this.totalResults = {
            iterations: 0,
            emailsCreated: 0,
            registrationAttempts: 0,
            successfulRegistrations: 0,
            profilesFilled: 0,
            surveysCompleted: 0,
            questionsAnswered: 0,
            errors: [],
            personas: []
        };
        
        console.log('🚀 Comprehensive Survey Automation initialized');
        console.log(`🔄 Will run ${this.options.iterations} iterations`);
        console.log(`🌐 Testing ${this.options.maxSitesPerIteration} sites per iteration`);
    }

    async runComprehensiveTest() {
        console.log('\n🚀 Starting Comprehensive Survey Automation Test\n');
        
        try {
            await this.initialize();
            
            // Run multiple iterations
            for (let iteration = 1; iteration <= this.options.iterations; iteration++) {
                console.log(`\n🔄 === ITERATION ${iteration}/${this.options.iterations} ===`);
                
                await this.logger.log('ITERATION', 'info', `🔄 Starting iteration ${iteration}`, {
                    iteration: iteration,
                    totalIterations: this.options.iterations
                });
                
                try {
                    await this.runSingleIteration(iteration);
                    this.totalResults.iterations++;
                } catch (error) {
                    await this.logger.log('ERROR', 'error', `❌ Iteration ${iteration} failed`, {
                        error: error.message
                    });
                    this.totalResults.errors.push({
                        type: 'iteration_failure',
                        iteration: iteration,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Wait between iterations
                if (iteration < this.options.iterations) {
                    await this.logger.log('SYSTEM', 'info', '⏱️ Waiting between iterations...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            
            this.generateComprehensiveReport();
            
        } catch (error) {
            console.error('❌ Comprehensive test failed:', error.message);
        } finally {
            await this.cleanup();
        }
    }

    async initialize() {
        console.log('🔧 Initializing comprehensive test components...');
        
        this.registrationLogger = new RegistrationLogger();
        await this.registrationLogger.initialize();
        
        this.logger = new EnhancedLogger(this.registrationLogger, {
            logLevel: 'info',
            enableConsoleLogging: true,
            enableDatabaseLogging: true,
            enableFileLogging: true
        });
        
        this.browser = await chromium.launch({
            headless: this.options.headless,
            slowMo: 1500,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
        
        this.page = await context.newPage();
        
        // Initialize AI and automation components
        const baseAI = new ContentUnderstandingAI();
        this.contentAI = new LoggedAIWrapper(baseAI, this.logger);
        
        this.emailManager = new EmailAccountManager(this.registrationLogger);
        this.formAutomator = new UniversalFormAutomator(this.contentAI, { debugMode: this.options.debugMode });
        this.surveyDetector = new SiteSpecificSurveyDetector(this.page, this.contentAI, { debugMode: this.options.debugMode });
        this.personaGenerator = new OptimalPersonaGenerator(this.registrationLogger, this.contentAI, { debugMode: this.options.debugMode });
        
        await this.logger.log('SUCCESS', 'info', '✅ Comprehensive test components initialized');
    }

    async runSingleIteration(iteration) {
        const iterationResults = {
            emails: [],
            registrations: [],
            profiles: [],
            surveys: []
        };
        
        // Step 1: Create email accounts for this iteration
        if (this.options.enableEmailCreation) {
            await this.createEmailAccountsForIteration(iterationResults, iteration);
        }
        
        // Step 2: Generate personas
        const personas = await this.generatePersonasForIteration(iteration);
        
        // Step 3: Attempt registrations on target sites
        if (this.options.enableRegistration) {
            await this.attemptRegistrationsForIteration(iterationResults, personas, iteration);
        }
        
        // Step 4: Fill demographic profiles where possible
        if (this.options.enableProfileFilling) {
            await this.fillDemographicProfilesForIteration(iterationResults, personas, iteration);
        }
        
        // Step 5: Find and complete surveys
        if (this.options.enableSurveyCompletion) {
            await this.completeSurveysForIteration(iterationResults, personas, iteration);
        }
        
        await this.generateIterationReport(iteration, iterationResults);
    }

    async createEmailAccountsForIteration(iterationResults, iteration) {
        await this.logger.log('EMAIL', 'info', `📧 Creating email accounts for iteration ${iteration}`);
        
        const emailsToCreate = Math.min(this.options.maxSitesPerIteration, 3);
        
        for (let i = 0; i < emailsToCreate; i++) {
            try {
                const email = await this.emailManager.createEmailAccount();
                iterationResults.emails.push(email);
                this.totalResults.emailsCreated++;
                
                await this.logger.log('EMAIL', 'info', `✅ Created email: ${email.email}`, {
                    service: email.service,
                    iteration: iteration
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
                
            } catch (error) {
                await this.logger.log('ERROR', 'error', `❌ Email creation failed`, {
                    iteration: iteration,
                    emailIndex: i,
                    error: error.message
                });
            }
        }
        
        console.log(`   📧 Created ${iterationResults.emails.length} email accounts`);
    }

    async generatePersonasForIteration(iteration) {
        await this.logger.log('PERSONA', 'info', `🎭 Generating personas for iteration ${iteration}`);
        
        const personas = [
            // Professional Female
            {
                identity: {
                    firstName: 'Jennifer',
                    lastName: 'Martinez',
                    age: 32
                },
                demographics: {
                    age: 32,
                    gender: 'Female',
                    income: 75000,
                    education: "Bachelor's degree",
                    city: 'Phoenix',
                    state: 'AZ',
                    maritalStatus: 'Married',
                    occupation: 'Marketing Specialist'
                },
                preferences: {
                    technology: 'high',
                    shopping: 'online',
                    interests: ['Technology', 'Travel', 'Fitness']
                }
            },
            // Young Male Professional
            {
                identity: {
                    firstName: 'Ryan',
                    lastName: 'Thompson',
                    age: 27
                },
                demographics: {
                    age: 27,
                    gender: 'Male',
                    income: 62000,
                    education: "Bachelor's degree",
                    city: 'Portland',
                    state: 'OR',
                    maritalStatus: 'Single',
                    occupation: 'Software Developer'
                },
                preferences: {
                    technology: 'high',
                    shopping: 'mixed',
                    interests: ['Gaming', 'Sports', 'Technology']
                }
            },
            // Middle-aged Female
            {
                identity: {
                    firstName: 'Amanda',
                    lastName: 'Wilson',
                    age: 45
                },
                demographics: {
                    age: 45,
                    gender: 'Female',
                    income: 85000,
                    education: "Master's degree",
                    city: 'Nashville',
                    state: 'TN',
                    maritalStatus: 'Married',
                    occupation: 'HR Manager'
                },
                preferences: {
                    technology: 'medium',
                    shopping: 'traditional',
                    interests: ['Family', 'Health', 'Reading']
                }
            }
        ];
        
        this.totalResults.personas = personas;
        
        await this.logger.log('PERSONA', 'info', `✅ Generated ${personas.length} personas`, {
            iteration: iteration,
            ages: personas.map(p => p.demographics.age),
            genders: personas.map(p => p.demographics.gender)
        });
        
        console.log(`   🎭 Generated ${personas.length} diverse personas`);
        return personas;
    }

    async attemptRegistrationsForIteration(iterationResults, personas, iteration) {
        await this.logger.log('REGISTRATION', 'info', `📝 Attempting registrations for iteration ${iteration}`);
        
        const sitesToTest = this.targetSites.slice(0, this.options.maxSitesPerIteration);
        
        for (let i = 0; i < sitesToTest.length && i < iterationResults.emails.length; i++) {
            const site = sitesToTest[i];
            const email = iterationResults.emails[i];
            const persona = personas[i % personas.length];
            
            await this.logger.log('REGISTRATION', 'info', `🌐 Attempting registration on ${site.name}`, {
                site: site.name,
                email: email.email,
                persona: `${persona.identity.firstName} ${persona.identity.lastName}`
            });
            
            try {
                const registrationResult = await this.attemptSiteRegistration(site, email, persona);
                
                iterationResults.registrations.push({
                    site: site.name,
                    email: email.email,
                    persona: persona,
                    success: registrationResult.success,
                    error: registrationResult.error
                });
                
                this.totalResults.registrationAttempts++;
                if (registrationResult.success) {
                    this.totalResults.successfulRegistrations++;
                }
                
            } catch (error) {
                await this.logger.log('ERROR', 'error', `❌ Registration attempt failed`, {
                    site: site.name,
                    error: error.message
                });
                
                iterationResults.registrations.push({
                    site: site.name,
                    email: email.email,
                    success: false,
                    error: error.message
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait between registrations
        }
        
        const successfulRegs = iterationResults.registrations.filter(r => r.success).length;
        console.log(`   📝 Completed ${iterationResults.registrations.length} registration attempts (${successfulRegs} successful)`);
    }

    async attemptSiteRegistration(site, email, persona) {
        try {
            const fullUrl = site.baseUrl + (site.registrationPath || '');
            
            await this.logger.log('NAVIGATION', 'info', `🧭 Navigating to ${site.name} registration`, {
                url: fullUrl
            });
            
            // Navigate to registration page
            await this.page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 20000 });
            await this.page.waitForTimeout(2000);
            
            // Take screenshot
            await this.page.screenshot({ 
                path: `screenshots/registration-${site.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`,
                fullPage: true 
            });
            
            // Try to find and fill registration form
            const formFilled = await this.fillRegistrationFormOnPage(email, persona);
            
            if (formFilled) {
                await this.logger.log('SUCCESS', 'info', `✅ Registration form filled for ${site.name}`);
                
                // Try to submit
                const submitted = await this.submitRegistrationForm();
                
                if (submitted) {
                    await this.logger.log('SUCCESS', 'info', `✅ Registration submitted for ${site.name}`);
                    return { success: true };
                } else {
                    return { success: false, error: 'Form submission failed' };
                }
            } else {
                return { success: false, error: 'No registration form found' };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async fillRegistrationFormOnPage(email, persona) {
        try {
            // Use our universal form automator
            const formData = {
                email: email.email,
                password: email.password || 'SecurePass123!',
                firstName: persona.identity.firstName,
                lastName: persona.identity.lastName,
                age: persona.demographics.age,
                gender: persona.demographics.gender,
                city: persona.demographics.city,
                state: persona.demographics.state,
                zipCode: '12345',
                phone: this.generatePhoneNumber(),
                occupation: persona.demographics.occupation,
                income: persona.demographics.income
            };
            
            const fillResult = await this.formAutomator.fillForm(this.page, formData);
            
            await this.logger.log('FORM', 'info', `📋 Form filling result: ${fillResult.success}`, {
                fieldsAttempted: Object.keys(formData).length,
                success: fillResult.success
            });
            
            return fillResult.success;
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Form filling failed', {
                error: error.message
            });
            return false;
        }
    }

    async submitRegistrationForm() {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.submit-btn',
            '.register-btn',
            '.signup-btn',
            '.join-btn',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Join")',
            'button:has-text("Create Account")',
            '[value*="Register"]',
            '[value*="Submit"]'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = this.page.locator(selector).first();
                if (await button.isVisible() && await button.isEnabled()) {
                    await this.logger.log('FORM', 'info', `📤 Submitting with: ${selector}`);
                    await button.click();
                    await this.page.waitForTimeout(3000);
                    
                    // Check for success indicators
                    const pageContent = await this.page.content();
                    const successIndicators = ['welcome', 'success', 'confirmation', 'registered', 'verify'];
                    const hasSuccess = successIndicators.some(indicator => 
                        pageContent.toLowerCase().includes(indicator)
                    );
                    
                    return hasSuccess;
                }
            } catch (e) {
                // Continue with next selector
            }
        }
        
        return false;
    }

    async fillDemographicProfilesForIteration(iterationResults, personas, iteration) {
        await this.logger.log('PROFILE', 'info', `👤 Filling demographic profiles for iteration ${iteration}`);
        
        let profilesFilled = 0;
        
        // For each successful registration, try to fill profile
        for (const registration of iterationResults.registrations) {
            if (registration.success) {
                try {
                    const filled = await this.fillDemographicProfile(registration.site, registration.persona);
                    if (filled) {
                        profilesFilled++;
                        this.totalResults.profilesFilled++;
                        
                        iterationResults.profiles.push({
                            site: registration.site,
                            persona: registration.persona,
                            success: true
                        });
                    }
                } catch (error) {
                    await this.logger.log('ERROR', 'error', '❌ Profile filling failed', {
                        site: registration.site,
                        error: error.message
                    });
                }
            }
        }
        
        console.log(`   👤 Filled ${profilesFilled} demographic profiles`);
    }

    async fillDemographicProfile(siteName, persona) {
        // Look for profile/settings links
        const profileSelectors = [
            'a[href*="profile"]',
            'a[href*="settings"]',
            'a[href*="account"]',
            'a:has-text("Profile")',
            'a:has-text("Settings")',
            'a:has-text("Account")',
            '.profile-link',
            '.settings-link'
        ];
        
        for (const selector of profileSelectors) {
            try {
                const link = this.page.locator(selector).first();
                if (await link.isVisible()) {
                    await link.click();
                    await this.page.waitForTimeout(2000);
                    
                    // Fill profile form with persona data
                    const profileData = {
                        age: persona.demographics.age,
                        gender: persona.demographics.gender,
                        income: persona.demographics.income,
                        education: persona.demographics.education,
                        city: persona.demographics.city,
                        state: persona.demographics.state,
                        occupation: persona.demographics.occupation,
                        maritalStatus: persona.demographics.maritalStatus
                    };
                    
                    const fillResult = await this.formAutomator.fillForm(this.page, profileData);
                    
                    if (fillResult.success) {
                        await this.logger.log('PROFILE', 'info', `✅ Profile filled for ${siteName}`);
                        return true;
                    }
                }
            } catch (e) {
                // Continue with next selector
            }
        }
        
        return false;
    }

    async completeSurveysForIteration(iterationResults, personas, iteration) {
        await this.logger.log('SURVEY', 'info', `📊 Completing surveys for iteration ${iteration}`);
        
        let surveysCompleted = 0;
        let questionsAnswered = 0;
        
        // For each successful registration, try to find and complete surveys
        for (const registration of iterationResults.registrations) {
            if (registration.success) {
                try {
                    const surveyResult = await this.findAndCompleteSurveys(registration.site, registration.persona);
                    
                    surveysCompleted += surveyResult.completed;
                    questionsAnswered += surveyResult.questions;
                    
                    iterationResults.surveys.push({
                        site: registration.site,
                        completed: surveyResult.completed,
                        questions: surveyResult.questions
                    });
                    
                } catch (error) {
                    await this.logger.log('ERROR', 'error', '❌ Survey completion failed', {
                        site: registration.site,
                        error: error.message
                    });
                }
            }
        }
        
        this.totalResults.surveysCompleted += surveysCompleted;
        this.totalResults.questionsAnswered += questionsAnswered;
        
        console.log(`   📊 Completed ${surveysCompleted} surveys (${questionsAnswered} questions answered)`);
    }

    async findAndCompleteSurveys(siteName, persona) {
        try {
            // Use our survey detector
            const surveys = await this.surveyDetector.detectSurveyOpportunities();
            
            let completed = 0;
            let questions = 0;
            
            if (surveys.surveyEntryPoints && surveys.surveyEntryPoints.length > 0) {
                // Try to complete up to 2 surveys
                const surveysToComplete = Math.min(surveys.surveyEntryPoints.length, 2);
                
                for (let i = 0; i < surveysToComplete; i++) {
                    const survey = surveys.surveyEntryPoints[i];
                    
                    try {
                        const questionsAnswered = await this.completeSingleSurvey(survey, persona);
                        if (questionsAnswered > 0) {
                            completed++;
                            questions += questionsAnswered;
                        }
                    } catch (surveyError) {
                        await this.logger.log('WARNING', 'warn', '⚠️ Individual survey failed', {
                            error: surveyError.message
                        });
                    }
                }
            }
            
            return { completed, questions };
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Survey detection failed', {
                error: error.message
            });
            return { completed: 0, questions: 0 };
        }
    }

    async completeSingleSurvey(survey, persona) {
        // Navigate to survey if needed
        if (survey.url && survey.url.startsWith('http')) {
            await this.page.goto(survey.url, { waitUntil: 'networkidle' });
        } else if (survey.selector) {
            await this.page.click(survey.selector);
        }
        
        await this.page.waitForTimeout(2000);
        
        // Answer questions using persona
        return await this.answerSurveyQuestionsWithPersona(persona);
    }

    async answerSurveyQuestionsWithPersona(persona) {
        let questionsAnswered = 0;
        const maxQuestions = 10;
        
        // Look for questions and answer them
        const questionSelectors = [
            '.question', '.survey-question', '.form-group',
            '[class*="question"]', '[id*="question"]'
        ];
        
        for (const selector of questionSelectors) {
            try {
                const questions = await this.page.locator(selector).all();
                
                for (let i = 0; i < Math.min(questions.length, maxQuestions); i++) {
                    const question = questions[i];
                    
                    if (await question.isVisible()) {
                        await this.answerQuestionWithPersona(question, persona);
                        questionsAnswered++;
                        await this.page.waitForTimeout(1000);
                    }
                }
                
                if (questionsAnswered > 0) break;
                
            } catch (e) {
                // Continue with next selector
            }
        }
        
        // Try to submit survey
        if (questionsAnswered > 0) {
            await this.submitSurvey();
        }
        
        return questionsAnswered;
    }

    async answerQuestionWithPersona(questionElement, persona) {
        try {
            const questionText = await questionElement.textContent();
            
            // Determine question type and answer based on persona
            const hasRadio = await questionElement.locator('input[type="radio"]').count() > 0;
            const hasCheckbox = await questionElement.locator('input[type="checkbox"]').count() > 0;
            const hasText = await questionElement.locator('input[type="text"], textarea').count() > 0;
            const hasSelect = await questionElement.locator('select').count() > 0;
            
            if (hasRadio) {
                const options = await questionElement.locator('input[type="radio"]').all();
                const selectedIndex = this.getPersonaBasedChoice(questionText, options.length, persona);
                await options[selectedIndex].click();
            } else if (hasCheckbox) {
                const checkboxes = await questionElement.locator('input[type="checkbox"]').all();
                const selectCount = Math.min(Math.ceil(checkboxes.length * 0.3), 2);
                for (let i = 0; i < selectCount; i++) {
                    await checkboxes[i].click();
                }
            } else if (hasSelect) {
                const select = questionElement.locator('select').first();
                const options = await select.locator('option').all();
                if (options.length > 1) {
                    const selectedIndex = 1 + Math.floor(Math.random() * (options.length - 1));
                    const optionValue = await options[selectedIndex].getAttribute('value');
                    await select.selectOption(optionValue);
                }
            } else if (hasText) {
                const textInput = questionElement.locator('input[type="text"], textarea').first();
                const response = this.getPersonaBasedTextResponse(questionText, persona);
                await textInput.fill(response);
            }
            
        } catch (error) {
            await this.logger.log('WARNING', 'warn', '⚠️ Question answering failed', {
                error: error.message
            });
        }
    }

    getPersonaBasedChoice(questionText, optionCount, persona) {
        const lowerQuestion = questionText.toLowerCase();
        
        // Age-based choices
        if (lowerQuestion.includes('age')) {
            if (persona.demographics.age < 30) return 0;
            if (persona.demographics.age > 40) return Math.min(optionCount - 1, 2);
            return 1;
        }
        
        // Income-based choices
        if (lowerQuestion.includes('income')) {
            if (persona.demographics.income > 70000) return Math.min(optionCount - 1, Math.floor(optionCount * 0.8));
            if (persona.demographics.income < 50000) return 0;
            return Math.floor(optionCount / 2);
        }
        
        // Technology preference
        if (lowerQuestion.includes('technology') || lowerQuestion.includes('digital')) {
            if (persona.preferences.technology === 'high') return optionCount - 1;
            if (persona.preferences.technology === 'low') return 0;
            return Math.floor(optionCount / 2);
        }
        
        // Default: slightly positive bias
        return Math.floor(Math.random() * Math.max(1, optionCount - 1)) + Math.floor(optionCount * 0.2);
    }

    getPersonaBasedTextResponse(questionText, persona) {
        const responses = {
            name: `${persona.identity.firstName} ${persona.identity.lastName}`,
            email: `${persona.identity.firstName.toLowerCase()}@example.com`,
            age: persona.demographics.age.toString(),
            city: persona.demographics.city,
            occupation: persona.demographics.occupation,
            feedback: `As a ${persona.demographics.occupation.toLowerCase()}, I value quality and reliability.`,
            default: `This is my honest opinion based on my experience.`
        };
        
        const lowerQuestion = questionText.toLowerCase();
        
        if (lowerQuestion.includes('name')) return responses.name;
        if (lowerQuestion.includes('email')) return responses.email;
        if (lowerQuestion.includes('age')) return responses.age;
        if (lowerQuestion.includes('city')) return responses.city;
        if (lowerQuestion.includes('job') || lowerQuestion.includes('occupation')) return responses.occupation;
        if (lowerQuestion.includes('feedback')) return responses.feedback;
        
        return responses.default;
    }

    async submitSurvey() {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.submit-btn',
            'button:has-text("Submit")',
            'button:has-text("Finish")',
            'button:has-text("Complete")'
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
                // Continue
            }
        }
        
        return false;
    }

    generatePhoneNumber() {
        const areaCodes = ['555', '206', '312', '415', '713', '214'];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        const exchange = Math.floor(Math.random() * 900) + 100;
        const number = Math.floor(Math.random() * 9000) + 1000;
        return `${areaCode}-${exchange}-${number}`;
    }

    async generateIterationReport(iteration, results) {
        console.log(`\n📊 ITERATION ${iteration} REPORT:`);
        console.log('======================');
        console.log(`📧 Emails Created: ${results.emails.length}`);
        console.log(`📝 Registration Attempts: ${results.registrations.length}`);
        console.log(`✅ Successful Registrations: ${results.registrations.filter(r => r.success).length}`);
        console.log(`👤 Profiles Filled: ${results.profiles.length}`);
        console.log(`📊 Surveys Completed: ${results.surveys.reduce((sum, s) => sum + s.completed, 0)}`);
        console.log(`❓ Questions Answered: ${results.surveys.reduce((sum, s) => sum + s.questions, 0)}`);
        
        if (results.registrations.some(r => !r.success)) {
            console.log('\n❌ Registration Failures:');
            results.registrations.filter(r => !r.success).forEach(reg => {
                console.log(`   • ${reg.site}: ${reg.error}`);
            });
        }
    }

    generateComprehensiveReport() {
        console.log('\n\n📊 COMPREHENSIVE AUTOMATION REPORT');
        console.log('=====================================');
        console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
        console.log(`🔄 Iterations Completed: ${this.totalResults.iterations}/${this.options.iterations}`);
        console.log(`📧 Total Emails Created: ${this.totalResults.emailsCreated}`);
        console.log(`📝 Total Registration Attempts: ${this.totalResults.registrationAttempts}`);
        console.log(`✅ Successful Registrations: ${this.totalResults.successfulRegistrations}`);
        console.log(`👤 Profiles Filled: ${this.totalResults.profilesFilled}`);
        console.log(`📊 Surveys Completed: ${this.totalResults.surveysCompleted}`);
        console.log(`❓ Questions Answered: ${this.totalResults.questionsAnswered}`);
        console.log(`❌ Total Errors: ${this.totalResults.errors.length}`);
        
        // Calculate success rates
        const regSuccessRate = this.totalResults.registrationAttempts > 0 ? 
            (this.totalResults.successfulRegistrations / this.totalResults.registrationAttempts * 100).toFixed(1) : 0;
        
        const profileSuccessRate = this.totalResults.successfulRegistrations > 0 ? 
            (this.totalResults.profilesFilled / this.totalResults.successfulRegistrations * 100).toFixed(1) : 0;
        
        console.log('\n🏆 SUCCESS RATES:');
        console.log('=================');
        console.log(`📈 Registration Success Rate: ${regSuccessRate}%`);
        console.log(`📈 Profile Completion Rate: ${profileSuccessRate}%`);
        console.log(`📊 Avg Questions per Survey: ${this.totalResults.surveysCompleted > 0 ? (this.totalResults.questionsAnswered / this.totalResults.surveysCompleted).toFixed(1) : 0}`);
        
        console.log('\n🎭 PERSONAS USED:');
        console.log('=================');
        this.totalResults.personas.forEach((persona, i) => {
            console.log(`${i + 1}. ${persona.identity.firstName} ${persona.identity.lastName} (${persona.demographics.age}, ${persona.demographics.gender}, ${persona.demographics.occupation})`);
        });
        
        if (this.totalResults.errors.length > 0) {
            console.log('\n❌ ERROR SUMMARY:');
            console.log('=================');
            this.totalResults.errors.forEach((error, i) => {
                console.log(`${i + 1}. [${error.type}] ${error.error}`);
            });
        }
        
        // Overall assessment
        if (regSuccessRate >= 70) {
            console.log('\n🎉 EXCELLENT! System performing very well across iterations.');
        } else if (regSuccessRate >= 50) {
            console.log('\n✅ GOOD! System working well with room for improvement.');
        } else if (regSuccessRate >= 30) {
            console.log('\n⚠️ MODERATE! Some success but needs optimization.');
        } else {
            console.log('\n❌ NEEDS WORK! Review errors and refine approach.');
        }
        
        console.log('\n💾 All interactions logged to SQLite for detailed analysis');
        console.log('📸 Screenshots saved for manual review');
        console.log('🔍 Check database tables for comprehensive data');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up comprehensive test...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.registrationLogger) {
            await this.registrationLogger.close();
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Run the comprehensive test
async function runComprehensiveTest() {
    const automationTest = new ComprehensiveSurveyAutomation({
        iterations: 2,              // Run 2 iterations
        maxSitesPerIteration: 2,    // Test 2 sites per iteration
        headless: false,            // Keep visible for observation
        enableEmailCreation: true,
        enableRegistration: true,
        enableProfileFilling: true,
        enableSurveyCompletion: true,
        debugMode: true
    });
    
    await automationTest.runComprehensiveTest();
}

if (require.main === module) {
    runComprehensiveTest().catch(console.error);
}

module.exports = ComprehensiveSurveyAutomation;