/**
 * Adaptive Automation Strategies
 * Learns from successes and failures to improve automation patterns
 */

const fs = require('fs').promises;
const path = require('path');

class AdaptiveStrategies {
    constructor(aiService, cacheDir = './data/strategies-cache') {
        this.ai = aiService;
        this.cacheDir = cacheDir;
        this.strategies = new Map();
        this.successPatterns = new Map();
        this.failurePatterns = new Map();
        this.siteProfiles = new Map();
        this.performanceMetrics = new Map();
        this.initializeCache();
    }

    async initializeCache() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            
            // Load existing strategies
            await this.loadFromCache('strategies.json', this.strategies);
            await this.loadFromCache('success-patterns.json', this.successPatterns);
            await this.loadFromCache('failure-patterns.json', this.failurePatterns);
            await this.loadFromCache('site-profiles.json', this.siteProfiles);
            await this.loadFromCache('performance-metrics.json', this.performanceMetrics);
            
        } catch (error) {
            console.error('Failed to initialize adaptive strategies cache:', error);
        }
    }

    async loadFromCache(filename, mapInstance) {
        try {
            const filePath = path.join(this.cacheDir, filename);
            const data = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(data);
            for (const [key, value] of Object.entries(parsed)) {
                mapInstance.set(key, value);
            }
        } catch (error) {
            // File doesn't exist yet
        }
    }

    /**
     * Generate adaptive strategy for a site based on learned patterns
     */
    async generateStrategy(siteAnalysis, sessionContext = {}) {
        const domain = siteAnalysis.domain || new URL(sessionContext.url).hostname;
        console.log(`🧠 Generating adaptive strategy for: ${domain}`);

        // Get site profile and history
        const siteProfile = this.getSiteProfile(domain);
        const successHistory = this.getSuccessHistory(domain);
        const failureHistory = this.getFailureHistory(domain);

        // Determine strategy components
        const strategy = {
            domain,
            timestamp: Date.now(),
            confidence: 0.5,
            
            // Interaction strategy
            interaction: await this.generateInteractionStrategy(siteAnalysis, siteProfile, successHistory),
            
            // Timing strategy  
            timing: this.generateTimingStrategy(siteProfile, failureHistory),
            
            // Navigation strategy
            navigation: await this.generateNavigationStrategy(siteAnalysis, successHistory),
            
            // Answer strategy
            answering: this.generateAnsweringStrategy(siteProfile, sessionContext),
            
            // Anti-detection strategy
            stealth: await this.generateStealthStrategy(siteProfile, failureHistory),
            
            // Error handling strategy
            errorHandling: this.generateErrorStrategy(failureHistory),
            
            // Validation strategy
            validation: this.generateValidationStrategy(siteAnalysis, failureHistory)
        };

        // Calculate overall confidence
        strategy.confidence = this.calculateStrategyConfidence(strategy, siteProfile);

        // Cache strategy
        this.strategies.set(domain, strategy);
        await this.saveCache();

        return strategy;
    }

    async generateInteractionStrategy(siteAnalysis, siteProfile, successHistory) {
        // Base interaction patterns from site analysis
        const baseStrategy = {
            elementSelection: {
                primary: siteAnalysis.selectors || {},
                fallback: this.getGenericSelectors(),
                retryAttempts: 3,
                waitStrategy: 'stable'
            },
            clickBehavior: {
                humanLike: true,
                randomizeDelay: true,
                scrollIntoView: true,
                waitForResponse: true
            },
            formFilling: {
                typingSpeed: 'variable',
                validation: true,
                clearBeforeType: false,
                simulateCorrections: siteProfile.detectionLevel > 0.5
            }
        };

        // Enhance with learned patterns
        if (successHistory.length > 0) {
            baseStrategy.elementSelection.primary = this.mergeSelectors(
                baseStrategy.elementSelection.primary,
                this.extractSuccessfulSelectors(successHistory)
            );
        }

        // Adjust based on site complexity
        if (siteAnalysis.complexity === 'complex') {
            baseStrategy.elementSelection.retryAttempts = 5;
            baseStrategy.clickBehavior.waitForResponse = true;
            baseStrategy.formFilling.typingSpeed = 'slow';
        }

        return baseStrategy;
    }

    generateTimingStrategy(siteProfile, failureHistory) {
        const baseTimings = {
            pageLoad: 15000,
            elementWait: 10000,
            betweenActions: { min: 1000, max: 3000 },
            readingTime: { wordsPerMinute: 200, variability: 0.3 },
            thinkingTime: { min: 2000, max: 8000 }
        };

        // Adjust based on failure patterns
        const timeoutFailures = failureHistory.filter(f => f.type === 'timeout');
        if (timeoutFailures.length > 2) {
            baseTimings.pageLoad *= 1.5;
            baseTimings.elementWait *= 1.5;
            baseTimings.betweenActions.max *= 1.3;
        }

        // Adjust based on detection level
        if (siteProfile.detectionLevel > 0.7) {
            baseTimings.betweenActions.min *= 2;
            baseTimings.betweenActions.max *= 2;
            baseTimings.thinkingTime.min *= 1.5;
            baseTimings.thinkingTime.max *= 1.5;
        }

        return baseTimings;
    }

    async generateNavigationStrategy(siteAnalysis, successHistory) {
        const strategy = {
            approach: siteAnalysis.navigation?.type || 'linear',
            backtracking: siteAnalysis.navigation?.hasBackButton || false,
            progressTracking: siteAnalysis.navigation?.hasProgress || false,
            validationRequired: siteAnalysis.navigation?.requiresAllQuestions || true,
            
            flowControl: {
                waitForProgress: true,
                validateBeforeNext: true,
                handleRedirects: true,
                monitorNetworkRequests: true
            }
        };

        // Learn from successful navigation patterns
        if (successHistory.length > 0) {
            const navigationPatterns = successHistory
                .filter(s => s.navigationSteps)
                .map(s => s.navigationSteps);
                
            if (navigationPatterns.length > 0) {
                strategy.learnedPatterns = this.analyzeNavigationPatterns(navigationPatterns);
            }
        }

        return strategy;
    }

    generateAnsweringStrategy(siteProfile, sessionContext) {
        const strategy = {
            consistency: {
                maintainPersona: true,
                crossReference: true,
                demographicAlignment: true
            },
            
            riskManagement: {
                skipTrickQuestions: true,
                avoidInconsistencies: true,
                limitPersonalInfo: siteProfile.privacyRisk > 0.5
            },
            
            quality: {
                varyResponses: true,
                useContextualAnswers: true,
                maintainRealism: true
            },
            
            persona: sessionContext.persona || 'default'
        };

        // Adjust based on site type
        if (siteProfile.siteType === 'market_research') {
            strategy.quality.brandConsistency = true;
            strategy.consistency.purchaseHistory = true;
        }

        return strategy;
    }

    async generateStealthStrategy(siteProfile, failureHistory) {
        const detectionFailures = failureHistory.filter(f => f.type === 'detection');
        const baseStrategy = {
            level: 'moderate',
            techniques: ['randomize_timing', 'vary_patterns', 'simulate_reading'],
            browserFingerprint: 'randomize',
            userAgent: 'rotate',
            proxyRotation: false
        };

        // Escalate stealth based on detection failures
        if (detectionFailures.length > 0) {
            baseStrategy.level = 'high';
            baseStrategy.techniques.push('advanced_timing', 'mouse_simulation', 'scroll_patterns');
            baseStrategy.proxyRotation = true;
        }

        // Use AI to analyze detection patterns
        if (detectionFailures.length > 2) {
            const detectionAnalysis = await this.analyzeDetectionPatterns(detectionFailures);
            baseStrategy.customCountermeasures = detectionAnalysis.countermeasures;
        }

        return baseStrategy;
    }

    generateErrorStrategy(failureHistory) {
        const strategy = {
            retryAttempts: 3,
            backoffStrategy: 'exponential',
            errorTypes: {
                timeout: { retries: 2, backoff: 5000 },
                elementNotFound: { retries: 3, alternativeSelectors: true },
                validation: { retries: 1, adjustAnswers: true },
                network: { retries: 3, waitTime: 10000 },
                captcha: { retries: 1, skipQuestion: true }
            },
            
            recovery: {
                screenshotOnError: true,
                saveContext: true,
                attemptAutoRecovery: true
            }
        };

        // Learn from failure patterns
        const errorCounts = this.analyzeErrorPatterns(failureHistory);
        
        // Adjust retry strategies based on error frequency
        Object.keys(errorCounts).forEach(errorType => {
            if (errorCounts[errorType] > 3 && strategy.errorTypes[errorType]) {
                strategy.errorTypes[errorType].retries = Math.max(1, 
                    strategy.errorTypes[errorType].retries - 1);
            }
        });

        return strategy;
    }

    generateValidationStrategy(siteAnalysis, failureHistory) {
        const validationFailures = failureHistory.filter(f => f.type === 'validation');
        
        return {
            preSubmit: {
                checkRequired: true,
                validateFormat: true,
                crossCheckAnswers: siteAnalysis.antiBot?.detectsAutomation || false
            },
            
            postSubmit: {
                waitForConfirmation: true,
                checkForErrors: true,
                verifyRedirect: true,
                timeout: validationFailures.length > 2 ? 30000 : 15000
            },
            
            errorHandling: {
                retryOnValidationError: validationFailures.length < 3,
                adjustAnswersOnError: true,
                skipOnRepeatedFailure: true
            }
        };
    }

    /**
     * Learn from session outcome
     */
    async learnFromSession(sessionData) {
        const domain = new URL(sessionData.url).hostname;
        
        if (sessionData.success) {
            await this.recordSuccess(domain, sessionData);
        } else {
            await this.recordFailure(domain, sessionData);
        }
        
        // Update site profile
        await this.updateSiteProfile(domain, sessionData);
        
        // Update performance metrics
        this.updatePerformanceMetrics(domain, sessionData);
        
        await this.saveCache();
    }

    async recordSuccess(domain, sessionData) {
        const successKey = `${domain}_${Date.now()}`;
        const successPattern = {
            timestamp: Date.now(),
            duration: sessionData.duration,
            questionsAnswered: sessionData.questionsAnswered,
            navigationSteps: sessionData.navigationSteps,
            selectors: sessionData.successfulSelectors,
            strategy: sessionData.strategy,
            confidence: 0.8
        };
        
        this.successPatterns.set(successKey, successPattern);
        
        // Limit cache size
        this.limitCacheSize(this.successPatterns, 100);
    }

    async recordFailure(domain, sessionData) {
        const failureKey = `${domain}_${Date.now()}`;
        const failurePattern = {
            timestamp: Date.now(),
            type: sessionData.error?.type || 'unknown',
            step: sessionData.failureStep,
            error: sessionData.error,
            strategy: sessionData.strategy,
            context: sessionData.context
        };
        
        this.failurePatterns.set(failureKey, failurePattern);
        
        // Analyze failure with AI if significant
        if (this.getFailureCount(domain) > 3) {
            await this.analyzeFailurePattern(domain, failurePattern);
        }
        
        this.limitCacheSize(this.failurePatterns, 200);
    }

    async updateSiteProfile(domain, sessionData) {
        const existing = this.siteProfiles.get(domain) || {
            domain,
            firstSeen: Date.now(),
            attempts: 0,
            successes: 0,
            failures: 0,
            detectionLevel: 0,
            difficulty: 0.5,
            reliability: 0.5,
            siteType: 'unknown'
        };
        
        existing.attempts++;
        existing.lastSeen = Date.now();
        
        if (sessionData.success) {
            existing.successes++;
        } else {
            existing.failures++;
            
            if (sessionData.error?.type === 'detection') {
                existing.detectionLevel = Math.min(1.0, existing.detectionLevel + 0.1);
            }
        }
        
        // Calculate metrics
        existing.reliability = existing.successes / existing.attempts;
        existing.difficulty = (existing.failures / existing.attempts) * 
            (1 + existing.detectionLevel);
        
        this.siteProfiles.set(domain, existing);
    }

    updatePerformanceMetrics(domain, sessionData) {
        const metrics = this.performanceMetrics.get(domain) || {
            averageDuration: 0,
            successRate: 0,
            errorRate: 0,
            costPerSession: 0,
            sessions: []
        };
        
        metrics.sessions.push({
            timestamp: Date.now(),
            duration: sessionData.duration,
            success: sessionData.success,
            cost: sessionData.cost || 0,
            questions: sessionData.questionsAnswered || 0
        });
        
        // Limit session history
        if (metrics.sessions.length > 50) {
            metrics.sessions = metrics.sessions.slice(-50);
        }
        
        // Recalculate averages
        const recentSessions = metrics.sessions.slice(-20);
        metrics.averageDuration = recentSessions.reduce((sum, s) => sum + s.duration, 0) / recentSessions.length;
        metrics.successRate = recentSessions.filter(s => s.success).length / recentSessions.length;
        metrics.errorRate = 1 - metrics.successRate;
        metrics.costPerSession = recentSessions.reduce((sum, s) => sum + s.cost, 0) / recentSessions.length;
        
        this.performanceMetrics.set(domain, metrics);
    }

    async analyzeDetectionPatterns(detectionFailures) {
        const prompt = `Analyze these bot detection failures and suggest countermeasures:

Failures:
${detectionFailures.map((f, i) => `${i + 1}. ${f.error?.message || 'Unknown'} at step: ${f.step}`).join('\n')}

Common patterns:
${this.extractCommonPatterns(detectionFailures)}

Provide JSON response:
{
  "detectionMethods": ["method1", "method2"],
  "countermeasures": ["countermeasure1", "countermeasure2"],
  "riskLevel": "low|medium|high",
  "recommendations": ["rec1", "rec2"]
}`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model: 'gpt-3.5-turbo',
                temperature: 0.1,
                maxTokens: 500
            });
            
            return JSON.parse(response);
        } catch (error) {
            console.error('Detection pattern analysis failed:', error);
            return {
                detectionMethods: ['unknown'],
                countermeasures: ['increase_delays', 'randomize_patterns'],
                riskLevel: 'medium',
                recommendations: ['Use more conservative timing']
            };
        }
    }

    // Helper methods
    getSiteProfile(domain) {
        return this.siteProfiles.get(domain) || {
            domain,
            attempts: 0,
            successes: 0,
            failures: 0,
            detectionLevel: 0,
            difficulty: 0.5,
            reliability: 0.5,
            siteType: 'unknown',
            privacyRisk: 0.3
        };
    }

    getSuccessHistory(domain) {
        return Array.from(this.successPatterns.values())
            .filter(s => s.domain === domain || this.extractDomain(s) === domain)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
    }

    getFailureHistory(domain) {
        return Array.from(this.failurePatterns.values())
            .filter(f => f.domain === domain || this.extractDomain(f) === domain)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20);
    }

    getFailureCount(domain) {
        return this.getFailureHistory(domain).length;
    }

    extractDomain(pattern) {
        // Extract domain from pattern context
        return pattern.context?.url ? new URL(pattern.context.url).hostname : null;
    }

    calculateStrategyConfidence(strategy, siteProfile) {
        let confidence = 0.5;
        
        // Increase confidence based on success history
        confidence += siteProfile.reliability * 0.3;
        
        // Decrease confidence based on difficulty
        confidence -= siteProfile.difficulty * 0.2;
        
        // Adjust based on detection level
        confidence -= siteProfile.detectionLevel * 0.1;
        
        return Math.max(0.1, Math.min(0.95, confidence));
    }

    mergeSelectors(base, learned) {
        const merged = { ...base };
        
        Object.keys(learned).forEach(key => {
            if (Array.isArray(learned[key])) {
                merged[key] = [...(merged[key] || []), ...learned[key]];
                merged[key] = [...new Set(merged[key])]; // Remove duplicates
            }
        });
        
        return merged;
    }

    extractSuccessfulSelectors(successHistory) {
        const selectors = {};
        
        successHistory.forEach(success => {
            if (success.selectors) {
                Object.keys(success.selectors).forEach(key => {
                    if (!selectors[key]) selectors[key] = [];
                    selectors[key].push(...success.selectors[key]);
                });
            }
        });
        
        return selectors;
    }

    getGenericSelectors() {
        return {
            questions: ['.question', '[data-question]', '.survey-question', '.form-question'],
            options: ['input[type="radio"]', 'input[type="checkbox"]', '.option', '.choice'],
            nextButton: ['.next', '.continue', 'button[type="submit"]', '.next-button'],
            submitButton: ['.submit', '.finish', '.complete', 'button[type="submit"]'],
            errorMessages: ['.error', '.alert', '.validation-error', '.message-error']
        };
    }

    analyzeNavigationPatterns(patterns) {
        // Analyze common navigation sequences
        const sequences = patterns.flat();
        const commonSteps = {};
        
        sequences.forEach(step => {
            commonSteps[step] = (commonSteps[step] || 0) + 1;
        });
        
        return {
            commonSteps: Object.entries(commonSteps)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10),
            averageSteps: sequences.length / patterns.length
        };
    }

    analyzeErrorPatterns(failureHistory) {
        const errorCounts = {};
        
        failureHistory.forEach(failure => {
            const errorType = failure.type || 'unknown';
            errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
        });
        
        return errorCounts;
    }

    extractCommonPatterns(failures) {
        // Extract common patterns from failure data
        const patterns = failures.map(f => ({
            step: f.step,
            error: f.error?.message || 'Unknown',
            timestamp: f.timestamp
        }));
        
        return patterns.slice(0, 5).map(p => `${p.step}: ${p.error}`).join('\n');
    }

    limitCacheSize(cache, maxSize) {
        if (cache.size > maxSize) {
            const entries = Array.from(cache.entries())
                .sort(([,a], [,b]) => b.timestamp - a.timestamp);
            
            cache.clear();
            entries.slice(0, maxSize).forEach(([key, value]) => {
                cache.set(key, value);
            });
        }
    }

    async saveCache() {
        try {
            await this.saveToCache('strategies.json', this.strategies);
            await this.saveToCache('success-patterns.json', this.successPatterns);
            await this.saveToCache('failure-patterns.json', this.failurePatterns);
            await this.saveToCache('site-profiles.json', this.siteProfiles);
            await this.saveToCache('performance-metrics.json', this.performanceMetrics);
        } catch (error) {
            console.error('Failed to save adaptive strategies cache:', error);
        }
    }

    async saveToCache(filename, mapInstance) {
        const filePath = path.join(this.cacheDir, filename);
        const data = Object.fromEntries(mapInstance);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    // Public API methods
    getStrategy(domain) {
        return this.strategies.get(domain);
    }

    getDomainStats(domain) {
        const profile = this.getSiteProfile(domain);
        const metrics = this.performanceMetrics.get(domain);
        
        return {
            profile,
            metrics,
            successRate: profile.reliability,
            avgDuration: metrics?.averageDuration || 0,
            totalAttempts: profile.attempts
        };
    }

    getGlobalStats() {
        const allProfiles = Array.from(this.siteProfiles.values());
        const allMetrics = Array.from(this.performanceMetrics.values());
        
        return {
            totalSites: allProfiles.length,
            overallSuccessRate: allProfiles.reduce((sum, p) => sum + p.reliability, 0) / allProfiles.length,
            totalSessions: allProfiles.reduce((sum, p) => sum + p.attempts, 0),
            averageCost: allMetrics.reduce((sum, m) => sum + m.costPerSession, 0) / allMetrics.length,
            topPerformingSites: allProfiles
                .sort((a, b) => b.reliability - a.reliability)
                .slice(0, 5)
                .map(p => ({ domain: p.domain, successRate: p.reliability }))
        };
    }
}

module.exports = AdaptiveStrategies;