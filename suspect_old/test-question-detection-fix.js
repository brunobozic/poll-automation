#!/usr/bin/env node

/**
 * Test Question Detection Fix
 * 
 * Quick test to verify the enhanced question detection logic is working properly.
 * Tests against various types of pages to ensure detection works.
 */

const { chromium } = require('playwright');
const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator');

class QuestionDetectionTester {
    constructor() {
        this.browser = null;
        this.testResults = [];
    }

    async runTests() {
        console.log('🧪 Starting Question Detection Tests\n');
        
        try {
            // Initialize browser
            this.browser = await chromium.launch({ 
                headless: false,
                slowMo: 1000
            });
            
            // Test different types of pages
            const testPages = [
                {
                    name: 'Google Form Example',
                    url: 'https://docs.google.com/forms/d/e/1FAIpQLSf9d1TLHGWqZUq-kK1q6vBVkzN8vZVt0QKjQNZQ3ZqKQG7z8w/viewform',
                    expectedQuestions: '>= 1'
                },
                {
                    name: 'TypeForm Demo',
                    url: 'https://admin.typeform.com/signup',
                    expectedQuestions: '>= 1'
                },
                {
                    name: 'Simple HTML Form',
                    url: 'data:text/html,<html><body><form><div class="question"><label>What is your name?</label><input type="text" name="name"></div><div class="question"><label>What is your age?</label><select name="age"><option>18-25</option><option>26-35</option></select></div></form></body></html>',
                    expectedQuestions: 2
                }
            ];
            
            for (const testPage of testPages) {
                await this.testPage(testPage);
            }
            
            // Print results
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
    
    async testPage(testPage) {
        console.log(`🔍 Testing: ${testPage.name}`);
        console.log(`🌐 URL: ${testPage.url}\n`);
        
        try {
            const page = await this.browser.newPage();
            
            // Create orchestrator instance
            const orchestrator = new UnifiedPollOrchestrator(page, {
                debugMode: true,
                enableLearning: false
            });
            
            // Initialize orchestrator  
            await orchestrator.initialize();
            
            // Navigate to test page
            await page.goto(testPage.url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(2000);
            
            // Detect questions
            const questions = await orchestrator.detectQuestionsOnPage();
            
            const result = {
                name: testPage.name,
                url: testPage.url,
                questionsFound: questions.length,
                expectedQuestions: testPage.expectedQuestions,
                success: this.evaluateResult(questions.length, testPage.expectedQuestions),
                questions: questions.map(q => ({
                    text: q.text?.substring(0, 100) + '...',
                    type: q.type,
                    confidence: q.confidence
                }))
            };
            
            this.testResults.push(result);
            
            console.log(`📊 Questions Found: ${questions.length}`);
            console.log(`✅ Expected: ${testPage.expectedQuestions}`);
            console.log(`🎯 Success: ${result.success ? 'PASS' : 'FAIL'}\n`);
            
            if (questions.length > 0) {
                console.log('📝 Detected Questions:');
                questions.forEach((q, i) => {
                    console.log(`   ${i+1}. "${q.text?.substring(0, 80)}..." (${q.type}, confidence: ${q.confidence?.toFixed(2)})`);
                });
                console.log();
            }
            
            await page.close();
            
        } catch (error) {
            console.error(`❌ Error testing ${testPage.name}:`, error.message);
            this.testResults.push({
                name: testPage.name,
                url: testPage.url,
                questionsFound: 0,
                expectedQuestions: testPage.expectedQuestions,
                success: false,
                error: error.message
            });
        }
    }
    
    evaluateResult(found, expected) {
        if (typeof expected === 'number') {
            return found === expected;
        } else if (typeof expected === 'string' && expected.startsWith('>=')) {
            const minExpected = parseInt(expected.replace('>= ', ''));
            return found >= minExpected;
        }
        return found > 0;
    }
    
    printResults() {
        console.log('\n📊 TEST RESULTS SUMMARY\n');
        console.log('=' .repeat(50));
        
        let passed = 0;
        let total = this.testResults.length;
        
        this.testResults.forEach((result, i) => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${i+1}. ${result.name}: ${status}`);
            console.log(`   Questions Found: ${result.questionsFound} (Expected: ${result.expectedQuestions})`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            console.log();
            
            if (result.success) passed++;
        });
        
        console.log('=' .repeat(50));
        console.log(`📈 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! Question detection is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the enhanced detection logic.');
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new QuestionDetectionTester();
    tester.runTests().catch(console.error);
}

module.exports = QuestionDetectionTester;