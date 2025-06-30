/**
 * Working Pattern Prioritizer
 * Prioritize survey sources based on successful patterns
 * Based on learning: "Need more surveys like the successful one"
 */

class WorkingPatternPrioritizer {
    constructor() {
        this.successPatterns = {
            // From successful attempt: SurveyPlanet homepage_form
            platforms: {
                'SurveyPlanet': { successCount: 1, totalAttempts: 1, score: 10 },
                'JotForm': { successCount: 0, totalAttempts: 1, score: 2 },
                'Typeform': { successCount: 0, totalAttempts: 1, score: 1 }
            },
            types: {
                'homepage_form': { successCount: 1, totalAttempts: 1, score: 10 },
                'survey_template': { successCount: 0, totalAttempts: 1, score: 2 },
                'template_gallery': { successCount: 0, totalAttempts: 1, score: 1 }
            },
            characteristics: {
                'simple_single_input': { successCount: 1, score: 8 },
                'fast_loading': { successCount: 1, score: 7 },
                'clear_submit_button': { successCount: 1, score: 9 },
                'url_change_success': { successCount: 1, score: 8 }
            }
        };
        
        this.knownWorkingSurveys = [
            {
                url: 'https://surveyplanet.com',
                platform: 'SurveyPlanet',
                type: 'homepage_form',
                confidence: 1.0,
                lastTested: new Date().toISOString(),
                characteristics: ['simple_single_input', 'fast_loading', 'clear_submit_button', 'url_change_success']
            }
        ];
    }

    /**
     * Generate prioritized survey list based on working patterns
     */
    generatePrioritizedSurveyList(options = {}) {
        const { maxSurveys = 10, includeExperimental = false } = options;
        
        console.log('🎯 Generating prioritized survey list based on working patterns...');
        
        const prioritizedList = [];
        
        // Priority 1: Known working surveys (highest confidence)
        console.log('   📊 Priority 1: Known working surveys');
        prioritizedList.push(...this.knownWorkingSurveys.map(survey => ({
            ...survey,
            priority: 1,
            reason: 'Previously successful'
        })));
        
        // Priority 2: Similar patterns to successful surveys
        console.log('   📊 Priority 2: Similar patterns to successful surveys');
        const similarPatterns = this.generateSimilarPatternSurveys();
        prioritizedList.push(...similarPatterns.map(survey => ({
            ...survey,
            priority: 2,
            reason: 'Similar to successful pattern'
        })));
        
        // Priority 3: High-scoring platforms with different types
        console.log('   📊 Priority 3: High-scoring platforms with different types');
        const platformVariations = this.generatePlatformVariations();
        prioritizedList.push(...platformVariations.map(survey => ({
            ...survey,
            priority: 3,
            reason: 'Same platform, different type'
        })));
        
        // Priority 4: Experimental surveys (if enabled)
        if (includeExperimental) {
            console.log('   📊 Priority 4: Experimental surveys');
            const experimental = this.generateExperimentalSurveys();
            prioritizedList.push(...experimental.map(survey => ({
                ...survey,
                priority: 4,
                reason: 'Experimental - untested'
            })));
        }
        
        // Remove duplicates and limit to maxSurveys
        const uniqueSurveys = this.removeDuplicates(prioritizedList);
        const finalList = uniqueSurveys.slice(0, maxSurveys);
        
        console.log(`📋 Generated ${finalList.length} prioritized surveys:`);
        finalList.forEach((survey, i) => {
            console.log(`   ${i + 1}. [P${survey.priority}] ${survey.platform} - ${survey.type} (${(survey.confidence * 100).toFixed(0)}%)`);
            console.log(`      ${survey.url}`);
            console.log(`      Reason: ${survey.reason}`);
        });
        
        return finalList;
    }

    /**
     * Generate surveys with similar patterns to successful ones
     */
    generateSimilarPatternSurveys() {
        const similar = [];
        
        // SurveyPlanet variations based on successful homepage_form pattern
        similar.push(
            {
                url: 'https://surveyplanet.com/discover',
                platform: 'SurveyPlanet',
                type: 'discovery_page',
                confidence: 0.8,
                characteristics: ['fast_loading', 'same_platform']
            },
            {
                url: 'https://surveyplanet.com/pricing',
                platform: 'SurveyPlanet',
                type: 'pricing_form',
                confidence: 0.6,
                characteristics: ['fast_loading', 'same_platform']
            }
        );
        
        // Other platforms with similar simple forms
        similar.push(
            {
                url: 'https://www.surveymonkey.com',
                platform: 'SurveyMonkey',
                type: 'homepage_form',
                confidence: 0.7,
                characteristics: ['simple_single_input', 'homepage_pattern']
            },
            {
                url: 'https://forms.google.com',
                platform: 'Google Forms',
                type: 'homepage_form',
                confidence: 0.6,
                characteristics: ['simple_form', 'google_reliability']
            }
        );
        
        return similar;
    }

    /**
     * Generate platform variations for successful platforms
     */
    generatePlatformVariations() {
        const variations = [];
        
        // SurveyPlanet variations (since it was successful)
        const surveyPlanetVariations = [
            '/templates',
            '/examples',
            '/public-surveys',
            '/features',
            '/contact'
        ];
        
        surveyPlanetVariations.forEach(path => {
            variations.push({
                url: `https://surveyplanet.com${path}`,
                platform: 'SurveyPlanet',
                type: `page_${path.replace('/', '').replace('-', '_')}`,
                confidence: 0.5,
                characteristics: ['same_platform', 'different_section']
            });
        });
        
        return variations;
    }

    /**
     * Generate experimental surveys for testing
     */
    generateExperimentalSurveys() {
        return [
            {
                url: 'https://www.questionpro.com',
                platform: 'QuestionPro',
                type: 'homepage_form',
                confidence: 0.4,
                characteristics: ['untested', 'survey_platform']
            },
            {
                url: 'https://www.formstack.com',
                platform: 'Formstack',
                type: 'homepage_form',
                confidence: 0.4,
                characteristics: ['untested', 'form_platform']
            },
            {
                url: 'https://www.123formbuilder.com',
                platform: '123FormBuilder',
                type: 'homepage_form',
                confidence: 0.3,
                characteristics: ['untested', 'form_builder']
            },
            {
                url: 'https://www.wufoo.com',
                platform: 'Wufoo',
                type: 'homepage_form',
                confidence: 0.4,
                characteristics: ['untested', 'simple_forms']
            }
        ];
    }

    /**
     * Remove duplicate URLs
     */
    removeDuplicates(surveys) {
        const seen = new Set();
        return surveys.filter(survey => {
            if (seen.has(survey.url)) {
                return false;
            }
            seen.add(survey.url);
            return true;
        });
    }

    /**
     * Update patterns based on new attempt results
     */
    updatePatternsFromResults(attemptResults) {
        console.log('📊 Updating patterns from attempt results...');
        
        attemptResults.attempts.forEach(attempt => {
            const platform = attempt.target.platform;
            const type = attempt.target.type;
            const wasSuccessful = attempt.phases.submission?.success === true;
            
            // Update platform patterns
            if (!this.successPatterns.platforms[platform]) {
                this.successPatterns.platforms[platform] = { successCount: 0, totalAttempts: 0, score: 5 };
            }
            
            this.successPatterns.platforms[platform].totalAttempts++;
            if (wasSuccessful) {
                this.successPatterns.platforms[platform].successCount++;
                this.successPatterns.platforms[platform].score = Math.min(10, this.successPatterns.platforms[platform].score + 2);
            } else {
                this.successPatterns.platforms[platform].score = Math.max(1, this.successPatterns.platforms[platform].score - 1);
            }
            
            // Update type patterns
            if (!this.successPatterns.types[type]) {
                this.successPatterns.types[type] = { successCount: 0, totalAttempts: 0, score: 5 };
            }
            
            this.successPatterns.types[type].totalAttempts++;
            if (wasSuccessful) {
                this.successPatterns.types[type].successCount++;
                this.successPatterns.types[type].score = Math.min(10, this.successPatterns.types[type].score + 2);
            } else {
                this.successPatterns.types[type].score = Math.max(1, this.successPatterns.types[type].score - 1);
            }
            
            // Add to known working surveys if successful
            if (wasSuccessful) {
                const existingIndex = this.knownWorkingSurveys.findIndex(s => s.url === attempt.target.url);
                if (existingIndex === -1) {
                    this.knownWorkingSurveys.push({
                        url: attempt.target.url,
                        platform: platform,
                        type: type,
                        confidence: 0.9,
                        lastTested: new Date().toISOString(),
                        characteristics: this.extractCharacteristics(attempt)
                    });
                } else {
                    // Update existing
                    this.knownWorkingSurveys[existingIndex].confidence = Math.min(1.0, this.knownWorkingSurveys[existingIndex].confidence + 0.1);
                    this.knownWorkingSurveys[existingIndex].lastTested = new Date().toISOString();
                }
            }
        });
        
        console.log('✅ Patterns updated successfully');
        this.printCurrentPatterns();
    }

    /**
     * Extract characteristics from successful attempt
     */
    extractCharacteristics(attempt) {
        const characteristics = [];
        
        // Loading characteristics
        if (attempt.phases.navigation?.loadTime < 3000) {
            characteristics.push('fast_loading');
        }
        
        // Form characteristics
        if (attempt.phases.formFilling?.questionsAttempted === 1) {
            characteristics.push('simple_single_input');
        }
        
        if (attempt.phases.formFilling?.successRate === '100.0') {
            characteristics.push('high_fill_success');
        }
        
        // Submission characteristics
        if (attempt.phases.submission?.submissionAnalysis?.urlChanged) {
            characteristics.push('url_change_success');
        }
        
        if (attempt.phases.submission?.submissionTime < 5000) {
            characteristics.push('fast_submission');
        }
        
        return characteristics;
    }

    /**
     * Print current pattern knowledge
     */
    printCurrentPatterns() {
        console.log('\n📊 CURRENT PATTERN KNOWLEDGE:');
        
        console.log('\n   🏢 Platform Scores:');
        Object.entries(this.successPatterns.platforms).forEach(([platform, data]) => {
            const successRate = data.totalAttempts > 0 ? (data.successCount / data.totalAttempts * 100).toFixed(1) : 0;
            console.log(`      ${platform}: ${data.score}/10 (${successRate}% success rate)`);
        });
        
        console.log('\n   📝 Type Scores:');
        Object.entries(this.successPatterns.types).forEach(([type, data]) => {
            const successRate = data.totalAttempts > 0 ? (data.successCount / data.totalAttempts * 100).toFixed(1) : 0;
            console.log(`      ${type}: ${data.score}/10 (${successRate}% success rate)`);
        });
        
        console.log(`\n   ✅ Known Working Surveys: ${this.knownWorkingSurveys.length}`);
        this.knownWorkingSurveys.forEach((survey, i) => {
            console.log(`      ${i + 1}. ${survey.platform} - ${survey.type} (${(survey.confidence * 100).toFixed(0)}%)`);
        });
    }

    /**
     * Get recommendations for improving success rate
     */
    getRecommendations() {
        const recommendations = [];
        
        // Platform recommendations
        const topPlatform = Object.entries(this.successPatterns.platforms)
            .sort(([,a], [,b]) => b.score - a.score)[0];
        
        if (topPlatform) {
            recommendations.push(`🏢 Focus on ${topPlatform[0]} platform (score: ${topPlatform[1].score}/10)`);
        }
        
        // Type recommendations
        const topType = Object.entries(this.successPatterns.types)
            .sort(([,a], [,b]) => b.score - a.score)[0];
        
        if (topType) {
            recommendations.push(`📝 Prioritize ${topType[0]} type surveys (score: ${topType[1].score}/10)`);
        }
        
        // Working survey recommendations
        if (this.knownWorkingSurveys.length > 0) {
            recommendations.push(`✅ Test variations of known working surveys first`);
        } else {
            recommendations.push(`⚠️ No proven working surveys - need to discover and validate reliable sources`);
        }
        
        return recommendations;
    }

    /**
     * Save patterns to file for persistence
     */
    savePatterns() {
        const patterns = {
            successPatterns: this.successPatterns,
            knownWorkingSurveys: this.knownWorkingSurveys,
            lastUpdated: new Date().toISOString()
        };
        
        const fs = require('fs');
        fs.writeFileSync('./working-patterns.json', JSON.stringify(patterns, null, 2));
        console.log('💾 Working patterns saved to working-patterns.json');
    }

    /**
     * Load patterns from file
     */
    loadPatterns() {
        try {
            const fs = require('fs');
            const patterns = JSON.parse(fs.readFileSync('./working-patterns.json', 'utf8'));
            
            this.successPatterns = patterns.successPatterns || this.successPatterns;
            this.knownWorkingSurveys = patterns.knownWorkingSurveys || this.knownWorkingSurveys;
            
            console.log('📂 Working patterns loaded from file');
        } catch (error) {
            console.log('⚠️ No existing patterns file found, using defaults');
        }
    }
}

module.exports = WorkingPatternPrioritizer;