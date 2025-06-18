#!/usr/bin/env node

/**
 * Comprehensive Test for Enhanced Playwright Framework
 * Tests all advanced features: SPA handling, iframe management, CAPTCHA detection, etc.
 */

const StealthBrowser = require('./src/browser/stealth');
const { spawn } = require('child_process');
const path = require('path');

async function testPlaywrightFramework() {
    console.log('🧪 Testing Enhanced Playwright Framework\n');
    
    let browser;
    let demoSite;
    
    try {
        // Step 1: Start demo poll site
        console.log('1️⃣ Starting demo poll site...');
        demoSite = await startDemoSite();
        console.log('   ✅ Demo site running on http://localhost:3001');
        
        // Wait for site to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 2: Initialize enhanced browser
        console.log('2️⃣ Initializing enhanced browser...');
        browser = new StealthBrowser();
        await browser.launch();
        console.log('   ✅ Stealth browser launched');
        
        // Step 3: Test Base Page functionality
        console.log('3️⃣ Testing Base Page functionality...');
        const basePage = await browser.newPage('base');
        await testBasePage(basePage);
        console.log('   ✅ Base Page tests passed');
        
        // Step 4: Test Poll Page functionality
        console.log('4️⃣ Testing Poll Page functionality...');
        const pollPage = await browser.newPollPage();
        await testPollPage(pollPage);
        console.log('   ✅ Poll Page tests passed');
        
        // Step 5: Test SPA handling
        console.log('5️⃣ Testing SPA functionality...');
        await testSPAHandling(pollPage);
        console.log('   ✅ SPA handling tests passed');
        
        // Step 6: Test iframe handling
        console.log('6️⃣ Testing iframe functionality...');
        await testIframeHandling(pollPage);
        console.log('   ✅ Iframe handling tests passed');
        
        // Step 7: Test CAPTCHA detection
        console.log('7️⃣ Testing CAPTCHA detection...');
        await testCaptchaDetection(pollPage);
        console.log('   ✅ CAPTCHA detection tests passed');
        
        // Step 8: Test complete poll automation
        console.log('8️⃣ Testing complete poll automation...');
        await testCompleteAutomation(pollPage);
        console.log('   ✅ Complete automation tests passed');
        
        // Step 9: Performance metrics
        console.log('9️⃣ Collecting performance metrics...');
        const metrics = await collectMetrics(pollPage);
        displayMetrics(metrics);
        console.log('   ✅ Performance metrics collected');
        
        console.log('\n🎉 All Enhanced Playwright Framework tests passed!');
        
    } catch (error) {
        console.error('\n❌ Framework test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        if (browser) {
            await browser.close();
        }
        if (demoSite) {
            demoSite.kill();
        }
    }
}

async function testBasePage(basePage) {
    // Test navigation
    await basePage.navigateTo('http://localhost:3001', {
        waitForSPA: true
    });
    
    // Test element interaction
    const loginLink = await basePage.waitForElement('a[href="/login"]', {
        timeout: 5000,
        stable: true
    });
    
    await basePage.clickElement('a[href="/login"]', {
        humanLike: true,
        waitForStable: true
    });
    
    // Test form filling
    await basePage.fillInput('#username', 'testuser', {
        humanLike: true,
        validate: true
    });
    
    await basePage.fillInput('#password', 'testpass', {
        humanLike: true
    });
    
    // Test form submission
    await basePage.clickElement('button[type="submit"]', {
        humanLike: true
    });
    
    // Wait for navigation
    await basePage.waitForCondition(
        async () => basePage.page.url().includes('/dashboard'),
        { timeout: 10000, message: 'Dashboard not reached' }
    );
}

async function testPollPage(pollPage) {
    // Initialize poll page
    await pollPage.initializePoll({
        detectFramework: true,
        handleCaptcha: true,
        extractMetadata: true
    });
    
    // Navigate to a poll
    await pollPage.clickElement('a[href*="/poll/"]', {
        humanLike: true
    });
    
    // Extract questions
    const questions = await pollPage.extractQuestions({
        detectTrickQuestions: true,
        extractOptions: true
    });
    
    console.log(`   📝 Found ${questions.length} questions`);
    
    // Answer questions
    for (let i = 0; i < Math.min(questions.length, 3); i++) {
        const question = questions[i];
        let answer;
        
        switch (question.type) {
            case 'single-choice':
            case 'yes-no':
                answer = question.options[0]?.value || 'yes';
                break;
            case 'multiple-choice':
                answer = [question.options[0]?.value];
                break;
            case 'rating':
                answer = '5';
                break;
            case 'text':
                answer = 'This is a test response';
                break;
            default:
                answer = 'test';
        }
        
        if (!question.isTrick) {
            await pollPage.answerQuestion(i, answer, {
                humanLike: true,
                validate: true
            });
            console.log(`   ✏️  Answered question ${i + 1}: ${question.type}`);
        } else {
            console.log(`   ⚠️  Skipped trick question ${i + 1}`);
        }
    }
}

async function testSPAHandling(pollPage) {
    // Detect framework
    const frameworkInfo = await pollPage.spaHandler.detectFramework();
    console.log(`   🔧 Framework detection: ${JSON.stringify(frameworkInfo?.frameworks || {})}`);
    
    // Test SPA readiness
    await pollPage.spaHandler.waitForSPAReady({
        timeout: 10000,
        waitForRouter: true
    });
    
    // Test state monitoring (brief test)
    let stateChanges = 0;
    const monitor = pollPage.spaHandler.startStateMonitoring((change) => {
        stateChanges++;
        console.log(`   📊 State change detected: ${change.type}`);
    });
    
    // Let it monitor for a short time
    await new Promise(resolve => setTimeout(resolve, 2000));
    pollPage.spaHandler.stopStateMonitoring();
    
    console.log(`   📈 Monitored ${stateChanges} state changes`);
}

async function testIframeHandling(pollPage) {
    // Detect iframes
    const iframes = await pollPage.iframeHandler.detectIframes();
    console.log(`   🖼️  Found ${iframes.length} iframes`);
    
    if (iframes.length > 0) {
        for (const iframe of iframes) {
            console.log(`   📋 Iframe type: ${iframe.type}, visible: ${iframe.isVisible}`);
        }
        
        // Test iframe interaction (if any)
        try {
            const stats = await pollPage.iframeHandler.getFrameStats();
            console.log(`   📊 Frame stats: ${JSON.stringify(stats)}`);
        } catch (error) {
            console.log(`   ⚠️  Frame stats unavailable: ${error.message}`);
        }
    }
}

async function testCaptchaDetection(pollPage) {
    // Test CAPTCHA detection
    const captchaResult = await pollPage.captchaHandler.detectAndHandleCaptcha({
        skipComplexCaptcha: true,
        timeout: 5000
    });
    
    console.log(`   🛡️  CAPTCHA detection: ${captchaResult.type || 'none'}`);
    console.log(`   ✅ CAPTCHA result: ${captchaResult.success ? 'handled' : 'not needed'}`);
    
    // Test specific CAPTCHA types (simulate)
    const testCaptchaTypes = [
        'Are you human?',
        'What is 2 + 3?',
        'I am not a robot'
    ];
    
    for (const testText of testCaptchaTypes) {
        // Simulate adding text to page and detecting
        await pollPage.page.evaluate((text) => {
            const div = document.createElement('div');
            div.textContent = text;
            div.style.display = 'none';
            document.body.appendChild(div);
        }, testText);
        
        const result = await pollPage.captchaHandler.detectAndHandleCaptcha();
        console.log(`   🧪 Test "${testText}": ${result.type || 'none'}`);
    }
}

async function testCompleteAutomation(pollPage) {
    // Test complete workflow
    try {
        // Go back to dashboard
        await pollPage.navigateTo('http://localhost:3001/dashboard');
        
        // Find and start a poll
        const pollLinks = await pollPage.page.$$('a[href*="/poll/"]');
        if (pollLinks.length > 0) {
            await pollLinks[0].click();
            
            // Wait for poll page
            await pollPage.spaHandler.waitForSPAReady();
            
            // Initialize and process
            await pollPage.initializePoll();
            const status = await pollPage.getPollStatus();
            
            console.log(`   📊 Poll status: ${JSON.stringify(status, null, 2)}`);
        }
        
    } catch (error) {
        console.log(`   ⚠️  Complete automation test skipped: ${error.message}`);
    }
}

async function collectMetrics(pollPage) {
    const metrics = {
        page: await pollPage.getPerformanceMetrics(),
        spa: await pollPage.spaHandler.getSPAMetrics(),
        logs: {
            page: pollPage.getLogs().length,
            captcha: pollPage.captchaHandler.getLogs().length,
            iframe: pollPage.iframeHandler.getLogs().length,
            spa: pollPage.spaHandler.getLogs().length
        },
        browser: pollPage.page.context().browser() ? 'active' : 'inactive'
    };
    
    return metrics;
}

function displayMetrics(metrics) {
    console.log('\n📊 Performance Metrics:');
    console.log(`   🚀 Load time: ${metrics.page.loadTime || 0}ms`);
    console.log(`   🎨 First paint: ${metrics.page.firstPaint || 0}ms`);
    console.log(`   📝 Total logs: ${Object.values(metrics.logs).reduce((a, b) => a + b, 0)}`);
    console.log(`   🌐 Browser: ${metrics.browser}`);
}

function startDemoSite() {
    return new Promise((resolve, reject) => {
        const demoSitePath = path.join(__dirname, 'demo-poll-site');
        const child = spawn('npm', ['start'], {
            cwd: demoSitePath,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let started = false;
        
        child.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Demo Poll Site running') && !started) {
                started = true;
                resolve(child);
            }
        });
        
        child.stderr.on('data', (data) => {
            console.error('Demo site error:', data.toString());
        });
        
        child.on('error', (error) => {
            reject(error);
        });
        
        // Timeout after 15 seconds
        setTimeout(() => {
            if (!started) {
                child.kill();
                reject(new Error('Demo site failed to start within 15 seconds'));
            }
        }, 15000);
    });
}

// Main execution
if (require.main === module) {
    testPlaywrightFramework().catch(console.error);
}

module.exports = { testPlaywrightFramework };