/**
 * Unified Poll Orchestrator
 * Consolidates all flow management, AI orchestration, and automation logic
 * 
 * Replaces:
 * - ai-orchestrator.js
 * - enhanced-flow-orchestrator.js  
 * - flow-controller.js
 * 
 * Features:
 * - Unified poll automation workflow
 * - Advanced question detection and classification
 * - Multi-modal response generation
 * - Error handling and recovery
 * - Performance monitoring
 * - Adaptive behavior
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class UnifiedPollOrchestrator extends EventEmitter {
    constructor(page, options = {}) {
        super();
        this.page = page;
        this.sessionId = crypto.randomBytes(16).toString('hex');
        
        this.options = {
            maxRetries: 3,
            adaptiveDelay: true,
            enableLearning: true,
            questionDetectionTimeout: 30000,
            responseGenerationTimeout: 15000,
            enableAdvancedAnalysis: true,
            debugMode: false,
            ...options
        };

        // Core systems - will be injected via dependency injection
        this.antiDetectionSystem = null;
        this.questionProcessor = null;
        this.humanBehaviorSystem = null;
        this.multiTabHandler = null;
        this.configManager = null;

        // Session state
        this.sessionData = {
            startTime: Date.now(),
            questionsProcessed: 0,
            responsesGenerated: 0,
            errorsEncountered: 0,
            currentStep: 'initialization',
            pollMetadata: {},
            performance: {
                averageQuestionTime: 0,
                averageResponseTime: 0,
                successRate: 1.0
            }
        };

        // Flow state machine
        this.flowStates = {
            INITIALIZING: 'initializing',
            ANALYZING_POLL: 'analyzing_poll',
            DETECTING_QUESTIONS: 'detecting_questions',
            PROCESSING_QUESTION: 'processing_question',
            GENERATING_RESPONSE: 'generating_response',
            SUBMITTING_RESPONSE: 'submitting_response',
            HANDLING_CHALLENGE: 'handling_challenge',
            NAVIGATING: 'navigating',
            COMPLETED: 'completed',
            ERROR: 'error'
        };

        this.currentState = this.flowStates.INITIALIZING;
        this.stateHistory = [];
        
        // Advanced features
        this.learningEngine = {
            questionPatterns: new Map(),
            responseStrategies: new Map(),
            errorPatterns: new Map(),
            siteSpecificAdaptations: new Map()
        };

        this.isInitialized = false;
    }

    /**
     * Initialize the orchestrator with all required systems
     */
    async initialize(dependencies = {}) {
        if (this.isInitialized) return;

        try {
            this.setState(this.flowStates.INITIALIZING);
            
            // Inject dependencies
            this.antiDetectionSystem = dependencies.antiDetectionSystem;
            this.questionProcessor = dependencies.questionProcessor;
            this.humanBehaviorSystem = dependencies.humanBehaviorSystem;
            this.multiTabHandler = dependencies.multiTabHandler;
            this.configManager = dependencies.configManager;

            // Validate required dependencies
            this.validateDependencies();

            // Initialize systems
            if (this.antiDetectionSystem) {
                await this.antiDetectionSystem.initialize();
                this.log('✅ Anti-detection system initialized');
            }

            if (this.questionProcessor) {
                await this.questionProcessor.initialize();
                this.log('✅ Question processor initialized');
            }

            if (this.humanBehaviorSystem) {
                await this.humanBehaviorSystem.initialize();
                this.log('✅ Human behavior system initialized');
            }

            // Setup page monitoring
            await this.setupPageMonitoring();

            // Load learning data if available
            if (this.options.enableLearning) {
                await this.loadLearningData();
            }

            this.isInitialized = true;
            this.log('🚀 Unified Poll Orchestrator initialized successfully');
            this.emit('initialized', { sessionId: this.sessionId });

        } catch (error) {
            this.handleError('initialization', error);
            throw error;
        }
    }

    /**
     * Main poll automation workflow
     */
    async automatePoll(pollUrl, options = {}) {
        const startTime = Date.now();
        
        try {
            this.log(`🎯 Starting poll automation: ${pollUrl}`);
            this.setState(this.flowStates.ANALYZING_POLL);

            // Step 1: Navigate and analyze poll
            const pollAnalysis = await this.analyzePoll(pollUrl);
            this.sessionData.pollMetadata = pollAnalysis;

            // Step 2: Process all questions in the poll
            const results = await this.processAllQuestions(pollAnalysis);

            // Step 3: Handle final submission
            if (results.allQuestionsProcessed) {
                await this.handleFinalSubmission();
            }

            // Step 4: Complete session
            this.setState(this.flowStates.COMPLETED);
            const duration = Date.now() - startTime;

            const sessionResult = {
                success: true,
                sessionId: this.sessionId,
                duration: duration,
                questionsProcessed: this.sessionData.questionsProcessed,
                responsesGenerated: this.sessionData.responsesGenerated,
                performance: this.calculatePerformanceMetrics(),
                pollMetadata: this.sessionData.pollMetadata
            };

            this.log(`✅ Poll automation completed in ${duration}ms`);
            this.emit('completed', sessionResult);

            // Save learning data
            if (this.options.enableLearning) {
                await this.saveLearningData();
            }

            return sessionResult;

        } catch (error) {
            this.handleError('poll_automation', error);
            throw error;
        }
    }

    /**
     * Analyze poll structure and characteristics
     */
    async analyzePoll(pollUrl) {
        this.log('🔍 Analyzing poll structure...');
        
        try {
            // Navigate to poll with anti-detection
            if (this.antiDetectionSystem) {
                await this.antiDetectionSystem.navigateStealthily(pollUrl);
            } else {
                await this.page.goto(pollUrl, { waitUntil: 'networkidle' });
            }

            // Wait for page to load completely
            await this.page.waitForLoadState('networkidle');
            await this.smartDelay(1000, 3000);

            // Analyze page structure
            const analysis = await this.page.evaluate(() => {
                const forms = Array.from(document.querySelectorAll('form'));
                const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                
                return {
                    title: document.title,
                    url: window.location.href,
                    hasMultipleForms: forms.length > 1,
                    totalInputs: inputs.length,
                    formCount: forms.length,
                    buttonCount: buttons.length,
                    hasProgressIndicator: !!document.querySelector('.progress, .step-indicator, [class*="progress"]'),
                    hasMultiplePages: !!document.querySelector('[class*="next"], [class*="continue"], [class*="page"]'),
                    detectedQuestionContainers: document.querySelectorAll('.question, [class*="question"], .field, [class*="field"]').length
                };
            });

            // Detect poll type and complexity
            analysis.pollType = this.classifyPollType(analysis);
            analysis.complexity = this.calculateComplexity(analysis);
            analysis.estimatedDuration = this.estimateDuration(analysis);

            this.log(`📊 Poll analysis: ${analysis.pollType} type, ${analysis.complexity} complexity, ~${analysis.estimatedDuration}s estimated`);
            
            return analysis;

        } catch (error) {
            this.handleError('poll_analysis', error);
            throw error;
        }
    }

    /**
     * Process all questions in the poll
     */
    async processAllQuestions(pollAnalysis) {
        this.log('📝 Processing all questions...');
        
        try {
            let processedQuestions = 0;
            let currentPage = 1;
            const maxPages = pollAnalysis.hasMultiplePages ? 20 : 1; // Safety limit

            while (currentPage <= maxPages) {
                this.setState(this.flowStates.DETECTING_QUESTIONS);
                
                // Detect questions on current page
                const questions = await this.detectQuestionsOnPage();
                
                if (questions.length === 0) {
                    this.log(`ℹ️ No questions found on page ${currentPage}`);
                    break;
                }

                this.log(`📋 Found ${questions.length} questions on page ${currentPage}`);

                // Process each question
                for (const question of questions) {
                    await this.processSingleQuestion(question);
                    processedQuestions++;
                    this.sessionData.questionsProcessed++;
                }

                // Navigate to next page if it exists
                const hasNextPage = await this.navigateToNextPage();
                if (!hasNextPage) {
                    this.log('🏁 Reached final page');
                    break;
                }

                currentPage++;
                await this.smartDelay(1000, 2000);
            }

            return {
                allQuestionsProcessed: true,
                totalQuestions: processedQuestions,
                pagesProcessed: currentPage
            };

        } catch (error) {
            this.handleError('question_processing', error);
            throw error;
        }
    }

    /**
     * Detect questions on the current page
     */
    async detectQuestionsOnPage() {
        if (this.questionProcessor) {
            return await this.questionProcessor.detectQuestions(this.page);
        }

        // Fallback implementation
        return await this.page.evaluate(() => {
            const questionSelectors = [
                '.question',
                '[class*="question"]',
                '.field',
                '[class*="field"]',
                '.form-group',
                '[data-question]',
                'fieldset'
            ];

            const questions = [];
            
            for (const selector of questionSelectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                
                for (const element of elements) {
                    const text = element.textContent?.trim();
                    const inputs = element.querySelectorAll('input, select, textarea');
                    
                    if (text && inputs.length > 0) {
                        questions.push({
                            element: element,
                            text: text,
                            inputs: Array.from(inputs),
                            type: this.classifyQuestionType(element, inputs),
                            id: element.id || `question_${questions.length}`,
                            selector: this.generateSelector(element)
                        });
                    }
                }
            }

            return questions;
        });
    }

    /**
     * Process a single question
     */
    async processSingleQuestion(question) {
        const startTime = Date.now();
        
        try {
            this.setState(this.flowStates.PROCESSING_QUESTION);
            this.log(`🤔 Processing question: ${question.text.substring(0, 50)}...`);

            // Classify question if not already done
            if (this.questionProcessor) {
                question = await this.questionProcessor.classifyQuestion(question);
            }

            // Generate response
            this.setState(this.flowStates.GENERATING_RESPONSE);
            const response = await this.generateResponse(question);

            // Submit response with human behavior
            this.setState(this.flowStates.SUBMITTING_RESPONSE);
            await this.submitResponse(question, response);

            // Handle any verification challenges
            await this.handlePostResponseChallenges();

            const processingTime = Date.now() - startTime;
            this.updatePerformanceMetrics('question_processing', processingTime);
            this.sessionData.responsesGenerated++;

            this.log(`✅ Question processed in ${processingTime}ms`);

        } catch (error) {
            this.handleError('single_question_processing', error);
            throw error;
        }
    }

    /**
     * Generate response for a question
     */
    async generateResponse(question) {
        try {
            // Use advanced AI if available
            if (this.questionProcessor) {
                return await this.questionProcessor.generateResponse(question);
            }

            // Fallback response generation
            switch (question.type) {
                case 'multiple_choice':
                    return this.generateMultipleChoiceResponse(question);
                
                case 'text_input':
                    return this.generateTextResponse(question);
                
                case 'rating_scale':
                    return this.generateRatingResponse(question);
                
                case 'checkbox':
                    return this.generateCheckboxResponse(question);
                
                case 'dropdown':
                    return this.generateDropdownResponse(question);
                
                default:
                    return this.generateGenericResponse(question);
            }

        } catch (error) {
            this.handleError('response_generation', error);
            throw error;
        }
    }

    /**
     * Submit response with human behavior simulation
     */
    async submitResponse(question, response) {
        try {
            // Use human behavior system if available
            if (this.humanBehaviorSystem) {
                await this.humanBehaviorSystem.interactWithQuestion(question, response);
                return;
            }

            // Fallback implementation
            for (const input of question.inputs) {
                await this.interactWithInput(input, response);
                await this.smartDelay(200, 800);
            }

        } catch (error) {
            this.handleError('response_submission', error);
            throw error;
        }
    }

    /**
     * Handle verification challenges that may appear after responses
     */
    async handlePostResponseChallenges() {
        try {
            // Check for common challenge elements
            const challengeSelectors = [
                '.captcha',
                '[class*="captcha"]',
                '.verification',
                '[class*="verification"]',
                '.challenge',
                '[class*="challenge"]'
            ];

            for (const selector of challengeSelectors) {
                const challenge = await this.page.$(selector);
                if (challenge) {
                    this.setState(this.flowStates.HANDLING_CHALLENGE);
                    
                    if (this.antiDetectionSystem) {
                        await this.antiDetectionSystem.handleChallenge(challenge);
                    } else {
                        this.log('⚠️ Challenge detected but no handler available');
                    }
                    break;
                }
            }

        } catch (error) {
            this.log('⚠️ Error handling post-response challenges:', error.message);
            // Don't throw - challenges are optional
        }
    }

    /**
     * Navigate to next page
     */
    async navigateToNextPage() {
        try {
            const nextSelectors = [
                'button:has-text("Next")',
                'button:has-text("Continue")',
                'input[type="submit"][value*="Next"]',
                'input[type="submit"][value*="Continue"]',
                '[class*="next"]',
                '[class*="continue"]'
            ];

            for (const selector of nextSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        this.setState(this.flowStates.NAVIGATING);
                        
                        if (this.humanBehaviorSystem) {
                            await this.humanBehaviorSystem.clickElement(element);
                        } else {
                            await element.click();
                        }
                        
                        await this.page.waitForLoadState('networkidle');
                        return true;
                    }
                } catch (err) {
                    continue; // Try next selector
                }
            }

            return false;

        } catch (error) {
            this.log('⚠️ Error navigating to next page:', error.message);
            return false;
        }
    }

    /**
     * Handle final poll submission
     */
    async handleFinalSubmission() {
        try {
            this.log('🏁 Handling final submission...');

            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Finish")',
                'button:has-text("Complete")'
            ];

            for (const selector of submitSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        if (this.humanBehaviorSystem) {
                            await this.humanBehaviorSystem.clickElement(element);
                        } else {
                            await element.click();
                        }
                        
                        await this.page.waitForLoadState('networkidle');
                        this.log('✅ Final submission completed');
                        return;
                    }
                } catch (err) {
                    continue;
                }
            }

            this.log('⚠️ No submit button found for final submission');

        } catch (error) {
            this.handleError('final_submission', error);
            throw error;
        }
    }

    /**
     * State management
     */
    setState(newState) {
        const previousState = this.currentState;
        this.currentState = newState;
        this.stateHistory.push({
            state: newState,
            timestamp: Date.now(),
            previousState: previousState
        });
        
        this.sessionData.currentStep = newState;
        this.emit('stateChanged', { 
            newState, 
            previousState, 
            sessionId: this.sessionId 
        });
    }

    /**
     * Utility methods
     */
    async smartDelay(min = 500, max = 1500) {
        if (!this.options.adaptiveDelay) return;
        
        const delay = min + Math.random() * (max - min);
        await this.page.waitForTimeout(delay);
    }

    classifyPollType(analysis) {
        if (analysis.hasMultiplePages) return 'multi_page';
        if (analysis.totalInputs > 10) return 'comprehensive';
        if (analysis.totalInputs <= 3) return 'simple';
        return 'standard';
    }

    calculateComplexity(analysis) {
        let score = 0;
        score += analysis.totalInputs * 2;
        score += analysis.formCount * 5;
        if (analysis.hasMultiplePages) score += 10;
        if (analysis.hasProgressIndicator) score += 5;
        
        if (score <= 10) return 'low';
        if (score <= 30) return 'medium';
        return 'high';
    }

    estimateDuration(analysis) {
        const baseTime = 30; // Base 30 seconds
        const inputTime = analysis.totalInputs * 5; // 5 seconds per input
        const pageTime = analysis.hasMultiplePages ? 20 : 0; // 20 seconds for multi-page
        
        return baseTime + inputTime + pageTime;
    }

    validateDependencies() {
        // Check for required dependencies based on configuration
        if (this.options.enableAdvancedAnalysis && !this.questionProcessor) {
            this.log('⚠️ Advanced analysis enabled but no question processor provided');
        }
    }

    async setupPageMonitoring() {
        // Monitor page for errors and challenges
        this.page.on('pageerror', (error) => {
            this.log('🚨 Page error:', error.message);
        });

        this.page.on('response', (response) => {
            if (response.status() >= 400) {
                this.log(`⚠️ HTTP error: ${response.status()} - ${response.url()}`);
            }
        });
    }

    updatePerformanceMetrics(operation, duration) {
        const perf = this.sessionData.performance;
        
        switch (operation) {
            case 'question_processing':
                perf.averageQuestionTime = (perf.averageQuestionTime + duration) / 2;
                break;
            case 'response_generation':
                perf.averageResponseTime = (perf.averageResponseTime + duration) / 2;
                break;
        }
    }

    calculatePerformanceMetrics() {
        const totalQuestions = this.sessionData.questionsProcessed;
        const totalResponses = this.sessionData.responsesGenerated;
        const errors = this.sessionData.errorsEncountered;
        
        return {
            successRate: totalQuestions > 0 ? (totalResponses / totalQuestions) : 1.0,
            errorRate: totalQuestions > 0 ? (errors / totalQuestions) : 0,
            averageQuestionTime: this.sessionData.performance.averageQuestionTime,
            averageResponseTime: this.sessionData.performance.averageResponseTime,
            questionsPerMinute: this.calculateQuestionsPerMinute()
        };
    }

    calculateQuestionsPerMinute() {
        const duration = Date.now() - this.sessionData.startTime;
        const minutes = duration / 60000;
        return minutes > 0 ? (this.sessionData.questionsProcessed / minutes) : 0;
    }

    handleError(context, error) {
        this.sessionData.errorsEncountered++;
        this.setState(this.flowStates.ERROR);
        
        const errorInfo = {
            context: context,
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            currentState: this.currentState
        };

        this.log(`❌ Error in ${context}: ${error.message}`);
        this.emit('error', errorInfo);

        // Store error for learning
        if (this.options.enableLearning) {
            const errorKey = `${context}_${error.message}`;
            const count = this.learningEngine.errorPatterns.get(errorKey) || 0;
            this.learningEngine.errorPatterns.set(errorKey, count + 1);
        }
    }

    log(message) {
        if (this.options.debugMode) {
            console.log(`[UnifiedOrchestrator:${this.sessionId.substring(0, 8)}] ${message}`);
        }
    }

    // Fallback response generation methods
    generateMultipleChoiceResponse(question) {
        const choices = question.inputs.filter(input => input.type === 'radio');
        if (choices.length > 0) {
            // Weighted random selection (avoid first/last bias)
            const weights = choices.map((_, i) => {
                if (i === 0 || i === choices.length - 1) return 0.2;
                return 1.0;
            });
            const randomIndex = this.weightedRandomChoice(weights);
            return { inputIndex: randomIndex, value: choices[randomIndex].value };
        }
        return null;
    }

    generateTextResponse(question) {
        const textPatterns = {
            name: ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson'],
            email: ['user@example.com', 'test@domain.com', 'sample@mail.com'],
            age: ['25', '30', '35', '28', '32'],
            comment: ['Good experience', 'Very satisfied', 'Could be better', 'Excellent service']
        };
        
        const questionText = question.text.toLowerCase();
        for (const [type, patterns] of Object.entries(textPatterns)) {
            if (questionText.includes(type)) {
                return patterns[Math.floor(Math.random() * patterns.length)];
            }
        }
        
        return 'Satisfied';
    }

    generateRatingResponse(question) {
        // Bias toward positive ratings (3-5 out of 5)
        const rating = Math.random() < 0.7 ? 4 : (Math.random() < 0.5 ? 3 : 5);
        return { rating };
    }

    generateCheckboxResponse(question) {
        const checkboxes = question.inputs.filter(input => input.type === 'checkbox');
        const numToCheck = Math.min(2, Math.floor(Math.random() * checkboxes.length) + 1);
        const selectedIndices = [];
        
        while (selectedIndices.length < numToCheck) {
            const randomIndex = Math.floor(Math.random() * checkboxes.length);
            if (!selectedIndices.includes(randomIndex)) {
                selectedIndices.push(randomIndex);
            }
        }
        
        return { selectedIndices };
    }

    generateDropdownResponse(question) {
        const options = question.inputs[0]?.children || [];
        if (options.length > 1) {
            // Skip first option (usually 'Select...')
            const validOptions = options.slice(1);
            const randomIndex = Math.floor(Math.random() * validOptions.length);
            return { selectedIndex: randomIndex + 1 };
        }
        return null;
    }

    generateGenericResponse(question) {
        return { action: 'skip', reason: 'Unknown question type' };
    }

    weightedRandomChoice(weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i;
            }
        }
        
        return weights.length - 1;
    }

    async interactWithInput(input, response) {
        switch (input.type) {
            case 'radio':
            case 'checkbox':
                await input.click();
                break;
            case 'text':
            case 'email':
            case 'textarea':
                await input.fill(response.value || response);
                break;
            case 'select':
                if (response.selectedIndex !== undefined) {
                    const options = await input.$$('option');
                    if (options[response.selectedIndex]) {
                        await options[response.selectedIndex].click();
                    }
                }
                break;
        }
    }

    // Learning system methods
    async loadLearningData() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const dataPath = path.join(__dirname, '../../data/learning-data.json');
            
            const data = await fs.readFile(dataPath, 'utf8');
            const learningData = JSON.parse(data);
            
            if (learningData.questionPatterns) {
                Object.entries(learningData.questionPatterns).forEach(([key, value]) => {
                    this.learningEngine.questionPatterns.set(key, value);
                });
            }
            
            if (learningData.responseStrategies) {
                Object.entries(learningData.responseStrategies).forEach(([key, value]) => {
                    this.learningEngine.responseStrategies.set(key, value);
                });
            }
            
            this.log('📚 Learning data loaded successfully');
        } catch (error) {
            this.log('📝 No learning data found, starting fresh');
        }
    }

    async saveLearningData() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const dataPath = path.join(__dirname, '../../data');
            
            await fs.mkdir(dataPath, { recursive: true });
            
            const learningData = {
                questionPatterns: Object.fromEntries(this.learningEngine.questionPatterns),
                responseStrategies: Object.fromEntries(this.learningEngine.responseStrategies),
                errorPatterns: Object.fromEntries(this.learningEngine.errorPatterns),
                siteSpecificAdaptations: Object.fromEntries(this.learningEngine.siteSpecificAdaptations),
                lastUpdated: Date.now()
            };
            
            await fs.writeFile(
                path.join(dataPath, 'learning-data.json'),
                JSON.stringify(learningData, null, 2)
            );
            
            this.log('💾 Learning data saved successfully');
        } catch (error) {
            this.log('⚠️ Failed to save learning data:', error.message);
        }
    }

    /**
     * Get session statistics and status
     */
    getSessionStatus() {
        return {
            sessionId: this.sessionId,
            currentState: this.currentState,
            duration: Date.now() - this.sessionData.startTime,
            questionsProcessed: this.sessionData.questionsProcessed,
            responsesGenerated: this.sessionData.responsesGenerated,
            errorsEncountered: this.sessionData.errorsEncountered,
            performance: this.calculatePerformanceMetrics(),
            pollMetadata: this.sessionData.pollMetadata
        };
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        this.log('🔄 Shutting down Unified Poll Orchestrator...');
        
        // Save final session data
        if (this.options.enableLearning) {
            await this.saveLearningData();
        }

        // Cleanup event listeners
        this.removeAllListeners();

        this.log('✅ Unified Poll Orchestrator shutdown complete');
    }
}

module.exports = UnifiedPollOrchestrator;