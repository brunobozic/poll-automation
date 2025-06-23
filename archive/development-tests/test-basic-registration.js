#!/usr/bin/env node

/**
 * Test Basic Registration Flow
 * Simple test to verify registration workflow without enhanced mode
 */

require('dotenv').config();

const { getLogger } = require('./src/utils/enhanced-logger');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');

async function testBasicRegistration() {
    const logger = getLogger({ logLevel: 'debug' });
    
    console.log('🧪 TESTING BASIC REGISTRATION FLOW');
    console.log('================================');
    
    try {
        // Initialize components
        logger.info('Initializing basic components');
        
        const contentAI = new ContentUnderstandingAI();
        const emailManager = new EmailAccountManager();
        const registrationLogger = new RegistrationLogger();
        
        // Initialize logger
        await registrationLogger.initialize();
        logger.info('✅ Registration logger initialized');
        
        // Initialize email manager
        await emailManager.initialize();
        logger.info('✅ Email manager initialized');
        
        // Create form automator
        const formAutomator = new UniversalFormAutomator(contentAI, {
            debugMode: true,
            humanLikeDelays: true,
            avoidHoneypots: true
        });
        
        // Set registration logger
        formAutomator.setRegistrationLogger(registrationLogger);
        logger.info('✅ Form automator created');
        
        // Test sites
        const testSites = [
            'https://httpbin.org/forms/post',
            'https://www.surveyplanet.com/register'
        ];
        
        for (const site of testSites) {
            logger.info(`Testing registration on: ${site}`);
            
            try {
                // Create email for this registration
                logger.info('Creating email account');
                const emailResult = await emailManager.createEmailAccount('tempmail');
                
                if (!emailResult.success) {
                    logger.error('Failed to create email account', { error: emailResult.error });
                    continue;
                }
                
                logger.info('✅ Email created', { email: emailResult.email });
                
                // Start registration attempt
                const registrationId = await registrationLogger.startRegistrationAttempt({
                    sessionId: `test_${Date.now()}`,
                    emailId: null, // Will need to get this from the email creation
                    targetSite: site,
                    targetUrl: site,
                    currentStep: 'form_filling',
                    totalSteps: 3,
                    userAgent: 'Basic Test Agent',
                    ipAddress: '127.0.0.1'
                });
                
                logger.info('Registration attempt started', { registrationId });
                
                // Test form automation
                const automationResult = await formAutomator.fillAndSubmitForm(site, {
                    email: emailResult.email,
                    firstName: 'Test',
                    lastName: 'User',
                    password: 'TestPassword123!',
                    submit: false // Don't actually submit during test
                });
                
                logger.info('Form automation completed', {
                    success: automationResult.success,
                    fieldsFound: automationResult.fieldsFound,
                    fieldsFilled: automationResult.fieldsFilled
                });
                
                // Complete registration record
                await registrationLogger.updateRegistrationAttempt(registrationId, {
                    success: automationResult.success,
                    error: automationResult.error,
                    details: JSON.stringify(automationResult)
                });
                
                console.log(`✅ ${site}: ${automationResult.success ? 'SUCCESS' : 'FAILED'}`);
                
            } catch (siteError) {
                logger.error(`Registration failed for ${site}`, { error: siteError.message });
                console.log(`❌ ${site}: FAILED - ${siteError.message}`);
            }
            
            // Wait between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Get statistics
        const stats = await registrationLogger.getRegistrationStats();
        logger.info('Registration statistics', stats);
        
        console.log('\n📊 TEST RESULTS');
        console.log('===============');
        const totalAttempts = stats.totalAttempts?.[0]?.count || 0;
        const successfulAttempts = stats.successfulAttempts?.[0]?.count || 0;
        const failedAttempts = totalAttempts - successfulAttempts;
        console.log(`Total attempts: ${totalAttempts}`);
        console.log(`Successful: ${successfulAttempts}`);
        console.log(`Failed: ${failedAttempts}`);
        console.log(`Success rate: ${totalAttempts > 0 ? ((successfulAttempts / totalAttempts) * 100).toFixed(1) : 0}%`);
        
    } catch (error) {
        logger.error('Test failed', { error: error.message, stack: error.stack });
        console.log(`💥 Test failed: ${error.message}`);
    }
    
    console.log('\n✅ Basic registration test completed');
}

// Run the test
testBasicRegistration().catch(console.error);