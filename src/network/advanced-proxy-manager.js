/**
 * Advanced Proxy Management and IP Rotation System
 * Provides intelligent proxy selection, rotation, health monitoring, and geolocation spoofing
 * 
 * Features:
 * - Multi-provider proxy pool management
 * - Intelligent proxy selection based on performance
 * - Automatic IP rotation with session persistence
 * - Geolocation-aware proxy assignment
 * - Health monitoring and failover
 * - Rate limiting and abuse prevention
 * - Proxy performance analytics
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class AdvancedProxyManager extends EventEmitter {
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
            ...options
        };
        
        // Proxy pool management
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
        console.log('🌐 Initializing Advanced Proxy Manager...');
        
        try {
            // Load proxy configurations
            await this.loadProxyConfigurations();
            
            // Initialize proxy pools
            await this.initializeProxyPools();
            
            // Load geolocation data
            await this.loadGeolocationData();
            
            // Start health monitoring
            if (this.options.enableRotation) {
                this.startHealthMonitoring();
            }
            
            // Load historical performance data
            await this.loadPerformanceData();
            
            console.log('✅ Advanced Proxy Manager initialized successfully');
            console.log(`  📊 Proxy pools: ${this.proxyPools.size}`);
            console.log(`  🌍 Supported countries: ${this.supportedCountries.length}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize proxy manager:', error);
            throw error;
        }
    }

    async loadProxyConfigurations() {
        try {
            const configPath = path.join(__dirname, '../../data/proxy-config.json');
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            // Load from configuration
            if (config.proxyPools) {
                Object.entries(config.proxyPools).forEach(([poolName, proxies]) => {
                    this.proxyPools.set(poolName, proxies);
                });
            }
            
            console.log(`  📁 Loaded proxy configuration from ${configPath}`);
            
        } catch (error) {
            console.log('  📝 No proxy configuration found, initializing with defaults');
            await this.initializeDefaultProxies();
        }
    }

    async initializeDefaultProxies() {
        // Initialize with simulated proxy pools for testing
        const defaultPools = {
            'premium_residential': this.generateProxyPool('residential', 50, ['US', 'CA', 'GB', 'DE']),
            'datacenter_high': this.generateProxyPool('datacenter', 30, ['US', 'NL', 'SG']),
            'mobile_proxies': this.generateProxyPool('mobile', 20, ['US', 'GB', 'AU']),
            'rotation_pool': this.generateProxyPool('rotating', 100, this.supportedCountries)
        };
        
        Object.entries(defaultPools).forEach(([poolName, proxies]) => {
            this.proxyPools.set(poolName, proxies);
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
                createdAt: Date.now()
            };
            
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
        
        for (const [poolName, proxies] of this.proxyPools.entries()) {
            // Initialize stats for all proxies
            proxies.forEach(proxy => {
                if (!this.proxyStats.has(proxy.id)) {
                    this.initializeProxyStats(proxy);
                }
            });
            
            console.log(`    📦 Pool "${poolName}": ${proxies.length} proxies`);
        }
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
        
        for (const [poolName, proxies] of this.proxyPools.entries()) {
            for (const proxy of proxies) {
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
                
                candidateProxies.push({ proxy, stats, poolName });
            }
        }
        
        if (candidateProxies.length === 0) {
            throw new Error('No suitable proxies available');
        }
        
        // Select best proxy using scoring algorithm
        const selectedProxy = this.selectBestProxy(candidateProxies, criteria);
        
        if (!selectedProxy) {
            // If strict selection fails, try relaxed criteria
            console.log('🔄 Trying relaxed proxy selection...');
            const relaxedCandidates = [];
            
            for (const [poolName, proxies] of this.proxyPools.entries()) {
                for (const proxy of proxies) {
                    if (proxy.isActive) {
                        relaxedCandidates.push({ proxy, stats: this.proxyStats.get(proxy.id), poolName });
                    }
                }
            }
            
            if (relaxedCandidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * relaxedCandidates.length);
                const fallbackProxy = relaxedCandidates[randomIndex];
                
                console.log(`⚠️ Using fallback proxy: ${fallbackProxy.proxy.host}:${fallbackProxy.proxy.port}`);
                return fallbackProxy.proxy;
            }
            
            throw new Error('No proxies available at all');
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
        // Score each candidate proxy
        const scoredCandidates = candidates.map(candidate => {
            const score = this.calculateProxyScore(candidate, criteria);
            return { ...candidate, score };
        });
        
        // Sort by score (highest first)
        scoredCandidates.sort((a, b) => b.score - a.score);
        
        // If no high-scoring candidates, relax criteria and take best available
        if (scoredCandidates.length === 0) {
            console.log('⚠️ No candidates found, relaxing criteria...');
            return null;
        }
        
        // Add some randomization to top 3 to avoid always using the same proxy
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
            Math.max(0, 1 - (stats.avgResponseTime / 5000)) : 1.0; // Normalize to 5s max
        score += responseTimeScore * 0.2;
        
        // Geographic preference (10% weight)
        if (criteria.country && proxy.country === criteria.country) {
            score += 0.1;
        } else if (criteria.country) {
            score += stats.geoScore * 0.1;
        } else {
            score += 0.05; // Small bonus for any geo
        }
        
        // Freshness bonus - prefer less recently used proxies
        const timeSinceLastUse = proxy.lastUsed ? Date.now() - proxy.lastUsed : Infinity;
        const freshnessBonus = Math.min(0.1, timeSinceLastUse / 3600000); // Max bonus after 1 hour
        score += freshnessBonus;
        
        // Penalty for consecutive failures
        score -= stats.consecutiveFailures * 0.05;
        
        // Type preference bonus
        if (criteria.type === 'residential' && proxy.type === 'residential') {
            score += 0.05;
        }
        
        return Math.max(0, Math.min(1, score));
    }

    async recordProxyUsage(proxyId) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats) return;
        
        stats.totalRequests++;
        
        // Update proxy last used time
        for (const [poolName, proxies] of this.proxyPools.entries()) {
            const proxy = proxies.find(p => p.id === proxyId);
            if (proxy) {
                proxy.lastUsed = Date.now();
                break;
            }
        }
        
        // Record rate limiting
        this.updateRateLimit(proxyId);
    }

    async recordProxyResult(proxyId, success, responseTime = null, error = null) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats) return;
        
        if (success) {
            stats.successfulRequests++;
            stats.consecutiveFailures = 0;
            
            // Update response time
            if (responseTime !== null) {
                if (stats.avgResponseTime === 0) {
                    stats.avgResponseTime = responseTime;
                } else {
                    stats.avgResponseTime = (stats.avgResponseTime * 0.8) + (responseTime * 0.2);
                }
            }
            
            // Remove from failed proxies if it was there
            this.failedProxies.delete(proxyId);
            
        } else {
            stats.failedRequests++;
            stats.consecutiveFailures++;
            
            // Add to failed proxies if too many consecutive failures
            if (stats.consecutiveFailures >= this.options.maxFailures) {
                this.failedProxies.add(proxyId);
                stats.isHealthy = false;
                
                console.log(`⚠️ Proxy ${proxyId} marked as unhealthy after ${stats.consecutiveFailures} failures`);
                
                // Quarantine for a period
                this.quarantinedProxies.set(proxyId, Date.now() + 600000); // 10 minutes
            }
        }
        
        // Update performance score
        this.updatePerformanceScore(proxyId);
        
        // Emit events for monitoring
        this.emit('proxyResult', { proxyId, success, responseTime, error });
    }

    updatePerformanceScore(proxyId) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats || stats.totalRequests === 0) return;
        
        const successRate = stats.successfulRequests / stats.totalRequests;
        const responseTimeScore = stats.avgResponseTime > 0 ? 
            Math.max(0, 1 - (stats.avgResponseTime / 5000)) : 1.0;
        
        // Weighted performance score
        stats.performanceScore = (successRate * 0.7) + (responseTimeScore * 0.3);
        
        // Apply penalties
        stats.performanceScore *= Math.max(0.1, 1 - (stats.consecutiveFailures * 0.1));
        stats.performanceScore = Math.max(0, Math.min(1, stats.performanceScore));
    }

    isProxyHealthy(proxyId) {
        const stats = this.proxyStats.get(proxyId);
        if (!stats) return false;
        
        // Check quarantine
        if (this.quarantinedProxies.has(proxyId)) {
            const quarantineEnd = this.quarantinedProxies.get(proxyId);
            if (Date.now() < quarantineEnd) {
                return false;
            } else {
                // Release from quarantine
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
        
        // Default rate limit: 10 requests per minute
        const rateLimit = this.rateLimits.get(proxyId) || 10;
        
        return requestCount >= rateLimit;
    }

    updateRateLimit(proxyId) {
        const currentMinute = Math.floor(Date.now() / 60000);
        const requestKey = `${proxyId}_${currentMinute}`;
        
        const currentCount = this.requestCounts.get(requestKey) || 0;
        this.requestCounts.set(requestKey, currentCount + 1);
        
        // Clean up old entries
        this.cleanupRateLimitData();
    }

    cleanupRateLimitData() {
        const currentMinute = Math.floor(Date.now() / 60000);
        const cutoffTime = currentMinute - 5; // Keep 5 minutes of data
        
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
        
        for (const [poolName, proxies] of this.proxyPools.entries()) {
            for (const proxy of proxies) {
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
        }
        
        console.log(`  ✅ Healthy proxies: ${healthyCount}`);
        console.log(`  ❌ Unhealthy proxies: ${unhealthyCount}`);
        
        // Emit health status
        this.emit('healthCheck', { healthy: healthyCount, unhealthy: unhealthyCount });
    }

    async checkProxyHealth(proxy) {
        try {
            // Simulate health check (in real implementation, make actual HTTP request)
            const responseTime = Math.random() * 2000 + 500; // 500-2500ms
            const success = Math.random() > 0.1; // 90% success rate for simulation
            
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

    async rotateProxiesForSession(sessionId) {
        if (!this.options.enableRotation || !this.sessionProxyMapping.has(sessionId)) {
            return null;
        }
        
        const currentProxy = this.sessionProxyMapping.get(sessionId);
        
        // Find a new proxy with same criteria
        try {
            const newProxy = await this.selectProxy({
                country: currentProxy.country,
                type: currentProxy.type,
                sessionId: null // Force new selection
            });
            
            // Update session mapping
            this.sessionProxyMapping.set(sessionId, newProxy);
            
            // Record rotation
            this.rotationHistory.push({
                sessionId,
                oldProxy: currentProxy.id,
                newProxy: newProxy.id,
                timestamp: Date.now()
            });
            
            // Limit rotation history
            if (this.rotationHistory.length > 1000) {
                this.rotationHistory = this.rotationHistory.slice(-500);
            }
            
            console.log(`🔄 Rotated proxy for session ${sessionId}: ${currentProxy.host} → ${newProxy.host}`);
            
            return newProxy;
            
        } catch (error) {
            console.error(`❌ Failed to rotate proxy for session ${sessionId}:`, error);
            return null;
        }
    }

    async getProxyConfiguration(proxy) {
        const geoData = this.geolocationData.get(proxy.country) || {};
        
        return {
            proxy: {
                server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
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

    async loadPerformanceData() {
        try {
            const perfPath = path.join(__dirname, '../../data/proxy-performance.json');
            const perfData = await fs.readFile(perfPath, 'utf8');
            const data = JSON.parse(perfData);
            
            // Restore performance metrics
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
                rotationHistory: this.rotationHistory.slice(-500), // Keep last 500 rotations
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

    getPerformanceReport() {
        const report = {
            totalProxies: 0,
            healthyProxies: 0,
            unhealthyProxies: 0,
            poolBreakdown: {},
            countryBreakdown: {},
            typeBreakdown: {},
            performanceMetrics: {
                avgSuccessRate: 0,
                avgResponseTime: 0,
                totalRequests: 0,
                rotationCount: this.rotationHistory.length
            },
            activeSessions: this.sessionProxyMapping.size
        };
        
        let totalSuccessRate = 0;
        let totalResponseTime = 0;
        let totalRequests = 0;
        let proxyCount = 0;
        
        for (const [poolName, proxies] of this.proxyPools.entries()) {
            report.poolBreakdown[poolName] = {
                total: proxies.length,
                healthy: 0,
                unhealthy: 0
            };
            
            for (const proxy of proxies) {
                report.totalProxies++;
                proxyCount++;
                
                const isHealthy = this.isProxyHealthy(proxy.id);
                if (isHealthy) {
                    report.healthyProxies++;
                    report.poolBreakdown[poolName].healthy++;
                } else {
                    report.unhealthyProxies++;
                    report.poolBreakdown[poolName].unhealthy++;
                }
                
                // Country breakdown
                report.countryBreakdown[proxy.country] = (report.countryBreakdown[proxy.country] || 0) + 1;
                
                // Type breakdown
                report.typeBreakdown[proxy.type] = (report.typeBreakdown[proxy.type] || 0) + 1;
                
                // Performance metrics
                const stats = this.proxyStats.get(proxy.id);
                if (stats && stats.totalRequests > 0) {
                    totalSuccessRate += stats.successfulRequests / stats.totalRequests;
                    totalResponseTime += stats.avgResponseTime;
                    totalRequests += stats.totalRequests;
                }
            }
        }
        
        // Calculate averages
        if (proxyCount > 0) {
            report.performanceMetrics.avgSuccessRate = (totalSuccessRate / proxyCount * 100).toFixed(1) + '%';
            report.performanceMetrics.avgResponseTime = Math.round(totalResponseTime / proxyCount) + 'ms';
        }
        
        report.performanceMetrics.totalRequests = totalRequests;
        
        return report;
    }

    async destroy() {
        if (this.healthMonitor) {
            clearInterval(this.healthMonitor);
        }
        
        // Save performance data before shutdown
        await this.savePerformanceData();
        
        console.log('🌐 Advanced Proxy Manager stopped');
    }
}

module.exports = AdvancedProxyManager;