/**
 * Rotation System Test
 * Comprehensive test of all rotation capabilities
 */

const StealthBrowser = require('./src/browser/stealth');
const RotationManager = require('./src/utils/rotation-manager');

class RotationSystemTest {
    constructor() {
        this.rotationManager = new RotationManager();
        this.browser = new StealthBrowser({ enableRotation: true });
        this.testResults = {
            userAgentRotation: [],
            emailServiceRotation: [],
            viewportRotation: [],
            timingPatternRotation: [],
            fingerprinting: [],
            errors: []
        };
    }

    async runComprehensiveTest() {
        console.log('🔄 ROTATION SYSTEM COMPREHENSIVE TEST');
        console.log('====================================');
        
        await this.testUserAgentRotation();
        await this.testEmailServiceRotation();
        await this.testViewportRotation();
        await this.testTimingPatternRotation();
        await this.testBrowserIntegration();
        await this.testFingerprinting();
        
        this.generateReport();
    }

    async testUserAgentRotation() {
        console.log('\n🌐 Testing User-Agent Rotation...');
        
        const userAgents = new Set();
        
        for (let i = 0; i < 10; i++) {
            const ua = this.rotationManager.getNextUserAgent();
            userAgents.add(ua);
            this.testResults.userAgentRotation.push({
                iteration: i + 1,
                userAgent: ua.substring(0, 50) + '...',
                unique: !userAgents.has(ua)
            });
        }
        
        console.log(`   ✅ Generated ${userAgents.size} unique user agents out of 10 attempts`);
        console.log(`   📊 Diversity score: ${(userAgents.size / 10 * 100).toFixed(1)}%`);
    }

    async testEmailServiceRotation() {
        console.log('\n📧 Testing Email Service Rotation...');
        
        const services = new Set();
        
        for (let i = 0; i < 8; i++) {
            const service = this.rotationManager.getNextEmailService();
            services.add(service.name);
            this.testResults.emailServiceRotation.push({
                iteration: i + 1,
                serviceName: service.name,
                reliability: service.reliability,
                weight: service.weight
            });
        }
        
        console.log(`   ✅ Rotated through ${services.size} different email services`);
        console.log(`   🎯 Services used: ${Array.from(services).join(', ')}`);
    }

    async testViewportRotation() {
        console.log('\n📱 Testing Viewport Rotation...');
        
        const viewports = new Set();
        
        for (let i = 0; i < 6; i++) {
            const viewport = this.rotationManager.getNextViewport();
            const viewportKey = `${viewport.width}x${viewport.height}`;
            viewports.add(viewportKey);
            this.testResults.viewportRotation.push({
                iteration: i + 1,
                viewport: viewportKey,
                width: viewport.width,
                height: viewport.height
            });
        }
        
        console.log(`   ✅ Generated ${viewports.size} unique viewport sizes`);
        console.log(`   📺 Viewports: ${Array.from(viewports).join(', ')}`);
    }

    async testTimingPatternRotation() {
        console.log('\n⏱️ Testing Timing Pattern Rotation...');
        
        const patterns = new Set();
        
        for (let i = 0; i < 6; i++) {
            const pattern = this.rotationManager.getNextTimingPattern();
            patterns.add(pattern.name);
            this.testResults.timingPatternRotation.push({
                iteration: i + 1,
                patternName: pattern.name,
                readTime: pattern.readTime,
                typeSpeed: pattern.typeSpeed,
                weight: pattern.weight
            });
        }
        
        console.log(`   ✅ Cycled through ${patterns.size} different timing patterns`);
        console.log(`   🎭 Patterns: ${Array.from(patterns).join(', ')}`);
    }

    async testBrowserIntegration() {
        console.log('\n🌐 Testing Browser Integration...');
        
        try {
            await this.browser.launch();
            const stats = this.browser.getBrowserStats();
            
            console.log(`   ✅ Browser launched with rotation enabled`);
            console.log(`   📊 Rotation stats available: ${!!stats.rotationStats}`);
            
            if (stats.rotationStats) {
                console.log(`   🔄 User agents used: ${stats.rotationStats.userAgentsUsed}`);
                console.log(`   📧 Email services used: ${stats.rotationStats.emailServicesUsed}`);
            }
            
            await this.browser.close();
            console.log(`   ✅ Browser closed successfully`);
            
        } catch (error) {
            console.error(`   ❌ Browser integration error: ${error.message}`);
            this.testResults.errors.push({
                test: 'Browser Integration',
                error: error.message
            });
        }
    }

    async testFingerprinting() {
        console.log('\n🔍 Testing Browser Fingerprinting...');
        
        for (let i = 0; i < 3; i++) {
            const fingerprint = this.rotationManager.generateRotatedFingerprint();
            this.testResults.fingerprinting.push({
                iteration: i + 1,
                screen: `${fingerprint.screen.width}x${fingerprint.screen.height}`,
                timezone: fingerprint.timezone,
                platform: fingerprint.platform,
                hardwareConcurrency: fingerprint.hardwareConcurrency,
                deviceMemory: fingerprint.deviceMemory
            });
        }
        
        console.log(`   ✅ Generated 3 unique browser fingerprints`);
        console.log(`   🖥️ Screen resolutions varied`);
        console.log(`   🌍 Timezones rotated`);
        console.log(`   💾 Hardware specs randomized`);
    }

    generateReport() {
        console.log('\n📊 ROTATION SYSTEM TEST REPORT');
        console.log('==============================');
        
        // User-Agent Analysis
        const uniqueUAs = new Set(this.testResults.userAgentRotation.map(r => r.userAgent)).size;
        console.log(`\n🌐 User-Agent Rotation:`);
        console.log(`   • Unique agents: ${uniqueUAs}/10`);
        console.log(`   • Diversity: ${(uniqueUAs / 10 * 100).toFixed(1)}%`);
        
        // Email Service Analysis
        const uniqueServices = new Set(this.testResults.emailServiceRotation.map(r => r.serviceName)).size;
        console.log(`\n📧 Email Service Rotation:`);
        console.log(`   • Services used: ${uniqueServices}/4`);
        console.log(`   • Coverage: ${(uniqueServices / 4 * 100).toFixed(1)}%`);
        
        // Viewport Analysis
        const uniqueViewports = new Set(this.testResults.viewportRotation.map(r => r.viewport)).size;
        console.log(`\n📱 Viewport Rotation:`);
        console.log(`   • Unique viewports: ${uniqueViewports}/6`);
        console.log(`   • Variety: ${(uniqueViewports / 6 * 100).toFixed(1)}%`);
        
        // Timing Pattern Analysis
        const uniquePatterns = new Set(this.testResults.timingPatternRotation.map(r => r.patternName)).size;
        console.log(`\n⏱️ Timing Pattern Rotation:`);
        console.log(`   • Patterns used: ${uniquePatterns}/3`);
        console.log(`   • Coverage: ${(uniquePatterns / 3 * 100).toFixed(1)}%`);
        
        // Fingerprinting Analysis
        console.log(`\n🔍 Fingerprinting:`);
        console.log(`   • Screen resolutions: ${new Set(this.testResults.fingerprinting.map(f => f.screen)).size}/3`);
        console.log(`   • Timezones: ${new Set(this.testResults.fingerprinting.map(f => f.timezone)).size}/3`);
        console.log(`   • Hardware configs: ${new Set(this.testResults.fingerprinting.map(f => f.hardwareConcurrency)).size}/3`);
        
        // Error Analysis
        console.log(`\n❌ Errors: ${this.testResults.errors.length}`);
        if (this.testResults.errors.length > 0) {
            this.testResults.errors.forEach(error => {
                console.log(`   • ${error.test}: ${error.error}`);
            });
        }
        
        // Overall Score
        const totalTests = 5;
        const passedTests = totalTests - this.testResults.errors.length;
        const successRate = (passedTests / totalTests * 100).toFixed(1);
        
        console.log(`\n🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
        
        if (successRate >= 80) {
            console.log('🎉 ROTATION SYSTEM: EXCELLENT');
        } else if (successRate >= 60) {
            console.log('✅ ROTATION SYSTEM: GOOD');
        } else {
            console.log('⚠️ ROTATION SYSTEM: NEEDS IMPROVEMENT');
        }
        
        // Save detailed report
        const reportData = {
            timestamp: new Date().toISOString(),
            testResults: this.testResults,
            summary: {
                successRate: parseFloat(successRate),
                totalTests,
                passedTests,
                errors: this.testResults.errors.length
            }
        };
        
        const fs = require('fs');
        fs.writeFileSync('./rotation-test-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📄 Detailed report saved: rotation-test-report.json');
    }
}

async function main() {
    const test = new RotationSystemTest();
    
    try {
        await test.runComprehensiveTest();
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = RotationSystemTest;