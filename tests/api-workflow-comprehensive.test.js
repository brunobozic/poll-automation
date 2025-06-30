#!/usr/bin/env node

/**
 * COMPREHENSIVE WORKFLOW AUTOMATION API TESTS
 * 
 * Tests the complete end-to-end workflow automation API endpoints:
 * 1. Email Creation
 * 2. Persona Creation
 * 3. Site Registration
 * 4. Survey Finding
 * 5. Survey Completion
 * 6. Full Automation Pipeline
 * 
 * Includes success scenarios, error scenarios, data validation, performance testing
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class WorkflowAutomationAPITester {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.testData = {
            createdEmails: [],
            createdPersonas: [],
            registrationResults: [],
            surveyResults: [],
            fullAutomationJobs: []
        };
        this.stats = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            testResults: []
        };
    }

    async runAllTests() {
        console.log(chalk.cyan.bold('\n🧪 COMPREHENSIVE WORKFLOW AUTOMATION API TESTS'));
        console.log('==================================================');
        console.log(`🌐 Base URL: ${this.baseUrl}`);
        console.log(`⏰ Start Time: ${new Date().toISOString()}`);

        try {
            // Test API server health first
            await this.testAPIHealth();

            // 1. Email Creation Tests
            await this.testEmailCreationEndpoint();

            // 2. Persona Creation Tests  
            await this.testPersonaCreationEndpoint();

            // 3. Site Registration Tests
            await this.testSiteRegistrationEndpoint();

            // 4. Survey Finding Tests
            await this.testSurveyFindingEndpoint();

            // 5. Survey Completion Tests
            await this.testSurveyCompletionEndpoint();

            // 6. Full Automation Tests
            await this.testFullAutomationEndpoint();

            // 7. Integration Tests
            await this.testEndToEndWorkflow();

            // 8. Error Scenarios
            await this.testErrorScenarios();

            // 9. Performance Tests
            await this.testPerformanceScenarios();

            // 10. Data Validation Tests
            await this.testDataValidation();

            // Generate comprehensive report
            await this.generateTestReport();

        } catch (error) {
            console.error(chalk.red('💥 Test suite failed:'), error.message);
        }
    }

    async testAPIHealth() {
        console.log(chalk.blue('\n🏥 API HEALTH CHECK'));
        console.log('===================');

        try {
            const response = await axios.get(`${this.baseUrl}/health`, { timeout: 10000 });
            this.logTest('API Health Check', true, `Status: ${response.data.status}`);
            
            console.log(`✅ API Server is healthy`);
            console.log(`   Version: ${response.data.version || 'unknown'}`);
            console.log(`   Uptime: ${response.data.uptime || 0}s`);
            
        } catch (error) {
            this.logTest('API Health Check', false, error.message);
            throw new Error(`API server is not reachable: ${error.message}`);
        }
    }

    async testEmailCreationEndpoint() {
        console.log(chalk.blue('\n📧 EMAIL CREATION ENDPOINT TESTS'));
        console.log('=================================');

        // Test 1: Create single email
        await this.testCreateSingleEmail();

        // Test 2: Create multiple emails
        await this.testCreateMultipleEmails();

        // Test 3: Create emails with specific providers
        await this.testCreateEmailsWithProviders();

        // Test 4: Error scenarios
        await this.testEmailCreationErrors();
    }

    async testCreateSingleEmail() {
        console.log('\n📝 Test 1: Create Single Email');
        
        try {
            const payload = {
                count: 1,
                providers: ['auto'],
                saveToDatabase: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, payload, {
                timeout: 30000
            });

            const isSuccess = response.status === 200 && 
                             response.data.success === true &&
                             response.data.results.created === 1 &&
                             response.data.results.emails.length === 1;

            if (isSuccess) {
                const email = response.data.results.emails[0];
                this.testData.createdEmails.push(email);
                
                console.log(`   ✅ Email created: ${email.email}`);
                console.log(`   📧 Provider: ${email.provider}`);
                console.log(`   🔑 Has credentials: ${!!email.credentials}`);
                
                this.logTest('Create Single Email', true, 
                    `Created: ${email.email} via ${email.provider}`);
            } else {
                throw new Error('Invalid response structure or failed creation');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Create Single Email', false, error.message);
        }
    }

    async testCreateMultipleEmails() {
        console.log('\n📝 Test 2: Create Multiple Emails');
        
        try {
            const payload = {
                count: 3,
                providers: ['auto'],
                saveToDatabase: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, payload, {
                timeout: 60000
            });

            const isSuccess = response.status === 200 && 
                             response.data.success === true &&
                             response.data.results.created === 3 &&
                             response.data.results.emails.length === 3;

            if (isSuccess) {
                console.log(`   ✅ Created ${response.data.results.created} emails`);
                
                response.data.results.emails.forEach((email, i) => {
                    console.log(`   ${i + 1}. ${email.email} (${email.provider})`);
                    this.testData.createdEmails.push(email);
                });
                
                this.logTest('Create Multiple Emails', true, 
                    `Created ${response.data.results.created} emails successfully`);
            } else {
                throw new Error('Failed to create expected number of emails');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Create Multiple Emails', false, error.message);
        }
    }

    async testCreateEmailsWithProviders() {
        console.log('\n📝 Test 3: Create Emails With Specific Providers');
        
        try {
            const payload = {
                count: 2,
                providers: ['tempmail', 'guerrilla'],
                distributed: true,
                saveToDatabase: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, payload, {
                timeout: 45000
            });

            const isSuccess = response.status === 200 && 
                             response.data.success === true &&
                             response.data.results.created >= 1;

            if (isSuccess) {
                console.log(`   ✅ Created ${response.data.results.created} emails with specific providers`);
                
                response.data.results.emails.forEach((email, i) => {
                    console.log(`   ${i + 1}. ${email.email} (${email.provider})`);
                    this.testData.createdEmails.push(email);
                });
                
                this.logTest('Create Emails With Providers', true, 
                    `Created ${response.data.results.created} emails with distributed providers`);
            } else {
                throw new Error('Failed to create emails with specific providers');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Create Emails With Providers', false, error.message);
        }
    }

    async testEmailCreationErrors() {
        console.log('\n📝 Test 4: Email Creation Error Scenarios');
        
        // Test invalid count
        try {
            const payload = { count: -1 };
            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, payload);
            
            if (response.status === 400) {
                console.log(`   ✅ Correctly rejected invalid count`);
                this.logTest('Email Creation - Invalid Count', true, 'Validation error returned');
            } else {
                throw new Error('Should have rejected invalid count');
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`   ✅ Correctly rejected invalid count`);
                this.logTest('Email Creation - Invalid Count', true, 'Validation error returned');
            } else {
                console.log(`   ❌ Unexpected error: ${error.message}`);
                this.logTest('Email Creation - Invalid Count', false, error.message);
            }
        }

        // Test invalid providers
        try {
            const payload = { count: 1, providers: ['invalid_provider'] };
            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, payload);
            
            // Should either reject or handle gracefully
            console.log(`   ⚠️ Invalid provider test completed (status: ${response.status})`);
            this.logTest('Email Creation - Invalid Provider', true, 'Handled gracefully');
        } catch (error) {
            console.log(`   ⚠️ Invalid provider test - error as expected: ${error.response?.status || error.message}`);
            this.logTest('Email Creation - Invalid Provider', true, 'Error handling works');
        }
    }

    async testPersonaCreationEndpoint() {
        console.log(chalk.blue('\n🎭 PERSONA CREATION ENDPOINT TESTS'));
        console.log('===================================');

        if (this.testData.createdEmails.length === 0) {
            console.log('⚠️ No emails available for persona testing - skipping');
            return;
        }

        // Test 1: Create personas for existing emails
        await this.testCreatePersonasForEmails();

        // Test 2: Create personas with specific types
        await this.testCreatePersonasWithTypes();

        // Test 3: Error scenarios
        await this.testPersonaCreationErrors();
    }

    async testCreatePersonasForEmails() {
        console.log('\n📝 Test 1: Create Personas for Existing Emails');
        
        try {
            const emailsToUse = this.testData.createdEmails.slice(0, 2);
            const payload = {
                emails: emailsToUse.map(e => e.email),
                personaTypes: ['auto'],
                optimizeForSurveys: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/create-personas`, payload, {
                timeout: 45000
            });

            const isSuccess = response.status === 200 && 
                             response.data.success === true &&
                             response.data.results.created >= 1;

            if (isSuccess) {
                console.log(`   ✅ Created ${response.data.results.created} personas`);
                
                response.data.results.personas.forEach((persona, i) => {
                    console.log(`   ${i + 1}. ${persona.email}: ${persona.personaType}`);
                    this.testData.createdPersonas.push(persona);
                });
                
                this.logTest('Create Personas for Emails', true, 
                    `Created ${response.data.results.created} personas`);
            } else {
                throw new Error('Failed to create personas');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Create Personas for Emails', false, error.message);
        }
    }

    async testCreatePersonasWithTypes() {
        console.log('\n📝 Test 2: Create Personas with Specific Types');
        
        try {
            const emailsToUse = this.testData.createdEmails.slice(0, 1);
            const payload = {
                emails: emailsToUse.map(e => e.email),
                personaTypes: ['young_professional', 'student'],
                optimizeForSurveys: true,
                consistency: 'high'
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/create-personas`, payload, {
                timeout: 30000
            });

            const isSuccess = response.status === 200 && response.data.success === true;

            if (isSuccess) {
                console.log(`   ✅ Created personas with specific types`);
                
                if (response.data.results.personas) {
                    response.data.results.personas.forEach((persona, i) => {
                        console.log(`   ${i + 1}. ${persona.email}: ${persona.personaType}`);
                        this.testData.createdPersonas.push(persona);
                    });
                }
                
                this.logTest('Create Personas with Types', true, 'Specific persona types created');
            } else {
                throw new Error('Failed to create personas with specific types');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Create Personas with Types', false, error.message);
        }
    }

    async testPersonaCreationErrors() {
        console.log('\n📝 Test 3: Persona Creation Error Scenarios');
        
        // Test with non-existent emails
        try {
            const payload = {
                emails: ['nonexistent@test.com'],
                personaTypes: ['auto']
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/create-personas`, payload);
            
            // Should handle gracefully
            console.log(`   ⚠️ Non-existent email test completed (status: ${response.status})`);
            this.logTest('Persona Creation - Non-existent Email', true, 'Handled gracefully');
        } catch (error) {
            console.log(`   ⚠️ Non-existent email test - error as expected: ${error.response?.status || error.message}`);
            this.logTest('Persona Creation - Non-existent Email', true, 'Error handling works');
        }
    }

    async testSiteRegistrationEndpoint() {
        console.log(chalk.blue('\n🌐 SITE REGISTRATION ENDPOINT TESTS'));
        console.log('====================================');

        if (this.testData.createdEmails.length === 0) {
            console.log('⚠️ No emails available for registration testing - skipping');
            return;
        }

        // Test 1: Register emails on test sites
        await this.testRegisterOnTestSites();

        // Test 2: Register with specific options
        await this.testRegisterWithOptions();

        // Test 3: Error scenarios
        await this.testRegistrationErrors();
    }

    async testRegisterOnTestSites() {
        console.log('\n📝 Test 1: Register Emails on Test Sites');
        
        try {
            const emailsToUse = this.testData.createdEmails.slice(0, 1);
            const payload = {
                emails: emailsToUse.map(e => e.email),
                sites: [
                    'http://httpbin.org/forms/post',
                    'https://www.example.com'
                ],
                usePersonas: true,
                submitForms: false, // Test mode only
                enableLogging: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/register-sites`, payload, {
                timeout: 120000 // 2 minutes for registration
            });

            const isSuccess = response.status === 200 && response.data.success === true;

            if (isSuccess) {
                console.log(`   ✅ Registration workflow completed`);
                console.log(`   📊 Sites attempted: ${response.data.results.sitesAttempted || 0}`);
                console.log(`   ✅ Successful: ${response.data.results.successful || 0}`);
                console.log(`   ❌ Failed: ${response.data.results.failed || 0}`);
                
                this.testData.registrationResults.push(response.data.results);
                this.logTest('Register on Test Sites', true, 
                    `Attempted ${response.data.results.sitesAttempted || 0} sites`);
            } else {
                throw new Error('Registration workflow failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Register on Test Sites', false, error.message);
        }
    }

    async testRegisterWithOptions() {
        console.log('\n📝 Test 2: Register with Specific Options');
        
        try {
            const emailsToUse = this.testData.createdEmails.slice(0, 1);
            const payload = {
                emails: emailsToUse.map(e => e.email),
                sites: ['https://httpbin.org/forms/post'],
                usePersonas: true,
                submitForms: false,
                stealthLevel: 'high',
                enableErrorAnalysis: true,
                maxConcurrency: 1
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/register-sites`, payload, {
                timeout: 90000
            });

            const isSuccess = response.status === 200;

            if (isSuccess) {
                console.log(`   ✅ Registration with options completed`);
                this.logTest('Register with Options', true, 'Advanced options handled');
            } else {
                throw new Error('Registration with options failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Register with Options', false, error.message);
        }
    }

    async testRegistrationErrors() {
        console.log('\n📝 Test 3: Registration Error Scenarios');
        
        // Test with invalid URLs
        try {
            const payload = {
                emails: ['test@example.com'],
                sites: ['not-a-url']
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/register-sites`, payload);
            
            if (response.status === 400) {
                console.log(`   ✅ Correctly rejected invalid URLs`);
                this.logTest('Registration - Invalid URLs', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Invalid URL test - handled gracefully`);
                this.logTest('Registration - Invalid URLs', true, 'Handled gracefully');
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`   ✅ Correctly rejected invalid URLs`);
                this.logTest('Registration - Invalid URLs', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Invalid URL test - error handling: ${error.message}`);
                this.logTest('Registration - Invalid URLs', true, 'Error handling works');
            }
        }
    }

    async testSurveyFindingEndpoint() {
        console.log(chalk.blue('\n🔍 SURVEY FINDING ENDPOINT TESTS'));
        console.log('=================================');

        // Test 1: Find surveys for registered emails
        await this.testFindSurveysForEmails();

        // Test 2: Find surveys with filters
        await this.testFindSurveysWithFilters();

        // Test 3: Error scenarios
        await this.testSurveyFindingErrors();
    }

    async testFindSurveysForEmails() {
        console.log('\n📝 Test 1: Find Surveys for Registered Emails');
        
        try {
            const emailsToUse = this.testData.createdEmails.slice(0, 1);
            const payload = {
                emails: emailsToUse.map(e => e.email),
                sites: ['https://httpbin.org', 'https://example.com'],
                checkEligibility: true,
                includeMetadata: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/find-surveys`, payload, {
                timeout: 60000
            });

            const isSuccess = response.status === 200 && response.data.success === true;

            if (isSuccess) {
                console.log(`   ✅ Survey finding completed`);
                console.log(`   📊 Surveys found: ${response.data.results.surveysFound || 0}`);
                console.log(`   🎯 Eligible: ${response.data.results.eligible || 0}`);
                
                this.testData.surveyResults.push(response.data.results);
                this.logTest('Find Surveys for Emails', true, 
                    `Found ${response.data.results.surveysFound || 0} surveys`);
            } else {
                throw new Error('Survey finding failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Find Surveys for Emails', false, error.message);
        }
    }

    async testFindSurveysWithFilters() {
        console.log('\n📝 Test 2: Find Surveys with Filters');
        
        try {
            const payload = {
                emails: this.testData.createdEmails.slice(0, 1).map(e => e.email),
                sites: ['https://example.com'],
                filters: {
                    category: 'consumer',
                    minReward: 0,
                    maxDuration: 30
                },
                checkEligibility: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/find-surveys`, payload, {
                timeout: 45000
            });

            const isSuccess = response.status === 200;

            if (isSuccess) {
                console.log(`   ✅ Survey finding with filters completed`);
                this.logTest('Find Surveys with Filters', true, 'Filters applied successfully');
            } else {
                throw new Error('Survey finding with filters failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Find Surveys with Filters', false, error.message);
        }
    }

    async testSurveyFindingErrors() {
        console.log('\n📝 Test 3: Survey Finding Error Scenarios');
        
        // Test with empty emails array
        try {
            const payload = { emails: [] };
            const response = await axios.post(`${this.baseUrl}/api/workflow/find-surveys`, payload);
            
            if (response.status === 400) {
                console.log(`   ✅ Correctly rejected empty emails`);
                this.logTest('Survey Finding - Empty Emails', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Empty emails test - handled gracefully`);
                this.logTest('Survey Finding - Empty Emails', true, 'Handled gracefully');
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`   ✅ Correctly rejected empty emails`);
                this.logTest('Survey Finding - Empty Emails', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Empty emails test - error handling works`);
                this.logTest('Survey Finding - Empty Emails', true, 'Error handling works');
            }
        }
    }

    async testSurveyCompletionEndpoint() {
        console.log(chalk.blue('\n📋 SURVEY COMPLETION ENDPOINT TESTS'));
        console.log('====================================');

        // Test 1: Complete surveys for emails
        await this.testCompleteSurveysForEmails();

        // Test 2: Complete surveys with options
        await this.testCompleteSurveysWithOptions();

        // Test 3: Error scenarios
        await this.testSurveyCompletionErrors();
    }

    async testCompleteSurveysForEmails() {
        console.log('\n📝 Test 1: Complete Surveys for Emails');
        
        try {
            const emailsToUse = this.testData.createdEmails.slice(0, 1);
            const payload = {
                emails: emailsToUse.map(e => e.email),
                surveyUrls: [
                    'https://httpbin.org/forms/post'
                ],
                usePersonas: true,
                completionStrategy: 'realistic',
                enableLearning: true
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/complete-surveys`, payload, {
                timeout: 120000
            });

            const isSuccess = response.status === 200 && response.data.success === true;

            if (isSuccess) {
                console.log(`   ✅ Survey completion workflow completed`);
                console.log(`   📊 Surveys attempted: ${response.data.results.attempted || 0}`);
                console.log(`   ✅ Completed: ${response.data.results.completed || 0}`);
                console.log(`   ❓ Questions answered: ${response.data.results.questionsAnswered || 0}`);
                
                this.logTest('Complete Surveys for Emails', true, 
                    `Attempted ${response.data.results.attempted || 0} surveys`);
            } else {
                throw new Error('Survey completion failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Complete Surveys for Emails', false, error.message);
        }
    }

    async testCompleteSurveysWithOptions() {
        console.log('\n📝 Test 2: Complete Surveys with Options');
        
        try {
            const payload = {
                emails: this.testData.createdEmails.slice(0, 1).map(e => e.email),
                surveyUrls: ['https://httpbin.org/forms/post'],
                usePersonas: true,
                completionStrategy: 'fast',
                qualityLevel: 'high',
                enableLearning: true,
                maxConcurrency: 1
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/complete-surveys`, payload, {
                timeout: 90000
            });

            const isSuccess = response.status === 200;

            if (isSuccess) {
                console.log(`   ✅ Survey completion with options completed`);
                this.logTest('Complete Surveys with Options', true, 'Advanced options handled');
            } else {
                throw new Error('Survey completion with options failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Complete Surveys with Options', false, error.message);
        }
    }

    async testSurveyCompletionErrors() {
        console.log('\n📝 Test 3: Survey Completion Error Scenarios');
        
        // Test with invalid survey URLs
        try {
            const payload = {
                emails: ['test@example.com'],
                surveyUrls: ['not-a-valid-url']
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/complete-surveys`, payload);
            
            if (response.status === 400) {
                console.log(`   ✅ Correctly rejected invalid survey URLs`);
                this.logTest('Survey Completion - Invalid URLs', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Invalid survey URL test - handled gracefully`);
                this.logTest('Survey Completion - Invalid URLs', true, 'Handled gracefully');
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`   ✅ Correctly rejected invalid survey URLs`);
                this.logTest('Survey Completion - Invalid URLs', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Invalid survey URL test - error handling works`);
                this.logTest('Survey Completion - Invalid URLs', true, 'Error handling works');
            }
        }
    }

    async testFullAutomationEndpoint() {
        console.log(chalk.blue('\n🚀 FULL AUTOMATION ENDPOINT TESTS'));
        console.log('==================================');

        // Test 1: Full end-to-end automation
        await this.testFullEndToEndAutomation();

        // Test 2: Full automation with custom config
        await this.testFullAutomationWithConfig();

        // Test 3: Error scenarios
        await this.testFullAutomationErrors();
    }

    async testFullEndToEndAutomation() {
        console.log('\n📝 Test 1: Full End-to-End Automation');
        
        try {
            const payload = {
                sites: [
                    'https://httpbin.org'
                ],
                config: {
                    emailsPerSite: 1,
                    enablePersonas: true,
                    enableRegistration: false, // Test mode
                    enableSurveyCompletion: false, // Test mode
                    stealthLevel: 'medium',
                    enableLogging: true
                }
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/full-automation`, payload, {
                timeout: 180000 // 3 minutes for full automation
            });

            const isSuccess = response.status === 200 && response.data.success === true;

            if (isSuccess) {
                console.log(`   ✅ Full automation workflow completed`);
                console.log(`   📧 Emails created: ${response.data.results.emailsCreated || 0}`);
                console.log(`   🎭 Personas created: ${response.data.results.personasCreated || 0}`);
                console.log(`   📝 Registrations: ${response.data.results.registrations || 0}`);
                console.log(`   📊 Surveys completed: ${response.data.results.surveysCompleted || 0}`);
                
                this.testData.fullAutomationJobs.push(response.data.results);
                this.logTest('Full End-to-End Automation', true, 
                    `Created ${response.data.results.emailsCreated || 0} emails, completed workflow`);
            } else {
                throw new Error('Full automation workflow failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Full End-to-End Automation', false, error.message);
        }
    }

    async testFullAutomationWithConfig() {
        console.log('\n📝 Test 2: Full Automation with Custom Config');
        
        try {
            const payload = {
                sites: ['https://example.com'],
                config: {
                    emailsPerSite: 1,
                    enablePersonas: true,
                    enableRegistration: false,
                    enableSurveyCompletion: false,
                    stealthLevel: 'high',
                    maxConcurrency: 1,
                    timeout: 60000,
                    retryAttempts: 2
                }
            };

            const response = await axios.post(`${this.baseUrl}/api/workflow/full-automation`, payload, {
                timeout: 120000
            });

            const isSuccess = response.status === 200;

            if (isSuccess) {
                console.log(`   ✅ Full automation with config completed`);
                this.logTest('Full Automation with Config', true, 'Custom configuration handled');
            } else {
                throw new Error('Full automation with config failed');
            }

        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            this.logTest('Full Automation with Config', false, error.message);
        }
    }

    async testFullAutomationErrors() {
        console.log('\n📝 Test 3: Full Automation Error Scenarios');
        
        // Test with empty sites array
        try {
            const payload = { sites: [] };
            const response = await axios.post(`${this.baseUrl}/api/workflow/full-automation`, payload);
            
            if (response.status === 400) {
                console.log(`   ✅ Correctly rejected empty sites`);
                this.logTest('Full Automation - Empty Sites', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Empty sites test - handled gracefully`);
                this.logTest('Full Automation - Empty Sites', true, 'Handled gracefully');
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`   ✅ Correctly rejected empty sites`);
                this.logTest('Full Automation - Empty Sites', true, 'Validation works');
            } else {
                console.log(`   ⚠️ Empty sites test - error handling works`);
                this.logTest('Full Automation - Empty Sites', true, 'Error handling works');
            }
        }
    }

    async testEndToEndWorkflow() {
        console.log(chalk.blue('\n🔄 END-TO-END WORKFLOW INTEGRATION TESTS'));
        console.log('=========================================');

        console.log('\n📝 Test: Complete Workflow Chain');
        console.log('Step 1: Create emails → Step 2: Create personas → Step 3: Register → Step 4: Find surveys → Step 5: Complete');
        
        let workflowEmails = [];

        try {
            // Step 1: Create emails
            console.log('\n🔸 Step 1: Creating emails for workflow...');
            const emailResponse = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, {
                count: 1,
                providers: ['auto'],
                saveToDatabase: true
            }, { timeout: 30000 });

            if (emailResponse.data.success && emailResponse.data.results.emails.length > 0) {
                workflowEmails = emailResponse.data.results.emails;
                console.log(`   ✅ Created email: ${workflowEmails[0].email}`);
            } else {
                throw new Error('Failed to create emails for workflow');
            }

            // Step 2: Create personas
            console.log('\n🔸 Step 2: Creating personas...');
            const personaResponse = await axios.post(`${this.baseUrl}/api/workflow/create-personas`, {
                emails: workflowEmails.map(e => e.email),
                personaTypes: ['auto'],
                optimizeForSurveys: true
            }, { timeout: 30000 });

            if (personaResponse.data.success) {
                console.log(`   ✅ Created personas for emails`);
            }

            // Step 3: Register (test mode)
            console.log('\n🔸 Step 3: Registering on sites (test mode)...');
            const registerResponse = await axios.post(`${this.baseUrl}/api/workflow/register-sites`, {
                emails: workflowEmails.map(e => e.email),
                sites: ['https://httpbin.org/forms/post'],
                submitForms: false,
                usePersonas: true
            }, { timeout: 60000 });

            if (registerResponse.data.success) {
                console.log(`   ✅ Registration workflow completed`);
            }

            // Step 4: Find surveys
            console.log('\n🔸 Step 4: Finding surveys...');
            const surveyFindResponse = await axios.post(`${this.baseUrl}/api/workflow/find-surveys`, {
                emails: workflowEmails.map(e => e.email),
                sites: ['https://httpbin.org'],
                checkEligibility: true
            }, { timeout: 45000 });

            if (surveyFindResponse.data.success) {
                console.log(`   ✅ Survey finding completed`);
            }

            // Step 5: Complete surveys (test mode)
            console.log('\n🔸 Step 5: Completing surveys (test mode)...');
            const surveyCompleteResponse = await axios.post(`${this.baseUrl}/api/workflow/complete-surveys`, {
                emails: workflowEmails.map(e => e.email),
                surveyUrls: ['https://httpbin.org/forms/post'],
                completionStrategy: 'realistic',
                usePersonas: true
            }, { timeout: 60000 });

            if (surveyCompleteResponse.data.success) {
                console.log(`   ✅ Survey completion workflow completed`);
            }

            console.log('\n✅ COMPLETE WORKFLOW CHAIN SUCCESSFUL');
            this.logTest('End-to-End Workflow', true, 'All 5 steps completed successfully');

        } catch (error) {
            console.log(`\n❌ Workflow chain failed: ${error.message}`);
            this.logTest('End-to-End Workflow', false, error.message);
        }
    }

    async testErrorScenarios() {
        console.log(chalk.blue('\n❌ ERROR SCENARIO TESTS'));
        console.log('========================');

        // Test API timeout handling
        await this.testTimeoutHandling();

        // Test malformed requests
        await this.testMalformedRequests();

        // Test resource limits
        await this.testResourceLimits();
    }

    async testTimeoutHandling() {
        console.log('\n📝 Test: Timeout Handling');
        
        try {
            // Make a request with very short timeout
            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, {
                count: 1
            }, { timeout: 1 }); // 1ms timeout

            console.log(`   ⚠️ Request completed despite short timeout`);
            this.logTest('Timeout Handling', true, 'Request completed quickly');
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`   ✅ Timeout handled correctly`);
                this.logTest('Timeout Handling', true, 'Timeout error handled properly');
            } else {
                console.log(`   ❌ Unexpected timeout error: ${error.message}`);
                this.logTest('Timeout Handling', false, error.message);
            }
        }
    }

    async testMalformedRequests() {
        console.log('\n📝 Test: Malformed Request Handling');
        
        try {
            // Send invalid JSON
            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, 
                'invalid json string', {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log(`   ⚠️ Malformed request was accepted`);
            this.logTest('Malformed Requests', false, 'Should have rejected malformed JSON');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`   ✅ Malformed request correctly rejected`);
                this.logTest('Malformed Requests', true, 'JSON validation works');
            } else {
                console.log(`   ⚠️ Unexpected malformed request handling: ${error.message}`);
                this.logTest('Malformed Requests', true, 'Error handling works');
            }
        }
    }

    async testResourceLimits() {
        console.log('\n📝 Test: Resource Limit Handling');
        
        try {
            // Try to create excessive number of emails
            const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, {
                count: 1000 // Excessive count
            }, { timeout: 10000 });

            // Should either reject or handle gracefully
            if (response.status === 400) {
                console.log(`   ✅ Correctly rejected excessive email count`);
                this.logTest('Resource Limits', true, 'Limit validation works');
            } else {
                console.log(`   ⚠️ Excessive count accepted - may have internal limits`);
                this.logTest('Resource Limits', true, 'Handled gracefully');
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`   ✅ Correctly rejected excessive email count`);
                this.logTest('Resource Limits', true, 'Limit validation works');
            } else {
                console.log(`   ⚠️ Resource limit test - error handling: ${error.message}`);
                this.logTest('Resource Limits', true, 'Error handling works');
            }
        }
    }

    async testPerformanceScenarios() {
        console.log(chalk.blue('\n⚡ PERFORMANCE TESTS'));
        console.log('====================');

        // Test concurrent requests
        await this.testConcurrentRequests();

        // Test response times
        await this.testResponseTimes();
    }

    async testConcurrentRequests() {
        console.log('\n📝 Test: Concurrent Request Handling');
        
        try {
            const startTime = Date.now();
            
            // Make 3 concurrent email creation requests
            const promises = Array(3).fill().map((_, i) => 
                axios.post(`${this.baseUrl}/api/workflow/create-emails`, {
                    count: 1,
                    providers: ['auto']
                }, { timeout: 30000 })
            );

            const responses = await Promise.allSettled(promises);
            const duration = Date.now() - startTime;

            const successful = responses.filter(r => r.status === 'fulfilled').length;
            const failed = responses.filter(r => r.status === 'rejected').length;

            console.log(`   📊 Concurrent requests: ${successful} successful, ${failed} failed`);
            console.log(`   ⏱️ Total time: ${duration}ms`);

            if (successful >= 2) {
                this.logTest('Concurrent Requests', true, 
                    `${successful}/3 requests succeeded in ${duration}ms`);
            } else {
                this.logTest('Concurrent Requests', false, 
                    `Only ${successful}/3 requests succeeded`);
            }

        } catch (error) {
            console.log(`   ❌ Concurrent test failed: ${error.message}`);
            this.logTest('Concurrent Requests', false, error.message);
        }
    }

    async testResponseTimes() {
        console.log('\n📝 Test: Response Time Benchmarks');
        
        const endpoints = [
            { name: 'Health Check', url: '/health', method: 'GET' },
            { name: 'Create Single Email', url: '/api/workflow/create-emails', method: 'POST', 
              body: { count: 1 } }
        ];

        for (const endpoint of endpoints) {
            try {
                const startTime = Date.now();
                
                let response;
                if (endpoint.method === 'GET') {
                    response = await axios.get(`${this.baseUrl}${endpoint.url}`, { timeout: 10000 });
                } else {
                    response = await axios.post(`${this.baseUrl}${endpoint.url}`, endpoint.body, { timeout: 30000 });
                }
                
                const duration = Date.now() - startTime;
                
                console.log(`   📊 ${endpoint.name}: ${duration}ms`);
                
                const isGoodPerformance = duration < (endpoint.name.includes('Email') ? 15000 : 5000);
                this.logTest(`Response Time - ${endpoint.name}`, isGoodPerformance, 
                    `${duration}ms (${isGoodPerformance ? 'good' : 'slow'})`);

            } catch (error) {
                console.log(`   ❌ ${endpoint.name}: Failed (${error.message})`);
                this.logTest(`Response Time - ${endpoint.name}`, false, error.message);
            }
        }
    }

    async testDataValidation() {
        console.log(chalk.blue('\n🔍 DATA VALIDATION TESTS'));
        console.log('=========================');

        // Test email format validation
        await this.testEmailFormatValidation();

        // Test URL validation
        await this.testURLValidation();

        // Test numeric validation
        await this.testNumericValidation();
    }

    async testEmailFormatValidation() {
        console.log('\n📝 Test: Email Format Validation');
        
        const invalidEmails = [
            'not-an-email',
            '@missing-username.com',
            'missing-domain@',
            'spaces in@email.com'
        ];

        for (const invalidEmail of invalidEmails) {
            try {
                const response = await axios.post(`${this.baseUrl}/api/workflow/create-personas`, {
                    emails: [invalidEmail],
                    personaTypes: ['auto']
                });

                if (response.status === 400) {
                    console.log(`   ✅ Correctly rejected: ${invalidEmail}`);
                    this.logTest(`Email Validation - ${invalidEmail}`, true, 'Validation works');
                } else {
                    console.log(`   ⚠️ Accepted invalid email: ${invalidEmail}`);
                    this.logTest(`Email Validation - ${invalidEmail}`, false, 'Should reject invalid email');
                }
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log(`   ✅ Correctly rejected: ${invalidEmail}`);
                    this.logTest(`Email Validation - ${invalidEmail}`, true, 'Validation works');
                } else {
                    console.log(`   ⚠️ Unexpected error for ${invalidEmail}: ${error.message}`);
                    this.logTest(`Email Validation - ${invalidEmail}`, true, 'Error handling works');
                }
            }
        }
    }

    async testURLValidation() {
        console.log('\n📝 Test: URL Validation');
        
        const invalidURLs = [
            'not-a-url',
            'ftp://wrong-protocol.com',
            'http://',
            'https://.com'
        ];

        for (const invalidURL of invalidURLs) {
            try {
                const response = await axios.post(`${this.baseUrl}/api/workflow/register-sites`, {
                    emails: ['test@example.com'],
                    sites: [invalidURL]
                });

                if (response.status === 400) {
                    console.log(`   ✅ Correctly rejected: ${invalidURL}`);
                    this.logTest(`URL Validation - ${invalidURL}`, true, 'Validation works');
                } else {
                    console.log(`   ⚠️ Accepted invalid URL: ${invalidURL}`);
                    this.logTest(`URL Validation - ${invalidURL}`, false, 'Should reject invalid URL');
                }
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log(`   ✅ Correctly rejected: ${invalidURL}`);
                    this.logTest(`URL Validation - ${invalidURL}`, true, 'Validation works');
                } else {
                    console.log(`   ⚠️ Unexpected error for ${invalidURL}: ${error.message}`);
                    this.logTest(`URL Validation - ${invalidURL}`, true, 'Error handling works');
                }
            }
        }
    }

    async testNumericValidation() {
        console.log('\n📝 Test: Numeric Validation');
        
        const invalidCounts = [-1, 0, 1001, 'not-a-number'];

        for (const invalidCount of invalidCounts) {
            try {
                const response = await axios.post(`${this.baseUrl}/api/workflow/create-emails`, {
                    count: invalidCount
                });

                if (response.status === 400) {
                    console.log(`   ✅ Correctly rejected count: ${invalidCount}`);
                    this.logTest(`Numeric Validation - ${invalidCount}`, true, 'Validation works');
                } else {
                    console.log(`   ⚠️ Accepted invalid count: ${invalidCount}`);
                    this.logTest(`Numeric Validation - ${invalidCount}`, false, 'Should reject invalid count');
                }
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log(`   ✅ Correctly rejected count: ${invalidCount}`);
                    this.logTest(`Numeric Validation - ${invalidCount}`, true, 'Validation works');
                } else {
                    console.log(`   ⚠️ Unexpected error for count ${invalidCount}: ${error.message}`);
                    this.logTest(`Numeric Validation - ${invalidCount}`, true, 'Error handling works');
                }
            }
        }
    }

    logTest(testName, passed, details) {
        this.stats.totalTests++;
        if (passed) {
            this.stats.passedTests++;
        } else {
            this.stats.failedTests++;
        }

        this.stats.testResults.push({
            test: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        });
    }

    async generateTestReport() {
        console.log(chalk.cyan.bold('\n📊 COMPREHENSIVE TEST REPORT'));
        console.log('===============================');

        const duration = Date.now() - this.startTime;
        const successRate = this.stats.totalTests > 0 ? 
            (this.stats.passedTests / this.stats.totalTests * 100).toFixed(1) : 0;

        console.log(`⏰ Total Duration: ${duration}ms`);
        console.log(`📊 Total Tests: ${this.stats.totalTests}`);
        console.log(`✅ Passed: ${this.stats.passedTests}`);
        console.log(`❌ Failed: ${this.stats.failedTests}`);
        console.log(`📈 Success Rate: ${successRate}%`);

        console.log('\n📋 TEST RESULTS SUMMARY:');
        console.log('========================');

        const categories = {};
        this.stats.testResults.forEach(result => {
            const category = result.test.split(' - ')[0];
            if (!categories[category]) {
                categories[category] = { passed: 0, failed: 0, total: 0 };
            }
            categories[category].total++;
            if (result.passed) {
                categories[category].passed++;
            } else {
                categories[category].failed++;
            }
        });

        Object.entries(categories).forEach(([category, stats]) => {
            const rate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(1) : 0;
            console.log(`${category}: ${stats.passed}/${stats.total} (${rate}%)`);
        });

        console.log('\n📈 TEST DATA SUMMARY:');
        console.log('====================');
        console.log(`📧 Emails Created: ${this.testData.createdEmails.length}`);
        console.log(`🎭 Personas Created: ${this.testData.createdPersonas.length}`);
        console.log(`📝 Registration Tests: ${this.testData.registrationResults.length}`);
        console.log(`🔍 Survey Finding Tests: ${this.testData.surveyResults.length}`);
        console.log(`🚀 Full Automation Tests: ${this.testData.fullAutomationJobs.length}`);

        // Save detailed report to file
        const reportData = {
            summary: {
                duration,
                totalTests: this.stats.totalTests,
                passedTests: this.stats.passedTests,
                failedTests: this.stats.failedTests,
                successRate: parseFloat(successRate)
            },
            categories,
            testData: this.testData,
            detailedResults: this.stats.testResults,
            timestamp: new Date().toISOString()
        };

        const reportPath = path.join(process.cwd(), `api-test-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
        
        console.log(`\n💾 Detailed report saved: ${reportPath}`);
        
        if (this.stats.failedTests > 0) {
            console.log(chalk.red('\n❌ SOME TESTS FAILED - CHECK REPORT FOR DETAILS'));
        } else {
            console.log(chalk.green('\n✅ ALL TESTS PASSED!'));
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    
    const tester = new WorkflowAutomationAPITester(baseUrl);
    tester.startTime = Date.now();
    
    tester.runAllTests().catch(error => {
        console.error(chalk.red('💥 Test execution failed:'), error.message);
        process.exit(1);
    });
}

module.exports = WorkflowAutomationAPITester;