/**
 * API Client for Testing
 * 
 * Centralized HTTP client for making API requests during tests
 */

const axios = require('axios');

class APIClient {
    constructor(baseURL = global.testConfig?.apiBaseUrl || 'http://localhost:3000') {
        this.client = axios.create({
            baseURL,
            timeout: 30000,
            validateStatus: () => true // Don't throw errors on non-2xx status codes
        });
        
        // Request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
            if (config.data) {
                console.log(`📝 Request Body:`, JSON.stringify(config.data, null, 2));
            }
            return config;
        });
        
        // Response interceptor for logging
        this.client.interceptors.response.use((response) => {
            console.log(`📡 Response ${response.status} from ${response.config.url}`);
            return response;
        }, (error) => {
            console.error(`❌ Request failed:`, error.message);
            return Promise.reject(error);
        });
    }
    
    // Health check endpoint
    async health() {
        return this.client.get('/health');
    }
    
    // API info endpoint
    async getApiInfo() {
        return this.client.get('/api');
    }
    
    // System endpoints
    async getSystemStatus() {
        return this.client.get('/api/system/status');
    }
    
    async getDatabaseStats() {
        return this.client.get('/api/database/stats');
    }
    
    async testLLM() {
        return this.client.get('/api/llm/test');
    }
    
    async runErrorDetection(cycles = 3) {
        return this.client.get('/api/test/error-detection', {
            params: { cycles }
        });
    }
    
    // Email management endpoints
    async createEmails(count = 1, provider = 'auto') {
        return this.client.post('/api/emails', { count, provider });
    }
    
    async getEmails(limit = 100, provider = null) {
        const params = { limit };
        if (provider) params.provider = provider;
        return this.client.get('/api/emails', { params });
    }
    
    async getUnusedEmails(siteId, limit = 50) {
        return this.client.get(`/api/emails/unused/${siteId}`, {
            params: { limit }
        });
    }
    
    async getSuccessfulEmails() {
        return this.client.get('/api/emails/successful');
    }
    
    // Survey site endpoints
    async getSurveySites() {
        return this.client.get('/api/survey-sites');
    }
    
    async createSurveySites(sites) {
        return this.client.post('/api/survey-sites', { sites });
    }
    
    // Failure analysis endpoints
    async getRecentFailures(limit = 10) {
        return this.client.get('/api/failures/recent', {
            params: { limit }
        });
    }
    
    async getSiteFailures(siteId, limit = 50) {
        return this.client.get(`/api/failures/site/${siteId}`, {
            params: { limit }
        });
    }
    
    async getAllFailures(limit = 200, groupBy = null) {
        const params = { limit };
        if (groupBy) params.groupBy = groupBy;
        return this.client.get('/api/failures/all', { params });
    }
    
    // Registration endpoints
    async registerEmails(siteIds, emailCount = 5, useUnusedEmails = true) {
        return this.client.post('/api/register', {
            siteIds,
            emailCount,
            useUnusedEmails
        });
    }
    
    // Generic request methods
    async get(url, config = {}) {
        return this.client.get(url, config);
    }
    
    async post(url, data = {}, config = {}) {
        return this.client.post(url, data, config);
    }
    
    async put(url, data = {}, config = {}) {
        return this.client.put(url, data, config);
    }
    
    async delete(url, config = {}) {
        return this.client.delete(url, config);
    }
    
    // Test-specific utilities
    async waitForServer(maxAttempts = 30, intervalMs = 1000) {
        console.log('⏳ Waiting for API server to be ready...');
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await this.health();
                if (response.status === 200) {
                    console.log(`✅ API server is ready (attempt ${attempt})`);
                    return true;
                }
            } catch (error) {
                console.log(`❌ Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
            }
            
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
        
        throw new Error(`API server not ready after ${maxAttempts} attempts`);
    }
    
    // Batch operations for testing
    async batchCreateEmails(batches) {
        const results = [];
        
        for (const batch of batches) {
            try {
                const response = await this.createEmails(batch.count, batch.provider);
                results.push({
                    batch,
                    success: true,
                    response: response.data
                });
            } catch (error) {
                results.push({
                    batch,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    async batchCreateSites(siteBatches) {
        const results = [];
        
        for (const sites of siteBatches) {
            try {
                const response = await this.createSurveySites(sites);
                results.push({
                    sites,
                    success: true,
                    response: response.data
                });
            } catch (error) {
                results.push({
                    sites,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    // Stress testing utilities
    async stressTest(endpoint, requests = 10, concurrency = 5) {
        console.log(`🚀 Stress testing ${endpoint} with ${requests} requests (${concurrency} concurrent)`);
        
        const results = {
            total: requests,
            successful: 0,
            failed: 0,
            averageResponseTime: 0,
            responses: []
        };
        
        // Create batches for concurrent execution
        const batches = [];
        for (let i = 0; i < requests; i += concurrency) {
            const batch = [];
            for (let j = i; j < Math.min(i + concurrency, requests); j++) {
                batch.push(j);
            }
            batches.push(batch);
        }
        
        let totalTime = 0;
        
        for (const batch of batches) {
            const promises = batch.map(async (requestId) => {
                const startTime = Date.now();
                try {
                    const response = await this.get(endpoint);
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    totalTime += responseTime;
                    
                    results.successful++;
                    results.responses.push({
                        requestId,
                        status: response.status,
                        responseTime,
                        success: true
                    });
                } catch (error) {
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    totalTime += responseTime;
                    
                    results.failed++;
                    results.responses.push({
                        requestId,
                        error: error.message,
                        responseTime,
                        success: false
                    });
                }
            });
            
            await Promise.all(promises);
        }
        
        results.averageResponseTime = totalTime / requests;
        
        console.log(`📊 Stress test results: ${results.successful}/${results.total} successful`);
        console.log(`⏱️ Average response time: ${results.averageResponseTime.toFixed(2)}ms`);
        
        return results;
    }
}

module.exports = APIClient;