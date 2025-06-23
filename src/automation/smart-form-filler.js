/**
 * Smart Form Filler
 * 
 * Universal Playwright helper methods for intelligent form automation that:
 * - Uses LLM analysis to fill forms on any website
 * - Avoids honeypots and bot traps
 * - Mimics human behavior patterns
 * - Handles validation errors intelligently
 * - Works with any form structure
 */

class SmartFormFiller {
    constructor(page, formAnalysis, options = {}) {
        this.page = page;
        this.formAnalysis = formAnalysis;
        this.options = {
            humanLikeDelays: true,
            validateAfterFilling: true,
            retryOnValidationErrors: true,
            maxRetries: 3,
            skipHoneypots: true,
            debugMode: false,
            ...options
        };
        
        // Human-like timing patterns
        this.timingPatterns = {
            typing: { min: 50, max: 150 },
            betweenFields: { min: 200, max: 800 },
            beforeSubmit: { min: 1000, max: 3000 },
            afterError: { min: 500, max: 1500 }
        };
        
        this.log('🤖 Smart Form Filler initialized');
    }

    /**
     * Main method: Fill the entire form intelligently
     */
    async fillForm(userData) {
        this.log('🚀 Starting intelligent form filling process...');
        
        try {
            // Step 1: Pre-fill preparation
            await this.preparePage();
            
            // Step 2: Fill all fields (avoiding honeypots)
            const fieldResults = await this.fillAllFields(userData);
            
            // Step 3: Handle checkboxes
            const checkboxResults = await this.handleAllCheckboxes();
            
            // Step 4: Validate the form
            const validationResult = await this.validateForm();
            
            // Step 5: Fix any validation errors
            if (!validationResult.success && this.options.retryOnValidationErrors) {
                await this.fixValidationErrors(userData, validationResult.errors);
            }
            
            const results = {
                success: true,
                fieldsProcessed: fieldResults.successful,
                checkboxesProcessed: checkboxResults.successful,
                honeypotsSKipped: fieldResults.honepotsSkipped,
                validationErrors: validationResult.errors.length,
                summary: this.generateSummary(fieldResults, checkboxResults, validationResult)
            };
            
            this.log('✅ Form filling completed successfully');
            return results;
            
        } catch (error) {
            this.log(`❌ Form filling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Prepare the page for form filling
     */
    async preparePage() {
        this.log('🔧 Preparing page for form filling...');
        
        // Scroll to make forms visible
        try {
            const firstField = this.formAnalysis.fields.find(f => f.selectorValid);
            if (firstField) {
                await this.page.locator(firstField.selector).scrollIntoViewIfNeeded();
            }
        } catch (e) {
            // Continue if scrolling fails
        }
        
        // Wait for any dynamic content
        await this.humanDelay(500, 1000);
        
        // Focus on the page to ensure it's active
        await this.page.focus('body');
    }

    /**
     * Fill all form fields intelligently
     */
    async fillAllFields(userData) {
        this.log(`📝 Filling ${this.formAnalysis.fields.length} fields...`);
        
        const results = {
            successful: 0,
            failed: 0,
            honepotsSkipped: 0,
            errors: []
        };
        
        // Sort fields by importance and position
        const sortedFields = this.sortFieldsByImportance(this.formAnalysis.fields);
        
        for (const field of sortedFields) {
            try {
                // Skip invalid selectors
                if (!field.selectorValid) {
                    this.log(`⏭️ Skipping field with invalid selector: ${field.selector}`);
                    results.failed++;
                    continue;
                }
                
                // Skip honeypots (this is crucial for bot detection avoidance)
                if (this.isHoneypot(field)) {
                    this.log(`🍯 Skipping honeypot field: ${field.selector}`);
                    results.honepotsSkipped++;
                    continue;
                }
                
                // Skip if field is not actually visible
                if (!field.actuallyVisible) {
                    this.log(`👻 Skipping hidden field: ${field.selector}`);
                    continue;
                }
                
                this.log(`📝 Filling field: ${field.purpose} (${field.selector})`);
                
                // Generate appropriate value
                const value = this.generateFieldValue(field.purpose, userData, field);
                
                if (value !== null) {
                    // Fill the field with human-like behavior
                    await this.fillFieldHumanLike(field.selector, value, field.type);
                    results.successful++;
                    
                    this.log(`✅ Successfully filled ${field.purpose}: ${this.maskSensitiveValue(value, field.purpose)}`);
                } else {
                    this.log(`⚠️ No value generated for field: ${field.purpose}`);
                }
                
                // Human-like delay between fields
                await this.humanDelay(this.timingPatterns.betweenFields.min, this.timingPatterns.betweenFields.max);
                
            } catch (error) {
                this.log(`❌ Error filling field ${field.selector}: ${error.message}`);
                results.failed++;
                results.errors.push({
                    field: field.selector,
                    purpose: field.purpose,
                    error: error.message
                });
            }
        }
        
        this.log(`📊 Field filling results: ${results.successful} successful, ${results.failed} failed, ${results.honepotsSkipped} honeypots skipped`);
        return results;
    }

    /**
     * Handle all checkboxes intelligently
     */
    async handleAllCheckboxes() {
        const checkboxCount = this.formAnalysis.checkboxes?.length || 0;
        this.log(`☑️ CHECKBOX HANDLING: Starting ${checkboxCount} checkboxes...`);
        
        if (checkboxCount === 0) {
            this.log(`⚠️ CHECKBOX WARNING: No checkboxes found in form analysis!`);
            return { successful: 0, failed: 0, errors: [] };
        }
        
        const results = {
            successful: 0,
            failed: 0,
            errors: [],
            checkedBoxes: [],
            uncheckedBoxes: [],
            skippedBoxes: []
        };
        
        for (let i = 0; i < this.formAnalysis.checkboxes.length; i++) {
            const checkbox = this.formAnalysis.checkboxes[i];
            
            this.log(`\n📋 CHECKBOX ${i + 1}/${checkboxCount}:`);
            this.log(`   🎯 Purpose: ${checkbox.purpose || 'Unknown'}`);
            this.log(`   🔍 Selector: ${checkbox.selector || 'None'}`);
            this.log(`   📝 Label: ${checkbox.label || 'No label'}`);
            this.log(`   ✅ Required: ${checkbox.required || false}`);
            this.log(`   👁️ Visible: ${checkbox.actuallyVisible}`);
            this.log(`   🎬 Proposed Action: ${checkbox.action || 'Not specified'}`);
            
            try {
                if (!checkbox.selectorValid || !checkbox.actuallyVisible) {
                    this.log(`❌ SKIPPING: Invalid selector or not visible`);
                    results.skippedBoxes.push({
                        purpose: checkbox.purpose,
                        reason: !checkbox.selectorValid ? 'Invalid selector' : 'Not visible'
                    });
                    continue;
                }
                
                // Determine action if not specified
                let action = checkbox.action;
                if (!action || action === 'undefined') {
                    action = this.determineCheckboxAction(checkbox);
                    this.log(`🧠 AUTO-DETERMINED ACTION: ${action} (was: ${checkbox.action || 'undefined'})`);
                    this.log(`   📊 Based on: purpose="${checkbox.purpose}", label="${checkbox.label}", required=${checkbox.required}`);
                }
                
                if (action === 'check') {
                    this.log(`✅ CHECKING checkbox: ${checkbox.purpose}`);
                    await this.checkCheckboxHumanLike(checkbox.selector);
                    results.successful++;
                    results.checkedBoxes.push({
                        purpose: checkbox.purpose,
                        selector: checkbox.selector,
                        label: checkbox.label
                    });
                    this.log(`✅ SUCCESS: Checked ${checkbox.purpose}`);
                    
                } else if (action === 'uncheck') {
                    this.log(`☑️ UNCHECKING checkbox: ${checkbox.purpose}`);
                    await this.uncheckCheckboxHumanLike(checkbox.selector);
                    results.successful++;
                    results.uncheckedBoxes.push({
                        purpose: checkbox.purpose,
                        selector: checkbox.selector,
                        label: checkbox.label
                    });
                    this.log(`✅ SUCCESS: Unchecked ${checkbox.purpose}`);
                    
                } else {
                    this.log(`⏭️ SKIPPING checkbox: ${checkbox.purpose} (action: ${action})`);
                    results.skippedBoxes.push({
                        purpose: checkbox.purpose,
                        reason: `Action was: ${action}`,
                        selector: checkbox.selector
                    });
                }
                
                // Delay between checkbox interactions
                await this.humanDelay(300, 700);
                
            } catch (error) {
                this.log(`❌ CHECKBOX ERROR: ${checkbox.purpose} failed!`);
                this.log(`   💥 Error: ${error.message}`);
                this.log(`   🔍 Selector: ${checkbox.selector}`);
                results.failed++;
                results.errors.push({
                    checkbox: checkbox.selector,
                    purpose: checkbox.purpose,
                    error: error.message,
                    label: checkbox.label
                });
            }
        }
        
        // Summary logging
        this.log(`\n📊 CHECKBOX SUMMARY:`);
        this.log(`   ✅ Successfully handled: ${results.successful}`);
        this.log(`   ❌ Failed: ${results.failed}`);
        this.log(`   ⏭️ Skipped: ${results.skippedBoxes.length}`);
        
        if (results.checkedBoxes.length > 0) {
            this.log(`   ☑️ CHECKED BOXES:`);
            results.checkedBoxes.forEach(box => {
                this.log(`      ✓ ${box.purpose}: "${box.label}"`);
            });
        }
        
        if (results.uncheckedBoxes.length > 0) {
            this.log(`   ☐ UNCHECKED BOXES:`);
            results.uncheckedBoxes.forEach(box => {
                this.log(`      ✗ ${box.purpose}: "${box.label}"`);
            });
        }
        
        if (results.skippedBoxes.length > 0) {
            this.log(`   ⚠️ SKIPPED BOXES:`);
            results.skippedBoxes.forEach(box => {
                this.log(`      ⏭️ ${box.purpose}: ${box.reason}`);
            });
        }
        
        if (results.errors.length > 0) {
            this.log(`   💥 ERRORS:`);
            results.errors.forEach(err => {
                this.log(`      ❌ ${err.purpose}: ${err.error}`);
            });
        }
        
        // Critical warning if no checkboxes were successfully handled but some were found
        if (checkboxCount > 0 && results.successful === 0) {
            this.log(`🚨 CRITICAL: Found ${checkboxCount} checkboxes but NONE were successfully checked!`);
            this.log(`🚨 This likely means Terms & Conditions were NOT accepted!`);
        }
        
        return results;
    }

    /**
     * Intelligently determine what to do with a checkbox based on its purpose and context
     */
    determineCheckboxAction(checkbox) {
        const purpose = checkbox.purpose?.toLowerCase() || '';
        const label = checkbox.label?.toLowerCase() || '';
        const selector = checkbox.selector?.toLowerCase() || '';
        
        // Required checkboxes that should be checked
        const shouldCheck = [
            'terms', 'terms_of_service', 'terms_conditions', 'agreement', 'policy',
            'privacy', 'privacy_policy', 'accept', 'agree', 'consent', 'required',
            'mandatory', 'must_accept', 'legal', 'conditions'
        ];
        
        // Optional checkboxes that can be unchecked 
        const canUncheck = [
            'newsletter', 'marketing', 'promotional', 'updates', 'notifications',
            'emails', 'communications', 'offers', 'spam', 'advertisement'
        ];
        
        // Check if this is a required checkbox that should be checked
        for (const term of shouldCheck) {
            if (purpose.includes(term) || label.includes(term) || selector.includes(term)) {
                return 'check';
            }
        }
        
        // Check if this is an optional marketing checkbox (can be left unchecked)
        for (const term of canUncheck) {
            if (purpose.includes(term) || label.includes(term) || selector.includes(term)) {
                return 'uncheck'; // Don't opt into marketing by default
            }
        }
        
        // If required=true, check it
        if (checkbox.required === true) {
            return 'check';
        }
        
        // Default for unknown checkboxes - check if it seems important, skip if marketing
        if (label.includes('agree') || label.includes('accept') || purpose.includes('terms')) {
            return 'check';
        }
        
        if (label.includes('subscribe') || label.includes('email') || label.includes('newsletter')) {
            return 'uncheck';
        }
        
        // Default: check if required, skip if optional
        return checkbox.required ? 'check' : 'skip';
    }

    /**
     * Fill a field with human-like behavior
     */
    async fillFieldHumanLike(selector, value, fieldType = 'text') {
        const element = this.page.locator(selector).first();
        
        // Scroll to element
        await element.scrollIntoViewIfNeeded();
        
        // Human-like delay before interacting
        await this.humanDelay(200, 500);
        
        // Focus on the element
        await element.focus();
        await this.humanDelay(100, 300);
        
        // Clear existing content (human-like)
        await element.selectText();
        await this.humanDelay(50, 150);
        
        // Type with human-like speed and errors
        if (fieldType === 'password') {
            // For passwords, type without human errors
            await element.fill(value);
        } else {
            // For other fields, simulate more human-like typing
            await this.typeHumanLike(element, value);
        }
        
        // Validate the input was accepted
        const actualValue = await element.inputValue();
        if (actualValue !== value) {
            this.log(`⚠️ Value mismatch in ${selector}: expected "${value}", got "${actualValue}"`);
        }
        
        // Trigger change events
        await element.blur();
        await this.humanDelay(100, 200);
    }

    /**
     * Type text with human-like patterns
     */
    async typeHumanLike(element, text) {
        // Clear first
        await element.fill('');
        
        // Type character by character with human-like delays
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            await element.type(char);
            
            // Variable delay between characters
            const delay = this.timingPatterns.typing.min + 
                         Math.random() * (this.timingPatterns.typing.max - this.timingPatterns.typing.min);
            await this.page.waitForTimeout(delay);
        }
    }

    /**
     * Check a checkbox with human-like behavior
     */
    async checkCheckboxHumanLike(selector) {
        const element = this.page.locator(selector).first();
        
        await element.scrollIntoViewIfNeeded();
        await this.humanDelay(200, 400);
        
        try {
            // Try direct check first
            await element.check();
        } catch (interceptError) {
            this.log(`🔄 Direct check failed for ${selector}, trying alternatives...`);
            
            try {
                // Try force click
                await element.click({ force: true });
            } catch (forceError) {
                // Try clicking parent/wrapper
                const parent = element.locator('..');
                await parent.click();
            }
        }
        
        // Verify it was checked
        const isChecked = await element.isChecked();
        if (!isChecked) {
            throw new Error(`Failed to check checkbox: ${selector}`);
        }
    }

    /**
     * Uncheck a checkbox with human-like behavior
     */
    async uncheckCheckboxHumanLike(selector) {
        const element = this.page.locator(selector).first();
        
        await element.scrollIntoViewIfNeeded();
        await this.humanDelay(200, 400);
        
        await element.uncheck();
        
        // Verify it was unchecked
        const isChecked = await element.isChecked();
        if (isChecked) {
            throw new Error(`Failed to uncheck checkbox: ${selector}`);
        }
    }

    /**
     * Submit the form intelligently
     */
    async submitForm() {
        this.log('📤 Submitting form...');
        
        if (!this.formAnalysis.submitButton || !this.formAnalysis.submitButton.selectorValid) {
            throw new Error('No valid submit button found');
        }
        
        // Human-like delay before submission
        await this.humanDelay(this.timingPatterns.beforeSubmit.min, this.timingPatterns.beforeSubmit.max);
        
        const submitButton = this.page.locator(this.formAnalysis.submitButton.selector).first();
        
        // Scroll to submit button
        await submitButton.scrollIntoViewIfNeeded();
        
        // Final delay
        await this.humanDelay(500, 1000);
        
        // Click submit
        await submitButton.click();
        
        this.log('✅ Form submitted');
        
        // Wait for response/navigation
        try {
            await Promise.race([
                this.page.waitForNavigation({ timeout: 10000 }),
                this.page.waitForSelector('.error, .success, .message', { timeout: 10000 })
            ]);
        } catch (e) {
            // Continue if no clear response indicator
        }
    }

    /**
     * Validate the form and detect errors
     */
    async validateForm() {
        this.log('🔍 Validating form...');
        
        // Wait a moment for validation to trigger
        await this.humanDelay(500, 1000);
        
        const errors = [];
        
        // Look for common error indicators
        const errorSelectors = [
            '.error', '.invalid', '.has-error', '.field-error',
            '[class*="error"]', '[class*="invalid"]',
            '.help-block.error', '.form-error', '.validation-error',
            '.alert-danger', '.text-danger', '.text-error'
        ];
        
        for (const selector of errorSelectors) {
            try {
                const errorElements = await this.page.locator(selector).all();
                for (const element of errorElements) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        const text = await element.textContent();
                        if (text && text.trim()) {
                            errors.push({
                                selector: selector,
                                message: text.trim(),
                                element: element
                            });
                        }
                    }
                }
            } catch (e) {
                // Continue checking other selectors
            }
        }
        
        this.log(`🔍 Validation check found ${errors.length} errors`);
        
        return {
            success: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Intelligently fix validation errors
     */
    async fixValidationErrors(userData, errors) {
        this.log(`🔧 Attempting to fix ${errors.length} validation errors...`);
        
        for (const error of errors) {
            try {
                this.log(`🔧 Fixing error: ${error.message}`);
                
                // Analyze error message to understand what's needed
                const fixStrategy = this.analyzeErrorForFix(error.message);
                
                if (fixStrategy.action === 'retry_field') {
                    await this.retryFieldFilling(fixStrategy.fieldType, userData);
                } else if (fixStrategy.action === 'check_required') {
                    await this.ensureRequiredFieldsFilled(userData);
                }
                
                await this.humanDelay(this.timingPatterns.afterError.min, this.timingPatterns.afterError.max);
                
            } catch (fixError) {
                this.log(`❌ Failed to fix error: ${fixError.message}`);
            }
        }
    }

    /**
     * Analyze error message to determine fix strategy
     */
    analyzeErrorForFix(errorMessage) {
        const message = errorMessage.toLowerCase();
        
        if (message.includes('required') || message.includes('field is required')) {
            return { action: 'check_required', fieldType: null };
        } else if (message.includes('email')) {
            return { action: 'retry_field', fieldType: 'email' };
        } else if (message.includes('password')) {
            return { action: 'retry_field', fieldType: 'password' };
        } else if (message.includes('name')) {
            return { action: 'retry_field', fieldType: 'name' };
        }
        
        return { action: 'check_required', fieldType: null };
    }

    /**
     * Generate appropriate value for a field
     */
    generateFieldValue(purpose, userData, fieldInfo) {
        switch (purpose) {
            case 'email':
                return userData.email;
            case 'confirmEmail':
                return userData.email;
            case 'firstName':
                return userData.firstName || 'John';
            case 'lastName':
                return userData.lastName || 'Doe';
            case 'fullName':
                return `${userData.firstName || 'John'} ${userData.lastName || 'Doe'}`;
            case 'password':
                return userData.password || this.generateSecurePassword();
            case 'confirmPassword':
                return userData.password || this.generateSecurePassword();
            case 'phone':
                return userData.phone || '+1-555-123-4567';
            case 'company':
                return userData.company || 'Acme Corp';
            case 'address':
                return userData.address || '123 Main Street';
            case 'age':
                return userData.age?.toString() || '25';
            default:
                // For unknown fields, try to be intelligent
                if (fieldInfo.type === 'number') {
                    return '25';
                } else if (fieldInfo.type === 'tel') {
                    return '+1-555-123-4567';
                } else if (fieldInfo.type === 'url') {
                    return 'https://example.com';
                } else if (fieldInfo.type === 'date') {
                    return '1990-01-01';
                } else {
                    return userData.firstName || 'DefaultValue';
                }
        }
    }

    /**
     * Generate a secure password
     */
    generateSecurePassword() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Check if a field is a honeypot that should be skipped
     */
    isHoneypot(field) {
        // Check if it's explicitly marked as a honeypot
        const honeypotSelectors = this.formAnalysis.honeypots?.map(h => h.selector) || [];
        if (honeypotSelectors.includes(field.selector)) {
            return true;
        }
        
        // Check if field has suspicious indicators
        if (field.suspicious && field.suspiciousScore > 0.7) {
            return true;
        }
        
        // Check selector for honeypot patterns
        const selector = field.selector.toLowerCase();
        const honeypotPatterns = ['honeypot', 'bot', 'spam', 'trap', 'winnie'];
        return honeypotPatterns.some(pattern => selector.includes(pattern));
    }

    /**
     * Sort fields by importance for optimal filling order
     */
    sortFieldsByImportance(fields) {
        const importanceOrder = {
            'critical': 3,
            'important': 2,
            'optional': 1
        };
        
        return fields.sort((a, b) => {
            const aImportance = importanceOrder[a.importance] || 1;
            const bImportance = importanceOrder[b.importance] || 1;
            return bImportance - aImportance;
        });
    }

    /**
     * Human-like delay utility
     */
    async humanDelay(min, max) {
        if (!this.options.humanLikeDelays) return;
        
        const delay = min + Math.random() * (max - min);
        await this.page.waitForTimeout(Math.round(delay));
    }

    /**
     * Mask sensitive values for logging
     */
    maskSensitiveValue(value, fieldPurpose) {
        if (['password', 'confirmPassword'].includes(fieldPurpose)) {
            return '*'.repeat(value.length);
        }
        return value;
    }

    /**
     * Generate summary of filling results
     */
    generateSummary(fieldResults, checkboxResults, validationResult) {
        return {
            totalFields: fieldResults.successful + fieldResults.failed,
            fieldsSuccessful: fieldResults.successful,
            fieldsFailed: fieldResults.failed,
            honepotsAvoided: fieldResults.honepotsSkipped,
            checkboxesHandled: checkboxResults.successful,
            validationErrors: validationResult.errors.length,
            overallSuccess: fieldResults.successful > 0 && validationResult.errors.length === 0
        };
    }

    /**
     * Ensure all required fields are filled
     */
    async ensureRequiredFieldsFilled(userData) {
        const requiredFields = this.formAnalysis.fields.filter(f => 
            f.required || f.importance === 'critical'
        );
        
        for (const field of requiredFields) {
            try {
                const element = this.page.locator(field.selector).first();
                const currentValue = await element.inputValue();
                
                if (!currentValue || currentValue.trim() === '') {
                    this.log(`🔄 Re-filling required field: ${field.purpose}`);
                    const value = this.generateFieldValue(field.purpose, userData, field);
                    if (value) {
                        await this.fillFieldHumanLike(field.selector, value, field.type);
                    }
                }
            } catch (e) {
                // Continue with other fields
            }
        }
    }

    /**
     * Retry filling a specific field type
     */
    async retryFieldFilling(fieldType, userData) {
        const fieldsToRetry = this.formAnalysis.fields.filter(f => 
            f.purpose.includes(fieldType) || f.type === fieldType
        );
        
        for (const field of fieldsToRetry) {
            try {
                this.log(`🔄 Retrying field: ${field.purpose}`);
                const value = this.generateFieldValue(field.purpose, userData, field);
                if (value) {
                    await this.fillFieldHumanLike(field.selector, value, field.type);
                }
            } catch (e) {
                this.log(`❌ Retry failed for ${field.selector}: ${e.message}`);
            }
        }
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[SmartFormFiller] ${message}`);
        }
    }
}

module.exports = SmartFormFiller;