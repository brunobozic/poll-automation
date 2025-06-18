/**
 * Poll Page Object Model
 * Specialized page object for handling poll/survey pages with advanced interactions
 */

const BasePage = require('./base-page');
const CaptchaHandler = require('./captcha-handler');
const IframeHandler = require('./iframe-handler');
const SPAHandler = require('./spa-handler');

class PollPage extends BasePage {
    constructor(page, context) {
        super(page, context);
        
        // Initialize specialized handlers
        this.captchaHandler = new CaptchaHandler(page);
        this.iframeHandler = new IframeHandler(page);
        this.spaHandler = new SPAHandler(page);
        
        // Poll-specific properties
        this.currentQuestionIndex = 0;
        this.totalQuestions = 0;
        this.questionTypes = [];
        this.pollData = null;
        this.responseData = {};
        
        // Common poll selectors
        this.selectors = {
            questions: {
                container: '.question, .survey-question, .poll-question, [class*="question"]',
                title: '.question-title, .question-text, h1, h2, h3, .title',
                options: 'input[type="radio"], input[type="checkbox"]',
                textInput: 'textarea, input[type="text"]',
                select: 'select',
                rating: '.rating, [class*="rating"], .scale, [class*="scale"]'
            },
            navigation: {
                next: 'button:has-text("Next"), input[value*="Next"], .next, .btn-next',
                previous: 'button:has-text("Previous"), button:has-text("Back"), .previous, .btn-previous',
                submit: 'button[type="submit"], input[type="submit"], button:has-text("Submit"), .submit'
            },
            progress: {
                bar: '.progress-bar, .progress, [class*="progress"]',
                text: '.progress-text, .step-indicator, [class*="step"]',
                current: '.current-question, .question-number',
                total: '.total-questions, .question-count'
            },
            validation: {
                error: '.error, .validation-error, .field-error, [class*="error"]',
                required: '.required, [required], .mandatory'
            }
        };
    }

    /**
     * Initialize poll page and gather information
     */
    async initializePoll(options = {}) {
        const defaultOptions = {
            detectFramework: true,
            handleCaptcha: true,
            waitForReady: true,
            extractMetadata: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log('Initializing poll page...');

            // Detect SPA framework if requested
            if (config.detectFramework) {
                await this.spaHandler.detectFramework();
                await this.spaHandler.waitForSPAReady();
            }

            // Wait for page to be ready
            if (config.waitForReady) {
                await this.waitForSPAStabilization();
            }

            // Handle any CAPTCHAs
            if (config.handleCaptcha) {
                const captchaResult = await this.captchaHandler.detectAndHandleCaptcha({
                    skipComplexCaptcha: true
                });
                
                if (!captchaResult.success && captchaResult.type !== 'none') {
                    this.log(`CAPTCHA handling result: ${JSON.stringify(captchaResult)}`);
                }
            }

            // Extract poll metadata
            if (config.extractMetadata) {
                await this.extractPollMetadata();
            }

            // Detect iframes that might contain poll content
            const iframes = await this.iframeHandler.detectIframes();
            const pollIframes = iframes.filter(iframe => 
                ['survey', 'poll', 'question', 'form'].includes(iframe.type)
            );

            if (pollIframes.length > 0) {
                this.log(`Found ${pollIframes.length} poll-related iframes`);
                this.pollIframes = pollIframes;
            }

            this.log('Poll page initialization completed');
            return true;

        } catch (error) {
            this.log(`Poll initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract poll metadata and structure
     */
    async extractPollMetadata() {
        try {
            this.log('Extracting poll metadata...');

            const metadata = await this.page.evaluate((selectors) => {
                const getElementText = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : null;
                };

                const getAllElementsText = (selector) => {
                    const elements = document.querySelectorAll(selector);
                    return Array.from(elements).map(el => el.textContent.trim());
                };

                return {
                    title: getElementText('h1') || getElementText('.poll-title') || getElementText('.survey-title'),
                    description: getElementText('.description') || getElementText('.poll-description'),
                    progress: {
                        current: getElementText(selectors.progress.current),
                        total: getElementText(selectors.progress.total),
                        bar: document.querySelector(selectors.progress.bar) !== null
                    },
                    questions: {
                        containers: getAllElementsText(selectors.questions.container).length,
                        visible: document.querySelectorAll(selectors.questions.container + ':not([style*="display: none"])').length
                    },
                    navigation: {
                        hasNext: document.querySelector(selectors.navigation.next) !== null,
                        hasPrevious: document.querySelector(selectors.navigation.previous) !== null,
                        hasSubmit: document.querySelector(selectors.navigation.submit) !== null
                    },
                    url: window.location.href,
                    timestamp: Date.now()
                };
            }, this.selectors);

            this.pollData = metadata;
            this.totalQuestions = metadata.questions.containers;
            
            this.log(`Poll metadata extracted: ${JSON.stringify(metadata, null, 2)}`);
            return metadata;

        } catch (error) {
            this.log(`Failed to extract poll metadata: ${error.message}`);
            return null;
        }
    }

    /**
     * Get all questions on the current page/step
     */
    async extractQuestions(options = {}) {
        const defaultOptions = {
            includeHidden: false,
            detectTrickQuestions: true,
            extractOptions: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log('Extracting questions from page...');

            const questions = await this.page.evaluate((selectors, config) => {
                const questions = [];
                const questionContainers = document.querySelectorAll(selectors.questions.container);

                questionContainers.forEach((container, index) => {
                    // Skip hidden questions unless requested
                    if (!config.includeHidden && container.offsetParent === null) {
                        return;
                    }

                    const question = {
                        index: index,
                        container: container.outerHTML,
                        text: '',
                        type: 'unknown',
                        required: false,
                        options: [],
                        element: container
                    };

                    // Extract question text
                    const titleElement = container.querySelector(selectors.questions.title);
                    if (titleElement) {
                        question.text = titleElement.textContent.trim();
                    }

                    // Determine question type and extract options
                    const radioInputs = container.querySelectorAll('input[type="radio"]');
                    const checkboxInputs = container.querySelectorAll('input[type="checkbox"]');
                    const textInputs = container.querySelectorAll('input[type="text"], textarea');
                    const selects = container.querySelectorAll('select');
                    const ratings = container.querySelectorAll('.rating input, [class*="rating"] input');

                    if (radioInputs.length > 0) {
                        question.type = radioInputs.length === 2 && 
                                      Array.from(radioInputs).some(input => 
                                          input.value.toLowerCase().includes('yes') || 
                                          input.value.toLowerCase().includes('no')
                                      ) ? 'yes-no' : 'single-choice';
                        
                        if (config.extractOptions) {
                            question.options = Array.from(radioInputs).map(input => ({
                                value: input.value,
                                label: input.nextElementSibling?.textContent?.trim() || 
                                       input.parentElement?.textContent?.trim() || 
                                       input.value,
                                element: input
                            }));
                        }
                    } else if (checkboxInputs.length > 0) {
                        question.type = 'multiple-choice';
                        
                        if (config.extractOptions) {
                            question.options = Array.from(checkboxInputs).map(input => ({
                                value: input.value,
                                label: input.nextElementSibling?.textContent?.trim() || 
                                       input.parentElement?.textContent?.trim() || 
                                       input.value,
                                element: input
                            }));
                        }
                    } else if (ratings.length > 0) {
                        question.type = 'rating';
                        
                        if (config.extractOptions) {
                            question.options = Array.from(ratings).map(input => ({
                                value: input.value,
                                label: input.value,
                                element: input
                            }));
                        }
                    } else if (selects.length > 0) {
                        question.type = 'select';
                        
                        if (config.extractOptions) {
                            const select = selects[0];
                            question.options = Array.from(select.options).map(option => ({
                                value: option.value,
                                label: option.textContent.trim(),
                                element: option
                            }));
                        }
                    } else if (textInputs.length > 0) {
                        question.type = 'text';
                        question.inputElement = textInputs[0];
                    }

                    // Check if required
                    question.required = container.querySelector('[required]') !== null ||
                                      container.querySelector('.required') !== null ||
                                      container.textContent.includes('*');

                    questions.push(question);
                });

                return questions;
            }, this.selectors, config);

            // Detect trick questions if requested
            if (config.detectTrickQuestions) {
                const TrickQuestionDetector = require('../detection/trick-questions');
                const detector = new TrickQuestionDetector();
                
                questions.forEach(question => {
                    const analysis = detector.detectTrickQuestion(question.text, question.options);
                    question.isTrick = analysis.isTrick;
                    question.trickFlags = analysis.flags;
                    question.suspicionLevel = analysis.suspicionLevel;
                });
            }

            this.questionTypes = questions.map(q => q.type);
            this.log(`Extracted ${questions.length} questions: ${this.questionTypes.join(', ')}`);
            
            return questions;

        } catch (error) {
            this.log(`Failed to extract questions: ${error.message}`);
            throw error;
        }
    }

    /**
     * Answer a specific question
     */
    async answerQuestion(questionIndex, answer, options = {}) {
        const defaultOptions = {
            humanLike: true,
            validate: true,
            scrollIntoView: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Answering question ${questionIndex}: ${answer}`);

            const questions = await this.extractQuestions();
            if (questionIndex >= questions.length) {
                throw new Error(`Question index ${questionIndex} out of range`);
            }

            const question = questions[questionIndex];
            const questionElement = await this.page.$(this.selectors.questions.container);
            const containers = await this.page.$$(this.selectors.questions.container);
            const targetContainer = containers[questionIndex];

            if (!targetContainer) {
                throw new Error(`Question container ${questionIndex} not found`);
            }

            // Scroll question into view
            if (config.scrollIntoView) {
                await targetContainer.scrollIntoViewIfNeeded();
                await this.humanSim.simulateActionDelay('scroll');
            }

            // Answer based on question type
            switch (question.type) {
                case 'single-choice':
                case 'yes-no':
                    await this.answerSingleChoice(targetContainer, answer, config);
                    break;
                    
                case 'multiple-choice':
                    await this.answerMultipleChoice(targetContainer, answer, config);
                    break;
                    
                case 'rating':
                    await this.answerRating(targetContainer, answer, config);
                    break;
                    
                case 'text':
                    await this.answerText(targetContainer, answer, config);
                    break;
                    
                case 'select':
                    await this.answerSelect(targetContainer, answer, config);
                    break;
                    
                default:
                    throw new Error(`Unsupported question type: ${question.type}`);
            }

            // Store response
            this.responseData[questionIndex] = {
                question: question.text,
                answer: answer,
                type: question.type,
                timestamp: Date.now()
            };

            // Validate if requested
            if (config.validate) {
                await this.validateQuestionAnswer(targetContainer, question.type);
            }

            this.log(`Question ${questionIndex} answered successfully`);
            return true;

        } catch (error) {
            this.log(`Failed to answer question ${questionIndex}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Answer single choice question (radio buttons)
     */
    async answerSingleChoice(container, answer, config) {
        const radioInputs = await container.$$('input[type="radio"]');
        
        for (const radio of radioInputs) {
            const value = await radio.getAttribute('value');
            const label = await this.getInputLabel(radio);
            
            if (value === answer || label.toLowerCase().includes(answer.toLowerCase())) {
                if (config.humanLike) {
                    await this.humanSim.simulateMouseMovement(this.page, radio);
                }
                
                await radio.check();
                
                if (config.humanLike) {
                    await this.humanSim.simulateActionDelay('click');
                }
                
                return;
            }
        }
        
        throw new Error(`Radio option not found: ${answer}`);
    }

    /**
     * Answer multiple choice question (checkboxes)
     */
    async answerMultipleChoice(container, answers, config) {
        const answerArray = Array.isArray(answers) ? answers : [answers];
        const checkboxInputs = await container.$$('input[type="checkbox"]');
        
        for (const answer of answerArray) {
            let found = false;
            
            for (const checkbox of checkboxInputs) {
                const value = await checkbox.getAttribute('value');
                const label = await this.getInputLabel(checkbox);
                
                if (value === answer || label.toLowerCase().includes(answer.toLowerCase())) {
                    if (config.humanLike) {
                        await this.humanSim.simulateMouseMovement(this.page, checkbox);
                    }
                    
                    await checkbox.check();
                    
                    if (config.humanLike) {
                        await this.humanSim.simulateActionDelay('click');
                    }
                    
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                throw new Error(`Checkbox option not found: ${answer}`);
            }
        }
    }

    /**
     * Answer rating question
     */
    async answerRating(container, rating, config) {
        const ratingInputs = await container.$$('input[type="radio"][name*="rating"], .rating input, [class*="rating"] input');
        
        for (const input of ratingInputs) {
            const value = await input.getAttribute('value');
            
            if (value === rating.toString()) {
                if (config.humanLike) {
                    await this.humanSim.simulateMouseMovement(this.page, input);
                }
                
                await input.check();
                
                if (config.humanLike) {
                    await this.humanSim.simulateActionDelay('click');
                }
                
                return;
            }
        }
        
        throw new Error(`Rating option not found: ${rating}`);
    }

    /**
     * Answer text question
     */
    async answerText(container, text, config) {
        const textInputs = await container.$$('input[type="text"], textarea');
        
        if (textInputs.length === 0) {
            throw new Error('Text input not found');
        }
        
        const input = textInputs[0];
        await input.scrollIntoViewIfNeeded();
        
        if (config.humanLike) {
            await this.humanSim.simulateTyping(this.page, text);
        } else {
            await input.fill(text);
        }
    }

    /**
     * Answer select dropdown question
     */
    async answerSelect(container, option, config) {
        const selects = await container.$$('select');
        
        if (selects.length === 0) {
            throw new Error('Select dropdown not found');
        }
        
        const select = selects[0];
        await select.scrollIntoViewIfNeeded();
        
        if (config.humanLike) {
            await this.humanSim.simulateActionDelay('think');
        }
        
        await select.selectOption({ label: option });
    }

    /**
     * Navigate to next question/page
     */
    async nextQuestion(options = {}) {
        const defaultOptions = {
            waitForLoad: true,
            validateCurrent: true,
            humanLike: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log('Navigating to next question...');

            // Validate current answers if requested
            if (config.validateCurrent) {
                await this.validateCurrentAnswers();
            }

            // Find and click next button
            const nextButton = await this.page.$(this.selectors.navigation.next);
            if (!nextButton) {
                throw new Error('Next button not found');
            }

            if (config.humanLike) {
                await this.humanSim.simulateActionDelay('navigate');
            }

            await nextButton.click();

            // Wait for page to load/update
            if (config.waitForLoad) {
                await this.waitForSPAStabilization();
                await this.spaHandler.waitForSPAReady();
            }

            this.currentQuestionIndex++;
            this.log(`Moved to question ${this.currentQuestionIndex + 1}`);

            return true;

        } catch (error) {
            this.log(`Failed to navigate to next question: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit the poll/survey
     */
    async submitPoll(options = {}) {
        const defaultOptions = {
            validateAll: true,
            waitForConfirmation: true,
            handleRedirects: true,
            timeout: 30000
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log('Submitting poll...');

            // Validate all answers if requested
            if (config.validateAll) {
                await this.validateAllAnswers();
            }

            // Find submit button
            const submitButton = await this.page.$(this.selectors.navigation.submit);
            if (!submitButton) {
                throw new Error('Submit button not found');
            }

            // Human-like delay before submission
            await this.humanSim.simulateActionDelay('submit');

            // Click submit
            await submitButton.click();

            // Wait for submission to complete
            if (config.waitForConfirmation) {
                await this.waitForSubmissionComplete(config.timeout);
            }

            // Handle any redirects
            if (config.handleRedirects) {
                await this.handlePostSubmissionFlow();
            }

            this.log('Poll submitted successfully');
            return true;

        } catch (error) {
            this.log(`Poll submission failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate current question answers
     */
    async validateCurrentAnswers() {
        try {
            const errors = await this.page.$$(this.selectors.validation.error);
            if (errors.length > 0) {
                const errorMessages = await Promise.all(
                    errors.map(error => error.textContent())
                );
                throw new Error(`Validation errors: ${errorMessages.join(', ')}`);
            }
            
            this.log('Current answers validated');
            return true;

        } catch (error) {
            this.log(`Answer validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate specific question answer
     */
    async validateQuestionAnswer(container, questionType) {
        try {
            const errorElement = await container.$(this.selectors.validation.error);
            if (errorElement && await errorElement.isVisible()) {
                const errorText = await errorElement.textContent();
                throw new Error(`Question validation error: ${errorText}`);
            }

            return true;

        } catch (error) {
            this.log(`Question validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get label text for an input element
     */
    async getInputLabel(input) {
        try {
            return await input.evaluate(el => {
                // Try different methods to get label text
                const id = el.id;
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label) return label.textContent.trim();
                }

                // Check parent label
                const parentLabel = el.closest('label');
                if (parentLabel) return parentLabel.textContent.trim();

                // Check next sibling
                if (el.nextElementSibling) {
                    return el.nextElementSibling.textContent.trim();
                }

                // Check parent text
                if (el.parentElement) {
                    return el.parentElement.textContent.trim();
                }

                return el.value || '';
            });
        } catch (error) {
            return '';
        }
    }

    /**
     * Wait for submission to complete
     */
    async waitForSubmissionComplete(timeout = 30000) {
        try {
            // Wait for loading indicators to disappear
            await this.page.waitForFunction(() => {
                const loadingSelectors = [
                    '.loading', '.submitting', '.spinner', 
                    '[class*="loading"]', '[class*="submitting"]'
                ];
                
                return !loadingSelectors.some(selector => {
                    const element = document.querySelector(selector);
                    return element && element.offsetParent !== null;
                });
            }, {}, { timeout, polling: 500 });

            this.log('Submission completed');

        } catch (error) {
            this.log(`Submission completion timeout: ${error.message}`);
        }
    }

    /**
     * Handle post-submission flow (confirmations, redirects, etc.)
     */
    async handlePostSubmissionFlow() {
        try {
            // Check for success messages
            const successSelectors = [
                '.success', '.thank-you', '.completed', 
                '[class*="success"]', '[class*="thank"]', '[class*="complete"]'
            ];

            for (const selector of successSelectors) {
                const element = await this.page.$(selector);
                if (element && await element.isVisible()) {
                    const text = await element.textContent();
                    this.log(`Success message found: ${text}`);
                    return { success: true, message: text };
                }
            }

            // Handle potential redirects
            await this.page.waitForTimeout(2000);
            const currentUrl = this.page.url();
            
            if (currentUrl !== this.pollData?.url) {
                this.log(`Redirected to: ${currentUrl}`);
                return { success: true, redirected: true, newUrl: currentUrl };
            }

            return { success: true };

        } catch (error) {
            this.log(`Post-submission handling failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get poll completion status
     */
    async getPollStatus() {
        return {
            currentQuestion: this.currentQuestionIndex,
            totalQuestions: this.totalQuestions,
            responses: Object.keys(this.responseData).length,
            metadata: this.pollData,
            logs: this.getLogs(),
            captchaLogs: this.captchaHandler.getLogs(),
            iframeLogs: this.iframeHandler.getLogs(),
            spaLogs: this.spaHandler.getLogs()
        };
    }
}

module.exports = PollPage;