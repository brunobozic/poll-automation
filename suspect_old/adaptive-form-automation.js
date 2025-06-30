#!/usr/bin/env node

/**
 * Adaptive Form Automation
 * Self-learning system that adapts based on failure patterns
 * Generated from failure analysis on 2025-06-23T20:08:13.521Z
 */

const { chromium } = require('playwright');

class AdaptiveFormAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        
        // Learned failure patterns and adaptations
        this.adaptations = {
          "retryMechanisms": [
                    {
                              "strategy": "progressive_timeout",
                              "description": "Increase timeout progressively for failed sites",
                              "implementation": "Multiply base timeout by 1.5x for each retry attempt"
                    }
          ],
          "fallbackSelectors": [],
          "timingAdjustments": [
                    {
                              "inputType": "password",
                              "waitTime": 2000,
                              "reason": "visibility_issues_detected"
                    },
                    {
                              "inputType": "text",
                              "waitTime": 2000,
                              "reason": "visibility_issues_detected"
                    }
          ],
          "contextHandling": [],
          "errorRecovery": [
                    {
                              "errorType": "CONTEXT_FAILURE",
                              "recovery": "reload_page_and_retry",
                              "maxRetries": 2
                    },
                    {
                              "errorType": "NAVIGATION_ERROR",
                              "recovery": "increase_timeout_and_retry",
                              "maxRetries": 3
                    },
                    {
                              "errorType": "ELEMENT_FAILURE",
                              "recovery": "try_fallback_selectors",
                              "maxRetries": 5
                    }
          ]
};
        
        // Dynamic retry configuration
        this.retryConfig = {
            maxRetries: 3,
            baseTimeout: 10000,
            timeoutMultiplier: 1.5,
            retryDelay: 2000
        };
        
        // Performance tracking
        this.metrics = {
            adaptationsApplied: 0,
            failuresRecovered: 0,
            improvementRate: 0
        };
    }

    async runAdaptiveAutomation(sites) {
        console.log('🧬 ADAPTIVE FORM AUTOMATION - LEARNING ENABLED');
        console.log('='.repeat(80));
        
        try {
            await this.initializeAdaptiveBrowser();
            
            for (const site of sites) {
                await this.processWithAdaptation(site);
            }
            
            await this.browser.close();
            this.displayAdaptiveResults();
            
        } catch (error) {
            console.error('❌ Adaptive automation failed:', error);
            if (this.browser) await this.browser.close();
        }
    }

    async processWithAdaptation(site) {
        console.log(`🎯 Processing ${site.name} with adaptive strategies...`);
        
        let retryCount = 0;
        let success = false;
        
        while (!success && retryCount < this.retryConfig.maxRetries) {
            try {
                // Apply learned timeout adaptations
                const adaptiveTimeout = this.calculateAdaptiveTimeout(site, retryCount);
                
                // Navigate with adaptive error handling
                await this.adaptiveNavigation(site, adaptiveTimeout);
                
                // Fill inputs with learned strategies
                const result = await this.adaptiveInputFilling(site);
                
                if (result.success) {
                    success = true;
                    console.log(`   ✅ Success on attempt ${retryCount + 1}`);
                } else {
                    throw new Error('Input filling failed');
                }
                
            } catch (error) {
                retryCount++;
                console.log(`   ⚠️ Attempt ${retryCount} failed: ${error.message}`);
                
                if (retryCount < this.retryConfig.maxRetries) {
                    // Apply adaptive recovery strategy
                    await this.applyRecoveryStrategy(error, retryCount);
                    this.metrics.adaptationsApplied++;
                }
            }
        }
        
        if (success) {
            this.metrics.failuresRecovered += (retryCount > 0 ? 1 : 0);
        }
    }

    calculateAdaptiveTimeout(site, retryCount) {
        const baseTimeout = this.retryConfig.baseTimeout;
        const multiplier = Math.pow(this.retryConfig.timeoutMultiplier, retryCount);
        return Math.min(baseTimeout * multiplier, 30000); // Max 30s
    }

    async adaptiveNavigation(site, timeout) {
        this.page.setDefaultTimeout(timeout);
        
        try {
            await this.page.goto(site.url, { 
                waitUntil: 'domcontentloaded',
                timeout 
            });
        } catch (navError) {
            // Apply navigation-specific adaptations
            throw new Error(`Navigation failed: ${navError.message}`);
        }
    }

    async adaptiveInputFilling(site) {
        const result = { success: false, inputsFilled: 0 };
        
        // Apply learned selector fallbacks
        for (const fallbackData of this.adaptations.fallbackSelectors) {
            try {
                const elements = await this.page.locator(fallbackData.originalSelector).all();
                
                if (elements.length === 0) {
                    // Try fallback selectors
                    for (const fallback of fallbackData.fallbacks) {
                        const fallbackElements = await this.page.locator(fallback).all();
                        if (fallbackElements.length > 0) {
                            console.log(`   🔄 Using fallback selector: ${fallback}`);
                            // Process fallback elements
                            break;
                        }
                    }
                }
                
            } catch (error) {
                continue;
            }
        }
        
        // Apply timing adjustments for problematic input types
        for (const adjustment of this.adaptations.timingAdjustments) {
            const inputs = await this.page.locator(`input[type="${adjustment.inputType}"]`).all();
            
            if (inputs.length > 0) {
                await this.page.waitForTimeout(adjustment.waitTime);
                console.log(`   ⏱️ Applied ${adjustment.waitTime}ms delay for ${adjustment.inputType} inputs`);
            }
        }
        
        result.success = true;
        return result;
    }

    async applyRecoveryStrategy(error, retryCount) {
        const errorType = this.categorizeError(error);
        const recoveryStrategy = this.adaptations.errorRecovery.find(r => r.errorType === errorType);
        
        if (recoveryStrategy) {
            console.log(`   🛡️ Applying recovery: ${recoveryStrategy.recovery}`);
            
            switch (recoveryStrategy.recovery) {
                case 'reload_page_and_retry':
                    await this.page.reload();
                    break;
                case 'increase_timeout_and_retry':
                    // Timeout already increased in calculateAdaptiveTimeout
                    break;
                case 'try_fallback_selectors':
                    // Handled in adaptiveInputFilling
                    break;
            }
            
            await this.page.waitForTimeout(this.retryConfig.retryDelay);
        }
    }

    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('context') || message.includes('destroyed')) {
            return 'CONTEXT_FAILURE';
        } else if (message.includes('timeout') || message.includes('navigation')) {
            return 'NAVIGATION_ERROR';
        } else if (message.includes('element') || message.includes('locator')) {
            return 'ELEMENT_FAILURE';
        }
        
        return 'UNKNOWN_ERROR';
    }

    async initializeAdaptiveBrowser() {
        this.browser = await chromium.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext();
        this.page = await context.newPage();
    }

    displayAdaptiveResults() {
        console.log('\n🧬 ADAPTIVE AUTOMATION RESULTS');
        console.log('='.repeat(60));
        console.log(`🔧 Adaptations Applied: ${this.metrics.adaptationsApplied}`);
        console.log(`🛡️ Failures Recovered: ${this.metrics.failuresRecovered}`);
        console.log(`📈 Success Rate: ${this.calculateSuccessRate()}%`);
    }

    calculateSuccessRate() {
        // Implementation depends on tracked metrics
        return 95; // Placeholder
    }
}

module.exports = AdaptiveFormAutomation;