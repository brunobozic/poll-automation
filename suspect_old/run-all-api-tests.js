#!/usr/bin/env node

/**
 * MASTER API TEST RUNNER
 * 
 * Executes comprehensive test suites for the workflow automation API:
 * 1. Basic functionality tests
 * 2. Performance tests
 * 3. Integration tests
 * 4. Generates consolidated report
 */

const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class MasterTestRunner {
    constructor(apiBaseUrl = 'http://localhost:3000') {
        this.apiBaseUrl = apiBaseUrl;
        this.testSuites = [
            {
                name: 'Basic Functionality Tests',
                script: './test-api-workflow.js',
                description: 'Tests all workflow automation endpoints with success and error scenarios',
                estimatedDuration: '2-3 minutes'
            },
            {
                name: 'Performance Tests',
                script: './test-api-performance.js',
                description: 'Tests response times, concurrency, and stress limits',
                estimatedDuration: '3-5 minutes'
            },
            {
                name: 'Integration Tests',
                script: './test-api-integration.js',
                description: 'Tests complete end-to-end workflow integrations',
                estimatedDuration: '5-10 minutes'
            }
        ];
        this.results = {
            suites: [],
            startTime: Date.now(),
            endTime: null,
            overallSuccess: false
        };
    }

    async runAllTests() {
        console.log(chalk.cyan.bold('🚀 COMPREHENSIVE WORKFLOW AUTOMATION API TEST SUITE'));
        console.log('====================================================');
        console.log(`🌐 API Base URL: ${this.apiBaseUrl}`);
        console.log(`⏰ Started: ${new Date().toISOString()}`);
        console.log(`📋 Test Suites: ${this.testSuites.length}`);

        // Display test plan
        this.displayTestPlan();

        // Check API server availability
        const apiAvailable = await this.checkAPIAvailability();
        if (!apiAvailable) {
            console.log(chalk.red('\n❌ API server is not available. Please start the server first:'));
            console.log('   node api-server.js');
            console.log('   # or');
            console.log('   node apps/api-server.js');
            process.exit(1);
        }

        // Run each test suite
        for (let i = 0; i < this.testSuites.length; i++) {
            const suite = this.testSuites[i];
            console.log(chalk.blue.bold(`\n📋 Running Test Suite ${i + 1}/${this.testSuites.length}: ${suite.name}`));
            console.log('='.repeat(60));
            console.log(`📄 Description: ${suite.description}`);
            console.log(`⏱️ Estimated Duration: ${suite.estimatedDuration}`);
            
            const suiteResult = await this.runTestSuite(suite);
            this.results.suites.push(suiteResult);
            
            // Brief pause between suites
            if (i < this.testSuites.length - 1) {
                console.log(chalk.gray('\n⏸️ Pausing 5 seconds before next suite...'));
                await this.sleep(5000);
            }
        }

        this.results.endTime = Date.now();
        this.results.overallSuccess = this.results.suites.every(s => s.success);

        // Generate consolidated report
        await this.generateConsolidatedReport();
    }

    displayTestPlan() {
        console.log(chalk.yellow('\n📅 TEST EXECUTION PLAN:'));
        console.log('========================');
        
        this.testSuites.forEach((suite, i) => {
            console.log(`${i + 1}. ${chalk.cyan(suite.name)}`);
            console.log(`   📄 ${suite.description}`);
            console.log(`   ⏱️ ${suite.estimatedDuration}`);
            console.log(`   📁 ${suite.script}`);
        });
        
        const totalEstimated = this.testSuites.reduce((total, suite) => {
            const max = parseInt(suite.estimatedDuration.split('-')[1] || suite.estimatedDuration.split(' ')[0]);
            return total + max;
        }, 0);
        
        console.log(`\n📊 Total Estimated Duration: ${totalEstimated} minutes`);
        console.log('⚠️ Note: Tests run against live API, actual duration may vary');
    }

    async checkAPIAvailability() {
        console.log(chalk.blue('\n🏥 Checking API Server Availability...'));
        
        try {
            const axios = require('axios');
            const response = await axios.get(`${this.apiBaseUrl}/health`, { 
                timeout: 10000 
            });
            
            if (response.status === 200) {
                console.log(chalk.green('✅ API server is available and healthy'));
                console.log(`   Server status: ${response.data.status}`);
                console.log(`   Version: ${response.data.version || 'unknown'}`);
                console.log(`   Uptime: ${response.data.uptime || 0}s`);
                return true;
            } else {
                console.log(chalk.red(`❌ API server returned status: ${response.status}`));
                return false;
            }
        } catch (error) {
            console.log(chalk.red(`❌ API server check failed: ${error.message}`));
            return false;
        }
    }

    async runTestSuite(suite) {
        const suiteResult = {
            name: suite.name,
            script: suite.script,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            success: false,
            output: '',
            error: null
        };

        try {
            console.log(`\n🔄 Executing: node ${suite.script} ${this.apiBaseUrl}`);
            
            const output = await this.executeScript(suite.script, [this.apiBaseUrl]);
            
            suiteResult.output = output;
            suiteResult.success = true;
            suiteResult.endTime = Date.now();
            suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
            
            console.log(chalk.green(`\n✅ ${suite.name} completed successfully`));
            console.log(`   ⏱️ Duration: ${(suiteResult.duration / 1000).toFixed(1)}s`);
            
        } catch (error) {
            suiteResult.success = false;
            suiteResult.error = error.message;
            suiteResult.output = error.output || '';
            suiteResult.endTime = Date.now();
            suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
            
            console.log(chalk.red(`\n❌ ${suite.name} failed`));
            console.log(`   ⏱️ Duration: ${(suiteResult.duration / 1000).toFixed(1)}s`);
            console.log(`   💥 Error: ${error.message}`);
        }

        return suiteResult;
    }

    async executeScript(scriptPath, args = []) {
        return new Promise((resolve, reject) => {
            const child = spawn('node', [scriptPath, ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                // Real-time output display
                process.stdout.write(output);
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                process.stderr.write(output);
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    const error = new Error(`Script exited with code ${code}`);
                    error.output = stdout + stderr;
                    reject(error);
                }
            });

            child.on('error', (error) => {
                error.output = stdout + stderr;
                reject(error);
            });

            // 15 minute timeout for the entire test suite
            setTimeout(() => {
                child.kill('SIGTERM');
                const error = new Error('Test suite timed out (15 minutes)');
                error.output = stdout + stderr;
                reject(error);
            }, 15 * 60 * 1000);
        });
    }

    async generateConsolidatedReport() {
        console.log(chalk.cyan.bold('\n📊 CONSOLIDATED TEST REPORT'));
        console.log('=============================');

        const totalDuration = this.results.endTime - this.results.startTime;
        const successfulSuites = this.results.suites.filter(s => s.success).length;
        const failedSuites = this.results.suites.filter(s => !s.success).length;

        console.log(`⏰ Total Execution Time: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);
        console.log(`📋 Test Suites Executed: ${this.results.suites.length}`);
        console.log(`✅ Successful: ${successfulSuites}`);
        console.log(`❌ Failed: ${failedSuites}`);
        console.log(`📈 Success Rate: ${(successfulSuites / this.results.suites.length * 100).toFixed(1)}%`);

        console.log(chalk.yellow('\n📋 SUITE RESULTS:'));
        console.log('=================');

        this.results.suites.forEach((suite, i) => {
            const status = suite.success ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
            const duration = (suite.duration / 1000).toFixed(1);
            
            console.log(`${i + 1}. ${status} ${suite.name} (${duration}s)`);
            
            if (!suite.success && suite.error) {
                console.log(`   💥 Error: ${suite.error}`);
            }
        });

        console.log(chalk.cyan('\n🎯 OVERALL ASSESSMENT:'));
        console.log('======================');

        if (this.results.overallSuccess) {
            console.log(chalk.green('🏆 EXCELLENT: All test suites passed!'));
            console.log('   • Workflow automation API is fully functional');
            console.log('   • Performance is within acceptable limits');
            console.log('   • End-to-end integrations are working correctly');
            console.log('   • Error handling and recovery mechanisms are operational');
        } else if (successfulSuites / this.results.suites.length >= 0.67) {
            console.log(chalk.yellow('👍 GOOD: Most test suites passed'));
            console.log('   • Core functionality is working');
            console.log('   • Some areas may need attention (check failed suites)');
            console.log('   • Review failed test details for specific issues');
        } else {
            console.log(chalk.red('⚠️ NEEDS ATTENTION: Multiple test suites failed'));
            console.log('   • Critical functionality issues detected');
            console.log('   • Review API server configuration and implementation');
            console.log('   • Check logs for detailed error information');
        }

        console.log(chalk.cyan('\n💡 RECOMMENDATIONS:'));
        console.log('====================');

        if (!this.results.overallSuccess) {
            console.log('• Review failed test outputs for specific issues');
            console.log('• Check API server logs for errors');
            console.log('• Verify database connectivity and schema');
            console.log('• Ensure all required dependencies are installed');
        }

        console.log('• Run individual test suites for detailed debugging');
        console.log('• Monitor API performance under production load');
        console.log('• Implement continuous integration testing');
        console.log('• Set up automated test execution on code changes');

        // Save consolidated report
        const reportData = {
            summary: {
                apiBaseUrl: this.apiBaseUrl,
                totalDuration,
                totalSuites: this.results.suites.length,
                successfulSuites,
                failedSuites,
                successRate: (successfulSuites / this.results.suites.length * 100),
                overallSuccess: this.results.overallSuccess
            },
            suites: this.results.suites.map(suite => ({
                name: suite.name,
                script: suite.script,
                duration: suite.duration,
                success: suite.success,
                error: suite.error
            })),
            recommendations: this.generateRecommendations(),
            timestamp: new Date().toISOString()
        };

        const reportPath = path.join(process.cwd(), `consolidated-api-test-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`\n💾 Consolidated report saved: ${reportPath}`);

        // Final status
        if (this.results.overallSuccess) {
            console.log(chalk.green.bold('\n🎉 ALL TESTS PASSED! API is ready for production.'));
        } else {
            console.log(chalk.red.bold(`\n⚠️ ${failedSuites} TEST SUITE(S) FAILED. Please review and fix issues.`));
        }
    }

    generateRecommendations() {
        const recommendations = [];
        
        const failedSuites = this.results.suites.filter(s => !s.success);
        
        if (failedSuites.length === 0) {
            recommendations.push('All tests passed - consider adding more edge case tests');
            recommendations.push('Implement automated testing in CI/CD pipeline');
            recommendations.push('Monitor API performance in production');
        } else {
            failedSuites.forEach(suite => {
                if (suite.name.includes('Performance')) {
                    recommendations.push('Optimize API performance - check database queries and processing logic');
                }
                if (suite.name.includes('Integration')) {
                    recommendations.push('Review end-to-end workflow integration logic');
                }
                if (suite.name.includes('Functionality')) {
                    recommendations.push('Fix core API functionality issues');
                }
            });
        }
        
        return recommendations;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests if called directly
if (require.main === module) {
    const apiBaseUrl = process.argv[2] || 'http://localhost:3000';
    
    console.log(`🌐 API Base URL: ${apiBaseUrl}`);
    console.log(`📁 Working Directory: ${process.cwd()}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    
    const runner = new MasterTestRunner(apiBaseUrl);
    
    runner.runAllTests().catch(error => {
        console.error(chalk.red('\n💥 Master test runner failed:'), error.message);
        process.exit(1);
    });
}

module.exports = MasterTestRunner;