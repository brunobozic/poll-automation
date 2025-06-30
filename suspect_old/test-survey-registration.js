#!/usr/bin/env node

/**
 * TEST SURVEY REGISTRATION
 * Test the complete registration workflow with comprehensive logging
 */

const EmailAccountManager = require('./src/email/email-account-manager');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const RegistrationLogger = require('./src/database/registration-logger');

async function testSurveyRegistration() {
    console.log('🎯 TESTING SURVEY REGISTRATION WORKFLOW');
    console.log('=========================================');

    // Use existing email from database
    const testEmail = 'gadahi7812@decodewp.com';
    console.log(`📧 Using existing email: ${testEmail}`);

    const logger = new RegistrationLogger();
    
    try {
        // Initialize logger
        await logger.initialize();
        console.log('✅ Registration logger initialized');

        // Start registration session
        const sessionId = `test_session_${Date.now()}`;
        const siteUrl = 'https://surveyplanet.com';
        
        console.log(`🚀 Starting registration session: ${sessionId}`);
        
        // Log registration attempt
        const registrationId = await logger.logRegistrationAttempt({
            sessionId: sessionId,
            siteUrl: siteUrl,
            siteName: 'SurveyPlanet',
            email: testEmail,
            userAgent: 'Mozilla/5.0 (Test Browser)',
            success: false,
            startedAt: new Date()
        });
        
        console.log(`📝 Registration attempt logged with ID: ${registrationId}`);

        // Simulate some registration steps
        const steps = [
            { name: 'Navigate to site', success: true },
            { name: 'Find registration form', success: true },
            { name: 'Fill email field', success: true },
            { name: 'Fill password field', success: false, error: 'Password requirements not met' },
            { name: 'Submit form', success: false, error: 'Form submission blocked' }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            console.log(`${i + 1}. ${step.name}: ${step.success ? '✅' : '❌'}`);
            
            await logger.logRegistrationStep({
                registrationId: registrationId,
                stepName: step.name,
                stepOrder: i + 1,
                stepType: 'form_interaction',
                success: step.success,
                errorMessage: step.error || null,
                startedAt: new Date(),
                completedAt: new Date(),
                duration: Math.random() * 3000 + 500 // Random duration
            });
        }

        // Update final registration result
        await logger.updateRegistrationResult(registrationId, {
            success: false,
            completedAt: new Date(),
            failureReason: 'Form validation failed - password requirements',
            stepReached: 4,
            totalSteps: 5
        });

        console.log('✅ Registration workflow logged successfully');

        // Check what was logged
        console.log('\n📊 VERIFICATION: Checking logged data...');
        
        // Get registration attempts
        const attempts = await logger.getRegistrationAttempts({ limit: 3 });
        console.log(`📝 Found ${attempts.length} registration attempts`);
        attempts.forEach((attempt, index) => {
            console.log(`${index + 1}. ${attempt.site_url} - Success: ${attempt.success ? 'Yes' : 'No'} - ${attempt.started_at}`);
        });

        // Get registration steps for our session
        const sessionSteps = await logger.getRegistrationSteps(registrationId);
        console.log(`📋 Found ${sessionSteps.length} steps for registration ${registrationId}`);
        sessionSteps.forEach((step, index) => {
            console.log(`   ${step.step_order}. ${step.step_name} - ${step.success ? 'Success' : 'Failed'}`);
        });

        await logger.close();
        console.log('\n🏁 Survey registration test completed successfully');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testSurveyRegistration();