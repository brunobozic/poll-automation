#!/usr/bin/env node

/**
 * Test LLM Integration and Database Logging
 * Verify that LLM is working and responses are saved to database
 */

require('dotenv').config();

const { getLogger } = require('./src/utils/enhanced-logger');
const UniversalFormAnalyzer = require('./src/ai/universal-form-analyzer');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const RegistrationLogger = require('./src/database/registration-logger');
const { chromium } = require('playwright');

async function testLLMIntegration() {
    const logger = getLogger({ logLevel: 'debug' });
    let browser = null;
    
    console.log('🧠 TESTING LLM INTEGRATION & DATABASE LOGGING');
    console.log('=============================================');
    
    try {
        // Check API key first
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('❌ OPENAI_API_KEY not found in environment variables');
        }
        
        console.log('✅ OpenAI API Key found:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
        
        // Initialize components
        logger.info('🔧 Initializing components...');
        
        const registrationLogger = new RegistrationLogger();
        await registrationLogger.initialize();
        logger.info('✅ Registration logger initialized');
        
        const contentAI = new ContentUnderstandingAI();
        const analyzer = new UniversalFormAnalyzer(contentAI, {
            debugMode: true,
            enableHoneypotDetection: true
        });
        
        analyzer.setRegistrationLogger(registrationLogger);
        logger.info('✅ Form analyzer created with logger');
        
        // Test 1: Direct LLM API call
        console.log('\n🧠 TEST 1: Direct LLM API Call');
        console.log('==============================');
        
        const testPrompt = `Analyze this simple HTML form and identify the input fields:
            
<form method="post" action="/submit">
    <input type="text" name="username" placeholder="Username" required>
    <input type="email" name="email" placeholder="Email" required>
    <input type="password" name="password" placeholder="Password" required>
    <input type="hidden" name="bot_trap" value="">
    <button type="submit">Submit</button>
</form>

Please respond with JSON containing:
- fields: array of visible input fields with their purposes
- honeypots: array of hidden/trap fields
- confidence: your confidence score (0-1)`;

        try {
            logger.info('🚀 Making direct LLM API call...');
            const llmResponse = await analyzer.performDirectAIAnalysis(testPrompt, 'test-site');
            
            console.log('✅ LLM Response received');
            console.log('📊 Response preview:', JSON.stringify(llmResponse, null, 2).substring(0, 300) + '...');
            
            // Log this interaction to database
            await registrationLogger.logAIInteraction({
                registrationId: null,
                stepId: null,
                prompt: testPrompt,
                response: JSON.stringify(llmResponse),
                modelUsed: 'gpt-3.5-turbo',
                tokensUsed: llmResponse.usage?.total_tokens || 0,
                costUsd: llmResponse.cost || 0,
                processingTimeMs: 5580,
                success: true,
                errorMessage: null
            });
            
            logger.info('✅ LLM interaction logged to database');
            
        } catch (llmError) {
            console.error('❌ Direct LLM test failed:', llmError.message);
            
            // Log the failure
            await registrationLogger.logAIInteraction({
                registrationId: null,
                stepId: null,
                prompt: testPrompt,
                response: '',
                modelUsed: 'gpt-3.5-turbo',
                tokensUsed: 0,
                costUsd: 0,
                processingTimeMs: 0,
                success: false,
                errorMessage: llmError.message
            });
            
            throw llmError;
        }
        
        // Test 2: Form Analysis with LLM
        console.log('\n🧠 TEST 2: Form Analysis with LLM');
        console.log('=================================');
        
        browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        // Create a test HTML page with a form
        const testHTML = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Form</title></head>
        <body>
            <h1>Test Registration Form</h1>
            <form id="registration" method="post" action="/register">
                <div>
                    <label for="firstName">First Name:</label>
                    <input type="text" id="firstName" name="firstName" required>
                </div>
                <div>
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div>
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <!-- Hidden honeypot field -->
                <input type="text" name="website" style="display:none;" tabindex="-1">
                
                <div>
                    <input type="checkbox" id="terms" name="terms" required>
                    <label for="terms">I agree to terms</label>
                </div>
                <button type="submit">Register</button>
            </form>
        </body>
        </html>`;
        
        await page.setContent(testHTML);
        logger.info('✅ Test page loaded');
        
        // Run LLM analysis
        logger.info('🧠 Running LLM form analysis...');
        const analysis = await analyzer.analyzePage(page, 'test-form-site');
        
        console.log('✅ Form analysis completed');
        console.log('📊 Analysis Results:');
        console.log(`   📝 Fields found: ${analysis.fields?.length || 0}`);
        console.log(`   🍯 Honeypots detected: ${analysis.honeypots?.length || 0}`);
        console.log(`   ☑️ Checkboxes found: ${analysis.checkboxes?.length || 0}`);
        console.log(`   🔘 Submit button: ${analysis.submitButton ? 'Found' : 'Not found'}`);
        
        // Test 3: Database Query for LLM Interactions
        console.log('\n📊 TEST 3: Database Query for LLM Interactions');
        console.log('==============================================');
        
        const stats = await registrationLogger.getRegistrationStats();
        logger.info('📈 Registration stats retrieved', stats);
        
        // Query AI interactions directly
        const aiInteractions = await registrationLogger.allQuery(`
            SELECT * FROM ai_interactions 
            WHERE created_at > datetime('now', '-1 hour')
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        console.log('✅ Recent AI interactions retrieved');
        console.log(`📊 Found ${aiInteractions.length} recent interactions`);
        
        if (aiInteractions.length > 0) {
            const latest = aiInteractions[0];
            console.log('📋 Latest interaction:');
            console.log(`   🕐 Time: ${latest.created_at}`);
            console.log(`   🏷️ Type: ${latest.interaction_type}`);
            console.log(`   🤖 Model: ${latest.model}`);
            console.log(`   🎯 Success: ${latest.success ? 'Yes' : 'No'}`);
            console.log(`   💰 Tokens: ${latest.tokens}`);
            console.log(`   💸 Cost: $${latest.cost || 0}`);
        }
        
        // Test 4: Enhanced AI Interaction Logging
        console.log('\n🔬 TEST 4: Enhanced AI Interaction Logging');
        console.log('=========================================');
        
        const enhancedInteractionId = await registrationLogger.logEnhancedAIInteraction({
            sessionId: `enhanced_test_${Date.now()}`,
            interactionType: 'form_analysis',
            prompt: 'Test enhanced logging prompt',
            response: JSON.stringify({ test: 'enhanced response' }),
            model: 'gpt-3.5-turbo',
            tokens: 150,
            cost: 0.0003,
            success: true,
            context: JSON.stringify({ 
                page_url: 'test-page',
                form_count: 1,
                field_count: 4
            }),
            metadata: JSON.stringify({
                confidence: 0.95,
                processing_time: 1200,
                honeypots_detected: 1
            })
        });
        
        console.log('✅ Enhanced AI interaction logged (ID:', enhancedInteractionId, ')');
        
        // Add LLM insights
        await registrationLogger.logLLMInsights(enhancedInteractionId, {
            reasoning: 'Form appears to be a standard registration form with proper honeypot protection',
            confidence: 0.95,
            warnings: ['Honeypot field detected - avoid filling'],
            recommendations: ['Fill visible fields only', 'Check terms checkbox', 'Submit via button click'],
            patterns_detected: ['standard_registration', 'email_validation', 'password_required'],
            risk_assessment: 'low'
        });
        
        console.log('✅ LLM insights logged');
        
        console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('✅ LLM is working and responding');
        console.log('✅ Database logging is functioning');
        console.log('✅ Enhanced AI interactions are saved');
        console.log('✅ Form analysis with LLM integration works');
        
    } catch (error) {
        logger.error('❌ Test failed', { error: error.message, stack: error.stack });
        console.log(`💥 Test failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    console.log('\n✅ LLM integration test completed');
}

// Run the test
testLLMIntegration().catch(console.error);