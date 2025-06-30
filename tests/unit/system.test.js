/**
 * System Status and Management Endpoint Unit Tests
 * 
 * Tests for system status, database stats, and LLM testing endpoints
 */

const { startTestServer, stopTestServer } = require('../helpers/test-server');
const APIClient = require('../helpers/api-client');

describe('System Management Endpoints', () => {
    let server;
    let client;
    
    beforeAll(async () => {
        server = await startTestServer();
        client = server.getClient();
    });
    
    afterAll(async () => {
        await stopTestServer();
    });
    
    describe('GET /api', () => {
        test('should return API information and endpoint listing', async () => {
            const response = await client.getApiInfo();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body).toHaveProperty('name');
            expect(body).toHaveProperty('version');
            expect(body).toHaveProperty('description');
            expect(body).toHaveProperty('documentation');
            expect(body).toHaveProperty('endpoints');
            
            expect(body.name).toBe('Poll Automation API');
            expect(typeof body.version).toBe('string');
            expect(typeof body.description).toBe('string');
            expect(body.documentation).toMatch(/api-docs/);
            
            // Check endpoint categories
            const endpoints = body.endpoints;
            expect(endpoints).toHaveProperty('system');
            expect(endpoints).toHaveProperty('emails');
            expect(endpoints).toHaveProperty('sites');
            expect(endpoints).toHaveProperty('failures');
            
            // Each category should have endpoint descriptions
            Object.values(endpoints).forEach(category => {
                expect(typeof category).toBe('object');
                Object.values(category).forEach(description => {
                    expect(typeof description).toBe('string');
                    expect(description.length).toBeGreaterThan(0);
                });
            });
        });
        
        test('should include documentation URL', async () => {
            const response = await client.getApiInfo();
            const body = response.data;
            
            expect(body.documentation).toBeDefined();
            expect(global.testUtils.isValidUrl(body.documentation)).toBe(true);
        });
    });
    
    describe('GET /api/system/status', () => {
        test('should return comprehensive system status', async () => {
            const response = await client.getSystemStatus();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body).toHaveProperty('status');
            expect(body.status).toHaveProperty('system');
            expect(body.status).toHaveProperty('database');
            expect(body.status).toHaveProperty('email');
            expect(body.status).toHaveProperty('statistics');
            
            // System status validation
            const systemStatus = body.status.system;
            expect(systemStatus).toHaveProperty('uptime');
            expect(systemStatus).toHaveProperty('memory');
            expect(systemStatus).toHaveProperty('nodeVersion');
            expect(systemStatus).toHaveProperty('platform');
            expect(systemStatus).toHaveProperty('timestamp');
            
            expect(typeof systemStatus.uptime).toBe('number');
            expect(systemStatus.uptime).toBeGreaterThan(0);
            expect(typeof systemStatus.memory).toBe('object');
            expect(typeof systemStatus.nodeVersion).toBe('string');
            expect(typeof systemStatus.platform).toBe('string');
        });
        
        test('should return database connectivity status', async () => {
            const response = await client.getSystemStatus();
            const body = response.data;
            
            const dbStatus = body.status.database;
            expect(dbStatus).toHaveProperty('connected');
            expect(dbStatus).toHaveProperty('tables');
            expect(dbStatus).toHaveProperty('totalRecords');
            
            expect(typeof dbStatus.connected).toBe('boolean');
            expect(typeof dbStatus.tables).toBe('number');
            expect(typeof dbStatus.totalRecords).toBe('number');
        });
        
        test('should return email service status', async () => {
            const response = await client.getSystemStatus();
            const body = response.data;
            
            const emailStatus = body.status.email;
            expect(emailStatus).toHaveProperty('services');
            expect(emailStatus).toHaveProperty('accountsCreated');
            expect(emailStatus).toHaveProperty('successfulRegistrations');
            
            expect(Array.isArray(emailStatus.services)).toBe(true);
            expect(emailStatus.services.length).toBeGreaterThan(0);
            expect(typeof emailStatus.accountsCreated).toBe('number');
            expect(typeof emailStatus.successfulRegistrations).toBe('number');
        });
        
        test('should return statistics summary', async () => {
            const response = await client.getSystemStatus();
            const body = response.data;
            
            const stats = body.status.statistics;
            expect(stats).toHaveProperty('totalRegistrationAttempts');
            expect(stats).toHaveProperty('successRate');
            expect(stats).toHaveProperty('failureCategories');
            
            expect(typeof stats.totalRegistrationAttempts).toBe('number');
            expect(typeof stats.successRate).toBe('string');
            expect(stats.successRate).toMatch(/\\d+(\\.\\d+)?%/);
            expect(typeof stats.failureCategories).toBe('object');
        });
        
        test('should include request tracking', async () => {
            const response = await client.getSystemStatus();
            const body = response.data;
            
            expect(body).toHaveProperty('requestId');
            expect(typeof body.requestId).toBe('string');
            expect(body.requestId.length).toBeGreaterThan(0);
        });
        
        test('should respond within reasonable time', async () => {
            const startTime = Date.now();
            const response = await client.getSystemStatus();
            const endTime = Date.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
            expect(response.status).toBe(200);
        });
    });
    
    describe('GET /api/database/stats', () => {
        test('should return database statistics', async () => {
            const response = await client.getDatabaseStats();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body).toHaveProperty('stats');
            const stats = body.stats;
            
            expect(stats).toHaveProperty('connection');
            expect(stats).toHaveProperty('tables');
            expect(stats).toHaveProperty('performance');
            expect(stats).toHaveProperty('storage');
            
            // Connection info
            expect(stats.connection).toHaveProperty('status');
            expect(stats.connection).toHaveProperty('type');
            expect(stats.connection.status).toBe('connected');
            expect(stats.connection.type).toBe('SQLite');
            
            // Tables info
            expect(typeof stats.tables).toBe('object');
            
            // Performance info
            expect(stats.performance).toHaveProperty('totalQueries');
            expect(stats.performance).toHaveProperty('averageQueryTime');
            
            // Storage info
            expect(stats.storage).toHaveProperty('totalSize');
            expect(stats.storage).toHaveProperty('pageSize');
            expect(stats.storage).toHaveProperty('pageCount');
        });
        
        test('should include table statistics', async () => {
            const response = await client.getDatabaseStats();
            const body = response.data;
            
            const tables = body.stats.tables;
            
            // Check if we have any tables
            const tableNames = Object.keys(tables);
            expect(tableNames.length).toBeGreaterThanOrEqual(0);
            
            // Each table should have statistics
            tableNames.forEach(tableName => {
                const tableStats = tables[tableName];
                if (!tableStats.error) {
                    expect(tableStats).toHaveProperty('rows');
                    expect(typeof tableStats.rows).toBe('number');
                    expect(tableStats.rows).toBeGreaterThanOrEqual(0);
                }
            });
        });
        
        test('should handle database connection issues gracefully', async () => {
            // This test assumes the database might not be available
            const response = await client.getDatabaseStats();
            
            // Should return 200 (connected) or 503 (not connected)
            expect([200, 503]).toContain(response.status);
            
            if (response.status === 503) {
                expect(response.data.success).toBe(false);
                expect(response.data.error).toContain('Database not connected');
            }
        });
        
        test('should return consistent data structure', async () => {
            const responses = await Promise.all([
                client.getDatabaseStats(),
                client.getDatabaseStats(),
                client.getDatabaseStats()
            ]);
            
            responses.forEach(response => {
                if (response.status === 200) {
                    const body = response.data;
                    expect(body).toHaveProperty('stats');
                    expect(body.stats).toHaveProperty('connection');
                    expect(body.stats).toHaveProperty('tables');
                    expect(body.stats).toHaveProperty('performance');
                    expect(body.stats).toHaveProperty('storage');
                }
            });
        });
    });
    
    describe('GET /api/llm/test', () => {
        test('should return LLM service status', async () => {
            const response = await client.testLLM();
            
            // Should return 200 (operational) or 503 (not available)
            expect([200, 503]).toContain(response.status);
            
            const body = response.data;
            expect(body).toHaveProperty('success');
            expect(body).toHaveProperty('service');
            
            const service = body.service;
            expect(service).toHaveProperty('service');
            expect(service).toHaveProperty('status');
            expect(service).toHaveProperty('lastTest');
            expect(service).toHaveProperty('capabilities');
            expect(service).toHaveProperty('configuration');
            
            expect(service.service).toBe('LLM/AI Service');
            expect(['operational', 'available', 'error', 'unknown']).toContain(service.status);
            expect(Array.isArray(service.capabilities)).toBe(true);
        });
        
        test('should return configuration information', async () => {
            const response = await client.testLLM();
            const body = response.data;
            
            const config = body.service.configuration;
            expect(config).toHaveProperty('provider');
            expect(config).toHaveProperty('model');
            expect(config).toHaveProperty('apiKey');
            
            expect(typeof config.provider).toBe('string');
            expect(typeof config.model).toBe('string');
            expect(['configured', 'missing']).toContain(config.apiKey);
        });
        
        test('should include test prompt information when operational', async () => {
            const response = await client.testLLM();
            const body = response.data;
            
            if (body.service.status === 'operational') {
                expect(body.service).toHaveProperty('testPrompt');
                const testPrompt = body.service.testPrompt;
                expect(testPrompt).toHaveProperty('input');
                expect(testPrompt).toHaveProperty('expected');
                expect(testPrompt).toHaveProperty('status');
            }
        });
        
        test('should handle LLM service unavailability gracefully', async () => {
            const response = await client.testLLM();
            
            if (response.status === 503) {
                const body = response.data;
                expect(body.success).toBe(false);
                expect(body.service.status).toMatch(/error|unknown/);
            }
        });
    });
    
    describe('GET /api/test/error-detection', () => {
        test('should run error detection cycles with default parameters', async () => {
            const response = await client.runErrorDetection();
            
            expect(response.status).toBe(200);
            const body = global.testUtils.validateApiResponse(response);
            
            expect(body).toHaveProperty('results');
            const results = body.results;
            
            expect(results).toHaveProperty('totalCycles', 3);
            expect(results).toHaveProperty('startTime');
            expect(results).toHaveProperty('endTime');
            expect(results).toHaveProperty('cycles');
            expect(results).toHaveProperty('summary');
            
            // Validate cycles
            expect(Array.isArray(results.cycles)).toBe(true);
            expect(results.cycles.length).toBe(3);
            
            results.cycles.forEach((cycle, index) => {
                expect(cycle).toHaveProperty('cycleNumber', index + 1);
                expect(cycle).toHaveProperty('timestamp');
                expect(cycle).toHaveProperty('duration');
                expect(cycle).toHaveProperty('checks');
                expect(cycle).toHaveProperty('status');
                
                expect(Array.isArray(cycle.checks)).toBe(true);
                expect(cycle.checks.length).toBeGreaterThan(0);
                
                cycle.checks.forEach(check => {
                    expect(check).toHaveProperty('name');
                    expect(check).toHaveProperty('status');
                    expect(check).toHaveProperty('message');
                    expect(check).toHaveProperty('severity');
                    expect(['pass', 'fail', 'warning']).toContain(check.status);
                    expect(['info', 'warning', 'error']).toContain(check.severity);
                });
            });
            
            // Validate summary
            const summary = results.summary;
            expect(summary).toHaveProperty('errorsFound');
            expect(summary).toHaveProperty('warningsFound');
            expect(summary).toHaveProperty('totalIssues');
            expect(typeof summary.errorsFound).toBe('number');
            expect(typeof summary.warningsFound).toBe('number');
            expect(summary.totalIssues).toBe(summary.errorsFound + summary.warningsFound);
        });
        
        test('should respect custom cycle count', async () => {
            const cycles = 5;
            const response = await client.runErrorDetection(cycles);
            
            expect(response.status).toBe(200);
            const body = response.data;
            
            expect(body.results.totalCycles).toBe(cycles);
            expect(body.results.cycles.length).toBe(cycles);
        });
        
        test('should validate cycle count parameter', async () => {
            // Test invalid cycle count (too high)
            const invalidResponse = await client.get('/api/test/error-detection?cycles=15');
            expect(invalidResponse.status).toBe(400);
            
            // Test invalid cycle count (zero)
            const zeroResponse = await client.get('/api/test/error-detection?cycles=0');
            expect(zeroResponse.status).toBe(400);
            
            // Test negative cycle count
            const negativeResponse = await client.get('/api/test/error-detection?cycles=-1');
            expect(negativeResponse.status).toBe(400);
        });
        
        test('should include standard system checks', async () => {
            const response = await client.runErrorDetection(1);
            const body = response.data;
            
            const checks = body.results.cycles[0].checks;
            const checkNames = checks.map(c => c.name);
            
            expect(checkNames).toContain('database_connectivity');
            expect(checkNames).toContain('email_manager');
            expect(checkNames).toContain('ai_services');
            expect(checkNames).toContain('memory_usage');
        });
        
        test('should complete within reasonable time', async () => {
            const startTime = Date.now();
            const response = await client.runErrorDetection(3);
            const endTime = Date.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(5000); // 5 seconds max for 3 cycles
            expect(response.status).toBe(200);
            
            const totalDuration = response.data.results.totalDuration;
            expect(totalDuration).toBeLessThan(responseTime);
        });
        
        test('should track timing accurately', async () => {
            const response = await client.runErrorDetection(2);
            const body = response.data;
            
            expect(body.results).toHaveProperty('totalDuration');
            expect(typeof body.results.totalDuration).toBe('number');
            expect(body.results.totalDuration).toBeGreaterThan(0);
            
            // Sum of individual cycle durations should match total
            const cycleDurationSum = body.results.cycles.reduce((sum, cycle) => sum + cycle.duration, 0);
            expect(Math.abs(cycleDurationSum - body.results.totalDuration)).toBeLessThan(100); // 100ms tolerance
        });
    });
    
    describe('System endpoint error handling', () => {
        test('should handle invalid endpoints gracefully', async () => {
            const response = await client.get('/api/system/invalid');
            expect(response.status).toBe(404);
        });
        
        test('should handle malformed query parameters', async () => {
            const response = await client.get('/api/test/error-detection?cycles=invalid');
            expect(response.status).toBe(400);
            
            const body = response.data;
            expect(body.success).toBe(false);
            expect(body).toHaveProperty('errors');
        });
        
        test('should maintain stability under concurrent requests', async () => {
            const requests = [
                client.getSystemStatus(),
                client.getDatabaseStats(),
                client.testLLM(),
                client.runErrorDetection(1),
                client.getApiInfo()
            ];
            
            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect([200, 503]).toContain(response.status); // All should respond without crashes
            });
        });
    });
});