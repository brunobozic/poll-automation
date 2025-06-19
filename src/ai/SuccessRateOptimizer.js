/**
 * AI-Powered Success Rate Optimizer
 * Comprehensive system to maximize registration success rates using machine learning
 */

const ModernProtectionAnalyzer = require('../security/ModernProtectionAnalyzer');
const IntelligentCountermeasures = require('../security/IntelligentCountermeasures');
const AdvancedAntiDetectionAI = require('./AdvancedAntiDetectionAI');

class SuccessRateOptimizer {
    constructor(options = {}) {
        this.options = {
            learningRate: options.learningRate || 0.01,
            optimizationTarget: options.optimizationTarget || 0.85, // 85% success rate target
            adaptationSpeed: options.adaptationSpeed || 'medium',
            aggressiveness: options.aggressiveness || 'high',
            ...options
        };
        
        // Core AI components
        this.protectionAnalyzer = new ModernProtectionAnalyzer();
        this.antiDetectionAI = new AdvancedAntiDetectionAI();
        
        // Learning and optimization
        this.learningEngine = new LearningEngine();
        this.strategyOptimizer = new StrategyOptimizer();
        this.performancePredictor = new PerformancePredictor();
        
        // Site-specific data
        this.siteProfiles = new Map();
        this.globalPatterns = new Map();
        this.successHistory = [];
        
        // Optimization strategies
        this.activeStrategies = new Map();
        this.strategyPool = new StrategyPool();
        
        this.initialized = false;
    }
    
    /**
     * Initialize the success rate optimizer
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('📈 Initializing AI Success Rate Optimizer...');
        
        // Initialize core components
        await this.antiDetectionAI.initialize();
        await this.learningEngine.initialize();
        await this.strategyOptimizer.initialize();
        await this.performancePredictor.initialize();
        
        // Load historical data
        await this.loadHistoricalData();
        
        // Initialize strategy pool
        await this.initializeStrategyPool();
        
        this.initialized = true;
        console.log('✅ AI Success Rate Optimizer initialized');
    }
    
    /**
     * Optimize strategy for a specific site
     */
    async optimizeForSite(siteUrl, page, initialStrategy = {}) {
        console.log(`🎯 Optimizing strategy for: ${siteUrl}`);
        
        // Analyze site protections
        const content = await page.content();
        const protections = await this.protectionAnalyzer.analyzePageProtections(page, siteUrl);
        
        console.log(`📊 Analysis complete: ${protections.length} protections detected`);
        
        // Get site profile or create new one
        const siteProfile = this.getSiteProfile(siteUrl);
        
        // Predict success rates for different strategies
        const candidateStrategies = await this.generateCandidateStrategies(siteUrl, protections, siteProfile);
        const predictions = await this.predictSuccessRates(candidateStrategies, siteProfile);
        
        // Select optimal strategy
        const optimalStrategy = this.selectOptimalStrategy(candidateStrategies, predictions);
        
        console.log(`🏆 Selected strategy with predicted ${(optimalStrategy.predictedSuccessRate * 100).toFixed(1)}% success rate`);
        
        // Apply intelligent countermeasures
        const countermeasures = new IntelligentCountermeasures(page, {
            aggressiveness: optimalStrategy.aggressiveness,
            adaptiveMode: true
        });
        
        await countermeasures.initialize();
        await countermeasures.applyCountermeasures(protections);
        
        return {
            strategy: optimalStrategy,
            protections: protections,
            countermeasures: countermeasures,
            siteProfile: siteProfile,
            predictedSuccessRate: optimalStrategy.predictedSuccessRate
        };
    }
    
    /**
     * Execute optimized registration attempt
     */
    async executeOptimizedAttempt(optimizedPlan, emailData, formData) {
        const { strategy, countermeasures, siteProfile } = optimizedPlan;
        
        console.log('🚀 Executing optimized registration attempt...');
        
        const attempt = {
            startTime: Date.now(),
            strategy: strategy,
            emailData: emailData,
            formData: formData,
            steps: [],
            success: false,
            metrics: {}
        };
        
        try {
            // Step 1: Intelligent form detection and analysis
            const formAnalysis = await this.analyzeFormIntelligently(optimizedPlan.page);
            attempt.steps.push({ step: 'form_analysis', success: true, data: formAnalysis });
            
            // Step 2: AI-powered form filling
            const fillResult = await this.executeAIFormFilling(optimizedPlan.page, formData, strategy);
            attempt.steps.push({ step: 'form_filling', success: fillResult.success, data: fillResult });
            
            // Step 3: Intelligent submission with timing optimization
            const submitResult = await this.executeIntelligentSubmission(optimizedPlan.page, strategy);
            attempt.steps.push({ step: 'form_submission', success: submitResult.success, data: submitResult });
            
            // Step 4: Success verification with AI
            const verificationResult = await this.verifySuccessWithAI(optimizedPlan.page, siteProfile);
            attempt.steps.push({ step: 'success_verification', success: verificationResult.success, data: verificationResult });
            
            attempt.success = verificationResult.success;
            attempt.metrics = this.calculateAttemptMetrics(attempt);
            
        } catch (error) {
            console.error('❌ Optimized attempt failed:', error.message);
            attempt.error = error.message;
            attempt.steps.push({ step: 'error', success: false, error: error.message });
        }
        
        attempt.endTime = Date.now();
        attempt.duration = attempt.endTime - attempt.startTime;
        
        // Learn from this attempt
        await this.learnFromAttempt(optimizedPlan.siteUrl, attempt);
        
        return attempt;
    }
    
    /**
     * AI-powered form analysis
     */
    async analyzeFormIntelligently(page) {
        return await page.evaluate(() => {
            const forms = Array.from(document.forms);
            const analysis = {
                forms: forms.length,
                fields: [],
                complexity: 0,
                honeypots: [],
                validators: [],
                protections: []
            };
            
            for (const form of forms) {
                const fields = Array.from(form.elements);
                
                for (const field of fields) {
                    if (field.type === 'hidden' && 
                        (field.name.includes('honeypot') || 
                         field.name.includes('trap') ||
                         field.style.display === 'none')) {
                        analysis.honeypots.push({
                            name: field.name,
                            value: field.value,
                            type: 'hidden_honeypot'
                        });
                        continue;
                    }
                    
                    if (field.offsetParent === null && field.type !== 'hidden') {
                        analysis.honeypots.push({
                            name: field.name,
                            type: 'invisible_honeypot'
                        });
                        continue;
                    }
                    
                    const fieldAnalysis = {
                        name: field.name,
                        type: field.type,
                        required: field.required,
                        pattern: field.pattern,
                        maxLength: field.maxLength,
                        placeholder: field.placeholder,
                        autocomplete: field.autocomplete,
                        value: field.value,
                        visible: field.offsetParent !== null,
                        interactable: !field.disabled && !field.readOnly
                    };
                    
                    // Analyze validation patterns
                    if (field.pattern) {
                        analysis.validators.push({
                            field: field.name,
                            pattern: field.pattern,
                            type: 'regex'
                        });
                    }
                    
                    // Check for JavaScript validation
                    if (field.onblur || field.oninput || field.onchange) {
                        analysis.validators.push({
                            field: field.name,
                            type: 'javascript'
                        });
                    }
                    
                    analysis.fields.push(fieldAnalysis);
                }
            }
            
            // Calculate complexity score
            analysis.complexity = analysis.fields.length * 0.1 + 
                                 analysis.validators.length * 0.2 + 
                                 analysis.honeypots.length * 0.3;
            
            // Detect protection mechanisms
            if (document.querySelector('[data-sitekey]')) {
                analysis.protections.push('recaptcha');
            }
            
            if (document.querySelector('.h-captcha')) {
                analysis.protections.push('hcaptcha');
            }
            
            if (analysis.honeypots.length > 0) {
                analysis.protections.push('honeypots');
            }
            
            return analysis;
        });
    }
    
    /**
     * AI-powered form filling
     */
    async executeAIFormFilling(page, formData, strategy) {
        console.log('📝 Executing AI-powered form filling...');
        
        const fillStrategy = strategy.formFillStrategy || this.getDefaultFillStrategy();
        const result = { success: false, fieldsProcessed: 0, fieldsSuccessful: 0, errors: [] };
        
        try {
            // Get all fillable fields
            const fields = await page.$$eval('input, select, textarea', elements => 
                elements.map(el => ({
                    name: el.name,
                    id: el.id,
                    type: el.type,
                    tagName: el.tagName.toLowerCase(),
                    placeholder: el.placeholder,
                    required: el.required,
                    visible: el.offsetParent !== null && el.style.display !== 'none',
                    interactable: !el.disabled && !el.readOnly
                })).filter(field => field.visible && field.interactable)
            );
            
            // Apply intelligent field mapping
            const fieldMapping = this.createIntelligentFieldMapping(fields, formData);
            
            // Fill fields using human-like behavior
            for (const [selector, value] of fieldMapping) {
                try {
                    result.fieldsProcessed++;
                    
                    // Wait for field to be ready
                    await page.waitForSelector(selector, { timeout: 5000 });
                    
                    // Apply human-like timing
                    await this.applyHumanTiming(strategy.timingProfile);
                    
                    // Focus on field with human-like behavior
                    await this.humanFocusOnField(page, selector, strategy);
                    
                    // Fill field with AI-generated behavior
                    await this.fillFieldWithAI(page, selector, value, strategy);
                    
                    result.fieldsSuccessful++;
                    
                } catch (error) {
                    result.errors.push(`Failed to fill ${selector}: ${error.message}`);
                    console.warn(`⚠️ Field filling error: ${error.message}`);
                }
            }
            
            result.success = result.fieldsSuccessful >= Math.min(3, result.fieldsProcessed * 0.8);
            
        } catch (error) {
            result.errors.push(`Form filling failed: ${error.message}`);
        }
        
        console.log(`📊 Form filling result: ${result.fieldsSuccessful}/${result.fieldsProcessed} fields successful`);
        return result;
    }
    
    /**
     * Intelligent field mapping
     */
    createIntelligentFieldMapping(fields, formData) {
        const mapping = new Map();
        
        // Create smart mapping based on field characteristics
        for (const field of fields) {
            let mappedValue = null;
            
            // Email field detection
            if (this.isEmailField(field)) {
                mappedValue = formData.email;
            }
            // Name field detection
            else if (this.isFirstNameField(field)) {
                mappedValue = formData.firstName;
            }
            else if (this.isLastNameField(field)) {
                mappedValue = formData.lastName;
            }
            // Age field detection
            else if (this.isAgeField(field)) {
                mappedValue = formData.age?.toString();
            }
            // Gender field detection
            else if (this.isGenderField(field)) {
                mappedValue = formData.gender;
            }
            // Phone field detection
            else if (this.isPhoneField(field)) {
                mappedValue = formData.phone || this.generateRealisticPhone();
            }
            // Address fields
            else if (this.isAddressField(field)) {
                mappedValue = formData.address || this.generateRealisticAddress();
            }
            // ZIP/Postal code
            else if (this.isZipField(field)) {
                mappedValue = formData.zipCode || '10001';
            }
            // Password field
            else if (this.isPasswordField(field)) {
                mappedValue = 'SecurePass123!';
            }
            
            if (mappedValue) {
                const selector = this.createFieldSelector(field);
                mapping.set(selector, mappedValue);
            }
        }
        
        return mapping;
    }
    
    /**
     * Field type detection methods
     */
    isEmailField(field) {
        return field.type === 'email' ||
               /email/i.test(field.name) ||
               /email/i.test(field.id) ||
               /email/i.test(field.placeholder);
    }
    
    isFirstNameField(field) {
        return /first|fname|given/i.test(field.name) ||
               /first|fname|given/i.test(field.id) ||
               /first.*name/i.test(field.placeholder);
    }
    
    isLastNameField(field) {
        return /last|lname|family|surname/i.test(field.name) ||
               /last|lname|family|surname/i.test(field.id) ||
               /last.*name|family.*name/i.test(field.placeholder);
    }
    
    isAgeField(field) {
        return /age|birth/i.test(field.name) ||
               /age|birth/i.test(field.id) ||
               field.type === 'number' && /age/i.test(field.placeholder);
    }
    
    isGenderField(field) {
        return /gender|sex/i.test(field.name) ||
               /gender|sex/i.test(field.id) ||
               field.tagName === 'select' && /gender|sex/i.test(field.placeholder);
    }
    
    isPhoneField(field) {
        return field.type === 'tel' ||
               /phone|tel|mobile/i.test(field.name) ||
               /phone|tel|mobile/i.test(field.id);
    }
    
    isAddressField(field) {
        return /address|street|city|state/i.test(field.name) ||
               /address|street|city|state/i.test(field.id);
    }
    
    isZipField(field) {
        return /zip|postal|code/i.test(field.name) ||
               /zip|postal|code/i.test(field.id);
    }
    
    isPasswordField(field) {
        return field.type === 'password';
    }
    
    /**
     * Human-like field interaction
     */
    async humanFocusOnField(page, selector, strategy) {
        // Simulate human eye movement and mouse positioning
        await page.hover(selector);
        
        // Add slight delay to simulate reading/thinking
        await this.sleep(strategy.readingDelay || 300 + Math.random() * 200);
        
        // Click with human-like precision (slight offset)
        const boundingBox = await page.locator(selector).boundingBox();
        if (boundingBox) {
            const x = boundingBox.x + boundingBox.width * (0.3 + Math.random() * 0.4);
            const y = boundingBox.y + boundingBox.height * (0.3 + Math.random() * 0.4);
            await page.mouse.click(x, y);
        } else {
            await page.click(selector);
        }
    }
    
    /**
     * AI-powered field filling with human simulation
     */
    async fillFieldWithAI(page, selector, value, strategy) {
        const typingSpeed = strategy.typingSpeed || 180; // WPM
        const errorRate = strategy.errorRate || 0.03;
        
        if (!value) return;
        
        // Clear existing content
        await page.locator(selector).selectText();
        
        // Type with human-like rhythm
        const characters = value.split('');
        for (let i = 0; i < characters.length; i++) {
            const char = characters[i];
            
            // Simulate typing errors occasionally
            if (Math.random() < errorRate) {
                // Type wrong character
                const wrongChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                await page.keyboard.type(wrongChar);
                await this.sleep(100 + Math.random() * 200);
                
                // Backspace to correct
                await page.keyboard.press('Backspace');
                await this.sleep(50 + Math.random() * 100);
            }
            
            // Type correct character
            await page.keyboard.type(char);
            
            // Variable delay between keystrokes
            const baseDelay = 60000 / (typingSpeed * 5); // Convert WPM to ms per character
            const variance = baseDelay * 0.5;
            const delay = baseDelay + (Math.random() - 0.5) * variance;
            
            await this.sleep(Math.max(30, delay));
        }
        
        // Simulate brief pause after typing
        await this.sleep(200 + Math.random() * 300);
    }
    
    /**
     * Intelligent form submission
     */
    async executeIntelligentSubmission(page, strategy) {
        console.log('🚀 Executing intelligent form submission...');
        
        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Register")',
            'button:has-text("Sign Up")',
            'button:has-text("Join")',
            'button:has-text("Create")',
            '.submit-btn',
            '.register-btn',
            '.signup-btn'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    console.log(`🖱️ Attempting submission with: ${selector}`);
                    
                    // Apply pre-submission delay
                    await this.sleep(strategy.preSubmissionDelay || 1000 + Math.random() * 2000);
                    
                    // Human-like click
                    await this.humanFocusOnField(page, selector, strategy);
                    
                    // Wait for response
                    const responsePromise = page.waitForResponse(response => 
                        response.url().includes(page.url().split('/')[2]), 
                        { timeout: 10000 }
                    ).catch(() => null);
                    
                    await page.click(selector);
                    
                    // Wait for navigation or response
                    await Promise.race([
                        page.waitForNavigation({ timeout: 8000 }).catch(() => null),
                        responsePromise,
                        this.sleep(5000)
                    ]);
                    
                    return { success: true, method: selector };
                }
            } catch (error) {
                console.warn(`⚠️ Submission attempt failed: ${error.message}`);
                continue;
            }
        }
        
        return { success: false, error: 'No submit button found or clickable' };
    }
    
    /**
     * AI-powered success verification
     */
    async verifySuccessWithAI(page, siteProfile) {
        console.log('🔍 Verifying success with AI...');
        
        // Wait for page to settle
        await this.sleep(2000);
        
        const content = await page.content();
        const url = page.url();
        
        // AI-powered success indicators
        const successIndicators = [
            // Positive indicators
            /thank\s*you/i,
            /success/i,
            /welcome/i,
            /confirm/i,
            /registration\s*complete/i,
            /account\s*created/i,
            /verify\s*email/i,
            /check\s*email/i,
            /member/i,
            /dashboard/i
        ];
        
        const failureIndicators = [
            // Negative indicators
            /error/i,
            /failed/i,
            /invalid/i,
            /incorrect/i,
            /try\s*again/i,
            /captcha/i,
            /blocked/i,
            /denied/i
        ];
        
        // URL-based success detection
        const urlSuccess = /success|welcome|complete|confirm|member|dashboard/.test(url);
        
        // Content-based success detection
        let contentSuccessScore = 0;
        let contentFailureScore = 0;
        
        for (const indicator of successIndicators) {
            if (indicator.test(content)) {
                contentSuccessScore += 1;
            }
        }
        
        for (const indicator of failureIndicators) {
            if (indicator.test(content)) {
                contentFailureScore += 1;
            }
        }
        
        // AI decision making
        const confidence = Math.abs(contentSuccessScore - contentFailureScore) / 10;
        const success = urlSuccess || (contentSuccessScore > contentFailureScore && contentFailureScore === 0);
        
        return {
            success: success,
            confidence: Math.min(confidence, 1.0),
            indicators: {
                url: urlSuccess,
                contentSuccess: contentSuccessScore,
                contentFailure: contentFailureScore
            },
            analysis: {
                url: url,
                hasForm: content.includes('<form'),
                hasErrors: contentFailureScore > 0,
                hasSuccess: contentSuccessScore > 0
            }
        };
    }
    
    /**
     * Generate candidate strategies
     */
    async generateCandidateStrategies(siteUrl, protections, siteProfile) {
        const strategies = [];
        
        // Conservative strategy
        strategies.push({
            name: 'conservative',
            aggressiveness: 'low',
            typingSpeed: 120, // WPM
            errorRate: 0.01,
            readingDelay: 3000,
            preSubmissionDelay: 2000,
            timingProfile: 'careful',
            formFillStrategy: 'methodical'
        });
        
        // Balanced strategy
        strategies.push({
            name: 'balanced',
            aggressiveness: 'medium',
            typingSpeed: 180,
            errorRate: 0.03,
            readingDelay: 2000,
            preSubmissionDelay: 1500,
            timingProfile: 'natural',
            formFillStrategy: 'efficient'
        });
        
        // Aggressive strategy
        strategies.push({
            name: 'aggressive',
            aggressiveness: 'high',
            typingSpeed: 240,
            errorRate: 0.05,
            readingDelay: 1000,
            preSubmissionDelay: 800,
            timingProfile: 'confident',
            formFillStrategy: 'rapid'
        });
        
        // Adaptive strategy based on site profile
        if (siteProfile.attempts > 5) {
            const adaptiveStrategy = this.createAdaptiveStrategy(siteProfile, protections);
            strategies.push(adaptiveStrategy);
        }
        
        return strategies;
    }
    
    /**
     * Predict success rates for strategies
     */
    async predictSuccessRates(strategies, siteProfile) {
        const predictions = [];
        
        for (const strategy of strategies) {
            let baseSuccessRate = 0.6; // Base assumption
            
            // Adjust based on site history
            if (siteProfile.attempts > 0) {
                baseSuccessRate = siteProfile.successRate;
            }
            
            // Adjust based on strategy characteristics
            if (strategy.aggressiveness === 'low') {
                baseSuccessRate *= 1.1; // Conservative approach is safer
            } else if (strategy.aggressiveness === 'high') {
                baseSuccessRate *= 0.9; // Aggressive approach is riskier
            }
            
            // Adjust based on learned patterns
            if (strategy.name === 'adaptive' && siteProfile.workingStrategies.length > 0) {
                baseSuccessRate *= 1.2; // Adaptive strategies based on learning
            }
            
            predictions.push({
                strategy: strategy,
                predictedSuccessRate: Math.min(0.95, Math.max(0.1, baseSuccessRate))
            });
        }
        
        return predictions;
    }
    
    /**
     * Select optimal strategy
     */
    selectOptimalStrategy(candidateStrategies, predictions) {
        // Sort by predicted success rate
        predictions.sort((a, b) => b.predictedSuccessRate - a.predictedSuccessRate);
        
        const optimal = predictions[0];
        optimal.strategy.predictedSuccessRate = optimal.predictedSuccessRate;
        
        return optimal.strategy;
    }
    
    /**
     * Helper methods
     */
    
    getSiteProfile(siteUrl) {
        if (!this.siteProfiles.has(siteUrl)) {
            this.siteProfiles.set(siteUrl, {
                url: siteUrl,
                attempts: 0,
                successes: 0,
                successRate: 0.5,
                workingStrategies: [],
                failingStrategies: [],
                protectionEvolution: [],
                lastAttempt: null
            });
        }
        return this.siteProfiles.get(siteUrl);
    }
    
    async learnFromAttempt(siteUrl, attempt) {
        const profile = this.getSiteProfile(siteUrl);
        profile.attempts++;
        profile.lastAttempt = attempt;
        
        if (attempt.success) {
            profile.successes++;
            profile.workingStrategies.push(attempt.strategy);
        } else {
            profile.failingStrategies.push(attempt.strategy);
        }
        
        profile.successRate = profile.successes / profile.attempts;
        
        // Store in global history
        this.successHistory.push({
            siteUrl,
            attempt,
            timestamp: Date.now()
        });
        
        console.log(`📊 Site learning update: ${siteUrl} - ${(profile.successRate * 100).toFixed(1)}% success rate (${profile.successes}/${profile.attempts})`);
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    createFieldSelector(field) {
        if (field.id) return `#${field.id}`;
        if (field.name) return `[name="${field.name}"]`;
        return `${field.tagName}[placeholder*="${field.placeholder}"]`;
    }
    
    generateRealisticPhone() {
        return `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    }
    
    generateRealisticAddress() {
        const numbers = Math.floor(Math.random() * 9999) + 1;
        const streets = ['Main St', 'Oak Ave', 'Pine St', 'Cedar Ln', 'Elm St'];
        const street = streets[Math.floor(Math.random() * streets.length)];
        return `${numbers} ${street}`;
    }
    
    async loadHistoricalData() {
        // Load from database or files
        console.log('📚 Loading historical success data...');
    }
    
    async initializeStrategyPool() {
        // Initialize strategy pool
        console.log('🎯 Initializing strategy pool...');
    }
    
    getDefaultFillStrategy() {
        return {
            type: 'balanced',
            speed: 'natural',
            accuracy: 'high'
        };
    }
    
    createAdaptiveStrategy(siteProfile, protections) {
        // Create strategy based on what has worked before
        const workingParams = siteProfile.workingStrategies.length > 0 ? 
            siteProfile.workingStrategies[siteProfile.workingStrategies.length - 1] : 
            { aggressiveness: 'medium', typingSpeed: 180 };
        
        return {
            name: 'adaptive',
            ...workingParams,
            adaptedFor: protections.map(p => p.type)
        };
    }
    
    calculateAttemptMetrics(attempt) {
        return {
            duration: attempt.duration,
            stepsCompleted: attempt.steps.filter(s => s.success).length,
            totalSteps: attempt.steps.length,
            completionRate: attempt.steps.filter(s => s.success).length / attempt.steps.length
        };
    }
    
    applyHumanTiming(profile) {
        const delays = {
            careful: 500 + Math.random() * 1000,
            natural: 200 + Math.random() * 400,
            confident: 100 + Math.random() * 200
        };
        
        return this.sleep(delays[profile] || delays.natural);
    }
    
    /**
     * Get optimizer statistics
     */
    getStats() {
        const totalAttempts = this.successHistory.length;
        const totalSuccesses = this.successHistory.filter(h => h.attempt.success).length;
        const overallSuccessRate = totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;
        
        return {
            totalAttempts,
            totalSuccesses,
            overallSuccessRate: (overallSuccessRate * 100).toFixed(1) + '%',
            sitesOptimized: this.siteProfiles.size,
            averageSiteSuccessRate: this.calculateAverageSiteSuccessRate(),
            topPerformingStrategies: this.getTopPerformingStrategies(),
            recentTrends: this.getRecentTrends()
        };
    }
    
    calculateAverageSiteSuccessRate() {
        if (this.siteProfiles.size === 0) return '0%';
        
        const total = Array.from(this.siteProfiles.values())
            .reduce((sum, profile) => sum + profile.successRate, 0);
        
        return ((total / this.siteProfiles.size) * 100).toFixed(1) + '%';
    }
    
    getTopPerformingStrategies() {
        const strategyStats = new Map();
        
        for (const history of this.successHistory) {
            const strategyName = history.attempt.strategy.name;
            if (!strategyStats.has(strategyName)) {
                strategyStats.set(strategyName, { attempts: 0, successes: 0 });
            }
            
            const stats = strategyStats.get(strategyName);
            stats.attempts++;
            if (history.attempt.success) stats.successes++;
        }
        
        return Array.from(strategyStats.entries())
            .map(([name, stats]) => ({
                name,
                successRate: (stats.successes / stats.attempts * 100).toFixed(1) + '%',
                attempts: stats.attempts
            }))
            .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate))
            .slice(0, 5);
    }
    
    getRecentTrends() {
        const recent = this.successHistory.slice(-20);
        const recentSuccessRate = recent.length > 0 ? 
            recent.filter(h => h.attempt.success).length / recent.length : 0;
        
        return {
            recentAttempts: recent.length,
            recentSuccessRate: (recentSuccessRate * 100).toFixed(1) + '%',
            trending: recentSuccessRate > 0.7 ? 'up' : recentSuccessRate < 0.3 ? 'down' : 'stable'
        };
    }
}

/**
 * Supporting classes (simplified implementations)
 */

class LearningEngine {
    async initialize() {
        this.patterns = new Map();
    }
}

class StrategyOptimizer {
    async initialize() {
        this.strategies = new Map();
    }
}

class PerformancePredictor {
    async initialize() {
        this.models = new Map();
    }
}

class StrategyPool {
    constructor() {
        this.strategies = new Map();
    }
}

module.exports = SuccessRateOptimizer;