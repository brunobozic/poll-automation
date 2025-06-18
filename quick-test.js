#!/usr/bin/env node

/**
 * Quick Test for Poll Automation System
 * Tests core components without running the full automation
 */

const path = require('path');

async function quickTest() {
    console.log('🔍 Running Quick Component Tests\n');
    
    try {
        // Test 1: Database Connection
        console.log('1️⃣ Testing database connection...');
        const DatabaseManager = require('./src/database/manager');
        const db = new DatabaseManager();
        await db.connect();
        console.log('   ✅ Database connected successfully');
        await db.close();
        
        // Test 2: Stealth Browser (skip in WSL)
        console.log('2️⃣ Testing stealth browser...');
        const StealthBrowser = require('./src/browser/stealth');
        const browser = new StealthBrowser();
        try {
            await browser.launch();
            console.log('   ✅ Stealth browser initialized');
            await browser.close();
        } catch (error) {
            if (error.message.includes('dependencies to run browsers')) {
                console.log('   ⚠️  Stealth browser needs system dependencies (use: sudo npx playwright install-deps)');
            } else {
                throw error;
            }
        }
        
        // Test 3: Human Simulation
        console.log('3️⃣ Testing human behavior simulation...');
        const HumanSimulation = require('./src/behavior/human-simulation');
        const humanSim = new HumanSimulation();
        const thinkingTime = humanSim.calculateThinkingTime('multiple-choice', 'medium');
        console.log(`   ✅ Human simulation working (thinking time: ${thinkingTime}ms)`);
        
        // Test 4: Trick Question Detection
        console.log('4️⃣ Testing trick question detection...');
        const TrickQuestionDetector = require('./src/detection/trick-questions');
        const detector = new TrickQuestionDetector();
        const testQuestion = 'List all the mayors of Croatia in chronological order';
        const analysis = detector.detectTrickQuestion(testQuestion);
        console.log(`   ✅ Trick detection working (detected: ${analysis.isTrick})`);
        
        // Test 5: Encryption Manager
        console.log('5️⃣ Testing encryption manager...');
        const EncryptionManager = require('./src/security/encryption');
        const encManager = new EncryptionManager();
        const testText = 'test-password';
        const encrypted = encManager.encrypt(testText);
        const decrypted = encManager.decrypt(encrypted);
        console.log(`   ✅ Encryption working (${testText} → encrypted → ${decrypted})`);
        
        // Test 6: Proxy Manager
        console.log('6️⃣ Testing proxy manager...');
        const ProxyManager = require('./src/proxy/manager');
        const proxyManager = new ProxyManager();
        console.log('   ✅ Proxy manager initialized');
        
        // Test 7: Redirect Handler
        console.log('7️⃣ Testing redirect handler...');
        const RedirectHandler = require('./src/services/redirect-handler');
        const redirectHandler = new RedirectHandler();
        await redirectHandler.initialize();
        console.log('   ✅ Redirect handler initialized');
        await redirectHandler.cleanup();
        
        // Test 8: Question Extractor
        console.log('8️⃣ Testing question extractor...');
        const QuestionExtractor = require('./src/agents/question-extractor');
        const extractor = new QuestionExtractor();
        console.log('   ✅ Question extractor initialized');
        
        // Test 9: Form Controller
        console.log('9️⃣ Testing form controller...');
        const FormController = require('./src/controllers/form-controller');
        const formController = new FormController();
        console.log('   ✅ Form controller initialized');
        
        // Test 10: Demo Site Structure
        console.log('🔟 Testing demo site structure...');
        const fs = require('fs');
        const demoSiteExists = fs.existsSync(path.join(__dirname, 'demo-poll-site', 'server.js'));
        const viewsExist = fs.existsSync(path.join(__dirname, 'demo-poll-site', 'views', 'poll.ejs'));
        const stylesExist = fs.existsSync(path.join(__dirname, 'demo-poll-site', 'public', 'css', 'style.css'));
        
        if (demoSiteExists && viewsExist && stylesExist) {
            console.log('   ✅ Demo site structure complete');
        } else {
            throw new Error('Demo site structure incomplete');
        }
        
        console.log('\n🎉 All component tests passed!');
        console.log('\n📋 System Overview:');
        console.log('   • Database: SQLite with encrypted credentials');
        console.log('   • Browser: Playwright with stealth features');
        console.log('   • Detection: Anti-bot question detection');
        console.log('   • Simulation: Human behavior patterns');
        console.log('   • Security: Proxy rotation and credential encryption');
        console.log('   • Redirects: Advanced redirect and modal handling');
        console.log('   • Demo Site: Complete testing environment');
        console.log('\n🚀 Ready for full automation testing!');
        
    } catch (error) {
        console.error('\n❌ Component test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    quickTest().catch(console.error);
}

module.exports = { quickTest };