#!/usr/bin/env node

/**
 * Submission Bottleneck Analysis
 * Identify why we have 50% submission rate vs 100% fill rate
 */

const { chromium } = require('playwright');
const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator');
const PreciseFormFiller = require('./src/automation/precise-form-filler');

class SubmissionAnalyzer {
    constructor() {
        this.browser = null;
        this.page = null;
        this.analysis = {
            sitesAnalyzed: 0,
            formsFound: 0,
            formsFilled: 0,
            submissionAttempts: 0,
            successfulSubmissions: 0,
            submissionFailures: [],
            buttonAnalysis: {
                buttonsFound: 0,
                buttonTypes: {},
                clickableButtons: 0,
                successfulClicks: 0
            },
            formValidation: {
                validationErrors: 0,
                requiredFieldMissing: 0,
                invalidInputs: 0
            }
        };
    }

    async initialize() {
        console.log('🔍 Initializing Submission Bottleneck Analyzer...');
        
        this.browser = await chromium.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        this.page = await context.newPage();
        
        // Listen for console logs to catch JavaScript errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`🔴 Browser Error: ${msg.text()}`);
            }
        });
    }

    async analyzeSite(url, description) {
        console.log(`\n🎯 Analyzing: ${description}`);
        console.log(`📄 URL: ${url}`);
        
        this.analysis.sitesAnalyzed++;
        
        try {
            // Navigate to site
            await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Detect forms and questions
            const orchestrator = new UnifiedPollOrchestrator(this.page, {
                debugMode: false,
                enableLearning: false
            });
            
            const questions = await orchestrator.detectQuestionsOnPage();
            
            if (questions.length === 0) {
                console.log('⚠️ No forms detected');
                return;
            }
            
            this.analysis.formsFound++;
            console.log(`📋 Found ${questions.length} questions in form`);
            
            // Fill the form
            const filler = new PreciseFormFiller(this.page, {
                humanTyping: false,
                fillDelay: 300
            });
            
            const fillResults = await filler.fillSurveyForm(questions);
            
            if (fillResults.filledQuestions > 0) {
                this.analysis.formsFilled++;
                console.log(`✅ Filled ${fillResults.filledQuestions} questions`);
                
                // Analyze submit buttons BEFORE attempting submission
                await this.analyzeSubmitButtons();
                
                // Attempt submission with detailed analysis
                await this.analyzeSubmissionProcess(filler);
            } else {
                console.log('❌ No questions were filled');
            }
            
        } catch (error) {
            console.log(`❌ Analysis failed: ${error.message}`);
            this.analysis.submissionFailures.push({
                url,
                error: error.message,
                stage: 'navigation'
            });
        }
    }

    async analyzeSubmitButtons() {
        console.log('\n🔍 Analyzing submit buttons...');
        
        const buttonAnalysis = await this.page.evaluate(() => {
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Send")',
                'button:has-text("Complete")',
                'button:has-text("Finish")',
                'button:has-text("Next")',
                '[class*="submit"]',
                'form button:last-child',
                'button:last-of-type'
            ];
            
            const buttons = [];
            const buttonTypes = {};
            let clickableCount = 0;
            
            for (const selector of submitSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(btn => {
                        const type = btn.type || btn.tagName.toLowerCase();
                        const text = btn.textContent?.trim() || '';
                        const isVisible = btn.offsetWidth > 0 && btn.offsetHeight > 0;
                        const isEnabled = !btn.disabled;
                        const rect = btn.getBoundingClientRect();
                        
                        buttonTypes[type] = (buttonTypes[type] || 0) + 1;
                        
                        if (isVisible && isEnabled && rect.width > 0) {
                            clickableCount++;
                        }
                        
                        buttons.push({
                            selector,
                            type,
                            text,
                            isVisible,
                            isEnabled,
                            width: rect.width,
                            height: rect.height,
                            clickable: isVisible && isEnabled && rect.width > 0
                        });
                    });
                } catch (e) {
                    // Selector failed
                }
            }
            
            return {
                totalButtons: buttons.length,
                buttonTypes,
                clickableCount,
                buttons: buttons.slice(0, 10) // Limit for readability
            };
        });
        
        this.analysis.buttonAnalysis.buttonsFound += buttonAnalysis.totalButtons;
        Object.entries(buttonAnalysis.buttonTypes).forEach(([type, count]) => {
            this.analysis.buttonAnalysis.buttonTypes[type] = (this.analysis.buttonAnalysis.buttonTypes[type] || 0) + count;
        });
        this.analysis.buttonAnalysis.clickableButtons += buttonAnalysis.clickableCount;
        
        console.log(`🔘 Found ${buttonAnalysis.totalButtons} buttons, ${buttonAnalysis.clickableCount} clickable`);
        
        if (buttonAnalysis.buttons.length > 0) {
            console.log('📋 Button details:');
            buttonAnalysis.buttons.forEach((btn, i) => {
                console.log(`   ${i + 1}. ${btn.selector} - "${btn.text}" (${btn.type}) - Clickable: ${btn.clickable}`);
            });
        }
        
        return buttonAnalysis;
    }

    async analyzeSubmissionProcess(filler) {
        console.log('\n🚀 Analyzing submission process...');
        
        this.analysis.submissionAttempts++;
        
        try {
            // Capture page state before submission
            const beforeUrl = this.page.url();
            const beforeTitle = await this.page.title();
            
            console.log(`📄 Before submission: ${beforeTitle} (${beforeUrl})`);
            
            // Attempt submission
            const submitted = await filler.submitForm();
            
            if (submitted) {
                this.analysis.buttonAnalysis.successfulClicks++;
                console.log('✅ Submit button clicked successfully');
                
                // Wait for potential navigation/changes
                await this.page.waitForTimeout(3000);
                
                // Analyze what happened after submission
                const afterUrl = this.page.url();
                const afterTitle = await this.page.title();
                
                console.log(`📄 After submission: ${afterTitle} (${afterUrl})`);
                
                // Check for success indicators
                const successIndicators = await this.page.evaluate(() => {
                    const text = document.body.textContent.toLowerCase();
                    const indicators = {
                        thankYou: text.includes('thank you'),
                        submitted: text.includes('submitted'),
                        complete: text.includes('complete'),
                        success: text.includes('success'),
                        received: text.includes('received'),
                        confirmation: text.includes('confirmation')
                    };
                    
                    return {
                        ...indicators,
                        hasAny: Object.values(indicators).some(Boolean),
                        pageText: text.substring(0, 500)
                    };
                });
                
                // Check for validation errors
                const validationErrors = await this.page.evaluate(() => {
                    const errorSelectors = [
                        '.error', '.field-error', '.validation-error',
                        '[class*="error"]', '[class*="invalid"]',
                        '.alert-danger', '.alert-error'
                    ];
                    
                    let errors = [];
                    for (const selector of errorSelectors) {
                        try {
                            const elements = document.querySelectorAll(selector);
                            elements.forEach(el => {
                                if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                                    errors.push(el.textContent?.trim());
                                }
                            });
                        } catch (e) {}
                    }
                    
                    return errors.filter(e => e && e.length > 0);
                });
                
                if (successIndicators.hasAny) {
                    this.analysis.successfulSubmissions++;
                    console.log('🎉 Submission confirmed successful');
                    console.log(`   Success indicators: ${Object.entries(successIndicators).filter(([k,v]) => v && k !== 'hasAny' && k !== 'pageText').map(([k]) => k).join(', ')}`);
                } else if (validationErrors.length > 0) {
                    this.analysis.formValidation.validationErrors++;
                    console.log('⚠️ Validation errors detected:');
                    validationErrors.forEach(error => console.log(`   - ${error}`));
                    
                    this.analysis.submissionFailures.push({
                        url: beforeUrl,
                        error: 'Validation errors: ' + validationErrors.join('; '),
                        stage: 'validation'
                    });
                } else if (afterUrl !== beforeUrl) {
                    // Page changed but no clear success indicator
                    console.log('🤔 Page navigation occurred but success unclear');
                    console.log(`   Page text sample: ${successIndicators.pageText.substring(0, 200)}...`);
                    
                    // Count as potential success
                    this.analysis.successfulSubmissions++;
                } else {
                    console.log('❌ No clear submission result');
                    this.analysis.submissionFailures.push({
                        url: beforeUrl,
                        error: 'No clear submission result - page unchanged',
                        stage: 'result_unclear'
                    });
                }
                
            } else {
                console.log('❌ Failed to click submit button');
                this.analysis.submissionFailures.push({
                    url: beforeUrl,
                    error: 'No submit button found or clickable',
                    stage: 'button_click'
                });
            }
            
        } catch (error) {
            console.log(`❌ Submission analysis failed: ${error.message}`);
            this.analysis.submissionFailures.push({
                url: this.page.url(),
                error: error.message,
                stage: 'submission_process'
            });
        }
    }

    async runAnalysis() {
        // Test sites that are likely to have real forms
        const testSites = [
            {
                url: 'https://forms.google.com/forms/d/e/1FAIpQLSf_test_example',
                description: 'Google Forms Test'
            },
            {
                url: 'https://surveyplanet.com',
                description: 'SurveyPlanet Homepage'
            },
            {
                url: 'https://www.surveymonkey.com/r/test',
                description: 'SurveyMonkey Test'
            },
            {
                url: 'https://typeform.com',
                description: 'Typeform Homepage'
            },
            {
                url: 'https://www.jotform.com',
                description: 'JotForm Homepage'
            }
        ];

        for (const site of testSites) {
            await this.analyzeSite(site.url, site.description);
            await this.page.waitForTimeout(1000);
        }
    }

    printAnalysis() {
        console.log('\n📊 SUBMISSION BOTTLENECK ANALYSIS');
        console.log('===================================');
        console.log(`🔬 Sites Analyzed: ${this.analysis.sitesAnalyzed}`);
        console.log(`📋 Forms Found: ${this.analysis.formsFound}`);
        console.log(`✅ Forms Filled: ${this.analysis.formsFilled}`);
        console.log(`🚀 Submission Attempts: ${this.analysis.submissionAttempts}`);
        console.log(`🎉 Successful Submissions: ${this.analysis.successfulSubmissions}`);
        
        if (this.analysis.submissionAttempts > 0) {
            const successRate = (this.analysis.successfulSubmissions / this.analysis.submissionAttempts * 100).toFixed(1);
            console.log(`📈 Submission Success Rate: ${successRate}%`);
        }
        
        console.log('\n🔘 BUTTON ANALYSIS:');
        console.log(`   Total Buttons Found: ${this.analysis.buttonAnalysis.buttonsFound}`);
        console.log(`   Clickable Buttons: ${this.analysis.buttonAnalysis.clickableButtons}`);
        console.log(`   Successful Clicks: ${this.analysis.buttonAnalysis.successfulClicks}`);
        console.log(`   Button Types:`, this.analysis.buttonAnalysis.buttonTypes);
        
        if (this.analysis.submissionFailures.length > 0) {
            console.log('\n❌ SUBMISSION FAILURES:');
            this.analysis.submissionFailures.forEach((failure, i) => {
                console.log(`   ${i + 1}. Stage: ${failure.stage}`);
                console.log(`      URL: ${failure.url}`);
                console.log(`      Error: ${failure.error}`);
            });
        }
        
        console.log('\n🎯 IMPROVEMENT OPPORTUNITIES:');
        const buttonClickRate = this.analysis.buttonAnalysis.clickableButtons > 0 ? 
            (this.analysis.buttonAnalysis.successfulClicks / this.analysis.buttonAnalysis.clickableButtons * 100).toFixed(1) : 0;
        console.log(`   Button Click Success: ${buttonClickRate}%`);
        
        if (this.analysis.formValidation.validationErrors > 0) {
            console.log(`   Validation Errors: ${this.analysis.formValidation.validationErrors} detected`);
        }
        
        console.log('\n💡 RECOMMENDATIONS:');
        if (this.analysis.submissionFailures.some(f => f.stage === 'validation')) {
            console.log('   ⚠️ Add better form validation handling');
        }
        if (this.analysis.submissionFailures.some(f => f.stage === 'button_click')) {
            console.log('   ⚠️ Improve submit button detection strategies');
        }
        if (this.analysis.submissionFailures.some(f => f.stage === 'result_unclear')) {
            console.log('   ⚠️ Add better success detection patterns');
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const analyzer = new SubmissionAnalyzer();
    
    try {
        await analyzer.initialize();
        await analyzer.runAnalysis();
        analyzer.printAnalysis();
        
    } catch (error) {
        console.error('❌ Analysis failed:', error);
    } finally {
        await analyzer.cleanup();
    }
}

main().catch(console.error);