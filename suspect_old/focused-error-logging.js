#!/usr/bin/env node

/**
 * FOCUSED ERROR LOGGING
 * Target specific components and log errors systematically
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class FocusedErrorLogger {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.successCount = 0;
        this.testCount = 0;
    }

    async runFocusedErrorLogging() {
        console.log('🎯 FOCUSED ERROR LOGGING');
        console.log('=========================');
        
        // Test core components individually
        await this.testDatabaseOperations();
        await this.testEmailComponentsStandalone();
        await this.testLLMIntegration();
        await this.testFileIntegrity();
        await this.testApplicationCommands();
        
        // Generate error report
        this.generateErrorReport();
    }

    async testDatabaseOperations() {
        console.log('\n📊 TESTING DATABASE OPERATIONS');
        console.log('===============================');
        
        // Test 1: Database connection
        await this.runTest('Database Connection', async () => {
            const sqlite3 = require('sqlite3').verbose();
            return new Promise((resolve, reject) => {
                const db = new sqlite3.Database('poll-automation.db', (err) => {
                    if (err) reject(err);
                    else {
                        db.close();
                        resolve('Database connection successful');
                    }
                });
            });
        });
        
        // Test 2: Table verification
        await this.runTest('Table Verification', async () => {
            const sqlite3 = require('sqlite3').verbose();
            return new Promise((resolve, reject) => {
                const db = new sqlite3.Database('poll-automation.db');
                db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                    db.close();
                    if (err) reject(err);
                    else resolve(`Found ${rows.length} tables: ${rows.map(r => r.name).join(', ')}`);
                });
            });
        });
        
        // Test 3: Email accounts query
        await this.runTest('Email Accounts Query', async () => {
            const sqlite3 = require('sqlite3').verbose();
            return new Promise((resolve, reject) => {
                const db = new sqlite3.Database('poll-automation.db');
                db.get("SELECT COUNT(*) as count FROM email_accounts", (err, row) => {
                    db.close();
                    if (err) reject(err);
                    else resolve(`Email accounts in database: ${row.count}`);
                });
            });
        });
    }

    async testEmailComponentsStandalone() {
        console.log('\n📧 TESTING EMAIL COMPONENTS');
        console.log('============================');
        
        // Test 1: Email Account Manager loading
        await this.runTest('Email Account Manager Loading', async () => {
            const EmailManager = require('./src/email/email-account-manager');
            const manager = new EmailManager({ headless: true, debugMode: false });
            return 'Email Account Manager loaded successfully';
        });
        
        // Test 2: LLM Email Analyzer loading
        await this.runTest('LLM Email Analyzer Loading', async () => {
            const LLMAnalyzer = require('./src/email/llm-email-analyzer');
            const analyzer = new LLMAnalyzer({ debugMode: false });
            return 'LLM Email Analyzer loaded successfully';
        });
        
        // Test 3: Database save functionality
        await this.runTest('Email Database Save Test', async () => {
            const EmailManager = require('./src/email/email-account-manager');
            const manager = new EmailManager({ headless: true, debugMode: false });
            
            const testEmailData = {
                email: 'test@example.com',
                service: 'test',
                username: 'test',
                password: 'test',
                inboxUrl: 'http://test.com',
                serviceData: {},
                verified: false
            };
            
            await manager.initializeDatabase();
            const id = await manager.saveEmailToDatabase(testEmailData);
            return `Email save test successful, ID: ${id}`;
        });
    }

    async testLLMIntegration() {
        console.log('\n🧠 TESTING LLM INTEGRATION');
        console.log('===========================');
        
        // Test 1: LLM Service Health
        await this.runTest('LLM Service Health Check', async () => {
            const axios = require('axios');
            const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
            return `LLM Service: ${response.data.status} - ${response.data.service}`;
        });
        
        // Test 2: LLM API Call
        await this.runTest('LLM API Test Call', async () => {
            const axios = require('axios');
            const response = await axios.post('http://localhost:5000/answer-questions', {
                questions: [{ id: 1, text: 'Test question', type: 'text', options: [] }],
                context: 'Error logging test'
            }, { timeout: 10000 });
            
            return `LLM API call successful: ${response.data.answers[0].value.substring(0, 50)}...`;
        });
        
        // Test 3: AI Component Loading
        await this.runTest('AI Components Loading', async () => {
            const ContentAI = require('./src/ai/ContentUnderstandingAI');
            const LoggedAI = require('./src/ai/logged-ai-wrapper');
            
            const contentAI = new ContentAI();
            const loggedAI = new LoggedAI(contentAI);
            
            return 'AI components loaded successfully';
        });
    }

    async testFileIntegrity() {
        console.log('\n📁 TESTING FILE INTEGRITY');
        console.log('==========================');
        
        const criticalFiles = [
            './app.js',
            './src/email/email-account-manager.js',
            './src/email/llm-email-analyzer.js',
            './src/automation/universal-form-automator.js',
            './src/ai/ContentUnderstandingAI.js',
            './src/ai/logged-ai-wrapper.js',
            './src/database/registration-logger.js',
            './poll-automation.db'
        ];
        
        for (const file of criticalFiles) {
            await this.runTest(`File Check: ${path.basename(file)}`, async () => {
                if (!fs.existsSync(file)) {
                    throw new Error('File does not exist');
                }
                
                const stats = fs.statSync(file);
                if (file.endsWith('.js')) {
                    // Test syntax by requiring
                    delete require.cache[require.resolve(file)];
                    require(file);
                    return `File exists and has valid syntax (${stats.size} bytes)`;
                } else {
                    return `File exists (${stats.size} bytes)`;
                }
            });
        }
    }

    async testApplicationCommands() {
        console.log('\n⚡ TESTING APPLICATION COMMANDS');
        console.log('===============================');
        
        // Test lightweight commands only
        const lightweightCommands = [
            { name: 'Help Command', cmd: 'node app.js --help', timeout: 5000 },
            { name: 'Version Check', cmd: 'node app.js --version', timeout: 5000 },
            { name: 'DB Stats', cmd: 'node app.js db stats', timeout: 10000 },
            { name: 'LLM Test', cmd: 'node app.js test-llm', timeout: 15000 }
        ];
        
        for (const test of lightweightCommands) {
            await this.runTest(test.name, () => {
                return new Promise((resolve, reject) => {
                    const child = spawn('bash', ['-c', test.cmd], { stdio: 'pipe' });
                    
                    let output = '';
                    let error = '';
                    
                    child.stdout.on('data', (data) => output += data.toString());
                    child.stderr.on('data', (data) => error += data.toString());
                    
                    const timer = setTimeout(() => {
                        child.kill();
                        reject(new Error(`Command timed out after ${test.timeout}ms`));
                    }, test.timeout);
                    
                    child.on('close', (code) => {
                        clearTimeout(timer);
                        if (code === 0) {
                            resolve(`Command successful: ${output.substring(0, 100)}...`);
                        } else {
                            reject(new Error(`Exit code ${code}: ${error}`));
                        }
                    });
                    
                    child.on('error', (err) => {
                        clearTimeout(timer);
                        reject(err);
                    });
                });
            });
        }
    }

    async runTest(testName, testFunction) {
        this.testCount++;
        
        try {
            const result = await testFunction();
            console.log(`✅ ${testName}: ${result}`);
            this.successCount++;
        } catch (error) {
            console.log(`❌ ${testName}: ${error.message}`);
            this.errors.push({
                test: testName,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    generateErrorReport() {
        console.log('\n📊 FOCUSED ERROR REPORT');
        console.log('========================');
        
        const successRate = (this.successCount / this.testCount * 100).toFixed(1);
        
        console.log(`Tests Run: ${this.testCount}`);
        console.log(`✅ Successful: ${this.successCount}`);
        console.log(`❌ Failed: ${this.errors.length}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (this.errors.length > 0) {
            console.log(`\n🔍 DETAILED ERRORS:`);
            this.errors.forEach((error, index) => {
                console.log(`\n${index + 1}. ${error.test}`);
                console.log(`   Error: ${error.error}`);
                console.log(`   Time: ${error.timestamp}`);
            });
            
            // Save error details
            fs.writeFileSync('./focused-error-report.json', JSON.stringify({
                summary: {
                    total: this.testCount,
                    successful: this.successCount,
                    failed: this.errors.length,
                    successRate: successRate
                },
                errors: this.errors,
                timestamp: new Date().toISOString()
            }, null, 2));
            
            console.log(`\n📝 Detailed error report saved: ./focused-error-report.json`);
        } else {
            console.log(`\n🎉 NO ERRORS FOUND - ALL TESTS PASSED!`);
        }
        
        // System health assessment
        if (successRate >= 95) {
            console.log(`\n🎯 SYSTEM HEALTH: 🟢 EXCELLENT`);
        } else if (successRate >= 85) {
            console.log(`\n🎯 SYSTEM HEALTH: 🟡 GOOD`);
        } else if (successRate >= 70) {
            console.log(`\n🎯 SYSTEM HEALTH: 🟠 FAIR`);
        } else {
            console.log(`\n🎯 SYSTEM HEALTH: 🔴 NEEDS ATTENTION`);
        }
    }
}

// Run focused error logging
const errorLogger = new FocusedErrorLogger();
errorLogger.runFocusedErrorLogging().catch(console.error);