/**
 * Visual Question Detection System with OCR Fallback
 * Uses AI vision models and OCR to extract questions from complex visual layouts
 * Handles cases where DOM parsing fails due to canvas, images, or complex styling
 */

class VisualQuestionDetector {
    constructor(aiService, page) {
        this.ai = aiService;
        this.page = page;
        this.cache = new Map();
        this.ocrCache = new Map();
        
        // Configuration for different detection modes
        this.config = {
            screenshot: {
                quality: 90,
                fullPage: false,
                clip: null // Can be set for specific regions
            },
            ocr: {
                enabled: true,
                confidence: 0.7,
                languages: ['eng'], // Can add more languages
                preserveInterword: true
            },
            vision: {
                model: 'gpt-4-vision-preview',
                maxTokens: 2000,
                detail: 'high',
                temperature: 0.1
            }
        };
    }

    /**
     * Main detection method - tries multiple approaches
     */
    async detectQuestions(options = {}) {
        console.log('👁️ Starting visual question detection...');
        
        const url = this.page.url();
        const cacheKey = `visual_${url}_${Date.now() - (Date.now() % 300000)}`; // 5-minute cache
        
        if (this.cache.has(cacheKey)) {
            console.log('🎯 Using cached visual analysis');
            return this.cache.get(cacheKey);
        }

        const strategies = [
            'ai_vision_primary',    // AI vision analysis
            'ocr_fallback',        // OCR text extraction
            'hybrid_approach',     // Combine AI + OCR
            'dom_visual_fusion'    // DOM + Visual confirmation
        ];

        let bestResult = null;
        let highestConfidence = 0;

        for (const strategy of strategies) {
            try {
                console.log(`🔍 Trying strategy: ${strategy}`);
                const result = await this.executeStrategy(strategy, options);
                
                if (result.confidence > highestConfidence) {
                    highestConfidence = result.confidence;
                    bestResult = result;
                }
                
                // If we get a high-confidence result, use it
                if (result.confidence > 0.8) {
                    break;
                }
                
            } catch (error) {
                console.warn(`⚠️ Strategy ${strategy} failed:`, error.message);
                continue;
            }
        }

        if (bestResult) {
            this.cache.set(cacheKey, bestResult);
            this.cleanCache();
        }

        return bestResult || {
            questions: [],
            strategy: 'none',
            confidence: 0,
            error: 'All visual detection strategies failed'
        };
    }

    /**
     * Execute specific detection strategy
     */
    async executeStrategy(strategy, options) {
        switch (strategy) {
            case 'ai_vision_primary':
                return await this.aiVisionDetection(options);
            case 'ocr_fallback':
                return await this.ocrDetection(options);
            case 'hybrid_approach':
                return await this.hybridDetection(options);
            case 'dom_visual_fusion':
                return await this.domVisualFusion(options);
            default:
                throw new Error(`Unknown strategy: ${strategy}`);
        }
    }

    /**
     * AI Vision-based question detection
     */
    async aiVisionDetection(options = {}) {
        console.log('🤖 Running AI vision analysis...');
        
        // Take screenshot
        const screenshot = await this.page.screenshot({
            ...this.config.screenshot,
            ...options.screenshot
        });

        const prompt = `Analyze this poll/survey page screenshot and extract all visible questions and form elements.

IMPORTANT: Focus on identifying actual survey questions, not navigation or advertising content.

Please identify:
1. All survey questions visible on the page
2. Question types (multiple choice, text input, rating scale, yes/no, etc.)
3. Available answer options for each question
4. Any question numbering or grouping
5. Required vs optional fields (look for asterisks or "required" indicators)
6. Progress indicators or page numbering
7. Submit/continue buttons

For each question found, determine:
- The exact question text
- Question type and input method
- Available options (if multiple choice)
- Position on page (approximate coordinates)
- Whether it appears required
- Any special styling or emphasis

Look for these question patterns:
- Traditional form questions with radio buttons/checkboxes
- Rating scales (1-5, 1-10, star ratings)
- Dropdown selectors
- Text input fields with labels
- Slider controls
- Image-based questions
- Questions embedded in images or canvas elements

RESPOND WITH JSON:
{
  "questions": [
    {
      "id": "q1",
      "text": "exact question text",
      "type": "single_choice|multiple_choice|text|rating|dropdown|yes_no|slider",
      "options": ["option1", "option2", "option3"],
      "required": boolean,
      "position": {"x": 0, "y": 0, "width": 100, "height": 50},
      "confidence": 0.0-1.0,
      "context": "additional context about the question"
    }
  ],
  "pageInfo": {
    "title": "extracted page title",
    "progress": "current step info if visible",
    "totalQuestions": estimated_total,
    "hasSubmitButton": boolean,
    "submitButtonText": "button text",
    "pageType": "survey|poll|form|questionnaire"
  },
  "confidence": 0.0-1.0,
  "visualCues": [
    "description of visual elements that helped identify questions"
  ]
}`;

        try {
            const response = await this.ai.analyzeWithVision(
                prompt, 
                screenshot, 
                this.config.vision.model,
                {
                    maxTokens: this.config.vision.maxTokens,
                    detail: this.config.vision.detail,
                    temperature: this.config.vision.temperature
                }
            );

            const analysis = JSON.parse(response);
            
            return {
                questions: analysis.questions || [],
                pageInfo: analysis.pageInfo || {},
                strategy: 'ai_vision_primary',
                confidence: analysis.confidence || 0.5,
                visualCues: analysis.visualCues || [],
                cost: this.estimateVisionCost(screenshot),
                screenshot: screenshot.toString('base64')
            };

        } catch (error) {
            console.error('AI vision analysis failed:', error);
            throw new Error(`Vision analysis failed: ${error.message}`);
        }
    }

    /**
     * OCR-based text extraction and question detection
     */
    async ocrDetection(options = {}) {
        console.log('🔤 Running OCR text extraction...');
        
        // For this implementation, we'll simulate OCR with DOM text extraction
        // In a real implementation, you would use Tesseract.js or similar
        const textData = await this.extractTextWithPositions();
        
        // Analyze extracted text for question patterns
        const questions = await this.analyzeTextForQuestions(textData);
        
        return {
            questions,
            strategy: 'ocr_fallback',
            confidence: questions.length > 0 ? 0.6 : 0.1,
            textData: textData.slice(0, 10), // Limit for response size
            cost: 0.001 // OCR is typically cheap
        };
    }

    /**
     * Extract text with position information from the page
     */
    async extractTextWithPositions() {
        return await this.page.evaluate(() => {
            const textElements = [];
            
            // Get all text nodes with position information
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        const text = node.textContent.trim();
                        return text.length > 5 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                }
            );

            let node;
            while (node = walker.nextNode()) {
                const element = node.parentElement;
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                
                // Only include visible text
                if (rect.width > 0 && rect.height > 0 && 
                    style.visibility !== 'hidden' && style.display !== 'none') {
                    
                    textElements.push({
                        text: node.textContent.trim(),
                        position: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height
                        },
                        element: {
                            tagName: element.tagName,
                            className: element.className,
                            id: element.id
                        },
                        style: {
                            fontSize: style.fontSize,
                            fontWeight: style.fontWeight,
                            color: style.color
                        }
                    });
                }
            }
            
            return textElements.sort((a, b) => a.position.y - b.position.y);
        });
    }

    /**
     * Analyze extracted text for question patterns
     */
    async analyzeTextForQuestions(textData) {
        const questionPatterns = [
            /\?$/,                                    // Ends with question mark
            /^(what|how|when|where|why|which|do|are|is|can|would|will)/i, // Question words
            /rate|rating|scale/i,                     // Rating questions
            /select|choose|pick|click/i,              // Selection instructions
            /strongly agree|agree|disagree/i,         // Likert scale
            /yes|no/i,                               // Yes/No questions
        ];

        const questions = [];
        
        for (let i = 0; i < textData.length; i++) {
            const item = textData[i];
            const text = item.text;
            
            // Check if text matches question patterns
            const isQuestion = questionPatterns.some(pattern => pattern.test(text));
            
            if (isQuestion && text.length > 10 && text.length < 500) {
                // Look for nearby options or form elements
                const nearbyItems = textData.slice(Math.max(0, i-2), Math.min(textData.length, i+5));
                const options = this.extractOptionsFromNearbyText(nearbyItems);
                
                questions.push({
                    id: `ocr_q${questions.length + 1}`,
                    text: text,
                    type: this.determineQuestionTypeFromText(text, options),
                    options: options,
                    required: /required|\*/.test(text),
                    position: item.position,
                    confidence: this.calculateTextConfidence(text),
                    source: 'ocr'
                });
            }
        }
        
        return questions;
    }

    /**
     * Extract potential answer options from nearby text
     */
    extractOptionsFromNearbyText(nearbyItems) {
        const options = [];
        const optionPatterns = [
            /^[a-d]\)|^[1-9]\)|^\•|^-/,  // a) b) c) or 1) 2) 3) or bullets
            /^(yes|no|maybe|true|false|agree|disagree)/i,
            /^(excellent|good|fair|poor)/i,
            /^(always|often|sometimes|never)/i
        ];
        
        nearbyItems.forEach(item => {
            const text = item.text.trim();
            if (text.length > 1 && text.length < 100) {
                const isOption = optionPatterns.some(pattern => pattern.test(text));
                if (isOption) {
                    options.push(text);
                }
            }
        });
        
        return options.slice(0, 10); // Limit options
    }

    /**
     * Determine question type from text analysis
     */
    determineQuestionTypeFromText(text, options) {
        if (/rate|rating|scale|1.*10|1.*5/i.test(text)) return 'rating';
        if (/yes.*no|true.*false/i.test(text) || options.some(o => /^(yes|no)$/i.test(o))) return 'yes_no';
        if (options.length > 2) return 'single_choice';
        if (options.length === 0) return 'text';
        return 'single_choice';
    }

    /**
     * Calculate confidence score for text-based detection
     */
    calculateTextConfidence(text) {
        let confidence = 0.3; // Base confidence
        
        if (text.includes('?')) confidence += 0.3;
        if (/^(what|how|when|where|why|which)/i.test(text)) confidence += 0.2;
        if (/rate|rating|scale/i.test(text)) confidence += 0.2;
        if (text.length > 20 && text.length < 200) confidence += 0.1;
        
        return Math.min(confidence, 0.9);
    }

    /**
     * Hybrid approach combining AI vision and OCR
     */
    async hybridDetection(options = {}) {
        console.log('🔄 Running hybrid AI + OCR detection...');
        
        const [visionResult, ocrResult] = await Promise.allSettled([
            this.aiVisionDetection(options),
            this.ocrDetection(options)
        ]);
        
        const visionQuestions = visionResult.status === 'fulfilled' ? visionResult.value.questions : [];
        const ocrQuestions = ocrResult.status === 'fulfilled' ? ocrResult.value.questions : [];
        
        // Merge and deduplicate questions
        const mergedQuestions = this.mergeQuestionSets(visionQuestions, ocrQuestions);
        
        return {
            questions: mergedQuestions,
            strategy: 'hybrid_approach',
            confidence: Math.max(
                visionResult.status === 'fulfilled' ? visionResult.value.confidence : 0,
                ocrResult.status === 'fulfilled' ? ocrResult.value.confidence : 0
            ),
            sources: {
                vision: visionResult.status === 'fulfilled' ? visionResult.value : null,
                ocr: ocrResult.status === 'fulfilled' ? ocrResult.value : null
            },
            cost: (visionResult.status === 'fulfilled' ? visionResult.value.cost : 0) + 
                  (ocrResult.status === 'fulfilled' ? ocrResult.value.cost : 0)
        };
    }

    /**
     * DOM + Visual fusion for maximum accuracy
     */
    async domVisualFusion(options = {}) {
        console.log('🔗 Running DOM + Visual fusion...');
        
        // Get DOM-based questions first
        const domQuestions = await this.extractDOMQuestions();
        
        // If DOM gives us good results, enhance with visual confirmation
        if (domQuestions.length > 0) {
            const visualConfirmation = await this.confirmQuestionsVisually(domQuestions);
            
            return {
                questions: visualConfirmation.confirmedQuestions,
                strategy: 'dom_visual_fusion',
                confidence: visualConfirmation.confidence,
                domQuestions: domQuestions.length,
                visuallyConfirmed: visualConfirmation.confirmedQuestions.length,
                cost: visualConfirmation.cost
            };
        } else {
            // Fallback to pure visual detection
            return await this.aiVisionDetection(options);
        }
    }

    /**
     * Extract questions using DOM analysis
     */
    async extractDOMQuestions() {
        return await this.page.evaluate(() => {
            const questions = [];
            const questionSelectors = [
                '.question', '.survey-question', '.form-question', '.poll-question',
                '[data-question]', '[role="group"]', 'fieldset', '.field-group'
            ];
            
            questionSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach((el, index) => {
                    const text = el.querySelector('legend, label, .question-text, h3, h4')?.textContent?.trim() ||
                                 el.textContent?.trim();
                    
                    if (text && text.length > 10) {
                        const inputs = el.querySelectorAll('input, select, textarea');
                        const options = Array.from(el.querySelectorAll('label')).map(label => label.textContent?.trim()).filter(Boolean);
                        
                        questions.push({
                            id: `dom_q${questions.length + 1}`,
                            text: text.substring(0, 300),
                            type: this.determineTypeFromInputs(inputs),
                            options: options.slice(0, 10),
                            required: Array.from(inputs).some(input => input.required),
                            position: el.getBoundingClientRect(),
                            selector: `${selector}:nth-of-type(${index + 1})`,
                            source: 'dom'
                        });
                    }
                });
            });
            
            return questions;
            
            function determineTypeFromInputs(inputs) {
                const inputArray = Array.from(inputs);
                if (inputArray.some(i => i.type === 'radio')) return 'single_choice';
                if (inputArray.some(i => i.type === 'checkbox')) return 'multiple_choice';
                if (inputArray.some(i => i.tagName === 'SELECT')) return 'dropdown';
                if (inputArray.some(i => i.type === 'range')) return 'slider';
                if (inputArray.some(i => i.tagName === 'TEXTAREA')) return 'text';
                return 'text';
            }
        });
    }

    /**
     * Visually confirm DOM-detected questions
     */
    async confirmQuestionsVisually(domQuestions) {
        const screenshot = await this.page.screenshot(this.config.screenshot);
        
        const prompt = `Confirm and enhance these DOM-detected questions by analyzing the screenshot:

DOM Questions Found:
${domQuestions.map((q, i) => `${i+1}. "${q.text}" (${q.type})`).join('\n')}

Please:
1. Confirm each question is actually visible and appears to be a real survey question
2. Enhance the question text if the DOM version is incomplete
3. Add any visually apparent questions that DOM missed
4. Correct question types based on visual appearance

RESPOND WITH JSON:
{
  "confirmedQuestions": [
    {
      "id": "confirmed_q1",
      "text": "enhanced or confirmed question text",
      "type": "corrected_type_if_needed",
      "options": ["enhanced options"],
      "confidence": 0.0-1.0,
      "domSource": true,
      "visuallyEnhanced": boolean
    }
  ],
  "confidence": 0.0-1.0
}`;

        try {
            const response = await this.ai.analyzeWithVision(prompt, screenshot, 'gpt-4-vision-preview', {
                maxTokens: 1500,
                temperature: 0.1
            });
            
            const result = JSON.parse(response);
            
            return {
                confirmedQuestions: result.confirmedQuestions || [],
                confidence: result.confidence || 0.7,
                cost: this.estimateVisionCost(screenshot)
            };
            
        } catch (error) {
            console.warn('Visual confirmation failed:', error);
            return {
                confirmedQuestions: domQuestions,
                confidence: 0.5,
                cost: 0
            };
        }
    }

    /**
     * Merge question sets from different sources
     */
    mergeQuestionSets(set1, set2) {
        const merged = [...set1];
        
        set2.forEach(q2 => {
            const similar = merged.find(q1 => this.questionsAreSimilar(q1, q2));
            if (!similar) {
                merged.push(q2);
            } else {
                // Enhance existing question with additional info
                if (q2.confidence > similar.confidence) {
                    Object.assign(similar, q2);
                }
            }
        });
        
        return merged;
    }

    /**
     * Check if two questions are similar (for deduplication)
     */
    questionsAreSimilar(q1, q2) {
        const text1 = q1.text.toLowerCase();
        const text2 = q2.text.toLowerCase();
        
        // Simple similarity check
        const commonWords = text1.split(' ').filter(word => 
            word.length > 3 && text2.includes(word)
        );
        
        return commonWords.length > Math.min(text1.split(' ').length, text2.split(' ').length) * 0.5;
    }

    /**
     * Estimate cost for vision API calls
     */
    estimateVisionCost(screenshot) {
        // Rough estimate based on image size and model pricing
        const sizeKB = Buffer.byteLength(screenshot) / 1024;
        const baseTokens = 1000; // Base tokens for vision analysis
        const imageTokens = Math.floor(sizeKB / 10); // Rough estimate
        const totalTokens = baseTokens + imageTokens;
        
        // GPT-4V pricing approximation
        return (totalTokens / 1000) * 0.03; // $0.03 per 1K tokens
    }

    /**
     * Clean old cache entries
     */
    cleanCache() {
        if (this.cache.size > 20) {
            const entries = Array.from(this.cache.entries());
            const oldEntries = entries.slice(0, entries.length - 10);
            oldEntries.forEach(([key]) => this.cache.delete(key));
        }
    }

    /**
     * Get cached visual analysis
     */
    getCachedAnalysis(url) {
        for (const [key, value] of this.cache.entries()) {
            if (key.includes(url)) {
                return value;
            }
        }
        return null;
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        this.ocrCache.clear();
    }
}

module.exports = VisualQuestionDetector;