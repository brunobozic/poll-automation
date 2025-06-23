#!/usr/bin/env node

/**
 * Test Enhanced Logging and LLM API Key Detection
 */

require('dotenv').config();

// Test the enhanced logger
const { getLogger } = require('./src/utils/enhanced-logger');
const UniversalFormAnalyzer = require('./src/ai/universal-form-analyzer');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');

async function testEnhancedLogging() {
    console.log('🧪 Testing Enhanced Logging System');
    console.log('================================');
    
    // Initialize logger
    const logger = getLogger({
        logLevel: 'debug',
        enableConsole: true,
        enableFile: true,
        colorOutput: true
    });
    
    // Test basic logging
    logger.info('Testing enhanced logger initialization');
    logger.warn('This is a warning message', { testData: 'warning test' });
    logger.error('This is an error message', { testData: 'error test' });
    logger.debug('This is a debug message', { testData: 'debug test' });
    
    // Test system status
    logger.logSystemStatus();
    
    // Test component logging
    logger.logComponentInit('TestComponent', { setting1: 'value1', setting2: 'value2' });
    
    console.log('\n🔑 Testing API Key Detection');
    console.log('===========================');
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log('❌ No API key found - testing error handling');
        logger.error('API Key Missing Test', {
            solution: 'Set OPENAI_API_KEY in .env file',
            example: 'OPENAI_API_KEY=sk-proj-...'
        });
    } else {
        const keyPreview = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
        console.log(`✅ API key present: ${keyPreview}`);
        logger.info('API Key Present', { keyPreview });
        
        // Test actual LLM call
        console.log('\n🤖 Testing LLM API Call');
        console.log('=====================');
        
        try {
            const contentAI = new ContentUnderstandingAI();
            const formAnalyzer = new UniversalFormAnalyzer(contentAI, {
                debugMode: true,
                enableHoneypotDetection: true
            });
            
            // Test a simple direct API call
            const testPrompt = `Test prompt to verify API connection. Respond with simple JSON: {"status": "connected", "message": "API working"}`;
            
            logger.info('Sending test prompt to LLM API');
            
            const response = await formAnalyzer.performDirectAIAnalysis(testPrompt, 'test-site');
            
            logger.info('LLM API Response Received', {
                responseLength: response?.length || 0,
                responseType: typeof response
            });
            
            console.log('✅ LLM API call successful');
            console.log(`📝 Response: ${response.substring(0, 200)}...`);
            
        } catch (error) {
            logger.logComponentError('LLM_API_Test', error, {
                apiKeyPresent: !!apiKey,
                errorType: error.name,
                httpStatus: error.response?.status
            });
            
            console.log(`❌ LLM API call failed: ${error.message}`);
            
            // Test our enhanced error handling
            if (error.response?.status === 401) {
                console.log('🔐 Authentication error detected by enhanced logging');
            } else if (error.response?.status === 429) {
                console.log('⏰ Rate limit error detected by enhanced logging');
            } else if (!error.response) {
                console.log('🌐 Network error detected by enhanced logging');
            }
        }
    }
    
    console.log('\n📊 Logger Statistics');
    console.log('==================');
    const stats = logger.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n✅ Enhanced logging test completed');
}

// Run the test
testEnhancedLogging().catch(console.error);