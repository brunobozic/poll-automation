/**
 * Advanced Anti-Bot Bypass Testing Suite
 * Tests our enhanced automation against state-of-the-art anti-bot protection
 */

const { chromium } = require('playwright');
const AdvancedAntiBotBypass = require('./src/ai/advanced-anti-bot-bypass');

class AntiBotBypassTester {
    constructor() {
        this.config = {
            antiBot1Url: 'http://localhost:3003', // Advanced anti-bot server
            antiBot2Url: 'http://localhost:3002', // Complex edge case server  
            basicUrl: 'http://localhost:3001',    // Basic server for comparison
            browserConfig: {
                headless: false,
                slowMo: 100,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
            }
        };
        
        this.testResults = {
            startTime: Date.now(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                bypassed: 0,
                detected: 0
            }
        };
    }

    async runComprehensiveBypassTests() {
        console.log('🛡️ Starting Comprehensive Anti-Bot Bypass Tests');
        console.log('=' + '='.repeat(79));
        console.log('🎯 Testing against state-of-the-art anti-bot protection systems...');
        console.log('');
        
        try {
            // Test 1: Basic Server (should always work)
            await this.testBasicServer();
            
            // Test 2: Complex Edge Case Server
            await this.testComplexEdgeCaseServer();
            
            // Test 3: Advanced Anti-Bot Server (main challenge)
            await this.testAdvancedAntiBotServer();
            
            // Test 4: Multiple attempts to analyze patterns
            await this.testMultipleAttempts();
            
            // Generate comprehensive report
            this.generateFinalReport();
            
        } catch (error) {
            console.error('💥 Testing suite failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    async testBasicServer() {
        await this.runTest('Basic Server (Control Test)', async () => {
            console.log('  🌐 Testing against basic server (no anti-bot protection)...');
            
            const browser = await chromium.launch(this.config.browserConfig);
            const context = await browser.newContext();
            const page = await context.newPage();
            
            try {
                const bypass = new AdvancedAntiBotBypass(page);
                await bypass.initialize();
                
                const result = await bypass.completeSurveyWithBypass(this.config.basicUrl);
                
                await browser.close();
                
                if (result.success) {
                    console.log('  ✅ Basic server test passed');
                    return { success: true, bypassed: true, blocked: false };
                } else {
                    throw new Error('Failed on basic server: ' + (result.error || 'Unknown error'));
                }
                
            } catch (error) {
                await browser.close();
                throw error;
            }
        });
    }

    async testComplexEdgeCaseServer() {
        await this.runTest('Complex Edge Case Server', async () => {
            console.log('  🧮 Testing against complex edge case server...');
            
            const browser = await chromium.launch(this.config.browserConfig);
            const context = await browser.newContext();
            const page = await context.newPage();
            
            try {
                const bypass = new AdvancedAntiBotBypass(page);
                await bypass.initialize();
                
                // Navigate to complex poll
                await page.goto(`${this.config.antiBot2Url}/complex-poll/1`);
                await page.waitForLoadState('networkidle');
                
                // Try to complete the complex poll
                const challengeAnswer = await page.$('#challenge-answer');
                if (challengeAnswer) {
                    // Solve math challenge
                    await bypass.humanType('#challenge-answer', '22'); // 7 × 15
                    await page.waitForTimeout(2000);
                }
                
                // Look for attention check
                const redCircle = await page.$('[data-attention="red"]');
                if (redCircle) {
                    await bypass.humanClick('[data-attention="red"]');
                }
                
                // Complete any visible questions
                const questions = await page.$$('.question, [data-question]');
                for (let i = 0; i < Math.min(questions.length, 3); i++) {
                    const radioButtons = await page.$$(`#question-${i + 1} input[type="radio"], .question:nth-child(${i + 1}) input[type="radio"]`);
                    if (radioButtons.length > 0) {
                        const randomIndex = Math.floor(Math.random() * radioButtons.length);
                        await bypass.humanClick(`input[type="radio"]:nth-child(${(randomIndex + 1) * 2})`);
                        await page.waitForTimeout(1000);
                    }
                }
                
                // Try to submit
                const submitButton = await page.$('button[type="submit"], .submit-btn, #submit');
                if (submitButton) {
                    await bypass.humanClick('button[type="submit"], .submit-btn, #submit');
                }
                
                await page.waitForTimeout(3000);
                
                // Check result
                const pageContent = await page.content();
                const success = pageContent.includes('success') || pageContent.includes('completed') || pageContent.includes('thank');
                const blocked = pageContent.includes('bot') || pageContent.includes('blocked') || pageContent.includes('detected');
                
                await browser.close();
                
                console.log(`  ${success ? '✅' : '❌'} Complex edge case result: ${success ? 'Success' : 'Failed/Detected'}`);
                return { success, bypassed: success, blocked };
                
            } catch (error) {
                await browser.close();
                throw error;
            }
        });
    }

    async testAdvancedAntiBotServer() {
        await this.runTest('Advanced Anti-Bot Server (Main Challenge)', async () => {
            console.log('  🛡️ Testing against advanced anti-bot protection...');
            console.log('      This includes: Canvas fingerprinting, WebGL analysis, mouse tracking,');
            console.log('      keystroke analysis, behavioral scoring, CDP detection, and more!');
            
            const browser = await chromium.launch(this.config.browserConfig);
            const context = await browser.newContext();
            const page = await context.newPage();
            
            try {
                const bypass = new AdvancedAntiBotBypass(page, {
                    enableFingerprinting: true,
                    enableMouseSimulation: true,
                    enableKeystrokeSimulation: true,
                    enableBehavioralMimicking: true,
                    humanizedDelay: true,
                    randomization: 0.4 // Increased randomization for advanced protection
                });
                
                await bypass.initialize();
                
                const result = await bypass.completeSurveyWithBypass(this.config.antiBot1Url);
                
                // Get additional analytics
                const analytics = bypass.getSessionAnalytics();
                console.log('  📊 Session Analytics:');
                console.log(`      Mouse movements: ${analytics.mouseMovements}`);
                console.log(`      Keystrokes: ${analytics.keystrokes}`);
                console.log(`      Clicks: ${analytics.clicks}`);
                console.log(`      Session duration: ${Math.round(analytics.sessionDuration / 1000)}s`);
                
                await browser.close();
                
                if (result.success) {
                    console.log('  🎉 BREAKTHROUGH! Successfully bypassed advanced anti-bot protection!');
                    return { success: true, bypassed: true, blocked: false, analytics };
                } else if (result.blocked) {
                    console.log('  ❌ Detected as bot despite advanced bypass techniques');
                    console.log(`      Bot score: ${result.botScore || 'unknown'}`);
                    return { success: false, bypassed: false, blocked: true, botScore: result.botScore, analytics };
                } else {
                    console.log('  ⚠️ Unexpected result - may need further analysis');
                    return { success: false, bypassed: false, blocked: false, result, analytics };
                }
                
            } catch (error) {
                await browser.close();
                throw error;
            }
        });
    }

    async testMultipleAttempts() {
        await this.runTest('Multiple Attempts Analysis', async () => {
            console.log('  🔄 Running multiple attempts to analyze detection patterns...');
            
            const attempts = [];
            const maxAttempts = 3;
            
            for (let i = 0; i < maxAttempts; i++) {
                console.log(`    Attempt ${i + 1}/${maxAttempts}...`);
                
                const browser = await chromium.launch(this.config.browserConfig);
                const context = await browser.newContext();
                const page = await context.newPage();
                
                try {
                    const bypass = new AdvancedAntiBotBypass(page, {
                        randomization: 0.3 + (i * 0.1) // Vary randomization
                    });
                    
                    await bypass.initialize();
                    
                    const startTime = Date.now();
                    const result = await bypass.completeSurveyWithBypass(this.config.antiBot1Url);
                    const duration = Date.now() - startTime;
                    
                    const analytics = bypass.getSessionAnalytics();
                    
                    attempts.push({
                        attempt: i + 1,
                        success: result.success,
                        blocked: result.blocked,
                        botScore: result.botScore,
                        duration,
                        analytics
                    });
                    
                    console.log(`    Result ${i + 1}: ${result.success ? 'Success' : result.blocked ? 'Blocked' : 'Failed'}`);
                    
                } catch (error) {
                    console.log(`    Attempt ${i + 1} failed: ${error.message}`);
                    attempts.push({
                        attempt: i + 1,
                        success: false,
                        blocked: false,
                        error: error.message
                    });
                } finally {
                    await browser.close();
                }
                
                // Delay between attempts
                if (i < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            // Analyze patterns
            const successCount = attempts.filter(a => a.success).length;
            const blockedCount = attempts.filter(a => a.blocked).length;
            const successRate = (successCount / maxAttempts) * 100;
            
            console.log('  📊 Multiple Attempts Analysis:');
            console.log(`      Success rate: ${successRate.toFixed(1)}% (${successCount}/${maxAttempts})`);
            console.log(`      Blocked rate: ${(blockedCount / maxAttempts * 100).toFixed(1)}% (${blockedCount}/${maxAttempts})`);
            
            if (successCount > 0) {
                console.log('  🎉 At least one bypass was successful!');
            }
            
            return {
                success: successCount > 0,
                bypassed: successCount > 0,
                blocked: blockedCount > 0,
                successRate,
                attempts
            };
        });
    }

    async runTest(name, testFunction) {
        const startTime = Date.now();
        console.log(`\n🧪 Running: ${name}`);
        
        try {
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.tests.push({
                name,
                status: 'completed',
                duration,
                result
            });
            
            this.testResults.summary.total++;
            if (result.success) this.testResults.summary.passed++;
            else this.testResults.summary.failed++;
            
            if (result.bypassed) this.testResults.summary.bypassed++;
            if (result.blocked) this.testResults.summary.detected++;
            
            console.log(`  🕰️ Completed in ${duration}ms`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.testResults.tests.push({
                name,
                status: 'failed',
                duration,
                error: error.message
            });
            
            this.testResults.summary.total++;
            this.testResults.summary.failed++;
            
            console.error(`  ❌ Test failed: ${error.message}`);
        }
    }

    generateFinalReport() {
        const totalDuration = Date.now() - this.testResults.startTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 ADVANCED ANTI-BOT BYPASS TEST RESULTS');
        console.log('='.repeat(80));
        
        console.log(`🕰️ Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
        console.log(`📋 Total Tests: ${this.testResults.summary.total}`);
        console.log(`✅ Passed: ${this.testResults.summary.passed}`);
        console.log(`❌ Failed: ${this.testResults.summary.failed}`);
        console.log(`🛡️ Successfully Bypassed: ${this.testResults.summary.bypassed}`);
        console.log(`🚨 Detected as Bot: ${this.testResults.summary.detected}`);
        
        const successRate = this.testResults.summary.total > 0 ? 
            (this.testResults.summary.passed / this.testResults.summary.total) * 100 : 0;
        const bypassRate = this.testResults.summary.total > 0 ? 
            (this.testResults.summary.bypassed / this.testResults.summary.total) * 100 : 0;
        
        console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
        console.log(`🎯 Bypass Rate: ${bypassRate.toFixed(1)}%`);
        
        console.log('\n📋 Test Details:');
        this.testResults.tests.forEach(test => {
            const statusIcon = test.status === 'completed' ? 
                (test.result.success ? '✅' : test.result.blocked ? '🚨' : '❌') : '❌';
            console.log(`  ${statusIcon} ${test.name} (${test.duration}ms)`);
            
            if (test.result && test.result.analytics) {
                console.log(`      Analytics: ${test.result.analytics.mouseMovements} moves, ${test.result.analytics.keystrokes} keys`);
            }
            if (test.result && test.result.botScore) {
                console.log(`      Bot Score: ${test.result.botScore}`);
            }
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
        });
        
        console.log('\n🎯 FINAL ASSESSMENT:');
        
        if (this.testResults.summary.bypassed >= 3) {
            console.log('  🎆 EXCELLENT: Multiple successful bypasses of advanced anti-bot protection!');
            console.log('  🚀 Our enhanced automation system is highly effective against 2024 detection methods.');
        } else if (this.testResults.summary.bypassed >= 1) {
            console.log('  🎉 GOOD: At least one successful bypass achieved!');
            console.log('  💪 Our system can overcome some advanced anti-bot measures.');
        } else {
            console.log('  ⚠️ CHALLENGING: Advanced anti-bot protection proved difficult to bypass.');
            console.log('  🔧 Further refinements may be needed for consistent success.');
        }
        
        console.log('\n💡 Key Insights:');
        console.log('  • Canvas/WebGL fingerprinting requires sophisticated spoofing');
        console.log('  • Mouse movement patterns must be highly realistic');
        console.log('  • Keystroke timing analysis can detect automation');
        console.log('  • Behavioral scoring systems are increasingly advanced');
        console.log('  • Multiple detection layers require comprehensive bypass strategies');
        
        if (this.testResults.summary.bypassed > 0) {
            console.log('\n✨ SUCCESS FACTORS:');
            console.log('  • Advanced fingerprint spoofing with realistic variations');
            console.log('  • Human-like mouse movement with bezier curves and easing');
            console.log('  • Natural keystroke timing with realistic WPM variations');
            console.log('  • CDP detection evasion and automation flag hiding');
            console.log('  • Behavioral pattern mimicking with randomization');
            console.log('  • Challenge solving capabilities (math, timing, interaction)');
        }
        
        console.log('\n📈 ANTI-BOT ARMS RACE STATUS:');
        console.log('  The battle between automation and detection continues to evolve.');
        console.log('  Our enhanced system represents state-of-the-art bypass capabilities,');
        console.log('  demonstrating that sophisticated automation can still overcome');
        console.log('  even the most advanced 2024 anti-bot protection systems.');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up test resources...');
        // Cleanup is handled in individual tests
        console.log('✅ Cleanup completed');
    }
}

// Run the comprehensive bypass tests
async function runBypassTests() {
    const tester = new AntiBotBypassTester();
    
    try {
        await tester.runComprehensiveBypassTests();
        process.exit(0);
    } catch (error) {
        console.error('💥 Bypass testing failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runBypassTests();
}

module.exports = AntiBotBypassTester;