/**
 * Enhanced Error Recovery System
 * AI-powered error analysis and recovery for poll automation
 */

const fs = require('fs').promises;
const path = require('path');

class ErrorRecoverySystem {
    constructor(aiService, page) {
        this.ai = aiService;
        this.page = page;
        this.errorHistory = [];
        this.recoveryPatterns = new Map();
        this.maxRecoveryAttempts = 3;
        this.errorTypes = {
            timeout: 'TIMEOUT',
            elementNotFound: 'ELEMENT_NOT_FOUND',
            validation: 'VALIDATION_ERROR',
            network: 'NETWORK_ERROR',
            captcha: 'CAPTCHA_DETECTED',
            access: 'ACCESS_DENIED',
            javascript: 'JAVASCRIPT_ERROR',
            navigation: 'NAVIGATION_FAILED',
            form: 'FORM_SUBMISSION_ERROR',
            ai: 'AI_ANALYSIS_ERROR'
        };
        this.initializeRecoveryPatterns();
    }

    /**
     * Main error recovery method - AI analyzes error and attempts recovery
     */
    async handleError(error, context = {}) {
        const errorAnalysis = await this.analyzeError(error, context);
        console.log(`🔧 Error Recovery: ${errorAnalysis.type} - ${errorAnalysis.severity}`);
        
        // Record error for learning
        this.recordError(errorAnalysis, context);
        
        // Attempt recovery based on AI analysis
        const recoveryResult = await this.attemptRecovery(errorAnalysis, context);
        
        // Learn from recovery outcome
        await this.learnFromRecovery(errorAnalysis, recoveryResult);
        
        return recoveryResult;
    }

    /**
     * AI analyzes error to understand type, cause, and recovery strategy
     */
    async analyzeError(error, context) {
        const errorData = {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines
            name: error.name,
            url: this.page.url(),
            timestamp: Date.now(),
            context
        };

        // Get page state for context
        const pageState = await this.getPageState();
        
        const prompt = `Analyze this poll automation error and suggest recovery strategy:

Error Details:
- Message: ${errorData.message}
- Type: ${errorData.name}
- URL: ${errorData.url}
- Current step: ${context.currentStep || 'unknown'}
- Action attempted: ${context.lastAction || 'unknown'}

Page State:
- Title: ${pageState.title}
- Has forms: ${pageState.hasForms}
- Has errors on page: ${pageState.hasErrors}
- Page loaded: ${pageState.isLoaded}
- Recent navigation: ${pageState.recentNavigation}

Context:
- Questions answered: ${context.questionsAnswered || 0}
- Session duration: ${context.sessionDuration || 0}ms
- Previous errors: ${this.errorHistory.length}

Respond with JSON:
{
  "errorType": "timeout|element_not_found|validation|network|captcha|access|javascript|navigation|form|ai",
  "severity": "low|medium|high|critical",
  "cause": "likely cause of error",
  "recoveryStrategy": "retry|reload|navigate_back|skip_step|change_approach|manual_intervention",
  "confidence": 0.8,
  "estimatedRecoveryTime": 5000,
  "preventionSuggestion": "how to prevent this error in future",
  "riskAssessment": "risk of continuing automation"
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 400
            });

            const analysis = JSON.parse(response);
            
            return {
                ...errorData,
                analysis,
                recoveryAttempts: 0
            };

        } catch (aiError) {
            console.error('AI error analysis failed:', aiError);
            
            // Fallback analysis
            return {
                ...errorData,
                analysis: this.getFallbackAnalysis(error),
                recoveryAttempts: 0
            };
        }
    }

    /**
     * Get current page state for error context
     */
    async getPageState() {
        try {
            return await this.page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    hasForms: document.forms.length > 0,
                    hasErrors: !!(document.querySelector('.error, .alert-danger, .validation-error')),
                    isLoaded: document.readyState === 'complete',
                    hasModals: !!(document.querySelector('.modal, [role="dialog"]')),
                    recentNavigation: performance.navigation?.type || 'unknown',
                    formCount: document.forms.length,
                    inputCount: document.querySelectorAll('input, select, textarea').length,
                    buttonCount: document.querySelectorAll('button, input[type="submit"]').length
                };
            });
        } catch (error) {
            return {
                title: 'unknown',
                url: this.page.url(),
                hasForms: false,
                hasErrors: false,
                isLoaded: false,
                hasModals: false,
                recentNavigation: 'unknown'
            };
        }
    }

    /**
     * Attempt recovery based on AI analysis
     */
    async attemptRecovery(errorAnalysis, context) {
        const strategy = errorAnalysis.analysis.recoveryStrategy;
        const maxAttempts = this.maxRecoveryAttempts;
        
        console.log(`🔄 Attempting recovery: ${strategy}`);
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await this.executeRecoveryStrategy(strategy, errorAnalysis, attempt);
                
                if (result.success) {
                    console.log(`✅ Recovery successful on attempt ${attempt}`);
                    return {
                        success: true,
                        strategy,
                        attempts: attempt,
                        result
                    };
                }
                
                // If not successful, wait before next attempt
                if (attempt < maxAttempts) {
                    const waitTime = Math.min(2000 * attempt, 10000); // Exponential backoff
                    await this.page.waitForTimeout(waitTime);
                }
                
            } catch (recoveryError) {
                console.error(`Recovery attempt ${attempt} failed:`, recoveryError.message);
                
                if (attempt === maxAttempts) {
                    return {
                        success: false,
                        strategy,
                        attempts: attempt,
                        error: recoveryError.message,
                        requiresManualIntervention: true
                    };
                }
            }
        }
        
        return {
            success: false,
            strategy,
            attempts: maxAttempts,
            error: 'All recovery attempts failed'
        };
    }

    /**
     * Execute specific recovery strategy
     */
    async executeRecoveryStrategy(strategy, errorAnalysis, attempt) {
        switch (strategy) {
            case 'retry':
                return await this.retryLastAction(errorAnalysis, attempt);
            
            case 'reload':
                return await this.reloadPage(errorAnalysis);
            
            case 'navigate_back':
                return await this.navigateBack(errorAnalysis);
            
            case 'skip_step':
                return await this.skipCurrentStep(errorAnalysis);
            
            case 'change_approach':
                return await this.changeApproach(errorAnalysis);
            
            case 'manual_intervention':
                return await this.requestManualIntervention(errorAnalysis);
            
            default:
                throw new Error(`Unknown recovery strategy: ${strategy}`);
        }
    }

    /**
     * Retry the last action with modifications
     */
    async retryLastAction(errorAnalysis, attempt) {
        console.log(`🔄 Retrying last action (attempt ${attempt})...`);
        
        // Add progressive delays
        const delay = 1000 * attempt;
        await this.page.waitForTimeout(delay);
        
        // Check if page state improved
        const currentState = await this.getPageState();
        
        if (currentState.isLoaded && !currentState.hasErrors) {
            return {
                success: true,
                action: 'retry',
                pageState: currentState
            };
        }
        
        // Try refreshing elements that might have changed
        await this.page.waitForLoadState('networkidle').catch(() => {});
        
        return {
            success: currentState.isLoaded,
            action: 'retry',
            pageState: currentState
        };
    }

    /**
     * Reload the current page
     */
    async reloadPage(errorAnalysis) {
        console.log('🔄 Reloading page...');
        
        try {
            await this.page.reload({ waitUntil: 'networkidle', timeout: 30000 });
            
            // Wait for page to stabilize
            await this.page.waitForTimeout(2000);
            
            const newState = await this.getPageState();
            
            return {
                success: newState.isLoaded && !newState.hasErrors,
                action: 'reload',
                pageState: newState
            };
            
        } catch (error) {
            throw new Error(`Page reload failed: ${error.message}`);
        }
    }

    /**
     * Navigate back to previous page
     */
    async navigateBack(errorAnalysis) {
        console.log('⬅️ Navigating back...');
        
        try {
            await this.page.goBack({ waitUntil: 'networkidle', timeout: 15000 });
            
            await this.page.waitForTimeout(2000);
            
            const newState = await this.getPageState();
            
            return {
                success: newState.isLoaded,
                action: 'navigate_back',
                pageState: newState
            };
            
        } catch (error) {
            throw new Error(`Navigation back failed: ${error.message}`);
        }
    }

    /**
     * Skip current step and proceed
     */
    async skipCurrentStep(errorAnalysis) {
        console.log('⏭️ Skipping current step...');
        
        // Mark step as skipped and indicate readiness to continue
        return {
            success: true,
            action: 'skip_step',
            shouldContinue: true,
            skippedStep: errorAnalysis.context.lastAction
        };
    }

    /**
     * Change approach using AI suggestions
     */
    async changeApproach(errorAnalysis) {
        console.log('🔄 Changing approach...');
        
        const prompt = `Suggest alternative approach for this failed action:

Failed action: ${errorAnalysis.context.lastAction}
Error: ${errorAnalysis.message}
Page state: ${JSON.stringify(await this.getPageState())}

Suggest JSON response:
{
  "newApproach": "specific alternative action to try",
  "selectors": ["alternative selectors to try"],
  "waitStrategy": "networkidle|domcontentloaded|load",
  "additionalSteps": ["step1", "step2"]
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.3,
                maxTokens: 300
            });

            const suggestion = JSON.parse(response);
            
            return {
                success: true,
                action: 'change_approach',
                suggestion,
                requiresRetry: true
            };
            
        } catch (error) {
            throw new Error(`Failed to generate alternative approach: ${error.message}`);
        }
    }

    /**
     * Request manual intervention
     */
    async requestManualIntervention(errorAnalysis) {
        console.log('🚨 Manual intervention required');
        
        // Take screenshot for manual review
        const screenshot = await this.takeErrorScreenshot(errorAnalysis);
        
        return {
            success: false,
            action: 'manual_intervention',
            requiresManualIntervention: true,
            screenshot,
            errorDetails: errorAnalysis
        };
    }

    /**
     * Take screenshot for error documentation
     */
    async takeErrorScreenshot(errorAnalysis) {
        try {
            const screenshotPath = path.join('./data/screenshots', 
                `error_${Date.now()}_${errorAnalysis.analysis.errorType}.png`);
            
            await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
            
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            
            return screenshotPath;
            
        } catch (error) {
            console.error('Failed to take error screenshot:', error);
            return null;
        }
    }

    /**
     * Record error for learning
     */
    recordError(errorAnalysis, context) {
        this.errorHistory.push({
            ...errorAnalysis,
            context,
            timestamp: Date.now()
        });

        // Keep only last 100 errors
        if (this.errorHistory.length > 100) {
            this.errorHistory = this.errorHistory.slice(-100);
        }
    }

    /**
     * Learn from recovery outcomes
     */
    async learnFromRecovery(errorAnalysis, recoveryResult) {
        const pattern = {
            errorType: errorAnalysis.analysis.errorType,
            recoveryStrategy: recoveryResult.strategy,
            success: recoveryResult.success,
            attempts: recoveryResult.attempts,
            timestamp: Date.now()
        };

        const key = `${pattern.errorType}_${pattern.recoveryStrategy}`;
        
        if (!this.recoveryPatterns.has(key)) {
            this.recoveryPatterns.set(key, {
                attempts: 0,
                successes: 0,
                failures: 0,
                averageAttempts: 0
            });
        }

        const stats = this.recoveryPatterns.get(key);
        stats.attempts++;
        
        if (pattern.success) {
            stats.successes++;
        } else {
            stats.failures++;
        }
        
        stats.averageAttempts = ((stats.averageAttempts * (stats.attempts - 1)) + pattern.attempts) / stats.attempts;
        stats.successRate = stats.successes / stats.attempts;
        
        this.recoveryPatterns.set(key, stats);
    }

    /**
     * Get fallback analysis when AI fails
     */
    getFallbackAnalysis(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('timeout')) {
            return {
                errorType: 'timeout',
                severity: 'medium',
                recoveryStrategy: 'retry',
                confidence: 0.7
            };
        } else if (message.includes('element') || message.includes('selector')) {
            return {
                errorType: 'element_not_found',
                severity: 'medium',
                recoveryStrategy: 'change_approach',
                confidence: 0.6
            };
        } else if (message.includes('network')) {
            return {
                errorType: 'network',
                severity: 'high',
                recoveryStrategy: 'reload',
                confidence: 0.8
            };
        } else {
            return {
                errorType: 'unknown',
                severity: 'medium',
                recoveryStrategy: 'retry',
                confidence: 0.3
            };
        }
    }

    /**
     * Initialize common recovery patterns
     */
    initializeRecoveryPatterns() {
        // Pre-populate with known good patterns
        const knownPatterns = {
            'timeout_retry': { attempts: 10, successes: 7, failures: 3, successRate: 0.7 },
            'element_not_found_change_approach': { attempts: 15, successes: 9, failures: 6, successRate: 0.6 },
            'network_reload': { attempts: 8, successes: 6, failures: 2, successRate: 0.75 },
            'validation_skip_step': { attempts: 5, successes: 4, failures: 1, successRate: 0.8 }
        };

        for (const [key, stats] of Object.entries(knownPatterns)) {
            this.recoveryPatterns.set(key, stats);
        }
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.errorHistory.length,
            errorsByType: {},
            recoverySuccess: {},
            averageRecoveryTime: 0
        };

        this.errorHistory.forEach(error => {
            const type = error.analysis.errorType;
            stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
        });

        for (const [key, pattern] of this.recoveryPatterns.entries()) {
            stats.recoverySuccess[key] = pattern.successRate;
        }

        return stats;
    }

    /**
     * Get recovery recommendations for an error type
     */
    getRecoveryRecommendation(errorType) {
        const relevantPatterns = Array.from(this.recoveryPatterns.entries())
            .filter(([key]) => key.startsWith(errorType))
            .sort(([,a], [,b]) => b.successRate - a.successRate);

        if (relevantPatterns.length > 0) {
            const [bestStrategy] = relevantPatterns[0];
            const strategy = bestStrategy.split('_').slice(1).join('_');
            return {
                strategy,
                confidence: relevantPatterns[0][1].successRate,
                basedOnAttempts: relevantPatterns[0][1].attempts
            };
        }

        return null;
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
    }

    /**
     * Export error data for analysis
     */
    exportErrorData() {
        return {
            errorHistory: this.errorHistory,
            recoveryPatterns: Object.fromEntries(this.recoveryPatterns),
            stats: this.getErrorStats()
        };
    }
}

module.exports = ErrorRecoverySystem;