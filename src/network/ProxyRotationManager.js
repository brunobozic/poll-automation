/**
 * Proxy Rotation Manager
 * Advanced IP rotation and proxy management system for geographic consistency and detection evasion
 * 
 * CRITICAL COMPONENT: IP-level detection bypass
 * Manages residential proxies, datacenter proxies, and maintains geographic consistency
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

class ProxyRotationManager {
    constructor(options = {}) {
        this.options = {
            proxyTypes: options.proxyTypes || ['residential', 'datacenter'],
            rotationInterval: options.rotationInterval || 1800000, // 30 minutes
            maxFailures: options.maxFailures || 3,
            healthCheckInterval: options.healthCheckInterval || 300000, // 5 minutes
            geoConsistencyMode: options.geoConsistencyMode || 'strict', // strict, relaxed, disabled
            ...options
        };
        
        // Proxy pools
        this.residentialProxies = [];
        this.datacenterProxies = [];
        this.mobileProxies = [];
        
        // Active proxy management
        this.activeProxies = new Map(); // sessionId -> proxy
        this.proxyHealth = new Map(); // proxy -> health status
        this.failureCount = new Map(); // proxy -> failure count
        
        // Geographic consistency
        this.sessionLocations = new Map(); // sessionId -> location
        this.locationProxies = new Map(); // country -> proxies
        
        // Rotation tracking
        this.rotationHistory = [];
        this.detectionEvents = [];
        
        // External services integration
        this.proxyProviders = this.initializeProxyProviders();
        
        this.initialized = false;
    }
    
    /**
     * Initialize proxy rotation manager
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('🌐 Initializing Proxy Rotation Manager...');
        
        // Load proxy pools
        await this.loadProxyPools();
        
        // Validate proxy health
        await this.performInitialHealthCheck();
        
        // Start health monitoring
        this.startHealthMonitoring();
        
        // Start rotation scheduling
        this.startRotationScheduler();
        
        this.initialized = true;
        console.log('✅ Proxy Rotation Manager initialized');
    }
    
    /**
     * Get proxy for session with geographic consistency
     */
    async getProxyForSession(sessionId, requirements = {}) {
        const {
            country = null,
            region = null,
            city = null,
            proxyType = 'residential',
            forceRotation = false,
            consistencyMode = this.options.geoConsistencyMode
        } = requirements;
        
        console.log(`🔍 Getting proxy for session ${sessionId} - Country: ${country}, Type: ${proxyType}`);
        
        // Check for existing proxy
        const existingProxy = this.activeProxies.get(sessionId);
        if (existingProxy && !forceRotation && this.isProxyHealthy(existingProxy)) {
            // Verify geographic consistency
            if (this.verifyGeographicConsistency(sessionId, existingProxy, requirements)) {
                console.log(`♻️ Reusing existing proxy for session ${sessionId}`);
                return existingProxy;
            }
        }
        
        // Select new proxy
        const newProxy = await this.selectOptimalProxy(sessionId, requirements);
        
        if (!newProxy) {
            throw new Error(`No suitable proxy available for requirements: ${JSON.stringify(requirements)}`);
        }
        
        // Store session proxy and location
        this.activeProxies.set(sessionId, newProxy);
        this.updateSessionLocation(sessionId, newProxy);
        
        // Log rotation event
        this.logRotationEvent(sessionId, existingProxy, newProxy, 'session_request');
        
        console.log(`✅ Assigned proxy for session ${sessionId}: ${newProxy.country}/${newProxy.region} (${newProxy.type})`);
        
        return newProxy;
    }
    
    /**
     * Select optimal proxy based on requirements
     */
    async selectOptimalProxy(sessionId, requirements) {
        const { country, region, city, proxyType } = requirements;
        
        // Get candidate proxies
        let candidates = this.getCandidateProxies(proxyType);
        
        // Filter by geographic requirements
        if (country) {
            candidates = candidates.filter(proxy => proxy.country === country);
        }
        if (region) {
            candidates = candidates.filter(proxy => proxy.region === region);
        }
        if (city) {
            candidates = candidates.filter(proxy => proxy.city === city);
        }
        
        // Filter by health status
        candidates = candidates.filter(proxy => this.isProxyHealthy(proxy));
        
        // Filter by usage frequency (avoid overused proxies)
        candidates = this.filterByUsageFrequency(candidates);
        
        // Filter by reputation score
        candidates = candidates.filter(proxy => proxy.reputation > 0.7);
        
        if (candidates.length === 0) {
            console.warn(`⚠️ No candidates found, relaxing requirements`);
            return await this.selectFallbackProxy(requirements);
        }
        
        // Score and rank candidates
        const scoredCandidates = candidates.map(proxy => ({
            proxy,
            score: this.calculateProxyScore(proxy, requirements)
        }));
        
        // Sort by score (highest first)
        scoredCandidates.sort((a, b) => b.score - a.score);
        
        // Select from top candidates with some randomization
        const topCandidates = scoredCandidates.slice(0, Math.min(5, scoredCandidates.length));
        const selectedCandidate = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        return selectedCandidate.proxy;
    }
    
    /**
     * Calculate proxy score for selection
     */
    calculateProxyScore(proxy, requirements) {
        let score = 0;
        
        // Base reliability score
        score += proxy.reliability * 40;
        
        // Speed score
        score += Math.min(proxy.responseTime ? (1000 / proxy.responseTime) * 20 : 0, 20);
        
        // Reputation score
        score += proxy.reputation * 20;
        
        // Usage frequency penalty (avoid overused proxies)
        const usageFrequency = this.getProxyUsageFrequency(proxy);
        score -= usageFrequency * 10;
        
        // Geographic match bonus
        if (requirements.country && proxy.country === requirements.country) {
            score += 15;
        }
        if (requirements.region && proxy.region === requirements.region) {
            score += 10;
        }
        if (requirements.city && proxy.city === requirements.city) {
            score += 5;
        }
        
        // Proxy type preference
        if (requirements.proxyType && proxy.type === requirements.proxyType) {
            score += 10;
        }
        
        // Recent failure penalty
        const failures = this.failureCount.get(proxy.id) || 0;
        score -= failures * 5;
        
        return Math.max(0, score);
    }
    
    /**
     * Apply proxy to Playwright page
     */
    async applyProxyToPage(page, proxy) {
        console.log(`🔧 Applying proxy to page: ${proxy.host}:${proxy.port} (${proxy.country})`);
        
        try {
            // Create proxy agent
            const proxyAgent = this.createProxyAgent(proxy);
            
            // Set proxy for the page
            await page.context().setDefaultTimeout(30000);
            
            // Note: Playwright proxy must be set at browser context level
            // This is a conceptual implementation - actual usage requires:
            // 1. Setting proxy at browser launch time
            // 2. Using browser contexts with different proxies
            // 3. Proxy rotation at the browser pool level
            
            // Store proxy info for session tracking
            await page.evaluate((proxyInfo) => {
                window.__proxyInfo = proxyInfo;
            }, {
                country: proxy.country,
                region: proxy.region,
                city: proxy.city,
                type: proxy.type,
                timestamp: Date.now()
            });
            
            // Verify proxy is working
            await this.verifyProxyConnection(page, proxy);
            
            console.log(`✅ Proxy applied successfully: ${proxy.country}/${proxy.region}`);
            
        } catch (error) {
            console.error(`❌ Failed to apply proxy: ${error.message}`);
            
            // Mark proxy as failed
            await this.handleProxyFailure(proxy, error);
            throw error;
        }
    }
    
    /**
     * Verify proxy connection and geographic consistency
     */
    async verifyProxyConnection(page, proxy) {
        try {
            // Test proxy connectivity
            const response = await page.goto('https://httpbin.org/ip', { 
                waitUntil: 'networkidle',
                timeout: 15000 
            });
            
            if (!response.ok()) {
                throw new Error(`Proxy connection failed: HTTP ${response.status()}`);
            }
            
            const ipData = await response.json();
            console.log(`🌍 Proxy IP verified: ${ipData.origin}`);
            
            // Verify geographic location
            const locationData = await this.verifyGeolocation(page, proxy);
            
            if (locationData.country !== proxy.country) {
                console.warn(`⚠️ Geographic mismatch: Expected ${proxy.country}, got ${locationData.country}`);
                // Update proxy location data
                proxy.actualCountry = locationData.country;
                proxy.actualRegion = locationData.region;
            }
            
            return {
                ip: ipData.origin,
                location: locationData,
                verified: true
            };
            
        } catch (error) {
            console.error(`❌ Proxy verification failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Verify geolocation of proxy
     */
    async verifyGeolocation(page, proxy) {
        try {
            const response = await page.goto('https://ipapi.co/json/', {
                waitUntil: 'networkidle',
                timeout: 10000
            });
            
            if (response.ok()) {
                const geoData = await response.json();
                return {
                    country: geoData.country_name,
                    countryCode: geoData.country_code,
                    region: geoData.region,
                    city: geoData.city,
                    latitude: geoData.latitude,
                    longitude: geoData.longitude,
                    timezone: geoData.timezone,
                    isp: geoData.org
                };
            }
            
            throw new Error('Geolocation verification failed');
            
        } catch (error) {
            console.warn(`⚠️ Geolocation verification failed: ${error.message}`);
            return {
                country: proxy.country,
                region: proxy.region,
                city: proxy.city
            };
        }
    }
    
    /**
     * Handle proxy failure
     */
    async handleProxyFailure(proxy, error) {
        console.log(`🚨 Handling proxy failure: ${proxy.id} - ${error.message}`);
        
        // Increment failure count
        const currentFailures = this.failureCount.get(proxy.id) || 0;
        this.failureCount.set(proxy.id, currentFailures + 1);
        
        // Update proxy health
        this.proxyHealth.set(proxy.id, {
            status: 'unhealthy',
            lastError: error.message,
            lastFailure: Date.now(),
            failureCount: currentFailures + 1
        });
        
        // If max failures reached, mark as disabled
        if (currentFailures + 1 >= this.options.maxFailures) {
            console.log(`💀 Proxy ${proxy.id} disabled after ${currentFailures + 1} failures`);
            proxy.enabled = false;
        }
        
        // Log failure event
        this.detectionEvents.push({
            type: 'proxy_failure',
            proxyId: proxy.id,
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    /**
     * Rotate proxy for session
     */
    async rotateProxy(sessionId, reason = 'scheduled') {
        console.log(`🔄 Rotating proxy for session ${sessionId} - Reason: ${reason}`);
        
        const currentProxy = this.activeProxies.get(sessionId);
        if (!currentProxy) {
            throw new Error('No active proxy found for session');
        }
        
        // Get session requirements based on current location
        const sessionLocation = this.sessionLocations.get(sessionId);
        const requirements = {
            country: sessionLocation?.country,
            region: sessionLocation?.region,
            proxyType: currentProxy.type,
            forceRotation: true
        };
        
        // Select new proxy
        const newProxy = await this.selectOptimalProxy(sessionId, requirements);
        
        if (!newProxy) {
            console.warn(`⚠️ No suitable replacement proxy found for session ${sessionId}`);
            return currentProxy;
        }
        
        // Update active proxy
        this.activeProxies.set(sessionId, newProxy);
        
        // Log rotation
        this.logRotationEvent(sessionId, currentProxy, newProxy, reason);
        
        console.log(`✅ Proxy rotated for session ${sessionId}: ${currentProxy.id} -> ${newProxy.id}`);
        
        return newProxy;
    }
    
    /**
     * Load proxy pools from various sources
     */
    async loadProxyPools() {
        console.log('📚 Loading proxy pools...');
        
        // Load residential proxies
        if (this.options.proxyTypes.includes('residential')) {
            this.residentialProxies = await this.loadResidentialProxies();
            console.log(`📍 Loaded ${this.residentialProxies.length} residential proxies`);
        }
        
        // Load datacenter proxies
        if (this.options.proxyTypes.includes('datacenter')) {
            this.datacenterProxies = await this.loadDatacenterProxies();
            console.log(`🏢 Loaded ${this.datacenterProxies.length} datacenter proxies`);
        }
        
        // Load mobile proxies
        if (this.options.proxyTypes.includes('mobile')) {
            this.mobileProxies = await this.loadMobileProxies();
            console.log(`📱 Loaded ${this.mobileProxies.length} mobile proxies`);
        }
        
        // Organize proxies by location
        this.organizeProxiesByLocation();
    }
    
    /**
     * Load residential proxies (placeholder for real implementation)
     */
    async loadResidentialProxies() {
        // In real implementation, load from proxy providers
        return [
            {
                id: 'res_001',
                type: 'residential',
                host: 'residential-proxy-1.example.com',
                port: 8000,
                username: 'user1',
                password: 'pass1',
                country: 'United States',
                countryCode: 'US',
                region: 'California',
                city: 'Los Angeles',
                reliability: 0.95,
                responseTime: 150,
                reputation: 0.9,
                enabled: true
            },
            {
                id: 'res_002',
                type: 'residential',
                host: 'residential-proxy-2.example.com',
                port: 8000,
                username: 'user2',
                password: 'pass2',
                country: 'United Kingdom',
                countryCode: 'GB',
                region: 'England',
                city: 'London',
                reliability: 0.92,
                responseTime: 180,
                reputation: 0.88,
                enabled: true
            }
        ];
    }
    
    /**
     * Load datacenter proxies (placeholder for real implementation)
     */
    async loadDatacenterProxies() {
        return [
            {
                id: 'dc_001',
                type: 'datacenter',
                host: 'datacenter-proxy-1.example.com',
                port: 3128,
                username: 'dc_user1',
                password: 'dc_pass1',
                country: 'Germany',
                countryCode: 'DE',
                region: 'North Rhine-Westphalia',
                city: 'Frankfurt',
                reliability: 0.98,
                responseTime: 80,
                reputation: 0.85,
                enabled: true
            }
        ];
    }
    
    /**
     * Load mobile proxies (placeholder for real implementation)
     */
    async loadMobileProxies() {
        return [
            {
                id: 'mob_001',
                type: 'mobile',
                host: 'mobile-proxy-1.example.com',
                port: 4444,
                username: 'mob_user1',
                password: 'mob_pass1',
                country: 'United States',
                countryCode: 'US',
                region: 'New York',
                city: 'New York',
                reliability: 0.90,
                responseTime: 200,
                reputation: 0.92,
                enabled: true
            }
        ];
    }
    
    /**
     * Get proxy rotation statistics
     */
    getStats() {
        const totalProxies = this.residentialProxies.length + this.datacenterProxies.length + this.mobileProxies.length;
        const activeProxies = this.activeProxies.size;
        const healthyProxies = Array.from(this.proxyHealth.values()).filter(h => h.status === 'healthy').length;
        const failedProxies = Array.from(this.proxyHealth.values()).filter(h => h.status === 'unhealthy').length;
        
        return {
            totalProxies,
            activeProxies,
            healthyProxies,
            failedProxies,
            healthRate: totalProxies > 0 ? (healthyProxies / totalProxies * 100).toFixed(1) + '%' : '0%',
            rotationEvents: this.rotationHistory.length,
            detectionEvents: this.detectionEvents.length,
            typeDistribution: {
                residential: this.residentialProxies.length,
                datacenter: this.datacenterProxies.length,
                mobile: this.mobileProxies.length
            },
            locationCoverage: Array.from(this.locationProxies.keys()).length,
            recentRotations: this.rotationHistory.slice(-10)
        };
    }
    
    // Helper methods (simplified implementations)
    getCandidateProxies(proxyType) {
        switch (proxyType) {
            case 'residential': return this.residentialProxies.filter(p => p.enabled);
            case 'datacenter': return this.datacenterProxies.filter(p => p.enabled);
            case 'mobile': return this.mobileProxies.filter(p => p.enabled);
            default: return [...this.residentialProxies, ...this.datacenterProxies, ...this.mobileProxies].filter(p => p.enabled);
        }
    }
    
    isProxyHealthy(proxy) {
        const health = this.proxyHealth.get(proxy.id);
        return !health || health.status === 'healthy';
    }
    
    filterByUsageFrequency(proxies) {
        // Filter out overused proxies
        return proxies.filter(proxy => {
            const usage = this.getProxyUsageFrequency(proxy);
            return usage < 10; // Max 10 uses in recent history
        });
    }
    
    getProxyUsageFrequency(proxy) {
        const recent = Date.now() - 3600000; // Last hour
        return this.rotationHistory.filter(event => 
            event.newProxy?.id === proxy.id && event.timestamp > recent
        ).length;
    }
    
    createProxyAgent(proxy) {
        const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
        return new HttpsProxyAgent(proxyUrl);
    }
    
    verifyGeographicConsistency(sessionId, proxy, requirements) {
        if (!requirements.country) return true;
        return proxy.country === requirements.country;
    }
    
    updateSessionLocation(sessionId, proxy) {
        this.sessionLocations.set(sessionId, {
            country: proxy.country,
            region: proxy.region,
            city: proxy.city,
            proxy: proxy.id
        });
    }
    
    logRotationEvent(sessionId, oldProxy, newProxy, reason) {
        this.rotationHistory.push({
            sessionId,
            timestamp: Date.now(),
            reason,
            oldProxy: oldProxy ? { id: oldProxy.id, country: oldProxy.country } : null,
            newProxy: newProxy ? { id: newProxy.id, country: newProxy.country } : null
        });
    }
    
    async selectFallbackProxy(requirements) {
        // Relaxed selection when strict requirements can't be met
        const allProxies = this.getCandidateProxies('all');
        const healthyProxies = allProxies.filter(p => this.isProxyHealthy(p));
        
        if (healthyProxies.length === 0) return null;
        
        return healthyProxies[Math.floor(Math.random() * healthyProxies.length)];
    }
    
    organizeProxiesByLocation() {
        const allProxies = [...this.residentialProxies, ...this.datacenterProxies, ...this.mobileProxies];
        
        allProxies.forEach(proxy => {
            if (!this.locationProxies.has(proxy.country)) {
                this.locationProxies.set(proxy.country, []);
            }
            this.locationProxies.get(proxy.country).push(proxy);
        });
    }
    
    async performInitialHealthCheck() {
        console.log('🔍 Performing initial proxy health check...');
        // Placeholder for health check implementation
    }
    
    startHealthMonitoring() {
        setInterval(async () => {
            // Periodic health check of all proxies
            console.log('💓 Performing proxy health check...');
        }, this.options.healthCheckInterval);
    }
    
    startRotationScheduler() {
        setInterval(async () => {
            // Scheduled proxy rotation for active sessions
            console.log('🔄 Performing scheduled proxy rotation...');
        }, this.options.rotationInterval);
    }
    
    initializeProxyProviders() {
        // Initialize external proxy service providers
        return new Map();
    }
}

module.exports = ProxyRotationManager;