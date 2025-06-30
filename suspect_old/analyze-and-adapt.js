#!/usr/bin/env node

/**
 * Analyze and Adapt
 * Analyze the 3 attempt results and implement adaptive improvements
 */

const fs = require('fs');

class PatternAnalyzer {
    constructor() {
        this.results = null;
        this.patterns = {
            navigation: { successes: [], failures: [] },
            discovery: { successes: [], failures: [] },
            formFilling: { successes: [], failures: [] },
            submission: { successes: [], failures: [] }
        };
        this.adaptations = [];
    }

    /**
     * Load and analyze the 3 attempt results
     */
    analyzeResults() {
        console.log('🔍 ANALYZING 3-ATTEMPT RESULTS FOR PATTERNS...\n');
        
        try {
            this.results = JSON.parse(fs.readFileSync('./3-attempt-results.json', 'utf8'));
        } catch (error) {
            console.log('❌ Could not load results file:', error.message);
            return;
        }

        // Analyze each category
        this.analyzeNavigationPatterns();
        this.analyzeDiscoveryPatterns();
        this.analyzeFormFillingPatterns();
        this.analyzeSubmissionPatterns();
        
        // Generate adaptive improvements
        this.generateAdaptiveImprovements();
        
        // Print analysis
        this.printAnalysis();
    }

    /**
     * Analyze navigation patterns
     */
    analyzeNavigationPatterns() {
        console.log('📍 Analyzing Navigation Patterns...');
        
        this.results.attempts.forEach((attempt, i) => {
            const nav = attempt.phases.navigation;
            if (nav?.success) {
                this.patterns.navigation.successes.push({
                    attempt: i + 1,
                    platform: attempt.target.platform,
                    httpStatus: nav.httpStatus,
                    loadTime: nav.loadTime,
                    hasContent: nav.pageAnalysis?.inputCount > 0
                });
            } else {
                this.patterns.navigation.failures.push({
                    attempt: i + 1,
                    platform: attempt.target.platform,
                    error: nav?.error || 'Unknown error',
                    url: attempt.target.url
                });
            }
        });

        // Analyze success patterns
        const successfulPlatforms = this.patterns.navigation.successes.map(s => s.platform);
        const failedPlatforms = this.patterns.navigation.failures.map(f => f.platform);
        
        console.log(`   ✅ Successful platforms: ${successfulPlatforms.join(', ')}`);
        console.log(`   ❌ Failed platforms: ${failedPlatforms.join(', ')}`);
        
        // Identify patterns
        if (this.patterns.navigation.failures.some(f => f.error.includes('Timeout'))) {
            this.adaptations.push({
                category: 'navigation',
                priority: 'high',
                issue: 'Timeout issues on complex sites',
                solution: 'Implement progressive loading strategies and fallback URLs',
                implementation: 'navigation_timeout_handling'
            });
        }
        
        if (this.patterns.navigation.successes.some(s => s.httpStatus === 404)) {
            this.adaptations.push({
                category: 'navigation',
                priority: 'medium',
                issue: '404 pages still loading but no content',
                solution: 'Add pre-flight checks for URL validity',
                implementation: 'url_validation'
            });
        }
    }

    /**
     * Analyze discovery patterns
     */
    analyzeDiscoveryPatterns() {
        console.log('🔍 Analyzing Discovery Patterns...');
        
        // Check if we're using good survey sources
        const workingSurvey = this.results.attempts.find(a => 
            a.phases.formFilling?.success && a.phases.submission?.success
        );
        
        if (workingSurvey) {
            console.log(`   ✅ Working survey found: ${workingSurvey.target.platform} (${workingSurvey.target.type})`);
            
            this.adaptations.push({
                category: 'discovery',
                priority: 'high',
                issue: 'Need more surveys like the successful one',
                solution: `Prioritize ${workingSurvey.target.type} type surveys from ${workingSurvey.target.platform}`,
                implementation: 'prioritize_working_patterns'
            });
        }
        
        // Check for dead/invalid URLs
        const deadUrls = this.results.attempts.filter(a => 
            a.phases.navigation?.httpStatus === 404 || 
            a.phases.navigation?.error?.includes('Timeout')
        );
        
        if (deadUrls.length > 0) {
            this.adaptations.push({
                category: 'discovery',
                priority: 'medium',
                issue: `${deadUrls.length}/3 URLs were invalid or inaccessible`,
                solution: 'Implement URL health checking before attempting surveys',
                implementation: 'url_health_checker'
            });
        }
    }

    /**
     * Analyze form filling patterns
     */
    analyzeFormFillingPatterns() {
        console.log('📝 Analyzing Form Filling Patterns...');
        
        const fillAttempts = this.results.attempts.filter(a => a.phases.formFilling);
        
        fillAttempts.forEach((attempt, i) => {
            const filling = attempt.phases.formFilling;
            if (filling.success) {
                this.patterns.formFilling.successes.push({
                    attempt: attempt.id,
                    platform: attempt.target.platform,
                    successRate: parseFloat(filling.successRate),
                    questionsAttempted: filling.questionsAttempted,
                    fillTime: filling.fillTime
                });
            } else {
                this.patterns.formFilling.failures.push({
                    attempt: attempt.id,
                    platform: attempt.target.platform,
                    error: filling.error
                });
            }
        });

        // Analyze success patterns
        const avgSuccessRate = this.patterns.formFilling.successes.length > 0 ?
            this.patterns.formFilling.successes.reduce((sum, s) => sum + s.successRate, 0) / this.patterns.formFilling.successes.length : 0;
        
        console.log(`   📊 Average success rate: ${avgSuccessRate.toFixed(1)}%`);
        
        if (avgSuccessRate === 100) {
            console.log('   🏆 Perfect form filling when questions are available');
            this.adaptations.push({
                category: 'formFilling',
                priority: 'low',
                issue: 'Form filling is working perfectly',
                solution: 'Maintain current approach, focus on question discovery',
                implementation: 'maintain_current_approach'
            });
        }
        
        // Check for "no questions" failures
        const noQuestionFailures = this.patterns.formFilling.failures.filter(f => 
            f.error.includes('No questions available')
        );
        
        if (noQuestionFailures.length > 0) {
            this.adaptations.push({
                category: 'formFilling',
                priority: 'high',
                issue: 'Multiple attempts failed due to no questions detected',
                solution: 'Improve question detection algorithms and add fallback strategies',
                implementation: 'enhanced_question_detection'
            });
        }
    }

    /**
     * Analyze submission patterns
     */
    analyzeSubmissionPatterns() {
        console.log('🚀 Analyzing Submission Patterns...');
        
        const submissionAttempts = this.results.attempts.filter(a => a.phases.submission);
        
        submissionAttempts.forEach(attempt => {
            const submission = attempt.phases.submission;
            if (submission.success) {
                this.patterns.submission.successes.push({
                    attempt: attempt.id,
                    platform: attempt.target.platform,
                    indicator: submission.submissionAnalysis?.indicator,
                    urlChanged: submission.submissionAnalysis?.urlChanged,
                    submissionTime: submission.submissionTime
                });
            } else {
                this.patterns.submission.failures.push({
                    attempt: attempt.id,
                    platform: attempt.target.platform,
                    error: submission.error
                });
            }
        });

        // Analyze success indicators
        const successfulIndicators = this.patterns.submission.successes.map(s => s.indicator);
        console.log(`   ✅ Successful indicators: ${successfulIndicators.join(', ')}`);
        
        if (successfulIndicators.includes('URL changed without errors')) {
            this.adaptations.push({
                category: 'submission',
                priority: 'medium',
                issue: 'URL change is a good success indicator',
                solution: 'Prioritize URL change detection in success analysis',
                implementation: 'enhanced_success_detection'
            });
        }
    }

    /**
     * Generate adaptive improvements based on patterns
     */
    generateAdaptiveImprovements() {
        console.log('\n🔧 GENERATING ADAPTIVE IMPROVEMENTS...\n');
        
        // Sort adaptations by priority
        this.adaptations.sort((a, b) => {
            const priorities = { high: 3, medium: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority];
        });
        
        // Group by category
        const groupedAdaptations = {};
        this.adaptations.forEach(adaptation => {
            if (!groupedAdaptations[adaptation.category]) {
                groupedAdaptations[adaptation.category] = [];
            }
            groupedAdaptations[adaptation.category].push(adaptation);
        });
        
        this.groupedAdaptations = groupedAdaptations;
    }

    /**
     * Print comprehensive analysis
     */
    printAnalysis() {
        console.log('\n📊 COMPREHENSIVE PATTERN ANALYSIS');
        console.log('=' .repeat(60));
        
        // Summary statistics
        console.log('\n📈 SUMMARY STATISTICS:');
        console.log(`   Total Attempts: ${this.results.attempts.length}`);
        console.log(`   Navigation Success: ${this.results.totalNavigation}/${this.results.attempts.length} (${(this.results.totalNavigation/this.results.attempts.length*100).toFixed(1)}%)`);
        console.log(`   Questions Detected: ${this.results.totalQuestions}`);
        console.log(`   Questions Filled: ${this.results.totalFills}/${this.results.totalQuestions} (${this.results.totalQuestions > 0 ? (this.results.totalFills/this.results.totalQuestions*100).toFixed(1) : 0}%)`);
        console.log(`   Successful Submissions: ${this.results.totalSubmissions}/${this.results.attempts.length} (${(this.results.totalSubmissions/this.results.attempts.length*100).toFixed(1)}%)`);
        
        // Pattern breakdown
        console.log('\n🔍 PATTERN BREAKDOWN:');
        Object.entries(this.patterns).forEach(([category, pattern]) => {
            console.log(`\n   ${category.toUpperCase()}:`);
            console.log(`      Successes: ${pattern.successes.length}`);
            console.log(`      Failures: ${pattern.failures.length}`);
        });
        
        // Adaptive improvements
        console.log('\n🔧 ADAPTIVE IMPROVEMENTS (Priority Order):');
        Object.entries(this.groupedAdaptations).forEach(([category, adaptations]) => {
            console.log(`\n   ${category.toUpperCase()}:`);
            adaptations.forEach((adaptation, i) => {
                console.log(`      ${i + 1}. [${adaptation.priority.toUpperCase()}] ${adaptation.issue}`);
                console.log(`         Solution: ${adaptation.solution}`);
                console.log(`         Implementation: ${adaptation.implementation}`);
            });
        });
        
        // Key insights
        this.generateKeyInsights();
    }

    /**
     * Generate key insights
     */
    generateKeyInsights() {
        console.log('\n💡 KEY INSIGHTS:');
        
        const insights = [];
        
        // Navigation insights
        if (this.patterns.navigation.failures.length > 0) {
            insights.push('🌐 Navigation reliability needs improvement - consider timeout handling and URL validation');
        }
        
        // Question detection insights
        if (this.results.totalQuestions < this.results.attempts.length) {
            insights.push('🔍 Question detection is the main bottleneck - many pages have no detectable questions');
        }
        
        // Form filling insights
        const fillSuccessRate = this.results.totalQuestions > 0 ? (this.results.totalFills / this.results.totalQuestions) : 0;
        if (fillSuccessRate === 1.0) {
            insights.push('📝 Form filling is perfect when questions are detected - focus should be on question discovery');
        }
        
        // Submission insights
        if (this.results.totalSubmissions > 0) {
            insights.push('🚀 Submission handling is working when forms are filled - URL change detection is effective');
        }
        
        // Overall insights
        const overallSuccessRate = this.results.totalSubmissions / this.results.attempts.length;
        if (overallSuccessRate < 0.5) {
            insights.push('⚠️ Overall success rate is below 50% - need better survey source discovery and question detection');
        }
        
        insights.forEach((insight, i) => {
            console.log(`   ${i + 1}. ${insight}`);
        });
        
        // Next steps recommendation
        console.log('\n🎯 RECOMMENDED NEXT STEPS:');
        console.log('   1. Implement URL health checking before attempting surveys');
        console.log('   2. Enhance question detection for complex pages with dynamic content');
        console.log('   3. Add progressive loading strategies for slow-loading sites');
        console.log('   4. Build a curated list of working survey URLs based on successful patterns');
        console.log('   5. Implement fallback question detection methods for edge cases');
    }

    /**
     * Save analysis results
     */
    saveAnalysis() {
        const analysisResults = {
            timestamp: new Date().toISOString(),
            patterns: this.patterns,
            adaptations: this.adaptations,
            groupedAdaptations: this.groupedAdaptations,
            metadata: {
                totalAttempts: this.results.attempts.length,
                successRate: this.results.totalSubmissions / this.results.attempts.length,
                keyBottleneck: this.results.totalQuestions < this.results.attempts.length ? 'question_detection' : 'other'
            }
        };
        
        fs.writeFileSync('./pattern-analysis-results.json', JSON.stringify(analysisResults, null, 2));
        console.log('\n💾 Pattern analysis saved to pattern-analysis-results.json');
        
        return analysisResults;
    }
}

async function main() {
    const analyzer = new PatternAnalyzer();
    
    try {
        analyzer.analyzeResults();
        const results = analyzer.saveAnalysis();
        
        return results;
        
    } catch (error) {
        console.error('❌ Pattern analysis failed:', error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PatternAnalyzer;