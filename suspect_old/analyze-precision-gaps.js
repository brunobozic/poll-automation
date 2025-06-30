#!/usr/bin/env node

/**
 * Precision Gap Analysis
 * Analyze why we have 12.5% vs higher success rates
 */

const { chromium } = require('playwright');
const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator');
const PreciseFormFiller = require('./src/automation/precise-form-filler');

class PrecisionAnalyzer {
    constructor() {
        this.browser = null;
        this.page = null;
        this.analysis = {
            totalQuestions: 0,
            questionsWithInputs: 0,
            visibleInputs: 0,
            fillableInputs: 0,
            successfulFills: 0,
            errorsByType: {},
            inputTypeDistribution: {},
            visibilityIssues: []
        };
    }

    async initialize() {
        console.log('🔍 Initializing Precision Gap Analyzer...');
        
        this.browser = await chromium.launch({ headless: false });
        const context = await this.browser.newContext();
        this.page = await context.newPage();
    }

    async analyzeForm(url) {
        console.log(`\n📊 Analyzing form precision: ${url}`);
        
        try {
            await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Detect questions
            const orchestrator = new UnifiedPollOrchestrator(this.page, {
                debugMode: true,
                enableLearning: false
            });
            
            const questions = await orchestrator.detectQuestionsOnPage();
            this.analysis.totalQuestions += questions.length;
            
            console.log(`📋 Found ${questions.length} questions`);
            
            // Analyze each question in detail
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                await this.analyzeQuestion(question, i + 1);
            }
            
            // Attempt precise filling
            const filler = new PreciseFormFiller(this.page, {
                humanTyping: false, // Speed up for analysis
                fillDelay: 100
            });
            
            const results = await filler.fillSurveyForm(questions);
            this.analysis.successfulFills += results.filledQuestions;
            
            // Log detailed error analysis
            results.errors.forEach(error => {
                const errorType = this.categorizeError(error);
                this.analysis.errorsByType[errorType] = (this.analysis.errorsByType[errorType] || 0) + 1;
            });
            
            console.log(`✅ Successfully filled: ${results.filledQuestions}/${questions.length}`);
            
        } catch (error) {
            console.log(`❌ Analysis failed: ${error.message}`);
        }
    }

    async analyzeQuestion(question, index) {
        console.log(`\n🔍 Analyzing Question ${index}:`);
        console.log(`   Text: ${question.text?.substring(0, 100)}...`);
        console.log(`   Type: ${question.type}`);
        console.log(`   Inputs: ${question.inputs?.length || 0}`);
        
        if (question.inputs && question.inputs.length > 0) {
            this.analysis.questionsWithInputs++;
            
            // Analyze each input
            for (let j = 0; j < question.inputs.length; j++) {
                const input = question.inputs[j];
                await this.analyzeInput(input, `${index}.${j + 1}`);
            }
        } else {
            console.log(`   ⚠️ No inputs found for question ${index}`);
        }
    }

    async analyzeInput(input, inputId) {
        console.log(`     📝 Input ${inputId}: ${input.selector} (${input.type})`);
        
        // Track input type distribution
        this.analysis.inputTypeDistribution[input.type] = (this.analysis.inputTypeDistribution[input.type] || 0) + 1;
        
        try {
            const element = await this.page.$(input.selector);
            if (!element) {
                console.log(`       ❌ Element not found: ${input.selector}`);
                return;
            }
            
            // Check visibility
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            const boundingBox = await element.boundingBox();
            
            console.log(`       Visible: ${isVisible}, Enabled: ${isEnabled}`);
            console.log(`       BoundingBox: ${boundingBox ? 'Yes' : 'No'}`);
            
            if (isVisible) {
                this.analysis.visibleInputs++;
                
                if (isEnabled && boundingBox) {
                    this.analysis.fillableInputs++;
                    console.log(`       ✅ Fillable input`);
                } else {
                    console.log(`       ⚠️ Visible but not fillable (enabled: ${isEnabled}, bbox: ${!!boundingBox})`);
                }
            } else {
                this.analysis.visibilityIssues.push({
                    selector: input.selector,
                    type: input.type,
                    reason: 'not visible'
                });
                console.log(`       ❌ Not visible`);
            }
            
        } catch (error) {
            console.log(`       ❌ Analysis error: ${error.message}`);
        }
    }

    categorizeError(error) {
        if (error.includes('not visible')) return 'visibility';
        if (error.includes('not found')) return 'selector';
        if (error.includes('timeout')) return 'timeout';
        if (error.includes('No inputs found')) return 'no_inputs';
        return 'other';
    }

    printAnalysis() {
        console.log('\n📊 PRECISION GAP ANALYSIS RESULTS');
        console.log('=====================================');
        console.log(`📋 Total Questions: ${this.analysis.totalQuestions}`);
        console.log(`🔗 Questions with Inputs: ${this.analysis.questionsWithInputs} (${(this.analysis.questionsWithInputs / this.analysis.totalQuestions * 100).toFixed(1)}%)`);
        console.log(`👁️ Visible Inputs: ${this.analysis.visibleInputs}`);
        console.log(`✏️ Fillable Inputs: ${this.analysis.fillableInputs}`);
        console.log(`✅ Successful Fills: ${this.analysis.successfulFills}`);
        
        if (this.analysis.fillableInputs > 0) {
            const fillRate = (this.analysis.successfulFills / this.analysis.fillableInputs * 100).toFixed(1);
            console.log(`📈 Fill Success Rate: ${fillRate}%`);
        }
        
        console.log('\n🎯 INPUT TYPE DISTRIBUTION:');
        Object.entries(this.analysis.inputTypeDistribution).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        
        console.log('\n❌ ERROR ANALYSIS:');
        Object.entries(this.analysis.errorsByType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        
        if (this.analysis.visibilityIssues.length > 0) {
            console.log('\n👁️ VISIBILITY ISSUES:');
            this.analysis.visibilityIssues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue.selector} (${issue.type}) - ${issue.reason}`);
            });
        }
        
        console.log('\n🎯 IMPROVEMENT OPPORTUNITIES:');
        const totalInputs = this.analysis.questionsWithInputs;
        const visibilityLoss = totalInputs - this.analysis.visibleInputs;
        const fillabilityLoss = this.analysis.visibleInputs - this.analysis.fillableInputs;
        const executionLoss = this.analysis.fillableInputs - this.analysis.successfulFills;
        
        if (visibilityLoss > 0) {
            console.log(`   🚫 Visibility Loss: ${visibilityLoss} inputs not visible`);
        }
        if (fillabilityLoss > 0) {
            console.log(`   🚫 Fillability Loss: ${fillabilityLoss} inputs visible but not fillable`);
        }
        if (executionLoss > 0) {
            console.log(`   🚫 Execution Loss: ${executionLoss} fillable inputs failed to fill`);
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const analyzer = new PrecisionAnalyzer();
    
    try {
        await analyzer.initialize();
        
        // Test on multiple forms to get comprehensive analysis
        const testUrls = [
            'https://forms.google.com/forms/d/e/1FAIpQLSf_test_example',
            'https://www.surveymonkey.com/r/test'
        ];
        
        for (const url of testUrls) {
            await analyzer.analyzeForm(url);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between tests
        }
        
        analyzer.printAnalysis();
        
    } catch (error) {
        console.error('❌ Analysis failed:', error);
    } finally {
        await analyzer.cleanup();
    }
}

main().catch(console.error);