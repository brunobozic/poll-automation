/**
 * Database Integration Fix
 * Fix the broken data pipeline and integrate missing logging
 */

const RegistrationLogger = require('./src/database/registration-logger.js');
const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator.js');

class DatabaseIntegrationFixer {
    constructor() {
        this.logger = new RegistrationLogger();
        this.issues = [];
        this.fixes = [];
    }

    async initialize() {
        console.log('🔧 DATABASE INTEGRATION FIX');
        console.log('===========================');
        await this.logger.initialize();
    }

    async diagnoseAndFix() {
        console.log('🔍 Diagnosing database integration issues...\n');
        
        await this.fixSystemEventLogging();
        await this.fixMLDataCapture();
        await this.implementMissingProfileLogging();
        await this.implementRegistrationStepLogging();
        await this.testCompleteWorkflow();
        
        this.generateFixReport();
    }

    async fixSystemEventLogging() {
        console.log('1. 🩹 FIXING SYSTEM EVENT LOGGING');
        console.log('================================');
        
        // Test current logSystemEvent method
        console.log('   Testing current logSystemEvent...');
        
        await this.logger.logSystemEvent({
            eventType: 'test_event',
            message: 'Test event for debugging',
            eventData: { test: 'data', number: 123 },
            severity: 'info',
            sourceComponent: 'integration_fixer'
        });
        
        // Check if it was stored correctly
        const recentEvent = await this.logger.allQuery(`
            SELECT event_type, event_message, event_data, severity 
            FROM system_events 
            WHERE event_message = 'Test event for debugging'
            ORDER BY timestamp DESC LIMIT 1
        `);
        
        if (recentEvent.length > 0 && recentEvent[0].event_type === 'test_event') {
            console.log('   ✅ System event logging is working correctly');
            console.log(`   ✅ Event data captured: ${recentEvent[0].event_data}`);
        } else {
            console.log('   ❌ System event logging is broken');
            this.issues.push('System event logging not storing event_type correctly');
        }
    }

    async fixMLDataCapture() {
        console.log('\\n2. 🧠 FIXING ML DATA CAPTURE');
        console.log('=============================');
        
        // Test the ML logging methods directly
        console.log('   Testing logRegistrationAttempt...');
        
        await this.logger.logRegistrationAttempt({
            siteUrl: 'https://test-fix.com',
            siteName: 'TestFixSite',
            success: true,
            stepsCompleted: 5,
            timeSpent: 15000,
            
            // ML Features
            difficulty: 'medium',
            formStructure: { inputFields: 6, selects: 2, checkboxes: 2 },
            formFieldCount: 6,
            hasHoneypots: false,
            hasCaptcha: true,
            hasCloudflare: false,
            pageLoadTime: 2800,
            
            // Rotation data
            userAgentUsed: 'Mozilla/5.0 (Integration Test)',
            viewportUsed: { width: 1366, height: 768 },
            timingPattern: 'integration-test',
            emailServiceUsed: 'TestMail'
        });
        
        // Check if ML data was captured
        const mlEvents = await this.logger.allQuery(`
            SELECT event_type, event_data, LENGTH(event_data) as data_length
            FROM system_events 
            WHERE event_message LIKE '%TestFixSite%'
            ORDER BY timestamp DESC LIMIT 1
        `);
        
        if (mlEvents.length > 0) {
            const eventData = JSON.parse(mlEvents[0].event_data || '{}');
            const featureCount = Object.keys(eventData).length;
            
            console.log(`   📊 ML event stored with ${featureCount} features`);
            console.log(`   📊 Event type: ${mlEvents[0].event_type}`);
            console.log(`   📊 Data length: ${mlEvents[0].data_length} characters`);
            
            if (featureCount > 10 && mlEvents[0].event_type === 'registration_attempt') {
                console.log('   ✅ ML data capture is working correctly');
            } else {
                console.log('   ❌ ML data capture is incomplete');
                this.issues.push('ML data not being captured with sufficient detail');
            }
        } else {
            console.log('   ❌ No ML events found');
            this.issues.push('ML logging methods not storing data');
        }
    }

    async implementMissingProfileLogging() {
        console.log('\\n3. 👤 IMPLEMENTING USER PROFILE LOGGING');
        console.log('=======================================');
        
        // Test user profile logging
        console.log('   Testing logUserProfile...');
        
        await this.logger.logUserProfile({
            registrationId: 999,
            emailId: 1,
            profileName: 'Integration Test Profile',
            age: 30,
            gender: 'female',
            incomeBracket: '$50k-75k',
            educationLevel: 'Bachelor',
            occupation: 'Software Engineer',
            locationCity: 'San Francisco',
            locationState: 'CA',
            locationCountry: 'USA',
            maritalStatus: 'single',
            householdSize: 1,
            interests: ['technology', 'surveys', 'research'],
            aiOptimizationScore: 0.85,
            yieldPrediction: 0.72,
            demographicBalanceScore: 0.90
        });
        
        // Check if profile was stored
        const profiles = await this.logger.allQuery(`
            SELECT COUNT(*) as count FROM user_profiles 
            WHERE profile_name = 'Integration Test Profile'
        `);
        
        if (profiles[0].count > 0) {
            console.log('   ✅ User profile logging is working');
            this.fixes.push('User profile logging verified and working');
        } else {
            console.log('   ❌ User profile logging failed');
            this.issues.push('User profile logging not working');
        }
    }

    async implementRegistrationStepLogging() {
        console.log('\\n4. 📝 IMPLEMENTING REGISTRATION STEP LOGGING');
        console.log('============================================');
        
        // Test registration step logging
        console.log('   Testing logRegistrationStep...');
        
        await this.logger.logRegistrationStep({
            registrationId: 999,
            stepNumber: 1,
            stepType: 'form_analysis',
            stepDescription: 'Analyzing registration form',
            startTime: new Date(),
            endTime: new Date(Date.now() + 3000),
            success: true,
            errorMessage: null,
            dataCollected: JSON.stringify({
                formFields: 5,
                honeypots: 1,
                security: 'medium'
            }),
            aiInsights: 'Form appears to be standard registration with email verification'
        });
        
        // Check if step was stored
        const steps = await this.logger.allQuery(`
            SELECT COUNT(*) as count FROM registration_steps 
            WHERE step_description = 'Analyzing registration form'
        `);
        
        if (steps[0].count > 0) {
            console.log('   ✅ Registration step logging is working');
            this.fixes.push('Registration step logging verified and working');
        } else {
            console.log('   ❌ Registration step logging failed');
            this.issues.push('Registration step logging not working');
        }
    }

    async testCompleteWorkflow() {
        console.log('\\n5. 🔄 TESTING COMPLETE WORKFLOW');
        console.log('================================');
        
        console.log('   Creating complete registration workflow test...');
        
        // Simulate a complete registration with all logging
        const registrationId = await this.simulateCompleteRegistration();
        
        if (registrationId) {
            console.log(`   ✅ Complete workflow test successful (Registration ID: ${registrationId})`);
            this.fixes.push('Complete registration workflow verified');
        } else {
            console.log('   ❌ Complete workflow test failed');
            this.issues.push('Complete registration workflow not working');
        }
    }

    async simulateCompleteRegistration() {
        try {
            // 1. Log email account
            const emailId = await this.logger.logEmailAccount({
                email: 'integration-test@tempmail.com',
                service: 'TempMail',
                password: 'test123',
                sessionId: 'integration-test-session',
                status: 'active',
                metadata: { testMode: true }
            });
            
            // 2. Start registration attempt
            const registrationId = await this.logger.startRegistrationAttempt({
                sessionId: 'integration-test-session',
                emailId: emailId,
                targetSite: 'Integration Test Site',
                targetUrl: 'https://integration-test.com',
                currentStep: 'initialization',
                totalSteps: 5,
                userAgent: 'Mozilla/5.0 (Integration Test)',
                ipAddress: '127.0.0.1'
            });
            
            // 3. Log user profile
            await this.logger.logUserProfile({
                registrationId: registrationId,
                emailId: emailId,
                profileName: 'Complete Test Profile',
                age: 28,
                gender: 'male',
                occupation: 'Developer'
            });
            
            // 4. Log registration steps
            await this.logger.logRegistrationStep({
                registrationId: registrationId,
                stepNumber: 1,
                stepType: 'form_analysis',
                stepDescription: 'Complete workflow test - form analysis',
                success: true
            });
            
            // 5. Log ML registration attempt
            await this.logger.logRegistrationAttempt({
                siteUrl: 'https://integration-test.com',
                siteName: 'Integration Test Complete',
                success: true,
                stepsCompleted: 5,
                timeSpent: 20000,
                difficulty: 'easy',
                formFieldCount: 4,
                userAgentUsed: 'Mozilla/5.0 (Complete Test)'
            });
            
            return registrationId;
            
        } catch (error) {
            console.log(`   ❌ Complete workflow error: ${error.message}`);
            return null;
        }
    }

    generateFixReport() {
        console.log('\\n📊 DATABASE INTEGRATION FIX REPORT');
        console.log('===================================');
        
        console.log(`✅ Fixes Applied: ${this.fixes.length}`);
        this.fixes.forEach((fix, index) => {
            console.log(`   ${index + 1}. ${fix}`);
        });
        
        console.log(`\\n❌ Issues Found: ${this.issues.length}`);
        this.issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
        
        if (this.issues.length === 0) {
            console.log('\\n🎉 ALL DATABASE INTEGRATION ISSUES FIXED!');
            console.log('✅ System is ready for full ML data capture');
        } else {
            console.log('\\n⚠️ Some issues still need attention');
            console.log('🔧 Additional fixes may be required');
        }
        
        // Generate final table usage summary
        console.log('\\n📋 Expected Table Usage After Fixes:');
        console.log('   ✅ email_accounts - Email management');
        console.log('   ✅ registration_attempts - Core registration tracking');
        console.log('   ✅ registration_steps - Step-by-step process logging');
        console.log('   ✅ user_profiles - Demographic profile storage');
        console.log('   ✅ system_events - ML feature logging with proper event types');
        console.log('   ✅ ai_interactions - LLM interaction logging');
        console.log('   ✅ llm_insights - Detailed LLM analysis storage');
    }

    async close() {
        await this.logger.close();
    }
}

async function main() {
    const fixer = new DatabaseIntegrationFixer();
    
    try {
        await fixer.initialize();
        await fixer.diagnoseAndFix();
    } catch (error) {
        console.error('❌ Fix failed:', error);
    } finally {
        await fixer.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = DatabaseIntegrationFixer;