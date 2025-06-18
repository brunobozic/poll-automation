/**
 * AI-Powered Submit Button Detector
 * Detects non-standard submit buttons, weird patterns, and anti-bot submit mechanisms
 * Uses AI to identify actual submission elements regardless of their implementation
 */

class SubmitButtonDetector {
    constructor(aiService, page) {
        this.ai = aiService;
        this.page = page;
        this.cache = new Map();
        
        // Common patterns for submit buttons (fallback)
        this.standardPatterns = [
            'button[type="submit"]',
            'input[type="submit"]', 
            'button:has-text("Submit")',
            'button:has-text("Continue")',
            'button:has-text("Next")',
            'button:has-text("Finish")',
            '.submit', '.continue', '.next', '.finish',
            '[data-submit]', '[data-continue]', '[data-next]'
        ];
    }

    /**
     * Main method: Find the actual submit button using AI analysis
     */
    async findSubmitButton(context = {}) {
        console.log('🔍 AI analyzing submit buttons...');

        const pageUrl = this.page.url();
        const cacheKey = `submit_${pageUrl}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
                console.log('🎯 Using cached submit button analysis');
                return cached.result;
            }
        }

        try {
            // Step 1: Extract all potential submit elements
            const candidates = await this.extractSubmitCandidates();
            
            // Step 2: Analyze page context for submit behavior
            const pageContext = await this.analyzePageContext();
            
            // Step 3: AI analysis to identify the real submit button
            const analysis = await this.analyzeSubmitButtons(candidates, pageContext, context);
            
            // Cache the result
            this.cache.set(cacheKey, {
                result: analysis,
                timestamp: Date.now()
            });
            
            return analysis;
            
        } catch (error) {
            console.error('AI submit detection failed:', error);
            return await this.fallbackDetection();
        }
    }

    /**
     * Extract all potential submit button candidates
     */
    async extractSubmitCandidates() {
        return await this.page.evaluate(() => {
            const candidates = [];
            
            // Expanded selectors for submit elements
            const selectors = [
                // Standard buttons
                'button', 'input[type="button"]', 'input[type="submit"]', 
                'a[href*="submit"]', 'a[href*="continue"]', 'a[href*="next"]',
                
                // Clickable divs/spans (common anti-bot pattern)
                'div[onclick]', 'span[onclick]', 'div[role="button"]', 'span[role="button"]',
                
                // Custom elements with submit-like classes
                '[class*="submit"]', '[class*="continue"]', '[class*="next"]', '[class*="finish"]',
                '[class*="proceed"]', '[class*="forward"]', '[class*="advance"]',
                
                // Data attributes
                '[data-action*="submit"]', '[data-role*="submit"]', '[data-click*="submit"]',
                
                // Form elements that might act as submitters
                'form [tabindex]', 'form [role="button"]',
                
                // Image submit buttons
                'input[type="image"]', 'img[onclick]',
                
                // SVG buttons (modern sites)
                'svg[onclick]', '[data-icon][onclick]'
            ];
            
            const allElements = [];
            selectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => allElements.push(el));
                } catch (e) {
                    // Some selectors might fail
                }
            });
            
            // Remove duplicates and analyze each element
            const uniqueElements = [...new Set(allElements)];
            
            uniqueElements.forEach((element, index) => {
                // Skip if not visible
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                
                if (rect.width === 0 || rect.height === 0 || 
                    style.display === 'none' || style.visibility === 'hidden') {
                    return;
                }
                
                const candidate = {
                    index,
                    tagName: element.tagName.toLowerCase(),
                    type: element.type || null,
                    text: element.textContent?.trim() || element.value || element.alt || '',
                    innerHTML: element.innerHTML.substring(0, 200),
                    
                    // Attributes
                    id: element.id,
                    className: element.className,
                    onclick: element.onclick ? element.onclick.toString().substring(0, 200) : null,
                    href: element.href || null,
                    
                    // Data attributes
                    dataAttributes: getDataAttributes(element),
                    
                    // Position and styling
                    boundingBox: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    
                    // Context
                    parentTagName: element.parentElement?.tagName.toLowerCase(),
                    isInForm: !!element.closest('form'),
                    formId: element.closest('form')?.id || null,
                    
                    // Behavioral indicators
                    hasClickListener: !!element.onclick || element.hasAttribute('onclick'),
                    hasSubmitType: element.type === 'submit',
                    hasSubmitClass: /submit|continue|next|finish|proceed/.test(element.className.toLowerCase()),
                    hasSubmitText: /submit|continue|next|finish|proceed|send|go|forward|advance|done|complete/.test(
                        (element.textContent || element.value || '').toLowerCase()
                    ),
                    
                    // Anti-bot indicators
                    isHidden: style.opacity < 0.1 || style.fontSize === '0px',
                    isPositionedOff: rect.x < -100 || rect.y < -100,
                    hasWeirdStyling: rect.width < 10 || rect.height < 10,
                    
                    // Generate selector
                    selector: generateSelector(element, index)
                };
                
                candidates.push(candidate);
            });
            
            function getDataAttributes(element) {
                const data = {};
                for (let attr of element.attributes) {
                    if (attr.name.startsWith('data-')) {
                        data[attr.name] = attr.value;
                    }
                }
                return data;
            }
            
            function generateSelector(element, index) {
                // Try to generate a reliable selector
                if (element.id) {
                    return `#${element.id}`;
                }
                
                if (element.className) {
                    const classes = element.className.split(' ').filter(c => c).slice(0, 2);
                    if (classes.length > 0) {
                        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
                    }
                }
                
                if (element.type) {
                    return `${element.tagName.toLowerCase()}[type="${element.type}"]`;
                }
                
                // Fallback to nth-of-type
                return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
            }
            
            return candidates;
        });
    }

    /**
     * Analyze the overall page context for submit behavior patterns
     */
    async analyzePageContext() {
        return await this.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                
                // Form context
                totalForms: document.querySelectorAll('form').length,
                formsWithRequiredFields: document.querySelectorAll('form:has([required])').length,
                unfilledRequiredFields: document.querySelectorAll('[required]:not([value])').length,
                
                // Question context  
                totalQuestions: document.querySelectorAll(
                    'input[type="radio"], input[type="checkbox"], select, textarea, input[type="text"]'
                ).length,
                answeredQuestions: document.querySelectorAll(
                    'input[type="radio"]:checked, input[type="checkbox"]:checked, select[value!=""], textarea[value!=""], input[type="text"][value!=""]'
                ).length,
                
                // Page state indicators
                hasProgressBar: !!document.querySelector('.progress, [role="progressbar"], .step-indicator'),
                hasErrorMessages: !!document.querySelector('.error, .invalid, [aria-invalid="true"]'),
                hasSuccessMessages: !!document.querySelector('.success, .valid, .complete'),
                
                // Content analysis
                bodyText: document.body.textContent.toLowerCase(),
                hasSubmitKeywords: /submit|continue|next|finish|complete|send|proceed/.test(
                    document.body.textContent.toLowerCase()
                ),
                
                // JavaScript frameworks
                hasReact: !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__),
                hasVue: !!(window.Vue || window.__VUE__),
                hasAngular: !!(window.angular || window.ng),
                
                // Page timing
                loadTime: performance.now(),
                readyState: document.readyState
            };
        });
    }

    /**
     * AI analysis to identify the real submit button
     */
    async analyzeSubmitButtons(candidates, pageContext, userContext) {
        const prompt = `Analyze these potential submit buttons and identify the REAL one that users should click to submit/continue:

PAGE CONTEXT:
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Total forms: ${pageContext.totalForms}
- Questions answered: ${pageContext.answeredQuestions}/${pageContext.totalQuestions}
- Unfilled required fields: ${pageContext.unfilledRequiredFields}
- Has errors: ${pageContext.hasErrorMessages}
- User context: ${JSON.stringify(userContext)}

SUBMIT BUTTON CANDIDATES:
${candidates.map((c, i) => `
${i + 1}. ${c.tagName}${c.type ? `[type="${c.type}"]` : ''} 
   Text: "${c.text}"
   Classes: "${c.className}"
   ID: "${c.id}"
   In form: ${c.isInForm}
   Has click: ${c.hasClickListener}
   Position: ${c.boundingBox.x},${c.boundingBox.y} (${c.boundingBox.width}x${c.boundingBox.height})
   Selector: ${c.selector}
   Anti-bot flags: hidden=${c.isHidden}, offscreen=${c.isPositionedOff}, tiny=${c.hasWeirdStyling}
`).join('')}

ANALYSIS RULES:
1. Ignore hidden, off-screen, or tiny buttons (likely anti-bot traps)
2. Prefer buttons with submit-related text or functionality
3. Consider form context and page state
4. Detect unusual patterns (non-standard submit mechanisms)
5. Watch for calibration vs main submission patterns

RESPOND WITH JSON:
{
  "primaryButton": {
    "index": 0,
    "confidence": 0.95,
    "reasoning": "why this is the main submit button",
    "selector": "button selector",
    "isCalibration": false
  },
  "alternativeButtons": [
    {"index": 1, "confidence": 0.3, "reasoning": "backup option"}
  ],
  "antiBot": [
    {"index": 2, "reasoning": "likely bot trap because..."}
  ],
  "pageState": "needs_more_answers|ready_to_submit|calibration_phase|completion_page",
  "submitStrategy": "standard_click|javascript_trigger|form_submit|redirect_follow",
  "warnings": ["requires_all_questions", "check_for_captcha"]
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 800
            });

            const analysis = JSON.parse(response);
            
            // Add the actual candidate data to the result
            if (analysis.primaryButton && candidates[analysis.primaryButton.index]) {
                analysis.primaryButton.element = candidates[analysis.primaryButton.index];
            }
            
            analysis.alternativeButtons?.forEach(alt => {
                if (candidates[alt.index]) {
                    alt.element = candidates[alt.index];
                }
            });
            
            console.log(`🤖 AI Submit Analysis: ${analysis.pageState} - ${analysis.primaryButton?.reasoning}`);
            
            return analysis;
            
        } catch (error) {
            console.error('AI submit analysis failed:', error);
            throw error;
        }
    }

    /**
     * Fallback detection using pattern matching
     */
    async fallbackDetection() {
        console.log('🔧 Using fallback submit detection...');
        
        for (const pattern of this.standardPatterns) {
            try {
                const element = await this.page.$(pattern);
                if (element) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        return {
                            primaryButton: {
                                selector: pattern,
                                confidence: 0.5,
                                reasoning: 'Fallback pattern match',
                                isCalibration: false
                            },
                            pageState: 'unknown',
                            submitStrategy: 'standard_click',
                            warnings: ['using_fallback_detection']
                        };
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('No submit button found even with fallback');
    }

    /**
     * Execute the submit action based on AI analysis
     */
    async executeSubmit(analysis, multiTabHandler = null) {
        if (!analysis.primaryButton) {
            throw new Error('No primary button identified for submission');
        }
        
        const button = analysis.primaryButton;
        console.log(`🚀 Executing submit: ${button.reasoning}`);
        
        try {
            switch (analysis.submitStrategy) {
                case 'standard_click':
                    return await this.executeStandardClick(button, multiTabHandler);
                    
                case 'javascript_trigger':
                    return await this.executeJavaScriptTrigger(button);
                    
                case 'form_submit':
                    return await this.executeFormSubmit(button);
                    
                case 'redirect_follow':
                    return await this.executeRedirectFollow(button, multiTabHandler);
                    
                default:
                    return await this.executeStandardClick(button, multiTabHandler);
            }
            
        } catch (error) {
            console.warn(`❌ Primary submit failed: ${error.message}`);
            
            // Try alternative buttons
            if (analysis.alternativeButtons && analysis.alternativeButtons.length > 0) {
                console.log('🔄 Trying alternative submit button...');
                const alt = analysis.alternativeButtons[0];
                return await this.executeStandardClick(alt, multiTabHandler);
            }
            
            throw error;
        }
    }

    /**
     * Execute standard click
     */
    async executeStandardClick(button, multiTabHandler) {
        const selector = button.selector;
        
        if (multiTabHandler) {
            // Handle potential redirects/new tabs
            return await multiTabHandler.handleRedirectClick(selector);
        } else {
            await this.page.click(selector);
            
            // Wait for navigation or changes
            await Promise.race([
                this.page.waitForLoadState('networkidle'),
                this.page.waitForTimeout(5000)
            ]);
            
            return this.page;
        }
    }

    /**
     * Execute JavaScript trigger
     */
    async executeJavaScriptTrigger(button) {
        const element = button.element;
        
        if (element.onclick) {
            // Execute the onclick function
            await this.page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el && el.onclick) {
                    el.onclick();
                }
            }, button.selector);
        } else {
            // Trigger click event programmatically
            await this.page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) {
                    el.click();
                }
            }, button.selector);
        }
        
        return this.page;
    }

    /**
     * Execute form submit
     */
    async executeFormSubmit(button) {
        const formSelector = button.element.formId ? `#${button.element.formId}` : 'form';
        
        await this.page.evaluate((selector) => {
            const form = document.querySelector(selector);
            if (form) {
                form.submit();
            }
        }, formSelector);
        
        return this.page;
    }

    /**
     * Execute redirect follow (for complex redirect patterns)
     */
    async executeRedirectFollow(button, multiTabHandler) {
        // This is essentially the same as standard click but with specific redirect handling
        return await this.executeStandardClick(button, multiTabHandler);
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = SubmitButtonDetector;