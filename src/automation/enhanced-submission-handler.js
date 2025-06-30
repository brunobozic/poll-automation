/**
 * Enhanced Submission Handler
 * Improved form submission with better validation and success detection
 */

class EnhancedSubmissionHandler {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            maxRetries: 3,
            waitTimeout: 10000,
            validationWait: 2000,
            successWait: 5000,
            ...options
        };
    }

    /**
     * Submit form with enhanced validation and success detection
     */
    async submitFormWithValidation(questions = []) {
        console.log('🚀 Starting enhanced form submission...');
        
        try {
            // Pre-submission validation
            const preValidation = await this.validateFormBeforeSubmission(questions);
            if (!preValidation.isValid) {
                console.log('⚠️ Pre-submission validation failed');
                return await this.handleValidationErrors(preValidation.errors);
            }
            
            // Capture pre-submission state
            const beforeState = await this.capturePageState();
            console.log(`📄 Before submission: ${beforeState.title}`);
            
            // Find and click submit button with retries
            const submitResult = await this.findAndClickSubmitButton();
            if (!submitResult.success) {
                console.log(`❌ Submit button interaction failed: ${submitResult.error}`);
                return false;
            }
            
            console.log(`✅ Submit button clicked: ${submitResult.method}`);
            
            // Wait for response and analyze result
            await this.page.waitForTimeout(this.options.validationWait);
            
            const result = await this.analyzeSubmissionResult(beforeState);
            console.log(`📊 Submission result: ${result.status}`);
            
            return result.success;
            
        } catch (error) {
            console.log(`❌ Enhanced submission failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Validate form before submission
     */
    async validateFormBeforeSubmission(questions) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        try {
            // Check for required fields
            const requiredFields = await this.page.evaluate(() => {
                const required = [];
                document.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
                    if (field.offsetWidth > 0 && field.offsetHeight > 0) {
                        const isEmpty = !field.value || field.value.trim() === '';
                        if (isEmpty) {
                            required.push({
                                name: field.name || field.id,
                                type: field.type,
                                selector: field.id ? `#${field.id}` : field.tagName.toLowerCase()
                            });
                        }
                    }
                });
                return required;
            });

            if (requiredFields.length > 0) {
                validation.errors.push(`Required fields empty: ${requiredFields.map(f => f.name).join(', ')}`);
                validation.isValid = false;
            }

            // Check for validation errors already on page
            const existingErrors = await this.page.evaluate(() => {
                const errorSelectors = [
                    '.error:visible', '.field-error:visible', '.validation-error:visible',
                    '[class*="error"]:visible', '.alert-danger:visible', '.invalid-feedback:visible'
                ];
                
                const errors = [];
                errorSelectors.forEach(selector => {
                    try {
                        document.querySelectorAll(selector).forEach(el => {
                            if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                                errors.push(el.textContent?.trim());
                            }
                        });
                    } catch (e) {}
                });
                
                return errors.filter(e => e && e.length > 0);
            });

            if (existingErrors.length > 0) {
                validation.warnings.push(`Existing validation errors: ${existingErrors.join('; ')}`);
            }

        } catch (error) {
            validation.warnings.push(`Validation check failed: ${error.message}`);
        }

        return validation;
    }

    /**
     * Handle validation errors by attempting to fix them
     */
    async handleValidationErrors(errors) {
        console.log('🔧 Attempting to fix validation errors...');
        
        for (const error of errors) {
            if (error.includes('Required fields empty')) {
                // Attempt to fill missing required fields
                const filled = await this.fillMissingRequiredFields();
                if (filled > 0) {
                    console.log(`✅ Filled ${filled} missing required fields`);
                    return true; // Retry submission
                }
            }
        }
        
        return false;
    }

    /**
     * Fill missing required fields
     */
    async fillMissingRequiredFields() {
        return await this.page.evaluate(() => {
            let filled = 0;
            
            document.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
                if (field.offsetWidth === 0 || field.offsetHeight === 0) return;
                if (field.value && field.value.trim() !== '') return;
                
                try {
                    if (field.type === 'email') {
                        field.value = 'test@example.com';
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        filled++;
                    } else if (field.type === 'text' || field.tagName === 'TEXTAREA') {
                        field.value = 'Survey response';
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        filled++;
                    } else if (field.type === 'number') {
                        field.value = '25';
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        filled++;
                    } else if (field.tagName === 'SELECT') {
                        const options = field.querySelectorAll('option');
                        if (options.length > 1) {
                            field.selectedIndex = 1;
                            field.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fill required field:', e);
                }
            });
            
            return filled;
        });
    }

    /**
     * Find and click submit button with multiple strategies
     */
    async findAndClickSubmitButton() {
        const strategies = [
            // Strategy 1: Standard submit buttons
            {
                name: 'Standard Submit',
                selectors: ['button[type="submit"]', 'input[type="submit"]']
            },
            // Strategy 2: Text-based buttons
            {
                name: 'Text Submit',
                selectors: [
                    'button:has-text("Submit")', 'button:has-text("Send")',
                    'button:has-text("Complete")', 'button:has-text("Finish")',
                    'button:has-text("Continue")', 'button:has-text("Next")'
                ]
            },
            // Strategy 3: CSS class patterns
            {
                name: 'CSS Class',
                selectors: ['[class*="submit"]', '[class*="send"]', '[class*="continue"]']
            },
            // Strategy 4: Form context
            {
                name: 'Form Context',
                selectors: ['form button:last-child', 'form button:only-child']
            },
            // Strategy 5: Position-based
            {
                name: 'Position Based',
                selectors: ['button:last-of-type', 'input:last-of-type']
            }
        ];

        for (const strategy of strategies) {
            console.log(`🔍 Trying ${strategy.name} strategy...`);
            
            for (const selector of strategy.selectors) {
                try {
                    const element = await this.page.$(selector);
                    if (!element) continue;
                    
                    // Check if element is visible and clickable
                    const isClickable = await element.evaluate(el => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        
                        return rect.width > 0 && 
                               rect.height > 0 && 
                               !el.disabled && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden' &&
                               style.opacity !== '0';
                    });
                    
                    if (!isClickable) continue;
                    
                    // Try to click with timeout protection
                    await Promise.race([
                        element.click(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Click timeout')), 5000)
                        )
                    ]);
                    
                    return { 
                        success: true, 
                        method: `${strategy.name}: ${selector}`
                    };
                    
                } catch (error) {
                    console.log(`⚠️ ${selector} failed: ${error.message}`);
                    continue;
                }
            }
        }
        
        return { 
            success: false, 
            error: 'No clickable submit button found'
        };
    }

    /**
     * Capture page state for comparison
     */
    async capturePageState() {
        return {
            url: this.page.url(),
            title: await this.page.title(),
            timestamp: Date.now()
        };
    }

    /**
     * Analyze submission result
     */
    async analyzeSubmissionResult(beforeState) {
        try {
            // Wait for potential changes
            await this.page.waitForTimeout(this.options.successWait);
            
            const afterState = await this.capturePageState();
            
            // Check for URL change (common indicator of successful submission)
            const urlChanged = afterState.url !== beforeState.url;
            
            // Check for success indicators in page content
            const successIndicators = await this.page.evaluate(() => {
                const text = document.body.textContent.toLowerCase();
                const indicators = {
                    thankYou: /thank\s*you/i.test(text),
                    submitted: /submitted|sent/i.test(text),
                    complete: /complete[d]?|finished/i.test(text),
                    success: /success/i.test(text),
                    received: /received/i.test(text),
                    confirmation: /confirmation|confirm/i.test(text)
                };
                
                return {
                    ...indicators,
                    hasAny: Object.values(indicators).some(Boolean),
                    pageText: text.substring(0, 300)
                };
            });
            
            // Check for validation errors
            const hasErrors = await this.page.evaluate(() => {
                const errorSelectors = [
                    '.error', '.field-error', '.validation-error', '.alert-danger',
                    '[class*="error"]', '[class*="invalid"]'
                ];
                
                return errorSelectors.some(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        return Array.from(elements).some(el => 
                            el.offsetWidth > 0 && el.offsetHeight > 0
                        );
                    } catch (e) {
                        return false;
                    }
                });
            });
            
            // Determine success
            let success = false;
            let status = '';
            
            if (hasErrors) {
                status = 'validation_error';
                success = false;
            } else if (successIndicators.hasAny) {
                status = 'success_confirmed';
                success = true;
            } else if (urlChanged) {
                status = 'url_changed';
                success = true;
            } else {
                status = 'unclear';
                success = false;
            }
            
            return {
                success,
                status,
                urlChanged,
                successIndicators,
                hasErrors,
                beforeState,
                afterState
            };
            
        } catch (error) {
            return {
                success: false,
                status: 'analysis_failed',
                error: error.message
            };
        }
    }
}

module.exports = EnhancedSubmissionHandler;