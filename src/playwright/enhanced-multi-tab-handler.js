/**
 * Enhanced Multi-Tab Handler for Complex Poll Flows
 * Handles polls that open 2-3 additional browser tabs with advanced coordination
 * Supports parallel processing, tab synchronization, and intelligent flow management
 */

class EnhancedMultiTabHandler {
    constructor(browser, options = {}) {
        this.browser = browser;
        this.contexts = new Map();
        this.tabs = new Map();
        this.tabGroups = new Map(); // Group related tabs together
        this.mainTab = null;
        this.activeTab = null;
        
        this.options = {
            maxTabs: options.maxTabs || 15, // Increased for multi-tab scenarios
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
            flowPhase: 'initial', // initial, multi_tab, consolidation, completion
            tabSequence: [],
            parallelGroups: [],
            waitingForTabs: false
        };
        
        this.setupEventListeners();
    }

    /**
     * Initialize with enhanced multi-tab capabilities
     */
    async initialize(startingPage) {
        this.mainTab = startingPage;
        this.activeTab = startingPage;
        
        const tabInfo = this.createTabInfo(startingPage, 'main', 0);
        this.tabs.set(startingPage, tabInfo);
        
        // Set up enhanced event listeners for the main tab
        await this.setupTabListeners(startingPage, tabInfo);
        
        console.log('🚀 Enhanced Multi-Tab Handler initialized');
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
            isBlocking: false, // If this tab blocks progression
            syncGroup: null, // For tabs that need coordination
            metadata: {
                redirectChain: [],
                userActions: [],
                errors: [],
                screenshots: []
            }
        };
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
            
            // Create tab info
            const tabInfo = this.createTabInfo(page, tabType.type, tabOrder);
            tabInfo.isPollPage = tabType.isPollPage;
            tabInfo.isBlocking = tabType.isBlocking;
            tabInfo.syncGroup = tabType.syncGroup;
            
            // Register the tab
            this.tabs.set(page, tabInfo);
            
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
                isBlocking = true; // Poll pages typically require completion
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
        // Find potential parent tab (the one that might have opened this tab)
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
     * Wait for multiple tabs to be created (for complex flows)
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
     * Process tabs in parallel (for independent poll sections)
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
     * Process an individual tab (questions, forms, etc.)
     */
    async processIndividualTab(page) {
        const tabInfo = this.tabs.get(page);
        if (!tabInfo) {
            throw new Error('Tab not registered');
        }
        
        console.log(`🔄 Processing tab: ${tabInfo.type} (${page.url()})`);
        tabInfo.status = 'processing';
        
        try {
            // Switch to this tab for processing
            await page.bringToFront();
            
            // Process based on tab type
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
     * Process a poll tab (questions and forms)
     */
    async processPollTab(page, tabInfo) {
        console.log(`📋 Processing poll tab: ${page.url()}`);
        
        // Extract questions
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
        
        // Simple answering simulation (would integrate with AI in full implementation)
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
        
        // Look for submit button
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
        
        // Look for verification elements
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
        
        // Wait for redirect to complete
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
        
        // Basic interaction - look for continue/next buttons
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
     * Find and click submit button with enhanced detection
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
     * Synchronize tabs in a group
     */
    async synchronizeTabGroup(groupName) {
        if (!this.tabGroups.has(groupName)) {
            console.log(`No tab group found: ${groupName}`);
            return;
        }
        
        const tabs = this.tabGroups.get(groupName);
        console.log(`🔄 Synchronizing ${tabs.length} tabs in group: ${groupName}`);
        
        // Wait for all tabs to be ready
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
        const tabInfo = this.tabs.get(page);
        tabInfo.lastActive = Date.now();
        
        await page.bringToFront();
        console.log(`🎯 Switched to tab: ${tabInfo.type} (${page.url()})`);
        
        return page;
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
        
        // Fallback to most recently active tab
        const activeTabs = Array.from(this.tabs.entries())
            .filter(([page, info]) => info.status === 'active')
            .sort(([, a], [, b]) => b.lastActive - a.lastActive);
        
        return activeTabs.length > 0 ? activeTabs[0][0] : this.activeTab;
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
            }
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
        this.tabGroups.clear();
        
        if (this.mainTab) {
            const mainInfo = this.createTabInfo(this.mainTab, 'main', 0);
            this.tabs.set(this.mainTab, mainInfo);
            this.activeTab = this.mainTab;
        }
        
        this.updateFlowState();
    }
}

module.exports = EnhancedMultiTabHandler;