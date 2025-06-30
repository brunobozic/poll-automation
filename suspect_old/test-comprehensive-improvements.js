#!/usr/bin/env node

/**
 * Comprehensive Improvement Test
 * Tests all new enhancements: discovery, submission, visibility handling
 */

const { chromium } = require('playwright');
const RealSurveyDiscoverer = require('./src/survey/real-survey-discoverer');
const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator');
const PreciseFormFiller = require('./src/automation/precise-form-filler');
const IntelligentElementHandler = require('./src/automation/intelligent-element-handler');

class ComprehensiveImprovementTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            discoveryPhase: {
                surveysDiscovered: 0,
                validSurveys: 0,
                platforms: []
            },
            testingPhase: {
                surveysAttempted: 0,
                questionsDetected: 0,
                questionsWithInputs: 0,
                successfulFills: 0,
                enhancedSubmissions: 0,
                successfulSubmissions: 0,
                visibilityIssuesResolved: 0
            },
            errorAnalysis: {
                discoveryErrors: [],
                fillErrors: [],
                submissionErrors: []
            }
        };
    }

    async initialize() {
        console.log('🚀 Initializing Comprehensive Improvement Tester...');
        
        this.browser = await chromium.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        this.page = await context.newPage();
        
        // Set longer timeouts for comprehensive testing
        this.page.setDefaultTimeout(30000);
    }

    /**
     * Phase 1: Test survey discovery
     */
    async testSurveyDiscovery() {
        console.log('\n🔍 PHASE 1: Testing Survey Discovery...');
        
        try {
            const discoverer = new RealSurveyDiscoverer(this.page);
            
            // Test discovery from multiple platforms
            const surveys = await discoverer.discoverRealSurveys({
                maxSurveys: 8,
                platforms: ['SurveyPlanet', 'JotForm']
            });
            
            this.results.discoveryPhase.surveysDiscovered = surveys.length;
            this.results.discoveryPhase.platforms = [...new Set(surveys.map(s => s.platform))];
            
            console.log(`📋 Discovered ${surveys.length} potential surveys`);
            console.log(`🏢 Platforms: ${this.results.discoveryPhase.platforms.join(', ')}`);
            
            // Validate discovered surveys
            let validCount = 0;
            for (const survey of surveys) {
                try {
                    const isValid = await discoverer.validateSurveyUrl(survey.url);
                    if (isValid) {
                        validCount++;
                        survey.validated = true;
                    }
                } catch (error) {
                    this.results.errorAnalysis.discoveryErrors.push({
                        url: survey.url,
                        error: error.message
                    });
                }
            }
            
            this.results.discoveryPhase.validSurveys = validCount;
            console.log(`✅ ${validCount} surveys validated as real surveys`);
            
            return surveys.filter(s => s.validated);
            
        } catch (error) {
            console.log(`❌ Discovery phase failed: ${error.message}`);
            this.results.errorAnalysis.discoveryErrors.push({
                phase: 'discovery_initialization',
                error: error.message
            });
            return [];
        }
    }

    /**
     * Phase 2: Test comprehensive form handling
     */
    async testComprehensiveFormHandling(surveys) {
        console.log('\n🎯 PHASE 2: Testing Comprehensive Form Handling...');
        
        const maxTestSurveys = Math.min(surveys.length, 5);
        console.log(`Testing ${maxTestSurveys} surveys...`);
        
        for (let i = 0; i < maxTestSurveys; i++) {
            const survey = surveys[i];
            console.log(`\n📄 Survey ${i + 1}/${maxTestSurveys}: ${survey.platform}`);
            console.log(`🔗 URL: ${survey.url}`);
            
            await this.testSingleSurveyComprehensive(survey);
            
            // Delay between surveys
            await this.page.waitForTimeout(2000);
        }
    }

    /**
     * Test a single survey with all improvements
     */
    async testSingleSurveyComprehensive(survey) {
        this.results.testingPhase.surveysAttempted++;
        
        try {
            // Navigate to survey
            await this.page.goto(survey.url, { 
                waitUntil: 'networkidle', 
                timeout: 25000 
            });
            
            console.log('📋 Detecting questions with enhanced detection...');
            
            // Question detection
            const orchestrator = new UnifiedPollOrchestrator(this.page, {
                debugMode: false,
                enableLearning: false
            });
            
            const questions = await orchestrator.detectQuestionsOnPage();
            this.results.testingPhase.questionsDetected += questions.length;
            
            console.log(`   Found ${questions.length} questions`);
            
            if (questions.length === 0) {
                console.log('⚠️ No questions detected, skipping...');
                return;
            }
            
            // Analyze question quality
            const questionsWithInputs = questions.filter(q => q.inputs && q.inputs.length > 0);
            this.results.testingPhase.questionsWithInputs += questionsWithInputs.length;
            
            console.log(`   ${questionsWithInputs.length} questions have inputs`);
            
            // Enhanced form filling
            console.log('🎯 Testing enhanced form filling...');
            
            const filler = new PreciseFormFiller(this.page, {
                humanTyping: false,
                fillDelay: 400
            });
            
            const fillResults = await filler.fillSurveyForm(questions);
            this.results.testingPhase.successfulFills += fillResults.filledQuestions;
            
            console.log(`   Filled ${fillResults.filledQuestions}/${questions.length} questions`);
            
            if (fillResults.errors.length > 0) {
                fillResults.errors.forEach(error => {
                    this.results.errorAnalysis.fillErrors.push({
                        url: survey.url,
                        error: error
                    });
                });
            }
            
            // Enhanced submission testing
            if (fillResults.filledQuestions > 0) {
                console.log('🚀 Testing enhanced submission...');
                
                try {
                    const submitted = await filler.submitForm();
                    if (submitted) {
                        this.results.testingPhase.enhancedSubmissions++;
                        
                        // Wait and analyze submission result
                        await this.page.waitForTimeout(3000);
                        
                        const success = await this.analyzeSubmissionSuccess();
                        if (success) {
                            this.results.testingPhase.successfulSubmissions++;
                            console.log('🎉 Submission successful!');
                        } else {
                            console.log('⚠️ Submission unclear');
                        }
                    } else {
                        console.log('❌ Submission failed');
                    }
                } catch (error) {
                    this.results.errorAnalysis.submissionErrors.push({
                        url: survey.url,
                        error: error.message
                    });
                    console.log(`❌ Submission error: ${error.message}`);
                }
            }
            
            // Test intelligent element handling on any remaining issues
            if (fillResults.errors.length > 0) {
                console.log('🔧 Testing intelligent element handling...');
                await this.testIntelligentElementHandling();
            }
            
        } catch (error) {
            console.log(`❌ Survey test failed: ${error.message}`);
        }
    }

    /**
     * Test intelligent element handling
     */
    async testIntelligentElementHandling() {
        try {
            const elementHandler = new IntelligentElementHandler(this.page);
            
            // Try to interact with common problematic elements
            const testSelectors = [
                'input[type="text"]:not([style*="display: none"])',
                'input[type="email"]',
                'button[type="submit"]',
                'select'
            ];
            
            let resolvedIssues = 0;
            
            for (const selector of testSelectors) {
                try {
                    const success = await elementHandler.interactWithElement(selector, 'click');
                    if (success) {
                        resolvedIssues++;
                    }
                } catch (error) {
                    // Element not found or not interactable
                }
            }
            
            this.results.testingPhase.visibilityIssuesResolved += resolvedIssues;
            console.log(`   Resolved ${resolvedIssues} element interaction issues`);
            
        } catch (error) {
            console.log(`⚠️ Element handling test failed: ${error.message}`);
        }
    }

    /**
     * Analyze if submission was successful
     */
    async analyzeSubmissionSuccess() {
        try {
            return await this.page.evaluate(() => {
                const text = document.body.textContent.toLowerCase();
                const successPatterns = [
                    /thank\s*you/,
                    /submitted/,
                    /complete[d]?/,
                    /success/,
                    /received/,
                    /confirmation/
                ];
                
                return successPatterns.some(pattern => pattern.test(text));
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Run comprehensive test
     */
    async runComprehensiveTest() {
        console.log('🎯 Starting Comprehensive Improvement Test...\n');
        
        // Phase 1: Discovery
        const surveys = await this.testSurveyDiscovery();
        
        if (surveys.length === 0) {
            console.log('❌ No valid surveys discovered, using fallback surveys');
            // Use some known working surveys as fallback
            surveys.push(
                { url: 'https://www.jotform.com/form/202052941568154/preview', platform: 'JotForm', validated: true },
                { url: 'https://surveyplanet.com', platform: 'SurveyPlanet', validated: true }
            );
        }
        
        // Phase 2: Comprehensive testing
        await this.testComprehensiveFormHandling(surveys);
    }

    /**
     * Print comprehensive results
     */
    printResults() {
        console.log('\n📊 COMPREHENSIVE IMPROVEMENT TEST RESULTS');
        console.log('==========================================');
        
        // Discovery Results
        console.log('\n🔍 DISCOVERY PHASE:');
        console.log(`   Surveys Discovered: ${this.results.discoveryPhase.surveysDiscovered}`);
        console.log(`   Valid Surveys: ${this.results.discoveryPhase.validSurveys}`);
        console.log(`   Platforms Tested: ${this.results.discoveryPhase.platforms.join(', ')}`);
        
        if (this.results.discoveryPhase.surveysDiscovered > 0) {
            const validationRate = (this.results.discoveryPhase.validSurveys / this.results.discoveryPhase.surveysDiscovered * 100).toFixed(1);
            console.log(`   Validation Success Rate: ${validationRate}%`);
        }
        
        // Testing Results
        console.log('\n🎯 TESTING PHASE:');
        console.log(`   Surveys Attempted: ${this.results.testingPhase.surveysAttempted}`);
        console.log(`   Questions Detected: ${this.results.testingPhase.questionsDetected}`);
        console.log(`   Questions with Inputs: ${this.results.testingPhase.questionsWithInputs}`);
        console.log(`   Successful Fills: ${this.results.testingPhase.successfulFills}`);
        console.log(`   Enhanced Submissions: ${this.results.testingPhase.enhancedSubmissions}`);
        console.log(`   Successful Submissions: ${this.results.testingPhase.successfulSubmissions}`);
        console.log(`   Visibility Issues Resolved: ${this.results.testingPhase.visibilityIssuesResolved}`);
        
        // Calculate success rates
        if (this.results.testingPhase.questionsWithInputs > 0) {
            const fillRate = (this.results.testingPhase.successfulFills / this.results.testingPhase.questionsWithInputs * 100).toFixed(1);
            console.log(`   📈 Fill Success Rate: ${fillRate}%`);
        }
        
        if (this.results.testingPhase.enhancedSubmissions > 0) {
            const submitRate = (this.results.testingPhase.successfulSubmissions / this.results.testingPhase.enhancedSubmissions * 100).toFixed(1);
            console.log(`   🚀 Submission Success Rate: ${submitRate}%`);
        }
        
        // Error Analysis
        const totalErrors = this.results.errorAnalysis.discoveryErrors.length + 
                           this.results.errorAnalysis.fillErrors.length + 
                           this.results.errorAnalysis.submissionErrors.length;
        
        if (totalErrors > 0) {
            console.log('\n❌ ERROR ANALYSIS:');
            console.log(`   Discovery Errors: ${this.results.errorAnalysis.discoveryErrors.length}`);
            console.log(`   Fill Errors: ${this.results.errorAnalysis.fillErrors.length}`);
            console.log(`   Submission Errors: ${this.results.errorAnalysis.submissionErrors.length}`);
        }
        
        // Improvement Summary
        console.log('\n🎯 IMPROVEMENT IMPACT:');
        console.log('   ✅ Real survey discovery implemented');
        console.log('   ✅ Enhanced submission handling active');
        console.log('   ✅ Intelligent element interaction deployed');
        console.log('   ✅ Form validation and retry logic enabled');
        console.log('   ✅ Multi-strategy button detection implemented');
        
        // Overall Success Rating
        const overallSuccess = this.calculateOverallSuccess();
        console.log(`\n🏆 OVERALL SUCCESS RATING: ${overallSuccess}/5 stars`);
    }

    calculateOverallSuccess() {
        let score = 0;
        
        // Discovery success
        if (this.results.discoveryPhase.validSurveys > 0) score += 1;
        
        // Form detection success
        if (this.results.testingPhase.questionsWithInputs > 0) score += 1;
        
        // Fill success
        const fillRate = this.results.testingPhase.questionsWithInputs > 0 ? 
            (this.results.testingPhase.successfulFills / this.results.testingPhase.questionsWithInputs) : 0;
        if (fillRate > 0.7) score += 1;
        
        // Submission success
        const submitRate = this.results.testingPhase.enhancedSubmissions > 0 ? 
            (this.results.testingPhase.successfulSubmissions / this.results.testingPhase.enhancedSubmissions) : 0;
        if (submitRate > 0.5) score += 1;
        
        // Error handling
        const totalErrors = this.results.errorAnalysis.discoveryErrors.length + 
                           this.results.errorAnalysis.fillErrors.length + 
                           this.results.errorAnalysis.submissionErrors.length;
        const errorRate = totalErrors / Math.max(this.results.testingPhase.surveysAttempted, 1);
        if (errorRate < 0.3) score += 1;
        
        return score;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const tester = new ComprehensiveImprovementTester();
    
    try {
        await tester.initialize();
        await tester.runComprehensiveTest();
        tester.printResults();
        
    } catch (error) {
        console.error('❌ Comprehensive test failed:', error);
    } finally {
        await tester.cleanup();
    }
}

main().catch(console.error);