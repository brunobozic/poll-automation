#!/usr/bin/env node

/**
 * Simple usage example for AI-driven poll automation
 * Shows how easy it is to automate any poll site with AI
 */

const AIPollAutomation = require('../src/ai/ai-poll-automation');

async function main() {
    console.log('🤖 AI Poll Automation - Simple Usage Example\n');
    
    // Example 1: Basic usage
    console.log('📋 Example 1: Basic Poll Automation');
    try {
        const result = await AIPollAutomation.run('http://localhost:3001', {
            debug: true
        });
        
        if (result.success) {
            console.log(`✅ Success! Answered ${result.sessionData.questionsAnswered} questions`);
            console.log(`💰 Cost: $${result.sessionData.cost.toFixed(4)}`);
        } else {
            console.log(`❌ Failed: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 2: Advanced usage with custom options
    console.log('📋 Example 2: Advanced Usage with Options');
    
    const automation = new AIPollAutomation({
        apiKey: process.env.OPENAI_API_KEY, // Your OpenAI API key
        debug: true,                        // Enable debug logging
        maxSteps: 30,                      // Maximum automation steps
        timeout: 300000                    // 5 minute timeout
    });
    
    try {
        const result = await automation.automatePoll('http://localhost:3001/login', {
            persona: 'professional',           // Answer style
            proxy: {                          // Optional proxy
                server: 'http://proxy:8080',
                username: 'user',
                password: 'pass'
            }
        });
        
        if (result.success) {
            console.log('✅ Advanced automation completed!');
            
            // Detailed results
            const session = result.sessionData;
            const performance = session.performance;
            
            console.log(`📊 Results:`);
            console.log(`   Questions answered: ${session.questionsAnswered}`);
            console.log(`   Total steps: ${session.steps.length}`);
            console.log(`   Duration: ${(session.duration / 1000).toFixed(1)}s`);
            console.log(`   AI cost: $${session.cost.toFixed(4)}`);
            console.log(`   Questions/minute: ${performance.questionsPerMinute.toFixed(1)}`);
            console.log(`   Cost per question: $${performance.costPerQuestion.toFixed(4)}`);
            
        } else {
            console.log(`❌ Failed: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 3: Batch processing multiple polls
    console.log('📋 Example 3: Batch Processing Multiple Polls');
    
    const pollUrls = [
        'http://localhost:3001',
        'http://localhost:3001/poll/1',
        'http://localhost:3001/poll/2'
    ];
    
    const results = [];
    
    for (const [index, url] of pollUrls.entries()) {
        console.log(`Processing poll ${index + 1}/${pollUrls.length}: ${url}`);
        
        try {
            const result = await AIPollAutomation.run(url, {
                debug: false,
                maxSteps: 20
            });
            
            results.push({
                url,
                success: result.success,
                questionsAnswered: result.sessionData?.questionsAnswered || 0,
                cost: result.sessionData?.cost || 0,
                duration: result.sessionData?.duration || 0
            });
            
            console.log(`   ${result.success ? '✅' : '❌'} ${url}`);
            
        } catch (error) {
            console.log(`   ❌ ${url} - Error: ${error.message}`);
            results.push({
                url,
                success: false,
                error: error.message
            });
        }
    }
    
    // Batch summary
    console.log('\n📊 Batch Processing Summary:');
    const successful = results.filter(r => r.success);
    const totalQuestions = successful.reduce((sum, r) => sum + r.questionsAnswered, 0);
    const totalCost = successful.reduce((sum, r) => sum + r.cost, 0);
    const totalTime = successful.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`   Success rate: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
    console.log(`   Total questions: ${totalQuestions}`);
    console.log(`   Total cost: $${totalCost.toFixed(4)}`);
    console.log(`   Total time: ${(totalTime/1000).toFixed(1)}s`);
    console.log(`   Average cost per poll: $${(totalCost/successful.length).toFixed(4)}`);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example 4: Error handling and monitoring
    console.log('📋 Example 4: Error Handling and Monitoring');
    
    const monitoredAutomation = new AIPollAutomation({
        debug: true
    });
    
    try {
        // Monitor health before running
        const health = await monitoredAutomation.healthCheck();
        console.log(`🏥 System health: ${health.overall}`);
        
        const result = await monitoredAutomation.automatePoll('http://localhost:3001');
        
        // Get detailed AI statistics
        const aiStats = monitoredAutomation.getAIStats();
        console.log(`🤖 AI Statistics:`);
        console.log(`   Total requests: ${aiStats.requestCount}`);
        console.log(`   Error rate: ${(aiStats.errorRate * 100).toFixed(1)}%`);
        console.log(`   Avg cost per request: $${aiStats.averageCostPerRequest.toFixed(4)}`);
        
        if (result.success) {
            console.log(`✅ Monitoring example completed successfully`);
        }
        
    } catch (error) {
        console.log(`❌ Monitoring example failed: ${error.message}`);
    }
    
    console.log('\n🎉 All examples completed!');
    console.log('\n💡 Key Benefits of AI-driven automation:');
    console.log('   • Zero configuration required');
    console.log('   • Works with any poll site automatically');
    console.log('   • Cost-effective (~$0.01-0.03 per poll)');
    console.log('   • Handles complex sites (SPAs, modals, etc.)');
    console.log('   • Automatic error recovery');
    console.log('   • Human-like responses');
    console.log('   • Real-time adaptation to site changes');
}

// Helper function to demonstrate real-world usage
async function realWorldExample() {
    console.log('\n🌐 Real-world Example (commented out):');
    console.log('/*');
    console.log('// Automate actual poll sites');
    console.log('const polls = [');
    console.log('    "https://www.surveymonkey.com/r/example1",');
    console.log('    "https://forms.gle/example2",');
    console.log('    "https://www.pollfish.com/example3"');
    console.log('];');
    console.log('');
    console.log('for (const pollUrl of polls) {');
    console.log('    const result = await AIPollAutomation.run(pollUrl, {');
    console.log('        persona: "young_professional",');
    console.log('        proxy: { server: "http://your-proxy:8080" }');
    console.log('    });');
    console.log('    ');
    console.log('    console.log(`${pollUrl}: ${result.success ? "✅" : "❌"}`);');
    console.log('}');
    console.log('*/');
}

if (require.main === module) {
    main()
        .then(() => realWorldExample())
        .catch(console.error);
}

module.exports = { main };