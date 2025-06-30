#!/usr/bin/env node

/**
 * Simplified Poll Automation API Server
 * Without browser-based email manager to test core functionality
 */

const express = require('express');
const cors = require('cors');
const { body, query, validationResult } = require('express-validator');
const { getDatabaseManager } = require('./src/database/database-manager');

class SimplifiedAPIServer {
    constructor(options = {}) {
        this.app = express();
        this.port = options.port || process.env.PORT || 3001;
        this.db = null;
        
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: this.db ? 'connected' : 'disconnected'
            });
        });
        
        // Create manual email accounts (for testing)
        this.app.post('/api/emails', 
            body('count').optional().isInt({ min: 1, max: 10 }),
            body('provider').optional().isString(),
            async (req, res) => {
                try {
                    const { count = 1, provider = 'manual' } = req.body;
                    const results = [];
                    
                    for (let i = 0; i < count; i++) {
                        const email = `test-${Date.now()}-${i}@manual.test`;
                        const result = await this.db.run(`
                            INSERT INTO email_accounts (email, service, password, is_verified, is_active)
                            VALUES (?, ?, ?, ?, ?)
                        `, [email, provider, 'manual_password', 1, 1]);
                        
                        results.push({
                            success: true,
                            email: email,
                            provider: provider,
                            credentials: { password: 'manual_password' }
                        });
                    }
                    
                    res.json({
                        success: true,
                        message: `Created ${results.length}/${count} email accounts`,
                        results
                    });
                    
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        );
        
        // List email accounts
        this.app.get('/api/emails', async (req, res) => {
            try {
                const emails = await this.db.all(`
                    SELECT id, email, service, is_verified, is_active, 
                           daily_usage_count, last_used_date, created_at
                    FROM email_accounts 
                    WHERE is_active = 1
                    ORDER BY created_at DESC
                `);
                
                res.json({
                    success: true,
                    count: emails.length,
                    emails
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Create survey sites
        this.app.post('/api/sites',
            body('sites').isArray(),
            body('sites.*.name').isString(),
            body('sites.*.url').isURL(),
            async (req, res) => {
                try {
                    const { sites } = req.body;
                    const results = [];
                    
                    for (const site of sites) {
                        try {
                            const domain = new URL(site.url).hostname;
                            const result = await this.db.run(`
                                INSERT INTO survey_sites (name, url, domain, category, difficulty_level)
                                VALUES (?, ?, ?, ?, ?)
                            `, [
                                site.name,
                                site.url,
                                domain,
                                site.category || 'survey',
                                site.difficulty || 3
                            ]);
                            
                            results.push({
                                success: true,
                                id: result.lastID,
                                site: site.name,
                                url: site.url
                            });
                            
                        } catch (error) {
                            results.push({
                                success: false,
                                site: site.name,
                                error: error.message
                            });
                        }
                    }
                    
                    const successful = results.filter(r => r.success).length;
                    res.json({
                        success: true,
                        message: `Added ${successful}/${sites.length} survey sites`,
                        results
                    });
                    
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        );
        
        // List survey sites
        this.app.get('/api/sites', async (req, res) => {
            try {
                const sites = await this.db.all(`
                    SELECT id, name, url, domain, category, difficulty_level,
                           success_rate, total_attempts, successful_attempts,
                           last_successful_attempt, created_at
                    FROM survey_sites 
                    WHERE is_active = 1
                    ORDER BY name
                `);
                
                res.json({
                    success: true,
                    count: sites.length,
                    sites
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Register on survey site (simplified)
        this.app.post('/api/register',
            body('email').isEmail(),
            body('site_url').isURL(),
            async (req, res) => {
                try {
                    const { email, site_url } = req.body;
                    
                    // Find email
                    const emailRecord = await this.db.get(
                        'SELECT * FROM email_accounts WHERE email = ? AND is_active = 1',
                        [email]
                    );
                    
                    if (!emailRecord) {
                        return res.status(404).json({
                            success: false,
                            error: 'Email not found'
                        });
                    }
                    
                    // Find site
                    const site = await this.db.get(
                        'SELECT * FROM survey_sites WHERE url = ? AND is_active = 1',
                        [site_url]
                    );
                    
                    if (!site) {
                        return res.status(404).json({
                            success: false,
                            error: 'Site not found'
                        });
                    }
                    
                    // Create a simulated registration attempt
                    const result = await this.db.run(`
                        INSERT INTO registration_attempts (
                            email_id, site_id, success, error_message, 
                            execution_time_ms, verification_required
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        emailRecord.id, 
                        site.id, 
                        Math.random() > 0.5 ? 1 : 0, // Random success/failure for demo
                        'Simulated registration attempt',
                        Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
                        1
                    ]);
                    
                    const attempt = await this.db.get(
                        'SELECT * FROM registration_attempts WHERE id = ?',
                        [result.lastID]
                    );
                    
                    res.json({
                        success: true,
                        message: 'Registration attempt logged',
                        attempt: {
                            id: attempt.id,
                            email: emailRecord.email,
                            site: site.name,
                            success: attempt.success === 1,
                            execution_time: attempt.execution_time_ms,
                            timestamp: attempt.attempt_date
                        }
                    });
                    
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        );
        
        // Get recent failures
        this.app.get('/api/failures/recent',
            query('limit').optional().isInt({ min: 1, max: 100 }),
            async (req, res) => {
                try {
                    const { limit = 10 } = req.query;
                    
                    const failures = await this.db.all(`
                        SELECT ra.*, 
                               ea.email,
                               ss.name as site_name,
                               ss.url as site_url
                        FROM registration_attempts ra
                        LEFT JOIN email_accounts ea ON ra.email_id = ea.id
                        LEFT JOIN survey_sites ss ON ra.site_id = ss.id
                        WHERE ra.success = 0
                        ORDER BY ra.attempt_date DESC
                        LIMIT ?
                    `, [parseInt(limit)]);
                    
                    res.json({
                        success: true,
                        count: failures.length,
                        failures: failures.map(failure => ({
                            id: failure.id,
                            email: failure.email,
                            site: {
                                name: failure.site_name,
                                url: failure.site_url
                            },
                            attemptDate: failure.attempt_date,
                            error: failure.error_message,
                            executionTime: failure.execution_time_ms
                        }))
                    });
                    
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        );
        
        // Database statistics
        this.app.get('/api/stats', async (req, res) => {
            try {
                const stats = await this.db.all(`
                    SELECT 
                        (SELECT COUNT(*) FROM email_accounts WHERE is_active = 1) as total_emails,
                        (SELECT COUNT(*) FROM survey_sites WHERE is_active = 1) as total_sites,
                        (SELECT COUNT(*) FROM registration_attempts) as total_attempts,
                        (SELECT COUNT(*) FROM registration_attempts WHERE success = 1) as successful_attempts,
                        (SELECT COUNT(*) FROM registration_attempts WHERE success = 0) as failed_attempts
                `);
                
                const dbStats = this.db.getStatistics();
                
                res.json({
                    success: true,
                    database: stats[0],
                    system: dbStats
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }
    
    async start() {
        try {
            console.log('🚀 Initializing Simplified API Server...');
            
            // Initialize database
            this.db = getDatabaseManager();
            await this.db.initialize();
            console.log('✅ Database initialized');
            
            // Start server
            return new Promise((resolve) => {
                this.server = this.app.listen(this.port, () => {
                    console.log('\\n🌟 Simplified Poll Automation API Server');
                    console.log(`🌐 Server running at: http://localhost:${this.port}`);
                    console.log(`💚 Health Check: http://localhost:${this.port}/health`);
                    console.log(`📊 Statistics: http://localhost:${this.port}/api/stats`);
                    console.log('\\n📋 Ready to accept requests!');
                    resolve(this.server);
                });
            });
            
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            throw error;
        }
    }
    
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('✅ API Server stopped');
                    resolve();
                });
            });
        }
    }
}

// CLI usage
if (require.main === module) {
    const server = new SimplifiedAPIServer({
        port: process.env.PORT || 3001
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\\n🔄 Shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    // Start server
    server.start().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = SimplifiedAPIServer;