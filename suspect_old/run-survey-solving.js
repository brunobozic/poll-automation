#!/usr/bin/env node

/**
 * Survey Solving Execution System
 * Execute intelligent survey solving with adaptive learning and refinement
 */

const IntelligentSurveySolver = require('./src/survey/intelligent-survey-solver');

class SurveySolvingRunner {
    constructor() {
        this.solver = null;
        
        // Configuration for survey solving
        this.config = {
            responseQuality: 'high',
            humanLikeness: 0.9,
            consistencyLevel: 0.85,
            adaptationRate: 0.2,
            timeVariation: 0.25,
            contextAwareness: true,
            advancedNLP: true,
            behavioralModeling: true
        };
        
        // Test survey URLs for demonstration
        this.testSurveys = [
            'https://surveyplanet.com',           // Simple platform
            'https://www.surveymonkey.com',       // Complex platform  
            'https://www.typeform.com',           // Interactive forms
            'https://forms.google.com'            // Google forms
        ];
    }

    /**
     * Main execution function
     */
    async run() {
        console.log('🎯 STARTING INTELLIGENT SURVEY SOLVING SYSTEM');
        console.log('='.repeat(80));
        console.log('🧠 ADAPTIVE SURVEY SOLVING WITH AI INTELLIGENCE');
        console.log('='.repeat(80));
        console.log(`🎭 Human-likeness: ${(this.config.humanLikeness * 100).toFixed(1)}%`);
        console.log(`📊 Response Quality: ${this.config.responseQuality.toUpperCase()}`);
        console.log(`🔄 Adaptation Rate: ${(this.config.adaptationRate * 100).toFixed(1)}%`);
        console.log(`🧠 Context Awareness: ${this.config.contextAwareness ? 'ENABLED' : 'DISABLED'}`);
        console.log(`📚 Advanced NLP: ${this.config.advancedNLP ? 'ENABLED' : 'DISABLED'}`);
        console.log(`🎭 Behavioral Modeling: ${this.config.behavioralModeling ? 'ENABLED' : 'DISABLED'}`);
        console.log('='.repeat(80));

        try {
            // Initialize the intelligent survey solver
            console.log('\n🔧 INITIALIZING SURVEY SOLVING SYSTEM...');
            this.solver = new IntelligentSurveySolver(this.config);
            await this.solver.initialize();

            // Execute survey solving with adaptive learning
            console.log('\n🚀 EXECUTING ADAPTIVE SURVEY SOLVING...');
            const results = await this.solver.solveSurveysWithAdaptation(this.testSurveys);

            // Display comprehensive results
            this.displayResults(results);

            console.log('\n🎉 SURVEY SOLVING COMPLETE!');
            console.log('🌟 System has learned and adapted through solving experience');
            
        } catch (error) {
            console.error('\n💥 SURVEY SOLVING FAILED:', error);
            console.error('Stack trace:', error.stack);
            process.exit(1);
        } finally {
            if (this.solver) {
                await this.solver.cleanup();
            }
        }
    }

    /**
     * Display comprehensive solving results
     */
    displayResults(results) {
        console.log('\n📊 COMPREHENSIVE SURVEY SOLVING RESULTS');
        console.log('='.repeat(70));

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const totalQuestions = results.reduce((sum, r) => sum + r.questionsAnswered, 0);
        const avgTime = results.reduce((sum, r) => sum + r.completionTime, 0) / results.length;

        console.log(`📋 Surveys Attempted: ${results.length}`);
        console.log(`✅ Successfully Completed: ${successful.length}`);
        console.log(`❌ Failed: ${failed.length}`);
        console.log(`📈 Success Rate: ${(successful.length / results.length * 100).toFixed(1)}%`);
        console.log(`🤔 Total Questions Answered: ${totalQuestions}`);
        console.log(`⏱️ Average Completion Time: ${(avgTime / 1000).toFixed(1)} seconds`);
        console.log(`📊 Questions per Survey: ${(totalQuestions / successful.length || 0).toFixed(1)}`);

        // Detailed results per survey
        console.log('\n📋 DETAILED SURVEY RESULTS:');
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.url}`);
            console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
            console.log(`   Questions: ${result.questionsAnswered}`);
            console.log(`   Time: ${(result.completionTime / 1000).toFixed(1)}s`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        // Learning and adaptation summary
        if (successful.length > 1) {
            console.log('\n🧠 LEARNING & ADAPTATION ANALYSIS:');
            console.log(`🔄 Adaptation Cycles: ${results.length - 1}`);
            console.log(`📈 Performance Trend: ${this.calculatePerformanceTrend(results)}`);
            console.log(`🎯 Quality Improvement: ${this.calculateQualityImprovement(results)}`);
        }
    }

    /**
     * Calculate performance trend across surveys
     */
    calculatePerformanceTrend(results) {
        if (results.length < 2) return 'Insufficient data';
        
        const firstHalf = results.slice(0, Math.ceil(results.length / 2));
        const secondHalf = results.slice(Math.floor(results.length / 2));
        
        const firstSuccessRate = firstHalf.filter(r => r.success).length / firstHalf.length;
        const secondSuccessRate = secondHalf.filter(r => r.success).length / secondHalf.length;
        
        const improvement = ((secondSuccessRate - firstSuccessRate) * 100);
        
        if (improvement > 10) return `IMPROVING (+${improvement.toFixed(1)}%)`;
        if (improvement < -10) return `DECLINING (${improvement.toFixed(1)}%)`;
        return `STABLE (${improvement.toFixed(1)}%)`;
    }

    /**
     * Calculate quality improvement over time
     */
    calculateQualityImprovement(results) {
        if (results.length < 2) return 'Insufficient data';
        
        const firstAvgQuestions = results.slice(0, Math.ceil(results.length / 2))
            .reduce((sum, r) => sum + r.questionsAnswered, 0) / Math.ceil(results.length / 2);
        
        const secondAvgQuestions = results.slice(Math.floor(results.length / 2))
            .reduce((sum, r) => sum + r.questionsAnswered, 0) / Math.floor(results.length / 2);
        
        const improvement = ((secondAvgQuestions - firstAvgQuestions) / firstAvgQuestions * 100);
        
        if (improvement > 5) return `IMPROVING (+${improvement.toFixed(1)}% more questions)`;
        if (improvement < -5) return `DECLINING (${improvement.toFixed(1)}% fewer questions)`;
        return `CONSISTENT (${improvement.toFixed(1)}%)`;
    }

    /**
     * Interactive mode for custom survey URLs
     */
    async runInteractive() {
        console.log('\n🎮 INTERACTIVE SURVEY SOLVING MODE');
        console.log('Enter survey URLs to solve (press Enter on empty line to start):');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const customSurveys = [];
        
        const askForUrl = () => {
            rl.question('Survey URL: ', (url) => {
                if (url.trim() === '') {
                    rl.close();
                    if (customSurveys.length > 0) {
                        this.testSurveys = customSurveys;
                        this.run();
                    } else {
                        console.log('No URLs provided, using default test surveys...');
                        this.run();
                    }
                } else {
                    customSurveys.push(url.trim());
                    askForUrl();
                }
            });
        };
        
        askForUrl();
    }
}

// Execute based on command line arguments
if (require.main === module) {
    const runner = new SurveySolvingRunner();
    
    // Check if interactive mode requested
    if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
        runner.runInteractive();
    } else {
        runner.run()
            .then(() => process.exit(0))
            .catch(error => {
                console.error('Fatal error:', error);
                process.exit(1);
            });
    }
}

module.exports = SurveySolvingRunner;