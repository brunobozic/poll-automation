#!/usr/bin/env node

/**
 * Comprehensive Test Data Generator
 * Creates realistic test data to demonstrate the feedback loop capabilities
 */

const RegistrationLogger = require('./src/database/registration-logger');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class TestDataGenerator {
    constructor() {
        this.logger = null;
        this.scenarios = [];
    }

    async initialize() {
        console.log('🏗️ Initializing Comprehensive Test Data Generator...');
        
        this.logger = new RegistrationLogger('./data/polls.db');
        await this.logger.initialize();
        console.log('✅ Database connection established');
    }

    async generateRealisticScenarios() {
        console.log('\n🎬 Generating realistic test scenarios...');
        
        // Scenario 1: Successful registration with high confidence
        const scenario1 = await this.createSuccessfulRegistration({
            site: 'surveymonkey.com',
            confidence: 0.92,
            fieldsFound: 8,
            processingTime: 1200,
            userProfile: {
                age: 28,
                gender: 'female',
                occupation: 'software_engineer',
                location: 'San Francisco'
            }
        });
        this.scenarios.push(scenario1);

        // Scenario 2: Failed registration due to anti-bot detection
        const scenario2 = await this.createFailedRegistration({
            site: 'pollfish.com',
            failureReason: 'Anti-bot detection triggered',
            failureStep: 'stealth_navigation',
            detectionMethods: ['canvas_fingerprinting', 'mouse_behavior_analysis'],
            confidence: 0.45
        });
        this.scenarios.push(scenario2);

        // Scenario 3: Partial success with selector issues
        const scenario3 = await this.createPartialSuccess({
            site: 'typeform.com',
            confidence: 0.67,
            fieldsFound: 3,
            selectorFallbacks: 2,
            processingTime: 3400,
            issues: ['dynamic_content_loading', 'non_standard_selectors']
        });
        this.scenarios.push(scenario3);

        // Scenario 4: Success with honeypot detection
        const scenario4 = await this.createHoneypotScenario({
            site: 'qualtrics.com',
            confidence: 0.89,
            honeypotsDetected: 3,
            honeypotsAvoided: 3,
            processingTime: 1800
        });
        this.scenarios.push(scenario4);

        // Scenario 5: Timeout failure
        const scenario5 = await this.createTimeoutFailure({
            site: 'formstack.com',
            timeoutDuration: 30000,
            failureStep: 'form_submission',
            networkConditions: 'slow_network'
        });
        this.scenarios.push(scenario5);

        console.log(`✅ Generated ${this.scenarios.length} realistic scenarios`);
    }

    async createSuccessfulRegistration(params) {
        console.log(`\n✅ Creating successful registration scenario for ${params.site}...`);
        
        // Create email account
        const emailId = await this.logger.logEmailAccount({
            email: `test.success.${Date.now()}@example.com`,
            service: 'temp_email_service',
            password: 'test_password',
            sessionId: `session_success_${Date.now()}`,
            status: 'active',
            metadata: { test_scenario: 'successful_registration' }
        });

        // Start registration attempt
        const registrationId = await this.logger.startRegistrationAttempt({
            sessionId: `session_success_${Date.now()}`,
            emailId: emailId,
            targetSite: params.site,
            targetUrl: `https://${params.site}/register`,
            currentStep: 'initialization',
            totalSteps: 5,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ipAddress: '192.168.1.100'
        });

        // Log form analysis step
        const stepId1 = await this.logger.logRegistrationStep({
            registrationId,
            stepNumber: 1,
            stepName: 'form_analysis',
            stepType: 'llm_analysis',
            status: 'completed',
            durationMs: params.processingTime,
            inputData: {
                url: `https://${params.site}/register`,
                pageTitle: `Register - ${params.site}`,
                formCount: 1
            },
            outputData: {
                fieldsDetected: params.fieldsFound,
                confidence: params.confidence,
                honepotsDetected: 0
            },
            aiAnalysis: `High confidence form analysis completed. Detected ${params.fieldsFound} form fields with ${params.confidence} confidence.`
        });

        // Log AI interaction for form analysis
        const aiId = await this.logger.logEnhancedAIInteraction({
            registrationId,
            stepId: stepId1,
            interactionType: 'form_analysis',
            prompt: `Analyze the registration form at ${params.site}. Extract field information, detect honeypots, and provide confidence score.`,
            response: `Form analysis complete. Found ${params.fieldsFound} fields: email (required), firstName (required), lastName (required), age (optional), gender (optional), occupation (optional), phone (optional), submit button. No honeypots detected. High confidence in analysis.`,
            modelUsed: 'gpt-4-turbo',
            tokensUsed: 320,
            inputTokens: 150,
            outputTokens: 170,
            costUsd: 0.0048,
            processingTimeMs: params.processingTime,
            success: true,
            confidenceScore: params.confidence,
            responseQualityScore: 0.94,
            insightData: {
                field_analysis: `Successfully identified ${params.fieldsFound} form fields`,
                honeypot_detection: 'No honeypots detected - clean form structure',
                site_complexity: 'Standard registration form with clear field labels',
                success_prediction: 'High likelihood of successful registration'
            }
        });

        // Log user profile generation
        const profileId = await this.logger.logUserProfile({
            registrationId,
            emailId,
            profileName: `generated_profile_${Date.now()}`,
            age: params.userProfile.age,
            gender: params.userProfile.gender,
            occupation: params.userProfile.occupation,
            locationCity: params.userProfile.location,
            locationState: 'CA',
            locationCountry: 'US',
            aiOptimizationScore: 0.88,
            yieldPrediction: 0.76,
            demographicBalanceScore: 0.82
        });

        // Complete registration successfully
        await this.logger.updateRegistrationAttempt(registrationId, {
            status: 'completed',
            success: 1,
            completed_at: new Date().toISOString(),
            current_step: 'completed'
        });

        console.log(`   📧 Email ID: ${emailId}, Registration ID: ${registrationId}, Profile ID: ${profileId}`);
        
        return {
            type: 'successful_registration',
            site: params.site,
            registrationId,
            emailId,
            confidence: params.confidence,
            details: params
        };
    }

    async createFailedRegistration(params) {
        console.log(`\n❌ Creating failed registration scenario for ${params.site}...`);
        
        // Create email account
        const emailId = await this.logger.logEmailAccount({
            email: `test.failed.${Date.now()}@example.com`,
            service: 'temp_email_service',
            password: 'test_password',
            sessionId: `session_failed_${Date.now()}`,
            status: 'active',
            metadata: { test_scenario: 'failed_registration' }
        });

        // Start registration attempt
        const registrationId = await this.logger.startRegistrationAttempt({
            sessionId: `session_failed_${Date.now()}`,
            emailId: emailId,
            targetSite: params.site,
            targetUrl: `https://${params.site}/register`,
            currentStep: 'initialization',
            totalSteps: 5,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ipAddress: '192.168.1.101'
        });

        // Log failed form analysis
        const stepId1 = await this.logger.logRegistrationStep({
            registrationId,
            stepNumber: 1,
            stepName: params.failureStep,
            stepType: 'anti_bot_detection',
            status: 'failed',
            durationMs: 8000,
            inputData: {
                url: `https://${params.site}/register`,
                detectionMethods: params.detectionMethods
            },
            errorDetails: params.failureReason,
            aiAnalysis: `Failed during ${params.failureStep}. Anti-bot detection triggered: ${params.detectionMethods.join(', ')}`
        });

        // Log AI interaction for failure analysis
        const aiId = await this.logger.logEnhancedAIInteraction({
            registrationId,
            stepId: stepId1,
            interactionType: 'failure_analysis',
            prompt: `Analyze the registration failure at ${params.site}. The failure occurred during ${params.failureStep} with detection methods: ${params.detectionMethods.join(', ')}. Provide recommendations for improving success rate.`,
            response: `Failure analysis: ${params.failureReason}. Detection methods encountered: ${params.detectionMethods.join(', ')}. Recommendations: 1) Implement more sophisticated stealth techniques, 2) Randomize behavioral patterns, 3) Use residential proxies, 4) Add delays between actions to mimic human behavior.`,
            modelUsed: 'gpt-4-turbo',
            tokensUsed: 280,
            inputTokens: 120,
            outputTokens: 160,
            costUsd: 0.0042,
            processingTimeMs: 1500,
            success: true,
            confidenceScore: params.confidence,
            responseQualityScore: 0.87,
            insightData: {
                failure_analysis: params.failureReason,
                detection_methods: params.detectionMethods,
                improvement_suggestions: [
                    'Enhanced stealth automation',
                    'Better behavioral mimicry',
                    'Proxy rotation strategy'
                ],
                success_probability_improvement: 'Medium - requires stealth enhancements'
            }
        });

        // Log the failure
        await this.logger.logRegistrationFailure(registrationId, {
            stepName: params.failureStep,
            errorMessage: params.failureReason,
            context: JSON.stringify({
                detectionMethods: params.detectionMethods,
                failureType: 'anti_bot_detection',
                severity: 'high'
            })
        });

        // Mark registration as failed
        await this.logger.updateRegistrationAttempt(registrationId, {
            status: 'failed',
            success: 0,
            completed_at: new Date().toISOString(),
            error_message: params.failureReason,
            current_step: params.failureStep
        });

        console.log(`   📧 Email ID: ${emailId}, Registration ID: ${registrationId} (FAILED)`);
        
        return {
            type: 'failed_registration',
            site: params.site,
            registrationId,
            emailId,
            failureReason: params.failureReason,
            details: params
        };
    }

    async createPartialSuccess(params) {
        console.log(`\n⚠️ Creating partial success scenario for ${params.site}...`);
        
        // Create email account
        const emailId = await this.logger.logEmailAccount({
            email: `test.partial.${Date.now()}@example.com`,
            service: 'temp_email_service',
            password: 'test_password',
            sessionId: `session_partial_${Date.now()}`,
            status: 'active',
            metadata: { test_scenario: 'partial_success' }
        });

        // Start registration attempt
        const registrationId = await this.logger.startRegistrationAttempt({
            sessionId: `session_partial_${Date.now()}`,
            emailId: emailId,
            targetSite: params.site,
            targetUrl: `https://${params.site}/register`,
            currentStep: 'initialization',
            totalSteps: 5,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ipAddress: '192.168.1.102'
        });

        // Log form analysis with medium confidence
        const stepId1 = await this.logger.logRegistrationStep({
            registrationId,
            stepNumber: 1,
            stepName: 'form_analysis',
            stepType: 'llm_analysis',
            status: 'completed',
            durationMs: params.processingTime,
            inputData: {
                url: `https://${params.site}/register`,
                issues: params.issues
            },
            outputData: {
                fieldsDetected: params.fieldsFound,
                confidence: params.confidence,
                selectorFallbacks: params.selectorFallbacks
            },
            aiAnalysis: `Medium confidence analysis. Found ${params.fieldsFound} fields with ${params.selectorFallbacks} selector fallbacks needed. Issues: ${params.issues.join(', ')}`
        });

        // Log AI interaction
        const aiId = await this.logger.logEnhancedAIInteraction({
            registrationId,
            stepId: stepId1,
            interactionType: 'form_analysis',
            prompt: `Analyze the registration form at ${params.site}. Note: experiencing issues with ${params.issues.join(' and ')}.`,
            response: `Partial analysis completed. Found ${params.fieldsFound} fields but required ${params.selectorFallbacks} fallback selectors due to non-standard implementation. Issues identified: ${params.issues.join(', ')}. Confidence reduced due to dynamic content and unusual field patterns.`,
            modelUsed: 'gpt-4-turbo',
            tokensUsed: 340,
            inputTokens: 160,
            outputTokens: 180,
            costUsd: 0.0051,
            processingTimeMs: params.processingTime,
            success: true,
            confidenceScore: params.confidence,
            responseQualityScore: 0.74,
            insightData: {
                field_analysis: `Detected ${params.fieldsFound} fields with fallback selectors`,
                technical_issues: params.issues,
                improvement_needed: 'Enhanced selector patterns for this site type',
                confidence_factors: 'Reduced due to non-standard implementation'
            }
        });

        // Complete registration with partial success
        await this.logger.updateRegistrationAttempt(registrationId, {
            status: 'completed',
            success: 1,
            completed_at: new Date().toISOString(),
            current_step: 'completed_with_issues'
        });

        console.log(`   📧 Email ID: ${emailId}, Registration ID: ${registrationId} (PARTIAL SUCCESS)`);
        
        return {
            type: 'partial_success',
            site: params.site,
            registrationId,
            emailId,
            confidence: params.confidence,
            details: params
        };
    }

    async createHoneypotScenario(params) {
        console.log(`\n🍯 Creating honeypot detection scenario for ${params.site}...`);
        
        // Create email account
        const emailId = await this.logger.logEmailAccount({
            email: `test.honeypot.${Date.now()}@example.com`,
            service: 'temp_email_service',
            password: 'test_password',
            sessionId: `session_honeypot_${Date.now()}`,
            status: 'active',
            metadata: { test_scenario: 'honeypot_detection' }
        });

        // Start registration attempt
        const registrationId = await this.logger.startRegistrationAttempt({
            sessionId: `session_honeypot_${Date.now()}`,
            emailId: emailId,
            targetSite: params.site,
            targetUrl: `https://${params.site}/register`,
            currentStep: 'initialization',
            totalSteps: 5,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ipAddress: '192.168.1.103'
        });

        // Log honeypot detection step
        const stepId1 = await this.logger.logRegistrationStep({
            registrationId,
            stepNumber: 1,
            stepName: 'honeypot_detection',
            stepType: 'security_analysis',
            status: 'completed',
            durationMs: params.processingTime,
            inputData: {
                url: `https://${params.site}/register`,
                securityLevel: 'high'
            },
            outputData: {
                honeypotsDetected: params.honeypotsDetected,
                honeypotsAvoided: params.honeypotsAvoided,
                confidence: params.confidence
            },
            aiAnalysis: `Honeypot detection completed. Found ${params.honeypotsDetected} honeypots, successfully avoided ${params.honeypotsAvoided}. High security site detected.`
        });

        // Log AI interaction for honeypot analysis
        const aiId = await this.logger.logEnhancedAIInteraction({
            registrationId,
            stepId: stepId1,
            interactionType: 'honeypot_analysis',
            prompt: `Analyze the form at ${params.site} for honeypot fields and security measures. Provide detection strategy and avoidance recommendations.`,
            response: `Honeypot analysis complete. Detected ${params.honeypotsDetected} honeypot fields using hidden styling and unusual field names. All honeypots successfully identified and avoided. Security measures include: invisible fields, timestamp validation, behavioral tracking. Recommendation: Continue current detection methods, monitor for new patterns.`,
            modelUsed: 'gpt-4-turbo',
            tokensUsed: 290,
            inputTokens: 130,
            outputTokens: 160,
            costUsd: 0.0044,
            processingTimeMs: params.processingTime,
            success: true,
            confidenceScore: params.confidence,
            responseQualityScore: 0.91,
            insightData: {
                honeypot_analysis: `Detected and avoided ${params.honeypotsDetected} honeypots`,
                security_level: 'High - sophisticated anti-bot measures',
                detection_methods: [
                    'Hidden field analysis',
                    'CSS visibility checks',
                    'Field name pattern recognition'
                ],
                avoidance_success: 'Complete - all honeypots avoided'
            }
        });

        // Complete registration successfully
        await this.logger.updateRegistrationAttempt(registrationId, {
            status: 'completed',
            success: 1,
            completed_at: new Date().toISOString(),
            current_step: 'completed'
        });

        console.log(`   📧 Email ID: ${emailId}, Registration ID: ${registrationId} (HONEYPOT SUCCESS)`);
        
        return {
            type: 'honeypot_success',
            site: params.site,
            registrationId,
            emailId,
            confidence: params.confidence,
            details: params
        };
    }

    async createTimeoutFailure(params) {
        console.log(`\n⏰ Creating timeout failure scenario for ${params.site}...`);
        
        // Create email account
        const emailId = await this.logger.logEmailAccount({
            email: `test.timeout.${Date.now()}@example.com`,
            service: 'temp_email_service',
            password: 'test_password',
            sessionId: `session_timeout_${Date.now()}`,
            status: 'active',
            metadata: { test_scenario: 'timeout_failure' }
        });

        // Start registration attempt
        const registrationId = await this.logger.startRegistrationAttempt({
            sessionId: `session_timeout_${Date.now()}`,
            emailId: emailId,
            targetSite: params.site,
            targetUrl: `https://${params.site}/register`,
            currentStep: 'initialization',
            totalSteps: 5,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ipAddress: '192.168.1.104'
        });

        // Log timeout failure
        const stepId1 = await this.logger.logRegistrationStep({
            registrationId,
            stepNumber: 3,
            stepName: params.failureStep,
            stepType: 'form_submission',
            status: 'failed',
            durationMs: params.timeoutDuration,
            inputData: {
                url: `https://${params.site}/register`,
                networkConditions: params.networkConditions,
                timeoutLimit: params.timeoutDuration
            },
            errorDetails: `Timeout after ${params.timeoutDuration}ms during ${params.failureStep}`,
            aiAnalysis: `Timeout failure during form submission. Network conditions: ${params.networkConditions}. May need increased timeout thresholds.`
        });

        // Log AI interaction for timeout analysis
        const aiId = await this.logger.logEnhancedAIInteraction({
            registrationId,
            stepId: stepId1,
            interactionType: 'timeout_analysis',
            prompt: `Analyze timeout failure at ${params.site} during ${params.failureStep}. Timeout occurred after ${params.timeoutDuration}ms under ${params.networkConditions} conditions.`,
            response: `Timeout analysis: ${params.failureStep} failed after ${params.timeoutDuration}ms. Contributing factors: ${params.networkConditions}, server response delays, possible heavy page load. Recommendations: 1) Increase timeout for this step type, 2) Add retry mechanism, 3) Monitor network conditions, 4) Implement progressive loading detection.`,
            modelUsed: 'gpt-4-turbo',
            tokensUsed: 260,
            inputTokens: 110,
            outputTokens: 150,
            costUsd: 0.0039,
            processingTimeMs: 1200,
            success: true,
            confidenceScore: 0.82,
            responseQualityScore: 0.85,
            insightData: {
                timeout_analysis: `Failed after ${params.timeoutDuration}ms`,
                network_conditions: params.networkConditions,
                failure_step: params.failureStep,
                recommendations: [
                    'Increase timeout thresholds',
                    'Implement retry logic',
                    'Add network condition detection'
                ]
            }
        });

        // Log the failure
        await this.logger.logRegistrationFailure(registrationId, {
            stepName: params.failureStep,
            errorMessage: `Timeout after ${params.timeoutDuration}ms`,
            context: JSON.stringify({
                timeoutDuration: params.timeoutDuration,
                networkConditions: params.networkConditions,
                failureType: 'timeout'
            })
        });

        // Mark registration as failed
        await this.logger.updateRegistrationAttempt(registrationId, {
            status: 'failed',
            success: 0,
            completed_at: new Date().toISOString(),
            error_message: `Timeout during ${params.failureStep}`,
            current_step: params.failureStep
        });

        console.log(`   📧 Email ID: ${emailId}, Registration ID: ${registrationId} (TIMEOUT FAILURE)`);
        
        return {
            type: 'timeout_failure',
            site: params.site,
            registrationId,
            emailId,
            details: params
        };
    }

    async generateAnalysisAndInsights() {
        console.log('\n🧠 Generating comprehensive analysis and insights...');
        
        // Get all data for analysis
        const stats = await this.logger.getRegistrationStats();
        
        console.log('\n📊 Current Database Statistics:');
        console.log(`   Total Attempts: ${stats.totalAttempts?.[0]?.count || 0}`);
        console.log(`   Successful Attempts: ${stats.successfulAttempts?.[0]?.count || 0}`);
        
        // Get AI interaction patterns
        const aiStats = await this.logger.allQuery(`
            SELECT 
                interaction_type,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence,
                AVG(tokens_used) as avg_tokens,
                SUM(cost_usd) as total_cost
            FROM ai_interactions 
            GROUP BY interaction_type
            ORDER BY count DESC
        `);
        
        console.log('\n🤖 AI Interaction Patterns:');
        aiStats.forEach(stat => {
            console.log(`   ${stat.interaction_type}: ${stat.count} interactions`);
            console.log(`      Avg Confidence: ${(stat.avg_confidence || 0).toFixed(2)}`);
            console.log(`      Avg Tokens: ${Math.round(stat.avg_tokens || 0)}`);
            console.log(`      Total Cost: $${(stat.total_cost || 0).toFixed(4)}`);
        });
        
        // Get failure patterns
        const failureStats = await this.logger.allQuery(`
            SELECT 
                step_name,
                COUNT(*) as count,
                GROUP_CONCAT(DISTINCT error_message) as error_types
            FROM registration_failures 
            GROUP BY step_name
            ORDER BY count DESC
        `);
        
        console.log('\n❌ Failure Patterns:');
        failureStats.forEach(stat => {
            console.log(`   ${stat.step_name}: ${stat.count} failures`);
            console.log(`      Error types: ${stat.error_types || 'N/A'}`);
        });
        
        // Get LLM insights distribution
        const insightStats = await this.logger.allQuery(`
            SELECT 
                insight_type,
                COUNT(*) as count
            FROM llm_insights 
            GROUP BY insight_type
            ORDER BY count DESC
        `);
        
        console.log('\n🧠 LLM Insights Distribution:');
        insightStats.forEach(stat => {
            console.log(`   ${stat.insight_type}: ${stat.count} insights`);
        });
        
        return {
            totalAttempts: stats.totalAttempts?.[0]?.count || 0,
            successfulAttempts: stats.successfulAttempts?.[0]?.count || 0,
            aiInteractions: aiStats.length,
            failurePatterns: failureStats.length,
            insights: insightStats.length
        };
    }

    async generateFeedbackLoopDemonstration() {
        console.log('\n🔄 Generating Feedback Loop Demonstration...');
        
        // Demonstrate pattern recognition
        console.log('\n🎯 Pattern Recognition Examples:');
        
        // Query for sites with multiple attempts
        const sitePatterns = await this.logger.allQuery(`
            SELECT 
                target_site,
                COUNT(*) as attempts,
                SUM(success) as successes,
                GROUP_CONCAT(DISTINCT error_message) as common_errors,
                AVG(CASE WHEN ai.confidence_score IS NOT NULL THEN ai.confidence_score END) as avg_confidence
            FROM registration_attempts ra
            LEFT JOIN ai_interactions ai ON ra.id = ai.registration_id
            GROUP BY target_site
            HAVING attempts > 1
            ORDER BY attempts DESC
        `);
        
        sitePatterns.forEach(pattern => {
            const successRate = ((pattern.successes / pattern.attempts) * 100).toFixed(1);
            console.log(`\n   📈 ${pattern.target_site}:`);
            console.log(`      Success Rate: ${successRate}%`);
            console.log(`      Avg Confidence: ${(pattern.avg_confidence || 0).toFixed(2)}`);
            console.log(`      Common Issues: ${pattern.common_errors || 'None'}`);
        });
        
        // Demonstrate improvement recommendations
        console.log('\n💡 Generated Improvement Recommendations:');
        
        const improvements = [
            {
                component: 'Selector Engine',
                issue: 'Sites requiring fallback selectors',
                recommendation: 'Add more dynamic selector patterns for modern form frameworks'
            },
            {
                component: 'Stealth Engine',
                issue: 'Anti-bot detection triggers',
                recommendation: 'Enhance behavioral mimicry and fingerprint randomization'
            },
            {
                component: 'Timeout Management',
                issue: 'Network-related timeouts',
                recommendation: 'Implement adaptive timeout based on network conditions'
            },
            {
                component: 'Honeypot Detection',
                issue: 'Sophisticated honeypot patterns',
                recommendation: 'Expand honeypot detection algorithms for new evasion techniques'
            }
        ];
        
        improvements.forEach((improvement, index) => {
            console.log(`\n   ${index + 1}. ${improvement.component}:`);
            console.log(`      Issue: ${improvement.issue}`);
            console.log(`      Recommendation: ${improvement.recommendation}`);
        });
        
        return improvements;
    }

    async close() {
        if (this.logger) {
            await this.logger.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.generateRealisticScenarios();
            const analysis = await this.generateAnalysisAndInsights();
            const improvements = await this.generateFeedbackLoopDemonstration();
            
            console.log('\n' + '='.repeat(80));
            console.log('🎉 COMPREHENSIVE TEST DATA GENERATION COMPLETE');
            console.log('='.repeat(80));
            
            console.log(`\n📊 Final Summary:`);
            console.log(`   🎬 Scenarios Created: ${this.scenarios.length}`);
            console.log(`   📝 Total Attempts: ${analysis.totalAttempts}`);
            console.log(`   ✅ Successful Attempts: ${analysis.successfulAttempts}`);
            console.log(`   🤖 AI Interactions: ${analysis.aiInteractions}`);
            console.log(`   ❌ Failure Patterns: ${analysis.failurePatterns}`);
            console.log(`   🧠 Insights Generated: ${analysis.insights}`);
            console.log(`   💡 Improvement Areas: ${improvements.length}`);
            
            const successRate = analysis.totalAttempts > 0 ? 
                ((analysis.successfulAttempts / analysis.totalAttempts) * 100).toFixed(1) : 0;
            
            console.log(`\n🎯 Overall Success Rate: ${successRate}%`);
            console.log('\n✅ The feedback loop database now contains comprehensive test data');
            console.log('   demonstrating failure capture, LLM analysis, and improvement insights!');
            
        } catch (error) {
            console.error('❌ Test data generation failed:', error);
        } finally {
            await this.close();
        }
    }
}

// Run the test data generator
if (require.main === module) {
    const generator = new TestDataGenerator();
    generator.run().catch(console.error);
}

module.exports = TestDataGenerator;