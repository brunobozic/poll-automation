#!/usr/bin/env node

/**
 * Test Real Survey Site Registrations
 * Run 3 actual registrations and evaluate LLM performance
 */

require('dotenv').config();

const { getLogger } = require('./src/utils/enhanced-logger');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');

async function testRealSurveyRegistrations() {
    const logger = getLogger({ logLevel: 'debug' });
    
    console.log('🌐 TESTING REAL SURVEY SITE REGISTRATIONS');
    console.log('==========================================');
    
    const results = [];
    
    try {
        // Initialize components
        logger.info('Initializing components for real site testing');
        
        const registrationLogger = new RegistrationLogger();
        await registrationLogger.initialize();
        
        const emailManager = new EmailAccountManager();
        await emailManager.initialize();
        
        const contentAI = new ContentUnderstandingAI();
        const formAutomator = new UniversalFormAutomator(contentAI, {
            debugMode: true,
            humanLikeDelays: true,
            avoidHoneypots: true
        });
        
        formAutomator.setRegistrationLogger(registrationLogger);
        
        // Test sites - real survey platforms
        const testSites = [
            {
                name: 'SurveyPlanet',
                url: 'https://surveyplanet.com/register',
                expectedChallenges: ['company field honeypot', 'behavioral analysis'],
                difficulty: 'medium'
            },
            {
                name: 'Typeform',
                url: 'https://admin.typeform.com/signup',
                expectedChallenges: ['dynamic fields', 'timing validation'],
                difficulty: 'high'
            },
            {
                name: 'SurveyMonkey',
                url: 'https://www.surveymonkey.com/user/sign-up/',
                expectedChallenges: ['recaptcha', 'fingerprinting'],
                difficulty: 'high'
            }
        ];
        
        for (let i = 0; i < testSites.length; i++) {
            const site = testSites[i];
            console.log(`\n🎯 REGISTRATION ${i + 1}/3: ${site.name}`);
            console.log(`===========================================`);
            console.log(`🌐 URL: ${site.url}`);
            console.log(`📊 Difficulty: ${site.difficulty}`);
            console.log(`⚠️ Expected challenges: ${site.expectedChallenges.join(', ')}`);
            
            const siteStartTime = Date.now();
            let siteResult = {
                site: site.name,
                url: site.url,
                startTime: siteStartTime,
                difficulty: site.difficulty,
                expectedChallenges: site.expectedChallenges
            };
            
            try {
                // Create email for this registration
                console.log('\n📧 Step 1: Creating email account...');
                const emailResult = await emailManager.createEmailAccount('tempmail');
                
                if (!emailResult.success) {
                    throw new Error(`Email creation failed: ${emailResult.error}`);
                }
                
                console.log(`✅ Email created: ${emailResult.email}`);
                siteResult.email = emailResult.email;
                
                // Start registration logging
                const registrationId = await registrationLogger.startRegistrationAttempt({
                    sessionId: `real_site_test_${Date.now()}`,
                    emailId: null,
                    targetSite: site.name,
                    targetUrl: site.url,
                    currentStep: 'form_analysis',
                    totalSteps: 5,
                    userAgent: 'Real Site Test Agent',
                    ipAddress: '127.0.0.1'
                });
                
                siteResult.registrationId = registrationId;
                
                // Generate realistic user data
                const userData = {
                    email: emailResult.email,
                    firstName: 'Alex',
                    lastName: 'Johnson',
                    password: 'SecurePass123!',
                    company: '', // Intentionally empty to avoid honeypots
                    website: '', // Intentionally empty to avoid honeypots
                    phone: '+1-555-0123',
                    submit: false // Don't actually submit for testing
                };
                
                console.log('\n🤖 Step 2: Running LLM-powered form automation...');
                
                // Run the automation
                const automationResult = await formAutomator.fillAndSubmitForm(site.url, userData, {
                    timeout: 60000,
                    waitForLoad: true,
                    takeScreenshots: true
                });
                
                siteResult.automationResult = automationResult;
                siteResult.success = automationResult.success;
                siteResult.fieldsFound = automationResult.fieldsFound;
                siteResult.fieldsFilled = automationResult.fieldsFilled;
                
                // Calculate metrics
                const duration = Date.now() - siteStartTime;
                siteResult.duration = duration;
                
                if (automationResult.success) {
                    console.log(`✅ ${site.name}: SUCCESS`);
                    console.log(`   📝 Fields found: ${automationResult.fieldsFound}`);
                    console.log(`   ✅ Fields filled: ${automationResult.fieldsFilled}`);
                    console.log(`   ⏱️ Duration: ${Math.round(duration / 1000)}s`);
                } else {
                    console.log(`❌ ${site.name}: FAILED`);
                    console.log(`   💥 Error: ${automationResult.error}`);
                    console.log(`   📝 Fields found: ${automationResult.fieldsFound || 0}`);
                    console.log(`   ❌ Fields filled: ${automationResult.fieldsFilled || 0}`);
                }
                
                // Update registration status
                await registrationLogger.updateRegistrationAttempt(registrationId, {
                    status: automationResult.success ? 'completed' : 'failed',
                    success: automationResult.success ? 1 : 0,
                    error_message: automationResult.error || null,
                    completed_at: new Date().toISOString(),
                    metadata: JSON.stringify({
                        fieldsFound: automationResult.fieldsFound,
                        fieldsFilled: automationResult.fieldsFilled,
                        duration: duration,
                        difficulty: site.difficulty
                    })
                });
                
            } catch (siteError) {
                console.log(`❌ ${site.name}: FAILED - ${siteError.message}`);
                siteResult.success = false;
                siteResult.error = siteError.message;
                siteResult.duration = Date.now() - siteStartTime;
                
                if (siteResult.registrationId) {
                    await registrationLogger.updateRegistrationAttempt(siteResult.registrationId, {
                        status: 'failed',
                        success: 0,
                        error_message: siteError.message,
                        completed_at: new Date().toISOString()
                    });
                }
            }
            
            results.push(siteResult);
            
            // Wait between tests to avoid rate limiting
            if (i < testSites.length - 1) {
                console.log('\n⏳ Waiting 30 seconds before next test...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
        
        // Generate summary
        console.log('\n📊 REAL SITE REGISTRATION SUMMARY');
        console.log('==================================');
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalFields = results.reduce((sum, r) => sum + (r.fieldsFound || 0), 0);
        const totalFilled = results.reduce((sum, r) => sum + (r.fieldsFilled || 0), 0);
        const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
        
        console.log(`✅ Successful registrations: ${successful}/${results.length} (${((successful/results.length)*100).toFixed(1)}%)`);
        console.log(`❌ Failed registrations: ${failed}/${results.length} (${((failed/results.length)*100).toFixed(1)}%)`);
        console.log(`📝 Total fields found: ${totalFields}`);
        console.log(`✅ Total fields filled: ${totalFilled}`);
        console.log(`📊 Fill success rate: ${totalFields > 0 ? ((totalFilled/totalFields)*100).toFixed(1) : 0}%`);
        console.log(`⏱️ Average duration: ${Math.round(avgDuration / 1000)}s`);
        
        console.log('\n📋 Individual Results:');
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.site}:`);
            console.log(`   🎯 Success: ${result.success ? 'Yes' : 'No'}`);
            console.log(`   📝 Fields: ${result.fieldsFound || 0} found, ${result.fieldsFilled || 0} filled`);
            console.log(`   ⏱️ Duration: ${result.duration ? Math.round(result.duration / 1000) : 0}s`);
            console.log(`   📊 Difficulty: ${result.difficulty}`);
            if (result.error) {
                console.log(`   ❌ Error: ${result.error}`);
            }
        });
        
        // Save results for evaluation
        const fs = require('fs').promises;
        const reportPath = './real-site-registration-results.json';
        await fs.writeFile(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: results.length,
                successful: successful,
                failed: failed,
                successRate: (successful/results.length)*100,
                totalFields: totalFields,
                totalFilled: totalFilled,
                fillSuccessRate: totalFields > 0 ? (totalFilled/totalFields)*100 : 0,
                averageDuration: avgDuration
            },
            results: results
        }, null, 2));
        
        console.log(`\n📊 Results saved to: ${reportPath}`);
        
        return {
            success: true,
            results: results,
            summary: {
                successRate: (successful/results.length)*100,
                fillSuccessRate: totalFields > 0 ? (totalFilled/totalFields)*100 : 0
            }
        };
        
    } catch (error) {
        logger.error('Real site testing failed', { error: error.message, stack: error.stack });
        console.log(`💥 Testing failed: ${error.message}`);
        return {
            success: false,
            error: error.message,
            results: results
        };
    }
}

// Run the test
if (require.main === module) {
    testRealSurveyRegistrations()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 Real site registration testing completed successfully!');
                process.exit(0);
            } else {
                console.log('\n💥 Real site registration testing failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = testRealSurveyRegistrations;