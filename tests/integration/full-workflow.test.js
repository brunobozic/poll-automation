/**
 * Full Workflow Integration Tests
 * 
 * Tests that verify the complete poll automation workflow through the API
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('Full Workflow Integration Tests', () => {
    let server;
    let client;
    let createdEmails = [];
    let createdSites = [];
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
        
        // Wait for server to be fully ready
        await client.waitForServer();
        console.log('🚀 Integration test server ready');
    });
    
    afterAll(async () => {
        await stopTestServer();
    });
    
    beforeEach(() => {
        // Reset tracking arrays
        createdEmails = [];
        createdSites = [];
    });
    
    describe('Email to Site Registration Workflow', () => {
        test('should complete full email creation and site management workflow', async () => {
            console.log('📧 Step 1: Creating email accounts...');
            
            // Step 1: Create multiple email accounts
            const emailResponse = await client.createEmails(3, 'auto');
            expect(emailResponse.status).toBe(200);
            
            const emailBody = emailResponse.data;
            expect(emailBody.success).toBe(true);
            expect(emailBody.results).toHaveLength(3);
            
            // Track successful emails
            createdEmails = emailBody.results
                .filter(result => result.success)
                .map(result => result.email);
            
            expect(createdEmails.length).toBeGreaterThan(0);
            console.log(`✅ Created ${createdEmails.length} email accounts`);
            
            console.log('🌐 Step 2: Adding survey sites...');
            
            // Step 2: Add survey sites
            const testSites = [
                {
                    name: 'Test Survey Site 1',
                    url: 'https://test1.example.com',
                    category: 'test',
                    difficulty: 2
                },
                {
                    name: 'Test Survey Site 2',
                    url: 'https://test2.example.com',
                    category: 'test',
                    difficulty: 3
                }
            ];
            
            const siteResponse = await client.createSurveySites(testSites);
            expect(siteResponse.status).toBe(200);
            
            const siteBody = siteResponse.data;
            expect(siteBody.success).toBe(true);
            
            // Track created sites
            createdSites = siteBody.results
                .filter(result => result.success)
                .map(result => ({ id: result.id, name: result.site }));
            
            expect(createdSites.length).toBeGreaterThan(0);
            console.log(`✅ Added ${createdSites.length} survey sites`);
            
            console.log('📋 Step 3: Verifying data persistence...');
            
            // Step 3: Verify emails are retrievable
            const emailListResponse = await client.getEmails(10);
            expect(emailListResponse.status).toBe(200);
            
            const emailList = emailListResponse.data;
            expect(emailList.count).toBeGreaterThanOrEqual(createdEmails.length);
            
            // Check that our created emails are in the list
            const listedEmails = emailList.emails.map(e => e.email);
            createdEmails.forEach(email => {
                expect(listedEmails).toContain(email);
            });
            
            // Step 4: Verify sites are retrievable
            const siteListResponse = await client.getSurveySites();
            expect(siteListResponse.status).toBe(200);
            
            const siteList = siteListResponse.data;
            expect(siteList.count).toBeGreaterThanOrEqual(createdSites.length);
            
            console.log('✅ Full workflow completed successfully');
        });
        
        test('should handle unused email queries correctly', async () => {
            // First create some emails
            const emailResponse = await client.createEmails(5);
            expect(emailResponse.status).toBe(200);
            
            // Create a test site
            const siteResponse = await client.createSurveySites([{
                name: 'Unused Email Test Site',
                url: 'https://unused-test.example.com',
                category: 'test'
            }]);
            expect(siteResponse.status).toBe(200);
            
            const siteId = siteResponse.data.results[0].id;
            expect(siteId).toBeDefined();
            
            // Query unused emails for this site
            const unusedResponse = await client.getUnusedEmails(siteId, 10);
            expect(unusedResponse.status).toBe(200);
            
            const unusedBody = unusedResponse.data;
            expect(unusedBody.siteId).toBe(siteId);
            expect(unusedBody.count).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(unusedBody.emails)).toBe(true);
            
            // All returned emails should be valid
            unusedBody.emails.forEach(email => {
                global.testUtils.validateEmailResponse(email);
            });
        });
        
        test('should track registration statistics accurately', async () => {
            // Get initial system status
            const initialStatusResponse = await client.getSystemStatus();
            expect(initialStatusResponse.status).toBe(200);
            
            const initialStats = initialStatusResponse.data.status.statistics;
            const initialAttempts = initialStats.totalRegistrationAttempts;
            
            // Create some emails
            await client.createEmails(2);
            
            // Get updated status
            const updatedStatusResponse = await client.getSystemStatus();
            expect(updatedStatusResponse.status).toBe(200);
            
            const updatedStats = updatedStatusResponse.data.status.email;
            expect(updatedStats.accountsCreated).toBeGreaterThanOrEqual(2);
        });
    });
    
    describe('Data Consistency and Relationships', () => {
        test('should maintain data consistency across endpoints', async () => {
            // Create emails and sites
            const emailCount = 3;
            const siteCount = 2;
            
            await client.createEmails(emailCount);
            await client.createSurveySites([
                { name: 'Consistency Test 1', url: 'https://consistency1.test.com', category: 'test' },
                { name: 'Consistency Test 2', url: 'https://consistency2.test.com', category: 'test' }
            ]);
            
            // Get data from different endpoints
            const [emailsResponse, sitesResponse, statusResponse] = await Promise.all([
                client.getEmails(20),
                client.getSurveySites(),
                client.getSystemStatus()
            ]);
            
            expect(emailsResponse.status).toBe(200);
            expect(sitesResponse.status).toBe(200);
            expect(statusResponse.status).toBe(200);
            
            // Verify consistency
            const emailList = emailsResponse.data;
            const siteList = sitesResponse.data;
            const systemStatus = statusResponse.data.status;
            
            // Email counts should be consistent
            expect(systemStatus.email.accountsCreated).toBeGreaterThanOrEqual(emailList.count);
            
            // Site data should be consistent
            expect(siteList.count).toBeGreaterThanOrEqual(siteCount);
        });
        
        test('should handle concurrent operations without data corruption', async () => {
            // Perform multiple operations concurrently
            const operations = [
                client.createEmails(2, 'guerrilla'),
                client.createEmails(2, 'tempmail'),
                client.createSurveySites([
                    { name: 'Concurrent Test 1', url: 'https://concurrent1.test.com', category: 'test' }
                ]),
                client.getEmails(5),
                client.getSurveySites(),
                client.getSystemStatus()
            ];
            
            const results = await Promise.all(operations);
            
            // All operations should complete successfully
            results.forEach((result, index) => {
                expect([200, 201]).toContain(result.status);
                if (result.data.success !== undefined) {
                    expect(result.data.success).toBe(true);
                }
            });
            
            // Verify data integrity after concurrent operations
            const finalEmailResponse = await client.getEmails(20);
            const finalSiteResponse = await client.getSurveySites();
            
            expect(finalEmailResponse.status).toBe(200);
            expect(finalSiteResponse.status).toBe(200);
            
            // Check for unique emails
            const allEmails = finalEmailResponse.data.emails.map(e => e.email);
            const uniqueEmails = new Set(allEmails);
            expect(uniqueEmails.size).toBe(allEmails.length);
        });
    });
    
    describe('Error Handling and Recovery', () => {
        test('should handle partial failures gracefully', async () => {
            // Try to create some emails and sites with some invalid data
            const mixedEmailResponse = await client.createEmails(5);
            expect(mixedEmailResponse.status).toBe(200);
            
            // Some might succeed, some might fail
            const emailResults = mixedEmailResponse.data.results;
            const successfulEmails = emailResults.filter(r => r.success);
            const failedEmails = emailResults.filter(r => !r.success);
            
            expect(successfulEmails.length + failedEmails.length).toBe(5);
            
            // Try sites with mixed valid/invalid data
            const mixedSites = [
                { name: 'Valid Site', url: 'https://valid.test.com', category: 'test' },
                { name: 'Another Valid Site', url: 'https://valid2.test.com', category: 'test' },
                { name: 'Duplicate Site', url: 'https://valid.test.com', category: 'test' } // This should fail due to duplicate URL
            ];
            
            const siteResponse = await client.createSurveySites(mixedSites);
            expect(siteResponse.status).toBe(200);
            
            const siteResults = siteResponse.data.results;
            expect(siteResults).toHaveLength(3);
            
            // At least the first two should succeed
            expect(siteResults[0].success).toBe(true);
            expect(siteResults[1].success).toBe(true);
            
            // The duplicate might fail
            if (!siteResults[2].success) {
                expect(siteResults[2].error).toMatch(/already exists/i);
            }
        });
        
        test('should maintain system stability after errors', async () => {
            // Cause some errors
            await client.post('/api/emails', { count: 1000 }); // Should fail - too many
            await client.post('/api/survey-sites', { sites: 'invalid' }); // Should fail - invalid format
            await client.get('/api/emails/unused/invalid'); // Should fail - invalid site ID
            
            // System should still be responsive
            const healthResponse = await client.health();
            expect(healthResponse.status).toBe(200);
            expect(healthResponse.data.status).toBe('healthy');
            
            const statusResponse = await client.getSystemStatus();
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data.success).toBe(true);
            
            // Should still be able to create valid data
            const validEmailResponse = await client.createEmails(1);
            expect(validEmailResponse.status).toBe(200);
            expect(validEmailResponse.data.success).toBe(true);
        });
    });
    
    describe('Real Poll Automation Workflow Simulation', () => {
        test('should simulate complete poll automation lifecycle', async () => {
            console.log('🎯 Simulating complete poll automation lifecycle...');
            
            // Phase 1: Setup - Create infrastructure
            console.log('Phase 1: Infrastructure setup...');
            
            const infraSetup = await Promise.all([
                client.createEmails(3),
                client.createSurveySites([
                    { name: 'Survey Target 1', url: 'https://target1.survey.com', category: 'survey', difficulty: 3 },
                    { name: 'Survey Target 2', url: 'https://target2.survey.com', category: 'survey', difficulty: 4 }
                ])
            ]);
            
            const emailResults = infraSetup[0].data;
            const siteResults = infraSetup[1].data;
            
            expect(emailResults.success).toBe(true);
            expect(siteResults.success).toBe(true);
            
            const availableEmails = emailResults.results.filter(r => r.success);
            const availableSites = siteResults.results.filter(r => r.success);
            
            console.log(`✅ Setup complete: ${availableEmails.length} emails, ${availableSites.length} sites`);
            
            // Phase 2: Registration simulation
            console.log('Phase 2: Registration simulation...');
            
            if (availableSites.length > 0) {
                const siteIds = availableSites.map(s => s.id);
                const registrationResponse = await client.registerEmails(siteIds, 2, true);
                
                // This endpoint returns a placeholder response in the current implementation
                expect(registrationResponse.status).toBe(200);
                expect(registrationResponse.data).toHaveProperty('jobId');
                
                console.log(`✅ Registration job initiated: ${registrationResponse.data.jobId}`);
            }
            
            // Phase 3: Monitoring and analysis
            console.log('Phase 3: System monitoring...');
            
            const [statusResponse, dbStatsResponse, failuresResponse] = await Promise.all([
                client.getSystemStatus(),
                client.getDatabaseStats(),
                client.getRecentFailures(5)
            ]);
            
            expect(statusResponse.status).toBe(200);
            expect(dbStatsResponse.status).toBe(200);
            expect(failuresResponse.status).toBe(200);
            
            const systemStats = statusResponse.data.status.statistics;
            console.log(`📊 System Stats: ${systemStats.totalRegistrationAttempts} attempts, ${systemStats.successRate} success rate`);
            
            const dbStats = dbStatsResponse.data.stats;
            console.log(`🗄️ Database: ${Object.keys(dbStats.tables).length} tables, ${dbStats.connection.status}`);
            
            const recentFailures = failuresResponse.data;
            console.log(`⚠️ Recent failures: ${recentFailures.count} found`);
            
            // Phase 4: Performance verification
            console.log('Phase 4: Performance verification...');
            
            const performanceStart = Date.now();
            const performanceOps = await Promise.all([
                client.getEmails(10),
                client.getSurveySites(),
                client.getUnusedEmails(availableSites[0]?.id || 1, 5),
                client.runErrorDetection(1)
            ]);
            const performanceEnd = Date.now();
            
            const performanceTime = performanceEnd - performanceStart;
            console.log(`⚡ Performance test: ${performanceOps.length} operations in ${performanceTime}ms`);
            
            performanceOps.forEach(op => {
                expect([200, 503]).toContain(op.status); // Allow for service unavailability
            });
            
            expect(performanceTime).toBeLessThan(10000); // Should complete within 10 seconds
            
            console.log('✅ Complete poll automation lifecycle simulation successful');
        });
        
        test('should handle high-volume operations', async () => {
            console.log('🚀 Testing high-volume operations...');
            
            // Test batch email creation
            const batchSize = 5;
            const batchCount = 3;
            
            const batchResults = [];
            for (let i = 0; i < batchCount; i++) {
                const batchResponse = await client.createEmails(batchSize);
                expect(batchResponse.status).toBe(200);
                batchResults.push(batchResponse.data);
                
                // Small delay between batches
                await global.testUtils.wait(500);
            }
            
            // Verify all batches completed
            const totalExpected = batchSize * batchCount;
            const totalCreated = batchResults.reduce((sum, batch) => {
                return sum + batch.results.filter(r => r.success).length;
            }, 0);
            
            console.log(`📊 Batch results: ${totalCreated}/${totalExpected} emails created successfully`);
            expect(totalCreated).toBeGreaterThan(0);
            
            // Test system response to high volume
            const systemResponse = await client.getSystemStatus();
            expect(systemResponse.status).toBe(200);
            
            const memoryUsage = systemResponse.data.status.system.memory;
            console.log(`💾 Memory after high-volume test: ${JSON.stringify(memoryUsage)}`);
        });
    });
    
    describe('API Contract Compliance', () => {
        test('should maintain consistent response formats across all endpoints', async () => {
            const endpoints = [
                { method: 'GET', url: '/health' },
                { method: 'GET', url: '/api' },
                { method: 'GET', url: '/api/system/status' },
                { method: 'GET', url: '/api/database/stats' },
                { method: 'GET', url: '/api/emails' },
                { method: 'GET', url: '/api/survey-sites' },
                { method: 'GET', url: '/api/failures/recent' }
            ];
            
            for (const endpoint of endpoints) {
                const response = await client.get(endpoint.url);
                
                // All endpoints should respond
                expect([200, 503]).toContain(response.status);
                
                // All should return JSON
                expect(response.headers['content-type']).toMatch(/json/);
                
                // Successful responses should have consistent structure
                if (response.status === 200 && endpoint.url.startsWith('/api/')) {
                    const body = response.data;
                    if (body.success !== undefined) {
                        expect(typeof body.success).toBe('boolean');
                    }
                }
            }
        });
        
        test('should handle all documented HTTP methods appropriately', async () => {
            const methodTests = [
                { method: 'GET', url: '/api/emails', expectedStatus: 200 },
                { method: 'POST', url: '/api/emails', expectedStatus: 200, data: { count: 1 } },
                { method: 'PUT', url: '/api/emails', expectedStatus: [404, 405, 501] },
                { method: 'DELETE', url: '/api/emails', expectedStatus: [404, 405, 501] }
            ];
            
            for (const test of methodTests) {
                let response;
                
                switch (test.method) {
                    case 'GET':
                        response = await client.get(test.url);
                        break;
                    case 'POST':
                        response = await client.post(test.url, test.data || {});
                        break;
                    case 'PUT':
                        response = await client.put(test.url, test.data || {});
                        break;
                    case 'DELETE':
                        response = await client.delete(test.url);
                        break;
                }
                
                if (Array.isArray(test.expectedStatus)) {
                    expect(test.expectedStatus).toContain(response.status);
                } else {
                    expect(response.status).toBe(test.expectedStatus);
                }
            }
        });
    });
});