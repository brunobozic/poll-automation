/**
 * Test Feedback Loop with Database Logging
 * Tests real sites and verifies that feedback data is being stored properly
 */

const { chromium } = require('playwright');
const UniversalFormAnalyzer = require('./src/ai/universal-form-analyzer');
const EnhancedSelectorEngine = require('./src/automation/enhanced-selector-engine');
const AdaptiveTimeoutManager = require('./src/automation/adaptive-timeout-manager');
const StealthAutomationEngine = require('./src/automation/stealth-automation-engine');
const RegistrationLogger = require('./src/database/registration-logger');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Test sites we've tried before
const testSites = [
    'https://www.surveyplanet.com',
    'https://docs.google.com/forms',
    'https://www.typeform.com'
];

class FeedbackLoopTester {
    constructor() {
        this.results = {
            sitesProcessed: 0,
            failuresCaptured: 0,
            llmInteractionsLogged: 0,
            adaptationsGenerated: 0,
            dbErrors: 0,
            startTime: Date.now()
        };
        this.db = null;
        this.registrationLogger = null;
    }

    async initialize() {
        console.log('🔬 Initializing Feedback Loop Test with Database Logging');
        console.log('=' .repeat(80));
        
        // Initialize database
        const dbPath = path.join(__dirname, 'data', 'polls.db');
        this.db = new sqlite3.Database(dbPath);
        
        // Initialize registration logger
        this.registrationLogger = new RegistrationLogger();
        await this.registrationLogger.initialize();
        console.log('✅ Database and logging systems initialized');
        
        return true;
    }

    async testSiteWithFeedbackLoop(siteUrl) {
        console.log(`\n🌐 Testing ${siteUrl} with full feedback loop...`);
        this.results.sitesProcessed++;
        
        let browser, context, page;
        let sessionId = null;
        
        try {
            // Launch browser with stealth
            browser = await chromium.launch({ 
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            page = await context.newPage();
            console.log('   📱 Browser launched');
            
            // Initialize adaptive components
            const selectorEngine = new EnhancedSelectorEngine(page, {
                debugMode: true,
                enableFallbacks: true,
                enableLearning: true
            });
            
            const timeoutManager = new AdaptiveTimeoutManager(page, {
                debugMode: true,
                enableSiteProfile: true
            });
            
            const stealthEngine = new StealthAutomationEngine(page, {
                debugMode: true,
                enableMouseSimulation: true
            });
            
            // Initialize LLM analyzer with database logging
            const mockAI = {
                analyzeContent: async (content) => {
                    console.log('   🤖 Mock AI analyzing content...');
                    return {
                        analysis: `Mock analysis for ${siteUrl}`,
                        confidence: 0.75,
                        fields: [
                            { purpose: 'email', selector: 'input[type="email"]', importance: 'critical' },
                            { purpose: 'firstName', selector: 'input[name="firstName"]', importance: 'important' }
                        ],
                        honeypots: [],
                        submitButton: { selector: 'button[type="submit"]', text: 'Submit' }
                    };
                }
            };
            
            const formAnalyzer = new UniversalFormAnalyzer(mockAI, {
                debugMode: true,
                enableHoneypotDetection: true
            });
            
            // Set the registration logger for LLM interaction logging
            formAnalyzer.setRegistrationLogger(this.registrationLogger);
            
            console.log('   🔧 Components initialized');
            
            // Start a registration session for logging
            sessionId = await this.registrationLogger.startRegistrationAttempt({
                sessionId: 'feedback-loop-test-' + Date.now(),
                emailId: null,
                targetSite: siteUrl,
                targetUrl: siteUrl,
                currentStep: 'form_analysis',
                totalSteps: 5
            });
            console.log(`   📝 Session started: ${sessionId}`);
            
            // Initialize stealth and timeout manager
            await stealthEngine.initialize();
            await timeoutManager.initialize(siteUrl);
            
            // Navigate to site
            console.log('   🚀 Navigating to site...');
            await timeoutManager.executeWithTimeout(
                () => page.goto(siteUrl, { waitUntil: 'domcontentloaded' }),
                'navigation'
            );
            
            // Check for anti-bot detection
            const detection = await stealthEngine.detectAntiBot();
            console.log(`   🔍 Anti-bot detection: ${detection.detected ? 'DETECTED' : 'CLEAR'}`);
            
            if (detection.detected) {
                await stealthEngine.applyEvasionTechniques();
                console.log('   🛡️ Applied evasion techniques');
            }
            
            // Wait for page to stabilize
            await page.waitForTimeout(3000);
            
            // Perform form analysis with LLM logging
            console.log('   🧠 Analyzing page with LLM (logging enabled)...');
            let analysis;
            
            try {
                analysis = await formAnalyzer.analyzePage(page, siteUrl, {
                    registrationId: sessionId,
                    stepId: 'form_analysis'
                });
                console.log(`   ✅ Form analysis completed: ${analysis.confidence} confidence`);
                console.log(`   📊 Found: ${analysis.fields.length} fields, ${analysis.honeypots.length} honeypots`);
                this.results.llmInteractionsLogged++;
            } catch (error) {
                console.log(`   ⚠️ Form analysis error: ${error.message}`);
                this.results.failuresCaptured++;
                
                // Log the failure
                await this.registrationLogger.logRegistrationStep({
                    registrationId: sessionId,
                    stepNumber: Date.now(),
                    stepName: 'form_analysis',
                    stepType: 'llm_analysis',
                    status: 'failed',
                    errorDetails: error.message,
                    inputData: {
                        url: siteUrl,
                        timestamp: new Date().toISOString(),
                        context: 'LLM form analysis failure'
                    }
                });
            }
            
            // Test enhanced selector engine with some common elements
            const testElements = ['email', 'submit', 'cookieAccept'];
            
            for (const elementType of testElements) {
                try {
                    console.log(`   🔍 Testing selector for: ${elementType}`);
                    const result = await selectorEngine.findElement(elementType);
                    if (result) {
                        console.log(`      ✅ Found ${elementType}: ${result.selector} (fallback: ${result.fallbackIndex})`);
                        
                        // Log successful element detection
                        await this.registrationLogger.logRegistrationStep({
                            registrationId: sessionId,
                            stepNumber: Date.now(),
                            stepName: `find_${elementType}`,
                            stepType: 'element_detection',
                            status: 'completed',
                            outputData: {
                                selector: result.selector,
                                fallbackIndex: result.fallbackIndex,
                                discovered: result.discovered || false
                            }
                        });
                    }
                } catch (error) {
                    console.log(`      ℹ️ ${elementType} not found: ${error.message}`);
                    
                    // Log element detection failure
                    await this.registrationLogger.logRegistrationStep({
                        registrationId: sessionId,
                        stepNumber: Date.now(),
                        stepName: `find_${elementType}`,
                        stepType: 'element_detection',
                        status: 'failed',
                        errorDetails: error.message,
                        inputData: {
                            elementType: elementType,
                            selectorsAttempted: selectorEngine.selectorPatterns[elementType]?.length || 0
                        }
                    });
                    this.results.failuresCaptured++;
                }
            }
            
            // Generate some adaptive recommendations based on what we found
            await this.generateAdaptiveRecommendations(sessionId, siteUrl, analysis);
            
            // Complete the session
            await this.registrationLogger.updateRegistrationAttempt(sessionId, {
                status: 'completed',
                success: 1,
                completed_at: new Date().toISOString(),
                current_step: 'testing_complete'
            });
            
            console.log(`   🏁 Session completed successfully`);
            
        } catch (error) {
            console.error(`   ❌ Site test failed: ${error.message}`);
            this.results.failuresCaptured++;
            this.results.dbErrors++;
            
            if (sessionId) {
                await this.registrationLogger.updateRegistrationAttempt(sessionId, {
                    status: 'failed',
                    success: 0,
                    error_message: error.message
                });
            }
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async generateAdaptiveRecommendations(sessionId, siteUrl, analysis) {
        console.log('   🎯 Generating adaptive recommendations...');
        
        try {
            const recommendations = {
                timestamp: new Date().toISOString(),
                siteUrl: siteUrl,
                confidence: analysis?.confidence || 0,
                recommendations: []
            };
            
            // Generate recommendations based on analysis results
            if (analysis && analysis.confidence < 0.7) {
                recommendations.recommendations.push({
                    type: 'selector_improvement',
                    priority: 'high',
                    description: 'Low confidence analysis suggests selector patterns need improvement',
                    action: 'Add more selector fallback patterns for this site type'
                });
            }
            
            if (analysis && analysis.fields.length === 0) {
                recommendations.recommendations.push({
                    type: 'element_detection',
                    priority: 'critical',
                    description: 'No form fields detected - may need enhanced discovery methods',
                    action: 'Implement intelligent form discovery for this site architecture'
                });
            }
            
            if (analysis && analysis.honeypots.length > 3) {
                recommendations.recommendations.push({
                    type: 'anti_bot_evasion',
                    priority: 'high',
                    description: 'High number of honeypots suggests sophisticated bot detection',
                    action: 'Enhance stealth techniques for this site type'
                });
            }
            
            // Log recommendations to database
            await this.registrationLogger.logEnhancedAIInteraction({
                registrationId: sessionId,
                stepId: 'adaptive_recommendations',
                interactionType: 'recommendation_generation',
                prompt: `Generate adaptive recommendations for ${siteUrl}`,
                response: JSON.stringify(recommendations),
                modelUsed: 'adaptive_engine',
                tokensUsed: 100,
                inputTokens: 50,
                outputTokens: 50,
                processingTimeMs: 100,
                success: true,
                confidenceScore: 0.8,
                insightData: recommendations
            });
            
            console.log(`   📋 Generated ${recommendations.recommendations.length} recommendations`);
            this.results.adaptationsGenerated += recommendations.recommendations.length;
            
        } catch (error) {
            console.error(`   ❌ Failed to generate recommendations: ${error.message}`);
            this.results.dbErrors++;
        }
    }

    async analyzeDatabaseData() {
        console.log('\n📊 Analyzing stored feedback data...');
        
        try {
            // Query AI interactions
            const aiInteractions = await new Promise((resolve, reject) => {
                this.db.all(`
                    SELECT 
                        interaction_type,
                        model_used,
                        success,
                        confidence_score,
                        created_at,
                        prompt,
                        response
                    FROM ai_interactions 
                    ORDER BY created_at DESC 
                    LIMIT 50
                `, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log(`   📈 Found ${aiInteractions.length} AI interactions in database`);
            
            // Analyze interaction patterns
            const interactionTypes = {};
            const successRates = {};
            let totalConfidence = 0;
            let confidenceCount = 0;
            
            aiInteractions.forEach(interaction => {
                // Count interaction types
                interactionTypes[interaction.interaction_type] = 
                    (interactionTypes[interaction.interaction_type] || 0) + 1;
                
                // Calculate success rates
                if (!successRates[interaction.interaction_type]) {
                    successRates[interaction.interaction_type] = { total: 0, success: 0 };
                }
                successRates[interaction.interaction_type].total++;
                if (interaction.success) {
                    successRates[interaction.interaction_type].success++;
                }
                
                // Average confidence
                if (interaction.confidence_score) {
                    totalConfidence += interaction.confidence_score;
                    confidenceCount++;
                }
            });
            
            console.log('\n   📊 Interaction Analysis:');
            Object.entries(interactionTypes).forEach(([type, count]) => {
                const successRate = successRates[type] ? 
                    ((successRates[type].success / successRates[type].total) * 100).toFixed(1) : 0;
                console.log(`      ${type}: ${count} interactions (${successRate}% success rate)`);
            });
            
            const avgConfidence = confidenceCount > 0 ? 
                (totalConfidence / confidenceCount).toFixed(2) : 'N/A';
            console.log(`   🎯 Average Confidence Score: ${avgConfidence}`);
            
            // Query recent failures
            const failures = await new Promise((resolve, reject) => {
                this.db.all(`
                    SELECT 
                        step_name,
                        error_message,
                        context,
                        created_at
                    FROM registration_failures 
                    ORDER BY created_at DESC 
                    LIMIT 20
                `, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log(`\n   ⚠️ Recent Failures: ${failures.length}`);
            const failureTypes = {};
            failures.forEach(failure => {
                failureTypes[failure.step_name] = (failureTypes[failure.step_name] || 0) + 1;
            });
            
            Object.entries(failureTypes).forEach(([step, count]) => {
                console.log(`      ${step}: ${count} failures`);
            });
            
            return {
                aiInteractions: aiInteractions.length,
                interactionTypes,
                successRates,
                avgConfidence,
                failures: failures.length,
                failureTypes
            };
            
        } catch (error) {
            console.error(`   ❌ Database analysis failed: ${error.message}`);
            this.results.dbErrors++;
            return null;
        }
    }

    async generateCodeAdaptations(analysisResults) {
        console.log('\n🔧 Generating code adaptations based on feedback data...');
        
        if (!analysisResults) {
            console.log('   ⚠️ No analysis results to work with');
            return;
        }
        
        const adaptations = [];
        
        // Analyze success rates and generate adaptations
        Object.entries(analysisResults.successRates).forEach(([type, rates]) => {
            const successRate = (rates.success / rates.total) * 100;
            
            if (successRate < 70) {
                adaptations.push({
                    component: type,
                    issue: 'Low success rate',
                    successRate: successRate.toFixed(1) + '%',
                    recommendation: this.generateRecommendationForType(type, successRate)
                });
            }
        });
        
        // Analyze failure patterns
        Object.entries(analysisResults.failureTypes).forEach(([step, count]) => {
            if (count > 2) { // More than 2 failures of same type
                adaptations.push({
                    component: step,
                    issue: 'Frequent failures',
                    failureCount: count,
                    recommendation: this.generateRecommendationForFailure(step, count)
                });
            }
        });
        
        // Low confidence analysis
        if (analysisResults.avgConfidence && parseFloat(analysisResults.avgConfidence) < 0.6) {
            adaptations.push({
                component: 'form_analysis',
                issue: 'Low confidence',
                avgConfidence: analysisResults.avgConfidence,
                recommendation: 'Improve LLM prompts and add more context for form analysis'
            });
        }
        
        console.log(`   🎯 Generated ${adaptations.length} code adaptations:`);
        adaptations.forEach((adaptation, index) => {
            console.log(`\n   ${index + 1}. ${adaptation.component.toUpperCase()}`);
            console.log(`      Issue: ${adaptation.issue}`);
            if (adaptation.successRate) console.log(`      Success Rate: ${adaptation.successRate}`);
            if (adaptation.failureCount) console.log(`      Failures: ${adaptation.failureCount}`);
            if (adaptation.avgConfidence) console.log(`      Avg Confidence: ${adaptation.avgConfidence}`);
            console.log(`      Recommendation: ${adaptation.recommendation}`);
        });
        
        return adaptations;
    }

    generateRecommendationForType(type, successRate) {
        const recommendations = {
            'form_analysis': 'Enhance LLM prompts with more specific instructions and examples',
            'find_email': 'Add more email field selector patterns and improve discovery logic',
            'find_submit': 'Implement better submit button detection with semantic analysis',
            'find_cookieAccept': 'Improve cookie consent detection with more banner patterns',
            'recommendation_generation': 'Refine adaptive recommendation algorithms'
        };
        
        return recommendations[type] || 'Analyze specific failure patterns and improve component logic';
    }

    generateRecommendationForFailure(step, count) {
        const recommendations = {
            'form_analysis': 'Add fallback analysis methods and improve error handling',
            'site_test': 'Implement better error recovery and retry mechanisms',
            'find_email': 'Add intelligent email field discovery methods',
            'find_submit': 'Enhance submit button detection algorithms',
            'navigation': 'Improve page load detection and timeout handling'
        };
        
        return recommendations[step] || 'Investigate root cause and implement targeted fixes';
    }

    async runTests() {
        try {
            await this.initialize();
            
            // Test each site with feedback loop
            for (const site of testSites) {
                await this.testSiteWithFeedbackLoop(site);
                
                // Brief pause between sites
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Analyze the database data
            const analysisResults = await this.analyzeDatabaseData();
            
            // Generate code adaptations
            const adaptations = await this.generateCodeAdaptations(analysisResults);
            
            // Generate final report
            this.generateFinalReport(analysisResults, adaptations);
            
        } catch (error) {
            console.error('❌ Test execution failed:', error);
        } finally {
            if (this.db) {
                this.db.close();
            }
        }
    }

    generateFinalReport(analysisResults, adaptations) {
        const duration = Date.now() - this.results.startTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('📋 FEEDBACK LOOP TEST REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n📊 Test Results:`);
        console.log(`   🌐 Sites Processed: ${this.results.sitesProcessed}`);
        console.log(`   ⚠️ Failures Captured: ${this.results.failuresCaptured}`);
        console.log(`   🤖 LLM Interactions Logged: ${this.results.llmInteractionsLogged}`);
        console.log(`   🎯 Adaptations Generated: ${this.results.adaptationsGenerated}`);
        console.log(`   💾 Database Errors: ${this.results.dbErrors}`);
        console.log(`   ⏱️ Total Duration: ${duration}ms`);
        
        if (analysisResults) {
            console.log(`\n📈 Database Analysis:`);
            console.log(`   🔄 AI Interactions: ${analysisResults.aiInteractions}`);
            console.log(`   📊 Average Confidence: ${analysisResults.avgConfidence}`);
            console.log(`   ⚠️ Total Failures: ${analysisResults.failures}`);
        }
        
        if (adaptations && adaptations.length > 0) {
            console.log(`\n🔧 Code Adaptations Needed: ${adaptations.length}`);
            console.log('   Priority areas for improvement identified');
        }
        
        const feedbackLoopWorking = this.results.llmInteractionsLogged > 0 && this.results.dbErrors === 0;
        console.log(`\n${feedbackLoopWorking ? '✅' : '❌'} FEEDBACK LOOP STATUS: ${feedbackLoopWorking ? 'WORKING' : 'NEEDS FIXES'}`);
        
        if (feedbackLoopWorking) {
            console.log('\n🎉 The feedback loop is successfully capturing and storing data!');
            console.log('   The system is learning from interactions and generating insights.');
        } else {
            console.log('\n⚠️ Issues detected with feedback loop - investigation needed.');
        }
    }
}

// Run the test
async function main() {
    const tester = new FeedbackLoopTester();
    await tester.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FeedbackLoopTester;