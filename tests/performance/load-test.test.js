/**
 * Performance and Load Testing
 * 
 * Tests API performance under various load conditions
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('Performance and Load Testing', () => {
    let server;
    let client;
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
        
        // Warm up the server
        await client.health();
        await client.getSystemStatus();
        
        console.log('🚀 Performance test server ready');
    });
    
    afterAll(async () => {
        await stopTestServer();
    });
    
    describe('Response Time Performance', () => {
        test('should respond to health checks within 100ms', async () => {
            const iterations = 10;
            const responseTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                const response = await client.health();
                const endTime = Date.now();
                
                const responseTime = endTime - startTime;
                responseTimes.push(responseTime);
                
                expect(response.status).toBe(200);
                expect(responseTime).toBeLessThan(100); // Health should be very fast
            }
            
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);
            
            console.log(`📊 Health endpoint performance:`);
            console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`   Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`);
            
            expect(avgResponseTime).toBeLessThan(50); // Average should be even faster
        });
        
        test('should handle system status requests efficiently', async () => {
            const iterations = 5;
            const responseTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                const response = await client.getSystemStatus();
                const endTime = Date.now();
                
                const responseTime = endTime - startTime;
                responseTimes.push(responseTime);
                
                expect(response.status).toBe(200);
                expect(responseTime).toBeLessThan(3000); // System status can be slower
            }
            
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            console.log(`📊 System status performance: ${avgResponseTime.toFixed(2)}ms average`);
            
            expect(avgResponseTime).toBeLessThan(1500);
        });
        
        test('should maintain performance under database operations', async () => {
            // Create some test data first
            await client.createEmails(5);
            
            const operations = [
                { name: 'Get Emails', operation: () => client.getEmails(10) },
                { name: 'Database Stats', operation: () => client.getDatabaseStats() },
                { name: 'System Status', operation: () => client.getSystemStatus() },
                { name: 'Survey Sites', operation: () => client.getSurveySites() }
            ];
            
            const results = {};
            
            for (const op of operations) {
                const iterations = 3;
                const times = [];
                
                for (let i = 0; i < iterations; i++) {
                    const startTime = Date.now();
                    const response = await op.operation();
                    const endTime = Date.now();
                    
                    expect([200, 503]).toContain(response.status);
                    times.push(endTime - startTime);
                }
                
                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                results[op.name] = {
                    average: avgTime,
                    min: Math.min(...times),
                    max: Math.max(...times),
                    times
                };
                
                console.log(`📊 ${op.name}: ${avgTime.toFixed(2)}ms average`);
            }
            
            // All operations should complete within reasonable time
            Object.values(results).forEach(result => {
                expect(result.average).toBeLessThan(5000); // 5 second maximum
            });
        });
    });
    
    describe('Concurrent Request Handling', () => {
        test('should handle multiple concurrent health checks', async () => {
            const concurrentRequests = 20;
            const startTime = Date.now();
            
            const promises = Array(concurrentRequests).fill().map(() => client.health());
            const responses = await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.data.status).toBe('healthy');
            });
            
            // Should handle concurrency efficiently
            const avgTimePerRequest = totalTime / concurrentRequests;
            console.log(`📊 Concurrent health checks: ${concurrentRequests} requests in ${totalTime}ms (${avgTimePerRequest.toFixed(2)}ms/request)`);
            
            expect(totalTime).toBeLessThan(5000); // All requests within 5 seconds
            expect(avgTimePerRequest).toBeLessThan(250); // Each request should be fast
        });
        
        test('should handle concurrent email creation requests', async () => {
            const concurrentRequests = 5;
            const emailsPerRequest = 2;
            
            const startTime = Date.now();
            
            const promises = Array(concurrentRequests).fill().map(() => 
                client.createEmails(emailsPerRequest)
            );
            const responses = await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Check responses
            const successfulRequests = responses.filter(r => r.status === 200).length;
            const totalEmailsCreated = responses
                .filter(r => r.status === 200)
                .reduce((total, response) => {
                    return total + response.data.results.filter(result => result.success).length;
                }, 0);
            
            console.log(`📊 Concurrent email creation:`);
            console.log(`   ${successfulRequests}/${concurrentRequests} requests succeeded`);
            console.log(`   ${totalEmailsCreated}/${concurrentRequests * emailsPerRequest} emails created`);
            console.log(`   Total time: ${totalTime}ms`);
            
            expect(successfulRequests).toBeGreaterThan(0);
            expect(totalTime).toBeLessThan(30000); // 30 seconds max for concurrent creation
            
            // Verify all created emails are unique
            const allEmails = responses
                .filter(r => r.status === 200)
                .flatMap(r => r.data.results.filter(result => result.success).map(result => result.email));
            
            const uniqueEmails = new Set(allEmails);
            expect(uniqueEmails.size).toBe(allEmails.length); // No duplicates
        });
        
        test('should handle mixed concurrent operations', async () => {
            const operations = [
                () => client.health(),
                () => client.getSystemStatus(),
                () => client.getEmails(5),
                () => client.getSurveySites(),
                () => client.createEmails(1),
                () => client.getDatabaseStats(),
                () => client.runErrorDetection(1),
                () => client.getRecentFailures(3)
            ];
            
            const startTime = Date.now();
            
            // Run all operations concurrently
            const promises = operations.map(op => op());
            const responses = await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            console.log(`📊 Mixed concurrent operations: ${operations.length} operations in ${totalTime}ms`);
            
            // Check that all operations completed
            responses.forEach((response, index) => {
                expect([200, 503]).toContain(response.status);
                console.log(`   Operation ${index + 1}: ${response.status} (${response.status === 200 ? 'SUCCESS' : 'UNAVAILABLE'})`);
            });
            
            const successfulOperations = responses.filter(r => r.status === 200).length;
            expect(successfulOperations).toBeGreaterThan(0);
            expect(totalTime).toBeLessThan(15000); // 15 seconds max for mixed operations
        });
    });
    
    describe('Memory and Resource Usage', () => {
        test('should not leak memory during repeated operations', async () => {
            // Get initial memory usage
            const initialResponse = await client.getSystemStatus();
            const initialMemory = parseInt(initialResponse.data.status.system.memory.heapUsed) / 1024 / 1024;
            
            console.log(`📊 Initial memory usage: ${initialMemory.toFixed(2)} MB`);
            
            // Perform many operations
            const operationCount = 50;
            for (let i = 0; i < operationCount; i++) {
                await client.health();
                
                if (i % 10 === 0) {
                    // Occasionally do more intensive operations
                    await client.getSystemStatus();
                    await client.createEmails(1);
                }
            }
            
            // Force garbage collection if possible
            await global.testUtils.wait(1000);
            
            // Check final memory usage
            const finalResponse = await client.getSystemStatus();
            const finalMemory = parseInt(finalResponse.data.status.system.memory.heapUsed) / 1024 / 1024;
            
            console.log(`📊 Final memory usage: ${finalMemory.toFixed(2)} MB`);
            
            const memoryIncrease = finalMemory - initialMemory;
            console.log(`📊 Memory change: ${memoryIncrease >= 0 ? '+' : ''}${memoryIncrease.toFixed(2)} MB`);
            
            // Memory should not increase significantly (allow for 20MB variance)
            expect(memoryIncrease).toBeLessThan(20);
        });
        
        test('should handle resource cleanup after operations', async () => {
            // Create multiple resources
            const emailResponses = await Promise.all([
                client.createEmails(3),
                client.createEmails(3),
                client.createEmails(3)
            ]);
            
            // Add some sites
            await client.createSurveySites([
                { name: 'Resource Test 1', url: 'https://resource1.test.com', category: 'test' },
                { name: 'Resource Test 2', url: 'https://resource2.test.com', category: 'test' }
            ]);
            
            // Query the resources multiple times
            for (let i = 0; i < 10; i++) {
                await Promise.all([
                    client.getEmails(20),
                    client.getSurveySites(),
                    client.getSystemStatus()
                ]);
            }
            
            // System should still be responsive
            const healthResponse = await client.health();
            expect(healthResponse.status).toBe(200);
            
            const statusResponse = await client.getSystemStatus();
            expect(statusResponse.status).toBe(200);
            
            console.log('✅ Resource cleanup test completed - system remains responsive');
        });
    });
    
    describe('Stress Testing', () => {
        test('should handle high-frequency requests', async () => {
            const requestCount = 100;
            const batchSize = 10;
            const results = {
                successful: 0,
                failed: 0,
                totalTime: 0,
                responseTimes: []
            };
            
            console.log(`🚀 Starting stress test: ${requestCount} requests in batches of ${batchSize}`);
            
            for (let batch = 0; batch < requestCount / batchSize; batch++) {
                const batchStart = Date.now();
                
                const batchPromises = Array(batchSize).fill().map(async () => {
                    const requestStart = Date.now();
                    try {
                        const response = await client.health();
                        const requestEnd = Date.now();
                        
                        results.responseTimes.push(requestEnd - requestStart);
                        
                        if (response.status === 200) {
                            results.successful++;
                        } else {
                            results.failed++;
                        }
                    } catch (error) {
                        results.failed++;
                    }
                });
                
                await Promise.all(batchPromises);
                
                const batchEnd = Date.now();
                const batchTime = batchEnd - batchStart;
                results.totalTime += batchTime;
                
                console.log(`   Batch ${batch + 1}/${requestCount / batchSize}: ${batchTime}ms`);
                
                // Small delay between batches to prevent overwhelming
                await global.testUtils.wait(100);
            }
            
            const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
            const maxResponseTime = Math.max(...results.responseTimes);
            const minResponseTime = Math.min(...results.responseTimes);
            const successRate = (results.successful / requestCount) * 100;
            
            console.log(`📊 Stress test results:`);
            console.log(`   Total requests: ${requestCount}`);
            console.log(`   Successful: ${results.successful} (${successRate.toFixed(1)}%)`);
            console.log(`   Failed: ${results.failed}`);
            console.log(`   Total time: ${results.totalTime}ms`);
            console.log(`   Avg response time: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`   Min response time: ${minResponseTime}ms`);
            console.log(`   Max response time: ${maxResponseTime}ms`);
            
            // Stress test success criteria
            expect(successRate).toBeGreaterThan(95); // At least 95% success rate
            expect(avgResponseTime).toBeLessThan(500); // Average response under 500ms
            expect(maxResponseTime).toBeLessThan(2000); // No response over 2 seconds
        });
        
        test('should maintain stability under sustained load', async () => {
            const sustainedDuration = 10000; // 10 seconds
            const requestInterval = 100; // 100ms between requests
            const startTime = Date.now();
            
            const results = {
                requests: 0,
                successful: 0,
                failed: 0,
                responseTimes: []
            };
            
            console.log(`🚀 Sustained load test: ${sustainedDuration / 1000} seconds`);
            
            while (Date.now() - startTime < sustainedDuration) {
                const requestStart = Date.now();
                
                try {
                    const response = await client.health();
                    const requestEnd = Date.now();
                    
                    results.requests++;
                    results.responseTimes.push(requestEnd - requestStart);
                    
                    if (response.status === 200) {
                        results.successful++;
                    } else {
                        results.failed++;
                    }
                } catch (error) {
                    results.requests++;
                    results.failed++;
                }
                
                // Wait for next request
                await global.testUtils.wait(requestInterval);
            }
            
            const actualDuration = Date.now() - startTime;
            const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
            const successRate = (results.successful / results.requests) * 100;
            const requestsPerSecond = results.requests / (actualDuration / 1000);
            
            console.log(`📊 Sustained load test results:`);
            console.log(`   Duration: ${actualDuration}ms`);
            console.log(`   Total requests: ${results.requests}`);
            console.log(`   Requests/second: ${requestsPerSecond.toFixed(2)}`);
            console.log(`   Success rate: ${successRate.toFixed(1)}%`);
            console.log(`   Avg response time: ${avgResponseTime.toFixed(2)}ms`);
            
            // Sustained load success criteria
            expect(results.requests).toBeGreaterThan(0);
            expect(successRate).toBeGreaterThan(90); // At least 90% success under sustained load
            expect(avgResponseTime).toBeLessThan(1000); // Average response under 1 second
        });
    });
    
    describe('Throughput Testing', () => {
        test('should achieve acceptable throughput for email creation', async () => {
            const emailBatches = [
                { count: 5, provider: 'auto' },
                { count: 3, provider: 'guerrilla' },
                { count: 4, provider: 'tempmail' }
            ];
            
            const startTime = Date.now();
            
            const batchResults = await client.batchCreateEmails(emailBatches);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            const totalEmailsRequested = emailBatches.reduce((sum, batch) => sum + batch.count, 0);
            const totalEmailsCreated = batchResults.reduce((sum, result) => {
                if (result.success) {
                    return sum + result.response.results.filter(r => r.success).length;
                }
                return sum;
            }, 0);
            
            const emailsPerSecond = totalEmailsCreated / (totalTime / 1000);
            
            console.log(`📊 Email creation throughput:`);
            console.log(`   Requested: ${totalEmailsRequested} emails`);
            console.log(`   Created: ${totalEmailsCreated} emails`);
            console.log(`   Time: ${totalTime}ms`);
            console.log(`   Throughput: ${emailsPerSecond.toFixed(2)} emails/second`);
            
            expect(totalEmailsCreated).toBeGreaterThan(0);
            expect(emailsPerSecond).toBeGreaterThan(0.1); // At least 0.1 emails per second
        });
        
        test('should maintain read throughput under load', async () => {
            // First create some test data
            await client.createEmails(10);
            await client.createSurveySites([
                { name: 'Throughput Test 1', url: 'https://throughput1.test.com', category: 'test' },
                { name: 'Throughput Test 2', url: 'https://throughput2.test.com', category: 'test' }
            ]);
            
            const readOperations = [
                () => client.getEmails(20),
                () => client.getSurveySites(),
                () => client.getSystemStatus(),
                () => client.getDatabaseStats()
            ];
            
            const iterations = 5;
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                await Promise.all(readOperations.map(op => op()));
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            const totalOperations = readOperations.length * iterations;
            const operationsPerSecond = totalOperations / (totalTime / 1000);
            
            console.log(`📊 Read throughput:`);
            console.log(`   Operations: ${totalOperations}`);
            console.log(`   Time: ${totalTime}ms`);
            console.log(`   Throughput: ${operationsPerSecond.toFixed(2)} operations/second`);
            
            expect(operationsPerSecond).toBeGreaterThan(1); // At least 1 operation per second
        });
    });
});