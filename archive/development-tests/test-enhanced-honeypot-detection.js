#!/usr/bin/env node

/**
 * Test Enhanced Honeypot Detection System
 * Tests the improved LLM prompts and honeypot detection on real sites
 */

// Load environment variables FIRST
require('dotenv').config();

const { chromium } = require('playwright');
const { getDatabaseManager } = require('./src/database/database-manager');
const UniversalFormAnalyzer = require('./src/ai/universal-form-analyzer');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');

class EnhancedHoneypotTester {
    constructor() {
        this.db = null;
        this.browser = null;
        this.page = null;
        this.formAnalyzer = null;
        this.testResults = [];
    }
    
    async initialize() {
        console.log('🧪 ENHANCED HONEYPOT DETECTION TESTING');
        console.log('======================================');
        
        // Initialize database
        this.db = getDatabaseManager();
        await this.db.initialize();
        console.log('✅ Database connected');
        
        // Initialize LLM analyzer
        const contentAI = new ContentUnderstandingAI();
        this.formAnalyzer = new UniversalFormAnalyzer(contentAI, {
            debugMode: true,
            enableHoneypotDetection: true
        });
        console.log('✅ Form analyzer initialized');
        
        // Initialize browser
        this.browser = await chromium.launch({ 
            headless: false,
            slowMo: 500 
        });
        this.page = await this.browser.newPage();
        console.log('✅ Browser initialized');
    }
    
    async runComprehensiveTests() {
        console.log('\n🎯 TESTING ENHANCED HONEYPOT DETECTION');
        console.log('=====================================');
        
        // Get sites from database
        const sites = await this.db.all(`
            SELECT name, url FROM survey_sites 
            WHERE is_active = 1 AND url NOT LIKE '%test.example.com%'
            ORDER BY name
        `);
        
        console.log(`📋 Found ${sites.length} sites to test`);
        
        for (const site of sites) {
            await this.testSiteHoneypotDetection(site);
        }
        
        // Test additional known challenging sites
        const challengingSites = [
            { name: 'SurveyPlanet Registration', url: 'https://www.surveyplanet.com/register' },
            { name: 'Typeform Signup', url: 'https://www.typeform.com/signup' },
            { name: 'Google Forms', url: 'https://docs.google.com/forms/create' },
            { name: 'SurveyMonkey', url: 'https://www.surveymonkey.com/register' }
        ];
        
        console.log(`\n🔥 TESTING CHALLENGING SITES`);
        console.log('============================');
        
        for (const site of challengingSites) {
            await this.testSiteHoneypotDetection(site);
        }
        
        await this.generateTestReport();
    }
    
    async testSiteHoneypotDetection(site) {
        console.log(`\n🎯 Testing: ${site.name}`);
        console.log(`🌐 URL: ${site.url}`);
        console.log('━'.repeat(60));
        
        const testResult = {
            siteName: site.name,
            siteUrl: site.url,
            timestamp: new Date().toISOString(),
            success: false,
            error: null,
            analysis: null,
            promptUsed: null,
            responseReceived: null,
            honeypotDetection: {
                detected: 0,
                avoided: 0,
                falsePositives: 0,
                patterns: []
            },
            performanceMetrics: {
                loadTime: 0,
                analysisTime: 0,
                totalTime: 0
            }
        };
        
        const startTime = Date.now();
        
        try {
            // Step 1: Navigate to site
            console.log('🌐 Navigating to site...');
            const navStart = Date.now();
            await this.page.goto(site.url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });
            await this.page.waitForTimeout(3000);
            testResult.performanceMetrics.loadTime = Date.now() - navStart;
            console.log(`✅ Loaded in ${testResult.performanceMetrics.loadTime}ms`);
            
            // Step 2: Take screenshot
            const screenshotPath = `./screenshots/honeypot-test-${site.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot: ${screenshotPath}`);
            
            // Step 3: Analyze with enhanced honeypot detection
            console.log('🧠 Performing enhanced form analysis...');
            const analysisStart = Date.now();
            
            const analysis = await this.formAnalyzer.analyzePage(this.page, site.name);
            testResult.performanceMetrics.analysisTime = Date.now() - analysisStart;
            testResult.analysis = analysis;
            testResult.success = true;
            
            console.log(`✅ Analysis completed in ${testResult.performanceMetrics.analysisTime}ms`);
            
            // Step 4: Evaluate honeypot detection
            this.evaluateHoneypotDetection(testResult, analysis);
            
            // Step 5: Store analysis in database
            await this.storeAnalysisResults(testResult);
            
        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
            testResult.error = error.message;
            testResult.success = false;
        }
        
        testResult.performanceMetrics.totalTime = Date.now() - startTime;
        this.testResults.push(testResult);
        
        console.log(`📊 Total test time: ${testResult.performanceMetrics.totalTime}ms`);
        
        // Wait between tests
        await this.page.waitForTimeout(2000);
    }
    
    evaluateHoneypotDetection(testResult, analysis) {
        console.log('🔍 Evaluating honeypot detection...');
        
        if (!analysis) {
            console.log('⚠️ No analysis data available');
            return;
        }
        
        // Count detected honeypots
        const honeypots = analysis.honeypots || [];
        testResult.honeypotDetection.detected = honeypots.length;
        
        console.log(`🛡️ Honeypots detected: ${honeypots.length}`);
        
        // Analyze honeypot patterns
        honeypots.forEach((honeypot, index) => {
            console.log(`   ${index + 1}. ${honeypot.selector} - ${honeypot.reason || honeypot.trapType}`);
            testResult.honeypotDetection.patterns.push({
                selector: honeypot.selector,
                reason: honeypot.reason || honeypot.trapType,
                confidence: honeypot.confidence
            });
        });
        
        // Count regular fields
        const fields = analysis.fields || [];
        const checkboxes = analysis.checkboxes || [];
        const totalFields = fields.length + checkboxes.length;
        
        console.log(`📝 Regular fields detected: ${totalFields}`);
        console.log(`   📄 Input fields: ${fields.length}`);
        console.log(`   ☑️ Checkboxes: ${checkboxes.length}`);
        
        // Calculate quality metrics
        const confidence = analysis.confidence || 0;
        console.log(`📊 Analysis confidence: ${(confidence * 100).toFixed(1)}%`);
        
        // Log field details
        if (fields.length > 0) {
            console.log('📋 Field details:');
            fields.forEach((field, index) => {
                console.log(`   ${index + 1}. ${field.selector} (${field.purpose}) - ${field.type}`);
            });
        }
        
        if (checkboxes.length > 0) {
            console.log('☑️ Checkbox details:');
            checkboxes.forEach((checkbox, index) => {
                console.log(`   ${index + 1}. ${checkbox.selector} (${checkbox.purpose})`);
            });
        }
    }
    
    async storeAnalysisResults(testResult) {
        try {
            // Store in ai_interactions table (using correct column names)
            await this.db.run(`
                INSERT INTO ai_interactions (
                    interaction_type, prompt_text, response_text,
                    success, confidence_score, tokens_used, processing_time_ms,
                    form_analysis_context
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'enhanced_honeypot_test',
                'Enhanced honeypot detection prompt',
                JSON.stringify(testResult.analysis),
                testResult.success ? 1 : 0,
                testResult.analysis?.confidence || 0,
                500, // Estimated
                testResult.performanceMetrics.analysisTime,
                JSON.stringify({
                    siteName: testResult.siteName,
                    siteUrl: testResult.siteUrl,
                    honeypotDetection: testResult.honeypotDetection,
                    performanceMetrics: testResult.performanceMetrics,
                    timestamp: testResult.timestamp
                })
            ]);
            
            console.log('💾 Results stored in database');
            
        } catch (error) {
            console.log(`⚠️ Failed to store results: ${error.message}`);
        }
    }
    
    async generateTestReport() {
        console.log('\n📊 ENHANCED HONEYPOT DETECTION TEST REPORT');
        console.log('==========================================');
        
        const successfulTests = this.testResults.filter(r => r.success);
        const failedTests = this.testResults.filter(r => !r.success);
        
        console.log(`📈 Success Rate: ${successfulTests.length}/${this.testResults.length} (${(successfulTests.length / this.testResults.length * 100).toFixed(1)}%)`);
        console.log(`✅ Successful: ${successfulTests.length}`);
        console.log(`❌ Failed: ${failedTests.length}`);
        
        if (successfulTests.length > 0) {
            const totalHoneypots = successfulTests.reduce((sum, r) => sum + r.honeypotDetection.detected, 0);
            const avgConfidence = successfulTests.reduce((sum, r) => sum + (r.analysis?.confidence || 0), 0) / successfulTests.length;
            const avgAnalysisTime = successfulTests.reduce((sum, r) => sum + r.performanceMetrics.analysisTime, 0) / successfulTests.length;
            
            console.log(`\n🛡️ Honeypot Detection Summary:`);
            console.log(`   Total honeypots detected: ${totalHoneypots}`);
            console.log(`   Average per site: ${(totalHoneypots / successfulTests.length).toFixed(1)}`);
            console.log(`   Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
            console.log(`   Average analysis time: ${avgAnalysisTime.toFixed(0)}ms`);
            
            console.log(`\n🔍 Detailed Results:`);
            successfulTests.forEach((result, index) => {
                console.log(`   ${index + 1}. ${result.siteName}:`);
                console.log(`      🛡️ Honeypots: ${result.honeypotDetection.detected}`);
                console.log(`      📊 Confidence: ${((result.analysis?.confidence || 0) * 100).toFixed(1)}%`);
                console.log(`      ⏱️ Time: ${result.performanceMetrics.analysisTime}ms`);
                
                if (result.honeypotDetection.patterns.length > 0) {
                    console.log(`      🎯 Patterns detected:`);
                    result.honeypotDetection.patterns.forEach(pattern => {
                        console.log(`         - ${pattern.selector}: ${pattern.reason}`);
                    });
                }
            });
        }
        
        if (failedTests.length > 0) {
            console.log(`\n❌ Failed Tests:`);
            failedTests.forEach((result, index) => {
                console.log(`   ${index + 1}. ${result.siteName}: ${result.error}`);
            });
        }
        
        // Store summary in database
        await this.storeSummaryReport();
    }
    
    async storeSummaryReport() {
        const summary = {
            testDate: new Date().toISOString(),
            totalSites: this.testResults.length,
            successfulTests: this.testResults.filter(r => r.success).length,
            totalHoneypots: this.testResults.reduce((sum, r) => sum + r.honeypotDetection.detected, 0),
            avgConfidence: this.testResults.reduce((sum, r) => sum + (r.analysis?.confidence || 0), 0) / this.testResults.length,
            testResults: this.testResults
        };
        
        try {
            await this.db.run(`
                INSERT INTO ai_interactions (
                    interaction_type, prompt_text, response_text, success,
                    confidence_score, form_analysis_context
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'honeypot_test_summary',
                'Enhanced honeypot detection test summary',
                JSON.stringify(summary),
                1,
                summary.avgConfidence,
                JSON.stringify({ 
                    type: 'enhanced_honeypot_detection_test',
                    testDate: summary.testDate
                })
            ]);
            
            console.log('📊 Test summary stored in database');
            
        } catch (error) {
            console.log(`⚠️ Failed to store summary: ${error.message}`);
        }
    }
    
    async cleanup() {
        if (this.page) await this.page.close();
        if (this.browser) await this.browser.close();
        if (this.db) await this.db.close();
        console.log('🧹 Cleanup completed');
    }
}

// Ensure screenshots directory exists
const fs = require('fs');
if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots');
}

// Run the test
async function runEnhancedHoneypotTests() {
    const tester = new EnhancedHoneypotTester();
    
    try {
        await tester.initialize();
        await tester.runComprehensiveTests();
        
    } catch (error) {
        console.error('💥 Test failed:', error);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    runEnhancedHoneypotTests().catch(console.error);
}

module.exports = EnhancedHoneypotTester;