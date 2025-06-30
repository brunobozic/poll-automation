/**
 * Jest Test Setup and Configuration
 * 
 * Global test configuration and helper functions for the comprehensive test suite
 */

const path = require('path');
const fs = require('fs');

// Increase default timeout for integration tests
jest.setTimeout(30000);

// Global test configuration
global.testConfig = {
    apiBaseUrl: process.env.TEST_API_URL || 'http://localhost:3000',
    testTimeout: 30000,
    maxRetries: 3,
    testDatabase: path.join(__dirname, '..', 'test-poll-automation.db'),
    screenshotDir: path.join(__dirname, 'screenshots'),
    logsDir: path.join(__dirname, 'logs')
};

// Create test directories if they don't exist
const testDirs = [
    global.testConfig.screenshotDir,
    global.testConfig.logsDir,
    path.join(__dirname, 'reports'),
    path.join(__dirname, 'fixtures')
];

testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Global test utilities
global.testUtils = {
    // Wait helper for async operations
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Generate random test data
    generateRandomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`,
    generateRandomString: (length = 10) => Math.random().toString(36).substr(2, length),
    
    // Test data validation
    isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // Clean test database
    cleanTestDatabase: () => {
        if (fs.existsSync(global.testConfig.testDatabase)) {
            fs.unlinkSync(global.testConfig.testDatabase);
        }
    },
    
    // Create test fixtures
    createTestSite: (overrides = {}) => ({
        name: 'Test Survey Site',
        url: 'https://test-survey.example.com',
        category: 'test',
        difficulty: 3,
        ...overrides
    }),
    
    createTestEmail: (overrides = {}) => ({
        email: global.testUtils.generateRandomEmail(),
        provider: 'test',
        password: 'test-password',
        ...overrides
    }),
    
    // Response validation helpers
    validateApiResponse: (response, expectedStatus = 200) => {
        expect(response.status).toBe(expectedStatus);
        expect(response.headers['content-type']).toMatch(/json/);
        if (expectedStatus >= 200 && expectedStatus < 300) {
            expect(response.body).toHaveProperty('success');
        }
        return response.body;
    },
    
    validateEmailResponse: (email) => {
        expect(email).toHaveProperty('id');
        expect(email).toHaveProperty('email');
        expect(email).toHaveProperty('provider');
        expect(global.testUtils.isValidEmail(email.email)).toBe(true);
    },
    
    validateSiteResponse: (site) => {
        expect(site).toHaveProperty('id');
        expect(site).toHaveProperty('name');
        expect(site).toHaveProperty('url');
        expect(global.testUtils.isValidUrl(site.url)).toBe(true);
    },
    
    validateFailureResponse: (failure) => {
        expect(failure).toHaveProperty('id');
        expect(failure).toHaveProperty('email');
        expect(failure).toHaveProperty('site');
        expect(failure).toHaveProperty('attemptDate');
        expect(failure).toHaveProperty('error');
    }
};

// Performance monitoring
global.performance = {
    startTime: null,
    endTime: null,
    
    start: () => {
        global.performance.startTime = process.hrtime.bigint();
    },
    
    end: () => {
        global.performance.endTime = process.hrtime.bigint();
        return Number(global.performance.endTime - global.performance.startTime) / 1000000; // Convert to milliseconds
    },
    
    measure: (fn) => {
        global.performance.start();
        const result = fn();
        const duration = global.performance.end();
        return { result, duration };
    }
};

// Console capture for testing logging
global.mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    
    clear: () => {
        global.mockConsole.log.mockClear();
        global.mockConsole.error.mockClear();
        global.mockConsole.warn.mockClear();
        global.mockConsole.info.mockClear();
    }
};

// Setup and teardown hooks
beforeAll(() => {
    console.log('🚀 Starting comprehensive API test suite...');
    console.log(`📍 API Base URL: ${global.testConfig.apiBaseUrl}`);
    console.log(`🗄️ Test Database: ${global.testConfig.testDatabase}`);
});

afterAll(() => {
    console.log('✅ Test suite completed');
    
    // Clean up test database if it exists
    try {
        global.testUtils.cleanTestDatabase();
        console.log('🧹 Test database cleaned up');
    } catch (error) {
        console.warn('⚠️ Could not clean test database:', error.message);
    }
});

beforeEach(() => {
    // Clear mock console before each test
    global.mockConsole.clear();
    
    // Reset performance timing
    global.performance.startTime = null;
    global.performance.endTime = null;
});

// Error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for use in tests
module.exports = {
    testConfig: global.testConfig,
    testUtils: global.testUtils,
    performance: global.performance,
    mockConsole: global.mockConsole
};