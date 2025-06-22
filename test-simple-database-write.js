#!/usr/bin/env node

/**
 * Simple Database Write Test
 * Directly tests writing to the database to verify if there are connection or transaction issues
 */

const RegistrationLogger = require('./src/database/registration-logger');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function testDatabaseWrite() {
    console.log('🧪 Testing direct database write operations...');
    
    let logger = null;
    
    try {
        // Initialize the registration logger
        logger = new RegistrationLogger('./data/polls.db');
        await logger.initialize();
        console.log('✅ Registration logger initialized');
        
        // Test 1: Insert an email account
        console.log('\n📧 Test 1: Creating email account...');
        const emailId = await logger.logEmailAccount({
            email: 'test@example.com',
            service: 'test_service',
            password: 'test_password',
            sessionId: 'test_session_123',
            status: 'active',
            metadata: { test: true }
        });
        console.log(`✅ Email account created with ID: ${emailId}`);
        
        // Test 2: Start a registration attempt
        console.log('\n🎯 Test 2: Starting registration attempt...');
        const registrationId = await logger.startRegistrationAttempt({
            sessionId: 'test_session_123',
            emailId: emailId,
            targetSite: 'test.example.com',
            targetUrl: 'https://test.example.com',
            currentStep: 'initialization',
            totalSteps: 3,
            userAgent: 'Test Agent',
            ipAddress: '127.0.0.1'
        });
        console.log(`✅ Registration attempt started with ID: ${registrationId}`);
        
        // Test 3: Log a registration step
        console.log('\n👣 Test 3: Logging registration step...');
        const stepId = await logger.logRegistrationStep({
            registrationId: registrationId,
            stepNumber: 1,
            stepName: 'form_analysis',
            stepType: 'llm_analysis',
            status: 'completed',
            inputData: { url: 'https://test.example.com' },
            outputData: { fields_found: 5 },
            aiAnalysis: 'Test AI analysis result',
            durationMs: 1500
        });
        console.log(`✅ Registration step logged with ID: ${stepId}`);
        
        // Test 4: Log an AI interaction
        console.log('\n🤖 Test 4: Logging AI interaction...');
        const aiId = await logger.logEnhancedAIInteraction({
            registrationId: registrationId,
            stepId: stepId,
            interactionType: 'form_analysis',
            prompt: 'Analyze the following form: <form>...</form>',
            response: 'This form contains 5 fields: email, name, phone, address, submit',
            modelUsed: 'gpt-4',
            tokensUsed: 150,
            inputTokens: 75,
            outputTokens: 75,
            costUsd: 0.003,
            processingTimeMs: 1200,
            success: true,
            confidenceScore: 0.85,
            responseQualityScore: 0.90,
            insightData: {
                field_analysis: 'Form is well structured',
                honeypot_detection: 'No honeypots detected'
            }
        });
        console.log(`✅ AI interaction logged with ID: ${aiId}`);
        
        // Test 5: Log a failure
        console.log('\n❌ Test 5: Logging failure...');
        await logger.logRegistrationFailure(registrationId, {
            errorMessage: 'Test error for verification',
            failureReason: 'Element not found during test',
            llmAnalysis: 'This was a deliberate test failure'
        });
        console.log(`✅ Failure logged successfully`);
        
        // Test 6: Verify data was written
        console.log('\n🔍 Test 6: Verifying data was written...');
        const stats = await logger.getRegistrationStats();
        console.log('📊 Registration Statistics:');
        console.log(`   Total Attempts: ${stats.totalAttempts?.[0]?.count || 0}`);
        console.log(`   Successful Attempts: ${stats.successfulAttempts?.[0]?.count || 0}`);
        console.log(`   Recent Attempts: ${stats.recentAttempts?.length || 0}`);
        
        // Test 7: Query AI interactions directly
        console.log('\n🧠 Test 7: Querying AI interactions...');
        const aiInteractions = await logger.allQuery(`
            SELECT COUNT(*) as count FROM ai_interactions
        `);
        console.log(`   AI Interactions in database: ${aiInteractions[0]?.count || 0}`);
        
        // Test 8: Query all table counts
        console.log('\n📋 Test 8: Table counts...');
        const tables = [
            'email_accounts', 'registration_attempts', 'registration_steps', 
            'ai_interactions', 'llm_insights', 'registration_failures'
        ];
        
        for (const table of tables) {
            try {
                const result = await logger.allQuery(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ${table}: ${result[0]?.count || 0} records`);
            } catch (error) {
                console.log(`   ${table}: Error - ${error.message}`);
            }
        }
        
        console.log('\n✅ All database write tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Database write test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        if (logger) {
            await logger.close();
        }
    }
}

// Run the test
testDatabaseWrite().catch(console.error);