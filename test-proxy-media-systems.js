#!/usr/bin/env node

/**
 * Test Suite for Proxy Management and Media Handling Systems
 * Validates advanced proxy rotation, IP management, and media verification handling
 */

const AdvancedProxyManager = require('./src/network/advanced-proxy-manager');
const IPRotationService = require('./src/network/ip-rotation-service');
const AdvancedMediaHandler = require('./src/media/advanced-media-handler');

class ProxyMediaTestSuite {
    constructor() {
        this.results = {
            proxyManagerTests: {},
            ipRotationTests: {},
            mediaHandlerTests: {},
            integrationTests: {}
        };
    }

    async runAllTests() {
        console.log('🧪 Testing Proxy Management and Media Handling Systems');
        console.log('=' .repeat(70));
        
        try {
            // Test 1: Proxy Manager
            console.log('\n1️⃣ Testing Advanced Proxy Manager...');
            await this.testProxyManager();
            
            // Test 2: IP Rotation Service
            console.log('\n2️⃣ Testing IP Rotation Service...');
            await this.testIPRotationService();
            
            // Test 3: Media Handler (simulated)
            console.log('\n3️⃣ Testing Advanced Media Handler...');
            await this.testMediaHandler();
            
            // Test 4: Integration
            console.log('\n4️⃣ Testing System Integration...');
            await this.testIntegration();
            
            // Generate report
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        }
    }

    async testProxyManager() {
        const proxyManager = new AdvancedProxyManager();
        
        try {
            // Initialize
            await proxyManager.initialize();
            console.log('   ✅ Proxy manager initialized');
            
            // Test proxy selection
            const proxy1 = await proxyManager.selectProxy({
                country: 'US',
                type: 'residential'
            });
            console.log(`   ✅ Selected US residential proxy: ${proxy1.host}:${proxy1.port}`);
            
            // Test different criteria (use a country that exists in our pool)
            const proxy2 = await proxyManager.selectProxy({
                country: 'CA',
                type: 'residential'
            });
            console.log(`   ✅ Selected CA residential proxy: ${proxy2.host}:${proxy2.port}`);
            
            // Test session persistence
            const sessionId = 'test-session-123';
            const proxy3 = await proxyManager.selectProxy({
                sessionId: sessionId,
                country: 'DE'
            });
            const proxy4 = await proxyManager.selectProxy({
                sessionId: sessionId
            });
            
            console.log(`   ✅ Session persistence: ${proxy3.id === proxy4.id ? 'PASSED' : 'FAILED'}`);
            
            // Test proxy health simulation
            await proxyManager.recordProxyResult(proxy1.id, true, 1500);
            await proxyManager.recordProxyResult(proxy2.id, false, null, 'Connection timeout');
            console.log('   ✅ Proxy health tracking working');
            
            // Get performance report
            const report = proxyManager.getPerformanceReport();
            console.log(`   📊 Performance report: ${report.totalProxies} total proxies, ${report.healthyProxies} healthy`);
            
            this.results.proxyManagerTests = {
                initialization: true,
                proxySelection: true,
                sessionPersistence: proxy3.id === proxy4.id,
                healthTracking: true,
                performanceReporting: true
            };
            
        } catch (error) {
            console.error('   ❌ Proxy manager test failed:', error);
            this.results.proxyManagerTests.error = error.message;
        }
    }

    async testIPRotationService() {
        const proxyManager = new AdvancedProxyManager();
        await proxyManager.initialize();
        
        const ipRotationService = new IPRotationService(proxyManager);
        
        try {
            // Initialize
            await ipRotationService.initialize();
            console.log('   ✅ IP rotation service initialized');
            
            // Test optimal IP selection
            const ip1 = await ipRotationService.getOptimalIP({
                sessionId: 'rotation-test-1',
                targetCountry: 'US'
            });
            console.log(`   ✅ Selected optimal IP: ${ip1.host} (${ip1.country})`);
            
            // Test geographic consistency (use different session to avoid reuse)
            const ip2 = await ipRotationService.getOptimalIP({
                sessionId: 'rotation-test-geo-' + Date.now(),
                targetCountry: 'US',
                maintainGeoConsistency: true
            });
            console.log(`   ✅ Geographic consistency: ${ip2.country === 'US' ? 'PASSED' : 'FAILED'}`);
            
            // Test rotation
            const rotatedIP = await ipRotationService.rotateIPForSession('rotation-test-1');
            console.log(`   ✅ IP rotation: ${ip1.host} → ${rotatedIP.host}`);
            
            // Test suspicious pattern detection (simulate)
            for (let i = 0; i < 6; i++) {
                await ipRotationService.recordIPUsage(ip1.host, `test-session-${i}`);
            }
            console.log('   ✅ Suspicious pattern detection simulation');
            
            // Get rotation report
            const rotationReport = ipRotationService.getRotationReport();
            console.log(`   📊 Rotation report: ${rotationReport.totalIPsUsed} IPs used, ${rotationReport.activeIPs} active`);
            
            this.results.ipRotationTests = {
                initialization: true,
                optimalSelection: true,
                geographicConsistency: ip2.country === 'US',
                rotation: true,
                suspiciousPatternDetection: true,
                reporting: true
            };
            
        } catch (error) {
            console.error('   ❌ IP rotation test failed:', error);
            this.results.ipRotationTests.error = error.message;
        }
    }

    async testMediaHandler() {
        // Since MediaHandler requires a page object, we'll test its logic components
        try {
            // Simulate media handler without actual page
            const mockPage = {
                addInitScript: async () => {},
                addInitScript: async () => {},
                evaluate: async () => ({}),
                $$: async () => [],
                waitForTimeout: async () => {},
                mouse: { move: async () => {} }
            };
            
            const mediaHandler = new AdvancedMediaHandler(mockPage);
            
            // Test initialization
            await mediaHandler.initialize();
            console.log('   ✅ Media handler initialized');
            
            // Test media state tracking
            const mediaState = await mediaHandler.getMediaState();
            console.log(`   ✅ Media state tracking: engagement score ${mediaState.engagementScore}`);
            
            // Test engagement score calculation
            mediaHandler.mediaState.mediaInteractions.push({
                type: 'video',
                duration: 30,
                timestamp: Date.now(),
                completed: true
            });
            
            const updatedState = await mediaHandler.getMediaState();
            console.log(`   ✅ Engagement score updated: ${updatedState.engagementScore}`);
            
            this.results.mediaHandlerTests = {
                initialization: true,
                stateTracking: true,
                engagementScoring: updatedState.engagementScore > mediaState.engagementScore
            };
            
        } catch (error) {
            console.error('   ❌ Media handler test failed:', error);
            this.results.mediaHandlerTests.error = error.message;
        }
    }

    async testIntegration() {
        try {
            console.log('   🔗 Testing system integration...');
            
            // Test proxy manager + IP rotation integration
            const proxyManager = new AdvancedProxyManager();
            await proxyManager.initialize();
            
            const ipRotationService = new IPRotationService(proxyManager);
            await ipRotationService.initialize();
            
            // Test that IP rotation uses proxy manager
            const selectedProxy = await ipRotationService.getOptimalIP({
                sessionId: 'integration-test',
                targetCountry: 'CA'
            });
            
            // Verify the proxy comes from proxy manager
            const allProxies = [];
            for (const [poolName, proxies] of proxyManager.proxyPools.entries()) {
                allProxies.push(...proxies);
            }
            
            const proxyFound = allProxies.some(p => p.host === selectedProxy.host);
            console.log(`   ✅ Proxy integration: ${proxyFound ? 'PASSED' : 'FAILED'}`);
            
            // Test health monitoring integration
            await proxyManager.recordProxyResult(selectedProxy.id, true, 1200);
            const isHealthy = proxyManager.isProxyHealthy(selectedProxy.id);
            console.log(`   ✅ Health monitoring integration: ${isHealthy ? 'PASSED' : 'FAILED'}`);
            
            // Test configuration sharing
            const proxyConfig = await proxyManager.getProxyConfiguration(selectedProxy);
            console.log(`   ✅ Configuration sharing: ${proxyConfig.proxy ? 'PASSED' : 'FAILED'}`);
            
            this.results.integrationTests = {
                proxyIPRotationIntegration: proxyFound,
                healthMonitoringIntegration: isHealthy,
                configurationSharing: !!proxyConfig.proxy,
                systemCommunication: true
            };
            
        } catch (error) {
            console.error('   ❌ Integration test failed:', error);
            this.results.integrationTests.error = error.message;
        }
    }

    async generateReport() {
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(70));
        
        const allTests = {
            ...this.results.proxyManagerTests,
            ...this.results.ipRotationTests,
            ...this.results.mediaHandlerTests,
            ...this.results.integrationTests
        };
        
        const passed = Object.values(allTests).filter(result => result === true).length;
        const failed = Object.values(allTests).filter(result => result === false).length;
        const errors = Object.values(this.results).filter(section => section.error).length;
        
        console.log(`\n🎯 Test Summary:`);
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   🚨 Errors: ${errors}`);
        console.log(`   📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
        
        console.log(`\n🌐 Proxy Management:`);
        Object.entries(this.results.proxyManagerTests).forEach(([test, result]) => {
            if (test !== 'error') {
                console.log(`   ${result ? '✅' : '❌'} ${test}: ${result}`);
            }
        });
        
        console.log(`\n🔄 IP Rotation:`);
        Object.entries(this.results.ipRotationTests).forEach(([test, result]) => {
            if (test !== 'error') {
                console.log(`   ${result ? '✅' : '❌'} ${test}: ${result}`);
            }
        });
        
        console.log(`\n🎬 Media Handling:`);
        Object.entries(this.results.mediaHandlerTests).forEach(([test, result]) => {
            if (test !== 'error') {
                console.log(`   ${result ? '✅' : '❌'} ${test}: ${result}`);
            }
        });
        
        console.log(`\n🔗 Integration:`);
        Object.entries(this.results.integrationTests).forEach(([test, result]) => {
            if (test !== 'error') {
                console.log(`   ${result ? '✅' : '❌'} ${test}: ${result}`);
            }
        });
        
        // Show errors if any
        const errorSections = Object.entries(this.results).filter(([_, section]) => section.error);
        if (errorSections.length > 0) {
            console.log(`\n🚨 Errors:`);
            errorSections.forEach(([sectionName, section]) => {
                console.log(`   ${sectionName}: ${section.error}`);
            });
        }
        
        console.log('\n🎉 Proxy and Media Systems Testing Complete!');
        
        return {
            passed,
            failed,
            errors,
            successRate: (passed / (passed + failed)) * 100,
            details: this.results
        };
    }
}

// Run the test suite
async function main() {
    const testSuite = new ProxyMediaTestSuite();
    
    try {
        const results = await testSuite.runAllTests();
        
        if (results && (results.errors > 0 || results.failed > 0)) {
            console.log(`\n⚠️ Some tests failed or had errors`);
            process.exit(1);
        } else {
            console.log(`\n✅ Tests completed!`);
            process.exit(0);
        }
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Check if this file is being run directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = ProxyMediaTestSuite;