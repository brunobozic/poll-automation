/**
 * Next-Generation Multimodal Web Understanding System
 * Combines cutting-edge techniques: accessibility tree, semantic HTML, visual AI, DOM fusion
 * Based on latest 2024 research in web scraping and page understanding
 */

const fs = require('fs').promises;
const path = require('path');

class AdvancedWebUnderstanding {
    constructor(aiService, page) {
        this.ai = aiService;
        this.page = page;
        this.cache = new Map();
        this.semanticCache = new Map();
        this.accessibilityCache = new Map();
        
        // Understanding strategies ranked by effectiveness and cost
        this.strategies = [
            'semantic_html',        // Most reliable, cheapest
            'accessibility_tree',   // High semantic value, medium cost
            'dom_structural',      // Good reliability, low cost
            'visual_ai_fallback',  // Most expensive, highest adaptability
            'hybrid_fusion'        // Best accuracy, highest cost
        ];
        
        // Model selection based on complexity
        this.modelSelection = {
            simple: 'gpt-3.5-turbo',
            complex: 'gpt-4-turbo',
            visual: 'gpt-4-vision-preview'
        };
    }

    /**
     * Main entry point - intelligent page understanding with multi-strategy approach
     */
    async understandPage(options = {}) {
        console.log('🧠 Starting advanced web understanding...');
        
        const pageComplexity = await this.assessPageComplexity();
        const strategy = this.selectOptimalStrategy(pageComplexity, options);
        
        console.log(`📊 Page complexity: ${pageComplexity.level}, Strategy: ${strategy}`);
        
        try {
            let result;
            
            switch (strategy) {
                case 'semantic_html':
                    result = await this.semanticHTMLAnalysis();
                    break;
                case 'accessibility_tree':
                    result = await this.accessibilityTreeAnalysis();
                    break;
                case 'dom_structural':
                    result = await this.structuralDOMAnalysis();
                    break;
                case 'visual_ai_fallback':
                    result = await this.visualAIAnalysis();
                    break;
                case 'hybrid_fusion':
                    result = await this.hybridFusionAnalysis();
                    break;
                default:
                    result = await this.hybridFusionAnalysis(); // Default to best approach
            }
            
            // Post-process and validate results
            result = await this.validateAndEnhanceResults(result, pageComplexity);
            
            return {
                ...result,
                strategy,
                complexity: pageComplexity,
                confidence: this.calculateConfidence(result, strategy),
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error(`Strategy ${strategy} failed, trying fallback:`, error.message);
            return await this.fallbackAnalysis(pageComplexity);
        }
    }

    /**
     * Assess page complexity to determine optimal strategy
     */
    async assessPageComplexity() {
        const metrics = await this.page.evaluate(() => {
            const body = document.body;
            const html = document.documentElement;
            
            return {
                // DOM metrics
                totalElements: document.querySelectorAll('*').length,
                formElements: document.querySelectorAll('input, select, textarea, button').length,
                textNodes: document.evaluate('//text()[normalize-space(.) != ""]', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength,
                
                // JavaScript framework detection
                hasReact: !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__),
                hasVue: !!(window.Vue || window.__VUE__),
                hasAngular: !!(window.angular || window.ng),
                
                // Dynamic content indicators
                hasAsyncContent: !!document.querySelector('[data-async], [data-load], .loading'),
                hasInfiniteScroll: !!document.querySelector('[data-infinite], .infinite-scroll'),
                
                // Accessibility indicators
                hasAriaLabels: document.querySelectorAll('[aria-label], [aria-labelledby]').length,
                hasSemanticHTML: document.querySelectorAll('main, section, article, header, footer, nav, aside').length,
                hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
                
                // Visual complexity
                hasCSS: !!document.querySelector('link[rel="stylesheet"], style'),
                hasImages: document.querySelectorAll('img, svg, canvas').length,
                hasVideos: document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length,
                
                // Interaction complexity
                hasModals: document.querySelectorAll('.modal, [role="dialog"], [aria-modal]').length,
                hasTooltips: document.querySelectorAll('[title], [data-tooltip], .tooltip').length,
                hasDropdowns: document.querySelectorAll('select, .dropdown, [role="combobox"]').length,
                
                // Content structure
                contentDepth: Math.max(...Array.from(document.querySelectorAll('*')).map(el => {
                    let depth = 0;
                    let parent = el.parentElement;
                    while (parent) {
                        depth++;
                        parent = parent.parentElement;
                    }
                    return depth;
                })),
                
                // Page dimensions
                scrollHeight: Math.max(body.scrollHeight, html.scrollHeight),
                clientHeight: Math.max(body.clientHeight, html.clientHeight),
                hasLongContent: (body.scrollHeight > window.innerHeight * 3)
            };
        });

        // Calculate complexity score
        let complexityScore = 0;
        
        // DOM complexity (0-30 points)
        if (metrics.totalElements > 1000) complexityScore += 10;
        if (metrics.totalElements > 500) complexityScore += 5;
        if (metrics.contentDepth > 15) complexityScore += 10;
        if (metrics.formElements > 20) complexityScore += 5;
        
        // Framework complexity (0-20 points)
        if (metrics.hasReact || metrics.hasVue || metrics.hasAngular) complexityScore += 15;
        if (metrics.hasAsyncContent) complexityScore += 5;
        
        // Interaction complexity (0-25 points)
        if (metrics.hasModals > 0) complexityScore += 10;
        if (metrics.hasDropdowns > 5) complexityScore += 5;
        if (metrics.hasInfiniteScroll) complexityScore += 10;
        
        // Content complexity (0-25 points)
        if (metrics.hasLongContent) complexityScore += 10;
        if (metrics.hasImages > 20) complexityScore += 5;
        if (metrics.hasVideos > 0) complexityScore += 10;
        
        const level = complexityScore < 25 ? 'simple' : 
                      complexityScore < 60 ? 'moderate' : 'complex';
        
        return {
            level,
            score: complexityScore,
            metrics,
            recommendation: this.getStrategyRecommendation(level, metrics)
        };
    }

    /**
     * Strategy 1: Semantic HTML Analysis (most reliable for well-structured sites)
     */
    async semanticHTMLAnalysis() {
        console.log('🏗️ Analyzing semantic HTML structure...');
        
        const semanticData = await this.page.evaluate(() => {
            const result = {
                structure: {},
                forms: [],
                semanticElements: [],
                questions: [],
                navigation: {}
            };
            
            // Extract semantic structure
            const semanticTags = ['main', 'section', 'article', 'header', 'footer', 'nav', 'aside'];
            semanticTags.forEach(tag => {
                const elements = document.querySelectorAll(tag);
                result.structure[tag] = Array.from(elements).map(el => ({
                    text: el.textContent?.trim().substring(0, 200),
                    role: el.getAttribute('role'),
                    ariaLabel: el.getAttribute('aria-label'),
                    id: el.id,
                    className: el.className
                }));
            });
            
            // Extract forms with semantic context
            document.querySelectorAll('form').forEach((form, index) => {
                const formData = {
                    index,
                    id: form.id,
                    action: form.action,
                    method: form.method,
                    fieldGroups: []
                };
                
                // Group related fields using fieldsets or semantic grouping
                const fieldsets = form.querySelectorAll('fieldset');
                if (fieldsets.length > 0) {
                    fieldsets.forEach(fieldset => {
                        const legend = fieldset.querySelector('legend');
                        formData.fieldGroups.push({
                            legend: legend?.textContent?.trim(),
                            fields: this.extractFieldsFromContainer(fieldset)
                        });
                    });
                } else {
                    // Group by visual/logical sections
                    formData.fieldGroups.push({
                        legend: 'Main Form',
                        fields: this.extractFieldsFromContainer(form)
                    });
                }
                
                result.forms.push(formData);
            });
            
            // Extract questions using semantic patterns
            const questionPatterns = [
                'label[for] + input, label[for] + select, label[for] + textarea',
                '[role="group"][aria-labelledby]',
                '.question, .form-question, .survey-question',
                'fieldset legend + *'
            ];
            
            questionPatterns.forEach(pattern => {
                try {
                    document.querySelectorAll(pattern).forEach(el => {
                        const questionData = this.extractQuestionSemantics(el);
                        if (questionData && questionData.text.length > 10) {
                            result.questions.push(questionData);
                        }
                    });
                } catch (e) {
                    // Continue with other patterns
                }
            });
            
            // Helper functions defined outside the main logic
            function extractFieldsFromContainer(container) {
                const fields = [];
                const inputs = container.querySelectorAll('input, select, textarea, button');
                
                inputs.forEach(input => {
                    const label = container.querySelector(`label[for="${input.id}"]`) ||
                                 input.closest('label') ||
                                 input.previousElementSibling?.tagName === 'LABEL' ? input.previousElementSibling : null;
                    
                    fields.push({
                        type: input.type || input.tagName.toLowerCase(),
                        name: input.name,
                        id: input.id,
                        required: input.required,
                        placeholder: input.placeholder,
                        value: input.value,
                        label: label?.textContent?.trim(),
                        ariaLabel: input.getAttribute('aria-label'),
                        ariaDescribedBy: input.getAttribute('aria-describedby')
                    });
                });
                
                return fields;
            }
            
            function extractQuestionSemantics(element) {
                const question = {
                    text: '',
                    type: 'unknown',
                    options: [],
                    required: false,
                    context: {}
                };
                
                // Extract question text from various sources
                if (element.tagName === 'LABEL') {
                    question.text = element.textContent?.trim();
                    const input = document.getElementById(element.getAttribute('for'));
                    if (input) {
                        question.type = input.type || input.tagName.toLowerCase();
                        question.required = input.required;
                    }
                } else if (element.closest('fieldset')) {
                    const fieldset = element.closest('fieldset');
                    const legend = fieldset.querySelector('legend');
                    question.text = legend?.textContent?.trim() || '';
                    
                    // Determine question type from inputs
                    const radios = fieldset.querySelectorAll('input[type="radio"]');
                    const checkboxes = fieldset.querySelectorAll('input[type="checkbox"]');
                    
                    if (radios.length > 0) {
                        question.type = 'single_choice';
                        question.options = Array.from(radios).map(r => ({
                            value: r.value,
                            text: fieldset.querySelector(`label[for="${r.id}"]`)?.textContent?.trim() || r.value
                        }));
                    } else if (checkboxes.length > 0) {
                        question.type = 'multiple_choice';
                        question.options = Array.from(checkboxes).map(c => ({
                            value: c.value,
                            text: fieldset.querySelector(`label[for="${c.id}"]`)?.textContent?.trim() || c.value
                        }));
                    }
                }
                
                return question.text ? question : null;
            }
            
            return result;
        });
        
        // AI analysis of semantic structure
        const analysis = await this.analyzeSemanticStructure(semanticData);
        
        return {
            method: 'semantic_html',
            data: semanticData,
            analysis,
            cost: this.estimateCost('semantic', semanticData)
        };
    }

    /**
     * Strategy 2: Accessibility Tree Analysis (leverages browser's semantic understanding)
     */
    async accessibilityTreeAnalysis() {
        console.log('♿ Analyzing accessibility tree...');
        
        // Extract accessibility tree information
        const accessibilityData = await this.page.evaluate(() => {
            const result = {
                landmarks: [],
                forms: [],
                headings: [],
                interactive: [],
                labels: []
            };
            
            // Extract landmark roles
            const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"], main, nav, header, footer, aside');
            landmarks.forEach(landmark => {
                result.landmarks.push({
                    role: landmark.getAttribute('role') || landmark.tagName.toLowerCase(),
                    label: landmark.getAttribute('aria-label') || landmark.getAttribute('aria-labelledby'),
                    text: landmark.textContent?.trim().substring(0, 200)
                });
            });
            
            // Extract form structure with accessibility context
            const forms = document.querySelectorAll('[role="form"], form');
            forms.forEach(form => {
                const formInfo = {
                    label: form.getAttribute('aria-label') || form.getAttribute('aria-labelledby'),
                    groups: []
                };
                
                // Extract form groups
                const groups = form.querySelectorAll('[role="group"], fieldset');
                groups.forEach(group => {
                    const groupInfo = {
                        label: group.getAttribute('aria-labelledby') || 
                               group.querySelector('legend')?.textContent?.trim(),
                        fields: []
                    };
                    
                    // Extract form controls within group
                    const controls = group.querySelectorAll('input, select, textarea, button, [role="button"], [role="checkbox"], [role="radio"]');
                    controls.forEach(control => {
                        groupInfo.fields.push({
                            role: control.getAttribute('role') || control.type || control.tagName.toLowerCase(),
                            label: this.getAccessibleLabel(control),
                            required: control.required || control.getAttribute('aria-required') === 'true',
                            description: this.getAccessibleDescription(control),
                            value: control.value,
                            checked: control.checked
                        });
                    });
                    
                    formInfo.groups.push(groupInfo);
                });
                
                result.forms.push(formInfo);
            });
            
            // Extract heading hierarchy
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
            headings.forEach(heading => {
                result.headings.push({
                    level: heading.tagName ? parseInt(heading.tagName.substring(1)) : 
                           parseInt(heading.getAttribute('aria-level')) || 1,
                    text: heading.textContent?.trim(),
                    id: heading.id
                });
            });
            
            function getAccessibleLabel(element) {
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel) return ariaLabel;
                
                const labelledBy = element.getAttribute('aria-labelledby');
                if (labelledBy) {
                    return labelledBy.split(' ').map(id => 
                        document.getElementById(id)?.textContent?.trim()
                    ).filter(Boolean).join(' ');
                }
                
                const label = element.closest('label') || 
                             document.querySelector(`label[for="${element.id}"]`);
                if (label) return label.textContent?.trim();
                
                return element.placeholder || element.title || '';
            }
            
            function getAccessibleDescription(element) {
                const describedBy = element.getAttribute('aria-describedby');
                if (describedBy) {
                    return describedBy.split(' ').map(id => 
                        document.getElementById(id)?.textContent?.trim()
                    ).filter(Boolean).join(' ');
                }
                
                return element.title || '';
            }
            
            return result;
        });
        
        // AI analysis of accessibility structure
        const analysis = await this.analyzeAccessibilityStructure(accessibilityData);
        
        return {
            method: 'accessibility_tree',
            data: accessibilityData,
            analysis,
            cost: this.estimateCost('accessibility', accessibilityData)
        };
    }

    /**
     * Strategy 3: Structural DOM Analysis (efficient pattern-based extraction)
     */
    async structuralDOMAnalysis() {
        console.log('🌳 Analyzing DOM structure patterns...');
        
        const domData = await this.page.evaluate(() => {
            const result = {
                patterns: {},
                forms: [],
                questions: [],
                navigation: {}
            };
            
            // Pattern-based question detection
            const questionSelectors = [
                '.question, .survey-question, .form-question',
                '[data-question], [data-survey]',
                '.form-group, .field, .input-group',
                'fieldset'
            ];
            
            questionSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((el, index) => {
                        const questionData = {
                            selector: `${selector}:nth-of-type(${index + 1})`,
                            text: this.extractQuestionText(el),
                            type: this.determineQuestionType(el),
                            options: this.extractOptions(el),
                            required: this.isRequired(el),
                            context: {
                                depth: this.getElementDepth(el),
                                siblings: el.parentElement?.children.length || 0,
                                position: Array.from(el.parentElement?.children || []).indexOf(el)
                            }
                        };
                        
                        if (questionData.text && questionData.text.length > 5) {
                            result.questions.push(questionData);
                        }
                    });
                } catch (e) {
                    // Continue with other selectors
                }
            });
            
            function extractQuestionText(element) {
                // Try multiple strategies to extract question text
                const strategies = [
                    () => element.querySelector('label')?.textContent?.trim(),
                    () => element.querySelector('legend')?.textContent?.trim(),
                    () => element.querySelector('.question-text, .label')?.textContent?.trim(),
                    () => element.getAttribute('aria-label'),
                    () => {
                        const text = element.textContent?.trim();
                        return text && text.includes('?') ? text.split('?')[0] + '?' : null;
                    },
                    () => element.textContent?.trim()
                ];
                
                for (const strategy of strategies) {
                    try {
                        const text = strategy();
                        if (text && text.length > 5 && text.length < 500) {
                            return text;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                return '';
            }
            
            function determineQuestionType(element) {
                const inputs = element.querySelectorAll('input, select, textarea');
                const radios = element.querySelectorAll('input[type="radio"]');
                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                const selects = element.querySelectorAll('select');
                const textInputs = element.querySelectorAll('input[type="text"], input[type="email"], textarea');
                
                if (radios.length > 1) return 'single_choice';
                if (checkboxes.length > 1) return 'multiple_choice';
                if (selects.length > 0) return 'select';
                if (textInputs.length > 0) return 'text';
                if (inputs.length === 1) {
                    const input = inputs[0];
                    return input.type || 'text';
                }
                
                return 'unknown';
            }
            
            function extractOptions(element) {
                const options = [];
                
                // Radio buttons
                const radios = element.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    const label = element.querySelector(`label[for="${radio.id}"]`) ||
                                 radio.closest('label') ||
                                 radio.nextElementSibling;
                    options.push({
                        type: 'radio',
                        value: radio.value,
                        text: label?.textContent?.trim() || radio.value,
                        name: radio.name
                    });
                });
                
                // Checkboxes
                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const label = element.querySelector(`label[for="${checkbox.id}"]`) ||
                                 checkbox.closest('label') ||
                                 checkbox.nextElementSibling;
                    options.push({
                        type: 'checkbox',
                        value: checkbox.value,
                        text: label?.textContent?.trim() || checkbox.value,
                        name: checkbox.name
                    });
                });
                
                // Select options
                const selects = element.querySelectorAll('select');
                selects.forEach(select => {
                    Array.from(select.options).forEach(option => {
                        if (option.value) {
                            options.push({
                                type: 'select',
                                value: option.value,
                                text: option.textContent?.trim()
                            });
                        }
                    });
                });
                
                return options;
            }
            
            function isRequired(element) {
                const inputs = element.querySelectorAll('input, select, textarea');
                return Array.from(inputs).some(input => 
                    input.required || 
                    input.getAttribute('aria-required') === 'true' ||
                    element.querySelector('.required, .mandatory')
                );
            }
            
            function getElementDepth(element) {
                let depth = 0;
                let parent = element.parentElement;
                while (parent) {
                    depth++;
                    parent = parent.parentElement;
                }
                return depth;
            }
            
            return result;
        });
        
        // AI analysis of structural patterns
        const analysis = await this.analyzeStructuralPatterns(domData);
        
        return {
            method: 'structural_dom',
            data: domData,
            analysis,
            cost: this.estimateCost('structural', domData)
        };
    }

    /**
     * Strategy 4: Visual AI Analysis (fallback for complex/visual layouts)
     */
    async visualAIAnalysis() {
        console.log('👁️ Performing visual AI analysis...');
        
        const screenshot = await this.page.screenshot({ 
            fullPage: false, 
            quality: 80,
            type: 'png'
        });
        
        const prompt = `Analyze this poll/survey page screenshot and extract all visible questions and form elements.

Please identify:
1. All survey questions or form fields visible
2. Question types (multiple choice, text input, dropdown, etc.)
3. Available options for choice questions
4. Required vs optional fields
5. Navigation elements (next, submit buttons)
6. Any special elements (progress bars, error messages)

Return JSON format:
{
  "questions": [
    {
      "text": "question text",
      "type": "single_choice|multiple_choice|text|rating|dropdown",
      "options": ["option1", "option2"],
      "required": boolean,
      "position": {"x": 0, "y": 0, "width": 0, "height": 0}
    }
  ],
  "navigation": {
    "nextButton": "text and position",
    "submitButton": "text and position",
    "backButton": "text and position"
  },
  "layout": {
    "questionsPerPage": number,
    "hasProgressIndicator": boolean,
    "pageTitle": "extracted title"
  }
}`;

        try {
            const response = await this.ai.analyzeWithVision(prompt, screenshot, 'gpt-4-vision-preview', {
                maxTokens: 2000,
                detail: 'high'
            });
            
            const visualData = JSON.parse(response);
            
            return {
                method: 'visual_ai',
                data: visualData,
                screenshot: screenshot.toString('base64'),
                cost: this.estimateCost('visual', prompt)
            };
            
        } catch (error) {
            console.error('Visual AI analysis failed:', error);
            throw new Error(`Visual analysis failed: ${error.message}`);
        }
    }

    /**
     * Strategy 5: Hybrid Fusion Analysis (combines multiple approaches for maximum accuracy)
     */
    async hybridFusionAnalysis() {
        console.log('🔄 Performing hybrid fusion analysis...');
        
        const startTime = Date.now();
        
        // Run multiple strategies in parallel where possible
        const [semanticResult, accessibilityResult, domResult] = await Promise.allSettled([
            this.semanticHTMLAnalysis(),
            this.accessibilityTreeAnalysis(),
            this.structuralDOMAnalysis()
        ]);
        
        // Extract successful results
        const results = [semanticResult, accessibilityResult, domResult]
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        if (results.length === 0) {
            throw new Error('All analysis strategies failed');
        }
        
        // Fusion analysis using AI
        const fusionData = {
            strategies: results.map(r => r.method),
            questions: this.fuseQuestions(results),
            confidence: this.calculateFusionConfidence(results),
            cost: results.reduce((sum, r) => sum + r.cost, 0),
            analysisTime: Date.now() - startTime
        };
        
        // AI-powered result fusion and validation
        const fusedAnalysis = await this.performFusionAnalysis(fusionData);
        
        return {
            method: 'hybrid_fusion',
            data: fusionData,
            analysis: fusedAnalysis,
            cost: fusionData.cost + this.estimateCost('fusion', fusionData)
        };
    }

    /**
     * Intelligent model and strategy selection based on page complexity
     */
    selectOptimalStrategy(complexity, options = {}) {
        if (options.forceStrategy) {
            return options.forceStrategy;
        }
        
        const { level, metrics } = complexity;
        
        // High semantic structure -> use semantic analysis
        if (metrics.hasSemanticHTML > 5 && metrics.hasAriaLabels > 10) {
            return 'semantic_html';
        }
        
        // Good accessibility -> use accessibility tree
        if (metrics.hasAriaLabels > 5 && metrics.hasSemanticHTML > 3) {
            return 'accessibility_tree';
        }
        
        // Simple sites -> use DOM analysis
        if (level === 'simple' && !metrics.hasReact && !metrics.hasVue && !metrics.hasAngular) {
            return 'dom_structural';
        }
        
        // Complex visual layouts -> use visual AI
        if (level === 'complex' && metrics.hasImages > 20 && metrics.hasModals > 0) {
            return 'visual_ai_fallback';
        }
        
        // Default to hybrid for best accuracy
        return 'hybrid_fusion';
    }

    /**
     * AI-powered semantic structure analysis
     */
    async analyzeSemanticStructure(semanticData) {
        const prompt = `Analyze this semantic HTML structure for survey/poll questions:

${JSON.stringify(semanticData, null, 2)}

Identify:
1. Real survey questions vs navigation/content
2. Question types and answer formats
3. Form flow and submission pattern
4. Required vs optional fields

Return JSON with cleaned and categorized questions.`;

        try {
            const response = await this.ai.analyze(prompt, this.modelSelection.simple, {
                temperature: 0.1,
                maxTokens: 1000
            });
            
            return JSON.parse(response);
        } catch (error) {
            return { error: error.message, fallback: true };
        }
    }

    /**
     * AI-powered accessibility structure analysis
     */
    async analyzeAccessibilityStructure(accessibilityData) {
        const prompt = `Analyze this accessibility tree structure for survey/poll questions:

${JSON.stringify(accessibilityData, null, 2)}

Focus on:
1. Accessible form structure and groupings
2. Label-control relationships
3. Required field indicators
4. Form validation patterns

Return JSON with accessibility-informed question extraction.`;

        try {
            const response = await this.ai.analyze(prompt, this.modelSelection.simple, {
                temperature: 0.1,
                maxTokens: 1000
            });
            
            return JSON.parse(response);
        } catch (error) {
            return { error: error.message, fallback: true };
        }
    }

    /**
     * AI-powered structural pattern analysis
     */
    async analyzeStructuralPatterns(domData) {
        const prompt = `Analyze these DOM structural patterns for survey questions:

${JSON.stringify(domData, null, 2)}

Determine:
1. Most reliable question selectors
2. Question-option relationships
3. Form progression patterns
4. Validation and submission flow

Return JSON with optimized extraction patterns.`;

        try {
            const response = await this.ai.analyze(prompt, this.modelSelection.simple, {
                temperature: 0.1,
                maxTokens: 1000
            });
            
            return JSON.parse(response);
        } catch (error) {
            return { error: error.message, fallback: true };
        }
    }

    /**
     * AI-powered fusion analysis combining multiple strategy results
     */
    async performFusionAnalysis(fusionData) {
        const prompt = `Perform intelligent fusion of multiple web analysis strategies:

Data from ${fusionData.strategies.join(', ')}:
${JSON.stringify(fusionData, null, 2)}

Create the most accurate unified understanding by:
1. Cross-validating questions across strategies
2. Resolving conflicts using confidence scores
3. Combining complementary information
4. Identifying the most reliable selectors

Return JSON with fused, validated results.`;

        try {
            const response = await this.ai.analyze(prompt, this.modelSelection.complex, {
                temperature: 0.1,
                maxTokens: 1500
            });
            
            return JSON.parse(response);
        } catch (error) {
            return { error: error.message, fallback: true };
        }
    }

    /**
     * Fallback analysis when all strategies fail
     */
    async fallbackAnalysis(complexity) {
        console.log('🚨 Using fallback analysis...');
        
        // Simple DOM extraction as last resort
        const basicData = await this.page.evaluate(() => {
            const questions = [];
            
            // Basic form extraction
            document.querySelectorAll('input, select, textarea').forEach((input, index) => {
                const label = document.querySelector(`label[for="${input.id}"]`) ||
                             input.closest('label') ||
                             input.previousElementSibling?.tagName === 'LABEL' ? input.previousElementSibling : null;
                
                if (label || input.placeholder) {
                    questions.push({
                        index,
                        text: label?.textContent?.trim() || input.placeholder || `Field ${index + 1}`,
                        type: input.type || input.tagName.toLowerCase(),
                        name: input.name,
                        required: input.required
                    });
                }
            });
            
            return { questions, method: 'basic_fallback' };
        });
        
        return {
            method: 'fallback',
            data: basicData,
            analysis: { warning: 'Using basic fallback extraction' },
            cost: 0
        };
    }

    /**
     * Helper methods
     */
    fuseQuestions(results) {
        const allQuestions = results.flatMap(r => r.data.questions || []);
        
        // Simple deduplication by text similarity
        const uniqueQuestions = [];
        allQuestions.forEach(question => {
            const similar = uniqueQuestions.find(q => 
                this.calculateSimilarity(q.text, question.text) > 0.8
            );
            
            if (!similar) {
                uniqueQuestions.push(question);
            } else {
                // Merge information from similar questions
                Object.assign(similar, question);
            }
        });
        
        return uniqueQuestions;
    }

    calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const longer = text1.length > text2.length ? text1 : text2;
        const shorter = text1.length > text2.length ? text2 : text1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    calculateFusionConfidence(results) {
        const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / results.length;
        const strategiesUsed = results.length;
        
        // Higher confidence with more strategies
        return Math.min(0.95, avgConfidence + (strategiesUsed - 1) * 0.1);
    }

    calculateConfidence(result, strategy) {
        const baseConfidence = {
            'semantic_html': 0.9,
            'accessibility_tree': 0.85,
            'dom_structural': 0.7,
            'visual_ai_fallback': 0.8,
            'hybrid_fusion': 0.95,
            'fallback': 0.3
        };
        
        return baseConfidence[strategy] || 0.5;
    }

    getStrategyRecommendation(level, metrics) {
        if (level === 'simple' && metrics.hasSemanticHTML > 3) {
            return 'semantic_html';
        } else if (metrics.hasAriaLabels > 5) {
            return 'accessibility_tree';
        } else if (level === 'complex') {
            return 'hybrid_fusion';
        } else {
            return 'dom_structural';
        }
    }

    validateAndEnhanceResults(result, complexity) {
        // Add validation logic here
        return result;
    }

    estimateCost(type, data) {
        const baseCosts = {
            'semantic': 0.001,
            'accessibility': 0.001,
            'structural': 0.001,
            'visual': 0.015,
            'fusion': 0.003
        };
        
        return baseCosts[type] || 0.001;
    }
}

module.exports = AdvancedWebUnderstanding;