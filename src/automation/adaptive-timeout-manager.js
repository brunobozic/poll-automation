/**
 * Adaptive Timeout Manager
 * Implements intelligent timeout strategies based on network conditions and site performance
 */

class AdaptiveTimeoutManager {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            baseTimeout: 30000,
            minTimeout: 5000,
            maxTimeout: 120000,
            enableNetworkAdaptation: true,
            enableSiteProfile: true,
            enableProgressiveTimeout: true,
            debugMode: false,
            ...options
        };
        
        // Network condition profiles
        this.networkProfiles = {
            fast: {
                name: 'Fast Network',
                multiplier: 0.7,
                description: 'High-speed connection, reduce timeouts'
            },
            normal: {
                name: 'Normal Network',
                multiplier: 1.0,
                description: 'Standard connection speed'
            },
            slow: {
                name: 'Slow Network',
                multiplier: 1.8,
                description: 'Slow connection, increase timeouts'
            },
            mobile: {
                name: 'Mobile Network',
                multiplier: 2.2,
                description: 'Mobile connection, very conservative timeouts'
            }
        };
        
        // Site performance profiles (learned from feedback loop)
        this.siteProfiles = {
            'surveyplanet.com': {
                loadTimeMultiplier: 1.2,
                dynamicContentDelay: 3000,
                avgResponseTime: 2500,
                reliability: 0.85
            },
            'docs.google.com': {
                loadTimeMultiplier: 1.5,
                dynamicContentDelay: 5000,
                avgResponseTime: 4000,
                reliability: 0.75
            },
            'typeform.com': {
                loadTimeMultiplier: 2.0,
                dynamicContentDelay: 8000,
                avgResponseTime: 6500,
                reliability: 0.65
            }
        };
        
        // Current state
        this.currentNetworkProfile = 'normal';
        this.currentSite = null;
        this.performanceHistory = [];
        this.adaptationCount = 0;
        
        // Statistics
        this.stats = {
            totalOperations: 0,
            timeoutsOccurred: 0,
            adaptationsApplied: 0,
            avgOperationTime: 0,
            networkProfileChanges: 0
        };
    }
    
    /**
     * Initialize timeout manager for a specific site
     */
    async initialize(siteUrl) {
        try {
            this.currentSite = this.extractDomain(siteUrl);
            
            if (this.options.debugMode) {
                console.log(`🕐 Initializing adaptive timeouts for: ${this.currentSite}`);
            }
            
            // Detect network conditions
            if (this.options.enableNetworkAdaptation) {
                await this.detectNetworkConditions();
            }
            
            // Load site profile
            if (this.options.enableSiteProfile) {
                this.loadSiteProfile();
            }
            
            return this.getCurrentProfile();
        } catch (error) {
            console.warn(`⚠️ Timeout manager initialization failed: ${error.message}`);
            return this.getDefaultProfile();
        }
    }
    
    /**
     * Calculate adaptive timeout for a specific operation
     */
    calculateTimeout(operationType, attempt = 0) {
        this.stats.totalOperations++;
        
        let timeout = this.options.baseTimeout;
        
        // Apply network profile multiplier
        const networkProfile = this.networkProfiles[this.currentNetworkProfile];
        timeout *= networkProfile.multiplier;
        
        // Apply site-specific adjustments
        if (this.currentSite && this.siteProfiles[this.currentSite]) {
            const siteProfile = this.siteProfiles[this.currentSite];
            timeout *= siteProfile.loadTimeMultiplier;
            
            // Add dynamic content delay for certain operations
            if (['element_wait', 'form_analysis', 'dynamic_content'].includes(operationType)) {
                timeout += siteProfile.dynamicContentDelay;
            }
        }
        
        // Progressive timeout increases for retries
        if (this.options.enableProgressiveTimeout && attempt > 0) {
            const progressiveMultiplier = 1 + (attempt * 0.5); // 50% increase per retry
            timeout *= progressiveMultiplier;
        }
        
        // Operation-specific adjustments
        timeout = this.applyOperationSpecificTimeout(timeout, operationType);
        
        // Clamp to min/max bounds
        timeout = Math.max(this.options.minTimeout, Math.min(this.options.maxTimeout, timeout));
        
        if (this.options.debugMode) {
            console.log(`🕐 Calculated timeout for ${operationType} (attempt ${attempt + 1}): ${timeout}ms`);
            console.log(`   Network: ${networkProfile.name} (${networkProfile.multiplier}x)`);
            if (this.currentSite && this.siteProfiles[this.currentSite]) {
                console.log(`   Site: ${this.currentSite} (${this.siteProfiles[this.currentSite].loadTimeMultiplier}x)`);
            }
        }
        
        return Math.round(timeout);
    }
    
    /**
     * Apply operation-specific timeout adjustments
     */
    applyOperationSpecificTimeout(baseTimeout, operationType) {
        const operationMultipliers = {
            'navigation': 1.5,      // Page navigation takes longer
            'form_analysis': 1.3,   // Complex form analysis
            'element_wait': 1.0,    // Standard element waiting
            'click': 0.5,           // Clicking is fast
            'fill': 0.7,            // Filling forms is relatively fast
            'dynamic_content': 2.0, // Dynamic content can be very slow
            'ajax_request': 1.8,    // AJAX requests can be slow
            'cookie_banner': 0.8,   // Cookie banners appear quickly
            'captcha': 3.0,         // CAPTCHAs need extra time
            'honeypot_check': 0.3   // Honeypot checks should be fast
        };
        
        const multiplier = operationMultipliers[operationType] || 1.0;
        return baseTimeout * multiplier;
    }
    
    /**
     * Detect network conditions and adapt profile
     */
    async detectNetworkConditions() {
        try {
            const startTime = Date.now();
            
            // Perform a simple network test
            await this.page.evaluate(() => {
                return fetch('/favicon.ico', { method: 'HEAD' }).catch(() => null);
            });
            
            const networkLatency = Date.now() - startTime;
            
            // Classify network speed
            let newProfile;
            if (networkLatency < 100) {
                newProfile = 'fast';
            } else if (networkLatency < 300) {
                newProfile = 'normal';
            } else if (networkLatency < 800) {
                newProfile = 'slow';
            } else {
                newProfile = 'mobile';
            }
            
            if (newProfile !== this.currentNetworkProfile) {
                this.currentNetworkProfile = newProfile;
                this.stats.networkProfileChanges++;
                
                if (this.options.debugMode) {
                    console.log(`🌐 Network profile changed to: ${this.networkProfiles[newProfile].name} (${networkLatency}ms latency)`);
                }
            }
            
        } catch (error) {
            if (this.options.debugMode) {
                console.log(`⚠️ Network detection failed: ${error.message}`);
            }
            // Fallback to conservative profile
            this.currentNetworkProfile = 'slow';
        }
    }
    
    /**
     * Load site-specific performance profile
     */
    loadSiteProfile() {
        if (this.currentSite && this.siteProfiles[this.currentSite]) {
            const profile = this.siteProfiles[this.currentSite];
            
            if (this.options.debugMode) {
                console.log(`📊 Loaded site profile for ${this.currentSite}:`);
                console.log(`   Load time multiplier: ${profile.loadTimeMultiplier}x`);
                console.log(`   Dynamic content delay: ${profile.dynamicContentDelay}ms`);
                console.log(`   Reliability: ${(profile.reliability * 100).toFixed(1)}%`);
            }
        } else {
            if (this.options.debugMode) {
                console.log(`📊 No specific profile for ${this.currentSite}, using defaults`);
            }
        }
    }
    
    /**
     * Record operation performance for learning
     */
    recordOperationPerformance(operationType, duration, success, timeout) {
        const record = {
            timestamp: Date.now(),
            operationType,
            duration,
            success,
            timeout,
            networkProfile: this.currentNetworkProfile,
            site: this.currentSite
        };
        
        this.performanceHistory.push(record);
        
        // Keep only recent history (last 100 operations)
        if (this.performanceHistory.length > 100) {
            this.performanceHistory = this.performanceHistory.slice(-100);
        }
        
        // Update statistics
        if (!success) {
            this.stats.timeoutsOccurred++;
        }
        
        // Update average operation time
        const totalTime = this.performanceHistory.reduce((sum, r) => sum + r.duration, 0);
        this.stats.avgOperationTime = totalTime / this.performanceHistory.length;
        
        // Learn and adapt if needed
        if (this.shouldAdaptProfile()) {
            this.adaptProfileFromHistory();
        }
    }
    
    /**
     * Determine if profile adaptation is needed
     */
    shouldAdaptProfile() {
        const recentOperations = this.performanceHistory.slice(-10); // Last 10 operations
        
        if (recentOperations.length < 5) {
            return false; // Not enough data
        }
        
        const timeoutRate = recentOperations.filter(op => !op.success).length / recentOperations.length;
        const avgDuration = recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length;
        const avgTimeout = recentOperations.reduce((sum, op) => sum + op.timeout, 0) / recentOperations.length;
        
        // Adapt if timeout rate is high or operations are consistently slow
        return timeoutRate > 0.3 || avgDuration > avgTimeout * 0.8;
    }
    
    /**
     * Adapt profile based on performance history
     */
    adaptProfileFromHistory() {
        this.stats.adaptationsApplied++;
        this.adaptationCount++;
        
        const recentOperations = this.performanceHistory.slice(-10);
        const avgDuration = recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length;
        
        // If operations are consistently slow, switch to more conservative profile
        if (avgDuration > this.options.baseTimeout * 0.8) {
            if (this.currentNetworkProfile === 'fast') {
                this.currentNetworkProfile = 'normal';
            } else if (this.currentNetworkProfile === 'normal') {
                this.currentNetworkProfile = 'slow';
            } else if (this.currentNetworkProfile === 'slow') {
                this.currentNetworkProfile = 'mobile';
            }
            
            if (this.options.debugMode) {
                console.log(`⚡ Adapted to more conservative profile: ${this.networkProfiles[this.currentNetworkProfile].name}`);
            }
        }
        
        // Update site profile if we have enough data for this site
        if (this.currentSite) {
            this.updateSiteProfile(avgDuration);
        }
    }
    
    /**
     * Update site-specific profile based on observed performance
     */
    updateSiteProfile(observedAvgDuration) {
        if (!this.siteProfiles[this.currentSite]) {
            // Create new profile for this site
            this.siteProfiles[this.currentSite] = {
                loadTimeMultiplier: 1.0,
                dynamicContentDelay: 2000,
                avgResponseTime: observedAvgDuration,
                reliability: 0.8
            };
        }
        
        const profile = this.siteProfiles[this.currentSite];
        
        // Adjust multiplier based on observed performance
        const performanceRatio = observedAvgDuration / this.options.baseTimeout;
        if (performanceRatio > 1.5) {
            profile.loadTimeMultiplier = Math.min(3.0, profile.loadTimeMultiplier * 1.2);
            profile.dynamicContentDelay = Math.min(10000, profile.dynamicContentDelay * 1.3);
        } else if (performanceRatio < 0.5) {
            profile.loadTimeMultiplier = Math.max(0.5, profile.loadTimeMultiplier * 0.9);
            profile.dynamicContentDelay = Math.max(1000, profile.dynamicContentDelay * 0.8);
        }
        
        // Update average response time
        profile.avgResponseTime = (profile.avgResponseTime + observedAvgDuration) / 2;
        
        // Update reliability based on recent success rate
        const recentOperations = this.performanceHistory.slice(-10).filter(op => op.site === this.currentSite);
        if (recentOperations.length >= 3) {
            const successRate = recentOperations.filter(op => op.success).length / recentOperations.length;
            profile.reliability = (profile.reliability + successRate) / 2;
        }
        
        if (this.options.debugMode) {
            console.log(`📈 Updated site profile for ${this.currentSite}:`);
            console.log(`   Load multiplier: ${profile.loadTimeMultiplier.toFixed(2)}x`);
            console.log(`   Dynamic delay: ${profile.dynamicContentDelay}ms`);
            console.log(`   Reliability: ${(profile.reliability * 100).toFixed(1)}%`);
        }
    }
    
    /**
     * Get timeout with automatic performance recording
     */
    async executeWithTimeout(operation, operationType, attempt = 0) {
        const timeout = this.calculateTimeout(operationType, attempt);
        const startTime = Date.now();
        
        try {
            const result = await Promise.race([
                operation(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
                )
            ]);
            
            const duration = Date.now() - startTime;
            this.recordOperationPerformance(operationType, duration, true, timeout);
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            const isTimeout = error.message.includes('timed out');
            this.recordOperationPerformance(operationType, duration, !isTimeout, timeout);
            
            throw error;
        }
    }
    
    /**
     * Smart retry with progressive timeout increases
     */
    async retryWithAdaptiveTimeout(operation, operationType, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.executeWithTimeout(operation, operationType, attempt);
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries - 1) {
                    const delay = Math.min(5000, 1000 * (attempt + 1)); // Progressive delay
                    
                    if (this.options.debugMode) {
                        console.log(`🔄 Retry ${attempt + 1}/${maxRetries} for ${operationType} after ${delay}ms delay`);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return 'unknown';
        }
    }
    
    /**
     * Get current timeout profile
     */
    getCurrentProfile() {
        const networkProfile = this.networkProfiles[this.currentNetworkProfile];
        const siteProfile = this.currentSite ? this.siteProfiles[this.currentSite] : null;
        
        return {
            network: {
                profile: this.currentNetworkProfile,
                ...networkProfile
            },
            site: siteProfile ? {
                domain: this.currentSite,
                ...siteProfile
            } : null,
            baseTimeout: this.options.baseTimeout,
            adaptationCount: this.adaptationCount
        };
    }
    
    /**
     * Get default profile
     */
    getDefaultProfile() {
        return {
            network: {
                profile: 'normal',
                ...this.networkProfiles.normal
            },
            site: null,
            baseTimeout: this.options.baseTimeout,
            adaptationCount: 0
        };
    }
    
    /**
     * Get timeout manager statistics
     */
    getStats() {
        const timeoutRate = this.stats.totalOperations > 0 ? 
            (this.stats.timeoutsOccurred / this.stats.totalOperations * 100).toFixed(1) : 0;
            
        return {
            ...this.stats,
            timeoutRate: `${timeoutRate}%`,
            adaptationEffectiveness: this.adaptationCount > 0 ? 
                `${((this.stats.adaptationsApplied / this.adaptationCount) * 100).toFixed(1)}%` : '0%',
            avgOperationTime: `${Math.round(this.stats.avgOperationTime)}ms`,
            profilesLearned: Object.keys(this.siteProfiles).length
        };
    }
    
    /**
     * Reset statistics and learning data
     */
    reset() {
        this.performanceHistory = [];
        this.adaptationCount = 0;
        this.stats = {
            totalOperations: 0,
            timeoutsOccurred: 0,
            adaptationsApplied: 0,
            avgOperationTime: 0,
            networkProfileChanges: 0
        };
    }
}

module.exports = AdaptiveTimeoutManager;