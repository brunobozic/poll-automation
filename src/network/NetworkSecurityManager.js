/**
 * Network Security Manager
 * Consolidates functionality from:
 * - consolidated-proxy-manager.js
 * - advanced-proxy-manager.js
 * - ip-rotation-service.js
 * - advanced-fingerprint-spoofer.js
 * 
 * Provides unified network security and proxy management
 */

const crypto = require('crypto');
const axios = require('axios');

class NetworkSecurityManager {
    constructor(options = {}) {
        this.options = {
            proxyEnabled: options.proxyEnabled || false,
            rotationInterval: options.rotationInterval || 300000, // 5 minutes
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            stealthLevel: options.stealthLevel || 'high',
            browser: options.browser || null,
            maxRetries: options.maxRetries || 3,
            timeout: options.timeout || 10000,
            ...options
        };

        // Proxy management
        this.proxies = [];
        this.currentProxy = null;
        this.proxyPool = new Map();
        this.proxyStats = new Map();
        this.rotationTimer = null;
        this.healthCheckTimer = null;

        // Fingerprint management
        this.fingerprints = new Map();
        this.currentFingerprint = null;
        
        // Session management
        this.sessions = new Map();
        this.isInitialized = false;

        // Network statistics
        this.stats = {
            proxiesTotal: 0,
            proxiesHealthy: 0,
            proxiesActive: 0,
            rotationsCount: 0,
            healthChecksCount: 0,
            requestsCount: 0,
            failuresCount: 0,
            avgResponseTime: 0
        };
    }

    /**
     * Initialize network security manager
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🌐 Initializing Network Security Manager...');

        try {
            // Load proxy configurations
            if (this.options.proxyEnabled) {
                await this.loadProxyConfigurations();
                await this.initializeProxyPool();
                
                if (this.proxies.length > 0) {
                    await this.selectInitialProxy();
                    this.startProxyRotation();
                    this.startHealthChecking();
                }
            }

            // Initialize fingerprint management
            await this.initializeFingerprintManagement();

            // Setup network monitoring
            this.setupNetworkMonitoring();

            this.isInitialized = true;
            console.log(`✅ Network Security Manager initialized (${this.proxies.length} proxies available)`);

        } catch (error) {
            console.error('❌ Network Security Manager initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Load proxy configurations from various sources
     */
    async loadProxyConfigurations() {
        // Load from environment variables
        const proxyList = process.env.PROXY_LIST;
        if (proxyList) {
            const envProxies = proxyList.split(',').map(proxy => this.parseProxyString(proxy.trim()));
            this.proxies.push(...envProxies.filter(p => p));
        }

        // Load from file if specified
        if (this.options.proxyFile) {
            try {
                const fs = require('fs').promises;
                const proxyData = await fs.readFile(this.options.proxyFile, 'utf8');
                const fileProxies = proxyData.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
                    .map(proxy => this.parseProxyString(proxy))
                    .filter(p => p);
                
                this.proxies.push(...fileProxies);
            } catch (error) {
                console.warn(`⚠️ Could not load proxy file: ${this.options.proxyFile}`);
            }
        }

        // Add default proxies if none found
        if (this.proxies.length === 0 && this.options.proxyEnabled) {
            console.log('ℹ️ No proxies configured, running without proxy rotation');
        }

        this.stats.proxiesTotal = this.proxies.length;
    }

    /**
     * Parse proxy string into configuration object
     */
    parseProxyString(proxyString) {
        try {
            // Support multiple formats:
            // http://user:pass@host:port
            // host:port:user:pass
            // host:port

            if (proxyString.includes('://')) {
                const url = new URL(proxyString);
                return {
                    id: crypto.randomUUID(),
                    protocol: url.protocol.replace(':', ''),
                    host: url.hostname,
                    port: parseInt(url.port),
                    username: url.username || null,
                    password: url.password || null,
                    status: 'unknown',
                    responseTime: 0,
                    successCount: 0,
                    failureCount: 0,
                    lastChecked: null
                };
            } else {
                const parts = proxyString.split(':');
                if (parts.length >= 2) {
                    return {
                        id: crypto.randomUUID(),
                        protocol: 'http',
                        host: parts[0],
                        port: parseInt(parts[1]),
                        username: parts[2] || null,
                        password: parts[3] || null,
                        status: 'unknown',
                        responseTime: 0,
                        successCount: 0,
                        failureCount: 0,
                        lastChecked: null
                    };
                }
            }
        } catch (error) {
            console.warn(`⚠️ Invalid proxy format: ${proxyString}`);
        }
        return null;
    }

    /**
     * Initialize proxy pool with health checks
     */
    async initializeProxyPool() {
        console.log(`🔍 Initializing proxy pool with ${this.proxies.length} proxies...`);

        const healthCheckPromises = this.proxies.map(proxy => this.checkProxyHealth(proxy));
        await Promise.allSettled(healthCheckPromises);

        // Sort by response time
        this.proxies.sort((a, b) => {
            if (a.status === 'healthy' && b.status !== 'healthy') return -1;
            if (b.status === 'healthy' && a.status !== 'healthy') return 1;
            return a.responseTime - b.responseTime;
        });

        this.updateProxyStats();
    }

    /**
     * Check proxy health
     */
    async checkProxyHealth(proxy) {
        const startTime = Date.now();
        
        try {
            const proxyConfig = {
                proxy: {
                    protocol: proxy.protocol,
                    host: proxy.host,
                    port: proxy.port,
                    auth: proxy.username ? {
                        username: proxy.username,
                        password: proxy.password
                    } : undefined
                },
                timeout: this.options.timeout,
                validateStatus: (status) => status < 500
            };

            const response = await axios.get('https://httpbin.org/ip', proxyConfig);
            
            proxy.responseTime = Date.now() - startTime;
            proxy.status = response.status === 200 ? 'healthy' : 'degraded';
            proxy.lastChecked = new Date();
            proxy.successCount++;

            console.log(`  ✅ Proxy ${proxy.host}:${proxy.port} - ${proxy.responseTime}ms`);

        } catch (error) {
            proxy.responseTime = Date.now() - startTime;
            proxy.status = 'unhealthy';
            proxy.lastChecked = new Date();
            proxy.failureCount++;

            console.log(`  ❌ Proxy ${proxy.host}:${proxy.port} - ${error.message}`);
        }

        this.stats.healthChecksCount++;
    }

    /**
     * Select initial proxy
     */
    async selectInitialProxy() {
        const healthyProxies = this.proxies.filter(p => p.status === 'healthy');
        
        if (healthyProxies.length > 0) {
            this.currentProxy = healthyProxies[0];
            console.log(`🎯 Selected initial proxy: ${this.currentProxy.host}:${this.currentProxy.port}`);
        } else {
            console.log('⚠️ No healthy proxies available');
        }
    }

    /**
     * Rotate to next available proxy
     */
    async rotateProxy() {
        if (this.proxies.length <= 1) return false;

        const healthyProxies = this.proxies.filter(p => p.status === 'healthy');
        
        if (healthyProxies.length === 0) {
            console.log('⚠️ No healthy proxies available for rotation');
            return false;
        }

        // Find next proxy (round-robin)
        const currentIndex = healthyProxies.findIndex(p => p.id === this.currentProxy?.id);
        const nextIndex = (currentIndex + 1) % healthyProxies.length;
        const nextProxy = healthyProxies[nextIndex];

        if (nextProxy.id !== this.currentProxy?.id) {
            this.currentProxy = nextProxy;
            this.stats.rotationsCount++;
            
            console.log(`🔄 Rotated to proxy: ${this.currentProxy.host}:${this.currentProxy.port}`);
            return true;
        }

        return false;
    }

    /**
     * Start automatic proxy rotation
     */
    startProxyRotation() {
        if (this.rotationTimer) return;

        this.rotationTimer = setInterval(async () => {
            try {
                await this.rotateProxy();
            } catch (error) {
                console.error('⚠️ Proxy rotation error:', error.message);
            }
        }, this.options.rotationInterval);

        console.log(`🔄 Proxy rotation started (${this.options.rotationInterval / 1000}s interval)`);
    }

    /**
     * Start health checking
     */
    startHealthChecking() {
        if (this.healthCheckTimer) return;

        this.healthCheckTimer = setInterval(async () => {
            try {
                const healthCheckPromises = this.proxies.map(proxy => this.checkProxyHealth(proxy));
                await Promise.allSettled(healthCheckPromises);
                this.updateProxyStats();
            } catch (error) {
                console.error('⚠️ Health check error:', error.message);
            }
        }, this.options.healthCheckInterval);

        console.log(`💗 Health checking started (${this.options.healthCheckInterval / 1000}s interval)`);
    }

    /**
     * Get current proxy configuration for Playwright
     */
    getProxyConfig() {
        if (!this.currentProxy) return null;

        return {
            server: `${this.currentProxy.protocol}://${this.currentProxy.host}:${this.currentProxy.port}`,
            username: this.currentProxy.username,
            password: this.currentProxy.password
        };
    }

    /**
     * Initialize fingerprint management
     */
    async initializeFingerprintManagement() {
        console.log('🔐 Initializing fingerprint management...');
        
        // Generate initial fingerprint
        this.currentFingerprint = this.generateFingerprint();
        
        console.log(`✅ Fingerprint generated: ${this.currentFingerprint.id}`);
    }

    /**
     * Generate browser fingerprint
     */
    generateFingerprint() {
        const fingerprint = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            userAgent: this.generateUserAgent(),
            viewport: this.generateViewport(),
            screen: this.generateScreenProperties(),
            timezone: this.generateTimezone(),
            locale: this.generateLocale(),
            platform: this.generatePlatform(),
            hardwareConcurrency: this.generateHardwareConcurrency(),
            deviceMemory: this.generateDeviceMemory(),
            colorDepth: 24,
            pixelRatio: 1,
            canvas: this.generateCanvasFingerprint(),
            webgl: this.generateWebGLFingerprint(),
            audio: this.generateAudioFingerprint(),
            fonts: this.generateFontList(),
            plugins: this.generatePluginList()
        };

        this.fingerprints.set(fingerprint.id, fingerprint);
        return fingerprint;
    }

    /**
     * Generate realistic user agent
     */
    generateUserAgent() {
        const chromeVersions = ['119.0.0.0', '120.0.0.0', '121.0.0.0', '122.0.0.0', '123.0.0.0'];
        const windowsVersions = ['10.0', '11.0'];
        
        const chromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
        const windowsVersion = windowsVersions[Math.floor(Math.random() * windowsVersions.length)];
        
        return `Mozilla/5.0 (Windows NT ${windowsVersion}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    }

    /**
     * Generate realistic viewport
     */
    generateViewport() {
        const commonResolutions = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 },
            { width: 1600, height: 900 },
            { width: 1280, height: 720 },
            { width: 1024, height: 768 }
        ];
        
        return commonResolutions[Math.floor(Math.random() * commonResolutions.length)];
    }

    /**
     * Generate screen properties
     */
    generateScreenProperties() {
        const viewport = this.generateViewport();
        return {
            width: viewport.width,
            height: viewport.height,
            availWidth: viewport.width,
            availHeight: viewport.height - 40, // Account for taskbar
            colorDepth: 24,
            pixelDepth: 24
        };
    }

    /**
     * Generate timezone
     */
    generateTimezone() {
        const timezones = [
            'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
            'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'
        ];
        
        return timezones[Math.floor(Math.random() * timezones.length)];
    }

    /**
     * Generate locale
     */
    generateLocale() {
        const locales = [
            'en-US,en;q=0.9',
            'en-GB,en;q=0.9',
            'fr-FR,fr;q=0.9,en;q=0.8',
            'de-DE,de;q=0.9,en;q=0.8',
            'es-ES,es;q=0.9,en;q=0.8'
        ];
        
        return locales[Math.floor(Math.random() * locales.length)];
    }

    /**
     * Generate platform
     */
    generatePlatform() {
        const platforms = ['Win32', 'Win64', 'Linux x86_64', 'MacIntel'];
        return platforms[Math.floor(Math.random() * platforms.length)];
    }

    /**
     * Generate hardware concurrency
     */
    generateHardwareConcurrency() {
        const concurrencies = [4, 6, 8, 12, 16];
        return concurrencies[Math.floor(Math.random() * concurrencies.length)];
    }

    /**
     * Generate device memory
     */
    generateDeviceMemory() {
        const memories = [4, 8, 16, 32];
        return memories[Math.floor(Math.random() * memories.length)];
    }

    /**
     * Generate canvas fingerprint
     */
    generateCanvasFingerprint() {
        const variations = [
            '2d899af2b6f4d3e1c7a8b9f0e3d2c1a0',
            '7f3e9c2a8b1d4f6e0c5a9b3d7e1f8a2c',
            'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
            'f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5'
        ];
        
        return variations[Math.floor(Math.random() * variations.length)];
    }

    /**
     * Generate WebGL fingerprint
     */
    generateWebGLFingerprint() {
        const renderers = [
            'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)'
        ];
        
        return {
            vendor: 'Google Inc. (Intel)',
            renderer: renderers[Math.floor(Math.random() * renderers.length)],
            version: 'OpenGL ES 2.0 (ANGLE 2.1.0.devel)',
            shadingLanguageVersion: 'OpenGL ES GLSL ES 1.00 (ANGLE 2.1.0.devel)'
        };
    }

    /**
     * Generate audio fingerprint
     */
    generateAudioFingerprint() {
        return {
            sampleRate: 44100,
            maxChannelCount: 2,
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 2,
            channelCountMode: 'max',
            channelInterpretation: 'speakers'
        };
    }

    /**
     * Generate font list
     */
    generateFontList() {
        const allFonts = [
            'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS',
            'Courier New', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
            'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI', 'Tahoma',
            'Times New Roman', 'Trebuchet MS', 'Verdana', 'Helvetica', 'Roboto'
        ];
        
        const count = Math.floor(Math.random() * 5) + 12; // 12-16 fonts
        return allFonts.sort(() => Math.random() - 0.5).slice(0, count);
    }

    /**
     * Generate plugin list
     */
    generatePluginList() {
        const plugins = [
            'PDF Viewer',
            'Chrome PDF Viewer',
            'Chromium PDF Viewer',
            'Microsoft Edge PDF Viewer',
            'WebKit built-in PDF'
        ];
        
        return plugins.slice(0, Math.floor(Math.random() * 3) + 2);
    }

    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        // Monitor for network events and adapt accordingly
        setInterval(() => {
            this.updateNetworkStats();
        }, 30000); // Update every 30 seconds
    }

    /**
     * Update proxy statistics
     */
    updateProxyStats() {
        this.stats.proxiesHealthy = this.proxies.filter(p => p.status === 'healthy').length;
        this.stats.proxiesActive = this.currentProxy ? 1 : 0;
        
        if (this.proxies.length > 0) {
            const totalResponseTime = this.proxies.reduce((sum, p) => sum + p.responseTime, 0);
            this.stats.avgResponseTime = Math.round(totalResponseTime / this.proxies.length);
        }
    }

    /**
     * Update network statistics
     */
    updateNetworkStats() {
        // Calculate success rates and other metrics
        const totalRequests = this.stats.requestsCount + this.stats.failuresCount;
        if (totalRequests > 0) {
            this.stats.successRate = ((this.stats.requestsCount / totalRequests) * 100).toFixed(1) + '%';
        }
    }

    /**
     * Force proxy rotation
     */
    async forceProxyRotation() {
        return await this.rotateProxy();
    }

    /**
     * Regenerate fingerprint
     */
    regenerateFingerprint() {
        this.currentFingerprint = this.generateFingerprint();
        console.log(`🔐 Fingerprint regenerated: ${this.currentFingerprint.id}`);
        return this.currentFingerprint;
    }

    /**
     * Get current fingerprint
     */
    getCurrentFingerprint() {
        return this.currentFingerprint;
    }

    /**
     * Get current proxy
     */
    getCurrentProxy() {
        return this.currentProxy;
    }

    /**
     * Test network connectivity
     */
    async testConnectivity() {
        try {
            const testUrl = 'https://httpbin.org/ip';
            const config = {};
            
            if (this.currentProxy) {
                config.proxy = {
                    protocol: this.currentProxy.protocol,
                    host: this.currentProxy.host,
                    port: this.currentProxy.port,
                    auth: this.currentProxy.username ? {
                        username: this.currentProxy.username,
                        password: this.currentProxy.password
                    } : undefined
                };
            }
            
            const startTime = Date.now();
            const response = await axios.get(testUrl, { ...config, timeout: this.options.timeout });
            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                responseTime: responseTime,
                ip: response.data.origin,
                proxy: this.currentProxy ? `${this.currentProxy.host}:${this.currentProxy.port}` : 'none'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                proxy: this.currentProxy ? `${this.currentProxy.host}:${this.currentProxy.port}` : 'none'
            };
        }
    }

    /**
     * Get network statistics
     */
    getStats() {
        return {
            ...this.stats,
            currentProxy: this.currentProxy ? {
                host: this.currentProxy.host,
                port: this.currentProxy.port,
                status: this.currentProxy.status,
                responseTime: this.currentProxy.responseTime
            } : null,
            currentFingerprint: this.currentFingerprint ? {
                id: this.currentFingerprint.id,
                timestamp: this.currentFingerprint.timestamp
            } : null
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Network Security Manager...');
        
        try {
            // Stop timers
            if (this.rotationTimer) {
                clearInterval(this.rotationTimer);
                this.rotationTimer = null;
            }
            
            if (this.healthCheckTimer) {
                clearInterval(this.healthCheckTimer);
                this.healthCheckTimer = null;
            }
            
            // Clear maps
            this.fingerprints.clear();
            this.sessions.clear();
            this.proxyPool.clear();
            this.proxyStats.clear();
            
            this.isInitialized = false;
            console.log('✅ Network Security Manager cleanup complete');
            
        } catch (error) {
            console.error('❌ Network Security Manager cleanup error:', error.message);
        }
    }
}

module.exports = NetworkSecurityManager;