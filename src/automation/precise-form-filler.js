/**
 * Precise Form Filler
 * Enhanced form filling with better precision for actual survey completion
 */

class PreciseFormFiller {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            waitTimeout: 30000,
            fillDelay: 500,
            humanTyping: true,
            ...options
        };
    }

    /**
     * Fill a survey form with high precision
     */
    async fillSurveyForm(questions) {
        const results = {
            totalQuestions: questions.length,
            filledQuestions: 0,
            errors: [],
            interactions: []
        };

        console.log(`🎯 Starting precise form filling for ${questions.length} questions`);

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            try {
                console.log(`📝 Processing question ${i + 1}/${questions.length}: ${question.text?.substring(0, 50)}...`);
                
                const filled = await this.fillSingleQuestion(question);
                if (filled) {
                    results.filledQuestions++;
                    results.interactions.push({
                        questionIndex: i,
                        questionText: question.text,
                        success: true,
                        type: this.detectQuestionType(question)
                    });
                    console.log(`✅ Successfully filled question ${i + 1}`);
                } else {
                    console.log(`⚠️ Failed to fill question ${i + 1}`);
                    results.errors.push(`Failed to fill question ${i + 1}: ${question.text?.substring(0, 50)}`);
                }

                // Human-like delay between questions
                await this.humanDelay(300, 800);

            } catch (error) {
                console.log(`❌ Error processing question ${i + 1}: ${error.message}`);
                results.errors.push(`Error on question ${i + 1}: ${error.message}`);
            }
        }

        console.log(`📊 Form filling complete: ${results.filledQuestions}/${results.totalQuestions} questions filled`);
        return results;
    }

    /**
     * Fill a single question with precision
     */
    async fillSingleQuestion(question) {
        if (!question.inputs || question.inputs.length === 0) {
            console.log(`⚠️ No inputs found for question`);
            return false;
        }

        const questionType = this.detectQuestionType(question);
        console.log(`🎯 Question type detected: ${questionType}`);

        switch (questionType) {
            case 'radio':
                return await this.fillRadioQuestion(question);
            case 'checkbox':
                return await this.fillCheckboxQuestion(question);
            case 'text':
                return await this.fillTextQuestion(question);
            case 'email':
                return await this.fillEmailQuestion(question);
            case 'select':
                return await this.fillSelectQuestion(question);
            case 'textarea':
                return await this.fillTextareaQuestion(question);
            case 'range':
                return await this.fillRangeQuestion(question);
            default:
                return await this.fillGenericInput(question);
        }
    }

    /**
     * Fill radio button questions (single choice)
     */
    async fillRadioQuestion(question) {
        const radioInputs = question.inputs.filter(input => input.type === 'radio');
        if (radioInputs.length === 0) return false;

        // Select a random radio button with bias toward middle options
        const selectedIndex = this.selectWithBias(radioInputs.length);
        const selectedInput = radioInputs[selectedIndex];

        try {
            const element = await this.page.$(selectedInput.selector);
            if (element) {
                // Scroll into view and click
                await element.scrollIntoViewIfNeeded();
                await this.humanDelay(200, 500);
                await element.click();
                console.log(`🔘 Selected radio option ${selectedIndex + 1}/${radioInputs.length}`);
                return true;
            }
        } catch (error) {
            console.log(`❌ Failed to click radio button: ${error.message}`);
        }

        return false;
    }

    /**
     * Fill checkbox questions (multiple choice)
     */
    async fillCheckboxQuestion(question) {
        const checkboxInputs = question.inputs.filter(input => input.type === 'checkbox');
        if (checkboxInputs.length === 0) return false;

        // Select 1-3 checkboxes randomly
        const numToSelect = Math.min(Math.floor(Math.random() * 3) + 1, checkboxInputs.length);
        const selectedIndices = this.selectRandomIndices(checkboxInputs.length, numToSelect);

        let successCount = 0;
        for (const index of selectedIndices) {
            try {
                const input = checkboxInputs[index];
                const element = await this.page.$(input.selector);
                if (element) {
                    await element.scrollIntoViewIfNeeded();
                    await this.humanDelay(200, 500);
                    await element.click();
                    successCount++;
                    console.log(`☑️ Selected checkbox option ${index + 1}/${checkboxInputs.length}`);
                }
            } catch (error) {
                console.log(`❌ Failed to click checkbox: ${error.message}`);
            }
        }

        return successCount > 0;
    }

    /**
     * Fill text input questions
     */
    async fillTextQuestion(question) {
        const textInputs = question.inputs.filter(input => 
            ['text', 'input'].includes(input.type) || input.selector.includes('input')
        );
        
        if (textInputs.length === 0) return false;

        const textValue = this.generateTextResponse(question.text);
        
        for (const input of textInputs) {
            try {
                const element = await this.page.$(input.selector);
                if (element) {
                    // Check if element is visible first
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        console.log(`⚠️ Text input not visible: ${input.selector}`);
                        continue;
                    }
                    
                    await element.scrollIntoViewIfNeeded();
                    await this.humanDelay(200, 500);
                    
                    // Clear existing text and type new text
                    await element.click({ clickCount: 3 }); // Select all
                    await element.fill(''); // Clear
                    
                    if (this.options.humanTyping) {
                        await element.type(textValue, { delay: 50 + Math.random() * 100 });
                    } else {
                        await element.fill(textValue);
                    }
                    
                    console.log(`📝 Filled text input with: ${textValue}`);
                    return true;
                }
            } catch (error) {
                console.log(`❌ Failed to fill text input: ${error.message}`);
            }
        }

        return false;
    }

    /**
     * Fill email input questions
     */
    async fillEmailQuestion(question) {
        const emailInputs = question.inputs.filter(input => 
            input.type === 'email' || input.selector.includes('email')
        );
        
        if (emailInputs.length === 0) return false;

        const emailValue = this.generateEmailResponse();
        
        for (const input of emailInputs) {
            try {
                const element = await this.page.$(input.selector);
                if (element) {
                    await element.scrollIntoViewIfNeeded();
                    await this.humanDelay(200, 500);
                    await element.fill(emailValue);
                    console.log(`📧 Filled email input with: ${emailValue}`);
                    return true;
                }
            } catch (error) {
                console.log(`❌ Failed to fill email input: ${error.message}`);
            }
        }

        return false;
    }

    /**
     * Fill select dropdown questions
     */
    async fillSelectQuestion(question) {
        const selectInputs = question.inputs.filter(input => 
            input.type === 'select' || input.selector.includes('select')
        );
        
        if (selectInputs.length === 0) return false;

        for (const input of selectInputs) {
            try {
                const element = await this.page.$(input.selector);
                if (element) {
                    await element.scrollIntoViewIfNeeded();
                    await this.humanDelay(200, 500);
                    
                    // Get available options
                    const options = await element.$$('option');
                    if (options.length > 1) { // Skip first option (usually placeholder)
                        const selectedIndex = Math.floor(Math.random() * (options.length - 1)) + 1;
                        await element.selectOption({ index: selectedIndex });
                        console.log(`📋 Selected dropdown option ${selectedIndex}/${options.length - 1}`);
                        return true;
                    }
                }
            } catch (error) {
                console.log(`❌ Failed to fill select input: ${error.message}`);
            }
        }

        return false;
    }

    /**
     * Fill textarea questions
     */
    async fillTextareaQuestion(question) {
        const textareaInputs = question.inputs.filter(input => 
            input.type === 'textarea' || input.selector.includes('textarea')
        );
        
        if (textareaInputs.length === 0) return false;

        const textValue = this.generateLongTextResponse(question.text);
        
        for (const input of textareaInputs) {
            try {
                const element = await this.page.$(input.selector);
                if (element) {
                    await element.scrollIntoViewIfNeeded();
                    await this.humanDelay(200, 500);
                    
                    if (this.options.humanTyping) {
                        await element.type(textValue, { delay: 30 + Math.random() * 50 });
                    } else {
                        await element.fill(textValue);
                    }
                    
                    console.log(`📄 Filled textarea with: ${textValue.substring(0, 50)}...`);
                    return true;
                }
            } catch (error) {
                console.log(`❌ Failed to fill textarea: ${error.message}`);
            }
        }

        return false;
    }

    /**
     * Fill generic input questions (fallback)
     */
    async fillGenericInput(question) {
        if (!question.inputs || question.inputs.length === 0) return false;

        for (const input of question.inputs) {
            try {
                const element = await this.page.$(input.selector);
                if (element) {
                    // Check if element is visible
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        console.log(`⚠️ Input not visible: ${input.selector}`);
                        continue;
                    }

                    await element.scrollIntoViewIfNeeded();
                    await this.humanDelay(200, 500);
                    
                    // Try to determine what to do based on input type
                    if (input.type === 'radio' || input.type === 'checkbox') {
                        await element.click();
                        console.log(`🔘 Clicked ${input.type}: ${input.selector}`);
                        return true;
                    } else {
                        // For text-like inputs
                        const textValue = this.generateTextResponse(question.text);
                        await element.fill(textValue);
                        console.log(`📝 Filled generic input with: ${textValue}`);
                        return true;
                    }
                }
            } catch (error) {
                console.log(`❌ Failed to fill generic input: ${error.message}`);
                continue;
            }
        }

        return false;
    }

    /**
     * Detect question type from inputs
     */
    detectQuestionType(question) {
        if (!question.inputs || question.inputs.length === 0) return 'unknown';

        const types = question.inputs.map(input => input.type?.toLowerCase()).filter(Boolean);
        
        if (types.includes('radio')) return 'radio';
        if (types.includes('checkbox')) return 'checkbox';
        if (types.includes('email')) return 'email';
        if (types.includes('select')) return 'select';
        if (types.includes('textarea')) return 'textarea';
        if (types.includes('range') || types.includes('number')) return 'range';
        if (types.includes('text') || types.includes('input')) return 'text';

        return 'generic';
    }

    /**
     * Generate appropriate text responses
     */
    generateTextResponse(questionText = '') {
        const text = questionText.toLowerCase();
        
        if (text.includes('name')) {
            return ['John Smith', 'Jane Doe', 'Alex Johnson', 'Sam Wilson'][Math.floor(Math.random() * 4)];
        }
        if (text.includes('age')) {
            return (Math.floor(Math.random() * 50) + 18).toString();
        }
        if (text.includes('city') || text.includes('location')) {
            return ['New York', 'London', 'Tokyo', 'Sydney'][Math.floor(Math.random() * 4)];
        }
        if (text.includes('job') || text.includes('occupation')) {
            return ['Engineer', 'Teacher', 'Designer', 'Manager'][Math.floor(Math.random() * 4)];
        }
        
        return ['Excellent', 'Good', 'Satisfied', 'Positive'][Math.floor(Math.random() * 4)];
    }

    /**
     * Generate email responses
     */
    generateEmailResponse() {
        const names = ['john', 'jane', 'alex', 'sam', 'chris', 'taylor'];
        const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];
        const name = names[Math.floor(Math.random() * names.length)];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        return `${name}${Math.floor(Math.random() * 1000)}@${domain}`;
    }

    /**
     * Generate longer text responses for textareas
     */
    generateLongTextResponse(questionText = '') {
        const responses = [
            "This is a comprehensive response that provides detailed feedback about the topic.",
            "I believe this approach would be very effective and would recommend implementing it.",
            "The experience has been positive overall, with room for some minor improvements.",
            "This solution addresses the key requirements and provides good value for the investment."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Select with bias toward middle options
     */
    selectWithBias(length) {
        if (length <= 2) return Math.floor(Math.random() * length);
        
        // Bias toward middle options (avoid first and last)
        const weights = Array(length).fill(0).map((_, i) => {
            if (i === 0 || i === length - 1) return 0.1;
            return 1.0;
        });
        
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return i;
        }
        
        return Math.floor(length / 2); // Fallback to middle
    }

    /**
     * Select random indices without replacement
     */
    selectRandomIndices(length, count) {
        const indices = Array.from({ length }, (_, i) => i);
        const selected = [];
        
        for (let i = 0; i < count && indices.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * indices.length);
            selected.push(indices.splice(randomIndex, 1)[0]);
        }
        
        return selected;
    }

    /**
     * Human-like delay
     */
    async humanDelay(min = 500, max = 1500) {
        const delay = Math.floor(Math.random() * (max - min)) + min;
        await this.page.waitForTimeout(delay);
    }

    /**
     * Submit the form after filling with enhanced handling
     */
    async submitForm() {
        console.log('🚀 Attempting enhanced form submission...');
        
        try {
            const EnhancedSubmissionHandler = require('./enhanced-submission-handler');
            const submissionHandler = new EnhancedSubmissionHandler(this.page);
            
            return await submissionHandler.submitFormWithValidation();
        } catch (error) {
            console.log(`⚠️ Enhanced submission failed, falling back to basic: ${error.message}`);
            return await this.basicSubmitForm();
        }
    }

    /**
     * Basic submit form as fallback
     */
    async basicSubmitForm() {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Send")',
            'button:has-text("Complete")',
            'button:has-text("Finish")',
            '[class*="submit"]',
            'form button:last-child',
            'button:last-of-type'
        ];

        for (const selector of submitSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element && await element.isVisible()) {
                    await element.scrollIntoViewIfNeeded();
                    await this.humanDelay(500, 1000);
                    await element.click();
                    console.log(`🚀 Form submitted using: ${selector}`);
                    return true;
                }
            } catch (error) {
                continue;
            }
        }

        console.log(`⚠️ No submit button found`);
        return false;
    }
}

module.exports = PreciseFormFiller;