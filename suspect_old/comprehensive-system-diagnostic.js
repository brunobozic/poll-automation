#!/usr/bin/env node

/**
 * COMPREHENSIVE SYSTEM DIAGNOSTIC
 * Systematically test every component and identify ALL broken parts
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

class ComprehensiveSystemDiagnostic {
    constructor() {
        this.results = {
            core_services: {},
            database_components: {},
            automation_modules: {},
            ai_services: {},
            email_services: {},
            file_integrity: {},
            command_interface: {},
            dependencies: {},
            integration_tests: {},
            summary: {
                total_tests: 0,
                passed: 0,
                failed: 0,
                critical_failures: [],
                broken_components: []
            }
        };
    }

    async runFullDiagnostic() {
        console.log('🔍 COMPREHENSIVE SYSTEM DIAGNOSTIC');
        console.log('====================================');
        console.log('This will test EVERY component to find ALL broken parts...\n');

        try {
            // Core infrastructure tests
            await this.testCoreServices();
            await this.testDatabaseComponents();
            await this.testDependencies();
            
            // Module-specific tests
            await this.testAutomationModules();
            await this.testAIServices();
            await this.testEmailServices();
            
            // Interface tests
            await this.testCommandInterface();
            await this.testFileIntegrity();
            
            // Integration tests
            await this.testIntegrationPoints();
            
            // Generate comprehensive report
            this.generateReport();
            
        } catch (error) {
            console.error('💥 Diagnostic system failed:', error.message);
        }
    }

    async testCoreServices() {
        console.log('1️⃣ TESTING CORE SERVICES');
        console.log('========================');
        
        // Test LLM service
        await this.testComponent('LLM Service', async () => {
            const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
            return response.data.status === 'healthy';
        });

        // Test SQLite database
        await this.testComponent('SQLite Database', async () => {
            const sqlite3 = require('sqlite3').verbose();
            return new Promise((resolve) => {
                const db = new sqlite3.Database('poll-automation.db', (err) => {
                    if (err) resolve(false);
                    else {
                        db.close();
                        resolve(true);
                    }
                });
            });
        });

        // Test Node.js modules loading
        const coreModules = [
            'playwright',
            'axios',
            'sqlite3',
            'commander',
            'chalk',
            'dotenv'
        ];

        for (const module of coreModules) {
            await this.testComponent(`Node Module: ${module}`, async () => {
                try {
                    require(module);
                    return true;
                } catch (e) {
                    return false;
                }
            });
        }
    }

    async testDatabaseComponents() {
        console.log('\n2️⃣ TESTING DATABASE COMPONENTS');
        console.log('==============================');

        // Test database managers
        const dbComponents = [
            './src/database/manager',
            './src/database/registration-logger',
            './src/database/setup'
        ];

        for (const component of dbComponents) {
            await this.testComponent(`Database: ${path.basename(component)}`, async () => {
                try {
                    const Module = require(component);
                    const instance = new Module();
                    return typeof instance === 'object';
                } catch (e) {
                    this.results.database_components[component] = { error: e.message };
                    return false;
                }
            });
        }

        // Test database tables exist
        const expectedTables = [
            'email_accounts',
            'registration_attempts', 
            'registration_steps',
            'survey_sites',
            'ai_interactions'
        ];

        for (const table of expectedTables) {
            await this.testComponent(`DB Table: ${table}`, async () => {
                const sqlite3 = require('sqlite3').verbose();
                return new Promise((resolve) => {
                    const db = new sqlite3.Database('poll-automation.db');
                    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
                        db.close();
                        resolve(!!row);
                    });
                });
            });
        }
    }

    async testAutomationModules() {
        console.log('\n3️⃣ TESTING AUTOMATION MODULES');
        console.log('==============================');

        const automationModules = [
            './src/automation/universal-form-automator',
            './src/automation/smart-form-filler',
            './src/email/email-account-manager',
            './src/email/llm-email-analyzer',
            './src/services/enhanced-poll-automation'
        ];

        for (const module of automationModules) {
            await this.testComponent(`Automation: ${path.basename(module)}`, async () => {
                try {
                    const Module = require(module);
                    
                    // Test constructor
                    const instance = new Module();
                    
                    // Test essential methods exist
                    const essentialMethods = this.getEssentialMethods(path.basename(module));
                    for (const method of essentialMethods) {
                        if (typeof instance[method] !== 'function') {
                            throw new Error(`Missing method: ${method}`);
                        }
                    }
                    
                    return true;
                } catch (e) {
                    this.results.automation_modules[module] = { error: e.message };
                    return false;
                }
            });
        }
    }

    async testAIServices() {
        console.log('\n4️⃣ TESTING AI SERVICES');
        console.log('=======================');

        const aiModules = [
            './src/ai/universal-form-analyzer',
            './src/ai/ContentUnderstandingAI', 
            './src/ai/logged-ai-wrapper'
        ];

        for (const module of aiModules) {
            await this.testComponent(`AI Module: ${path.basename(module)}`, async () => {
                try {
                    const Module = require(module);
                    const instance = new Module();
                    return typeof instance === 'object';
                } catch (e) {
                    this.results.ai_services[module] = { error: e.message };
                    return false;
                }
            });
        }

        // Test LLM integration
        await this.testComponent('LLM Integration', async () => {
            try {
                const response = await axios.post('http://localhost:5000/answer-questions', {
                    questions: [{ id: 1, text: 'Test question', type: 'text', options: [] }],
                    context: 'Diagnostic test'
                }, { timeout: 10000 });
                return response.data && response.data.answers;
            } catch (e) {
                return false;
            }
        });
    }

    async testEmailServices() {
        console.log('\n5️⃣ TESTING EMAIL SERVICES');
        console.log('==========================');

        // Test email components
        await this.testComponent('Email Account Manager', async () => {
            try {
                const EmailManager = require('./src/email/email-account-manager');
                const manager = new EmailManager({ headless: true });
                return typeof manager.createEmailAccount === 'function';
            } catch (e) {
                return false;
            }
        });

        await this.testComponent('LLM Email Analyzer', async () => {
            try {
                const LLMAnalyzer = require('./src/email/llm-email-analyzer');
                const analyzer = new LLMAnalyzer();
                return typeof analyzer.analyzeEmailPage === 'function';
            } catch (e) {
                return false;
            }
        });

        // Test email database integration
        await this.testComponent('Email Database Integration', async () => {
            const sqlite3 = require('sqlite3').verbose();
            return new Promise((resolve) => {
                const db = new sqlite3.Database('poll-automation.db');
                db.get('SELECT COUNT(*) as count FROM email_accounts', (err, row) => {
                    db.close();
                    resolve(!err && typeof row.count === 'number');
                });
            });
        });
    }

    async testCommandInterface() {
        console.log('\n6️⃣ TESTING COMMAND INTERFACE');
        console.log('=============================');

        // Test main app loading
        await this.testComponent('Main App Loading', async () => {
            try {
                delete require.cache[require.resolve('./app.js')];
                require('./app.js');
                return true;
            } catch (e) {
                this.results.command_interface['app.js'] = { error: e.message };
                return false;
            }
        });

        // Test command availability  
        const commands = [
            'create-email',
            'register', 
            'status',
            'db',
            'analyze'
        ];

        for (const command of commands) {
            await this.testComponent(`Command: ${command}`, async () => {
                return new Promise((resolve) => {
                    const child = spawn('node', ['app.js', command, '--help'], { 
                        stdio: 'pipe',
                        timeout: 10000 
                    });
                    
                    let output = '';
                    child.stdout.on('data', (data) => output += data.toString());
                    child.stderr.on('data', (data) => output += data.toString());
                    
                    child.on('close', (code) => {
                        resolve(output.includes('Usage:') || output.includes('Options:'));
                    });
                    
                    child.on('error', () => resolve(false));
                });
            });
        }
    }

    async testFileIntegrity() {
        console.log('\n7️⃣ TESTING FILE INTEGRITY');
        console.log('==========================');

        const criticalFiles = [
            './app.js',
            './src/email/email-account-manager.js',
            './src/email/llm-email-analyzer.js',
            './src/automation/universal-form-automator.js',
            './src/services/enhanced-poll-automation.js',
            './src/database/registration-logger.js',
            './src/ai/logged-ai-wrapper.js',
            './poll-automation.db'
        ];

        for (const file of criticalFiles) {
            await this.testComponent(`File: ${file}`, async () => {
                return fs.existsSync(file);
            });
        }

        // Test for syntax errors in JS files
        const jsFiles = criticalFiles.filter(f => f.endsWith('.js'));
        for (const file of jsFiles) {
            await this.testComponent(`Syntax: ${path.basename(file)}`, async () => {
                try {
                    if (fs.existsSync(file)) {
                        delete require.cache[require.resolve(file)];
                        require(file);
                        return true;
                    }
                    return false;
                } catch (e) {
                    this.results.file_integrity[file] = { error: e.message };
                    return false;
                }
            });
        }
    }

    async testDependencies() {
        console.log('\n8️⃣ TESTING DEPENDENCIES');
        console.log('========================');

        // Test package.json
        await this.testComponent('package.json', async () => {
            try {
                const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
                return pkg.dependencies && pkg.name;
            } catch (e) {
                return false;
            }
        });

        // Test node_modules
        await this.testComponent('node_modules', async () => {
            return fs.existsSync('./node_modules');
        });

        // Test critical dependencies
        const criticalDeps = ['playwright', 'sqlite3', 'axios', 'commander'];
        for (const dep of criticalDeps) {
            await this.testComponent(`Dependency: ${dep}`, async () => {
                return fs.existsSync(`./node_modules/${dep}`);
            });
        }
    }

    async testIntegrationPoints() {
        console.log('\n9️⃣ TESTING INTEGRATION POINTS');
        console.log('===============================');

        // Test email creation pipeline
        await this.testComponent('Email Creation Pipeline', async () => {
            try {
                const EmailManager = require('./src/email/email-account-manager');
                const LLMAnalyzer = require('./src/email/llm-email-analyzer');
                
                const manager = new EmailManager({ headless: true });
                const analyzer = new LLMAnalyzer();
                
                return typeof manager.createEmailAccount === 'function' &&
                       typeof analyzer.analyzeEmailPage === 'function';
            } catch (e) {
                return false;
            }
        });

        // Test database logging pipeline
        await this.testComponent('Database Logging Pipeline', async () => {
            try {
                const Logger = require('./src/database/registration-logger');
                const logger = new Logger();
                return typeof logger.logRegistrationAttempt === 'function';
            } catch (e) {
                return false;
            }
        });

        // Test LLM service integration
        await this.testComponent('LLM Service Integration', async () => {
            try {
                const ContentAI = require('./src/ai/ContentUnderstandingAI');
                const ai = new ContentAI();
                return typeof ai.callAIProvider === 'function';
            } catch (e) {
                return false;
            }
        });
    }

    async testComponent(name, testFunction) {
        this.results.summary.total_tests++;
        
        try {
            const result = await Promise.race([
                testFunction(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            
            if (result) {
                console.log(`✅ ${name}`);
                this.results.summary.passed++;
                return true;
            } else {
                console.log(`❌ ${name} - Test returned false`);
                this.results.summary.failed++;
                this.results.summary.broken_components.push(name);
                return false;
            }
        } catch (error) {
            console.log(`💥 ${name} - ${error.message}`);
            this.results.summary.failed++;
            this.results.summary.critical_failures.push({ component: name, error: error.message });
            this.results.summary.broken_components.push(name);
            return false;
        }
    }

    getEssentialMethods(moduleName) {
        const methodMap = {
            'email-account-manager': ['createEmailAccount', 'initialize', 'cleanup'],
            'llm-email-analyzer': ['analyzeEmailPage', 'retrieveEmailUsingAnalysis'],
            'universal-form-automator': ['initialize', 'fillForm'],
            'smart-form-filler': ['fillForm'],
            'enhanced-poll-automation': ['initialize', 'cleanup']
        };
        return methodMap[moduleName] || [];
    }

    generateReport() {
        console.log('\n📊 COMPREHENSIVE DIAGNOSTIC REPORT');
        console.log('====================================');
        
        const { total_tests, passed, failed, critical_failures, broken_components } = this.results.summary;
        const successRate = ((passed / total_tests) * 100).toFixed(1);
        
        console.log(`\n📈 SUMMARY STATISTICS:`);
        console.log(`Total Tests: ${total_tests}`);
        console.log(`✅ Passed: ${passed} (${successRate}%)`);
        console.log(`❌ Failed: ${failed} (${(100 - successRate).toFixed(1)}%)`);
        
        if (critical_failures.length > 0) {
            console.log(`\n💥 CRITICAL FAILURES (${critical_failures.length}):`);
            critical_failures.forEach((failure, index) => {
                console.log(`${index + 1}. ${failure.component}: ${failure.error}`);
            });
        }
        
        if (broken_components.length > 0) {
            console.log(`\n🔧 BROKEN COMPONENTS (${broken_components.length}):`);
            broken_components.forEach((component, index) => {
                console.log(`${index + 1}. ${component}`);
            });
        }
        
        console.log(`\n🎯 SYSTEM HEALTH: ${successRate >= 80 ? '🟢 GOOD' : successRate >= 60 ? '🟡 FAIR' : '🔴 POOR'}`);
        
        // Save detailed report
        const reportPath = './diagnostic-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📝 Detailed report saved: ${reportPath}`);
        
        if (failed > 0) {
            console.log('\n🚨 ACTION REQUIRED: Fix the broken components listed above');
        } else {
            console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
        }
    }
}

// Run diagnostic
const diagnostic = new ComprehensiveSystemDiagnostic();
diagnostic.runFullDiagnostic().catch(console.error);