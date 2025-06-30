/**
 * Test ML Logging Data Capture
 * Verify that enhanced ML logging methods are working
 */

const RegistrationLogger = require('./src/database/registration-logger.js');

async function testMLLogging() {
    console.log('🧪 TESTING ML LOGGING DATA CAPTURE');
    console.log('==================================');
    
    const logger = new RegistrationLogger();
    
    try {
        await logger.initialize();
        
        // Test registration attempt logging
        console.log('📝 Testing registration attempt logging...');
        await logger.logRegistrationAttempt({
            siteUrl: 'https://test-site.com',
            siteName: 'TestSite',
            success: true,
            stepsCompleted: 4,
            timeSpent: 12000,
            
            // ML Features
            difficulty: 'medium',
            formStructure: { inputFields: 5, selects: 2, checkboxes: 1 },
            formFieldCount: 5,
            hasHoneypots: true,
            hasCaptcha: false,
            hasCloudflare: true,
            pageLoadTime: 3200,
            
            // Rotation data
            userAgentUsed: 'Mozilla/5.0 (Test Browser)',
            viewportUsed: { width: 1920, height: 1080 },
            timingPattern: 'human-standard',
            emailServiceUsed: 'TempMail'
        });
        
        // Test survey completion logging
        console.log('📋 Testing survey completion logging...');
        await logger.logSurveyCompletion({
            siteUrl: 'https://test-site.com',
            siteName: 'TestSite',
            surveyUrl: 'https://test-site.com/survey/123',
            success: true,
            questionsAnswered: 8,
            totalQuestions: 10,
            timeSpent: 18000,
            completionRate: 0.8,
            
            // ML Features
            questionTypes: ['multiple-choice', 'text', 'rating'],
            difficultyLevel: 'medium',
            surveyLength: 10,
            hasLogicBranching: true,
            hasValidation: false,
            hasProgressBar: true,
            
            // Technical details
            userAgentUsed: 'Mozilla/5.0 (Test Browser)',
            viewportUsed: { width: 1920, height: 1080 },
            rotationPattern: 'human-standard'
        });
        
        // Check what was stored
        console.log('\\n🔍 Checking stored data...');
        const recentEvents = await logger.allQuery(`
            SELECT event_type, event_message, LENGTH(event_data) as data_length, event_data 
            FROM system_events 
            WHERE event_type IN ('registration_attempt', 'survey_completion')
            ORDER BY timestamp DESC 
            LIMIT 2
        `);
        
        console.log(`✅ Found ${recentEvents.length} events in database`);
        
        recentEvents.forEach((event, index) => {
            console.log(`\\n📊 Event ${index + 1}:`);
            console.log(`   Type: ${event.event_type}`);
            console.log(`   Message: ${event.event_message}`);
            console.log(`   Data Length: ${event.data_length} characters`);
            
            if (event.event_data && event.event_data !== '{}') {
                try {
                    const data = JSON.parse(event.event_data);
                    console.log(`   ML Features Count: ${Object.keys(data).length}`);
                    console.log(`   Sample Features: ${Object.keys(data).slice(0, 5).join(', ')}`);
                    
                    if (event.event_type === 'registration_attempt') {
                        console.log(`   ✅ Registration ML data: difficulty=${data.difficulty}, formFieldCount=${data.formFieldCount}`);
                    } else {
                        console.log(`   ✅ Survey ML data: questionsAnswered=${data.questionsAnswered}, completionRate=${data.completionRate}`);
                    }
                } catch (e) {
                    console.log(`   ❌ Error parsing event_data: ${e.message}`);
                }
            } else {
                console.log(`   ❌ Event data is empty or null`);
            }
        });
        
        if (recentEvents.length === 2 && 
            recentEvents.every(e => e.event_data && e.event_data !== '{}')) {
            console.log('\\n🎉 ML LOGGING TEST: SUCCESS');
            console.log('✅ Both registration and survey ML data captured correctly');
        } else {
            console.log('\\n❌ ML LOGGING TEST: FAILED');
            console.log('⚠️ ML data not being captured properly');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await logger.close();
    }
}

if (require.main === module) {
    testMLLogging();
}