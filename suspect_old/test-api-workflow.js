#!/usr/bin/env node

/**
 * WORKFLOW AUTOMATION API TEST RUNNER
 * 
 * Quick test runner to validate the workflow automation API endpoints
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE = 'http://localhost:3000';

class QuickAPITester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
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
        console.log(chalk.cyan.bold('\n🚀 WORKFLOW AUTOMATION API TESTS'));
        console.log('==================================');

        // Test 1: API Health Check
        await this.test('API Health Check', async () => {
            const response = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.status) throw new Error('No status in response');
            console.log(`   Server status: ${response.data.status}`);
        });

        // Test 2: Create Single Email
        await this.test('Create Single Email', async () => {
            const payload = {
                count: 1,
                providers: ['auto'],
                saveToDatabase: true
            };
            
            const response = await axios.post(`${API_BASE}/api/workflow/create-emails`, payload, {
                timeout: 30000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            if (response.data.results.created !== 1) throw new Error('Expected 1 email created');
            
            const email = response.data.results.emails[0];
            console.log(`   Created email: ${email.email} (${email.provider})`);
        });

        // Test 3: Create Multiple Emails
        await this.test('Create Multiple Emails', async () => {
            const payload = {
                count: 2,
                providers: ['auto'],
                saveToDatabase: true
            };
            
            const response = await axios.post(`${API_BASE}/api/workflow/create-emails`, payload, {
                timeout: 45000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            if (!response.data.success) throw new Error('API returned success: false');
            if (response.data.results.created < 1) throw new Error('No emails created');
            
            console.log(`   Created ${response.data.results.created} emails`);
        });

        // Test 4: Create Personas
        await this.test('Create Personas', async () => {
            const payload = {
                emails: ['test@example.com'],
                personaTypes: ['auto'],
                optimizeForSurveys: true
            };
            
            const response = await axios.post(`${API_BASE}/api/workflow/create-personas`, payload, {
                timeout: 30000
            });
            
            // Should complete successfully or handle gracefully
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            console.log(`   Persona creation completed`);
        });

        // Test 5: Register Sites (Test Mode)
        await this.test('Register Sites (Test Mode)', async () => {
            const payload = {
                emails: ['test@example.com'],
                sites: ['https://httpbin.org/forms/post'],
                submitForms: false, // Test mode
                usePersonas: true,
                enableLogging: true
            };
            
            const response = await axios.post(`${API_BASE}/api/workflow/register-sites`, payload, {
                timeout: 60000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            console.log(`   Registration workflow completed`);
        });

        // Test 6: Find Surveys
        await this.test('Find Surveys', async () => {
            const payload = {
                emails: ['test@example.com'],
                sites: ['https://httpbin.org'],
                checkEligibility: true
            };
            
            const response = await axios.post(`${API_BASE}/api/workflow/find-surveys`, payload, {
                timeout: 45000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            console.log(`   Survey finding completed`);
        });

        // Test 7: Complete Surveys (Test Mode)
        await this.test('Complete Surveys (Test Mode)', async () => {
            const payload = {
                emails: ['test@example.com'],
                surveyUrls: ['https://httpbin.org/forms/post'],
                completionStrategy: 'realistic',
                usePersonas: true
            };
            
            const response = await axios.post(`${API_BASE}/api/workflow/complete-surveys`, payload, {
                timeout: 60000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            console.log(`   Survey completion workflow completed`);
        });

        // Test 8: Full Automation (Test Mode)
        await this.test('Full Automation (Test Mode)', async () => {
            const payload = {
                sites: ['https://httpbin.org'],
                config: {
                    emailsPerSite: 1,
                    enablePersonas: true,
                    enableRegistration: false, // Test mode
                    enableSurveyCompletion: false, // Test mode
                    stealthLevel: 'medium'
                }
            };
            
            const response = await axios.post(`${API_BASE}/api/workflow/full-automation`, payload, {
                timeout: 120000
            });
            
            if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
            console.log(`   Full automation workflow completed`);
        });

        // Test 9: Error Handling - Invalid Email Count
        await this.test('Error Handling - Invalid Email Count', async () => {
            const payload = { count: -1 };
            
            try {
                const response = await axios.post(`${API_BASE}/api/workflow/create-emails`, payload);
                
                if (response.status === 400) {
                    console.log(`   ✅ Correctly rejected invalid count`);
                    return; // Test passed
                } else {
                    throw new Error('Should have rejected invalid count');
                }
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log(`   ✅ Correctly rejected invalid count`);
                    return; // Test passed
                }
                throw error; // Re-throw if not expected error
            }
        });

        // Test 10: Error Handling - Empty Sites Array
        await this.test('Error Handling - Empty Sites Array', async () => {
            const payload = { sites: [] };
            
            try {
                const response = await axios.post(`${API_BASE}/api/workflow/full-automation`, payload);
                
                if (response.status === 400) {
                    console.log(`   ✅ Correctly rejected empty sites`);
                    return; // Test passed
                } else {
                    throw new Error('Should have rejected empty sites');
                }
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log(`   ✅ Correctly rejected empty sites`);
                    return; // Test passed
                }
                throw error; // Re-throw if not expected error
            }
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

        if (this.results.failed === 0) {
            console.log(chalk.green('\n🎉 ALL TESTS PASSED!'));
        } else {
            console.log(chalk.yellow(`\n⚠️ ${this.results.failed} test(s) failed`));
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new QuickAPITester();
    
    console.log(`🌐 Testing API at: ${API_BASE}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    tester.runAll().catch(error => {
        console.error(chalk.red('\n💥 Test execution failed:'), error.message);
        process.exit(1);
    });
}

module.exports = QuickAPITester;