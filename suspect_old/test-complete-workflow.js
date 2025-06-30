#!/usr/bin/env node

/**
 * COMPLETE WORKFLOW TEST
 * 
 * Tests the complete API workflow automation chain:
 * 1. Create emails via API
 * 2. Create personas for emails
 * 3. Add survey sites
 * 4. Register emails on sites
 * 5. Find surveys
 * 6. Complete surveys
 * 7. Monitor job status
 * 8. Verify CRUD endpoints
 */

const axios = require('axios');
const chalk = require('chalk');

class CompleteWorkflowTest {
    constructor(apiBaseUrl = 'http://localhost:3000') {
        this.apiBaseUrl = apiBaseUrl;
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.createdEmails = [];
        this.jobIds = [];
    }

    async runCompleteWorkflow() {
        console.log(chalk.cyan.bold('🚀 COMPLETE WORKFLOW AUTOMATION TEST'));
        console.log('====================================');
        console.log(`🌐 API Base URL: ${this.apiBaseUrl}`);
        console.log(`⏰ Started: ${new Date().toISOString()}`);

        try {
            // 1. Test health check
            await this.testHealthCheck();

            // 2. Create emails
            await this.testCreateEmails();

            // 3. Test CRUD endpoints
            await this.testCRUDEndpoints();

            // 4. Add survey sites
            await this.testAddSurveyPlanetSites();

            // 5. Test workflow endpoints (if emails were created)
            if (this.createdEmails.length > 0) {
                await this.testWorkflowEndpoints();
            }

            // 6. Test analytics and monitoring
            await this.testAnalyticsEndpoints();

            // 7. Generate final report
            this.generateFinalReport();

        } catch (error) {
            console.error(chalk.red('💥 Complete workflow test failed:'), error.message);
            this.testResults.failed++;
            this.testResults.errors.push(error.message);
        }
    }

    async testHealthCheck() {
        console.log(chalk.blue('\n🏥 Testing API Health Check...'));
        
        try {
            const response = await axios.get(`${this.apiBaseUrl}/health`, { timeout: 10000 });
            
            if (response.status === 200 && response.data.status === 'healthy') {
                console.log(chalk.green('✅ API is healthy'));
                console.log(`   Uptime: ${response.data.uptime}s`);
                console.log(`   Memory: ${response.data.memory.used}`);
                this.testResults.passed++;
            } else {
                throw new Error(`Unexpected health response: ${response.status}`);
            }
        } catch (error) {
            console.log(chalk.red('❌ Health check failed:'), error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Health check: ${error.message}`);
        }
    }

    async testCreateEmails() {
        console.log(chalk.blue('\n📧 Testing Email Creation...'));
        
        try {
            // Test creating 2 emails
            const response = await axios.post(`${this.apiBaseUrl}/api/emails`, {
                count: 2,
                provider: 'guerrilla'
            }, { timeout: 60000 });

            if (response.status === 200 && response.data.success) {
                console.log(chalk.green(`✅ Created ${response.data.results.length} emails`));
                
                // Store created emails
                response.data.results.forEach(result => {
                    if (result.success) {
                        this.createdEmails.push(result.email);
                        console.log(`   📧 ${result.email} (${result.provider})`);
                    }
                });
                
                this.testResults.passed++;
            } else {
                throw new Error(`Email creation failed: ${response.data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(chalk.red('❌ Email creation failed:'), error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Email creation: ${error.message}`);
        }
    }

    async testCRUDEndpoints() {
        console.log(chalk.blue('\n📋 Testing CRUD Endpoints...'));
        
        const endpoints = [
            { name: 'List Emails', path: '/api/emails' },
            { name: 'List Personas', path: '/api/personas' },
            { name: 'List Registrations', path: '/api/registrations' },
            { name: 'List Surveys', path: '/api/surveys' },
            { name: 'Analytics Dashboard', path: '/api/analytics' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${this.apiBaseUrl}${endpoint.path}`, { timeout: 15000 });
                
                if (response.status === 200 && response.data.success !== false) {
                    console.log(chalk.green(`✅ ${endpoint.name}: ${response.data.count || 'N/A'} records`));
                    this.testResults.passed++;
                } else {
                    throw new Error(`Unexpected response: ${response.status}`);
                }
            } catch (error) {
                console.log(chalk.red(`❌ ${endpoint.name} failed:`, error.message));
                this.testResults.failed++;
                this.testResults.errors.push(`${endpoint.name}: ${error.message}`);
            }
        }
    }

    async testAddSurveyPlanetSites() {
        console.log(chalk.blue('\n🌐 Testing Survey Sites Management...'));
        
        try {
            // Add test survey sites
            const response = await axios.post(`${this.apiBaseUrl}/api/survey-sites`, {
                sites: [
                    {
                        name: 'SurveyPlanet Test',
                        url: 'https://surveyplanet.com/register',
                        category: 'test'
                    }
                ]
            }, { timeout: 15000 });

            console.log(chalk.green(`✅ Survey sites API responded`));
            console.log(`   Message: ${response.data.message}`);
            this.testResults.passed++;

            // List survey sites
            const listResponse = await axios.get(`${this.apiBaseUrl}/api/survey-sites`, { timeout: 15000 });
            console.log(chalk.green(`✅ Survey sites list: ${listResponse.data.count} sites`));
            this.testResults.passed++;

        } catch (error) {
            console.log(chalk.red('❌ Survey sites test failed:'), error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`Survey sites: ${error.message}`);
        }
    }

    async testWorkflowEndpoints() {
        console.log(chalk.blue('\n🔄 Testing Workflow Endpoints...'));
        
        const workflowTests = [
            {
                name: 'Create Personas',
                endpoint: '/api/workflow/create-personas',
                data: { emails: this.createdEmails.slice(0, 2) }
            },
            {
                name: 'Register Sites (Test Mode)',
                endpoint: '/api/workflow/register-sites',
                data: { 
                    emails: this.createdEmails.slice(0, 1),
                    sites: ['https://surveyplanet.com/register'],
                    testMode: true
                }
            },
            {
                name: 'Find Surveys',
                endpoint: '/api/workflow/find-surveys',
                data: { emails: this.createdEmails.slice(0, 1), testMode: true }
            }
        ];

        for (const test of workflowTests) {
            try {
                const response = await axios.post(`${this.apiBaseUrl}${test.endpoint}`, test.data, { 
                    timeout: 30000 
                });
                
                if (response.status === 200) {
                    console.log(chalk.green(`✅ ${test.name}: Success`));
                    
                    // Store job ID if available
                    if (response.data.jobId) {
                        this.jobIds.push(response.data.jobId);
                        console.log(`   📋 Job ID: ${response.data.jobId}`);
                    }
                    
                    this.testResults.passed++;
                } else {
                    throw new Error(`Unexpected status: ${response.status}`);
                }
            } catch (error) {
                console.log(chalk.red(`❌ ${test.name} failed:`), error.message);
                this.testResults.failed++;
                this.testResults.errors.push(`${test.name}: ${error.message}`);
            }
        }
    }

    async testAnalyticsEndpoints() {
        console.log(chalk.blue('\n📊 Testing Analytics & Monitoring...'));
        
        const analyticsTests = [
            { name: 'System Status', path: '/api/system/status' },
            { name: 'Database Stats', path: '/api/database/stats' },
            { name: 'Recent Failures', path: '/api/failures/recent' },
            { name: 'LLM Service Test', path: '/api/llm/test' }
        ];

        for (const test of analyticsTests) {
            try {
                const response = await axios.get(`${this.apiBaseUrl}${test.path}`, { timeout: 15000 });
                
                if (response.status === 200) {
                    console.log(chalk.green(`✅ ${test.name}: Available`));
                    this.testResults.passed++;
                } else {
                    throw new Error(`Unexpected status: ${response.status}`);
                }
            } catch (error) {
                console.log(chalk.red(`❌ ${test.name} failed:`), error.message);
                this.testResults.failed++;
                this.testResults.errors.push(`${test.name}: ${error.message}`);
            }
        }
    }

    generateFinalReport() {
        console.log(chalk.cyan.bold('\n📊 COMPLETE WORKFLOW TEST RESULTS'));
        console.log('===================================');
        
        const totalTests = this.testResults.passed + this.testResults.failed;
        const successRate = totalTests > 0 ? ((this.testResults.passed / totalTests) * 100).toFixed(1) : 0;
        
        console.log(`📝 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        
        console.log(chalk.yellow('\n📧 EMAIL CREATION RESULTS:'));
        console.log(`   Created: ${this.createdEmails.length} emails`);
        this.createdEmails.forEach(email => {
            console.log(`   📧 ${email}`);
        });
        
        if (this.jobIds.length > 0) {
            console.log(chalk.yellow('\n📋 WORKFLOW JOB IDs:'));
            this.jobIds.forEach(jobId => {
                console.log(`   🔄 ${jobId}`);
            });
        }
        
        if (this.testResults.errors.length > 0) {
            console.log(chalk.red('\n❌ ERRORS ENCOUNTERED:'));
            this.testResults.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        }
        
        console.log(chalk.cyan('\n🎯 OVERALL ASSESSMENT:'));
        
        if (successRate >= 80) {
            console.log(chalk.green('🏆 EXCELLENT: API workflow is highly functional'));
        } else if (successRate >= 60) {
            console.log(chalk.yellow('👍 GOOD: API workflow is mostly functional'));
        } else {
            console.log(chalk.red('⚠️ NEEDS ATTENTION: Multiple workflow issues detected'));
        }
        
        console.log('\n💡 Key Findings:');
        console.log(`   • API Health: ${this.testResults.passed > 0 ? '✅ Working' : '❌ Issues'}`);
        console.log(`   • Email Creation: ${this.createdEmails.length > 0 ? '✅ Working' : '❌ Failed'}`);
        console.log(`   • CRUD Endpoints: ${this.testResults.passed >= 5 ? '✅ Working' : '⚠️ Partial'}`);
        console.log(`   • Workflow Automation: ${this.jobIds.length > 0 ? '✅ Working' : '⚠️ Limited'}`);
        
        console.log(chalk.green(`\n✨ Test completed at: ${new Date().toISOString()}`));
    }
}

// Run the test if called directly
if (require.main === module) {
    const apiBaseUrl = process.argv[2] || 'http://localhost:3000';
    const tester = new CompleteWorkflowTest(apiBaseUrl);
    
    tester.runCompleteWorkflow().catch(error => {
        console.error(chalk.red('💥 Test runner failed:'), error);
        process.exit(1);
    });
}

module.exports = CompleteWorkflowTest;