/**
 * Enhanced AI Poll Automation Test
 * Tests multi-tab handling, calibration questions, and non-standard submit buttons
 */

const { chromium } = require('playwright');
const AIPollAutomation = require('./src/ai/ai-poll-automation');
const MultiTabHandler = require('./src/playwright/multi-tab-handler');
const SubmitButtonDetector = require('./src/ai/submit-button-detector');
const CalibrationHandler = require('./src/ai/calibration-handler');
const AIService = require('./src/ai/ai-service');

async function testEnhancedAutomation() {
    const startTime = Date.now();
    console.log('🚀 Starting Enhanced AI Poll Automation Test');
    console.log('=' .repeat(60));

    // Initialize browser and services
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const aiService = new AIService({
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'gpt-3.5-turbo',
        enableCaching: true
    });

    const multiTabHandler = new MultiTabHandler(browser, {
        maxTabs: 5,
        closeUnusedTabs: true,
        redirectTimeout: 10000
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    let testResults = {
        calibrationQuestionsHandled: 0,
        multiTabRedirects: 0,
        nonStandardSubmitsDetected: 0,
        totalCost: 0,
        errors: [],
        success: false
    };

    try {
        // Navigate to demo poll site
        const page = await context.newPage();
        await multiTabHandler.initialize(page);
        
        console.log('🌐 Navigating to demo poll site...');
        await page.goto('http://localhost:3001');
        
        // Test login
        console.log('🔐 Testing login automation...');
        await page.click('a[href="/login"]');
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="password"]', 'testpass');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        // Go to poll with calibration questions
        console.log('📋 Starting poll with calibration questions...');
        await page.click('a[href="/poll/1"]');
        await page.waitForLoadState('networkidle');
        
        // Initialize AI components
        const calibrationHandler = new CalibrationHandler(aiService);
        const submitDetector = new SubmitButtonDetector(aiService, page);
        
        // Test calibration question detection
        console.log('🎯 Testing calibration question detection...');
        const pageData = await page.evaluate(() => {
            const questions = [];
            document.querySelectorAll('.question-card').forEach((el, index) => {
                const text = el.querySelector('.question-text')?.textContent?.trim();
                const options = Array.from(el.querySelectorAll('.option-text')).map(opt => ({
                    text: opt.textContent.trim(),
                    value: opt.previousElementSibling?.value || ''
                }));
                
                questions.push({
                    index,
                    text,
                    options,
                    type: el.querySelector('input[type="radio"]') ? 'single_choice' : 'text',
                    required: !!el.querySelector('[required]')
                });
            });
            
            return {
                questions,
                url: window.location.href,
                title: document.title,
                totalQuestions: questions.length
            };
        });
        
        const calibrationAnalysis = await calibrationHandler.analyzeQuestions(
            pageData.questions, 
            { url: pageData.url, title: pageData.title, totalQuestions: pageData.questions.length }
        );
        
        console.log(`📊 Calibration Analysis:`);
        console.log(`   - Total questions: ${calibrationAnalysis.totalQuestions}`);
        console.log(`   - Calibration questions: ${calibrationAnalysis.calibrationQuestions}`);
        console.log(`   - Page type: ${calibrationAnalysis.pageLevel.pageType}`);
        console.log(`   - Risk level: ${calibrationAnalysis.pageLevel.riskLevel}`);
        
        testResults.calibrationQuestionsHandled = calibrationAnalysis.calibrationQuestions;
        
        // Answer questions using AI
        console.log('🤖 Answering questions with AI assistance...');
        
        for (let i = 0; i < pageData.questions.length; i++) {
            const question = pageData.questions[i];
            const questionAnalysis = calibrationAnalysis.questions[i];
            
            console.log(`   Question ${i + 1}: ${question.text.substring(0, 50)}...`);
            
            // Show the question
            await page.evaluate((index) => {
                window.showQuestion(index);
            }, i);
            
            await page.waitForTimeout(500);
            
            let answer;
            if (questionAnalysis.isCalibration) {
                console.log(`   🎯 Calibration question detected: ${questionAnalysis.calibrationType}`);
                answer = await calibrationHandler.generateCalibrationAnswer(questionAnalysis);
                testResults.totalCost += 0.001; // Estimated AI cost
            } else {
                // Generate normal answer
                answer = await aiService.analyze(`
                    Answer this survey question naturally as a 28-year-old professional:
                    
                    Question: "${question.text}"
                    Options: ${question.options.map(o => o.text).join(', ')}
                    
                    Respond with JSON: {"value": "option_value"}
                `, 'gpt-3.5-turbo', { temperature: 0.7, maxTokens: 100 });
                
                try {
                    answer = JSON.parse(answer);
                    testResults.totalCost += 0.002;
                } catch (e) {
                    answer = { value: question.options[0]?.value };
                }
            }
            
            if (answer && answer.action !== 'skip') {
                const value = answer.value || answer.answer;
                
                // Input the answer
                if (question.type === 'single_choice') {
                    await page.click(`input[value="${value}"]`);
                } else if (question.type === 'text') {
                    await page.fill('textarea', value);
                }
                
                console.log(`   ✅ Answered: ${value}`);
            }
            
            // Move to next question
            if (i < pageData.questions.length - 1) {
                await page.click('#nextBtn');
                await page.waitForTimeout(300);
            }
        }
        
        // Test AI submit button detection
        console.log('🔍 Testing AI submit button detection...');
        const submitAnalysis = await submitDetector.findSubmitButton({
            currentStep: pageData.questions.length,
            questionsAnswered: pageData.questions.length
        });
        
        console.log(`📊 Submit Analysis:`);
        console.log(`   - Button type: ${submitAnalysis.primaryButton?.reasoning || 'Not found'}`);
        console.log(`   - Page state: ${submitAnalysis.pageState}`);
        console.log(`   - Strategy: ${submitAnalysis.submitStrategy}`);
        console.log(`   - Confidence: ${submitAnalysis.primaryButton?.confidence || 0}`);
        
        testResults.nonStandardSubmitsDetected = submitAnalysis.primaryButton ? 1 : 0;
        testResults.totalCost += 0.003;
        
        // Execute submit with multi-tab handling
        console.log('🚀 Executing submit with multi-tab handling...');
        
        try {
            const resultPage = await submitDetector.executeSubmit(submitAnalysis, multiTabHandler);
            testResults.multiTabRedirects++;
            
            // Wait for any redirects
            console.log('⏳ Waiting for redirect chain...');
            await page.waitForTimeout(3000);
            
            // Check for additional tabs
            const stats = multiTabHandler.getStats();
            console.log(`📊 Multi-tab stats:`, stats);
            testResults.multiTabRedirects = stats.redirects;
            
            // Try to find and click any non-standard continue buttons
            const currentPage = multiTabHandler.getCurrentActivePage();
            
            try {
                // Look for hidden or non-standard continue buttons
                const continueButton = await currentPage.$('.continue-text, [data-continue], .weird-submit');
                if (continueButton) {
                    console.log('🎯 Found non-standard continue button');
                    await continueButton.click();
                    await currentPage.waitForTimeout(2000);
                }
            } catch (e) {
                console.log('   No additional continue buttons found');
            }
            
            // Final verification
            const finalUrl = currentPage.url();
            console.log(`🏁 Final URL: ${finalUrl}`);
            
            testResults.success = true;
            
        } catch (error) {
            console.error('❌ Submit execution failed:', error);
            testResults.errors.push(error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        testResults.errors.push(error.message);
    } finally {
        // Cleanup
        await multiTabHandler.closeAllExceptMain();
        await context.close();
        await browser.close();
    }
    
    // Test Results
    const duration = Date.now() - startTime;
    console.log('\n' + '=' .repeat(60));
    console.log('📊 ENHANCED AUTOMATION TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Success: ${testResults.success ? 'YES' : 'NO'}`);
    console.log(`🎯 Calibration questions handled: ${testResults.calibrationQuestionsHandled}`);
    console.log(`🔀 Multi-tab redirects: ${testResults.multiTabRedirects}`);
    console.log(`🔍 Non-standard submits detected: ${testResults.nonStandardSubmitsDetected}`);
    console.log(`💰 Total AI cost: $${testResults.totalCost.toFixed(4)}`);
    console.log(`⏱️ Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`❌ Errors: ${testResults.errors.length}`);
    
    if (testResults.errors.length > 0) {
        console.log('\nErrors:');
        testResults.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
        });
    }
    
    return testResults;
}

// Run the test
if (require.main === module) {
    testEnhancedAutomation()
        .then(results => {
            console.log('\n🎉 Test completed!');
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test crashed:', error);
            process.exit(1);
        });
}

module.exports = testEnhancedAutomation;