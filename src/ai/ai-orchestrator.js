/**
 * AI-First Poll Automation Orchestrator
 * Uses cheap ChatGPT models to handle unreliable tasks while keeping Playwright for reliable automation
 */

const fs = require('fs').promises;
const path = require('path');

class AIOrchestrator {
    constructor(aiService, page) {
        this.ai = aiService;
        this.page = page;
        this.stepHistory = [];
        this.questionsFound = [];
        this.currentStep = 0;
        this.sessionContext = {
            url: '',
            siteType: 'unknown',
            questionsAnswered: 0,
            totalQuestions: 0,
            isComplete: false
        };
    }

    /**
     * Main automation flow - AI decides what to do at each step
     */
    async automatepoll(url, options = {}) {
        console.log(`🤖 Starting AI-driven poll automation for: ${url}`);
        
        try {
            // Step 1: Navigate (Playwright handles this reliably)
            await this.page.goto(url, { waitUntil: 'networkidle' });
            this.sessionContext.url = url;
            
            // Step 2: AI analyzes initial page
            const initialAnalysis = await this.analyzeCurrentPage();
            console.log(`📊 Initial analysis: ${initialAnalysis.pageType} - ${initialAnalysis.nextAction}`);
            
            // Step 3: Main automation loop - AI decides each step
            while (!this.sessionContext.isComplete && this.currentStep < 50) {
                const stepResult = await this.executeNextStep();
                
                if (!stepResult.success) {
                    console.log(`❌ Step ${this.currentStep} failed: ${stepResult.error}`);
                    
                    // AI decides how to handle failure
                    const recovery = await this.handleFailure(stepResult);
                    if (!recovery.canContinue) {
                        throw new Error(`Automation failed: ${recovery.reason}`);
                    }
                }
                
                this.currentStep++;
                
                // Safety check - if AI says we're done, verify it
                if (stepResult.isComplete) {
                    const verification = await this.verifyCompletion();
                    if (verification.isComplete) {
                        this.sessionContext.isComplete = true;
                        console.log(`✅ Poll completed successfully!`);
                    }
                }
            }
            
            return {
                success: true,
                questionsAnswered: this.sessionContext.questionsAnswered,
                steps: this.stepHistory,
                finalUrl: this.page.url()
            };
            
        } catch (error) {
            console.error('AI orchestration failed:', error);
            return {
                success: false,
                error: error.message,
                steps: this.stepHistory,
                context: this.sessionContext
            };
        }
    }

    /**
     * AI analyzes current page state and decides what to do
     */
    async analyzeCurrentPage() {
        const screenshot = await this.page.screenshot({ quality: 60 });
        const html = await this.page.content();
        const url = this.page.url();
        
        // Extract visible text (cheaper than full HTML analysis)
        const visibleText = await this.page.evaluate(() => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const texts = [];
            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text.length > 3 && !text.match(/^[\s\n\r]*$/)) {
                    const rect = node.parentElement?.getBoundingClientRect();
                    if (rect && rect.width > 0 && rect.height > 0) {
                        texts.push(text);
                    }
                }
            }
            return texts.slice(0, 50).join(' | '); // Limit text for cost
        });

        const prompt = `Analyze this poll/survey page and tell me what to do next:

URL: ${url}
Step: ${this.currentStep}
Questions answered so far: ${this.sessionContext.questionsAnswered}

Visible text: ${visibleText.substring(0, 1500)}

Respond with JSON only:
{
  "pageType": "login|survey_start|question_page|completion|error|redirect",
  "questionsOnPage": number,
  "nextAction": "login|find_questions|answer_questions|click_next|submit|wait|complete",
  "requiresAction": boolean,
  "confidence": 0.9,
  "reasoning": "brief explanation",
  "urgentIssues": ["issue1", "issue2"] // captcha, error messages, timeouts
}

Focus on identifying:
1. Is this a login page?
2. Are there survey questions visible?
3. Is there a next/submit button?
4. Any error messages or blocks?
5. Is the survey complete?`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model: 'gpt-3.5-turbo', // Cheap model
                temperature: 0.1,
                maxTokens: 300
            });

            const analysis = JSON.parse(response);
            this.recordStep('page_analysis', analysis);
            return analysis;

        } catch (error) {
            console.error('Page analysis failed:', error);
            return {
                pageType: 'unknown',
                nextAction: 'wait',
                requiresAction: false,
                confidence: 0.1,
                reasoning: 'AI analysis failed'
            };
        }
    }

    /**
     * Execute the next step based on AI decision
     */
    async executeNextStep() {
        const analysis = await this.analyzeCurrentPage();
        
        try {
            switch (analysis.nextAction) {
                case 'login':
                    return await this.handleLogin(analysis);
                
                case 'find_questions':
                    return await this.findQuestions(analysis);
                
                case 'answer_questions':
                    return await this.answerQuestions(analysis);
                
                case 'click_next':
                    return await this.clickNext(analysis);
                
                case 'submit':
                    return await this.submitPoll(analysis);
                
                case 'wait':
                    return await this.waitForChanges(analysis);
                
                case 'complete':
                    return { success: true, isComplete: true, action: 'complete' };
                
                default:
                    return { success: false, error: `Unknown action: ${analysis.nextAction}` };
            }
        } catch (error) {
            return { success: false, error: error.message, action: analysis.nextAction };
        }
    }

    /**
     * AI finds questions on current page
     */
    async findQuestions(analysis) {
        console.log(`🔍 AI looking for questions...`);
        
        // Get all form elements and text content
        const formData = await this.page.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form, [role="form"]'));
            const questions = [];
            
            // Look for question patterns
            const questionSelectors = [
                '.question', '[data-question]', '.survey-question',
                '.form-group', '.field', '.input-group'
            ];
            
            questionSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach((el, index) => {
                    const text = el.textContent?.trim();
                    const inputs = el.querySelectorAll('input, select, textarea');
                    
                    if (text && text.length > 10 && inputs.length > 0) {
                        questions.push({
                            index,
                            text: text.substring(0, 200),
                            selector,
                            inputCount: inputs.length,
                            inputTypes: Array.from(inputs).map(i => i.type || i.tagName),
                            required: Array.from(inputs).some(i => i.required),
                            boundingBox: el.getBoundingClientRect()
                        });
                    }
                });
            });
            
            return {
                questions: questions.slice(0, 10), // Limit for cost
                totalForms: forms.length,
                hasSubmitButton: !!document.querySelector('button[type="submit"], .submit, .next, .continue')
            };
        });

        // AI analyzes and filters real questions
        const prompt = `Identify real survey questions from this page data:

Questions found: ${JSON.stringify(formData.questions, null, 2)}

Return JSON with actual survey questions:
{
  "validQuestions": [
    {
      "index": 0,
      "text": "question text",
      "type": "single_choice|multiple_choice|text|rating|yes_no",
      "required": boolean,
      "selector": "css selector"
    }
  ],
  "totalFound": number,
  "confidence": 0.9
}

Filter out:
- Navigation elements
- Site functionality questions
- Advertisements
- Header/footer text
- Invalid or incomplete questions`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model: 'gpt-3.5-turbo',
                temperature: 0.1,
                maxTokens: 800
            });

            const questionAnalysis = JSON.parse(response);
            this.questionsFound = questionAnalysis.validQuestions || [];
            this.sessionContext.totalQuestions = questionAnalysis.totalFound;
            
            console.log(`📝 Found ${this.questionsFound.length} valid questions`);
            
            return {
                success: true,
                action: 'find_questions',
                questionsFound: this.questionsFound.length,
                data: questionAnalysis
            };

        } catch (error) {
            console.error('Question finding failed:', error);
            return { success: false, error: error.message, action: 'find_questions' };
        }
    }

    /**
     * AI answers questions found on page
     */
    async answerQuestions(analysis) {
        if (this.questionsFound.length === 0) {
            await this.findQuestions(analysis);
        }

        console.log(`💭 AI answering ${this.questionsFound.length} questions...`);

        for (const question of this.questionsFound) {
            try {
                // AI generates appropriate answer
                const answer = await this.generateAnswer(question);
                
                if (answer.action === 'answer') {
                    // Playwright handles the reliable part - clicking/typing
                    await this.inputAnswer(question, answer);
                    this.sessionContext.questionsAnswered++;
                    console.log(`✏️ Answered: ${question.text.substring(0, 50)}...`);
                } else {
                    console.log(`⏭️ Skipped: ${question.text.substring(0, 50)}... (${answer.reason})`);
                }

            } catch (error) {
                console.error(`Failed to answer question: ${error.message}`);
                // Continue with other questions
            }
        }

        return {
            success: true,
            action: 'answer_questions',
            questionsAnswered: this.sessionContext.questionsAnswered
        };
    }

    /**
     * AI generates answer for a specific question
     */
    async generateAnswer(question) {
        // Get current options for the question
        const questionOptions = await this.page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;

            const options = [];
            
            // Radio buttons
            element.querySelectorAll('input[type="radio"]').forEach(radio => {
                const label = radio.closest('label')?.textContent?.trim() ||
                            radio.nextElementSibling?.textContent?.trim() ||
                            radio.getAttribute('value');
                if (label) options.push({ type: 'radio', value: radio.value, text: label });
            });
            
            // Checkboxes
            element.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                const label = checkbox.closest('label')?.textContent?.trim() ||
                            checkbox.nextElementSibling?.textContent?.trim() ||
                            checkbox.getAttribute('value');
                if (label) options.push({ type: 'checkbox', value: checkbox.value, text: label });
            });
            
            // Select options
            element.querySelectorAll('select option').forEach(option => {
                if (option.value && option.value !== '') {
                    options.push({ type: 'select', value: option.value, text: option.textContent?.trim() });
                }
            });
            
            // Text inputs
            const textInputs = element.querySelectorAll('input[type="text"], input[type="email"], textarea');
            if (textInputs.length > 0) {
                options.push({ type: 'text', placeholder: textInputs[0].placeholder || '' });
            }

            return options;
        }, question.selector);

        const prompt = `Generate a realistic answer for this survey question:

Question: "${question.text}"
Type: ${question.type}
Required: ${question.required}
Options: ${questionOptions ? JSON.stringify(questionOptions.slice(0, 10)) : 'No options found'}

Respond with JSON only:
{
  "action": "answer|skip",
  "value": "selected value or text response",
  "reasoning": "why this answer",
  "confidence": 0.8
}

Rules:
- Skip obvious trick questions
- Give realistic, human-like answers
- For multiple choice: return exact option value
- For text: 1-2 realistic sentences
- Be consistent with a 28-year-old professional persona`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model: 'gpt-3.5-turbo',
                temperature: 0.7, // Higher temperature for varied responses
                maxTokens: 200
            });

            return JSON.parse(response);

        } catch (error) {
            console.error('Answer generation failed:', error);
            return { action: 'skip', reason: 'ai_error' };
        }
    }

    /**
     * Playwright handles reliable input actions
     */
    async inputAnswer(question, answer) {
        const element = await this.page.locator(question.selector).first();
        
        if (!element) {
            throw new Error(`Element not found: ${question.selector}`);
        }

        // Determine input method based on question type
        if (answer.value) {
            // Radio button
            const radio = element.locator(`input[type="radio"][value="${answer.value}"]`);
            if (await radio.count() > 0) {
                await radio.click();
                await this.page.waitForTimeout(500); // Human-like delay
                return;
            }

            // Checkbox
            const checkbox = element.locator(`input[type="checkbox"][value="${answer.value}"]`);
            if (await checkbox.count() > 0) {
                await checkbox.click();
                await this.page.waitForTimeout(500);
                return;
            }

            // Select dropdown
            const select = element.locator('select');
            if (await select.count() > 0) {
                await select.selectOption(answer.value);
                await this.page.waitForTimeout(500);
                return;
            }

            // Text input
            const textInput = element.locator('input[type="text"], input[type="email"], textarea');
            if (await textInput.count() > 0) {
                await textInput.fill(answer.value);
                await this.page.waitForTimeout(800); // Longer delay for typing
                return;
            }
        }

        throw new Error(`Could not input answer for question type: ${question.type}`);
    }

    /**
     * AI decides if ready to proceed and finds next button
     */
    async clickNext(analysis) {
        console.log(`🔄 AI looking for next button...`);

        // AI analyzes if all required questions are answered
        const readinessCheck = await this.checkReadinessToAdvance();
        
        if (!readinessCheck.ready) {
            return { 
                success: false, 
                error: `Not ready to advance: ${readinessCheck.reason}`,
                needsAction: readinessCheck.action
            };
        }

        // Find next/continue/submit button
        const nextButton = await this.page.evaluate(() => {
            const buttons = [
                'button[type="submit"]',
                '.next', '.continue', '.submit', '.finish',
                'button:has-text("Next")', 'button:has-text("Continue")',
                'button:has-text("Submit")', 'button:has-text("Finish")',
                'input[type="submit"]'
            ];

            for (const selector of buttons) {
                const btn = document.querySelector(selector);
                if (btn && btn.offsetParent !== null) { // visible
                    return {
                        selector,
                        text: btn.textContent?.trim() || btn.value,
                        disabled: btn.disabled
                    };
                }
            }
            return null;
        });

        if (!nextButton) {
            return { success: false, error: 'No next button found' };
        }

        if (nextButton.disabled) {
            return { success: false, error: 'Next button is disabled' };
        }

        // Click the button (Playwright handles this reliably)
        await this.page.click(nextButton.selector);
        
        // Wait for navigation/changes
        await Promise.race([
            this.page.waitForLoadState('networkidle'),
            this.page.waitForTimeout(5000)
        ]);

        return { 
            success: true, 
            action: 'click_next',
            buttonText: nextButton.text 
        };
    }

    /**
     * AI checks if all required questions are answered
     */
    async checkReadinessToAdvance() {
        const formState = await this.page.evaluate(() => {
            const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
            const unanswered = [];
            
            requiredInputs.forEach((input, index) => {
                let hasValue = false;
                
                if (input.type === 'radio' || input.type === 'checkbox') {
                    const name = input.name;
                    hasValue = document.querySelector(`input[name="${name}"]:checked`) !== null;
                } else {
                    hasValue = input.value.trim() !== '';
                }
                
                if (!hasValue) {
                    unanswered.push({
                        index,
                        type: input.type,
                        name: input.name,
                        question: input.closest('.question, .form-group')?.textContent?.trim()?.substring(0, 100)
                    });
                }
            });
            
            return {
                totalRequired: requiredInputs.length,
                unanswered: unanswered.slice(0, 5) // Limit for cost
            };
        });

        if (formState.unanswered.length > 0) {
            return {
                ready: false,
                reason: `${formState.unanswered.length} required questions unanswered`,
                action: 'answer_missing_questions',
                missingQuestions: formState.unanswered
            };
        }

        return { ready: true };
    }

    /**
     * Handle login if required
     */
    async handleLogin(analysis) {
        console.log(`🔐 Handling login...`);
        
        // This would integrate with existing credential system
        // For now, return that login is needed
        return { 
            success: false, 
            error: 'Login required - integrate with credential system',
            requiresManualIntervention: true
        };
    }

    /**
     * Submit final poll
     */
    async submitPoll(analysis) {
        console.log(`📋 Submitting poll...`);
        
        const readinessCheck = await this.checkReadinessToAdvance();
        if (!readinessCheck.ready) {
            return { success: false, error: readinessCheck.reason };
        }

        // Find and click submit button
        const submitted = await this.clickNext(analysis);
        
        if (submitted.success) {
            // Wait for completion page
            await this.page.waitForTimeout(3000);
            
            return {
                success: true,
                action: 'submit',
                isComplete: true
            };
        }

        return submitted;
    }

    /**
     * Wait for page changes
     */
    async waitForChanges(analysis) {
        console.log(`⏳ Waiting for page changes...`);
        
        await this.page.waitForTimeout(2000);
        
        return { success: true, action: 'wait' };
    }

    /**
     * Verify poll completion
     */
    async verifyCompletion() {
        const currentUrl = this.page.url();
        const pageContent = await this.page.textContent('body');
        
        const completionIndicators = [
            'thank you', 'completed', 'finished', 'submitted',
            'success', 'done', 'survey complete'
        ];
        
        const hasCompletionText = completionIndicators.some(indicator => 
            pageContent.toLowerCase().includes(indicator)
        );
        
        const isCompletionUrl = currentUrl.includes('complete') || 
                               currentUrl.includes('thank') ||
                               currentUrl.includes('success');

        return {
            isComplete: hasCompletionText || isCompletionUrl,
            indicators: hasCompletionText ? 'completion text found' : 'url suggests completion',
            finalUrl: currentUrl
        };
    }

    /**
     * AI handles failures and decides recovery strategy
     */
    async handleFailure(stepResult) {
        const prompt = `A poll automation step failed. Analyze and suggest recovery:

Failed step: ${stepResult.action}
Error: ${stepResult.error}
Current step: ${this.currentStep}
Questions answered: ${this.sessionContext.questionsAnswered}
Page URL: ${this.page.url()}

Recent steps: ${JSON.stringify(this.stepHistory.slice(-3))}

Respond with JSON:
{
  "canContinue": boolean,
  "recovery": "retry|skip_step|restart|manual_intervention",
  "reason": "explanation",
  "adjustments": ["adjustment1", "adjustment2"]
}`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model: 'gpt-3.5-turbo',
                temperature: 0.1,
                maxTokens: 300
            });

            return JSON.parse(response);

        } catch (error) {
            return {
                canContinue: false,
                recovery: 'manual_intervention',
                reason: 'AI failure analysis failed',
                adjustments: []
            };
        }
    }

    /**
     * Record step for learning
     */
    recordStep(action, data) {
        this.stepHistory.push({
            step: this.currentStep,
            action,
            timestamp: Date.now(),
            url: this.page.url(),
            data
        });
    }

    /**
     * Get session summary
     */
    getSessionSummary() {
        return {
            ...this.sessionContext,
            steps: this.stepHistory.length,
            questionsFound: this.questionsFound.length,
            currentStep: this.currentStep,
            duration: Date.now() - (this.stepHistory[0]?.timestamp || Date.now())
        };
    }
}

module.exports = AIOrchestrator;