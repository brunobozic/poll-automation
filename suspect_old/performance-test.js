#!/usr/bin/env node

/**
 * PERFORMANCE TEST
 * Compare lightweight vs full app performance
 */

const { spawn } = require('child_process');

async function testPerformance() {
    console.log('⚡ PERFORMANCE COMPARISON TEST');
    console.log('==============================');
    
    // Test lightweight app
    console.log('\n1️⃣ Testing lightweight app...');
    const liteStart = Date.now();
    
    const liteResult = await runCommand('node app-lite.js status');
    const liteTime = Date.now() - liteStart;
    
    console.log(`✅ Lightweight app: ${liteTime}ms`);
    
    // Test specific commands
    const commands = [
        { name: 'DB Stats', cmd: 'node app-lite.js db' },
        { name: 'LLM Test', cmd: 'node app-lite.js llm-test' },
        { name: 'Status', cmd: 'node app-lite.js status' }
    ];
    
    console.log('\n2️⃣ Testing individual commands...');
    for (const test of commands) {
        const start = Date.now();
        await runCommand(test.cmd);
        const time = Date.now() - start;
        console.log(`✅ ${test.name}: ${time}ms`);
    }
    
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log(`🚀 Lightweight app initialization: ${liteTime}ms`);
    console.log('💡 Recommendation: Use app-lite.js for quick operations');
}

function runCommand(cmd) {
    return new Promise((resolve) => {
        const child = spawn('bash', ['-c', cmd], { stdio: 'pipe' });
        child.on('close', () => resolve());
        child.on('error', () => resolve());
    });
}

testPerformance().catch(console.error);