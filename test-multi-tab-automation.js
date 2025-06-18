/**
 * Multi-Tab Poll Automation Test
 * Tests handling of polls that open 2-3 additional browser tabs
 * Demonstrates advanced tab coordination and parallel processing
 */

const { chromium } = require('playwright');
const EnhancedMultiTabHandler = require('./src/playwright/enhanced-multi-tab-handler');
const AIService = require('./src/ai/ai-service');

async function testMultiTabAutomation() {
    const startTime = Date.now();
    console.log('🚀 Starting Multi-Tab Poll Automation Test');
    console.log('=' .repeat(70));

    // Initialize browser with enhanced multi-tab support
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-running-insecure-content'] 
    });
    
    const aiService = new AIService({
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        defaultModel: 'gpt-3.5-turbo',
        enableCaching: true
    });

    // Initialize enhanced multi-tab handler
    const multiTabHandler = new EnhancedMultiTabHandler(browser, {
        maxTabs: 15,
        closeUnusedTabs: true,
        parallelProcessing: true,
        tabTimeout: 45000
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    let testResults = {
        success: false,
        tabsCreated: 0,
        tabsProcessed: 0,
        tabsCompleted: 0,
        parallelProcessing: false,
        flowPhases: [],
        errors: [],
        timing: {}
    };

    try {
        // Navigate to demo poll site
        const mainPage = await context.newPage();
        await multiTabHandler.initialize(mainPage);
        
        console.log('🌐 Navigating to demo poll site...');
        await mainPage.goto('http://localhost:3001');
        
        // Login
        console.log('🔐 Logging in...');
        await mainPage.click('a[href="/login"]');
        await mainPage.fill('input[name="username"]', 'testuser');
        await mainPage.fill('input[name="password"]', 'testpass');
        await mainPage.click('button[type="submit"]');
        await mainPage.waitForLoadState('networkidle');
        
        // Start poll
        console.log('📋 Starting poll...');
        await mainPage.click('a[href="/poll/1"]');
        await mainPage.waitForLoadState('networkidle');
        
        testResults.timing.pollStarted = Date.now() - startTime;
        
        // Answer initial questions quickly to trigger multi-tab flow
        console.log('🤖 Answering initial questions...');
        
        const questions = await mainPage.$$('.question-card');
        console.log(`   Found ${questions.length} questions`);
        
        // Answer questions quickly
        for (let i = 0; i < questions.length; i++) {
            try {
                // Show question
                await mainPage.evaluate((index) => {
                    if (window.showQuestion) {
                        window.showQuestion(index);
                    }
                }, i);
                
                await mainPage.waitForTimeout(500);
                
                // Answer based on question type
                const questionCard = questions[i];
                const radioButtons = await questionCard.$$('input[type="radio"]');
                const checkboxes = await questionCard.$$('input[type="checkbox"]');
                const textareas = await questionCard.$$('textarea');
                
                if (radioButtons.length > 0) {
                    // For calibration questions, answer correctly
                    const questionText = await questionCard.$eval('.question-text', el => el.textContent);
                    
                    if (questionText.includes('select "Option C"')) {
                        // Attention check - select Option C
                        const optionC = await questionCard.$('input[value="option_c"]');
                        if (optionC) await optionC.click();
                    } else if (questionText.includes('capital of France')) {
                        // Knowledge test - select Paris
                        const paris = await questionCard.$('input[value="paris"]');
                        if (paris) await paris.click();
                    } else {
                        // Regular question - select first option
                        await radioButtons[0].click();
                    }
                } else if (checkboxes.length > 0) {
                    await checkboxes[0].click();
                } else if (textareas.length > 0) {
                    await textareas[0].fill('This is a test response for the automation system.');
                }
                
                console.log(`   ✅ Answered question ${i + 1}/${questions.length}`);
                
                // Move to next question
                if (i < questions.length - 1) {
                    await mainPage.click('#nextBtn');
                    await mainPage.waitForTimeout(300);
                }
                
            } catch (error) {
                console.warn(`   ⚠️ Failed to answer question ${i + 1}: ${error.message}`);
            }
        }
        
        testResults.timing.questionsCompleted = Date.now() - startTime;
        
        // Submit to trigger multi-tab verification
        console.log('🚀 Submitting to trigger multi-tab flow...');
        await mainPage.click('#submitBtn');
        await mainPage.waitForTimeout(3000); // Wait for redirects
        
        // Check if we're on verification page
        const currentUrl = mainPage.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('verify')) {
            console.log('✅ Reached verification page');
            
            // Trigger multi-tab flow
            console.log('🔄 Triggering multi-tab verification...');
            
            // Set up tab detection
            let tabDetectionPromise = multiTabHandler.waitForMultipleTabs(4, 30000);
            
            // Click the multi-tab trigger button
            try {
                await mainPage.click('button:has-text("Start Multi-Tab Verification")');
                console.log('   Multi-tab process initiated');
            } catch (error) {
                console.warn('   Multi-tab button not found, looking for alternatives...');
                // Fallback to weird submit button
                await mainPage.click('.weird-submit');
            }
            
            // Wait for multiple tabs to be created
            console.log('⏳ Waiting for additional tabs to open...');
            const tabsReady = await tabDetectionPromise;
            
            if (tabsReady) {
                testResults.tabsCreated = multiTabHandler.tabs.size;
                console.log(`🎉 ${testResults.tabsCreated} tabs detected!`);
                
                // Get comprehensive stats
                const stats = multiTabHandler.getMultiTabStats();
                console.log('📊 Multi-Tab Stats:');
                console.log(`   Total tabs: ${stats.totalTabs}`);
                console.log(`   Active tabs: ${stats.activeTabs}`);
                console.log(`   Poll tabs: ${stats.pollTabs}`);
                console.log(`   Flow phase: ${stats.flowPhase}`);
                console.log(`   Tab types:`, stats.tabsByType);
                
                testResults.flowPhases.push(stats.flowPhase);
                testResults.timing.tabsCreated = Date.now() - startTime;
                
                // Process tabs in parallel
                if (stats.activeTabs > 1) {
                    console.log('🔄 Starting parallel tab processing...');
                    testResults.parallelProcessing = true;
                    
                    const processingResults = await multiTabHandler.processTabsInParallel();
                    testResults.tabsProcessed = processingResults.length;
                    
                    const successful = processingResults.filter(r => r.status === 'fulfilled');
                    testResults.tabsCompleted = successful.length;
                    
                    console.log(`✅ Parallel processing results:`);
                    console.log(`   Tabs processed: ${testResults.tabsProcessed}`);
                    console.log(`   Successfully completed: ${testResults.tabsCompleted}`);
                    
                    testResults.timing.parallelProcessingComplete = Date.now() - startTime;
                    
                    // Show detailed results
                    successful.forEach((result, index) => {
                        if (result.value) {
                            console.log(`   Tab ${index + 1}: ${result.value.tabType} - ${JSON.stringify(result.value)}`);
                        }
                    });
                    
                    // Wait a bit for all tabs to settle
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    // Get final stats
                    const finalStats = multiTabHandler.getMultiTabStats();
                    console.log('📈 Final Multi-Tab Stats:');
                    console.log(`   Completed tabs: ${finalStats.completedTabs}`);
                    console.log(`   Flow phase: ${finalStats.flowPhase}`);
                    
                    testResults.flowPhases.push(finalStats.flowPhase);
                }
                
                testResults.success = true;
                
            } else {
                console.warn('⚠️ Not all expected tabs were created');
                testResults.tabsCreated = multiTabHandler.tabs.size;
            }
            
        } else {
            console.warn('⚠️ Did not reach verification page - unexpected flow');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        testResults.errors.push(error.message);
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up...');
        await multiTabHandler.closeAllExceptMain();
        await context.close();
        await browser.close();
    }
    
    // Test Results
    const duration = Date.now() - startTime;
    testResults.timing.total = duration;
    
    console.log('\n' + '=' .repeat(70));
    console.log('📊 MULTI-TAB AUTOMATION TEST RESULTS');
    console.log('=' .repeat(70));
    console.log(`✅ Success: ${testResults.success ? 'YES' : 'NO'}`);
    console.log(`🗂️ Tabs created: ${testResults.tabsCreated}`);
    console.log(`⚙️ Tabs processed: ${testResults.tabsProcessed}`);
    console.log(`✅ Tabs completed: ${testResults.tabsCompleted}`);
    console.log(`🔄 Parallel processing: ${testResults.parallelProcessing ? 'YES' : 'NO'}`);
    console.log(`📈 Flow phases: ${testResults.flowPhases.join(' → ')}`);
    console.log(`⏱️ Total duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`❌ Errors: ${testResults.errors.length}`);
    
    console.log('\n📅 Timing Breakdown:');
    Object.entries(testResults.timing).forEach(([phase, time]) => {
        if (typeof time === 'number') {
            console.log(`   ${phase}: ${(time / 1000).toFixed(1)}s`);
        }
    });
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ Errors:');
        testResults.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
        });
    }
    
    // Success criteria
    const successCriteria = {
        tabsCreated: testResults.tabsCreated >= 3,
        parallelProcessing: testResults.parallelProcessing,
        someTabsCompleted: testResults.tabsCompleted > 0,
        noMajorErrors: testResults.errors.length === 0
    };
    
    console.log('\n✅ Success Criteria:');
    Object.entries(successCriteria).forEach(([criterion, passed]) => {
        console.log(`   ${criterion}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const overallSuccess = Object.values(successCriteria).every(Boolean) && testResults.success;
    
    console.log(`\n🏆 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 Multi-tab automation system is working correctly!');
        console.log('   - Successfully handled multiple tab creation');
        console.log('   - Processed tabs in parallel');
        console.log('   - Coordinated complex multi-tab flows');
        console.log('   - Maintained proper tab relationships and state');
    }
    
    return testResults;
}

// Run the test
if (require.main === module) {
    testMultiTabAutomation()
        .then(results => {
            console.log('\n🎊 Multi-tab test completed!');
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test crashed:', error);
            process.exit(1);
        });
}

module.exports = testMultiTabAutomation;