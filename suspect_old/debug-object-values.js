/**
 * Debug Object Values
 * Test why object properties aren't being extracted correctly
 */

function debugObjectValues() {
    console.log('🔍 DEBUGGING OBJECT VALUE EXTRACTION');
    console.log('====================================');
    
    const eventData = {
        sessionId: 'debug-logger-session',
        eventType: 'debug_logger_test',
        eventData: { 
            testFeature: 'value',
            mlData: { field1: 'test', field2: 123 }
        },
        severity: 'warning',
        sourceComponent: 'debug_logger',
        message: 'RegistrationLogger test event'
    };
    
    console.log('Original eventData object:');
    console.log(JSON.stringify(eventData, null, 2));
    
    console.log('\nExtracting values:');
    console.log(`sessionId: "${eventData.sessionId}" (${typeof eventData.sessionId})`);
    console.log(`eventType: "${eventData.eventType}" (${typeof eventData.eventType})`);
    console.log(`eventData: ${JSON.stringify(eventData.eventData)} (${typeof eventData.eventData})`);
    console.log(`severity: "${eventData.severity}" (${typeof eventData.severity})`);
    console.log(`sourceComponent: "${eventData.sourceComponent}" (${typeof eventData.sourceComponent})`);
    console.log(`message: "${eventData.message}" (${typeof eventData.message})`);
    
    console.log('\nUsing || operator fallbacks:');
    console.log(`sessionId || null: ${eventData.sessionId || null}`);
    console.log(`eventType || 'system': ${eventData.eventType || 'system'}`);
    console.log(`severity || 'info': ${eventData.severity || 'info'}`);
    console.log(`sourceComponent || 'unknown': ${eventData.sourceComponent || 'unknown'}`);
    console.log(`message || 'System event': ${eventData.message || 'System event'}`);
    
    // Test JSON.stringify
    console.log('\nJSON.stringify tests:');
    console.log(`JSON.stringify(eventData.eventData || {}): ${JSON.stringify(eventData.eventData || {})}`);
    console.log(`Length: ${JSON.stringify(eventData.eventData || {}).length}`);
    
    // Final values array
    const values = [
        eventData.sessionId || null,
        eventData.eventType || 'system',
        JSON.stringify(eventData.eventData || {}),
        eventData.severity || 'info',
        eventData.sourceComponent || 'unknown',
        eventData.message || 'System event'
    ];
    
    console.log('\nFinal values array:');
    console.log(JSON.stringify(values, null, 2));
}

if (require.main === module) {
    debugObjectValues();
}