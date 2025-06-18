#!/usr/bin/env node

/**
 * Complete Poll Automation System Test
 * Tests the entire automation pipeline with the demo poll site
 */

const path = require('path');
const { spawn } = require('child_process');

// Import our automation components
const DatabaseManager = require('./src/database/manager');
const PollAutomationService = require('./src/services/poll-automation');

async function runTests() {
    console.log('🚀 Starting Complete Poll Automation System Test\n');
    
    try {
        // Step 1: Initialize database
        console.log('📁 Step 1: Setting up database...');
        const db = new DatabaseManager();
        await db.connect();
        
        // Step 2: Add demo site to database
        console.log('🌐 Step 2: Adding demo poll site...');
        const siteId = await addDemoSite(db);
        console.log(`   Demo site added with ID: ${siteId}`);
        
        // Step 3: Add credentials for demo site
        console.log('🔐 Step 3: Adding demo credentials...');
        await addDemoCredentials(db, siteId);
        console.log('   Demo credentials added successfully');
        
        // Step 4: Start demo poll site
        console.log('🖥️  Step 4: Starting demo poll site...');
        const demoSite = await startDemoSite();
        console.log('   Demo poll site started on http://localhost:3001');
        
        // Wait for site to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 5: Initialize automation service
        console.log('🤖 Step 5: Initializing automation service...');
        const automationService = new PollAutomationService();
        await automationService.initialize();
        console.log('   Automation service initialized successfully');
        
        // Step 6: Run automation for demo site
        console.log('🎯 Step 6: Running automation for demo site...');
        const result = await automationService.runAutomationForSite(siteId);
        
        // Step 7: Display results
        console.log('\n📊 Automation Results:');
        console.log(`   Success: ${result.success}`);
        console.log(`   Total Polls: ${result.totalPolls || 0}`);
        console.log(`   Completed: ${result.results?.filter(r => r.success).length || 0}`);
        console.log(`   Failed: ${result.results?.filter(r => !r.success).length || 0}`);
        
        if (result.results) {
            result.results.forEach((res, index) => {
                console.log(`   Poll ${index + 1}: ${res.success ? '✅' : '❌'} ${res.error || 'Success'}`);
                if (res.questionsAnswered) {
                    console.log(`     Questions answered: ${res.questionsAnswered}`);
                }
                if (res.trickQuestions) {
                    console.log(`     Trick questions detected: ${res.trickQuestions}`);
                }
            });
        }
        
        // Step 8: Cleanup
        console.log('\n🧹 Step 8: Cleaning up...');
        await automationService.cleanup();
        await db.close();
        
        if (demoSite) {
            demoSite.kill();
        }
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

async function addDemoSite(db) {
    const query = `
        INSERT INTO poll_sites (name, base_url, login_url, dashboard_url, description, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        'Demo Poll Site',
        'http://localhost:3001',
        'http://localhost:3001/login',
        'http://localhost:3001/dashboard',
        'Demo site for testing poll automation',
        'active'
    ];
    
    return new Promise((resolve, reject) => {
        db.db.run(query, values, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

async function addDemoCredentials(db, siteId) {
    const credentialService = require('./src/security/credential-manager');
    const credManager = new credentialService();
    
    // Add test user credentials
    await credManager.storeCredentials(siteId, 'testuser', 'testpass');
    
    return true;
}

function startDemoSite() {
    return new Promise((resolve, reject) => {
        const demoSitePath = path.join(__dirname, 'demo-poll-site');
        const child = spawn('npm', ['start'], {
            cwd: demoSitePath,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let started = false;
        
        child.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Demo Poll Site running') && !started) {
                started = true;
                resolve(child);
            }
        });
        
        child.stderr.on('data', (data) => {
            console.error('Demo site error:', data.toString());
        });
        
        child.on('error', (error) => {
            reject(error);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!started) {
                child.kill();
                reject(new Error('Demo site failed to start within 10 seconds'));
            }
        }, 10000);
    });
}

// Main execution
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests };