/**
 * Proxy Management System
 * Advanced proxy rotation and IP management for anti-detection
 */

const crypto = require('crypto');

class ProxyManager {
    constructor(options = {}) {
        this.options = {
            // Proxy sources
            proxyList: options.proxyList || [],
            proxyFile: options.proxyFile || null,
            proxyAPI: options.proxyAPI || null,
            
            // Rotation settings
            rotationInterval: options.rotationInterval || 300000, // 5 minutes
            maxRequestsPerProxy: options.maxRequestsPerProxy || 50,
            failureThreshold: options.failureThreshold || 3,
            
            // Proxy types
            preferredTypes: options.preferredTypes || ['residential', 'datacenter'],
            countries: options.countries || ['US', 'CA', 'GB', 'AU'],
            
            // Health checking
            healthCheckEnabled: options.healthCheckEnabled !== false,
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            healthCheckTimeout: options.healthCheckTimeout || 10000,
            
            ...options
        };
        
        this.proxies = [];
        this.currentProxy = null;
        this.proxyStats = new Map();
        this.healthCheckTimer = null;
        this.rotationTimer = null;
        
        this.blacklist = new Set();
        this.initialized = false;
    }
    
    /**
     * Initialize proxy manager
     */
    async initialize() {
        console.log('🌐 Initializing Proxy Manager...');
        
        try {
            // Load proxies from various sources
            await this.loadProxies();
            
            // Start health checking if enabled
            if (this.options.healthCheckEnabled && this.proxies.length > 0) {
                await this.startHealthChecking();
            }
            
            // Start automatic rotation if enabled
            if (this.options.rotationInterval > 0) {
                this.startRotation();
            }
            
            // Select initial proxy
            await this.selectProxy();
            
            this.initialized = true;
            console.log(`✅ Proxy Manager initialized with ${this.proxies.length} proxies`);
            
        } catch (error) {
            console.error('❌ Proxy Manager initialization failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Load proxies from all configured sources
     */
    async loadProxies() {
        // Load from direct list
        if (this.options.proxyList && this.options.proxyList.length > 0) {
            this.proxies.push(...this.parseProxyList(this.options.proxyList));
        }
        
        // Load from file
        if (this.options.proxyFile) {
            try {
                const fs = require('fs').promises;
                const fileContent = await fs.readFile(this.options.proxyFile, 'utf8');
                const fileProxies = this.parseProxyFile(fileContent);
                this.proxies.push(...fileProxies);
            } catch (error) {
                console.log(`⚠️ Could not load proxy file: ${error.message}`);
            }
        }
        
        // Load from API
        if (this.options.proxyAPI) {
            try {
                const apiProxies = await this.loadFromAPI();
                this.proxies.push(...apiProxies);
            } catch (error) {
                console.log(`⚠️ Could not load from proxy API: ${error.message}`);
            }
        }
        
        // Initialize stats for all proxies
        this.proxies.forEach(proxy => {
            this.proxyStats.set(proxy.id, {
                requests: 0,
                failures: 0,
                lastUsed: null,
                responseTime: 0,
                healthy: true,
                lastHealthCheck: null
            });
        });
        
        console.log(`📡 Loaded ${this.proxies.length} proxies`);
    }
    
    /**
     * Parse proxy list into standardized format
     */
    parseProxyList(proxyList) {
        return proxyList.map(proxy => {
            if (typeof proxy === 'string') {
                return this.parseProxyString(proxy);
            } else {
                return this.normalizeProxy(proxy);
            }
        });
    }
    
    /**
     * Parse proxy string (format: protocol://user:pass@host:port)
     */
    parseProxyString(proxyString) {
        try {
            const url = new URL(proxyString);
            return {
                id: crypto.randomUUID(),
                protocol: url.protocol.replace(':', ''),
                host: url.hostname,
                port: parseInt(url.port),
                username: url.username || null,
                password: url.password || null,
                type: 'unknown',
                country: 'unknown',
                city: 'unknown',
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.log(`⚠️ Invalid proxy string: ${proxyString}`);
            return null;
        }
    }
    
    /**
     * Normalize proxy object
     */
    normalizeProxy(proxy) {
        return {
            id: proxy.id || crypto.randomUUID(),
            protocol: proxy.protocol || 'http',
            host: proxy.host,
            port: proxy.port,
            username: proxy.username || null,
            password: proxy.password || null,
            type: proxy.type || 'unknown',
            country: proxy.country || 'unknown',
            city: proxy.city || 'unknown',
            createdAt: proxy.createdAt || new Date().toISOString()
        };
    }
    
    /**
     * Parse proxy file content
     */
    parseProxyFile(content) {
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        const proxies = [];
        
        for (const line of lines) {
            const proxy = this.parseProxyString(line.trim());
            if (proxy) {
                proxies.push(proxy);
            }
        }
        
        return proxies;
    }
    
    /**
     * Load proxies from API
     */
    async loadFromAPI() {
        // This would integrate with proxy providers like:
        // - ProxyMesh
        // - Smartproxy
        // - Oxylabs
        // - BrightData
        
        console.log('🔄 Loading proxies from API...');
        
        // Example implementation for a generic API
        try {
            const response = await fetch(this.options.proxyAPI.url, {
                headers: {
                    'Authorization': `Bearer ${this.options.proxyAPI.key}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            // Parse API response based on provider format
            return this.parseAPIResponse(data);
            
        } catch (error) {
            console.log(`⚠️ API loading failed: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Parse API response into proxy objects
     */
    parseAPIResponse(data) {
        // This would be customized based on the API provider's format
        if (Array.isArray(data)) {
            return data.map(item => this.normalizeProxy(item));
        } else if (data.proxies && Array.isArray(data.proxies)) {
            return data.proxies.map(item => this.normalizeProxy(item));
        }
        
        return [];
    }
    
    /**
     * Select best available proxy
     */
    async selectProxy(criteria = {}) {
        if (this.proxies.length === 0) {
            console.log('⚠️ No proxies available');
            return null;
        }
        
        // Filter available proxies
        let candidates = this.proxies.filter(proxy => {
            const stats = this.proxyStats.get(proxy.id);
            
            // Skip blacklisted proxies
            if (this.blacklist.has(proxy.id)) return false;
            
            // Skip unhealthy proxies
            if (this.options.healthCheckEnabled && !stats.healthy) return false;
            
            // Skip overused proxies
            if (stats.requests >= this.options.maxRequestsPerProxy) return false;
            
            // Apply criteria filters
            if (criteria.country && proxy.country !== criteria.country) return false;
            if (criteria.type && proxy.type !== criteria.type) return false;
            
            return true;
        });
        
        if (candidates.length === 0) {
            console.log('⚠️ No suitable proxies available');
            
            // Reset request counts if all proxies are overused
            this.proxyStats.forEach(stats => stats.requests = 0);
            candidates = this.proxies.filter(proxy => !this.blacklist.has(proxy.id));
        }
        
        if (candidates.length === 0) {
            return null;
        }
        
        // Select proxy based on strategy
        let selectedProxy;
        
        switch (this.options.selectionStrategy || 'least_used') {
            case 'random':
                selectedProxy = candidates[Math.floor(Math.random() * candidates.length)];
                break;
                
            case 'round_robin':
                selectedProxy = this.selectRoundRobin(candidates);
                break;
                
            case 'least_used':
            default:
                selectedProxy = this.selectLeastUsed(candidates);
                break;
        }
        
        this.currentProxy = selectedProxy;
        console.log(`🌐 Selected proxy: ${selectedProxy.host}:${selectedProxy.port} (${selectedProxy.country})`);
        
        return selectedProxy;
    }
    
    /**
     * Select least used proxy
     */
    selectLeastUsed(candidates) {
        return candidates.reduce((best, proxy) => {
            const proxyStats = this.proxyStats.get(proxy.id);
            const bestStats = this.proxyStats.get(best.id);
            
            if (proxyStats.requests < bestStats.requests) {
                return proxy;
            } else if (proxyStats.requests === bestStats.requests) {
                // If same usage, prefer faster proxy
                return proxyStats.responseTime < bestStats.responseTime ? proxy : best;
            }
            
            return best;
        });
    }
    
    /**
     * Get current proxy configuration for Playwright
     */
    getProxyConfig() {
        if (!this.currentProxy) {
            return null;
        }
        
        const config = {
            server: `${this.currentProxy.protocol}://${this.currentProxy.host}:${this.currentProxy.port}`
        };
        
        if (this.currentProxy.username && this.currentProxy.password) {
            config.username = this.currentProxy.username;
            config.password = this.currentProxy.password;
        }
        
        return config;
    }
    
    /**
     * Record proxy usage and performance
     */
    recordUsage(proxyId, success = true, responseTime = 0) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats) return;
        
        stats.requests++;
        stats.lastUsed = new Date().toISOString();
        
        if (success) {
            stats.responseTime = (stats.responseTime + responseTime) / 2; // Moving average
        } else {
            stats.failures++;
            
            // Blacklist proxy if too many failures
            if (stats.failures >= this.options.failureThreshold) {
                this.blacklist.add(proxyId);
                console.log(`⚠️ Blacklisted proxy: ${this.getProxyById(proxyId)?.host}`);
            }
        }
    }
    
    /**
     * Start health checking
     */
    async startHealthChecking() {
        console.log('🔍 Starting proxy health checks...');
        
        const checkHealth = async () => {
            const promises = this.proxies.map(proxy => this.checkProxyHealth(proxy));
            await Promise.allSettled(promises);
        };
        
        // Initial health check
        await checkHealth();
        
        // Schedule regular health checks
        this.healthCheckTimer = setInterval(checkHealth, this.options.healthCheckInterval);
    }
    
    /**
     * Check individual proxy health
     */
    async checkProxyHealth(proxy) {
        const stats = this.proxyStats.get(proxy.id);
        if (!stats) return;
        
        try {
            const startTime = Date.now();
            
            // Use fetch with proxy (simplified - would need actual proxy implementation)
            const response = await fetch('https://httpbin.org/ip', {
                timeout: this.options.healthCheckTimeout
                // Note: Real implementation would use proxy here
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                stats.healthy = true;
                stats.responseTime = responseTime;
                
                // Remove from blacklist if it was there
                this.blacklist.delete(proxy.id);
            } else {
                stats.healthy = false;
            }
            
        } catch (error) {
            stats.healthy = false;
        }
        
        stats.lastHealthCheck = new Date().toISOString();
    }
    
    /**
     * Start automatic rotation
     */
    startRotation() {
        this.rotationTimer = setInterval(async () => {
            console.log('🔄 Rotating proxy...');
            await this.selectProxy();
        }, this.options.rotationInterval);
    }
    
    /**
     * Get proxy by ID
     */
    getProxyById(proxyId) {
        return this.proxies.find(proxy => proxy.id === proxyId);
    }
    
    /**
     * Get proxy statistics
     */
    getStats() {
        const total = this.proxies.length;
        const healthy = Array.from(this.proxyStats.values()).filter(stats => stats.healthy).length;
        const blacklisted = this.blacklist.size;
        const totalRequests = Array.from(this.proxyStats.values()).reduce((sum, stats) => sum + stats.requests, 0);
        
        return {
            total,
            healthy,
            blacklisted,
            available: healthy - blacklisted,
            totalRequests,
            currentProxy: this.currentProxy ? {
                host: this.currentProxy.host,
                port: this.currentProxy.port,
                country: this.currentProxy.country,
                type: this.currentProxy.type
            } : null
        };
    }
    
    /**
     * Add proxy to blacklist
     */
    blacklistProxy(proxyId) {
        this.blacklist.add(proxyId);
        const proxy = this.getProxyById(proxyId);
        console.log(`⚠️ Manually blacklisted proxy: ${proxy?.host}`);
    }
    
    /**
     * Remove proxy from blacklist
     */
    whitelistProxy(proxyId) {
        this.blacklist.delete(proxyId);
        const proxy = this.getProxyById(proxyId);
        console.log(`✅ Whitelisted proxy: ${proxy?.host}`);
    }
    
    /**
     * Clear all blacklisted proxies
     */
    clearBlacklist() {
        this.blacklist.clear();
        console.log('✅ Cleared proxy blacklist');
    }
    
    /**
     * Cleanup and shutdown
     */
    shutdown() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = null;
        }
        
        console.log('✅ Proxy Manager shutdown complete');
    }
}

module.exports = ProxyManager;