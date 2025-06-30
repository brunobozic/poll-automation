#!/usr/bin/env node

/**
 * Execute 3 Survey Attempts
 * Run 3 detailed survey filling attempts with comprehensive logging
 */

const { chromium } = require('playwright');
const RealSurveyDiscoverer = require('./src/survey/real-survey-discoverer');
const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator');
const PreciseFormFiller = require('./src/automation/precise-form-filler');
const EnhancedSubmissionHandler = require('./src/automation/enhanced-submission-handler');

class SurveyAttemptExecutor {
    constructor() {
        this.browser = null;
        this.page = null;
        this.attempts = [];
        this.currentAttempt = 0;
    }

    async initialize() {
        console.log('🚀 Initializing Survey Attempt Executor...');
        
        this.browser = await chromium.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        this.page = await context.newPage();
        this.page.setDefaultTimeout(30000);
        
        // Listen for all page events for comprehensive logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.logToAttempt('browser_error', msg.text());
            }
        });
        
        this.page.on('response', response => {
            if (response.status() >= 400) {
                this.logToAttempt('http_error', `${response.status()} ${response.url()}`);
            }
        });
    }

    /**
     * Execute 3 comprehensive survey attempts
     */
    async execute3Attempts() {
        console.log('🎯 Starting 3 Survey Filling Attempts...\n');

        // Get a diverse set of survey targets
        const surveyTargets = await this.getSurveyTargets();
        
        for (let i = 0; i < 3; i++) {
            this.currentAttempt = i + 1;
            console.log(`\n🔄 ATTEMPT ${this.currentAttempt}/3`);
            console.log('=' .repeat(50));
            
            // Initialize attempt tracking
            const attempt = {
                id: this.currentAttempt,
                timestamp: new Date().toISOString(),
                target: surveyTargets[i % surveyTargets.length],
                phases: {},
                metrics: {},
                errors: [],
                successes: [],
                learnings: []
            };
            
            this.attempts.push(attempt);
            
            await this.executeSingleAttempt(attempt);
            
            // Brief pause between attempts
            await this.page.waitForTimeout(2000);
        }
        
        return this.attempts;
    }

    /**
     * Get diverse survey targets for testing
     */
    async getSurveyTargets() {
        const targets = [
            {
                url: 'https://www.jotform.com/form/202052941568154/preview',
                platform: 'JotForm',
                type: 'survey_template',
                expectedComplexity: 'medium'
            },
            {
                url: 'https://surveyplanet.com',
                platform: 'SurveyPlanet',
                type: 'homepage_form',
                expectedComplexity: 'low'
            },
            {
                url: 'https://www.typeform.com/templates/c/surveys/',
                platform: 'Typeform',
                type: 'template_gallery',
                expectedComplexity: 'high'
            }
        ];
        
        // Try to discover additional real surveys
        try {
            const discoverer = new RealSurveyDiscoverer(this.page);
            const discovered = await discoverer.discoverRealSurveys({ maxSurveys: 2 });
            
            discovered.forEach(survey => {
                targets.push({
                    url: survey.url,
                    platform: survey.platform,
                    type: 'discovered',
                    expectedComplexity: 'unknown'
                });
            });
        } catch (error) {
            this.logToAttempt('discovery_error', error.message);
        }
        
        return targets;
    }

    /**
     * Execute a single comprehensive attempt
     */
    async executeSingleAttempt(attempt) {
        const startTime = Date.now();
        
        try {
            console.log(`📄 Target: ${attempt.target.platform} - ${attempt.target.url}`);
            console.log(`🎯 Expected Complexity: ${attempt.target.expectedComplexity}`);
            
            // Phase 1: Navigation and Page Analysis
            await this.executePhase1_Navigation(attempt);
            
            // Phase 2: Question Detection and Analysis
            await this.executePhase2_QuestionDetection(attempt);
            
            // Phase 3: Form Filling with Detailed Tracking
            await this.executePhase3_FormFilling(attempt);
            
            // Phase 4: Submission and Result Analysis
            await this.executePhase4_Submission(attempt);
            
            // Phase 5: Success Analysis and Learning Extraction
            await this.executePhase5_LearningExtraction(attempt);
            
        } catch (error) {
            this.logToAttempt('attempt_fatal_error', error.message);
            console.log(`❌ ATTEMPT ${this.currentAttempt} FAILED: ${error.message}`);
        } finally {
            attempt.metrics.totalDuration = Date.now() - startTime;
            console.log(`⏱️ Attempt completed in ${attempt.metrics.totalDuration}ms`);
        }
    }

    /**
     * Phase 1: Navigation and Page Analysis
     */
    async executePhase1_Navigation(attempt) {
        console.log('\n📍 Phase 1: Navigation and Page Analysis');
        const phaseStart = Date.now();
        
        try {
            // Navigate to target
            const response = await this.page.goto(attempt.target.url, { 
                waitUntil: 'networkidle', 
                timeout: 30000 
            });
            
            attempt.phases.navigation = {
                success: true,
                httpStatus: response.status(),
                finalUrl: this.page.url(),
                pageTitle: await this.page.title(),
                loadTime: Date.now() - phaseStart
            };
            
            console.log(`   ✅ Loaded: ${attempt.phases.navigation.pageTitle}`);
            console.log(`   🔗 Final URL: ${attempt.phases.navigation.finalUrl}`);
            console.log(`   📊 HTTP Status: ${attempt.phases.navigation.httpStatus}`);
            
            // Analyze page characteristics
            const pageAnalysis = await this.page.evaluate(() => {
                return {
                    hasForm: document.querySelectorAll('form').length > 0,
                    inputCount: document.querySelectorAll('input, select, textarea').length,
                    visibleInputCount: Array.from(document.querySelectorAll('input, select, textarea')).filter(el => el.offsetWidth > 0).length,
                    hasRadioButtons: document.querySelectorAll('input[type="radio"]').length > 0,
                    hasCheckboxes: document.querySelectorAll('input[type="checkbox"]').length > 0,
                    hasDropdowns: document.querySelectorAll('select').length > 0,
                    pageTextLength: document.body.textContent.length,
                    hasSubmitButton: document.querySelectorAll('button[type="submit"], input[type="submit"]').length > 0
                };
            });
            
            attempt.phases.navigation.pageAnalysis = pageAnalysis;
            console.log(`   📋 Page Analysis: ${pageAnalysis.inputCount} inputs (${pageAnalysis.visibleInputCount} visible)`);
            
            this.logToAttempt('navigation_success', `Loaded ${attempt.target.platform} successfully`);
            
        } catch (error) {
            attempt.phases.navigation = { success: false, error: error.message };
            this.logToAttempt('navigation_error', error.message);
            throw error;
        }
    }

    /**
     * Phase 2: Question Detection and Analysis
     */
    async executePhase2_QuestionDetection(attempt) {
        console.log('\n🔍 Phase 2: Question Detection and Analysis');
        const phaseStart = Date.now();
        
        try {
            const orchestrator = new UnifiedPollOrchestrator(this.page, {
                debugMode: true,
                enableLearning: false
            });
            
            const questions = await orchestrator.detectQuestionsOnPage();
            
            attempt.phases.questionDetection = {
                success: true,
                questionsFound: questions.length,
                questionsWithInputs: questions.filter(q => q.inputs && q.inputs.length > 0).length,
                detectionTime: Date.now() - phaseStart,
                questions: questions.map(q => ({
                    text: q.text?.substring(0, 100),
                    type: q.type,
                    inputCount: q.inputs?.length || 0,
                    confidence: q.confidence
                }))
            };
            
            console.log(`   📋 Questions detected: ${questions.length}`);
            console.log(`   🔗 Questions with inputs: ${attempt.phases.questionDetection.questionsWithInputs}`);
            
            // Detailed question analysis
            questions.forEach((q, i) => {
                console.log(`   ${i + 1}. "${q.text?.substring(0, 50)}..." (${q.type}) - ${q.inputs?.length || 0} inputs`);
            });
            
            this.logToAttempt('question_detection_success', `Found ${questions.length} questions`);
            
        } catch (error) {
            attempt.phases.questionDetection = { success: false, error: error.message };
            this.logToAttempt('question_detection_error', error.message);
            throw error;
        }
    }

    /**
     * Phase 3: Form Filling with Detailed Tracking
     */
    async executePhase3_FormFilling(attempt) {
        console.log('\n📝 Phase 3: Form Filling with Detailed Tracking');
        const phaseStart = Date.now();
        
        try {
            if (!attempt.phases.questionDetection.success || attempt.phases.questionDetection.questionsFound === 0) {
                throw new Error('No questions available for filling');
            }
            
            // Re-detect questions for filling
            const orchestrator = new UnifiedPollOrchestrator(this.page, { debugMode: false });
            const questions = await orchestrator.detectQuestionsOnPage();
            
            const filler = new PreciseFormFiller(this.page, {
                humanTyping: false,
                fillDelay: 600 // Slower for detailed observation
            });
            
            // Track each question filling attempt
            const fillResults = [];
            
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                const questionStart = Date.now();
                
                console.log(`   📝 Filling question ${i + 1}/${questions.length}: "${question.text?.substring(0, 50)}..."`);
                
                try {
                    const filled = await this.fillSingleQuestionWithTracking(filler, question, i + 1);
                    
                    fillResults.push({
                        questionIndex: i + 1,
                        questionText: question.text?.substring(0, 100),
                        questionType: question.type,
                        inputCount: question.inputs?.length || 0,
                        success: filled,
                        duration: Date.now() - questionStart,
                        error: null
                    });
                    
                    if (filled) {
                        console.log(`     ✅ Successfully filled question ${i + 1}`);
                        this.logToAttempt('question_fill_success', `Question ${i + 1} filled`);
                    } else {
                        console.log(`     ❌ Failed to fill question ${i + 1}`);
                        this.logToAttempt('question_fill_failure', `Question ${i + 1} failed`);
                    }
                    
                } catch (error) {
                    fillResults.push({
                        questionIndex: i + 1,
                        questionText: question.text?.substring(0, 100),
                        success: false,
                        duration: Date.now() - questionStart,
                        error: error.message
                    });
                    
                    console.log(`     ❌ Error filling question ${i + 1}: ${error.message}`);
                    this.logToAttempt('question_fill_error', `Question ${i + 1}: ${error.message}`);
                }
            }
            
            const successfulFills = fillResults.filter(r => r.success).length;
            
            attempt.phases.formFilling = {
                success: successfulFills > 0,
                questionsAttempted: questions.length,
                successfulFills: successfulFills,
                fillResults: fillResults,
                fillTime: Date.now() - phaseStart,
                successRate: questions.length > 0 ? (successfulFills / questions.length * 100).toFixed(1) : 0
            };
            
            console.log(`   📊 Form filling results: ${successfulFills}/${questions.length} questions filled (${attempt.phases.formFilling.successRate}%)`);
            
        } catch (error) {
            attempt.phases.formFilling = { success: false, error: error.message };
            this.logToAttempt('form_filling_error', error.message);
        }
    }

    /**
     * Fill single question with detailed tracking
     */
    async fillSingleQuestionWithTracking(filler, question, questionIndex) {
        try {
            // Use the existing precise form filler logic but with more detailed tracking
            if (!question.inputs || question.inputs.length === 0) {
                this.logToAttempt('question_no_inputs', `Question ${questionIndex} has no inputs`);
                return false;
            }

            const questionType = filler.detectQuestionType(question);
            console.log(`     🎯 Detected type: ${questionType}`);

            switch (questionType) {
                case 'radio':
                    return await filler.fillRadioQuestion(question);
                case 'checkbox':
                    return await filler.fillCheckboxQuestion(question);
                case 'text':
                    return await filler.fillTextQuestion(question);
                case 'email':
                    return await filler.fillEmailQuestion(question);
                case 'select':
                    return await filler.fillSelectQuestion(question);
                case 'textarea':
                    return await filler.fillTextareaQuestion(question);
                default:
                    return await filler.fillGenericInput(question);
            }
            
        } catch (error) {
            this.logToAttempt('question_fill_exception', `Question ${questionIndex}: ${error.message}`);
            return false;
        }
    }

    /**
     * Phase 4: Submission and Result Analysis
     */
    async executePhase4_Submission(attempt) {
        console.log('\n🚀 Phase 4: Submission and Result Analysis');
        const phaseStart = Date.now();
        
        try {
            if (!attempt.phases.formFilling.success || attempt.phases.formFilling.successfulFills === 0) {
                throw new Error('No successful form fills to submit');
            }
            
            console.log(`   🎯 Attempting submission after filling ${attempt.phases.formFilling.successfulFills} questions`);
            
            // Capture pre-submission state
            const preSubmissionState = {
                url: this.page.url(),
                title: await this.page.title(),
                timestamp: Date.now()
            };
            
            // Use enhanced submission handler
            const submissionHandler = new EnhancedSubmissionHandler(this.page);
            const submitted = await submissionHandler.submitFormWithValidation();
            
            // Wait for potential changes
            await this.page.waitForTimeout(3000);
            
            // Capture post-submission state
            const postSubmissionState = {
                url: this.page.url(),
                title: await this.page.title(),
                timestamp: Date.now()
            };
            
            // Analyze submission result
            const submissionAnalysis = await this.analyzeSubmissionResult(preSubmissionState, postSubmissionState);
            
            attempt.phases.submission = {
                success: submitted && submissionAnalysis.likelySuccess,
                submitted: submitted,
                preSubmissionState,
                postSubmissionState,
                submissionAnalysis,
                submissionTime: Date.now() - phaseStart
            };
            
            if (attempt.phases.submission.success) {
                console.log(`   ✅ Submission successful!`);
                console.log(`   📄 Result: ${submissionAnalysis.indicator}`);
                this.logToAttempt('submission_success', submissionAnalysis.indicator);
            } else {
                console.log(`   ❌ Submission failed or unclear`);
                console.log(`   📄 Issue: ${submissionAnalysis.issue || 'Unknown'}`);
                this.logToAttempt('submission_failure', submissionAnalysis.issue || 'Unknown result');
            }
            
        } catch (error) {
            attempt.phases.submission = { success: false, error: error.message };
            this.logToAttempt('submission_error', error.message);
            console.log(`   ❌ Submission error: ${error.message}`);
        }
    }

    /**
     * Analyze submission result
     */
    async analyzeSubmissionResult(preState, postState) {
        try {
            const urlChanged = preState.url !== postState.url;
            const titleChanged = preState.title !== postState.title;
            
            // Check for success indicators
            const pageAnalysis = await this.page.evaluate(() => {
                const text = document.body.textContent.toLowerCase();
                
                const successPatterns = [
                    /thank\s*you/,
                    /submitted/,
                    /complete[d]?/,
                    /success/,
                    /received/,
                    /confirmation/
                ];
                
                const errorPatterns = [
                    /error/,
                    /invalid/,
                    /required/,
                    /missing/
                ];
                
                return {
                    hasSuccessIndicators: successPatterns.some(p => p.test(text)),
                    hasErrorIndicators: errorPatterns.some(p => p.test(text)),
                    pageTextSample: text.substring(0, 300)
                };
            });
            
            let likelySuccess = false;
            let indicator = '';
            let issue = '';
            
            if (pageAnalysis.hasSuccessIndicators) {
                likelySuccess = true;
                indicator = 'Success text detected';
            } else if (urlChanged && !pageAnalysis.hasErrorIndicators) {
                likelySuccess = true;
                indicator = 'URL changed without errors';
            } else if (pageAnalysis.hasErrorIndicators) {
                likelySuccess = false;
                issue = 'Error indicators detected';
            } else {
                likelySuccess = false;
                issue = 'No clear success indicators';
            }
            
            return {
                likelySuccess,
                indicator,
                issue,
                urlChanged,
                titleChanged,
                pageAnalysis
            };
            
        } catch (error) {
            return {
                likelySuccess: false,
                issue: `Analysis failed: ${error.message}`
            };
        }
    }

    /**
     * Phase 5: Learning Extraction
     */
    async executePhase5_LearningExtraction(attempt) {
        console.log('\n🧠 Phase 5: Learning Extraction');
        
        // Extract learnings from this attempt
        const learnings = [];
        
        // Navigation learnings
        if (attempt.phases.navigation?.success) {
            if (attempt.phases.navigation.httpStatus === 200) {
                learnings.push('✅ Navigation: Standard HTTP 200 response worked');
            }
            if (attempt.phases.navigation.finalUrl !== attempt.target.url) {
                learnings.push(`🔄 Navigation: URL redirect occurred (${attempt.target.url} → ${attempt.phases.navigation.finalUrl})`);
            }
        } else {
            learnings.push(`❌ Navigation: Failed for ${attempt.target.platform} - ${attempt.phases.navigation?.error}`);
        }
        
        // Question detection learnings
        if (attempt.phases.questionDetection?.success) {
            const qd = attempt.phases.questionDetection;
            if (qd.questionsFound > 0 && qd.questionsWithInputs === 0) {
                learnings.push('⚠️ Question Detection: Questions found but no inputs - improve input association');
            } else if (qd.questionsWithInputs > 0) {
                learnings.push(`✅ Question Detection: Successfully found ${qd.questionsWithInputs} fillable questions`);
            }
        } else {
            learnings.push(`❌ Question Detection: Failed - ${attempt.phases.questionDetection?.error}`);
        }
        
        // Form filling learnings
        if (attempt.phases.formFilling?.success) {
            const ff = attempt.phases.formFilling;
            const successRate = parseFloat(ff.successRate);
            
            if (successRate === 100) {
                learnings.push('🏆 Form Filling: Perfect success rate - current approach works well');
            } else if (successRate >= 70) {
                learnings.push(`✅ Form Filling: Good success rate (${ff.successRate}%) - minor improvements needed`);
            } else if (successRate >= 40) {
                learnings.push(`⚠️ Form Filling: Moderate success rate (${ff.successRate}%) - significant improvements needed`);
            } else {
                learnings.push(`❌ Form Filling: Low success rate (${ff.successRate}%) - major rework needed`);
            }
            
            // Analyze failure patterns
            const failures = ff.fillResults.filter(r => !r.success);
            if (failures.length > 0) {
                const errorTypes = {};
                failures.forEach(f => {
                    if (f.error) {
                        const errorType = f.error.includes('visible') ? 'visibility' : 
                                        f.error.includes('timeout') ? 'timeout' : 'other';
                        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
                    }
                });
                
                Object.entries(errorTypes).forEach(([type, count]) => {
                    learnings.push(`🔍 Form Filling: ${count} ${type} errors detected - focus on ${type} handling`);
                });
            }
        } else {
            learnings.push(`❌ Form Filling: Complete failure - ${attempt.phases.formFilling?.error}`);
        }
        
        // Submission learnings
        if (attempt.phases.submission?.success) {
            learnings.push(`🚀 Submission: Successful with indicator: ${attempt.phases.submission.submissionAnalysis?.indicator}`);
        } else if (attempt.phases.submission?.submitted) {
            learnings.push('⚠️ Submission: Button clicked but result unclear - improve success detection');
        } else {
            learnings.push(`❌ Submission: Failed - ${attempt.phases.submission?.error}`);
        }
        
        attempt.learnings = learnings;
        
        console.log('   🧠 Key learnings from this attempt:');
        learnings.forEach((learning, i) => {
            console.log(`   ${i + 1}. ${learning}`);
        });
        
        this.logToAttempt('learning_extraction', `Extracted ${learnings.length} key learnings`);
    }

    /**
     * Log event to current attempt
     */
    logToAttempt(type, message) {
        if (this.attempts[this.currentAttempt - 1]) {
            if (type.includes('success')) {
                this.attempts[this.currentAttempt - 1].successes.push({ type, message, timestamp: Date.now() });
            } else if (type.includes('error') || type.includes('failure')) {
                this.attempts[this.currentAttempt - 1].errors.push({ type, message, timestamp: Date.now() });
            }
        }
    }

    /**
     * Print comprehensive results from all 3 attempts
     */
    printComprehensiveResults() {
        console.log('\n📊 COMPREHENSIVE RESULTS FROM 3 ATTEMPTS');
        console.log('='.repeat(60));
        
        // Overall statistics
        const totalNavigation = this.attempts.filter(a => a.phases.navigation?.success).length;
        const totalQuestions = this.attempts.reduce((sum, a) => sum + (a.phases.questionDetection?.questionsFound || 0), 0);
        const totalFills = this.attempts.reduce((sum, a) => sum + (a.phases.formFilling?.successfulFills || 0), 0);
        const totalSubmissions = this.attempts.filter(a => a.phases.submission?.success).length;
        
        console.log(`\n📈 OVERALL STATISTICS:`);
        console.log(`   Navigation Success: ${totalNavigation}/3 (${(totalNavigation/3*100).toFixed(1)}%)`);
        console.log(`   Questions Detected: ${totalQuestions} total`);
        console.log(`   Questions Filled: ${totalFills} total`);
        console.log(`   Submissions Successful: ${totalSubmissions}/3 (${(totalSubmissions/3*100).toFixed(1)}%)`);
        
        // Detailed attempt breakdown
        console.log(`\n📋 DETAILED ATTEMPT BREAKDOWN:`);
        this.attempts.forEach((attempt, i) => {
            console.log(`\n   🔄 ATTEMPT ${i + 1}: ${attempt.target.platform}`);
            console.log(`      URL: ${attempt.target.url}`);
            console.log(`      Navigation: ${attempt.phases.navigation?.success ? '✅' : '❌'}`);
            console.log(`      Questions: ${attempt.phases.questionDetection?.questionsFound || 0} found, ${attempt.phases.questionDetection?.questionsWithInputs || 0} fillable`);
            console.log(`      Filled: ${attempt.phases.formFilling?.successfulFills || 0}/${attempt.phases.formFilling?.questionsAttempted || 0} (${attempt.phases.formFilling?.successRate || 0}%)`);
            console.log(`      Submission: ${attempt.phases.submission?.success ? '✅' : '❌'}`);
            console.log(`      Duration: ${attempt.metrics.totalDuration || 0}ms`);
            console.log(`      Errors: ${attempt.errors.length}, Successes: ${attempt.successes.length}`);
        });
        
        // Aggregate learnings
        console.log(`\n🧠 AGGREGATE LEARNINGS:`);
        const allLearnings = this.attempts.flatMap(a => a.learnings || []);
        const learningPatterns = {};
        
        allLearnings.forEach(learning => {
            const category = learning.split(':')[0].replace(/[✅❌⚠️🔍🚀🏆🔄]/g, '').trim();
            if (!learningPatterns[category]) learningPatterns[category] = [];
            learningPatterns[category].push(learning);
        });
        
        Object.entries(learningPatterns).forEach(([category, learnings]) => {
            console.log(`\n   📝 ${category}:`);
            learnings.forEach(learning => {
                console.log(`      ${learning}`);
            });
        });
        
        return {
            totalNavigation,
            totalQuestions,
            totalFills,
            totalSubmissions,
            attempts: this.attempts,
            learningPatterns
        };
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const executor = new SurveyAttemptExecutor();
    
    try {
        await executor.initialize();
        await executor.execute3Attempts();
        const results = executor.printComprehensiveResults();
        
        // Save results for analysis
        const fs = require('fs');
        fs.writeFileSync('./3-attempt-results.json', JSON.stringify(results, null, 2));
        console.log('\n💾 Results saved to 3-attempt-results.json');
        
        return results;
        
    } catch (error) {
        console.error('❌ 3-attempt execution failed:', error);
    } finally {
        await executor.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SurveyAttemptExecutor;