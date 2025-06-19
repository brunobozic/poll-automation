/**
 * Intelligent Countermeasures System
 * AI-powered implementation of anti-detection strategies
 */

class IntelligentCountermeasures {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            aggressiveness: options.aggressiveness || 'high', // low, medium, high, maximum
            adaptiveMode: options.adaptiveMode !== false,
            learningEnabled: options.learningEnabled !== false,
            ...options
        };
        
        this.humanBehaviorAI = new HumanBehaviorAI();
        this.fingerprintSpoofer = new AdvancedFingerprintSpoofer();
        this.timingController = new AdaptiveTimingController();
        this.mlCountermeasures = new MLCountermeasures();
        
        this.activeCountermeasures = new Set();
        this.behaviorProfile = null;
        this.initialized = false;
    }
    
    /**
     * Initialize countermeasures system
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('🛡️ Initializing Intelligent Countermeasures...');
        
        // Initialize AI components
        await this.humanBehaviorAI.initialize();
        await this.fingerprintSpoofer.initialize();
        await this.timingController.initialize();
        await this.mlCountermeasures.initialize();
        
        // Generate behavior profile
        this.behaviorProfile = await this.generateBehaviorProfile();
        
        // Inject base stealth scripts
        await this.injectBaseStealthScripts();
        
        this.initialized = true;
        console.log('✅ Intelligent Countermeasures initialized');
    }
    
    /**
     * Apply countermeasures for detected protections
     */
    async applyCountermeasures(detectedProtections) {
        console.log(`🔧 Applying countermeasures for ${detectedProtections.length} protections`);
        
        for (const protection of detectedProtections) {
            try {
                await this.applySpecificCountermeasure(protection);
                this.activeCountermeasures.add(protection.type);
            } catch (error) {
                console.error(`Failed to apply countermeasure for ${protection.type}:`, error.message);
            }
        }
        
        console.log(`✅ Applied countermeasures for ${this.activeCountermeasures.size} protection types`);
    }
    
    /**
     * Apply specific countermeasure
     */
    async applySpecificCountermeasure(protection) {
        switch (protection.type) {
            case 'mouse_tracking':
            case 'mouse_tracking_active':
                await this.implementMouseTrackingCountermeasures();
                break;
                
            case 'keystroke_dynamics':
            case 'keyboard_tracking_active':
                await this.implementKeystrokeCountermeasures();
                break;
                
            case 'canvas_fingerprinting':
                await this.implementCanvasCountermeasures();
                break;
                
            case 'webgl_fingerprinting':
                await this.implementWebGLCountermeasures();
                break;
                
            case 'audio_fingerprinting':
                await this.implementAudioCountermeasures();
                break;
                
            case 'headless_detection':
                await this.implementHeadlessCountermeasures();
                break;
                
            case 'automation_detection':
                await this.implementAutomationCountermeasures();
                break;
                
            case 'cloudflare_bot_management':
                await this.implementCloudflareCountermeasures();
                break;
                
            case 'ml_behavioral_analysis':
                await this.implementMLCountermeasures();
                break;
                
            case 'timing_analysis_active':
                await this.implementTimingCountermeasures();
                break;
                
            default:
                console.log(`⚠️ No specific countermeasure for: ${protection.type}`);
        }
    }
    
    /**
     * Mouse tracking countermeasures
     */
    async implementMouseTrackingCountermeasures() {
        console.log('🖱️ Implementing mouse tracking countermeasures...');
        
        await this.page.addInitScript(() => {
            // Override mouse event properties with realistic variance
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            const mouseEvents = new Map();
            let lastMouseEvent = { x: 0, y: 0, timestamp: Date.now() };
            
            // Generate realistic mouse movement patterns
            function generateRealisticMouseData(originalEvent) {
                const now = Date.now();
                const timeDelta = now - lastMouseEvent.timestamp;
                
                // Calculate realistic velocity and acceleration
                const distance = Math.sqrt(
                    Math.pow(originalEvent.clientX - lastMouseEvent.x, 2) +
                    Math.pow(originalEvent.clientY - lastMouseEvent.y, 2)
                );
                
                const velocity = timeDelta > 0 ? distance / timeDelta : 0;
                const acceleration = Math.random() * 0.1 + 0.9; // 0.9-1.0 realistic range
                
                // Add human-like noise and imperfection
                const noise = {
                    x: (Math.random() - 0.5) * 2, // ±1 pixel noise
                    y: (Math.random() - 0.5) * 2
                };
                
                const humanizedEvent = {
                    ...originalEvent,
                    clientX: originalEvent.clientX + noise.x,
                    clientY: originalEvent.clientY + noise.y,
                    movementX: originalEvent.movementX + noise.x * 0.5,
                    movementY: originalEvent.movementY + noise.y * 0.5,
                    velocity: velocity,
                    acceleration: acceleration,
                    pressure: Math.random() * 0.1 + 0.5, // Simulated pressure
                    timestamp: now
                };
                
                lastMouseEvent = {
                    x: humanizedEvent.clientX,
                    y: humanizedEvent.clientY,
                    timestamp: now
                };
                
                return humanizedEvent;
            }
            
            // Intercept and modify mouse events
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (type.includes('mouse') || type.includes('pointer')) {
                    const wrappedListener = function(event) {
                        const enhancedEvent = generateRealisticMouseData(event);
                        return listener.call(this, enhancedEvent);
                    };
                    return originalAddEventListener.call(this, type, wrappedListener, options);
                }
                return originalAddEventListener.call(this, type, listener, options);
            };
            
            // Inject realistic mouse path generation
            window.generateMousePath = function(startX, startY, endX, endY, duration) {
                const points = [];
                const steps = Math.max(10, Math.floor(duration / 16)); // 60fps
                
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    
                    // Use Bezier curves for natural movement
                    const controlX = startX + (endX - startX) * 0.5 + (Math.random() - 0.5) * 50;
                    const controlY = startY + (endY - startY) * 0.5 + (Math.random() - 0.5) * 50;
                    
                    const x = Math.pow(1-t, 2) * startX + 2*(1-t)*t * controlX + Math.pow(t, 2) * endX;
                    const y = Math.pow(1-t, 2) * startY + 2*(1-t)*t * controlY + Math.pow(t, 2) * endY;
                    
                    points.push({
                        x: x + (Math.random() - 0.5) * 2, // Add noise
                        y: y + (Math.random() - 0.5) * 2,
                        timestamp: Date.now() + (i * 16)
                    });
                }
                
                return points;
            };
        });
    }
    
    /**
     * Keystroke dynamics countermeasures
     */
    async implementKeystrokeCountermeasures() {
        console.log('⌨️ Implementing keystroke dynamics countermeasures...');
        
        await this.page.addInitScript(() => {
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            const keystrokeProfiles = {
                // Different typing profiles to mimic human variance
                careful: { baseSpeed: 150, variance: 30, errorRate: 0.02 },
                average: { baseSpeed: 200, variance: 50, errorRate: 0.04 },
                fast: { baseSpeed: 280, variance: 80, errorRate: 0.06 }
            };
            
            const currentProfile = keystrokeProfiles.average;
            let keystrokeHistory = [];
            
            function generateRealisticKeystroke(originalEvent) {
                const now = performance.now();
                const character = originalEvent.key;
                
                // Calculate realistic timing based on character type
                let baseDelay = 60000 / (currentProfile.baseSpeed * 5); // Convert WPM to ms per character
                
                // Adjust for character complexity
                if (/[A-Z]/.test(character)) baseDelay *= 1.2; // Capitals are slower
                if (/[0-9]/.test(character)) baseDelay *= 1.3; // Numbers are slower
                if (/[^a-zA-Z0-9]/.test(character)) baseDelay *= 1.4; // Special chars are slower
                
                // Add human-like variance
                const variance = (Math.random() - 0.5) * currentProfile.variance;
                const finalDelay = Math.max(50, baseDelay + variance);
                
                // Simulate dwell time (key press duration)
                const dwellTime = Math.random() * 50 + 30; // 30-80ms
                
                // Flight time (time between keystrokes)
                const lastKeystroke = keystrokeHistory[keystrokeHistory.length - 1];
                const flightTime = lastKeystroke ? now - lastKeystroke.timestamp : 0;
                
                const keystrokeData = {
                    character: character,
                    timestamp: now,
                    dwellTime: dwellTime,
                    flightTime: flightTime,
                    velocity: flightTime > 0 ? 1000 / flightTime : 0,
                    rhythm: calculateRhythm(keystrokeHistory)
                };
                
                keystrokeHistory.push(keystrokeData);
                if (keystrokeHistory.length > 50) {
                    keystrokeHistory = keystrokeHistory.slice(-30); // Keep last 30
                }
                
                return keystrokeData;
            }
            
            function calculateRhythm(history) {
                if (history.length < 3) return 1.0;
                
                const recentFlightTimes = history.slice(-5).map(k => k.flightTime);
                const average = recentFlightTimes.reduce((a, b) => a + b, 0) / recentFlightTimes.length;
                const variance = recentFlightTimes.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / recentFlightTimes.length;
                
                return Math.sqrt(variance) / average; // Coefficient of variation
            }
            
            // Intercept keyboard events
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (type.includes('key')) {
                    const wrappedListener = function(event) {
                        const keystrokeData = generateRealisticKeystroke(event);
                        // Add keystroke data to event for analysis evasion
                        event.keystrokeAnalysis = keystrokeData;
                        return listener.call(this, event);
                    };
                    return originalAddEventListener.call(this, type, wrappedListener, options);
                }
                return originalAddEventListener.call(this, type, listener, options);
            };
        });
    }
    
    /**
     * Canvas fingerprinting countermeasures
     */
    async implementCanvasCountermeasures() {
        console.log('🎨 Implementing canvas fingerprinting countermeasures...');
        
        await this.page.addInitScript(() => {
            // Canvas noise injection
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            
            function addCanvasNoise(imageData) {
                const data = imageData.data;
                const noiseLevel = 1; // Very subtle noise
                
                for (let i = 0; i < data.length; i += 4) {
                    // Add minimal noise to RGB values
                    if (Math.random() < 0.1) { // Only 10% of pixels
                        const noise = Math.floor((Math.random() - 0.5) * noiseLevel);
                        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
                        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
                        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
                        // Alpha channel (i + 3) remains unchanged
                    }
                }
                
                return imageData;
            }
            
            HTMLCanvasElement.prototype.toDataURL = function(...args) {
                // Add subtle noise before converting to data URL
                const ctx = this.getContext('2d');
                if (ctx) {
                    const imageData = ctx.getImageData(0, 0, this.width, this.height);
                    const noisyImageData = addCanvasNoise(imageData);
                    ctx.putImageData(noisyImageData, 0, 0);
                }
                return originalToDataURL.apply(this, args);
            };
            
            CanvasRenderingContext2D.prototype.getImageData = function(...args) {
                const imageData = originalGetImageData.apply(this, args);
                return addCanvasNoise(imageData);
            };
        });
    }
    
    /**
     * WebGL fingerprinting countermeasures
     */
    async implementWebGLCountermeasures() {
        console.log('🔺 Implementing WebGL fingerprinting countermeasures...');
        
        await this.page.addInitScript(() => {
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
            
            // Realistic WebGL parameters to spoof
            const spoofedValues = {
                [WebGLRenderingContext.RENDERER]: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)',
                [WebGLRenderingContext.VENDOR]: 'Google Inc. (Intel)',
                [WebGLRenderingContext.VERSION]: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)',
                [WebGLRenderingContext.SHADING_LANGUAGE_VERSION]: 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)'
            };
            
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (spoofedValues.hasOwnProperty(parameter)) {
                    return spoofedValues[parameter];
                }
                
                // Add noise to numeric parameters
                const result = originalGetParameter.call(this, parameter);
                if (typeof result === 'number' && Math.random() < 0.1) {
                    return result + (Math.random() - 0.5) * 0.0001; // Tiny variance
                }
                
                return result;
            };
            
            // Spoof debug renderer info
            WebGLRenderingContext.prototype.getExtension = function(name) {
                if (name === 'WEBGL_debug_renderer_info') {
                    return {
                        UNMASKED_VENDOR_WEBGL: 37445,
                        UNMASKED_RENDERER_WEBGL: 37446
                    };
                }
                return originalGetExtension.call(this, name);
            };
        });
    }
    
    /**
     * Audio fingerprinting countermeasures
     */
    async implementAudioCountermeasures() {
        console.log('🔊 Implementing audio fingerprinting countermeasures...');
        
        await this.page.addInitScript(() => {
            const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
            const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
            
            AudioContext.prototype.createAnalyser = function() {
                const analyser = originalCreateAnalyser.call(this);
                
                // Inject noise into frequency analysis
                analyser.getByteFrequencyData = function(array) {
                    originalGetByteFrequencyData.call(this, array);
                    
                    // Add subtle noise to frequency data
                    for (let i = 0; i < array.length; i++) {
                        if (Math.random() < 0.05) { // 5% of frequency bins
                            array[i] = Math.max(0, Math.min(255, array[i] + (Math.random() - 0.5) * 2));
                        }
                    }
                };
                
                return analyser;
            };
        });
    }
    
    /**
     * Headless detection countermeasures
     */
    async implementHeadlessCountermeasures() {
        console.log('👻 Implementing headless detection countermeasures...');
        
        await this.page.addInitScript(() => {
            // Remove webdriver property
            delete Object.getPrototypeOf(navigator).webdriver;
            
            // Override navigator properties
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                configurable: true
            });
            
            // Mock plugins
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
                    },
                    {
                        name: 'Native Client',
                        filename: 'internal-nacl-plugin',
                        description: ''
                    }
                ]
            });
            
            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
            
            // Mock permissions
            const originalQuery = navigator.permissions.query;
            navigator.permissions.query = function(parameters) {
                return parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery.call(this, parameters);
            };
            
            // Mock chrome runtime
            if (!window.chrome) {
                window.chrome = {};
            }
            if (!window.chrome.runtime) {
                window.chrome.runtime = {
                    onConnect: {
                        addListener: function() {},
                        removeListener: function() {},
                        hasListener: function() { return false; }
                    },
                    onMessage: {
                        addListener: function() {},
                        removeListener: function() {},
                        hasListener: function() { return false; }
                    }
                };
            }
        });
    }
    
    /**
     * Automation detection countermeasures
     */
    async implementAutomationCountermeasures() {
        console.log('🤖 Implementing automation detection countermeasures...');
        
        await this.page.addInitScript(() => {
            // Remove automation indicators
            delete window.__webdriver_script_fn;
            delete window.__webdriver_script_func;
            delete window.__webdriver_script_function;
            delete window.__fxdriver_id;
            delete window.__driver_evaluate;
            delete window.__webdriver_evaluate;
            delete window.__selenium_evaluate;
            delete window.__fxdriver_evaluate;
            delete window.__driver_unwrapped;
            delete window.__webdriver_unwrapped;
            delete window.__selenium_unwrapped;
            delete window.__fxdriver_unwrapped;
            delete window._Selenium_IDE_Recorder;
            delete window._selenium;
            delete window.__nightmare;
            delete window._phantom;
            delete window.callPhantom;
            delete window.callSelenium;
            delete window._seleniumRepl;
            
            // Override toString methods to hide automation
            const originalToString = Function.prototype.toString;
            Function.prototype.toString = function() {
                if (this === navigator.webdriver) {
                    return 'function webdriver() { [native code] }';
                }
                return originalToString.call(this);
            };
        });
    }
    
    /**
     * Cloudflare countermeasures
     */
    async implementCloudflareCountermeasures() {
        console.log('☁️ Implementing Cloudflare countermeasures...');
        
        // Wait for potential Cloudflare challenge
        try {
            await this.page.waitForSelector('.cf-browser-verification', { timeout: 5000 });
            console.log('🔄 Cloudflare challenge detected, waiting...');
            
            // Wait for challenge completion
            await this.page.waitForFunction(() => {
                return !document.querySelector('.cf-browser-verification') ||
                       document.querySelector('.cf-challenge-success') ||
                       document.querySelector('#challenge-success');
            }, { timeout: 30000 });
            
            console.log('✅ Cloudflare challenge completed');
        } catch (error) {
            // No challenge found or challenge failed
            console.log('⚠️ No Cloudflare challenge detected or challenge handling failed');
        }
    }
    
    /**
     * ML-based countermeasures
     */
    async implementMLCountermeasures() {
        console.log('🧠 Implementing ML countermeasures...');
        
        // Generate adversarial behavior patterns
        const adversarialPatterns = await this.mlCountermeasures.generateAdversarialPatterns();
        
        await this.page.addInitScript((patterns) => {
            window.adversarialBehavior = patterns;
            
            // Implement behavior that confuses ML models
            setInterval(() => {
                // Random mouse micro-movements
                if (Math.random() < 0.1) {
                    const event = new MouseEvent('mousemove', {
                        clientX: Math.random() * window.innerWidth,
                        clientY: Math.random() * window.innerHeight
                    });
                    document.dispatchEvent(event);
                }
                
                // Random scroll events
                if (Math.random() < 0.05) {
                    window.scrollBy(0, (Math.random() - 0.5) * 10);
                }
            }, 1000 + Math.random() * 2000);
        }, adversarialPatterns);
    }
    
    /**
     * Timing analysis countermeasures
     */
    async implementTimingCountermeasures() {
        console.log('⏱️ Implementing timing analysis countermeasures...');
        
        await this.page.addInitScript(() => {
            // Override performance.now() with human-like variance
            const originalNow = performance.now;
            let timeOffset = 0;
            
            performance.now = function() {
                const realTime = originalNow.call(this);
                // Add small random variance to timing
                timeOffset += (Math.random() - 0.5) * 0.1;
                return realTime + timeOffset;
            };
            
            // Override Date.now() similarly
            const originalDateNow = Date.now;
            Date.now = function() {
                const realTime = originalDateNow.call(this);
                return realTime + Math.floor(timeOffset);
            };
        });
    }
    
    /**
     * Generate behavior profile
     */
    async generateBehaviorProfile() {
        const profiles = ['careful', 'average', 'confident', 'quick'];
        const selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];
        
        return {
            type: selectedProfile,
            mouseSpeed: this.getProfileValue(selectedProfile, 'mouseSpeed'),
            clickDelay: this.getProfileValue(selectedProfile, 'clickDelay'),
            typingSpeed: this.getProfileValue(selectedProfile, 'typingSpeed'),
            readingTime: this.getProfileValue(selectedProfile, 'readingTime'),
            errorRate: this.getProfileValue(selectedProfile, 'errorRate')
        };
    }
    
    getProfileValue(profile, metric) {
        const values = {
            careful: { mouseSpeed: 150, clickDelay: 800, typingSpeed: 120, readingTime: 3000, errorRate: 0.01 },
            average: { mouseSpeed: 200, clickDelay: 400, typingSpeed: 180, readingTime: 2000, errorRate: 0.03 },
            confident: { mouseSpeed: 300, clickDelay: 200, typingSpeed: 240, readingTime: 1500, errorRate: 0.04 },
            quick: { mouseSpeed: 400, clickDelay: 100, typingSpeed: 300, readingTime: 1000, errorRate: 0.06 }
        };
        
        return values[profile][metric] || values.average[metric];
    }
    
    /**
     * Inject base stealth scripts
     */
    async injectBaseStealthScripts() {
        await this.page.addInitScript(() => {
            // Comprehensive stealth injection
            const stealthScript = `
                (function() {
                    'use strict';
                    
                    // Remove automation traces
                    delete navigator.__proto__.webdriver;
                    delete window.webdriver;
                    delete window.__webdriver_script_fn;
                    
                    // Override user agent parsing
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                        configurable: true
                    });
                    
                    // Mock realistic browser environment
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => Array.from({length: 3}, (_, i) => ({
                            name: ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'][i],
                            filename: ['internal-pdf-viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 'internal-nacl-plugin'][i]
                        }))
                    });
                    
                    // Mock connection
                    Object.defineProperty(navigator, 'connection', {
                        get: () => ({
                            effectiveType: '4g',
                            rtt: 50,
                            downlink: 10
                        })
                    });
                    
                    // Mock battery
                    if (navigator.getBattery) {
                        navigator.getBattery = () => Promise.resolve({
                            charging: Math.random() > 0.5,
                            chargingTime: Infinity,
                            dischargingTime: Math.random() * 10000 + 5000,
                            level: Math.random() * 0.5 + 0.5
                        });
                    }
                    
                    console.log('🔒 Stealth mode activated');
                })();
            `;
            
            eval(stealthScript);
        });
    }
    
    /**
     * Get countermeasures statistics
     */
    getStats() {
        return {
            activeCountermeasures: Array.from(this.activeCountermeasures),
            behaviorProfile: this.behaviorProfile,
            aggressiveness: this.options.aggressiveness,
            adaptiveMode: this.options.adaptiveMode,
            initialized: this.initialized
        };
    }
}

/**
 * Supporting AI classes (simplified implementations)
 */

class HumanBehaviorAI {
    async initialize() {
        this.behaviorPatterns = new Map();
    }
}

class AdvancedFingerprintSpoofer {
    async initialize() {
        this.fingerprintDatabase = new Map();
    }
}

class AdaptiveTimingController {
    async initialize() {
        this.timingProfiles = new Map();
    }
}

class MLCountermeasures {
    async initialize() {
        this.adversarialModels = new Map();
    }
    
    async generateAdversarialPatterns() {
        return {
            mousePatterns: this.generateMousePatterns(),
            keyboardPatterns: this.generateKeyboardPatterns(),
            timingPatterns: this.generateTimingPatterns()
        };
    }
    
    generateMousePatterns() {
        return {
            frequency: Math.random() * 0.1 + 0.05,
            amplitude: Math.random() * 5 + 2,
            randomness: Math.random() * 0.3 + 0.1
        };
    }
    
    generateKeyboardPatterns() {
        return {
            rhythm: Math.random() * 0.2 + 0.8,
            variance: Math.random() * 50 + 25,
            errorSimulation: Math.random() < 0.3
        };
    }
    
    generateTimingPatterns() {
        return {
            baseDelay: Math.random() * 1000 + 500,
            variance: Math.random() * 300 + 100,
            pattern: Math.random() > 0.5 ? 'gaussian' : 'exponential'
        };
    }
}

module.exports = IntelligentCountermeasures;