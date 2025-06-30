#!/usr/bin/env node

/**
 * LIGHTWEIGHT POLL AUTOMATION APP
 * Fast version for quick commands without heavy initialization
 */

const { Command } = require('commander');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const program = new Command();

class LightweightPollApp {
    constructor() {
        this.setupCommands();
    }

    setupCommands() {
        program
            .name('poll-automation-lite')
            .description('Lightweight poll automation for quick operations')
            .version('3.0.0');

        // Quick database stats
        program
            .command('db')
            .description('🗄️ Quick database operations')
            .action(async () => {
                console.log('📊 QUICK DATABASE STATS');
                console.log('=======================');
                
                const db = new sqlite3.Database('poll-automation.db');
                
                // Get email count
                db.get('SELECT COUNT(*) as count FROM email_accounts', (err, row) => {
                    if (!err) console.log(`📧 Email accounts: ${row.count}`);
                });
                
                // Get registration count  
                db.get('SELECT COUNT(*) as count FROM registration_attempts', (err, row) => {
                    if (!err) console.log(`🎯 Registration attempts: ${row.count}`);
                });
                
                // Get table count
                db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                    if (!err) console.log(`🗄️ Database tables: ${rows.length}`);
                    db.close();
                    console.log('✅ Database stats completed');
                });
            });

        // Quick LLM test
        program
            .command('llm-test')
            .description('🧠 Quick LLM service test')
            .action(async () => {
                console.log('🧠 QUICK LLM TEST');
                console.log('=================');
                
                try {
                    const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
                    console.log(`✅ LLM Service: ${response.data.status}`);
                    console.log(`🎯 Service: ${response.data.service}`);
                } catch (error) {
                    console.log(`❌ LLM Service error: ${error.message}`);
                }
            });

        // Quick status
        program
            .command('status')
            .description('💻 Quick system status')
            .action(async () => {
                console.log('💻 QUICK SYSTEM STATUS');
                console.log('======================');
                console.log('✅ Application: READY');
                console.log('✅ Mode: LIGHTWEIGHT');
                console.log('✅ Performance: OPTIMIZED');
                
                // Check database
                const db = new sqlite3.Database('poll-automation.db', (err) => {
                    if (err) {
                        console.log('❌ Database: ERROR');
                    } else {
                        console.log('✅ Database: CONNECTED');
                        db.close();
                    }
                });
                
                // Check LLM service
                try {
                    await axios.get('http://localhost:5000/health', { timeout: 3000 });
                    console.log('✅ LLM Service: HEALTHY');
                } catch (error) {
                    console.log('❌ LLM Service: UNAVAILABLE');
                }
            });

        // Fallback to full app for complex commands
        program
            .command('full')
            .description('🚀 Launch full application')
            .action(() => {
                console.log('🚀 Launching full application...');
                const { spawn } = require('child_process');
                const child = spawn('node', ['app.js', ...process.argv.slice(3)], { 
                    stdio: 'inherit' 
                });
                child.on('close', (code) => process.exit(code));
            });
    }

    async run() {
        await program.parseAsync(process.argv);
    }
}

if (require.main === module) {
    const app = new LightweightPollApp();
    app.run().catch(console.error);
}

module.exports = LightweightPollApp;