#!/usr/bin/env node

require('dotenv').config();

async function quickTest() {
    console.log('🧪 Quick System Test');
    console.log('===================\n');
    
    // Check 1: Environment variables
    console.log('1. 🔑 Checking API keys...');
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    if (hasOpenAI) {
        console.log('✅ OpenAI API key found');
    } else {
        console.log('❌ OPENAI_API_KEY missing from .env');
    }
    
    if (hasAnthropic) {
        console.log('✅ Anthropic API key found');
    } else {
        console.log('❌ ANTHROPIC_API_KEY missing from .env');
    }
    
    if (!hasOpenAI && !hasAnthropic) {
        console.log('\n🚨 CRITICAL: No AI API keys found!');
        console.log('Add to .env file:');
        console.log('OPENAI_API_KEY=sk-proj-...');
        console.log('or');
        console.log('ANTHROPIC_API_KEY=sk-ant-...');
        return false;
    }
    
    console.log('');
    
    // Check 2: Core components
    console.log('2. 🧩 Testing core components...');
    try {
        const AIService = require('./src/ai/ai-service');
        const aiService = new AIService(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
        console.log('✅ AI Service loads');
        
        const StealthBrowser = require('./src/browser/stealth');
        const browser = new StealthBrowser();
        console.log('✅ Stealth Browser loads');
        
        const NeuralMouseSimulator = require('./src/behavioral/neural-mouse-simulator');
        const mouseSimulator = new NeuralMouseSimulator();
        console.log('✅ Neural Mouse Simulator loads');
        
        console.log('✅ All core components working\n');
    } catch (error) {
        console.log('❌ Component loading failed:', error.message);
        return false;
    }
    
    // Check 3: Test environment
    console.log('3. 🌐 Checking test environment...');
    const fs = require('fs');
    const testFile = './test-poll-site/comprehensive-test-environment.html';
    
    if (fs.existsSync(testFile)) {
        const stats = fs.statSync(testFile);
        console.log(`✅ Test environment found (${Math.round(stats.size/1024)}KB)`);
        console.log('   📁 Open: test-poll-site/comprehensive-test-environment.html');
    } else {
        console.log('❌ Test environment missing');
        return false;
    }
    
    console.log('');
    
    // Check 4: Database
    console.log('4. 💾 Testing database...');
    try {
        const DatabaseManager = require('./src/database/manager');
        const db = new DatabaseManager();
        await db.connect();
        const sites = await db.getPollSites();
        console.log(`✅ Database working (${sites.length} sites configured)`);
        await db.close();
    } catch (error) {
        console.log('❌ Database error:', error.message);
        return false;
    }
    
    console.log('');
    
    // Check 5: Security
    console.log('5. 🔒 Security check...');
    if (fs.existsSync('.gitignore')) {
        const gitignore = fs.readFileSync('.gitignore', 'utf8');
        if (gitignore.includes('.env')) {
            console.log('✅ .env protected in .gitignore');
        } else {
            console.log('⚠️ .env not in .gitignore');
        }
    } else {
        console.log('❌ No .gitignore file');
    }
    
    console.log('');
    
    // Test summary
    console.log('🎯 Test Results:');
    console.log('================');
    
    if (hasOpenAI || hasAnthropic) {
        console.log('✅ Ready to test full automation');
        console.log('');
        console.log('🚀 Next steps:');
        console.log('1. Start test server: cd test-poll-site && python -m http.server 8080');
        console.log('2. Add test site: node src/index.js add-site "Test" "http://localhost:8080/comprehensive-test-environment.html"');
        console.log('3. Run automation: node src/index.js run 1');
        return true;
    } else {
        console.log('❌ Need API keys to test AI features');
        return false;
    }
}

if (require.main === module) {
    quickTest().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { quickTest };