/**
 * Enhanced Universal Form Analyzer
 * 
 * Improved version with better reliability, error handling, and multi-site support
 */

class EnhancedUniversalFormAnalyzer {
    constructor(contentAI, options = {}) {
        this.contentAI = contentAI;
        this.options = {
            maxRetries: 5,
            analysisTimeout: 45000,
            enableAdvancedHoneypotDetection: true,
            enableDynamicFormWait: true,
            enableMultiStepDetection: true,
            enableCaptchaDetection: true,
            debugMode: true,
            fallbackToRegex: true,
            cacheResults: true,
            ...options
        };
        
        // Enhanced caching and pattern recognition
        this.formPatternCache = new Map();
        this.siteSpecificPatterns = new Map();
        this.knownHoneypotPatterns = new Set();
        this.successfulSelectors = new Map();
        
        // Enhanced anti-bot detection patterns
        this.advancedAntiBotIndicators = {
            honeypotStyles: [
                'display:none', 'display: none', 'display:block;height:0', 'display:block;width:0',
                'visibility:hidden', 'visibility: hidden',
                'opacity:0', 'opacity: 0', 'opacity:0.0',
                'position:absolute;left:-9999px', 'position:absolute;top:-9999px',
                'position:fixed;left:-9999px', 'position:fixed;top:-9999px',
                'width:0', 'width: 0px', 'width:0px', 'height:0', 'height: 0px', 'height:0px',
                'clip:rect(0,0,0,0)', 'clip-path:inset(100%)',
                'transform:scale(0)', 'transform:translateX(-9999px)',
                'font-size:0', 'line-height:0',
                'z-index:-1', 'z-index:-9999'
            ],
            honeypotNames: [
                'bot', 'spam', 'honeypot', 'trap', 'hidden', 'invisible',
                'email_address', 'url', 'website', 'confirm_email', 'verify_email',
                'winnie_the_pooh', 'winnie', 'pooh', 'do_not_fill', 'leave_blank',
                'antispam', 'anti_spam', 'anti-spam', 'captcha_response',
                'hidden_field', 'invisible_field', 'bot_check', 'human_check',
                'email2', 'email_confirm', 'email_verification',
                'phone2', 'address2', 'backup_email'
            ],
            honeypotClasses: [
                'honeypot', 'bot-trap', 'spam-trap', 'hidden', 'invisible',
                'screen-reader-only', 'sr-only', 'visually-hidden',
                'off-screen', 'offscreen', 'clip', 'zero-size',
                'anti-bot', 'antispam', 'trap-field', 'decoy'
            ],
            honeypotIds: [
                'honeypot', 'bot_check', 'spam_check', 'hidden_field',
                'invisible_field', 'trap', 'decoy', 'anti_spam'
            ]
        };
        
        // Form type detection patterns
        this.formTypePatterns = {
            registration: /sign.?up|register|create.?account|join|new.?account/i,
            login: /log.?in|sign.?in|login|auth/i,
            contact: /contact|message|inquiry|feedback/i,
            survey: /survey|poll|questionnaire|feedback/i,
            newsletter: /newsletter|subscribe|email.?list/i,
            checkout: /checkout|payment|billing|order/i
        };
        
        this.log('🚀 Enhanced Universal Form Analyzer initialized');
    }

    /**
     * Enhanced main analysis method with better error handling
     */
    async analyzePage(page, siteName = 'unknown', options = {}) {
        const startTime = Date.now();
        this.log(`🔍 Starting enhanced analysis for ${siteName}`);
        
        let attempt = 0;
        const maxAttempts = this.options.maxRetries;
        
        while (attempt < maxAttempts) {
            try {
                attempt++;
                this.log(`📊 Analysis attempt ${attempt}/${maxAttempts}`);
                
                // Check cache first
                const cached = this.getCachedAnalysis(siteName, page.url());
                if (cached && options.useCache !== false) {
                    this.log('💾 Using cached analysis');
                    return cached;
                }
                
                // Enhanced page preparation
                await this.preparePageForAnalysis(page);
                
                // Multi-layered analysis approach
                const analysis = await this.performMultiLayeredAnalysis(page, siteName, options);
                
                if (analysis && this.validateAnalysisQuality(analysis)) {
                    // Cache successful analysis
                    this.cacheAnalysis(siteName, page.url(), analysis);
                    
                    const duration = Date.now() - startTime;
                    this.log(`✅ Enhanced analysis completed in ${duration}ms (attempt ${attempt})`);
                    this.logAnalysisResults(analysis);
                    
                    return analysis;
                } else {
                    throw new Error('Analysis quality validation failed');
                }
                
            } catch (error) {
                this.log(`❌ Analysis attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < maxAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    this.log(`⏳ Retrying in ${delay}ms...`);
                    await page.waitForTimeout(delay);
                } else {
                    // Final fallback
                    this.log('🔄 All attempts failed, using emergency fallback');
                    return await this.emergencyFallbackAnalysis(page, siteName);
                }
            }
        }
    }

    /**
     * Enhanced page preparation with better dynamic content handling
     */
    async preparePageForAnalysis(page) {
        this.log('🔧 Preparing page for enhanced analysis...');
        
        // Wait for initial load
        await page.waitForLoadState('domcontentloaded');
        
        // Progressive waiting for form elements
        const formSelectors = [
            'form', 'input', 'textarea', 'select', 'button[type="submit"]',
            '[role="form"]', '[data-form]', '.form', '.registration', '.signup'
        ];
        
        let formFound = false;
        for (let i = 0; i < formSelectors.length && !formFound; i++) {
            try {
                await page.waitForSelector(formSelectors[i], { timeout: 3000 });
                formFound = true;
                this.log(`✅ Found form element: ${formSelectors[i]}`);
            } catch (e) {
                // Continue to next selector
            }
        }
        
        // Wait for dynamic content to stabilize
        let stabilizationAttempts = 0;
        const maxStabilizationAttempts = 5;
        
        while (stabilizationAttempts < maxStabilizationAttempts) {
            const beforeCount = await page.locator('input').count();
            await page.waitForTimeout(1000);
            const afterCount = await page.locator('input').count();
            
            if (beforeCount === afterCount) {
                this.log('✅ Page stabilized');
                break;
            }
            
            stabilizationAttempts++;
            this.log(`🔄 Page still changing, waiting... (${stabilizationAttempts}/${maxStabilizationAttempts})`);
        }
        
        // Try to wait for network idle
        try {
            await page.waitForLoadState('networkidle', { timeout: 8000 });
        } catch (e) {
            this.log('⚠️ Network didn\'t stabilize, continuing anyway');
        }
        
        // Scroll to reveal any lazy-loaded content
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        await page.waitForTimeout(500);
    }

    /**
     * Multi-layered analysis combining LLM and pattern recognition
     */
    async performMultiLayeredAnalysis(page, siteName, options) {
        this.log('🧠 Performing multi-layered analysis...');
        
        // Layer 1: Extract comprehensive page data
        const pageData = await this.extractEnhancedPageData(page);
        
        // Layer 2: Detect page type and context
        const pageContext = this.analyzePageContext(pageData);
        
        // Layer 3: Advanced honeypot detection
        const honeypotAnalysis = this.performAdvancedHoneypotDetection(pageData);
        
        // Layer 4: LLM analysis with enhanced prompts
        let llmAnalysis = null;
        try {
            llmAnalysis = await this.performEnhancedLLMAnalysis(pageData, siteName, pageContext);
        } catch (error) {
            this.log(`⚠️ LLM analysis failed: ${error.message}`);
        }
        
        // Layer 5: Pattern-based analysis
        const patternAnalysis = this.performPatternBasedAnalysis(pageData, pageContext);
        
        // Layer 6: Merge and validate results
        const mergedAnalysis = this.mergeAnalysisResults(llmAnalysis, patternAnalysis, honeypotAnalysis, pageContext);
        
        // Layer 7: Validate selectors against the actual page
        const validatedAnalysis = await this.enhancedSelectorValidation(page, mergedAnalysis);
        
        return validatedAnalysis;
    }

    /**
     * Extract comprehensive page data with better element detection
     */
    async extractEnhancedPageData(page) {
        this.log('📊 Extracting enhanced page data...');
        
        const pageData = await page.evaluate(() => {
            const data = {
                url: window.location.href,
                title: document.title,
                meta: {
                    description: document.querySelector('meta[name="description"]')?.content || '',
                    keywords: document.querySelector('meta[name="keywords"]')?.content || '',
                    viewport: document.querySelector('meta[name="viewport"]')?.content || ''
                },
                
                // Page text analysis
                pageText: document.body.innerText.substring(0, 8000),
                headingText: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim()).join(' '),
                
                // Enhanced form detection
                forms: [],
                allElements: [],
                
                // Page structure indicators
                indicators: {
                    hasRecaptcha: !!(document.querySelector('[class*="recaptcha"], [id*="recaptcha"], [class*="captcha"], [data-sitekey]')),
                    hasFrames: document.querySelectorAll('iframe').length > 0,
                    hasAjaxForms: !!(document.querySelector('[data-ajax], [data-remote], [data-turbo]')),
                    hasReactComponents: !!(document.querySelector('[data-reactroot], [data-react]')),
                    hasVueComponents: !!(document.querySelector('[data-v-]')),
                    totalInputs: document.querySelectorAll('input').length,
                    totalForms: document.querySelectorAll('form').length,
                    hasCSRFTokens: !!(document.querySelector('[name="csrf_token"], [name="_token"], [name="authenticity_token"]'))
                },
                
                // Enhanced page classification
                pageClassification: {
                    isSignup: /sign.?up|register|create.?account|join/i.test(document.body.innerText),
                    isLogin: /log.?in|sign.?in|login/i.test(document.body.innerText),
                    isContact: /contact|message|inquiry/i.test(document.body.innerText),
                    isSurvey: /survey|poll|questionnaire/i.test(document.body.innerText),
                    isCheckout: /checkout|payment|billing/i.test(document.body.innerText)
                }
            };

            // Analyze all forms with enhanced detection
            const forms = document.querySelectorAll('form, [role="form"], [data-form]');
            forms.forEach((form, formIndex) => {
                const formInfo = {
                    index: formIndex,
                    tagName: form.tagName.toLowerCase(),
                    action: form.action || '',
                    method: form.method || 'GET',
                    id: form.id || '',
                    className: form.className || '',
                    innerHTML: form.innerHTML,
                    attributes: {},
                    elements: []
                };
                
                // Get all form attributes
                for (const attr of form.attributes) {
                    formInfo.attributes[attr.name] = attr.value;
                }

                // Enhanced element detection
                const elements = form.querySelectorAll('input, textarea, select, button');
                elements.forEach((element, elementIndex) => {
                    formInfo.elements.push(analyzeElementEnhanced(element, elementIndex, form));
                });

                data.forms.push(formInfo);
            });

            // Also analyze elements outside forms with better detection
            const allInputElements = document.querySelectorAll('input, textarea, select, button');
            allInputElements.forEach((element, index) => {
                if (!element.closest('form, [role="form"], [data-form]')) {
                    data.allElements.push(analyzeElementEnhanced(element, index, null));
                }
            });

            return data;

            // Enhanced element analysis function
            function analyzeElementEnhanced(element, index, parentForm) {
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);
                
                // Get all attributes
                const attributes = {};
                for (const attr of element.attributes) {
                    attributes[attr.name] = attr.value;
                }
                
                // Enhanced context detection
                const context = analyzeElementContextEnhanced(element);
                
                // Enhanced visibility detection
                const visibility = analyzeElementVisibility(element, styles, rect);
                
                // Enhanced suspicious indicator detection
                const suspiciousIndicators = detectSuspiciousIndicatorsEnhanced(element, styles, attributes, context);

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
                    textContent: element.textContent || '',
                    
                    // All attributes for comprehensive analysis
                    attributes: attributes,
                    
                    // State
                    required: element.required || false,
                    disabled: element.disabled || false,
                    readonly: element.readOnly || false,
                    checked: element.checked || false,
                    
                    // Enhanced visibility analysis
                    visibility: visibility,
                    
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
                    
                    // Enhanced context analysis
                    context: context,
                    
                    // Parent information
                    parentForm: parentForm ? {
                        id: parentForm.id,
                        action: parentForm.action,
                        method: parentForm.method,
                        className: parentForm.className
                    } : null,
                    
                    // Enhanced anti-bot indicators
                    suspiciousIndicators: suspiciousIndicators,
                    suspiciousScore: calculateSuspiciousScore(suspiciousIndicators)
                };
            }

            // Enhanced context analysis
            function analyzeElementContextEnhanced(element) {
                const context = {
                    labels: [],
                    nearbyText: [],
                    siblings: [],
                    parent: null,
                    placeholderText: element.placeholder || '',
                    ariaLabel: element.getAttribute('aria-label') || '',
                    title: element.title || ''
                };

                // Multiple label detection strategies
                // Strategy 1: Direct label association
                if (element.id) {
                    const labels = document.querySelectorAll(`label[for="${element.id}"]`);
                    labels.forEach(label => {
                        context.labels.push(label.textContent.trim());
                    });
                }

                // Strategy 2: Parent label
                const parentLabel = element.closest('label');
                if (parentLabel) {
                    context.labels.push(parentLabel.textContent.trim());
                }

                // Strategy 3: Previous/next siblings
                const prevSibling = element.previousElementSibling;
                if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.textContent.trim().length < 100)) {
                    context.nearbyText.push(prevSibling.textContent.trim());
                }

                const nextSibling = element.nextElementSibling;
                if (nextSibling && nextSibling.textContent.trim().length < 100) {
                    context.nearbyText.push(nextSibling.textContent.trim());
                }

                // Strategy 4: Parent container analysis
                const parent = element.parentElement;
                if (parent) {
                    context.parent = {
                        tagName: parent.tagName,
                        className: parent.className,
                        textContent: parent.textContent.trim().substring(0, 300)
                    };
                }

                // Strategy 5: Find nearby text within reasonable distance
                const nearbyElements = document.querySelectorAll('label, span, div, p');
                const elementRect = element.getBoundingClientRect();
                
                nearbyElements.forEach(nearby => {
                    const nearbyRect = nearby.getBoundingClientRect();
                    const distance = Math.sqrt(
                        Math.pow(elementRect.x - nearbyRect.x, 2) + 
                        Math.pow(elementRect.y - nearbyRect.y, 2)
                    );
                    
                    if (distance < 200 && nearby.textContent.trim().length > 2 && nearby.textContent.trim().length < 100) {
                        context.nearbyText.push(nearby.textContent.trim());
                    }
                });

                // Remove duplicates and sort by relevance
                context.labels = [...new Set(context.labels)];
                context.nearbyText = [...new Set(context.nearbyText)].slice(0, 5);

                return context;
            }

            // Enhanced visibility analysis
            function analyzeElementVisibility(element, styles, rect) {
                return {
                    offsetParent: element.offsetParent !== null,
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: parseFloat(styles.opacity),
                    position: styles.position,
                    left: styles.left,
                    top: styles.top,
                    width: styles.width,
                    height: styles.height,
                    zIndex: styles.zIndex,
                    clip: styles.clip,
                    clipPath: styles.clipPath,
                    transform: styles.transform,
                    fontSize: styles.fontSize,
                    lineHeight: styles.lineHeight,
                    
                    // Calculated visibility
                    isVisible: element.offsetParent !== null && 
                              styles.display !== 'none' && 
                              styles.visibility !== 'hidden' && 
                              parseFloat(styles.opacity) > 0,
                    isOffScreen: parseInt(styles.left) < -1000 || parseInt(styles.top) < -1000,
                    isZeroSize: rect.width === 0 || rect.height === 0,
                    isClipped: styles.clip === 'rect(0px, 0px, 0px, 0px)' || styles.clipPath === 'inset(100%)'
                };
            }

            // Enhanced suspicious indicator detection
            function detectSuspiciousIndicatorsEnhanced(element, styles, attributes, context) {
                const indicators = [];
                
                // Style-based detection
                if (styles.display === 'none') indicators.push('display_none');
                if (styles.visibility === 'hidden') indicators.push('visibility_hidden');
                if (parseFloat(styles.opacity) === 0) indicators.push('opacity_zero');
                if (parseInt(styles.left) < -1000 || parseInt(styles.top) < -1000) indicators.push('positioned_offscreen');
                if (styles.position === 'absolute' && (parseInt(styles.left) < -500 || parseInt(styles.top) < -500)) indicators.push('absolute_offscreen');
                if (parseInt(styles.width) === 0 || parseInt(styles.height) === 0) indicators.push('zero_dimensions');
                if (styles.clip === 'rect(0px, 0px, 0px, 0px)') indicators.push('clipped');
                if (styles.clipPath === 'inset(100%)') indicators.push('clip_path_hidden');
                if (parseFloat(styles.fontSize) === 0) indicators.push('zero_font_size');
                if (parseInt(styles.zIndex) < -1) indicators.push('negative_z_index');
                
                // Name and ID based detection
                const suspiciousNames = ['bot', 'spam', 'honeypot', 'trap', 'hidden', 'winnie', 'email_address', 'url', 'website'];
                const elementText = `${element.name} ${element.id} ${element.className}`.toLowerCase();
                suspiciousNames.forEach(name => {
                    if (elementText.includes(name)) {
                        indicators.push(`suspicious_name_${name}`);
                    }
                });
                
                // Class based detection
                const suspiciousClasses = ['honeypot', 'bot-trap', 'spam-trap', 'hidden', 'invisible', 'sr-only', 'screen-reader-only'];
                suspiciousClasses.forEach(cls => {
                    if (element.className.toLowerCase().includes(cls)) {
                        indicators.push(`suspicious_class_${cls}`);
                    }
                });
                
                // Attribute based detection
                if (element.tabIndex === -1) indicators.push('negative_tabindex');
                if (attributes['aria-hidden'] === 'true') indicators.push('aria_hidden');
                if (attributes.autocomplete === 'off' && elementText.includes('email')) indicators.push('email_autocomplete_off');
                
                // Context based detection
                const contextText = context.labels.concat(context.nearbyText).join(' ').toLowerCase();
                if (contextText.includes('leave blank') || contextText.includes('do not fill')) {
                    indicators.push('instruction_leave_blank');
                }
                
                return indicators;
            }

            // Calculate suspicious score
            function calculateSuspiciousScore(indicators) {
                let score = 0;
                indicators.forEach(indicator => {
                    if (indicator.includes('display_none') || indicator.includes('visibility_hidden')) score += 0.8;
                    else if (indicator.includes('positioned_offscreen') || indicator.includes('zero_dimensions')) score += 0.7;
                    else if (indicator.includes('suspicious_name_')) score += 0.6;
                    else if (indicator.includes('suspicious_class_')) score += 0.5;
                    else score += 0.3;
                });
                return Math.min(score, 1.0);
            }
        });

        this.log(`📊 Enhanced extraction complete: ${pageData.forms.length} forms, ${pageData.allElements.length} loose elements`);
        return pageData;
    }

    /**
     * Analyze page context to understand the type and purpose
     */
    analyzePageContext(pageData) {
        const context = {
            pageType: 'unknown',
            confidence: 0.5,
            indicators: [],
            primaryAction: 'unknown',
            formPurpose: 'unknown'
        };

        const fullText = `${pageData.title} ${pageData.pageText} ${pageData.headingText}`.toLowerCase();

        // Detect page type
        for (const [type, pattern] of Object.entries(this.formTypePatterns)) {
            if (pattern.test(fullText)) {
                context.pageType = type;
                context.confidence = 0.8;
                context.indicators.push(`text_match_${type}`);
                break;
            }
        }

        // Analyze form purpose based on fields
        const allElements = [...pageData.forms.flatMap(f => f.elements), ...pageData.allElements];
        const fieldTypes = allElements.map(e => e.type).filter(Boolean);
        const fieldNames = allElements.map(e => `${e.name} ${e.id} ${e.placeholder}`).join(' ').toLowerCase();

        if (fieldNames.includes('password') && fieldNames.includes('email')) {
            if (fieldNames.includes('confirm') || fieldNames.includes('verify')) {
                context.formPurpose = 'registration';
                context.primaryAction = 'register';
            } else {
                context.formPurpose = 'login';
                context.primaryAction = 'login';
            }
        } else if (fieldNames.includes('message') || fieldNames.includes('comment')) {
            context.formPurpose = 'contact';
            context.primaryAction = 'send_message';
        }

        this.log(`📊 Page context: ${context.pageType} (${context.confidence}) - ${context.formPurpose}`);
        return context;
    }

    /**
     * Advanced honeypot detection using multiple techniques
     */
    performAdvancedHoneypotDetection(pageData) {
        this.log('🍯 Performing advanced honeypot detection...');
        
        const honeypots = [];
        const allElements = [...pageData.forms.flatMap(f => f.elements), ...pageData.allElements];
        
        allElements.forEach(element => {
            let honeypotScore = 0;
            const reasons = [];
            
            // Check suspicious score
            if (element.suspiciousScore > 0.5) {
                honeypotScore += element.suspiciousScore;
                reasons.push(`suspicious_score_${element.suspiciousScore.toFixed(2)}`);
            }
            
            // Check for common honeypot patterns
            const elementIdentifier = `${element.name} ${element.id} ${element.className}`.toLowerCase();
            
            this.advancedAntiBotIndicators.honeypotNames.forEach(pattern => {
                if (elementIdentifier.includes(pattern)) {
                    honeypotScore += 0.7;
                    reasons.push(`name_pattern_${pattern}`);
                }
            });
            
            // Check visibility indicators
            if (!element.visibility.isVisible) {
                honeypotScore += 0.8;
                reasons.push('not_visible');
            }
            
            if (element.visibility.isOffScreen) {
                honeypotScore += 0.9;
                reasons.push('off_screen');
            }
            
            if (element.visibility.isZeroSize) {
                honeypotScore += 0.8;
                reasons.push('zero_size');
            }
            
            // Check for duplicate fields (common honeypot technique)
            const similarFields = allElements.filter(other => 
                other !== element && 
                other.type === element.type && 
                (other.name === element.name || other.id === element.id)
            );
            
            if (similarFields.length > 0) {
                honeypotScore += 0.6;
                reasons.push('duplicate_field');
            }
            
            // If score is high enough, mark as honeypot
            if (honeypotScore > 0.6) {
                const selector = this.generateBestSelector(element);
                honeypots.push({
                    selector: selector,
                    element: element,
                    score: honeypotScore,
                    reasons: reasons,
                    trapType: reasons.join(','),
                    reasoning: `Advanced detection: ${reasons.join(', ')} (score: ${honeypotScore.toFixed(2)})`,
                    action: 'ignore'
                });
            }
        });
        
        this.log(`🍯 Advanced honeypot detection found ${honeypots.length} potential traps`);
        return honeypots;
    }

    /**
     * Enhanced LLM analysis with better prompts
     */
    async performEnhancedLLMAnalysis(pageData, siteName, pageContext) {
        this.log('🤖 Performing enhanced LLM analysis...');
        
        const focusedHTML = this.prepareFocusedHTML(pageData);
        const enhancedPrompt = this.buildEnhancedAnalysisPrompt(pageData, siteName, pageContext, focusedHTML);
        
        try {
            const response = await this.contentAI.analyzeAndRespond({
                question: enhancedPrompt,
                type: 'enhanced_form_analysis'
            }, `enhanced_analysis_${siteName}_${Date.now()}`);

            let analysis = typeof response === 'string' ? JSON.parse(response) : response;
            
            // Validate and enhance LLM response
            analysis = this.validateAndEnhanceLLMResponse(analysis, pageData);
            
            this.log(`🤖 Enhanced LLM analysis completed: ${analysis.fields?.length || 0} fields identified`);
            return analysis;
            
        } catch (error) {
            this.log(`❌ Enhanced LLM analysis failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Build enhanced analysis prompt with better context
     */
    buildEnhancedAnalysisPrompt(pageData, siteName, pageContext, focusedHTML) {
        return `You are an expert web automation specialist analyzing a ${pageContext.pageType} form on ${siteName}.

CONTEXT ANALYSIS:
- Site: ${siteName}
- URL: ${pageData.url}
- Page Type: ${pageContext.pageType} (confidence: ${pageContext.confidence})
- Form Purpose: ${pageContext.formPurpose}
- Primary Action: ${pageContext.primaryAction}

TECHNICAL INDICATORS:
- Has reCAPTCHA: ${pageData.indicators.hasRecaptcha}
- Has iframes: ${pageData.indicators.hasFrames}
- AJAX forms: ${pageData.indicators.hasAjaxForms}
- React components: ${pageData.indicators.hasReactComponents}
- Total inputs: ${pageData.indicators.totalInputs}
- Total forms: ${pageData.indicators.totalForms}

PAGE CONTENT SAMPLE: ${pageData.pageText.substring(0, 1000)}

FORM HTML TO ANALYZE:
${focusedHTML}

CRITICAL MISSION: Help a bot successfully register/login by:

1. IDENTIFYING REAL FIELDS the bot should fill:
   - Look for email, password, name, phone, etc.
   - Provide the MOST RELIABLE selector (prefer #id, then [name=""], then specific CSS)
   - Determine the field purpose from context clues

2. DETECTING HONEYPOT TRAPS the bot must AVOID:
   - Hidden fields (display:none, visibility:hidden, opacity:0)
   - Off-screen fields (left:-9999px, position:absolute with negative coords)
   - Zero-size fields (width:0, height:0)
   - Suspicious names: bot, spam, honeypot, trap, hidden, winnie_the_pooh, website, url
   - Duplicate fields (often one real, one trap)
   - Fields with tabindex="-1" or aria-hidden="true"

3. UNDERSTANDING FORM BEHAVIOR:
   - Multi-step forms
   - AJAX submission
   - Client-side validation
   - Required vs optional fields

Return JSON in this EXACT format:
{
  "analysis": "detailed description of form structure and bot challenges",
  "confidence": 0.0-1.0,
  "pageType": "${pageContext.pageType}",
  "formStrategy": "single_form|multi_step|ajax|complex",
  
  "fields": [
    {
      "purpose": "email|firstName|lastName|fullName|password|confirmPassword|phone|company|address|other",
      "selector": "most reliable CSS selector (#id preferred)",
      "type": "text|email|password|tel|number|url|date",
      "required": true|false,
      "importance": "critical|important|optional",
      "reasoning": "why this field serves this purpose",
      "contextClues": "labels, placeholder, nearby text that helped identify",
      "isHoneypot": false
    }
  ],
  
  "checkboxes": [
    {
      "purpose": "terms|privacy|newsletter|marketing|notifications|other",
      "selector": "exact CSS selector",
      "action": "check|uncheck|conditional",
      "importance": "critical|important|optional",
      "reasoning": "why this checkbox should be handled this way",
      "isHoneypot": false
    }
  ],
  
  "honeypots": [
    {
      "selector": "exact CSS selector",
      "trapType": "hidden|positioned|zero_size|suspicious_name|duplicate",
      "reasoning": "specific evidence this is a bot trap",
      "action": "ignore",
      "dangerLevel": "high|medium|low"
    }
  ],
  
  "submitButton": {
    "selector": "exact CSS selector for submit button",
    "text": "button text",
    "type": "button|input|ajax",
    "requiresValidation": true|false
  },
  
  "additionalChallenges": {
    "hasCaptcha": true|false,
    "hasEmailVerification": true|false,
    "hasMultiStep": true|false,
    "hasAjaxValidation": true|false,
    "recommendedDelay": "suggested delay between actions in ms"
  }
}

CRITICAL: Be extremely accurate about honeypots - missing one could trigger bot detection!`;
    }

    /**
     * Validate and enhance LLM response
     */
    validateAndEnhanceLLMResponse(analysis, pageData) {
        // Ensure required properties exist
        analysis.fields = analysis.fields || [];
        analysis.checkboxes = analysis.checkboxes || [];
        analysis.honeypots = analysis.honeypots || [];
        analysis.confidence = analysis.confidence || 0.5;
        
        // Validate selectors exist on page
        const allElements = [...pageData.forms.flatMap(f => f.elements), ...pageData.allElements];
        
        analysis.fields = analysis.fields.filter(field => {
            const element = allElements.find(el => 
                `#${el.id}` === field.selector || 
                `[name="${el.name}"]` === field.selector ||
                el.outerHTML.includes(field.selector.replace(/[#\[\]="]/g, ''))
            );
            return element !== undefined;
        });
        
        // Add confidence scores
        analysis.fields.forEach(field => {
            field.confidence = field.confidence || 0.8;
            field.validated = true;
        });
        
        return analysis;
    }

    /**
     * Pattern-based analysis as fallback
     */
    performPatternBasedAnalysis(pageData, pageContext) {
        this.log('🔍 Performing pattern-based analysis...');
        
        const fields = [];
        const checkboxes = [];
        const honeypots = [];
        
        const allElements = [...pageData.forms.flatMap(f => f.elements), ...pageData.allElements];
        
        allElements.forEach(element => {
            // Skip if already identified as honeypot
            if (element.suspiciousScore > 0.6) {
                const selector = this.generateBestSelector(element);
                honeypots.push({
                    selector: selector,
                    trapType: element.suspiciousIndicators.join(','),
                    reasoning: `Pattern detection: suspicious score ${element.suspiciousScore.toFixed(2)}`,
                    action: 'ignore',
                    dangerLevel: element.suspiciousScore > 0.8 ? 'high' : 'medium'
                });
                return;
            }
            
            // Skip if not visible
            if (!element.visibility.isVisible) {
                return;
            }
            
            const purpose = this.inferFieldPurposeEnhanced(element);
            const selector = this.generateBestSelector(element);
            
            if (element.type === 'checkbox') {
                checkboxes.push({
                    purpose: purpose,
                    selector: selector,
                    action: purpose === 'terms' || purpose === 'privacy' ? 'check' : 'conditional',
                    importance: purpose === 'terms' ? 'critical' : 'optional',
                    reasoning: `Pattern-based identification from: ${element.context.labels.join(', ')}`,
                    isHoneypot: false
                });
            } else if (['text', 'email', 'password', 'tel', 'number'].includes(element.type)) {
                fields.push({
                    purpose: purpose,
                    selector: selector,
                    type: element.type,
                    required: element.required,
                    importance: ['email', 'password'].includes(purpose) ? 'critical' : 'important',
                    reasoning: `Pattern-based identification from: ${element.context.labels.join(', ')}`,
                    contextClues: element.context.labels.concat(element.context.nearbyText).join(', '),
                    isHoneypot: false
                });
            }
        });
        
        this.log(`🔍 Pattern analysis complete: ${fields.length} fields, ${checkboxes.length} checkboxes, ${honeypots.length} honeypots`);
        
        return {
            analysis: 'Pattern-based analysis',
            confidence: 0.7,
            pageType: pageContext.pageType,
            formStrategy: 'standard',
            fields: fields,
            checkboxes: checkboxes,
            honeypots: honeypots,
            submitButton: {
                selector: 'button[type="submit"], input[type="submit"], button:contains("submit")',
                text: 'Submit',
                type: 'button'
            }
        };
    }

    /**
     * Enhanced field purpose inference
     */
    inferFieldPurposeEnhanced(element) {
        const allText = [
            element.name, element.id, element.placeholder,
            ...element.context.labels,
            ...element.context.nearbyText,
            element.context.ariaLabel,
            element.context.title
        ].join(' ').toLowerCase();
        
        // Enhanced pattern matching with priority order
        const patterns = [
            { regex: /\b(email).*\b(confirm|verify|repeat|again)\b|\b(confirm|verify|repeat|again).*\b(email)\b/i, purpose: 'confirmEmail' },
            { regex: /\b(password).*\b(confirm|verify|repeat|again)\b|\b(confirm|verify|repeat|again).*\b(password)\b/i, purpose: 'confirmPassword' },
            { regex: /\bemail\b/i, purpose: 'email' },
            { regex: /\bpassword\b/i, purpose: 'password' },
            { regex: /\b(first.*name|fname|given.*name)\b/i, purpose: 'firstName' },
            { regex: /\b(last.*name|lname|surname|family.*name)\b/i, purpose: 'lastName' },
            { regex: /\b(full.*name|name|display.*name)\b/i, purpose: 'fullName' },
            { regex: /\b(phone|tel|mobile|cell)\b/i, purpose: 'phone' },
            { regex: /\b(company|organization|org|business)\b/i, purpose: 'company' },
            { regex: /\b(address|street|location)\b/i, purpose: 'address' },
            { regex: /\b(age|birth|dob)\b/i, purpose: 'age' },
            { regex: /\b(gender|sex)\b/i, purpose: 'gender' },
            { regex: /\b(terms|agreement|tos)\b/i, purpose: 'terms' },
            { regex: /\b(privacy|policy)\b/i, purpose: 'privacy' },
            { regex: /\b(newsletter|updates|news)\b/i, purpose: 'newsletter' },
            { regex: /\b(marketing|promo|offer)\b/i, purpose: 'marketing' }
        ];
        
        for (const pattern of patterns) {
            if (pattern.regex.test(allText)) {
                return pattern.purpose;
            }
        }
        
        // Fallback based on input type
        if (element.type === 'email') return 'email';
        if (element.type === 'password') return 'password';
        if (element.type === 'tel') return 'phone';
        if (element.type === 'number') return 'age';
        
        return 'other';
    }

    /**
     * Generate the best possible selector for an element
     */
    generateBestSelector(element) {
        // Priority order: id, name, specific attributes, class, position
        
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.name) {
            return `[name="${element.name}"]`;
        }
        
        if (element.type && element.type !== element.tagName) {
            let selector = `${element.tagName}[type="${element.type}"]`;
            
            // Add additional specificity if needed
            if (element.className) {
                const firstClass = element.className.split(' ')[0];
                if (firstClass && !firstClass.includes('random') && !firstClass.includes('generated')) {
                    selector += `.${firstClass}`;
                }
            }
            
            return selector;
        }
        
        if (element.className) {
            const classes = element.className.split(' ').filter(c => 
                c && !c.includes('random') && !c.includes('generated') && c.length > 2
            );
            if (classes.length > 0) {
                return `.${classes[0]}`;
            }
        }
        
        // Last resort: use tag with position
        return `${element.tagName}:nth-of-type(${element.index + 1})`;
    }

    /**
     * Merge analysis results from different methods
     */
    mergeAnalysisResults(llmAnalysis, patternAnalysis, honeypotAnalysis, pageContext) {
        this.log('🔗 Merging analysis results...');
        
        // Start with pattern analysis as base
        let mergedAnalysis = { ...patternAnalysis };
        
        // If LLM analysis is available and good quality, prefer it
        if (llmAnalysis && llmAnalysis.confidence > 0.6) {
            mergedAnalysis = {
                ...llmAnalysis,
                // Merge honeypots from both analyses
                honeypots: [
                    ...(llmAnalysis.honeypots || []),
                    ...honeypotAnalysis.filter(hp => 
                        !llmAnalysis.honeypots?.some(llmHp => llmHp.selector === hp.selector)
                    )
                ]
            };
        } else {
            // Use pattern analysis but add honeypots
            mergedAnalysis.honeypots = honeypotAnalysis;
        }
        
        // Ensure minimum quality
        if (!mergedAnalysis.fields || mergedAnalysis.fields.length === 0) {
            mergedAnalysis = patternAnalysis;
            mergedAnalysis.honeypots = honeypotAnalysis;
        }
        
        // Add metadata
        mergedAnalysis.analysisMethod = llmAnalysis ? 'llm_primary' : 'pattern_primary';
        mergedAnalysis.pageContext = pageContext;
        mergedAnalysis.timestamp = Date.now();
        
        this.log(`🔗 Merged analysis: ${mergedAnalysis.fields.length} fields, ${mergedAnalysis.honeypots.length} honeypots`);
        return mergedAnalysis;
    }

    /**
     * Enhanced selector validation against the actual page
     */
    async enhancedSelectorValidation(page, analysis) {
        this.log('✅ Performing enhanced selector validation...');
        
        // Validate field selectors
        for (const field of analysis.fields) {
            try {
                const element = page.locator(field.selector).first();
                const count = await element.count();
                
                if (count === 0) {
                    this.log(`❌ Field selector failed: ${field.selector}`);
                    field.selectorValid = false;
                    
                    // Try to find alternative selector
                    const alternativeSelector = await this.findAlternativeSelector(page, field);
                    if (alternativeSelector) {
                        field.selector = alternativeSelector;
                        field.selectorValid = true;
                        field.selectorAlternative = true;
                        this.log(`✅ Found alternative selector: ${alternativeSelector}`);
                    }
                } else {
                    field.selectorValid = true;
                    
                    // Additional validation: check if element is actually interactable
                    try {
                        field.actuallyVisible = await element.isVisible();
                        field.actuallyEnabled = await element.isEnabled();
                        field.actuallyInteractable = field.actuallyVisible && field.actuallyEnabled;
                    } catch (e) {
                        field.actuallyInteractable = false;
                    }
                }
                
            } catch (error) {
                field.selectorValid = false;
                this.log(`❌ Selector validation error for ${field.selector}: ${error.message}`);
            }
        }
        
        // Validate checkbox selectors
        for (const checkbox of analysis.checkboxes || []) {
            try {
                const element = page.locator(checkbox.selector).first();
                const count = await element.count();
                checkbox.selectorValid = count > 0;
                
                if (count > 0) {
                    checkbox.actuallyVisible = await element.isVisible();
                    checkbox.actuallyInteractable = checkbox.actuallyVisible;
                }
            } catch (error) {
                checkbox.selectorValid = false;
            }
        }
        
        // Validate submit button
        if (analysis.submitButton) {
            try {
                const element = page.locator(analysis.submitButton.selector).first();
                const count = await element.count();
                analysis.submitButton.selectorValid = count > 0;
                
                if (count === 0) {
                    // Try common submit button patterns
                    const submitPatterns = [
                        'button[type="submit"]',
                        'input[type="submit"]',
                        'button:has-text("submit")',
                        'button:has-text("sign up")',
                        'button:has-text("register")',
                        'button:has-text("create")',
                        '.submit-btn',
                        '#submit'
                    ];
                    
                    for (const pattern of submitPatterns) {
                        const testElement = page.locator(pattern).first();
                        const testCount = await testElement.count();
                        if (testCount > 0) {
                            analysis.submitButton.selector = pattern;
                            analysis.submitButton.selectorValid = true;
                            break;
                        }
                    }
                }
            } catch (error) {
                analysis.submitButton.selectorValid = false;
            }
        }
        
        // Calculate validation success rate
        const totalSelectors = analysis.fields.length + (analysis.checkboxes?.length || 0) + (analysis.submitButton ? 1 : 0);
        const validSelectors = analysis.fields.filter(f => f.selectorValid).length + 
                              (analysis.checkboxes?.filter(c => c.selectorValid).length || 0) + 
                              (analysis.submitButton?.selectorValid ? 1 : 0);
        
        analysis.validationSuccessRate = totalSelectors > 0 ? validSelectors / totalSelectors : 0;
        
        this.log(`✅ Validation complete: ${validSelectors}/${totalSelectors} selectors valid (${(analysis.validationSuccessRate * 100).toFixed(1)}%)`);
        return analysis;
    }

    /**
     * Find alternative selector when primary fails
     */
    async findAlternativeSelector(page, field) {
        const alternatives = [
            // Try by placeholder
            field.placeholder ? `[placeholder="${field.placeholder}"]` : null,
            // Try by type and position
            `input[type="${field.type}"]:nth-of-type(1)`,
            `input[type="${field.type}"]:nth-of-type(2)`,
            // Try by context
            field.contextClues ? `input:near(text="${field.contextClues.split(' ')[0]}")` : null
        ].filter(Boolean);
        
        for (const alternative of alternatives) {
            try {
                const count = await page.locator(alternative).count();
                if (count > 0) {
                    return alternative;
                }
            } catch (e) {
                // Continue to next alternative
            }
        }
        
        return null;
    }

    /**
     * Validate analysis quality before returning
     */
    validateAnalysisQuality(analysis) {
        if (!analysis) return false;
        
        // Must have at least some fields or a clear reason why not
        if (!analysis.fields || analysis.fields.length === 0) {
            if (!analysis.honeypots || analysis.honeypots.length === 0) {
                return false; // No fields and no honeypots detected - probably failed
            }
        }
        
        // Must have reasonable confidence
        if (analysis.confidence < 0.3) {
            return false;
        }
        
        // Must have validated selectors if fields exist
        if (analysis.fields && analysis.fields.length > 0) {
            const validFields = analysis.fields.filter(f => f.selectorValid);
            if (validFields.length === 0) {
                return false; // No valid selectors
            }
        }
        
        return true;
    }

    /**
     * Emergency fallback analysis when all else fails
     */
    async emergencyFallbackAnalysis(page, siteName) {
        this.log('🚨 Performing emergency fallback analysis...');
        
        try {
            // Simple direct element detection
            const inputs = await page.locator('input').all();
            const fields = [];
            
            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                const type = await input.getAttribute('type') || 'text';
                const name = await input.getAttribute('name') || '';
                const id = await input.getAttribute('id') || '';
                const placeholder = await input.getAttribute('placeholder') || '';
                
                let selector = '';
                if (id) {
                    selector = `#${id}`;
                } else if (name) {
                    selector = `[name="${name}"]`;
                } else {
                    selector = `input:nth-of-type(${i + 1})`;
                }
                
                // Simple purpose detection
                const text = `${name} ${id} ${placeholder}`.toLowerCase();
                let purpose = 'other';
                if (text.includes('email')) purpose = 'email';
                else if (text.includes('password')) purpose = 'password';
                else if (text.includes('name')) purpose = 'firstName';
                
                fields.push({
                    purpose: purpose,
                    selector: selector,
                    type: type,
                    required: false,
                    importance: 'optional',
                    reasoning: 'Emergency fallback detection',
                    selectorValid: true,
                    actuallyVisible: true
                });
            }
            
            return {
                analysis: 'Emergency fallback analysis',
                confidence: 0.4,
                pageType: 'unknown',
                formStrategy: 'simple',
                fields: fields,
                checkboxes: [],
                honeypots: [],
                submitButton: {
                    selector: 'button[type="submit"], input[type="submit"]',
                    text: 'Submit',
                    type: 'button',
                    selectorValid: true
                },
                validationSuccessRate: 1.0,
                analysisMethod: 'emergency_fallback'
            };
            
        } catch (error) {
            this.log(`❌ Emergency fallback also failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cache analysis results
     */
    cacheAnalysis(siteName, url, analysis) {
        if (!this.options.cacheResults) return;
        
        const cacheKey = `${siteName}_${url}`;
        this.formPatternCache.set(cacheKey, {
            analysis: analysis,
            timestamp: Date.now(),
            siteName: siteName,
            url: url
        });
        
        this.log(`💾 Cached analysis for ${siteName}`);
    }

    /**
     * Get cached analysis if available and fresh
     */
    getCachedAnalysis(siteName, url) {
        if (!this.options.cacheResults) return null;
        
        const cacheKey = `${siteName}_${url}`;
        const cached = this.formPatternCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < 1800000) { // 30 minute cache
            return cached.analysis;
        }
        
        return null;
    }

    /**
     * Log analysis results summary
     */
    logAnalysisResults(analysis) {
        this.log('📊 ANALYSIS RESULTS SUMMARY:');
        this.log(`   🎯 Page Type: ${analysis.pageType} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
        this.log(`   📝 Fields: ${analysis.fields.length} total, ${analysis.fields.filter(f => f.selectorValid).length} valid`);
        this.log(`   ☑️ Checkboxes: ${analysis.checkboxes?.length || 0}`);
        this.log(`   🍯 Honeypots: ${analysis.honeypots?.length || 0} detected`);
        this.log(`   📤 Submit button: ${analysis.submitButton?.selectorValid ? 'Found' : 'Not found'}`);
        this.log(`   ✅ Validation rate: ${(analysis.validationSuccessRate * 100).toFixed(1)}%`);
        this.log(`   🔧 Method: ${analysis.analysisMethod || 'standard'}`);
    }

    /**
     * Enhanced HTML preparation
     */
    prepareFocusedHTML(pageData) {
        let focusedHTML = '';
        
        // Include form HTML with better structure preservation
        pageData.forms.forEach(form => {
            focusedHTML += `<form id="${form.id}" class="${form.className}" action="${form.action}" method="${form.method}">\n`;
            focusedHTML += form.innerHTML;
            focusedHTML += '\n</form>\n\n';
        });
        
        // Include loose elements with context
        pageData.allElements.forEach(element => {
            focusedHTML += element.outerHTML + '\n';
        });
        
        // Enhanced cleaning while preserving important attributes
        focusedHTML = focusedHTML
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Intelligent truncation
        if (focusedHTML.length > 12000) {
            // Try to keep complete form elements
            const formEndIndex = focusedHTML.lastIndexOf('</form>', 12000);
            if (formEndIndex > 8000) {
                focusedHTML = focusedHTML.substring(0, formEndIndex + 7) + '\n... [truncated]';
            } else {
                focusedHTML = focusedHTML.substring(0, 12000) + '\n... [truncated]';
            }
        }
        
        return focusedHTML;
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[EnhancedFormAnalyzer] ${message}`);
        }
    }
}

module.exports = EnhancedUniversalFormAnalyzer;