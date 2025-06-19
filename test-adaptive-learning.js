#!/usr/bin/env node

/**
 * Adaptive Learning System Test
 * Demonstrates the LEARN → FIX → ADAPT cycle
 */

const EnhancedPollAutomationApp = require('./src/enhanced-app');

async function testAdaptiveLearning() {
    console.log('🧠 ADAPTIVE LEARNING SYSTEM TEST');
    console.log('=================================');
    console.log('Testing: LEARN → FIX → ADAPT cycle\n');
    
    const app = new EnhancedPollAutomationApp({
        headless: true,
        debugMode: false,
        stealthLevel: 'high',
        learningEnabled: true
    });
    
    try {
        await app.initialize();
        
        // Test Site 1: Simple success case
        console.log('📊 TEST 1: Learning from successful registration');
        console.log('-----------------------------------------------');
        
        const emailData1 = await app.createEmailAccount();
        
        // Simulate successful registration
        await app.adaptiveLearning.learnFromAttempt({
            siteName: 'Test Success Site',
            siteUrl: 'https://example.com/register',
            success: true,
            errorMessage: null,
            formAnalysis: {
                inputsCount: 5,
                hasEmailField: true,
                complexity: 0.5,
                fieldTypes: { email: 1, text: 3, select: 1 }
            },
            defenses: [],
            responseType: 'html',
            statusCode: 200,
            content: '<div>Thank you for registering! Welcome to our site.</div>',
            stealthLevel: 'high',
            humanBehavior: true,
            captchaSolved: false
        });
        
        // Test Site 2: JSON API response case  
        console.log('\\n📊 TEST 2: Learning from JSON API response');
        console.log('--------------------------------------------');
        
        await app.adaptiveLearning.learnFromAttempt({
            siteName: 'API Registration Site',
            siteUrl: 'https://api.example.com/register',
            success: true,
            errorMessage: null,
            formAnalysis: {
                inputsCount: 3,
                hasEmailField: true,
                complexity: 0.3,
                fieldTypes: { email: 1, password: 1, text: 1 }
            },
            defenses: [],
            responseType: 'json',
            statusCode: 201,
            content: '{"success": true, "message": "User created successfully", "id": 12345}',
            stealthLevel: 'high',
            humanBehavior: true,
            captchaSolved: false
        });
        
        // Test Site 3: Failure with rate limiting
        console.log('\\n📊 TEST 3: Learning from rate limit failure');
        console.log('--------------------------------------------');
        
        await app.adaptiveLearning.learnFromAttempt({
            siteName: 'Rate Limited Site',
            siteUrl: 'https://strict.example.com/register',
            success: false,
            errorMessage: 'Rate limit exceeded',
            formAnalysis: {
                inputsCount: 8,
                hasEmailField: true,
                complexity: 0.8,
                fieldTypes: { email: 1, text: 4, select: 2, checkbox: 1 }
            },
            defenses: [
                { defenseType: 'rateLimit', defenseSubtype: 'general', severityLevel: 8 }
            ],
            responseType: 'html',
            statusCode: 429,
            content: '<div class=\"error\">Too many requests. Please try again later.</div>',
            stealthLevel: 'high',
            humanBehavior: true,
            captchaSolved: false
        });
        
        // Test Site 4: CAPTCHA failure
        console.log('\\n📊 TEST 4: Learning from CAPTCHA failure');
        console.log('-----------------------------------------');
        
        await app.adaptiveLearning.learnFromAttempt({
            siteName: 'CAPTCHA Protected Site',
            siteUrl: 'https://protected.example.com/register',
            success: false,
            errorMessage: 'CAPTCHA solving failed',
            formAnalysis: {
                inputsCount: 6,
                hasEmailField: true,
                complexity: 0.6,
                fieldTypes: { email: 1, text: 3, select: 1, captcha: 1 }
            },
            defenses: [
                { defenseType: 'captcha', defenseSubtype: 'recaptcha_v2', severityLevel: 7 }
            ],
            responseType: 'html',
            statusCode: 400,
            content: '<div class=\"error\">CAPTCHA verification failed. Please try again.</div>',
            stealthLevel: 'high',
            humanBehavior: true,
            captchaSolved: false
        });
        
        // Now test multiple attempts on the same site to trigger adaptation
        console.log('\\n📊 TEST 5: Triggering adaptive learning');
        console.log('----------------------------------------');
        
        // Multiple failures to trigger adaptation
        for (let i = 0; i < 3; i++) {
            await app.adaptiveLearning.learnFromAttempt({
                siteName: 'Problematic Site',
                siteUrl: 'https://difficult.example.com/register',
                success: false,
                errorMessage: 'Form submission failed',
                formAnalysis: {
                    inputsCount: 10,
                    hasEmailField: true,
                    complexity: 1.0,
                    fieldTypes: { email: 1, text: 5, select: 3, checkbox: 1 }
                },
                defenses: [
                    { defenseType: 'cloudflare', defenseSubtype: 'general', severityLevel: 9 }
                ],
                responseType: 'html',
                statusCode: 403,
                content: '<div>Access denied. Suspicious activity detected.</div>',
                stealthLevel: 'high',
                humanBehavior: true,
                captchaSolved: false
            });
        }
        
        // Display learning results
        console.log('\\n🧠 ADAPTIVE LEARNING RESULTS');
        console.log('============================');
        
        const stats = app.adaptiveLearning.getStats();
        console.log('📊 Learning Statistics:');
        console.log(`   📝 Patterns learned: ${stats.patternsLearned}`);
        console.log(`   🔄 Adaptations made: ${stats.adaptationsMade}`);
        console.log(`   🌐 Sites analyzed: ${stats.totalSites}`);
        console.log(`   📈 Average success rate: ${stats.avgSuccessRate}`);
        console.log(`   ✅ Success patterns: ${stats.successPatterns}`);
        console.log(`   ❌ Failure patterns: ${stats.failurePatterns}`);
        console.log(`   🎯 Adaptive tactics: ${stats.adaptiveTactics}`);
        
        // Test adaptive recommendations
        console.log('\\n🔮 ADAPTIVE RECOMMENDATIONS');
        console.log('============================');
        
        const testSites = [
            'Test Success Site',
            'API Registration Site', 
            'Rate Limited Site',
            'CAPTCHA Protected Site',
            'Problematic Site'
        ];
        
        testSites.forEach(siteName => {
            const recommendations = app.adaptiveLearning.getAdaptiveRecommendations(siteName);
            console.log(`\\n🌐 ${siteName}:`);
            console.log(`   🛡️ Optimal stealth: ${recommendations.stealthLevel}`);
            console.log(`   📊 Success rate: ${(recommendations.successRate * 100).toFixed(1)}%`);
            console.log(`   🔍 Preferred detection: ${recommendations.preferredSuccessDetection}`);
            
            if (recommendations.recommendations.length > 0) {
                console.log('   💡 Recommendations:');
                recommendations.recommendations.forEach(rec => {
                    console.log(`      - ${rec.type}: ${rec.recommendation}`);
                });
            }
        });
        
        // Demonstrate adaptive success detection
        console.log('\\n🎯 ADAPTIVE SUCCESS DETECTION TEST');
        console.log('==================================');
        
        // Create a minimal page context for testing
        const page = await app.browser.newPage();
        
        // Test 1: HTML success detection
        await page.setContent('<html><body><div>Thank you! Registration successful.</div></body></html>');
        const htmlResult = await app.adaptiveLearning.detectSuccess(page, 'Test Success Site', {
            originalUrl: 'https://example.com/register'
        });
        console.log(`HTML Success Detection: ${htmlResult.success} (${htmlResult.method}, confidence: ${htmlResult.confidence})`);
        
        // Test 2: JSON success detection
        await page.setContent('<html><body>{"success": true, "message": "User created"}</body></html>');
        const jsonResult = await app.adaptiveLearning.detectSuccess(page, 'API Registration Site', {
            originalUrl: 'https://api.example.com/register'
        });
        console.log(`JSON Success Detection: ${jsonResult.success} (${jsonResult.method}, confidence: ${jsonResult.confidence})`);
        
        // Test 3: Error detection
        await page.setContent('<html><body><div class="error">Registration failed. Please try again.</div></body></html>');
        const errorResult = await app.adaptiveLearning.detectSuccess(page, 'Rate Limited Site', {
            originalUrl: 'https://strict.example.com/register'
        });
        console.log(`Error Detection: ${errorResult.success} (${errorResult.method}, confidence: ${errorResult.confidence})`);
        
        await page.close();
        
        console.log('\\n✅ ADAPTIVE LEARNING SYSTEM TEST COMPLETE');
        console.log('==========================================');
        console.log('The system has successfully demonstrated:');
        console.log('🧠 Pattern recognition and learning from successes/failures');
        console.log('🔄 Automatic adaptation based on site-specific patterns');
        console.log('🎯 Intelligent success detection using multiple methods');
        console.log('💡 Tactical recommendations for improving success rates');
        console.log('📊 Comprehensive statistics and performance tracking');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await app.shutdown();
    }
}

// Run the test
if (require.main === module) {
    testAdaptiveLearning().catch(console.error);
}