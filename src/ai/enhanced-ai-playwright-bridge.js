/**
 * Enhanced AI-Playwright Communication Bridge
 * Implements advanced patterns for reliable, adaptive, and cost-effective automation
 * 
 * Key Features:
 * - Circuit breaker pattern for AI service reliability
 * - Progressive fallback strategies (AI -> Heuristics -> Manual)
 * - Semantic caching for cost optimization
 * - Multi-modal analysis with intelligent model selection
 * - Self-healing automation with adaptive selectors
 * - Real-time decision streaming for faster responses
 * - Comprehensive error recovery and state management
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class EnhancedAIPlaywrightBridge extends EventEmitter {
    constructor(aiService, page, options = {}) {
        super();
        
        this.ai = aiService;
        this.page = page;
        this.options = {
            maxRetries: 3,
            circuitBreakerThreshold: 5,
            circuitBreakerTimeout: 60000,
            cacheMaxSize: 1000,
            cacheMaxAge: 300000, // 5 minutes
            enableStreaming: true,
            enableMultiModal: true,
            costOptimization: true,
            ...options
        };
        
        this.initializeComponents();
        this.setupEventHandlers();
    }

    initializeComponents() {
        // Circuit breaker for AI service reliability
        this.circuitBreaker = new CircuitBreaker({
            threshold: this.options.circuitBreakerThreshold,
            timeout: this.options.circuitBreakerTimeout
        });

        // Advanced caching system
        this.cachingSystem = new SemanticCache({
            maxSize: this.options.cacheMaxSize,
            maxAge: this.options.cacheMaxAge
        });

        // Model router for cost optimization
        this.modelRouter = new IntelligentModelRouter();

        // Self-healing system
        this.selfHealing = new SelfHealingSystem(this.page);

        // State management
        this.stateManager = new AutomationStateManager();

        // Fallback strategies
        this.fallbackStrategies = new ProgressiveFallbackSystem();

        // Performance monitor
        this.performanceMonitor = new PerformanceMonitor();
    }

    setupEventHandlers() {
        // Monitor page changes for cache invalidation
        this.page.on('load', () => this.handlePageLoad());
        this.page.on('domcontentloaded', () => this.handleDOMReady());
        
        // Monitor circuit breaker state
        this.circuitBreaker.on('open', () => this.handleCircuitOpen());
        this.circuitBreaker.on('close', () => this.handleCircuitClose());
        
        // Monitor performance
        this.performanceMonitor.on('slowResponse', (data) => this.handleSlowResponse(data));
    }

    /**
     * Main analysis method with enhanced reliability and cost optimization
     */
    async analyzeAndDecide(context, options = {}) {
        const operationId = this.generateOperationId();
        
        try {
            this.performanceMonitor.startOperation(operationId);
            
            // Update state context
            await this.stateManager.updateContext(context);
            
            // Check cache first
            const cachedResult = await this.cachingSystem.get(context);
            if (cachedResult) {
                this.performanceMonitor.recordCacheHit(operationId);
                return this.enrichResult(cachedResult, { source: 'cache' });
            }

            // Execute with circuit breaker protection
            const result = await this.circuitBreaker.execute(async () => {
                return await this.executeAnalysisStrategy(context, options);
            });

            // Cache successful results
            await this.cachingSystem.set(context, result);
            
            this.performanceMonitor.endOperation(operationId, true);
            return this.enrichResult(result, { source: 'ai', operationId });

        } catch (error) {
            this.performanceMonitor.endOperation(operationId, false, error);
            
            // Execute fallback strategy
            return await this.handleAnalysisFailure(context, error, operationId);
        }
    }

    /**
     * Execute the most appropriate analysis strategy
     */
    async executeAnalysisStrategy(context, options) {
        // Determine optimal strategy and model
        const strategy = await this.selectOptimalStrategy(context);
        const model = await this.modelRouter.selectModel(strategy, context);

        switch (strategy.type) {
            case 'multi_modal':
                return await this.executeMultiModalAnalysis(context, model);
            case 'semantic_dom':
                return await this.executeSemanticDOMAnalysis(context, model);
            case 'heuristic_guided':
                return await this.executeHeuristicGuidedAnalysis(context, model);
            case 'streaming':
                return await this.executeStreamingAnalysis(context, model);
            default:
                return await this.executeStandardAnalysis(context, model);
        }
    }

    /**
     * Multi-modal analysis combining visual and DOM understanding
     */
    async executeMultiModalAnalysis(context, model) {
        console.log('🔍 Executing multi-modal analysis...');
        
        const [screenshot, domData, pageMetrics] = await Promise.all([
            this.captureOptimizedScreenshot(),
            this.extractSemanticDOM(),
            this.gatherPageMetrics()
        ]);

        const analysisContext = {
            visual: screenshot,
            semantic: domData,
            metrics: pageMetrics,
            context: context
        };

        const prompt = this.buildMultiModalPrompt(analysisContext);
        
        const result = await this.ai.analyzeWithVision({
            prompt,
            image: screenshot,
            model: model.name,
            temperature: 0.1,
            maxTokens: model.maxTokens || 800
        });

        return this.parseAndValidateResult(result, 'multi_modal');
    }

    /**
     * Streaming analysis for faster responses
     */
    async executeStreamingAnalysis(context, model) {
        console.log('🚀 Executing streaming analysis...');
        
        const prompt = this.buildStreamingPrompt(context);
        let partialResult = '';
        let decisionMade = false;

        const stream = await this.ai.streamAnalyze({
            prompt,
            model: model.name,
            temperature: 0.1
        });

        for await (const chunk of stream) {
            partialResult += chunk;
            
            // Check for early decision completion
            if (!decisionMade && this.isCompleteDecision(partialResult)) {
                try {
                    const decision = JSON.parse(partialResult);
                    if (decision.confidence > 0.8) {
                        return decision;
                    }
                } catch (e) {
                    // Continue streaming
                }
            }
        }

        return this.parseAndValidateResult(partialResult, 'streaming');
    }

    /**
     * Self-healing element interaction with adaptive selectors
     */
    async executeActionWithSelfHealing(action, target, options = {}) {
        const maxAttempts = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🎯 Attempting ${action} (attempt ${attempt}/${maxAttempts})`);
                
                // Get current best selector for target
                const selector = await this.selfHealing.getBestSelector(target);
                
                // Execute action with enhanced error handling
                const result = await this.executeAction(action, selector, options);
                
                // Update selector success rate
                await this.selfHealing.recordSuccess(selector, target);
                
                return result;

            } catch (error) {
                lastError = error;
                console.warn(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                // Record failure and get alternative selectors
                await this.selfHealing.recordFailure(target, error);
                
                if (attempt < maxAttempts) {
                    // Try adaptive recovery
                    const recoveryAction = await this.selfHealing.suggestRecovery(target, error);
                    if (recoveryAction) {
                        await this.executeRecoveryAction(recoveryAction);
                        await this.page.waitForTimeout(1000); // Brief pause
                    }
                }
            }
        }

        throw new Error(`Action failed after ${maxAttempts} attempts: ${lastError.message}`);
    }

    /**
     * Progressive fallback handling
     */
    async handleAnalysisFailure(context, error, operationId) {
        console.log(`⚠️ AI analysis failed, executing fallback strategy...`);
        
        try {
            // Try heuristic analysis first
            const heuristicResult = await this.fallbackStrategies.executeHeuristic(context);
            if (heuristicResult.confidence > 0.6) {
                return this.enrichResult(heuristicResult, { 
                    source: 'heuristic', 
                    fallbackReason: error.message,
                    operationId 
                });
            }

            // Try simplified AI analysis
            const simplifiedResult = await this.fallbackStrategies.executeSimplified(context);
            if (simplifiedResult.confidence > 0.5) {
                return this.enrichResult(simplifiedResult, { 
                    source: 'simplified_ai',
                    fallbackReason: error.message,
                    operationId 
                });
            }

            // Final fallback to manual patterns
            const manualResult = await this.fallbackStrategies.executeManual(context);
            return this.enrichResult(manualResult, { 
                source: 'manual_pattern',
                fallbackReason: error.message,
                operationId,
                warning: 'Using basic pattern matching'
            });

        } catch (fallbackError) {
            throw new Error(`All fallback strategies failed: ${error.message} -> ${fallbackError.message}`);
        }
    }

    /**
     * Intelligent strategy selection based on context analysis
     */
    async selectOptimalStrategy(context) {
        const pageComplexity = await this.assessPageComplexity();
        const costConstraints = this.options.costOptimization;
        const timeConstraints = context.urgency || 'normal';

        // Strategy decision matrix
        if (pageComplexity.score > 80 && !costConstraints) {
            return { type: 'multi_modal', confidence: 0.9 };
        }
        
        if (timeConstraints === 'high' && this.options.enableStreaming) {
            return { type: 'streaming', confidence: 0.8 };
        }
        
        if (pageComplexity.hasSemanticStructure) {
            return { type: 'semantic_dom', confidence: 0.8 };
        }
        
        if (costConstraints) {
            return { type: 'heuristic_guided', confidence: 0.7 };
        }

        return { type: 'standard', confidence: 0.6 };
    }

    /**
     * Build contextual prompts for different analysis types
     */
    buildMultiModalPrompt(analysisContext) {
        return `Analyze this poll/survey page using both visual and semantic information:

VISUAL CONTEXT: Screenshot shows current page state
SEMANTIC STRUCTURE: ${JSON.stringify(analysisContext.semantic, null, 2)}
PAGE METRICS: ${JSON.stringify(analysisContext.metrics, null, 2)}
USER CONTEXT: ${JSON.stringify(analysisContext.context, null, 2)}

Provide comprehensive analysis with:
1. Question identification and classification
2. Optimal interaction strategy
3. Risk assessment and mitigation
4. Alternative approaches if primary fails
5. Confidence scoring for each recommendation

Return JSON format:
{
  "questions": [...],
  "strategy": "...",
  "actions": [...],
  "confidence": 0.95,
  "alternatives": [...],
  "risks": [...]
}`;
    }

    buildStreamingPrompt(context) {
        return `Quick analysis for poll automation:

Page Context: ${JSON.stringify(context, null, 2)}

Provide immediate decision in JSON:
{
  "action": "click|type|wait|navigate",
  "target": "selector_or_description", 
  "confidence": 0.8,
  "reasoning": "brief_explanation"
}`;
    }

    /**
     * Optimized screenshot capture
     */
    async captureOptimizedScreenshot() {
        return await this.page.screenshot({
            quality: 60, // Reduced quality for cost optimization
            type: 'jpeg',
            fullPage: false, // Focus on viewport
            clip: await this.getOptimalClipArea()
        });
    }

    async getOptimalClipArea() {
        // Identify the most relevant area of the page
        return await this.page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            const questions = document.querySelectorAll('.question, .survey-question, [data-question]');
            
            if (forms.length > 0) {
                const form = forms[0];
                const rect = form.getBoundingClientRect();
                return {
                    x: Math.max(0, rect.x - 50),
                    y: Math.max(0, rect.y - 50),
                    width: Math.min(window.innerWidth, rect.width + 100),
                    height: Math.min(window.innerHeight, rect.height + 100)
                };
            }
            
            return null; // Full page if no forms found
        });
    }

    /**
     * Extract semantic DOM structure efficiently
     */
    async extractSemanticDOM() {
        return await this.page.evaluate(() => {
            const result = {
                forms: [],
                questions: [],
                navigation: {},
                semanticStructure: {}
            };

            // Extract forms with context
            document.querySelectorAll('form').forEach((form, index) => {
                result.forms.push({
                    index,
                    id: form.id,
                    action: form.action,
                    method: form.method,
                    fieldCount: form.elements.length,
                    hasRequiredFields: !!form.querySelector('[required]')
                });
            });

            // Extract questions with enhanced context
            const questionSelectors = [
                '.question', '.survey-question', '.form-question',
                '[data-question]', 'fieldset', '.form-group'
            ];

            questionSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach((el, index) => {
                        const questionData = {
                            selector: `${selector}:nth-of-type(${index + 1})`,
                            text: el.textContent?.trim().substring(0, 200),
                            type: this.determineQuestionType(el),
                            required: this.isRequired(el),
                            answered: this.isAnswered(el),
                            options: this.extractOptions(el)
                        };
                        
                        if (questionData.text && questionData.text.length > 5) {
                            result.questions.push(questionData);
                        }
                    });
                } catch (e) {
                    // Continue with other selectors
                }
            });

            // Helper functions
            function determineQuestionType(element) {
                const radios = element.querySelectorAll('input[type="radio"]');
                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                const selects = element.querySelectorAll('select');
                const textInputs = element.querySelectorAll('input[type="text"], textarea');
                
                if (radios.length > 1) return 'single_choice';
                if (checkboxes.length > 1) return 'multiple_choice';
                if (selects.length > 0) return 'select';
                if (textInputs.length > 0) return 'text';
                return 'unknown';
            }

            function isRequired(element) {
                return !!element.querySelector('[required], .required, .mandatory');
            }

            function isAnswered(element) {
                return !!element.querySelector('input:checked, input[value!=""], textarea[value!=""], select[value!=""]');
            }

            function extractOptions(element) {
                const options = [];
                
                element.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
                    const label = element.querySelector(`label[for="${input.id}"]`) || 
                                 input.closest('label') || 
                                 input.nextElementSibling;
                    
                    options.push({
                        value: input.value,
                        text: label?.textContent?.trim() || input.value,
                        type: input.type
                    });
                });

                element.querySelectorAll('select option').forEach(option => {
                    if (option.value) {
                        options.push({
                            value: option.value,
                            text: option.textContent?.trim(),
                            type: 'option'
                        });
                    }
                });

                return options;
            }

            return result;
        });
    }

    /**
     * Parse and validate AI responses with schema checking
     */
    parseAndValidateResult(response, type) {
        try {
            const result = typeof response === 'string' ? JSON.parse(response) : response;
            
            // Validate result schema based on type
            const validation = this.validateResultSchema(result, type);
            if (!validation.valid) {
                throw new Error(`Invalid response schema: ${validation.errors.join(', ')}`);
            }

            return result;

        } catch (error) {
            console.error(`Failed to parse AI response: ${error.message}`);
            throw new Error(`AI response parsing failed: ${error.message}`);
        }
    }

    validateResultSchema(result, type) {
        const errors = [];
        
        if (!result || typeof result !== 'object') {
            errors.push('Result must be an object');
            return { valid: false, errors };
        }

        // Common required fields
        if (!result.confidence || typeof result.confidence !== 'number') {
            errors.push('Missing or invalid confidence score');
        }

        // Type-specific validation
        switch (type) {
            case 'multi_modal':
                if (!result.questions || !Array.isArray(result.questions)) {
                    errors.push('Missing questions array');
                }
                if (!result.strategy) {
                    errors.push('Missing strategy');
                }
                break;
                
            case 'streaming':
                if (!result.action) {
                    errors.push('Missing action');
                }
                if (!result.target) {
                    errors.push('Missing target');
                }
                break;
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Enrich results with metadata and context
     */
    enrichResult(result, metadata = {}) {
        return {
            ...result,
            metadata: {
                timestamp: Date.now(),
                bridge_version: '2.0.0',
                ...metadata
            },
            performance: this.performanceMonitor.getMetrics()
        };
    }

    // Utility methods
    generateOperationId() {
        return crypto.randomBytes(8).toString('hex');
    }

    async assessPageComplexity() {
        return await this.page.evaluate(() => {
            const metrics = {
                totalElements: document.querySelectorAll('*').length,
                formElements: document.querySelectorAll('input, select, textarea').length,
                hasFrameworks: !!(window.React || window.Vue || window.angular),
                hasAsyncContent: !!document.querySelector('[data-async], .loading'),
                hasSemanticStructure: document.querySelectorAll('main, section, article').length > 0
            };

            let score = 0;
            if (metrics.totalElements > 500) score += 20;
            if (metrics.formElements > 10) score += 30;
            if (metrics.hasFrameworks) score += 25;
            if (metrics.hasAsyncContent) score += 15;
            if (!metrics.hasSemanticStructure) score += 10;

            return { ...metrics, score };
        });
    }

    isCompleteDecision(text) {
        try {
            const parsed = JSON.parse(text);
            return parsed.action && parsed.target && parsed.confidence;
        } catch (e) {
            return false;
        }
    }

    // Event handlers
    handlePageLoad() {
        this.cachingSystem.invalidatePageCache(this.page.url());
        this.stateManager.resetPageState();
    }

    handleDOMReady() {
        this.emit('page-ready', { url: this.page.url() });
    }

    handleCircuitOpen() {
        console.warn('🚨 Circuit breaker OPEN - AI service temporarily unavailable');
        this.emit('circuit-open');
    }

    handleCircuitClose() {
        console.log('✅ Circuit breaker CLOSED - AI service restored');
        this.emit('circuit-close');
    }

    handleSlowResponse(data) {
        console.warn(`⏱️ Slow AI response detected: ${data.duration}ms`);
        this.emit('slow-response', data);
    }

    // Cleanup
    async cleanup() {
        await this.cachingSystem.cleanup();
        await this.stateManager.persist();
        this.performanceMonitor.generateReport();
    }
}

/**
 * Circuit Breaker Implementation for AI Service Reliability
 */
class CircuitBreaker extends EventEmitter {
    constructor(options = {}) {
        super();
        this.threshold = options.threshold || 5;
        this.timeout = options.timeout || 60000;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= 3) {
                this.state = 'CLOSED';
                this.emit('close');
            }
        }
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.emit('open');
        }
    }
}

/**
 * Semantic Caching System for Cost Optimization
 */
class SemanticCache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 1000;
        this.maxAge = options.maxAge || 300000;
        this.cache = new Map();
        this.embeddings = new Map();
    }

    async get(context) {
        const directHit = this.cache.get(this.generateKey(context));
        if (directHit && this.isValid(directHit)) {
            return directHit.value;
        }

        // Try semantic similarity
        const similar = await this.findSimilar(context);
        if (similar && similar.confidence > 0.85) {
            return similar.value;
        }

        return null;
    }

    async set(context, value) {
        const key = this.generateKey(context);
        const entry = {
            value,
            timestamp: Date.now(),
            accessCount: 0
        };

        this.cache.set(key, entry);
        
        // Cleanup if needed
        if (this.cache.size > this.maxSize) {
            this.cleanup();
        }
    }

    generateKey(context) {
        return crypto.createHash('md5')
            .update(JSON.stringify(context))
            .digest('hex');
    }

    isValid(entry) {
        return Date.now() - entry.timestamp < this.maxAge;
    }

    async findSimilar(context) {
        // Simplified similarity check - in production, use proper embeddings
        const contextString = JSON.stringify(context).toLowerCase();
        
        for (const [key, entry] of this.cache.entries()) {
            if (this.isValid(entry)) {
                const similarity = this.calculateSimilarity(contextString, key);
                if (similarity > 0.85) {
                    entry.accessCount++;
                    return { value: entry.value, confidence: similarity };
                }
            }
        }
        
        return null;
    }

    calculateSimilarity(str1, str2) {
        // Simple similarity calculation - replace with proper embedding similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
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

    cleanup() {
        // Remove expired and least used entries
        const entries = Array.from(this.cache.entries())
            .filter(([key, entry]) => this.isValid(entry))
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, this.maxSize * 0.8);

        this.cache.clear();
        entries.forEach(([key, entry]) => {
            this.cache.set(key, entry);
        });
    }

    invalidatePageCache(url) {
        // Remove cache entries related to specific page
        for (const [key, entry] of this.cache.entries()) {
            if (entry.value.metadata?.url === url) {
                this.cache.delete(key);
            }
        }
    }
}

/**
 * Intelligent Model Router for Cost Optimization
 */
class IntelligentModelRouter {
    constructor() {
        this.models = [
            { 
                name: 'gpt-3.5-turbo', 
                cost: 0.001, 
                capabilities: ['text'], 
                speed: 'fast',
                maxTokens: 1000
            },
            { 
                name: 'gpt-4', 
                cost: 0.03, 
                capabilities: ['text', 'complex'], 
                speed: 'medium',
                maxTokens: 2000
            },
            { 
                name: 'gpt-4-vision-preview', 
                cost: 0.05, 
                capabilities: ['text', 'vision'], 
                speed: 'slow',
                maxTokens: 1500
            }
        ];
    }

    async selectModel(strategy, context) {
        const complexity = this.analyzeComplexity(context);
        const requiresVision = strategy.type === 'multi_modal';
        
        if (requiresVision) {
            return this.models.find(m => m.capabilities.includes('vision'));
        }
        
        if (complexity < 0.5) {
            return this.models.find(m => m.name === 'gpt-3.5-turbo');
        }
        
        return this.models.find(m => m.name === 'gpt-4');
    }

    analyzeComplexity(context) {
        let score = 0;
        
        if (context.pageMetrics?.totalElements > 500) score += 0.3;
        if (context.pageMetrics?.hasFrameworks) score += 0.2;
        if (context.questionCount > 10) score += 0.2;
        if (context.hasErrors) score += 0.3;
        
        return Math.min(1.0, score);
    }
}

/**
 * Self-Healing System with Adaptive Selectors
 */
class SelfHealingSystem {
    constructor(page) {
        this.page = page;
        this.selectorHistory = new Map();
        this.failurePatterns = new Map();
        this.alternativeStrategies = new Map();
    }

    async getBestSelector(target) {
        const targetId = this.generateTargetId(target);
        const history = this.selectorHistory.get(targetId);
        
        if (history && history.successRate > 0.8) {
            return history.bestSelector;
        }
        
        // Generate multiple selector candidates
        const selectors = await this.generateSelectorCandidates(target);
        
        // Test selectors and return best one
        for (const selector of selectors) {
            try {
                const element = await this.page.$(selector);
                if (element && await element.isVisible()) {
                    await this.recordSuccess(selector, target);
                    return selector;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        throw new Error(`No valid selector found for target: ${JSON.stringify(target)}`);
    }

    async generateSelectorCandidates(target) {
        const candidates = [];
        
        // Different selector strategies
        if (target.id) candidates.push(`#${target.id}`);
        if (target.className) candidates.push(`.${target.className.split(' ')[0]}`);
        if (target.text) candidates.push(`text="${target.text}"`);
        if (target.role) candidates.push(`[role="${target.role}"]`);
        if (target.ariaLabel) candidates.push(`[aria-label="${target.ariaLabel}"]`);
        if (target.dataTestId) candidates.push(`[data-testid="${target.dataTestId}"]`);
        
        // Fallback selectors
        candidates.push(`${target.tagName || 'button'}:has-text("${target.text || ''}"):visible`);
        candidates.push(`${target.tagName || 'button'}:near(:text("${target.text || ''}"), 100)`);
        
        return candidates;
    }

    async recordSuccess(selector, target) {
        const targetId = this.generateTargetId(target);
        const history = this.selectorHistory.get(targetId) || {
            bestSelector: selector,
            successCount: 0,
            totalAttempts: 0,
            successRate: 0
        };
        
        history.successCount++;
        history.totalAttempts++;
        history.successRate = history.successCount / history.totalAttempts;
        history.bestSelector = selector;
        
        this.selectorHistory.set(targetId, history);
    }

    async recordFailure(target, error) {
        const targetId = this.generateTargetId(target);
        const pattern = this.failurePatterns.get(targetId) || {
            errors: [],
            count: 0
        };
        
        pattern.errors.push({
            message: error.message,
            timestamp: Date.now()
        });
        pattern.count++;
        
        this.failurePatterns.set(targetId, pattern);
    }

    async suggestRecovery(target, error) {
        // Based on error type, suggest recovery action
        if (error.message.includes('not visible')) {
            return { type: 'scroll_to_element', target };
        }
        
        if (error.message.includes('not found')) {
            return { type: 'wait_for_element', target, timeout: 5000 };
        }
        
        if (error.message.includes('covered')) {
            return { type: 'remove_overlay', target };
        }
        
        return null;
    }

    generateTargetId(target) {
        return crypto.createHash('md5')
            .update(JSON.stringify(target))
            .digest('hex');
    }
}

/**
 * Progressive Fallback System
 */
class ProgressiveFallbackSystem {
    constructor() {
        this.heuristicRules = this.initializeHeuristicRules();
    }

    initializeHeuristicRules() {
        return [
            {
                condition: (ctx) => ctx.pageUrl && ctx.pageUrl.includes('login'),
                action: 'authenticate',
                confidence: 0.9
            },
            {
                condition: (ctx) => ctx.hasSubmitButton && ctx.allRequiredFieldsFilled,
                action: 'submit',
                confidence: 0.8
            },
            {
                condition: (ctx) => ctx.questionCount > 0 && !ctx.hasAnswers,
                action: 'answer_questions',
                confidence: 0.7
            },
            {
                condition: (ctx) => ctx.hasNextButton,
                action: 'click_next',
                confidence: 0.6
            }
        ];
    }

    async executeHeuristic(context) {
        for (const rule of this.heuristicRules) {
            if (rule.condition(context)) {
                return {
                    action: rule.action,
                    confidence: rule.confidence,
                    source: 'heuristic',
                    reasoning: `Matched heuristic rule: ${rule.action}`
                };
            }
        }
        
        return {
            action: 'analyze_further',
            confidence: 0.3,
            source: 'heuristic',
            reasoning: 'No heuristic rules matched'
        };
    }

    async executeSimplified(context) {
        // Simplified AI analysis with reduced scope
        return {
            action: 'basic_interaction',
            confidence: 0.5,
            source: 'simplified_ai',
            reasoning: 'Fallback to basic interaction patterns'
        };
    }

    async executeManual(context) {
        // Basic pattern matching
        if (context.hasButtons) {
            return {
                action: 'click_first_button',
                confidence: 0.3,
                source: 'manual_pattern',
                reasoning: 'Basic button clicking pattern'
            };
        }
        
        return {
            action: 'wait_and_observe',
            confidence: 0.2,
            source: 'manual_pattern',
            reasoning: 'No clear action available'
        };
    }
}

/**
 * Automation State Manager
 */
class AutomationStateManager {
    constructor() {
        this.state = {
            currentPhase: 'initial',
            completedSteps: [],
            failedSteps: [],
            context: {},
            sessionData: {}
        };
    }

    async updateContext(context) {
        this.state.context = { ...this.state.context, ...context };
        this.state.lastUpdate = Date.now();
    }

    async recordStep(step, result) {
        if (result.success) {
            this.state.completedSteps.push({
                step,
                result,
                timestamp: Date.now()
            });
        } else {
            this.state.failedSteps.push({
                step,
                error: result.error,
                timestamp: Date.now()
            });
        }
    }

    resetPageState() {
        this.state.context.pageData = null;
        this.state.context.pageAnalysis = null;
    }

    async persist() {
        // In production, save to database or file
        console.log('Persisting automation state...');
    }
}

/**
 * Performance Monitor
 */
class PerformanceMonitor extends EventEmitter {
    constructor() {
        super();
        this.operations = new Map();
        this.metrics = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            averageResponseTime: 0,
            cacheHitRate: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    startOperation(operationId) {
        this.operations.set(operationId, {
            startTime: Date.now(),
            type: 'analysis'
        });
    }

    endOperation(operationId, success, error = null) {
        const operation = this.operations.get(operationId);
        if (!operation) return;

        const duration = Date.now() - operation.startTime;
        
        this.metrics.totalOperations++;
        if (success) {
            this.metrics.successfulOperations++;
        } else {
            this.metrics.failedOperations++;
        }

        // Update average response time
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime + duration) / this.metrics.totalOperations;

        // Alert on slow responses
        if (duration > 10000) {
            this.emit('slowResponse', { operationId, duration, success, error });
        }

        this.operations.delete(operationId);
    }

    recordCacheHit(operationId) {
        this.metrics.cacheHits++;
        this.updateCacheHitRate();
    }

    recordCacheMiss(operationId) {
        this.metrics.cacheMisses++;
        this.updateCacheHitRate();
    }

    updateCacheHitRate() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        this.metrics.cacheHitRate = total > 0 ? this.metrics.cacheHits / total : 0;
    }

    getMetrics() {
        return { ...this.metrics };
    }

    generateReport() {
        console.log('📊 Performance Report:');
        console.log(`  Total Operations: ${this.metrics.totalOperations}`);
        console.log(`  Success Rate: ${(this.metrics.successfulOperations / this.metrics.totalOperations * 100).toFixed(1)}%`);
        console.log(`  Average Response Time: ${this.metrics.averageResponseTime.toFixed(0)}ms`);
        console.log(`  Cache Hit Rate: ${(this.metrics.cacheHitRate * 100).toFixed(1)}%`);
    }
}

module.exports = EnhancedAIPlaywrightBridge;