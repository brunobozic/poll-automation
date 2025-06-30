/**
 * Intelligent Element Handler
 * Advanced element interaction with better visibility handling
 */

class IntelligentElementHandler {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            maxRetries: 3,
            scrollAttempts: 5,
            waitTimeout: 5000,
            interactionDelay: 300,
            ...options
        };
    }

    /**
     * Intelligently interact with an element, handling visibility issues
     */
    async interactWithElement(selector, action = 'click', value = null) {
        console.log(`🎯 Attempting to ${action} element: ${selector}`);
        
        for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
            try {
                console.log(`   Attempt ${attempt}/${this.options.maxRetries}`);
                
                // Find element with timeout
                const element = await this.findElementWithRetry(selector);
                if (!element) {
                    console.log(`   ❌ Element not found: ${selector}`);
                    continue;
                }
                
                // Check and improve visibility
                const visibility = await this.ensureElementVisibility(element);
                if (!visibility.success) {
                    console.log(`   ⚠️ Visibility issue: ${visibility.reason}`);
                    continue;
                }
                
                // Perform the action
                const actionResult = await this.performAction(element, action, value);
                if (actionResult.success) {
                    console.log(`   ✅ ${action} successful on ${selector}`);
                    return true;
                } else {
                    console.log(`   ❌ ${action} failed: ${actionResult.error}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < this.options.maxRetries) {
                    await this.page.waitForTimeout(this.options.interactionDelay * attempt);
                }
            }
        }
        
        console.log(`❌ All attempts failed for ${selector}`);
        return false;
    }

    /**
     * Find element with retry logic
     */
    async findElementWithRetry(selector) {
        for (let i = 0; i < 3; i++) {
            try {
                const element = await this.page.$(selector);
                if (element) return element;
                
                // Wait and try again
                await this.page.waitForTimeout(500);
            } catch (error) {
                // Selector might be invalid, try alternatives
                if (selector.includes(':has-text')) {
                    // Convert to alternative selector
                    const text = selector.match(/:has-text\("([^"]+)"\)/)?.[1];
                    if (text) {
                        try {
                            const altElement = await this.page.locator(`text=${text}`).first();
                            return await altElement.elementHandle();
                        } catch (e) {
                            // Alternative also failed
                        }
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Ensure element is visible and interactable
     */
    async ensureElementVisibility(element) {
        try {
            // Check basic visibility
            const isVisible = await element.isVisible();
            if (!isVisible) {
                // Try to make visible by scrolling
                const scrollResult = await this.scrollToElement(element);
                if (!scrollResult.success) {
                    return { success: false, reason: 'Element not visible and scroll failed' };
                }
            }
            
            // Check if element is in viewport
            const inViewport = await element.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.top >= 0 && 
                       rect.left >= 0 && 
                       rect.bottom <= window.innerHeight && 
                       rect.right <= window.innerWidth;
            });
            
            if (!inViewport) {
                await element.scrollIntoViewIfNeeded({ timeout: this.options.waitTimeout });
            }
            
            // Check if element is enabled and not blocked
            const isInteractable = await element.evaluate(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                
                return !el.disabled && 
                       style.pointerEvents !== 'none' &&
                       style.display !== 'none' &&
                       style.visibility !== 'hidden' &&
                       style.opacity !== '0' &&
                       rect.width > 0 && 
                       rect.height > 0;
            });
            
            if (!isInteractable) {
                return { success: false, reason: 'Element not interactable' };
            }
            
            return { success: true };
            
        } catch (error) {
            return { success: false, reason: error.message };
        }
    }

    /**
     * Scroll to element with multiple strategies
     */
    async scrollToElement(element) {
        const strategies = [
            // Strategy 1: Standard scroll into view
            async () => {
                await element.scrollIntoViewIfNeeded({ timeout: 3000 });
                return await element.isVisible();
            },
            
            // Strategy 2: JavaScript scroll
            async () => {
                await element.evaluate(el => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                await this.page.waitForTimeout(1000);
                return await element.isVisible();
            },
            
            // Strategy 3: Page scroll to element
            async () => {
                const box = await element.boundingBox();
                if (box) {
                    await this.page.evaluate((y) => {
                        window.scrollTo({ top: y - window.innerHeight / 2, behavior: 'smooth' });
                    }, box.y);
                    await this.page.waitForTimeout(1000);
                    return await element.isVisible();
                }
                return false;
            },
            
            // Strategy 4: Parent scroll
            async () => {
                await element.evaluate(el => {
                    let parent = el.parentElement;
                    while (parent) {
                        if (parent.scrollHeight > parent.clientHeight) {
                            parent.scrollTop = el.offsetTop - parent.offsetTop;
                            break;
                        }
                        parent = parent.parentElement;
                    }
                });
                await this.page.waitForTimeout(1000);
                return await element.isVisible();
            }
        ];
        
        for (let i = 0; i < strategies.length; i++) {
            try {
                console.log(`   📜 Scroll strategy ${i + 1}`);
                const result = await strategies[i]();
                if (result) {
                    return { success: true, strategy: i + 1 };
                }
            } catch (error) {
                console.log(`   ⚠️ Scroll strategy ${i + 1} failed: ${error.message}`);
            }
        }
        
        return { success: false, reason: 'All scroll strategies failed' };
    }

    /**
     * Perform the specified action on the element
     */
    async performAction(element, action, value = null) {
        try {
            // Add small delay for stability
            await this.page.waitForTimeout(this.options.interactionDelay);
            
            switch (action.toLowerCase()) {
                case 'click':
                    await element.click();
                    break;
                    
                case 'fill':
                case 'type':
                    if (value === null) {
                        return { success: false, error: 'No value provided for fill action' };
                    }
                    
                    // Clear first, then fill
                    await element.click({ clickCount: 3 }); // Select all
                    await element.fill(''); // Clear
                    
                    if (action === 'type') {
                        await element.type(value, { delay: 50 });
                    } else {
                        await element.fill(value);
                    }
                    
                    // Trigger input events
                    await element.evaluate((el, val) => {
                        el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }, value);
                    break;
                    
                case 'select':
                    if (value === null) {
                        // Select first available option
                        const options = await element.$$('option');
                        if (options.length > 1) {
                            await element.selectOption({ index: 1 });
                        }
                    } else {
                        await element.selectOption(value);
                    }
                    break;
                    
                case 'check':
                    const isChecked = await element.isChecked();
                    if (!isChecked) {
                        await element.check();
                    }
                    break;
                    
                case 'uncheck':
                    const isCurrentlyChecked = await element.isChecked();
                    if (isCurrentlyChecked) {
                        await element.uncheck();
                    }
                    break;
                    
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
            
            // Verify action was successful
            await this.page.waitForTimeout(200);
            
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Batch interact with multiple elements
     */
    async batchInteract(interactions) {
        const results = [];
        
        for (const interaction of interactions) {
            const { selector, action, value, optional = false } = interaction;
            
            const result = await this.interactWithElement(selector, action, value);
            results.push({ selector, action, success: result });
            
            if (!result && !optional) {
                console.log(`❌ Critical interaction failed: ${selector}`);
                break;
            }
            
            // Small delay between interactions
            await this.page.waitForTimeout(200);
        }
        
        return results;
    }

    /**
     * Smart form filling with element detection
     */
    async smartFillForm(formData) {
        console.log('🎯 Starting smart form filling...');
        
        const results = {
            fieldsAttempted: 0,
            fieldsSuccessful: 0,
            errors: []
        };
        
        for (const [fieldType, fieldValue] of Object.entries(formData)) {
            const selectors = this.getSelectorsForFieldType(fieldType);
            let filled = false;
            
            for (const selector of selectors) {
                results.fieldsAttempted++;
                
                const success = await this.interactWithElement(selector, 'fill', fieldValue);
                if (success) {
                    results.fieldsSuccessful++;
                    filled = true;
                    break;
                }
            }
            
            if (!filled) {
                results.errors.push(`Failed to fill ${fieldType}`);
            }
        }
        
        console.log(`📊 Form filling: ${results.fieldsSuccessful}/${results.fieldsAttempted} fields filled`);
        return results;
    }

    /**
     * Get appropriate selectors for different field types
     */
    getSelectorsForFieldType(fieldType) {
        const selectorMap = {
            email: [
                'input[type="email"]',
                'input[name*="email"]',
                'input[id*="email"]',
                'input[placeholder*="email"]'
            ],
            name: [
                'input[name*="name"]',
                'input[id*="name"]',
                'input[placeholder*="name"]',
                'input[type="text"]'
            ],
            phone: [
                'input[type="tel"]',
                'input[name*="phone"]',
                'input[id*="phone"]',
                'input[placeholder*="phone"]'
            ],
            message: [
                'textarea',
                'input[name*="message"]',
                'input[name*="comment"]'
            ]
        };
        
        return selectorMap[fieldType] || ['input[type="text"]'];
    }
}

module.exports = IntelligentElementHandler;