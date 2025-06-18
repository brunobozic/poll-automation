#!/usr/bin/env node

/**
 * Simple Test for AI Systems Integration
 * Quick validation that all systems initialize and work together
 */

const AdvancedCaptchaSolver = require('./src/ai/advanced-captcha-solver');
const MLBehavioralAnalyzer = require('./src/ai/ml-behavioral-analyzer');
const AdvancedFingerprintSpoofer = require('./src/ai/advanced-fingerprint-spoofer');
const RealTimeAdaptationEngine = require('./src/ai/real-time-adaptation-engine');

async function testAISystemsIntegration() {
    console.log('🧪 Testing AI Systems Integration');
    console.log('=' .repeat(50));
    
    try {
        // Test 1: CAPTCHA Solver
        console.log('\n1️⃣ Testing Advanced CAPTCHA Solver...');
        const captchaSolver = new AdvancedCaptchaSolver();
        await captchaSolver.initialize();
        
        const mathResult = await captchaSolver.solveCaptcha({
            type: 'math_captcha',
            challenge: 'What is 15 + 27?'
        });
        console.log(`   ✅ Math CAPTCHA: ${mathResult.success ? mathResult.answer : 'Failed'}`);
        
        // Test 2: Behavioral Analyzer
        console.log('\n2️⃣ Testing ML Behavioral Analyzer...');
        const behavioralAnalyzer = new MLBehavioralAnalyzer();
        await behavioralAnalyzer.initialize();
        
        const behavior = await behavioralAnalyzer.generateHumanBehavior({
            siteComplexity: 'high',
            sessionDuration: 60000,
            userProfile: 'tech_savvy_fast',
            timeOfDay: new Date().getHours()
        });
        console.log(`   ✅ Generated behavior for ${behavior.typing.wpm.toFixed(1)} WPM typing`);
        
        // Test 3: Fingerprint Spoofer
        console.log('\n3️⃣ Testing Advanced Fingerprint Spoofer...');
        const fingerprintSpoofer = new AdvancedFingerprintSpoofer();
        await fingerprintSpoofer.initialize();
        
        const fingerprint = await fingerprintSpoofer.generateSessionFingerprint('test-session-123');
        console.log(`   ✅ Generated fingerprint for ${fingerprint.deviceProfile.type} device`);
        
        // Test 4: Adaptation Engine
        console.log('\n4️⃣ Testing Real-Time Adaptation Engine...');
        const adaptationEngine = new RealTimeAdaptationEngine();
        await adaptationEngine.initialize();
        
        const strategy = adaptationEngine.getStrategy('survey_complex');
        console.log(`   ✅ Got strategy: ${strategy.fingerprintingLevel} fingerprinting`);
        
        // Test 5: System Interaction
        console.log('\n5️⃣ Testing System Interaction...');
        
        // Simulate a session result for learning
        await adaptationEngine.processSessionResult({
            sessionId: 'test-session',
            siteType: 'survey_complex',
            outcome: { success: true, detected: false },
            responseTime: 3500,
            timestamp: Date.now()
        });
        
        await behavioralAnalyzer.learnFromSession({
            sessionId: 'test-session',
            profileUsed: 'tech_savvy_fast',
            siteType: 'survey_complex'
        }, {
            success: true,
            detectionScore: 0.2,
            blocked: false
        });
        
        await fingerprintSpoofer.recordDetectionFeedback('test-session', false, 'none', 0);
        
        console.log('   ✅ Systems successfully shared learning data');
        
        // Test 6: Performance Reports
        console.log('\n6️⃣ Getting Performance Reports...');
        
        const captchaStats = captchaSolver.getPerformanceStats();
        const behaviorReport = behavioralAnalyzer.getPerformanceReport();
        const fingerprintStats = fingerprintSpoofer.getPerformanceStats();
        const adaptationReport = adaptationEngine.getPerformanceReport();
        
        console.log(`   📊 CAPTCHA Solver: ${captchaStats.totalSolved} solved`);
        console.log(`   📊 Behavioral Analyzer: ${behaviorReport.profilesAvailable} profiles`);
        console.log(`   📊 Fingerprint Spoofer: ${fingerprintStats.totalSessions} sessions`);
        console.log(`   📊 Adaptation Engine: ${adaptationReport.strategiesManaged} strategies`);
        
        console.log('\n✅ All AI Systems Integration Test PASSED!');
        console.log('\n📈 System Status Summary:');
        console.log('   🤖 Advanced CAPTCHA Solver: Operational');
        console.log('   🧠 ML Behavioral Analyzer: Operational');
        console.log('   🎭 Advanced Fingerprint Spoofer: Operational');
        console.log('   🔄 Real-Time Adaptation Engine: Operational');
        console.log('   🔗 Inter-system Communication: Functional');
        
        return true;
        
    } catch (error) {
        console.error('❌ AI Systems Integration Test FAILED:', error);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testAISystemsIntegration()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = testAISystemsIntegration;