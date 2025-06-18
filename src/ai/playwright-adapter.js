/**
 * Playwright-AI Adapter
 * Bridges AI decisions with Playwright actions, translating AI instructions into reliable browser automation
 * Enhanced with AdvancedWebUnderstanding for next-generation multimodal page analysis
 */

const AdvancedWebUnderstanding = require('./advanced-web-understanding');

class PlaywrightAdapter {
    constructor(page, aiService) {
        this.page = page;
        this.ai = aiService;
        this.actionHistory = [];
        this.elementCache = new Map();
        this.lastScreenshot = null;
        
        // Initialize advanced web understanding system
        this.webUnderstanding = new AdvancedWebUnderstanding(aiService, page);
        this.analysisCache = new Map();
    }

    /**
     * Main method: AI analyzes page and executes appropriate actions
     */
    async analyzeAndAct(context = {}) {
        console.log('🔍 AI analyzing page for next action...');
        
        // Step 1: Gather page data for AI
        const pageData = await this.gatherPageData();
        
        // Step 2: AI decides what to do
        const aiDecision = await this.getAIDecision(pageData, context);
        
        // Step 3: Execute AI decision with Playwright
        const result = await this.executeAIDecision(aiDecision, pageData);
        
        // Step 4: Record action for learning
        this.recordAction(aiDecision, result);
        
        return result;
    }

    /**
     * Gather comprehensive page data for AI analysis using AdvancedWebUnderstanding
     */
    async gatherPageData() {
        console.log('📊 Gathering advanced page data...');
        
        const url = this.page.url();
        const cacheKey = `${url}_${Date.now() - (Date.now() % 60000)}`; // Cache for 1 minute
        
        // Check if we have recent analysis
        if (this.analysisCache.has(cacheKey)) {
            console.log('🎯 Using cached page analysis');
            return this.analysisCache.get(cacheKey);
        }
        
        // Use AdvancedWebUnderstanding for intelligent page analysis
        const webAnalysis = await this.webUnderstanding.understandPage({
            forceStrategy: process.env.WEB_ANALYSIS_STRATEGY // Allow override for testing
        });
        
        // Get basic page metadata in parallel
        const [screenshot, title] = await Promise.all([
            this.page.screenshot({ quality: 60, fullPage: false }),
            this.page.title()
        ]);

        this.lastScreenshot = screenshot;

        const pageData = {
            // Enhanced understanding data
            webAnalysis,
            strategy: webAnalysis.strategy,
            confidence: webAnalysis.confidence,
            complexity: webAnalysis.complexity,
            
            // Traditional data for backward compatibility
            screenshot,
            url,
            title,
            visibleText: this.extractTextFromAnalysis(webAnalysis),
            formData: this.extractFormDataFromAnalysis(webAnalysis),
            buttonData: this.extractButtonDataFromAnalysis(webAnalysis),
            timestamp: Date.now(),
            
            // Cost tracking
            analysisCost: webAnalysis.cost || 0
        };
        
        // Cache the result
        this.analysisCache.set(cacheKey, pageData);
        
        // Clean old cache entries
        this.cleanAnalysisCache();
        
        return pageData;
    }

    /**
     * Extract text data from advanced web analysis
     */
    extractTextFromAnalysis(webAnalysis) {
        try {
            const data = webAnalysis.data;
            const textSources = [];
            
            // Extract from semantic HTML structure
            if (data.structure) {
                Object.values(data.structure).forEach(elements => {
                    if (Array.isArray(elements)) {
                        elements.forEach(el => {
                            if (el.text && el.text.length > 10) {
                                textSources.push(el.text);
                            }
                        });
                    }
                });
            }
            
            // Extract from questions
            if (data.questions) {
                data.questions.forEach(q => {
                    if (q.text) textSources.push(q.text);
                });
            }
            
            // Extract from accessibility landmarks
            if (data.landmarks) {
                data.landmarks.forEach(landmark => {
                    if (landmark.text) textSources.push(landmark.text);
                });
            }
            
            return textSources.join(' | ').substring(0, 2000);
        } catch (error) {
            console.warn('Failed to extract text from analysis:', error);
            return '';
        }
    }

    /**
     * Extract form data from advanced web analysis
     */
    extractFormDataFromAnalysis(webAnalysis) {
        try {
            const data = webAnalysis.data;
            const questions = [];
            
            // Process questions from various analysis strategies
            if (data.questions && Array.isArray(data.questions)) {
                data.questions.forEach((question, index) => {
                    questions.push({
                        index,
                        text: question.text || '',
                        type: question.type || 'unknown',
                        options: question.options || [],
                        required: question.required || false,
                        answered: question.answered || false,
                        confidence: question.confidence || webAnalysis.confidence,
                        selector: question.selector || `.question:nth-of-type(${index + 1})`,
                        boundingBox: question.position || {}
                    });
                });
            }
            
            // Process forms from semantic analysis
            if (data.forms && Array.isArray(data.forms)) {
                data.forms.forEach(form => {
                    if (form.fieldGroups) {
                        form.fieldGroups.forEach(group => {
                            if (group.fields) {
                                group.fields.forEach((field, fieldIndex) => {
                                    if (field.label || field.placeholder) {
                                        questions.push({
                                            index: questions.length,
                                            text: field.label || field.placeholder || 'Unlabeled field',
                                            type: this.mapFieldTypeToQuestionType(field.type),
                                            options: [],
                                            required: field.required || false,
                                            answered: !!field.value,
                                            confidence: webAnalysis.confidence,
                                            selector: field.id ? `#${field.id}` : `input[name="${field.name}"]`,
                                            boundingBox: {}
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
            
            return {
                totalForms: data.forms?.length || 0,
                questions: questions.slice(0, 15), // Limit for cost
                hasRequiredFields: questions.some(q => q.required),
                analysisStrategy: webAnalysis.strategy,
                confidence: webAnalysis.confidence
            };
        } catch (error) {
            console.warn('Failed to extract form data from analysis:', error);
            return {
                totalForms: 0,
                questions: [],
                hasRequiredFields: false,
                analysisStrategy: 'fallback',
                confidence: 0.1
            };
        }
    }

    /**
     * Extract button data from advanced web analysis
     */
    extractButtonDataFromAnalysis(webAnalysis) {
        try {
            const data = webAnalysis.data;
            const buttons = [];
            
            // Extract navigation buttons from analysis
            if (data.navigation && data.navigation.nextButton) {
                buttons.push({
                    selector: data.navigation.nextButton.selector || 'button[type="submit"]',
                    text: data.navigation.nextButton.text || 'Next',
                    type: 'submit',
                    disabled: data.navigation.nextButton.disabled || false,
                    classes: data.navigation.nextButton.classes || ''
                });
            }
            
            if (data.navigation && data.navigation.submitButton) {
                buttons.push({
                    selector: data.navigation.submitButton.selector || 'button[type="submit"]',
                    text: data.navigation.submitButton.text || 'Submit',
                    type: 'submit',
                    disabled: data.navigation.submitButton.disabled || false,
                    classes: data.navigation.submitButton.classes || ''
                });
            }
            
            // Extract from visual analysis if available
            if (data.navigation && data.layout) {
                // Add more buttons from visual AI analysis
                if (data.layout.hasProgressIndicator) {
                    buttons.push({
                        selector: '.progress-next, .btn-next, [data-next]',
                        text: 'Continue',
                        type: 'button',
                        disabled: false,
                        classes: 'progress-button'
                    });
                }
            }
            
            return buttons.slice(0, 10); // Limit for cost
        } catch (error) {
            console.warn('Failed to extract button data from analysis:', error);
            return [];
        }
    }

    /**
     * Map field types to question types
     */
    mapFieldTypeToQuestionType(fieldType) {
        const typeMap = {
            'radio': 'single_choice',
            'checkbox': 'multiple_choice',
            'select': 'select',
            'text': 'text',
            'email': 'text',
            'textarea': 'text',
            'number': 'text',
            'tel': 'text'
        };
        
        return typeMap[fieldType] || 'unknown';
    }

    /**
     * Clean old analysis cache entries
     */
    cleanAnalysisCache() {
        if (this.analysisCache.size > 50) {
            const entries = Array.from(this.analysisCache.entries());
            const now = Date.now();
            
            // Remove entries older than 5 minutes
            entries.forEach(([key, value]) => {
                if (now - value.timestamp > 300000) {
                    this.analysisCache.delete(key);
                }
            });
        }
    }

    /**
     * Extract visible text that matters for poll automation (fallback method)
     */
    async extractVisibleText() {
        return await this.page.evaluate(() => {
            const textElements = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text.length > 5) {
                    const element = node.parentElement;
                    const rect = element.getBoundingClientRect();
                    
                    // Only include visible text
                    if (rect.width > 0 && rect.height > 0 && 
                        window.getComputedStyle(element).visibility !== 'hidden') {
                        textElements.push(text);
                    }
                }
            }
            
            return textElements.slice(0, 100).join(' | '); // Limit size
        });
    }

    /**
     * Extract form data for AI to understand questions
     */
    async extractFormData() {
        return await this.page.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form, [role="form"]'));
            const questions = [];

            // Common question selectors
            const questionSelectors = [
                '.question', '[data-question]', '.survey-question',
                '.form-group', '.field', '.input-group', '.poll-question'
            ];

            questionSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach((element, index) => {
                    const text = element.textContent?.trim();
                    if (!text || text.length < 10) return;

                    // Find inputs within this question
                    const inputs = Array.from(element.querySelectorAll('input, select, textarea'));
                    if (inputs.length === 0) return;

                    // Determine question type
                    const hasRadio = inputs.some(i => i.type === 'radio');
                    const hasCheckbox = inputs.some(i => i.type === 'checkbox');
                    const hasText = inputs.some(i => ['text', 'email', 'textarea'].includes(i.type));
                    const hasSelect = inputs.some(i => i.tagName === 'SELECT');

                    let questionType = 'unknown';
                    if (hasRadio) questionType = 'single_choice';
                    else if (hasCheckbox) questionType = 'multiple_choice';
                    else if (hasSelect) questionType = 'select';
                    else if (hasText) questionType = 'text';

                    // Extract options for choice questions
                    const options = [];
                    if (hasRadio || hasCheckbox) {
                        inputs.forEach(input => {
                            if (input.type === 'radio' || input.type === 'checkbox') {
                                const label = input.closest('label')?.textContent?.trim() ||
                                           input.nextElementSibling?.textContent?.trim() ||
                                           input.previousElementSibling?.textContent?.trim() ||
                                           input.getAttribute('value');
                                if (label && label !== text) {
                                    options.push({
                                        value: input.value,
                                        text: label,
                                        name: input.name
                                    });
                                }
                            }
                        });
                    } else if (hasSelect) {
                        const select = inputs.find(i => i.tagName === 'SELECT');
                        Array.from(select.options).forEach(option => {
                            if (option.value && option.value !== '') {
                                options.push({
                                    value: option.value,
                                    text: option.textContent.trim()
                                });
                            }
                        });
                    }

                    questions.push({
                        index,
                        text: text.substring(0, 300),
                        type: questionType,
                        selector: `${selector}:nth-of-type(${index + 1})`,
                        options: options.slice(0, 10), // Limit options
                        required: inputs.some(i => i.required),
                        answered: this.isQuestionAnswered(inputs),
                        boundingBox: element.getBoundingClientRect()
                    });
                });
            });

            return {
                totalForms: forms.length,
                questions: questions.slice(0, 15), // Limit questions for cost
                hasRequiredFields: document.querySelectorAll('[required]').length > 0
            };

            function isQuestionAnswered(inputs) {
                return inputs.some(input => {
                    if (input.type === 'radio' || input.type === 'checkbox') {
                        return input.checked;
                    } else if (input.type === 'text' || input.type === 'email' || input.tagName === 'TEXTAREA') {
                        return input.value.trim() !== '';
                    } else if (input.tagName === 'SELECT') {
                        return input.value !== '' && input.value !== input.options[0]?.value;
                    }
                    return false;
                });
            }
        });
    }

    /**
     * Extract button/navigation data
     */
    async extractButtonData() {
        return await this.page.evaluate(() => {
            const buttons = [];
            const buttonSelectors = [
                'button[type="submit"]', 'input[type="submit"]',
                '.next', '.continue', '.submit', '.finish',
                'button:has-text("Next")', 'button:has-text("Continue")',
                'button:has-text("Submit")', 'button:has-text("Finish")'
            ];

            buttonSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach((button, index) => {
                        if (button.offsetParent !== null) { // visible
                            buttons.push({
                                selector: `${selector}:nth-of-type(${index + 1})`,
                                text: button.textContent?.trim() || button.value || '',
                                type: button.type || 'button',
                                disabled: button.disabled,
                                classes: button.className
                            });
                        }
                    });
                } catch (e) {
                    // Some selectors might fail in certain browsers
                }
            });

            return buttons.slice(0, 10); // Limit for cost
        });
    }

    /**
     * AI analyzes page data and decides next action
     */
    async getAIDecision(pageData, context) {
        const prompt = `Analyze this poll/survey page and decide the next action:

URL: ${pageData.url}
Title: ${pageData.title}

Current Context:
- Step: ${context.currentStep || 0}
- Questions answered: ${context.questionsAnswered || 0}
- Total questions found: ${pageData.formData.questions.length}

Visible Text: ${pageData.visibleText}

Questions Found:
${pageData.formData.questions.map((q, i) => 
    `${i + 1}. "${q.text}" (${q.type}, ${q.options.length} options, answered: ${q.answered})`
).join('\n')}

Available Buttons:
${pageData.buttonData.map(b => `- "${b.text}" (${b.type}, disabled: ${b.disabled})`).join('\n')}

RESPOND WITH JSON ONLY:
{
  "action": "find_questions|answer_questions|click_next|submit|wait|login|complete|error",
  "reasoning": "why this action",
  "confidence": 0.9,
  "urgentIssues": ["captcha", "error_message", "timeout"],
  "questionsToAnswer": [0, 1, 2],
  "nextButton": "button selector or null",
  "estimatedProgress": 0.7,
  "needsWait": false
}

Action Rules:
- find_questions: If no questions detected but looks like survey page
- answer_questions: If unanswered questions found
- click_next: If all required questions answered and next button available
- submit: If this appears to be final submission
- wait: If page is loading or changing
- login: If login required
- complete: If survey is finished
- error: If errors or blocks detected`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 400
            });

            const decision = JSON.parse(response);
            console.log(`🧠 AI Decision: ${decision.action} (confidence: ${decision.confidence})`);
            
            return decision;

        } catch (error) {
            console.error('AI decision failed:', error);
            return {
                action: 'error',
                reasoning: 'AI analysis failed',
                confidence: 0.1,
                urgentIssues: ['ai_error']
            };
        }
    }

    /**
     * Execute AI decision using Playwright
     */
    async executeAIDecision(decision, pageData) {
        console.log(`🤖 Executing: ${decision.action}`);

        try {
            switch (decision.action) {
                case 'find_questions':
                    return await this.handleFindQuestions(pageData);
                
                case 'answer_questions':
                    return await this.handleAnswerQuestions(decision, pageData);
                
                case 'click_next':
                    return await this.handleClickNext(decision, pageData);
                
                case 'submit':
                    return await this.handleSubmit(decision, pageData);
                
                case 'wait':
                    return await this.handleWait(decision);
                
                case 'login':
                    return await this.handleLogin(decision, pageData);
                
                case 'complete':
                    return { success: true, action: 'complete', isComplete: true };
                
                case 'error':
                    return { success: false, action: 'error', error: decision.reasoning };
                
                default:
                    return { success: false, action: 'unknown', error: `Unknown action: ${decision.action}` };
            }
        } catch (error) {
            return { 
                success: false, 
                action: decision.action, 
                error: error.message,
                needsRecovery: true
            };
        }
    }

    /**
     * Handle finding questions (when AI detection failed)
     */
    async handleFindQuestions(pageData) {
        // Force re-scan with different selectors
        const extendedFormData = await this.page.evaluate(() => {
            // Try more aggressive question detection
            const allElements = document.querySelectorAll('*');
            const potentialQuestions = [];

            Array.from(allElements).forEach((el, index) => {
                const text = el.textContent?.trim();
                if (text && text.includes('?') && text.length > 10 && text.length < 500) {
                    const nearbyInputs = el.querySelectorAll('input, select, textarea');
                    if (nearbyInputs.length > 0) {
                        potentialQuestions.push({
                            text: text.substring(0, 200),
                            selector: el.tagName + ':nth-of-type(' + (index + 1) + ')',
                            inputCount: nearbyInputs.length
                        });
                    }
                }
            });

            return potentialQuestions.slice(0, 10);
        });

        return {
            success: true,
            action: 'find_questions',
            questionsFound: extendedFormData.length,
            data: extendedFormData
        };
    }

    /**
     * Handle answering questions
     */
    async handleAnswerQuestions(decision, pageData) {
        const questionsToAnswer = decision.questionsToAnswer || [];
        let answeredCount = 0;

        for (const questionIndex of questionsToAnswer) {
            const question = pageData.formData.questions[questionIndex];
            if (!question || question.answered) continue;

            try {
                const answer = await this.generateAnswer(question);
                if (answer.action === 'answer') {
                    await this.inputAnswer(question, answer);
                    answeredCount++;
                    console.log(`✅ Answered: ${question.text.substring(0, 50)}...`);
                } else {
                    console.log(`⏭️ Skipped: ${question.text.substring(0, 50)}... (${answer.reason})`);
                }
            } catch (error) {
                console.error(`❌ Failed to answer question ${questionIndex}:`, error);
            }
        }

        return {
            success: true,
            action: 'answer_questions',
            questionsAnswered: answeredCount
        };
    }

    /**
     * Generate answer for specific question using AI
     */
    async generateAnswer(question) {
        const prompt = `Generate a realistic answer for this survey question:

Question: "${question.text}"
Type: ${question.type}
Required: ${question.required}

${question.options.length > 0 ? `Options:\n${question.options.map(o => `- ${o.text} (value: ${o.value})`).join('\n')}` : 'No options (text input)'}

Respond with JSON:
{
  "action": "answer|skip",
  "value": "exact option value or text response",
  "reasoning": "why this answer",
  "confidence": 0.8
}

Rules:
- For multiple choice: return exact option value
- For text: 1-2 realistic sentences
- Skip trick questions or inappropriate questions
- Use consistent persona: 28-year-old professional`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.7,
                maxTokens: 200
            });

            return JSON.parse(response);
        } catch (error) {
            console.error('Answer generation failed:', error);
            return { action: 'skip', reason: 'ai_error' };
        }
    }

    /**
     * Input answer using Playwright (reliable part)
     */
    async inputAnswer(question, answer) {
        const element = await this.page.locator(question.selector).first();
        
        if (question.type === 'single_choice') {
            // Radio button
            const radio = element.locator(`input[type="radio"][value="${answer.value}"]`);
            await radio.click();
        } else if (question.type === 'multiple_choice') {
            // Checkbox
            const checkbox = element.locator(`input[type="checkbox"][value="${answer.value}"]`);
            await checkbox.click();
        } else if (question.type === 'select') {
            // Dropdown
            const select = element.locator('select');
            await select.selectOption(answer.value);
        } else if (question.type === 'text') {
            // Text input
            const textInput = element.locator('input[type="text"], input[type="email"], textarea');
            await textInput.fill(answer.value);
        }

        // Human-like delay
        await this.page.waitForTimeout(Math.random() * 1000 + 500);
    }

    /**
     * Handle clicking next button
     */
    async handleClickNext(decision, pageData) {
        let buttonSelector = decision.nextButton;
        
        // If AI didn't specify, find the best button
        if (!buttonSelector && pageData.buttonData.length > 0) {
            const enabledButtons = pageData.buttonData.filter(b => !b.disabled);
            if (enabledButtons.length > 0) {
                buttonSelector = enabledButtons[0].selector;
            }
        }

        if (!buttonSelector) {
            return { success: false, error: 'No next button found' };
        }

        await this.page.click(buttonSelector);
        
        // Wait for navigation or changes
        await Promise.race([
            this.page.waitForLoadState('networkidle'),
            this.page.waitForTimeout(5000)
        ]);

        return {
            success: true,
            action: 'click_next',
            buttonUsed: buttonSelector
        };
    }

    /**
     * Handle form submission
     */
    async handleSubmit(decision, pageData) {
        const submitButtons = pageData.buttonData.filter(b => 
            b.type === 'submit' || 
            b.text.toLowerCase().includes('submit') ||
            b.text.toLowerCase().includes('finish')
        );

        if (submitButtons.length === 0) {
            return { success: false, error: 'No submit button found' };
        }

        await this.page.click(submitButtons[0].selector);
        
        // Wait longer for submission processing
        await Promise.race([
            this.page.waitForLoadState('networkidle'),
            this.page.waitForTimeout(10000)
        ]);

        return {
            success: true,
            action: 'submit',
            isComplete: true
        };
    }

    /**
     * Handle waiting
     */
    async handleWait(decision) {
        const waitTime = decision.waitTime || 2000;
        await this.page.waitForTimeout(waitTime);
        
        return {
            success: true,
            action: 'wait',
            waitTime
        };
    }

    /**
     * Handle login requirement
     */
    async handleLogin(decision, pageData) {
        return {
            success: false,
            action: 'login',
            error: 'Login required - manual intervention needed',
            requiresCredentials: true
        };
    }

    /**
     * Record action for learning
     */
    recordAction(decision, result) {
        this.actionHistory.push({
            timestamp: Date.now(),
            decision,
            result,
            url: this.page.url()
        });

        // Keep only last 50 actions
        if (this.actionHistory.length > 50) {
            this.actionHistory = this.actionHistory.slice(-50);
        }
    }

    /**
     * Get action history for debugging
     */
    getActionHistory() {
        return this.actionHistory;
    }

    /**
     * Get last screenshot for error reporting
     */
    getLastScreenshot() {
        return this.lastScreenshot;
    }

    /**
     * Clear cache and history
     */
    reset() {
        this.actionHistory = [];
        this.elementCache.clear();
        this.lastScreenshot = null;
    }
}

module.exports = PlaywrightAdapter;