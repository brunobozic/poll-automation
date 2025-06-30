#!/usr/bin/env node

/**
 * Typeform-Specific Testing
 * Specialized testing for Typeform's unique interactive form system
 */

const { chromium } = require('playwright');

class TypeformSpecificTester {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async runTypeformTest() {
        console.log('🎯 TYPEFORM-SPECIFIC TESTING');
        console.log('='.repeat(60));

        try {
            // Initialize browser
            this.browser = await chromium.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1366, height: 768 }
            });

            this.page = await context.newPage();
            this.page.setDefaultTimeout(30000);

            // Navigate to Typeform
            console.log('🌐 Navigating to Typeform...');
            await this.page.goto('https://www.typeform.com', { waitUntil: 'networkidle' });

            // Wait for page to fully load
            await this.page.waitForTimeout(5000);

            // Comprehensive element analysis
            const analysis = await this.analyzeTypeformPage();
            console.log('📊 Typeform Analysis:', JSON.stringify(analysis, null, 2));

            // Try multiple interaction strategies
            const interactionResult = await this.attemptTypeformInteractions();
            console.log('🔄 Interaction Result:', JSON.stringify(interactionResult, null, 2));

            await this.browser.close();

        } catch (error) {
            console.error('❌ Typeform test failed:', error);
            if (this.browser) await this.browser.close();
        }
    }

    async analyzeTypeformPage() {
        return await this.page.evaluate(() => {
            // Comprehensive element detection
            const allElements = Array.from(document.querySelectorAll('*'));
            
            const analysis = {
                totalElements: allElements.length,
                inputs: [],
                buttons: [],
                links: [],
                forms: [],
                interactiveElements: [],
                specialElements: [],
                scripts: Array.from(document.querySelectorAll('script')).length,
                bodyClasses: document.body.className,
                pageTitle: document.title,
                url: window.location.href
            };

            // Analyze all elements
            allElements.forEach(el => {
                const tagName = el.tagName.toLowerCase();
                const classes = el.className || '';
                const id = el.id || '';
                const textContent = el.textContent?.trim() || '';
                
                // Input elements
                if (tagName === 'input' && el.type !== 'hidden') {
                    analysis.inputs.push({
                        type: el.type,
                        name: el.name,
                        id: el.id,
                        classes: el.className,
                        placeholder: el.placeholder,
                        visible: el.offsetWidth > 0 && el.offsetHeight > 0
                    });
                }

                // Buttons
                if (tagName === 'button' || (tagName === 'a' && textContent.length < 50)) {
                    analysis.buttons.push({
                        tagName,
                        text: textContent.substring(0, 100),
                        classes: el.className,
                        id: el.id,
                        visible: el.offsetWidth > 0 && el.offsetHeight > 0
                    });
                }

                // Interactive elements
                if (el.hasAttribute('contenteditable') || el.hasAttribute('role')) {
                    analysis.interactiveElements.push({
                        tagName,
                        role: el.getAttribute('role'),
                        contenteditable: el.getAttribute('contenteditable'),
                        classes: el.className,
                        visible: el.offsetWidth > 0 && el.offsetHeight > 0
                    });
                }

                // Special Typeform elements
                if (classes.includes('typeform') || 
                    classes.includes('form') || 
                    classes.includes('survey') ||
                    id.includes('typeform') ||
                    textContent.toLowerCase().includes('get started') ||
                    textContent.toLowerCase().includes('sign up')) {
                    
                    analysis.specialElements.push({
                        tagName,
                        text: textContent.substring(0, 100),
                        classes: el.className,
                        id: el.id,
                        visible: el.offsetWidth > 0 && el.offsetHeight > 0
                    });
                }
            });

            return analysis;
        });
    }

    async attemptTypeformInteractions() {
        const results = {
            strategiesAttempted: [],
            interactions: 0,
            fieldsCompleted: 0,
            errors: []
        };

        try {
            // Strategy 1: Look for "Get Started" or similar buttons
            console.log('🎯 Strategy 1: Get Started buttons...');
            const getStartedResult = await this.tryGetStartedButtons();
            results.strategiesAttempted.push({ name: 'GetStarted', result: getStartedResult });

            // Strategy 2: Look for sign up forms
            console.log('🎯 Strategy 2: Sign up forms...');
            const signUpResult = await this.trySignUpForms();
            results.strategiesAttempted.push({ name: 'SignUp', result: signUpResult });

            // Strategy 3: Scroll and search for hidden elements
            console.log('🎯 Strategy 3: Scroll and search...');
            const scrollResult = await this.tryScrollAndSearch();
            results.strategiesAttempted.push({ name: 'ScrollSearch', result: scrollResult });

            // Strategy 4: Try all clickable elements
            console.log('🎯 Strategy 4: All clickable elements...');
            const clickableResult = await this.tryAllClickableElements();
            results.strategiesAttempted.push({ name: 'AllClickable', result: clickableResult });

        } catch (error) {
            results.errors.push(error.message);
        }

        return results;
    }

    async tryGetStartedButtons() {
        try {
            const buttons = await this.page.locator('button, [role="button"], a').all();
            
            for (const button of buttons) {
                try {
                    if (await button.isVisible()) {
                        const text = await button.textContent() || '';
                        
                        if (text.toLowerCase().includes('get started') ||
                            text.toLowerCase().includes('try free') ||
                            text.toLowerCase().includes('sign up') ||
                            text.toLowerCase().includes('start')) {
                            
                            console.log(`   🔸 Clicking: "${text}"`);
                            await button.click();
                            await this.page.waitForTimeout(3000);
                            
                            // Check for new form elements
                            const newInputs = await this.page.locator('input, textarea, [contenteditable]').count();
                            if (newInputs > 0) {
                                return { success: true, action: `Clicked "${text}"`, newElements: newInputs };
                            }
                        }
                    }
                } catch (buttonError) {
                    continue;
                }
            }
            
            return { success: false, message: 'No effective get started buttons found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async trySignUpForms() {
        try {
            // Look for email inputs specifically
            const emailInputs = await this.page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').all();
            
            for (const input of emailInputs) {
                try {
                    if (await input.isVisible()) {
                        await input.click();
                        await input.fill('typeform-test@example.com');
                        console.log('   ✅ Filled email field');
                        return { success: true, action: 'Filled email field' };
                    }
                } catch (inputError) {
                    continue;
                }
            }
            
            return { success: false, message: 'No email inputs found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async tryScrollAndSearch() {
        try {
            // Scroll down to trigger any lazy loading
            await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await this.page.waitForTimeout(2000);

            // Scroll back up
            await this.page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            await this.page.waitForTimeout(2000);

            // Look for any new elements
            const elementCount = await this.page.locator('input, textarea, button, [role="button"]').count();
            
            return { success: elementCount > 0, elementCount };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async tryAllClickableElements() {
        try {
            const clickableElements = await this.page.locator('button, [role="button"], a, [onclick], [cursor="pointer"]').all();
            
            for (let i = 0; i < Math.min(clickableElements.length, 10); i++) {
                try {
                    const element = clickableElements[i];
                    
                    if (await element.isVisible()) {
                        const text = await element.textContent() || '';
                        console.log(`   🔸 Trying clickable: "${text.substring(0, 50)}"`);
                        
                        await element.click();
                        await this.page.waitForTimeout(2000);
                        
                        // Check for form elements
                        const formElements = await this.page.locator('input:not([type="hidden"]), textarea').count();
                        if (formElements > 0) {
                            return { success: true, action: `Clicked "${text}"`, formElements };
                        }
                    }
                } catch (elementError) {
                    continue;
                }
            }
            
            return { success: false, message: 'No effective clickable elements found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const tester = new TypeformSpecificTester();
    tester.runTypeformTest()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = TypeformSpecificTester;