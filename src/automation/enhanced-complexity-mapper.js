/**
 * Enhanced Complexity Mapper
 * Robust form complexity analysis with advanced error handling
 * Addresses the critical bottleneck identified in learning evaluation
 */

class EnhancedComplexityMapper {
    constructor(page) {
        this.page = page;
        this.retryStrategies = [
            { timeout: 15000, waitUntil: 'domcontentloaded' },
            { timeout: 10000, waitUntil: 'load' },
            { timeout: 8000, waitUntil: 'networkidle' },
            { timeout: 5000, waitUntil: 'domcontentloaded' }
        ];
        this.navigationBlockers = [
            'surveytandem.com',
            'redirect',
            'munin',
            'tracking'
        ];
    }

    /**
     * Enhanced complexity mapping with robust error handling
     */
    async mapFormComplexityRobust(url) {
        console.log(`🔍 Enhanced complexity mapping for: ${url}`);

        // Pre-validation
        const urlValidation = this.validateURL(url);
        if (!urlValidation.valid) {
            console.log(`   ❌ URL validation failed: ${urlValidation.reason}`);
            return this.createFailureResponse(url, urlValidation.reason);
        }

        // Try multiple strategies
        for (let i = 0; i < this.retryStrategies.length; i++) {
            const strategy = this.retryStrategies[i];
            console.log(`   🎯 Attempting strategy ${i + 1}/${this.retryStrategies.length}: ${strategy.waitUntil}, ${strategy.timeout}ms`);

            try {
                const result = await this.attemptComplexityMapping(url, strategy);
                if (result.success) {
                    console.log(`   ✅ Strategy ${i + 1} succeeded: ${result.complexity.score}/10`);
                    return result;
                }
            } catch (error) {
                console.log(`   ⚠️ Strategy ${i + 1} failed: ${error.message}`);
                if (i === this.retryStrategies.length - 1) {
                    // Last attempt failed, try fallback analysis
                    return await this.fallbackComplexityAnalysis(url, error);
                }
            }
        }

        return this.createFailureResponse(url, 'All strategies exhausted');
    }

    /**
     * Validate URL before attempting analysis
     */
    validateURL(url) {
        // Check for known problematic patterns
        for (const blocker of this.navigationBlockers) {
            if (url.includes(blocker)) {
                return {
                    valid: false,
                    reason: `Contains problematic pattern: ${blocker}`
                };
            }
        }

        // Check URL format
        try {
            new URL(url);
        } catch (error) {
            return {
                valid: false,
                reason: 'Invalid URL format'
            };
        }

        // Check for tracking parameters that might cause redirects
        if (url.includes('?') && (url.includes('token=') || url.includes('sid=') || url.includes('subid'))) {
            return {
                valid: false,
                reason: 'Contains tracking parameters likely to cause redirects'
            };
        }

        return { valid: true };
    }

    /**
     * Attempt complexity mapping with specific strategy
     */
    async attemptComplexityMapping(url, strategy) {
        const startTime = Date.now();

        // Navigate with specific strategy
        const response = await this.page.goto(url, {
            waitUntil: strategy.waitUntil,
            timeout: strategy.timeout
        });

        const loadTime = Date.now() - startTime;

        // Check if navigation was successful
        if (!response || response.status() >= 400) {
            throw new Error(`HTTP ${response?.status() || 'unknown'} error`);
        }

        // Check for redirect loops or problematic URLs
        const finalUrl = this.page.url();
        if (this.isProblematicRedirect(url, finalUrl)) {
            throw new Error(`Problematic redirect detected: ${url} -> ${finalUrl}`);
        }

        // Perform complexity analysis
        const complexity = await this.analyzeFormComplexity();
        
        return {
            success: true,
            originalUrl: url,
            finalUrl: finalUrl,
            loadTime: loadTime,
            strategy: strategy,
            complexity: complexity
        };
    }

    /**
     * Check if redirect is problematic
     */
    isProblematicRedirect(originalUrl, finalUrl) {
        // Same URL is fine
        if (originalUrl === finalUrl) return false;

        // Check for known problematic redirect patterns
        const problematicPatterns = [
            'surveytandem.com',
            'munin',
            'tracking',
            'redirect',
            'error',
            '404'
        ];

        for (const pattern of problematicPatterns) {
            if (finalUrl.includes(pattern) && !originalUrl.includes(pattern)) {
                return true;
            }
        }

        // Check for excessive redirect chains (more than 2 domain changes)
        try {
            const originalDomain = new URL(originalUrl).hostname;
            const finalDomain = new URL(finalUrl).hostname;
            
            if (originalDomain !== finalDomain) {
                console.log(`   📍 Domain change detected: ${originalDomain} -> ${finalDomain}`);
                // Allow some domain changes, but not to obviously problematic domains
                return this.navigationBlockers.some(blocker => finalDomain.includes(blocker));
            }
        } catch (error) {
            return true; // Invalid URLs are problematic
        }

        return false;
    }

    /**
     * Enhanced form complexity analysis
     */
    async analyzeFormComplexity() {
        return await this.page.evaluate(() => {
            const analysis = {
                score: 0,
                factors: {},
                details: {},
                insights: []
            };

            try {
                // Count form elements
                const forms = document.querySelectorAll('form');
                const inputs = document.querySelectorAll('input:not([type="hidden"])');
                const selects = document.querySelectorAll('select');
                const textareas = document.querySelectorAll('textarea');
                const radios = document.querySelectorAll('input[type="radio"]');
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                const buttons = document.querySelectorAll('button, input[type="submit"]');

                analysis.details = {
                    formCount: forms.length,
                    inputCount: inputs.length,
                    selectCount: selects.length,
                    textareaCount: textareas.length,
                    radioCount: radios.length,
                    checkboxCount: checkboxes.length,
                    buttonCount: buttons.length,
                    totalInteractiveElements: inputs.length + selects.length + textareas.length + buttons.length
                };

                // Calculate complexity score (0-10)
                let score = 0;

                // Basic elements (0-3 points)
                score += Math.min(3, Math.floor(analysis.details.totalInteractiveElements / 3));

                // Element variety (0-2 points)
                const varietyCount = [
                    inputs.length > 0,
                    selects.length > 0,
                    textareas.length > 0,
                    radios.length > 0,
                    checkboxes.length > 0
                ].filter(Boolean).length;
                score += Math.min(2, varietyCount);

                // Form presence (0-1 point)
                if (forms.length > 0) score += 1;

                // Multi-page indicators (0-2 points)
                const multiPageIndicators = document.querySelectorAll(
                    '.step, .page, .progress, [class*="step"], [class*="page"], [class*="progress"]'
                );
                if (multiPageIndicators.length > 0) {
                    score += Math.min(2, Math.floor(multiPageIndicators.length / 2));
                }

                // JavaScript framework detection (0-1 point)
                const hasFramework = !!(
                    window.React || 
                    window.Vue || 
                    window.angular || 
                    document.querySelector('[data-reactroot], [data-v-], [ng-app]')
                );
                if (hasFramework) score += 1;

                // Validation complexity (0-1 point)
                const validationElements = document.querySelectorAll(
                    '[required], [pattern], [min], [max], [minlength], [maxlength]'
                );
                if (validationElements.length > 0) score += 1;

                // Ensure score is within bounds
                score = Math.max(0, Math.min(10, score));
                analysis.score = score;

                // Add insights based on analysis
                if (analysis.details.formCount === 0) {
                    analysis.insights.push('No forms detected - may be a landing page');
                } else if (analysis.details.formCount > 1) {
                    analysis.insights.push('Multiple forms detected - complex page structure');
                }

                if (analysis.details.totalInteractiveElements === 0) {
                    analysis.insights.push('No interactive elements - not suitable for automation');
                } else if (analysis.details.totalInteractiveElements > 10) {
                    analysis.insights.push('High number of interactive elements - complex form');
                }

                if (hasFramework) {
                    analysis.insights.push('JavaScript framework detected - may require dynamic handling');
                }

                if (multiPageIndicators.length > 0) {
                    analysis.insights.push('Multi-step form indicators detected');
                }

                analysis.factors = {
                    hasContent: document.body.textContent.length > 100,
                    hasForms: forms.length > 0,
                    hasInteractiveElements: analysis.details.totalInteractiveElements > 0,
                    hasMultiStep: multiPageIndicators.length > 0,
                    hasValidation: validationElements.length > 0,
                    hasJavaScript: hasFramework,
                    automationFeasibility: analysis.details.totalInteractiveElements > 0 && analysis.details.totalInteractiveElements < 20 ? 'high' : 
                                          analysis.details.totalInteractiveElements >= 20 ? 'medium' : 'low'
                };

            } catch (error) {
                analysis.insights.push(`Analysis error: ${error.message}`);
                analysis.score = 0;
            }

            return analysis;
        });
    }

    /**
     * Fallback complexity analysis for failed cases
     */
    async fallbackComplexityAnalysis(url, error) {
        console.log(`   🔄 Attempting fallback analysis for: ${url}`);

        // Try to get basic page information without navigation
        try {
            // Simple HTTP check
            const response = await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 5000
            });

            if (response && response.status() < 400) {
                // Very basic analysis
                const basicAnalysis = await this.page.evaluate(() => {
                    return {
                        score: document.querySelectorAll('form, input, select, textarea').length > 0 ? 1 : 0,
                        factors: {
                            hasContent: document.body.textContent.length > 50,
                            hasForms: document.querySelectorAll('form').length > 0,
                            hasInteractiveElements: document.querySelectorAll('input, select, textarea').length > 0
                        },
                        details: {
                            formCount: document.querySelectorAll('form').length,
                            inputCount: document.querySelectorAll('input').length,
                            totalInteractiveElements: document.querySelectorAll('input, select, textarea').length
                        },
                        insights: ['Fallback analysis - limited data available']
                    };
                });

                return {
                    success: true,
                    originalUrl: url,
                    finalUrl: this.page.url(),
                    loadTime: 5000,
                    strategy: 'fallback',
                    complexity: basicAnalysis,
                    fallback: true
                };
            }
        } catch (fallbackError) {
            console.log(`   ❌ Fallback analysis also failed: ${fallbackError.message}`);
        }

        return this.createFailureResponse(url, `All attempts failed. Last error: ${error.message}`);
    }

    /**
     * Create failure response
     */
    createFailureResponse(url, reason) {
        return {
            success: false,
            originalUrl: url,
            finalUrl: null,
            loadTime: 0,
            strategy: 'none',
            complexity: {
                score: 0,
                factors: {
                    hasContent: false,
                    hasForms: false,
                    hasInteractiveElements: false
                },
                details: {
                    formCount: 0,
                    inputCount: 0,
                    totalInteractiveElements: 0
                },
                insights: [`Failed to analyze: ${reason}`]
            },
            error: reason
        };
    }

    /**
     * Batch complexity mapping with enhanced error handling
     */
    async mapMultipleFormsComplexity(urls) {
        console.log(`🔍 Enhanced batch complexity mapping for ${urls.length} URLs...`);

        const results = [];
        const successful = [];
        const failed = [];

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`\n📋 Mapping ${i + 1}/${urls.length}: ${url}`);

            const result = await this.mapFormComplexityRobust(url);
            results.push(result);

            if (result.success) {
                successful.push(result);
                console.log(`   ✅ Success: ${result.complexity.score}/10 complexity`);
            } else {
                failed.push(result);
                console.log(`   ❌ Failed: ${result.error}`);
            }

            // Small delay to avoid overwhelming servers
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const summary = {
            total: urls.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / urls.length * 100).toFixed(1),
            avgComplexity: successful.length > 0 ? 
                (successful.reduce((sum, r) => sum + r.complexity.score, 0) / successful.length).toFixed(1) : 0
        };

        console.log(`\n📊 Enhanced complexity mapping summary:`);
        console.log(`   Total URLs: ${summary.total}`);
        console.log(`   Successful: ${summary.successful} (${summary.successRate}%)`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Average complexity: ${summary.avgComplexity}/10`);

        return {
            results,
            successful,
            failed,
            summary
        };
    }

    /**
     * Generate complexity insights and recommendations
     */
    generateComplexityInsights(mappingResults) {
        const insights = [];
        const recommendations = [];

        if (mappingResults.successful.length === 0) {
            insights.push('No successful complexity mappings - URLs may be problematic');
            recommendations.push('Review URL sources and implement better filtering');
            return { insights, recommendations };
        }

        // Analyze successful results
        const complexities = mappingResults.successful.map(r => r.complexity.score);
        const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;

        const simpleCount = complexities.filter(c => c <= 3).length;
        const moderateCount = complexities.filter(c => c > 3 && c <= 6).length;
        const complexCount = complexities.filter(c => c > 6).length;

        insights.push(`Average complexity: ${avgComplexity.toFixed(1)}/10`);
        insights.push(`Distribution: ${simpleCount} simple, ${moderateCount} moderate, ${complexCount} complex`);

        // Generate recommendations based on patterns
        if (simpleCount > moderateCount + complexCount) {
            recommendations.push('Focus automation efforts on simple forms (high success probability)');
        }

        if (complexCount > 0) {
            recommendations.push('Develop specialized strategies for complex forms');
        }

        if (mappingResults.summary.successRate < 50) {
            recommendations.push('Improve URL validation and filtering to reduce failed attempts');
        }

        // Analyze failure patterns
        const failureReasons = mappingResults.failed.map(f => f.error);
        const commonFailures = {};
        failureReasons.forEach(reason => {
            const key = reason.includes('redirect') ? 'redirect_issues' :
                       reason.includes('timeout') ? 'timeout_issues' :
                       reason.includes('HTTP') ? 'http_errors' : 'other';
            commonFailures[key] = (commonFailures[key] || 0) + 1;
        });

        Object.entries(commonFailures).forEach(([type, count]) => {
            insights.push(`${type}: ${count} occurrences`);
            
            if (type === 'redirect_issues') {
                recommendations.push('Implement redirect detection and avoidance');
            } else if (type === 'timeout_issues') {
                recommendations.push('Optimize timeout strategies for different site types');
            } else if (type === 'http_errors') {
                recommendations.push('Add HTTP status validation before analysis attempts');
            }
        });

        return { insights, recommendations };
    }
}

module.exports = EnhancedComplexityMapper;