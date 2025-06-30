#!/usr/bin/env node

/**
 * Test Adaptive Improvements
 * Validate the implemented adaptive improvements
 */

const { chromium } = require('playwright');
const AdaptiveQuestionDetector = require('./src/ai/adaptive-question-detector');
const URLHealthChecker = require('./src/utils/url-health-checker');
const WorkingPatternPrioritizer = require('./src/survey/working-pattern-prioritizer');
const PreciseFormFiller = require('./src/automation/precise-form-filler');

class AdaptiveImprovementTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            healthCheck: null,
            questionDetection: null,
            patternPrioritization: null,
            overallImprovement: null
        };
    }

    async initialize() {
        console.log('🚀 Initializing Adaptive Improvement Tester...');
        
        this.browser = await chromium.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        this.page = await context.newPage();
        this.page.setDefaultTimeout(20000);
    }

    /**
     * Test all adaptive improvements
     */
    async testAdaptiveImprovements() {
        console.log('🎯 Testing Adaptive Improvements...\n');

        // Test 1: URL Health Checking
        await this.testURLHealthChecking();

        // Test 2: Working Pattern Prioritization  
        await this.testWorkingPatternPrioritization();

        // Test 3: Enhanced Question Detection
        await this.testEnhancedQuestionDetection();

        // Test 4: End-to-End Improvement
        await this.testEndToEndImprovement();

        // Generate improvement report
        this.generateImprovementReport();
    }

    /**
     * Test 1: URL Health Checking
     */
    async testURLHealthChecking() {
        console.log('🏥 TEST 1: URL Health Checking');
        console.log('-'.repeat(40));

        try {
            const healthChecker = new URLHealthChecker(this.page);
            
            // Test URLs including some we know are problematic
            const testUrls = [
                'https://surveyplanet.com', // Known working
                'https://www.jotform.com/form/202052941568154/preview', // Known 404
                'https://www.typeform.com/templates/c/surveys/', // Known timeout
                'https://www.surveymonkey.com', // Unknown
                'https://forms.google.com' // Should work
            ];

            const healthResults = await healthChecker.checkURLsHealth(testUrls);
            
            this.results.healthCheck = {
                totalUrls: testUrls.length,
                healthyUrls: healthResults.healthy.length,
                unhealthyUrls: healthResults.unhealthy.length,
                healthRate: healthResults.summary.healthRate,
                report: healthChecker.generateHealthReport(healthResults)
            };

            console.log(`📊 Health Check Results:`);
            console.log(`   Total URLs tested: ${this.results.healthCheck.totalUrls}`);
            console.log(`   Healthy URLs: ${this.results.healthCheck.healthyUrls}`);
            console.log(`   Health rate: ${this.results.healthCheck.healthRate}%`);
            console.log(`   ✅ URL Health Checking: ${this.results.healthCheck.healthyUrls > 0 ? 'WORKING' : 'NEEDS IMPROVEMENT'}\n`);

        } catch (error) {
            console.log(`❌ Health checking test failed: ${error.message}\n`);
            this.results.healthCheck = { error: error.message };
        }
    }

    /**
     * Test 2: Working Pattern Prioritization
     */
    async testWorkingPatternPrioritization() {
        console.log('🎯 TEST 2: Working Pattern Prioritization');
        console.log('-'.repeat(40));

        try {
            const prioritizer = new WorkingPatternPrioritizer();
            
            // Load previous patterns if available
            prioritizer.loadPatterns();
            
            // Update with our 3-attempt results
            const fs = require('fs');
            if (fs.existsSync('./3-attempt-results.json')) {
                const attemptResults = JSON.parse(fs.readFileSync('./3-attempt-results.json', 'utf8'));
                prioritizer.updatePatternsFromResults(attemptResults);
            }
            
            // Generate prioritized list
            const prioritizedSurveys = prioritizer.generatePrioritizedSurveyList({
                maxSurveys: 8,
                includeExperimental: true
            });
            
            // Get recommendations
            const recommendations = prioritizer.getRecommendations();
            
            this.results.patternPrioritization = {
                prioritizedSurveys: prioritizedSurveys.length,
                topPriority: prioritizedSurveys[0] || null,
                recommendations: recommendations
            };

            console.log(`📊 Pattern Prioritization Results:`);
            console.log(`   Prioritized surveys generated: ${this.results.patternPrioritization.prioritizedSurveys}`);
            console.log(`   Top priority: ${this.results.patternPrioritization.topPriority?.platform || 'None'}`);
            console.log(`   Recommendations: ${recommendations.length}`);
            console.log(`   ✅ Pattern Prioritization: ${this.results.patternPrioritization.prioritizedSurveys > 0 ? 'WORKING' : 'NEEDS IMPROVEMENT'}\n`);

        } catch (error) {
            console.log(`❌ Pattern prioritization test failed: ${error.message}\n`);
            this.results.patternPrioritization = { error: error.message };
        }
    }

    /**
     * Test 3: Enhanced Question Detection
     */
    async testEnhancedQuestionDetection() {
        console.log('🔍 TEST 3: Enhanced Question Detection');
        console.log('-'.repeat(40));

        try {
            const testUrl = 'https://surveyplanet.com'; // Known working URL
            
            console.log(`Testing enhanced detection on: ${testUrl}`);
            await this.page.goto(testUrl, { waitUntil: 'networkidle', timeout: 25000 });
            
            const adaptiveDetector = new AdaptiveQuestionDetector(this.page);
            const detectionResults = await adaptiveDetector.detectQuestions();
            
            this.results.questionDetection = {
                questionsFound: detectionResults.questions.length,
                successfulStrategy: detectionResults.successfulStrategy,
                strategiesUsed: detectionResults.strategiesUsed.length,
                fallbacksAttempted: detectionResults.fallbacksAttempted
            };

            console.log(`📊 Enhanced Question Detection Results:`);
            console.log(`   Questions found: ${this.results.questionDetection.questionsFound}`);
            console.log(`   Successful strategy: ${this.results.questionDetection.successfulStrategy || 'None'}`);
            console.log(`   Strategies attempted: ${this.results.questionDetection.strategiesUsed}`);
            console.log(`   Fallbacks used: ${this.results.questionDetection.fallbacksAttempted}`);
            console.log(`   ✅ Enhanced Question Detection: ${this.results.questionDetection.questionsFound > 0 ? 'WORKING' : 'NEEDS IMPROVEMENT'}\n`);

        } catch (error) {
            console.log(`❌ Enhanced question detection test failed: ${error.message}\n`);
            this.results.questionDetection = { error: error.message };
        }
    }

    /**
     * Test 4: End-to-End Improvement
     */
    async testEndToEndImprovement() {
        console.log('🔄 TEST 4: End-to-End Improvement');
        console.log('-'.repeat(40));

        try {
            // Use the improvements together for a complete test
            console.log('🎯 Testing complete adaptive pipeline...');
            
            // Step 1: Get prioritized URLs
            const prioritizer = new WorkingPatternPrioritizer();
            prioritizer.loadPatterns();
            const prioritizedSurveys = prioritizer.generatePrioritizedSurveyList({ maxSurveys: 3 });
            
            if (prioritizedSurveys.length === 0) {
                throw new Error('No prioritized surveys available');
            }
            
            // Step 2: Health check the URLs
            const healthChecker = new URLHealthChecker(this.page);
            const healthResults = await healthChecker.checkURLsHealth(prioritizedSurveys);
            
            if (healthResults.healthy.length === 0) {
                throw new Error('No healthy URLs found');
            }
            
            // Step 3: Test enhanced detection on best URL
            const bestUrl = healthResults.healthy[0];
            console.log(`📄 Testing on best URL: ${bestUrl.url}`);
            
            await this.page.goto(bestUrl.url, { waitUntil: 'networkidle', timeout: 25000 });
            
            const adaptiveDetector = new AdaptiveQuestionDetector(this.page);
            const detectionResults = await adaptiveDetector.detectQuestions();
            
            // Step 4: Test form filling if questions found
            let fillResults = null;
            if (detectionResults.questions.length > 0) {
                const filler = new PreciseFormFiller(this.page, { humanTyping: false, fillDelay: 300 });
                fillResults = await filler.fillSurveyForm(detectionResults.questions);
            }
            
            this.results.overallImprovement = {
                prioritizedSurveys: prioritizedSurveys.length,
                healthyUrls: healthResults.healthy.length,
                questionsDetected: detectionResults.questions.length,
                questionsFilled: fillResults?.filledQuestions || 0,
                successfulStrategy: detectionResults.successfulStrategy,
                complete: fillResults?.filledQuestions > 0
            };

            console.log(`📊 End-to-End Improvement Results:`);
            console.log(`   Prioritized surveys: ${this.results.overallImprovement.prioritizedSurveys}`);
            console.log(`   Healthy URLs: ${this.results.overallImprovement.healthyUrls}`);
            console.log(`   Questions detected: ${this.results.overallImprovement.questionsDetected}`);
            console.log(`   Questions filled: ${this.results.overallImprovement.questionsFilled}`);
            console.log(`   Pipeline success: ${this.results.overallImprovement.complete ? 'YES' : 'NO'}`);
            console.log(`   ✅ End-to-End: ${this.results.overallImprovement.complete ? 'WORKING' : 'NEEDS IMPROVEMENT'}\n`);

        } catch (error) {
            console.log(`❌ End-to-end test failed: ${error.message}\n`);
            this.results.overallImprovement = { error: error.message };
        }
    }

    /**
     * Generate comprehensive improvement report
     */
    generateImprovementReport() {
        console.log('📊 ADAPTIVE IMPROVEMENT REPORT');
        console.log('='.repeat(60));
        
        // Calculate overall improvement score
        let improvementScore = 0;
        let maxScore = 4;
        
        // URL Health Checking (0-1 points)
        if (this.results.healthCheck && !this.results.healthCheck.error && this.results.healthCheck.healthyUrls > 0) {
            improvementScore += 1;
            console.log('✅ URL Health Checking: IMPLEMENTED & WORKING');
        } else {
            console.log('❌ URL Health Checking: FAILED OR NOT WORKING');
        }
        
        // Pattern Prioritization (0-1 points)
        if (this.results.patternPrioritization && !this.results.patternPrioritization.error && this.results.patternPrioritization.prioritizedSurveys > 0) {
            improvementScore += 1;
            console.log('✅ Working Pattern Prioritization: IMPLEMENTED & WORKING');
        } else {
            console.log('❌ Working Pattern Prioritization: FAILED OR NOT WORKING');
        }
        
        // Enhanced Question Detection (0-1 points)
        if (this.results.questionDetection && !this.results.questionDetection.error && this.results.questionDetection.questionsFound > 0) {
            improvementScore += 1;
            console.log('✅ Enhanced Question Detection: IMPLEMENTED & WORKING');
        } else {
            console.log('❌ Enhanced Question Detection: FAILED OR NOT WORKING');
        }
        
        // End-to-End Pipeline (0-1 points)
        if (this.results.overallImprovement && !this.results.overallImprovement.error && this.results.overallImprovement.complete) {
            improvementScore += 1;
            console.log('✅ End-to-End Pipeline: IMPLEMENTED & WORKING');
        } else {
            console.log('❌ End-to-End Pipeline: FAILED OR NOT WORKING');
        }
        
        // Overall assessment
        const improvementPercentage = (improvementScore / maxScore * 100).toFixed(1);
        console.log(`\n📈 OVERALL IMPROVEMENT SCORE: ${improvementScore}/${maxScore} (${improvementPercentage}%)`);
        
        if (improvementScore === maxScore) {
            console.log('🏆 EXCELLENT: All adaptive improvements are working correctly!');
        } else if (improvementScore >= 3) {
            console.log('✅ GOOD: Most adaptive improvements are working, minor issues to address');
        } else if (improvementScore >= 2) {
            console.log('⚠️ MODERATE: Some improvements working, significant issues remain');
        } else {
            console.log('❌ POOR: Major issues with adaptive improvements, requires attention');
        }
        
        // Detailed metrics
        console.log('\n📊 DETAILED METRICS:');
        if (this.results.healthCheck) {
            console.log(`   Health Check Rate: ${this.results.healthCheck.healthRate || 0}%`);
        }
        if (this.results.questionDetection) {
            console.log(`   Questions Detected: ${this.results.questionDetection.questionsFound || 0}`);
        }
        if (this.results.overallImprovement) {
            console.log(`   End-to-End Success: ${this.results.overallImprovement.complete ? 'YES' : 'NO'}`);
        }
        
        // Improvement recommendations
        console.log('\n💡 IMPROVEMENT RECOMMENDATIONS:');
        if (improvementScore < maxScore) {
            if (!this.results.healthCheck || this.results.healthCheck.error) {
                console.log('   🔧 Fix URL health checking implementation');
            }
            if (!this.results.questionDetection || this.results.questionDetection.questionsFound === 0) {
                console.log('   🔧 Enhance question detection strategies');
            }
            if (!this.results.overallImprovement || !this.results.overallImprovement.complete) {
                console.log('   🔧 Debug end-to-end pipeline integration');
            }
        } else {
            console.log('   🎯 All improvements working - focus on scaling and optimization');
        }
        
        // Save results
        const fs = require('fs');
        fs.writeFileSync('./adaptive-improvement-results.json', JSON.stringify(this.results, null, 2));
        console.log('\n💾 Results saved to adaptive-improvement-results.json');
        
        return {
            score: improvementScore,
            maxScore: maxScore,
            percentage: improvementPercentage,
            results: this.results
        };
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const tester = new AdaptiveImprovementTester();
    
    try {
        await tester.initialize();
        await tester.testAdaptiveImprovements();
        
    } catch (error) {
        console.error('❌ Adaptive improvement testing failed:', error);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdaptiveImprovementTester;