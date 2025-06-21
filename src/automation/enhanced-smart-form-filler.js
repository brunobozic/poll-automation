/**
 * Enhanced Smart Form Filler
 * 
 * Improved version with better reliability, error handling, and human-like behavior
 */

class EnhancedSmartFormFiller {
    constructor(page, formAnalysis, options = {}) {
        this.page = page;
        this.formAnalysis = formAnalysis;
        this.options = {
            humanLikeDelays: true,
            validateAfterFilling: true,
            retryOnValidationErrors: true,
            maxRetries: 5,
            skipHoneypots: true,
            debugMode: true,
            adaptiveTiming: true,
            errorRecovery: true,
            multiStepDetection: true,
            ...options
        };
        
        // Enhanced human-like timing patterns
        this.timingPatterns = {
            typing: { min: 30, max: 120, burst: 3 },
            betweenFields: { min: 500, max: 2000 },
            beforeSubmit: { min: 2000, max: 5000 },
            afterError: { min: 1000, max: 3000 },
            reading: { min: 1000, max: 3000 },
            thinking: { min: 800, max: 2500 }
        };
        
        // Field filling strategies
        this.fillStrategies = [
            'direct_fill',
            'click_and_type',
            'clear_and_fill',
            'select_all_and_type',
            'character_by_character'
        ];
        
        // Checkbox interaction strategies
        this.checkboxStrategies = [
            'direct_check',
            'click_element',
            'click_parent',
            'click_label',
            'force_click'
        ];
        
        this.log('🤖 Enhanced Smart Form Filler initialized');
    }

    /**
     * Enhanced main form filling method
     */
    async fillForm(userData) {
        this.log('🚀 Starting enhanced form filling process...');
        
        try {
            // Step 1: Enhanced preparation
            await this.enhancedPreparation();
            
            // Step 2: Analyze form state
            const formState = await this.analyzeFormState();
            
            // Step 3: Fill fields with adaptive strategies
            const fieldResults = await this.fillAllFieldsEnhanced(userData, formState);
            
            // Step 4: Handle checkboxes with multiple strategies
            const checkboxResults = await this.handleAllCheckboxesEnhanced();
            
            // Step 5: Enhanced validation and error recovery
            const validationResult = await this.enhancedValidation();
            
            // Step 6: Error recovery if needed
            if (!validationResult.success && this.options.retryOnValidationErrors) {
                const recoveryResult = await this.performErrorRecovery(userData, validationResult.errors);
                validationResult.recovered = recoveryResult.success;
            }
            
            const results = {
                success: true,
                fieldsProcessed: fieldResults.successful,
                fieldsFailed: fieldResults.failed,
                checkboxesProcessed: checkboxResults.successful,
                honepotsSkipped: fieldResults.honepotsSkipped,
                validationErrors: validationResult.errors.length,
                errorRecoveryAttempted: validationResult.recovered || false,
                formState: formState,
                summary: this.generateEnhancedSummary(fieldResults, checkboxResults, validationResult)
            };
            
            this.log('✅ Enhanced form filling completed');
            this.logEnhancedResults(results);
            
            return results;
            
        } catch (error) {
            this.log(`❌ Enhanced form filling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Enhanced page preparation
     */
    async enhancedPreparation() {
        this.log('🔧 Enhanced page preparation...');
        
        // Ensure page is focused
        await this.page.bringToFront();
        await this.humanDelay(300, 700);
        
        // Scroll to reveal form content
        try {
            const firstField = this.formAnalysis.fields.find(f => f.selectorValid && f.actuallyVisible);
            if (firstField) {
                await this.page.locator(firstField.selector).scrollIntoViewIfNeeded();
                await this.humanDelay(500, 1000);
            }
        } catch (e) {
            this.log('⚠️ Could not scroll to first field');
        }
        
        // Simulate user reading the form
        await this.simulateReading();
        
        // Focus on the page
        await this.page.focus('body');
        await this.humanDelay(200, 500);
    }

    /**
     * Analyze current form state
     */
    async analyzeFormState() {
        this.log('📊 Analyzing form state...');
        
        const state = {
            totalFields: this.formAnalysis.fields.length,
            visibleFields: 0,
            enabledFields: 0,
            requiredFields: 0,
            preFilledFields: 0,
            emptyFields: 0,
            hasErrors: false,
            isMultiStep: false,
            currentStep: 1,
            totalSteps: 1
        };
        
        // Analyze each field
        for (const field of this.formAnalysis.fields) {
            if (!field.selectorValid) continue;
            
            try {
                const element = this.page.locator(field.selector).first();
                
                if (await element.isVisible()) {
                    state.visibleFields++;
                    
                    if (await element.isEnabled()) {
                        state.enabledFields++;
                    }
                    
                    if (field.required) {
                        state.requiredFields++;
                    }
                    
                    const currentValue = await element.inputValue();
                    if (currentValue && currentValue.trim()) {
                        state.preFilledFields++;
                    } else {
                        state.emptyFields++;
                    }
                }
            } catch (e) {
                // Field not accessible
            }
        }
        
        // Check for multi-step indicators
        const stepIndicators = await this.page.locator('.step, .wizard, [data-step], .progress').count();
        if (stepIndicators > 0) {
            state.isMultiStep = true;
            // Try to determine current step
            try {
                const activeSteps = await this.page.locator('.step.active, .step.current, [data-step].active').count();
                if (activeSteps > 0) {
                    state.currentStep = activeSteps;
                }
            } catch (e) {
                // Default to step 1
            }
        }
        
        // Check for existing errors
        const errorCount = await this.page.locator('.error, .invalid, .has-error, [class*="error"]').count();
        state.hasErrors = errorCount > 0;
        
        this.log(`📊 Form state: ${state.visibleFields}/${state.totalFields} visible, ${state.emptyFields} empty, ${state.requiredFields} required`);
        return state;
    }

    /**
     * Enhanced field filling with adaptive strategies
     */
    async fillAllFieldsEnhanced(userData, formState) {
        this.log(`📝 Enhanced filling of ${this.formAnalysis.fields.length} fields...`);
        
        const results = {
            successful: 0,
            failed: 0,
            honepotsSkipped: 0,
            errors: [],
            strategies: {}
        };
        
        // Sort fields by importance and position
        const sortedFields = this.sortFieldsByImportanceEnhanced(this.formAnalysis.fields);
        
        for (const field of sortedFields) {
            try {
                // Pre-field checks
                if (!field.selectorValid) {
                    this.log(`⏭️ Skipping field with invalid selector: ${field.selector}`);
                    results.failed++;
                    continue;
                }
                
                // Enhanced honeypot detection
                if (this.isEnhancedHoneypot(field)) {
                    this.log(`🍯 Skipping honeypot field: ${field.selector} (${field.purpose})`);
                    results.honepotsSkipped++;
                    continue;
                }
                
                // Check visibility and interactability
                if (!field.actuallyVisible || !field.actuallyInteractable) {
                    this.log(`👻 Skipping non-interactable field: ${field.selector}`);
                    continue;
                }
                
                this.log(`📝 Filling field: ${field.purpose} (${field.selector})`);
                
                // Generate value
                const value = this.generateEnhancedFieldValue(field.purpose, userData, field);
                
                if (value !== null) {
                    // Try multiple strategies until success
                    const success = await this.fillFieldWithStrategies(field, value);
                    
                    if (success.filled) {
                        results.successful++;
                        results.strategies[field.selector] = success.strategy;
                        this.log(`✅ Successfully filled ${field.purpose}: ${this.maskSensitiveValue(value, field.purpose)} (${success.strategy})`);
                    } else {
                        results.failed++;
                        results.errors.push({
                            field: field.selector,
                            purpose: field.purpose,
                            error: success.error
                        });
                        this.log(`❌ Failed to fill ${field.purpose}: ${success.error}`);
                    }
                } else {
                    this.log(`⚠️ No value generated for field: ${field.purpose}`);
                }
                
                // Adaptive delay based on field type and position
                await this.adaptiveDelay(field, formState);
                
            } catch (error) {
                this.log(`❌ Error processing field ${field.selector}: ${error.message}`);
                results.failed++;
                results.errors.push({
                    field: field.selector,
                    purpose: field.purpose,
                    error: error.message
                });
            }
        }
        
        this.log(`📊 Enhanced field filling: ${results.successful} successful, ${results.failed} failed, ${results.honepotsSkipped} honeypots skipped`);
        return results;
    }

    /**
     * Fill field using multiple strategies
     */
    async fillFieldWithStrategies(field, value) {
        const element = this.page.locator(field.selector).first();
        
        for (const strategy of this.fillStrategies) {
            try {
                this.log(`🔄 Trying strategy: ${strategy} for ${field.selector}`);
                
                switch (strategy) {
                    case 'direct_fill':
                        await element.fill(value);
                        break;
                        
                    case 'click_and_type':
                        await element.click();
                        await this.humanDelay(100, 300);
                        await element.fill(value);
                        break;
                        
                    case 'clear_and_fill':
                        await element.click();
                        await this.humanDelay(100, 200);
                        await element.clear();
                        await this.humanDelay(100, 200);
                        await element.fill(value);
                        break;
                        
                    case 'select_all_and_type':
                        await element.click();
                        await this.humanDelay(100, 200);
                        await element.selectText();
                        await this.humanDelay(50, 150);
                        await this.typeHumanLike(element, value);
                        break;
                        
                    case 'character_by_character':
                        await element.click();
                        await this.humanDelay(100, 200);
                        await element.clear();
                        await this.typeCharacterByCharacter(element, value);
                        break;
                }
                
                // Verify the value was set
                await this.humanDelay(200, 400);
                const actualValue = await element.inputValue();
                
                if (actualValue === value || this.isValueAcceptable(actualValue, value, field)) {
                    return { filled: true, strategy: strategy };
                } else {
                    this.log(`⚠️ Strategy ${strategy} failed verification: expected "${value}", got "${actualValue}"`);
                }
                
            } catch (error) {
                this.log(`❌ Strategy ${strategy} failed: ${error.message}`);
                continue;
            }
        }
        
        return { filled: false, error: 'All filling strategies failed' };
    }

    /**
     * Enhanced checkbox handling with multiple strategies
     */
    async handleAllCheckboxesEnhanced() {
        this.log(`☑️ Enhanced handling of ${this.formAnalysis.checkboxes?.length || 0} checkboxes...`);
        
        const results = {
            successful: 0,
            failed: 0,
            errors: [],
            strategies: {}
        };
        
        for (const checkbox of this.formAnalysis.checkboxes || []) {
            try {
                if (!checkbox.selectorValid || !checkbox.actuallyVisible) {
                    continue;
                }
                
                this.log(`☑️ Processing checkbox: ${checkbox.purpose} (${checkbox.action})`);
                
                if (checkbox.action === 'check') {
                    const success = await this.checkCheckboxWithStrategies(checkbox);
                    if (success.checked) {
                        results.successful++;
                        results.strategies[checkbox.selector] = success.strategy;
                        this.log(`✅ Checked: ${checkbox.purpose} (${success.strategy})`);
                    } else {
                        results.failed++;
                        results.errors.push({
                            checkbox: checkbox.selector,
                            purpose: checkbox.purpose,
                            error: success.error
                        });
                    }
                } else if (checkbox.action === 'uncheck') {
                    await this.uncheckCheckboxWithStrategies(checkbox);
                    results.successful++;
                }
                
                // Delay between checkbox interactions
                await this.humanDelay(400, 800);
                
            } catch (error) {
                this.log(`❌ Error with checkbox ${checkbox.selector}: ${error.message}`);
                results.failed++;
                results.errors.push({
                    checkbox: checkbox.selector,
                    purpose: checkbox.purpose,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Check checkbox using multiple strategies
     */
    async checkCheckboxWithStrategies(checkbox) {
        const element = this.page.locator(checkbox.selector).first();
        
        for (const strategy of this.checkboxStrategies) {
            try {
                this.log(`🔄 Trying checkbox strategy: ${strategy}`);
                
                switch (strategy) {
                    case 'direct_check':
                        await element.check();
                        break;
                        
                    case 'click_element':
                        await element.click();
                        break;
                        
                    case 'click_parent':
                        const parent = element.locator('..');
                        await parent.click();
                        break;
                        
                    case 'click_label':
                        const labelFor = await element.getAttribute('id');
                        if (labelFor) {
                            await this.page.locator(`label[for="${labelFor}"]`).click();
                        } else {
                            await element.locator('..').locator('label').click();
                        }
                        break;
                        
                    case 'force_click':
                        await element.click({ force: true });
                        break;
                }
                
                // Verify checkbox was checked
                await this.humanDelay(200, 400);
                const isChecked = await element.isChecked();
                
                if (isChecked) {
                    return { checked: true, strategy: strategy };
                }
                
            } catch (error) {
                this.log(`❌ Checkbox strategy ${strategy} failed: ${error.message}`);
                continue;
            }
        }
        
        return { checked: false, error: 'All checkbox strategies failed' };
    }

    /**
     * Enhanced validation with better error detection
     */
    async enhancedValidation() {
        this.log('🔍 Enhanced form validation...');
        
        // Wait for validation to trigger
        await this.humanDelay(1000, 2000);
        
        const errors = [];
        
        // Multiple error detection strategies
        const errorSelectors = [
            // Common error class patterns
            '.error', '.invalid', '.has-error', '.field-error', '.form-error',
            '.validation-error', '.help-block.error', '.error-message',
            '[class*="error"]', '[class*="invalid"]', '[class*="danger"]',
            
            // Bootstrap and framework patterns
            '.alert-danger', '.text-danger', '.text-error', '.is-invalid',
            '.has-danger', '.form-control-feedback', '.invalid-feedback',
            
            // Semantic patterns
            '[role="alert"]', '[aria-invalid="true"]', '.field[data-error]',
            
            // Common ID patterns
            '#error', '#errors', '[id*="error"]', '[id*="validation"]'
        ];
        
        for (const selector of errorSelectors) {
            try {
                const errorElements = await this.page.locator(selector).all();
                
                for (const errorElement of errorElements) {
                    const isVisible = await errorElement.isVisible();
                    if (isVisible) {
                        const text = await errorElement.textContent();
                        if (text && text.trim() && text.length > 2) {
                            errors.push({
                                selector: selector,
                                message: text.trim(),
                                element: errorElement
                            });
                        }
                    }
                }
            } catch (e) {
                // Continue checking other selectors
            }
        }
        
        // Also check for field-specific validation states
        await this.checkFieldValidationStates(errors);
        
        // Remove duplicate errors
        const uniqueErrors = this.deduplicateErrors(errors);
        
        this.log(`🔍 Enhanced validation found ${uniqueErrors.length} errors`);
        
        return {
            success: uniqueErrors.length === 0,
            errors: uniqueErrors,
            errorCount: uniqueErrors.length
        };
    }

    /**
     * Check individual field validation states
     */
    async checkFieldValidationStates(errors) {
        for (const field of this.formAnalysis.fields) {
            if (!field.selectorValid) continue;
            
            try {
                const element = this.page.locator(field.selector).first();
                
                // Check aria-invalid
                const ariaInvalid = await element.getAttribute('aria-invalid');
                if (ariaInvalid === 'true') {
                    errors.push({
                        selector: field.selector,
                        message: `Field ${field.purpose} is invalid (aria-invalid)`,
                        fieldSpecific: true
                    });
                }
                
                // Check validation message
                const validationMessage = await element.evaluate(el => el.validationMessage);
                if (validationMessage) {
                    errors.push({
                        selector: field.selector,
                        message: validationMessage,
                        fieldSpecific: true
                    });
                }
                
                // Check for error classes on the field itself
                const className = await element.getAttribute('class') || '';
                if (className.includes('error') || className.includes('invalid')) {
                    errors.push({
                        selector: field.selector,
                        message: `Field ${field.purpose} has error class`,
                        fieldSpecific: true
                    });
                }
                
            } catch (e) {
                // Continue with other fields
            }
        }
    }

    /**
     * Deduplicate error messages
     */
    deduplicateErrors(errors) {
        const seen = new Set();
        return errors.filter(error => {
            const key = error.message.toLowerCase().trim();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Enhanced error recovery
     */
    async performErrorRecovery(userData, errors) {
        this.log(`🔧 Performing error recovery for ${errors.length} errors...`);
        
        let recoveredErrors = 0;
        
        for (const error of errors) {
            try {
                this.log(`🔧 Attempting to fix: ${error.message}`);
                
                const fixStrategy = this.analyzeErrorForEnhancedFix(error.message);
                
                switch (fixStrategy.action) {
                    case 'retry_field':
                        await this.retrySpecificField(fixStrategy.fieldType, userData);
                        recoveredErrors++;
                        break;
                        
                    case 'check_required':
                        await this.ensureRequiredFieldsFilledEnhanced(userData);
                        recoveredErrors++;
                        break;
                        
                    case 'fix_format':
                        await this.fixFieldFormat(fixStrategy.fieldType, userData, fixStrategy.format);
                        recoveredErrors++;
                        break;
                        
                    case 'check_checkbox':
                        await this.ensureRequiredCheckboxesChecked();
                        recoveredErrors++;
                        break;
                }
                
                await this.humanDelay(this.timingPatterns.afterError.min, this.timingPatterns.afterError.max);
                
            } catch (fixError) {
                this.log(`❌ Failed to fix error: ${fixError.message}`);
            }
        }
        
        // Re-validate after recovery
        const revalidation = await this.enhancedValidation();
        
        this.log(`🔧 Error recovery: ${recoveredErrors}/${errors.length} errors addressed`);
        
        return {
            success: revalidation.errors.length < errors.length,
            errorsFixed: recoveredErrors,
            remainingErrors: revalidation.errors.length
        };
    }

    /**
     * Enhanced error analysis for better fix strategies
     */
    analyzeErrorForEnhancedFix(errorMessage) {
        const message = errorMessage.toLowerCase();
        
        // Enhanced pattern matching for error types
        if (message.includes('required') || message.includes('field is required') || message.includes('cannot be blank')) {
            return { action: 'check_required', fieldType: null };
        } else if (message.includes('email') && message.includes('invalid')) {
            return { action: 'fix_format', fieldType: 'email', format: 'email' };
        } else if (message.includes('password') && (message.includes('weak') || message.includes('requirements'))) {
            return { action: 'fix_format', fieldType: 'password', format: 'strong' };
        } else if (message.includes('phone') && message.includes('invalid')) {
            return { action: 'fix_format', fieldType: 'phone', format: 'phone' };
        } else if (message.includes('terms') || message.includes('agreement') || message.includes('accept')) {
            return { action: 'check_checkbox', fieldType: 'terms' };
        } else if (message.includes('email') && message.includes('match')) {
            return { action: 'retry_field', fieldType: 'confirmEmail' };
        } else if (message.includes('password') && message.includes('match')) {
            return { action: 'retry_field', fieldType: 'confirmPassword' };
        }
        
        return { action: 'check_required', fieldType: null };
    }

    /**
     * Enhanced field value generation
     */
    generateEnhancedFieldValue(purpose, userData, fieldInfo) {
        switch (purpose) {
            case 'email':
                return userData.email || this.generateRealisticEmail();
            case 'confirmEmail':
                return userData.email || this.generateRealisticEmail();
            case 'firstName':
                return userData.firstName || this.generateRealisticFirstName();
            case 'lastName':
                return userData.lastName || this.generateRealisticLastName();
            case 'fullName':
                return userData.fullName || `${userData.firstName || this.generateRealisticFirstName()} ${userData.lastName || this.generateRealisticLastName()}`;
            case 'password':
                return userData.password || this.generateStrongPassword();
            case 'confirmPassword':
                return userData.password || this.generateStrongPassword();
            case 'phone':
                return userData.phone || this.generateRealisticPhone();
            case 'company':
                return userData.company || this.generateRealisticCompany();
            case 'address':
                return userData.address || this.generateRealisticAddress();
            case 'age':
                return userData.age?.toString() || this.generateRealisticAge();
            case 'gender':
                return userData.gender || this.generateRealisticGender();
            default:
                return this.generateValueByType(fieldInfo.type, userData);
        }
    }

    /**
     * Generate realistic values for unknown fields based on type
     */
    generateValueByType(type, userData) {
        switch (type) {
            case 'email':
                return this.generateRealisticEmail();
            case 'tel':
                return this.generateRealisticPhone();
            case 'number':
                return '25';
            case 'url':
                return 'https://example.com';
            case 'date':
                return '1990-01-01';
            case 'password':
                return this.generateStrongPassword();
            default:
                return userData.firstName || this.generateRealisticFirstName();
        }
    }

    /**
     * Generate realistic email
     */
    generateRealisticEmail() {
        const names = ['john', 'jane', 'mike', 'sarah', 'david', 'emma', 'alex', 'lisa'];
        const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];
        const name = names[Math.floor(Math.random() * names.length)];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const number = Math.floor(Math.random() * 999) + 1;
        return `${name}${number}@${domain}`;
    }

    /**
     * Generate realistic first name
     */
    generateRealisticFirstName() {
        const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Alexander', 'Lisa', 'Robert', 'Maria'];
        return names[Math.floor(Math.random() * names.length)];
    }

    /**
     * Generate realistic last name
     */
    generateRealisticLastName() {
        const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        return names[Math.floor(Math.random() * names.length)];
    }

    /**
     * Generate strong password
     */
    generateStrongPassword() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one of each type
        password += 'A'; // uppercase
        password += 'a'; // lowercase
        password += '1'; // number
        password += '!'; // special
        
        // Fill remaining length
        for (let i = 4; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Shuffle the password
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    /**
     * Generate realistic phone number
     */
    generateRealisticPhone() {
        const areaCodes = ['555', '212', '310', '415', '312', '404', '617', '713'];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        const number = Math.floor(Math.random() * 9000000) + 1000000;
        return `+1-${areaCode}-${number.toString().substring(0, 3)}-${number.toString().substring(3)}`;
    }

    /**
     * Generate realistic company name
     */
    generateRealisticCompany() {
        const companies = ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Digital Dynamics', 'Innovation Labs', 'Future Systems'];
        return companies[Math.floor(Math.random() * companies.length)];
    }

    /**
     * Generate realistic address
     */
    generateRealisticAddress() {
        const numbers = Math.floor(Math.random() * 9999) + 1;
        const streets = ['Main St', 'First Ave', 'Oak Road', 'Park Lane', 'Cedar Blvd', 'Elm Street'];
        const street = streets[Math.floor(Math.random() * streets.length)];
        return `${numbers} ${street}`;
    }

    /**
     * Generate realistic age
     */
    generateRealisticAge() {
        return (Math.floor(Math.random() * 50) + 18).toString();
    }

    /**
     * Generate realistic gender
     */
    generateRealisticGender() {
        const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
        return genders[Math.floor(Math.random() * genders.length)];
    }

    /**
     * Enhanced honeypot detection
     */
    isEnhancedHoneypot(field) {
        // Check explicit honeypot marking
        const honeypotSelectors = this.formAnalysis.honeypots?.map(h => h.selector) || [];
        if (honeypotSelectors.includes(field.selector)) {
            return true;
        }
        
        // Check suspicious score
        if (field.suspiciousScore && field.suspiciousScore > 0.6) {
            return true;
        }
        
        // Check visibility
        if (!field.actuallyVisible) {
            return true;
        }
        
        // Enhanced pattern checking
        const fieldText = `${field.selector} ${field.purpose} ${field.reasoning}`.toLowerCase();
        const honeypotPatterns = [
            'honeypot', 'bot', 'spam', 'trap', 'winnie', 'hidden',
            'email_address', 'url', 'website', 'confirm_email'
        ];
        
        return honeypotPatterns.some(pattern => fieldText.includes(pattern));
    }

    /**
     * Sort fields by importance with enhanced criteria
     */
    sortFieldsByImportanceEnhanced(fields) {
        const importanceOrder = {
            'critical': 4,
            'important': 3,
            'optional': 2,
            'unknown': 1
        };
        
        const purposeOrder = {
            'email': 10,
            'password': 9,
            'firstName': 8,
            'lastName': 7,
            'fullName': 8,
            'confirmEmail': 6,
            'confirmPassword': 5,
            'phone': 4,
            'company': 3,
            'address': 2,
            'other': 1
        };
        
        return fields.sort((a, b) => {
            const aImportance = importanceOrder[a.importance] || 1;
            const bImportance = importanceOrder[b.importance] || 1;
            
            if (aImportance !== bImportance) {
                return bImportance - aImportance;
            }
            
            const aPurpose = purposeOrder[a.purpose] || 1;
            const bPurpose = purposeOrder[b.purpose] || 1;
            
            return bPurpose - aPurpose;
        });
    }

    /**
     * Check if a filled value is acceptable (handles minor differences)
     */
    isValueAcceptable(actualValue, expectedValue, field) {
        if (actualValue === expectedValue) return true;
        
        // Handle formatting differences for phone numbers
        if (field.type === 'tel' || field.purpose === 'phone') {
            const cleanActual = actualValue.replace(/\D/g, '');
            const cleanExpected = expectedValue.replace(/\D/g, '');
            return cleanActual === cleanExpected;
        }
        
        // Handle email case sensitivity
        if (field.type === 'email' || field.purpose === 'email') {
            return actualValue.toLowerCase() === expectedValue.toLowerCase();
        }
        
        // Handle trimming issues
        return actualValue.trim() === expectedValue.trim();
    }

    /**
     * Adaptive delay based on context
     */
    async adaptiveDelay(field, formState) {
        let baseDelay = this.timingPatterns.betweenFields;
        
        // Adjust delay based on field importance
        if (field.importance === 'critical') {
            baseDelay = { min: baseDelay.min * 1.2, max: baseDelay.max * 1.2 };
        }
        
        // Adjust delay based on form complexity
        if (formState.totalFields > 10) {
            baseDelay = { min: baseDelay.min * 0.8, max: baseDelay.max * 0.8 };
        }
        
        // Add some randomness
        await this.humanDelay(baseDelay.min, baseDelay.max);
    }

    /**
     * Simulate reading behavior
     */
    async simulateReading() {
        if (!this.options.humanLikeDelays) return;
        
        // Simulate reading the form
        await this.humanDelay(this.timingPatterns.reading.min, this.timingPatterns.reading.max);
    }

    /**
     * Type text character by character with realistic patterns
     */
    async typeCharacterByCharacter(element, text) {
        await element.clear();
        
        for (let i = 0; i < text.length; i++) {
            await element.type(text[i]);
            
            // Variable delay with occasional longer pauses (thinking)
            let delay = this.timingPatterns.typing.min + 
                       Math.random() * (this.timingPatterns.typing.max - this.timingPatterns.typing.min);
            
            // Occasionally pause longer (thinking or re-reading)
            if (Math.random() < 0.1) {
                delay *= 3;
            }
            
            await this.page.waitForTimeout(delay);
        }
    }

    /**
     * Type with human-like patterns including bursts and pauses
     */
    async typeHumanLike(element, text) {
        await element.clear();
        
        let i = 0;
        while (i < text.length) {
            // Determine burst length
            const burstLength = Math.min(
                this.timingPatterns.typing.burst,
                text.length - i
            );
            
            // Type a burst of characters
            for (let j = 0; j < burstLength && i < text.length; j++, i++) {
                await element.type(text[i]);
                await this.page.waitForTimeout(
                    this.timingPatterns.typing.min + 
                    Math.random() * (this.timingPatterns.typing.max - this.timingPatterns.typing.min)
                );
            }
            
            // Pause between bursts
            if (i < text.length) {
                await this.humanDelay(100, 300);
            }
        }
    }

    /**
     * Enhanced human-like delay
     */
    async humanDelay(min, max) {
        if (!this.options.humanLikeDelays) return;
        
        const delay = min + Math.random() * (max - min);
        
        // Add occasional longer delays to simulate distractions
        const finalDelay = Math.random() < 0.05 ? delay * 2 : delay;
        
        await this.page.waitForTimeout(Math.round(finalDelay));
    }

    /**
     * Enhanced form submission
     */
    async submitFormEnhanced() {
        this.log('📤 Enhanced form submission...');
        
        if (!this.formAnalysis.submitButton || !this.formAnalysis.submitButton.selectorValid) {
            throw new Error('No valid submit button found');
        }
        
        // Pre-submission delay (user reviewing)
        await this.humanDelay(this.timingPatterns.beforeSubmit.min, this.timingPatterns.beforeSubmit.max);
        
        const submitButton = this.page.locator(this.formAnalysis.submitButton.selector).first();
        
        // Scroll to submit button
        await submitButton.scrollIntoViewIfNeeded();
        await this.humanDelay(500, 1000);
        
        // Final review pause
        await this.humanDelay(1000, 2000);
        
        // Click submit with retry logic
        let submitted = false;
        const maxAttempts = 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await submitButton.click();
                submitted = true;
                break;
            } catch (error) {
                this.log(`❌ Submit attempt ${attempt} failed: ${error.message}`);
                if (attempt < maxAttempts) {
                    await this.humanDelay(1000, 2000);
                }
            }
        }
        
        if (!submitted) {
            throw new Error('Failed to submit form after multiple attempts');
        }
        
        this.log('✅ Form submitted successfully');
        
        // Wait for response
        try {
            await Promise.race([
                this.page.waitForNavigation({ timeout: 15000 }),
                this.page.waitForSelector('.success, .error, .message, .alert', { timeout: 15000 }),
                this.page.waitForURL('**', { timeout: 15000 })
            ]);
        } catch (e) {
            this.log('⚠️ No clear response detected, continuing');
        }
    }

    /**
     * Generate enhanced summary
     */
    generateEnhancedSummary(fieldResults, checkboxResults, validationResult) {
        return {
            totalFieldsProcessed: fieldResults.successful + fieldResults.failed,
            fieldsSuccessful: fieldResults.successful,
            fieldsFailed: fieldResults.failed,
            honepotsAvoided: fieldResults.honepotsSkipped,
            checkboxesHandled: checkboxResults.successful,
            validationErrors: validationResult.errorCount,
            errorRecoveryPerformed: validationResult.recovered || false,
            overallSuccess: fieldResults.successful > 0 && validationResult.errorCount === 0,
            fillStrategiesUsed: Object.keys(fieldResults.strategies || {}),
            checkboxStrategiesUsed: Object.keys(checkboxResults.strategies || {})
        };
    }

    /**
     * Enhanced results logging
     */
    logEnhancedResults(results) {
        this.log('📊 ENHANCED FORM FILLING RESULTS:');
        this.log(`   ✅ Fields processed: ${results.fieldsProcessed}/${results.formState.totalFields}`);
        this.log(`   ☑️ Checkboxes handled: ${results.checkboxesProcessed}`);
        this.log(`   🍯 Honeypots avoided: ${results.honepotsSkipped}`);
        this.log(`   ⚠️ Validation errors: ${results.validationErrors}`);
        this.log(`   🔧 Error recovery: ${results.errorRecoveryAttempted ? 'Yes' : 'No'}`);
        this.log(`   📊 Success rate: ${((results.fieldsProcessed / Math.max(results.formState.totalFields, 1)) * 100).toFixed(1)}%`);
    }

    /**
     * Mask sensitive values for logging
     */
    maskSensitiveValue(value, fieldPurpose) {
        if (['password', 'confirmPassword'].includes(fieldPurpose)) {
            return '*'.repeat(Math.min(value.length, 12));
        } else if (fieldPurpose === 'email') {
            const [local, domain] = value.split('@');
            return `${local.substring(0, 2)}***@${domain}`;
        }
        return value;
    }

    /**
     * Ensure required fields are filled enhanced
     */
    async ensureRequiredFieldsFilledEnhanced(userData) {
        const requiredFields = this.formAnalysis.fields.filter(f => 
            (f.required || f.importance === 'critical') && f.selectorValid
        );
        
        for (const field of requiredFields) {
            try {
                const element = this.page.locator(field.selector).first();
                const currentValue = await element.inputValue();
                
                if (!currentValue || currentValue.trim() === '') {
                    this.log(`🔄 Re-filling required field: ${field.purpose}`);
                    const value = this.generateEnhancedFieldValue(field.purpose, userData, field);
                    if (value) {
                        await this.fillFieldWithStrategies(field, value);
                    }
                }
            } catch (e) {
                this.log(`❌ Failed to check required field ${field.selector}: ${e.message}`);
            }
        }
    }

    /**
     * Ensure required checkboxes are checked
     */
    async ensureRequiredCheckboxesChecked() {
        const requiredCheckboxes = this.formAnalysis.checkboxes?.filter(c => 
            c.importance === 'critical' && c.action === 'check' && c.selectorValid
        ) || [];
        
        for (const checkbox of requiredCheckboxes) {
            try {
                const element = this.page.locator(checkbox.selector).first();
                const isChecked = await element.isChecked();
                
                if (!isChecked) {
                    this.log(`🔄 Re-checking required checkbox: ${checkbox.purpose}`);
                    await this.checkCheckboxWithStrategies(checkbox);
                }
            } catch (e) {
                this.log(`❌ Failed to check required checkbox ${checkbox.selector}: ${e.message}`);
            }
        }
    }

    /**
     * Fix field format
     */
    async fixFieldFormat(fieldType, userData, format) {
        const fields = this.formAnalysis.fields.filter(f => 
            f.purpose.includes(fieldType) || f.type === fieldType
        );
        
        for (const field of fields) {
            try {
                let value;
                switch (format) {
                    case 'email':
                        value = this.generateRealisticEmail();
                        break;
                    case 'phone':
                        value = this.generateRealisticPhone();
                        break;
                    case 'strong':
                        value = this.generateStrongPassword();
                        break;
                    default:
                        value = this.generateEnhancedFieldValue(field.purpose, userData, field);
                }
                
                if (value) {
                    this.log(`🔧 Fixing field format: ${field.purpose} with ${format} format`);
                    await this.fillFieldWithStrategies(field, value);
                }
            } catch (e) {
                this.log(`❌ Failed to fix format for ${field.selector}: ${e.message}`);
            }
        }
    }

    /**
     * Retry specific field
     */
    async retrySpecificField(fieldType, userData) {
        const fieldsToRetry = this.formAnalysis.fields.filter(f => 
            f.purpose.includes(fieldType) || f.type === fieldType
        );
        
        for (const field of fieldsToRetry) {
            try {
                this.log(`🔄 Retrying field: ${field.purpose}`);
                const value = this.generateEnhancedFieldValue(field.purpose, userData, field);
                if (value) {
                    await this.fillFieldWithStrategies(field, value);
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
            console.log(`[EnhancedSmartFormFiller] ${message}`);
        }
    }
}

module.exports = EnhancedSmartFormFiller;