/**
 * Survey Orchestrator
 * 
 * Main coordination engine for automated survey completion.
 * Integrates all survey solving components:
 * - Automatic login system
 * - Survey detection and navigation
 * - Persona management and consistency
 * - Question analysis and response generation
 * - Progress tracking and error handling
 */

const SurveyNavigator = require('./survey-navigator');
const SiteSpecificSurveyDetector = require('./site-specific-survey-detector');
const OptimalPersonaGenerator = require('./optimal-persona-generator');
const AutomaticLoginSystem = require('../automation/automatic-login-system');

class SurveyOrchestrator {
    constructor(registrationLogger, contentAI, options = {}) {
        this.registrationLogger = registrationLogger;
        this.contentAI = contentAI;
        this.options = {
            maxConcurrentSurveys: 3,
            surveyTimeout: 3600000, // 1 hour
            enablePersonaConsistency: true,
            enableLLMLogging: true,
            debugMode: false,
            headless: true,
            ...options
        };
        
        // Track active survey sessions
        this.activeSurveys = new Map();
        this.completedSurveys = new Map();
        
        // Component instances will be created per survey session
        this.surveyNavigator = null;
        this.surveyDetector = null;
        this.personaGenerator = null;
        this.loginSystem = null;
        
        this.log('🎯 Survey Orchestrator initialized');
    }

    /**
     * Start a new survey automation session
     */
    async startSurvey(surveyRequest) {
        const { surveyId, email, site, autoComplete, headless, credentials, persona } = surveyRequest;
        
        this.log(`🚀 Starting survey session: ${surveyId}`);
        this.log(`📧 Email: ${this.maskEmail(email)}`);
        this.log(`🌐 Site: ${site}`);
        this.log(`🤖 Auto-complete: ${autoComplete}`);
        
        try {
            // Validate request
            await this.validateSurveyRequest(surveyRequest);
            
            // Create survey session
            const session = await this.createSurveySession(surveyRequest);
            
            // Initialize browser and components
            await this.initializeSurveyComponents(session);
            
            // Start the survey automation process
            if (autoComplete) {
                // Run complete automation in background
                this.runSurveyAutomation(session).catch(error => {
                    this.log(`❌ Survey automation failed for ${surveyId}: ${error.message}`);
                    this.updateSurveyStatus(surveyId, 'failed', { error: error.message });
                });
            }
            
            return {
                surveyId: surveyId,
                status: 'initialized',
                estimatedDuration: '5-15 minutes',
                autoComplete: autoComplete
            };
            
        } catch (error) {
            this.log(`❌ Failed to start survey ${surveyId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Main survey automation workflow
     */
    async runSurveyAutomation(session) {
        const { surveyId, email, site, credentials, persona } = session;
        
        try {
            this.updateSurveyStatus(surveyId, 'starting');
            
            // Step 1: Login to the survey site
            this.log(`🔐 Step 1: Logging into ${site}...`);
            const loginResult = await this.loginSystem.loginToSite(email, site);
            
            if (!loginResult.success) {
                throw new Error(`Login failed: ${loginResult.error}`);
            }
            
            this.updateSurveyStatus(surveyId, 'logged_in');
            
            // Step 2: Detect available surveys
            this.log('🔍 Step 2: Detecting available surveys...');
            const surveyOpportunities = await this.surveyDetector.detectSurveyOpportunities();
            
            if (surveyOpportunities.surveyEntryPoints.length === 0) {
                throw new Error('No survey opportunities found on the site');
            }
            
            this.updateSurveyStatus(surveyId, 'surveys_detected', {
                availableSurveys: surveyOpportunities.surveyEntryPoints.length
            });
            
            // Step 3: Select and start best survey
            this.log('🎯 Step 3: Selecting optimal survey...');
            const selectedSurvey = this.selectOptimalSurvey(surveyOpportunities.surveyEntryPoints);
            
            const navigationResult = await this.surveyNavigator.navigateToSurvey(selectedSurvey);
            
            if (!navigationResult.success) {
                throw new Error(`Survey navigation failed: ${navigationResult.error}`);
            }
            
            this.updateSurveyStatus(surveyId, 'survey_started', {
                selectedSurvey: selectedSurvey.title || selectedSurvey.id
            });
            
            // Step 4: Complete the survey
            this.log('📝 Step 4: Completing survey...');
            const completionResult = await this.completeSurveyWithPersona(session, selectedSurvey);
            
            if (completionResult.success) {
                this.updateSurveyStatus(surveyId, 'completed', {
                    questionsAnswered: completionResult.questionsAnswered,
                    completionTime: completionResult.completionTime
                });
                
                // Log successful completion
                await this.logSurveyCompletion(session, completionResult);
                
                this.log('🎉 Survey completed successfully!');
            } else {
                throw new Error(`Survey completion failed: ${completionResult.error}`);
            }
            
        } catch (error) {
            this.log(`❌ Survey automation failed: ${error.message}`);
            this.updateSurveyStatus(surveyId, 'failed', { error: error.message });
            
            // Log failure for analysis
            await this.logSurveyFailure(session, error);
            
            throw error;
        } finally {
            // Cleanup browser resources
            await this.cleanupSurveySession(surveyId);
        }
    }

    /**
     * Complete survey using persona-consistent responses
     */
    async completeSurveyWithPersona(session, surveyInfo) {
        const { surveyId, persona, page } = session;
        
        this.log('🎭 Completing survey with persona consistency...');
        
        const startTime = Date.now();
        let questionsAnswered = 0;
        let currentPage = 1;
        const maxPages = 50; // Safety limit
        
        try {
            while (currentPage <= maxPages) {
                this.log(`📄 Processing survey page ${currentPage}...`);
                
                // Check if survey is complete
                const isComplete = await this.surveyNavigator.isSurveyComplete();
                if (isComplete) {
                    this.log('✅ Survey completion detected');
                    break;
                }
                
                // Analyze questions on current page
                const questions = await this.analyzeQuestionsOnPage(page);
                
                if (questions.length === 0) {
                    this.log('⚠️ No questions found on current page');
                    break;
                }
                
                // Generate and submit responses for each question
                for (const question of questions) {
                    const response = await this.generatePersonaResponse(question, persona);
                    await this.submitQuestionResponse(question, response);
                    questionsAnswered++;
                    
                    // Update progress
                    this.updateSurveyStatus(surveyId, 'in_progress', {
                        currentPage: currentPage,
                        questionsAnswered: questionsAnswered
                    });
                    
                    // Human-like delay between questions
                    await this.humanDelay(1000, 3000);
                }
                
                // Navigate to next page
                try {
                    const nextResult = await this.surveyNavigator.navigateToNextPage();
                    if (!nextResult.success) {
                        this.log('📄 Reached end of survey or navigation failed');
                        break;
                    }
                    currentPage++;
                } catch (error) {
                    this.log('📄 No more pages or navigation error');
                    break;
                }
                
                // Safety delay between pages
                await this.humanDelay(2000, 5000);
            }
            
            const completionTime = Date.now() - startTime;
            
            return {
                success: true,
                questionsAnswered: questionsAnswered,
                pagesCompleted: currentPage,
                completionTime: completionTime
            };
            
        } catch (error) {
            this.log(`❌ Survey completion error: ${error.message}`);
            return {
                success: false,
                error: error.message,
                questionsAnswered: questionsAnswered,
                pagesCompleted: currentPage
            };
        }
    }

    /**
     * Analyze questions on the current page
     */
    async analyzeQuestionsOnPage(page) {
        this.log('🔍 Analyzing questions on current page...');
        
        const questions = [];
        
        // Common question selectors
        const questionSelectors = [
            '.question', '.survey-question', '.form-group',
            '.question-container', '.poll-question', '.quiz-question'
        ];
        
        for (const selector of questionSelectors) {
            try {
                const questionElements = await page.locator(selector).all();
                
                for (let i = 0; i < questionElements.length; i++) {
                    const element = questionElements[i];
                    const isVisible = await element.isVisible();
                    
                    if (isVisible) {
                        const questionAnalysis = await this.analyzeQuestionElement(element, i);
                        if (questionAnalysis) {
                            questions.push(questionAnalysis);
                        }
                    }
                }
                
                if (questions.length > 0) {
                    break; // Found questions with this selector
                }
                
            } catch (error) {
                this.log(`⚠️ Error analyzing selector ${selector}: ${error.message}`);
            }
        }
        
        this.log(`📊 Found ${questions.length} questions on current page`);
        return questions;
    }

    /**
     * Analyze individual question element
     */
    async analyzeQuestionElement(element, index) {
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
            this.log(`⚠️ Question analysis error: ${error.message}`);
            return null;
        }
    }

    /**
     * Determine question type (multiple choice, text, scale, etc.)
     */
    async determineQuestionType(element) {
        try {
            // Check for different input types within the question
            const hasRadio = await element.locator('input[type="radio"]').count() > 0;
            const hasCheckbox = await element.locator('input[type="checkbox"]').count() > 0;
            const hasText = await element.locator('input[type="text"], textarea').count() > 0;
            const hasSelect = await element.locator('select').count() > 0;
            const hasScale = await element.locator('.scale, .rating, .likert').count() > 0;
            
            if (hasScale) return 'scale';
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
     * Extract question options (for multiple choice, checkbox, etc.)
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
            this.log(`⚠️ Option extraction error: ${error.message}`);
        }
        
        return options;
    }

    /**
     * Generate persona-consistent response for a question
     */
    async generatePersonaResponse(question, persona) {
        this.log(`🧠 Generating response for: ${question.text.substring(0, 50)}...`);
        
        try {
            // Use LLM to generate persona-appropriate response
            if (this.contentAI) {
                const llmResponse = await this.generateLLMResponse(question, persona);
                if (llmResponse.success) {
                    return llmResponse.response;
                }
            }
            
            // Fallback to rule-based response generation
            return this.generateRuleBasedResponse(question, persona);
            
        } catch (error) {
            this.log(`⚠️ Response generation error: ${error.message}`);
            return this.generateDefaultResponse(question);
        }
    }

    /**
     * Generate LLM-powered response
     */
    async generateLLMResponse(question, persona) {
        try {
            const prompt = this.buildResponseGenerationPrompt(question, persona);
            
            // Log prompt
            if (this.options.enableLLMLogging) {
                await this.logLLMPrompt('response_generation', prompt);
            }
            
            const response = await this.contentAI.generateResponse(prompt);
            
            // Log response
            if (this.options.enableLLMLogging) {
                await this.logLLMResponse('response_generation', response);
            }
            
            const parsedResponse = this.parseResponseFromLLM(response, question);
            
            return {
                success: true,
                response: parsedResponse
            };
            
        } catch (error) {
            this.log(`⚠️ LLM response generation failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Build prompt for response generation
     */
    buildResponseGenerationPrompt(question, persona) {
        return `
SURVEY RESPONSE GENERATION TASK:

Generate a realistic, persona-consistent response to this survey question.

PERSONA PROFILE:
- Age: ${persona.demographics?.age}
- Gender: ${persona.demographics?.gender}
- Income: $${persona.demographics?.income?.toLocaleString()}
- Education: ${persona.demographics?.education}
- Location: ${persona.demographics?.city}, ${persona.demographics?.state}
- Job: ${persona.professional?.jobTitle}
- Industry: ${persona.professional?.industry}

QUESTION:
Type: ${question.type}
Text: "${question.text}"

${question.options?.length > 0 ? `OPTIONS:
${question.options.map((opt, i) => `${i + 1}. ${opt.label} (value: ${opt.value})`).join('\n')}` : ''}

REQUIREMENTS:
1. Response must be consistent with persona demographics and background
2. Answer should reflect realistic opinions/preferences for this demographic
3. Use natural language that matches education level
4. Consider age-appropriate perspectives and experiences
5. Factor in income level for purchase-related questions
6. Consider geographic/cultural context

Respond in this JSON format:
{
    "selectedOption": "option_value_or_index",
    "textResponse": "written response if text question",
    "reasoning": "why this response fits the persona",
    "confidence": 0.9
}

For multiple choice: provide the option value/index
For text questions: provide natural text response
For scales: provide appropriate numeric value
For checkboxes: provide array of selected values`;
    }

    /**
     * Submit response to question
     */
    async submitQuestionResponse(question, response) {
        this.log(`📝 Submitting response for question type: ${question.type}`);
        
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
                    this.log(`⚠️ Unknown question type: ${question.type}`);
            }
            
            this.log('✅ Response submitted successfully');
            
        } catch (error) {
            this.log(`❌ Response submission failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit multiple choice response
     */
    async submitMultipleChoiceResponse(question, response) {
        const selectedOption = question.options.find(opt => 
            opt.value === response.selectedOption || 
            opt.label === response.selectedOption
        );
        
        if (selectedOption && selectedOption.element) {
            await selectedOption.element.click();
            await this.humanDelay(500, 1000);
        } else {
            // Fallback: click first available option
            if (question.options.length > 0) {
                await question.options[0].element.click();
            }
        }
    }

    /**
     * Submit text response
     */
    async submitTextResponse(question, response) {
        const textInput = await question.element.locator('input[type="text"], textarea').first();
        
        if (textInput) {
            await textInput.fill(response.textResponse || 'No comment');
            await this.humanDelay(500, 1000);
        }
    }

    /**
     * Additional helper methods for survey automation
     */
    
    async validateSurveyRequest(request) {
        const { email, site, surveyId } = request;
        
        if (!email || !site || !surveyId) {
            throw new Error('Missing required survey parameters');
        }
        
        // Check if survey is already active
        if (this.activeSurveys.has(surveyId)) {
            throw new Error('Survey session already active');
        }
        
        // Check concurrent survey limit
        if (this.activeSurveys.size >= this.options.maxConcurrentSurveys) {
            throw new Error('Maximum concurrent surveys reached');
        }
    }

    async createSurveySession(request) {
        const session = {
            ...request,
            status: 'initializing',
            createdAt: new Date().toISOString(),
            page: null,
            browser: null
        };
        
        this.activeSurveys.set(request.surveyId, session);
        return session;
    }

    async initializeSurveyComponents(session) {
        // Initialize browser context for this survey
        const { chromium } = require('playwright');
        const browser = await chromium.launch({ 
            headless: this.options.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Update session with browser instances
        session.browser = browser;
        session.page = page;
        
        // Initialize survey components
        this.surveyNavigator = new SurveyNavigator(page, { debugMode: this.options.debugMode });
        this.surveyDetector = new SiteSpecificSurveyDetector(page, this.contentAI, { debugMode: this.options.debugMode });
        this.loginSystem = new AutomaticLoginSystem(page, this.registrationLogger, this.contentAI, { debugMode: this.options.debugMode });
        
        if (!this.personaGenerator) {
            this.personaGenerator = new OptimalPersonaGenerator(this.registrationLogger, this.contentAI, { debugMode: this.options.debugMode });
        }
    }

    updateSurveyStatus(surveyId, status, additionalData = {}) {
        const session = this.activeSurveys.get(surveyId);
        if (session) {
            session.status = status;
            session.lastUpdated = new Date().toISOString();
            session.additionalData = { ...session.additionalData, ...additionalData };
            
            this.log(`📊 Survey ${surveyId} status: ${status}`);
        }
    }

    selectOptimalSurvey(surveyEntryPoints) {
        // Select survey with highest confidence score
        return surveyEntryPoints.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
    }

    async humanDelay(min, max) {
        const delay = min + Math.random() * (max - min);
        await new Promise(resolve => setTimeout(resolve, Math.round(delay)));
    }

    maskEmail(email) {
        const [user, domain] = email.split('@');
        return `${user.substring(0, 3)}***@${domain}`;
    }

    // Additional methods for API integration
    async getSurveyStatus(surveyId) {
        const session = this.activeSurveys.get(surveyId);
        if (!session) {
            throw new Error('Survey session not found');
        }
        
        return {
            status: session.status,
            progress: session.additionalData || {},
            questionsAnswered: session.additionalData?.questionsAnswered || 0,
            estimatedTimeRemaining: this.calculateTimeRemaining(session),
            currentQuestion: session.additionalData?.currentQuestion
        };
    }

    async getAvailableSurveys(request) {
        // Implementation to find available surveys for email/site
        return [];
    }

    async completeSurvey(surveyId, additionalResponses) {
        // Implementation to mark survey complete
        const session = this.activeSurveys.get(surveyId);
        if (session) {
            this.completedSurveys.set(surveyId, session);
            this.activeSurveys.delete(surveyId);
            return { success: true };
        }
        return { success: false };
    }

    // Logging and cleanup methods
    async cleanupSurveySession(surveyId) {
        const session = this.activeSurveys.get(surveyId);
        if (session?.browser) {
            await session.browser.close();
        }
        this.activeSurveys.delete(surveyId);
    }

    async logLLMPrompt(promptType, prompt) {
        if (this.options.enableLLMLogging) {
            try {
                await this.registrationLogger.logLLMInteraction({
                    interaction_type: 'prompt',
                    prompt_type: promptType,
                    prompt_content: prompt,
                    timestamp: new Date().toISOString(),
                    component: 'SurveyOrchestrator'
                });
            } catch (error) {
                this.log(`⚠️ LLM prompt logging failed: ${error.message}`);
            }
        }
    }

    async logLLMResponse(promptType, response) {
        if (this.options.enableLLMLogging) {
            try {
                await this.registrationLogger.logLLMInteraction({
                    interaction_type: 'response',
                    prompt_type: promptType,
                    response_content: response,
                    timestamp: new Date().toISOString(),
                    component: 'SurveyOrchestrator'
                });
            } catch (error) {
                this.log(`⚠️ LLM response logging failed: ${error.message}`);
            }
        }
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[SurveyOrchestrator] ${message}`);
        }
    }
}

module.exports = SurveyOrchestrator;