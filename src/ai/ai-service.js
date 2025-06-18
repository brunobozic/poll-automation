/**
 * AI Service Integration Layer
 * Handles all AI API calls with cost optimization and error handling
 */

const fs = require('fs').promises;
const path = require('path');

class AIService {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
        this.defaultModel = options.defaultModel || 'gpt-3.5-turbo';
        this.maxRetries = options.maxRetries || 3;
        this.timeout = options.timeout || 30000;
        
        // Cost tracking
        this.totalCost = 0;
        this.requestCount = 0;
        this.errorCount = 0;
        
        // Rate limiting
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.lastRequestTime = 0;
        this.minRequestInterval = 100; // ms between requests
        
        // Model pricing (per 1K tokens)
        this.pricing = {
            'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 }
        };
    }

    /**
     * Main analysis method - handles text-based AI requests
     */
    async analyze(prompt, model = null, options = {}) {
        const requestModel = model || this.defaultModel;
        const requestOptions = {
            temperature: 0.1,
            maxTokens: 500,
            ...options
        };

        const request = {
            type: 'text',
            model: requestModel,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing web pages and survey forms. Always respond with valid JSON when requested.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            ...requestOptions
        };

        return await this.queueRequest(request);
    }

    /**
     * Vision analysis method - for screenshot analysis
     */
    async analyzeWithVision(prompt, imageData, model = 'gpt-4-vision-preview', options = {}) {
        const requestOptions = {
            temperature: 0.1,
            maxTokens: 1000,
            ...options
        };

        // Convert image to base64 if needed
        let imageUrl;
        if (Buffer.isBuffer(imageData)) {
            const base64 = imageData.toString('base64');
            imageUrl = `data:image/png;base64,${base64}`;
        } else {
            imageUrl = imageData;
        }

        const request = {
            type: 'vision',
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing web page screenshots and identifying form elements, questions, and user interface components. Always respond with valid JSON when requested.'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                                detail: options.detail || 'low' // low/high detail for cost control
                            }
                        }
                    ]
                }
            ],
            ...requestOptions
        };

        return await this.queueRequest(request);
    }

    /**
     * Batch analysis for multiple questions
     */
    async analyzeBatch(prompts, model = null, options = {}) {
        const batchSize = options.batchSize || 5;
        const results = [];

        // Process in batches to manage costs and rate limits
        for (let i = 0; i < prompts.length; i += batchSize) {
            const batch = prompts.slice(i, i + batchSize);
            const batchPromises = batch.map(prompt => this.analyze(prompt, model, options));
            
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                console.error(`Batch ${i}-${i + batchSize} failed:`, error);
                // Add fallback results for failed batch
                results.push(...batch.map(() => null));
            }
        }

        return results;
    }

    /**
     * Queue management for rate limiting
     */
    async queueRequest(request) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                request,
                resolve,
                reject,
                timestamp: Date.now()
            });

            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const item = this.requestQueue.shift();
            
            // Rate limiting
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < this.minRequestInterval) {
                await this.delay(this.minRequestInterval - timeSinceLastRequest);
            }

            try {
                const result = await this.executeRequest(item.request);
                this.lastRequestTime = Date.now();
                item.resolve(result);
            } catch (error) {
                console.error('AI request failed:', error);
                item.reject(error);
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Execute actual API request
     */
    async executeRequest(request) {
        const startTime = Date.now();
        let attempt = 0;

        while (attempt < this.maxRetries) {
            try {
                const response = await this.makeAPICall(request);
                
                // Calculate cost
                const cost = this.calculateCost(request, response);
                this.totalCost += cost;
                this.requestCount++;

                // Log request for debugging
                this.logRequest(request, response, cost, Date.now() - startTime);

                return response.choices[0].message.content;

            } catch (error) {
                attempt++;
                this.errorCount++;

                if (attempt >= this.maxRetries) {
                    throw new Error(`AI request failed after ${this.maxRetries} attempts: ${error.message}`);
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                await this.delay(delay);
            }
        }
    }

    /**
     * Make actual HTTP request to OpenAI API
     */
    async makeAPICall(request) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: request.model,
                    messages: request.messages,
                    temperature: request.temperature,
                    max_tokens: request.maxTokens,
                    top_p: request.topP || 1,
                    frequency_penalty: request.frequencyPenalty || 0,
                    presence_penalty: request.presencePenalty || 0
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('AI request timed out');
            }
            
            throw error;
        }
    }

    /**
     * Calculate request cost
     */
    calculateCost(request, response) {
        const modelPricing = this.pricing[request.model] || this.pricing['gpt-3.5-turbo'];
        
        if (!response.usage) {
            // Estimate if usage not provided
            const promptTokens = this.estimateTokens(JSON.stringify(request.messages));
            const completionTokens = this.estimateTokens(response.choices[0]?.message?.content || '');
            
            return (promptTokens * modelPricing.input + completionTokens * modelPricing.output) / 1000;
        }

        const inputCost = (response.usage.prompt_tokens * modelPricing.input) / 1000;
        const outputCost = (response.usage.completion_tokens * modelPricing.output) / 1000;
        
        return inputCost + outputCost;
    }

    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(text) {
        // Rough estimate: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }

    /**
     * Log request for monitoring
     */
    logRequest(request, response, cost, duration) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            model: request.model,
            type: request.type,
            cost: cost.toFixed(4),
            duration: duration,
            tokens: response.usage ? {
                prompt: response.usage.prompt_tokens,
                completion: response.usage.completion_tokens,
                total: response.usage.total_tokens
            } : null,
            success: true
        };

        // In production, send to logging service
        console.log(`[AI] ${request.model} - $${cost.toFixed(4)} - ${duration}ms`);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            totalCost: this.totalCost,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
            averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
            queueLength: this.requestQueue.length
        };
    }

    /**
     * Reset cost tracking
     */
    resetStats() {
        this.totalCost = 0;
        this.requestCount = 0;
        this.errorCount = 0;
    }

    /**
     * Estimate cost for a prompt before execution
     */
    estimateCost(prompt, model = null, maxTokens = 500) {
        const requestModel = model || this.defaultModel;
        const modelPricing = this.pricing[requestModel] || this.pricing['gpt-3.5-turbo'];
        
        const promptTokens = this.estimateTokens(prompt);
        const estimatedInputCost = (promptTokens * modelPricing.input) / 1000;
        const estimatedOutputCost = (maxTokens * modelPricing.output) / 1000;
        
        return estimatedInputCost + estimatedOutputCost;
    }

    /**
     * Check if API key is valid
     */
    async validateAPIKey() {
        try {
            await this.analyze('Test prompt', 'gpt-3.5-turbo', { maxTokens: 5 });
            return true;
        } catch (error) {
            if (error.message.includes('401') || error.message.includes('invalid')) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        const startTime = Date.now();
        
        try {
            await this.analyze('Health check', 'gpt-3.5-turbo', { maxTokens: 5 });
            
            return {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                queueLength: this.requestQueue.length,
                stats: this.getStats()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }
}

module.exports = AIService;