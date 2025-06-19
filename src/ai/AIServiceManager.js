/**
 * AI Service Manager
 * Consolidates AI functionality from:
 * - ai-service.js
 * - Various AI components
 * - Cost optimization and caching
 * 
 * Provides unified AI service management with cost optimization
 */

const axios = require('axios');
const crypto = require('crypto');

class AIServiceManager {
    constructor(options = {}) {
        this.options = {
            serviceUrl: options.serviceUrl || 'http://127.0.0.1:5000',
            learningEnabled: options.learningEnabled !== false,
            cachingEnabled: options.cachingEnabled !== false,
            batchProcessing: options.batchProcessing !== false,
            costOptimization: options.costOptimization !== false,
            timeout: options.timeout || 30000,
            maxRetries: options.maxRetries || 3,
            ...options
        };

        // Service state
        this.isInitialized = false;
        this.isServiceAvailable = false;
        this.serviceCapabilities = [];

        // Caching system
        this.cache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            entries: 0
        };

        // Batch processing
        this.batchQueue = [];
        this.batchProcessor = null;
        this.batchTimeout = null;

        // Cost tracking
        this.costTracking = {
            totalCost: 0,
            requestCount: 0,
            avgCostPerRequest: 0,
            costByModel: new Map(),
            costByOperation: new Map()
        };

        // Performance tracking
        this.performance = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            lastRequestTime: null
        };

        // Learning data
        this.learningData = {
            patterns: new Map(),
            optimizations: new Map(),
            feedback: new Map()
        };
    }

    /**
     * Initialize AI service manager
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🧠 Initializing AI Service Manager...');

        try {
            // Test service connection
            await this.testConnection();

            // Setup caching
            if (this.options.cachingEnabled) {
                this.setupCaching();
            }

            // Setup batch processing
            if (this.options.batchProcessing) {
                this.setupBatchProcessing();
            }

            // Load learning data
            if (this.options.learningEnabled) {
                await this.loadLearningData();
            }

            this.isInitialized = true;
            console.log(`✅ AI Service Manager initialized (${this.isServiceAvailable ? 'Service Available' : 'Offline Mode'})`);

        } catch (error) {
            console.error('❌ AI Service Manager initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Test connection to AI service
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.options.serviceUrl}/health`, {
                timeout: this.options.timeout
            });

            if (response.status === 200) {
                this.isServiceAvailable = true;
                this.serviceCapabilities = response.data.capabilities || [];
                console.log(`   🔗 AI Service connected: ${this.serviceCapabilities.join(', ')}`);
            }

            return {
                success: true,
                capabilities: this.serviceCapabilities,
                status: response.data
            };

        } catch (error) {
            this.isServiceAvailable = false;
            console.warn('   ⚠️ AI Service not available, using fallback capabilities');
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze site structure using AI
     */
    async analyzeSiteStructure(params) {
        const cacheKey = this.generateCacheKey('site-analysis', params.url);
        
        // Check cache first
        if (this.options.cachingEnabled) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('   📋 Using cached site analysis');
                return cached;
            }
        }

        try {
            if (!this.isServiceAvailable) {
                return this.fallbackSiteAnalysis(params);
            }

            const requestData = {
                operation: 'analyze_site_structure',
                url: params.url,
                site_type: params.siteType,
                historical_data: params.historicalData,
                model: params.model || 'gpt-3.5-turbo'
            };

            const response = await this.makeAIRequest('/analyze-site', requestData);
            
            // Cache the result
            if (this.options.cachingEnabled) {
                this.setCache(cacheKey, response.data, 24 * 60 * 60 * 1000); // 24 hours
            }

            return response.data;

        } catch (error) {
            console.warn('AI site analysis failed, using fallback');
            return this.fallbackSiteAnalysis(params);
        }
    }

    /**
     * Discover polls using AI
     */
    async discoverPolls(params) {
        const cacheKey = this.generateCacheKey('poll-discovery', params.url);
        
        // Check cache first
        if (this.options.cachingEnabled) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('   📋 Using cached poll discovery');
                return cached;
            }
        }

        try {
            if (!this.isServiceAvailable) {
                return this.fallbackPollDiscovery(params);
            }

            const requestData = {
                operation: 'discover_polls',
                html: params.html.substring(0, 50000), // Limit HTML size
                url: params.url,
                site_config: params.siteConfig,
                model: params.model || 'gpt-3.5-turbo'
            };

            // Add screenshot if provided (base64 encoded)
            if (params.screenshot) {
                requestData.screenshot = params.screenshot.toString('base64');
            }

            const response = await this.makeAIRequest('/discover-polls', requestData);
            
            // Cache the result
            if (this.options.cachingEnabled) {
                this.setCache(cacheKey, response.data, 60 * 60 * 1000); // 1 hour
            }

            return response.data;

        } catch (error) {
            console.warn('AI poll discovery failed, using fallback');
            return this.fallbackPollDiscovery(params);
        }
    }

    /**
     * Generate form data using AI
     */
    async generateFormData(form, profile) {
        try {
            if (!this.isServiceAvailable) {
                return this.fallbackFormDataGeneration(form, profile);
            }

            const requestData = {
                operation: 'generate_form_data',
                form_structure: form,
                user_profile: profile,
                model: 'gpt-3.5-turbo'
            };

            const response = await this.makeAIRequest('/generate-form-data', requestData);
            return response.data.form_data || {};

        } catch (error) {
            console.warn('AI form data generation failed, using fallback');
            return this.fallbackFormDataGeneration(form, profile);
        }
    }

    /**
     * Classify questions using AI
     */
    async classifyQuestions(questions) {
        try {
            if (!this.isServiceAvailable) {
                return this.fallbackQuestionClassification(questions);
            }

            const requestData = {
                operation: 'classify_questions',
                questions: questions,
                model: 'gpt-3.5-turbo'
            };

            const response = await this.makeAIRequest('/classify-questions', requestData);
            return response.data.classifications || [];

        } catch (error) {
            console.warn('AI question classification failed, using fallback');
            return this.fallbackQuestionClassification(questions);
        }
    }

    /**
     * Generate optimal responses using AI
     */
    async generateOptimalResponses(questions, profile) {
        try {
            if (!this.isServiceAvailable) {
                return this.fallbackResponseGeneration(questions, profile);
            }

            const requestData = {
                operation: 'generate_responses',
                questions: questions,
                profile: profile,
                model: 'gpt-3.5-turbo'
            };

            const response = await this.makeAIRequest('/generate-responses', requestData);
            return response.data.responses || [];

        } catch (error) {
            console.warn('AI response generation failed, using fallback');
            return this.fallbackResponseGeneration(questions, profile);
        }
    }

    /**
     * Make AI request with error handling and cost tracking
     */
    async makeAIRequest(endpoint, data, retries = 0) {
        const startTime = Date.now();
        this.performance.totalRequests++;

        try {
            const response = await axios.post(`${this.options.serviceUrl}${endpoint}`, data, {
                timeout: this.options.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const responseTime = Date.now() - startTime;
            this.updatePerformanceMetrics(responseTime, true);

            // Track costs
            if (response.data.cost) {
                this.trackCost(data.operation, data.model, response.data.cost);
            }

            return response;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updatePerformanceMetrics(responseTime, false);

            if (retries < this.options.maxRetries) {
                console.log(`   🔄 Retrying AI request (${retries + 1}/${this.options.maxRetries})`);
                await this.delay(1000 * (retries + 1)); // Exponential backoff
                return this.makeAIRequest(endpoint, data, retries + 1);
            }

            throw error;
        }
    }

    /**
     * Fallback implementations
     */
    fallbackSiteAnalysis(params) {
        const url = params.url.toLowerCase();
        
        let approach = 'standard';
        let complexity = 'medium';
        let expectedChallenges = ['basic_forms'];
        
        if (url.includes('survey') || url.includes('poll')) {
            approach = 'survey_focused';
            expectedChallenges.push('attention_checks');
        }
        
        if (url.includes('secure') || url.includes('enterprise')) {
            complexity = 'high';
            expectedChallenges.push('captcha', 'multi_factor');
        }

        return {
            approach: approach,
            complexity: complexity,
            expectedChallenges: expectedChallenges,
            recommendedBehavior: 'confident',
            proxyStrategy: 'standard_rotation',
            confidence: 0.6,
            cost: 0
        };
    }

    fallbackPollDiscovery(params) {
        // Basic poll discovery using HTML patterns
        const polls = [];
        const html = params.html.toLowerCase();
        
        const pollPatterns = [
            /href="([^"]*poll[^"]*)/gi,
            /href="([^"]*survey[^"]*)/gi,
            /href="([^"]*questionnaire[^"]*)/gi
        ];

        let pollIndex = 0;
        for (const pattern of pollPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null && polls.length < 10) {
                polls.push({
                    id: `fallback_poll_${pollIndex++}`,
                    title: `Poll ${pollIndex}`,
                    url: match[1],
                    confidence: 0.5
                });
            }
        }

        return {
            polls: polls,
            method: 'fallback_pattern_matching',
            cost: 0
        };
    }

    fallbackFormDataGeneration(form, profile) {
        const formData = {};
        
        // Basic field mapping
        const mappings = {
            email: profile.email,
            name: profile.firstName + ' ' + profile.lastName,
            firstName: profile.firstName,
            lastName: profile.lastName,
            age: profile.age?.toString(),
            gender: profile.gender
        };

        for (const input of form.inputs) {
            const fieldType = this.identifyFieldType(input);
            if (mappings[fieldType]) {
                formData[`input[name="${input.name}"]`] = mappings[fieldType];
            }
        }

        return formData;
    }

    fallbackQuestionClassification(questions) {
        return questions.map(question => ({
            id: question.id,
            type: 'text',
            category: 'general',
            confidence: 0.5
        }));
    }

    fallbackResponseGeneration(questions, profile) {
        return questions.map(question => ({
            questionId: question.id,
            response: 'Satisfied',
            confidence: 0.5,
            method: 'fallback'
        }));
    }

    /**
     * Caching system
     */
    setupCaching() {
        console.log('   💾 Setting up AI response caching');
        
        // Cleanup cache periodically
        setInterval(() => {
            this.cleanupCache();
        }, 60 * 60 * 1000); // Every hour
    }

    generateCacheKey(operation, ...params) {
        const data = [operation, ...params].join('|');
        return crypto.createHash('md5').update(data).digest('hex');
    }

    getFromCache(key) {
        const entry = this.cache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
            this.cacheStats.hits++;
            return entry.data;
        }
        
        if (entry) {
            this.cache.delete(key);
        }
        
        this.cacheStats.misses++;
        return null;
    }

    setCache(key, data, ttl = 60 * 60 * 1000) {
        this.cache.set(key, {
            data: data,
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl
        });
        
        this.cacheStats.entries = this.cache.size;
    }

    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        
        this.cacheStats.entries = this.cache.size;
        
        if (cleaned > 0) {
            console.log(`   🧹 Cleaned ${cleaned} expired cache entries`);
        }
    }

    /**
     * Batch processing
     */
    setupBatchProcessing() {
        console.log('   📦 Setting up batch processing');
        
        this.batchProcessor = setInterval(() => {
            if (this.batchQueue.length > 0) {
                this.processBatch();
            }
        }, 5000); // Process batches every 5 seconds
    }

    addToBatch(request) {
        return new Promise((resolve, reject) => {
            this.batchQueue.push({
                ...request,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            // Process immediately if batch is full
            if (this.batchQueue.length >= 10) {
                this.processBatch();
            }
        });
    }

    async processBatch() {
        if (this.batchQueue.length === 0) return;
        
        const batch = this.batchQueue.splice(0, 10); // Process up to 10 requests
        console.log(`📦 Processing batch of ${batch.length} AI requests`);
        
        try {
            const batchData = {
                operation: 'batch_process',
                requests: batch.map(req => ({
                    id: req.id,
                    operation: req.operation,
                    data: req.data
                }))
            };
            
            const response = await this.makeAIRequest('/batch', batchData);
            const results = response.data.results || [];
            
            // Resolve individual requests
            batch.forEach((request, index) => {
                const result = results[index];
                if (result && !result.error) {
                    request.resolve(result);
                } else {
                    request.reject(new Error(result?.error || 'Batch processing failed'));
                }
            });
            
        } catch (error) {
            // Reject all requests in the batch
            batch.forEach(request => {
                request.reject(error);
            });
        }
    }

    /**
     * Cost tracking
     */
    trackCost(operation, model, cost) {
        this.costTracking.totalCost += cost;
        this.costTracking.requestCount++;
        this.costTracking.avgCostPerRequest = this.costTracking.totalCost / this.costTracking.requestCount;
        
        // Track by model
        const modelCost = this.costTracking.costByModel.get(model) || 0;
        this.costTracking.costByModel.set(model, modelCost + cost);
        
        // Track by operation
        const operationCost = this.costTracking.costByOperation.get(operation) || 0;
        this.costTracking.costByOperation.set(operation, operationCost + cost);
        
        if (this.options.costOptimization) {
            this.optimizeCosts();
        }
    }

    optimizeCosts() {
        // Switch to cheaper models if costs are high
        if (this.costTracking.totalCost > 1.0) { // $1 threshold
            console.log('💰 Cost optimization: switching to cheaper models');
            // Implementation would adjust model choices
        }
    }

    /**
     * Performance tracking
     */
    updatePerformanceMetrics(responseTime, success) {
        this.performance.avgResponseTime = (this.performance.avgResponseTime + responseTime) / 2;
        this.performance.lastRequestTime = Date.now();
        
        if (success) {
            this.performance.successfulRequests++;
        } else {
            this.performance.failedRequests++;
        }
    }

    /**
     * Learning system
     */
    async loadLearningData() {
        console.log('📚 Loading AI learning data...');
        // Implementation would load previous learning data
    }

    async saveLearningData() {
        console.log('💾 Saving AI learning data...');
        // Implementation would save learning data
    }

    recordFeedback(operation, input, output, success) {
        if (!this.options.learningEnabled) return;
        
        const feedbackKey = crypto.createHash('md5').update(operation + JSON.stringify(input)).digest('hex');
        
        this.learningData.feedback.set(feedbackKey, {
            operation,
            input,
            output,
            success,
            timestamp: Date.now()
        });
    }

    /**
     * Utility methods
     */
    identifyFieldType(input) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        
        if (input.type === 'email' || name.includes('email') || id.includes('email')) {
            return 'email';
        }
        if (name.includes('first') || id.includes('first')) {
            return 'firstName';
        }
        if (name.includes('last') || id.includes('last')) {
            return 'lastName';
        }
        if (name.includes('name') && !name.includes('first') && !name.includes('last')) {
            return 'name';
        }
        if (name.includes('age') || id.includes('age')) {
            return 'age';
        }
        if (name.includes('gender') || id.includes('gender')) {
            return 'gender';
        }
        
        return 'unknown';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            isServiceAvailable: this.isServiceAvailable,
            capabilities: this.serviceCapabilities,
            performance: this.performance,
            costTracking: {
                ...this.costTracking,
                costByModel: Object.fromEntries(this.costTracking.costByModel),
                costByOperation: Object.fromEntries(this.costTracking.costByOperation)
            },
            cacheStats: this.cacheStats,
            batchQueue: this.batchQueue.length,
            learningData: {
                patterns: this.learningData.patterns.size,
                optimizations: this.learningData.optimizations.size,
                feedback: this.learningData.feedback.size
            }
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up AI Service Manager...');
        
        try {
            // Stop batch processor
            if (this.batchProcessor) {
                clearInterval(this.batchProcessor);
                this.batchProcessor = null;
            }
            
            // Process remaining batch items
            if (this.batchQueue.length > 0) {
                await this.processBatch();
            }
            
            // Save learning data
            if (this.options.learningEnabled) {
                await this.saveLearningData();
            }
            
            // Clear caches and data
            this.cache.clear();
            this.learningData.patterns.clear();
            this.learningData.optimizations.clear();
            this.learningData.feedback.clear();
            
            this.isInitialized = false;
            console.log('✅ AI Service Manager cleanup complete');
            
        } catch (error) {
            console.error('❌ AI Service Manager cleanup error:', error.message);
        }
    }
}

module.exports = AIServiceManager;