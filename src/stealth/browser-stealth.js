/**
 * Advanced Browser Stealth System
 * Comprehensive anti-detection measures for survey registration
 */

const { chromium } = require('playwright');
const crypto = require('crypto');

class BrowserStealth {
    constructor(options = {}) {
        this.options = {
            userAgent: options.userAgent || this.generateRealisticUserAgent(),
            viewport: options.viewport || this.generateRealisticViewport(),
            timezone: options.timezone || this.getRandomTimezone(),
            locale: options.locale || 'en-US,en;q=0.9',
            platform: options.platform || 'Win32',
            hardwareConcurrency: options.hardwareConcurrency || Math.floor(Math.random() * 8) + 4,
            deviceMemory: options.deviceMemory || [4, 8, 16][Math.floor(Math.random() * 3)],
            colorDepth: options.colorDepth || 24,
            pixelRatio: options.pixelRatio || 1,
            webgl: options.webgl !== false,
            canvas: options.canvas !== false,
            audio: options.audio !== false,
            ...options
        };
        
        this.fingerprint = this.generateFingerprint();
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
     * Generate browser fingerprint
     */
    generateFingerprint() {
        return {
            id: crypto.randomUUID(),
            userAgent: this.options.userAgent,
            viewport: this.options.viewport,
            timezone: this.options.timezone,
            locale: this.options.locale,
            platform: this.options.platform,
            hardwareConcurrency: this.options.hardwareConcurrency,
            deviceMemory: this.options.deviceMemory,
            colorDepth: this.options.colorDepth,
            pixelRatio: this.options.pixelRatio,
            canvas: this.generateCanvasFingerprint(),
            webgl: this.generateWebGLFingerprint(),
            audio: this.generateAudioFingerprint(),
            fonts: this.generateFontList(),
            plugins: this.generatePluginList(),
            createdAt: new Date().toISOString()
        };
    }
    
    /**
     * Generate canvas fingerprint
     */
    generateCanvasFingerprint() {
        if (!this.options.canvas) return null;
        
        // Generate realistic canvas fingerprint variations
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
        if (!this.options.webgl) return null;
        
        const renderers = [
            'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)'
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
        if (!this.options.audio) return null;
        
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
        const commonFonts = [
            'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS',
            'Courier New', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
            'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI', 'Tahoma',
            'Times New Roman', 'Trebuchet MS', 'Verdana'
        ];
        
        // Return 12-16 fonts randomly
        const count = Math.floor(Math.random() * 5) + 12;
        return commonFonts.sort(() => Math.random() - 0.5).slice(0, count);
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
     * Create stealth browser instance
     */
    async createBrowser(options = {}) {
        console.log('🥷 Creating stealth browser instance...');
        
        const launchOptions = {
            headless: options.headless !== false,
            args: [
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
            ]
        };
        
        const browser = await chromium.launch(launchOptions);
        console.log('✅ Stealth browser created');
        
        return browser;
    }
    
    /**
     * Create stealth page with all countermeasures
     */
    async createStealthPage(browser) {
        console.log('🛡️ Setting up stealth page...');
        
        const context = await browser.newContext({
            viewport: this.options.viewport,
            userAgent: this.options.userAgent,
            locale: this.options.locale,
            timezoneId: this.options.timezone,
            permissions: ['geolocation', 'notifications'],
            geolocation: this.generateLocation(),
            deviceScaleFactor: this.options.pixelRatio
        });
        
        const page = await context.newPage();
        
        // Inject stealth scripts
        await this.injectStealthScripts(page);
        
        // Set additional headers
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': this.options.locale,
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        });
        
        console.log('✅ Stealth page configured');
        return page;
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
     * Inject stealth scripts to avoid detection
     */
    async injectStealthScripts(page) {
        // Remove webdriver traces
        await page.addInitScript(() => {
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Remove automation flags
            delete window.chrome.runtime.onConnect;
            
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
            
            // Override hardwareConcurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8,
            });
            
            // Override deviceMemory
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });
            
            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Mock screen properties
            Object.defineProperty(screen, 'colorDepth', {
                get: () => 24,
            });
            
            Object.defineProperty(screen, 'pixelDepth', {
                get: () => 24,
            });
        });
        
        // Canvas fingerprint protection
        await page.addInitScript(() => {
            const getImageData = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                if (type === 'image/png') {
                    // Add slight noise to canvas fingerprint
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
        await page.addInitScript(() => {
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
        await page.addInitScript(() => {
            const originalGetChannelData = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function() {
                const results = originalGetChannelData.apply(this, arguments);
                // Add slight noise to audio fingerprint
                for (let i = 0; i < results.length; i++) {
                    results[i] += (Math.random() - 0.5) * 0.0001;
                }
                return results;
            };
        });
    }
    
    /**
     * Get current fingerprint
     */
    getFingerprint() {
        return this.fingerprint;
    }
    
    /**
     * Generate new fingerprint
     */
    regenerateFingerprint() {
        this.fingerprint = this.generateFingerprint();
        return this.fingerprint;
    }
}

module.exports = BrowserStealth;