/**
 * Browser Manager
 * Unified browser management consolidating functionality from:
 * - browser-stealth.js
 * - stealth.js
 * - Enhanced browser instance management with proper resource cleanup
 */

const { chromium } = require('playwright');
const crypto = require('crypto');

class BrowserManager {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false,
            timeout: options.timeout || 30000,
            stealthLevel: options.stealthLevel || 'high',
            args: options.args || [],
            viewport: options.viewport || this.generateRealisticViewport(),
            userAgent: options.userAgent || this.generateRealisticUserAgent(),
            locale: options.locale || 'en-US,en;q=0.9',
            timezone: options.timezone || this.getRandomTimezone(),
            ...options
        };

        this.browser = null;
        this.contexts = new Map();
        this.pages = new Map();
        this.fingerprint = null;
        this.isInitialized = false;
        
        // Resource tracking
        this.resourceStats = {
            contextsCreated: 0,
            pagesCreated: 0,
            contextsActive: 0,
            pagesActive: 0
        };
    }

    /**
     * Initialize browser with advanced stealth features
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🥷 Initializing stealth browser manager...');

        try {
            // Generate fingerprint
            this.fingerprint = this.generateFingerprint();

            // Launch browser with stealth options
            this.browser = await chromium.launch({
                headless: this.options.headless,
                args: this.getStealthArgs(),
                timeout: this.options.timeout
            });

            // Setup browser event listeners
            this.setupBrowserEventListeners();

            this.isInitialized = true;
            console.log('✅ Stealth browser manager initialized');

        } catch (error) {
            console.error('❌ Browser manager initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Create new stealth context
     */
    async createStealthContext(sessionId = null) {
        this.ensureInitialized();

        const contextId = sessionId || crypto.randomUUID();
        
        console.log(`🛡️ Creating stealth context: ${contextId}`);

        try {
            const contextOptions = {
                viewport: this.options.viewport,
                userAgent: this.options.userAgent,
                locale: this.options.locale,
                timezoneId: this.options.timezone,
                permissions: ['geolocation', 'notifications'],
                geolocation: this.generateLocation(),
                deviceScaleFactor: this.options.pixelRatio || 1,
                colorScheme: 'light',
                extraHTTPHeaders: this.getStealthHeaders()
            };

            const context = await this.browser.newContext(contextOptions);
            
            // Inject stealth scripts
            await this.injectStealthScripts(context);
            
            // Store context
            this.contexts.set(contextId, {
                context: context,
                createdAt: Date.now(),
                sessionId: sessionId,
                pages: new Set()
            });

            this.resourceStats.contextsCreated++;
            this.resourceStats.contextsActive++;

            return { contextId, context };

        } catch (error) {
            console.error(`❌ Failed to create stealth context: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create new stealth page
     */
    async createStealthPage(contextId = null) {
        this.ensureInitialized();

        // Create context if not provided
        if (!contextId) {
            const result = await this.createStealthContext();
            contextId = result.contextId;
        }

        const contextData = this.contexts.get(contextId);
        if (!contextData) {
            throw new Error(`Context not found: ${contextId}`);
        }

        const pageId = crypto.randomUUID();
        
        console.log(`📄 Creating stealth page: ${pageId}`);

        try {
            const page = await contextData.context.newPage();
            
            // Apply additional stealth measures
            await this.applyPageStealth(page);
            
            // Store page
            this.pages.set(pageId, {
                page: page,
                contextId: contextId,
                createdAt: Date.now(),
                lastActivity: Date.now()
            });

            contextData.pages.add(pageId);
            this.resourceStats.pagesCreated++;
            this.resourceStats.pagesActive++;

            return { pageId, page, contextId };

        } catch (error) {
            console.error(`❌ Failed to create stealth page: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get stealth arguments for browser launch
     */
    getStealthArgs() {
        const baseArgs = [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-infobars',
            '--disable-extensions',
            '--disable-plugins-discovery',
            '--disable-bundled-ppapi-flash',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-field-trial-config',
            '--disable-ipc-flooding-protection',
            '--enable-features=NetworkService,NetworkServiceLogging',
            `--user-agent=${this.options.userAgent}`,
            `--lang=${this.options.locale}`,
            '--disable-gpu-sandbox',
            '--disable-software-rasterizer'
        ];

        // Add stealth level specific args
        if (this.options.stealthLevel === 'maximum') {
            baseArgs.push(
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--force-fieldtrials=*BackgroundTracing/default/',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--disable-sync',
                '--disable-translate',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-preconnect'
            );
        }

        return [...baseArgs, ...this.options.args];
    }

    /**
     * Get stealth HTTP headers
     */
    getStealthHeaders() {
        return {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': this.options.locale,
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1'
        };
    }

    /**
     * Inject stealth scripts into context
     */
    async injectStealthScripts(context) {
        // Remove webdriver traces
        await context.addInitScript(() => {
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // Remove automation indicators
            delete window.chrome?.runtime?.onConnect;

            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {
                        0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format" },
                        description: "Portable Document Format",
                        filename: "internal-pdf-viewer",
                        length: 1,
                        name: "Chrome PDF Plugin"
                    }
                ],
            });

            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Override hardware concurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8,
            });

            // Override device memory
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });

            // Mock permissions
            const originalQuery = window.navigator.permissions?.query;
            if (originalQuery) {
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            }
        });

        // Canvas fingerprint protection
        await context.addInitScript(() => {
            const getImageData = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                if (type === 'image/png') {
                    const context = this.getContext('2d');
                    const imageData = context.getImageData(0, 0, this.width, this.height);
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        imageData.data[i] += Math.floor(Math.random() * 3) - 1;
                        imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
                        imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
                    }
                    context.putImageData(imageData, 0, 0);
                }
                return getImageData.apply(this, arguments);
            };
        });

        // WebGL fingerprint protection
        await context.addInitScript(() => {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
                    return 'Intel Inc.';
                }
                if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameter.apply(this, arguments);
            };
        });

        // Audio fingerprint protection
        await context.addInitScript(() => {
            const originalGetChannelData = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function() {
                const results = originalGetChannelData.apply(this, arguments);
                for (let i = 0; i < results.length; i++) {
                    results[i] += (Math.random() - 0.5) * 0.0001;
                }
                return results;
            };
        });
    }

    /**
     * Apply additional stealth measures to page
     */
    async applyPageStealth(page) {
        // Set extra HTTP headers
        await page.setExtraHTTPHeaders(this.getStealthHeaders());

        // Override getters that might leak automation
        await page.addInitScript(() => {
            // Override screen properties
            Object.defineProperty(screen, 'colorDepth', {
                get: () => 24,
            });

            Object.defineProperty(screen, 'pixelDepth', {
                get: () => 24,
            });

            // Mock battery API
            if (navigator.getBattery) {
                navigator.getBattery = () => Promise.resolve({
                    charging: true,
                    chargingTime: 0,
                    dischargingTime: Infinity,
                    level: 0.8 + Math.random() * 0.2
                });
            }

            // Mock gamepad API
            Object.defineProperty(navigator, 'getGamepads', {
                get: () => () => []
            });
        });
    }

    /**
     * Setup browser event listeners
     */
    setupBrowserEventListeners() {
        this.browser.on('disconnected', () => {
            console.log('🔌 Browser disconnected');
            this.isInitialized = false;
        });
    }

    /**
     * Generate realistic viewport
     */
    generateRealisticViewport() {
        const commonResolutions = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 },
            { width: 1600, height: 900 }
        ];

        return commonResolutions[Math.floor(Math.random() * commonResolutions.length)];
    }

    /**
     * Generate realistic user agent
     */
    generateRealisticUserAgent() {
        const chromeVersions = ['119.0.0.0', '120.0.0.0', '121.0.0.0', '122.0.0.0'];
        const windowsVersions = ['10.0', '11.0'];

        const chromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
        const windowsVersion = windowsVersions[Math.floor(Math.random() * windowsVersions.length)];

        return `Mozilla/5.0 (Windows NT ${windowsVersion}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    }

    /**
     * Get random timezone
     */
    getRandomTimezone() {
        const timezones = [
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Phoenix',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin'
        ];

        return timezones[Math.floor(Math.random() * timezones.length)];
    }

    /**
     * Generate realistic location
     */
    generateLocation() {
        const locations = [
            { latitude: 40.7128, longitude: -74.0060 }, // New York
            { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
            { latitude: 41.8781, longitude: -87.6298 }, // Chicago
            { latitude: 29.7604, longitude: -95.3698 }, // Houston
            { latitude: 33.4484, longitude: -112.0740 }, // Phoenix
            { latitude: 39.9526, longitude: -75.1652 }, // Philadelphia
            { latitude: 29.4241, longitude: -98.4936 }, // San Antonio
            { latitude: 32.7767, longitude: -96.7970 } // Dallas
        ];

        return locations[Math.floor(Math.random() * locations.length)];
    }

    /**
     * Generate browser fingerprint
     */
    generateFingerprint() {
        return {
            id: crypto.randomUUID(),
            userAgent: this.options.userAgent,
            viewport: this.options.viewport,
            timezone: this.options.timezone,
            locale: this.options.locale,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Close page and cleanup resources
     */
    async closePage(pageId) {
        const pageData = this.pages.get(pageId);
        if (!pageData) return;

        try {
            await pageData.page.close();
            this.pages.delete(pageId);
            this.resourceStats.pagesActive--;

            // Remove from context's page set
            const contextData = this.contexts.get(pageData.contextId);
            if (contextData) {
                contextData.pages.delete(pageId);
            }

            console.log(`📄 Page closed: ${pageId}`);
        } catch (error) {
            console.error(`⚠️ Error closing page ${pageId}:`, error.message);
        }
    }

    /**
     * Close context and all its pages
     */
    async closeContext(contextId) {
        const contextData = this.contexts.get(contextId);
        if (!contextData) return;

        try {
            // Close all pages in this context
            for (const pageId of contextData.pages) {
                await this.closePage(pageId);
            }

            await contextData.context.close();
            this.contexts.delete(contextId);
            this.resourceStats.contextsActive--;

            console.log(`🛡️ Context closed: ${contextId}`);
        } catch (error) {
            console.error(`⚠️ Error closing context ${contextId}:`, error.message);
        }
    }

    /**
     * Get browser instance
     */
    getBrowser() {
        this.ensureInitialized();
        return this.browser;
    }

    /**
     * Get page by ID
     */
    getPage(pageId) {
        const pageData = this.pages.get(pageId);
        return pageData ? pageData.page : null;
    }

    /**
     * Get context by ID
     */
    getContext(contextId) {
        const contextData = this.contexts.get(contextId);
        return contextData ? contextData.context : null;
    }

    /**
     * Test browser capabilities
     */
    async testCapabilities() {
        this.ensureInitialized();

        try {
            const { pageId, page } = await this.createStealthPage();

            // Test navigation
            await page.goto('https://httpbin.org/user-agent', { timeout: 10000 });
            const userAgent = await page.textContent('pre');

            // Test stealth features
            const stealthTest = await page.evaluate(() => {
                return {
                    webdriver: navigator.webdriver,
                    plugins: navigator.plugins.length,
                    languages: navigator.languages.length,
                    hardwareConcurrency: navigator.hardwareConcurrency
                };
            });

            await this.closePage(pageId);

            return {
                success: true,
                userAgent: userAgent,
                stealthFeatures: stealthTest
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.resourceStats,
            isInitialized: this.isInitialized,
            fingerprint: this.fingerprint?.id,
            stealthLevel: this.options.stealthLevel
        };
    }

    /**
     * Cleanup all resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up browser manager...');

        try {
            // Close all pages
            const pagePromises = Array.from(this.pages.keys()).map(pageId => this.closePage(pageId));
            await Promise.all(pagePromises);

            // Close all contexts
            const contextPromises = Array.from(this.contexts.keys()).map(contextId => this.closeContext(contextId));
            await Promise.all(contextPromises);

            // Close browser
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            this.isInitialized = false;
            console.log('✅ Browser manager cleanup complete');

        } catch (error) {
            console.error('❌ Browser manager cleanup error:', error.message);
        }
    }

    /**
     * Utility methods
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Browser manager not initialized. Call initialize() first.');
        }
    }
}

module.exports = BrowserManager;