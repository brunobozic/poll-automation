#!/usr/bin/env node

/**
 * QUICK ERROR DETECTION
 * Run targeted tests to find and log specific errors
 */

const { spawn } = require('child_process');

async function runQuickErrorDetection() {
    console.log('🔍 QUICK ERROR DETECTION');
    console.log('=========================');
    
    const tests = [
        {
            name: 'LLM Service Health',
            command: 'curl -s http://localhost:5000/health',
            critical: true
        },
        {
            name: 'App Help',
            command: 'node app.js --help',
            critical: true
        },
        {
            name: 'Database Stats',
            command: 'node app.js db stats',
            critical: false
        },
        {
            name: 'System Status',
            command: 'node app.js status',
            critical: false
        },
        {
            name: 'Email Creation',
            command: 'node app.js create-email --enhanced',
            critical: false
        },
        {
            name: 'Form Analysis',
            command: 'node app.js analyze --site https://surveyplanet.com --enhanced',
            critical: false
        }
    ];
    
    let results = [];
    
    for (const test of tests) {
        console.log(`\n📋 Testing: ${test.name}`);
        console.log(`Command: ${test.command}`);
        
        const result = await runTest(test);
        results.push(result);
        
        if (result.success) {
            console.log(`✅ ${test.name} - PASSED`);
        } else {
            console.log(`❌ ${test.name} - FAILED`);
            console.log(`   Exit Code: ${result.exitCode}`);
            if (result.stderr) {
                console.log(`   Error: ${result.stderr.substring(0, 200)}...`);
            }
            
            // If critical test fails, stop
            if (test.critical) {
                console.log(`💥 CRITICAL TEST FAILED - STOPPING`);
                break;
            }
        }
    }
    
    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 QUICK TEST SUMMARY:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${(passed / results.length * 100).toFixed(1)}%`);
    
    // Show detailed errors
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        console.log(`\n🔍 DETAILED ERRORS:`);
        failures.forEach((failure, index) => {
            console.log(`\n${index + 1}. ${failure.test}:`);
            console.log(`   Command: ${failure.command}`);
            console.log(`   Exit Code: ${failure.exitCode}`);
            if (failure.stderr) {
                console.log(`   STDERR: ${failure.stderr}`);
            }
            if (failure.stdout) {
                console.log(`   STDOUT: ${failure.stdout.substring(0, 300)}...`);
            }
        });
    }
}

function runTest(test) {
    return new Promise((resolve) => {
        const child = spawn('bash', ['-c', test.command], {
            stdio: 'pipe',
            timeout: 30000 // 30 second timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            resolve({
                test: test.name,
                command: test.command,
                success: code === 0,
                exitCode: code,
                stdout: stdout,
                stderr: stderr
            });
        });
        
        child.on('error', (error) => {
            resolve({
                test: test.name,
                command: test.command,
                success: false,
                error: error.message
            });
        });
    });
}

runQuickErrorDetection().catch(console.error);