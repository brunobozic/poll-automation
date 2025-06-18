/**
 * AI-Driven Poll Automation - Main Integration
 * Combines AI service, Playwright adapter, and orchestration logic
 */

const AIService = require('./ai-service');
const PlaywrightAdapter = require('./playwright-adapter');
const StealthBrowser = require('../browser/stealth');

class AIPollAutomation {
    constructor(options = {}) {
        this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        this.maxSteps = options.maxSteps || 50;
        this.timeout = options.timeout || 300000; // 5 minutes
        this.debug = options.debug || false;
        
        // Initialize services
        this.aiService = new AIService(this.apiKey, {
            defaultModel: 'gpt-3.5-turbo',
            maxRetries: 3
        });
        
        this.browser = null;
        this.page = null;
        this.adapter = null;
        
        // Session tracking
        this.sessionData = {
            startTime: null,
            url: '',
            steps: [],
            questionsAnswered: 0,
            totalQuestions: 0,
            currentStep: 0,
            isComplete: false,
            cost: 0
        };
    }

    /**
     * Main automation method - AI drives the entire process
     */
    async automatePoll(url, options = {}) {
        console.log(`🚀 Starting AI-driven poll automation for: ${url}`);
        
        this.sessionData.startTime = Date.now();
        this.sessionData.url = url;
        
        try {
            // Initialize browser and AI adapter
            await this.initialize(options);
            
            // Navigate to poll
            await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            console.log(`✅ Navigated to: ${url}`);
            
            // Main AI-driven loop
            while (!this.sessionData.isComplete && this.sessionData.currentStep < this.maxSteps) {
                const stepResult = await this.executeAIStep();
                
                if (stepResult.isComplete) {
                    this.sessionData.isComplete = true;
                    console.log(`🎉 Poll completed successfully!`);
                    break;
                }
                
                if (!stepResult.success) {
                    const recovery = await this.handleStepFailure(stepResult);
                    if (!recovery.canContinue) {
                        throw new Error(`Automation failed: ${recovery.reason}`);
                    }
                }
                
                this.sessionData.currentStep++;
                
                // Safety timeout check
                if (Date.now() - this.sessionData.startTime > this.timeout) {
                    throw new Error('Automation timeout exceeded');
                }
            }
            
            // Final verification
            const finalResult = await this.verifyCompletion();
            
            return {
                success: true,
                ...finalResult,
                sessionData: this.getSessionSummary()
            };
            
        } catch (error) {
            console.error('❌ AI poll automation failed:', error.message);
            
            return {
                success: false,
                error: error.message,
                sessionData: this.getSessionSummary(),
                screenshot: await this.takeErrorScreenshot()
            };
            
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Initialize browser and AI components
     */
    async initialize(options) {
        // Launch stealth browser
        this.browser = new StealthBrowser();
        await this.browser.launch(options.proxy);
        
        // Create page
        this.page = await this.browser.newPage('base');
        
        // Initialize AI adapter
        this.adapter = new PlaywrightAdapter(this.page.page, this.aiService);
        
        console.log('🔧 AI automation components initialized');
    }

    /**
     * Execute one AI-driven step
     */
    async executeAIStep() {
        console.log(`🔄 Step ${this.sessionData.currentStep + 1}: AI analyzing...`);
        
        const startTime = Date.now();
        const startCost = this.aiService.getStats().totalCost;
        
        try {
            // AI analyzes page and decides action
            const result = await this.adapter.analyzeAndAct({
                currentStep: this.sessionData.currentStep,
                questionsAnswered: this.sessionData.questionsAnswered,
                totalQuestions: this.sessionData.totalQuestions
            });
            
            // Update session data
            const stepCost = this.aiService.getStats().totalCost - startCost;
            this.sessionData.cost += stepCost;
            
            const stepData = {
                step: this.sessionData.currentStep,
                action: result.action,
                success: result.success,
                duration: Date.now() - startTime,
                cost: stepCost,
                url: this.page.page.url(),
                timestamp: new Date().toISOString()
            };
            
            if (result.questionsAnswered) {
                this.sessionData.questionsAnswered += result.questionsAnswered;
            }
            
            this.sessionData.steps.push(stepData);
            
            if (this.debug) {
                console.log(`📊 Step ${this.sessionData.currentStep + 1}: ${result.action} - $${stepCost.toFixed(4)}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`💥 Step ${this.sessionData.currentStep + 1} failed:`, error.message);
            
            return {
                success: false,
                action: 'error',
                error: error.message,
                needsRecovery: true
            };
        }
    }

    /**
     * Handle step failures with AI recovery
     */
    async handleStepFailure(stepResult) {
        console.log(`🔧 AI analyzing failure: ${stepResult.error}`);
        
        const prompt = `Analyze this poll automation failure and suggest recovery:

Error: ${stepResult.error}
Action that failed: ${stepResult.action}
Current step: ${this.sessionData.currentStep}
Questions answered: ${this.sessionData.questionsAnswered}
Time elapsed: ${Date.now() - this.sessionData.startTime}ms

Recent steps:
${this.sessionData.steps.slice(-3).map(s => `${s.step}: ${s.action} (${s.success ? 'success' : 'failed'})`).join('\n')}

Respond with JSON:
{
  "canContinue": boolean,
  "recovery": "retry|skip|restart|manual_intervention",
  "reason": "explanation of decision",
  "adjustments": ["what to change"],
  "waitTime": 0
}`;

        try {
            const response = await this.aiService.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 300
            });
            
            const recovery = JSON.parse(response);
            console.log(`🩹 Recovery plan: ${recovery.recovery} (can continue: ${recovery.canContinue})`);
            
            // Execute recovery action
            if (recovery.canContinue) {
                await this.executeRecovery(recovery);
            }
            
            return recovery;
            
        } catch (error) {
            console.error('AI recovery analysis failed:', error);
            return {
                canContinue: false,
                recovery: 'manual_intervention',
                reason: 'AI recovery failed'
            };
        }
    }

    /**
     * Execute recovery actions
     */
    async executeRecovery(recovery) {
        switch (recovery.recovery) {
            case 'retry':
                console.log('🔄 Retrying last action...');
                if (recovery.waitTime > 0) {
                    await this.page.page.waitForTimeout(recovery.waitTime);
                }
                break;
                
            case 'skip':
                console.log('⏭️ Skipping current step...');
                this.sessionData.currentStep++; // Skip current step
                break;
                
            case 'restart':
                console.log('🔄 Restarting from beginning...');
                await this.page.page.reload({ waitUntil: 'networkidle' });
                this.sessionData.currentStep = 0;
                break;
                
            case 'manual_intervention':
                console.log('🚨 Manual intervention required');
                throw new Error('Manual intervention required');
        }
    }

    /**
     * Verify poll completion using AI
     */
    async verifyCompletion() {
        const currentUrl = this.page.page.url();
        const pageContent = await this.page.page.textContent('body');
        const title = await this.page.page.title();
        
        const prompt = `Determine if this poll/survey is completed:

URL: ${currentUrl}
Title: ${title}
Page content: ${pageContent.substring(0, 1000)}

Look for indicators like:
- Thank you messages
- Completion confirmations
- Survey finished text
- Redirect to completion page

Respond with JSON:
{
  "isComplete": boolean,
  "confidence": 0.9,
  "indicators": ["indicator1", "indicator2"],
  "reasoning": "why complete or not complete"
}`;

        try {
            const response = await this.aiService.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 200
            });
            
            const verification = JSON.parse(response);
            console.log(`✅ Completion verification: ${verification.isComplete} (confidence: ${verification.confidence})`);
            
            return verification;
            
        } catch (error) {
            console.error('Completion verification failed:', error);
            
            // Fallback verification
            const completionKeywords = ['thank you', 'completed', 'finished', 'submitted', 'success'];
            const hasCompletionText = completionKeywords.some(keyword => 
                pageContent.toLowerCase().includes(keyword)
            );
            
            return {
                isComplete: hasCompletionText,
                confidence: 0.5,
                indicators: hasCompletionText ? ['completion text found'] : ['no completion indicators'],
                reasoning: 'Fallback verification'
            };
        }
    }

    /**
     * Take screenshot for error reporting
     */
    async takeErrorScreenshot() {
        try {
            if (this.page && this.page.page) {
                return await this.page.page.screenshot({ 
                    fullPage: true,
                    path: `./data/screenshots/error_${Date.now()}.png`
                });
            }
        } catch (error) {
            console.error('Failed to take error screenshot:', error);
        }
        return null;
    }

    /**
     * Get comprehensive session summary
     */
    getSessionSummary() {
        const duration = Date.now() - this.sessionData.startTime;
        const aiStats = this.aiService.getStats();
        
        return {
            ...this.sessionData,
            duration,
            aiStats: {
                totalCost: aiStats.totalCost,
                requestCount: aiStats.requestCount,
                errorRate: aiStats.errorRate,
                averageCostPerRequest: aiStats.averageCostPerRequest
            },
            performance: {
                stepsPerMinute: this.sessionData.steps.length / (duration / 60000),
                questionsPerMinute: this.sessionData.questionsAnswered / (duration / 60000),
                costPerQuestion: this.sessionData.questionsAnswered > 0 ? 
                    this.sessionData.cost / this.sessionData.questionsAnswered : 0
            }
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up resources...');
        
        try {
            if (this.adapter) {
                this.adapter.reset();
            }
            
            if (this.browser) {
                await this.browser.close();
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    /**
     * Get AI service statistics
     */
    getAIStats() {
        return this.aiService.getStats();
    }

    /**
     * Reset AI cost tracking
     */
    resetAIStats() {
        this.aiService.resetStats();
    }

    /**
     * Health check for all components
     */
    async healthCheck() {
        const results = {
            timestamp: new Date().toISOString(),
            components: {}
        };

        // AI Service health
        try {
            results.components.aiService = await this.aiService.healthCheck();
        } catch (error) {
            results.components.aiService = { status: 'unhealthy', error: error.message };
        }

        // Browser health
        results.components.browser = {
            status: this.browser ? 'healthy' : 'not_initialized'
        };

        // Overall health
        const allHealthy = Object.values(results.components).every(c => c.status === 'healthy');
        results.overall = allHealthy ? 'healthy' : 'degraded';

        return results;
    }

    /**
     * Static method to create and run automation
     */
    static async run(url, options = {}) {
        const automation = new AIPollAutomation(options);
        return await automation.automatePoll(url, options);
    }
}

module.exports = AIPollAutomation;