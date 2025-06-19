/**
 * Adaptive Learning Engine
 * Machine learning component that learns from registration patterns and adapts tactics
 */

class AdaptiveLearningEngine {
    constructor(options = {}) {
        this.options = {
            learningEnabled: options.learningEnabled !== false,
            confidenceThreshold: options.confidenceThreshold || 0.7,
            maxPatterns: options.maxPatterns || 1000,
            adaptationRate: options.adaptationRate || 0.1,
            ...options
        };
        
        // Pattern storage
        this.successPatterns = [];
        this.failurePatterns = [];
        this.siteProfiles = new Map();
        this.adaptiveTactics = new Map();
        
        // Learning metrics
        this.learningStats = {
            patternsLearned: 0,
            adaptationsMade: 0,
            successRateImprovement: 0,
            lastAdaptation: null
        };
    }
    
    /**
     * Learn from a registration attempt
     */
    async learnFromAttempt(attemptData) {
        if (!this.options.learningEnabled) return;
        
        console.log('🧠 Learning from registration attempt...');
        
        const pattern = this.extractPattern(attemptData);
        
        if (attemptData.success) {
            this.successPatterns.push(pattern);
            console.log('✅ Success pattern learned');
        } else {
            this.failurePatterns.push(pattern);
            console.log('❌ Failure pattern learned');
        }
        
        // Update site profile
        this.updateSiteProfile(attemptData.siteName, pattern, attemptData.success);
        
        // Check if adaptation is needed
        await this.checkForAdaptation(attemptData.siteName);
        
        this.learningStats.patternsLearned++;
        
        // Cleanup old patterns
        this.cleanupPatterns();
    }
    
    /**
     * Extract learning pattern from attempt data
     */
    extractPattern(attemptData) {
        return {
            siteName: attemptData.siteName,
            siteUrl: attemptData.siteUrl,
            timestamp: new Date().toISOString(),
            
            // Form characteristics
            formAnalysis: {
                inputsCount: attemptData.formAnalysis?.inputsCount || 0,
                hasEmailField: attemptData.formAnalysis?.hasEmailField || false,
                complexity: attemptData.formAnalysis?.complexity || 0,
                fieldTypes: attemptData.formAnalysis?.fieldTypes || {}
            },
            
            // Defenses encountered
            defenses: attemptData.defenses || [],
            defenseSeverity: this.calculateDefenseSeverity(attemptData.defenses),
            
            // Response characteristics
            responseType: attemptData.responseType || 'html',
            statusCode: attemptData.statusCode || 200,
            responseSize: attemptData.responseSize || 0,
            responseTime: attemptData.responseTime || 0,
            
            // Content analysis
            contentKeywords: this.extractContentKeywords(attemptData.content),
            urlChange: attemptData.urlChange || false,
            
            // Success indicators used
            successIndicators: attemptData.successIndicators || [],
            
            // Error details
            errorType: attemptData.errorType || null,
            errorMessage: attemptData.errorMessage || null,
            
            // Tactics used
            stealthLevel: attemptData.stealthLevel || 'high',
            humanBehavior: attemptData.humanBehavior || false,
            captchaSolved: attemptData.captchaSolved || false
        };
    }
    
    /**
     * Calculate defense severity score
     */
    calculateDefenseSeverity(defenses) {
        if (!defenses || defenses.length === 0) return 0;
        
        const totalSeverity = defenses.reduce((sum, defense) => sum + (defense.severityLevel || 0), 0);
        return totalSeverity / defenses.length;
    }
    
    /**
     * Extract keywords from response content
     */
    extractContentKeywords(content) {
        if (!content) return [];
        
        const keywords = [];
        const text = content.toLowerCase();
        
        // Success keywords
        const successKeywords = ['success', 'welcome', 'thank you', 'confirmation', 'verify', 'complete', 'submitted'];
        successKeywords.forEach(keyword => {
            if (text.includes(keyword)) keywords.push(`success:${keyword}`);
        });
        
        // Error keywords
        const errorKeywords = ['error', 'failed', 'invalid', 'try again', 'incorrect', 'denied'];
        errorKeywords.forEach(keyword => {
            if (text.includes(keyword)) keywords.push(`error:${keyword}`);
        });
        
        // Response format indicators
        if (text.includes('{') && text.includes('}')) keywords.push('format:json');
        if (text.includes('<html')) keywords.push('format:html');
        if (text.includes('<?xml')) keywords.push('format:xml');
        
        return keywords;
    }
    
    /**
     * Update site-specific profile
     */
    updateSiteProfile(siteName, pattern, success) {
        if (!this.siteProfiles.has(siteName)) {
            this.siteProfiles.set(siteName, {
                attempts: 0,
                successes: 0,
                failures: 0,
                successRate: 0,
                avgDefenseSeverity: 0,
                commonDefenses: new Map(),
                successPatterns: [],
                failurePatterns: [],
                adaptiveTactics: {
                    optimalStealthLevel: 'high',
                    requiresHumanBehavior: true,
                    avgResponseTime: 0,
                    preferredSuccessDetection: 'html'
                }
            });
        }
        
        const profile = this.siteProfiles.get(siteName);
        profile.attempts++;
        
        if (success) {
            profile.successes++;
            profile.successPatterns.push(pattern);
        } else {
            profile.failures++;
            profile.failurePatterns.push(pattern);
        }
        
        profile.successRate = profile.attempts > 0 ? profile.successes / profile.attempts : 0;
        
        // Update defense tracking
        if (pattern.defenses) {
            pattern.defenses.forEach(defense => {
                const defenseKey = `${defense.defenseType}:${defense.defenseSubtype}`;
                const count = profile.commonDefenses.get(defenseKey) || 0;
                profile.commonDefenses.set(defenseKey, count + 1);
            });
        }
        
        // Update adaptive tactics
        this.updateAdaptiveTactics(profile, pattern, success);
    }
    
    /**
     * Update adaptive tactics based on patterns
     */
    updateAdaptiveTactics(profile, pattern, success) {
        if (success) {
            // Learn from successful patterns
            const tactics = profile.adaptiveTactics;
            
            // Adjust stealth level
            if (pattern.defenseSeverity > 7 && pattern.stealthLevel === 'maximum') {
                tactics.optimalStealthLevel = 'maximum';
            } else if (pattern.defenseSeverity < 3) {
                tactics.optimalStealthLevel = 'medium';
            }
            
            // Response time optimization
            tactics.avgResponseTime = (tactics.avgResponseTime + pattern.responseTime) / 2;
            
            // Success detection method
            if (pattern.contentKeywords.includes('format:json')) {
                tactics.preferredSuccessDetection = 'json';
            }
        }
    }
    
    /**
     * Check if adaptation is needed for a site
     */
    async checkForAdaptation(siteName) {
        const profile = this.siteProfiles.get(siteName);
        if (!profile || profile.attempts < 3) return;
        
        // Trigger adaptation if success rate is low
        if (profile.successRate < 0.3 && profile.attempts >= 3) {
            console.log(`🔄 Triggering adaptation for ${siteName} (Success rate: ${(profile.successRate * 100).toFixed(1)}%)`);
            await this.adaptTactics(siteName);
        }
    }
    
    /**
     * Adapt tactics for a specific site
     */
    async adaptTactics(siteName) {
        const profile = this.siteProfiles.get(siteName);
        if (!profile) return;
        
        console.log(`🧠 Adapting tactics for ${siteName}...`);
        
        const adaptations = [];
        
        // Analyze failure patterns
        const failureReasons = profile.failurePatterns.map(p => p.errorType).filter(Boolean);
        const commonFailures = this.getMostCommon(failureReasons);
        
        // Adapt based on common failures
        if (commonFailures.includes('form_submission_failed')) {
            adaptations.push({
                type: 'success_detection',
                recommendation: 'Use adaptive success detection with JSON and status code checking'
            });
        }
        
        if (commonFailures.includes('captcha_failed')) {
            adaptations.push({
                type: 'captcha_handling',
                recommendation: 'Increase CAPTCHA solving timeout and use multiple services'
            });
        }
        
        // Analyze defense patterns
        const defenseTypes = Array.from(profile.commonDefenses.keys());
        if (defenseTypes.includes('rateLimit:general')) {
            adaptations.push({
                type: 'rate_limiting',
                recommendation: 'Increase delays between requests and rotate IPs'
            });
        }
        
        if (defenseTypes.includes('cloudflare:general')) {
            adaptations.push({
                type: 'cloudflare',
                recommendation: 'Use maximum stealth level and extended wait times'
            });
        }
        
        // Store adaptations
        this.adaptiveTactics.set(siteName, adaptations);
        this.learningStats.adaptationsMade++;
        this.learningStats.lastAdaptation = new Date().toISOString();
        
        console.log(`✅ ${adaptations.length} adaptations created for ${siteName}`);
        adaptations.forEach(adaptation => {
            console.log(`   📋 ${adaptation.type}: ${adaptation.recommendation}`);
        });
    }
    
    /**
     * Get adaptive recommendations for a site
     */
    getAdaptiveRecommendations(siteName) {
        const profile = this.siteProfiles.get(siteName);
        const adaptations = this.adaptiveTactics.get(siteName) || [];
        
        if (!profile) {
            return {
                stealthLevel: 'high',
                recommendations: []
            };
        }
        
        return {
            stealthLevel: profile.adaptiveTactics.optimalStealthLevel,
            avgResponseTime: profile.adaptiveTactics.avgResponseTime,
            preferredSuccessDetection: profile.adaptiveTactics.preferredSuccessDetection,
            successRate: profile.successRate,
            recommendations: adaptations
        };
    }
    
    /**
     * Enhanced success detection using learned patterns
     */
    async detectSuccess(page, siteName, responseData) {
        const recommendations = this.getAdaptiveRecommendations(siteName);
        const profile = this.siteProfiles.get(siteName);
        
        console.log(`🧠 Using adaptive success detection for ${siteName}...`);
        
        // Standard checks
        const content = await page.content();
        const currentUrl = page.url();
        
        // HTML-based success indicators
        const htmlSuccess = content.includes('success') || 
                           content.includes('welcome') || 
                           content.includes('verify') ||
                           content.includes('confirmation') ||
                           content.includes('thank you') ||
                           currentUrl.includes('success') ||
                           currentUrl.includes('welcome');
        
        // JSON response detection
        let jsonSuccess = false;
        try {
            if (content.includes('{') && content.includes('}')) {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonData = JSON.parse(jsonMatch[0]);
                    jsonSuccess = jsonData.success === true || 
                                 jsonData.status === 'success' ||
                                 jsonData.error === false ||
                                 (jsonData.form && Object.keys(jsonData.form).length > 0);
                }
            }
        } catch (error) {
            // Not valid JSON
        }
        
        // Status code checking  
        let statusSuccess = false;
        try {
            // Get the last response
            const response = await page.evaluate(() => {
                return {
                    status: window.performance?.getEntriesByType?.('navigation')?.[0]?.responseEnd ? 200 : null,
                    ok: !document.body.textContent.includes('error')
                };
            });
            statusSuccess = response.status === 200 || response.ok;
        } catch (error) {
            // Fallback: assume success if no errors in content
            statusSuccess = !content.includes('error') && !content.includes('404');
        }
        
        // URL change detection
        const urlChanged = currentUrl !== responseData.originalUrl;
        
        // Learned pattern matching
        let patternSuccess = false;
        if (profile && profile.successPatterns.length > 0) {
            const contentKeywords = this.extractContentKeywords(content);
            patternSuccess = profile.successPatterns.some(pattern => {
                return pattern.contentKeywords.some(keyword => contentKeywords.includes(keyword));
            });
        }
        
        // Adaptive decision making
        let success = false;
        let confidence = 0;
        let method = '';
        
        if (recommendations.preferredSuccessDetection === 'json' && jsonSuccess) {
            success = true;
            confidence = 0.9;
            method = 'adaptive_json';
        } else if (htmlSuccess) {
            success = true;
            confidence = 0.8;
            method = 'html_indicators';
        } else if (statusSuccess && urlChanged) {
            success = true;
            confidence = 0.7;
            method = 'status_url_change';
        } else if (patternSuccess) {
            success = true;
            confidence = 0.6;
            method = 'learned_patterns';
        } else if (statusSuccess && !content.includes('error')) {
            success = true;
            confidence = 0.5;
            method = 'status_code_fallback';
        }
        
        console.log(`   🎯 Success detection: ${success} (${method}, confidence: ${confidence})`);
        
        return {
            success,
            confidence,
            method,
            indicators: {
                html: htmlSuccess,
                json: jsonSuccess,
                status: statusSuccess,
                urlChange: urlChanged,
                patterns: patternSuccess
            }
        };
    }
    
    /**
     * Get most common items from array
     */
    getMostCommon(array) {
        const frequency = {};
        array.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
        return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]);
    }
    
    /**
     * Cleanup old patterns to prevent memory bloat
     */
    cleanupPatterns() {
        if (this.successPatterns.length > this.options.maxPatterns) {
            this.successPatterns = this.successPatterns.slice(-this.options.maxPatterns);
        }
        
        if (this.failurePatterns.length > this.options.maxPatterns) {
            this.failurePatterns = this.failurePatterns.slice(-this.options.maxPatterns);
        }
    }
    
    /**
     * Get learning statistics
     */
    getStats() {
        const totalSites = this.siteProfiles.size;
        const avgSuccessRate = totalSites > 0 ? 
            Array.from(this.siteProfiles.values()).reduce((sum, profile) => sum + profile.successRate, 0) / totalSites : 0;
        
        return {
            ...this.learningStats,
            totalSites,
            avgSuccessRate: (avgSuccessRate * 100).toFixed(1) + '%',
            successPatterns: this.successPatterns.length,
            failurePatterns: this.failurePatterns.length,
            adaptiveTactics: this.adaptiveTactics.size
        };
    }
    
    /**
     * Export learned data for persistence
     */
    exportLearningData() {
        return {
            successPatterns: this.successPatterns,
            failurePatterns: this.failurePatterns,
            siteProfiles: Array.from(this.siteProfiles.entries()),
            adaptiveTactics: Array.from(this.adaptiveTactics.entries()),
            learningStats: this.learningStats
        };
    }
    
    /**
     * Import learned data from persistence
     */
    importLearningData(data) {
        if (data.successPatterns) this.successPatterns = data.successPatterns;
        if (data.failurePatterns) this.failurePatterns = data.failurePatterns;
        if (data.siteProfiles) this.siteProfiles = new Map(data.siteProfiles);
        if (data.adaptiveTactics) this.adaptiveTactics = new Map(data.adaptiveTactics);
        if (data.learningStats) this.learningStats = { ...this.learningStats, ...data.learningStats };
        
        console.log('🧠 Learning data imported successfully');
    }
}

module.exports = AdaptiveLearningEngine;