/**
 * Consolidated Multi-Tab Handler
 * Combines functionality from both basic and enhanced multi-tab handlers
 * Handles complex poll flows with 2-3+ tabs, parallel processing, and intelligent coordination
 * 
 * Replaces:
 * - src/playwright/multi-tab-handler.js
 * - src/playwright/enhanced-multi-tab-handler.js
 */

class ConsolidatedMultiTabHandler {
    constructor(browser, options = {}) {
        this.browser = browser;
        this.contexts = new Map();
        this.tabs = new Map(); // Enhanced tab tracking
        this.pages = new Map(); // Legacy page tracking
        this.tabGroups = new Map();
        this.mainTab = null;
        this.activeTab = null;
        this.currentActivePage = null; // Legacy compatibility
        this.redirectChain = [];
        
        this.options = {
            maxTabs: options.maxTabs || 15,
            tabTimeout: options.tabTimeout || 45000,
            redirectTimeout: options.redirectTimeout || 20000,
            closeUnusedTabs: options.closeUnusedTabs !== false,
            parallelProcessing: options.parallelProcessing !== false,
            tabSyncTimeout: options.tabSyncTimeout || 10000,
            ...options
        };
        
        this.flowState = {
            totalTabs: 0,
            activeTabs: 0,
            completedTabs: 0,
            flowPhase: 'initial',
            tabSequence: [],
            parallelGroups: [],
            waitingForTabs: false
        };
        
        this.setupEventListeners();
    }

    /**
     * Initialize with enhanced capabilities
     */
    async initialize(startingPage) {
        this.mainTab = startingPage;
        this.activeTab = startingPage;
        this.currentActivePage = startingPage; // Legacy compatibility
        
        // Enhanced tab info
        const tabInfo = this.createTabInfo(startingPage, 'main', 0);
        this.tabs.set(startingPage, tabInfo);
        
        // Legacy page info
        this.registerPage(startingPage, 'main');
        
        // Set up enhanced event listeners
        await this.setupTabListeners(startingPage, tabInfo);
        
        console.log('🚀 Consolidated Multi-Tab Handler initialized');
        console.log(`   Max tabs: ${this.options.maxTabs}`);
        console.log(`   Parallel processing: ${this.options.parallelProcessing}`);
        
        return this;
    }

    /**
     * Enhanced event listener setup
     */
    setupEventListeners() {
        // Listen for new browser contexts
        this.browser.on('browsercontext', (context) => {
            console.log('🌐 New browser context detected');
            this.handleNewContext(context);
        });
        
        // Enhanced target tracking
        this.browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                console.log('🎯 New page target created');
                const page = await target.page();
                if (page) {
                    await this.handleNewTab(page, 'targetcreated');
                }
            }
        });
    }

    /**
     * Handle new browser context
     */
    async handleNewContext(context) {
        this.contexts.set(context, new Date());
        
        context.on('page', (page) => {
            console.log('📄 New page opened:', page.url());
            this.handleNewPage(page);
        });

        context.on('close', () => {
            console.log('❌ Browser context closed');
            this.contexts.delete(context);
        });
    }

    /**
     * Create comprehensive tab information
     */
    createTabInfo(page, type, order) {
        return {
            page,
            type, // main, poll, redirect, verification, completion, auxiliary
            order,
            createdAt: Date.now(),
            lastActive: Date.now(),
            url: page.url(),
            status: 'active', // active, waiting, processing, completed, error
            parentTab: null,
            childTabs: [],
            flowStep: 0,
            questions: [],
            answered: 0,
            isPollPage: false,
            isBlocking: false,
            syncGroup: null,
            metadata: {
                redirectChain: [],
                userActions: [],
                errors: [],
                screenshots: []
            }
        };
    }

    /**
     * Legacy page registration for backward compatibility
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
        this.setupPageListeners(page, pageInfo);
    }

    /**
     * Enhanced new tab handling with intelligent classification
     */
    async handleNewTab(page, source = 'unknown') {
        console.log(`📄 New tab detected from: ${source}`);
        
        try {
            // Wait for initial load
            await Promise.race([
                page.waitForLoadState('load', { timeout: this.options.tabTimeout }),
                page.waitForLoadState('domcontentloaded', { timeout: this.options.tabTimeout })
            ]);
            
            const url = page.url();
            console.log(`   URL: ${url}`);
            
            // Classify the new tab
            const tabType = await this.classifyTab(page);
            const tabOrder = this.tabs.size;
            
            // Create enhanced tab info
            const tabInfo = this.createTabInfo(page, tabType.type, tabOrder);
            tabInfo.isPollPage = tabType.isPollPage;
            tabInfo.isBlocking = tabType.isBlocking;
            tabInfo.syncGroup = tabType.syncGroup;
            
            // Register the tab
            this.tabs.set(page, tabInfo);
            
            // Legacy registration
            this.registerPage(page, tabType.type);
            const pageInfo = this.pages.get(page);
            if (pageInfo) {
                pageInfo.isPollPage = tabType.isPollPage;
            }
            
            // Set up listeners
            await this.setupTabListeners(page, tabInfo);
            
            // Update flow state
            this.updateFlowState();
            
            // Handle tab relationships
            await this.establishTabRelationships(page, tabInfo);
            
            // Decide if this should be the active tab
            if (tabInfo.isPollPage && (tabInfo.isBlocking || !this.activeTab || 
                this.tabs.get(this.activeTab).type !== 'poll')) {
                await this.switchToTab(page);
            }
            
            console.log(`✅ Tab registered: ${tabType.type} (order: ${tabOrder})`);
            
            return tabInfo;
            
        } catch (error) {
            console.warn(`⚠️ Failed to handle new tab: ${error.message}`);
            return null;
        }
    }

    /**
     * Legacy new page handling for backward compatibility
     */
    async handleNewPage(page) {
        // Delegate to enhanced handler
        await this.handleNewTab(page, 'legacy');
    }

    /**
     * Intelligent tab classification using AI and patterns
     */
    async classifyTab(page) {
        const url = page.url();
        const title = await page.title().catch(() => '');
        
        // Quick pattern-based classification
        const patterns = {
            poll: /survey|poll|questionnaire|feedback|form/i,
            redirect: /redirect|continue|next|proceed/i,
            verification: /verify|confirm|validate|check/i,
            completion: /complete|finish|thank|done|success|submitted/i,
            error: /error|404|403|500|problem/i
        };
        
        let type = 'auxiliary';
        let isPollPage = false;
        let isBlocking = false;
        let syncGroup = null;
        
        // Pattern matching
        for (const [patternType, pattern] of Object.entries(patterns)) {
            if (pattern.test(url) || pattern.test(title)) {
                type = patternType;
                break;
            }
        }
        
        // Enhanced detection with page content analysis
        try {
            const pageAnalysis = await page.evaluate(() => {
                const indicators = {
                    hasForm: document.querySelectorAll('form').length > 0,
                    hasQuestions: document.querySelectorAll('input[type="radio"], input[type="checkbox"]').length > 0,
                    hasSubmit: document.querySelectorAll('button[type="submit"], input[type="submit"]').length > 0,
                    hasProgress: document.querySelectorAll('.progress, [role="progressbar"]').length > 0,
                    hasError: document.querySelectorAll('.error, .alert-danger, [role="alert"]').length > 0,
                    hasSuccess: document.querySelectorAll('.success, .alert-success, .complete').length > 0,
                    bodyText: document.body.textContent.toLowerCase().substring(0, 500),
                    formCount: document.querySelectorAll('form').length,
                    inputCount: document.querySelectorAll('input, select, textarea').length
                };
                
                // Poll page scoring
                let pollScore = 0;
                if (indicators.hasForm) pollScore += 3;
                if (indicators.hasQuestions) pollScore += 5;
                if (indicators.hasSubmit) pollScore += 2;
                if (indicators.hasProgress) pollScore += 3;
                if (indicators.inputCount > 5) pollScore += 2;
                
                return {
                    ...indicators,
                    pollScore,
                    isPollCandidate: pollScore >= 5
                };
            });
            
            // Update classification based on content
            if (pageAnalysis.isPollCandidate) {
                type = 'poll';
                isPollPage = true;
                isBlocking = true;
            }
            
            if (pageAnalysis.hasError) {
                type = 'error';
                isBlocking = true;
            }
            
            if (pageAnalysis.hasSuccess && /complete|finish|thank/.test(pageAnalysis.bodyText)) {
                type = 'completion';
                isBlocking = false;
            }
            
            // Determine sync group for related tabs
            if (isPollPage) {
                syncGroup = 'poll_flow';
            } else if (type === 'verification') {
                syncGroup = 'verification_flow';
            }
            
        } catch (error) {
            console.warn(`Tab classification analysis failed: ${error.message}`);
        }
        
        return {
            type,
            isPollPage,
            isBlocking,
            syncGroup,
            url,
            title
        };
    }

    /**
     * Establish relationships between tabs
     */
    async establishTabRelationships(newPage, newTabInfo) {
        // Find potential parent tab
        const possibleParents = Array.from(this.tabs.entries())
            .filter(([page, info]) => page !== newPage && info.status === 'active')
            .sort(([, a], [, b]) => b.lastActive - a.lastActive);
        
        if (possibleParents.length > 0) {
            const [parentPage, parentInfo] = possibleParents[0];
            newTabInfo.parentTab = parentPage;
            parentInfo.childTabs.push(newPage);
            
            console.log(`🔗 Tab relationship: ${parentInfo.type} → ${newTabInfo.type}`);
        }
        
        // Group tabs for synchronized processing
        if (newTabInfo.syncGroup) {
            if (!this.tabGroups.has(newTabInfo.syncGroup)) {
                this.tabGroups.set(newTabInfo.syncGroup, []);
            }
            this.tabGroups.get(newTabInfo.syncGroup).push(newPage);
        }
    }

    /**
     * Enhanced tab listener setup
     */
    async setupTabListeners(page, tabInfo) {
        // Navigation tracking
        page.on('load', async () => {
            tabInfo.url = page.url();
            tabInfo.lastActive = Date.now();
            tabInfo.metadata.redirectChain.push({
                url: page.url(),
                timestamp: Date.now()
            });
            
            console.log(`🔄 Tab navigated: ${tabInfo.type} → ${page.url()}`);
            
            // Re-classify if needed
            if (tabInfo.type === 'auxiliary') {
                const newClassification = await this.classifyTab(page);
                if (newClassification.isPollPage) {
                    tabInfo.type = newClassification.type;
                    tabInfo.isPollPage = true;
                    tabInfo.isBlocking = newClassification.isBlocking;
                    console.log(`🔄 Tab reclassified as: ${newClassification.type}`);
                }
            }
        });

        // Error tracking
        page.on('pageerror', (error) => {
            tabInfo.metadata.errors.push({
                error: error.message,
                timestamp: Date.now()
            });
            console.warn(`❌ Tab error in ${tabInfo.type}: ${error.message}`);
        });

        // Close tracking
        page.on('close', () => {
            console.log(`❌ Tab closed: ${tabInfo.type}`);
            this.handleTabClose(page, tabInfo);
        });

        // New page creation tracking
        page.on('popup', async (popup) => {
            console.log(`🪟 Popup created from ${tabInfo.type}`);
            await this.handleNewTab(popup, 'popup');
        });
    }

    /**
     * Legacy page listener setup for backward compatibility
     */
    setupPageListeners(page, pageInfo) {
        page.on('load', () => {
            pageInfo.lastActive = Date.now();
            pageInfo.url = page.url();
            console.log(`🔄 Page navigated: ${pageInfo.url}`);
        });

        page.on('close', () => {
            console.log(`❌ Page closed: ${pageInfo.url}`);
            this.pages.delete(page);
            
            if (this.currentActivePage === page) {
                this.findNewActivePage();
            }
        });

        page.on('popup', async (popup) => {
            console.log(`🪟 Popup created from: ${pageInfo.url}`);
            await this.handleNewPage(popup);
        });
    }

    /**
     * Update overall flow state
     */
    updateFlowState() {
        const allTabs = Array.from(this.tabs.values());
        
        this.flowState.totalTabs = allTabs.length;
        this.flowState.activeTabs = allTabs.filter(t => t.status === 'active').length;
        this.flowState.completedTabs = allTabs.filter(t => t.status === 'completed').length;
        
        // Determine flow phase
        if (this.flowState.totalTabs === 1) {
            this.flowState.flowPhase = 'initial';
        } else if (this.flowState.activeTabs > 1) {
            this.flowState.flowPhase = 'multi_tab';
        } else if (this.flowState.completedTabs > 0 && this.flowState.activeTabs === 1) {
            this.flowState.flowPhase = 'consolidation';
        }
        
        console.log(`📊 Flow State: ${this.flowState.flowPhase} (${this.flowState.activeTabs}/${this.flowState.totalTabs} active)`);
    }

    /**
     * Wait for multiple tabs to be created
     */
    async waitForMultipleTabs(expectedCount, timeout = 30000) {
        console.log(`⏳ Waiting for ${expectedCount} tabs to be created...`);
        this.flowState.waitingForTabs = true;
        
        const startTime = Date.now();
        
        while (this.tabs.size < expectedCount && Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.flowState.waitingForTabs = false;
        
        if (this.tabs.size >= expectedCount) {
            console.log(`✅ ${this.tabs.size} tabs ready for processing`);
            return true;
        } else {
            console.log(`⚠️ Timeout: only ${this.tabs.size}/${expectedCount} tabs created`);
            return false;
        }
    }

    /**
     * Wait for new tab (legacy compatibility)
     */
    async waitForNewTab(timeout = 15000) {
        const initialPageCount = this.pages.size;
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (this.pages.size > initialPageCount) {
                    clearInterval(checkInterval);
                    
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
     * Process tabs in parallel
     */
    async processTabsInParallel(tabGroup = null) {
        console.log('🔄 Starting parallel tab processing...');
        
        let tabsToProcess;
        if (tabGroup && this.tabGroups.has(tabGroup)) {
            tabsToProcess = this.tabGroups.get(tabGroup);
        } else {
            tabsToProcess = Array.from(this.tabs.keys()).filter(page => {
                const info = this.tabs.get(page);
                return info.isPollPage && info.status === 'active';
            });
        }
        
        if (tabsToProcess.length === 0) {
            console.log('No tabs available for parallel processing');
            return [];
        }
        
        console.log(`Processing ${tabsToProcess.length} tabs in parallel`);
        
        const results = await Promise.allSettled(
            tabsToProcess.map(page => this.processIndividualTab(page))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`✅ Parallel processing complete: ${successful}/${results.length} succeeded`);
        
        return results;
    }

    /**
     * Process an individual tab
     */
    async processIndividualTab(page) {
        const tabInfo = this.tabs.get(page);
        if (!tabInfo) {
            throw new Error('Tab not registered');
        }
        
        console.log(`🔄 Processing tab: ${tabInfo.type} (${page.url()})`);
        tabInfo.status = 'processing';
        
        try {
            await page.bringToFront();
            
            let result;
            switch (tabInfo.type) {
                case 'poll':
                    result = await this.processPollTab(page, tabInfo);
                    break;
                case 'verification':
                    result = await this.processVerificationTab(page, tabInfo);
                    break;
                case 'redirect':
                    result = await this.processRedirectTab(page, tabInfo);
                    break;
                default:
                    result = await this.processGenericTab(page, tabInfo);
            }
            
            tabInfo.status = 'completed';
            tabInfo.lastActive = Date.now();
            
            console.log(`✅ Tab processing complete: ${tabInfo.type}`);
            return result;
            
        } catch (error) {
            tabInfo.status = 'error';
            tabInfo.metadata.errors.push({
                error: error.message,
                timestamp: Date.now()
            });
            console.error(`❌ Tab processing failed: ${tabInfo.type} - ${error.message}`);
            throw error;
        }
    }

    /**
     * Process a poll tab
     */
    async processPollTab(page, tabInfo) {
        console.log(`📋 Processing poll tab: ${page.url()}`);
        
        const questions = await page.evaluate(() => {
            const questionElements = document.querySelectorAll('.question, .survey-question, .form-question, fieldset');
            return Array.from(questionElements).map((el, index) => ({
                index,
                text: el.textContent?.trim().substring(0, 200),
                type: el.querySelector('input[type="radio"]') ? 'radio' : 
                      el.querySelector('input[type="checkbox"]') ? 'checkbox' : 'text',
                answered: !!el.querySelector('input:checked, input[value!=""], textarea[value!=""]')
            }));
        });
        
        tabInfo.questions = questions;
        console.log(`   Found ${questions.length} questions`);
        
        let answered = 0;
        for (const question of questions.filter(q => !q.answered)) {
            try {
                if (question.type === 'radio') {
                    const radioButtons = await page.$$('input[type="radio"]');
                    if (radioButtons.length > 0) {
                        await radioButtons[0].click();
                        answered++;
                    }
                } else if (question.type === 'checkbox') {
                    const checkboxes = await page.$$('input[type="checkbox"]');
                    if (checkboxes.length > 0) {
                        await checkboxes[0].click();
                        answered++;
                    }
                }
                
                await page.waitForTimeout(500 + Math.random() * 1000);
            } catch (error) {
                console.warn(`Failed to answer question ${question.index}: ${error.message}`);
            }
        }
        
        tabInfo.answered = answered;
        console.log(`   Answered ${answered} questions`);
        
        const submitResult = await this.findAndClickSubmit(page);
        
        return {
            tabType: 'poll',
            questionsFound: questions.length,
            questionsAnswered: answered,
            submitted: submitResult.success
        };
    }

    /**
     * Process verification tab
     */
    async processVerificationTab(page, tabInfo) {
        console.log(`✅ Processing verification tab: ${page.url()}`);
        
        const verificationElements = await page.$$('.verify, .confirm, [data-verify], .verification');
        
        if (verificationElements.length > 0) {
            await verificationElements[0].click();
            await page.waitForTimeout(2000);
        }
        
        return {
            tabType: 'verification',
            verified: true
        };
    }

    /**
     * Process redirect tab
     */
    async processRedirectTab(page, tabInfo) {
        console.log(`🔄 Processing redirect tab: ${page.url()}`);
        
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        return {
            tabType: 'redirect',
            finalUrl: page.url()
        };
    }

    /**
     * Process generic tab
     */
    async processGenericTab(page, tabInfo) {
        console.log(`📄 Processing generic tab: ${page.url()}`);
        
        const continueButtons = await page.$$('button:has-text("Continue"), button:has-text("Next"), .continue, .next');
        
        if (continueButtons.length > 0) {
            await continueButtons[0].click();
            await page.waitForTimeout(2000);
        }
        
        return {
            tabType: 'generic',
            interacted: continueButtons.length > 0
        };
    }

    /**
     * Find and click submit button
     */
    async findAndClickSubmit(page) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Continue")',
            'button:has-text("Next")',
            '.submit', '.continue', '.next',
            '[data-submit]'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    await button.click();
                    await page.waitForTimeout(2000);
                    return { success: true, selector };
                }
            } catch (error) {
                continue;
            }
        }
        
        return { success: false, error: 'No submit button found' };
    }

    /**
     * Handle redirect clicks that might open new tabs
     */
    async handleRedirectClick(selector, page = null) {
        const targetPage = page || this.getCurrentActivePage();
        
        console.log(`🖱️ Clicking redirect element: ${selector}`);
        
        const newPagePromise = this.waitForNewTab(this.options.redirectTimeout);
        
        try {
            await targetPage.click(selector);
            
            const result = await Promise.race([
                newPagePromise.then(page => ({ type: 'new_tab', page })),
                targetPage.waitForNavigation({ timeout: 5000 })
                    .then(() => ({ type: 'navigation', page: targetPage }))
                    .catch(() => null)
            ]);

            if (result && result.type === 'new_tab') {
                console.log('✅ New tab opened after redirect click');
                this.currentActivePage = result.page;
                this.activeTab = result.page;
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
     * Synchronize tabs in a group
     */
    async synchronizeTabGroup(groupName) {
        if (!this.tabGroups.has(groupName)) {
            console.log(`No tab group found: ${groupName}`);
            return;
        }
        
        const tabs = this.tabGroups.get(groupName);
        console.log(`🔄 Synchronizing ${tabs.length} tabs in group: ${groupName}`);
        
        const readyPromises = tabs.map(page => {
            return Promise.race([
                page.waitForLoadState('networkidle'),
                page.waitForLoadState('domcontentloaded')
            ]);
        });
        
        await Promise.all(readyPromises);
        console.log(`✅ Tab group synchronized: ${groupName}`);
    }

    /**
     * Switch to specific tab
     */
    async switchToTab(page) {
        if (!this.tabs.has(page)) {
            throw new Error('Tab not registered');
        }
        
        this.activeTab = page;
        this.currentActivePage = page; // Legacy compatibility
        const tabInfo = this.tabs.get(page);
        tabInfo.lastActive = Date.now();
        
        await page.bringToFront();
        console.log(`🎯 Switched to tab: ${tabInfo.type} (${page.url()})`);
        
        return page;
    }

    /**
     * Switch to page (legacy compatibility)
     */
    async switchToPage(urlPattern, type = null) {
        for (const [page, info] of this.pages.entries()) {
            const matchesUrl = urlPattern ? new RegExp(urlPattern, 'i').test(info.url) : true;
            const matchesType = type ? info.type === type : true;
            
            if (matchesUrl && matchesType) {
                this.currentActivePage = page;
                this.activeTab = page;
                info.lastActive = Date.now();
                
                await page.bringToFront();
                console.log(`🎯 Switched to page: ${info.url}`);
                return page;
            }
        }
        
        throw new Error(`No page found matching pattern: ${urlPattern}, type: ${type}`);
    }

    /**
     * Get current active page/tab
     */
    getCurrentActivePage() {
        return this.currentActivePage || this.mainTab;
    }

    /**
     * Get the most relevant tab for poll completion
     */
    getMostRelevantTab() {
        const pollTabs = Array.from(this.tabs.entries())
            .filter(([page, info]) => info.isPollPage && info.status === 'active')
            .sort(([, a], [, b]) => b.lastActive - a.lastActive);
        
        if (pollTabs.length > 0) {
            return pollTabs[0][0];
        }
        
        const activeTabs = Array.from(this.tabs.entries())
            .filter(([page, info]) => info.status === 'active')
            .sort(([, a], [, b]) => b.lastActive - a.lastActive);
        
        return activeTabs.length > 0 ? activeTabs[0][0] : this.activeTab;
    }

    /**
     * Find new active page (legacy compatibility)
     */
    findNewActivePage() {
        const pollPages = Array.from(this.pages.entries())
            .filter(([page, info]) => info.isPollPage && !page.isClosed())
            .sort(([, a], [, b]) => b.lastActive - a.lastActive);

        if (pollPages.length > 0) {
            this.currentActivePage = pollPages[0][0];
            this.activeTab = pollPages[0][0];
            console.log(`🔄 Switched to most recent poll page: ${pollPages[0][1].url}`);
        } else {
            this.currentActivePage = this.mainTab;
            this.activeTab = this.mainTab;
            console.log('🔙 Fell back to main page');
        }
    }

    /**
     * Handle tab closure
     */
    handleTabClose(page, tabInfo) {
        tabInfo.status = 'closed';
        
        // Update child tabs
        tabInfo.childTabs.forEach(childPage => {
            const childInfo = this.tabs.get(childPage);
            if (childInfo) {
                childInfo.parentTab = null;
            }
        });
        
        // If this was the active tab, find a new one
        if (this.activeTab === page) {
            const newActiveTab = this.getMostRelevantTab();
            if (newActiveTab && newActiveTab !== page) {
                this.activeTab = newActiveTab;
                this.currentActivePage = newActiveTab;
            }
        }
        
        this.updateFlowState();
    }

    /**
     * Check if page is poll page (legacy compatibility)
     */
    async isPollPage(page) {
        try {
            const indicators = await page.evaluate(() => {
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
     * Get poll pages (legacy compatibility)
     */
    getPollPages() {
        return Array.from(this.pages.entries())
            .filter(([page, info]) => info.isPollPage && !page.isClosed())
            .map(([page, info]) => ({ page, info }));
    }

    /**
     * Get redirect chain
     */
    getRedirectChain() {
        return this.redirectChain;
    }

    /**
     * Clean up unused tabs
     */
    async cleanupUnusedTabs() {
        const now = Date.now();
        const maxIdleTime = 5 * 60 * 1000; // 5 minutes

        for (const [page, info] of this.tabs.entries()) {
            // Don't close the main page or current active page
            if (page === this.mainTab || page === this.activeTab) {
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
        if (this.tabs.size > this.options.maxTabs) {
            const sortedTabs = Array.from(this.tabs.entries())
                .filter(([page]) => page !== this.mainTab && page !== this.activeTab)
                .sort(([, a], [, b]) => a.lastActive - b.lastActive);

            const tabsToClose = sortedTabs.slice(0, this.tabs.size - this.options.maxTabs);
            
            for (const [page, info] of tabsToClose) {
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
     * Close all tabs except main
     */
    async closeAllExceptMain() {
        console.log('🧹 Closing all tabs except main...');
        
        for (const [page, info] of this.tabs.entries()) {
            if (page !== this.mainTab && !page.isClosed()) {
                try {
                    await page.close();
                } catch (error) {
                    console.warn(`Failed to close tab: ${error.message}`);
                }
            }
        }
        
        this.tabs.clear();
        this.pages.clear();
        this.tabGroups.clear();
        
        if (this.mainTab) {
            const mainInfo = this.createTabInfo(this.mainTab, 'main', 0);
            this.tabs.set(this.mainTab, mainInfo);
            this.registerPage(this.mainTab, 'main');
            this.activeTab = this.mainTab;
            this.currentActivePage = this.mainTab;
        }
        
        this.updateFlowState();
    }

    /**
     * Get comprehensive stats
     */
    getMultiTabStats() {
        const tabs = Array.from(this.tabs.values());
        
        return {
            totalTabs: tabs.length,
            tabsByType: tabs.reduce((acc, tab) => {
                acc[tab.type] = (acc[tab.type] || 0) + 1;
                return acc;
            }, {}),
            tabsByStatus: tabs.reduce((acc, tab) => {
                acc[tab.status] = (acc[tab.status] || 0) + 1;
                return acc;
            }, {}),
            pollTabs: tabs.filter(t => t.isPollPage).length,
            activeTabs: tabs.filter(t => t.status === 'active').length,
            completedTabs: tabs.filter(t => t.status === 'completed').length,
            flowPhase: this.flowState.flowPhase,
            tabGroups: this.tabGroups.size,
            currentActiveTab: this.activeTab ? this.tabs.get(this.activeTab)?.type : null
        };
    }

    /**
     * Get handler statistics (legacy compatibility)
     */
    getStats() {
        const pages = Array.from(this.pages.values());
        return {
            totalPages: pages.length,
            pollPages: pages.filter(p => p.isPollPage).length,
            contexts: this.contexts.size,
            redirects: this.redirectChain.length,
            currentUrl: this.currentActivePage?.url() || 'none',
            activePages: pages.filter(p => !p.page.isClosed()).length,
            // Enhanced stats
            ...this.getMultiTabStats()
        };
    }
}

module.exports = ConsolidatedMultiTabHandler;