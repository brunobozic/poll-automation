#!/usr/bin/env node

/**
 * Quick Test Verification
 * 
 * A simple test to verify the test infrastructure is working correctly
 */

const path = require('path');
const { spawn } = require('child_process');

async function runQuickTest() {
    console.log('🚀 Running quick test verification...');
    console.log('');
    
    try {
        // Test 1: Run a simple unit test
        console.log('📝 Test 1: Running health endpoint unit test...');
        const result = await runJest('unit/health.test.js');
        
        if (result.success) {
            console.log('✅ Unit test passed');
        } else {
            console.log('❌ Unit test failed');
            console.log(result.output);
        }
        
        console.log('');
        console.log('🎉 Quick test verification completed!');
        console.log('');
        console.log('Next steps:');
        console.log('  • Run full test suite: node run-tests.js');
        console.log('  • Run specific suite: node run-tests.js --suite unit');
        console.log('  • Run with reports: node run-tests.js --report --html-report');
        
    } catch (error) {
        console.error('💥 Quick test failed:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('  • Ensure API server dependencies are installed in parent directory');
        console.log('  • Check that ../api-server.js exists and is executable');
        console.log('  • Verify Node.js version is 16+');
        process.exit(1);
    }
}

function runJest(testFile) {
    return new Promise((resolve, reject) => {
        const jestArgs = [
            '--testPathPattern', testFile,
            '--json',
            '--verbose'
        ];
        
        const child = spawn('npx', ['jest', ...jestArgs], {
            cwd: __dirname,
            stdio: 'pipe'
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
            try {
                const result = JSON.parse(stdout);
                resolve({
                    success: result.success,
                    output: stdout,
                    error: stderr
                });
            } catch (parseError) {
                resolve({
                    success: false,
                    output: stdout,
                    error: stderr || parseError.message
                });
            }
        });
        
        child.on('error', reject);
    });
}

// Run if called directly
if (require.main === module) {
    runQuickTest().catch(error => {
        console.error('Quick test runner failed:', error);
        process.exit(1);
    });
}

module.exports = { runQuickTest };