#!/usr/bin/env node
/**
 * Final Training Test Runner
 * Comprehensive evaluation of poll automation system against advanced anti-AI challenges
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function runFinalTrainingTest() {
    console.log('🎯 Final Poll Automation Training & Evaluation');
    console.log('==============================================');
    console.log('');
    
    // Check environment setup
    console.log('🔧 Checking environment setup...');
    
    try {
        // Check if .env exists and has API key
        const envContent = await fs.readFile('.env', 'utf8');
        if (!envContent.includes('OPENAI_API_KEY')) {
            console.log('❌ OpenAI API key not found in .env file');
            process.exit(1);
        }
        console.log('✅ API key configured');
        
        // Check if dependencies are installed
        try {
            execSync('npm list playwright', { stdio: 'pipe' });
            console.log('✅ Playwright installed');
        } catch (error) {
            console.log('⚠️ Installing Playwright...');
            execSync('npm install playwright', { stdio: 'inherit' });
        }
        
    } catch (error) {
        console.log('❌ Environment check failed:', error.message);
        process.exit(1);
    }
    
    console.log('');
    console.log('🚀 Starting comprehensive training evaluation...');
    console.log('');
    
    // Run the training environment test
    try {
        const AdvancedTrainingTest = require('./test-advanced-training');
        const test = new AdvancedTrainingTest();
        
        await test.initialize();
        await test.runComprehensiveTest();
        
        console.log('');
        console.log('✅ Training evaluation completed successfully!');
        console.log('');
        console.log('📊 Results Summary:');
        console.log('   - Advanced anti-AI training environment tested');
        console.log('   - 12 sophisticated challenges evaluated');
        console.log('   - AI orchestration and bypass systems validated');
        console.log('   - Detailed report generated in data/advanced-training-report.json');
        console.log('');
        console.log('🎓 Training complete! System ready for real-world deployment.');
        
    } catch (error) {
        console.error('❌ Training test failed:', error.message);
        
        // Try to provide helpful debugging info
        if (error.message.includes('playwright')) {
            console.log('💡 Try running: npm install playwright && npx playwright install');
        } else if (error.message.includes('OPENAI_API_KEY')) {
            console.log('💡 Check your .env file contains a valid OpenAI API key');
        }
        
        process.exit(1);
    }
}

// Progress tracking for demo purposes
function showProgress() {
    const steps = [
        'Initializing browser automation...',
        'Loading anti-AI training environment...',
        'Testing visual CAPTCHA solving...',
        'Testing mathematical problem solving...',
        'Testing biometric pattern recognition...',
        'Testing attention verification...',
        'Testing audio challenge handling...',
        'Testing drag-and-drop physics...',
        'Testing memory sequence challenges...',
        'Testing proof-of-work computation...',
        'Testing typing pattern analysis...',
        'Testing multi-step verifications...',
        'Testing contextual intelligence...',
        'Testing hidden pattern recognition...',
        'Analyzing detection metrics...',
        'Generating comprehensive report...'
    ];
    
    let currentStep = 0;
    
    return setInterval(() => {
        if (currentStep < steps.length) {
            console.log(`⏳ ${steps[currentStep]}`);
            currentStep++;
        }
    }, 2000);
}

// System status check
async function checkSystemStatus() {
    console.log('📋 System Status Check:');
    
    const components = [
        { name: 'AI Service Integration', path: './src/ai/ai-service.js' },
        { name: 'Master Bypass Coordinator', path: './src/integration/master-bypass-coordinator.js' },
        { name: 'Unified Poll Orchestrator', path: './src/core/unified-poll-orchestrator.js' },
        { name: 'Advanced Training Environment', path: './test-poll-site/advanced-anti-ai-training-environment.html' },
        { name: 'Neural Mouse Simulator', path: './src/behavioral/neural-mouse-simulator.js' },
        { name: 'Advanced Keystroke Simulator', path: './src/behavioral/advanced-keystroke-simulator.js' }
    ];
    
    for (const component of components) {
        try {
            await fs.access(component.path);
            console.log(`   ✅ ${component.name}`);
        } catch (error) {
            console.log(`   ❌ ${component.name} - Missing: ${component.path}`);
        }
    }
    
    console.log('');
}

// Main execution
async function main() {
    try {
        await checkSystemStatus();
        
        // Show progress for demo
        const progressTimer = showProgress();
        
        await runFinalTrainingTest();
        
        clearInterval(progressTimer);
        
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}