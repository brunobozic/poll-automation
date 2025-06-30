/**
 * End-to-End Complete Automation Tests
 * 
 * Tests that verify the complete poll automation system works end-to-end
 * through the API, simulating real-world usage scenarios
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('Complete Automation End-to-End Tests', () => {
    let server;
    let client;
    let testSession = {
        emails: [],
        sites: [],
        registrationAttempts: [],
        startTime: null,
        endTime: null
    };
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
        
        // Wait for full system initialization
        await client.waitForServer();
        
        testSession.startTime = new Date();
        console.log('🚀 E2E test server ready - starting complete automation test');
    });
    
    afterAll(async () => {
        testSession.endTime = new Date();
        const duration = testSession.endTime - testSession.startTime;
        
        console.log('📊 E2E Test Session Summary:');
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Emails Created: ${testSession.emails.length}`);
        console.log(`   Sites Added: ${testSession.sites.length}`);
        console.log(`   Registration Attempts: ${testSession.registrationAttempts.length}`);
        
        await stopTestServer();
    });
    
    describe('Complete Poll Automation Workflow', () => {
        test('should execute complete poll automation lifecycle', async () => {
            console.log('🎯 Starting complete poll automation lifecycle test...');
            
            // Phase 1: System Health Check and Initialization
            console.log('Phase 1: System health verification...');
            
            const healthResponse = await client.health();
            expect(healthResponse.status).toBe(200);
            expect(healthResponse.data.status).toBe('healthy');
            
            const statusResponse = await client.getSystemStatus();
            expect(statusResponse.status).toBe(200);
            
            const initialStats = statusResponse.data.status;
            console.log(`✅ System initialized - ${initialStats.email.accountsCreated} existing emails`);
            
            // Phase 2: Email Account Creation for Multiple Providers
            console.log('Phase 2: Multi-provider email account creation...');
            
            const emailBatches = [
                { count: 2, provider: 'auto' },
                { count: 2, provider: 'guerrilla' },
                { count: 1, provider: 'tempmail' }
            ];
            
            for (const batch of emailBatches) {
                console.log(`Creating ${batch.count} emails with provider: ${batch.provider}`);
                
                const emailResponse = await client.createEmails(batch.count, batch.provider);
                expect(emailResponse.status).toBe(200);
                
                const emailResults = emailResponse.data;
                expect(emailResults.success).toBe(true);
                
                const successfulEmails = emailResults.results.filter(r => r.success);
                testSession.emails.push(...successfulEmails);
                
                console.log(`✅ Created ${successfulEmails.length}/${batch.count} emails successfully`);
                
                // Verify emails are retrievable
                const verificationResponse = await client.getEmails(20, batch.provider === 'auto' ? null : batch.provider);
                expect(verificationResponse.status).toBe(200);
                
                // Brief pause between batches
                await global.testUtils.wait(500);
            }
            
            console.log(`📧 Total emails created in session: ${testSession.emails.length}`);
            
            // Phase 3: Survey Site Infrastructure Setup
            console.log('Phase 3: Survey site infrastructure setup...');
            
            const testSites = [
                {
                    name: 'E2E Test Survey Platform Alpha',
                    url: 'https://alpha-surveys.test-automation.com',
                    category: 'survey',
                    difficulty: 3
                },
                {
                    name: 'E2E Test Survey Platform Beta', 
                    url: 'https://beta-surveys.test-automation.com',
                    category: 'survey',
                    difficulty: 4
                },
                {
                    name: 'E2E Test Forms Platform',
                    url: 'https://forms.test-automation.com',
                    category: 'forms',
                    difficulty: 2
                },
                {
                    name: 'E2E Test Polls Platform',
                    url: 'https://polls.test-automation.com',
                    category: 'polls', 
                    difficulty: 5
                }
            ];
            
            const siteResponse = await client.createSurveySites(testSites);
            expect(siteResponse.status).toBe(200);
            
            const siteResults = siteResponse.data;
            expect(siteResults.success).toBe(true);
            
            const successfulSites = siteResults.results.filter(r => r.success);
            testSession.sites.push(...successfulSites);
            
            console.log(`🌐 Survey sites setup: ${successfulSites.length}/${testSites.length} sites added`);
            
            // Verify sites are retrievable and properly configured
            const siteListResponse = await client.getSurveySites();
            expect(siteListResponse.status).toBe(200);
            
            const siteList = siteListResponse.data.sites;
            const ourSites = siteList.filter(site => 
                site.name.includes('E2E Test')
            );
            
            expect(ourSites.length).toBeGreaterThanOrEqual(successfulSites.length);
            console.log(`✅ Site verification complete - ${ourSites.length} E2E test sites found`);
            
            // Phase 4: Email-Site Correlation and Unused Email Analysis
            console.log('Phase 4: Email-site correlation analysis...');
            
            for (const site of successfulSites) {
                const unusedEmailsResponse = await client.getUnusedEmails(site.id, 10);
                expect(unusedEmailsResponse.status).toBe(200);
                
                const unusedEmails = unusedEmailsResponse.data;
                console.log(`📊 Site "${site.site}": ${unusedEmails.count} unused emails available`);
                
                // All our newly created emails should be unused for these new sites
                expect(unusedEmails.count).toBeGreaterThan(0);
            }
            
            // Phase 5: Registration Simulation and Workflow Testing
            console.log('Phase 5: Registration workflow simulation...');
            
            if (successfulSites.length > 0) {
                const siteIds = successfulSites.slice(0, 2).map(s => s.id); // Test with first 2 sites
                const emailCount = Math.min(3, testSession.emails.length);
                
                console.log(`Initiating registration simulation for ${emailCount} emails on ${siteIds.length} sites`);
                
                const registrationResponse = await client.registerEmails(siteIds, emailCount, true);
                expect(registrationResponse.status).toBe(200);
                
                const regResult = registrationResponse.data;
                expect(regResult).toHaveProperty('jobId');
                expect(regResult).toHaveProperty('siteIds');
                
                testSession.registrationAttempts.push({
                    jobId: regResult.jobId,
                    siteIds: regResult.siteIds,
                    emailCount: regResult.emailCount,
                    timestamp: new Date()
                });
                
                console.log(`✅ Registration simulation initiated - Job ID: ${regResult.jobId}`);
            }
            
            // Phase 6: System Monitoring and Health Verification
            console.log('Phase 6: System monitoring and health verification...');
            
            const [finalStatusResponse, dbStatsResponse, errorDetectionResponse] = await Promise.all([
                client.getSystemStatus(),
                client.getDatabaseStats(), 
                client.runErrorDetection(2)
            ]);
            
            expect(finalStatusResponse.status).toBe(200);
            expect(dbStatsResponse.status).toBe(200);
            expect(errorDetectionResponse.status).toBe(200);
            
            const finalStats = finalStatusResponse.data.status;
            const dbStats = dbStatsResponse.data.stats;
            const errorResults = errorDetectionResponse.data.results;
            
            console.log('📊 Final system status:');
            console.log(`   Email accounts: ${finalStats.email.accountsCreated}`);
            console.log(`   Total registration attempts: ${finalStats.statistics.totalRegistrationAttempts}`);
            console.log(`   Success rate: ${finalStats.statistics.successRate}`);
            console.log(`   Database tables: ${Object.keys(dbStats.tables).length}`);
            console.log(`   Error detection: ${errorResults.summary.errorsFound} errors, ${errorResults.summary.warningsFound} warnings`);
            
            // Verify system health after complete workflow
            expect(finalStats.database.connected).toBe(true);
            expect(errorResults.summary.errorsFound).toBeLessThan(5); // Should have minimal errors
            
            // Phase 7: Data Integrity and Consistency Verification
            console.log('Phase 7: Data integrity verification...');
            
            const emailListResponse = await client.getEmails(50);
            expect(emailListResponse.status).toBe(200);
            
            const allEmails = emailListResponse.data.emails;
            
            // Verify our session emails are in the system
            const sessionEmailAddresses = testSession.emails.map(e => e.email);
            const foundEmails = allEmails.filter(e => 
                sessionEmailAddresses.includes(e.email)
            );
            
            expect(foundEmails.length).toBeGreaterThan(0);
            console.log(`✅ Data integrity verified - ${foundEmails.length}/${sessionEmailAddresses.length} session emails found in system`);
            
            // Verify email uniqueness (no duplicates)
            const emailAddresses = allEmails.map(e => e.email);
            const uniqueEmails = new Set(emailAddresses);
            expect(uniqueEmails.size).toBe(emailAddresses.length);
            
            console.log('✅ Complete poll automation lifecycle test successful!');
        });
        
        test('should handle complex multi-provider email scenarios', async () => {
            console.log('🔄 Testing complex multi-provider email scenarios...');
            
            // Scenario 1: Mixed provider batch creation
            const mixedProviders = ['auto', 'guerrilla', 'tempmail', 'auto', 'guerrilla'];
            const emailPromises = mixedProviders.map(provider => 
                client.createEmails(1, provider)
            );
            
            const responses = await Promise.all(emailPromises);
            
            const allSuccessful = responses.every(r => r.status === 200);
            expect(allSuccessful).toBe(true);
            
            // Collect all created emails
            const createdEmails = responses.flatMap(r => 
                r.data.results.filter(result => result.success)
            );
            
            console.log(`📧 Multi-provider creation: ${createdEmails.length}/${mixedProviders.length} emails created`);
            
            // Scenario 2: Provider-specific querying
            for (const provider of ['guerrilla', 'tempmail']) {
                const providerEmailsResponse = await client.getEmails(20, provider);
                expect(providerEmailsResponse.status).toBe(200);
                
                const providerEmails = providerEmailsResponse.data.emails;
                
                // All returned emails should be from the specified provider
                providerEmails.forEach(email => {
                    expect(email.provider).toBe(provider);
                });
                
                console.log(`✅ Provider filtering verified: ${providerEmails.length} ${provider} emails`);
            }
            
            // Scenario 3: Successful email analysis
            const successfulEmailsResponse = await client.getSuccessfulEmails();
            expect(successfulEmailsResponse.status).toBe(200);
            
            const successfulEmails = successfulEmailsResponse.data.emails;
            console.log(`🎯 Successful emails analysis: ${successfulEmails.length} emails with successful registrations`);
            
            // All successful emails should have positive registration counts
            successfulEmails.forEach(email => {
                expect(email.successfulRegistrations).toBeGreaterThan(0);
                expect(email.totalRegistrations).toBeGreaterThanOrEqual(email.successfulRegistrations);
            });
        });
        
        test('should simulate real-world failure scenarios and recovery', async () => {
            console.log('⚠️ Testing failure scenarios and recovery...');
            
            // Scenario 1: Invalid site creation and recovery
            const mixedSites = [
                { name: 'Valid Site 1', url: 'https://valid1.test.com', category: 'test' },
                { name: 'Invalid Site', url: 'not-a-valid-url', category: 'test' },
                { name: 'Valid Site 2', url: 'https://valid2.test.com', category: 'test' },
                { name: 'Duplicate Site', url: 'https://valid1.test.com', category: 'test' } // Duplicate URL
            ];
            
            const siteResponse = await client.createSurveySites(mixedSites);
            expect(siteResponse.status).toBe(200);
            
            const siteResults = siteResponse.data.results;
            const successful = siteResults.filter(r => r.success);
            const failed = siteResults.filter(r => !r.success);
            
            expect(successful.length).toBeGreaterThan(0); // At least some should succeed
            expect(failed.length).toBeGreaterThan(0); // Some should fail
            
            console.log(`📊 Mixed site creation: ${successful.length} succeeded, ${failed.length} failed`);
            
            // Scenario 2: System resilience under error conditions
            const errorOperations = [
                () => client.createEmails(1000), // Should fail - too many
                () => client.getUnusedEmails(999999, 5), // Non-existent site
                () => client.post('/api/survey-sites', { invalid: 'format' }), // Invalid format
                () => client.get('/api/nonexistent-endpoint') // 404 error
            ];
            
            for (const operation of errorOperations) {
                const response = await operation();
                // Should handle errors gracefully (not crash)
                expect([200, 400, 404, 500]).toContain(response.status);
            }
            
            // Verify system is still operational after errors
            const healthAfterErrors = await client.health();
            expect(healthAfterErrors.status).toBe(200);
            expect(healthAfterErrors.data.status).toBe('healthy');
            
            // Should still be able to perform valid operations
            const validEmailResponse = await client.createEmails(1);
            expect(validEmailResponse.status).toBe(200);
            
            console.log('✅ System resilience verified - remains operational after error scenarios');
            
            // Scenario 3: Failure analysis and monitoring
            const failuresResponse = await client.getRecentFailures(10);
            expect(failuresResponse.status).toBe(200);
            
            const failures = failuresResponse.data.failures;
            console.log(`📊 Failure analysis: ${failures.length} recent failures recorded`);
            
            // If there are failures, they should have proper structure
            failures.forEach(failure => {
                global.testUtils.validateFailureResponse(failure);
                
                if (failure.llmAnalysis) {
                    expect(failure.llmAnalysis).toHaveProperty('rootCause');
                    expect(failure.llmAnalysis).toHaveProperty('description');
                    expect(failure.llmAnalysis).toHaveProperty('confidence');
                }
            });
        });
        
        test('should demonstrate comprehensive monitoring and analytics', async () => {
            console.log('📊 Testing comprehensive monitoring and analytics...');
            
            // Comprehensive system status
            const statusResponse = await client.getSystemStatus();
            expect(statusResponse.status).toBe(200);
            
            const systemStatus = statusResponse.data.status;
            
            // Verify all status components are present
            expect(systemStatus).toHaveProperty('system');
            expect(systemStatus).toHaveProperty('database');
            expect(systemStatus).toHaveProperty('email');
            expect(systemStatus).toHaveProperty('statistics');
            
            // System component verification
            const system = systemStatus.system;
            expect(system.uptime).toBeGreaterThan(0);
            expect(system.memory).toHaveProperty('heapUsed');
            expect(system.memory).toHaveProperty('heapTotal');
            expect(system.nodeVersion).toMatch(/^v\\d+\\.\\d+\\.\\d+/);
            
            // Database status verification
            const database = systemStatus.database;
            expect(database.connected).toBe(true);
            expect(database.tables).toBeGreaterThan(0);
            
            // Email service status
            const email = systemStatus.email;
            expect(Array.isArray(email.services)).toBe(true);
            expect(email.services.length).toBeGreaterThan(0);
            expect(email.accountsCreated).toBeGreaterThanOrEqual(0);
            
            console.log('📈 System Status Summary:');
            console.log(`   Uptime: ${system.uptime}s`);
            console.log(`   Memory: ${(system.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Database tables: ${database.tables}`);
            console.log(`   Email accounts: ${email.accountsCreated}`);
            console.log(`   Success rate: ${systemStatus.statistics.successRate}`);
            
            // Database analytics
            const dbStatsResponse = await client.getDatabaseStats();
            expect(dbStatsResponse.status).toBe(200);
            
            const dbStats = dbStatsResponse.data.stats;
            
            console.log('🗄️ Database Analytics:');
            console.log(`   Connection: ${dbStats.connection.status}`);
            console.log(`   Storage: ${dbStats.storage.totalSize || 'N/A'}`);
            console.log(`   Tables: ${Object.keys(dbStats.tables).length}`);
            
            // Error detection analytics
            const errorDetectionResponse = await client.runErrorDetection(3);
            expect(errorDetectionResponse.status).toBe(200);
            
            const errorResults = errorDetectionResponse.data.results;
            
            console.log('🔍 Error Detection Results:');
            console.log(`   Cycles completed: ${errorResults.totalCycles}`);
            console.log(`   Errors found: ${errorResults.summary.errorsFound}`);
            console.log(`   Warnings found: ${errorResults.summary.warningsFound}`);
            console.log(`   Total duration: ${errorResults.totalDuration}ms`);
            
            // LLM service status
            const llmTestResponse = await client.testLLM();
            expect([200, 503]).toContain(llmTestResponse.status);
            
            const llmStatus = llmTestResponse.data.service;
            console.log(`🧠 LLM Service: ${llmStatus.status} (${llmStatus.capabilities.length} capabilities)`);
            
            console.log('✅ Comprehensive monitoring and analytics verification complete');
        });
    });
    
    describe('Real-World Usage Simulation', () => {
        test('should simulate typical user workflow patterns', async () => {
            console.log('👤 Simulating typical user workflow patterns...');
            
            // Pattern 1: Gradual email building
            console.log('Pattern 1: Gradual email account building...');
            
            const emailBuildingPhases = [
                { count: 2, delay: 500 },
                { count: 3, delay: 1000 },
                { count: 2, delay: 500 }
            ];
            
            const builtEmails = [];
            
            for (const phase of emailBuildingPhases) {
                const response = await client.createEmails(phase.count);
                expect(response.status).toBe(200);
                
                const successful = response.data.results.filter(r => r.success);
                builtEmails.push(...successful);
                
                console.log(`   Built ${successful.length} emails (total: ${builtEmails.length})`);
                await global.testUtils.wait(phase.delay);
            }
            
            // Pattern 2: Site research and addition
            console.log('Pattern 2: Site research and gradual addition...');
            
            const siteResearchPhases = [
                [{
                    name: 'Research Phase Alpha',
                    url: 'https://alpha-research.survey.com',
                    category: 'research'
                }],
                [{
                    name: 'Research Phase Beta',
                    url: 'https://beta-research.survey.com', 
                    category: 'research'
                }, {
                    name: 'Research Phase Gamma',
                    url: 'https://gamma-research.survey.com',
                    category: 'research'
                }]
            ];
            
            const addedSites = [];
            
            for (const phase of siteResearchPhases) {
                const response = await client.createSurveySites(phase);
                expect(response.status).toBe(200);
                
                const successful = response.data.results.filter(r => r.success);
                addedSites.push(...successful);
                
                console.log(`   Added ${successful.length} sites (total: ${addedSites.length})`);
                await global.testUtils.wait(1000);
            }
            
            // Pattern 3: Iterative monitoring and adjustment
            console.log('Pattern 3: Iterative monitoring and system adjustment...');
            
            const monitoringCycles = 3;
            
            for (let cycle = 1; cycle <= monitoringCycles; cycle++) {
                console.log(`   Monitoring cycle ${cycle}/${monitoringCycles}...`);
                
                // Check system status
                const statusResponse = await client.getSystemStatus();
                expect(statusResponse.status).toBe(200);
                
                // Check unused emails for our sites
                if (addedSites.length > 0) {
                    const siteId = addedSites[0].id;
                    const unusedResponse = await client.getUnusedEmails(siteId, 5);
                    expect(unusedResponse.status).toBe(200);
                    
                    console.log(`     Site ${siteId}: ${unusedResponse.data.count} unused emails`);
                }
                
                // Check recent failures for insights
                const failuresResponse = await client.getRecentFailures(3);
                expect(failuresResponse.status).toBe(200);
                
                console.log(`     Recent failures: ${failuresResponse.data.count}`);
                
                await global.testUtils.wait(1500);
            }
            
            console.log('✅ Typical user workflow patterns simulation complete');
        });
        
        test('should handle peak usage scenarios', async () => {
            console.log('🚀 Simulating peak usage scenarios...');
            
            // Scenario 1: Burst email creation
            console.log('Scenario 1: Burst email creation...');
            
            const burstSize = 8;
            const burstPromises = Array(burstSize).fill().map((_, i) => 
                client.createEmails(1, 'auto')
            );
            
            const startTime = Date.now();
            const burstResponses = await Promise.all(burstPromises);
            const endTime = Date.now();
            
            const successfulBurst = burstResponses.filter(r => r.status === 200).length;
            const burstDuration = endTime - startTime;
            
            console.log(`   Burst results: ${successfulBurst}/${burstSize} successful in ${burstDuration}ms`);
            expect(successfulBurst).toBeGreaterThan(0);
            
            // Scenario 2: Concurrent monitoring
            console.log('Scenario 2: Concurrent system monitoring...');
            
            const monitoringOps = [
                () => client.getSystemStatus(),
                () => client.getDatabaseStats(),
                () => client.getEmails(10),
                () => client.getSurveySites(),
                () => client.getRecentFailures(5),
                () => client.runErrorDetection(1)
            ];
            
            const monitoringPromises = monitoringOps.map(op => op());
            const monitoringResponses = await Promise.all(monitoringPromises);
            
            const successfulMonitoring = monitoringResponses.filter(r => 
                [200, 503].includes(r.status)
            ).length;
            
            console.log(`   Monitoring results: ${successfulMonitoring}/${monitoringOps.length} operations successful`);
            expect(successfulMonitoring).toBe(monitoringOps.length);
            
            // Scenario 3: Mixed peak operations
            console.log('Scenario 3: Mixed peak operations...');
            
            const mixedOps = [
                () => client.createEmails(2),
                () => client.createSurveySites([{
                    name: 'Peak Test Site',
                    url: 'https://peak-test.com',
                    category: 'test'
                }]),
                () => client.getEmails(20),
                () => client.getSystemStatus(),
                () => client.health()
            ];
            
            const mixedPromises = mixedOps.map(op => op());
            const mixedStartTime = Date.now();
            const mixedResponses = await Promise.all(mixedPromises);
            const mixedEndTime = Date.now();
            
            const mixedDuration = mixedEndTime - mixedStartTime;
            const mixedSuccessful = mixedResponses.filter(r => r.status === 200).length;
            
            console.log(`   Mixed operations: ${mixedSuccessful}/${mixedOps.length} successful in ${mixedDuration}ms`);
            
            // System should remain healthy after peak usage
            const healthAfterPeak = await client.health();
            expect(healthAfterPeak.status).toBe(200);
            expect(healthAfterPeak.data.status).toBe('healthy');
            
            console.log('✅ Peak usage scenarios handled successfully');
        });
    });
    
    describe('Long-Running Stability Tests', () => {
        test('should maintain stability over extended operations', async () => {
            console.log('⏱️ Testing long-running stability...');
            
            const testDuration = 15000; // 15 seconds
            const operationInterval = 500; // 500ms between operations
            const startTime = Date.now();
            
            const stabilityResults = {
                operations: 0,
                successful: 0,
                errors: 0,
                averageResponseTime: 0,
                responseTimes: []
            };
            
            console.log(`Running stability test for ${testDuration / 1000} seconds...`);
            
            while (Date.now() - startTime < testDuration) {
                const operationStart = Date.now();
                
                try {
                    // Rotate between different operations
                    const operations = [
                        () => client.health(),
                        () => client.getSystemStatus(),
                        () => client.createEmails(1),
                        () => client.getEmails(5)
                    ];
                    
                    const operation = operations[stabilityResults.operations % operations.length];
                    const response = await operation();
                    
                    const operationEnd = Date.now();
                    const responseTime = operationEnd - operationStart;
                    
                    stabilityResults.operations++;
                    stabilityResults.responseTimes.push(responseTime);
                    
                    if (response.status === 200) {
                        stabilityResults.successful++;
                    } else {
                        stabilityResults.errors++;
                    }
                    
                } catch (error) {
                    stabilityResults.operations++;
                    stabilityResults.errors++;
                }
                
                await global.testUtils.wait(operationInterval);
            }
            
            const actualDuration = Date.now() - startTime;
            stabilityResults.averageResponseTime = 
                stabilityResults.responseTimes.reduce((a, b) => a + b, 0) / stabilityResults.responseTimes.length;
            
            const successRate = (stabilityResults.successful / stabilityResults.operations) * 100;
            const operationsPerSecond = stabilityResults.operations / (actualDuration / 1000);
            
            console.log('📊 Long-running stability results:');
            console.log(`   Duration: ${actualDuration}ms`);
            console.log(`   Total operations: ${stabilityResults.operations}`);
            console.log(`   Success rate: ${successRate.toFixed(1)}%`);
            console.log(`   Operations/second: ${operationsPerSecond.toFixed(2)}`);
            console.log(`   Average response time: ${stabilityResults.averageResponseTime.toFixed(2)}ms`);
            console.log(`   Max response time: ${Math.max(...stabilityResults.responseTimes)}ms`);
            
            // Stability criteria
            expect(stabilityResults.operations).toBeGreaterThan(0);
            expect(successRate).toBeGreaterThan(80); // 80% success rate minimum
            expect(stabilityResults.averageResponseTime).toBeLessThan(2000); // Average under 2 seconds
            
            // Final health check
            const finalHealth = await client.health();
            expect(finalHealth.status).toBe(200);
            
            console.log('✅ Long-running stability test completed successfully');
        });
    });
});