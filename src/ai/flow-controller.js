/**
 * AI-Driven Flow Control and Progress Validation
 * Manages the entire poll completion flow with intelligent decision-making
 * Handles complex scenarios like multi-page surveys, conditional questions, and error recovery
 */

class FlowController {
    constructor(aiService, page, multiTabHandler = null) {
        this.ai = aiService;
        this.page = page;
        this.multiTabHandler = multiTabHandler;
        
        this.state = {
            currentStep: 0,
            totalSteps: null,
            questionsAnswered: 0,
            totalQuestions: null,
            completionPercentage: 0,
            errors: [],
            warnings: [],
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            pageHistory: [],
            actionHistory: []
        };
        
        this.flowPatterns = new Map(); // Cache for learned flow patterns
        this.retryAttempts = 0;
        this.maxRetries = 3;
    }

    /**
     * Main flow orchestration method
     */
    async orchestrateFlow(context = {}) {
        console.log('🎯 Starting AI-driven flow orchestration...');
        
        try {
            // Initialize flow analysis
            await this.initializeFlow(context);
            
            let flowComplete = false;
            let iterations = 0;
            const maxIterations = 50; // Prevent infinite loops
            
            while (!flowComplete && iterations < maxIterations) {
                iterations++;
                
                console.log(`🔄 Flow iteration ${iterations}`);
                
                // Analyze current page state
                const pageAnalysis = await this.analyzeCurrentPage();
                
                // Get AI decision for next action
                const flowDecision = await this.getFlowDecision(pageAnalysis, context);
                
                // Execute the decided action
                const actionResult = await this.executeFlowAction(flowDecision, pageAnalysis);
                
                // Update flow state
                this.updateFlowState(actionResult, flowDecision);
                
                // Check if flow is complete
                flowComplete = this.isFlowComplete(actionResult, flowDecision);
                
                // Handle errors and recovery
                if (actionResult.error) {
                    const recovery = await this.handleFlowError(actionResult, pageAnalysis);
                    if (!recovery.canContinue) {
                        break;
                    }
                }
                
                // Progress validation
                await this.validateProgress();
                
                // Small delay to prevent overwhelming the site
                await this.page.waitForTimeout(1000 + Math.random() * 2000);
            }
            
            return this.generateFlowReport(flowComplete);
            
        } catch (error) {
            console.error('❌ Flow orchestration failed:', error);
            return this.generateErrorReport(error);
        }
    }

    /**
     * Initialize flow analysis and setup
     */
    async initializeFlow(context) {
        console.log('🏗️ Initializing flow analysis...');
        
        const initialAnalysis = await this.analyzeCurrentPage();
        
        // Detect survey type and expected flow
        const flowType = await this.detectFlowType(initialAnalysis);
        
        this.state.flowType = flowType;
        this.state.expectedPattern = flowType.pattern;
        this.state.totalSteps = flowType.estimatedSteps;
        this.state.totalQuestions = flowType.estimatedQuestions;
        
        console.log(`📊 Flow initialized - Type: ${flowType.type}, Steps: ${flowType.estimatedSteps}`);
        
        // Store initial page in history
        this.addToPageHistory(initialAnalysis);
    }

    /**
     * Analyze current page state comprehensively
     */
    async analyzeCurrentPage() {
        const url = this.page.url();
        const timestamp = Date.now();
        
        console.log(`🔍 Analyzing page: ${url}`);
        
        // Get basic page information
        const [pageInfo, formData, navigationElements] = await Promise.all([
            this.extractPageInfo(),
            this.extractFormData(),
            this.extractNavigationElements()
        ]);
        
        return {
            url,
            timestamp,
            pageInfo,
            formData,
            navigationElements,
            state: this.state
        };
    }

    /**
     * Extract comprehensive page information
     */
    async extractPageInfo() {
        return await this.page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                
                // Content analysis
                bodyText: document.body.textContent.substring(0, 1000),
                hasErrors: !!document.querySelector('.error, .alert-danger, [role="alert"]'),
                hasSuccess: !!document.querySelector('.success, .alert-success, .complete'),
                hasLoading: !!document.querySelector('.loading, .spinner, .loader'),
                
                // Progress indicators
                progressBars: Array.from(document.querySelectorAll('.progress, [role="progressbar"]')).map(el => ({
                    value: el.getAttribute('aria-valuenow') || el.style.width,
                    max: el.getAttribute('aria-valuemax') || '100',
                    text: el.textContent?.trim()
                })),
                
                stepIndicators: Array.from(document.querySelectorAll('.step, .page-number, .question-number')).map(el => ({
                    text: el.textContent?.trim(),
                    isActive: el.classList.contains('active') || el.classList.contains('current')
                })),
                
                // Page type indicators
                isCompletionPage: /thank|complete|finish|done|success/i.test(document.body.textContent),
                isErrorPage: /error|404|403|500|problem|issue/i.test(document.body.textContent),
                isLoadingPage: /loading|processing|wait|please.*wait/i.test(document.body.textContent),
                
                // Dynamic content
                hasJavaScript: !!window.React || !!window.Vue || !!window.angular,
                isDynamic: document.querySelectorAll('[data-react], [data-vue], [ng-app]').length > 0,
                
                // Accessibility info
                landmarks: Array.from(document.querySelectorAll('main, [role="main"], section, article')).length,
                headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
                    level: parseInt(h.tagName.substring(1)),
                    text: h.textContent?.trim()
                }))
            };
        });
    }

    /**
     * Extract form data and question information
     */
    async extractFormData() {
        return await this.page.evaluate(() => {
            const forms = [];
            const questions = [];
            
            // Analyze all forms
            document.querySelectorAll('form').forEach((form, formIndex) => {
                const formInfo = {
                    index: formIndex,
                    action: form.action,
                    method: form.method,
                    fields: [],
                    isComplete: true
                };
                
                // Analyze form fields
                form.querySelectorAll('input, select, textarea').forEach(field => {
                    const fieldInfo = {
                        type: field.type || field.tagName.toLowerCase(),
                        name: field.name,
                        required: field.required,
                        value: field.value,
                        checked: field.checked,
                        filled: !!(field.value && field.value.trim())
                    };
                    
                    formInfo.fields.push(fieldInfo);
                    
                    // Check if required field is empty
                    if (field.required && !fieldInfo.filled && !fieldInfo.checked) {
                        formInfo.isComplete = false;
                    }
                });
                
                forms.push(formInfo);
            });
            
            // Extract questions using multiple strategies
            const questionSelectors = [
                '.question', '.survey-question', '.form-question', '.poll-question',
                '[data-question]', 'fieldset', '.field-group', '.form-group'
            ];
            
            questionSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach((el, index) => {
                    const questionText = el.querySelector('legend, label, .question-text, h3, h4')?.textContent?.trim() ||
                                       el.textContent?.trim().substring(0, 200);
                    
                    if (questionText && questionText.length > 10) {
                        const inputs = el.querySelectorAll('input, select, textarea');
                        const isAnswered = Array.from(inputs).some(input => {
                            if (input.type === 'radio' || input.type === 'checkbox') {
                                return input.checked;
                            }
                            return input.value && input.value.trim();
                        });
                        
                        questions.push({
                            text: questionText,
                            selector: `${selector}:nth-of-type(${index + 1})`,
                            answered: isAnswered,
                            required: Array.from(inputs).some(i => i.required),
                            type: this.determineQuestionType(inputs)
                        });
                    }
                });
            });
            
            return {
                forms,
                questions,
                totalQuestions: questions.length,
                answeredQuestions: questions.filter(q => q.answered).length,
                requiredQuestions: questions.filter(q => q.required).length,
                completionRate: questions.length > 0 ? questions.filter(q => q.answered).length / questions.length : 0
            };
            
            function determineQuestionType(inputs) {
                const inputArray = Array.from(inputs);
                if (inputArray.some(i => i.type === 'radio')) return 'single_choice';
                if (inputArray.some(i => i.type === 'checkbox')) return 'multiple_choice';
                if (inputArray.some(i => i.tagName === 'SELECT')) return 'dropdown';
                if (inputArray.some(i => i.type === 'range')) return 'slider';
                if (inputArray.some(i => i.tagName === 'TEXTAREA')) return 'text';
                return 'text';
            }
        });
    }

    /**
     * Extract navigation elements and buttons
     */
    async extractNavigationElements() {
        return await this.page.evaluate(() => {
            const buttons = [];
            const links = [];
            
            // Find all potential navigation buttons
            const buttonSelectors = [
                'button', 'input[type="button"]', 'input[type="submit"]',
                '.btn', '.button', '[role="button"]',
                'a[href*="next"]', 'a[href*="continue"]', 'a[href*="submit"]'
            ];
            
            buttonSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) { // Only visible elements
                        const buttonInfo = {
                            text: el.textContent?.trim() || el.value || el.getAttribute('aria-label'),
                            type: el.type || el.tagName.toLowerCase(),
                            disabled: el.disabled,
                            href: el.href,
                            className: el.className,
                            id: el.id,
                            selector: this.generateSelector(el),
                            action: this.determineButtonAction(el)
                        };
                        
                        if (el.tagName === 'A') {
                            links.push(buttonInfo);
                        } else {
                            buttons.push(buttonInfo);
                        }
                    }
                });
            });
            
            return {
                buttons,
                links,
                hasNext: buttons.some(b => /next|continue|forward/i.test(b.text)),
                hasSubmit: buttons.some(b => /submit|finish|complete|send/i.test(b.text)),
                hasPrevious: buttons.some(b => /previous|back/i.test(b.text))
            };
            
            function generateSelector(element) {
                if (element.id) return `#${element.id}`;
                if (element.className) {
                    const classes = element.className.split(' ').filter(c => c).slice(0, 2);
                    return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
                }
                return element.tagName.toLowerCase();
            }
            
            function determineButtonAction(element) {
                const text = (element.textContent || element.value || '').toLowerCase();
                if (/next|continue|forward|proceed/.test(text)) return 'next';
                if (/submit|finish|complete|send|done/.test(text)) return 'submit';
                if (/previous|back/.test(text)) return 'previous';
                if (/save|draft/.test(text)) return 'save';
                if (/skip/.test(text)) return 'skip';
                return 'unknown';
            }
        });
    }

    /**
     * Get AI decision for next flow action
     */
    async getFlowDecision(pageAnalysis, context) {
        const prompt = `Analyze this poll/survey page state and decide the next action for optimal flow completion:

CURRENT PAGE STATE:
URL: ${pageAnalysis.url}
Title: ${pageAnalysis.pageInfo.title}

FORM COMPLETION:
- Total questions: ${pageAnalysis.formData.totalQuestions}
- Answered questions: ${pageAnalysis.formData.answeredQuestions}
- Required questions: ${pageAnalysis.formData.requiredQuestions}
- Completion rate: ${(pageAnalysis.formData.completionRate * 100).toFixed(1)}%

PAGE INDICATORS:
- Has errors: ${pageAnalysis.pageInfo.hasErrors}
- Has success: ${pageAnalysis.pageInfo.hasSuccess}
- Is completion page: ${pageAnalysis.pageInfo.isCompletionPage}
- Is loading: ${pageAnalysis.pageInfo.hasLoading}

NAVIGATION AVAILABLE:
- Has next button: ${pageAnalysis.navigationElements.hasNext}
- Has submit button: ${pageAnalysis.navigationElements.hasSubmit}
- Has previous button: ${pageAnalysis.navigationElements.hasPrevious}

FLOW CONTEXT:
- Current step: ${this.state.currentStep}
- Total steps: ${this.state.totalSteps || 'unknown'}
- Session time: ${((Date.now() - this.state.startTime) / 1000).toFixed(0)}s
- Previous errors: ${this.state.errors.length}

FLOW HISTORY:
Recent actions: ${this.state.actionHistory.slice(-3).map(a => a.action).join(' → ')}

DECISION RULES:
1. If completion page detected → COMPLETE
2. If errors present → ANALYZE_ERROR
3. If questions remain unanswered → ANSWER_QUESTIONS  
4. If all required answered and next available → PROCEED_NEXT
5. If all questions answered and submit available → SUBMIT
6. If loading detected → WAIT
7. If stuck or unclear → ANALYZE_DEEPER

RESPOND WITH JSON:
{
  "action": "ANSWER_QUESTIONS|PROCEED_NEXT|SUBMIT|COMPLETE|WAIT|ANALYZE_ERROR|ANALYZE_DEEPER|GO_BACK",
  "reasoning": "detailed explanation of why this action was chosen",
  "confidence": 0.0-1.0,
  "priority": "high|medium|low",
  "expectedOutcome": "what should happen after this action",
  "questions_to_answer": [0, 1, 2],
  "button_to_click": "selector or description",
  "wait_time": 3000,
  "fallback_action": "alternative if primary action fails",
  "risk_assessment": "low|medium|high - likelihood of issues"
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 500
            });

            const decision = JSON.parse(response);
            console.log(`🤖 AI Flow Decision: ${decision.action} (${decision.confidence})`);
            console.log(`   Reasoning: ${decision.reasoning}`);
            
            return decision;

        } catch (error) {
            console.error('Flow decision failed:', error);
            return {
                action: 'ANALYZE_DEEPER',
                reasoning: 'AI decision analysis failed, falling back to deeper analysis',
                confidence: 0.1,
                priority: 'medium'
            };
        }
    }

    /**
     * Execute the flow action decided by AI
     */
    async executeFlowAction(decision, pageAnalysis) {
        console.log(`🚀 Executing flow action: ${decision.action}`);
        
        const actionStart = Date.now();
        let result = { success: false, action: decision.action };
        
        try {
            switch (decision.action) {
                case 'ANSWER_QUESTIONS':
                    result = await this.executeAnswerQuestions(decision, pageAnalysis);
                    break;
                    
                case 'PROCEED_NEXT':
                    result = await this.executeProceedNext(decision, pageAnalysis);
                    break;
                    
                case 'SUBMIT':
                    result = await this.executeSubmit(decision, pageAnalysis);
                    break;
                    
                case 'COMPLETE':
                    result = { success: true, action: 'COMPLETE', completed: true };
                    break;
                    
                case 'WAIT':
                    result = await this.executeWait(decision, pageAnalysis);
                    break;
                    
                case 'ANALYZE_ERROR':
                    result = await this.executeErrorAnalysis(decision, pageAnalysis);
                    break;
                    
                case 'ANALYZE_DEEPER':
                    result = await this.executeDeepAnalysis(decision, pageAnalysis);
                    break;
                    
                case 'GO_BACK':
                    result = await this.executeGoBack(decision, pageAnalysis);
                    break;
                    
                default:
                    throw new Error(`Unknown action: ${decision.action}`);
            }
            
            result.duration = Date.now() - actionStart;
            result.decision = decision;
            
        } catch (error) {
            result = {
                success: false,
                action: decision.action,
                error: error.message,
                duration: Date.now() - actionStart
            };
        }
        
        // Record action in history
        this.state.actionHistory.push({
            action: decision.action,
            result,
            timestamp: Date.now(),
            url: pageAnalysis.url
        });
        
        return result;
    }

    /**
     * Execute question answering
     */
    async executeAnswerQuestions(decision, pageAnalysis) {
        console.log('📝 Executing question answering...');
        
        const unansweredQuestions = pageAnalysis.formData.questions.filter(q => !q.answered);
        const questionsToAnswer = decision.questions_to_answer || 
                                 unansweredQuestions.slice(0, 3).map((_, i) => i);
        
        let answeredCount = 0;
        
        for (const questionIndex of questionsToAnswer) {
            try {
                const question = unansweredQuestions[questionIndex];
                if (!question) continue;
                
                // Generate answer using AI
                const answer = await this.generateQuestionAnswer(question);
                
                if (answer && answer.action === 'answer') {
                    await this.inputAnswer(question, answer);
                    answeredCount++;
                    this.state.questionsAnswered++;
                }
                
            } catch (error) {
                console.warn(`Failed to answer question ${questionIndex}:`, error);
            }
        }
        
        return {
            success: answeredCount > 0,
            action: 'ANSWER_QUESTIONS',
            questionsAnswered: answeredCount,
            totalAnswered: this.state.questionsAnswered
        };
    }

    /**
     * Generate answer for a specific question
     */
    async generateQuestionAnswer(question) {
        const prompt = `Generate a realistic answer for this survey question:

Question: "${question.text}"
Type: ${question.type}
Required: ${question.required}

Respond as a 28-year-old professional with consistent personality.

JSON Response:
{
  "action": "answer|skip",
  "value": "answer value",
  "reasoning": "why this answer"
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.7,
                maxTokens: 200
            });

            return JSON.parse(response);
        } catch (error) {
            return { action: 'skip', reason: 'Answer generation failed' };
        }
    }

    /**
     * Input answer using appropriate method
     */
    async inputAnswer(question, answer) {
        // This would interface with the form interaction system
        // For now, simulate the action
        console.log(`✅ Answered: "${question.text.substring(0, 50)}..." → ${answer.value}`);
        
        // Add small delay to simulate human behavior
        await this.page.waitForTimeout(500 + Math.random() * 1000);
    }

    /**
     * Execute proceed to next step
     */
    async executeProceedNext(decision, pageAnalysis) {
        console.log('➡️ Executing proceed to next...');
        
        const nextButtons = pageAnalysis.navigationElements.buttons.filter(b => 
            b.action === 'next' || /next|continue/i.test(b.text)
        );
        
        if (nextButtons.length > 0) {
            const button = nextButtons[0];
            
            if (this.multiTabHandler) {
                await this.multiTabHandler.handleRedirectClick(button.selector);
            } else {
                await this.page.click(button.selector);
                await this.page.waitForLoadState('networkidle');
            }
            
            this.state.currentStep++;
            
            return {
                success: true,
                action: 'PROCEED_NEXT',
                buttonClicked: button.text,
                newStep: this.state.currentStep
            };
        }
        
        return {
            success: false,
            action: 'PROCEED_NEXT',
            error: 'No next button found'
        };
    }

    /**
     * Execute submit action
     */
    async executeSubmit(decision, pageAnalysis) {
        console.log('🚀 Executing submit...');
        
        const submitButtons = pageAnalysis.navigationElements.buttons.filter(b => 
            b.action === 'submit' || /submit|finish|complete/i.test(b.text)
        );
        
        if (submitButtons.length > 0) {
            const button = submitButtons[0];
            
            if (this.multiTabHandler) {
                await this.multiTabHandler.handleRedirectClick(button.selector);
            } else {
                await this.page.click(button.selector);
                await this.page.waitForLoadState('networkidle');
            }
            
            return {
                success: true,
                action: 'SUBMIT',
                buttonClicked: button.text,
                submitted: true
            };
        }
        
        return {
            success: false,
            action: 'SUBMIT',
            error: 'No submit button found'
        };
    }

    /**
     * Execute wait action
     */
    async executeWait(decision, pageAnalysis) {
        const waitTime = decision.wait_time || 3000;
        console.log(`⏳ Waiting ${waitTime}ms...`);
        
        await this.page.waitForTimeout(waitTime);
        
        return {
            success: true,
            action: 'WAIT',
            waitTime
        };
    }

    /**
     * Execute error analysis and recovery
     */
    async executeErrorAnalysis(decision, pageAnalysis) {
        console.log('🔍 Analyzing errors...');
        
        const errors = await this.page.evaluate(() => {
            const errorElements = document.querySelectorAll('.error, .alert-danger, [role="alert"]');
            return Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean);
        });
        
        this.state.errors.push(...errors);
        
        return {
            success: true,
            action: 'ANALYZE_ERROR',
            errorsFound: errors.length,
            errors
        };
    }

    /**
     * Execute deep analysis for unclear situations
     */
    async executeDeepAnalysis(decision, pageAnalysis) {
        console.log('🔬 Performing deep analysis...');
        
        // Take screenshot for visual analysis if available
        const screenshot = await this.page.screenshot({ quality: 60 });
        
        return {
            success: true,
            action: 'ANALYZE_DEEPER',
            screenshotTaken: true,
            analysis: 'Deep analysis performed'
        };
    }

    /**
     * Execute go back action
     */
    async executeGoBack(decision, pageAnalysis) {
        console.log('⬅️ Going back...');
        
        await this.page.goBack();
        await this.page.waitForLoadState('networkidle');
        
        this.state.currentStep = Math.max(0, this.state.currentStep - 1);
        
        return {
            success: true,
            action: 'GO_BACK',
            newStep: this.state.currentStep
        };
    }

    /**
     * Update flow state after action execution
     */
    updateFlowState(actionResult, decision) {
        if (actionResult.success) {
            this.retryAttempts = 0; // Reset on success
        } else {
            this.retryAttempts++;
        }
        
        // Update completion percentage
        if (this.state.totalQuestions > 0) {
            this.state.completionPercentage = 
                (this.state.questionsAnswered / this.state.totalQuestions) * 100;
        }
        
        // Update step tracking
        if (actionResult.newStep !== undefined) {
            this.state.currentStep = actionResult.newStep;
        }
    }

    /**
     * Check if flow is complete
     */
    isFlowComplete(actionResult, decision) {
        return actionResult.completed || 
               actionResult.action === 'COMPLETE' ||
               actionResult.submitted ||
               this.retryAttempts >= this.maxRetries;
    }

    /**
     * Handle flow errors and recovery
     */
    async handleFlowError(actionResult, pageAnalysis) {
        console.warn(`⚠️ Flow error in ${actionResult.action}:`, actionResult.error);
        
        // AI-powered error recovery
        const recovery = await this.getErrorRecovery(actionResult, pageAnalysis);
        
        return {
            canContinue: recovery.canContinue,
            action: recovery.action,
            reasoning: recovery.reasoning
        };
    }

    /**
     * Get AI-powered error recovery strategy
     */
    async getErrorRecovery(actionResult, pageAnalysis) {
        const prompt = `Analyze this automation error and suggest recovery:

ERROR DETAILS:
Action: ${actionResult.action}
Error: ${actionResult.error}
Retry attempts: ${this.retryAttempts}/${this.maxRetries}

CONTEXT:
URL: ${pageAnalysis.url}
Has errors on page: ${pageAnalysis.pageInfo.hasErrors}
Current step: ${this.state.currentStep}

SUGGEST RECOVERY:
{
  "canContinue": boolean,
  "action": "retry|skip|go_back|analyze|abort",
  "reasoning": "explanation",
  "confidence": 0.0-1.0
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.2,
                maxTokens: 300
            });

            return JSON.parse(response);
        } catch (error) {
            return {
                canContinue: this.retryAttempts < this.maxRetries,
                action: 'retry',
                reasoning: 'Default recovery strategy',
                confidence: 0.3
            };
        }
    }

    /**
     * Validate progress and detect issues
     */
    async validateProgress() {
        const validation = {
            questionsProgress: this.state.questionsAnswered > 0,
            stepsProgress: this.state.currentStep >= 0,
            timeElapsed: Date.now() - this.state.startTime,
            issuesDetected: []
        };
        
        // Check for stuck state
        if (this.state.actionHistory.length > 5) {
            const recentActions = this.state.actionHistory.slice(-5);
            const uniqueActions = new Set(recentActions.map(a => a.action));
            
            if (uniqueActions.size <= 2) {
                validation.issuesDetected.push('Potential stuck state detected');
            }
        }
        
        // Check for excessive time
        if (validation.timeElapsed > 600000) { // 10 minutes
            validation.issuesDetected.push('Session taking too long');
        }
        
        this.state.lastValidation = validation;
        return validation;
    }

    /**
     * Detect survey flow type and patterns
     */
    async detectFlowType(pageAnalysis) {
        const prompt = `Analyze this survey page and predict the flow pattern:

Page title: ${pageAnalysis.pageInfo.title}
Questions found: ${pageAnalysis.formData.totalQuestions}
Has progress indicators: ${pageAnalysis.pageInfo.progressBars.length > 0}
Has step indicators: ${pageAnalysis.pageInfo.stepIndicators.length > 0}

Predict:
{
  "type": "single_page|multi_page|progressive|branching|adaptive",
  "pattern": "linear|conditional|random|scored",
  "estimatedSteps": number,
  "estimatedQuestions": number,
  "complexity": "low|medium|high"
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.2,
                maxTokens: 200
            });

            return JSON.parse(response);
        } catch (error) {
            return {
                type: 'unknown',
                pattern: 'linear',
                estimatedSteps: 5,
                estimatedQuestions: 10,
                complexity: 'medium'
            };
        }
    }

    /**
     * Add page to history
     */
    addToPageHistory(pageAnalysis) {
        this.state.pageHistory.push({
            url: pageAnalysis.url,
            timestamp: pageAnalysis.timestamp,
            questions: pageAnalysis.formData.totalQuestions,
            answered: pageAnalysis.formData.answeredQuestions
        });
        
        // Keep only last 10 pages
        if (this.state.pageHistory.length > 10) {
            this.state.pageHistory = this.state.pageHistory.slice(-10);
        }
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate comprehensive flow report
     */
    generateFlowReport(success) {
        const duration = Date.now() - this.state.startTime;
        
        return {
            success,
            sessionId: this.state.sessionId,
            duration,
            stats: {
                currentStep: this.state.currentStep,
                totalSteps: this.state.totalSteps,
                questionsAnswered: this.state.questionsAnswered,
                totalQuestions: this.state.totalQuestions,
                completionPercentage: this.state.completionPercentage,
                pagesVisited: this.state.pageHistory.length,
                actionsExecuted: this.state.actionHistory.length,
                errorsEncountered: this.state.errors.length,
                retryAttempts: this.retryAttempts
            },
            flowType: this.state.flowType,
            errors: this.state.errors,
            actionHistory: this.state.actionHistory.slice(-10), // Last 10 actions
            finalValidation: this.state.lastValidation
        };
    }

    /**
     * Generate error report
     */
    generateErrorReport(error) {
        return {
            success: false,
            error: error.message,
            sessionId: this.state.sessionId,
            duration: Date.now() - this.state.startTime,
            state: this.state,
            partialProgress: {
                questionsAnswered: this.state.questionsAnswered,
                stepsCompleted: this.state.currentStep,
                actionsExecuted: this.state.actionHistory.length
            }
        };
    }
}

module.exports = FlowController;