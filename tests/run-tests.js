#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * 
 * Orchestrates the execution of the complete test suite with reporting
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class TestRunner {
    constructor() {
        this.testSuites = {
            unit: {
                name: 'Unit Tests',
                pattern: 'unit/**/*.test.js',
                timeout: 30000,
                description: 'Individual component and endpoint tests'
            },
            integration: {
                name: 'Integration Tests',
                pattern: 'integration/**/*.test.js',
                timeout: 60000,
                description: 'Full workflow and cross-component tests'
            },
            performance: {
                name: 'Performance Tests',
                pattern: 'performance/**/*.test.js',
                timeout: 120000,
                description: 'Load testing and performance validation'
            },
            security: {
                name: 'Security Tests',
                pattern: 'security/**/*.test.js',
                timeout: 60000,
                description: 'Security vulnerability and protection tests'
            },
            e2e: {
                name: 'End-to-End Tests',
                pattern: 'e2e/**/*.test.js',
                timeout: 180000,
                description: 'Complete automation workflow tests'
            },
            contract: {
                name: 'Contract Tests',
                pattern: 'contract/**/*.test.js',
                timeout: 60000,
                description: 'API contract and specification compliance'
            }
        };
        
        this.results = {
            startTime: null,
            endTime: null,
            suites: {},
            summary: {
                totalSuites: 0,
                passedSuites: 0,
                failedSuites: 0,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                skippedTests: 0,
                coverage: null
            }
        };
    }
    
    async run(options = {}) {
        console.log(chalk.cyan.bold('🚀 COMPREHENSIVE API TEST SUITE'));
        console.log(chalk.cyan('====================================='));
        console.log('🎯 Testing Poll Automation REST API');
        console.log(`📅 Started: ${new Date().toISOString()}`);
        console.log('');
        
        this.results.startTime = new Date();
        
        try {
            // Setup test environment
            await this.setupTestEnvironment();
            
            // Run test suites
            if (options.suite) {
                await this.runSingleSuite(options.suite, options);
            } else {
                await this.runAllSuites(options);
            }
            
            // Generate reports
            await this.generateReports(options);
            
            // Cleanup
            await this.cleanup();
            
            this.results.endTime = new Date();
            this.displaySummary();
            
            // Exit with appropriate code
            const hasFailures = this.results.summary.failedSuites > 0 || this.results.summary.failedTests > 0;
            process.exit(hasFailures ? 1 : 0);
            
        } catch (error) {
            console.error(chalk.red('💥 Test runner failed:'), error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
    
    async setupTestEnvironment() {
        console.log(chalk.blue('🔧 Setting up test environment...'));
        
        // Create necessary directories
        const dirs = ['logs', 'reports', 'coverage', 'screenshots'];
        for (const dir of dirs) {
            const dirPath = path.join(__dirname, dir);
            try {
                await fs.mkdir(dirPath, { recursive: true });
            } catch (error) {
                // Directory might already exist
            }
        }
        
        // Check if API server is available
        try {
            await this.checkApiServerAvailability();
            console.log(chalk.green('✅ API server check passed'));
        } catch (error) {
            console.log(chalk.yellow('⚠️ API server not available - tests will start their own instance'));
        }
        
        // Install dependencies if needed
        await this.ensureDependencies();
        
        console.log(chalk.green('✅ Test environment ready'));
        console.log('');
    }
    
    async checkApiServerAvailability() {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/health',
                method: 'GET',
                timeout: 5000
            }, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    reject(new Error(`API server returned status ${res.statusCode}`));
                }
            });
            
            req.on('error', reject);
            req.on('timeout', () => reject(new Error('API server timeout')));
            req.end();
        });
    }
    
    async ensureDependencies() {
        const packageJsonPath = path.join(__dirname, 'package.json');
        
        try {
            await fs.access(packageJsonPath);
            
            // Check if node_modules exists
            const nodeModulesPath = path.join(__dirname, 'node_modules');
            try {
                await fs.access(nodeModulesPath);
                console.log('📦 Dependencies already installed');
            } catch {
                console.log('📦 Installing test dependencies...');
                await this.runCommand('npm', ['install'], { cwd: __dirname });
                console.log(chalk.green('✅ Dependencies installed'));
            }
        } catch {
            console.log(chalk.yellow('⚠️ package.json not found - assuming dependencies are available'));
        }
    }
    
    async runAllSuites(options) {
        const suitesToRun = options.exclude 
            ? Object.keys(this.testSuites).filter(name => !options.exclude.includes(name))
            : Object.keys(this.testSuites);
        
        console.log(chalk.blue(`📋 Running ${suitesToRun.length} test suites:`));
        suitesToRun.forEach(name => {
            const suite = this.testSuites[name];
            console.log(`   • ${suite.name}: ${suite.description}`);
        });
        console.log('');
        
        for (const suiteName of suitesToRun) {
            await this.runSingleSuite(suiteName, options);
        }
    }
    
    async runSingleSuite(suiteName, options = {}) {
        const suite = this.testSuites[suiteName];
        if (!suite) {
            throw new Error(`Unknown test suite: ${suiteName}`);
        }
        
        console.log(chalk.yellow.bold(`🧪 ${suite.name}`));
        console.log(chalk.yellow('─'.repeat(50)));
        console.log(`📝 ${suite.description}`);
        console.log(`🔍 Pattern: ${suite.pattern}`);
        console.log(`⏱️ Timeout: ${suite.timeout}ms`);
        console.log('');
        
        const startTime = Date.now();
        
        try {
            const result = await this.runJestSuite(suiteName, suite, options);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            result.duration = duration;
            this.results.suites[suiteName] = result;
            
            if (result.success) {
                console.log(chalk.green(`✅ ${suite.name} completed successfully (${duration}ms)`));
                this.results.summary.passedSuites++;
            } else {
                console.log(chalk.red(`❌ ${suite.name} failed (${duration}ms)`));
                this.results.summary.failedSuites++;
            }
            
            this.results.summary.totalTests += result.numTotalTests || 0;
            this.results.summary.passedTests += result.numPassedTests || 0;
            this.results.summary.failedTests += result.numFailedTests || 0;
            this.results.summary.skippedTests += result.numPendingTests || 0;
            
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(chalk.red(`💥 ${suite.name} crashed (${duration}ms)`));
            console.log(chalk.red(`Error: ${error.message}`));
            
            this.results.suites[suiteName] = {
                success: false,
                error: error.message,
                duration,
                numTotalTests: 0,
                numPassedTests: 0,
                numFailedTests: 0,
                numPendingTests: 0
            };
            
            this.results.summary.failedSuites++;
        }
        
        this.results.summary.totalSuites++;
        console.log('');
    }
    
    async runJestSuite(suiteName, suite, options) {
        const jestConfig = {
            testMatch: [`**/${suite.pattern}`],
            testTimeout: suite.timeout,
            verbose: options.verbose || false,
            silent: options.silent || false,
            collectCoverage: options.coverage || false,
            coverageDirectory: path.join(__dirname, 'coverage', suiteName),
            setupFilesAfterEnv: [path.join(__dirname, 'setup.js')],
            testEnvironment: 'node'
        };
        
        // Create temporary Jest config file
        const configPath = path.join(__dirname, `jest.${suiteName}.config.js`);
        const configContent = `module.exports = ${JSON.stringify(jestConfig, null, 2)};`;
        await fs.writeFile(configPath, configContent);
        
        try {
            const jestArgs = [
                '--config', configPath,
                '--json'
            ];
            
            if (options.updateSnapshots) {
                jestArgs.push('--updateSnapshot');
            }
            
            if (options.runInBand) {
                jestArgs.push('--runInBand');
            }
            
            const result = await this.runCommand('npx', ['jest', ...jestArgs], { 
                cwd: __dirname,
                captureOutput: true 
            });
            
            // Parse Jest JSON output
            let jestResult;
            try {
                jestResult = JSON.parse(result.stdout);
            } catch (parseError) {
                throw new Error(`Failed to parse Jest output: ${parseError.message}\\nOutput: ${result.stdout}`);
            }
            
            return {
                success: jestResult.success,
                numTotalTests: jestResult.numTotalTests,
                numPassedTests: jestResult.numPassedTests,
                numFailedTests: jestResult.numFailedTests,
                numPendingTests: jestResult.numPendingTests,
                testResults: jestResult.testResults,
                coverageMap: jestResult.coverageMap
            };
            
        } finally {
            // Clean up config file
            try {
                await fs.unlink(configPath);
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }
    
    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: options.captureOutput ? 'pipe' : 'inherit',
                cwd: options.cwd || process.cwd(),
                env: { ...process.env, ...options.env }
            });
            
            let stdout = '';
            let stderr = '';
            
            if (options.captureOutput) {
                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                
                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, code });
                } else {
                    reject(new Error(`Command failed with code ${code}\\nStderr: ${stderr}`));
                }
            });
            
            child.on('error', reject);
        });
    }
    
    async generateReports(options) {
        if (!options.report) return;
        
        console.log(chalk.blue('📊 Generating test reports...'));
        
        const reportData = {
            metadata: {
                timestamp: new Date().toISOString(),
                duration: this.results.endTime - this.results.startTime,
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    testRunner: 'Jest',
                    apiBaseUrl: process.env.TEST_API_URL || 'http://localhost:3000'
                }
            },
            summary: this.results.summary,
            suites: this.results.suites
        };
        
        // Generate JSON report
        const jsonReportPath = path.join(__dirname, 'reports', 'test-results.json');
        await fs.writeFile(jsonReportPath, JSON.stringify(reportData, null, 2));
        console.log(`📄 JSON report: ${jsonReportPath}`);
        
        // Generate HTML report
        if (options.htmlReport) {
            await this.generateHtmlReport(reportData);
        }
        
        // Generate JUnit XML report
        if (options.junitReport) {
            await this.generateJunitReport(reportData);
        }
        
        console.log(chalk.green('✅ Reports generated'));
    }
    
    async generateHtmlReport(reportData) {
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Poll Automation API Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; border-color: #c3e6cb; }
        .failure { background-color: #f8d7da; border-color: #f5c6cb; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .stat { text-align: center; padding: 10px; background: #f8f9fa; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Poll Automation API Test Results</h1>
        <p><strong>Generated:</strong> ${reportData.metadata.timestamp}</p>
        <p><strong>Duration:</strong> ${reportData.metadata.duration}ms</p>
        <p><strong>Environment:</strong> ${reportData.metadata.environment.nodeVersion} on ${reportData.metadata.environment.platform}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Summary</h2>
        <div class="stats">
            <div class="stat">
                <h3>${reportData.summary.totalSuites}</h3>
                <p>Total Suites</p>
            </div>
            <div class="stat">
                <h3>${reportData.summary.passedSuites}</h3>
                <p>Passed Suites</p>
            </div>
            <div class="stat">
                <h3>${reportData.summary.totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="stat">
                <h3>${reportData.summary.passedTests}</h3>
                <p>Passed Tests</p>
            </div>
            <div class="stat">
                <h3>${reportData.summary.failedTests}</h3>
                <p>Failed Tests</p>
            </div>
        </div>
    </div>
    
    <div class="suites">
        <h2>🧪 Test Suites</h2>
        ${Object.entries(reportData.suites).map(([name, suite]) => `
            <div class="suite ${suite.success ? 'success' : 'failure'}">
                <h3>${this.testSuites[name].name}</h3>
                <p><strong>Status:</strong> ${suite.success ? '✅ PASSED' : '❌ FAILED'}</p>
                <p><strong>Duration:</strong> ${suite.duration}ms</p>
                <p><strong>Tests:</strong> ${suite.numPassedTests}/${suite.numTotalTests} passed</p>
                ${suite.error ? `<p><strong>Error:</strong> ${suite.error}</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
        
        const htmlReportPath = path.join(__dirname, 'reports', 'test-results.html');
        await fs.writeFile(htmlReportPath, htmlTemplate);
        console.log(`📄 HTML report: ${htmlReportPath}`);
    }
    
    async generateJunitReport(reportData) {
        const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Poll Automation API Tests" tests="${reportData.summary.totalTests}" failures="${reportData.summary.failedTests}" time="${reportData.metadata.duration / 1000}">
${Object.entries(reportData.suites).map(([name, suite]) => `
    <testsuite name="${this.testSuites[name].name}" tests="${suite.numTotalTests}" failures="${suite.numFailedTests}" time="${suite.duration / 1000}">
        <!-- Test cases would be detailed here in a full implementation -->
    </testsuite>
`).join('')}
</testsuites>`;
        
        const junitReportPath = path.join(__dirname, 'reports', 'junit.xml');
        await fs.writeFile(junitReportPath, junitXml);
        console.log(`📄 JUnit report: ${junitReportPath}`);
    }
    
    async cleanup() {
        console.log(chalk.blue('🧹 Cleaning up test environment...'));
        
        // Remove temporary files
        const tempFiles = [
            'test-poll-automation.db',
            'test-poll-automation.db-shm',
            'test-poll-automation.db-wal'
        ];
        
        for (const file of tempFiles) {
            try {
                await fs.unlink(path.join(__dirname, '..', file));
            } catch (error) {
                // File might not exist
            }
        }
        
        console.log(chalk.green('✅ Cleanup completed'));
    }
    
    displaySummary() {
        const { summary } = this.results;
        const duration = this.results.endTime - this.results.startTime;
        
        console.log('');
        console.log(chalk.cyan.bold('📊 FINAL TEST SUMMARY'));
        console.log(chalk.cyan('======================'));
        console.log(`⏱️ Total Duration: ${duration}ms`);
        console.log(`📦 Test Suites: ${summary.passedSuites}/${summary.totalSuites} passed`);
        console.log(`🧪 Test Cases: ${summary.passedTests}/${summary.totalTests} passed`);
        console.log(`⏭️ Skipped: ${summary.skippedTests}`);
        console.log(`❌ Failed: ${summary.failedTests}`);
        
        const successRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100).toFixed(1) : 0;
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (summary.failedSuites === 0 && summary.failedTests === 0) {
            console.log('');
            console.log(chalk.green.bold('🎉 ALL TESTS PASSED!'));
            console.log(chalk.green('The Poll Automation API is working correctly.'));
        } else {
            console.log('');
            console.log(chalk.red.bold('💥 SOME TESTS FAILED'));
            console.log(chalk.red('Please review the test output and fix any issues.'));
        }
        
        console.log('');
        console.log(`📅 Completed: ${new Date().toISOString()}`);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        suite: null,
        verbose: false,
        coverage: false,
        report: false,
        htmlReport: false,
        junitReport: false,
        exclude: [],
        silent: false,
        updateSnapshots: false,
        runInBand: false
    };
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--suite':
                options.suite = args[++i];
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--coverage':
                options.coverage = true;
                break;
            case '--report':
                options.report = true;
                break;
            case '--html-report':
                options.htmlReport = true;
                options.report = true;
                break;
            case '--junit-report':
                options.junitReport = true;
                options.report = true;
                break;
            case '--exclude':
                options.exclude = args[++i].split(',');
                break;
            case '--silent':
                options.silent = true;
                break;
            case '--update-snapshots':
                options.updateSnapshots = true;
                break;
            case '--run-in-band':
                options.runInBand = true;
                break;
            case '--help':
                console.log(`
Usage: node run-tests.js [options]

Options:
  --suite <name>        Run specific test suite (unit, integration, performance, security, e2e, contract)
  --verbose             Enable verbose output
  --coverage            Collect test coverage
  --report              Generate test reports
  --html-report         Generate HTML report
  --junit-report        Generate JUnit XML report
  --exclude <suites>    Exclude test suites (comma-separated)
  --silent              Suppress console output during tests
  --update-snapshots    Update Jest snapshots
  --run-in-band         Run tests serially
  --help                Show this help message

Examples:
  node run-tests.js                          # Run all test suites
  node run-tests.js --suite unit             # Run only unit tests
  node run-tests.js --coverage --html-report # Run with coverage and HTML report
  node run-tests.js --exclude performance    # Run all except performance tests
`);
                process.exit(0);
            default:
                console.error(`Unknown option: ${arg}`);
                process.exit(1);
        }
    }
    
    const runner = new TestRunner();
    runner.run(options).catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;