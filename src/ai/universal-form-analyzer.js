/**
 * Universal Form Analyzer
 * 
 * A comprehensive LLM-powered form detection and analysis system for bot automation that:
 * - Detects all form elements on any webpage
 * - Identifies honeypots, hidden fields, and bot traps to avoid them
 * - Circumvents anti-bot detection mechanisms
 * - Provides reliable selectors for Playwright automation
 * - Handles complex form layouts and dynamic forms
 * - Works with any website structure
 * - Helps bots appear human-like in form interactions
 */

class UniversalFormAnalyzer {
    constructor(contentAI, options = {}) {
        this.contentAI = contentAI;
        this.options = {
            maxRetries: 3,
            analysisTimeout: 30000,
            enableHoneypotDetection: true,
            enableDynamicFormWait: true,
            debugMode: false,
            ...options
        };
        
        // Cache for form patterns to improve performance
        this.formPatternCache = new Map();
        this.honeypotPatterns = new Set();
        this.knownFormStructures = new Map();
        
        // Anti-bot detection patterns
        this.antiBotIndicators = {
            honeypots: [
                'display:none', 'display: none',
                'visibility:hidden', 'visibility: hidden',
                'opacity:0', 'opacity: 0',
                'position:absolute;left:-9999px',
                'width:0', 'height:0',
                'tabindex="-1"'
            ],
            botTrapNames: [
                'bot', 'spam', 'honeypot', 'trap', 'hidden',
                'email_address', 'url', 'website', 'confirm_email',
                'winnie_the_pooh', 'do_not_fill', 'leave_blank'
            ],
            suspiciousClasses: [
                'honeypot', 'bot-trap', 'spam-trap', 'hidden',
                'invisible', 'screen-reader-only', 'sr-only'
            ]
        };
        
        this.log('🧠 Universal Form Analyzer initialized');
    }

    /**
     * Main method: Analyze any page for forms and return actionable data
     */
    async analyzePage(page, siteName = 'unknown', options = {}) {
        const startTime = Date.now();
        this.log(`🔍 Starting universal form analysis for ${siteName}`);
        
        try {
            // Step 1: Wait for dynamic content to load
            await this.waitForDynamicForms(page);
            
            // Step 2: Extract comprehensive page data
            const pageData = await this.extractPageData(page);
            
            // Step 3: Use LLM to analyze and understand the page
            const analysis = await this.performLLMAnalysis(pageData, siteName, options);
            
            // Step 4: Validate and enhance selectors
            const validatedAnalysis = await this.validateSelectors(page, analysis);
            
            // Step 5: Cache results for future use
            this.cacheFormPattern(siteName, validatedAnalysis);
            
            const duration = Date.now() - startTime;
            this.log(`✅ Form analysis completed in ${duration}ms`);
            this.log(`📊 Found: ${validatedAnalysis.fields.length} fields, ${validatedAnalysis.checkboxes.length} checkboxes, ${validatedAnalysis.honeypots.length} honeypots`);
            
            return validatedAnalysis;
            
        } catch (error) {
            this.log(`❌ Form analysis failed: ${error.message}`);
            
            // Fallback to regex-based analysis
            return await this.performFallbackAnalysis(page, siteName);
        }
    }

    /**
     * Wait for dynamic forms to load and stabilize
     */
    async waitForDynamicForms(page) {
        this.log('⏳ Waiting for dynamic forms to load...');
        
        // Wait for initial page load
        await page.waitForTimeout(2000);
        
        // Try to wait for common form indicators
        const formIndicators = [
            'input', 'form', 'textarea', 'select', 'button[type="submit"]'
        ];
        
        for (const selector of formIndicators) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                this.log(`✅ Found form element: ${selector}`);
                break;
            } catch (e) {
                // Continue to next selector
            }
        }
        
        // Wait for any remaining dynamic content
        await page.waitForTimeout(1000);
        
        // Wait for network to be mostly idle
        try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
            // Continue if network doesn't stabilize
            this.log('⚠️ Network didn\'t stabilize, continuing anyway');
        }
    }

    /**
     * Extract comprehensive page data for LLM analysis
     */
    async extractPageData(page) {
        this.log('📊 Extracting comprehensive page data...');
        
        const pageData = await page.evaluate(() => {
            const data = {
                url: window.location.href,
                title: document.title,
                meta: {
                    description: document.querySelector('meta[name="description"]')?.content || '',
                    keywords: document.querySelector('meta[name="keywords"]')?.content || ''
                },
                
                // Raw HTML sections
                rawHTML: {
                    full: document.documentElement.outerHTML,
                    body: document.body.innerHTML,
                    head: document.head.innerHTML
                },
                
                // Form-specific data
                forms: [],
                allElements: [],
                pageText: document.body.innerText.substring(0, 5000),
                
                // Page structure indicators
                indicators: {
                    hasRecaptcha: !!(document.querySelector('[class*="recaptcha"], [id*="recaptcha"], [class*="captcha"]')),
                    hasFrames: document.querySelectorAll('iframe').length > 0,
                    hasAjaxForms: !!(document.querySelector('[data-ajax], [data-remote]')),
                    isSignup: /sign.?up|register|create.?account|join/i.test(document.body.innerText),
                    isLogin: /log.?in|sign.?in|login/i.test(document.body.innerText)
                }
            };

            // Analyze all forms
            const forms = document.querySelectorAll('form');
            forms.forEach((form, formIndex) => {
                const formInfo = {
                    index: formIndex,
                    action: form.action || '',
                    method: form.method || 'GET',
                    id: form.id || '',
                    className: form.className || '',
                    innerHTML: form.innerHTML,
                    elements: []
                };

                // Get all form elements
                const elements = form.querySelectorAll('input, textarea, select, button');
                elements.forEach((element, elementIndex) => {
                    formInfo.elements.push(analyzeElement(element, elementIndex, form));
                });

                data.forms.push(formInfo);
            });

            // Also analyze elements outside forms
            const allInputElements = document.querySelectorAll('input, textarea, select, button');
            allInputElements.forEach((element, index) => {
                if (!element.closest('form')) {
                    data.allElements.push(analyzeElement(element, index, null));
                }
            });

            return data;

            // Helper function to analyze individual elements
            function analyzeElement(element, index, parentForm) {
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);
                
                // Get all attributes
                const attributes = {};
                for (const attr of element.attributes) {
                    attributes[attr.name] = attr.value;
                }

                return {
                    // Basic properties
                    index: index,
                    tagName: element.tagName.toLowerCase(),
                    type: element.type || element.tagName.toLowerCase(),
                    
                    // Identifiers
                    id: element.id || '',
                    name: element.name || '',
                    className: element.className || '',
                    
                    // Content and context
                    placeholder: element.placeholder || '',
                    value: element.value || '',
                    innerHTML: element.innerHTML || '',
                    outerHTML: element.outerHTML,
                    
                    // All attributes for comprehensive analysis
                    attributes: attributes,
                    
                    // State
                    required: element.required || false,
                    disabled: element.disabled || false,
                    readonly: element.readOnly || false,
                    checked: element.checked || false,
                    
                    // Visibility and layout
                    visible: {
                        offsetParent: element.offsetParent !== null,
                        display: styles.display,
                        visibility: styles.visibility,
                        opacity: styles.opacity,
                        position: styles.position,
                        left: styles.left,
                        top: styles.top,
                        width: styles.width,
                        height: styles.height,
                        zIndex: styles.zIndex
                    },
                    
                    // Position and size
                    rect: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        left: rect.left,
                        bottom: rect.bottom,
                        right: rect.right
                    },
                    
                    // Context analysis
                    context: analyzeElementContext(element),
                    
                    // Parent information
                    parentForm: parentForm ? {
                        id: parentForm.id,
                        action: parentForm.action,
                        method: parentForm.method
                    } : null,
                    
                    // Anti-bot indicators
                    suspiciousIndicators: detectSuspiciousIndicators(element, styles)
                };
            }

            // Helper function to analyze element context
            function analyzeElementContext(element) {
                const context = {
                    labels: [],
                    nearbyText: [],
                    siblings: [],
                    parent: null
                };

                // Find associated labels
                if (element.id) {
                    const label = document.querySelector(`label[for="${element.id}"]`);
                    if (label) context.labels.push(label.textContent.trim());
                }

                // Find parent label
                const parentLabel = element.closest('label');
                if (parentLabel) {
                    context.labels.push(parentLabel.textContent.trim());
                }

                // Find nearby text
                const parent = element.parentElement;
                if (parent) {
                    context.parent = {
                        tagName: parent.tagName,
                        className: parent.className,
                        textContent: parent.textContent.trim().substring(0, 200)
                    };

                    // Get sibling elements for context
                    const siblings = Array.from(parent.children);
                    siblings.forEach(sibling => {
                        if (sibling !== element && sibling.textContent.trim()) {
                            context.siblings.push({
                                tagName: sibling.tagName,
                                textContent: sibling.textContent.trim().substring(0, 100)
                            });
                        }
                    });
                }

                // Find text nodes near the element
                const textNodes = findNearbyTextNodes(element, 200);
                context.nearbyText = textNodes.slice(0, 5);

                return context;
            }

            // Helper function to find nearby text nodes
            function findNearbyTextNodes(element, maxDistance) {
                const rect = element.getBoundingClientRect();
                const textNodes = [];
                
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent.trim().length > 3) {
                        const parent = node.parentElement;
                        if (parent && parent !== element) {
                            const parentRect = parent.getBoundingClientRect();
                            const distance = Math.sqrt(
                                Math.pow(rect.x - parentRect.x, 2) + 
                                Math.pow(rect.y - parentRect.y, 2)
                            );
                            
                            if (distance < maxDistance) {
                                textNodes.push({
                                    text: node.textContent.trim(),
                                    distance: distance,
                                    parentTag: parent.tagName
                                });
                            }
                        }
                    }
                }

                return textNodes.sort((a, b) => a.distance - b.distance);
            }

            // Helper function to detect suspicious anti-bot indicators
            function detectSuspiciousIndicators(element, styles) {
                const indicators = [];
                
                // Check for hidden styling
                if (styles.display === 'none') indicators.push('display_none');
                if (styles.visibility === 'hidden') indicators.push('visibility_hidden');
                if (parseFloat(styles.opacity) === 0) indicators.push('opacity_zero');
                if (styles.position === 'absolute' && (
                    parseInt(styles.left) < -1000 || 
                    parseInt(styles.top) < -1000
                )) indicators.push('positioned_offscreen');
                
                // Check dimensions
                if (parseInt(styles.width) === 0 || parseInt(styles.height) === 0) {
                    indicators.push('zero_dimensions');
                }
                
                // Check for honeypot naming patterns
                const suspiciousNames = ['bot', 'spam', 'honeypot', 'trap', 'hidden', 'winnie'];
                const elementText = `${element.name} ${element.id} ${element.className}`.toLowerCase();
                for (const name of suspiciousNames) {
                    if (elementText.includes(name)) {
                        indicators.push(`suspicious_name_${name}`);
                    }
                }
                
                // Check tabindex
                if (element.tabIndex === -1) indicators.push('negative_tabindex');
                
                return indicators;
            }
        });

        this.log(`📊 Extracted data: ${pageData.forms.length} forms, ${pageData.allElements.length} loose elements`);
        return pageData;
    }

    /**
     * Use LLM to perform intelligent analysis of the page data
     */
    async performLLMAnalysis(pageData, siteName, options = {}) {
        this.log('🤖 Performing LLM analysis...');
        
        // Prepare focused HTML for LLM
        const focusedHTML = this.prepareFocusedHTML(pageData);
        
        const analysisPrompt = this.buildAnalysisPrompt(pageData, siteName, focusedHTML);
        
        try {
            this.log(`🔍 Sending analysis prompt to LLM (${analysisPrompt.length} chars)`);
            if (this.options.debugMode) {
                this.log(`📝 Form HTML preview: ${focusedHTML.substring(0, 300)}...`);
            }
            
            // Use direct AI call for form analysis instead of survey AI
            const response = await this.performDirectAIAnalysis(analysisPrompt, siteName);

            let analysis;
            
            this.log(`📨 Received LLM response (${typeof response}): ${typeof response === 'string' ? response.substring(0, 200) + '...' : JSON.stringify(response).substring(0, 200) + '...'}`);
            
            // Parse LLM response with robust error handling
            if (typeof response === 'string') {
                try {
                    analysis = JSON.parse(response);
                    this.log(`✅ Successfully parsed JSON response`);
                } catch (parseError) {
                    this.log(`⚠️ Failed to parse LLM JSON response: ${parseError.message}`);
                    this.log(`Raw response: ${response.substring(0, 500)}...`);
                    
                    // Try to extract JSON from response if it's embedded
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            analysis = JSON.parse(jsonMatch[0]);
                            this.log(`✅ Extracted JSON from embedded response`);
                        } catch (e) {
                            this.log('⚠️ Could not extract JSON from response, using fallback');
                            analysis = null;
                        }
                    } else {
                        analysis = null;
                    }
                }
            } else if (typeof response === 'object' && response !== null) {
                analysis = response;
                this.log(`✅ Using object response directly`);
            } else {
                this.log('⚠️ Unexpected LLM response format');
                analysis = null;
            }
            
            if (analysis && this.options.debugMode) {
                this.log(`🔍 Analysis structure: fields=${analysis.fields?.length || 0}, checkboxes=${analysis.checkboxes?.length || 0}, honeypots=${analysis.honeypots?.length || 0}`);
            }
            
            // Enhance analysis with anti-bot detection (handles null/invalid analysis)
            analysis = await this.enhanceWithAntiBotDetection(analysis, pageData);
            
            this.log(`🧠 LLM analysis completed: ${analysis.confidence || 0.5} confidence`);
            return analysis;
            
        } catch (error) {
            this.log(`❌ LLM analysis failed: ${error.message}`);
            this.log(`📚 Error stack: ${error.stack}`);
            // Return fallback analysis instead of throwing
            return await this.enhanceWithAntiBotDetection(null, pageData);
        }
    }

    /**
     * Build comprehensive analysis prompt for LLM
     */
    buildAnalysisPrompt(pageData, siteName, focusedHTML) {
        return `You are an expert web automation specialist analyzing a webpage for form automation.

WEBSITE: ${siteName}
URL: ${pageData.url}
PAGE TYPE: ${pageData.indicators.isSignup ? 'SIGNUP' : pageData.indicators.isLogin ? 'LOGIN' : 'UNKNOWN'}

CONTEXT CLUES:
- Has reCAPTCHA: ${pageData.indicators.hasRecaptcha}
- Has iframes: ${pageData.indicators.hasFrames}
- AJAX forms detected: ${pageData.indicators.hasAjaxForms}

PAGE CONTENT (first 1000 chars): ${pageData.pageText.substring(0, 1000)}

FORM HTML (cleaned and focused):
${focusedHTML}

CRITICAL INSTRUCTIONS FOR BOT AUTOMATION:
1. Identify ALL form elements (input, textarea, select, button) that a bot should interact with
2. Detect and flag HONEYPOT/TRAP fields that bots must AVOID to prevent detection
3. Provide EXACT, reliable CSS selectors for Playwright automation
4. Distinguish between legitimate fields (fill these) and anti-bot traps (skip these)
5. Help the bot understand which fields are real vs. decoys

HONEYPOT/TRAP DETECTION (AVOID THESE):
- Hidden fields: display:none, visibility:hidden, opacity:0
- Off-screen fields: positioned with left:-9999px, top:-9999px, etc.
- Zero-size fields: width:0, height:0
- Suspicious names: bot, spam, honeypot, trap, hidden, winnie_the_pooh, website, url, etc.
- Negative tabindex: tabindex="-1"
- Instructions to "leave blank": fields labeled "do not fill", "leave empty", etc.
- Duplicate email/name fields (often one real, one trap)
- Fields with CSS classes like: honeypot, bot-trap, spam-trap, hidden, invisible

Return JSON in this EXACT format:
{
  "analysis": "brief description of page purpose and form structure",
  "confidence": 0.0-1.0,
  "pageType": "signup|login|contact|survey|other",
  "formStrategy": "single_form|multi_step|ajax|standard",
  
  "fields": [
    {
      "purpose": "email|firstName|lastName|fullName|password|confirmPassword|phone|company|address|age|other",
      "selector": "exact CSS selector (prefer #id, then [name], then specific path)",
      "type": "text|email|password|tel|number|url|date|etc",
      "required": true|false,
      "importance": "critical|important|optional",
      "reasoning": "why you identified this field this way",
      "contextClues": "labels, nearby text, or other indicators"
    }
  ],
  
  "checkboxes": [
    {
      "purpose": "terms|privacy|newsletter|marketing|notifications|other",
      "selector": "exact CSS selector",
      "action": "check|uncheck|conditional",
      "importance": "critical|important|optional",
      "reasoning": "purpose and why it should be checked/unchecked"
    }
  ],
  
  "honeypots": [
    {
      "selector": "exact CSS selector",
      "trapType": "hidden|positioned|zero_size|suspicious_name|negative_tabindex",
      "reasoning": "why this is identified as a honeypot",
      "action": "ignore|leave_empty"
    }
  ],
  
  "submitButton": {
    "selector": "exact CSS selector for submit button",
    "text": "button text",
    "type": "button|input|ajax"
  },
  
  "additionalNotes": "any special considerations, multi-step flows, CAPTCHA handling, etc."
}

Focus on accuracy and reliability. Provide selectors that will work consistently.`;
    }

    /**
     * Prepare focused HTML for LLM analysis
     */
    prepareFocusedHTML(pageData) {
        let focusedHTML = '';
        
        // Include form HTML
        pageData.forms.forEach(form => {
            focusedHTML += `<form id="${form.id}" class="${form.className}" action="${form.action}" method="${form.method}">\n`;
            focusedHTML += form.innerHTML;
            focusedHTML += '\n</form>\n\n';
        });
        
        // Include loose elements
        pageData.allElements.forEach(element => {
            focusedHTML += element.outerHTML + '\n';
        });
        
        // Clean up the HTML
        focusedHTML = focusedHTML
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Limit size for LLM
        if (focusedHTML.length > 8000) {
            focusedHTML = focusedHTML.substring(0, 8000) + '\n... [truncated for length]';
        }
        
        return focusedHTML;
    }

    /**
     * Enhance LLM analysis with additional anti-bot detection
     */
    async enhanceWithAntiBotDetection(analysis, pageData) {
        this.log('🛡️ Enhancing with anti-bot detection...');
        
        // Ensure analysis has proper structure
        if (!analysis || typeof analysis !== 'object') {
            this.log('⚠️ Invalid analysis object, creating default structure');
            analysis = {
                analysis: 'Enhanced fallback analysis',
                confidence: 0.5,
                pageType: 'unknown',
                formStrategy: 'standard',
                fields: [],
                checkboxes: [],
                honeypots: [],
                submitButton: null
            };
        }
        
        // Ensure required arrays exist
        analysis.fields = analysis.fields || [];
        analysis.checkboxes = analysis.checkboxes || [];
        analysis.honeypots = analysis.honeypots || [];
        
        // Add any honeypots we detected that LLM might have missed
        const detectedHoneypots = this.detectAdditionalHoneypots(pageData);
        
        if (detectedHoneypots.length > 0) {
            analysis.honeypots.push(...detectedHoneypots);
        }
        
        // Validate field purposes and flag suspicious ones
        if (Array.isArray(analysis.fields)) {
            analysis.fields = analysis.fields.map(field => {
                const suspiciousScore = this.calculateSuspiciousScore(field, pageData);
                if (suspiciousScore > 0.7) {
                    this.log(`⚠️ Field ${field.selector} flagged as suspicious (score: ${suspiciousScore})`);
                    field.suspicious = true;
                    field.suspiciousScore = suspiciousScore;
                }
                return field;
            });
        }
        
        return analysis;
    }

    /**
     * Detect additional honeypots using pattern matching
     */
    detectAdditionalHoneypots(pageData) {
        const honeypots = [];
        
        const allElements = [
            ...pageData.forms.flatMap(form => form.elements),
            ...pageData.allElements
        ];
        
        allElements.forEach(element => {
            if (element.suspiciousIndicators.length > 0) {
                const selector = this.generateSelector(element);
                honeypots.push({
                    selector: selector,
                    trapType: element.suspiciousIndicators.join(','),
                    reasoning: `Pattern detection: ${element.suspiciousIndicators.join(', ')}`,
                    action: 'ignore'
                });
            }
        });
        
        return honeypots;
    }

    /**
     * Calculate suspicious score for a field
     */
    calculateSuspiciousScore(field, pageData) {
        let score = 0;
        
        // Check selector for suspicious patterns
        const selector = field.selector.toLowerCase();
        this.antiBotIndicators.botTrapNames.forEach(pattern => {
            if (selector.includes(pattern)) score += 0.3;
        });
        
        // Check if field has suspicious styling indicators
        // (This would require finding the element in pageData)
        
        return Math.min(score, 1.0);
    }

    /**
     * Generate reliable selector for element
     */
    generateSelector(element) {
        // Prefer ID selector
        if (element.id) {
            return `#${element.id}`;
        }
        
        // Then name selector
        if (element.name) {
            return `[name="${element.name}"]`;
        }
        
        // Then type + other attributes
        let selector = element.tagName;
        if (element.type && element.type !== element.tagName) {
            selector += `[type="${element.type}"]`;
        }
        
        // Add class if specific enough
        if (element.className && element.className.split(' ').length <= 2) {
            selector += `.${element.className.split(' ')[0]}`;
        }
        
        return selector;
    }

    /**
     * Validate selectors work on the actual page
     */
    async validateSelectors(page, analysis) {
        this.log('✅ Validating selectors...');
        
        const validatedAnalysis = { ...analysis };
        
        // Validate field selectors
        for (const field of validatedAnalysis.fields) {
            try {
                const element = await page.locator(field.selector).first();
                const count = await element.count();
                
                if (count === 0) {
                    this.log(`⚠️ Selector failed: ${field.selector}`);
                    field.selectorValid = false;
                } else {
                    field.selectorValid = true;
                    
                    // Check if element is actually visible
                    try {
                        field.actuallyVisible = await element.isVisible();
                    } catch (e) {
                        field.actuallyVisible = false;
                    }
                }
            } catch (error) {
                field.selectorValid = false;
                this.log(`❌ Selector validation error for ${field.selector}: ${error.message}`);
            }
        }
        
        // Validate checkbox selectors
        for (const checkbox of validatedAnalysis.checkboxes || []) {
            try {
                const element = await page.locator(checkbox.selector).first();
                const count = await element.count();
                checkbox.selectorValid = count > 0;
                if (count > 0) {
                    checkbox.actuallyVisible = await element.isVisible();
                }
            } catch (error) {
                checkbox.selectorValid = false;
            }
        }
        
        // Validate submit button
        if (validatedAnalysis.submitButton) {
            try {
                const element = await page.locator(validatedAnalysis.submitButton.selector).first();
                const count = await element.count();
                validatedAnalysis.submitButton.selectorValid = count > 0;
            } catch (error) {
                validatedAnalysis.submitButton.selectorValid = false;
            }
        }
        
        return validatedAnalysis;
    }

    /**
     * COMPREHENSIVE FALLBACK ANALYSIS - DETECT ALL FORM ELEMENTS
     * PRECISE INSTRUCTIONS: Find EVERY interactive element on the page
     */
    async performFallbackAnalysis(page, siteName) {
        this.log('🔄 Performing COMPREHENSIVE fallback analysis...');
        this.log('🎯 MISSION: Find ALL input fields, checkboxes, buttons, modals, and CAPTCHAs');
        
        // STEP 1: Extract ALL possible interactive elements
        const allInteractiveElements = await page.evaluate(() => {
            const elements = [];
            
            // PRECISE INSTRUCTION: Find ALL input types
            const inputTypes = [
                'text', 'email', 'password', 'tel', 'number', 'url', 'search',
                'date', 'datetime-local', 'time', 'month', 'week',
                'checkbox', 'radio', 'file', 'hidden', 'range', 'color'
            ];
            
            // Find ALL input elements regardless of type
            document.querySelectorAll('input').forEach((input, index) => {
                const computedStyle = window.getComputedStyle(input);
                const rect = input.getBoundingClientRect();
                
                elements.push({
                    tagName: 'input',
                    type: input.type || 'text',
                    id: input.id || '',
                    name: input.name || '',
                    className: input.className || '',
                    placeholder: input.placeholder || '',
                    value: input.value || '',
                    required: input.required || false,
                    disabled: input.disabled || false,
                    visible: {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity,
                        width: computedStyle.width,
                        height: computedStyle.height,
                        position: computedStyle.position,
                        left: computedStyle.left,
                        top: computedStyle.top
                    },
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        x: rect.x,
                        y: rect.y
                    },
                    isVisible: input.offsetParent !== null,
                    parentText: input.parentElement ? input.parentElement.textContent.trim().substring(0, 100) : '',
                    nearbyLabels: [],
                    index: index
                });
            });
            
            // Find ALL textarea elements
            document.querySelectorAll('textarea').forEach((textarea, index) => {
                const computedStyle = window.getComputedStyle(textarea);
                elements.push({
                    tagName: 'textarea',
                    type: 'textarea',
                    id: textarea.id || '',
                    name: textarea.name || '',
                    className: textarea.className || '',
                    placeholder: textarea.placeholder || '',
                    value: textarea.value || '',
                    required: textarea.required || false,
                    disabled: textarea.disabled || false,
                    visible: {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity
                    },
                    isVisible: textarea.offsetParent !== null,
                    parentText: textarea.parentElement ? textarea.parentElement.textContent.trim().substring(0, 100) : '',
                    index: index
                });
            });
            
            // Find ALL select elements (dropdowns)
            document.querySelectorAll('select').forEach((select, index) => {
                const computedStyle = window.getComputedStyle(select);
                elements.push({
                    tagName: 'select',
                    type: 'select',
                    id: select.id || '',
                    name: select.name || '',
                    className: select.className || '',
                    required: select.required || false,
                    disabled: select.disabled || false,
                    visible: {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity
                    },
                    isVisible: select.offsetParent !== null,
                    parentText: select.parentElement ? select.parentElement.textContent.trim().substring(0, 100) : '',
                    options: Array.from(select.options).map(opt => opt.text),
                    index: index
                });
            });
            
            // Find ALL button elements
            document.querySelectorAll('button').forEach((button, index) => {
                const computedStyle = window.getComputedStyle(button);
                elements.push({
                    tagName: 'button',
                    type: button.type || 'button',
                    id: button.id || '',
                    name: button.name || '',
                    className: button.className || '',
                    textContent: button.textContent.trim(),
                    disabled: button.disabled || false,
                    visible: {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity
                    },
                    isVisible: button.offsetParent !== null,
                    index: index
                });
            });
            
            // Find labels for context
            document.querySelectorAll('label').forEach(label => {
                const forAttr = label.getAttribute('for');
                if (forAttr) {
                    const targetElement = elements.find(el => el.id === forAttr);
                    if (targetElement) {
                        targetElement.nearbyLabels.push(label.textContent.trim());
                    }
                }
            });
            
            return elements;
        });
        
        this.log(`🔍 Found ${allInteractiveElements.length} interactive elements on page`);
        
        // STEP 2: Analyze each element with PRECISE categorization
        const fields = [];
        const checkboxes = [];
        const buttons = [];
        const honeypots = [];
        const hiddenFields = [];
        
        allInteractiveElements.forEach((element, index) => {
            this.log(`📝 Element ${index + 1}: ${element.tagName}[${element.type}] - ID: "${element.id}" Name: "${element.name}" Class: "${element.className}"`);
            
            // PRECISE INSTRUCTION: Check if element is hidden/honeypot
            const isHidden = this.isElementHidden(element);
            const isSuspicious = this.isElementSuspicious(element);
            
            if (isHidden || isSuspicious) {
                honeypots.push({
                    selector: this.generateElementSelector(element),
                    trapType: isHidden ? 'hidden' : 'suspicious',
                    reasoning: `${isHidden ? 'Hidden element' : 'Suspicious naming'}: ${element.id || element.name || element.className}`,
                    action: 'ignore'
                });
                this.log(`🍯 HONEYPOT DETECTED: ${this.generateElementSelector(element)}`);
                return;
            }
            
            // PRECISE INSTRUCTION: Categorize by element type
            switch (element.tagName) {
                case 'input':
                    if (element.type === 'checkbox') {
                        const purpose = this.inferCheckboxPurpose(element);
                        checkboxes.push({
                            purpose: purpose,
                            selector: this.generateElementSelector(element),
                            action: purpose === 'terms' ? 'check' : 'conditional',
                            importance: purpose === 'terms' ? 'critical' : 'optional',
                            reasoning: `Checkbox: ${element.parentText}`,
                            selectorValid: true,
                            actuallyVisible: element.isVisible
                        });
                        this.log(`☑️ CHECKBOX: ${this.generateElementSelector(element)} (${purpose})`);
                    } else if (element.type === 'radio') {
                        fields.push({
                            purpose: 'radio',
                            selector: this.generateElementSelector(element),
                            type: 'radio',
                            required: element.required,
                            importance: 'optional',
                            reasoning: `Radio button: ${element.name}`,
                            selectorValid: true
                        });
                        this.log(`📻 RADIO: ${this.generateElementSelector(element)}`);
                    } else if (element.type === 'hidden') {
                        hiddenFields.push({
                            selector: this.generateElementSelector(element),
                            value: element.value,
                            reasoning: 'Hidden input field'
                        });
                        this.log(`🔒 HIDDEN FIELD: ${this.generateElementSelector(element)}`);
                    } else {
                        // Text, email, password, etc.
                        const purpose = this.inferFieldPurpose(element);
                        fields.push({
                            purpose: purpose,
                            selector: this.generateElementSelector(element),
                            type: element.type,
                            required: element.required,
                            importance: ['email', 'password'].includes(purpose) ? 'critical' : 'important',
                            reasoning: `Input field: ${element.placeholder || element.parentText}`,
                            selectorValid: true,
                            actuallyVisible: element.isVisible
                        });
                        this.log(`📝 INPUT FIELD: ${this.generateElementSelector(element)} (${purpose})`);
                    }
                    break;
                    
                case 'textarea':
                    const textPurpose = this.inferFieldPurpose(element);
                    fields.push({
                        purpose: textPurpose,
                        selector: this.generateElementSelector(element),
                        type: 'textarea',
                        required: element.required,
                        importance: 'important',
                        reasoning: `Textarea: ${element.placeholder || element.parentText}`,
                        selectorValid: true,
                        actuallyVisible: element.isVisible
                    });
                    this.log(`📄 TEXTAREA: ${this.generateElementSelector(element)} (${textPurpose})`);
                    break;
                    
                case 'select':
                    const selectPurpose = this.inferFieldPurpose(element);
                    fields.push({
                        purpose: selectPurpose,
                        selector: this.generateElementSelector(element),
                        type: 'select',
                        required: element.required,
                        importance: 'important',
                        reasoning: `Select dropdown: ${element.parentText}`,
                        options: element.options,
                        selectorValid: true,
                        actuallyVisible: element.isVisible
                    });
                    this.log(`📋 SELECT: ${this.generateElementSelector(element)} (${selectPurpose})`);
                    break;
                    
                case 'button':
                    const buttonPurpose = this.inferButtonPurpose(element);
                    buttons.push({
                        purpose: buttonPurpose,
                        selector: this.generateElementSelector(element),
                        text: element.textContent,
                        type: element.type,
                        importance: buttonPurpose === 'submit' ? 'critical' : 'optional',
                        reasoning: `Button: ${element.textContent}`,
                        selectorValid: true
                    });
                    this.log(`🔘 BUTTON: ${this.generateElementSelector(element)} (${buttonPurpose})`);
                    break;
            }
        });
        
        // STEP 3: Find CAPTCHA elements
        const captchaElements = await this.detectCaptchaElements(page);
        
        // STEP 4: Find modal elements
        const modalElements = await this.detectModalElements(page);
        
        // STEP 5: Find submit button from buttons
        const submitButton = buttons.find(btn => btn.purpose === 'submit') || {
            selector: 'button[type="submit"], input[type="submit"]',
            text: 'Submit',
            type: 'button'
        };
        
        const result = {
            analysis: 'COMPREHENSIVE fallback analysis - ALL elements detected',
            confidence: 0.8,
            pageType: this.inferPageType(allInteractiveElements),
            formStrategy: 'comprehensive',
            fields: fields,
            checkboxes: checkboxes,
            buttons: buttons,
            honeypots: honeypots,
            hiddenFields: hiddenFields,
            captchaElements: captchaElements,
            modalElements: modalElements,
            submitButton: submitButton,
            totalElementsFound: allInteractiveElements.length,
            visibleElementsFound: allInteractiveElements.filter(el => el.isVisible).length
        };
        
        this.log(`📊 COMPREHENSIVE ANALYSIS COMPLETE:`);
        this.log(`   📝 Fields: ${fields.length}`);
        this.log(`   ☑️ Checkboxes: ${checkboxes.length}`);
        this.log(`   🔘 Buttons: ${buttons.length}`);
        this.log(`   🍯 Honeypots: ${honeypots.length}`);
        this.log(`   🔒 Hidden fields: ${hiddenFields.length}`);
        this.log(`   🤖 CAPTCHAs: ${captchaElements.length}`);
        this.log(`   📱 Modals: ${modalElements.length}`);
        this.log(`   📊 Total elements: ${allInteractiveElements.length}`);
        
        return result;
    }

    /**
     * Infer field purpose from element properties
     */
    inferFieldPurpose(element) {
        // Handle both old format (element.context.labels) and new format (element.nearbyLabels)
        let labels = [];
        if (element.context && element.context.labels) {
            labels = element.context.labels;
        } else if (element.nearbyLabels) {
            labels = element.nearbyLabels;
        }
        
        const text = `${element.name || ''} ${element.id || ''} ${element.placeholder || ''} ${element.parentText || ''} ${labels.join(' ')}`.toLowerCase();
        
        if (text.includes('email') && (text.includes('confirm') || text.includes('verify'))) {
            return 'confirmEmail';
        } else if (text.includes('email')) {
            return 'email';
        } else if (text.includes('password') && (text.includes('confirm') || text.includes('verify'))) {
            return 'confirmPassword';
        } else if (text.includes('password')) {
            return 'password';
        } else if (text.includes('first') && text.includes('name')) {
            return 'firstName';
        } else if (text.includes('last') && text.includes('name')) {
            return 'lastName';
        } else if (text.includes('full') && text.includes('name')) {
            return 'fullName';
        } else if (text.includes('name')) {
            return 'firstName';
        } else if (text.includes('phone') || text.includes('tel')) {
            return 'phone';
        } else if (text.includes('company') || text.includes('organization')) {
            return 'company';
        } else if (text.includes('terms') || text.includes('agree') || text.includes('accept')) {
            return 'terms';
        } else if (text.includes('newsletter') || text.includes('updates')) {
            return 'newsletter';
        }
        
        return 'other';
    }

    /**
     * Cache form pattern for future use
     */
    cacheFormPattern(siteName, analysis) {
        this.formPatternCache.set(siteName, {
            analysis: analysis,
            timestamp: Date.now(),
            url: analysis.url
        });
        
        this.log(`💾 Cached form pattern for ${siteName}`);
    }

    /**
     * Get cached form pattern
     */
    getCachedPattern(siteName) {
        const cached = this.formPatternCache.get(siteName);
        if (cached && (Date.now() - cached.timestamp) < 3600000) { // 1 hour cache
            this.log(`📋 Using cached pattern for ${siteName}`);
            return cached.analysis;
        }
        return null;
    }

    /**
     * Check if element is hidden using multiple detection methods
     */
    isElementHidden(element) {
        const style = element.visible;
        
        // Check for display: none
        if (style.display === 'none') return true;
        
        // Check for visibility: hidden
        if (style.visibility === 'hidden') return true;
        
        // Check for opacity: 0
        if (parseFloat(style.opacity) === 0) return true;
        
        // Check for zero dimensions
        if (style.width === '0px' || style.height === '0px') return true;
        
        // Check for off-screen positioning
        if (style.position === 'absolute' || style.position === 'fixed') {
            const left = parseInt(style.left);
            const top = parseInt(style.top);
            if (left < -1000 || top < -1000) return true;
        }
        
        // Check if element has zero size
        if (element.rect && element.rect.width === 0 && element.rect.height === 0) return true;
        
        return false;
    }

    /**
     * Check if element has suspicious naming patterns
     */
    isElementSuspicious(element) {
        const suspiciousPatterns = [
            'bot', 'spam', 'honeypot', 'trap', 'hidden', 'invisible',
            'winnie', 'pooh', 'do_not_fill', 'leave_blank', 'antispam',
            'captcha_response', 'bot_check', 'human_check', 'website',
            'url', 'confirm_email_fake', 'email2'
        ];
        
        const elementText = `${element.id} ${element.name} ${element.className}`.toLowerCase();
        
        return suspiciousPatterns.some(pattern => elementText.includes(pattern));
    }

    /**
     * Generate reliable selector for any element
     */
    generateElementSelector(element) {
        // Prefer ID selector
        if (element.id) {
            return `#${element.id}`;
        }
        
        // Then name selector
        if (element.name) {
            return `[name="${element.name}"]`;
        }
        
        // Then type + class combination
        if (element.className) {
            const firstClass = element.className.split(' ')[0];
            return `${element.tagName}[type="${element.type}"].${firstClass}`;
        }
        
        // Fallback to type selector
        return `${element.tagName}[type="${element.type}"]`;
    }

    /**
     * Infer checkbox purpose from context
     */
    inferCheckboxPurpose(element) {
        const labels = element.nearbyLabels || [];
        const context = `${element.id} ${element.name} ${element.className} ${element.parentText} ${labels.join(' ')}`.toLowerCase();
        
        if (context.includes('terms') || context.includes('agree') || context.includes('accept')) {
            return 'terms';
        } else if (context.includes('newsletter') || context.includes('email') || context.includes('updates')) {
            return 'newsletter';
        } else if (context.includes('privacy') || context.includes('policy')) {
            return 'privacy';
        } else if (context.includes('marketing') || context.includes('promotional')) {
            return 'marketing';
        }
        
        return 'other';
    }

    /**
     * Infer button purpose from text and context
     */
    inferButtonPurpose(element) {
        const text = element.textContent.toLowerCase();
        const context = `${element.id} ${element.className}`.toLowerCase();
        
        if (element.type === 'submit' || text.includes('submit') || text.includes('sign up') || 
            text.includes('register') || text.includes('create') || text.includes('join')) {
            return 'submit';
        } else if (text.includes('cancel') || text.includes('close')) {
            return 'cancel';
        } else if (text.includes('next') || text.includes('continue')) {
            return 'next';
        } else if (text.includes('back') || text.includes('previous')) {
            return 'back';
        }
        
        return 'other';
    }

    /**
     * Infer page type from elements found
     */
    inferPageType(elements) {
        const hasEmail = elements.some(el => el.type === 'email' || el.name.includes('email'));
        const hasPassword = elements.some(el => el.type === 'password');
        const hasName = elements.some(el => el.name.includes('name') || el.id.includes('name'));
        
        if (hasEmail && hasPassword && hasName) {
            return 'signup';
        } else if (hasEmail && hasPassword) {
            return 'login';
        } else if (hasEmail || hasName) {
            return 'contact';
        }
        
        return 'unknown';
    }

    /**
     * Detect CAPTCHA elements on the page
     */
    async detectCaptchaElements(page) {
        try {
            const captchas = await page.evaluate(() => {
                const captchaElements = [];
                
                // Look for reCAPTCHA
                document.querySelectorAll('[class*="recaptcha"], [id*="recaptcha"]').forEach(el => {
                    captchaElements.push({
                        type: 'recaptcha',
                        selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                        visible: el.offsetParent !== null
                    });
                });
                
                // Look for hCaptcha
                document.querySelectorAll('[class*="hcaptcha"], [id*="hcaptcha"]').forEach(el => {
                    captchaElements.push({
                        type: 'hcaptcha',
                        selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                        visible: el.offsetParent !== null
                    });
                });
                
                // Look for other CAPTCHA indicators
                document.querySelectorAll('[class*="captcha"], [id*="captcha"]').forEach(el => {
                    captchaElements.push({
                        type: 'captcha',
                        selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                        visible: el.offsetParent !== null
                    });
                });
                
                return captchaElements;
            });
            
            return captchas;
        } catch (error) {
            this.log(`⚠️ Error detecting CAPTCHAs: ${error.message}`);
            return [];
        }
    }

    /**
     * Detect modal elements on the page
     */
    async detectModalElements(page) {
        try {
            const modals = await page.evaluate(() => {
                const modalElements = [];
                
                // Look for common modal patterns
                const modalSelectors = [
                    '[class*="modal"]',
                    '[class*="popup"]',
                    '[class*="overlay"]',
                    '[class*="dialog"]',
                    '[role="dialog"]',
                    '[aria-modal="true"]'
                ];
                
                modalSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        modalElements.push({
                            selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                            visible: el.offsetParent !== null,
                            zIndex: window.getComputedStyle(el).zIndex
                        });
                    });
                });
                
                return modalElements;
            });
            
            return modals;
        } catch (error) {
            this.log(`⚠️ Error detecting modals: ${error.message}`);
            return [];
        }
    }

    /**
     * Perform direct AI analysis bypassing survey-focused ContentUnderstandingAI
     */
    async performDirectAIAnalysis(prompt, siteName) {
        const axios = require('axios');
        
        try {
            this.log('🤖 Performing direct OpenAI API call for form analysis');
            
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert web automation specialist. You analyze HTML forms and provide JSON responses for bot automation. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            return response.data.choices[0].message.content;
            
        } catch (error) {
            this.log(`❌ Direct AI analysis failed: ${error.message}`);
            
            if (error.response) {
                this.log(`❌ API Response: ${error.response.status} - ${error.response.statusText}`);
                this.log(`❌ API Data: ${JSON.stringify(error.response.data)}`);
            }
            
            throw error;
        }
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[UniversalFormAnalyzer] ${message}`);
        }
    }
}

module.exports = UniversalFormAnalyzer;