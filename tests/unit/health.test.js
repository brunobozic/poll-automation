/**
 * Health Endpoint Unit Tests
 * 
 * Tests for the /health endpoint functionality
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('Health Endpoint', () => {
    let server;
    let client;
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
    });
    
    afterAll(async () => {
        await stopTestServer();
    });
    
    describe('GET /health', () => {
        test('should return healthy status', async () => {
            const response = await client.health();
            
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/json/);
            
            const body = response.data;
            expect(body).toHaveProperty('status', 'healthy');
            expect(body).toHaveProperty('timestamp');
            expect(body).toHaveProperty('uptime');
            expect(body).toHaveProperty('memory');
            expect(body).toHaveProperty('version');
            expect(body).toHaveProperty('requestId');
        });
        
        test('should return valid timestamp', async () => {
            const response = await client.health();
            const body = response.data;
            
            const timestamp = new Date(body.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(timestamp.getTime()).not.toBeNaN();
            
            // Timestamp should be recent (within last 5 seconds)
            const now = new Date();
            const timeDiff = Math.abs(now.getTime() - timestamp.getTime());
            expect(timeDiff).toBeLessThan(5000);
        });
        
        test('should return valid uptime', async () => {
            const response = await client.health();
            const body = response.data;
            
            expect(typeof body.uptime).toBe('number');
            expect(body.uptime).toBeGreaterThan(0);
        });
        
        test('should return memory usage information', async () => {
            const response = await client.health();
            const body = response.data;
            
            expect(body.memory).toHaveProperty('used');
            expect(body.memory).toHaveProperty('total');
            expect(body.memory).toHaveProperty('external');
            
            // Memory values should be strings with MB suffix
            expect(body.memory.used).toMatch(/\\d+ MB/);
            expect(body.memory.total).toMatch(/\\d+ MB/);
            expect(body.memory.external).toMatch(/\\d+ MB/);
        });
        
        test('should return unique request IDs', async () => {
            const response1 = await client.health();
            const response2 = await client.health();
            
            const requestId1 = response1.data.requestId;
            const requestId2 = response2.data.requestId;
            
            expect(requestId1).toBeDefined();
            expect(requestId2).toBeDefined();
            expect(requestId1).not.toBe(requestId2);
        });
        
        test('should handle multiple concurrent requests', async () => {
            const requests = Array(10).fill().map(() => client.health());
            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.data.status).toBe('healthy');
            });
            
            // All request IDs should be unique
            const requestIds = responses.map(r => r.data.requestId);
            const uniqueIds = new Set(requestIds);
            expect(uniqueIds.size).toBe(requestIds.length);
        });
        
        test('should respond quickly', async () => {
            const startTime = Date.now();
            const response = await client.health();
            const endTime = Date.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
            expect(response.status).toBe(200);
        });
        
        test('should maintain consistent response format', async () => {
            // Make multiple requests to ensure consistency
            const responses = await Promise.all([
                client.health(),
                client.health(),
                client.health()
            ]);
            
            const firstResponse = responses[0].data;
            
            responses.forEach(response => {
                const body = response.data;
                
                // Same properties should exist
                expect(Object.keys(body).sort()).toEqual(Object.keys(firstResponse).sort());
                
                // Same property types
                expect(typeof body.status).toBe(typeof firstResponse.status);
                expect(typeof body.uptime).toBe(typeof firstResponse.uptime);
                expect(typeof body.version).toBe(typeof firstResponse.version);
            });
        });
        
        test('should include version information', async () => {
            const response = await client.health();
            const body = response.data;
            
            expect(body.version).toBeDefined();
            expect(typeof body.version).toBe('string');
            expect(body.version.length).toBeGreaterThan(0);
        });
    });
    
    describe('Health endpoint error scenarios', () => {
        test('should handle invalid HTTP methods gracefully', async () => {
            // These should return 404 or 405, not crash the server
            const postResponse = await client.post('/health');
            expect([404, 405, 501]).toContain(postResponse.status);
            
            const putResponse = await client.put('/health');
            expect([404, 405, 501]).toContain(putResponse.status);
            
            const deleteResponse = await client.delete('/health');
            expect([404, 405, 501]).toContain(deleteResponse.status);
        });
        
        test('should handle requests with query parameters', async () => {
            const response = await client.get('/health?test=1&foo=bar');
            
            // Should still work normally, ignoring query params
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
        });
        
        test('should handle requests with headers', async () => {
            const response = await client.get('/health', {
                headers: {
                    'Custom-Header': 'test-value',
                    'Another-Header': 'another-value'
                }
            });
            
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
        });
    });
    
    describe('Health endpoint performance', () => {
        test('should maintain performance under load', async () => {
            const startTime = Date.now();
            
            // Make 50 concurrent requests
            const requests = Array(50).fill().map(() => client.health());
            const responses = await Promise.all(requests);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / responses.length;
            
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            
            // Average response time should be reasonable
            expect(averageTime).toBeLessThan(200); // Less than 200ms average
            
            console.log(`Health endpoint performance: ${responses.length} requests in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);
        });
        
        test('should not leak memory on repeated requests', async () => {
            // Get initial memory usage
            const initialResponse = await client.health();
            const initialMemory = parseInt(initialResponse.data.memory.used.replace(' MB', ''));
            
            // Make many requests
            for (let i = 0; i < 100; i++) {
                await client.health();
            }
            
            // Check final memory usage
            const finalResponse = await client.health();
            const finalMemory = parseInt(finalResponse.data.memory.used.replace(' MB', ''));
            
            // Memory should not increase significantly (allow for 10MB variance)
            const memoryIncrease = finalMemory - initialMemory;
            expect(memoryIncrease).toBeLessThan(10);
            
            console.log(`Memory usage: ${initialMemory}MB -> ${finalMemory}MB (${memoryIncrease >= 0 ? '+' : ''}${memoryIncrease}MB)`);
        });
    });
});