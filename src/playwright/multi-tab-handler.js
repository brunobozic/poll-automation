/**
 * Multi-Tab/Window Handler
 * Handles poll redirects that open new tabs/windows and manages the browser context
 * Specifically designed for poll sites that use multiple redirects and tab openings
 */

class MultiTabHandler {
    constructor(browser, options = {}) {
        this.browser = browser;
        this.contexts = new Map(); // Track browser contexts
        this.pages = new Map(); // Track pages by URL patterns
        this.mainPage = null;
        this.currentActivePage = null;
        this.redirectChain = [];
        
        this.options = {
            maxTabs: options.maxTabs || 10,
            tabTimeout: options.tabTimeout || 30000,
            redirectTimeout: options.redirectTimeout || 15000,
            closeUnusedTabs: options.closeUnusedTabs !== false,
            ...options
        };
        
        this.setupEventListeners();
    }

    /**
     * Initialize the tab handler with a starting page
     */
    async initialize(startingPage) {
        this.mainPage = startingPage;
        this.currentActivePage = startingPage;
        
        // Register the initial page
        this.registerPage(startingPage, 'main');
        
        console.log('🏗️ Multi-tab handler initialized');
        return this;
    }

    /**
     * Set up event listeners for new tabs and popups
     */
    setupEventListeners() {
        // Listen for new browser contexts (incognito windows)
        this.browser.on('browsercontext', (context) => {
            console.log('🌐 New browser context created');
            this.handleNewContext(context);
        });
    }

    /**
     * Handle new browser context
     */
    async handleNewContext(context) {
        this.contexts.set(context, new Date());
        
        // Listen for new pages in this context
        context.on('page', (page) => {
            console.log('📄 New page opened:', page.url());
            this.handleNewPage(page);
        });

        // Handle context closing
        context.on('close', () => {
            console.log('❌ Browser context closed');
            this.contexts.delete(context);
        });
    }

    /**
     * Handle new page/tab creation
     */
    async handleNewPage(page) {
        // Wait for the page to load
        try {
            await page.waitForLoadState('load', { timeout: this.options.tabTimeout });
            
            const url = page.url();
            console.log(`📝 New page loaded: ${url}`);
            
            // Register the page
            this.registerPage(page, this.identifyPageType(url));
            
            // Check if this is a poll-related page
            if (await this.isPollPage(page)) {
                console.log('🎯 Poll page detected in new tab');
                this.currentActivePage = page;
                this.redirectChain.push({
                    url,
                    timestamp: Date.now(),
                    type: 'poll_redirect'
                });
            }
            
            // Clean up unused tabs
            if (this.options.closeUnusedTabs) {
                await this.cleanupUnusedTabs();
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to handle new page:', error.message);
        }
    }

    /**
     * Register a page with tracking information
     */
    registerPage(page, type = 'unknown') {
        const pageInfo = {
            page,
            type,
            url: page.url(),
            createdAt: Date.now(),
            lastActive: Date.now(),
            isPollPage: false
        };
        
        this.pages.set(page, pageInfo);
        
        // Set up page event listeners
        this.setupPageListeners(page, pageInfo);
    }

    /**
     * Set up event listeners for a specific page
     */
    setupPageListeners(page, pageInfo) {
        // Track navigation within the page
        page.on('load', () => {
            pageInfo.lastActive = Date.now();
            pageInfo.url = page.url();
            console.log(`🔄 Page navigated: ${pageInfo.url}`);
        });

        // Track when the page closes
        page.on('close', () => {
            console.log(`❌ Page closed: ${pageInfo.url}`);
            this.pages.delete(page);
            
            // If this was the active page, find a new one
            if (this.currentActivePage === page) {
                this.findNewActivePage();
            }
        });

        // Track popup creation from this page
        page.on('popup', async (popup) => {
            console.log(`🪟 Popup created from: ${pageInfo.url}`);
            await this.handleNewPage(popup);
        });
    }

    /**
     * Identify the type of page based on URL patterns
     */
    identifyPageType(url) {
        const patterns = {
            'survey': /survey|poll|questionnaire|feedback/i,
            'redirect': /redirect|forward|continue/i,
            'auth': /login|auth|signin|oauth/i,
            'landing': /landing|welcome|start/i,
            'completion': /complete|finish|thank|done/i,
            'error': /error|404|403|500/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(url)) {
                return type;
            }
        }

        return 'unknown';
    }

    /**
     * Check if a page is a poll/survey page
     */
    async isPollPage(page) {
        try {
            const indicators = await page.evaluate(() => {
                // Look for poll indicators
                const pollSelectors = [
                    'form[id*="survey"]', 'form[id*="poll"]', 'form[class*="survey"]',
                    '.survey', '.poll', '.questionnaire', '.feedback-form',
                    '[data-survey]', '[data-poll]', '[data-question]',
                    'input[type="radio"]', 'input[type="checkbox"]'
                ];

                let score = 0;
                pollSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        score += elements.length;
                    }
                });

                // Check for poll-related text
                const text = document.body.textContent.toLowerCase();
                const pollKeywords = ['survey', 'poll', 'questionnaire', 'feedback', 'opinion'];
                pollKeywords.forEach(keyword => {
                    if (text.includes(keyword)) score += 5;
                });

                return {
                    score,
                    hasForm: document.querySelectorAll('form').length > 0,
                    hasQuestions: document.querySelectorAll('input[type="radio"], input[type="checkbox"]').length > 0,
                    title: document.title
                };
            });

            // Mark as poll page if it has sufficient indicators
            if (indicators.score > 5 || indicators.hasQuestions) {
                const pageInfo = this.pages.get(page);
                if (pageInfo) {
                    pageInfo.isPollPage = true;
                }
                return true;
            }

            return false;
        } catch (error) {
            console.warn('Failed to check if page is poll page:', error.message);
            return false;
        }
    }

    /**
     * Get the current active poll page
     */
    getCurrentActivePage() {
        return this.currentActivePage || this.mainPage;
    }

    /**
     * Switch to a specific page by URL pattern or type
     */
    async switchToPage(urlPattern, type = null) {
        for (const [page, info] of this.pages.entries()) {
            const matchesUrl = urlPattern ? new RegExp(urlPattern, 'i').test(info.url) : true;
            const matchesType = type ? info.type === type : true;
            
            if (matchesUrl && matchesType) {
                this.currentActivePage = page;
                info.lastActive = Date.now();
                
                // Bring the page to front
                await page.bringToFront();
                console.log(`🎯 Switched to page: ${info.url}`);
                return page;
            }
        }
        
        throw new Error(`No page found matching pattern: ${urlPattern}, type: ${type}`);
    }

    /**
     * Find the most recent poll page to become active
     */
    findNewActivePage() {
        const pollPages = Array.from(this.pages.entries())
            .filter(([page, info]) => info.isPollPage && !page.isClosed())
            .sort(([, a], [, b]) => b.lastActive - a.lastActive);

        if (pollPages.length > 0) {
            this.currentActivePage = pollPages[0][0];
            console.log(`🔄 Switched to most recent poll page: ${pollPages[0][1].url}`);
        } else {
            this.currentActivePage = this.mainPage;
            console.log('🔙 Fell back to main page');
        }
    }

    /**
     * Wait for a new tab/page to open (for redirects)
     */
    async waitForNewTab(timeout = 15000) {
        const initialPageCount = this.pages.size;
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (this.pages.size > initialPageCount) {
                    clearInterval(checkInterval);
                    
                    // Find the newest page
                    const newestPage = Array.from(this.pages.entries())
                        .sort(([, a], [, b]) => b.createdAt - a.createdAt)[0];
                    
                    resolve(newestPage[0]);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Timeout waiting for new tab'));
                }
            }, 100);
        });
    }

    /**
     * Handle redirect clicks that might open new tabs
     */
    async handleRedirectClick(selector, page = null) {
        const targetPage = page || this.getCurrentActivePage();
        
        console.log(`🖱️ Clicking redirect element: ${selector}`);
        
        // Set up promise to wait for new page
        const newPagePromise = this.waitForNewTab(this.options.redirectTimeout);
        
        try {
            // Click the element
            await targetPage.click(selector);
            
            // Wait for either new tab or navigation
            const result = await Promise.race([
                newPagePromise.then(page => ({ type: 'new_tab', page })),
                targetPage.waitForNavigation({ timeout: 5000 })
                    .then(() => ({ type: 'navigation', page: targetPage }))
                    .catch(() => null)
            ]);

            if (result && result.type === 'new_tab') {
                console.log('✅ New tab opened after redirect click');
                this.currentActivePage = result.page;
                return result.page;
            } else if (result && result.type === 'navigation') {
                console.log('✅ Page navigated after redirect click');
                return targetPage;
            } else {
                console.log('⏳ No immediate redirect detected, continuing on current page');
                return targetPage;
            }
            
        } catch (error) {
            console.warn('⚠️ Redirect click failed:', error.message);
            return targetPage;
        }
    }

    /**
     * Close unused tabs to manage resources
     */
    async cleanupUnusedTabs() {
        const now = Date.now();
        const maxIdleTime = 5 * 60 * 1000; // 5 minutes

        for (const [page, info] of this.pages.entries()) {
            // Don't close the main page or current active page
            if (page === this.mainPage || page === this.currentActivePage) {
                continue;
            }

            // Close pages that haven't been active for too long
            if (now - info.lastActive > maxIdleTime) {
                try {
                    console.log(`🧹 Closing idle page: ${info.url}`);
                    await page.close();
                } catch (error) {
                    console.warn('Failed to close idle page:', error.message);
                }
            }
        }

        // Enforce max tabs limit
        if (this.pages.size > this.options.maxTabs) {
            const sortedPages = Array.from(this.pages.entries())
                .filter(([page]) => page !== this.mainPage && page !== this.currentActivePage)
                .sort(([, a], [, b]) => a.lastActive - b.lastActive);

            const pagesToClose = sortedPages.slice(0, this.pages.size - this.options.maxTabs);
            
            for (const [page, info] of pagesToClose) {
                try {
                    console.log(`🗑️ Closing excess tab: ${info.url}`);
                    await page.close();
                } catch (error) {
                    console.warn('Failed to close excess page:', error.message);
                }
            }
        }
    }

    /**
     * Get all currently open poll pages
     */
    getPollPages() {
        return Array.from(this.pages.entries())
            .filter(([page, info]) => info.isPollPage && !page.isClosed())
            .map(([page, info]) => ({ page, info }));
    }

    /**
     * Get redirect chain information
     */
    getRedirectChain() {
        return this.redirectChain;
    }

    /**
     * Close all pages except the main page
     */
    async closeAllExceptMain() {
        for (const [page, info] of this.pages.entries()) {
            if (page !== this.mainPage && !page.isClosed()) {
                try {
                    console.log(`❌ Closing page: ${info.url}`);
                    await page.close();
                } catch (error) {
                    console.warn('Failed to close page:', error.message);
                }
            }
        }
        
        this.currentActivePage = this.mainPage;
        this.pages.clear();
        if (this.mainPage) {
            this.registerPage(this.mainPage, 'main');
        }
    }

    /**
     * Get handler statistics
     */
    getStats() {
        const pages = Array.from(this.pages.values());
        return {
            totalPages: pages.length,
            pollPages: pages.filter(p => p.isPollPage).length,
            contexts: this.contexts.size,
            redirects: this.redirectChain.length,
            currentUrl: this.currentActivePage?.url() || 'none',
            activePages: pages.filter(p => !p.page.isClosed()).length
        };
    }
}

module.exports = MultiTabHandler;