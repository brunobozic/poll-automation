/**
 * Trace Logging Calls
 * Trace exactly what's being passed to logSystemEvent
 */

const RegistrationLogger = require('./src/database/registration-logger.js');

async function traceLoggingCalls() {
    console.log('🔍 TRACING LOGGING CALLS');
    console.log('========================');
    
    const logger = new RegistrationLogger();
    await logger.initialize();
    
    // Override logSystemEvent to trace input
    const originalLogSystemEvent = logger.logSystemEvent.bind(logger);
    logger.logSystemEvent = function(eventData) {
        console.log('🔍 logSystemEvent called with:');
        console.log('   Type of parameter:', typeof eventData);
        console.log('   Parameter keys:', Object.keys(eventData || {}));
        console.log('   Full parameter:', JSON.stringify(eventData, null, 2));
        
        return originalLogSystemEvent(eventData);
    };
    
    console.log('\\n1. Testing direct logSystemEvent call...');
    await logger.logSystemEvent({
        sessionId: 'trace-session',
        eventType: 'trace_test',
        eventData: { trace: 'data', count: 42 },
        severity: 'info',
        sourceComponent: 'tracer',
        message: 'Direct trace test'
    });
    
    console.log('\\n2. Testing logRegistrationAttempt call...');
    await logger.logRegistrationAttempt({
        siteUrl: 'https://trace-test.com',
        siteName: 'TraceTestSite',
        success: true,
        stepsCompleted: 3,
        timeSpent: 8000,
        
        // ML Features
        difficulty: 'trace-level',
        formFieldCount: 7,
        userAgentUsed: 'TraceAgent/1.0'
    });
    
    await logger.close();
}

if (require.main === module) {
    traceLoggingCalls();
}