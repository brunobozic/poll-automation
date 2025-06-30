/**
 * Rotation Manager - Intelligent rotation of user agents, proxies, and behavioral patterns
 * Provides sophisticated rotation strategies to avoid detection
 */

class RotationManager {
    constructor() {
        this.userAgents = [
            // Windows Chrome variants
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            
            // Windows Firefox variants
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
            
            // Windows Edge variants
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            
            // macOS Chrome variants
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            
            // macOS Safari variants
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
            
            // Linux variants
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'
        ];

        this.emailServices = [
            {
                name: 'TempMail',
                url: 'https://temp-mail.org',
                method: 'tempmail',
                weight: 0.4, // Higher weight = more likely to be selected
                reliability: 0.9
            },
            {
                name: '10MinuteMail',
                url: 'https://10minutemail.com',
                method: 'tenminute',
                weight: 0.3,
                reliability: 0.8
            },
            {
                name: 'Guerrilla Mail',
                url: 'https://www.guerrillamail.com',
                method: 'guerrilla',
                weight: 0.2,
                reliability: 0.7
            },
            {
                name: 'ProtonMail',
                url: 'https://proton.me',
                method: 'proton',
                weight: 0.1, // Lower weight due to complexity
                reliability: 0.95
            }
        ];

        this.proxyList = [
            // Free proxy rotation pool (example - replace with real proxies)
            { host: '8.8.8.8', port: 3128, type: 'http' },
            { host: '1.1.1.1', port: 3128, type: 'http' },
            // Note: In production, use paid proxy services
        ];

        this.timingPatterns = [
            {
                name: 'careful_user',
                readTime: { min: 3000, max: 8000 },
                typeSpeed: { min: 80, max: 200 },
                pauseBetweenFields: { min: 500, max: 2000 },
                weight: 0.3
            },
            {
                name: 'average_user',
                readTime: { min: 1500, max: 5000 },
                typeSpeed: { min: 60, max: 150 },
                pauseBetweenFields: { min: 200, max: 1000 },
                weight: 0.5
            },
            {
                name: 'fast_user',
                readTime: { min: 800, max: 2500 },
                typeSpeed: { min: 40, max: 100 },
                pauseBetweenFields: { min: 100, max: 500 },
                weight: 0.2
            }
        ];

        this.viewportSizes = [
            { width: 1920, height: 1080 }, // Full HD
            { width: 1366, height: 768 },  // Most common laptop
            { width: 1440, height: 900 },  // MacBook
            { width: 1536, height: 864 },  // Scaled display
            { width: 1280, height: 720 },  // HD
            { width: 1600, height: 900 }   // Wide laptop
        ];

        // Track usage to avoid patterns
        this.usageHistory = {
            userAgents: new Map(),
            emailServices: new Map(),
            proxies: new Map(),
            timingPatterns: new Map(),
            viewports: new Map()
        };

        this.lastUsed = {
            userAgent: null,
            emailService: null,
            proxy: null,
            timingPattern: null,
            viewport: null
        };
    }

    /**
     * Get next user agent with intelligent rotation
     */
    getNextUserAgent() {
        // Avoid recently used user agents
        const availableUAs = this.userAgents.filter(ua => 
            ua !== this.lastUsed.userAgent &&
            (this.usageHistory.userAgents.get(ua) || 0) < 3
        );

        const selected = this.weightedRandomSelect(
            availableUAs.length > 0 ? availableUAs : this.userAgents
        );

        this.updateUsageHistory('userAgents', selected);
        this.lastUsed.userAgent = selected;
        
        console.log(`🔄 Rotated User-Agent: ${selected.substring(0, 50)}...`);
        return selected;
    }

    /**
     * Get next email service with weighted selection
     */
    getNextEmailService() {
        // Filter out recently failed services
        const availableServices = this.emailServices.filter(service =>
            service !== this.lastUsed.emailService &&
            service.reliability > 0.5
        );

        const selected = this.weightedRandomSelect(
            availableServices.length > 0 ? availableServices : this.emailServices,
            'weight'
        );

        this.updateUsageHistory('emailServices', selected.name);
        this.lastUsed.emailService = selected;
        
        console.log(`📧 Rotated Email Service: ${selected.name} (reliability: ${selected.reliability})`);
        return selected;
    }

    /**
     * Get next proxy with rotation
     */
    getNextProxy() {
        if (this.proxyList.length === 0) return null;

        const availableProxies = this.proxyList.filter(proxy =>
            proxy !== this.lastUsed.proxy
        );

        const selected = this.weightedRandomSelect(
            availableProxies.length > 0 ? availableProxies : this.proxyList
        );

        this.updateUsageHistory('proxies', `${selected.host}:${selected.port}`);
        this.lastUsed.proxy = selected;
        
        console.log(`🔀 Rotated Proxy: ${selected.host}:${selected.port}`);
        return selected;
    }

    /**
     * Get next timing pattern for human-like behavior
     */
    getNextTimingPattern() {
        const availablePatterns = this.timingPatterns.filter(pattern =>
            pattern !== this.lastUsed.timingPattern
        );

        const selected = this.weightedRandomSelect(
            availablePatterns.length > 0 ? availablePatterns : this.timingPatterns,
            'weight'
        );

        this.updateUsageHistory('timingPatterns', selected.name);
        this.lastUsed.timingPattern = selected;
        
        console.log(`⏱️ Rotated Timing Pattern: ${selected.name}`);
        return selected;
    }

    /**
     * Get next viewport size
     */
    getNextViewport() {
        const availableViewports = this.viewportSizes.filter(viewport =>
            viewport !== this.lastUsed.viewport
        );

        const selected = this.weightedRandomSelect(
            availableViewports.length > 0 ? availableViewports : this.viewportSizes
        );

        this.updateUsageHistory('viewports', `${selected.width}x${selected.height}`);
        this.lastUsed.viewport = selected;
        
        console.log(`📱 Rotated Viewport: ${selected.width}x${selected.height}`);
        return selected;
    }

    /**
     * Generate complete browser configuration with rotation
     */
    generateRotatedBrowserConfig() {
        const userAgent = this.getNextUserAgent();
        const viewport = this.getNextViewport();
        const proxy = this.getNextProxy();
        const timingPattern = this.getNextTimingPattern();

        return {
            userAgent,
            viewport,
            proxy,
            timingPattern,
            extraHTTPHeaders: this.generateRotatedHeaders(userAgent),
            fingerprint: this.generateRotatedFingerprint()
        };
    }

    /**
     * Generate rotated HTTP headers
     */
    generateRotatedHeaders(userAgent) {
        const acceptLanguages = [
            'en-US,en;q=0.9',
            'en-US,en;q=0.8',
            'en-US,en;q=0.9,es;q=0.8',
            'en-US,en;q=0.9,fr;q=0.8',
            'en-US,en;q=0.8,de;q=0.7'
        ];

        const acceptEncodings = [
            'gzip, deflate, br',
            'gzip, deflate',
            'gzip, deflate, br, zstd'
        ];

        return {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': this.weightedRandomSelect(acceptLanguages),
            'Accept-Encoding': this.weightedRandomSelect(acceptEncodings),
            'DNT': Math.random() > 0.5 ? '1' : '0',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': Math.random() > 0.7 ? 'max-age=0' : 'no-cache'
        };
    }

    /**
     * Generate rotated browser fingerprint
     */
    generateRotatedFingerprint() {
        const screenResolutions = [
            { width: 1920, height: 1080, colorDepth: 24 },
            { width: 1366, height: 768, colorDepth: 24 },
            { width: 1440, height: 900, colorDepth: 24 },
            { width: 2560, height: 1440, colorDepth: 24 }
        ];

        const timezones = [
            'America/New_York',
            'America/Los_Angeles', 
            'America/Chicago',
            'America/Denver',
            'Europe/London',
            'Europe/Paris'
        ];

        const languages = [
            ['en-US', 'en'],
            ['en-US', 'en', 'es'],
            ['en-US', 'en', 'fr'],
            ['en-GB', 'en']
        ];

        return {
            screen: this.weightedRandomSelect(screenResolutions),
            timezone: this.weightedRandomSelect(timezones),
            languages: this.weightedRandomSelect(languages),
            platform: this.getPlatformFromUserAgent(this.lastUsed.userAgent),
            hardwareConcurrency: Math.floor(Math.random() * 8) + 4, // 4-12 cores
            deviceMemory: [4, 8, 16, 32][Math.floor(Math.random() * 4)]
        };
    }

    /**
     * Weighted random selection
     */
    weightedRandomSelect(items, weightProperty = null) {
        if (!items || items.length === 0) return null;
        
        if (!weightProperty) {
            return items[Math.floor(Math.random() * items.length)];
        }

        const totalWeight = items.reduce((sum, item) => sum + (item[weightProperty] || 1), 0);
        let random = Math.random() * totalWeight;

        for (const item of items) {
            random -= (item[weightProperty] || 1);
            if (random <= 0) return item;
        }

        return items[0]; // Fallback
    }

    /**
     * Update usage history for rotation tracking
     */
    updateUsageHistory(category, item) {
        const history = this.usageHistory[category];
        history.set(item, (history.get(item) || 0) + 1);

        // Reset history if it gets too large
        if (history.size > 100) {
            history.clear();
        }
    }

    /**
     * Extract platform from user agent
     */
    getPlatformFromUserAgent(userAgent) {
        if (!userAgent) return 'Win32';
        
        if (userAgent.includes('Windows')) return 'Win32';
        if (userAgent.includes('Macintosh')) return 'MacIntel';
        if (userAgent.includes('Linux')) return 'Linux x86_64';
        return 'Win32';
    }

    /**
     * Report service failure for reliability adjustment
     */
    reportServiceFailure(serviceName) {
        const service = this.emailServices.find(s => s.name === serviceName);
        if (service) {
            service.reliability = Math.max(0.1, service.reliability - 0.1);
            console.log(`⚠️ ${serviceName} reliability decreased to ${service.reliability}`);
        }
    }

    /**
     * Report service success for reliability adjustment
     */
    reportServiceSuccess(serviceName) {
        const service = this.emailServices.find(s => s.name === serviceName);
        if (service) {
            service.reliability = Math.min(1.0, service.reliability + 0.05);
            console.log(`✅ ${serviceName} reliability increased to ${service.reliability}`);
        }
    }

    /**
     * Get rotation statistics
     */
    getRotationStats() {
        return {
            userAgentsUsed: this.usageHistory.userAgents.size,
            emailServicesUsed: this.usageHistory.emailServices.size,
            proxiesUsed: this.usageHistory.proxies.size,
            timingPatternsUsed: this.usageHistory.timingPatterns.size,
            viewportsUsed: this.usageHistory.viewports.size,
            mostUsedUserAgent: this.getMostUsed('userAgents'),
            mostUsedEmailService: this.getMostUsed('emailServices'),
            serviceReliabilities: this.emailServices.map(s => ({
                name: s.name,
                reliability: s.reliability
            }))
        };
    }

    /**
     * Get most used item from category
     */
    getMostUsed(category) {
        const history = this.usageHistory[category];
        let maxUsage = 0;
        let mostUsed = null;

        for (const [item, usage] of history.entries()) {
            if (usage > maxUsage) {
                maxUsage = usage;
                mostUsed = item;
            }
        }

        return { item: mostUsed, usage: maxUsage };
    }

    /**
     * Reset all rotation history
     */
    resetRotationHistory() {
        for (const category of Object.keys(this.usageHistory)) {
            this.usageHistory[category].clear();
        }
        
        for (const key of Object.keys(this.lastUsed)) {
            this.lastUsed[key] = null;
        }

        console.log('🔄 Rotation history reset');
    }
}

module.exports = RotationManager;