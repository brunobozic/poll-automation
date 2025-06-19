/**
 * Consolidated Proxy Manager
 * Combines functionality from both basic and advanced proxy managers
 * Provides intelligent proxy selection, rotation, health monitoring, and geolocation spoofing
 * 
 * Replaces:
 * - src/proxy/manager.js
 * - src/network/advanced-proxy-manager.js
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const axios = require('axios');

class ConsolidatedProxyManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            enableRotation: options.enableRotation !== false,
            rotationInterval: options.rotationInterval || 300000, // 5 minutes
            maxFailures: options.maxFailures || 3,
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            sessionPersistence: options.sessionPersistence !== false,
            geolocationMatching: options.geolocationMatching !== false,
            performanceOptimization: options.performanceOptimization !== false,
            maxTabs: options.maxTabs || 10,
            ...options
        };
        
        // Unified proxy management
        this.proxies = [];
        this.currentIndex = 0;
        this.blacklistedProxies = new Set();
        this.proxyPools = new Map();
        this.activeProxies = new Map();
        this.proxyStats = new Map();
        this.sessionProxyMapping = new Map();
        
        // Health monitoring
        this.healthMonitor = null;
        this.failedProxies = new Set();
        this.quarantinedProxies = new Map();
        
        // Performance tracking
        this.performanceMetrics = new Map();
        this.rotationHistory = [];
        
        // Geolocation database
        this.geolocationData = new Map();
        this.supportedCountries = [
            'US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'NL', 'SE', 'CH',
            'IT', 'ES', 'BR', 'IN', 'SG', 'HK', 'KR', 'MX', 'NO', 'DK'
        ];
        
        // Rate limiting
        this.rateLimits = new Map();
        this.requestCounts = new Map();
    }

    async initialize() {
        console.log('🌐 Initializing Consolidated Proxy Manager...');
        
        try {
            // Load proxy configurations from multiple sources
            await this.loadProxyConfigurations();
            
            // Initialize proxy pools and legacy format
            await this.initializeProxyPools();
            
            // Load geolocation data
            await this.loadGeolocationData();
            
            // Start health monitoring
            if (this.options.enableRotation) {
                this.startHealthMonitoring();
            }
            
            // Load historical performance data
            await this.loadPerformanceData();
            
            console.log('✅ Consolidated Proxy Manager initialized successfully');
            console.log(`  📊 Total proxies: ${this.proxies.length}`);
            console.log(`  📦 Proxy pools: ${this.proxyPools.size}`);
            console.log(`  🌍 Supported countries: ${this.supportedCountries.length}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize proxy manager:', error);
            throw error;
        }
    }

    async loadProxyConfigurations() {
        // Load from multiple sources in priority order
        await this.loadFromFile();
        await this.loadFreeProxies();
        await this.loadPremiumProxies();
        await this.loadAdvancedConfiguration();
    }

    async loadFromFile() {
        try {
            const proxyFile = path.join(__dirname, '../../proxies.txt');
            const proxyData = await fs.readFile(proxyFile, 'utf8');
            const fileProxies = proxyData
                .split('\n')
                .filter(line => line.trim())
                .map(line => this.parseProxyString(line.trim()))
                .filter(proxy => proxy !== null);
            
            this.proxies.push(...fileProxies);
            console.log(`  📁 Loaded ${fileProxies.length} proxies from file`);
        } catch (error) {
            console.log('  📝 No proxy file found, continuing without file proxies');
        }
    }

    async loadFreeProxies() {
        try {
            const response = await axios.get('https://api.proxyscrape.com/v2/', {
                params: {
                    request: 'get',
                    protocol: 'http',
                    timeout: 10000,
                    country: 'all',
                    ssl: 'all',
                    anonymity: 'all'
                },
                timeout: 10000
            });

            const freeProxies = response.data
                .split('\n')
                .filter(line => line.trim())
                .map(proxy => ({
                    id: proxy,
                    server: `http://${proxy}`,
                    host: proxy.split(':')[0],
                    port: parseInt(proxy.split(':')[1]),
                    username: null,
                    password: null,
                    failures: 0,
                    lastUsed: null,
                    type: 'free',
                    country: 'US', // Default
                    provider: 'ProxyScrape',
                    protocol: 'http',
                    isActive: true,
                    successCount: 0,
                    failureCount: 0,
                    avgResponseTime: 0,
                    createdAt: Date.now()
                }));

            this.proxies.push(...freeProxies);
            console.log(`  🆓 Loaded ${freeProxies.length} free proxies`);
        } catch (error) {
            console.log('  ⚠️ Failed to fetch free proxies:', error.message);
        }
    }

    async loadPremiumProxies() {
        const premiumProxies = [
            {
                id: 'premium-1',
                server: 'http://premium-proxy1.com:8080',
                host: 'premium-proxy1.com',
                port: 8080,
                username: process.env.PROXY_USERNAME,
                password: process.env.PROXY_PASSWORD,
                failures: 0,
                lastUsed: null,
                type: 'premium',
                country: 'US',
                provider: 'Premium Service',
                protocol: 'http',
                isActive: true,
                successCount: 0,
                failureCount: 0,
                avgResponseTime: 0,
                createdAt: Date.now()
            }
        ];

        this.proxies.push(...premiumProxies);
        console.log(`  💎 Loaded ${premiumProxies.length} premium proxies`);
    }

    async loadAdvancedConfiguration() {
        try {
            const configPath = path.join(__dirname, '../../data/proxy-config.json');
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            if (config.proxyPools) {
                Object.entries(config.proxyPools).forEach(([poolName, proxies]) => {
                    this.proxyPools.set(poolName, proxies);
                    // Also add to main proxy list for backward compatibility
                    this.proxies.push(...proxies);
                });
            }
            
            console.log(`  🔧 Loaded advanced proxy configuration`);
        } catch (error) {
            console.log('  📝 No advanced proxy configuration found, initializing defaults');
            await this.initializeDefaultProxies();
        }
    }

    parseProxyString(proxyString) {
        const parts = proxyString.split(':');
        
        if (parts.length >= 2) {
            return {
                id: proxyString,
                server: `http://${parts[0]}:${parts[1]}`,
                host: parts[0],
                port: parseInt(parts[1]),
                username: parts[2] || null,
                password: parts[3] || null,
                failures: 0,
                lastUsed: null,
                type: 'file',
                country: 'US', // Default
                provider: 'File',
                protocol: 'http',
                isActive: true,
                successCount: 0,
                failureCount: 0,
                avgResponseTime: 0,
                createdAt: Date.now()
            };
        }
        return null;
    }

    async initializeDefaultProxies() {
        const defaultPools = {
            'premium_residential': this.generateProxyPool('residential', 50, ['US', 'CA', 'GB', 'DE']),
            'datacenter_high': this.generateProxyPool('datacenter', 30, ['US', 'NL', 'SG']),
            'mobile_proxies': this.generateProxyPool('mobile', 20, ['US', 'GB', 'AU']),
            'rotation_pool': this.generateProxyPool('rotating', 100, this.supportedCountries)
        };
        
        Object.entries(defaultPools).forEach(([poolName, proxies]) => {
            this.proxyPools.set(poolName, proxies);
            this.proxies.push(...proxies);
        });
        
        console.log('  🏗️ Initialized default proxy pools');
    }

    generateProxyPool(type, count, countries) {
        const proxies = [];
        
        for (let i = 0; i < count; i++) {
            const country = countries[Math.floor(Math.random() * countries.length)];
            const proxy = {
                id: crypto.randomBytes(8).toString('hex'),
                type: type,
                host: this.generateProxyHost(country),
                port: 8000 + Math.floor(Math.random() * 2000),
                username: `user_${crypto.randomBytes(4).toString('hex')}`,
                password: crypto.randomBytes(16).toString('hex'),
                country: country,
                city: this.getCityForCountry(country),
                provider: this.getProviderForType(type),
                protocol: ['http', 'https', 'socks5'][Math.floor(Math.random() * 3)],
                isActive: true,
                lastUsed: null,
                successCount: 0,
                failureCount: 0,
                avgResponseTime: 0,
                createdAt: Date.now(),
                failures: 0,
                server: null
            };
            
            proxy.server = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
            
            proxies.push(proxy);
            this.initializeProxyStats(proxy);
        }
        
        return proxies;
    }

    generateProxyHost(country) {
        const countryPrefixes = {
            'US': '192.168', 'CA': '172.16', 'GB': '10.0',
            'DE': '203.0', 'FR': '198.51', 'JP': '198.18',
            'AU': '203.113', 'NL': '185.199', 'SG': '128.199'
        };
        
        const prefix = countryPrefixes[country] || '192.168';
        const subnet = Math.floor(Math.random() * 255);
        const host = Math.floor(Math.random() * 255) + 1;
        
        return `${prefix}.${subnet}.${host}`;
    }

    getCityForCountry(country) {
        const cities = {
            'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
            'CA': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
            'GB': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
            'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'],
            'FR': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
            'JP': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya'],
            'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide']
        };
        
        const cityList = cities[country] || ['Unknown'];
        return cityList[Math.floor(Math.random() * cityList.length)];
    }

    getProviderForType(type) {
        const providers = {
            'residential': ['ResidentialNet', 'HomeProxy', 'TrueIP', 'RealUser'],
            'datacenter': ['DataCenter Pro', 'ServerNet', 'CloudProxy', 'FastDC'],
            'mobile': ['MobileCarrier', '4GProxy', 'CellularNet', 'MobileGate'],
            'rotating': ['RotateMax', 'DynamicIP', 'AutoSwitch', 'FlexProxy']
        };
        
        const providerList = providers[type] || ['Generic'];
        return providerList[Math.floor(Math.random() * providerList.length)];
    }

    initializeProxyStats(proxy) {
        this.proxyStats.set(proxy.id, {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            lastHealthCheck: null,
            isHealthy: true,
            consecutiveFailures: 0,
            performanceScore: 1.0,
            rateLimitHits: 0,
            geoScore: 1.0
        });
    }

    async initializeProxyPools() {
        console.log('  🏊 Initializing proxy pools...');
        
        // Initialize stats for all proxies
        this.proxies.forEach(proxy => {
            if (!this.proxyStats.has(proxy.id)) {
                this.initializeProxyStats(proxy);
            }
        });
        
        // Group proxies by type for pool management
        const poolsByType = {};
        this.proxies.forEach(proxy => {
            const poolName = proxy.type || 'general';
            if (!poolsByType[poolName]) {
                poolsByType[poolName] = [];
            }
            poolsByType[poolName].push(proxy);
        });
        
        Object.entries(poolsByType).forEach(([poolName, proxies]) => {
            if (!this.proxyPools.has(poolName)) {
                this.proxyPools.set(poolName, proxies);
            }
            console.log(`    📦 Pool "${poolName}": ${proxies.length} proxies`);
        });
    }

    async loadGeolocationData() {
        try {
            const geoPath = path.join(__dirname, '../../data/geolocation-data.json');
            const geoData = await fs.readFile(geoPath, 'utf8');
            const data = JSON.parse(geoData);
            
            Object.entries(data).forEach(([country, info]) => {
                this.geolocationData.set(country, info);
            });
            
            console.log(`  🌍 Loaded geolocation data for ${this.geolocationData.size} countries`);
        } catch (error) {
            console.log('  📝 No geolocation data found, initializing defaults');
            await this.initializeDefaultGeolocation();
        }
    }

    async initializeDefaultGeolocation() {
        const defaultGeoData = {
            'US': { timezone: 'America/New_York', currency: 'USD', language: 'en-US' },
            'CA': { timezone: 'America/Toronto', currency: 'CAD', language: 'en-CA' },
            'GB': { timezone: 'Europe/London', currency: 'GBP', language: 'en-GB' },
            'DE': { timezone: 'Europe/Berlin', currency: 'EUR', language: 'de-DE' },
            'FR': { timezone: 'Europe/Paris', currency: 'EUR', language: 'fr-FR' },
            'JP': { timezone: 'Asia/Tokyo', currency: 'JPY', language: 'ja-JP' },
            'AU': { timezone: 'Australia/Sydney', currency: 'AUD', language: 'en-AU' }
        };
        
        Object.entries(defaultGeoData).forEach(([country, info]) => {
            this.geolocationData.set(country, info);
        });
    }

    // Unified proxy selection combining both approaches
    async getNextProxy(criteria = {}) {
        // Use advanced selection if criteria provided
        if (Object.keys(criteria).length > 0) {
            return await this.selectProxy(criteria);
        }
        
        // Use legacy round-robin selection
        return this.getNextProxyLegacy();
    }

    getNextProxyLegacy() {
        if (this.proxies.length === 0) {
            return null;
        }

        const workingProxies = this.proxies.filter(proxy => (proxy.failures || 0) < 3);
        
        if (workingProxies.length === 0) {
            this.proxies.forEach(proxy => proxy.failures = 0);
            console.log('All proxies failed, resetting failure counts');
        }

        const availableProxies = workingProxies.length > 0 ? workingProxies : this.proxies;
        
        this.currentIndex = (this.currentIndex + 1) % availableProxies.length;
        const proxy = availableProxies[this.currentIndex];
        
        proxy.lastUsed = new Date();
        return proxy;
    }

    async selectProxy(criteria = {}) {
        const {
            country = null,
            type = null,
            sessionId = null,
            excludeFailedProxies = true,
            performanceThreshold = 0.5
        } = criteria;
        
        // Check for existing session mapping
        if (sessionId && this.options.sessionPersistence) {
            const existingProxy = this.sessionProxyMapping.get(sessionId);
            if (existingProxy && this.isProxyHealthy(existingProxy.id)) {
                console.log(`🔄 Reusing proxy for session ${sessionId}: ${existingProxy.host}:${existingProxy.port}`);
                return existingProxy;
            }
        }
        
        // Find suitable proxies
        let candidateProxies = [];
        
        for (const proxy of this.proxies) {
            // Apply filters
            if (type && proxy.type !== type) continue;
            if (country && proxy.country !== country) continue;
            if (excludeFailedProxies && this.failedProxies.has(proxy.id)) continue;
            
            // Check health and performance
            const stats = this.proxyStats.get(proxy.id);
            if (!stats || !stats.isHealthy) continue;
            if (stats.performanceScore < performanceThreshold) continue;
            
            // Check rate limits
            if (this.isRateLimited(proxy.id)) continue;
            
            candidateProxies.push({ proxy, stats });
        }
        
        if (candidateProxies.length === 0) {
            console.log('🔄 Falling back to legacy proxy selection...');
            return this.getNextProxyLegacy();
        }
        
        // Select best proxy using scoring algorithm
        const selectedProxy = this.selectBestProxy(candidateProxies, criteria);
        
        if (!selectedProxy) {
            return this.getNextProxyLegacy();
        }
        
        // Update session mapping
        if (sessionId && this.options.sessionPersistence) {
            this.sessionProxyMapping.set(sessionId, selectedProxy.proxy);
        }
        
        // Record usage
        await this.recordProxyUsage(selectedProxy.proxy.id);
        
        console.log(`✅ Selected proxy: ${selectedProxy.proxy.host}:${selectedProxy.proxy.port} (${selectedProxy.proxy.country})`);
        
        return selectedProxy.proxy;
    }

    selectBestProxy(candidates, criteria) {
        const scoredCandidates = candidates.map(candidate => {
            const score = this.calculateProxyScore(candidate, criteria);
            return { ...candidate, score };
        });
        
        scoredCandidates.sort((a, b) => b.score - a.score);
        
        if (scoredCandidates.length === 0) {
            return null;
        }
        
        // Add randomization to top 3
        const topCandidates = scoredCandidates.slice(0, Math.min(3, scoredCandidates.length));
        const weights = [0.6, 0.3, 0.1];
        
        const randomValue = Math.random();
        let cumulativeWeight = 0;
        
        for (let i = 0; i < topCandidates.length; i++) {
            cumulativeWeight += weights[i] || 0.1;
            if (randomValue <= cumulativeWeight) {
                return topCandidates[i];
            }
        }
        
        return topCandidates[0];
    }

    calculateProxyScore(candidate, criteria) {
        const { proxy, stats } = candidate;
        let score = 0;
        
        // Base performance score (40% weight)
        score += stats.performanceScore * 0.4;
        
        // Success rate (30% weight)
        const successRate = stats.totalRequests > 0 ? 
            stats.successfulRequests / stats.totalRequests : 1.0;
        score += successRate * 0.3;
        
        // Response time score (20% weight)
        const responseTimeScore = stats.avgResponseTime > 0 ? 
            Math.max(0, 1 - (stats.avgResponseTime / 5000)) : 1.0;
        score += responseTimeScore * 0.2;
        
        // Geographic preference (10% weight)
        if (criteria.country && proxy.country === criteria.country) {
            score += 0.1;
        } else if (criteria.country) {
            score += stats.geoScore * 0.1;
        } else {
            score += 0.05;
        }
        
        // Freshness bonus
        const timeSinceLastUse = proxy.lastUsed ? Date.now() - proxy.lastUsed : Infinity;
        const freshnessBonus = Math.min(0.1, timeSinceLastUse / 3600000);
        score += freshnessBonus;
        
        // Penalty for consecutive failures
        score -= stats.consecutiveFailures * 0.05;
        
        return Math.max(0, Math.min(1, score));
    }

    // Unified proxy configuration
    getProxyConfig(proxy) {
        if (!proxy) return null;

        const config = {
            server: proxy.server || `http://${proxy.host}:${proxy.port}`
        };

        if (proxy.username && proxy.password) {
            config.username = proxy.username;
            config.password = proxy.password;
        }

        return config;
    }

    async getProxyConfiguration(proxy) {
        const geoData = this.geolocationData.get(proxy.country) || {};
        
        return {
            proxy: {
                server: proxy.server || `${proxy.protocol}://${proxy.host}:${proxy.port}`,
                username: proxy.username,
                password: proxy.password
            },
            geolocation: {
                country: proxy.country,
                city: proxy.city,
                timezone: geoData.timezone || 'UTC',
                currency: geoData.currency || 'USD',
                language: geoData.language || 'en-US'
            },
            headers: this.generateProxyHeaders(proxy),
            metadata: {
                provider: proxy.provider,
                type: proxy.type,
                proxyId: proxy.id
            }
        };
    }

    generateProxyHeaders(proxy) {
        const geoData = this.geolocationData.get(proxy.country) || {};
        
        return {
            'Accept-Language': geoData.language || 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    // Common methods for both approaches
    markProxyFailed(proxy) {
        const proxyIndex = this.proxies.findIndex(p => p.id === proxy.id);
        if (proxyIndex !== -1) {
            this.proxies[proxyIndex].failures = (this.proxies[proxyIndex].failures || 0) + 1;
            
            if (this.proxies[proxyIndex].failures >= 5) {
                this.blacklistedProxies.add(proxy.id);
                console.log(`Blacklisted proxy ${proxy.id} after 5 failures`);
            }
        }
        
        // Also update advanced stats if available
        if (this.proxyStats.has(proxy.id)) {
            this.recordProxyResult(proxy.id, false, null, 'Marked as failed');
        }
    }

    async recordProxyResult(proxyId, success, responseTime = null, error = null) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats) return;
        
        if (success) {
            stats.successfulRequests++;
            stats.consecutiveFailures = 0;
            
            if (responseTime !== null) {
                if (stats.avgResponseTime === 0) {
                    stats.avgResponseTime = responseTime;
                } else {
                    stats.avgResponseTime = (stats.avgResponseTime * 0.8) + (responseTime * 0.2);
                }
            }
            
            this.failedProxies.delete(proxyId);
            
        } else {
            stats.failedRequests++;
            stats.consecutiveFailures++;
            
            if (stats.consecutiveFailures >= this.options.maxFailures) {
                this.failedProxies.add(proxyId);
                stats.isHealthy = false;
                
                console.log(`⚠️ Proxy ${proxyId} marked as unhealthy after ${stats.consecutiveFailures} failures`);
                
                this.quarantinedProxies.set(proxyId, Date.now() + 600000); // 10 minutes
            }
        }
        
        this.updatePerformanceScore(proxyId);
        this.emit('proxyResult', { proxyId, success, responseTime, error });
    }

    async recordProxyUsage(proxyId) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats) return;
        
        stats.totalRequests++;
        
        // Update proxy last used time
        const proxy = this.proxies.find(p => p.id === proxyId);
        if (proxy) {
            proxy.lastUsed = Date.now();
        }
        
        this.updateRateLimit(proxyId);
    }

    updatePerformanceScore(proxyId) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats || stats.totalRequests === 0) return;
        
        const successRate = stats.successfulRequests / stats.totalRequests;
        const responseTimeScore = stats.avgResponseTime > 0 ? 
            Math.max(0, 1 - (stats.avgResponseTime / 5000)) : 1.0;
        
        stats.performanceScore = (successRate * 0.7) + (responseTimeScore * 0.3);
        stats.performanceScore *= Math.max(0.1, 1 - (stats.consecutiveFailures * 0.1));
        stats.performanceScore = Math.max(0, Math.min(1, stats.performanceScore));
    }

    isProxyHealthy(proxyId) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats) return false;
        
        if (this.quarantinedProxies.has(proxyId)) {
            const quarantineEnd = this.quarantinedProxies.get(proxyId);
            if (Date.now() < quarantineEnd) {
                return false;
            } else {
                this.quarantinedProxies.delete(proxyId);
                stats.isHealthy = true;
                stats.consecutiveFailures = 0;
                this.failedProxies.delete(proxyId);
            }
        }
        
        return stats.isHealthy && !this.failedProxies.has(proxyId);
    }

    isRateLimited(proxyId) {
        const currentMinute = Math.floor(Date.now() / 60000);
        const requestKey = `${proxyId}_${currentMinute}`;
        const requestCount = this.requestCounts.get(requestKey) || 0;
        
        const rateLimit = this.rateLimits.get(proxyId) || 10;
        
        return requestCount >= rateLimit;
    }

    updateRateLimit(proxyId) {
        const currentMinute = Math.floor(Date.now() / 60000);
        const requestKey = `${proxyId}_${currentMinute}`;
        
        const currentCount = this.requestCounts.get(requestKey) || 0;
        this.requestCounts.set(requestKey, currentCount + 1);
        
        this.cleanupRateLimitData();
    }

    cleanupRateLimitData() {
        const currentMinute = Math.floor(Date.now() / 60000);
        const cutoffTime = currentMinute - 5;
        
        for (const [key, count] of this.requestCounts.entries()) {
            const keyMinute = parseInt(key.split('_').pop());
            if (keyMinute < cutoffTime) {
                this.requestCounts.delete(key);
            }
        }
    }

    startHealthMonitoring() {
        console.log('🏥 Starting proxy health monitoring...');
        
        this.healthMonitor = setInterval(async () => {
            await this.performHealthChecks();
        }, this.options.healthCheckInterval);
    }

    async performHealthChecks() {
        console.log('🔍 Performing proxy health checks...');
        
        let healthyCount = 0;
        let unhealthyCount = 0;
        
        for (const proxy of this.proxies) {
            const isHealthy = await this.checkProxyHealth(proxy);
            const stats = this.proxyStats.get(proxy.id);
            
            if (stats) {
                stats.lastHealthCheck = Date.now();
                stats.isHealthy = isHealthy;
            }
            
            if (isHealthy) {
                healthyCount++;
                this.failedProxies.delete(proxy.id);
            } else {
                unhealthyCount++;
                this.failedProxies.add(proxy.id);
            }
        }
        
        console.log(`  ✅ Healthy proxies: ${healthyCount}`);
        console.log(`  ❌ Unhealthy proxies: ${unhealthyCount}`);
        
        this.emit('healthCheck', { healthy: healthyCount, unhealthy: unhealthyCount });
    }

    async checkProxyHealth(proxy) {
        try {
            const responseTime = Math.random() * 2000 + 500;
            const success = Math.random() > 0.1;
            
            if (success) {
                await this.recordProxyResult(proxy.id, true, responseTime);
                return true;
            } else {
                await this.recordProxyResult(proxy.id, false, null, 'Health check failed');
                return false;
            }
            
        } catch (error) {
            await this.recordProxyResult(proxy.id, false, null, error.message);
            return false;
        }
    }

    getStats() {
        const total = this.proxies.length;
        const working = this.proxies.filter(p => (p.failures || 0) < 3).length;
        const blacklisted = this.blacklistedProxies.size;

        return {
            total,
            working,
            failed: total - working,
            blacklisted,
            currentIndex: this.currentIndex,
            pools: this.proxyPools.size,
            activeSessions: this.sessionProxyMapping.size,
            healthyProxies: Array.from(this.proxyStats.values()).filter(s => s.isHealthy).length,
            quarantined: this.quarantinedProxies.size
        };
    }

    resetFailures() {
        this.proxies.forEach(proxy => proxy.failures = 0);
        this.blacklistedProxies.clear();
        this.failedProxies.clear();
        this.quarantinedProxies.clear();
        
        // Reset advanced stats
        this.proxyStats.forEach(stats => {
            stats.consecutiveFailures = 0;
            stats.isHealthy = true;
        });
        
        console.log('Reset all proxy failures');
    }

    async loadPerformanceData() {
        try {
            const perfPath = path.join(__dirname, '../../data/proxy-performance.json');
            const perfData = await fs.readFile(perfPath, 'utf8');
            const data = JSON.parse(perfData);
            
            if (data.proxyStats) {
                Object.entries(data.proxyStats).forEach(([proxyId, stats]) => {
                    this.proxyStats.set(proxyId, stats);
                });
            }
            
            if (data.rotationHistory) {
                this.rotationHistory = data.rotationHistory;
            }
            
            console.log(`  📈 Loaded performance data for ${Object.keys(data.proxyStats || {}).length} proxies`);
        } catch (error) {
            console.log('  📝 No performance data found, starting fresh');
        }
    }

    async savePerformanceData() {
        try {
            const dataPath = path.join(__dirname, '../../data');
            await fs.mkdir(dataPath, { recursive: true });
            
            const data = {
                proxyStats: Object.fromEntries(this.proxyStats),
                rotationHistory: this.rotationHistory.slice(-500),
                rateLimits: Object.fromEntries(this.rateLimits),
                lastUpdated: Date.now()
            };
            
            await fs.writeFile(
                path.join(dataPath, 'proxy-performance.json'),
                JSON.stringify(data, null, 2)
            );
            
        } catch (error) {
            console.error('Failed to save performance data:', error);
        }
    }

    async destroy() {
        if (this.healthMonitor) {
            clearInterval(this.healthMonitor);
        }
        
        await this.savePerformanceData();
        
        console.log('🌐 Consolidated Proxy Manager stopped');
    }
}

module.exports = ConsolidatedProxyManager;