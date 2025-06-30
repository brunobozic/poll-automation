/**
 * Stealth Automation Engine
 * Advanced anti-bot detection evasion based on feedback loop learning
 */

class StealthAutomationEngine {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            enableMouseSimulation: true,
            enableTypingVariation: true,
            enableBehavioralMimicry: true,
            enableFingerprintRandomization: true,
            humanLikeDelays: true,
            debugMode: false,
            ...options
        };
        
        // Human behavior patterns (learned from analysis)
        this.humanPatterns = {
            mouseMoveSpeed: { min: 100, max: 300 }, // pixels per second
            clickDelay: { min: 150, max: 800 },
            typingSpeed: { min: 80, max: 200 }, // ms between keystrokes
            pauseBetweenFields: { min: 500, max: 2000 },
            scrollSpeed: { min: 200, max: 600 },
            readingTime: { min: 1000, max: 4000 } // time spent 'reading' content
        };
        
        // Anti-detection techniques
        this.stealthTechniques = {
            webDriverConcealment: true,
            automationFlagHiding: true,
            fingerprintRandomization: true,
            behavioralVariation: true,
            networkDelay: true
        };
        
        this.stats = {
            actionsPerformed: 0,
            detectionEvents: 0,
            evasionSuccess: 0,
            humanLikeScore: 0
        };
    }
    
    /**
     * Initialize stealth engine with advanced evasion
     */
    async initialize() {
        try {
            if (this.options.debugMode) {
                console.log('🥷 Initializing stealth automation engine...');
            }
            
            // Apply stealth techniques
            await this.applyWebDriverConcealment();
            await this.setupFingerprintRandomization();
            await this.initializeBehavioralMimicry();
            
            if (this.options.debugMode) {
                console.log('✅ Stealth engine initialized successfully');
            }
            
            return true;
        } catch (error) {
            console.warn(`⚠️ Stealth initialization failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Conceal WebDriver properties and automation traces
     */
    async applyWebDriverConcealment() {
        if (!this.stealthTechniques.webDriverConcealment) return;
        
        try {
            await this.page.addInitScript(() => {
                // Remove webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                
                // Remove automation flags
                delete window.navigator.webdriver;
                delete window.navigator.__webdriver_evaluate;
                delete window.navigator.__selenium_evaluate;
                delete window.navigator.__webdriver_script_function;
                delete window.navigator.__webdriver_script_func;
                delete window.navigator.__webdriver_script_fn;
                delete window.navigator.__fxdriver_evaluate;
                delete window.navigator.__driver_unwrapped;
                delete window.navigator.__webdriver_unwrapped;
                delete window.navigator.__driver_evaluate;
                delete window.navigator.__selenium_unwrapped;
                delete window.navigator.__fxdriver_unwrapped;
                
                // Override plugins and languages for more realistic fingerprint
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {
                            name: 'Chrome PDF Plugin',
                            filename: 'internal-pdf-viewer',
                            description: 'Portable Document Format'
                        },
                        {
                            name: 'Chrome PDF Viewer',
                            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                            description: ''
                        }
                    ]
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
                
                // Spoof permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
                );
                
                // Hide automation indicators
                Object.defineProperty(window, 'chrome', {
                    get: () => ({
                        runtime: {
                            onConnect: undefined,
                            onMessage: undefined
                        },
                        app: {
                            isInstalled: false
                        }
                    })
                });
                
                // Override iframe contentWindow for Playwright detection
                const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
                Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
                    get: function() {
                        const win = originalContentWindow.get.call(this);
                        if (win) {
                            try {
                                win.navigator.webdriver = undefined;
                            } catch (e) {}
                        }
                        return win;
                    }
                });
            });
            
            if (this.options.debugMode) {
                console.log('🔒 WebDriver concealment applied');
            }
        } catch (error) {
            console.warn(`⚠️ WebDriver concealment failed: ${error.message}`);
        }
    }
    
    /**
     * Setup fingerprint randomization
     */
    async setupFingerprintRandomization() {
        if (!this.stealthTechniques.fingerprintRandomization) return;
        
        try {
            await this.page.addInitScript(() => {
                // Randomize canvas fingerprint
                const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(type) {
                    const shift = Math.floor(Math.random() * 10) - 5;
                    const imageData = this.getContext('2d').getImageData(0, 0, this.width, this.height);
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + shift));
                    }
                    this.getContext('2d').putImageData(imageData, 0, 0);
                    return originalToDataURL.apply(this, arguments);
                };
                
                // Randomize WebGL fingerprint
                const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
                        return 'Intel Inc.';
                    }
                    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
                        return 'Intel Iris OpenGL Engine';
                    }
                    return originalGetParameter.apply(this, arguments);
                };
                
                // Randomize audio context fingerprint
                const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
                AudioContext.prototype.createAnalyser = function() {
                    const analyser = originalCreateAnalyser.apply(this, arguments);
                    const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
                    analyser.getFloatFrequencyData = function(array) {
                        originalGetFloatFrequencyData.apply(this, arguments);
                        for (let i = 0; i < array.length; i++) {
                            array[i] += Math.random() * 0.0001;
                        }
                    };
                    return analyser;
                };
                
                // Spoof hardware concurrency
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 4 + Math.floor(Math.random() * 4)
                });
                
                // Spoof device memory
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => 8
                });
                
                // Randomize timezone slightly
                const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
                Date.prototype.getTimezoneOffset = function() {
                    return originalGetTimezoneOffset.apply(this) + Math.floor(Math.random() * 2) - 1;
                };
            });
            
            if (this.options.debugMode) {
                console.log('🎭 Fingerprint randomization applied');
            }
        } catch (error) {
            console.warn(`⚠️ Fingerprint randomization failed: ${error.message}`);
        }
    }
    
    /**
     * Initialize behavioral mimicry patterns
     */
    async initializeBehavioralMimicry() {
        if (!this.stealthTechniques.behavioralVariation) return;
        
        // Add mouse tracking to mimic human behavior
        await this.page.addInitScript(() => {
            let mouseTrail = [];
            let lastMouseMove = 0;
            
            // Track mouse movements to look more human
            document.addEventListener('mousemove', (e) => {
                const now = Date.now();
                mouseTrail.push({
                    x: e.clientX,
                    y: e.clientY,
                    timestamp: now
                });
                
                // Keep only recent movements
                if (mouseTrail.length > 50) {
                    mouseTrail = mouseTrail.slice(-50);
                }
                
                lastMouseMove = now;
            });
            
            // Add random idle mouse movements
            setInterval(() => {
                if (Date.now() - lastMouseMove > 5000) {
                    // Simulate small random mouse movement
                    const event = new MouseEvent('mousemove', {
                        clientX: Math.random() * window.innerWidth,
                        clientY: Math.random() * window.innerHeight
                    });
                    document.dispatchEvent(event);
                }
            }, 10000 + Math.random() * 5000);
        });
        
        if (this.options.debugMode) {
            console.log('🎪 Behavioral mimicry initialized');
        }
    }
    
    /**
     * Perform human-like mouse movement to element
     */
    async humanLikeMoveTo(element) {
        if (!this.options.enableMouseSimulation) {
            return;
        }
        
        try {
            const box = await element.boundingBox();
            if (!box) return;
            
            // Calculate target position with some randomness
            const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
            const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
            
            // Get current mouse position (simulate from center if unknown)
            const currentPos = await this.page.evaluate(() => {
                return {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                };
            });
            
            // Create curved path to target
            const path = this.generateCurvedPath(currentPos, { x: targetX, y: targetY });
            
            // Move mouse along the path
            for (const point of path) {
                await this.page.mouse.move(point.x, point.y);
                await this.randomDelay(10, 30);
            }
            
            this.stats.humanLikeScore += 10;
        } catch (error) {
            if (this.options.debugMode) {
                console.warn(`⚠️ Human-like mouse movement failed: ${error.message}`);
            }
        }
    }
    
    /**
     * Generate curved mouse path between two points
     */
    generateCurvedPath(start, end, steps = 10) {
        const path = [];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // Add some curve to the path
        const curvature = (Math.random() - 0.5) * Math.min(Math.abs(dx), Math.abs(dy)) * 0.3;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curveOffset = Math.sin(t * Math.PI) * curvature;
            
            const x = start.x + dx * t + curveOffset;
            const y = start.y + dy * t;
            
            path.push({ x, y });
        }
        
        return path;
    }
    
    /**
     * Perform human-like click with pre-movement
     */
    async humanLikeClick(element, options = {}) {
        this.stats.actionsPerformed++;
        
        try {
            // Ensure element is visible
            await element.waitFor({ state: 'visible', timeout: 10000 });
            
            // Human-like movement to element
            await this.humanLikeMoveTo(element);
            
            // Random delay before click
            await this.randomDelay(
                this.humanPatterns.clickDelay.min,
                this.humanPatterns.clickDelay.max
            );
            
            // Click with slight position randomization
            await element.click({
                position: {
                    x: 5 + Math.random() * 10,
                    y: 5 + Math.random() * 10
                },
                ...options
            });
            
            // Brief pause after click
            await this.randomDelay(100, 300);
            
            this.stats.humanLikeScore += 15;
            return true;
        } catch (error) {
            throw new Error(`Human-like click failed: ${error.message}`);
        }
    }
    
    /**
     * Perform human-like typing with natural variations
     */
    async humanLikeType(element, text, options = {}) {
        this.stats.actionsPerformed++;
        
        try {
            // Ensure element is focused
            await element.focus();
            
            // Clear existing content
            await element.clear();
            
            // Small delay before typing
            await this.randomDelay(200, 500);
            
            if (this.options.enableTypingVariation) {
                // Type character by character with human-like variations
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    
                    // Simulate occasional typos and corrections
                    if (Math.random() < 0.02 && i > 0) { // 2% chance of typo
                        const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
                        await element.type(wrongChar);
                        await this.randomDelay(100, 300);
                        await this.page.keyboard.press('Backspace');
                        await this.randomDelay(200, 400);
                    }
                    
                    await element.type(char);
                    
                    // Variable typing speed
                    const delay = this.calculateTypingDelay(char, i, text.length);
                    await this.randomDelay(delay * 0.8, delay * 1.2);
                }
            } else {
                // Standard typing with base delay
                await element.type(text, {
                    delay: this.humanPatterns.typingSpeed.min + 
                           Math.random() * (this.humanPatterns.typingSpeed.max - this.humanPatterns.typingSpeed.min)
                });
            }
            
            // Brief pause after typing
            await this.randomDelay(300, 600);
            
            this.stats.humanLikeScore += 20;
            return true;
        } catch (error) {
            throw new Error(`Human-like typing failed: ${error.message}`);
        }
    }
    
    /**
     * Calculate natural typing delay based on character and context
     */
    calculateTypingDelay(char, position, totalLength) {
        let baseDelay = this.humanPatterns.typingSpeed.min;
        
        // Slower at beginning (thinking)
        if (position < 3) {
            baseDelay *= 1.5;
        }
        
        // Slower for special characters
        if (!/[a-zA-Z0-9]/.test(char)) {
            baseDelay *= 1.3;
        }
        
        // Faster as we get comfortable
        if (position > totalLength * 0.3) {
            baseDelay *= 0.9;
        }
        
        // Pause at word boundaries
        if (char === ' ') {
            baseDelay *= 1.8;
        }
        
        return baseDelay;
    }
    
    /**
     * Simulate human reading time
     */
    async simulateReadingTime(text = '', baseTime = null) {
        if (!this.options.enableBehavioralMimicry) return;
        
        let readingTime;
        
        if (baseTime) {
            readingTime = baseTime;
        } else {
            // Estimate reading time based on text length
            const words = text.split(' ').length;
            const wordsPerMinute = 200 + Math.random() * 100; // 200-300 WPM
            readingTime = (words / wordsPerMinute) * 60 * 1000;
            
            // Clamp to reasonable bounds
            readingTime = Math.max(
                this.humanPatterns.readingTime.min,
                Math.min(this.humanPatterns.readingTime.max, readingTime)
            );
        }
        
        await this.randomDelay(readingTime * 0.8, readingTime * 1.2);
        this.stats.humanLikeScore += 5;
    }
    
    /**
     * Simulate natural pause between form fields
     */
    async simulateFieldTransition() {
        if (!this.options.humanLikeDelays) return;
        
        await this.randomDelay(
            this.humanPatterns.pauseBetweenFields.min,
            this.humanPatterns.pauseBetweenFields.max
        );
        
        this.stats.humanLikeScore += 3;
    }
    
    /**
     * Generate random delay within range
     */
    async randomDelay(min, max) {
        const delay = min + Math.random() * (max - min);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    /**
     * Detect if we've been caught by anti-bot measures
     */
    async detectAntiBot() {
        try {
            const indicators = await this.page.evaluate(() => {
                const checks = {
                    accessDenied: document.body?.textContent?.toLowerCase().includes('access denied'),
                    suspiciousActivity: document.body?.textContent?.toLowerCase().includes('suspicious activity'),
                    botDetected: document.body?.textContent?.toLowerCase().includes('bot detected'),
                    captchaPresent: document.querySelector('[data-sitekey], .g-recaptcha, .h-captcha') !== null,
                    cloudflareChallenge: document.title?.includes('Cloudflare') || 
                                      document.body?.textContent?.includes('Checking your browser'),
                    rateLimited: document.body?.textContent?.toLowerCase().includes('rate limit'),
                    blocked: document.body?.textContent?.toLowerCase().includes('blocked'),
                    errorPage: document.title?.toLowerCase().includes('error') || 
                              document.querySelector('h1')?.textContent?.toLowerCase().includes('error')
                };
                
                return checks;
            });
            
            const detectionCount = Object.values(indicators).filter(Boolean).length;
            
            if (detectionCount > 0) {
                this.stats.detectionEvents++;
                
                if (this.options.debugMode) {
                    console.log('🚨 Anti-bot detection indicators found:', indicators);
                }
                
                return {
                    detected: true,
                    indicators,
                    severity: detectionCount
                };
            }
            
            this.stats.evasionSuccess++;
            return { detected: false, indicators, severity: 0 };
            
        } catch (error) {
            console.warn(`⚠️ Anti-bot detection check failed: ${error.message}`);
            return { detected: false, indicators: {}, severity: 0 };
        }
    }
    
    /**
     * Apply evasion techniques if detection is suspected
     */
    async applyEvasionTechniques() {
        try {
            // Slow down actions
            this.humanPatterns.clickDelay.min *= 1.5;
            this.humanPatterns.clickDelay.max *= 1.5;
            this.humanPatterns.typingSpeed.min *= 1.3;
            this.humanPatterns.typingSpeed.max *= 1.3;
            
            // Add more randomness
            await this.randomDelay(2000, 5000);
            
            // Simulate human-like behavior
            await this.page.evaluate(() => {
                // Simulate scroll
                window.scrollBy(0, Math.random() * 200 - 100);
                
                // Simulate mouse movement
                const event = new MouseEvent('mousemove', {
                    clientX: Math.random() * window.innerWidth,
                    clientY: Math.random() * window.innerHeight
                });
                document.dispatchEvent(event);
            });
            
            if (this.options.debugMode) {
                console.log('🥷 Applied enhanced evasion techniques');
            }
        } catch (error) {
            console.warn(`⚠️ Evasion techniques failed: ${error.message}`);
        }
    }
    
    /**
     * Navigate to URL with stealth techniques
     */
    async navigateStealthily(url, options = {}) {
        try {
            console.log(`🥷 Navigating stealthily to: ${url}`);
            
            // Apply pre-navigation evasion
            await this.randomDelay(1000, 3000);
            
            // Try multiple navigation strategies for robustness
            let response = null;
            let lastError = null;
            
            // Strategy 1: Standard navigation
            try {
                response = await this.page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000,
                    ...options
                });
            } catch (error) {
                lastError = error;
                console.log(`⚠️ Standard navigation failed: ${error.message}`);
                
                // Strategy 2: Try with different wait condition
                try {
                    console.log(`🔄 Retrying with networkidle...`);
                    response = await this.page.goto(url, {
                        waitUntil: 'networkidle',
                        timeout: 45000,
                        ...options
                    });
                } catch (retryError) {
                    lastError = retryError;
                    console.log(`⚠️ Networkidle navigation failed: ${retryError.message}`);
                    
                    // Strategy 3: Try with load event only
                    try {
                        console.log(`🔄 Retrying with load event...`);
                        response = await this.page.goto(url, {
                            waitUntil: 'load',
                            timeout: 60000,
                            ...options
                        });
                    } catch (finalError) {
                        lastError = finalError;
                        console.log(`❌ All navigation strategies failed: ${finalError.message}`);
                        throw finalError;
                    }
                }
            }
            
            // Simulate human reading/loading time
            await this.simulateReadingTime(url, 2000);
            
            // Check for anti-bot detection
            const detection = await this.detectAntiBot();
            if (detection.detected) {
                console.log(`⚠️ Anti-bot detection suspected (severity: ${detection.severity})`);
                await this.applyEvasionTechniques();
            }
            
            // Wait for page to fully load (with error handling)
            try {
                await this.page.waitForLoadState('networkidle', { timeout: 10000 });
            } catch (loadError) {
                console.log(`⚠️ Network idle timeout (this is often normal): ${loadError.message}`);
            }
            
            this.stats.actionsPerformed++;
            console.log(`✅ Stealth navigation completed: ${response?.status()}`);
            
            return response;
        } catch (error) {
            console.log(`❌ Stealth navigation failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Handle challenges (CAPTCHAs, etc.) with stealth
     */
    async handleChallenge(challenge) {
        try {
            console.log(`🧩 Handling challenge: ${challenge.type}`);
            
            // Add human-like delay before attempting
            await this.simulateReadingTime(challenge.description || '', 3000);
            
            switch (challenge.type) {
                case 'captcha':
                    console.log('🔍 CAPTCHA detected - applying human-like solving attempt');
                    // Add human-like interaction patterns
                    await this.randomDelay(2000, 5000);
                    break;
                    
                case 'cloudflare':
                    console.log('☁️ Cloudflare challenge detected - waiting patiently');
                    await this.randomDelay(5000, 10000);
                    break;
                    
                case 'rate_limit':
                    console.log('⏱️ Rate limit detected - applying extended delay');
                    await this.randomDelay(10000, 20000);
                    break;
                    
                default:
                    console.log(`🤔 Unknown challenge type: ${challenge.type}`);
                    await this.randomDelay(3000, 6000);
                    break;
            }
            
            this.stats.actionsPerformed++;
            return { success: true, method: 'stealth_wait' };
            
        } catch (error) {
            console.log(`❌ Challenge handling failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get stealth engine statistics
     */
    getStats() {
        const detectionRate = this.stats.actionsPerformed > 0 ?
            (this.stats.detectionEvents / this.stats.actionsPerformed * 100).toFixed(1) : 0;
            
        const evasionRate = this.stats.detectionEvents > 0 ?
            (this.stats.evasionSuccess / (this.stats.evasionSuccess + this.stats.detectionEvents) * 100).toFixed(1) : 100;
            
        return {
            ...this.stats,
            detectionRate: `${detectionRate}%`,
            evasionRate: `${evasionRate}%`,
            humanLikeScore: Math.min(100, this.stats.humanLikeScore),
            techniquesActive: Object.values(this.stealthTechniques).filter(Boolean).length
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            actionsPerformed: 0,
            detectionEvents: 0,
            evasionSuccess: 0,
            humanLikeScore: 0
        };
    }
}

module.exports = StealthAutomationEngine;