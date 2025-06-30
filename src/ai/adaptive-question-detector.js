/**
 * Adaptive Question Detector
 * Enhanced question detection with multiple fallback strategies
 * Based on learnings: "Question detection is the main bottleneck"
 */

class AdaptiveQuestionDetector {
    constructor(page) {
        this.page = page;
        this.strategies = [
            'traditional_form_detection',
            'ai_text_analysis',
            'interactive_element_scanning',
            'dynamic_content_detection',
            'visual_pattern_recognition'
        ];
    }

    /**
     * Detect questions using multiple adaptive strategies
     */
    async detectQuestions() {
        console.log('🔍 Starting adaptive question detection with 5 strategies...');
        
        const results = {
            questions: [],
            strategiesUsed: [],
            fallbacksAttempted: 0,
            successfulStrategy: null
        };
        
        for (const strategy of this.strategies) {
            try {
                console.log(`   🎯 Trying strategy: ${strategy}`);
                
                const strategyQuestions = await this.executeStrategy(strategy);
                results.strategiesUsed.push(strategy);
                
                if (strategyQuestions.length > 0) {
                    console.log(`   ✅ Strategy ${strategy} found ${strategyQuestions.length} questions`);
                    results.questions = strategyQuestions;
                    results.successfulStrategy = strategy;
                    break;
                } else {
                    console.log(`   ⚠️ Strategy ${strategy} found no questions`);
                    results.fallbacksAttempted++;
                }
                
            } catch (error) {
                console.log(`   ❌ Strategy ${strategy} failed: ${error.message}`);
                results.fallbacksAttempted++;
            }
        }
        
        // If no single strategy worked, try combination approach
        if (results.questions.length === 0) {
            console.log('   🔄 No single strategy successful, trying combination approach...');
            results.questions = await this.combinationApproach();
            if (results.questions.length > 0) {
                results.successfulStrategy = 'combination';
            }
        }
        
        console.log(`📊 Adaptive detection result: ${results.questions.length} questions using ${results.successfulStrategy || 'none'}`);
        return results;
    }

    /**
     * Execute specific detection strategy
     */
    async executeStrategy(strategy) {
        switch (strategy) {
            case 'traditional_form_detection':
                return await this.traditionalFormDetection();
            case 'ai_text_analysis':
                return await this.aiTextAnalysis();
            case 'interactive_element_scanning':
                return await this.interactiveElementScanning();
            case 'dynamic_content_detection':
                return await this.dynamicContentDetection();
            case 'visual_pattern_recognition':
                return await this.visualPatternRecognition();
            default:
                return [];
        }
    }

    /**
     * Strategy 1: Traditional form detection (baseline)
     */
    async traditionalFormDetection() {
        return await this.page.evaluate(() => {
            const questions = [];
            
            // Look for traditional form structures
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
                if (inputs.length > 0) {
                    inputs.forEach(input => {
                        const parent = input.closest('.question, .field, .form-group') || input.parentElement;
                        if (parent) {
                            const text = parent.textContent?.trim() || input.placeholder || input.name || 'Form field';
                            
                            questions.push({
                                text: text.substring(0, 200),
                                inputs: [{
                                    selector: input.id ? `#${input.id}` : 
                                             input.className ? `.${input.className.split(' ')[0]}` : 
                                             input.tagName.toLowerCase(),
                                    type: input.type || input.tagName.toLowerCase(),
                                    name: input.name,
                                    id: input.id
                                }],
                                type: input.type === 'radio' ? 'single_choice' : 
                                      input.type === 'checkbox' ? 'multiple_choice' :
                                      input.tagName.toLowerCase() === 'select' ? 'dropdown' : 'text',
                                confidence: 0.7,
                                strategy: 'traditional_form'
                            });
                        }
                    });
                }
            });
            
            return questions;
        });
    }

    /**
     * Strategy 2: AI text analysis (look for question-like patterns)
     */
    async aiTextAnalysis() {
        return await this.page.evaluate(() => {
            const questions = [];
            
            // Advanced text patterns for questions
            const questionPatterns = [
                // Question word patterns
                /(?:what|how|when|where|why|which|who)\s+[^?]*\?/gi,
                // Rating/scale patterns
                /(?:rate|rating|scale|score)\s+(?:from|of|the|your|this)[^.!]*[.!]?/gi,
                // Choice patterns
                /(?:please|kindly)?\s*(?:select|choose|pick|indicate|mark|check)[^.!]*[.!]?/gi,
                // Experience patterns
                /(?:how\s+(?:satisfied|likely|often|would)|what\s+(?:is\s+your|do\s+you))[^?]*\?/gi,
                // Feedback patterns
                /(?:your\s+(?:opinion|thoughts|feedback|experience|rating))[^.!]*[.!]?/gi,
                // Survey-specific patterns
                /(?:on\s+a\s+scale|strongly\s+(?:agree|disagree)|somewhat\s+(?:agree|disagree))/gi
            ];
            
            const pageText = document.body.textContent;
            const allElements = document.querySelectorAll('*');
            
            questionPatterns.forEach(pattern => {
                const matches = pageText.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        // Find the element containing this text
                        for (let element of allElements) {
                            if (element.textContent?.includes(match) && 
                                element.children.length < 5) { // Likely a specific element, not container
                                
                                // Look for nearby inputs
                                const nearbyInputs = this.findNearbyInputs(element);
                                if (nearbyInputs.length > 0) {
                                    questions.push({
                                        text: match.trim(),
                                        inputs: nearbyInputs.map(input => ({
                                            selector: input.id ? `#${input.id}` : 
                                                     input.className ? `.${input.className.split(' ')[0]}` :
                                                     input.tagName.toLowerCase(),
                                            type: input.type || input.tagName.toLowerCase(),
                                            name: input.name,
                                            id: input.id
                                        })),
                                        type: this.inferQuestionType(match, nearbyInputs),
                                        confidence: 0.8,
                                        strategy: 'ai_text_analysis'
                                    });
                                }
                                break;
                            }
                        }
                    });
                }
            });
            
            // Helper function to find nearby inputs
            this.findNearbyInputs = function(element) {
                const inputs = [];
                
                // Check siblings
                const siblings = element.parentElement?.children || [];
                for (let sibling of siblings) {
                    const siblingInputs = sibling.querySelectorAll('input:not([type="hidden"]), select, textarea');
                    inputs.push(...siblingInputs);
                }
                
                // Check parent containers
                let parent = element.parentElement;
                let depth = 0;
                while (parent && depth < 3) {
                    const parentInputs = parent.querySelectorAll('input:not([type="hidden"]), select, textarea');
                    if (parentInputs.length > 0 && parentInputs.length < 10) { // Reasonable number
                        inputs.push(...parentInputs);
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
                
                return [...new Set(inputs)]; // Remove duplicates
            };
            
            // Helper function to infer question type
            this.inferQuestionType = function(text, inputs) {
                const lowerText = text.toLowerCase();
                
                if (inputs.some(i => i.type === 'radio')) return 'single_choice';
                if (inputs.some(i => i.type === 'checkbox')) return 'multiple_choice';
                if (inputs.some(i => i.tagName.toLowerCase() === 'select')) return 'dropdown';
                if (lowerText.includes('scale') || lowerText.includes('rate')) return 'rating';
                if (inputs.some(i => i.tagName.toLowerCase() === 'textarea')) return 'text';
                return 'text';
            };
            
            return questions;
        });
    }

    /**
     * Strategy 3: Interactive element scanning (find all interactive elements)
     */
    async interactiveElementScanning() {
        return await this.page.evaluate(() => {
            const questions = [];
            
            // Find all interactive elements that could be survey inputs
            const interactiveElements = document.querySelectorAll(`
                input:not([type="hidden"]):not([type="submit"]):not([type="button"]),
                select,
                textarea,
                button[role="radio"],
                button[role="checkbox"],
                [contenteditable="true"],
                [role="slider"],
                [role="spinbutton"]
            `);
            
            // Group by visual proximity and common parents
            const groups = [];
            const processed = new Set();
            
            interactiveElements.forEach(element => {
                if (processed.has(element)) return;
                
                const group = {
                    elements: [element],
                    container: element.parentElement,
                    text: ''
                };
                
                // Find related elements (same name, same container, etc.)
                if (element.name) {
                    const relatedByName = document.querySelectorAll(`[name="${element.name}"]`);
                    relatedByName.forEach(related => {
                        if (!processed.has(related) && related !== element) {
                            group.elements.push(related);
                            processed.add(related);
                        }
                    });
                }
                
                // Extract question text from container
                let textContainer = element.parentElement;
                let depth = 0;
                while (textContainer && depth < 3) {
                    const containerText = textContainer.textContent?.trim();
                    if (containerText && containerText.length > 10 && containerText.length < 500) {
                        // Filter out input values and common UI text
                        const cleanText = containerText
                            .replace(/submit|send|continue|next|previous|back/gi, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                        
                        if (cleanText.length > 5) {
                            group.text = cleanText;
                            break;
                        }
                    }
                    textContainer = textContainer.parentElement;
                    depth++;
                }
                
                groups.push(group);
                processed.add(element);
            });
            
            // Convert groups to questions
            groups.forEach(group => {
                if (group.elements.length > 0 && group.text) {
                    questions.push({
                        text: group.text.substring(0, 200),
                        inputs: group.elements.map(el => ({
                            selector: el.id ? `#${el.id}` : 
                                     el.className ? `.${el.className.split(' ')[0]}` :
                                     el.tagName.toLowerCase(),
                            type: el.type || el.tagName.toLowerCase(),
                            name: el.name,
                            id: el.id
                        })),
                        type: this.determineGroupType(group.elements),
                        confidence: 0.6,
                        strategy: 'interactive_scanning'
                    });
                }
            });
            
            // Helper to determine question type from group
            this.determineGroupType = function(elements) {
                const types = elements.map(el => el.type || el.tagName.toLowerCase());
                
                if (types.includes('radio')) return 'single_choice';
                if (types.includes('checkbox')) return 'multiple_choice';
                if (types.includes('select')) return 'dropdown';
                if (types.includes('textarea')) return 'text';
                return 'text';
            };
            
            return questions;
        });
    }

    /**
     * Strategy 4: Dynamic content detection (wait for dynamic content)
     */
    async dynamicContentDetection() {
        try {
            // Wait for potential dynamic content
            await this.page.waitForTimeout(2000);
            
            // Check for dynamic form libraries (React, Vue, Angular patterns)
            return await this.page.evaluate(() => {
                const questions = [];
                
                // Check for modern form library patterns
                const modernSelectors = [
                    '[data-testid*="question"]',
                    '[data-qa*="question"]', 
                    '[class*="question"]',
                    '[class*="field"]',
                    '[class*="input"]',
                    'div[role="group"]',
                    'fieldset',
                    '.form-control',
                    '.form-field',
                    '.form-group',
                    // React/Vue component patterns
                    '[data-v-]', // Vue components
                    '[data-reactroot] input',
                    // Survey platform specific
                    '.surveyplanet-question',
                    '.typeform-question', 
                    '.surveymonkey-question',
                    '.jotform-question'
                ];
                
                modernSelectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(element => {
                            const inputs = element.querySelectorAll('input:not([type="hidden"]), select, textarea');
                            if (inputs.length > 0) {
                                const text = element.textContent?.trim() || 'Dynamic content question';
                                
                                questions.push({
                                    text: text.substring(0, 200),
                                    inputs: Array.from(inputs).map(input => ({
                                        selector: input.id ? `#${input.id}` : 
                                                 input.className ? `.${input.className.split(' ')[0]}` :
                                                 `${selector} ${input.tagName.toLowerCase()}`,
                                        type: input.type || input.tagName.toLowerCase(),
                                        name: input.name,
                                        id: input.id
                                    })),
                                    type: 'dynamic',
                                    confidence: 0.5,
                                    strategy: 'dynamic_content'
                                });
                            }
                        });
                    } catch (e) {
                        // Selector failed, continue
                    }
                });
                
                return questions;
            });
            
        } catch (error) {
            console.log(`Dynamic content detection failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Strategy 5: Visual pattern recognition (look for visual survey patterns)
     */
    async visualPatternRecognition() {
        return await this.page.evaluate(() => {
            const questions = [];
            
            // Look for visual patterns common in surveys
            const visualPatterns = [
                // Radio button groups (visual circles)
                'input[type="radio"]',
                // Checkbox groups (visual squares)
                'input[type="checkbox"]',
                // Slider/range inputs
                'input[type="range"]',
                // Star rating patterns
                '.rating, .stars, [class*="star"]',
                // Likert scale patterns
                '.likert, .scale, [class*="scale"]',
                // Question containers with specific visual cues
                '.question-container, .question-wrapper, .survey-item',
                // Text patterns that look like questions
                'label, legend, .label'
            ];
            
            const foundElements = new Map();
            
            visualPatterns.forEach(pattern => {
                try {
                    const elements = document.querySelectorAll(pattern);
                    elements.forEach(element => {
                        // Check if element is visually prominent
                        const rect = element.getBoundingClientRect();
                        const style = window.getComputedStyle(element);
                        
                        if (rect.width > 0 && rect.height > 0 && 
                            style.display !== 'none' && 
                            style.visibility !== 'hidden') {
                            
                            // Find associated inputs
                            let container = element;
                            if (['LABEL', 'LEGEND'].includes(element.tagName)) {
                                container = element.parentElement;
                            }
                            
                            const inputs = container.querySelectorAll('input:not([type="hidden"]), select, textarea');
                            if (inputs.length > 0) {
                                const key = container.outerHTML.substring(0, 100); // Use as dedup key
                                if (!foundElements.has(key)) {
                                    foundElements.set(key, {
                                        text: element.textContent?.trim() || 'Visual pattern question',
                                        inputs: Array.from(inputs),
                                        element: container
                                    });
                                }
                            }
                        }
                    });
                } catch (e) {
                    // Pattern failed, continue
                }
            });
            
            // Convert to questions
            foundElements.forEach(({ text, inputs }) => {
                questions.push({
                    text: text.substring(0, 200),
                    inputs: inputs.map(input => ({
                        selector: input.id ? `#${input.id}` : 
                                 input.className ? `.${input.className.split(' ')[0]}` :
                                 input.tagName.toLowerCase(),
                        type: input.type || input.tagName.toLowerCase(),
                        name: input.name,
                        id: input.id
                    })),
                    type: this.inferTypeFromVisual(inputs),
                    confidence: 0.7,
                    strategy: 'visual_pattern'
                });
            });
            
            // Helper to infer type from visual patterns
            this.inferTypeFromVisual = function(inputs) {
                const types = inputs.map(i => i.type);
                if (types.includes('radio')) return 'single_choice';
                if (types.includes('checkbox')) return 'multiple_choice';
                if (types.includes('range')) return 'rating';
                return 'text';
            };
            
            return questions;
        });
    }

    /**
     * Combination approach: merge results from multiple strategies
     */
    async combinationApproach() {
        console.log('   🔄 Executing combination approach...');
        
        const allQuestions = [];
        
        // Try multiple strategies in parallel
        const strategies = ['ai_text_analysis', 'interactive_element_scanning', 'dynamic_content_detection'];
        
        for (const strategy of strategies) {
            try {
                const questions = await this.executeStrategy(strategy);
                allQuestions.push(...questions);
            } catch (error) {
                // Continue with other strategies
            }
        }
        
        // Deduplicate and merge
        const uniqueQuestions = this.deduplicateQuestions(allQuestions);
        
        console.log(`   📊 Combination approach: ${uniqueQuestions.length} unique questions from ${allQuestions.length} total`);
        
        return uniqueQuestions;
    }

    /**
     * Deduplicate questions based on text similarity and input overlap
     */
    deduplicateQuestions(questions) {
        const unique = [];
        
        questions.forEach(question => {
            const isDuplicate = unique.some(existing => {
                // Check text similarity
                const textSimilar = this.textSimilarity(question.text, existing.text) > 0.7;
                
                // Check input overlap
                const inputOverlap = question.inputs.some(input => 
                    existing.inputs.some(existingInput => 
                        input.selector === existingInput.selector
                    )
                );
                
                return textSimilar || inputOverlap;
            });
            
            if (!isDuplicate) {
                unique.push(question);
            }
        });
        
        return unique;
    }

    /**
     * Calculate text similarity (simple Jaccard similarity)
     */
    textSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }
}

module.exports = AdaptiveQuestionDetector;