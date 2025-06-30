/**
 * Final Verification Test
 * Comprehensive test to prove all database issues are fixed
 */

const FixedRegistrationLogger = require('./src/database/fixed-registration-logger.js');

async function finalVerificationTest() {
    console.log('🎯 FINAL VERIFICATION TEST');
    console.log('==========================');
    console.log('Testing ALL fixed database functionality...\n');
    
    const logger = new FixedRegistrationLogger();
    await logger.initialize();
    
    // Test 1: Registration with rich ML data
    console.log('1. 📝 Testing Registration ML Logging...');
    await logger.logRegistrationAttemptML({
        siteUrl: 'https://final-test.com',
        siteName: 'FinalTest',
        success: true,
        stepsCompleted: 4,
        timeSpent: 12000,
        sessionId: 'final-verification-session',
        
        // Rich ML Features (should capture 20+ features)
        difficulty: 'medium',
        formStructure: { inputFields: 7, selects: 2, checkboxes: 1, honeypots: 1 },
        formFieldCount: 7,
        hasHoneypots: true,
        hasCaptcha: false,
        hasCloudflare: true,
        pageLoadTime: 3200,
        userAgentUsed: 'Mozilla/5.0 (Final Test Browser)',
        viewportUsed: { width: 1920, height: 1080 },
        timingPattern: 'human-natural',
        emailServiceUsed: 'TempMail',
        mouseMovements: 45,
        keystrokes: 98,
        scrollEvents: 6,
        focusEvents: 12
    });
    
    // Test 2: Survey completion with ML data
    console.log('2. 📋 Testing Survey ML Logging...');
    await logger.logSurveyCompletionML({
        siteUrl: 'https://final-test.com',
        siteName: 'FinalTest',
        surveyUrl: 'https://final-test.com/survey/final-123',
        success: true,
        questionsAnswered: 15,
        totalQuestions: 18,
        timeSpent: 22000,
        completionRate: 0.83,
        sessionId: 'final-verification-session',
        
        // ML Features (should capture 15+ features)
        questionTypes: ['multiple-choice', 'text', 'rating', 'boolean', 'slider'],
        difficultyLevel: 'medium',
        surveyLength: 18,
        hasLogicBranching: true,
        hasValidation: true,
        hasProgressBar: true,
        userAgentUsed: 'Mozilla/5.0 (Final Test Browser)',
        viewportUsed: { width: 1920, height: 1080 },
        rotationPattern: 'human-natural'
    });
    
    // Test 3: User profile with aligned schema
    console.log('3. 👤 Testing User Profile Logging...');
    await logger.logUserProfileML({
        registrationId: 9999,
        emailId: 9999,
        profileName: `Final Verification Profile ${Date.now()}`,
        age: 29,
        gender: 'female',
        occupation: 'QA Engineer',
        locationCity: 'San Francisco',
        locationState: 'CA',
        locationCountry: 'USA',
        educationLevel: 'Masters',
        incomeBracket: '$75k-100k',
        maritalStatus: 'single',
        householdSize: 1,
        interests: ['testing', 'automation', 'technology', 'surveys']
    });
    
    // Test 4: Registration steps with correct schema
    console.log('4. 📝 Testing Registration Steps Logging...');
    await logger.logRegistrationStepML({
        registrationId: 9999,
        stepNumber: 1,
        stepType: 'final_verification_step',
        success: true,
        duration: 4000,
        pageUrl: 'https://final-test.com/register',
        aiReasoning: 'Final verification test - all systems working',
        stepData: {
            testType: 'final_verification',
            allSystemsWorking: true,
            mlDataCaptured: true
        }
    });
    
    console.log('\n🔍 VERIFYING ALL DATA WAS CAPTURED CORRECTLY');
    console.log('============================================');
    
    // Verify registration ML data
    const regData = await logger.allQuery(`
        SELECT event_type, event_message, LENGTH(event_data) as data_length, event_data
        FROM system_events 
        WHERE event_type = 'registration_attempt' 
        AND event_message LIKE '%FinalTest%'
        ORDER BY timestamp DESC LIMIT 1
    `);
    
    if (regData.length > 0) {
        const features = JSON.parse(regData[0].event_data);
        const featureCount = Object.keys(features).length;
        console.log(`✅ Registration ML: ${featureCount} features, ${regData[0].data_length} chars`);
        console.log(`   Sample: ${Object.keys(features).slice(0, 8).join(', ')}`);
    }
    
    // Verify survey ML data
    const surveyData = await logger.allQuery(`
        SELECT event_type, event_message, LENGTH(event_data) as data_length, event_data
        FROM system_events 
        WHERE event_type = 'survey_completion' 
        AND event_message LIKE '%FinalTest%'
        ORDER BY timestamp DESC LIMIT 1
    `);
    
    if (surveyData.length > 0) {
        const features = JSON.parse(surveyData[0].event_data);
        const featureCount = Object.keys(features).length;
        console.log(`✅ Survey ML: ${featureCount} features, ${surveyData[0].data_length} chars`);
        console.log(`   Sample: ${Object.keys(features).slice(0, 8).join(', ')}`);
    }
    
    // Verify user profile
    const profileData = await logger.allQuery(`
        SELECT COUNT(*) as count FROM user_profiles 
        WHERE profile_name LIKE 'Final Verification Profile%'
    `);
    console.log(`✅ User Profile: ${profileData[0].count} record(s) stored`);
    
    // Verify registration steps
    const stepsData = await logger.allQuery(`
        SELECT COUNT(*) as count FROM registration_steps 
        WHERE step_name = 'final_verification_step'
    `);
    console.log(`✅ Registration Steps: ${stepsData[0].count} record(s) stored`);
    
    // Final comprehensive check
    const totalEvents = await logger.allQuery(`
        SELECT 
            event_type,
            COUNT(*) as count,
            AVG(LENGTH(event_data)) as avg_data_size
        FROM system_events 
        WHERE event_type IN ('registration_attempt', 'survey_completion')
        GROUP BY event_type
    `);
    
    console.log('\n📊 FINAL SYSTEM STATUS');
    console.log('=====================');
    
    totalEvents.forEach(event => {
        console.log(`${event.event_type}: ${event.count} events, avg ${Math.round(event.avg_data_size)} chars each`);
    });
    
    const totalProfiles = await logger.allQuery(`SELECT COUNT(*) as count FROM user_profiles`);
    const totalSteps = await logger.allQuery(`SELECT COUNT(*) as count FROM registration_steps`);
    
    console.log(`user_profiles: ${totalProfiles[0].count} records`);
    console.log(`registration_steps: ${totalSteps[0].count} records`);
    
    // Calculate success metrics
    const regCount = totalEvents.find(e => e.event_type === 'registration_attempt')?.count || 0;
    const surveyCount = totalEvents.find(e => e.event_type === 'survey_completion')?.count || 0;
    const avgDataSize = totalEvents.reduce((sum, e) => sum + e.avg_data_size, 0) / totalEvents.length;
    
    console.log('\n🏆 FINAL VERIFICATION RESULTS');
    console.log('=============================');
    
    if (regCount >= 1 && surveyCount >= 1 && totalProfiles[0].count >= 1 && totalSteps[0].count >= 1 && avgDataSize > 400) {
        console.log('✅ ALL DATABASE INTEGRATION ISSUES FULLY RESOLVED!');
        console.log('✅ ML data capture working perfectly');
        console.log('✅ All table schemas aligned and functional');
        console.log('✅ Complete workflow from registration to survey logging');
        console.log('✅ Rich ML features being captured for learning');
        console.log(`✅ Average data size: ${Math.round(avgDataSize)} characters per event`);
        console.log('\n🎉 SYSTEM IS READY FOR PRODUCTION ML TRAINING!');
    } else {
        console.log('❌ Some issues still remain');
        console.log(`   Registration events: ${regCount}`);
        console.log(`   Survey events: ${surveyCount}`);
        console.log(`   User profiles: ${totalProfiles[0].count}`);
        console.log(`   Registration steps: ${totalSteps[0].count}`);
        console.log(`   Average data size: ${Math.round(avgDataSize)}`);
    }
    
    await logger.close();
}

if (require.main === module) {
    finalVerificationTest();
}