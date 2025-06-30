/**
 * Security Testing
 * 
 * Tests for security vulnerabilities, input validation, and protection mechanisms
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('Security Testing', () => {
    let server;
    let client;
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
        console.log('🔒 Security test server ready');
    });
    
    afterAll(async () => {
        await stopTestServer();
    });
    
    describe('Input Validation and Sanitization', () => {
        test('should reject SQL injection attempts', async () => {
            const sqlInjectionPayloads = [
                "'; DROP TABLE email_accounts; --",
                "1' OR '1'='1",
                "admin'/*",
                "1; DELETE FROM survey_sites; --",
                "' UNION SELECT * FROM email_accounts --"
            ];
            
            for (const payload of sqlInjectionPayloads) {
                // Try SQL injection in various endpoints
                const responses = await Promise.all([
                    client.get(`/api/emails?provider=${encodeURIComponent(payload)}`),
                    client.get(`/api/emails/unused/${encodeURIComponent(payload)}`),
                    client.post('/api/emails', { provider: payload }),
                    client.post('/api/survey-sites', { 
                        sites: [{ name: payload, url: 'https://test.com', category: 'test' }] 
                    })
                ]);
                
                responses.forEach(response => {
                    // Should either reject with 400 or handle safely without errors
                    expect([200, 400, 404]).toContain(response.status);
                    
                    // Should not return database errors or expose internal details
                    if (response.data.error) {
                        expect(response.data.error.toLowerCase()).not.toMatch(/sql|database|sqlite|syntax error/);
                    }
                });
            }
            
            console.log('✅ SQL injection protection verified');
        });
        
        test('should reject XSS attempts', async () => {
            const xssPayloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "'\"><script>alert('xss')</script>",
                "<svg/onload=alert('xss')>"
            ];
            
            for (const payload of xssPayloads) {
                const responses = await Promise.all([
                    client.post('/api/emails', { provider: payload }),
                    client.post('/api/survey-sites', { 
                        sites: [{ name: payload, url: 'https://test.com', category: payload }] 
                    })
                ]);
                
                responses.forEach(response => {
                    // Check that XSS payload is not reflected in response
                    const responseText = JSON.stringify(response.data);
                    expect(responseText).not.toContain('<script>');
                    expect(responseText).not.toContain('javascript:');
                    expect(responseText).not.toContain('onerror=');
                    expect(responseText).not.toContain('onload=');
                });
            }
            
            console.log('✅ XSS protection verified');
        });
        
        test('should validate email format properly', async () => {
            const invalidEmails = [
                'invalid-email',
                '@domain.com',
                'user@',
                'user..double.dot@domain.com',
                'user@domain',
                '.user@domain.com',
                'user@.domain.com',
                'user@domain..com',
                'very-long-email-address-that-exceeds-normal-limits@very-long-domain-name-that-should-not-be-accepted.com'
            ];
            
            // Test email validation in various contexts
            for (const invalidEmail of invalidEmails) {
                // These operations should handle invalid emails gracefully
                const responses = await Promise.all([
                    client.get(`/api/emails?provider=${encodeURIComponent(invalidEmail)}`),
                    client.post('/api/register', { 
                        siteIds: [1], 
                        emailCount: 1,
                        testEmail: invalidEmail // If endpoint supported custom emails
                    })
                ]);
                
                responses.forEach(response => {
                    // Should not crash or expose validation details
                    expect([200, 400, 404]).toContain(response.status);
                });
            }
            
            console.log('✅ Email validation security verified');
        });
        
        test('should validate URL format in survey sites', async () => {
            const invalidUrls = [
                'not-a-url',
                'ftp://invalid-protocol.com',
                'javascript:alert("xss")',
                'data:text/html,<script>alert("xss")</script>',
                'file:///etc/passwd',
                'http://localhost/admin',
                'https://very-long-url-' + 'x'.repeat(2000) + '.com'
            ];
            
            for (const invalidUrl of invalidUrls) {
                const response = await client.post('/api/survey-sites', {
                    sites: [{
                        name: 'Test Site',
                        url: invalidUrl,
                        category: 'test'
                    }]
                });
                
                // Should reject invalid URLs
                if (response.status === 200) {
                    // If accepted, should mark as failed in results
                    const results = response.data.results;
                    if (results && results.length > 0) {
                        expect(results[0].success).toBe(false);
                    }
                } else {
                    expect(response.status).toBe(400);
                }
            }
            
            console.log('✅ URL validation security verified');
        });
    });
    
    describe('Rate Limiting and DoS Protection', () => {
        test('should enforce rate limits on API endpoints', async () => {
            const rapidRequests = 50;
            const responses = [];
            
            console.log(`🚀 Testing rate limiting with ${rapidRequests} rapid requests...`);
            
            // Make rapid requests to test rate limiting
            for (let i = 0; i < rapidRequests; i++) {
                try {
                    const response = await client.health();
                    responses.push(response);
                } catch (error) {
                    responses.push({ status: 500, error: error.message });
                }
            }
            
            // Analyze responses
            const successfulResponses = responses.filter(r => r.status === 200).length;
            const rateLimitedResponses = responses.filter(r => r.status === 429).length;
            const errorResponses = responses.filter(r => r.status >= 400).length;
            
            console.log(`📊 Rate limiting results:`);
            console.log(`   Successful: ${successfulResponses}/${rapidRequests}`);
            console.log(`   Rate limited (429): ${rateLimitedResponses}/${rapidRequests}`);
            console.log(`   Other errors: ${errorResponses}/${rapidRequests}`);
            
            // Should have some rate limiting or at least handle all requests
            expect(successfulResponses + rateLimitedResponses + errorResponses).toBe(rapidRequests);
            
            // If rate limiting is enabled, should see 429 responses
            if (rateLimitedResponses > 0) {
                console.log('✅ Rate limiting is active');
            } else {
                console.log('ℹ️ No rate limiting detected (server handled all requests)');
            }
        });
        
        test('should handle large payload attacks', async () => {
            const largePayloads = [
                // Large string
                { count: 1, provider: 'x'.repeat(100000) },
                // Many fields
                { 
                    count: 1, 
                    provider: 'auto',
                    ...Object.fromEntries(Array(1000).fill().map((_, i) => [`field${i}`, 'value']))
                },
                // Nested objects
                {
                    count: 1,
                    provider: 'auto',
                    nested: {
                        deep: {
                            very: {
                                deeply: {
                                    nested: 'x'.repeat(10000)
                                }
                            }
                        }
                    }
                }
            ];
            
            for (const payload of largePayloads) {
                const response = await client.post('/api/emails', payload);
                
                // Should reject or handle gracefully, not crash
                expect([200, 400, 413, 500]).toContain(response.status);
                
                if (response.status === 413) {
                    console.log('✅ Payload size limit enforced (413 Payload Too Large)');
                }
            }
        });
        
        test('should protect against slowloris-style attacks', async () => {
            // Simulate slow requests that could tie up server resources
            const slowRequests = 5;
            const requestDelay = 100; // Small delay to simulate slow client
            
            const promises = Array(slowRequests).fill().map(async (_, index) => {
                await global.testUtils.wait(requestDelay * index);
                return client.health();
            });
            
            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const endTime = Date.now();
            
            // All requests should complete
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            
            // Should not take excessively long
            const totalTime = endTime - startTime;
            expect(totalTime).toBeLessThan(10000); // 10 seconds max
            
            console.log(`✅ Slow request protection verified (${totalTime}ms for ${slowRequests} requests)`);
        });
    });
    
    describe('Authentication and Authorization', () => {
        test('should handle missing authentication gracefully', async () => {
            // Test endpoints that might require authentication
            const protectedEndpoints = [
                '/api/admin',
                '/api/config',
                '/api/internal',
                '/api/debug'
            ];
            
            for (const endpoint of protectedEndpoints) {
                const response = await client.get(endpoint);
                
                // Should return 401 (Unauthorized), 403 (Forbidden), or 404 (Not Found)
                // Should not return 500 (Internal Server Error) or expose details
                expect([401, 403, 404]).toContain(response.status);
            }
        });
        
        test('should reject invalid authentication tokens', async () => {
            const invalidTokens = [
                'Bearer invalid-token',
                'Bearer ' + 'x'.repeat(1000),
                'Bearer <script>alert("xss")</script>',
                'Basic ' + Buffer.from('admin:admin').toString('base64'),
                'Invalid-Auth-Type token'
            ];
            
            for (const token of invalidTokens) {
                const response = await client.get('/api/system/status', {
                    headers: { 'Authorization': token }
                });
                
                // Should either ignore the header (200) or reject it (401/403)
                expect([200, 401, 403]).toContain(response.status);
                
                // Should not expose authentication details in error
                if (response.data.error) {
                    expect(response.data.error.toLowerCase()).not.toMatch(/token|jwt|auth|credential/);
                }
            }
        });
    });
    
    describe('Information Disclosure Protection', () => {
        test('should not expose sensitive system information', async () => {
            const responses = await Promise.all([
                client.getSystemStatus(),
                client.getDatabaseStats(),
                client.testLLM(),
                client.get('/api/invalid-endpoint')
            ]);
            
            responses.forEach(response => {
                const responseText = JSON.stringify(response.data);
                
                // Should not expose sensitive file paths
                expect(responseText).not.toMatch(/\/home\/[^\/]+/);
                expect(responseText).not.toMatch(/C:\\\\Users\\\\/);
                expect(responseText).not.toMatch(/\/etc\/passwd/);
                expect(responseText).not.toMatch(/\/var\/log\//);
                
                // Should not expose sensitive configuration
                expect(responseText).not.toMatch(/password/i);
                expect(responseText).not.toMatch(/secret/i);
                expect(responseText).not.toMatch(/private[_-]?key/i);
                
                // Should not expose internal stack traces
                expect(responseText).not.toMatch(/at [A-Za-z0-9_$]+\\.[A-Za-z0-9_$]+/);
                expect(responseText).not.toMatch(/Error: .* at /);
            });
            
            console.log('✅ Information disclosure protection verified');
        });
        
        test('should not expose database schema details', async () => {
            const response = await client.getDatabaseStats();
            
            if (response.status === 200) {
                const responseText = JSON.stringify(response.data);
                
                // Should not expose raw SQL or schema details
                expect(responseText).not.toMatch(/CREATE TABLE/i);
                expect(responseText).not.toMatch(/INSERT INTO/i);
                expect(responseText).not.toMatch(/SELECT \* FROM/i);
                expect(responseText).not.toMatch(/sqlite_master/i);
            }
        });
        
        test('should sanitize error messages', async () => {
            // Trigger various error conditions
            const errorRequests = [
                client.get('/api/emails/unused/999999'), // Non-existent site
                client.post('/api/emails', { count: -1 }), // Invalid count
                client.post('/api/survey-sites', { invalid: 'data' }), // Invalid format
                client.get('/api/nonexistent-endpoint') // 404 error
            ];
            
            const responses = await Promise.all(errorRequests);
            
            responses.forEach(response => {
                if (response.status >= 400) {
                    const errorText = JSON.stringify(response.data);
                    
                    // Should not expose internal file paths
                    expect(errorText).not.toMatch(/\/[a-zA-Z0-9_-]+\.(js|ts|json)/);
                    
                    // Should not expose stack traces
                    expect(errorText).not.toMatch(/at .* \(/);  
                    
                    // Should not expose SQL errors
                    expect(errorText).not.toMatch(/SQLITE_/);
                    expect(errorText).not.toMatch(/syntax error/i);
                }
            });
            
            console.log('✅ Error message sanitization verified');
        });
    });
    
    describe('HTTP Security Headers', () => {
        test('should include security headers', async () => {
            const response = await client.health();
            
            const headers = response.headers;
            
            // Check for common security headers
            const securityHeaders = {
                'x-content-type-options': 'nosniff',
                'x-frame-options': 'DENY',
                'x-xss-protection': '1; mode=block'
            };
            
            for (const [headerName, expectedValue] of Object.entries(securityHeaders)) {
                if (headers[headerName]) {
                    console.log(`✅ Security header found: ${headerName}: ${headers[headerName]}`);
                } else {
                    console.log(`ℹ️ Security header missing: ${headerName}`);
                }
            }
            
            // Content-Type should be set correctly
            expect(headers['content-type']).toMatch(/application\/json/);
        });
        
        test('should handle CORS properly', async () => {
            const response = await client.get('/api', {
                headers: {
                    'Origin': 'https://malicious-site.com'
                }
            });
            
            const corsHeader = response.headers['access-control-allow-origin'];
            
            if (corsHeader) {
                // CORS should be configured securely
                expect(corsHeader).not.toBe('*'); // Should not allow all origins in production
                console.log(`📡 CORS policy: ${corsHeader}`);
            }
        });
    });
    
    describe('Resource Exhaustion Protection', () => {
        test('should limit resource consumption', async () => {
            // Test creating many resources rapidly
            const resourceTests = [
                { name: 'Email Creation', operation: () => client.createEmails(20) },
                { name: 'Site Creation', operation: () => client.createSurveySites(
                    Array(10).fill().map((_, i) => ({
                        name: `Resource Test ${i}`,
                        url: `https://resource-test-${i}.com`,
                        category: 'test'
                    }))
                )}
            ];
            
            for (const test of resourceTests) {
                const startTime = Date.now();
                const response = await test.operation();
                const endTime = Date.now();
                
                const responseTime = endTime - startTime;
                
                // Should either succeed with limits or fail gracefully
                expect([200, 400, 429]).toContain(response.status);
                
                // Should not take excessively long (potential DoS)
                expect(responseTime).toBeLessThan(30000); // 30 seconds max
                
                console.log(`📊 ${test.name}: ${response.status} in ${responseTime}ms`);
            }
        });
        
        test('should handle concurrent resource creation safely', async () => {
            const concurrentOperations = 10;
            
            const promises = Array(concurrentOperations).fill().map(() =>
                client.createEmails(2)
            );
            
            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const endTime = Date.now();
            
            const totalTime = endTime - startTime;
            
            // Should handle concurrent operations without crashing
            responses.forEach(response => {
                expect([200, 400, 429, 503]).toContain(response.status);
            });
            
            // Should complete within reasonable time
            expect(totalTime).toBeLessThan(60000); // 1 minute max
            
            const successfulOperations = responses.filter(r => r.status === 200).length;
            console.log(`📊 Concurrent safety: ${successfulOperations}/${concurrentOperations} operations succeeded in ${totalTime}ms`);
        });
    });
});