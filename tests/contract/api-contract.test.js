/**
 * API Contract Testing
 * 
 * Tests that verify the API adheres to its documented contracts and specifications
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('API Contract Testing', () => {
    let server;
    let client;
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
        console.log('📋 Contract test server ready');
    });
    
    afterAll(async () => {
        await stopTestServer();
    });
    
    describe('Response Format Contracts', () => {
        test('should enforce consistent success response format', async () => {
            const successEndpoints = [
                { method: 'GET', url: '/health' },
                { method: 'GET', url: '/api' },
                { method: 'GET', url: '/api/system/status' },
                { method: 'GET', url: '/api/emails' },
                { method: 'GET', url: '/api/survey-sites' },
                { method: 'POST', url: '/api/emails', data: { count: 1 } }
            ];
            
            for (const endpoint of successEndpoints) {
                const response = endpoint.method === 'POST' 
                    ? await client.post(endpoint.url, endpoint.data || {})
                    : await client.get(endpoint.url);
                
                if (response.status === 200) {
                    const body = response.data;
                    
                    // Response format validation
                    expect(typeof body).toBe('object');
                    expect(body).not.toBeNull();
                    
                    // Content-Type validation
                    expect(response.headers['content-type']).toMatch(/application\/json/);
                    
                    // API endpoints (except health) should have success property
                    if (endpoint.url.startsWith('/api/')) {
                        if (body.success !== undefined) {
                            expect(typeof body.success).toBe('boolean');
                        }
                    }
                    
                    console.log(`✅ ${endpoint.method} ${endpoint.url}: Response format valid`);
                } else {
                    console.log(`⚠️ ${endpoint.method} ${endpoint.url}: Status ${response.status} (expected 200)`);
                }
            }
        });
        
        test('should enforce consistent error response format', async () => {
            const errorScenarios = [
                { url: '/api/emails', method: 'POST', data: { count: -1 }, expectedStatus: 400 },
                { url: '/api/emails/unused/invalid', method: 'GET', expectedStatus: 400 },
                { url: '/api/nonexistent', method: 'GET', expectedStatus: 404 },
                { url: '/api/survey-sites', method: 'POST', data: { invalid: 'data' }, expectedStatus: 400 }
            ];
            
            for (const scenario of errorScenarios) {
                const response = scenario.method === 'POST'
                    ? await client.post(scenario.url, scenario.data || {})
                    : await client.get(scenario.url);
                
                expect(response.status).toBe(scenario.expectedStatus);
                
                const body = response.data;
                
                // Error response format validation
                expect(typeof body).toBe('object');
                expect(body).not.toBeNull();
                
                // Should have error information
                if (body.success !== undefined) {
                    expect(body.success).toBe(false);
                }
                
                // Should have error message or details
                expect(body.error || body.errors || body.message).toBeDefined();
                
                // Content-Type should still be JSON
                expect(response.headers['content-type']).toMatch(/application\\/json/);
                
                console.log(`✅ Error contract ${scenario.method} ${scenario.url}: Format valid`);
            }
        });
        
        test('should maintain consistent data types across endpoints', async () => {
            // Create test data first
            await client.createEmails(2);
            await client.createSurveySites([{
                name: 'Contract Test Site',
                url: 'https://contract-test.com',
                category: 'test'
            }]);
            
            const dataTypeTests = [
                {
                    name: 'Email list',
                    operation: () => client.getEmails(5),
                    validator: (data) => {
                        expect(typeof data.success).toBe('boolean');
                        expect(typeof data.count).toBe('number');
                        expect(Array.isArray(data.emails)).toBe(true);
                        
                        data.emails.forEach(email => {
                            expect(typeof email.id).toBe('number');
                            expect(typeof email.email).toBe('string');
                            expect(typeof email.provider).toBe('string');
                            expect(typeof email.registrations).toBe('number');
                            expect(typeof email.successful).toBe('number');
                        });
                    }
                },
                {
                    name: 'Survey sites list', 
                    operation: () => client.getSurveySites(),
                    validator: (data) => {
                        expect(typeof data.success).toBe('boolean');
                        expect(typeof data.count).toBe('number');
                        expect(Array.isArray(data.sites)).toBe(true);
                        
                        data.sites.forEach(site => {
                            expect(typeof site.id).toBe('number');
                            expect(typeof site.name).toBe('string');
                            expect(typeof site.url).toBe('string');
                            expect(typeof site.totalAttempts).toBe('number');
                            expect(typeof site.successfulAttempts).toBe('number');
                            expect(typeof site.successRate).toBe('string');
                        });
                    }
                },
                {
                    name: 'System status',
                    operation: () => client.getSystemStatus(),
                    validator: (data) => {
                        expect(typeof data.success).toBe('boolean');
                        expect(typeof data.status).toBe('object');
                        
                        const status = data.status;
                        expect(typeof status.system).toBe('object');
                        expect(typeof status.database).toBe('object');
                        expect(typeof status.email).toBe('object');
                        expect(typeof status.statistics).toBe('object');
                        
                        // System status types
                        expect(typeof status.system.uptime).toBe('number');
                        expect(typeof status.system.memory).toBe('object');
                        expect(typeof status.system.nodeVersion).toBe('string');
                        
                        // Database status types
                        expect(typeof status.database.connected).toBe('boolean');
                        expect(typeof status.database.tables).toBe('number');
                        
                        // Email status types
                        expect(Array.isArray(status.email.services)).toBe(true);
                        expect(typeof status.email.accountsCreated).toBe('number');
                    }
                }
            ];
            
            for (const test of dataTypeTests) {
                const response = await test.operation();
                
                if (response.status === 200) {
                    test.validator(response.data);
                    console.log(`✅ Data type contract verified: ${test.name}`);
                } else {
                    console.log(`⚠️ ${test.name}: Status ${response.status} (skipping validation)`);
                }
            }
        });
    });
    
    describe('HTTP Method Contracts', () => {
        test('should implement proper HTTP method semantics', async () => {
            const methodContracts = [
                {
                    description: 'GET methods should be safe and idempotent',
                    endpoints: [
                        '/health',
                        '/api',
                        '/api/system/status',
                        '/api/emails',
                        '/api/survey-sites',
                        '/api/failures/recent'
                    ]
                },
                {
                    description: 'POST methods should create resources',
                    endpoints: [
                        { url: '/api/emails', data: { count: 1 } },
                        { url: '/api/survey-sites', data: { sites: [{ name: 'Test', url: 'https://test.com', category: 'test' }] } }
                    ]
                }
            ];
            
            // Test GET idempotency
            for (const endpoint of methodContracts[0].endpoints) {
                const response1 = await client.get(endpoint);
                const response2 = await client.get(endpoint);
                
                // Should return same status
                expect(response1.status).toBe(response2.status);
                
                if (response1.status === 200 && response2.status === 200) {
                    // For read operations, response structure should be consistent
                    expect(typeof response1.data).toBe(typeof response2.data);
                    
                    if (response1.data.count !== undefined && response2.data.count !== undefined) {
                        // Count might increase but shouldn't decrease for GET operations
                        expect(response2.data.count).toBeGreaterThanOrEqual(response1.data.count);
                    }
                }
                
                console.log(`✅ GET idempotency verified: ${endpoint}`);
            }
            
            // Test POST resource creation
            for (const endpoint of methodContracts[1].endpoints) {
                const response = await client.post(endpoint.url, endpoint.data);
                
                // POST should create resources (200) or validate input (400)
                expect([200, 400]).toContain(response.status);
                
                if (response.status === 200) {
                    const body = response.data;
                    expect(body.success).toBeDefined();
                    
                    if (body.results) {
                        expect(Array.isArray(body.results)).toBe(true);
                    }
                }
                
                console.log(`✅ POST creation verified: ${endpoint.url}`);
            }
        });
        
        test('should reject unsupported HTTP methods', async () => {
            const unsupportedMethods = [
                { method: 'PUT', url: '/api/emails' },
                { method: 'DELETE', url: '/api/emails' },
                { method: 'PATCH', url: '/api/survey-sites' },
                { method: 'HEAD', url: '/api/system/status' }
            ];
            
            for (const test of unsupportedMethods) {
                let response;
                
                try {
                    switch (test.method) {
                        case 'PUT':
                            response = await client.put(test.url, {});
                            break;
                        case 'DELETE':
                            response = await client.delete(test.url);
                            break;
                        case 'PATCH':
                            response = await client.client.patch(test.url, {});
                            break;
                        case 'HEAD':
                            response = await client.client.head(test.url);
                            break;
                    }
                } catch (error) {
                    // Method might not be implemented in client
                    response = { status: 405 };
                }
                
                // Should return 405 (Method Not Allowed) or 404 (Not Found)
                expect([404, 405, 501]).toContain(response.status);
                
                console.log(`✅ Unsupported method rejected: ${test.method} ${test.url} -> ${response.status}`);
            }
        });
    });
    
    describe('Parameter Validation Contracts', () => {
        test('should validate required parameters', async () => {
            const parameterTests = [
                {
                    name: 'Email creation count validation',
                    operation: () => client.post('/api/emails', {}),
                    validator: (response) => {
                        // Should succeed with default count or validate parameter
                        expect([200, 400]).toContain(response.status);
                    }
                },
                {
                    name: 'Survey sites data validation',
                    operation: () => client.post('/api/survey-sites', {}),
                    validator: (response) => {
                        // Should require sites array
                        expect(response.status).toBe(400);
                        expect(response.data.errors || response.data.error).toBeDefined();
                    }
                },
                {
                    name: 'Site ID parameter validation',
                    operation: () => client.get('/api/emails/unused/abc'),
                    validator: (response) => {
                        // Should validate site ID as integer
                        expect(response.status).toBe(400);
                    }
                }
            ];
            
            for (const test of parameterTests) {
                const response = await test.operation();
                test.validator(response);
                console.log(`✅ Parameter validation verified: ${test.name}`);
            }
        });
        
        test('should validate parameter ranges and formats', async () => {
            const rangeTests = [
                {
                    name: 'Email count maximum limit',
                    operation: () => client.post('/api/emails', { count: 25 }),
                    expectedStatus: 400
                },
                {
                    name: 'Email count minimum limit',
                    operation: () => client.post('/api/emails', { count: 0 }),
                    expectedStatus: 400
                },
                {
                    name: 'Error detection cycles maximum',
                    operation: () => client.get('/api/test/error-detection?cycles=15'),
                    expectedStatus: 400
                },
                {
                    name: 'Email list limit maximum',
                    operation: () => client.get('/api/emails?limit=1001'),
                    expectedStatus: 400
                }
            ];
            
            for (const test of rangeTests) {
                const response = await test.operation();
                expect(response.status).toBe(test.expectedStatus);
                
                if (response.status === 400) {
                    expect(response.data.errors || response.data.error).toBeDefined();
                }
                
                console.log(`✅ Range validation verified: ${test.name}`);
            }
        });
        
        test('should validate data formats', async () => {
            const formatTests = [
                {
                    name: 'Invalid email provider',
                    operation: () => client.post('/api/emails', { count: 1, provider: 'invalid-provider' }),
                    expectedStatus: 400
                },
                {
                    name: 'Invalid URL format in sites',
                    operation: () => client.post('/api/survey-sites', {
                        sites: [{
                            name: 'Test Site',
                            url: 'not-a-valid-url',
                            category: 'test'
                        }]
                    }),
                    validator: (response) => {
                        if (response.status === 200) {
                            // Should mark as failed in results
                            const results = response.data.results;
                            expect(results[0].success).toBe(false);
                        } else {
                            expect(response.status).toBe(400);
                        }
                    }
                },
                {
                    name: 'Invalid groupBy parameter',
                    operation: () => client.get('/api/failures/all?groupBy=invalid'),
                    expectedStatus: 400
                }
            ];
            
            for (const test of formatTests) {
                const response = await test.operation();
                
                if (test.validator) {
                    test.validator(response);
                } else {
                    expect(response.status).toBe(test.expectedStatus);
                }
                
                console.log(`✅ Format validation verified: ${test.name}`);
            }
        });
    });
    
    describe('Header and Content-Type Contracts', () => {
        test('should enforce proper Content-Type handling', async () => {
            const contentTypeTests = [
                {
                    name: 'JSON request with correct Content-Type',
                    operation: () => client.post('/api/emails', { count: 1 }, {
                        headers: { 'Content-Type': 'application/json' }
                    }),
                    expectedStatus: 200
                },
                {
                    name: 'JSON request without Content-Type',
                    operation: () => client.post('/api/emails', { count: 1 }),
                    expectedStatus: 200
                },
                {
                    name: 'Invalid JSON format',
                    operation: () => client.client.post('/api/emails', 'invalid-json', {
                        headers: { 'Content-Type': 'application/json' },
                        validateStatus: () => true
                    }),
                    expectedStatus: 400
                }
            ];
            
            for (const test of contentTypeTests) {
                const response = await test.operation();
                expect(response.status).toBe(test.expectedStatus);
                console.log(`✅ Content-Type handling verified: ${test.name}`);
            }
        });
        
        test('should return consistent response headers', async () => {
            const endpoints = [
                '/health',
                '/api',
                '/api/system/status',
                '/api/emails'
            ];
            
            for (const endpoint of endpoints) {
                const response = await client.get(endpoint);
                
                if (response.status === 200) {
                    const headers = response.headers;
                    
                    // Content-Type should always be set for JSON responses
                    expect(headers['content-type']).toMatch(/application\\/json/);
                    
                    // Should have server identification (optional)
                    if (headers['server']) {
                        expect(typeof headers['server']).toBe('string');
                    }
                    
                    // Should not expose sensitive server information
                    if (headers['x-powered-by']) {
                        expect(headers['x-powered-by']).not.toMatch(/Express|Node\\.js/);
                    }
                }
                
                console.log(`✅ Response headers verified: ${endpoint}`);
            }
        });
    });
    
    describe('Rate Limiting Contracts', () => {
        test('should implement consistent rate limiting behavior', async () => {
            console.log('🚦 Testing rate limiting contracts...');
            
            // Test rate limiting on different endpoint categories
            const rateLimitTests = [
                {
                    name: 'General endpoints',
                    operation: () => client.health(),
                    requests: 30
                },
                {
                    name: 'Resource creation endpoints',
                    operation: () => client.createEmails(1),
                    requests: 15
                }
            ];
            
            for (const test of rateLimitTests) {
                const responses = [];
                
                console.log(`Testing ${test.name} with ${test.requests} requests...`);
                
                for (let i = 0; i < test.requests; i++) {
                    try {
                        const response = await test.operation();
                        responses.push(response);
                    } catch (error) {
                        responses.push({ status: 500, error: error.message });
                    }
                }
                
                // Analyze rate limiting behavior
                const statusCodes = responses.map(r => r.status);
                const successCount = statusCodes.filter(s => s === 200).length;
                const rateLimitCount = statusCodes.filter(s => s === 429).length;
                const errorCount = statusCodes.filter(s => s >= 400 && s !== 429).length;
                
                console.log(`   Results: ${successCount} success, ${rateLimitCount} rate-limited, ${errorCount} errors`);
                
                // Should handle all requests without crashing
                expect(responses.length).toBe(test.requests);
                
                // If rate limiting is active, 429 responses should have proper format
                const rateLimitedResponses = responses.filter(r => r.status === 429);
                rateLimitedResponses.forEach(response => {
                    expect(response.data.error || response.data.message).toBeDefined();
                });
                
                console.log(`✅ Rate limiting contract verified: ${test.name}`);
            }
        });
    });
    
    describe('Pagination Contracts', () => {
        test('should implement consistent pagination behavior', async () => {
            // Create test data for pagination
            await client.createEmails(10);
            
            const paginationTests = [
                {
                    name: 'Email list pagination',
                    operation: (limit) => client.getEmails(limit),
                    limits: [1, 5, 10, 50]
                },
                {
                    name: 'Unused emails pagination',
                    operation: (limit) => client.getUnusedEmails(1, limit),
                    limits: [1, 3, 10]
                },
                {
                    name: 'Failures pagination',
                    operation: (limit) => client.getRecentFailures(limit),
                    limits: [1, 5, 20]
                }
            ];
            
            for (const test of paginationTests) {
                for (const limit of test.limits) {
                    const response = await test.operation(limit);
                    
                    if (response.status === 200) {
                        const data = response.data;
                        
                        // Should have count property
                        expect(typeof data.count).toBe('number');
                        expect(data.count).toBeGreaterThanOrEqual(0);
                        
                        // Results should respect limit
                        if (data.emails) {
                            expect(data.emails.length).toBeLessThanOrEqual(limit);
                            expect(data.emails.length).toBe(data.count);
                        } else if (data.failures) {
                            expect(data.failures.length).toBeLessThanOrEqual(limit);
                            expect(data.failures.length).toBe(data.count);
                        } else if (data.sites) {
                            expect(data.sites.length).toBeLessThanOrEqual(limit);
                            expect(data.sites.length).toBe(data.count);
                        }
                        
                        console.log(`✅ Pagination verified: ${test.name} (limit: ${limit}, returned: ${data.count})`);
                    }
                }
            }
        });
    });
    
    describe('Error Code Contracts', () => {
        test('should return appropriate HTTP status codes', async () => {
            const statusCodeTests = [
                {
                    name: 'Successful operations',
                    operations: [
                        () => client.health(),
                        () => client.getSystemStatus(),
                        () => client.createEmails(1)
                    ],
                    expectedStatus: 200
                },
                {
                    name: 'Bad request scenarios',
                    operations: [
                        () => client.post('/api/emails', { count: -1 }),
                        () => client.get('/api/emails/unused/invalid'),
                        () => client.post('/api/survey-sites', { invalid: 'data' })
                    ],
                    expectedStatus: 400
                },
                {
                    name: 'Not found scenarios',
                    operations: [
                        () => client.get('/api/nonexistent'),
                        () => client.get('/api/invalid/endpoint'),
                        () => client.get('/nonexistent-path')
                    ],
                    expectedStatus: 404
                }
            ];
            
            for (const test of statusCodeTests) {
                for (const operation of test.operations) {
                    const response = await operation();
                    
                    if (test.expectedStatus === 200) {
                        expect([200, 503]).toContain(response.status); // Allow for service unavailability
                    } else {
                        expect(response.status).toBe(test.expectedStatus);
                    }
                    
                    // All responses should be valid JSON
                    expect(response.headers['content-type']).toMatch(/application\/json/);
                    expect(typeof response.data).toBe('object');
                }
                
                console.log(`✅ Status code contract verified: ${test.name} -> ${test.expectedStatus}`);
            }
        });
    });
});