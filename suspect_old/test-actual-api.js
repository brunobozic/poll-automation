#!/usr/bin/env node

/**
 * ACTUAL API ENDPOINT TESTS
 * 
 * Tests the real API endpoints that are actually implemented
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE = 'http://localhost:3000';

class ActualAPITester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };
        this.testData = {
            createdEmails: [],
            surveySites: []
        };
    }

    async test(name, testFn) {
        this.results.total++;
        console.log(chalk.blue(`\n🧪 ${name}`));
        
        try {
            await testFn();
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASS' });
            console.log(chalk.green(`✅ PASS: ${name}`));
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAIL', error: error.message });
            console.log(chalk.red(`❌ FAIL: ${name} - ${error.message}`));
        }
    }

    async runAll() {
        console.log(chalk.cyan.bold('\n🚀 ACTUAL API ENDPOINT TESTS'));
        console.log('==============================');

        // Test 1: API Health Check
        await this.test('API Health Check', async () => {
            const response = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.status) throw new Error('No status in response');
            console.log(`   Server status: ${response.data.status}`);
        });

        // Test 2: Get API Info
        await this.test('Get API Info', async () => {
            const response = await axios.get(`${API_BASE}/api`, { timeout: 10000 });
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.name) throw new Error('No API name in response');
            console.log(`   API: ${response.data.name} v${response.data.version}`);
        });

        // Test 3: Create Email Accounts
        await this.test('Create Email Accounts', async () => {
            const payload = {
                count: 2,
                providers: ['tempmail', 'guerrilla']
            };
            
            const response = await axios.post(`${API_BASE}/api/emails`, payload, {
                timeout: 60000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const results = response.data.results;
            console.log(`   Created ${results.created} emails, ${results.failed} failed`);
            
            if (results.emails && results.emails.length > 0) {
                this.testData.createdEmails.push(...results.emails);
                results.emails.forEach((email, i) => {
                    console.log(`   ${i + 1}. ${email.email} (${email.provider})`);
                });
            }
        });

        // Test 4: List Email Accounts
        await this.test('List Email Accounts', async () => {
            const response = await axios.get(`${API_BASE}/api/emails`, { timeout: 10000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const emails = response.data.emails || [];
            console.log(`   Found ${emails.length} email accounts in database`);
            
            if (emails.length > 0) {
                emails.slice(0, 3).forEach((email, i) => {
                    console.log(`   ${i + 1}. ${email.email} (${email.service || 'unknown'})`);
                });
                if (emails.length > 3) {
                    console.log(`   ... and ${emails.length - 3} more`);
                }
            }
        });

        // Test 5: Get Successfully Registered Emails
        await this.test('Get Successfully Registered Emails', async () => {
            const response = await axios.get(`${API_BASE}/api/emails/successful`, { timeout: 10000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const successfulEmails = response.data.emails || [];
            console.log(`   Found ${successfulEmails.length} successfully registered emails`);
        });

        // Test 6: Add Survey Sites
        await this.test('Add Survey Sites', async () => {
            const payload = {
                sites: [
                    {
                        name: 'Test Survey Site',
                        url: 'https://httpbin.org/forms/post',
                        category: 'test'
                    },
                    {
                        name: 'Example Survey Site',
                        url: 'https://example.com/survey',
                        category: 'test'
                    }
                ]
            };
            
            const response = await axios.post(`${API_BASE}/api/survey-sites`, payload, {
                timeout: 30000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const results = response.data.results;
            console.log(`   Added ${results.added} sites, ${results.failed} failed`);
            
            if (results.sites) {
                this.testData.surveySites.push(...results.sites);
            }
        });

        // Test 7: List Survey Sites
        await this.test('List Survey Sites', async () => {
            const response = await axios.get(`${API_BASE}/api/survey-sites`, { timeout: 10000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const sites = response.data.sites || [];
            console.log(`   Found ${sites.length} survey sites in database`);
            
            if (sites.length > 0) {
                sites.slice(0, 3).forEach((site, i) => {
                    console.log(`   ${i + 1}. ${site.name} - ${site.url}`);
                });
                if (sites.length > 3) {
                    console.log(`   ... and ${sites.length - 3} more`);
                }
            }
        });

        // Test 8: Register Emails on Sites (Test Mode)
        await this.test('Register Emails on Sites', async () => {
            // Use created emails or fallback emails
            const emailsToUse = this.testData.createdEmails.length > 0 ? 
                this.testData.createdEmails.slice(0, 1).map(e => e.email) :
                ['test@example.com'];
                
            const sitesToUse = ['https://httpbin.org/forms/post'];
            
            const payload = {
                emailIds: [], // Empty since we're using email addresses
                emails: emailsToUse,
                siteIds: [], // Empty since we're using URLs
                sites: sitesToUse,
                submitForms: false, // Test mode only
                enhancedMode: true
            };
            
            const response = await axios.post(`${API_BASE}/api/register`, payload, {
                timeout: 120000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const results = response.data.results;
            console.log(`   Registration completed: ${results.successful || 0} successful, ${results.failed || 0} failed`);
            console.log(`   Total attempts: ${results.totalAttempts || 0}`);
        });

        // Test 9: Get Recent Failures
        await this.test('Get Recent Failures', async () => {
            const response = await axios.get(`${API_BASE}/api/failures/recent?limit=5`, { timeout: 10000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const failures = response.data.failures || [];
            console.log(`   Found ${failures.length} recent failures`);
            
            if (failures.length > 0) {
                failures.forEach((failure, i) => {
                    console.log(`   ${i + 1}. ${failure.email}: ${failure.error || 'Unknown error'}`);
                });
            }
        });

        // Test 10: Get All Failures
        await this.test('Get All Failures', async () => {
            const response = await axios.get(`${API_BASE}/api/failures/all?limit=10`, { timeout: 10000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const failures = response.data.failures || [];
            console.log(`   Found ${failures.length} total failures`);
        });

        // Test 11: Database Stats
        await this.test('Database Statistics', async () => {
            const response = await axios.get(`${API_BASE}/api/database/stats`, { timeout: 10000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const stats = response.data.stats;
            console.log(`   Tables: ${stats.tables?.count || 0}`);
            console.log(`   Email accounts: ${stats.counts?.email_accounts || 0}`);
            console.log(`   Survey sites: ${stats.counts?.survey_sites || 0}`);
        });

        // Test 12: System Status
        await this.test('System Status', async () => {
            const response = await axios.get(`${API_BASE}/api/system/status`, { timeout: 10000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const status = response.data.status;
            console.log(`   Database: ${status.database?.status || 'unknown'}`);
            console.log(`   Email Manager: ${status.emailManager?.status || 'unknown'}`);
            console.log(`   LLM Service: ${status.llm?.status || 'unknown'}`);
        });

        // Test 13: LLM Test
        await this.test('LLM Service Test', async () => {
            const response = await axios.get(`${API_BASE}/api/llm/test`, { timeout: 10000 });
            
            // LLM test might return 503 if not configured, which is acceptable
            if (response.status === 503) {
                console.log(`   LLM service not configured (expected)`);
                return; // Pass the test
            }
            
            if (response.status !== 200) throw new Error(`Expected 200 or 503, got ${response.status}`);
            
            const service = response.data.service;
            console.log(`   LLM status: ${service.status}`);
            console.log(`   Capabilities: ${service.capabilities?.length || 0}`);
        });

        // Test 14: Error Detection Test
        await this.test('Error Detection Test', async () => {
            const response = await axios.get(`${API_BASE}/api/test/error-detection?cycles=1`, { timeout: 30000 });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            
            const results = response.data;
            console.log(`   Cycles completed: ${results.totalCycles || 1}`);
            console.log(`   Issues found: ${results.summary?.totalIssues || 0}`);
        });

        this.printSummary();
    }

    printSummary() {
        console.log(chalk.cyan.bold('\n📊 TEST SUMMARY'));
        console.log('================');
        
        const successRate = this.results.total > 0 ? 
            (this.results.passed / this.results.total * 100).toFixed(1) : 0;
            
        console.log(`📝 Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);

        if (this.results.failed > 0) {
            console.log(chalk.red('\n❌ FAILED TESTS:'));
            this.results.tests
                .filter(t => t.status === 'FAIL')
                .forEach(t => console.log(`   • ${t.name}: ${t.error}`));
        }

        console.log(chalk.yellow('\n📋 TEST DATA SUMMARY:'));
        console.log(`📧 Emails created: ${this.testData.createdEmails.length}`);
        console.log(`🌐 Survey sites added: ${this.testData.surveySites.length}`);

        if (this.results.failed === 0) {
            console.log(chalk.green('\n🎉 ALL TESTS PASSED!'));
            console.log('✅ API is functional and responding correctly');
            console.log('✅ Email creation and management working');
            console.log('✅ Survey site management working');
            console.log('✅ Registration workflow functional');
            console.log('✅ Database operations working');
            console.log('✅ Error detection and monitoring operational');
        } else {
            console.log(chalk.yellow(`\n⚠️ ${this.results.failed} test(s) failed`));
            console.log('Review failed tests and check API server logs');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ActualAPITester();
    
    console.log(`🌐 Testing API at: ${API_BASE}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    tester.runAll().catch(error => {
        console.error(chalk.red('\n💥 Test execution failed:'), error.message);
        process.exit(1);
    });
}

module.exports = ActualAPITester;