/**
 * Advanced Iframe Handler for Playwright
 * Handles complex iframe scenarios, nested frames, and cross-origin content
 */

const HumanSimulation = require('../behavior/human-simulation');

class IframeHandler {
    constructor(page) {
        this.page = page;
        this.humanSim = new HumanSimulation();
        this.frameCache = new Map();
        this.logs = [];
    }

    /**
     * Detect all iframes on the page and categorize them
     */
    async detectIframes() {
        try {
            this.log('Detecting iframes on page...');

            const iframes = await this.page.$$('iframe');
            const frameData = [];

            for (let i = 0; i < iframes.length; i++) {
                const iframe = iframes[i];
                const src = await iframe.getAttribute('src');
                const id = await iframe.getAttribute('id');
                const name = await iframe.getAttribute('name');
                const className = await iframe.getAttribute('class');
                const title = await iframe.getAttribute('title');

                // Get iframe dimensions
                const boundingBox = await iframe.boundingBox();
                
                // Categorize iframe type
                const type = this.categorizeIframe(src, id, name, className, title);

                frameData.push({
                    index: i,
                    element: iframe,
                    src,
                    id,
                    name,
                    className,
                    title,
                    type,
                    dimensions: boundingBox,
                    isVisible: boundingBox !== null
                });
            }

            this.log(`Found ${frameData.length} iframes`);
            return frameData;

        } catch (error) {
            this.log(`Error detecting iframes: ${error.message}`);
            return [];
        }
    }

    /**
     * Categorize iframe based on attributes and content
     */
    categorizeIframe(src, id, name, className, title) {
        const attributes = [src, id, name, className, title].join(' ').toLowerCase();

        // CAPTCHA services
        if (attributes.includes('recaptcha')) return 'recaptcha';
        if (attributes.includes('hcaptcha')) return 'hcaptcha';
        if (attributes.includes('captcha')) return 'captcha';
        if (attributes.includes('turnstile')) return 'turnstile';

        // Payment processors
        if (attributes.includes('stripe')) return 'payment_stripe';
        if (attributes.includes('paypal')) return 'payment_paypal';
        if (attributes.includes('payment')) return 'payment_generic';

        // Social media
        if (attributes.includes('facebook')) return 'social_facebook';
        if (attributes.includes('twitter')) return 'social_twitter';
        if (attributes.includes('youtube')) return 'social_youtube';

        // Advertising
        if (attributes.includes('google') && attributes.includes('ads')) return 'ads_google';
        if (attributes.includes('doubleclick')) return 'ads_doubleclick';
        if (attributes.includes('adsystem')) return 'ads_generic';

        // Analytics
        if (attributes.includes('analytics')) return 'analytics';
        if (attributes.includes('gtm')) return 'analytics_gtm';

        // Survey/Poll specific
        if (attributes.includes('survey')) return 'survey';
        if (attributes.includes('poll')) return 'poll';
        if (attributes.includes('question')) return 'question';
        if (attributes.includes('form')) return 'form';

        // Authentication
        if (attributes.includes('auth')) return 'auth';
        if (attributes.includes('login')) return 'login';
        if (attributes.includes('oauth')) return 'oauth';

        // Content
        if (attributes.includes('embed')) return 'embed';
        if (attributes.includes('widget')) return 'widget';

        return 'unknown';
    }

    /**
     * Get frame by various identifiers with smart matching
     */
    async getFrame(identifier, options = {}) {
        const defaultOptions = {
            timeout: 10000,
            waitForLoad: true,
            retries: 3
        };

        const config = { ...defaultOptions, ...options };

        // Check cache first
        const cacheKey = JSON.stringify({ identifier, options: config });
        if (this.frameCache.has(cacheKey)) {
            this.log(`Frame found in cache: ${identifier}`);
            return this.frameCache.get(cacheKey);
        }

        for (let attempt = 1; attempt <= config.retries; attempt++) {
            try {
                this.log(`Getting frame attempt ${attempt}: ${identifier}`);

                let frame = null;

                // Try different identification methods
                if (typeof identifier === 'string') {
                    // Try by name first
                    frame = this.page.frame({ name: identifier });
                    
                    // Try by URL pattern
                    if (!frame) {
                        frame = this.page.frames().find(f => f.url().includes(identifier));
                    }

                    // Try by selector
                    if (!frame) {
                        const frameElement = await this.page.$(identifier);
                        if (frameElement) {
                            frame = await frameElement.contentFrame();
                        }
                    }
                } else if (typeof identifier === 'object') {
                    // Object with multiple criteria
                    frame = this.page.frames().find(f => {
                        const url = f.url();
                        return Object.entries(identifier).every(([key, value]) => {
                            switch (key) {
                                case 'url': return url.includes(value);
                                case 'name': return f.name() === value;
                                default: return true;
                            }
                        });
                    });
                }

                if (frame) {
                    // Wait for frame to load if requested
                    if (config.waitForLoad) {
                        await this.waitForFrameLoad(frame, config.timeout);
                    }

                    // Cache the result
                    this.frameCache.set(cacheKey, frame);
                    this.log(`Frame found and cached: ${identifier}`);
                    return frame;
                }

                // Wait before retry
                if (attempt < config.retries) {
                    await this.page.waitForTimeout(1000 * attempt);
                }

            } catch (error) {
                this.log(`Frame get attempt ${attempt} failed: ${error.message}`);
                if (attempt === config.retries) {
                    throw error;
                }
            }
        }

        throw new Error(`Frame not found after ${config.retries} attempts: ${identifier}`);
    }

    /**
     * Wait for frame to fully load
     */
    async waitForFrameLoad(frame, timeout = 10000) {
        try {
            await frame.waitForLoadState('load', { timeout });
            await frame.waitForLoadState('networkidle', { timeout: 5000 });
            this.log(`Frame loaded: ${frame.url()}`);
        } catch (error) {
            this.log(`Frame load timeout: ${error.message}`);
            // Continue anyway - frame might be functional
        }
    }

    /**
     * Execute action within specific iframe
     */
    async executeInFrame(frameIdentifier, action, options = {}) {
        const defaultOptions = {
            timeout: 10000,
            humanLike: true,
            retries: 2
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Executing action in frame: ${frameIdentifier}`);

            const frame = await this.getFrame(frameIdentifier, {
                timeout: config.timeout,
                waitForLoad: true
            });

            if (!frame) {
                throw new Error(`Frame not found: ${frameIdentifier}`);
            }

            // Add human-like delay before action
            if (config.humanLike) {
                await this.humanSim.simulateActionDelay('frameSwitch');
            }

            // Execute the action within the frame context
            const result = await action(frame);

            this.log(`Action completed in frame: ${frameIdentifier}`);
            return result;

        } catch (error) {
            this.log(`Frame action failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Click element within iframe
     */
    async clickInFrame(frameIdentifier, selector, options = {}) {
        return await this.executeInFrame(frameIdentifier, async (frame) => {
            const element = await frame.waitForSelector(selector, {
                timeout: options.timeout || 10000,
                state: 'visible'
            });

            if (options.humanLike !== false) {
                await this.humanSim.simulateActionDelay('click');
            }

            await element.click();
            this.log(`Clicked in frame: ${selector}`);
            return element;
        }, options);
    }

    /**
     * Fill input within iframe
     */
    async fillInFrame(frameIdentifier, selector, value, options = {}) {
        return await this.executeInFrame(frameIdentifier, async (frame) => {
            const input = await frame.waitForSelector(selector, {
                timeout: options.timeout || 10000,
                state: 'visible'
            });

            // Clear existing content if requested
            if (options.clear !== false) {
                await input.selectText();
                await frame.keyboard.press('Delete');
            }

            // Human-like typing
            if (options.humanLike !== false && value.length > 0) {
                await this.humanSim.simulateTyping(frame, value);
            } else {
                await input.fill(value);
            }

            this.log(`Filled in frame: ${selector} = ${value}`);
            return input;
        }, options);
    }

    /**
     * Wait for element in iframe
     */
    async waitForElementInFrame(frameIdentifier, selector, options = {}) {
        return await this.executeInFrame(frameIdentifier, async (frame) => {
            const element = await frame.waitForSelector(selector, {
                timeout: options.timeout || 10000,
                state: options.state || 'visible'
            });

            this.log(`Element found in frame: ${selector}`);
            return element;
        }, options);
    }

    /**
     * Check if iframe contains specific content
     */
    async frameContains(frameIdentifier, content, options = {}) {
        try {
            return await this.executeInFrame(frameIdentifier, async (frame) => {
                const frameContent = await frame.textContent('body');
                const contains = frameContent.toLowerCase().includes(content.toLowerCase());
                this.log(`Frame contains "${content}": ${contains}`);
                return contains;
            }, options);
        } catch (error) {
            this.log(`Error checking frame content: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle nested iframes (iframe within iframe)
     */
    async handleNestedFrames(path, action, options = {}) {
        try {
            this.log(`Handling nested frames: ${path.join(' -> ')}`);

            let currentFrame = this.page;

            // Navigate through the frame hierarchy
            for (const frameId of path) {
                if (currentFrame === this.page) {
                    currentFrame = await this.getFrame(frameId, options);
                } else {
                    // Get child frame
                    const childFrames = currentFrame.childFrames();
                    currentFrame = childFrames.find(f => 
                        f.name() === frameId || f.url().includes(frameId)
                    );

                    if (!currentFrame) {
                        throw new Error(`Child frame not found: ${frameId}`);
                    }
                }

                // Wait for frame to be ready
                await this.waitForFrameLoad(currentFrame);
            }

            // Execute action in the nested frame
            return await action(currentFrame);

        } catch (error) {
            this.log(`Nested frame handling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Monitor iframe for changes
     */
    async monitorFrame(frameIdentifier, callback, options = {}) {
        const defaultOptions = {
            interval: 1000,
            timeout: 30000,
            monitorType: 'content' // 'content', 'url', 'size'
        };

        const config = { ...defaultOptions, ...options };

        try {
            const frame = await this.getFrame(frameIdentifier);
            const startTime = Date.now();
            let previousState = null;

            this.log(`Starting frame monitoring: ${frameIdentifier}`);

            const monitor = setInterval(async () => {
                try {
                    let currentState;

                    switch (config.monitorType) {
                        case 'content':
                            currentState = await frame.textContent('body');
                            break;
                        case 'url':
                            currentState = frame.url();
                            break;
                        case 'size':
                            const frameElement = await this.page.$(`iframe[src*="${frame.url()}"]`);
                            currentState = frameElement ? await frameElement.boundingBox() : null;
                            break;
                    }

                    if (previousState !== null && currentState !== previousState) {
                        callback({
                            type: 'change',
                            previous: previousState,
                            current: currentState,
                            frame: frameIdentifier
                        });
                    }

                    previousState = currentState;

                    // Check timeout
                    if (Date.now() - startTime > config.timeout) {
                        clearInterval(monitor);
                        callback({ type: 'timeout', frame: frameIdentifier });
                    }

                } catch (error) {
                    this.log(`Frame monitoring error: ${error.message}`);
                }
            }, config.interval);

            return monitor;

        } catch (error) {
            this.log(`Failed to start frame monitoring: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract all links from iframe
     */
    async extractFrameLinks(frameIdentifier, options = {}) {
        return await this.executeInFrame(frameIdentifier, async (frame) => {
            const links = await frame.$$eval('a[href]', anchors => 
                anchors.map(a => ({
                    href: a.href,
                    text: a.textContent.trim(),
                    target: a.target
                }))
            );

            this.log(`Extracted ${links.length} links from frame`);
            return links;
        }, options);
    }

    /**
     * Take screenshot of specific iframe
     */
    async screenshotFrame(frameIdentifier, options = {}) {
        try {
            const frame = await this.getFrame(frameIdentifier);
            
            // Find the iframe element
            const frameElement = await this.page.$(`iframe[src*="${frame.url()}"]`);
            if (!frameElement) {
                throw new Error('Frame element not found for screenshot');
            }

            const screenshotPath = options.path || `./screenshots/frame_${Date.now()}.png`;
            await frameElement.screenshot({ path: screenshotPath });

            this.log(`Frame screenshot saved: ${screenshotPath}`);
            return screenshotPath;

        } catch (error) {
            this.log(`Frame screenshot failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clear frame cache
     */
    clearCache() {
        this.frameCache.clear();
        this.log('Frame cache cleared');
    }

    /**
     * Get frame statistics
     */
    async getFrameStats() {
        const frames = this.page.frames();
        const stats = {
            total: frames.length,
            loaded: 0,
            error: 0,
            cached: this.frameCache.size,
            types: {}
        };

        for (const frame of frames) {
            try {
                await frame.title(); // Test if frame is accessible
                stats.loaded++;
            } catch (error) {
                stats.error++;
            }
        }

        // Get frame types
        const iframeData = await this.detectIframes();
        for (const iframe of iframeData) {
            stats.types[iframe.type] = (stats.types[iframe.type] || 0) + 1;
        }

        this.log(`Frame stats: ${JSON.stringify(stats)}`);
        return stats;
    }

    /**
     * Logging utility
     */
    log(message) {
        const logEntry = {
            timestamp: Date.now(),
            message,
            url: this.page.url()
        };
        
        this.logs.push(logEntry);
        console.log(`[IFRAME] ${message}`);
    }

    /**
     * Get iframe handling logs
     */
    getLogs() {
        return this.logs;
    }
}

module.exports = IframeHandler;