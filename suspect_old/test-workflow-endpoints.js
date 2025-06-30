#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testWorkflowEndpoints() {
    console.log('🧪 Testing Workflow Endpoints\n');
    
    try {
        // Test 1: Create emails first
        console.log('1. Creating test emails...');
        const emailResponse = await axios.post(`${BASE_URL}/api/emails`, {
            count: 3,
            provider: 'guerrilla'
        });
        
        console.log(`✅ Created ${emailResponse.data.results.length} emails`);
        const emailIds = emailResponse.data.results
            .filter(r => r.success)
            .map(r => r.emailId);
        
        if (emailIds.length === 0) {
            console.log('❌ No emails created, skipping persona test');
            return;
        }
        
        console.log(`   Email IDs: ${emailIds.join(', ')}\n`);
        
        // Test 2: Create personas
        console.log('2. Creating personas for emails...');
        const personaResponse = await axios.post(`${BASE_URL}/api/workflow/create-personas`, {
            emailIds: emailIds,
            personaTypes: ['young_professional', 'parent', 'student'],
            optimizeFor: ['technology', 'consumer_goods']
        });
        
        console.log(`✅ Persona creation: ${personaResponse.data.message}`);
        console.log(`   Created: ${personaResponse.data.results.created} personas\n`);
        
        // Test 3: Add test survey sites
        console.log('3. Adding test survey sites...');
        const sitesResponse = await axios.post(`${BASE_URL}/api/survey-sites`, {
            sites: [
                {
                    name: 'Test Survey Platform',
                    url: 'https://test-surveys.com/register',
                    category: 'test'
                },
                {
                    name: 'Demo Poll Site',
                    url: 'https://demo-polls.com/signup',
                    category: 'demo'
                }
            ]
        });
        
        console.log(`✅ Added survey sites`);
        const siteIds = sitesResponse.data.results
            .filter(r => r.success)
            .map(r => r.siteId);
        console.log(`   Site IDs: ${siteIds.join(', ')}\n`);
        
        if (siteIds.length === 0) {
            console.log('❌ No sites created, skipping registration test');
            return;
        }
        
        // Test 4: Test registration workflow (quick test mode)
        console.log('4. Testing registration workflow...');
        const registrationResponse = await axios.post(`${BASE_URL}/api/workflow/register-sites`, {
            siteIds: siteIds,
            emailIds: emailIds.slice(0, 2), // Only use first 2 emails
            useUnusedOnly: false,
            headless: true,
            maxConcurrent: 1
        });
        
        console.log(`✅ Registration workflow: ${registrationResponse.data.message}`);
        console.log(`   Job ID: ${registrationResponse.data.jobId}`);
        console.log(`   Status: ${registrationResponse.data.results.status}\n`);
        
        // Test 5: Check job status
        const jobId = registrationResponse.data.jobId;
        console.log('5. Checking job status...');
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const statusResponse = await axios.get(`${BASE_URL}/api/workflow/status/${jobId}`);
        console.log(`✅ Job status: ${statusResponse.data.status.status}`);
        console.log(`   Progress: ${statusResponse.data.status.progress}%`);
        console.log(`   Elapsed: ${statusResponse.data.status.elapsed}s\n`);
        
        // Test 6: Find surveys
        console.log('6. Testing survey discovery...');
        const surveyDiscoveryResponse = await axios.post(`${BASE_URL}/api/workflow/find-surveys`, {
            emailIds: emailIds,
            categories: ['technology', 'consumer_goods'],
            minReward: 1.0
        });
        
        console.log(`✅ Survey discovery: ${surveyDiscoveryResponse.data.message}`);
        console.log(`   Surveys found: ${surveyDiscoveryResponse.data.results.surveysFound.length}`);
        
        if (surveyDiscoveryResponse.data.results.surveysFound.length > 0) {
            const survey = surveyDiscoveryResponse.data.results.surveysFound[0];
            console.log(`   First survey: "${survey.title}" - $${survey.reward}\n`);
            
            // Test 7: Complete surveys
            console.log('7. Testing survey completion...');
            const surveyIds = surveyDiscoveryResponse.data.results.surveysFound
                .slice(0, 2) // Only test first 2 surveys
                .map(s => s.id);
            
            const completionResponse = await axios.post(`${BASE_URL}/api/workflow/complete-surveys`, {
                surveyIds: surveyIds,
                autoSelectPersonas: true,
                qualityMode: 'fast'
            });
            
            console.log(`✅ Survey completion: ${completionResponse.data.message}`);
            console.log(`   Job ID: ${completionResponse.data.jobId}`);
            console.log(`   Surveys queued: ${completionResponse.data.results.surveysQueued}\n`);
        }
        
        // Test 8: Full automation pipeline
        console.log('8. Testing full automation pipeline...');
        const fullAutomationResponse = await axios.post(`${BASE_URL}/api/workflow/full-automation`, {
            emailCount: 2,
            siteIds: siteIds,
            targetSurveys: 3,
            personaTypes: ['young_professional', 'tech_enthusiast'],
            options: {
                headless: true,
                qualityMode: 'fast',
                maxConcurrent: 1
            }
        });
        
        console.log(`✅ Full automation: ${fullAutomationResponse.data.message}`);
        console.log(`   Job ID: ${fullAutomationResponse.data.jobId}`);
        console.log(`   Pipeline stages: ${fullAutomationResponse.data.pipeline.stages.length}\n`);
        
        console.log('🎉 All workflow endpoint tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            console.error('   Validation errors:', error.response.data.errors);
        }
    }
}

// Start server and run tests
const { spawn } = require('child_process');

console.log('🚀 Starting API server...');
const server = spawn('node', ['api-server.js', '--port', '3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
});

// Wait for server to start
setTimeout(async () => {
    try {
        await testWorkflowEndpoints();
    } finally {
        console.log('\n🔄 Stopping server...');
        server.kill('SIGTERM');
        process.exit(0);
    }
}, 3000);

// Handle server output
server.stdout.on('data', (data) => {
    if (data.toString().includes('Ready to accept requests')) {
        console.log('✅ Server is ready');
    }
});

server.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('DeprecationWarning') && !output.includes('ExperimentalWarning')) {
        console.error('Server error:', output);
    }
});