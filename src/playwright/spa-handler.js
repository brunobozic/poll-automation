/**
 * Advanced SPA (Single Page Application) Handler
 * Handles React, Vue, Angular, and other modern JavaScript frameworks
 */

const HumanSimulation = require('../behavior/human-simulation');

class SPAHandler {
    constructor(page) {
        this.page = page;
        this.humanSim = new HumanSimulation();
        this.frameworkInfo = null;
        this.routeHistory = [];
        this.logs = [];
        this.stateMonitor = null;
    }

    /**
     * Detect the SPA framework being used
     */
    async detectFramework() {
        try {
            this.log('Detecting SPA framework...');

            const frameworkInfo = await this.page.evaluate(() => {
                const frameworks = {
                    react: {
                        detected: !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || 
                                   document.querySelector('[data-reactroot]') ||
                                   document.querySelector('*[data-react-class]')),
                        version: window.React?.version || 'unknown',
                        devtools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__
                    },
                    vue: {
                        detected: !!(window.Vue || window.__VUE__ || 
                                   document.querySelector('[data-v-]') ||
                                   document.querySelector('*[v-]')),
                        version: window.Vue?.version || 'unknown',
                        devtools: !!window.__VUE_DEVTOOLS_GLOBAL_HOOK__
                    },
                    angular: {
                        detected: !!(window.angular || window.ng || 
                                   document.querySelector('[ng-app]') ||
                                   document.querySelector('*[ng-]') ||
                                   document.querySelector('app-root')),
                        version: window.angular?.version?.full || 'unknown',
                        zones: !!window.Zone
                    },
                    svelte: {
                        detected: !!(document.querySelector('*[data-svelte-h]') ||
                                   window.__svelte),
                        version: 'unknown'
                    },
                    nextjs: {
                        detected: !!(window.__NEXT_DATA__ || 
                                   document.querySelector('#__next')),
                        version: window.__NEXT_DATA__?.buildId || 'unknown'
                    },
                    nuxt: {
                        detected: !!(window.$nuxt || 
                                   document.querySelector('#__nuxt')),
                        version: 'unknown'
                    },
                    ember: {
                        detected: !!(window.Ember || 
                                   document.querySelector('*[data-ember-action]')),
                        version: window.Ember?.VERSION || 'unknown'
                    }
                };

                // Additional detection
                const hasRouter = !!(window.history?.pushState && 
                                   (window.location.hash.includes('#/') || 
                                    document.querySelector('router-outlet, router-view')));

                const bundlers = {
                    webpack: !!window.webpackChunkName || !!window.__webpack_require__,
                    vite: !!window.__vite_plugin_react_preamble_installed__,
                    parcel: !!window.parcelRequire
                };

                return {
                    frameworks,
                    hasRouter,
                    bundlers,
                    isHydrated: document.readyState === 'complete'
                };
            });

            this.frameworkInfo = frameworkInfo;
            const detected = Object.entries(frameworkInfo.frameworks)
                .filter(([name, info]) => info.detected)
                .map(([name, info]) => `${name} ${info.version}`);

            this.log(`SPA frameworks detected: ${detected.join(', ') || 'None'}`);
            this.log(`Router detected: ${frameworkInfo.hasRouter}`);
            
            return frameworkInfo;

        } catch (error) {
            this.log(`Framework detection failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Wait for SPA to be fully hydrated and ready
     */
    async waitForSPAReady(options = {}) {
        const defaultOptions = {
            timeout: 30000,
            checkInterval: 500,
            waitForRouter: true,
            waitForComponents: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log('Waiting for SPA to be ready...');

            await this.page.waitForFunction(() => {
                // Check if DOM is ready
                if (document.readyState !== 'complete') return false;

                // Check for React
                if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    // Wait for React to finish rendering
                    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                        const reactFiber = document.querySelector('*[data-reactroot], #root, #app')
                            ?._reactInternalFiber || 
                            document.querySelector('*[data-reactroot], #root, #app')
                            ?._reactInternalInstance;
                        
                        if (reactFiber) {
                            // React is likely done if we have fiber
                            return true;
                        }
                    }
                    
                    // Fallback: check if React root is populated
                    const reactRoot = document.querySelector('[data-reactroot], #root');
                    return reactRoot && reactRoot.children.length > 0;
                }

                // Check for Vue
                if (window.Vue || window.__VUE__) {
                    const vueApp = document.querySelector('#app, [data-v-]');
                    return vueApp && vueApp.children.length > 0;
                }

                // Check for Angular
                if (window.angular || window.ng) {
                    const ngApp = document.querySelector('app-root, [ng-app]');
                    if (ngApp && ngApp.children.length > 0) {
                        // Check if Angular has finished bootstrapping
                        return !document.querySelector('.ng-animate');
                    }
                }

                // Generic check: ensure main content is loaded
                const mainSelectors = ['main', '#main', '.main', '#app', '.app', '#root', '.root'];
                for (const selector of mainSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.children.length > 0) {
                        return true;
                    }
                }

                return false;

            }, {}, { timeout: config.timeout, polling: config.checkInterval });

            // Additional framework-specific waiting
            if (config.waitForRouter) {
                await this.waitForRouterReady(config.timeout / 2);
            }

            if (config.waitForComponents) {
                await this.waitForComponentsLoaded(config.timeout / 2);
            }

            this.log('SPA is ready');
            return true;

        } catch (error) {
            this.log(`SPA ready timeout: ${error.message}`);
            return false;
        }
    }

    /**
     * Wait for router to finish navigation
     */
    async waitForRouterReady(timeout = 15000) {
        try {
            await this.page.waitForFunction(() => {
                // Check for route transition indicators
                const routeIndicators = [
                    '.router-loading',
                    '.route-loading', 
                    '.loading',
                    '[class*="loading"]',
                    '.spinner',
                    '.loader'
                ];

                for (const selector of routeIndicators) {
                    const loader = document.querySelector(selector);
                    if (loader && loader.offsetParent !== null) {
                        return false; // Still loading
                    }
                }

                // Check for Vue router
                if (window.$nuxt) {
                    return !window.$nuxt.$loading.show;
                }

                // Check for Next.js router
                if (window.__NEXT_DATA__) {
                    return !document.querySelector('.nprogress-busy');
                }

                return true;

            }, {}, { timeout, polling: 250 });

            this.log('Router ready');

        } catch (error) {
            this.log(`Router ready timeout: ${error.message}`);
        }
    }

    /**
     * Wait for lazy-loaded components
     */
    async waitForComponentsLoaded(timeout = 10000) {
        try {
            // Wait for lazy loading indicators to disappear
            await this.page.waitForFunction(() => {
                const lazyIndicators = [
                    '.lazy-loading',
                    '.component-loading',
                    '.skeleton-loader',
                    '[class*="skeleton"]',
                    '.placeholder-loading'
                ];

                return !lazyIndicators.some(selector => {
                    const element = document.querySelector(selector);
                    return element && element.offsetParent !== null;
                });

            }, {}, { timeout, polling: 250 });

            this.log('Components loaded');

        } catch (error) {
            this.log(`Components loading timeout: ${error.message}`);
        }
    }

    /**
     * Navigate within SPA (client-side routing)
     */
    async navigateToRoute(route, options = {}) {
        const defaultOptions = {
            timeout: 30000,
            waitForComplete: true,
            method: 'click' // 'click', 'url', 'programmatic'
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Navigating to SPA route: ${route}`);

            const previousUrl = this.page.url();
            this.routeHistory.push({ from: previousUrl, to: route, timestamp: Date.now() });

            switch (config.method) {
                case 'click':
                    await this.navigateByClick(route, config);
                    break;
                case 'url':
                    await this.navigateByUrl(route, config);
                    break;
                case 'programmatic':
                    await this.navigateByScript(route, config);
                    break;
                default:
                    throw new Error(`Unknown navigation method: ${config.method}`);
            }

            if (config.waitForComplete) {
                await this.waitForSPAReady({ timeout: config.timeout });
            }

            this.log(`SPA navigation completed: ${route}`);
            return true;

        } catch (error) {
            this.log(`SPA navigation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Navigate by clicking a link
     */
    async navigateByClick(route, config) {
        // Find link that leads to the route
        const linkSelector = `a[href="${route}"], a[href*="${route}"], [data-to="${route}"]`;
        
        const link = await this.page.$(linkSelector);
        if (!link) {
            throw new Error(`Navigation link not found: ${route}`);
        }

        await this.humanSim.simulateActionDelay('navigate');
        await link.click();
    }

    /**
     * Navigate by changing URL
     */
    async navigateByUrl(route, config) {
        const currentUrl = new URL(this.page.url());
        const newUrl = new URL(route, currentUrl.origin);
        
        await this.page.goto(newUrl.toString(), { 
            waitUntil: 'networkidle',
            timeout: config.timeout 
        });
    }

    /**
     * Navigate programmatically using framework router
     */
    async navigateByScript(route, config) {
        await this.page.evaluate((route) => {
            // Try different router navigation methods
            if (window.router) {
                window.router.push(route);
            } else if (window.$router) {
                window.$router.push(route);
            } else if (window.history) {
                window.history.pushState({}, '', route);
                window.dispatchEvent(new PopStateEvent('popstate'));
            } else {
                throw new Error('No router found for programmatic navigation');
            }
        }, route);
    }

    /**
     * Wait for specific SPA state change
     */
    async waitForStateChange(statePath, expectedValue, options = {}) {
        const defaultOptions = {
            timeout: 15000,
            interval: 500
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Waiting for state change: ${statePath} = ${expectedValue}`);

            await this.page.waitForFunction((path, expected) => {
                const getValue = (obj, path) => {
                    return path.split('.').reduce((current, key) => current?.[key], obj);
                };

                // Check different state management systems
                const stores = [
                    window.$store?.state, // Vuex
                    window.__REDUX_DEVTOOLS_EXTENSION__?.store?.getState(), // Redux
                    window.store?.getState(), // Generic store
                    window.state // Generic state
                ];

                for (const store of stores) {
                    if (store) {
                        const value = getValue(store, path);
                        if (value === expected) {
                            return true;
                        }
                    }
                }

                return false;

            }, statePath, expectedValue, { timeout: config.timeout, polling: config.interval });

            this.log(`State change detected: ${statePath} = ${expectedValue}`);
            return true;

        } catch (error) {
            this.log(`State change timeout: ${error.message}`);
            return false;
        }
    }

    /**
     * Monitor SPA for changes
     */
    startStateMonitoring(callback, options = {}) {
        const defaultOptions = {
            interval: 1000,
            monitorRoute: true,
            monitorState: true,
            monitorDOM: false
        };

        const config = { ...defaultOptions, ...options };

        if (this.stateMonitor) {
            clearInterval(this.stateMonitor);
        }

        this.log('Starting SPA state monitoring...');

        let previousState = {
            route: this.page.url(),
            timestamp: Date.now()
        };

        this.stateMonitor = setInterval(async () => {
            try {
                const currentState = {
                    route: this.page.url(),
                    timestamp: Date.now()
                };

                // Check for route changes
                if (config.monitorRoute && currentState.route !== previousState.route) {
                    callback({
                        type: 'route_change',
                        from: previousState.route,
                        to: currentState.route,
                        timestamp: currentState.timestamp
                    });
                }

                // Get framework state if requested
                if (config.monitorState) {
                    const frameeworkState = await this.page.evaluate(() => {
                        const state = {};
                        
                        // Redux
                        if (window.__REDUX_DEVTOOLS_EXTENSION__?.store) {
                            state.redux = window.__REDUX_DEVTOOLS_EXTENSION__.store.getState();
                        }
                        
                        // Vuex
                        if (window.$store?.state) {
                            state.vuex = window.$store.state;
                        }
                        
                        return Object.keys(state).length > 0 ? state : null;
                    });

                    if (frameeworkState) {
                        currentState.frameworks = frameeworkState;
                    }
                }

                previousState = currentState;

            } catch (error) {
                this.log(`State monitoring error: ${error.message}`);
            }

        }, config.interval);

        return this.stateMonitor;
    }

    /**
     * Stop state monitoring
     */
    stopStateMonitoring() {
        if (this.stateMonitor) {
            clearInterval(this.stateMonitor);
            this.stateMonitor = null;
            this.log('State monitoring stopped');
        }
    }

    /**
     * Wait for API calls to complete
     */
    async waitForAPICalls(patterns = [], options = {}) {
        const defaultOptions = {
            timeout: 15000,
            method: 'GET'
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Waiting for API calls: ${patterns.join(', ')}`);

            const promises = patterns.map(pattern => 
                this.page.waitForResponse(response => 
                    response.url().includes(pattern) && 
                    response.request().method() === config.method &&
                    response.status() < 400,
                    { timeout: config.timeout }
                )
            );

            await Promise.all(promises);
            this.log('All API calls completed');
            return true;

        } catch (error) {
            this.log(`API calls timeout: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle SPA form submission with validation
     */
    async submitSPAForm(formSelector, options = {}) {
        const defaultOptions = {
            waitForValidation: true,
            waitForSubmit: true,
            timeout: 15000
        };

        const config = { ...defaultOptions, ...options };

        try {
            this.log(`Submitting SPA form: ${formSelector}`);

            const form = await this.page.$(formSelector);
            if (!form) {
                throw new Error(`Form not found: ${formSelector}`);
            }

            // Submit form
            await this.humanSim.simulateActionDelay('submit');
            await form.submit();

            // Wait for validation if enabled
            if (config.waitForValidation) {
                await this.waitForFormValidation(formSelector, config.timeout);
            }

            // Wait for submission to complete
            if (config.waitForSubmit) {
                await this.waitForSubmissionComplete(config.timeout);
            }

            this.log('SPA form submitted successfully');
            return true;

        } catch (error) {
            this.log(`SPA form submission failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Wait for form validation to complete
     */
    async waitForFormValidation(formSelector, timeout = 10000) {
        try {
            await this.page.waitForFunction((selector) => {
                const form = document.querySelector(selector);
                if (!form) return true;

                // Check for validation indicators
                const validationSelectors = [
                    '.error',
                    '.invalid',
                    '.field-error',
                    '[class*="error"]',
                    '.validation-message'
                ];

                const hasErrors = validationSelectors.some(sel => 
                    form.querySelector(sel) && form.querySelector(sel).offsetParent !== null
                );

                // If no errors visible, validation is likely complete
                return !hasErrors;

            }, formSelector, { timeout, polling: 250 });

            this.log('Form validation completed');

        } catch (error) {
            this.log(`Form validation timeout: ${error.message}`);
        }
    }

    /**
     * Wait for form submission to complete
     */
    async waitForSubmissionComplete(timeout = 15000) {
        try {
            await this.page.waitForFunction(() => {
                // Check for loading indicators
                const loadingSelectors = [
                    '.submitting',
                    '.loading',
                    '[class*="loading"]',
                    '.spinner',
                    '.progress'
                ];

                return !loadingSelectors.some(selector => {
                    const element = document.querySelector(selector);
                    return element && element.offsetParent !== null;
                });

            }, {}, { timeout, polling: 250 });

            this.log('Form submission completed');

        } catch (error) {
            this.log(`Form submission timeout: ${error.message}`);
        }
    }

    /**
     * Get SPA performance metrics
     */
    async getSPAMetrics() {
        try {
            const metrics = await this.page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                
                return {
                    // Basic metrics
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    
                    // Paint metrics
                    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                    
                    // SPA specific
                    routeHistory: this.routeHistory,
                    frameworkInfo: this.frameworkInfo
                };
            });

            this.log(`SPA metrics collected: ${JSON.stringify(metrics, null, 2)}`);
            return metrics;

        } catch (error) {
            this.log(`Failed to get SPA metrics: ${error.message}`);
            return {};
        }
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
        console.log(`[SPA] ${message}`);
    }

    /**
     * Get SPA handling logs
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.stopStateMonitoring();
        this.routeHistory = [];
        this.frameworkInfo = null;
        this.log('SPA handler cleaned up');
    }
}

module.exports = SPAHandler;