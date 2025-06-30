#!/usr/bin/env node

/**
 * Direct Survey Test
 * Test precision improvements on a specific real survey
 */

const { chromium } = require('playwright');
const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator');
const PreciseFormFiller = require('./src/automation/precise-form-filler');

async function testDirectSurvey() {
    console.log('🎯 Testing direct survey with precision improvements...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        const page = await context.newPage();
        
        // Test on a real survey creation form (registration-like)
        const testUrl = 'https://surveyplanet.com/users/register';
        console.log(`📄 Testing survey registration: ${testUrl}`);
        
        await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Initialize the orchestrator
        const orchestrator = new UnifiedPollOrchestrator(page, {
            debugMode: true,
            enableLearning: false
        });
        
        // Detect questions/form fields
        const questions = await orchestrator.detectQuestionsOnPage();
        console.log(`📋 Detected ${questions.length} form fields`);
        
        // Debug detected inputs
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            console.log(`\n🔍 Field ${i + 1}:`);
            console.log(`   Text: ${q.text?.substring(0, 100)}`);
            console.log(`   Type: ${q.type}`);
            console.log(`   Inputs: ${q.inputs?.length || 0}`);
            
            if (q.inputs?.length > 0) {
                q.inputs.forEach((inp, j) => {
                    console.log(`     Input ${j + 1}: ${inp.type} - ${inp.selector}`);
                });
            }
        }
        
        if (questions.length > 0) {
            // Test precise form filling
            const filler = new PreciseFormFiller(page, {
                humanTyping: true,
                fillDelay: 800
            });
            
            console.log('\n🎯 Testing precise form filling...');
            const results = await filler.fillSurveyForm(questions);
            
            console.log(`\n📊 Results:`);
            console.log(`   Fields filled: ${results.filledQuestions}/${results.totalQuestions}`);
            console.log(`   Success rate: ${(results.filledQuestions / results.totalQuestions * 100).toFixed(1)}%`);
            
            if (results.errors.length > 0) {
                console.log(`   Errors: ${results.errors.length}`);
                results.errors.forEach(error => console.log(`     - ${error}`));
            }
            
            // Wait a moment to see results
            await page.waitForTimeout(5000);
            
        } else {
            console.log('⚠️ No form fields detected');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
        console.log('🧹 Test completed');
    }
}

testDirectSurvey().catch(console.error);