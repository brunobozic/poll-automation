/**
 * Intelligent IP Rotation Service
 * Manages IP address rotation strategies, geolocation spoofing, and network fingerprinting
 * 
 * Features:
 * - Time-based automatic IP rotation
 * - Geographic region targeting
 * - ISP diversity management
 * - Network fingerprint consistency
 * - Suspicious pattern avoidance
 * - Session-based IP persistence
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class IPRotationService extends EventEmitter {
    constructor(proxyManager, options = {}) {
        super();
        this.proxyManager = proxyManager;
        
        this.options = {
            enableAutoRotation: options.enableAutoRotation !== false,
            rotationInterval: options.rotationInterval || 1800000, // 30 minutes
            maxSessionsPerIP: options.maxSessionsPerIP || 5,
            geoConsistencyLevel: options.geoConsistencyLevel || 'medium', // low, medium, high
            suspiciousPatternDetection: options.suspiciousPatternDetection !== false,
            networkFingerprintConsistency: options.networkFingerprintConsistency !== false,
            ...options
        };
        
        // IP rotation tracking
        this.ipUsageHistory = new Map();
        this.sessionIPMapping = new Map();
        this.ipRotationSchedule = new Map();
        this.ipReputation = new Map();
        
        // Geographic clustering
        this.geoRegions = new Map();
        this.ispDistribution = new Map();
        
        // Network fingerprinting
        this.networkFingerprints = new Map();
        this.suspiciousPatterns = new Set();
        
        // Rotation strategies
        this.rotationStrategies = {
            'conservative': {
                minInterval: 3600000, // 1 hour
                maxSessionsPerIP: 3,
                geoJumpProbability: 0.1,
                ispChangeProbability: 0.2
            },
            'moderate': {
                minInterval: 1800000, // 30 minutes
                maxSessionsPerIP: 5,
                geoJumpProbability: 0.2,
                ispChangeProbability: 0.3
            },
            'aggressive': {
                minInterval: 600000, // 10 minutes
                maxSessionsPerIP: 2,
                geoJumpProbability: 0.4,
                ispChangeProbability: 0.5
            }
        };
        
        this.currentStrategy = this.rotationStrategies[this.options.strategy || 'moderate'];
    }

    async initialize() {
        console.log('🔄 Initializing IP Rotation Service...');
        
        try {
            // Initialize geographic regions
            await this.initializeGeoRegions();
            
            // Load historical IP usage data
            await this.loadIPUsageHistory();
            
            // Initialize ISP distribution tracking
            await this.initializeISPTracking();
            
            // Start automatic rotation if enabled
            if (this.options.enableAutoRotation) {
                this.startAutoRotation();
            }
            
            // Initialize suspicious pattern detection
            if (this.options.suspiciousPatternDetection) {
                this.initializeSuspiciousPatternDetection();
            }
            
            console.log('✅ IP Rotation Service initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize IP rotation service:', error);
            throw error;
        }
    }

    async initializeGeoRegions() {
        // Define geographic regions for intelligent rotation
        const regions = {
            'north_america': {
                countries: ['US', 'CA'],
                timezones: ['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Toronto'],
                weight: 0.4
            },
            'europe': {
                countries: ['GB', 'DE', 'FR', 'NL', 'SE', 'CH', 'IT', 'ES'],
                timezones: ['Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Stockholm'],
                weight: 0.3
            },
            'asia_pacific': {
                countries: ['JP', 'AU', 'SG', 'HK', 'KR'],
                timezones: ['Asia/Tokyo', 'Australia/Sydney', 'Asia/Singapore', 'Asia/Hong_Kong'],
                weight: 0.2
            },
            'other': {
                countries: ['BR', 'IN', 'MX', 'NO', 'DK'],
                timezones: ['America/Sao_Paulo', 'Asia/Kolkata', 'America/Mexico_City', 'Europe/Oslo'],
                weight: 0.1
            }
        };
        
        Object.entries(regions).forEach(([regionName, regionData]) => {
            this.geoRegions.set(regionName, regionData);
        });
        
        console.log(`  🌍 Initialized ${this.geoRegions.size} geographic regions`);
    }

    async loadIPUsageHistory() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const historyPath = path.join(__dirname, '../../data/ip-usage-history.json');
            
            const historyData = await fs.readFile(historyPath, 'utf8');
            const data = JSON.parse(historyData);
            
            if (data.ipUsageHistory) {
                this.ipUsageHistory = new Map(Object.entries(data.ipUsageHistory));
            }
            
            if (data.ipReputation) {
                this.ipReputation = new Map(Object.entries(data.ipReputation));
            }
            
            console.log(`  📊 Loaded usage history for ${this.ipUsageHistory.size} IPs`);
            
        } catch (error) {
            console.log('  📝 No IP usage history found, starting fresh');
        }
    }

    async initializeISPTracking() {
        // Track ISP distribution to avoid concentration
        const ispData = {
            'residential': ['Comcast', 'Verizon', 'AT&T', 'Charter', 'Cox'],
            'datacenter': ['Amazon AWS', 'Google Cloud', 'Microsoft Azure', 'DigitalOcean'],
            'mobile': ['Verizon Wireless', 'AT&T Mobile', 'T-Mobile', 'Sprint'],
            'business': ['Level3', 'Cogent', 'Hurricane Electric', 'GTT']
        };
        
        Object.entries(ispData).forEach(([type, isps]) => {
            isps.forEach(isp => {
                this.ispDistribution.set(isp, {
                    type: type,
                    usageCount: 0,
                    lastUsed: null,
                    reputation: 1.0
                });
            });
        });
        
        console.log(`  📡 Initialized tracking for ${this.ispDistribution.size} ISPs`);
    }

    async getOptimalIP(criteria = {}) {
        const {
            sessionId = null,
            targetCountry = null,
            avoidRecentIPs = true,
            maintainGeoConsistency = true,
            preferredISPType = null
        } = criteria;
        
        // Check for existing session IP
        if (sessionId && this.sessionIPMapping.has(sessionId)) {
            const existingIP = this.sessionIPMapping.get(sessionId);
            if (this.isIPStillViable(existingIP)) {
                console.log(`🔄 Reusing IP for session ${sessionId}: ${existingIP}`);
                return existingIP;
            }
        }
        
        // Get available proxies from proxy manager
        const availableProxies = await this.getAvailableProxies();
        
        // Apply filtering and scoring
        const candidates = await this.filterAndScoreProxies(availableProxies, criteria);
        
        if (candidates.length === 0) {
            throw new Error('No suitable IPs available for rotation');
        }
        
        // Select optimal IP
        const selectedProxy = this.selectOptimalProxy(candidates);
        const selectedIP = selectedProxy.host;
        
        // Record usage
        await this.recordIPUsage(selectedIP, sessionId);
        
        // Update session mapping
        if (sessionId) {
            this.sessionIPMapping.set(sessionId, selectedIP);
        }
        
        console.log(`✅ Selected optimal IP: ${selectedIP} (${selectedProxy.country}, ${selectedProxy.provider})`);
        
        return selectedProxy;
    }

    async getAvailableProxies() {
        const allProxies = [];
        
        // Get proxies from all pools
        for (const [poolName, proxies] of this.proxyManager.proxyPools.entries()) {
            for (const proxy of proxies) {
                if (proxy.isActive && this.proxyManager.isProxyHealthy(proxy.id)) {
                    allProxies.push(proxy);
                }
            }
        }
        
        return allProxies;
    }

    async filterAndScoreProxies(proxies, criteria) {
        const candidates = [];
        
        for (const proxy of proxies) {
            // Apply filters
            if (!this.passesBasicFilters(proxy, criteria)) continue;
            
            // Calculate comprehensive score
            const score = await this.calculateProxyScore(proxy, criteria);
            
            candidates.push({ proxy, score });
        }
        
        // Sort by score (highest first)
        return candidates.sort((a, b) => b.score - a.score);
    }

    passesBasicFilters(proxy, criteria) {
        const ip = proxy.host;
        
        // Check if IP is overused
        const usage = this.ipUsageHistory.get(ip);
        if (usage && usage.sessionCount >= this.currentStrategy.maxSessionsPerIP) {
            return false;
        }
        
        // Check recent usage
        if (criteria.avoidRecentIPs && usage && usage.lastUsed) {
            const timeSinceLastUse = Date.now() - usage.lastUsed;
            if (timeSinceLastUse < this.currentStrategy.minInterval) {
                return false;
            }
        }
        
        // Check reputation
        const reputation = this.ipReputation.get(ip);
        if (reputation && reputation.score < 0.3) {
            return false;
        }
        
        // Check suspicious patterns
        if (this.suspiciousPatterns.has(ip)) {
            return false;
        }
        
        return true;
    }

    async calculateProxyScore(proxy, criteria) {
        let score = 0.5; // Base score
        const ip = proxy.host;
        
        // Geographic consistency (25% weight)
        score += this.calculateGeoScore(proxy, criteria) * 0.25;
        
        // Usage freshness (20% weight)
        score += this.calculateFreshnessScore(ip) * 0.20;
        
        // ISP diversity (15% weight)
        score += this.calculateISPDiversityScore(proxy) * 0.15;
        
        // Network fingerprint consistency (15% weight)
        score += this.calculateNetworkFingerprintScore(proxy) * 0.15;
        
        // Reputation score (15% weight)
        score += this.calculateReputationScore(ip) * 0.15;
        
        // Time zone alignment (10% weight)
        score += this.calculateTimezoneScore(proxy) * 0.10;
        
        return Math.max(0, Math.min(1, score));
    }

    calculateGeoScore(proxy, criteria) {
        let score = 0.5;
        
        // Country preference
        if (criteria.targetCountry) {
            if (proxy.country === criteria.targetCountry) {
                score += 0.4;
            } else {
                // Check if in same region
                const targetRegion = this.getRegionForCountry(criteria.targetCountry);
                const proxyRegion = this.getRegionForCountry(proxy.country);
                if (targetRegion === proxyRegion) {
                    score += 0.2;
                }
            }
        }
        
        // Geographic consistency with recent selections
        if (this.options.geoConsistencyLevel === 'high') {
            const recentCountries = this.getRecentCountries(5);
            if (recentCountries.includes(proxy.country)) {
                score += 0.1;
            }
        }
        
        return Math.max(0, Math.min(1, score));
    }

    calculateFreshnessScore(ip) {
        const usage = this.ipUsageHistory.get(ip);
        if (!usage || !usage.lastUsed) {
            return 1.0; // Fresh IP
        }
        
        const timeSinceLastUse = Date.now() - usage.lastUsed;
        const maxAge = 24 * 3600000; // 24 hours
        
        return Math.min(1.0, timeSinceLastUse / maxAge);
    }

    calculateISPDiversityScore(proxy) {
        const ispUsage = this.ispDistribution.get(proxy.provider);
        if (!ispUsage) return 0.5;
        
        // Prefer less used ISPs
        const totalUsage = Array.from(this.ispDistribution.values())
            .reduce((sum, isp) => sum + isp.usageCount, 0);
        
        if (totalUsage === 0) return 1.0;
        
        const usageRatio = ispUsage.usageCount / totalUsage;
        return Math.max(0.1, 1.0 - usageRatio);
    }

    calculateNetworkFingerprintScore(proxy) {
        if (!this.options.networkFingerprintConsistency) return 0.5;
        
        const fingerprint = this.networkFingerprints.get(proxy.host);
        if (!fingerprint) return 0.5;
        
        // Score based on fingerprint consistency with session requirements
        return fingerprint.consistencyScore || 0.5;
    }

    calculateReputationScore(ip) {
        const reputation = this.ipReputation.get(ip);
        return reputation ? reputation.score : 0.5;
    }

    calculateTimezoneScore(proxy) {
        const currentHour = new Date().getHours();
        const region = this.getRegionForCountry(proxy.country);
        
        if (!region) return 0.5;
        
        // Prefer IPs from regions where it's business hours
        const regionData = this.geoRegions.get(region);
        if (regionData) {
            // Simplified: assume business hours are 9-17 in each timezone
            // In real implementation, calculate actual time in proxy's timezone
            const businessHoursScore = (currentHour >= 9 && currentHour <= 17) ? 1.0 : 0.3;
            return businessHoursScore;
        }
        
        return 0.5;
    }

    selectOptimalProxy(candidates) {
        if (candidates.length === 0) {
            throw new Error('No candidates available');
        }
        
        // Use weighted random selection from top candidates
        const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
        const weights = [0.4, 0.25, 0.15, 0.1, 0.1];
        
        const randomValue = Math.random();
        let cumulativeWeight = 0;
        
        for (let i = 0; i < topCandidates.length; i++) {
            cumulativeWeight += weights[i] || 0.05;
            if (randomValue <= cumulativeWeight) {
                return topCandidates[i].proxy;
            }
        }
        
        return topCandidates[0].proxy;
    }

    async recordIPUsage(ip, sessionId) {
        // Update usage statistics
        let usage = this.ipUsageHistory.get(ip) || {
            sessionCount: 0,
            totalUsage: 0,
            lastUsed: null,
            sessions: []
        };
        
        usage.sessionCount++;
        usage.totalUsage++;
        usage.lastUsed = Date.now();
        
        if (sessionId) {
            usage.sessions.push({
                sessionId: sessionId,
                timestamp: Date.now()
            });
            
            // Limit session history
            if (usage.sessions.length > 20) {
                usage.sessions = usage.sessions.slice(-20);
            }
        }
        
        this.ipUsageHistory.set(ip, usage);
        
        // Update ISP usage
        const proxy = await this.getProxyByIP(ip);
        if (proxy && this.ispDistribution.has(proxy.provider)) {
            const ispUsage = this.ispDistribution.get(proxy.provider);
            ispUsage.usageCount++;
            ispUsage.lastUsed = Date.now();
        }
        
        // Schedule rotation if needed
        this.scheduleRotationForSession(sessionId, ip);
    }

    scheduleRotationForSession(sessionId, ip) {
        if (!sessionId || !this.options.enableAutoRotation) return;
        
        // Clear existing schedule
        if (this.ipRotationSchedule.has(sessionId)) {
            clearTimeout(this.ipRotationSchedule.get(sessionId));
        }
        
        // Schedule next rotation
        const rotationDelay = this.currentStrategy.minInterval + 
            Math.random() * (this.options.rotationInterval - this.currentStrategy.minInterval);
        
        const timeoutId = setTimeout(() => {
            this.emit('rotationDue', { sessionId, currentIP: ip });
        }, rotationDelay);
        
        this.ipRotationSchedule.set(sessionId, timeoutId);
        
        console.log(`⏰ Scheduled IP rotation for session ${sessionId} in ${Math.round(rotationDelay / 60000)} minutes`);
    }

    async rotateIPForSession(sessionId, criteria = {}) {
        console.log(`🔄 Rotating IP for session ${sessionId}`);
        
        const currentIP = this.sessionIPMapping.get(sessionId);
        
        try {
            // Get new IP with preference for different geographic location if needed
            const newProxy = await this.getOptimalIP({
                ...criteria,
                sessionId: null, // Force new selection
                avoidRecentIPs: true
            });
            
            // Update session mapping
            this.sessionIPMapping.set(sessionId, newProxy.host);
            
            // Record rotation event
            this.emit('ipRotated', {
                sessionId,
                oldIP: currentIP,
                newIP: newProxy.host,
                newCountry: newProxy.country,
                timestamp: Date.now()
            });
            
            console.log(`✅ IP rotated for session ${sessionId}: ${currentIP} → ${newProxy.host}`);
            
            return newProxy;
            
        } catch (error) {
            console.error(`❌ Failed to rotate IP for session ${sessionId}:`, error);
            throw error;
        }
    }

    startAutoRotation() {
        console.log('🔄 Starting automatic IP rotation...');
        
        this.on('rotationDue', async ({ sessionId, currentIP }) => {
            try {
                await this.rotateIPForSession(sessionId);
            } catch (error) {
                console.error(`Auto-rotation failed for session ${sessionId}:`, error);
                
                // Retry with more relaxed criteria
                setTimeout(() => {
                    this.emit('rotationDue', { sessionId, currentIP });
                }, 60000); // Retry in 1 minute
            }
        });
    }

    initializeSuspiciousPatternDetection() {
        console.log('🔍 Initializing suspicious pattern detection...');
        
        // Check for suspicious patterns every 10 minutes
        setInterval(() => {
            this.detectSuspiciousPatterns();
        }, 600000);
    }

    detectSuspiciousPatterns() {
        // Detect IPs with suspicious usage patterns
        for (const [ip, usage] of this.ipUsageHistory.entries()) {
            let suspiciousScore = 0;
            
            // Too many sessions in short time
            if (usage.sessionCount > 10) {
                const recentSessions = usage.sessions.filter(s => 
                    Date.now() - s.timestamp < 3600000 // Last hour
                );
                if (recentSessions.length > 5) {
                    suspiciousScore += 0.3;
                }
            }
            
            // Consistent timing patterns (might indicate automation)
            if (usage.sessions.length >= 3) {
                const intervals = [];
                for (let i = 1; i < usage.sessions.length; i++) {
                    intervals.push(usage.sessions[i].timestamp - usage.sessions[i-1].timestamp);
                }
                
                // Check for too consistent intervals
                const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
                const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
                const stdDev = Math.sqrt(variance);
                
                if (stdDev < avgInterval * 0.1) { // Very low variance
                    suspiciousScore += 0.2;
                }
            }
            
            // Mark as suspicious if score is high
            if (suspiciousScore > 0.4) {
                this.suspiciousPatterns.add(ip);
                console.log(`⚠️ IP ${ip} marked as suspicious (score: ${suspiciousScore.toFixed(2)})`);
                
                // Lower reputation
                const reputation = this.ipReputation.get(ip) || { score: 1.0 };
                reputation.score = Math.max(0.1, reputation.score - 0.3);
                this.ipReputation.set(ip, reputation);
            }
        }
    }

    // Utility methods
    getRegionForCountry(country) {
        for (const [regionName, regionData] of this.geoRegions.entries()) {
            if (regionData.countries.includes(country)) {
                return regionName;
            }
        }
        return null;
    }

    getRecentCountries(count = 5) {
        const recentIPs = Array.from(this.sessionIPMapping.values()).slice(-count);
        return recentIPs.map(ip => this.getCountryForIP(ip)).filter(country => country);
    }

    async getProxyByIP(ip) {
        for (const [poolName, proxies] of this.proxyManager.proxyPools.entries()) {
            const proxy = proxies.find(p => p.host === ip);
            if (proxy) return proxy;
        }
        return null;
    }

    getCountryForIP(ip) {
        // In real implementation, this would do a lookup
        // For now, find from proxy pools
        for (const [poolName, proxies] of this.proxyManager.proxyPools.entries()) {
            const proxy = proxies.find(p => p.host === ip);
            if (proxy) return proxy.country;
        }
        return null;
    }

    isIPStillViable(ip) {
        const usage = this.ipUsageHistory.get(ip);
        if (!usage) return true;
        
        // Check if overused
        if (usage.sessionCount >= this.currentStrategy.maxSessionsPerIP) {
            return false;
        }
        
        // Check reputation
        const reputation = this.ipReputation.get(ip);
        if (reputation && reputation.score < 0.3) {
            return false;
        }
        
        // Check if marked as suspicious
        if (this.suspiciousPatterns.has(ip)) {
            return false;
        }
        
        return true;
    }

    getRotationReport() {
        const totalIPs = this.ipUsageHistory.size;
        const activeIPs = Array.from(this.sessionIPMapping.values()).length;
        const suspiciousIPs = this.suspiciousPatterns.size;
        
        // Calculate average usage per IP
        const totalUsage = Array.from(this.ipUsageHistory.values())
            .reduce((sum, usage) => sum + usage.sessionCount, 0);
        const avgUsagePerIP = totalIPs > 0 ? (totalUsage / totalIPs).toFixed(1) : 0;
        
        // Geographic distribution
        const geoDistribution = {};
        for (const ip of this.sessionIPMapping.values()) {
            const country = this.getCountryForIP(ip);
            if (country) {
                geoDistribution[country] = (geoDistribution[country] || 0) + 1;
            }
        }
        
        return {
            totalIPsUsed: totalIPs,
            activeIPs: activeIPs,
            suspiciousIPs: suspiciousIPs,
            averageUsagePerIP: avgUsagePerIP,
            geoDistribution: geoDistribution,
            rotationStrategy: this.currentStrategy,
            autoRotationEnabled: this.options.enableAutoRotation
        };
    }

    async saveState() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            const dataPath = path.join(__dirname, '../../data');
            await fs.mkdir(dataPath, { recursive: true });
            
            const state = {
                ipUsageHistory: Object.fromEntries(this.ipUsageHistory),
                ipReputation: Object.fromEntries(this.ipReputation),
                ispDistribution: Object.fromEntries(this.ispDistribution),
                suspiciousPatterns: Array.from(this.suspiciousPatterns),
                lastUpdated: Date.now()
            };
            
            await fs.writeFile(
                path.join(dataPath, 'ip-usage-history.json'),
                JSON.stringify(state, null, 2)
            );
            
        } catch (error) {
            console.error('Failed to save IP rotation state:', error);
        }
    }

    async destroy() {
        // Clear all rotation schedules
        for (const timeoutId of this.ipRotationSchedule.values()) {
            clearTimeout(timeoutId);
        }
        
        // Save state
        await this.saveState();
        
        console.log('🔄 IP Rotation Service stopped');
    }
}

module.exports = IPRotationService;