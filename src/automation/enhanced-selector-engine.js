/**
 * Enhanced Selector Engine
 * Implements robust fallback selector strategies based on feedback loop learning
 */

class EnhancedSelectorEngine {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            timeout: 30000,
            adaptiveTimeout: true,
            enableFallbacks: true,
            enableLearning: true,
            debugMode: false,
            ...options
        };
        
        // Learned selector patterns from feedback loop analysis
        this.selectorPatterns = {
            submit: [
                'button[type="submit"]',
                'input[type="submit"]',
                'button[data-submit="true"]',
                'button.btn-submit',
                'button.submit-button',
                'button.submit-btn',
                '[data-testid="submit"]',
                '[data-testid="submit-button"]',
                'button:has-text("Submit")',
                'button:has-text("Continue")',
                'button:has-text("Next")',
                'button:has-text("Register")',
                'button:has-text("Sign up")',
                'button:has-text("Sign Up")',
                '.submit-container button',
                '.form-actions button:last-child',
                'form button:not([type="button"]):not([type="reset"])'
            ],
            
            email: [
                'input[type="email"]',
                'input[name="email"]',
                'input[id="email"]',
                'input[placeholder*="email" i]',
                'input[aria-label*="email" i]',
                'input[data-testid="email"]',
                'input[data-field="email"]',
                '#email',
                '.email-field input',
                '.email input',
                '[data-cy="email"]',
                'input[name*="email" i]',
                'input[id*="email" i]'
            ],
            
            password: [
                'input[type="password"]',
                'input[name="password"]',
                'input[id="password"]',
                'input[placeholder*="password" i]',
                'input[aria-label*="password" i]',
                'input[data-testid="password"]',
                'input[data-field="password"]',
                '#password',
                '.password-field input',
                '.password input',
                '[data-cy="password"]',
                'input[name*="password" i]',
                'input[id*="password" i]'
            ],
            
            firstName: [
                'input[name="firstName"]',
                'input[name="first_name"]',
                'input[name="fname"]',
                'input[id="firstName"]',
                'input[id="first_name"]',
                'input[placeholder*="first name" i]',
                'input[placeholder*="first" i]',
                'input[aria-label*="first name" i]',
                'input[data-testid="first-name"]',
                'input[data-field="firstName"]',
                '#firstName',
                '#first_name',
                '.first-name input',
                '.firstname input'
            ],
            
            lastName: [
                'input[name="lastName"]',
                'input[name="last_name"]',
                'input[name="lname"]',
                'input[id="lastName"]',
                'input[id="last_name"]',
                'input[placeholder*="last name" i]',
                'input[placeholder*="last" i]',
                'input[aria-label*="last name" i]',
                'input[data-testid="last-name"]',
                'input[data-field="lastName"]',
                '#lastName',
                '#last_name',
                '.last-name input',
                '.lastname input'
            ],
            
            cookieAccept: [
                'button:has-text("Accept")',
                'button:has-text("Accept All")',
                'button:has-text("Accept all cookies")',
                'button:has-text("Allow all")',
                'button:has-text("OK")',
                'button:has-text("I understand")',
                'button:has-text("Continue")',
                'button:has-text("Agree")',
                '[data-testid*="accept"]',
                '[data-testid*="Allow"]',
                '#cookie-accept',
                '.cookie-accept',
                '.accept-cookies',
                '[id*="accept"]',
                '[class*="accept"]',
                '.fides-accept-all-button',
                'button[data-testid="Accept all-btn"]'
            ]
        };
        
        // Honeypot patterns to avoid (learned from feedback loop)
        this.honeypotPatterns = [
            'input[style*="display:none"]',
            'input[style*="visibility:hidden"]',
            'input[style*="opacity:0"]',
            'input[style*="width:0"]',
            'input[style*="height:0"]',
            'input[tabindex="-1"]',
            'input[name*="bot"]',
            'input[name*="spam"]',
            'input[name*="honeypot"]',
            'input[name*="trap"]',
            'input[name*="hidden"]',
            'input[name*="website"]',
            'input[name*="url"]',
            'input[class*="honeypot"]',
            'input[class*="bot-trap"]',
            'input[class*="spam-trap"]',
            'input[class*="hidden"]'
        ];
        
        this.stats = {
            totalAttempts: 0,
            successfulSelections: 0,
            fallbacksUsed: 0,
            learnedPatterns: 0
        };
    }
    
    /**
     * Enhanced element finder with fallback strategies
     */
    async findElement(purpose, customSelectors = []) {
        this.stats.totalAttempts++;
        
        if (this.options.debugMode) {
            console.log(`🔍 Finding element for purpose: ${purpose}`);
        }
        
        // Combine custom selectors with learned patterns
        const selectors = [...customSelectors, ...(this.selectorPatterns[purpose] || [])];
        
        if (selectors.length === 0) {
            throw new Error(`No selectors defined for purpose: ${purpose}`);
        }
        
        // Try each selector with adaptive timeout
        for (let i = 0; i < selectors.length; i++) {
            const selector = selectors[i];
            
            try {
                // Check if this might be a honeypot
                if (await this.isLikelyHoneypot(selector)) {
                    if (this.options.debugMode) {
                        console.log(`⚠️ Skipping potential honeypot: ${selector}`);
                    }
                    continue;
                }
                
                // Calculate adaptive timeout (shorter for fallbacks)
                const timeout = this.calculateAdaptiveTimeout(i, selectors.length);
                
                if (this.options.debugMode) {
                    console.log(`   Trying selector ${i + 1}/${selectors.length}: ${selector} (timeout: ${timeout}ms)`);
                }
                
                const element = await this.page.locator(selector).first();
                
                // Check if element is visible and interactable
                if (await element.isVisible({ timeout })) {
                    // Additional validation
                    if (await this.validateElement(element, purpose)) {
                        this.stats.successfulSelections++;
                        if (i > 0) this.stats.fallbacksUsed++;
                        
                        if (this.options.debugMode) {
                            console.log(`   ✅ Found element with selector: ${selector}`);
                        }
                        
                        // Learn from successful pattern
                        await this.learnFromSuccess(purpose, selector, i);
                        
                        return { element, selector, fallbackIndex: i };
                    }
                }
                
            } catch (error) {
                // Continue to next selector
                if (this.options.debugMode) {
                    console.log(`   ❌ Selector failed: ${selector} - ${error.message}`);
                }
            }
        }
        
        // All selectors failed - try intelligent discovery
        if (this.options.enableFallbacks) {
            const discoveredElement = await this.intelligentElementDiscovery(purpose);
            if (discoveredElement) {
                this.stats.successfulSelections++;
                this.stats.fallbacksUsed++;
                return discoveredElement;
            }
        }
        
        throw new Error(`Element not found for purpose '${purpose}' after trying ${selectors.length} selectors`);
    }
    
    /**
     * Check if selector is likely a honeypot
     */
    async isLikelyHoneypot(selector) {
        try {
            for (const honeypotPattern of this.honeypotPatterns) {
                if (selector.includes(honeypotPattern) || 
                    await this.page.locator(honeypotPattern).and(this.page.locator(selector)).count() > 0) {
                    return true;
                }
            }
            
            // Additional runtime honeypot detection
            const element = await this.page.locator(selector).first();
            if (await element.count() > 0) {
                const box = await element.boundingBox();
                const isHidden = !box || box.width === 0 || box.height === 0;
                
                if (isHidden) {
                    return true;
                }
                
                // Check computed styles
                const styles = await element.evaluate(el => {
                    const computed = window.getComputedStyle(el);
                    return {
                        display: computed.display,
                        visibility: computed.visibility,
                        opacity: computed.opacity,
                        position: computed.position,
                        left: computed.left,
                        top: computed.top
                    };
                });
                
                if (styles.display === 'none' || 
                    styles.visibility === 'hidden' || 
                    parseFloat(styles.opacity) === 0 ||
                    (styles.position === 'absolute' && (styles.left === '-9999px' || styles.top === '-9999px'))) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            // If we can't determine, assume it's not a honeypot
            return false;
        }
    }
    
    /**
     * Validate that found element is appropriate for the purpose
     */
    async validateElement(element, purpose) {
        try {
            const elementInfo = await element.evaluate(el => ({
                tagName: el.tagName.toLowerCase(),
                type: el.type || '',
                name: el.name || '',
                id: el.id || '',
                className: el.className || '',
                placeholder: el.placeholder || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                textContent: el.textContent?.toLowerCase() || ''
            }));
            
            // Validation rules based on purpose
            switch (purpose) {
                case 'email':
                    return elementInfo.type === 'email' || 
                           elementInfo.name.includes('email') ||
                           elementInfo.placeholder.includes('email') ||
                           elementInfo.ariaLabel.includes('email');
                           
                case 'password':
                    return elementInfo.type === 'password' ||
                           elementInfo.name.includes('password') ||
                           elementInfo.placeholder.includes('password') ||
                           elementInfo.ariaLabel.includes('password');
                           
                case 'submit':
                    return (elementInfo.tagName === 'button' && 
                           (elementInfo.type === 'submit' || 
                            elementInfo.textContent.includes('submit') ||
                            elementInfo.textContent.includes('continue') ||
                            elementInfo.textContent.includes('register') ||
                            elementInfo.textContent.includes('sign up'))) ||
                           (elementInfo.tagName === 'input' && elementInfo.type === 'submit');
                           
                default:
                    return true; // No specific validation for other purposes
            }
        } catch (error) {
            // If validation fails, assume element is valid
            return true;
        }
    }
    
    /**
     * Calculate adaptive timeout based on fallback index
     */
    calculateAdaptiveTimeout(index, totalSelectors) {
        if (!this.options.adaptiveTimeout) {
            return this.options.timeout;
        }
        
        // Shorter timeouts for fallback selectors
        const baseTimeout = this.options.timeout;
        const reductionFactor = Math.min(0.8, index * 0.1);
        return Math.max(5000, baseTimeout * (1 - reductionFactor));
    }
    
    /**
     * Learn from successful selector patterns
     */
    async learnFromSuccess(purpose, selector, fallbackIndex) {
        if (!this.options.enableLearning) return;
        
        try {
            // If a fallback selector worked, promote it
            if (fallbackIndex > 0 && this.selectorPatterns[purpose]) {
                const patterns = this.selectorPatterns[purpose];
                const successfulSelector = patterns[fallbackIndex];
                
                // Move successful selector higher in priority
                patterns.splice(fallbackIndex, 1);
                patterns.splice(Math.max(0, fallbackIndex - 1), 0, successfulSelector);
                
                this.stats.learnedPatterns++;
                
                if (this.options.debugMode) {
                    console.log(`📚 Learned: Promoted selector '${successfulSelector}' for purpose '${purpose}'`);
                }
            }
        } catch (error) {
            // Learning errors shouldn't break the flow
            console.warn(`⚠️ Learning error: ${error.message}`);
        }
    }
    
    /**
     * Intelligent element discovery when all selectors fail
     */
    async intelligentElementDiscovery(purpose) {
        if (this.options.debugMode) {
            console.log(`🧠 Attempting intelligent discovery for: ${purpose}`);
        }
        
        try {
            switch (purpose) {
                case 'submit':
                    return await this.discoverSubmitButton();
                case 'email':
                    return await this.discoverEmailField();
                case 'password':
                    return await this.discoverPasswordField();
                case 'cookieAccept':
                    return await this.discoverCookieButton();
                default:
                    return null;
            }
        } catch (error) {
            if (this.options.debugMode) {
                console.log(`❌ Intelligent discovery failed: ${error.message}`);
            }
            return null;
        }
    }
    
    /**
     * Discover submit button using semantic analysis
     */
    async discoverSubmitButton() {
        // Look for buttons with submit-like text
        const submitTexts = ['submit', 'continue', 'next', 'register', 'sign up', 'create account', 'join', 'proceed'];
        
        for (const text of submitTexts) {
            try {
                const element = await this.page.locator(`button:has-text("${text}")`).first();
                if (await element.isVisible({ timeout: 5000 })) {
                    const selector = `button:has-text("${text}")`;
                    
                    // Add to learned patterns
                    if (this.selectorPatterns.submit && !this.selectorPatterns.submit.includes(selector)) {
                        this.selectorPatterns.submit.unshift(selector);
                        this.stats.learnedPatterns++;
                    }
                    
                    return { element, selector, fallbackIndex: -1, discovered: true };
                }
            } catch (error) {
                continue;
            }
        }
        
        // Look for last button in form
        try {
            const formButtons = await this.page.locator('form button').all();
            if (formButtons.length > 0) {
                const lastButton = formButtons[formButtons.length - 1];
                if (await lastButton.isVisible()) {
                    const selector = 'form button:last-child';
                    return { element: lastButton, selector, fallbackIndex: -1, discovered: true };
                }
            }
        } catch (error) {
            // Continue to next strategy
        }
        
        return null;
    }
    
    /**
     * Discover email field using semantic analysis
     */
    async discoverEmailField() {
        // Look for input fields with email-like attributes
        const emailPatterns = [
            'input[placeholder*="@"]',
            'input[placeholder*="email" i]',
            'input[aria-label*="email" i]',
            'input[title*="email" i]'
        ];
        
        for (const pattern of emailPatterns) {
            try {
                const element = await this.page.locator(pattern).first();
                if (await element.isVisible({ timeout: 5000 })) {
                    return { element, selector: pattern, fallbackIndex: -1, discovered: true };
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }
    
    /**
     * Discover password field
     */
    async discoverPasswordField() {
        // Look for password-like patterns
        const passwordPatterns = [
            'input[placeholder*="password" i]',
            'input[aria-label*="password" i]',
            'input[title*="password" i]'
        ];
        
        for (const pattern of passwordPatterns) {
            try {
                const element = await this.page.locator(pattern).first();
                if (await element.isVisible({ timeout: 5000 })) {
                    return { element, selector: pattern, fallbackIndex: -1, discovered: true };
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }
    
    /**
     * Discover cookie accept button
     */
    async discoverCookieButton() {
        // Look for cookie-related elements
        const cookieTexts = ['accept', 'allow', 'ok', 'agree', 'continue', 'i understand'];
        
        for (const text of cookieTexts) {
            try {
                // Look in cookie banners or modals
                const selectors = [
                    `[class*="cookie"] button:has-text("${text}")`,
                    `[class*="banner"] button:has-text("${text}")`,
                    `[class*="consent"] button:has-text("${text}")`,
                    `[id*="cookie"] button:has-text("${text}")`,
                    `button:has-text("${text}")`
                ];
                
                for (const selector of selectors) {
                    const element = await this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 3000 })) {
                        return { element, selector, fallbackIndex: -1, discovered: true };
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }
    
    /**
     * Enhanced click with human-like behavior
     */
    async clickElement(elementResult, options = {}) {
        const { element } = elementResult;
        
        try {
            // Ensure element is ready
            await element.waitFor({ state: 'visible', timeout: 10000 });
            
            // Human-like delay
            if (this.options.humanLikeDelays) {
                await this.page.waitForTimeout(Math.random() * 500 + 200);
            }
            
            // Scroll into view if needed
            await element.scrollIntoViewIfNeeded();
            
            // Small delay after scroll
            await this.page.waitForTimeout(100);
            
            // Click with human-like positioning
            await element.click({
                position: {
                    x: Math.random() * 10 + 5,
                    y: Math.random() * 10 + 5
                },
                ...options
            });
            
            return true;
        } catch (error) {
            throw new Error(`Failed to click element: ${error.message}`);
        }
    }
    
    /**
     * Enhanced fill with human-like typing
     */
    async fillElement(elementResult, value, options = {}) {
        const { element } = elementResult;
        
        try {
            // Ensure element is ready
            await element.waitFor({ state: 'visible', timeout: 10000 });
            
            // Clear existing content
            await element.clear();
            
            // Human-like typing delay
            const delay = this.options.humanLikeDelays ? Math.random() * 50 + 25 : 0;
            
            // Type with human-like delays
            await element.fill(value, { ...options, delay });
            
            // Verify value was entered
            const enteredValue = await element.inputValue();
            if (enteredValue !== value) {
                throw new Error(`Value verification failed. Expected: ${value}, Got: ${enteredValue}`);
            }
            
            return true;
        } catch (error) {
            throw new Error(`Failed to fill element: ${error.message}`);
        }
    }
    
    /**
     * Get selector engine statistics
     */
    getStats() {
        const successRate = this.stats.totalAttempts > 0 ? 
            (this.stats.successfulSelections / this.stats.totalAttempts * 100).toFixed(1) : 0;
            
        return {
            ...this.stats,
            successRate: `${successRate}%`,
            fallbackUsageRate: this.stats.successfulSelections > 0 ? 
                `${(this.stats.fallbacksUsed / this.stats.successfulSelections * 100).toFixed(1)}%` : '0%'
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalAttempts: 0,
            successfulSelections: 0,
            fallbacksUsed: 0,
            learnedPatterns: 0
        };
    }
}

module.exports = EnhancedSelectorEngine;