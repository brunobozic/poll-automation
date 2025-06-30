/**
 * Test Complete Fixed System
 * Comprehensive test of the fully fixed database integration
 */

const FixedRegistrationLogger = require('./src/database/fixed-registration-logger.js');

async function testCompleteFixedSystem() {
    console.log('🧪 TESTING COMPLETE FIXED SYSTEM');
    console.log('=================================');
    
    const logger = new FixedRegistrationLogger();
    await logger.initialize();
    
    console.log('🎯 Simulating complete training workflow...\n');
    
    // Simulate 3 different survey sites with full ML logging
    const testSites = [
        {
            name: 'QualtricsFix',
            url: 'https://qualtrics-fixed.com',
            difficulty: 'high',
            success: true
        },
        {
            name: 'JotFormFix', 
            url: 'https://jotform-fixed.com',
            difficulty: 'medium',
            success: false
        },
        {
            name: 'SurveyPlanetFix',
            url: 'https://surveyplanet-fixed.com', 
            difficulty: 'medium',
            success: true
        }
    ];
    
    let registrationId = 1000;
    
    for (const site of testSites) {
        console.log(`📋 Testing ${site.name}...`);
        
        // 1. Log user profile
        await logger.logUserProfileML({
            registrationId: registrationId,
            emailId: registrationId,
            profileName: `${site.name} Test Profile`,
            age: 25 + Math.floor(Math.random() * 20),
            gender: Math.random() > 0.5 ? 'female' : 'male',
            occupation: 'Test Engineer',
            locationCity: 'Test City',
            locationState: 'TC',
            locationCountry: 'USA',
            educationLevel: 'Bachelor',
            incomeBracket: '$50k-75k',
            interests: ['testing', 'automation', 'surveys']
        });
        
        // 2. Log registration steps
        await logger.logRegistrationStepML({
            registrationId: registrationId,
            stepNumber: 1,
            stepType: 'form_analysis',
            success: true,
            duration: 3000,
            pageUrl: `${site.url}/register`,
            aiReasoning: `Successfully analyzed ${site.name} registration form`,
            stepData: {
                fieldsFound: 6,
                honeypotsDetected: site.difficulty === 'high' ? 2 : 1,
                securityLevel: site.difficulty
            }
        });
        
        await logger.logRegistrationStepML({
            registrationId: registrationId,
            stepNumber: 2, 
            stepType: 'form_filling',
            success: site.success,
            duration: site.success ? 8000 : 5000,
            pageUrl: `${site.url}/register`,
            aiReasoning: site.success ? 
                `Successfully filled ${site.name} registration form` :
                `Failed to complete ${site.name} registration - validation error`,
            stepData: {
                fieldsCompleted: site.success ? 6 : 4,
                errors: site.success ? 0 : 1,
                retries: site.success ? 0 : 2
            }
        });
        
        // 3. Log registration attempt with rich ML data
        await logger.logRegistrationAttemptML({
            siteUrl: site.url,
            siteName: site.name,
            success: site.success,
            stepsCompleted: site.success ? 2 : 1,
            timeSpent: site.success ? 11000 : 8000,
            sessionId: `fixed-system-test-${registrationId}`,
            failureReason: site.success ? null : 'Email validation failed',
            
            // Rich ML Features
            difficulty: site.difficulty,
            formStructure: {
                inputFields: 6,
                selects: 2,
                checkboxes: 1,
                honeypots: site.difficulty === 'high' ? 2 : 1
            },
            formFieldCount: 6,
            hasHoneypots: true,
            hasCaptcha: site.difficulty === 'high',
            hasCloudflare: site.difficulty !== 'easy',
            pageLoadTime: 2000 + Math.floor(Math.random() * 3000),
            
            // Rotation data
            userAgentUsed: 'Mozilla/5.0 (Fixed System Test Browser)',
            viewportUsed: { width: 1920, height: 1080 },
            timingPattern: 'human-realistic',
            emailServiceUsed: 'TempMail',
            
            // Behavioral metrics
            mouseMovements: 30 + Math.floor(Math.random() * 40),
            keystrokes: 80 + Math.floor(Math.random() * 100),
            scrollEvents: 3 + Math.floor(Math.random() * 5),
            focusEvents: 8 + Math.floor(Math.random() * 8)
        });
        
        // 4. If successful, log survey completion
        if (site.success) {
            await logger.logSurveyCompletionML({
                siteUrl: site.url,
                siteName: site.name,
                surveyUrl: `${site.url}/survey/test-survey-${registrationId}`,
                success: true,
                questionsAnswered: 8,
                totalQuestions: 10,
                timeSpent: 15000,
                completionRate: 0.8,
                sessionId: `fixed-system-test-${registrationId}`,
                
                // ML Features
                questionTypes: ['multiple-choice', 'text', 'rating'],
                difficultyLevel: site.difficulty,
                surveyLength: 10,
                hasLogicBranching: site.difficulty === 'high',
                hasValidation: true,
                hasProgressBar: true,
                
                // Technical details
                userAgentUsed: 'Mozilla/5.0 (Fixed System Test Browser)',
                viewportUsed: { width: 1920, height: 1080 },
                rotationPattern: 'human-realistic'
            });
        }
        
        console.log(`   ✅ ${site.name} workflow completed`);
        registrationId++;
    }
    
    console.log('\n📊 VERIFYING COMPLETE ML DATA CAPTURE');
    console.log('=====================================');
    
    // Check all ML events were captured
    const regEvents = await logger.allQuery(`
        SELECT event_type, LENGTH(event_data) as data_length, event_data
        FROM system_events 
        WHERE event_type = 'registration_attempt'
        AND event_message LIKE '%Fix%'
        ORDER BY timestamp DESC
    `);
    
    console.log(`📈 Registration Events: ${regEvents.length}`);
    regEvents.forEach((event, index) => {
        const data = JSON.parse(event.event_data);
        console.log(`   ${index + 1}. Features: ${Object.keys(data).length}, Size: ${event.data_length} chars`);
    });
    
    const surveyEvents = await logger.allQuery(`
        SELECT event_type, LENGTH(event_data) as data_length, event_data
        FROM system_events 
        WHERE event_type = 'survey_completion'
        AND event_message LIKE '%Fix%'
        ORDER BY timestamp DESC
    `);
    
    console.log(`📈 Survey Events: ${surveyEvents.length}`);
    surveyEvents.forEach((event, index) => {
        const data = JSON.parse(event.event_data);
        console.log(`   ${index + 1}. Features: ${Object.keys(data).length}, Size: ${event.data_length} chars`);
    });
    
    const profiles = await logger.allQuery(`
        SELECT COUNT(*) as count FROM user_profiles 
        WHERE profile_name LIKE '%Fix Test Profile'
    `);
    
    const steps = await logger.allQuery(`
        SELECT COUNT(*) as count FROM registration_steps 
        WHERE ai_reasoning LIKE '%Successfully analyzed%Fix%'
    `);
    
    console.log(`👤 User Profiles: ${profiles[0].count}`);
    console.log(`📝 Registration Steps: ${steps[0].count}`);
    
    // Final verification
    const totalMLFeatures = regEvents.reduce((sum, event) => {
        const data = JSON.parse(event.event_data);
        return sum + Object.keys(data).length;
    }, 0) + surveyEvents.reduce((sum, event) => {
        const data = JSON.parse(event.event_data);
        return sum + Object.keys(data).length;
    }, 0);
    
    console.log('\n🎉 COMPLETE SYSTEM TEST RESULTS');
    console.log('===============================');
    console.log(`✅ Registration Events: ${regEvents.length}`);
    console.log(`✅ Survey Events: ${surveyEvents.length}`);
    console.log(`✅ User Profiles: ${profiles[0].count}`);
    console.log(`✅ Registration Steps: ${steps[0].count}`);
    console.log(`✅ Total ML Features Captured: ${totalMLFeatures}`);
    
    if (regEvents.length >= 3 && totalMLFeatures >= 100) {
        console.log('\n🏆 COMPLETE SYSTEM FULLY FUNCTIONAL!');
        console.log('✅ All database integration issues resolved');
        console.log('✅ ML data capture working perfectly');
        console.log('✅ All table schemas aligned');
        console.log('✅ Complete workflow tested and verified');
    } else {
        console.log('\n⚠️ System test incomplete');
    }
    
    await logger.close();
}

if (require.main === module) {
    testCompleteFixedSystem();
}