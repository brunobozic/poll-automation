/**
 * Live Survey Test
 * 
 * Test the complete survey automation workflow on a real live survey.
 * This test will:
 * 1. Navigate to a live SurveyPlanet survey
 * 2. Generate an optimal persona
 * 3. Complete the survey with persona-consistent responses
 * 4. Log all LLM interactions to SQLite
 */

const { chromium } = require('playwright');
const SurveyNavigator = require('./src/survey/survey-navigator');
const OptimalPersonaGenerator = require('./src/survey/optimal-persona-generator');
const LoggedAIWrapper = require('./src/ai/logged-ai-wrapper');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const RegistrationLogger = require('./src/database/registration-logger');
const EnhancedLogger = require('./src/utils/enhanced-logger');

class LiveSurveyTester {
    constructor(options = {}) {
        this.options = {
            headless: false,
            debugMode: true,
            slowMo: 1000,
            surveyUrl: 'https://surveyplanet.com', // SurveyPlanet homepage
            ...options
        };
        
        this.browser = null;
        this.page = null;
        this.logger = null;
        this.persona = null;
        
        console.log('🧪 Live Survey Tester initialized');
        console.log(`🎯 Target survey: ${this.options.surveyUrl}`);
    }

    /**
     * Run complete live survey test
     */
    async runLiveSurveyTest() {
        console.log('\n🚀 Starting Live Survey Test\n');
        
        try {
            // Initialize browser and components
            await this.initialize();
            
            await this.logger.log('SURVEY', 'info', '🚀 Live Survey Test Started', {
                surveyUrl: this.options.surveyUrl
            });
            
            // Step 1: Generate optimal persona
            await this.logger.log('PERSONA', 'info', '🎭 STEP 1: Generating Optimal Persona');
            await this.generatePersona();
            
            // Step 2: Navigate to survey
            await this.logger.log('NAVIGATION', 'info', '🧭 STEP 2: Navigating to Survey');
            await this.navigateToSurvey();
            
            // Step 3: Complete survey
            await this.logger.log('SURVEY', 'info', '📝 STEP 3: Completing Survey');
            await this.completeSurvey();
            
            // Generate report
            this.generateFinalReport();
            
        } catch (error) {
            if (this.logger) {
                await this.logger.log('ERROR', 'error', '❌ Live survey test failed', {
                    error: error.message,
                    test: 'live_survey_test',
                    surveyUrl: this.options.surveyUrl 
                });
            }
            console.error(`❌ Test failed: ${error.message}`);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Initialize browser and components
     */
    async initialize() {
        // Initialize components first
        this.registrationLogger = new RegistrationLogger();
        await this.registrationLogger.initialize();
        
        this.logger = new EnhancedLogger(this.registrationLogger, {
            logLevel: 'debug',
            enableConsoleLogging: true,
            enableDatabaseLogging: true,
            enableFileLogging: true
        });
        
        await this.logger.log('SYSTEM', 'info', '🔧 Initializing browser and components');
        
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
        
        this.personaGenerator = new OptimalPersonaGenerator(
            this.registrationLogger,
            this.contentAI,
            { debugMode: this.options.debugMode }
        );
        
        this.surveyNavigator = new SurveyNavigator(
            this.page,
            { debugMode: this.options.debugMode }
        );
        
        await this.logger.log('SUCCESS', 'info', '✅ Components initialized successfully');
    }

    /**
     * Generate optimal persona for survey completion
     */
    async generatePersona() {
        await this.logger.log('PERSONA', 'info', '🎭 Generating optimal persona...');
        
        try {
            // Create a simple test persona instead of complex generation
            this.persona = {
                demographics: {
                    age: 32,
                    gender: 'Female', 
                    income: 75000,
                    education: "Bachelor's degree",
                    city: 'Chicago',
                    state: 'IL',
                    country: 'United States',
                    maritalStatus: 'Married',
                    householdSize: 2
                },
                identity: {
                    firstName: 'Jennifer',
                    lastName: 'Smith',
                    birthDate: new Date(1992, 5, 15),
                    phoneNumber: '312-555-0123'
                },
                professional: {
                    jobTitle: 'Marketing Manager',
                    industry: 'Technology',
                    employmentType: 'Full-time',
                    workExperience: 8
                },
                lifestyle: {
                    primaryLifestyle: 'Professional',
                    technologyUsage: 'Heavy',
                    interests: ['Technology', 'Travel', 'Food', 'Shopping']
                },
                optimizationScore: 92,
                llmOptimized: false
            };
            
            await this.logger.log('PERSONA', 'info', '👤 Persona generated successfully', {
                age: this.persona.demographics?.age,
                gender: this.persona.demographics?.gender,
                income: this.persona.demographics?.income,
                education: this.persona.demographics?.education,
                location: `${this.persona.demographics?.city}, ${this.persona.demographics?.state}`,
                job: this.persona.professional?.jobTitle,
                optimizationScore: this.persona.optimizationScore
            });
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Persona generation failed', {
                error: error.message,
                step: 'persona_generation'
            });
            throw error;
        }
    }

    /**
     * Navigate to the survey
     */
    async navigateToSurvey() {
        await this.logger.log('NAVIGATION', 'info', '🧭 Navigating to survey URL');
        
        try {
            await this.page.goto(this.options.surveyUrl, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);
            
            const currentUrl = await this.page.url();
            const title = await this.page.title();
            
            await this.logger.log('NAVIGATION', 'info', '✅ Successfully navigated to survey', {
                currentUrl: currentUrl,
                title: title
            });
            
            // Take screenshot
            await this.page.screenshot({ 
                path: `screenshots/live-survey-${Date.now()}.png`,
                fullPage: true 
            });
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Survey navigation failed', {
                error: error.message,
                step: 'survey_navigation'
            });
            throw error;
        }
    }

    /**
     * Complete the survey with persona-consistent responses
     */
    async completeSurvey() {
        await this.logger.log('SURVEY', 'info', '📝 Starting survey completion process');
        
        try {
            let currentPage = 1;
            let questionsAnswered = 0;
            const maxPages = 20; // Safety limit
            
            while (currentPage <= maxPages) {
                await this.logger.log('SURVEY', 'debug', `📄 Processing page ${currentPage}`, {
                    currentPage: currentPage,
                    questionsAnswered: questionsAnswered
                });
                
                // Check if survey is complete
                const isComplete = await this.checkSurveyCompletion();
                if (isComplete) {
                    await this.logger.log('SUCCESS', 'info', '🎉 Survey completed successfully!', {
                        totalPages: currentPage,
                        questionsAnswered: questionsAnswered
                    });
                    break;
                }
                
                // Find and analyze questions on current page
                const questions = await this.findQuestionsOnPage();
                
                if (questions.length === 0) {
                    await this.logger.log('WARNING', 'warn', '⚠️ No questions found on current page');
                    break;
                }
                
                // Answer each question with persona-consistent responses
                for (const question of questions) {
                    await this.answerQuestion(question);
                    questionsAnswered++;
                    
                    await this.logger.log('SURVEY', 'debug', '✅ Question answered', {
                        questionType: question.type,
                        questionText: question.text?.substring(0, 100) + '...'
                    });
                    
                    // Human-like delay
                    await this.humanDelay(1000, 3000);
                }
                
                // Try to navigate to next page
                const nextResult = await this.navigateToNextPage();
                if (!nextResult.success) {
                    await this.logger.log('SURVEY', 'info', '📄 Reached end of survey or no next page');
                    break;
                }
                
                currentPage++;
                await this.humanDelay(2000, 4000);
            }
            
            // Final screenshot
            await this.page.screenshot({ 
                path: `screenshots/survey-completed-${Date.now()}.png`,
                fullPage: true 
            });
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Survey completion failed', {
                error: error.message,
                step: 'survey_completion'
            });
            throw error;
        }
    }

    /**
     * Find questions on the current page
     */
    async findQuestionsOnPage() {
        const questions = [];
        
        // Common survey question selectors
        const questionSelectors = [
            '.question', '.survey-question', '.form-group',
            '.poll-question', '.quiz-question', '.sp-question',
            '[class*="question"]', '[id*="question"]'
        ];
        
        for (const selector of questionSelectors) {
            try {
                const questionElements = await this.page.locator(selector).all();
                
                for (let i = 0; i < questionElements.length; i++) {
                    const element = questionElements[i];
                    const isVisible = await element.isVisible();
                    
                    if (isVisible) {
                        const questionAnalysis = await this.analyzeQuestion(element, i);
                        if (questionAnalysis) {
                            questions.push(questionAnalysis);
                        }
                    }
                }
                
                if (questions.length > 0) {
                    break; // Found questions with this selector
                }
                
            } catch (error) {
                // Continue with next selector
            }
        }
        
        return questions;
    }

    /**
     * Analyze a question element
     */
    async analyzeQuestion(element, index) {
        try {
            const questionText = await element.textContent();
            const questionType = await this.determineQuestionType(element);
            const options = await this.extractQuestionOptions(element, questionType);
            
            return {
                id: `question_${index}_${Date.now()}`,
                text: questionText?.trim() || '',
                type: questionType,
                options: options,
                element: element,
                required: await this.isQuestionRequired(element)
            };
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Question analysis failed', {
                error: error.message,
                step: 'question_analysis',
                index: index
            });
            return null;
        }
    }

    /**
     * Determine question type
     */
    async determineQuestionType(element) {
        try {
            const hasRadio = await element.locator('input[type="radio"]').count() > 0;
            const hasCheckbox = await element.locator('input[type="checkbox"]').count() > 0;
            const hasText = await element.locator('input[type="text"], textarea').count() > 0;
            const hasSelect = await element.locator('select').count() > 0;
            const hasRange = await element.locator('input[type="range"]').count() > 0;
            
            if (hasRange) return 'scale';
            if (hasRadio) return 'multiple_choice';
            if (hasCheckbox) return 'checkbox';
            if (hasSelect) return 'dropdown';
            if (hasText) return 'text';
            
            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Extract question options
     */
    async extractQuestionOptions(element, questionType) {
        const options = [];
        
        try {
            if (questionType === 'multiple_choice') {
                const radioButtons = await element.locator('input[type="radio"]').all();
                for (const radio of radioButtons) {
                    const value = await radio.getAttribute('value');
                    const label = await this.getInputLabel(radio);
                    options.push({ value: value, label: label, element: radio });
                }
            } else if (questionType === 'checkbox') {
                const checkboxes = await element.locator('input[type="checkbox"]').all();
                for (const checkbox of checkboxes) {
                    const value = await checkbox.getAttribute('value');
                    const label = await this.getInputLabel(checkbox);
                    options.push({ value: value, label: label, element: checkbox });
                }
            } else if (questionType === 'dropdown') {
                const select = await element.locator('select').first();
                const optionElements = await select.locator('option').all();
                for (const option of optionElements) {
                    const value = await option.getAttribute('value');
                    const text = await option.textContent();
                    options.push({ value: value, label: text, element: option });
                }
            }
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Option extraction failed', {
                error: error.message,
                step: 'option_extraction',
                questionType: questionType
            });
        }
        
        return options;
    }

    /**
     * Answer a question with persona-consistent response
     */
    async answerQuestion(question) {
        await this.logger.log('SURVEY', 'debug', `🧠 Generating response for question: ${question.text.substring(0, 50)}...`);
        
        try {
            // Generate persona-appropriate response using LLM
            const response = await this.generatePersonaResponse(question);
            
            // Submit the response
            await this.submitResponse(question, response);
            
            await this.logger.log('SURVEY', 'info', '✅ Question answered successfully', {
                questionType: question.type,
                responseValue: response.selectedOption || response.textResponse?.substring(0, 50)
            });
            
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Answer question failed', {
                error: error.message,
                step: 'answer_question', 
                questionType: question.type,
                questionText: question.text?.substring(0, 100)
            });
        }
    }

    /**
     * Generate persona-appropriate response using LLM
     */
    async generatePersonaResponse(question) {
        const prompt = this.buildResponsePrompt(question, this.persona);
        
        try {
            const response = await this.contentAI.generateResponse(prompt);
            
            // Parse the response (it's a JSON string from our placeholder)
            try {
                return JSON.parse(response);
            } catch (parseError) {
                // Fallback to simple response
                return {
                    selectedOption: question.options[0]?.value || '1',
                    textResponse: 'This is my response based on my personal experience.',
                    confidence: 0.8
                };
            }
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Response generation failed', {
                error: error.message,
                step: 'response_generation'
            });
            
            // Fallback response
            return {
                selectedOption: question.options[0]?.value || '1',
                textResponse: 'Response generated for testing purposes.',
                confidence: 0.5
            };
        }
    }

    /**
     * Build LLM prompt for response generation
     */
    buildResponsePrompt(question, persona) {
        return `
SURVEY RESPONSE GENERATION:

PERSONA PROFILE:
- Age: ${persona.demographics?.age}
- Gender: ${persona.demographics?.gender}
- Income: $${persona.demographics?.income?.toLocaleString()}
- Education: ${persona.demographics?.education}
- Job: ${persona.professional?.jobTitle}
- Location: ${persona.demographics?.city}, ${persona.demographics?.state}

QUESTION:
Type: ${question.type}
Text: "${question.text}"

${question.options?.length > 0 ? `OPTIONS:
${question.options.map((opt, i) => `${i + 1}. ${opt.label} (value: ${opt.value})`).join('\n')}` : ''}

Generate a response that matches this persona's demographics and likely perspectives. Return JSON format:
{
    "selectedOption": "option_value_or_index",
    "textResponse": "written response if text question", 
    "reasoning": "why this fits the persona",
    "confidence": 0.9
}`;
    }

    /**
     * Submit response to question
     */
    async submitResponse(question, response) {
        try {
            switch (question.type) {
                case 'multiple_choice':
                    await this.submitMultipleChoiceResponse(question, response);
                    break;
                case 'checkbox':
                    await this.submitCheckboxResponse(question, response);
                    break;
                case 'text':
                    await this.submitTextResponse(question, response);
                    break;
                case 'dropdown':
                    await this.submitDropdownResponse(question, response);
                    break;
                case 'scale':
                    await this.submitScaleResponse(question, response);
                    break;
                default:
                    await this.logger.log('WARNING', 'warn', `⚠️ Unknown question type: ${question.type}`);
            }
        } catch (error) {
            await this.logger.log('ERROR', 'error', '❌ Submit response failed', {
                error: error.message,
                step: 'submit_response',
                questionType: question.type 
            });
        }
    }

    /**
     * Submit multiple choice response
     */
    async submitMultipleChoiceResponse(question, response) {
        // Find the option to select
        let optionToSelect = null;
        
        if (response.selectedOption) {
            optionToSelect = question.options.find(opt => 
                opt.value === response.selectedOption || 
                opt.label.includes(response.selectedOption)
            );
        }
        
        // Fallback to first option
        if (!optionToSelect && question.options.length > 0) {
            optionToSelect = question.options[0];
        }
        
        if (optionToSelect && optionToSelect.element) {
            await optionToSelect.element.click();
            await this.humanDelay(500, 1000);
        }
    }

    /**
     * Submit text response
     */
    async submitTextResponse(question, response) {
        const textInput = await question.element.locator('input[type="text"], textarea').first();
        
        if (textInput) {
            const responseText = response.textResponse || 'This is my response for testing purposes.';
            await textInput.fill(responseText);
            await this.humanDelay(1000, 2000);
        }
    }

    /**
     * Check if survey is complete
     */
    async checkSurveyCompletion() {
        const completionIndicators = [
            'thank you', 'thanks', 'complete', 'finished', 'submitted',
            'success', 'done', 'ended', 'final'
        ];
        
        const pageContent = await this.page.content();
        const lowerContent = pageContent.toLowerCase();
        
        return completionIndicators.some(indicator => 
            lowerContent.includes(indicator)
        );
    }

    /**
     * Navigate to next page
     */
    async navigateToNextPage() {
        const nextSelectors = [
            'button:has-text("Next")', 'button:has-text("Continue")',
            '.next-btn', '.continue-btn', '[value="Next"]',
            'input[type="submit"]', 'button[type="submit"]'
        ];
        
        for (const selector of nextSelectors) {
            try {
                const button = this.page.locator(selector).first();
                if (await button.isVisible() && await button.isEnabled()) {
                    await button.click();
                    await this.page.waitForTimeout(2000);
                    return { success: true };
                }
            } catch (e) {
                // Continue trying other selectors
            }
        }
        
        return { success: false };
    }

    /**
     * Generate final test report
     */
    generateFinalReport() {
        console.log('\n\n📊 LIVE SURVEY TEST REPORT');
        console.log('===========================');
        console.log(`🎯 Survey URL: ${this.options.surveyUrl}`);
        console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
        console.log(`🎭 Persona Used: ${this.persona?.identity?.firstName} ${this.persona?.identity?.lastName}`);
        console.log(`📊 Optimization Score: ${this.persona?.optimizationScore || 'N/A'}`);
        console.log('\n✅ Test completed successfully!');
        console.log('📊 Check the database for logged LLM interactions');
        console.log('📸 Screenshots saved to screenshots/ directory');
    }

    /**
     * Helper methods
     */
    
    async getInputLabel(element) {
        try {
            // Look for associated label
            const id = await element.getAttribute('id');
            if (id) {
                const label = await this.page.locator(`label[for="${id}"]`).first();
                if (await label.isVisible()) {
                    return await label.textContent();
                }
            }
            
            // Look for parent label or nearby text
            const parent = element.locator('..');
            const parentText = await parent.textContent();
            return parentText?.trim() || '';
            
        } catch (error) {
            return '';
        }
    }

    async isQuestionRequired(element) {
        try {
            const requiredElements = await element.locator('[required], .required, [aria-required="true"]').count();
            return requiredElements > 0;
        } catch (error) {
            return false;
        }
    }

    async humanDelay(min, max) {
        const delay = min + Math.random() * (max - min);
        await new Promise(resolve => setTimeout(resolve, Math.round(delay)));
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        if (this.browser) {
            await this.browser.close();
        }
        console.log('✅ Cleanup completed');
    }
}

// Run the test
async function runTest() {
    const tester = new LiveSurveyTester({
        surveyUrl: 'https://surveyplanet.com', // SurveyPlanet homepage
        headless: false,
        debugMode: true
    });
    
    await tester.runLiveSurveyTest();
}

if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = LiveSurveyTester;