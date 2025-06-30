/**
 * Live Survey Focused Test
 * 
 * This script focuses on finding and completing actual live surveys that are publicly available.
 * It will test multiple survey sites and attempt to complete real surveys.
 */

const { chromium } = require('playwright');
const LoggedAIWrapper = require('./src/ai/logged-ai-wrapper');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const RegistrationLogger = require('./src/database/registration-logger');
const EnhancedLogger = require('./src/utils/enhanced-logger');

class LiveSurveyFocusedTester {
    constructor(options = {}) {
        this.options = {
            headless: false,
            debugMode: true,
            slowMo: 1000,
            maxSurveysToTest: 5,
            ...options
        };
        
        // Focus on actual live surveys that are publicly accessible
        this.liveSurveys = [
            {
                name: 'Sample Survey 1',
                url: 'https://forms.gle/sample1', // Replace with actual survey URLs
                type: 'google_form',
                expected_questions: 5
            },
            {
                name: 'Survey Planet Demo',
                url: 'https://surveyplanet.com/demo',
                type: 'survey_planet',
                expected_questions: 3
            },
            {
                name: 'Typeform Demo',
                url: 'https://typeform.com/try',
                type: 'typeform',
                expected_questions: 4
            }
        ];
        
        // Create diverse personas for survey responses
        this.personas = [
            {
                name: 'Sarah Tech',
                demographics: {
                    age: 28, gender: 'Female', income: 65000, education: "Bachelor's degree",
                    city: 'Austin', state: 'TX', occupation: 'Software Developer'
                },
                preferences: {
                    technology: 'high', shopping: 'online', lifestyle: 'active'
                }
            },
            {
                name: 'Mike Business',
                demographics: {
                    age: 42, gender: 'Male', income: 95000, education: "Master's degree",
                    city: 'Denver', state: 'CO', occupation: 'Project Manager'
                },
                preferences: {
                    technology: 'medium', shopping: 'mixed', lifestyle: 'family'
                }
            },
            {
                name: 'Emma Student',
                demographics: {
                    age: 22, gender: 'Female', income: 25000, education: "Some college",
                    city: 'Seattle', state: 'WA', occupation: 'Student'
                },
                preferences: {
                    technology: 'high', shopping: 'budget', lifestyle: 'social'
                }
            }
        ];
        
        this.browser = null;
        this.results = {
            totalSurveys: 0,
            completedSurveys: 0,
            questionsAnswered: 0,
            personas_used: [],
            errors: []
        };
        
        console.log('🎯 Live Survey Focused Tester initialized');
        console.log(`📊 Will test up to ${this.options.maxSurveysToTest} live surveys`);
    }

    async runLiveSurveyTests() {
        console.log('\n🚀 Starting Live Survey Testing\n');
        
        try {
            await this.initialize();
            
            await this.logger.log('SYSTEM', 'info', '🎯 Live Survey Testing Started', {
                maxSurveys: this.options.maxSurveysToTest,
                personasAvailable: this.personas.length
            });
            
            // Test each available survey
            for (let i = 0; i < Math.min(this.liveSurveys.length, this.options.maxSurveysToTest); i++) {
                const survey = this.liveSurveys[i];
                const persona = this.personas[i % this.personas.length]; // Rotate personas
                
                await this.logger.log('SURVEY', 'info', `📝 Testing Survey ${i + 1}: ${survey.name}`, {
                    surveyUrl: survey.url,
                    persona: persona.name
                });
                
                try {
                    await this.testLiveSurvey(survey, persona, i + 1);
                    this.results.totalSurveys++;
                    this.results.personas_used.push(persona.name);
                } catch (error) {
                    await this.logger.log('ERROR', 'error', `❌ Survey test failed: ${survey.name}`, {
                        error: error.message
                    });
                    this.results.errors.push({
                        survey: survey.name,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Wait between surveys
                if (i < Math.min(this.liveSurveys.length, this.options.maxSurveysToTest) - 1) {
                    await this.logger.log('SYSTEM', 'info', '⏱️ Waiting between surveys...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            this.generateReport();
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Live survey testing failed', {
                error: error.message
            });
            console.error(`❌ Test failed: ${error.message}`);
        } finally {
            await this.cleanup();
        }
    }

    async initialize() {
        console.log('🔧 Initializing browser and components...');
        
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
            slowMo: this.options.slowMo,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
        
        this.page = await context.newPage();
        
        const baseAI = new ContentUnderstandingAI();
        this.contentAI = new LoggedAIWrapper(baseAI, this.logger);
        
        await this.logger.log('SUCCESS', 'info', '✅ Components initialized successfully');
    }

    async testLiveSurvey(survey, persona, surveyNumber) {
        await this.logger.log('SURVEY', 'info', `📊 Starting survey: ${survey.name}`, {
            surveyUrl: survey.url,
            personaName: persona.name
        });
        
        try {
            // Navigate to survey
            await this.logger.log('NAVIGATION', 'info', `🧭 Navigating to ${survey.name}`);
            await this.page.goto(survey.url, { 
                waitUntil: 'networkidle', 
                timeout: 20000 
            });
            await this.page.waitForTimeout(2000);
            
            // Take screenshot
            const screenshot = `screenshots/survey-${surveyNumber}-${survey.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            await this.page.screenshot({ path: screenshot, fullPage: true });
            
            await this.logger.log('SUCCESS', 'info', `✅ Successfully navigated to ${survey.name}`, {
                currentUrl: await this.page.url(),
                title: await this.page.title()
            });
            
            // Find and answer questions
            const questionsAnswered = await this.answerSurveyQuestions(persona, survey);
            
            if (questionsAnswered > 0) {
                this.results.completedSurveys++;
                this.results.questionsAnswered += questionsAnswered;
                
                await this.logger.log('SUCCESS', 'info', `✅ Survey completed: ${survey.name}`, {
                    questionsAnswered: questionsAnswered,
                    persona: persona.name
                });
            } else {
                await this.logger.log('WARNING', 'warn', `⚠️ No questions found in ${survey.name}`);
            }
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', `❌ Survey test error: ${survey.name}`, {
                error: error.message
            });
            throw error;
        }
    }

    async answerSurveyQuestions(persona, survey) {
        await this.logger.log('SURVEY', 'info', '🧠 Analyzing and answering survey questions');
        
        let questionsAnswered = 0;
        const maxQuestions = 15; // Safety limit
        
        // Common question selectors across different platforms
        const questionSelectors = [
            '.question', '.survey-question', '.form-group', '.form-field',
            '.poll-question', '.quiz-question', '.sp-question',
            '[class*="question"]', '[id*="question"]',
            '.field', '.input-group', '.form-control-group',
            '[data-testid*="question"]', '[role="group"]'
        ];
        
        // Try to find questions with different selectors
        for (const selector of questionSelectors) {
            try {
                const questions = await this.page.locator(selector).all();
                
                if (questions.length > 0) {
                    await this.logger.log('SURVEY', 'info', `📝 Found ${questions.length} questions with selector: ${selector}`);
                    
                    for (let i = 0; i < Math.min(questions.length, maxQuestions); i++) {
                        const question = questions[i];
                        
                        if (await question.isVisible()) {
                            try {
                                await this.answerSingleQuestion(question, persona, i + 1);
                                questionsAnswered++;
                                
                                // Human-like delay
                                await this.page.waitForTimeout(1500 + Math.random() * 2000);
                            } catch (questionError) {
                                await this.logger.log('WARNING', 'warn', `⚠️ Failed to answer question ${i + 1}`, {
                                    error: questionError.message
                                });
                            }
                        }
                    }
                    
                    // If we found questions, try to submit
                    if (questionsAnswered > 0) {
                        await this.trySubmitSurvey();
                        break; // Don't try other selectors
                    }
                }
            } catch (e) {
                // Continue with next selector
            }
        }
        
        return questionsAnswered;
    }

    async answerSingleQuestion(questionElement, persona, questionNumber) {
        try {
            const questionText = await questionElement.textContent();
            
            await this.logger.log('SURVEY', 'debug', `❓ Question ${questionNumber}: ${questionText?.substring(0, 100)}...`);
            
            // Determine question type
            const hasRadio = await questionElement.locator('input[type="radio"]').count() > 0;
            const hasCheckbox = await questionElement.locator('input[type="checkbox"]').count() > 0;
            const hasText = await questionElement.locator('input[type="text"], textarea').count() > 0;
            const hasSelect = await questionElement.locator('select').count() > 0;
            const hasRange = await questionElement.locator('input[type="range"], input[type="number"]').count() > 0;
            
            if (hasRadio) {
                await this.answerRadioQuestion(questionElement, persona, questionText);
            } else if (hasCheckbox) {
                await this.answerCheckboxQuestion(questionElement, persona, questionText);
            } else if (hasSelect) {
                await this.answerSelectQuestion(questionElement, persona, questionText);
            } else if (hasRange) {
                await this.answerRangeQuestion(questionElement, persona, questionText);
            } else if (hasText) {
                await this.answerTextQuestion(questionElement, persona, questionText);
            } else {
                await this.logger.log('WARNING', 'warn', `⚠️ Unknown question type for question ${questionNumber}`);
            }
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', `❌ Error answering question ${questionNumber}`, {
                error: error.message
            });
        }
    }

    async answerRadioQuestion(questionElement, persona, questionText) {
        const options = await questionElement.locator('input[type="radio"]').all();
        if (options.length > 0) {
            const selectedIndex = this.getPersonaBasedChoice(questionText, options.length, persona);
            await options[selectedIndex].click();
            await this.logger.log('SURVEY', 'debug', `📊 Selected radio option ${selectedIndex + 1}/${options.length}`);
        }
    }

    async answerCheckboxQuestion(questionElement, persona, questionText) {
        const checkboxes = await questionElement.locator('input[type="checkbox"]').all();
        if (checkboxes.length > 0) {
            // Select 1-3 options based on persona
            const selectCount = Math.min(Math.ceil(checkboxes.length * 0.4), 3);
            const indices = this.getMultipleChoices(checkboxes.length, selectCount);
            
            for (const index of indices) {
                await checkboxes[index].click();
            }
            await this.logger.log('SURVEY', 'debug', `☑️ Selected ${selectCount} checkbox options`);
        }
    }

    async answerSelectQuestion(questionElement, persona, questionText) {
        const select = questionElement.locator('select').first();
        const options = await select.locator('option').all();
        if (options.length > 1) {
            const selectedIndex = this.getPersonaBasedChoice(questionText, options.length - 1, persona) + 1; // Skip first option
            const optionValue = await options[selectedIndex].getAttribute('value');
            if (optionValue) {
                await select.selectOption(optionValue);
                await this.logger.log('SURVEY', 'debug', `📋 Selected dropdown option ${selectedIndex}/${options.length}`);
            }
        }
    }

    async answerRangeQuestion(questionElement, persona, questionText) {
        const range = questionElement.locator('input[type="range"], input[type="number"]').first();
        const value = this.getPersonaBasedRangeValue(questionText, persona);
        await range.fill(value.toString());
        await this.logger.log('SURVEY', 'debug', `📏 Set range/number value: ${value}`);
    }

    async answerTextQuestion(questionElement, persona, questionText) {
        const textInput = questionElement.locator('input[type="text"], textarea').first();
        const response = this.getPersonaBasedTextResponse(questionText, persona);
        await textInput.fill(response);
        await this.logger.log('SURVEY', 'debug', `📝 Entered text: ${response.substring(0, 50)}...`);
    }

    getPersonaBasedChoice(questionText, optionCount, persona) {
        const lowerQuestion = questionText.toLowerCase();
        
        // Age-based responses
        if (lowerQuestion.includes('age')) {
            if (persona.demographics.age < 25) return 0;
            if (persona.demographics.age > 40) return Math.min(optionCount - 1, 3);
            return 1;
        }
        
        // Income-based responses
        if (lowerQuestion.includes('income') || lowerQuestion.includes('salary')) {
            if (persona.demographics.income > 80000) return Math.min(optionCount - 1, Math.floor(optionCount * 0.8));
            if (persona.demographics.income < 40000) return 0;
            return Math.floor(optionCount / 2);
        }
        
        // Technology preference
        if (lowerQuestion.includes('technology') || lowerQuestion.includes('digital')) {
            if (persona.preferences.technology === 'high') return optionCount - 1;
            if (persona.preferences.technology === 'low') return 0;
            return Math.floor(optionCount / 2);
        }
        
        // Shopping preference
        if (lowerQuestion.includes('shop') || lowerQuestion.includes('buy')) {
            if (persona.preferences.shopping === 'online') return Math.min(optionCount - 1, 2);
            if (persona.preferences.shopping === 'budget') return 0;
            return 1;
        }
        
        // Default: weighted towards positive/middle responses
        return Math.floor(Math.random() * Math.max(1, optionCount - 1)) + Math.floor(optionCount * 0.3);
    }

    getMultipleChoices(totalOptions, selectCount) {
        const indices = [];
        while (indices.length < selectCount) {
            const randomIndex = Math.floor(Math.random() * totalOptions);
            if (!indices.includes(randomIndex)) {
                indices.push(randomIndex);
            }
        }
        return indices;
    }

    getPersonaBasedRangeValue(questionText, persona) {
        const lowerQuestion = questionText.toLowerCase();
        
        if (lowerQuestion.includes('satisfaction') || lowerQuestion.includes('happy')) {
            return 7 + Math.floor(Math.random() * 3); // 7-9
        }
        
        if (lowerQuestion.includes('likely') || lowerQuestion.includes('recommend')) {
            return 6 + Math.floor(Math.random() * 4); // 6-9
        }
        
        if (lowerQuestion.includes('frequency') || lowerQuestion.includes('often')) {
            if (persona.preferences.technology === 'high') return 8 + Math.floor(Math.random() * 2);
            return 4 + Math.floor(Math.random() * 4);
        }
        
        return 5 + Math.floor(Math.random() * 4); // 5-8
    }

    getPersonaBasedTextResponse(questionText, persona) {
        const lowerQuestion = questionText.toLowerCase();
        
        const responses = {
            name: `${persona.name.split(' ')[0]} ${persona.name.split(' ')[1]}`,
            email: `${persona.name.split(' ')[0].toLowerCase()}@example.com`,
            age: persona.demographics.age.toString(),
            city: persona.demographics.city,
            occupation: persona.demographics.occupation,
            feedback: `As a ${persona.demographics.occupation.toLowerCase()}, I value quality and efficiency.`,
            experience: `I have ${Math.floor(Math.random() * 5) + 2} years of experience in this area.`,
            suggestions: 'I think continuous improvement and user feedback are essential.',
            default: `This is my perspective as a ${persona.demographics.age}-year-old ${persona.demographics.occupation.toLowerCase()}.`
        };
        
        if (lowerQuestion.includes('name')) return responses.name;
        if (lowerQuestion.includes('email')) return responses.email;
        if (lowerQuestion.includes('age')) return responses.age;
        if (lowerQuestion.includes('city') || lowerQuestion.includes('location')) return responses.city;
        if (lowerQuestion.includes('job') || lowerQuestion.includes('occupation')) return responses.occupation;
        if (lowerQuestion.includes('feedback')) return responses.feedback;
        if (lowerQuestion.includes('experience')) return responses.experience;
        if (lowerQuestion.includes('suggest')) return responses.suggestions;
        
        return responses.default;
    }

    async trySubmitSurvey() {
        const submitSelectors = [
            'button[type="submit"]', 'input[type="submit"]',
            '.submit-btn', '.submit-button', '.finish-btn', '.complete-btn',
            'button:has-text("Submit")', 'button:has-text("Finish")', 
            'button:has-text("Complete")', 'button:has-text("Send")',
            'button:has-text("Next")', 'button:has-text("Continue")',
            '[data-testid*="submit"]', '[aria-label*="submit"]'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = this.page.locator(selector).first();
                if (await button.isVisible() && await button.isEnabled()) {
                    await this.logger.log('SURVEY', 'info', `📤 Submitting survey with: ${selector}`);
                    await button.click();
                    await this.page.waitForTimeout(3000);
                    return true;
                }
            } catch (e) {
                // Continue with next selector
            }
        }
        
        await this.logger.log('WARNING', 'warn', '⚠️ Could not find submit button');
        return false;
    }

    generateReport() {
        console.log('\n\n📊 LIVE SURVEY TESTING REPORT');
        console.log('==============================');
        
        console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
        console.log(`📊 Total Surveys Tested: ${this.results.totalSurveys}`);
        console.log(`✅ Surveys Completed: ${this.results.completedSurveys}`);
        console.log(`❓ Questions Answered: ${this.results.questionsAnswered}`);
        console.log(`🎭 Personas Used: ${this.results.personas_used.join(', ')}`);
        console.log(`❌ Errors: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERROR DETAILS:');
            this.results.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error.survey}: ${error.error}`);
            });
        }
        
        const successRate = this.results.totalSurveys > 0 ? 
            (this.results.completedSurveys / this.results.totalSurveys * 100).toFixed(1) : 0;
        
        console.log('\n🏆 PERFORMANCE SUMMARY:');
        console.log('======================');
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`📊 Avg Questions per Survey: ${this.results.totalSurveys > 0 ? (this.results.questionsAnswered / this.results.totalSurveys).toFixed(1) : 0}`);
        
        if (successRate >= 80) {
            console.log('🎉 EXCELLENT! Survey automation working very well.');
        } else if (successRate >= 60) {
            console.log('✅ GOOD! Most surveys completed successfully.');
        } else if (successRate >= 40) {
            console.log('⚠️ MODERATE! Some issues need attention.');
        } else {
            console.log('❌ NEEDS IMPROVEMENT! Review errors and refine approach.');
        }
        
        console.log('\n💾 All interactions logged to SQLite database');
        console.log('📸 Screenshots saved to ./screenshots/ directory');
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

// Execute multiple test iterations
async function runMultipleIterations() {
    console.log('🔄 Running Multiple Survey Test Iterations\n');
    
    for (let iteration = 1; iteration <= 3; iteration++) {
        console.log(`\n🚀 === ITERATION ${iteration}/3 ===`);
        
        const tester = new LiveSurveyFocusedTester({
            headless: false, // Keep visible for debugging
            maxSurveysToTest: 3,
            debugMode: true
        });
        
        try {
            await tester.runLiveSurveyTests();
        } catch (error) {
            console.error(`❌ Iteration ${iteration} failed: ${error.message}`);
        }
        
        // Wait between iterations
        if (iteration < 3) {
            console.log('\n⏱️ Waiting before next iteration...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('\n🎉 All iterations completed!');
}

if (require.main === module) {
    runMultipleIterations().catch(console.error);
}

module.exports = LiveSurveyFocusedTester;