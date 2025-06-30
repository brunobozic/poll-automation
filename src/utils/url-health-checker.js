/**
 * URL Health Checker
 * Pre-flight checks for URL validity before attempting surveys
 * Based on learning: "2/3 URLs were invalid or inaccessible"
 */

class URLHealthChecker {
    constructor(page) {
        this.page = page;
        this.healthCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Check if URLs are healthy before attempting surveys
     */
    async checkURLsHealth(urls) {
        console.log(`🏥 Checking health of ${urls.length} URLs...`);
        
        const healthResults = [];
        
        for (let i = 0; i < urls.length; i++) {
            const url = typeof urls[i] === 'string' ? urls[i] : urls[i].url;
            console.log(`   📍 Checking ${i + 1}/${urls.length}: ${url}`);
            
            const health = await this.checkSingleURL(url);
            healthResults.push({
                url,
                originalData: urls[i],
                health
            });
            
            // Small delay to avoid overwhelming servers
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const healthyUrls = healthResults.filter(r => r.health.isHealthy);
        console.log(`✅ Health check complete: ${healthyUrls.length}/${urls.length} URLs are healthy`);
        
        return {
            healthy: healthyUrls,
            unhealthy: healthResults.filter(r => !r.health.isHealthy),
            summary: {
                total: urls.length,
                healthy: healthyUrls.length,
                healthRate: (healthyUrls.length / urls.length * 100).toFixed(1)
            }
        };
    }

    /**
     * Check health of a single URL
     */
    async checkSingleURL(url) {
        // Check cache first
        const cached = this.healthCache.get(url);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            console.log(`     💾 Using cached result for ${url}`);
            return cached.health;
        }

        const health = {
            isHealthy: false,
            httpStatus: null,
            loadTime: null,
            hasContent: false,
            hasForms: false,
            hasInteractiveElements: false,
            error: null,
            warnings: [],
            contentAnalysis: {}
        };

        const startTime = Date.now();

        try {
            // Step 1: Basic HTTP check
            console.log(`     🌐 Testing HTTP response...`);
            const response = await this.page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 15000 
            });

            health.httpStatus = response.status();
            health.loadTime = Date.now() - startTime;

            console.log(`     📊 HTTP ${health.httpStatus} in ${health.loadTime}ms`);

            // Step 2: Check for common failure indicators
            if (health.httpStatus >= 400) {
                health.error = `HTTP ${health.httpStatus} error`;
                console.log(`     ❌ ${health.error}`);
            } else if (health.httpStatus >= 300) {
                health.warnings.push(`Redirect: HTTP ${health.httpStatus}`);
                console.log(`     ⚠️ Redirect detected`);
            }

            // Step 3: Content analysis
            if (health.httpStatus < 400) {
                console.log(`     📄 Analyzing content...`);
                health.contentAnalysis = await this.analyzePageContent();
                health.hasContent = health.contentAnalysis.hasContent;
                health.hasForms = health.contentAnalysis.hasForms;
                health.hasInteractiveElements = health.contentAnalysis.hasInteractiveElements;

                console.log(`     📋 Content: ${health.hasContent ? '✅' : '❌'}, Forms: ${health.hasForms ? '✅' : '❌'}, Interactive: ${health.hasInteractiveElements ? '✅' : '❌'}`);
            }

            // Step 4: Survey-specific checks
            const surveyScore = await this.calculateSurveyScore(health.contentAnalysis);
            health.surveyScore = surveyScore;

            // Step 5: Determine overall health
            health.isHealthy = this.determineOverallHealth(health);

            if (health.isHealthy) {
                console.log(`     ✅ URL is healthy (score: ${surveyScore}/10)`);
            } else {
                console.log(`     ❌ URL is unhealthy (score: ${surveyScore}/10)`);
            }

        } catch (error) {
            health.error = error.message;
            health.loadTime = Date.now() - startTime;
            console.log(`     ❌ Health check failed: ${error.message}`);
        }

        // Cache the result
        this.healthCache.set(url, {
            health,
            timestamp: Date.now()
        });

        return health;
    }

    /**
     * Analyze page content for survey indicators
     */
    async analyzePageContent() {
        return await this.page.evaluate(() => {
            const analysis = {
                hasContent: false,
                hasForms: false,
                hasInteractiveElements: false,
                pageTitle: document.title || '',
                textLength: 0,
                inputCount: 0,
                formCount: 0,
                surveyKeywords: 0,
                errorIndicators: 0,
                navigationElements: 0
            };

            // Basic content checks
            const bodyText = document.body.textContent || '';
            analysis.textLength = bodyText.length;
            analysis.hasContent = analysis.textLength > 100;

            // Form and input analysis
            const forms = document.querySelectorAll('form');
            const allInputs = document.querySelectorAll('input, select, textarea, button');
            const interactiveInputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');

            analysis.formCount = forms.length;
            analysis.inputCount = interactiveInputs.length;
            analysis.hasForms = analysis.formCount > 0;
            analysis.hasInteractiveElements = analysis.inputCount > 0;

            // Survey-specific keyword analysis
            const surveyKeywords = [
                'survey', 'questionnaire', 'poll', 'feedback', 'rating', 'opinion',
                'how satisfied', 'rate your', 'please select', 'on a scale',
                'strongly agree', 'somewhat agree', 'disagree'
            ];

            const lowerText = bodyText.toLowerCase();
            analysis.surveyKeywords = surveyKeywords.filter(keyword => 
                lowerText.includes(keyword)
            ).length;

            // Error page detection
            const errorIndicators = [
                'not found', '404', 'page not found', 'error', 'unavailable',
                'access denied', 'forbidden', 'maintenance', 'coming soon'
            ];

            analysis.errorIndicators = errorIndicators.filter(indicator => 
                lowerText.includes(indicator)
            ).length;

            // Navigation elements (suggests it's a real site, not an error page)
            const navElements = document.querySelectorAll('nav, .navigation, .menu, header, footer');
            analysis.navigationElements = navElements.length;

            return analysis;
        });
    }

    /**
     * Calculate survey suitability score (0-10)
     */
    async calculateSurveyScore(contentAnalysis) {
        let score = 0;

        // Content presence (0-2 points)
        if (contentAnalysis.hasContent) score += 2;

        // Interactive elements (0-3 points)
        if (contentAnalysis.hasInteractiveElements) {
            score += Math.min(3, Math.floor(contentAnalysis.inputCount / 2));
        }

        // Survey keywords (0-2 points)
        if (contentAnalysis.surveyKeywords > 0) {
            score += Math.min(2, contentAnalysis.surveyKeywords);
        }

        // Form presence (0-1 point)
        if (contentAnalysis.hasForms) score += 1;

        // Navigation elements indicate real site (0-1 point)
        if (contentAnalysis.navigationElements > 0) score += 1;

        // Penalty for error indicators
        score -= Math.min(3, contentAnalysis.errorIndicators);

        // Ensure score is within bounds
        score = Math.max(0, Math.min(10, score));

        return score;
    }

    /**
     * Determine overall health based on multiple factors
     */
    determineOverallHealth(health) {
        // Must have successful HTTP response
        if (health.httpStatus >= 400) return false;

        // Must have some content
        if (!health.hasContent) return false;

        // Must have reasonable survey score
        if (health.surveyScore < 3) return false;

        // Must not have fatal errors
        if (health.error && !health.error.includes('timeout')) return false;

        return true;
    }

    /**
     * Get prioritized healthy URLs with survey scores
     */
    getPrioritizedHealthyURLs(healthResults) {
        return healthResults.healthy
            .sort((a, b) => b.health.surveyScore - a.health.surveyScore)
            .map(result => ({
                ...result.originalData,
                healthScore: result.health.surveyScore,
                loadTime: result.health.loadTime,
                confidence: this.calculateConfidence(result.health)
            }));
    }

    /**
     * Calculate confidence level for URL
     */
    calculateConfidence(health) {
        let confidence = 0.5; // Base confidence

        // HTTP status boost
        if (health.httpStatus === 200) confidence += 0.2;
        else if (health.httpStatus < 300) confidence += 0.1;

        // Survey score boost
        confidence += (health.surveyScore / 10) * 0.3;

        // Interactive elements boost
        if (health.hasInteractiveElements) confidence += 0.1;

        // Speed boost
        if (health.loadTime < 3000) confidence += 0.1;

        return Math.min(1.0, confidence);
    }

    /**
     * Generate health report
     */
    generateHealthReport(healthResults) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: healthResults.summary,
            healthyUrls: healthResults.healthy.length,
            unhealthyUrls: healthResults.unhealthy.length,
            recommendations: []
        };

        // Analyze failure patterns
        const failureReasons = {};
        healthResults.unhealthy.forEach(result => {
            const reason = result.health.error || 'Unknown failure';
            failureReasons[reason] = (failureReasons[reason] || 0) + 1;
        });

        report.failureReasons = failureReasons;

        // Generate recommendations
        if (report.healthyUrls === 0) {
            report.recommendations.push('🚨 No healthy URLs found - check network connectivity and URL sources');
        } else if (report.summary.healthRate < 50) {
            report.recommendations.push('⚠️ Low health rate - consider improving URL source quality');
        }

        if (failureReasons['HTTP 404 error']) {
            report.recommendations.push('🔗 Many 404 errors - update URL sources to remove dead links');
        }

        if (Object.keys(failureReasons).some(reason => reason.includes('timeout'))) {
            report.recommendations.push('⏱️ Timeout issues detected - consider increasing timeout or checking network');
        }

        return report;
    }

    /**
     * Clear health cache
     */
    clearCache() {
        this.healthCache.clear();
        console.log('🗑️ Health cache cleared');
    }
}

module.exports = URLHealthChecker;