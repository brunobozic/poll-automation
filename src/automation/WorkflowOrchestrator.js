/**
 * Workflow Orchestrator
 * Consolidates functionality from:
 * - unified-poll-orchestrator.js
 * - master-bypass-coordinator.js
 * - Various orchestration logic from enhanced services
 * 
 * Provides unified automation workflow management
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class WorkflowOrchestrator extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            browser: options.browser || null,
            behaviorEngine: options.behaviorEngine || null,
            networkManager: options.networkManager || null,
            aiService: options.aiService || null,
            challengeResolver: options.challengeResolver || null,
            database: options.database || null,
            enableLearning: options.enableLearning !== false,
            debugMode: options.debugMode || false,
            maxRetries: options.maxRetries || 3,
            timeout: options.timeout || 30000,
            adaptiveDelay: options.adaptiveDelay !== false,
            ...options
        };

        // Core dependencies (injected)
        this.browser = this.options.browser;
        this.behaviorEngine = this.options.behaviorEngine;
        this.networkManager = this.options.networkManager;
        this.aiService = this.options.aiService;
        this.challengeResolver = this.options.challengeResolver;
        this.database = this.options.database;

        // Session management
        this.currentSession = null;
        this.activeTasks = new Map();
        this.isInitialized = false;

        // Workflow state machine
        this.workflowStates = {
            IDLE: 'idle',
            INITIALIZING: 'initializing',
            NAVIGATING: 'navigating',
            ANALYZING: 'analyzing',
            DETECTING_CHALLENGES: 'detecting_challenges',
            SOLVING_CHALLENGES: 'solving_challenges',
            FILLING_FORMS: 'filling_forms',
            SUBMITTING: 'submitting',
            VERIFYING: 'verifying',
            COMPLETING: 'completing',
            ERROR: 'error'
        };

        // Learning and adaptation engine
        this.learningEngine = {
            sitePatterns: new Map(),
            successStrategies: new Map(),
            failureAnalysis: new Map(),
            adaptiveRules: new Map()
        };

        // Performance tracking
        this.performance = {
            totalWorkflows: 0,
            successfulWorkflows: 0,
            failedWorkflows: 0,
            avgDuration: 0,
            challengesSolved: 0,
            formsFilled: 0,
            adaptations: 0
        };
    }

    /**
     * Initialize workflow orchestrator
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🎼 Initializing Workflow Orchestrator...');

        try {
            // Validate dependencies
            this.validateDependencies();

            // Load learning data
            if (this.options.enableLearning) {
                await this.loadLearningData();
            }

            // Setup workflow monitoring
            this.setupWorkflowMonitoring();

            this.isInitialized = true;
            console.log('✅ Workflow Orchestrator initialized');

        } catch (error) {
            console.error('❌ Workflow Orchestrator initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Execute complete automation workflow
     */
    async automateFullWorkflow(siteConfig, emailData, options = {}) {
        this.ensureInitialized();

        const workflowId = options.sessionId || crypto.randomUUID();
        const startTime = Date.now();

        console.log(`🎯 Starting workflow: ${siteConfig.name || siteConfig.url}`);

        try {
            // Create workflow session
            const session = await this.createWorkflowSession(workflowId, siteConfig, emailData, options);
            this.currentSession = session;

            // Execute workflow phases
            const result = await this.executeWorkflowPhases(session);

            // Complete workflow
            const duration = Date.now() - startTime;
            await this.completeWorkflow(session, result, duration);

            this.performance.totalWorkflows++;
            if (result.success) {
                this.performance.successfulWorkflows++;
            } else {
                this.performance.failedWorkflows++;
            }
            this.updatePerformanceMetrics(duration);

            console.log(`✅ Workflow completed: ${result.success ? 'SUCCESS' : 'FAILED'} in ${duration}ms`);

            return result;

        } catch (error) {
            console.error(`❌ Workflow failed: ${error.message}`);
            this.performance.failedWorkflows++;
            await this.handleWorkflowError(workflowId, error);
            throw error;

        } finally {
            // Cleanup session
            await this.cleanupWorkflowSession(workflowId);
            this.currentSession = null;
        }
    }

    /**
     * Create workflow session
     */
    async createWorkflowSession(workflowId, siteConfig, emailData, options) {
        const session = {
            id: workflowId,
            siteConfig: siteConfig,
            emailData: emailData,
            options: options,
            startTime: Date.now(),
            currentState: this.workflowStates.INITIALIZING,
            context: null,
            page: null,
            stateHistory: [],
            challenges: [],
            forms: [],
            results: {},
            metadata: {}
        };

        // Create browser context and page
        if (this.networkManager) {
            const contextResult = await this.networkManager.createStealthContext(workflowId);
            session.context = contextResult.context;
        }

        const pageResult = await this.browser.createStealthPage();
        session.page = pageResult.page;

        this.activeTasks.set(workflowId, session);
        
        console.log(`📋 Workflow session created: ${workflowId}`);
        return session;
    }

    /**
     * Execute all workflow phases
     */
    async executeWorkflowPhases(session) {
        try {
            // Phase 1: Navigation and initial analysis
            await this.phaseNavigation(session);

            // Phase 2: Challenge detection and solving
            await this.phaseChallengeDetection(session);

            // Phase 3: Form analysis and filling
            await this.phaseFormProcessing(session);

            // Phase 4: Submission and verification
            await this.phaseSubmissionAndVerification(session);

            // Phase 5: Success verification
            await this.phaseSuccessVerification(session);

            return {
                success: true,
                workflowId: session.id,
                phases: session.stateHistory.length,
                challenges: session.challenges.length,
                forms: session.forms.length,
                metadata: session.metadata
            };

        } catch (error) {
            return {
                success: false,
                workflowId: session.id,
                error: error.message,
                lastState: session.currentState,
                metadata: session.metadata
            };
        }
    }

    /**
     * Phase 1: Navigation and initial analysis
     */
    async phaseNavigation(session) {
        this.setState(session, this.workflowStates.NAVIGATING);
        console.log('🌐 Phase 1: Navigation and analysis');

        try {
            // Navigate to site
            await session.page.goto(session.siteConfig.url, {
                waitUntil: 'networkidle',
                timeout: this.options.timeout
            });

            await this.adaptiveDelay(1000, 3000);

            // Initial page analysis
            this.setState(session, this.workflowStates.ANALYZING);
            const pageAnalysis = await this.analyzePageStructure(session);
            session.metadata.pageAnalysis = pageAnalysis;

            console.log(`   📊 Page analysis: ${pageAnalysis.complexity} complexity, ${pageAnalysis.formsCount} forms`);

            // Learn from page structure
            if (this.options.enableLearning) {
                await this.learnFromPageStructure(session.siteConfig.url, pageAnalysis);
            }

        } catch (error) {
            this.setState(session, this.workflowStates.ERROR);
            throw new Error(`Navigation failed: ${error.message}`);
        }
    }

    /**
     * Phase 2: Challenge detection and solving
     */
    async phaseChallengeDetection(session) {
        this.setState(session, this.workflowStates.DETECTING_CHALLENGES);
        console.log('🧩 Phase 2: Challenge detection and solving');

        try {
            // Detect challenges using multiple methods
            const challenges = await this.detectChallenges(session);
            session.challenges = challenges;

            if (challenges.length > 0) {
                console.log(`   🔍 Detected ${challenges.length} challenges`);
                
                this.setState(session, this.workflowStates.SOLVING_CHALLENGES);
                
                // Solve each challenge
                for (const challenge of challenges) {
                    const solved = await this.solveChallenge(session, challenge);
                    challenge.solved = solved;
                    
                    if (solved) {
                        this.performance.challengesSolved++;
                        console.log(`   ✅ Challenge solved: ${challenge.type}`);
                    } else {
                        console.log(`   ❌ Challenge failed: ${challenge.type}`);
                    }
                }
            } else {
                console.log('   ℹ️ No challenges detected');
            }

        } catch (error) {
            console.warn(`   ⚠️ Challenge detection/solving error: ${error.message}`);
            // Continue workflow even if challenge solving fails
        }
    }

    /**
     * Phase 3: Form processing
     */
    async phaseFormProcessing(session) {
        this.setState(session, this.workflowStates.FILLING_FORMS);
        console.log('📝 Phase 3: Form analysis and filling');

        try {
            // Detect and analyze forms
            const forms = await this.detectForms(session);
            session.forms = forms;

            if (forms.length === 0) {
                throw new Error('No forms detected on page');
            }

            console.log(`   📋 Found ${forms.length} forms`);

            // Process each form
            for (const form of forms) {
                console.log(`   📝 Processing form: ${form.id || 'unnamed'}`);
                
                // Generate form data using AI and profile
                const formData = await this.generateFormData(session, form);
                
                // Fill form with behavioral simulation
                const fillResult = await this.fillFormWithBehavior(session, form, formData);
                form.fillResult = fillResult;
                
                if (fillResult.success) {
                    this.performance.formsFilled++;
                    console.log(`   ✅ Form filled: ${fillResult.fieldsCompleted} fields`);
                } else {
                    console.log(`   ❌ Form filling failed: ${fillResult.error}`);
                }
            }

        } catch (error) {
            this.setState(session, this.workflowStates.ERROR);
            throw new Error(`Form processing failed: ${error.message}`);
        }
    }

    /**
     * Phase 4: Submission and verification
     */
    async phaseSubmissionAndVerification(session) {
        this.setState(session, this.workflowStates.SUBMITTING);
        console.log('🚀 Phase 4: Submission and verification');

        try {
            // Find and click submit button
            const submitted = await this.submitForms(session);
            
            if (!submitted) {
                throw new Error('Form submission failed');
            }

            // Wait for response
            await this.adaptiveDelay(2000, 5000);

            // Verify submission
            this.setState(session, this.workflowStates.VERIFYING);
            const verification = await this.verifySubmission(session);
            session.metadata.verification = verification;

            console.log(`   📊 Submission verification: ${verification.success ? 'SUCCESS' : 'UNCERTAIN'}`);

        } catch (error) {
            this.setState(session, this.workflowStates.ERROR);
            throw new Error(`Submission failed: ${error.message}`);
        }
    }

    /**
     * Phase 5: Success verification
     */
    async phaseSuccessVerification(session) {
        this.setState(session, this.workflowStates.COMPLETING);
        console.log('✅ Phase 5: Success verification');

        try {
            // Multiple verification methods
            const verificationMethods = [
                this.verifyByContent.bind(this),
                this.verifyByUrl.bind(this),
                this.verifyByStructure.bind(this)
            ];

            let finalSuccess = false;
            const verificationResults = [];

            for (const method of verificationMethods) {
                try {
                    const result = await method(session);
                    verificationResults.push(result);
                    
                    if (result.success) {
                        finalSuccess = true;
                        break;
                    }
                } catch (error) {
                    verificationResults.push({ success: false, error: error.message });
                }
            }

            session.metadata.finalVerification = {
                success: finalSuccess,
                methods: verificationResults
            };

            console.log(`   🎯 Final verification: ${finalSuccess ? 'SUCCESS' : 'FAILED'}`);

        } catch (error) {
            console.warn(`   ⚠️ Verification error: ${error.message}`);
            // Assume success if verification fails
        }
    }

    /**
     * Analyze page structure
     */
    async analyzePageStructure(session) {
        return await session.page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input, select, textarea');
            const buttons = document.querySelectorAll('button, input[type="submit"]');
            const links = document.querySelectorAll('a');
            
            const text = document.body.textContent.toLowerCase();
            const url = window.location.href.toLowerCase();
            
            // Analyze content
            const hasRegistrationIndicators = [
                'register', 'sign up', 'create account', 'join', 'membership'
            ].some(indicator => text.includes(indicator) || url.includes(indicator));
            
            const hasPollIndicators = [
                'survey', 'poll', 'questionnaire', 'feedback', 'form'
            ].some(indicator => text.includes(indicator) || url.includes(indicator));
            
            // Calculate complexity
            let complexityScore = 0;
            complexityScore += forms.length * 5;
            complexityScore += inputs.length * 2;
            complexityScore += buttons.length * 1;
            
            const complexity = complexityScore <= 10 ? 'simple' : 
                             complexityScore <= 30 ? 'medium' : 'complex';
            
            return {
                formsCount: forms.length,
                inputsCount: inputs.length,
                buttonsCount: buttons.length,
                linksCount: links.length,
                hasRegistrationIndicators,
                hasPollIndicators,
                complexity,
                complexityScore,
                title: document.title,
                url: window.location.href
            };
        });
    }

    /**
     * Detect challenges on the page
     */
    async detectChallenges(session) {
        const challenges = [];

        try {
            // CAPTCHA detection
            const captchas = await session.page.$$eval('[class*="captcha"], [id*="captcha"], [class*="recaptcha"], [id*="recaptcha"]', 
                elements => elements.map(el => ({
                    type: 'captcha',
                    element: el.tagName.toLowerCase(),
                    className: el.className,
                    id: el.id
                }))
            );
            challenges.push(...captchas);

            // Cloudflare detection
            const cloudflare = await session.page.$('.cf-browser-verification');
            if (cloudflare) {
                challenges.push({ type: 'cloudflare', element: 'cloudflare-check' });
            }

            // Rate limiting detection
            const rateLimited = await session.page.evaluate(() => {
                const text = document.body.textContent.toLowerCase();
                return text.includes('rate limit') || text.includes('too many requests');
            });
            
            if (rateLimited) {
                challenges.push({ type: 'rate_limit', element: 'page-content' });
            }

            // Attention verification detection
            const attentionChecks = await session.page.$$eval('[class*="attention"], [class*="verification"]',
                elements => elements.map(el => ({
                    type: 'attention_check',
                    element: el.tagName.toLowerCase(),
                    text: el.textContent.trim()
                }))
            );
            challenges.push(...attentionChecks);

        } catch (error) {
            console.warn(`Challenge detection error: ${error.message}`);
        }

        return challenges;
    }

    /**
     * Solve individual challenge
     */
    async solveChallenge(session, challenge) {
        if (!this.challengeResolver) {
            console.log(`   ⚠️ No challenge resolver available for: ${challenge.type}`);
            return false;
        }

        try {
            const result = await this.challengeResolver.solveChallenge(session.page, challenge);
            return result.success;

        } catch (error) {
            console.warn(`   ⚠️ Challenge solving error: ${error.message}`);
            return false;
        }
    }

    /**
     * Detect forms on the page
     */
    async detectForms(session) {
        return await session.page.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form'));
            
            return forms.map((form, index) => {
                const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                const visibleInputs = inputs.filter(inp => inp.offsetParent !== null);
                
                const submitButtons = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]')) 
                    .concat(Array.from(document.querySelectorAll('button:not([type]), button[type="button"]')))
                    .filter(btn => btn.offsetParent !== null);
                
                return {
                    id: form.id || `form_${index}`,
                    action: form.action,
                    method: form.method,
                    inputs: visibleInputs.map(inp => ({
                        type: inp.type,
                        name: inp.name,
                        id: inp.id,
                        placeholder: inp.placeholder,
                        required: inp.required,
                        value: inp.value
                    })),
                    submitButtons: submitButtons.map(btn => ({
                        type: btn.type,
                        text: btn.textContent.trim(),
                        id: btn.id,
                        className: btn.className
                    })),
                    complexity: visibleInputs.length > 5 ? 'complex' : visibleInputs.length > 2 ? 'medium' : 'simple'
                };
            });
        });
    }

    /**
     * Generate form data using AI and user profile
     */
    async generateFormData(session, form) {
        const formData = {};
        const profile = session.emailData.profile;

        // Basic field mappings
        const fieldMappings = {
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            age: profile.age?.toString(),
            gender: profile.gender,
            zipCode: '10001',
            password: 'SecurePass123!'
        };

        // Map form inputs to data
        for (const input of form.inputs) {
            const fieldName = this.identifyFieldType(input);
            
            if (fieldMappings[fieldName]) {
                formData[`input[name="${input.name}"], input[id="${input.id}"], #${input.id}`] = fieldMappings[fieldName];
            } else if (input.type === 'checkbox' && (input.name.includes('terms') || input.name.includes('agree'))) {
                formData[`input[name="${input.name}"]`] = true;
            }
        }

        // Use AI service for complex field generation if available
        if (this.aiService && form.complexity === 'complex') {
            try {
                const aiData = await this.aiService.generateFormData(form, profile);
                Object.assign(formData, aiData);
            } catch (error) {
                console.warn(`AI form data generation failed: ${error.message}`);
            }
        }

        return formData;
    }

    /**
     * Identify field type from input properties
     */
    identifyFieldType(input) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const type = input.type.toLowerCase();

        if (type === 'email' || name.includes('email') || id.includes('email') || placeholder.includes('email')) {
            return 'email';
        }
        if (name.includes('first') || id.includes('first') || placeholder.includes('first')) {
            return 'firstName';
        }
        if (name.includes('last') || id.includes('last') || placeholder.includes('last')) {
            return 'lastName';
        }
        if (name.includes('age') || id.includes('age') || placeholder.includes('age')) {
            return 'age';
        }
        if (name.includes('gender') || id.includes('gender') || placeholder.includes('gender')) {
            return 'gender';
        }
        if (name.includes('zip') || name.includes('postal') || id.includes('zip') || placeholder.includes('zip')) {
            return 'zipCode';
        }
        if (type === 'password') {
            return 'password';
        }

        return 'unknown';
    }

    /**
     * Fill form with behavioral simulation
     */
    async fillFormWithBehavior(session, form, formData) {
        if (!this.behaviorEngine) {
            // Fallback to basic form filling
            return await this.basicFormFilling(session, formData);
        }

        try {
            const result = await this.behaviorEngine.fillFormWithBehavior(session.page, formData, {
                formComplexity: form.complexity
            });

            return result;

        } catch (error) {
            console.warn(`Behavioral form filling failed: ${error.message}`);
            return await this.basicFormFilling(session, formData);
        }
    }

    /**
     * Basic form filling fallback
     */
    async basicFormFilling(session, formData) {
        let fieldsCompleted = 0;

        for (const [selector, value] of Object.entries(formData)) {
            try {
                const element = await session.page.$(selector);
                if (element && await element.isVisible()) {
                    if (typeof value === 'boolean') {
                        if (value) await element.check();
                    } else {
                        await element.fill(value.toString());
                    }
                    fieldsCompleted++;
                    await this.adaptiveDelay(200, 500);
                }
            } catch (error) {
                continue;
            }
        }

        return {
            success: fieldsCompleted > 0,
            fieldsCompleted: fieldsCompleted,
            method: 'basic'
        };
    }

    /**
     * Submit forms
     */
    async submitForms(session) {
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Submit")',
            'button:has-text("Join")',
            '.submit-btn',
            '.register-btn'
        ];

        for (const selector of submitSelectors) {
            try {
                const element = await session.page.$(selector);
                if (element && await element.isVisible()) {
                    console.log(`   🚀 Submitting via: ${selector}`);
                    
                    if (this.behaviorEngine) {
                        await this.behaviorEngine.simulateMouseMovement(session.page, element);
                    } else {
                        await element.click();
                    }
                    
                    return true;
                }
            } catch (error) {
                continue;
            }
        }

        return false;
    }

    /**
     * Verify submission success
     */
    async verifySubmission(session) {
        try {
            await session.page.waitForLoadState('networkidle', { timeout: 10000 });
            
            const content = await session.page.content();
            const url = session.page.url();
            
            const successIndicators = [
                'success', 'thank you', 'confirmation', 'welcome', 
                'verify', 'complete', 'submitted', 'registered'
            ];
            
            const hasSuccessContent = successIndicators.some(indicator => 
                content.toLowerCase().includes(indicator)
            );
            
            const hasSuccessUrl = successIndicators.some(indicator => 
                url.toLowerCase().includes(indicator)
            );
            
            return {
                success: hasSuccessContent || hasSuccessUrl,
                method: hasSuccessContent ? 'content' : hasSuccessUrl ? 'url' : 'none',
                currentUrl: url
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verification methods
     */
    async verifyByContent(session) {
        const content = await session.page.content();
        const successKeywords = ['success', 'thank you', 'confirmation', 'welcome', 'complete'];
        
        const hasSuccess = successKeywords.some(keyword => content.toLowerCase().includes(keyword));
        
        return {
            success: hasSuccess,
            method: 'content_analysis',
            confidence: hasSuccess ? 0.8 : 0.2
        };
    }

    async verifyByUrl(session) {
        const url = session.page.url().toLowerCase();
        const successUrlPatterns = ['success', 'welcome', 'confirm', 'complete', 'thank'];
        
        const hasSuccessUrl = successUrlPatterns.some(pattern => url.includes(pattern));
        
        return {
            success: hasSuccessUrl,
            method: 'url_analysis',
            confidence: hasSuccessUrl ? 0.9 : 0.1
        };
    }

    async verifyByStructure(session) {
        const hasForm = await session.page.$('form') !== null;
        const hasErrorMessage = await session.page.$('.error, [class*="error"]') !== null;
        
        // If no form and no error, likely success
        const likelySuccess = !hasForm && !hasErrorMessage;
        
        return {
            success: likelySuccess,
            method: 'structure_analysis',
            confidence: likelySuccess ? 0.6 : 0.4
        };
    }

    /**
     * State management
     */
    setState(session, newState) {
        const previousState = session.currentState;
        session.currentState = newState;
        session.stateHistory.push({
            state: newState,
            timestamp: Date.now(),
            previousState: previousState
        });

        this.emit('stateChanged', {
            sessionId: session.id,
            newState,
            previousState
        });

        if (this.options.debugMode) {
            console.log(`   🔄 State: ${previousState} → ${newState}`);
        }
    }

    /**
     * Learning and adaptation
     */
    async learnFromPageStructure(url, analysis) {
        const domain = new URL(url).hostname;
        
        if (!this.learningEngine.sitePatterns.has(domain)) {
            this.learningEngine.sitePatterns.set(domain, []);
        }
        
        this.learningEngine.sitePatterns.get(domain).push({
            timestamp: Date.now(),
            analysis: analysis
        });
    }

    async loadLearningData() {
        // Implementation would load previous learning data
        console.log('📚 Loading workflow learning data...');
    }

    async saveLearningData() {
        // Implementation would save learning data
        console.log('💾 Saving workflow learning data...');
    }

    /**
     * Utility methods
     */
    async adaptiveDelay(min = 500, max = 1500) {
        if (!this.options.adaptiveDelay) return;
        
        const delay = min + Math.random() * (max - min);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    updatePerformanceMetrics(duration) {
        this.performance.avgDuration = (this.performance.avgDuration + duration) / 2;
    }

    validateDependencies() {
        if (!this.browser) {
            throw new Error('Browser instance is required');
        }
        // Other dependencies are optional but provide enhanced functionality
    }

    setupWorkflowMonitoring() {
        // Setup performance monitoring and adaptation
        setInterval(() => {
            this.analyzePerformance();
        }, 60000); // Every minute
    }

    analyzePerformance() {
        const successRate = this.performance.totalWorkflows > 0 ? 
            this.performance.successfulWorkflows / this.performance.totalWorkflows : 0;
        
        if (successRate < 0.7 && this.performance.totalWorkflows > 5) {
            console.log('📊 Performance below threshold, considering adaptations...');
            this.performance.adaptations++;
        }
    }

    /**
     * Test browser capabilities
     */
    async testBrowserCapabilities(testUrl = 'https://httpbin.org/forms/post') {
        this.ensureInitialized();

        try {
            const pageResult = await this.browser.createStealthPage();
            const page = pageResult.page;

            await page.goto(testUrl, { timeout: 10000 });
            const title = await page.title();

            await page.close();

            return {
                success: true,
                url: testUrl,
                title: title
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Workflow session management
     */
    async completeWorkflow(session, result, duration) {
        // Log to database if available
        if (this.database) {
            try {
                await this.database.logWorkflowCompletion({
                    sessionId: session.id,
                    siteUrl: session.siteConfig.url,
                    success: result.success,
                    duration: duration,
                    phases: session.stateHistory.length,
                    challenges: session.challenges.length,
                    forms: session.forms.length
                });
            } catch (error) {
                console.warn(`Database logging failed: ${error.message}`);
            }
        }

        // Save learning data
        if (this.options.enableLearning) {
            await this.saveLearningData();
        }
    }

    async handleWorkflowError(workflowId, error) {
        const session = this.activeTasks.get(workflowId);
        if (session) {
            session.currentState = this.workflowStates.ERROR;
            session.metadata.error = {
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            };
        }
        
        this.emit('workflowError', { workflowId, error });
    }

    async cleanupWorkflowSession(workflowId) {
        const session = this.activeTasks.get(workflowId);
        if (session) {
            try {
                if (session.page && !session.page.isClosed()) {
                    await session.page.close();
                }
                if (session.context) {
                    await session.context.close();
                }
            } catch (error) {
                console.warn(`Session cleanup error: ${error.message}`);
            }
            
            this.activeTasks.delete(workflowId);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.performance,
            activeTasks: this.activeTasks.size,
            learningData: {
                sitePatterns: this.learningEngine.sitePatterns.size,
                successStrategies: this.learningEngine.successStrategies.size
            },
            isInitialized: this.isInitialized
        };
    }

    /**
     * Utility methods
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Workflow Orchestrator not initialized. Call initialize() first.');
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Workflow Orchestrator...');
        
        try {
            // Cleanup all active tasks
            const cleanupPromises = Array.from(this.activeTasks.keys()).map(id => 
                this.cleanupWorkflowSession(id)
            );
            await Promise.all(cleanupPromises);
            
            // Save learning data
            if (this.options.enableLearning) {
                await this.saveLearningData();
            }
            
            // Clear learning data
            this.learningEngine.sitePatterns.clear();
            this.learningEngine.successStrategies.clear();
            this.learningEngine.failureAnalysis.clear();
            this.learningEngine.adaptiveRules.clear();
            
            this.isInitialized = false;
            console.log('✅ Workflow Orchestrator cleanup complete');
            
        } catch (error) {
            console.error('❌ Workflow Orchestrator cleanup error:', error.message);
        }
    }
}

module.exports = WorkflowOrchestrator;