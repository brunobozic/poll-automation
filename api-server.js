#!/usr/bin/env node

/**
 * Poll Automation REST API Server
 * 
 * Comprehensive API for survey automation, email management, and failure analysis
 * 
 * Features:
 * - Email account creation and management
 * - Survey site registration and management  
 * - Registration failure analysis with LLM insights
 * - Comprehensive database operations
 * - Real-time automation control
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');

// Import application components
const DatabaseManager = require('./src/database/manager');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const IntelligentFailureAnalyzer = require('./src/ai/intelligent-failure-analyzer');
const { setupFeedbackLoopDatabase } = require('./src/database/feedback-loop-setup');

class PollAutomationAPIServer {
    constructor(options = {}) {
        this.app = express();
        this.port = options.port || process.env.PORT || 3000;
        this.host = options.host || process.env.HOST || 'localhost';
        
        // Initialize components
        this.db = null;
        this.emailManager = null;
        this.logger = null;
        this.failureAnalyzer = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        this.app.use(cors());
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later'
        });
        this.app.use('/api/', limiter);
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
        
        // API documentation
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'Poll Automation API',
                version: '1.0.0',
                description: 'Comprehensive survey automation and email management API',
                endpoints: {
                    emails: {
                        'POST /api/emails': 'Create new email accounts',
                        'GET /api/emails': 'List all email accounts',
                        'GET /api/emails/unused/:siteId': 'Get unused emails for site',
                        'GET /api/emails/successful': 'Get successfully registered emails'
                    },
                    sites: {
                        'GET /api/survey-sites': 'List all survey sites',
                        'POST /api/survey-sites': 'Add new survey sites',
                        'POST /api/register': 'Register emails on survey sites'
                    },
                    failures: {
                        'GET /api/failures/recent': 'Get recent registration failures',
                        'GET /api/failures/site/:siteId': 'Get site-specific failures',
                        'GET /api/failures/all': 'Get all registration failures'
                    }
                }
            });
        });
        
        // Email management routes
        this.setupEmailRoutes();
        
        // Survey site management routes
        this.setupSurveyRoutes();
        
        // Failure analysis routes
        this.setupFailureRoutes();
        
        // Registration routes
        this.setupRegistrationRoutes();
    }
    
    setupEmailRoutes() {
        // Create new email accounts
        this.app.post('/api/emails', 
            body('count').isInt({ min: 1, max: 20 }).withMessage('Count must be between 1 and 20'),
            body('provider').optional().isIn(['guerrilla', 'tempmail', '10minutemail', 'auto']),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ errors: errors.array() });
                    }
                    
                    const { count = 1, provider = 'auto' } = req.body;
                    const results = [];
                    
                    console.log(`Creating ${count} email accounts with provider: ${provider}`);
                    
                    for (let i = 0; i < count; i++) {
                        try {
                            const email = await this.emailManager.createEmailAccount(provider);
                            await this.logger.logEmailAccount(email);
                            results.push({
                                success: true,
                                email: email.email,
                                provider: email.service,
                                credentials: {
                                    username: email.username,
                                    password: email.password
                                }
                            });
                        } catch (error) {
                            results.push({
                                success: false,
                                error: error.message
                            });
                        }
                    }
                    
                    const successful = results.filter(r => r.success).length;
                    res.json({
                        success: true,
                        message: `Created ${successful}/${count} email accounts`,
                        results
                    });
                    
                } catch (error) {
                    console.error('Email creation error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
        
        // List all email accounts
        this.app.get('/api/emails',
            query('limit').optional().isInt({ min: 1, max: 1000 }),
            query('provider').optional().isString(),
            async (req, res) => {
                try {
                    const { limit = 100, provider } = req.query;
                    
                    let query = `
                        SELECT ea.*, 
                               COUNT(ra.id) as registration_count,
                               COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successful_registrations
                        FROM email_accounts ea
                        LEFT JOIN registration_attempts ra ON ea.id = ra.email_id
                    `;
                    
                    const params = [];
                    if (provider) {
                        query += ' WHERE ea.service = ?';
                        params.push(provider);
                    }
                    
                    query += `
                        GROUP BY ea.id
                        ORDER BY ea.created_at DESC 
                        LIMIT ?
                    `;
                    params.push(parseInt(limit));
                    
                    const emails = await this.db.all(query, params);
                    
                    res.json({
                        success: true,
                        count: emails.length,
                        emails: emails.map(email => ({
                            id: email.id,
                            email: email.email,
                            provider: email.service,
                            created: email.created_at,
                            registrations: email.registration_count,
                            successful: email.successful_registrations,
                            credentials: {
                                username: email.username,
                                password: email.password,
                                inboxUrl: email.inbox_url
                            }
                        }))
                    });
                    
                } catch (error) {
                    console.error('Email listing error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
        
        // Get unused emails for a specific site
        this.app.get('/api/emails/unused/:siteId',
            param('siteId').isInt(),
            query('limit').optional().isInt({ min: 1, max: 100 }),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ errors: errors.array() });
                    }
                    
                    const { siteId } = req.params;
                    const { limit = 50 } = req.query;
                    
                    const query = `
                        SELECT ea.*
                        FROM email_accounts ea
                        WHERE ea.id NOT IN (
                            SELECT DISTINCT ra.email_id 
                            FROM registration_attempts ra 
                            WHERE ra.site_id = ?
                        )
                        ORDER BY ea.created_at DESC
                        LIMIT ?
                    `;
                    
                    const emails = await this.db.all(query, [siteId, parseInt(limit)]);
                    
                    res.json({
                        success: true,
                        siteId: parseInt(siteId),
                        count: emails.length,
                        emails: emails.map(email => ({
                            id: email.id,
                            email: email.email,
                            provider: email.service,
                            created: email.created_at
                        }))
                    });
                    
                } catch (error) {
                    console.error('Unused emails error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
        
        // Get successfully registered emails
        this.app.get('/api/emails/successful', async (req, res) => {
            try {
                const query = `
                    SELECT ea.*, 
                           ss.name as site_name,
                           COUNT(ra.id) as total_registrations,
                           COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successful_registrations
                    FROM email_accounts ea
                    INNER JOIN registration_attempts ra ON ea.id = ra.email_id
                    LEFT JOIN survey_sites ss ON ra.site_id = ss.id
                    WHERE ra.success = 1
                    GROUP BY ea.id
                    ORDER BY successful_registrations DESC, ea.created_at DESC
                `;
                
                const emails = await this.db.all(query);
                
                res.json({
                    success: true,
                    count: emails.length,
                    emails: emails.map(email => ({
                        id: email.id,
                        email: email.email,
                        provider: email.service,
                        created: email.created_at,
                        totalRegistrations: email.total_registrations,
                        successfulRegistrations: email.successful_registrations,
                        credentials: {
                            username: email.username,
                            password: email.password
                        }
                    }))
                });
                
            } catch (error) {
                console.error('Successful emails error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });
    }
    
    setupSurveyRoutes() {
        // List all survey sites
        this.app.get('/api/survey-sites', async (req, res) => {
            try {
                const query = `
                    SELECT ss.*, 
                           COUNT(ra.id) as total_attempts,
                           COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successful_attempts,
                           MAX(ra.attempt_date) as last_attempt
                    FROM survey_sites ss
                    LEFT JOIN registration_attempts ra ON ss.id = ra.site_id
                    GROUP BY ss.id
                    ORDER BY ss.name
                `;
                
                const sites = await this.db.all(query);
                
                res.json({
                    success: true,
                    count: sites.length,
                    sites: sites.map(site => ({
                        id: site.id,
                        name: site.name,
                        url: site.url,
                        category: site.category,
                        difficulty: site.difficulty_level,
                        totalAttempts: site.total_attempts || 0,
                        successfulAttempts: site.successful_attempts || 0,
                        successRate: site.total_attempts > 0 ? 
                            ((site.successful_attempts || 0) / site.total_attempts * 100).toFixed(1) + '%' : 
                            'N/A',
                        lastAttempt: site.last_attempt
                    }))
                });
                
            } catch (error) {
                console.error('Survey sites listing error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });
        
        // Add new survey sites
        this.app.post('/api/survey-sites',
            body('sites').isArray({ min: 1 }).withMessage('Sites array is required'),
            body('sites.*.name').notEmpty().withMessage('Site name is required'),
            body('sites.*.url').isURL().withMessage('Valid URL is required'),
            body('sites.*.category').optional().isString(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ errors: errors.array() });
                    }
                    
                    const { sites } = req.body;
                    const results = [];
                    
                    for (const site of sites) {
                        try {
                            // Check if site already exists
                            const existing = await this.db.get(
                                'SELECT id FROM survey_sites WHERE url = ?', 
                                [site.url]
                            );
                            
                            if (existing) {
                                results.push({
                                    success: false,
                                    site: site.name,
                                    error: 'Site already exists'
                                });
                                continue;
                            }
                            
                            // Insert new site
                            const stmt = await this.db.run(`
                                INSERT INTO survey_sites (name, url, category, difficulty_level)
                                VALUES (?, ?, ?, ?)
                            `, [
                                site.name,
                                site.url,
                                site.category || 'survey',
                                site.difficulty || 3
                            ]);
                            
                            results.push({
                                success: true,
                                id: stmt.lastID,
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
                    console.error('Survey sites creation error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
    }
    
    setupFailureRoutes() {
        // Get recent registration failures
        this.app.get('/api/failures/recent',
            query('limit').optional().isInt({ min: 1, max: 100 }),
            async (req, res) => {
                try {
                    const { limit = 10 } = req.query;
                    
                    const query = `
                        SELECT ra.*, 
                               ea.email,
                               ss.name as site_name,
                               ss.url as site_url,
                               fa.root_cause_category,
                               fa.root_cause_description,
                               fa.confidence_score,
                               fa.llm_analysis_response
                        FROM registration_attempts ra
                        LEFT JOIN email_accounts ea ON ra.email_id = ea.id
                        LEFT JOIN survey_sites ss ON ra.site_id = ss.id
                        LEFT JOIN failure_analysis fa ON ra.id = fa.scenario_id
                        WHERE ra.success = 0
                        ORDER BY ra.attempt_date DESC
                        LIMIT ?
                    `;
                    
                    const failures = await this.db.all(query, [parseInt(limit)]);
                    
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
                            llmAnalysis: {
                                rootCause: failure.root_cause_category,
                                description: failure.root_cause_description,
                                confidence: failure.confidence_score,
                                fullAnalysis: failure.llm_analysis_response ? 
                                    JSON.parse(failure.llm_analysis_response) : null
                            }
                        }))
                    });
                    
                } catch (error) {
                    console.error('Recent failures error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
        
        // Get site-specific failures
        this.app.get('/api/failures/site/:siteId',
            param('siteId').isInt(),
            query('limit').optional().isInt({ min: 1, max: 100 }),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ errors: errors.array() });
                    }
                    
                    const { siteId } = req.params;
                    const { limit = 50 } = req.query;
                    
                    const query = `
                        SELECT ra.*, 
                               ea.email,
                               ss.name as site_name,
                               fa.root_cause_category,
                               fa.root_cause_description,
                               fa.confidence_score,
                               fa.llm_analysis_response
                        FROM registration_attempts ra
                        LEFT JOIN email_accounts ea ON ra.email_id = ea.id
                        LEFT JOIN survey_sites ss ON ra.site_id = ss.id
                        LEFT JOIN failure_analysis fa ON ra.id = fa.scenario_id
                        WHERE ra.site_id = ? AND ra.success = 0
                        ORDER BY ra.attempt_date DESC
                        LIMIT ?
                    `;
                    
                    const failures = await this.db.all(query, [siteId, parseInt(limit)]);
                    
                    // Get site info
                    const site = await this.db.get('SELECT * FROM survey_sites WHERE id = ?', [siteId]);
                    
                    res.json({
                        success: true,
                        site: site ? {
                            id: site.id,
                            name: site.name,
                            url: site.url
                        } : null,
                        count: failures.length,
                        failures: failures.map(failure => ({
                            id: failure.id,
                            email: failure.email,
                            attemptDate: failure.attempt_date,
                            error: failure.error_message,
                            llmAnalysis: {
                                rootCause: failure.root_cause_category,
                                description: failure.root_cause_description,
                                confidence: failure.confidence_score,
                                fullAnalysis: failure.llm_analysis_response ? 
                                    JSON.parse(failure.llm_analysis_response) : null
                            }
                        }))
                    });
                    
                } catch (error) {
                    console.error('Site failures error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
        
        // Get all registration failures
        this.app.get('/api/failures/all',
            query('limit').optional().isInt({ min: 1, max: 1000 }),
            query('groupBy').optional().isIn(['site', 'email', 'date', 'cause']),
            async (req, res) => {
                try {
                    const { limit = 200, groupBy } = req.query;
                    
                    let query = `
                        SELECT ra.*, 
                               ea.email,
                               ss.name as site_name,
                               ss.url as site_url,
                               fa.root_cause_category,
                               fa.root_cause_description,
                               fa.confidence_score
                        FROM registration_attempts ra
                        LEFT JOIN email_accounts ea ON ra.email_id = ea.id
                        LEFT JOIN survey_sites ss ON ra.site_id = ss.id
                        LEFT JOIN failure_analysis fa ON ra.id = fa.scenario_id
                        WHERE ra.success = 0
                    `;
                    
                    if (groupBy === 'site') {
                        query += ' ORDER BY ss.name, ra.attempt_date DESC';
                    } else if (groupBy === 'email') {
                        query += ' ORDER BY ea.email, ra.attempt_date DESC';
                    } else if (groupBy === 'cause') {
                        query += ' ORDER BY fa.root_cause_category, ra.attempt_date DESC';
                    } else {
                        query += ' ORDER BY ra.attempt_date DESC';
                    }
                    
                    query += ' LIMIT ?';
                    
                    const failures = await this.db.all(query, [parseInt(limit)]);
                    
                    res.json({
                        success: true,
                        count: failures.length,
                        groupBy: groupBy || 'date',
                        failures: failures.map(failure => ({
                            id: failure.id,
                            email: failure.email,
                            site: {
                                name: failure.site_name,
                                url: failure.site_url
                            },
                            attemptDate: failure.attempt_date,
                            error: failure.error_message,
                            llmAnalysis: {
                                rootCause: failure.root_cause_category,
                                description: failure.root_cause_description,
                                confidence: failure.confidence_score
                            }
                        }))
                    });
                    
                } catch (error) {
                    console.error('All failures error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
    }
    
    setupRegistrationRoutes() {
        // Register emails on survey sites
        this.app.post('/api/register',
            body('siteIds').isArray({ min: 1 }).withMessage('Site IDs array is required'),
            body('emailCount').optional().isInt({ min: 1, max: 20 }),
            body('useUnusedEmails').optional().isBoolean(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ errors: errors.array() });
                    }
                    
                    const { siteIds, emailCount = 5, useUnusedEmails = true } = req.body;
                    
                    // This is a placeholder for the actual registration logic
                    // In a complete implementation, this would:
                    // 1. Get unused emails for each site
                    // 2. Launch browser automation
                    // 3. Attempt registrations
                    // 4. Capture failures and analyze with LLM
                    // 5. Log everything to database
                    
                    res.json({
                        success: true,
                        message: 'Registration process initiated',
                        jobId: `reg_${Date.now()}`,
                        siteIds,
                        emailCount,
                        status: 'This endpoint requires full automation implementation',
                        note: 'Use other endpoints to see existing registration data'
                    });
                    
                } catch (error) {
                    console.error('Registration error:', error);
                    res.status(500).json({ 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        );
    }
    
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ 
                success: false, 
                error: 'Endpoint not found',
                availableEndpoints: '/api'
            });
        });
        
        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('Unhandled error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error',
                message: err.message
            });
        });
    }
    
    async initialize() {
        try {
            console.log('🚀 Initializing Poll Automation API Server...');
            
            // Setup database
            this.db = await setupFeedbackLoopDatabase();
            console.log('✅ Database initialized');
            
            // Initialize email manager
            this.emailManager = new EmailAccountManager();
            await this.emailManager.initialize();
            console.log('✅ Email manager initialized');
            
            // Initialize logger
            this.logger = new RegistrationLogger();
            await this.logger.initialize();
            console.log('✅ Registration logger initialized');
            
            // Initialize failure analyzer (with or without LLM)
            this.failureAnalyzer = new IntelligentFailureAnalyzer(null, this.db);
            console.log('✅ Failure analyzer initialized');
            
            return true;
            
        } catch (error) {
            console.error('❌ API Server initialization failed:', error);
            throw error;
        }
    }
    
    async start() {
        try {
            await this.initialize();
            
            this.server = this.app.listen(this.port, this.host, () => {
                console.log(`\n🌟 Poll Automation API Server`);
                console.log(`🌐 Server running at: http://${this.host}:${this.port}`);
                console.log(`📚 API Documentation: http://${this.host}:${this.port}/api`);
                console.log(`💚 Health Check: http://${this.host}:${this.port}/health`);
                console.log(`\n📋 Ready to accept requests!`);
            });
            
            return this.server;
            
        } catch (error) {
            console.error('❌ Failed to start API server:', error);
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
    const server = new PollAutomationAPIServer({
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🔄 Shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🔄 Shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    // Start server
    server.start().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = PollAutomationAPIServer;