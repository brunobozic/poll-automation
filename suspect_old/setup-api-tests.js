#!/usr/bin/env node

/**
 * API TEST SETUP SCRIPT
 * 
 * Sets up and validates the API testing environment
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class APITestSetup {
    constructor() {
        this.testFiles = [
            'test-api-workflow.js',
            'test-api-performance.js', 
            'test-api-integration.js',
            'tests/api-workflow-comprehensive.test.js',
            'run-all-api-tests.js'
        ];
        
        this.dependencies = [
            'axios',
            'chalk'
        ];
    }

    async setup() {
        console.log(chalk.cyan.bold('🔧 API TEST ENVIRONMENT SETUP'));
        console.log('==============================');

        // Check test files exist
        await this.checkTestFiles();

        // Check dependencies
        await this.checkDependencies();

        // Check API server exists
        await this.checkAPIServer();

        // Make test files executable
        await this.makeExecutable();

        // Display usage instructions
        this.displayUsage();
    }

    async checkTestFiles() {
        console.log(chalk.blue('\n📁 Checking test files...'));
        
        for (const file of this.testFiles) {
            try {
                await fs.access(file);
                console.log(`   ✅ ${file}`);
            } catch (error) {
                console.log(`   ❌ ${file} - NOT FOUND`);
            }
        }
    }

    async checkDependencies() {
        console.log(chalk.blue('\n📦 Checking dependencies...'));
        
        for (const dep of this.dependencies) {
            try {
                require.resolve(dep);
                console.log(`   ✅ ${dep}`);
            } catch (error) {
                console.log(`   ❌ ${dep} - NOT INSTALLED`);
                console.log(`      Install with: npm install ${dep}`);
            }
        }
    }

    async checkAPIServer() {
        console.log(chalk.blue('\n🌐 Checking API server files...'));
        
        const serverFiles = [
            'api-server.js',
            'apps/api-server.js'
        ];
        
        let serverFound = false;
        for (const file of serverFiles) {
            try {
                await fs.access(file);
                console.log(`   ✅ ${file}`);
                serverFound = true;
            } catch (error) {
                console.log(`   ❓ ${file} - not found (optional)`);
            }
        }
        
        if (!serverFound) {
            console.log(chalk.yellow('   ⚠️ No API server files found - make sure server is running'));
        }
    }

    async makeExecutable() {
        console.log(chalk.blue('\n🔐 Setting file permissions...'));
        
        for (const file of this.testFiles) {
            try {
                await fs.access(file);
                // Note: On Windows, chmod may not work as expected
                try {
                    await fs.chmod(file, 0o755);
                    console.log(`   ✅ Made executable: ${file}`);
                } catch (chmodError) {
                    console.log(`   ⚠️ Could not set permissions for ${file} (Windows?)`);
                }
            } catch (error) {
                console.log(`   ❓ Skipping ${file} - file not found`);
            }
        }
    }

    displayUsage() {
        console.log(chalk.cyan.bold('\n📋 USAGE INSTRUCTIONS'));
        console.log('======================');

        console.log(chalk.yellow('\n🚀 Quick Start:'));
        console.log('1. Start the API server:');
        console.log(chalk.gray('   node api-server.js'));
        console.log(chalk.gray('   # or'));
        console.log(chalk.gray('   node apps/api-server.js'));
        
        console.log('\n2. Run all tests:');
        console.log(chalk.gray('   node run-all-api-tests.js'));
        
        console.log(chalk.yellow('\n🧪 Individual Test Suites:'));
        console.log('Basic functionality tests:');
        console.log(chalk.gray('   node test-api-workflow.js'));
        
        console.log('\nPerformance tests:');
        console.log(chalk.gray('   node test-api-performance.js'));
        
        console.log('\nIntegration tests:');
        console.log(chalk.gray('   node test-api-integration.js'));
        
        console.log('\nComprehensive tests:');
        console.log(chalk.gray('   node tests/api-workflow-comprehensive.test.js'));

        console.log(chalk.yellow('\n🌐 Custom API URL:'));
        console.log('Run tests against different API server:');
        console.log(chalk.gray('   node run-all-api-tests.js http://localhost:8080'));
        console.log(chalk.gray('   node test-api-workflow.js https://api.example.com'));

        console.log(chalk.yellow('\n📊 Expected Output:'));
        console.log('• Test progress with real-time output');
        console.log('• Success/failure indicators for each test');
        console.log('• Performance metrics and timing');
        console.log('• Comprehensive final reports');
        console.log('• JSON report files for detailed analysis');

        console.log(chalk.yellow('\n⚠️ Prerequisites:'));
        console.log('• API server must be running and accessible');
        console.log('• Node.js and npm dependencies installed');
        console.log('• Network connectivity to test endpoints');
        console.log('• Sufficient disk space for reports and logs');

        console.log(chalk.yellow('\n🔍 Troubleshooting:'));
        console.log('• If tests fail, check API server logs');
        console.log('• Verify API endpoints are responding to /health');
        console.log('• Check firewall and network connectivity');
        console.log('• Review test output for specific error messages');

        console.log(chalk.green.bold('\n✅ Setup Complete! Ready to run tests.'));
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new APITestSetup();
    
    setup.setup().catch(error => {
        console.error(chalk.red('\n💥 Setup failed:'), error.message);
        process.exit(1);
    });
}

module.exports = APITestSetup;