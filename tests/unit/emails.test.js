/**
 * Email Management Endpoint Unit Tests
 * 
 * Tests for the email creation and management endpoints
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('Email Management Endpoints', () => {
    let server;
    let client;
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
    });
    
    afterAll(async () => {
        await stopTestServer();
    });
    
    describe('POST /api/emails', () => {
        test('should create a single email account with default parameters', async () => {
            const response = await client.createEmails();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body.success).toBe(true);
            expect(body).toHaveProperty('message');
            expect(body).toHaveProperty('results');
            expect(body.results).toHaveLength(1);
            
            const emailResult = body.results[0];
            expect(emailResult.success).toBe(true);
            expect(emailResult).toHaveProperty('email');
            expect(emailResult).toHaveProperty('provider');
            expect(emailResult).toHaveProperty('credentials');
            
            // Validate email format
            expect(global.testUtils.isValidEmail(emailResult.email)).toBe(true);
        });
        
        test('should create multiple email accounts', async () => {
            const count = 3;
            const response = await client.createEmails(count);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body.results).toHaveLength(count);
            
            // All emails should be unique
            const emails = body.results.map(r => r.email);
            const uniqueEmails = new Set(emails);
            expect(uniqueEmails.size).toBe(count);
            
            // All should be valid emails
            emails.forEach(email => {
                expect(global.testUtils.isValidEmail(email)).toBe(true);
            });
        });
        
        test('should respect provider specification', async () => {
            const provider = 'guerrilla';
            const response = await client.createEmails(1, provider);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            if (body.results[0].success) {
                expect(body.results[0].provider).toBe(provider);
            }
        });
        
        test('should validate request parameters', async () => {
            // Test invalid count (too high)
            const invalidResponse = await client.post('/api/emails', { count: 25 });
            expect(invalidResponse.status).toBe(400);
            
            // Test invalid count (zero)
            const zeroResponse = await client.post('/api/emails', { count: 0 });
            expect(zeroResponse.status).toBe(400);
            
            // Test invalid provider
            const invalidProviderResponse = await client.post('/api/emails', { 
                count: 1, 
                provider: 'invalid-provider' 
            });
            expect(invalidProviderResponse.status).toBe(400);
        });
        
        test('should handle missing request body gracefully', async () => {
            const response = await client.post('/api/emails');
            
            // Should use defaults
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            expect(body.results).toHaveLength(1);
        });
        
        test('should handle creation failures gracefully', async () => {
            // Test with a very high count to potentially trigger failures
            const response = await client.createEmails(10);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            // Should return results for each attempt
            expect(body.results).toHaveLength(10);
            
            // Count successful vs failed
            const successful = body.results.filter(r => r.success).length;
            const failed = body.results.filter(r => !r.success).length;
            
            expect(successful + failed).toBe(10);
            expect(body.message).toContain(`${successful}/10`);
        });
        
        test('should track performance metrics', async () => {
            const startTime = Date.now();
            const response = await client.createEmails(5);
            const endTime = Date.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds
            
            expect(response.status).toBe(200);
            console.log(`Created 5 emails in ${responseTime}ms`);
        });
    });
    
    describe('GET /api/emails', () => {
        beforeEach(async () => {
            // Create some test emails
            await client.createEmails(3);
        });
        
        test('should list email accounts', async () => {
            const response = await client.getEmails();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body).toHaveProperty('count');
            expect(body).toHaveProperty('emails');
            expect(Array.isArray(body.emails)).toBe(true);
            expect(body.count).toBeGreaterThanOrEqual(0);
            expect(body.emails.length).toBe(body.count);
        });
        
        test('should return email details with statistics', async () => {
            const response = await client.getEmails(5);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            if (body.emails.length > 0) {
                const email = body.emails[0];
                global.testUtils.validateEmailResponse(email);
                
                expect(email).toHaveProperty('registrations');
                expect(email).toHaveProperty('successful');
                expect(email).toHaveProperty('credentials');
                expect(typeof email.registrations).toBe('number');
                expect(typeof email.successful).toBe('number');
            }
        });
        
        test('should respect limit parameter', async () => {
            const limit = 2;
            const response = await client.getEmails(limit);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body.emails.length).toBeLessThanOrEqual(limit);
        });
        
        test('should filter by provider', async () => {
            // Create emails with specific provider
            await client.createEmails(2, 'guerrilla');
            
            const response = await client.getEmails(100, 'guerrilla');
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            body.emails.forEach(email => {
                expect(email.provider).toBe('guerrilla');
            });
        });
        
        test('should validate query parameters', async () => {
            // Test invalid limit
            const invalidResponse = await client.get('/api/emails?limit=1001');
            expect(invalidResponse.status).toBe(400);
            
            // Test negative limit
            const negativeResponse = await client.get('/api/emails?limit=-1');
            expect(negativeResponse.status).toBe(400);
        });
        
        test('should return emails in descending order by creation date', async () => {
            const response = await client.getEmails(10);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            if (body.emails.length > 1) {
                for (let i = 1; i < body.emails.length; i++) {
                    const prevDate = new Date(body.emails[i - 1].created);
                    const currDate = new Date(body.emails[i].created);
                    expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
                }
            }
        });
    });
    
    describe('GET /api/emails/unused/:siteId', () => {
        test('should get unused emails for a site', async () => {
            // Create some emails first
            await client.createEmails(5);
            
            const siteId = 1; // Assuming site 1 exists or will be created
            const response = await client.getUnusedEmails(siteId);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body).toHaveProperty('siteId', siteId);
            expect(body).toHaveProperty('count');
            expect(body).toHaveProperty('emails');
            expect(Array.isArray(body.emails)).toBe(true);
            
            body.emails.forEach(email => {
                expect(email).toHaveProperty('id');
                expect(email).toHaveProperty('email');
                expect(email).toHaveProperty('provider');
                expect(email).toHaveProperty('created');
            });
        });
        
        test('should validate site ID parameter', async () => {
            // Test invalid site ID
            const invalidResponse = await client.get('/api/emails/unused/invalid');
            expect(invalidResponse.status).toBe(400);
            
            // Test negative site ID
            const negativeResponse = await client.get('/api/emails/unused/-1');
            expect(negativeResponse.status).toBe(400);
        });
        
        test('should respect limit for unused emails', async () => {
            await client.createEmails(10);
            
            const siteId = 1;
            const limit = 3;
            const response = await client.getUnusedEmails(siteId, limit);
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body.emails.length).toBeLessThanOrEqual(limit);
        });
    });
    
    describe('GET /api/emails/successful', () => {
        test('should get successfully registered emails', async () => {
            const response = await client.getSuccessfulEmails();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body).toHaveProperty('count');
            expect(body).toHaveProperty('emails');
            expect(Array.isArray(body.emails)).toBe(true);
            
            body.emails.forEach(email => {
                expect(email).toHaveProperty('totalRegistrations');
                expect(email).toHaveProperty('successfulRegistrations');
                expect(email.successfulRegistrations).toBeGreaterThan(0);
                expect(email).toHaveProperty('credentials');
            });
        });
        
        test('should order by successful registrations descending', async () => {
            const response = await client.getSuccessfulEmails();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            if (body.emails.length > 1) {
                for (let i = 1; i < body.emails.length; i++) {
                    const prev = body.emails[i - 1].successfulRegistrations;
                    const curr = body.emails[i].successfulRegistrations;
                    expect(prev).toBeGreaterThanOrEqual(curr);
                }
            }
        });
    });
    
    describe('Email endpoint error handling', () => {
        test('should handle malformed JSON', async () => {
            const response = await client.post('/api/emails', 'invalid-json', {
                headers: { 'Content-Type': 'application/json' }
            });
            
            expect(response.status).toBe(400);
        });
        
        test('should handle missing content type', async () => {
            const response = await client.post('/api/emails', 
                'count=5&provider=auto',
                { 
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );
            
            // Should still work or return appropriate error
            expect([200, 400]).toContain(response.status);
        });
        
        test('should handle oversized requests', async () => {
            const largeData = {
                count: 1,
                provider: 'auto',
                extraData: 'x'.repeat(20 * 1024 * 1024) // 20MB string
            };
            
            const response = await client.post('/api/emails', largeData);
            expect([413, 400]).toContain(response.status); // Payload too large or bad request
        });
    });
    
    describe('Email endpoint performance', () => {
        test('should handle concurrent email creation', async () => {
            const concurrentRequests = 5;
            const requests = Array(concurrentRequests).fill().map(() => 
                client.createEmails(2)
            );
            
            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                const body = global.testUtils.validateApiResponse(response);
                expect(body.results).toHaveLength(2);
            });
            
            // Verify all emails are unique
            const allEmails = responses.flatMap(r => 
                r.data.results.filter(result => result.success).map(result => result.email)
            );
            const uniqueEmails = new Set(allEmails);
            expect(uniqueEmails.size).toBe(allEmails.length);
        });
        
        test('should maintain reasonable response times', async () => {
            const startTime = Date.now();
            const response = await client.createEmails(3);
            const endTime = Date.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(5000); // 5 second max for 3 emails
            expect(response.status).toBe(200);
            
            console.log(`Email creation performance: 3 emails in ${responseTime}ms`);
        });
    });
});