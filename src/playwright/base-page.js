/**
 * Base Page Object Model for Playwright
 * Provides advanced abstractions for modern web interactions
 */

const { expect } = require('@playwright/test');
const HumanSimulation = require('../behavior/human-simulation');

class BasePage {
    constructor(page, context) {
        this.page = page;
        this.context = context;
        this.humanSim = new HumanSimulation();
        this.defaultTimeout = 30000;
        this.retryAttempts = 3;
        this.logs = [];
        
        // Setup page event listeners
        this.setupPageEventHandlers();
    }

    /**
     * Setup comprehensive page event handling
     */
    setupPageEventHandlers() {
        // Console message handling
        this.page.on('console', msg => {
            this.logs.push({
                type: 'console',
                level: msg.type(),
                text: msg.text(),
                timestamp: Date.now()
            });
        });

        // Dialog handling (alerts, confirms, prompts)
        this.page.on('dialog', async dialog => {
            this.logs.push({
                type: 'dialog',
                dialogType: dialog.type(),
                message: dialog.message(),
                timestamp: Date.now()
            });

            // Auto-handle common dialogs
            await this.handleDialog(dialog);
        });

        // Request/Response monitoring
        this.page.on('request', request => {
            if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
                this.logs.push({
                    type: 'request',
                    url: request.url(),
                    method: request.method(),
                    timestamp: Date.now()
                });
            }
        });

        // Page error handling
        this.page.on('pageerror', error => {
            this.logs.push({
                type: 'error',
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });
        });

        // Response handling for failed requests
        this.page.on('response', response => {
            if (!response.ok()) {
                this.logs.push({
                    type: 'response_error',
                    url: response.url(),
                    status: response.status(),
                    timestamp: Date.now()
                });
            }
        });
    }

    /**
     * Intelligent dialog handling based on content and context
     */
    async handleDialog(dialog) {
        const message = dialog.message().toLowerCase();
        const type = dialog.type();

        // Cookie consent dialogs
        if (message.includes('cookie') || message.includes('consent')) {
            await dialog.accept();
            return;
        }

        // Age verification
        if (message.includes('age') || message.includes('18')) {
            await dialog.accept();
            return;
        }

        // Survey start confirmations
        if (message.includes('start') || message.includes('begin') || message.includes('continue')) {
            await dialog.accept();
            return;
        }

        // Default handling
        switch (type) {
            case 'alert':
                await dialog.accept();
                break;
            case 'confirm':
                await dialog.accept(); // Generally accept confirmations
                break;
            case 'prompt':
                await dialog.accept(''); // Empty string for prompts
                break;
            default:
                await dialog.dismiss();
        }
    }

    /**
     * Enhanced navigation with SPA support
     */
    async navigateTo(url, options = {}) {
        const defaultOptions = {
            waitUntil: 'networkidle',
            timeout: this.defaultTimeout,
            waitForSPA: true,
            retries: this.retryAttempts
        };

        const config = { ...defaultOptions, ...options };
        let lastError;

        for (let attempt = 1; attempt <= config.retries; attempt++) {
            try {
                this.log(`Navigation attempt ${attempt} to: ${url}`);
                
                // Navigate to URL
                await this.page.goto(url, {
                    waitUntil: config.waitUntil,
                    timeout: config.timeout
                });

                // Wait for SPA to stabilize if needed
                if (config.waitForSPA) {
                    await this.waitForSPAStabilization();
                }

                // Human-like pause after navigation
                await this.humanSim.simulateActionDelay('navigate');

                this.log(`Successfully navigated to: ${url}`);
                return true;

            } catch (error) {
                lastError = error;
                this.log(`Navigation attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < config.retries) {
                    await this.page.waitForTimeout(1000 * attempt);
                }
            }
        }

        throw new Error(`Failed to navigate to ${url} after ${config.retries} attempts: ${lastError.message}`);
    }

    /**
     * Wait for SPA to stabilize (no pending network requests, DOM mutations settled)
     */
    async waitForSPAStabilization(timeout = 10000) {
        try {
            // Wait for no pending network requests
            await this.page.waitForLoadState('networkidle', { timeout });

            // Wait for JavaScript frameworks to stabilize
            await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    // Wait for React/Vue/Angular to finish rendering
                    const checkStability = () => {
                        if (window.requestIdleCallback) {
                            window.requestIdleCallback(resolve, { timeout: 2000 });
                        } else {
                            setTimeout(resolve, 100);
                        }
                    };

                    // Check if common frameworks are done
                    if (window.React || window.Vue || window.ng) {
                        setTimeout(checkStability, 300);
                    } else {
                        checkStability();
                    }
                });
            });

            // Additional wait for any remaining DOM mutations
            await this.page.waitForTimeout(200);

        } catch (error) {
            this.log(`SPA stabilization timeout: ${error.message}`);
            // Continue anyway - not critical
        }
    }

    /**
     * Enhanced element interaction with intelligent waiting
     */
    async clickElement(selector, options = {}) {
        const defaultOptions = {
            timeout: this.defaultTimeout,
            force: false,
            retries: this.retryAttempts,
            humanLike: true,
            waitForStable: true
        };

        const config = { ...defaultOptions, ...options };
        let lastError;

        for (let attempt = 1; attempt <= config.retries; attempt++) {
            try {
                this.log(`Click attempt ${attempt} on: ${selector}`);

                // Wait for element to be available and stable
                const element = await this.waitForElement(selector, {
                    state: 'visible',
                    timeout: config.timeout,
                    stable: config.waitForStable
                });

                // Scroll element into view if needed
                await element.scrollIntoViewIfNeeded();
                await this.page.waitForTimeout(100);

                // Human-like interaction
                if (config.humanLike) {
                    await this.humanSim.simulateMouseMovement(this.page, element);
                }

                // Perform click
                await element.click({ 
                    force: config.force,
                    timeout: config.timeout 
                });

                // Human-like delay after click
                if (config.humanLike) {
                    await this.humanSim.simulateActionDelay('click');
                }

                this.log(`Successfully clicked: ${selector}`);
                return element;

            } catch (error) {
                lastError = error;
                this.log(`Click attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < config.retries) {
                    await this.page.waitForTimeout(500 * attempt);
                }
            }
        }

        throw new Error(`Failed to click ${selector} after ${config.retries} attempts: ${lastError.message}`);
    }

    /**
     * Advanced element waiting with stability checks
     */
    async waitForElement(selector, options = {}) {
        const defaultOptions = {
            state: 'visible',
            timeout: this.defaultTimeout,
            stable: true,
            stableTime: 500
        };

        const config = { ...defaultOptions, ...options };

        // Wait for element to appear
        const element = await this.page.waitForSelector(selector, {
            state: config.state,
            timeout: config.timeout
        });

        // Check element stability if required
        if (config.stable) {
            await this.waitForElementStability(element, config.stableTime);
        }

        return element;
    }

    /**
     * Wait for element to be stable (no position/size changes)
     */
    async waitForElementStability(element, stableTime = 500) {
        const checkInterval = 50;
        const checks = Math.ceil(stableTime / checkInterval);
        let previousBoundingBox = null;
        let stableCount = 0;

        for (let i = 0; i < checks; i++) {
            try {
                const currentBoundingBox = await element.boundingBox();
                
                if (previousBoundingBox) {
                    const isStable = 
                        Math.abs(currentBoundingBox.x - previousBoundingBox.x) < 1 &&
                        Math.abs(currentBoundingBox.y - previousBoundingBox.y) < 1 &&
                        Math.abs(currentBoundingBox.width - previousBoundingBox.width) < 1 &&
                        Math.abs(currentBoundingBox.height - previousBoundingBox.height) < 1;

                    if (isStable) {
                        stableCount++;
                        if (stableCount >= 3) break; // Stable for 3 consecutive checks
                    } else {
                        stableCount = 0;
                    }
                }

                previousBoundingBox = currentBoundingBox;
                await this.page.waitForTimeout(checkInterval);

            } catch (error) {
                // Element might be detached, retry
                await this.page.waitForTimeout(checkInterval);
            }
        }
    }

    /**
     * Enhanced form filling with validation
     */
    async fillInput(selector, value, options = {}) {
        const defaultOptions = {
            clear: true,
            humanLike: true,
            validate: true,
            timeout: this.defaultTimeout
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Filling input ${selector} with: ${value}`);

            const input = await this.waitForElement(selector, {
                state: 'visible',
                timeout: config.timeout
            });

            await input.scrollIntoViewIfNeeded();

            // Clear existing content if requested
            if (config.clear) {
                await input.selectText();
                await this.page.keyboard.press('Delete');
            }

            // Focus the input
            await input.focus();
            await this.page.waitForTimeout(100);

            // Human-like typing
            if (config.humanLike && value.length > 0) {
                await this.humanSim.simulateTyping(this.page, value);
            } else {
                await input.fill(value);
            }

            // Validate the input value if requested
            if (config.validate) {
                const actualValue = await input.inputValue();
                if (actualValue !== value) {
                    throw new Error(`Input validation failed. Expected: ${value}, Actual: ${actualValue}`);
                }
            }

            this.log(`Successfully filled input: ${selector}`);
            return input;

        } catch (error) {
            this.log(`Failed to fill input ${selector}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Select option from dropdown with advanced handling
     */
    async selectOption(selector, option, options = {}) {
        const defaultOptions = {
            byValue: false,
            byLabel: true,
            byIndex: false,
            timeout: this.defaultTimeout
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Selecting option from ${selector}: ${option}`);

            const select = await this.waitForElement(selector, {
                timeout: config.timeout
            });

            await select.scrollIntoViewIfNeeded();

            // Different selection strategies
            if (config.byValue) {
                await select.selectOption({ value: option });
            } else if (config.byIndex) {
                await select.selectOption({ index: parseInt(option) });
            } else {
                // Default: by label
                await select.selectOption({ label: option });
            }

            await this.humanSim.simulateActionDelay('select');
            this.log(`Successfully selected option: ${option}`);
            return select;

        } catch (error) {
            this.log(`Failed to select option ${option}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Advanced checkbox/radio button handling
     */
    async checkElement(selector, checked = true, options = {}) {
        const defaultOptions = {
            timeout: this.defaultTimeout,
            humanLike: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`${checked ? 'Checking' : 'Unchecking'} element: ${selector}`);

            const element = await this.waitForElement(selector, {
                timeout: config.timeout
            });

            await element.scrollIntoViewIfNeeded();

            const isCurrentlyChecked = await element.isChecked();
            
            if (isCurrentlyChecked !== checked) {
                if (config.humanLike) {
                    await this.humanSim.simulateMouseMovement(this.page, element);
                }
                
                await element.setChecked(checked);
                
                if (config.humanLike) {
                    await this.humanSim.simulateActionDelay('click');
                }
            }

            this.log(`Successfully ${checked ? 'checked' : 'unchecked'}: ${selector}`);
            return element;

        } catch (error) {
            this.log(`Failed to ${checked ? 'check' : 'uncheck'} ${selector}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Wait for specific network requests to complete
     */
    async waitForNetworkRequests(urlPattern, options = {}) {
        const defaultOptions = {
            timeout: this.defaultTimeout,
            method: 'GET',
            status: 200
        };

        const config = { ...defaultOptions, ...options };

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Network request timeout for pattern: ${urlPattern}`));
            }, config.timeout);

            this.page.on('response', (response) => {
                if (response.url().match(urlPattern) && 
                    response.request().method() === config.method &&
                    response.status() === config.status) {
                    clearTimeout(timer);
                    resolve(response);
                }
            });
        });
    }

    /**
     * Execute JavaScript with error handling and retries
     */
    async executeScript(script, ...args) {
        try {
            this.log(`Executing script: ${script.substring(0, 100)}...`);
            
            const result = await this.page.evaluate(script, ...args);
            this.log(`Script executed successfully`);
            return result;

        } catch (error) {
            this.log(`Script execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Wait for custom condition with polling
     */
    async waitForCondition(conditionFn, options = {}) {
        const defaultOptions = {
            timeout: this.defaultTimeout,
            interval: 500,
            message: 'Condition not met'
        };

        const config = { ...defaultOptions, ...options };
        const startTime = Date.now();

        while (Date.now() - startTime < config.timeout) {
            try {
                const result = await conditionFn();
                if (result) {
                    return result;
                }
            } catch (error) {
                // Continue polling on errors
            }
            
            await this.page.waitForTimeout(config.interval);
        }

        throw new Error(`${config.message} - timeout after ${config.timeout}ms`);
    }

    /**
     * Take screenshot with metadata
     */
    async takeScreenshot(name, options = {}) {
        const defaultOptions = {
            fullPage: true,
            path: `./screenshots/${name}_${Date.now()}.png`
        };

        const config = { ...defaultOptions, ...options };

        try {
            await this.page.screenshot(config);
            this.log(`Screenshot saved: ${config.path}`);
            return config.path;
        } catch (error) {
            this.log(`Failed to take screenshot: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get page performance metrics
     */
    async getPerformanceMetrics() {
        try {
            const metrics = await this.page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                return {
                    loadTime: navigation.loadEventEnd - navigation.loadEventStart,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
                };
            });

            this.log(`Performance metrics collected: ${JSON.stringify(metrics)}`);
            return metrics;

        } catch (error) {
            this.log(`Failed to get performance metrics: ${error.message}`);
            return {};
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const logEntry = {
            timestamp: Date.now(),
            level,
            message,
            url: this.page.url()
        };
        
        this.logs.push(logEntry);
        console.log(`[${level.toUpperCase()}] ${message}`);
    }

    /**
     * Get all collected logs
     */
    getLogs(filterType = null) {
        if (filterType) {
            return this.logs.filter(log => log.type === filterType || log.level === filterType);
        }
        return this.logs;
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
    }
}

module.exports = BasePage;