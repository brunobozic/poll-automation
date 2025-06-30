#!/usr/bin/env node

// SIMPLE FUNCTIONALITY TEST

async function testBasicFunctionality() {
    console.log('🧪 BASIC FUNCTIONALITY TEST');
    console.log('============================');
    
    // Test 1: Database access
    console.log('\n1️⃣ Testing database access...');
    try {
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('poll-automation.db');
        
        db.get("SELECT COUNT(*) as count FROM email_accounts", (err, row) => {
            if (err) {
                console.log('❌ Database test failed:', err.message);
            } else {
                console.log('✅ Database works - found', row.count, 'email accounts');
            }
            db.close();
        });
    } catch (e) {
        console.log('❌ Database test failed:', e.message);
    }
    
    // Test 2: LLM service
    console.log('\n2️⃣ Testing LLM service...');
    try {
        const axios = require('axios');
        const response = await axios.get('http://localhost:5000/health', {timeout: 3000});
        console.log('✅ LLM service works:', response.data.service);
    } catch (e) {
        console.log('❌ LLM service failed:', e.message);
    }
    
    // Test 3: App loading
    console.log('\n3️⃣ Testing app loading...');
    try {
        delete require.cache[require.resolve('./app.js')];
        const App = require('./app.js');
        console.log('✅ App loads successfully');
    } catch (e) {
        console.log('❌ App loading failed:', e.message);
    }
    
    console.log('\n🏁 Basic tests completed');
}

testBasicFunctionality().catch(console.error);
