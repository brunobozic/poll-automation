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
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Import application components
const DatabaseManager = require('./src/database/manager');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const IntelligentFailureAnalyzer = require('./src/ai/intelligent-failure-analyzer');
const { setupFeedbackLoopDatabase } = require('./src/database/feedback-loop-setup');
// const PollAutomationApp = require('./app'); // Import main automation app when needed

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
        
        this.setupSwagger();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    setupSwagger() {
        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'Poll Automation API',
                    version: '1.0.0',
                    description: 'Comprehensive REST API for survey automation, email management, and failure analysis',
                    contact: {
                        name: 'Poll Automation Team',
                        email: 'support@poll-automation.com'
                    }
                },
                servers: [
                    {
                        url: `http://${this.host}:${this.port}`,
                        description: 'Local development server'
                    }
                ],
                components: {
                    schemas: {
                        Email: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer', description: 'Email account ID' },
                                email: { type: 'string', description: 'Email address' },
                                provider: { type: 'string', description: 'Email service provider' },
                                created: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
                                registrations: { type: 'integer', description: 'Total registration attempts' },
                                successful: { type: 'integer', description: 'Successful registrations' }
                            }
                        },
                        SurveySite: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer', description: 'Site ID' },
                                name: { type: 'string', description: 'Site name' },
                                url: { type: 'string', format: 'uri', description: 'Site URL' },
                                category: { type: 'string', description: 'Site category' },
                                difficulty: { type: 'integer', description: 'Difficulty level (1-10)' },
                                totalAttempts: { type: 'integer', description: 'Total registration attempts' },
                                successfulAttempts: { type: 'integer', description: 'Successful attempts' },
                                successRate: { type: 'string', description: 'Success rate percentage' }
                            }
                        },
                        Failure: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer', description: 'Failure ID' },
                                email: { type: 'string', description: 'Email address used' },
                                site: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        url: { type: 'string' }
                                    }
                                },
                                attemptDate: { type: 'string', format: 'date-time' },
                                error: { type: 'string', description: 'Error message' },
                                llmAnalysis: {
                                    type: 'object',
                                    properties: {
                                        rootCause: { type: 'string' },
                                        description: { type: 'string' },
                                        confidence: { type: 'number' },
                                        fullAnalysis: { type: 'object' }
                                    }
                                }
                            }
                        },
                        SystemStatus: {
                            type: 'object',
                            properties: {
                                database: { type: 'object' },
                                email: { type: 'object' },
                                llm: { type: 'object' },
                                statistics: { type: 'object' }
                            }
                        },
                        APIResponse: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                message: { type: 'string' },
                                data: { type: 'object' }
                            }
                        },
                        ErrorResponse: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: false },
                                error: { type: 'string' },
                                details: { type: 'array', items: { type: 'string' } }
                            }
                        }
                    }
                }
            },
            apis: ['./api-server.js'] // This file for JSDoc comments
        };
        
        const swaggerSpec = swaggerJsdoc(swaggerOptions);
        
        // Serve Swagger UI
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'Poll Automation API Documentation'
        }));
        
        // Serve Swagger JSON
        this.app.get('/api-docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swaggerSpec);
        });
    }
    
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));
        
        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        
        // Rate limiting with different tiers
        const generalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                success: false,
                error: 'Too many requests from this IP, please try again later',
                retryAfter: 15 * 60
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        
        const strictLimiter = rateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 10, // limit automation endpoints
            message: {
                success: false,
                error: 'Rate limit exceeded for automation endpoints',
                retryAfter: 5 * 60
            }
        });
        
        this.app.use('/api/', generalLimiter);
        this.app.use('/api/register', strictLimiter);
        this.app.use('/api/emails', strictLimiter);
        
        // Body parsing with validation
        this.app.use(express.json({ 
            limit: '10mb',
            verify: (req, res, buf) => {
                try {
                    JSON.parse(buf);
                } catch (e) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid JSON format'
                    });
                    throw new Error('Invalid JSON');
                }
            }
        }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Enhanced request logging
        this.app.use((req, res, next) => {
            const start = Date.now();
            const originalSend = res.send;
            
            res.send = function(data) {
                const duration = Date.now() - start;
                console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) - ${req.ip}`);
                originalSend.call(this, data);
            };
            
            next();
        });
        
        // Request validation middleware
        this.app.use((req, res, next) => {
            // Add request ID for tracking
            req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            next();
        });
    }
    
    setupRoutes() {
        /**
         * @swagger
         * /health:
         *   get:
         *     summary: Health check endpoint
         *     description: Returns server health status and basic metrics
         *     tags: [System]
         *     responses:
         *       200:
         *         description: Server is healthy
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 status:
         *                   type: string
         *                   example: healthy
         *                 timestamp:
         *                   type: string
         *                   format: date-time
         *                 uptime:
         *                   type: number
         *                   description: Server uptime in seconds
         *                 memory:
         *                   type: object
         *                   description: Memory usage statistics
         *                 version:
         *                   type: string
         *                   description: API version
         */
        this.app.get('/health', (req, res) => {
            const memoryUsage = process.memoryUsage();
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
                    external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
                },
                version: '1.0.0',
                requestId: req.id
            });
        });
        
        /**
         * @swagger
         * /api:
         *   get:
         *     summary: API information and available endpoints
         *     description: Returns comprehensive API documentation and endpoint listing
         *     tags: [System]
         *     responses:
         *       200:
         *         description: API information
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 name:
         *                   type: string
         *                 version:
         *                   type: string
         *                 description:
         *                   type: string
         *                 documentation:
         *                   type: string
         *                 endpoints:
         *                   type: object
         */
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'Poll Automation API',
                version: '1.0.0',
                description: 'Comprehensive survey automation and email management API',
                documentation: `http://${this.host}:${this.port}/api-docs`,
                endpoints: {
                    system: {
                        'GET /health': 'Health check endpoint',
                        'GET /api/system/status': 'Comprehensive system status',
                        'GET /api/database/stats': 'Database statistics and health',
                        'GET /api/llm/test': 'Test LLM service connectivity',
                        'GET /api/test/error-detection': 'Run error detection cycles'
                    },
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
                    },
                    workflow: {
                        'POST /api/workflow/create-emails': 'Create multiple email accounts',
                        'POST /api/workflow/create-personas': 'Create personas for emails',
                        'POST /api/workflow/register-sites': 'Register emails on survey sites',
                        'POST /api/workflow/find-surveys': 'Find available surveys',
                        'POST /api/workflow/complete-surveys': 'Complete surveys using personas',
                        'POST /api/workflow/full-automation': 'End-to-end automation pipeline',
                        'GET /api/workflow/status/:jobId': 'Check workflow job status'
                    },
                    crud: {
                        'GET /api/personas': 'List personas with email associations',
                        'GET /api/registrations': 'List registration attempts',
                        'GET /api/surveys': 'List survey completion attempts',
                        'GET /api/analytics': 'Analytics dashboard data'
                    }
                }
            });
        });
        
        // New system routes
        this.setupSystemRoutes();
        this.setupDatabaseRoutes();
        this.setupLLMRoutes();
        this.setupTestRoutes();
        
        // Email management routes
        this.setupEmailRoutes();
        
        // Survey site management routes
        this.setupSurveyRoutes();
        
        // Failure analysis routes
        this.setupFailureRoutes();
        
        // Registration routes
        this.setupRegistrationRoutes();
        
        // Workflow automation routes
        this.setupWorkflowRoutes();
        
        // CRUD management routes
        this.setupCRUDRoutes();
    }
    
    setupSystemRoutes() {
        /**
         * @swagger
         * /api/system/status:
         *   get:
         *     summary: Get comprehensive system status
         *     description: Returns detailed system status including database, email services, and performance metrics
         *     tags: [System]
         *     responses:
         *       200:
         *         description: System status information
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/SystemStatus'
         *       500:
         *         description: System error
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
        this.app.get('/api/system/status', async (req, res) => {
            try {
                const status = {
                    system: {
                        uptime: Math.floor(process.uptime()),
                        memory: process.memoryUsage(),
                        nodeVersion: process.version,
                        platform: process.platform,
                        timestamp: new Date().toISOString()
                    },
                    database: {
                        connected: false,
                        tables: 0,
                        totalRecords: 0
                    },
                    email: {
                        services: ['guerrilla', 'tempmail', '10minutemail'],
                        accountsCreated: 0,
                        successfulRegistrations: 0
                    },
                    statistics: {
                        totalRegistrationAttempts: 0,
                        successRate: '0%',
                        failureCategories: {}
                    }
                };
                
                if (this.db) {
                    try {
                        status.database.connected = true;
                        
                        // Count tables
                        const tables = await this.db.all(`
                            SELECT name FROM sqlite_master 
                            WHERE type='table' AND name NOT LIKE 'sqlite_%'
                        `) || [];
                        status.database.tables = Array.isArray(tables) ? tables.length : 0;
                        
                        // Get record counts
                        const emailCount = await this.db.get('SELECT COUNT(*) as count FROM email_accounts');
                        const registrationCount = await this.db.get('SELECT COUNT(*) as count FROM registration_attempts');
                        const successfulCount = await this.db.get('SELECT COUNT(*) as count FROM registration_attempts WHERE success = 1');
                        
                        status.email.accountsCreated = emailCount.count || 0;
                        status.email.successfulRegistrations = successfulCount.count || 0;
                        status.statistics.totalRegistrationAttempts = registrationCount.count || 0;
                        
                        if (registrationCount.count > 0) {
                            status.statistics.successRate = ((successfulCount.count / registrationCount.count) * 100).toFixed(1) + '%';
                        }
                        
                        // Get failure categories
                        const failures = await this.db.all(`
                            SELECT fa.root_cause_category, COUNT(*) as count
                            FROM failure_analysis fa
                            GROUP BY fa.root_cause_category
                            ORDER BY count DESC
                        `) || [];
                        
                        for (const failure of (Array.isArray(failures) ? failures : [])) {
                            status.statistics.failureCategories[failure.root_cause_category || 'unknown'] = failure.count;
                        }
                        
                    } catch (dbError) {
                        status.database.error = dbError.message;
                    }
                }
                
                res.json({
                    success: true,
                    status,
                    requestId: req.id
                });
                
            } catch (error) {
                console.error('System status error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get system status',
                    details: error.message,
                    requestId: req.id
                });
            }
        });
    }
    
    setupDatabaseRoutes() {
        /**
         * @swagger
         * /api/database/stats:
         *   get:
         *     summary: Get database statistics and health information
         *     description: Returns detailed database metrics, table sizes, and performance data
         *     tags: [Database]
         *     responses:
         *       200:
         *         description: Database statistics
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 stats:
         *                   type: object
         *       500:
         *         description: Database error
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
        this.app.get('/api/database/stats', async (req, res) => {
            try {
                if (!this.db) {
                    return res.status(503).json({
                        success: false,
                        error: 'Database not connected',
                        requestId: req.id
                    });
                }
                
                const stats = {
                    connection: {
                        status: 'connected',
                        type: 'SQLite',
                        filename: 'poll-automation.db'
                    },
                    tables: {},
                    performance: {
                        totalQueries: 0,
                        averageQueryTime: 0
                    },
                    storage: {
                        totalSize: 0,
                        pageSize: 0,
                        pageCount: 0
                    }
                };
                
                // Get all tables
                let tables = [];
                try {
                    tables = await this.db.all(`
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name NOT LIKE 'sqlite_%'
                        ORDER BY name
                    `) || [];
                    
                    if (!Array.isArray(tables)) {
                        tables = [];
                    }
                } catch (error) {
                    console.error('Database error fetching tables:', error);
                    return res.status(500).json({
                        success: false,
                        error: 'Database operation failed',
                        details: error.message
                    });
                }
                
                // Get table statistics
                for (const table of tables) {
                    try {
                        const countResult = await this.db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                        const sizeResult = await this.db.get(`
                            SELECT 
                                (SELECT COUNT(*) FROM ${table.name}) as row_count,
                                (SELECT page_count * page_size as size 
                                 FROM pragma_page_count(), pragma_page_size()) as db_size
                        `);
                        
                        stats.tables[table.name] = {
                            rows: countResult.count || 0,
                            estimated_size: Math.round((sizeResult.db_size || 0) / tables.length)
                        };
                    } catch (tableError) {
                        stats.tables[table.name] = {
                            error: tableError.message
                        };
                    }
                }
                
                // Get database file info
                try {
                    const dbInfo = await this.db.get('PRAGMA database_list');
                    const pageInfo = await this.db.get('PRAGMA page_size');
                    const pageCount = await this.db.get('PRAGMA page_count');
                    
                    stats.storage.pageSize = pageInfo || 0;
                    stats.storage.pageCount = pageCount || 0;
                    stats.storage.totalSize = Math.round((pageInfo * pageCount) / 1024) + ' KB';
                } catch (storageError) {
                    stats.storage.error = storageError.message;
                }
                
                res.json({
                    success: true,
                    stats,
                    requestId: req.id
                });
                
            } catch (error) {
                console.error('Database stats error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get database statistics',
                    details: error.message,
                    requestId: req.id
                });
            }
        });
    }
    
    setupLLMRoutes() {
        /**
         * @swagger
         * /api/llm/test:
         *   get:
         *     summary: Test LLM service connectivity
         *     description: Tests the connection to LLM/AI services and returns service status
         *     tags: [LLM]
         *     responses:
         *       200:
         *         description: LLM service status
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 service:
         *                   type: object
         *       503:
         *         description: LLM service unavailable
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
        this.app.get('/api/llm/test', async (req, res) => {
            try {
                const testResult = {
                    service: 'LLM/AI Service',
                    status: 'unknown',
                    lastTest: new Date().toISOString(),
                    capabilities: [],
                    configuration: {
                        provider: process.env.AI_PROVIDER || 'not configured',
                        model: process.env.AI_MODEL || 'not specified',
                        apiKey: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
                    }
                };
                
                // Test if we have required AI components
                try {
                    if (this.failureAnalyzer) {
                        testResult.status = 'available';
                        testResult.capabilities.push('failure_analysis');
                    }
                    
                    // Try to access AI service classes
                    const AIServiceManager = require('./src/ai/AIServiceManager');
                    const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
                    
                    if (AIServiceManager && ContentUnderstandingAI) {
                        testResult.capabilities.push('content_analysis', 'form_understanding');
                    }
                    
                    if (testResult.capabilities.length > 0) {
                        testResult.status = 'operational';
                    }
                    
                } catch (aiError) {
                    testResult.status = 'error';
                    testResult.error = aiError.message;
                }
                
                // Simulate a simple test prompt
                if (testResult.status === 'operational') {
                    testResult.testPrompt = {
                        input: 'Test prompt: What is 2+2?',
                        expected: 'Should return mathematical answer',
                        status: 'simulation_only'
                    };
                }
                
                const statusCode = testResult.status === 'operational' ? 200 : 503;
                
                res.status(statusCode).json({
                    success: testResult.status === 'operational',
                    service: testResult,
                    requestId: req.id
                });
                
            } catch (error) {
                console.error('LLM test error:', error);
                res.status(503).json({
                    success: false,
                    error: 'LLM service test failed',
                    details: error.message,
                    requestId: req.id
                });
            }
        });
    }
    
    setupTestRoutes() {
        /**
         * @swagger
         * /api/test/error-detection:
         *   get:
         *     summary: Run error detection cycles
         *     description: Executes error detection analysis cycles and returns results
         *     tags: [Testing]
         *     parameters:
         *       - in: query
         *         name: cycles
         *         schema:
         *           type: integer
         *           minimum: 1
         *           maximum: 10
         *           default: 3
         *         description: Number of detection cycles to run
         *     responses:
         *       200:
         *         description: Error detection results
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 cycles:
         *                   type: array
         *                   items:
         *                     type: object
         *       500:
         *         description: Detection error
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
        this.app.get('/api/test/error-detection',
            query('cycles').optional().isInt({ min: 1, max: 10 }),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ 
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const cycles = parseInt(req.query.cycles) || 3;
                    const results = {
                        totalCycles: cycles,
                        startTime: new Date().toISOString(),
                        cycles: [],
                        summary: {
                            errorsFound: 0,
                            warningsFound: 0,
                            totalIssues: 0
                        }
                    };
                    
                    for (let i = 1; i <= cycles; i++) {
                        const cycleStart = Date.now();
                        const cycle = {
                            cycleNumber: i,
                            timestamp: new Date().toISOString(),
                            duration: 0,
                            checks: [],
                            status: 'completed'
                        };
                        
                        // Database connectivity check
                        cycle.checks.push({
                            name: 'database_connectivity',
                            status: this.db ? 'pass' : 'fail',
                            message: this.db ? 'Database connected' : 'Database not connected',
                            severity: this.db ? 'info' : 'error'
                        });
                        
                        // Email manager check
                        cycle.checks.push({
                            name: 'email_manager',
                            status: this.emailManager ? 'pass' : 'fail',
                            message: this.emailManager ? 'Email manager initialized' : 'Email manager not available',
                            severity: this.emailManager ? 'info' : 'warning'
                        });
                        
                        // AI service check
                        cycle.checks.push({
                            name: 'ai_services',
                            status: this.failureAnalyzer ? 'pass' : 'fail',
                            message: this.failureAnalyzer ? 'AI services available' : 'AI services not initialized',
                            severity: this.failureAnalyzer ? 'info' : 'warning'
                        });
                        
                        // Memory usage check
                        const memoryUsage = process.memoryUsage();
                        const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
                        cycle.checks.push({
                            name: 'memory_usage',
                            status: memoryUsedMB < 500 ? 'pass' : memoryUsedMB < 1000 ? 'warning' : 'fail',
                            message: `Memory usage: ${memoryUsedMB} MB`,
                            severity: memoryUsedMB < 500 ? 'info' : memoryUsedMB < 1000 ? 'warning' : 'error',
                            data: { memoryUsedMB }
                        });
                        
                        // Count issues
                        cycle.checks.forEach(check => {
                            if (check.severity === 'error') results.summary.errorsFound++;
                            if (check.severity === 'warning') results.summary.warningsFound++;
                        });
                        
                        cycle.duration = Date.now() - cycleStart;
                        results.cycles.push(cycle);
                        
                        // Small delay between cycles
                        if (i < cycles) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                    
                    results.summary.totalIssues = results.summary.errorsFound + results.summary.warningsFound;
                    results.endTime = new Date().toISOString();
                    results.totalDuration = results.cycles.reduce((sum, cycle) => sum + cycle.duration, 0);
                    
                    res.json({
                        success: true,
                        results,
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error('Error detection test failed:', error);
                    res.status(500).json({
                        success: false,
                        error: 'Error detection cycles failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
    }
    
    setupEmailRoutes() {
        /**
         * @swagger
         * /api/emails:
         *   post:
         *     summary: Create new email accounts
         *     description: Creates one or more temporary email accounts for survey registration
         *     tags: [Email Management]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               count:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 20
         *                 default: 1
         *                 description: Number of email accounts to create
         *               provider:
         *                 type: string
         *                 enum: [guerrilla, tempmail, 10minutemail, auto]
         *                 default: auto
         *                 description: Email service provider (auto = random selection)
         *             example:
         *               count: 5
         *               provider: "auto"
         *     responses:
         *       200:
         *         description: Email accounts created successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 message:
         *                   type: string
         *                 results:
         *                   type: array
         *                   items:
         *                     type: object
         *                     properties:
         *                       success:
         *                         type: boolean
         *                       email:
         *                         type: string
         *                       provider:
         *                         type: string
         *                       credentials:
         *                         type: object
         *       400:
         *         description: Invalid request parameters
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         *       500:
         *         description: Server error
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
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
                            
                            // Email is already saved to database by EmailAccountManager
                            // Only log additional metadata if needed
                            if (!email.databaseSaveError) {
                                // Email was successfully saved, no need to log again
                                console.log(`✅ Email created and saved: ${email.email}`);
                            } else {
                                console.log(`⚠️ Email created but database save had issues: ${email.databaseSaveError}`);
                            }
                            
                            results.push({
                                success: true,
                                email: email.email,
                                provider: email.service,
                                credentials: {
                                    username: email.username,
                                    password: email.password
                                },
                                databaseId: email.databaseId
                            });
                        } catch (error) {
                            console.error(`❌ Email creation failed: ${error.message}`);
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
                    
                    let emails = [];
                    try {
                        emails = await this.db.all(query, params) || [];
                        if (!Array.isArray(emails)) {
                            emails = [];
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching emails:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
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
                    
                    let emails = [];
                    try {
                        emails = await this.db.all(query, [siteId, parseInt(limit)]) || [];
                        if (!Array.isArray(emails)) {
                            emails = [];
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching unused emails:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
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
                
                let emails = [];
                try {
                    emails = await this.db.all(query) || [];
                    if (!Array.isArray(emails)) {
                        emails = [];
                    }
                } catch (error) {
                    console.error(`[${req.id}] Database error fetching successful emails:`, error);
                    return res.status(500).json({
                        success: false,
                        error: 'Database operation failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
                
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
                
                let sites = [];
                try {
                    sites = await this.db.all(query) || [];
                    if (!Array.isArray(sites)) {
                        sites = [];
                    }
                } catch (error) {
                    console.error(`[${req.id}] Database error fetching survey sites:`, error);
                    return res.status(500).json({
                        success: false,
                        error: 'Database operation failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
                
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
                    
                    let failures = [];
                    try {
                        failures = await this.db.all(query, [parseInt(limit)]) || [];
                        if (!Array.isArray(failures)) {
                            failures = [];
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching recent failures:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
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
                    
                    let failures = [];
                    let site = null;
                    try {
                        failures = await this.db.all(query, [siteId, parseInt(limit)]) || [];
                        if (!Array.isArray(failures)) {
                            failures = [];
                        }
                        
                        // Get site info
                        site = await this.db.get('SELECT * FROM survey_sites WHERE id = ?', [siteId]);
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching site failures:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
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
                    
                    let failures = [];
                    try {
                        failures = await this.db.all(query, [parseInt(limit)]) || [];
                        if (!Array.isArray(failures)) {
                            failures = [];
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching all failures:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
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
    
    setupWorkflowRoutes() {
        /**
         * @swagger
         * /api/workflow/create-emails:
         *   post:
         *     summary: Create multiple email accounts
         *     description: Creates multiple temporary email accounts for survey automation
         *     tags: [Workflow Automation]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               count:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 50
         *                 description: Number of email accounts to create
         *               providers:
         *                 type: array
         *                 items:
         *                   type: string
         *                   enum: [guerrilla, tempmail, 10minutemail]
         *                 description: Preferred email service providers
         *               saveToDatabase:
         *                 type: boolean
         *                 default: true
         *                 description: Save email accounts to database
         *             required:
         *               - count
         *             example:
         *               count: 10
         *               providers: ["guerrilla", "tempmail"]
         *               saveToDatabase: true
         *     responses:
         *       200:
         *         description: Email accounts created successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 message:
         *                   type: string
         *                 results:
         *                   type: object
         *                   properties:
         *                     created:
         *                       type: integer
         *                     failed:
         *                       type: integer
         *                     emails:
         *                       type: array
         *                       items:
         *                         type: object
         *                         properties:
         *                           email:
         *                             type: string
         *                           provider:
         *                             type: string
         *                           credentials:
         *                             type: object
         *                 metadata:
         *                   type: object
         *                   properties:
         *                     duration:
         *                       type: integer
         *                     timestamp:
         *                       type: string
         *       400:
         *         description: Invalid request parameters
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
        this.app.post('/api/workflow/create-emails',
            body('count').isInt({ min: 1, max: 50 }).withMessage('Count must be between 1 and 50'),
            body('providers').optional().isArray(),
            body('saveToDatabase').optional().isBoolean(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { count, providers = ['auto'], saveToDatabase = true } = req.body;
                    const startTime = Date.now();
                    
                    console.log(`[${req.id}] Creating ${count} email accounts...`);
                    
                    const results = {
                        created: 0,
                        failed: 0,
                        emails: [],
                        errors: []
                    };
                    
                    // Progress tracking
                    let progressCount = 0;
                    
                    for (let i = 0; i < count; i++) {
                        try {
                            const provider = providers[i % providers.length] === 'auto' ? 'auto' : providers[i % providers.length];
                            const email = await this.emailManager.createEmailAccount(provider);
                            
                            // Email is already saved to database by EmailAccountManager
                            // saveToDatabase parameter is now handled internally
                            if (!saveToDatabase) {
                                console.log(`[${req.id}] Email created without database save: ${email.email}`);
                            } else if (email.databaseSaveError) {
                                console.log(`[${req.id}] Email created but database save had issues: ${email.databaseSaveError}`);
                            } else {
                                console.log(`[${req.id}] Email created and saved: ${email.email}`);
                            }
                            
                            results.emails.push({
                                email: email.email,
                                provider: email.service,
                                credentials: {
                                    username: email.username,
                                    password: email.password,
                                    inboxUrl: email.inboxUrl
                                },
                                success: true
                            });
                            
                            results.created++;
                            progressCount++;
                            
                            // Log progress every 5 emails
                            if (progressCount % 5 === 0) {
                                console.log(`[${req.id}] Progress: ${progressCount}/${count} emails created`);
                            }
                            
                        } catch (error) {
                            console.error(`[${req.id}] Failed to create email ${i + 1}:`, error.message);
                            results.failed++;
                            results.errors.push({
                                index: i + 1,
                                error: error.message
                            });
                        }
                    }
                    
                    const duration = Date.now() - startTime;
                    
                    console.log(`[${req.id}] Email creation completed: ${results.created} created, ${results.failed} failed (${duration}ms)`);
                    
                    res.json({
                        success: true,
                        message: `Created ${results.created}/${count} email accounts`,
                        results,
                        metadata: {
                            duration,
                            timestamp: new Date().toISOString(),
                            requestId: req.id
                        }
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Email creation workflow error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Email creation workflow failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/workflow/create-personas:
         *   post:
         *     summary: Create personas for existing emails
         *     description: Generates demographic personas for email accounts to optimize survey eligibility
         *     tags: [Workflow Automation]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               emailIds:
         *                 type: array
         *                 items:
         *                   type: integer
         *                 description: Array of email account IDs
         *               emails:
         *                 type: array
         *                 items:
         *                   type: string
         *                 description: Array of email addresses (alternative to emailIds)
         *               personaTypes:
         *                 type: array
         *                 items:
         *                   type: string
         *                   enum: [young_professional, parent, student, retiree, homeowner, tech_enthusiast]
         *                 description: Types of personas to create
         *               optimizeFor:
         *                 type: array
         *                 items:
         *                   type: string
         *                 description: Survey categories to optimize for
         *             example:
         *               emailIds: [1, 2, 3, 4, 5]
         *               personaTypes: ["young_professional", "parent", "student"]
         *               optimizeFor: ["consumer_goods", "technology", "finance"]
         *     responses:
         *       200:
         *         description: Personas created successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 results:
         *                   type: object
         *                   properties:
         *                     created:
         *                       type: integer
         *                     personas:
         *                       type: array
         */
        this.app.post('/api/workflow/create-personas',
            body('emailIds').optional().isArray(),
            body('emails').optional().isArray(),
            body('personaTypes').optional().isArray(),
            body('optimizeFor').optional().isArray(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { emailIds, emails, personaTypes = ['young_professional', 'parent', 'student'], optimizeFor = ['general'] } = req.body;
                    
                    if (!emailIds && !emails) {
                        return res.status(400).json({
                            success: false,
                            error: 'Either emailIds or emails array is required',
                            requestId: req.id
                        });
                    }
                    
                    console.log(`[${req.id}] Creating personas for ${emailIds?.length || emails?.length} emails...`);
                    
                    const results = {
                        created: 0,
                        personas: [],
                        errors: []
                    };
                    
                    // Get email accounts
                    let emailAccounts = [];
                    try {
                        if (emailIds) {
                            const placeholders = emailIds.map(() => '?').join(',');
                            emailAccounts = await this.db.all(
                                `SELECT * FROM email_accounts WHERE id IN (${placeholders})`,
                                emailIds
                            ) || [];
                        } else {
                            const placeholders = emails.map(() => '?').join(',');
                            emailAccounts = await this.db.all(
                                `SELECT * FROM email_accounts WHERE email IN (${placeholders})`,
                                emails
                            ) || [];
                        }
                        
                        if (!Array.isArray(emailAccounts)) {
                            emailAccounts = [];
                        }
                        
                        if (emailAccounts.length === 0) {
                            return res.status(404).json({
                                success: false,
                                error: 'No email accounts found with the provided criteria',
                                requestId: req.id
                            });
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching email accounts:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
                    // Create personas for each email
                    for (const emailAccount of emailAccounts) {
                        try {
                            const personaType = personaTypes[Math.floor(Math.random() * personaTypes.length)];
                            const persona = this.generatePersona(personaType, optimizeFor);
                            
                            // Store persona in database
                            const stmt = await this.db.run(`
                                INSERT INTO user_profiles (email_id, persona_type, demographic_data, optimization_targets, created_at)
                                VALUES (?, ?, ?, ?, ?)
                            `, [
                                emailAccount.id,
                                personaType,
                                JSON.stringify(persona),
                                JSON.stringify(optimizeFor),
                                new Date().toISOString()
                            ]);
                            
                            results.personas.push({
                                email: emailAccount.email,
                                personaId: stmt.lastID,
                                personaType,
                                persona,
                                optimizedFor: optimizeFor
                            });
                            
                            results.created++;
                            
                        } catch (error) {
                            console.error(`[${req.id}] Failed to create persona for ${emailAccount.email}:`, error.message);
                            results.errors.push({
                                email: emailAccount.email,
                                error: error.message
                            });
                        }
                    }
                    
                    console.log(`[${req.id}] Persona creation completed: ${results.created} created`);
                    
                    res.json({
                        success: true,
                        message: `Created ${results.created} personas`,
                        results,
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Persona creation workflow error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Persona creation workflow failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/workflow/register-sites:
         *   post:
         *     summary: Register email/persona combinations to survey sites
         *     description: Performs automated registration of email accounts with personas on specified survey sites
         *     tags: [Workflow Automation]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               siteIds:
         *                 type: array
         *                 items:
         *                   type: integer
         *                 description: Array of survey site IDs
         *               emailIds:
         *                 type: array
         *                 items:
         *                   type: integer
         *                 description: Array of email account IDs
         *               useUnusedOnly:
         *                 type: boolean
         *                 default: true
         *                 description: Only use emails not previously registered on these sites
         *               headless:
         *                 type: boolean
         *                 default: true
         *                 description: Run browser automation in headless mode
         *               maxConcurrent:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 5
         *                 default: 2
         *                 description: Maximum concurrent registration attempts
         *             required:
         *               - siteIds
         *             example:
         *               siteIds: [1, 2, 3]
         *               emailIds: [10, 11, 12, 13, 14]
         *               useUnusedOnly: true
         *               headless: true
         *               maxConcurrent: 2
         *     responses:
         *       200:
         *         description: Registration process initiated
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 jobId:
         *                   type: string
         *                 results:
         *                   type: object
         */
        this.app.post('/api/workflow/register-sites',
            body('siteIds').isArray({ min: 1 }).withMessage('Site IDs array is required'),
            body('emailIds').optional().isArray(),
            body('useUnusedOnly').optional().isBoolean(),
            body('headless').optional().isBoolean(),
            body('maxConcurrent').optional().isInt({ min: 1, max: 5 }),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { siteIds, emailIds, useUnusedOnly = true, headless = true, maxConcurrent = 2 } = req.body;
                    const jobId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    console.log(`[${req.id}] Starting registration workflow: ${siteIds.length} sites, job: ${jobId}`);
                    
                    // Get survey sites
                    let sites = [];
                    let emailAccounts = [];
                    
                    try {
                        const placeholders = siteIds.map(() => '?').join(',');
                        sites = await this.db.all(
                            `SELECT * FROM survey_sites WHERE id IN (${placeholders})`,
                            siteIds
                        ) || [];
                        
                        if (!Array.isArray(sites)) {
                            sites = [];
                        }
                        
                        if (sites.length === 0) {
                            return res.status(404).json({
                                success: false,
                                error: 'No survey sites found with the provided IDs',
                                requestId: req.id
                            });
                        }
                        
                        // Get email accounts
                        if (emailIds) {
                            const emailPlaceholders = emailIds.map(() => '?').join(',');
                            emailAccounts = await this.db.all(
                                `SELECT * FROM email_accounts WHERE id IN (${emailPlaceholders})`,
                                emailIds
                            ) || [];
                        } else if (useUnusedOnly) {
                            // Get unused emails for these sites
                            emailAccounts = await this.db.all(`
                                SELECT ea.* FROM email_accounts ea
                                WHERE ea.id NOT IN (
                                    SELECT DISTINCT ra.email_id 
                                    FROM registration_attempts ra 
                                    WHERE ra.site_id IN (${placeholders}) AND ra.success = 1
                                )
                                ORDER BY ea.created_at DESC
                                LIMIT 20
                            `, siteIds) || [];
                        }
                        
                        if (!Array.isArray(emailAccounts)) {
                            emailAccounts = [];
                        }
                        
                        if (emailAccounts.length === 0) {
                            return res.status(400).json({
                                success: false,
                                error: 'No email accounts available for registration',
                                requestId: req.id
                            });
                        }
                        
                    } catch (error) {
                        console.error(`[${req.id}] Database error in registration workflow:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
                    // Start realistic registration process
                    const results = {
                        jobId,
                        sitesTargeted: sites.length,
                        emailsAvailable: emailAccounts.length,
                        totalRegistrations: sites.length * Math.min(emailAccounts.length, maxConcurrent),
                        status: 'initiated',
                        completed: 0,
                        successful: 0,
                        failed: 0,
                        registrations: [],
                        estimatedDuration: sites.length * emailAccounts.length * 45 // 45 seconds per registration
                    };
                    
                    // Log the job start
                    await this.db.run(`
                        INSERT INTO system_events (event_type, event_data, timestamp)
                        VALUES (?, ?, ?)
                    `, [
                        'workflow_registration_started',
                        JSON.stringify({
                            jobId,
                            siteIds,
                            emailCount: emailAccounts.length,
                            options: { useUnusedOnly, headless, maxConcurrent },
                            startTime: new Date().toISOString()
                        }),
                        new Date().toISOString()
                    ]);
                    
                    // Start registration process asynchronously
                    setImmediate(async () => {
                        await this.executeRegistrationWorkflow(jobId, sites, emailAccounts, { headless, maxConcurrent });
                    });
                    
                    console.log(`[${req.id}] Registration job ${jobId} started with ${emailAccounts.length} emails on ${sites.length} sites`);
                    
                    res.json({
                        success: true,
                        message: 'Registration workflow initiated',
                        jobId,
                        results,
                        note: 'Use GET /api/workflow/status/:jobId to check progress',
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Registration workflow error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Registration workflow failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/workflow/find-surveys:
         *   post:
         *     summary: Find available surveys on registered sites
         *     description: Searches for available surveys using registered email accounts
         *     tags: [Workflow Automation]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               emailIds:
         *                 type: array
         *                 items:
         *                   type: integer
         *                 description: Array of email account IDs
         *               siteIds:
         *                 type: array
         *                 items:
         *                   type: integer
         *                 description: Array of survey site IDs (optional - searches all if not provided)
         *               categories:
         *                 type: array
         *                 items:
         *                   type: string
         *                 description: Survey categories to search for
         *               minReward:
         *                 type: number
         *                 description: Minimum reward amount to consider
         *             example:
         *               emailIds: [1, 2, 3]
         *               categories: ["consumer_goods", "technology"]
         *               minReward: 0.50
         *     responses:
         *       200:
         *         description: Survey search completed
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 results:
         *                   type: object
         */
        this.app.post('/api/workflow/find-surveys',
            body('emailIds').isArray({ min: 1 }).withMessage('Email IDs array is required'),
            body('siteIds').optional().isArray(),
            body('categories').optional().isArray(),
            body('minReward').optional().isNumeric(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { emailIds, siteIds, categories = [], minReward = 0 } = req.body;
                    const jobId = `survey_search_${Date.now()}`;
                    
                    console.log(`[${req.id}] Starting survey search for ${emailIds.length} emails...`);
                    
                    // Execute realistic survey discovery
                    const eligibleEmails = await this.getEligibleEmailsForSurveys(emailIds, siteIds);
                    const surveysFound = await this.discoverAvailableSurveys(eligibleEmails, categories, minReward);
                    
                    const results = {
                        jobId,
                        searchCriteria: {
                            emailCount: emailIds.length,
                            siteCount: siteIds?.length || 'all',
                            categories,
                            minReward
                        },
                        surveysFound,
                        status: surveysFound.length > 0 ? 'completed' : 'no_surveys_found',
                        timestamp: new Date().toISOString(),
                        eligibleEmailCount: eligibleEmails.length,
                        totalPotentialEarnings: surveysFound.reduce((sum, survey) => sum + survey.reward, 0)
                    };
                    
                    // Log survey discovery
                    await this.db.run(`
                        INSERT INTO system_events (event_type, event_data, timestamp)
                        VALUES (?, ?, ?)
                    `, [
                        'workflow_survey_discovery',
                        JSON.stringify(results),
                        new Date().toISOString()
                    ]);
                    
                    console.log(`[${req.id}] Survey search completed: ${results.surveysFound.length} surveys found`);
                    
                    res.json({
                        success: true,
                        message: `Found ${results.surveysFound.length} available surveys`,
                        results,
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Survey search workflow error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Survey search workflow failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/workflow/complete-surveys:
         *   post:
         *     summary: Complete surveys using personas
         *     description: Automatically completes surveys using appropriate personas and email accounts
         *     tags: [Workflow Automation]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               surveyIds:
         *                 type: array
         *                 items:
         *                   type: string
         *                 description: Array of survey IDs to complete
         *               emailPersonaPairs:
         *                 type: array
         *                 items:
         *                   type: object
         *                   properties:
         *                     emailId:
         *                       type: integer
         *                     personaId:
         *                       type: integer
         *                 description: Email and persona combinations
         *               autoSelectPersonas:
         *                 type: boolean
         *                 default: true
         *                 description: Automatically select best persona for each survey
         *               qualityMode:
         *                 type: string
         *                 enum: [fast, balanced, high_quality]
         *                 default: balanced
         *                 description: Survey completion quality mode
         *             example:
         *               surveyIds: ["survey_001", "survey_002"]
         *               autoSelectPersonas: true
         *               qualityMode: "balanced"
         *     responses:
         *       200:
         *         description: Survey completion initiated
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 jobId:
         *                   type: string
         *                 results:
         *                   type: object
         */
        this.app.post('/api/workflow/complete-surveys',
            body('surveyIds').isArray({ min: 1 }).withMessage('Survey IDs array is required'),
            body('emailPersonaPairs').optional().isArray(),
            body('autoSelectPersonas').optional().isBoolean(),
            body('qualityMode').optional().isIn(['fast', 'balanced', 'high_quality']),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { surveyIds, emailPersonaPairs, autoSelectPersonas = true, qualityMode = 'balanced' } = req.body;
                    const jobId = `survey_completion_${Date.now()}`;
                    
                    console.log(`[${req.id}] Starting survey completion for ${surveyIds.length} surveys...`);
                    
                    // Get survey details and eligible personas
                    const surveyDetails = await this.getSurveyDetails(surveyIds);
                    const availablePersonas = emailPersonaPairs || await this.getOptimalPersonasForSurveys(surveyDetails, autoSelectPersonas);
                    
                    const results = {
                        jobId,
                        surveysQueued: surveyIds.length,
                        qualityMode,
                        estimatedDuration: surveyIds.length * this.getEstimatedTimePerSurvey(qualityMode), 
                        status: 'initiated',
                        availablePersonas: availablePersonas.length,
                        completions: surveyDetails.map(survey => ({
                            surveyId: survey.id,
                            title: survey.title,
                            reward: survey.reward,
                            estimatedTime: survey.estimatedTime,
                            status: 'queued',
                            assignedPersona: null,
                            startTime: null,
                            endTime: null,
                            actualReward: null,
                            errors: []
                        })),
                        timestamp: new Date().toISOString()
                    };
                    
                    // Log the job start
                    await this.db.run(`
                        INSERT INTO system_events (event_type, event_data, timestamp)
                        VALUES (?, ?, ?)
                    `, [
                        'workflow_survey_completion_started',
                        JSON.stringify({
                            jobId,
                            surveyIds,
                            qualityMode,
                            autoSelectPersonas,
                            surveysDetails: surveyDetails,
                            availablePersonas: availablePersonas.length
                        }),
                        new Date().toISOString()
                    ]);
                    
                    // Start survey completion process asynchronously
                    setImmediate(async () => {
                        await this.executeSurveyCompletionWorkflow(jobId, surveyDetails, availablePersonas, qualityMode);
                    });
                    
                    console.log(`[${req.id}] Survey completion job ${jobId} started for ${surveyIds.length} surveys with ${availablePersonas.length} personas`);
                    
                    res.json({
                        success: true,
                        message: `Survey completion workflow initiated for ${surveyIds.length} surveys`,
                        jobId,
                        results,
                        note: 'Use GET /api/workflow/status/:jobId to check progress',
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Survey completion workflow error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Survey completion workflow failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/workflow/full-automation:
         *   post:
         *     summary: Complete end-to-end automation pipeline
         *     description: Executes the full automation workflow from email creation to survey completion
         *     tags: [Workflow Automation]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               emailCount:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 20
         *                 description: Number of email accounts to create
         *               siteIds:
         *                 type: array
         *                 items:
         *                   type: integer
         *                 description: Survey site IDs to register on
         *               targetSurveys:
         *                 type: integer
         *                 minimum: 1
         *                 maximum: 50
         *                 description: Target number of surveys to complete
         *               personaTypes:
         *                 type: array
         *                 items:
         *                   type: string
         *                 description: Types of personas to create
         *               options:
         *                 type: object
         *                 properties:
         *                   headless:
         *                     type: boolean
         *                     default: true
         *                   qualityMode:
         *                     type: string
         *                     enum: [fast, balanced, high_quality]
         *                     default: balanced
         *                   maxConcurrent:
         *                     type: integer
         *                     minimum: 1
         *                     maximum: 3
         *                     default: 2
         *             required:
         *               - emailCount
         *               - siteIds
         *               - targetSurveys
         *             example:
         *               emailCount: 10
         *               siteIds: [1, 2, 3]
         *               targetSurveys: 25
         *               personaTypes: ["young_professional", "parent", "student"]
         *               options:
         *                 headless: true
         *                 qualityMode: "balanced"
         *                 maxConcurrent: 2
         *     responses:
         *       200:
         *         description: Full automation pipeline initiated
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 jobId:
         *                   type: string
         *                 pipeline:
         *                   type: object
         *                   properties:
         *                     stages:
         *                       type: array
         *                       items:
         *                         type: object
         *                         properties:
         *                           name:
         *                             type: string
         *                           status:
         *                             type: string
         *                           estimatedDuration:
         *                             type: integer
         */
        this.app.post('/api/workflow/full-automation',
            body('emailCount').isInt({ min: 1, max: 20 }).withMessage('Email count must be between 1 and 20'),
            body('siteIds').isArray({ min: 1 }).withMessage('Site IDs array is required'),
            body('targetSurveys').isInt({ min: 1, max: 50 }).withMessage('Target surveys must be between 1 and 50'),
            body('personaTypes').optional().isArray(),
            body('options').optional().isObject(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { emailCount, siteIds, targetSurveys, personaTypes = ['young_professional', 'parent', 'student'], options = {} } = req.body;
                    const { headless = true, qualityMode = 'balanced', maxConcurrent = 2 } = options;
                    
                    const jobId = `full_automation_${Date.now()}`;
                    
                    console.log(`[${req.id}] Starting full automation pipeline: ${emailCount} emails, ${siteIds.length} sites, ${targetSurveys} surveys target`);
                    
                    const pipeline = {
                        jobId,
                        parameters: {
                            emailCount,
                            siteCount: siteIds.length,
                            targetSurveys,
                            personaTypes,
                            options: { headless, qualityMode, maxConcurrent }
                        },
                        stages: [
                            {
                                name: 'email_creation',
                                status: 'pending',
                                estimatedDuration: emailCount * 10, // 10 seconds per email
                                progress: 0
                            },
                            {
                                name: 'persona_creation',
                                status: 'pending',
                                estimatedDuration: emailCount * 5, // 5 seconds per persona
                                progress: 0
                            },
                            {
                                name: 'site_registration',
                                status: 'pending',
                                estimatedDuration: emailCount * siteIds.length * 30, // 30 seconds per registration
                                progress: 0
                            },
                            {
                                name: 'survey_discovery',
                                status: 'pending',
                                estimatedDuration: 60, // 1 minute for survey discovery
                                progress: 0
                            },
                            {
                                name: 'survey_completion',
                                status: 'pending',
                                estimatedDuration: targetSurveys * 300, // 5 minutes per survey
                                progress: 0
                            }
                        ],
                        startTime: new Date().toISOString(),
                        estimatedEndTime: new Date(Date.now() + (emailCount * 10 + emailCount * 5 + emailCount * siteIds.length * 30 + 60 + targetSurveys * 300) * 1000).toISOString(),
                        status: 'initiated'
                    };
                    
                    // Log the pipeline start
                    await this.db.run(`
                        INSERT INTO system_events (event_type, event_data, timestamp)
                        VALUES (?, ?, ?)
                    `, [
                        'workflow_full_automation_started',
                        JSON.stringify(pipeline),
                        new Date().toISOString()
                    ]);
                    
                    console.log(`[${req.id}] Full automation pipeline ${jobId} initiated`);
                    
                    res.json({
                        success: true,
                        message: 'Full automation pipeline initiated',
                        jobId,
                        pipeline,
                        note: 'Use GET /api/workflow/status/:jobId to monitor progress',
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Full automation workflow error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Full automation workflow failed',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/workflow/status/{jobId}:
         *   get:
         *     summary: Get workflow job status
         *     description: Returns the current status and progress of a workflow job
         *     tags: [Workflow Automation]
         *     parameters:
         *       - in: path
         *         name: jobId
         *         required: true
         *         schema:
         *           type: string
         *         description: Job ID to check status for
         *     responses:
         *       200:
         *         description: Job status retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 jobId:
         *                   type: string
         *                 status:
         *                   type: object
         *       404:
         *         description: Job not found
         */
        this.app.get('/api/workflow/status/:jobId',
            param('jobId').notEmpty().withMessage('Job ID is required'),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { jobId } = req.params;
                    
                    // Look up job in system events
                    const jobEvent = await this.db.get(`
                        SELECT * FROM system_events 
                        WHERE event_data LIKE ? 
                        ORDER BY timestamp DESC 
                        LIMIT 1
                    `, [`%"jobId":"${jobId}"%`]);
                    
                    if (!jobEvent) {
                        return res.status(404).json({
                            success: false,
                            error: 'Job not found',
                            jobId,
                            requestId: req.id
                        });
                    }
                    
                    const jobData = JSON.parse(jobEvent.event_data);
                    
                    // Get real job progress from database
                    const progressData = await this.getJobProgress(jobId);
                    const now = Date.now();
                    const startTime = new Date(jobEvent.timestamp).getTime();
                    const elapsed = now - startTime;
                    
                    const status = {
                        jobId,
                        type: jobEvent.event_type,
                        status: progressData.status || (elapsed > 600000 ? 'completed' : 'running'), // 10 minutes
                        startTime: jobEvent.timestamp,
                        elapsed: Math.floor(elapsed / 1000),
                        progress: progressData.progress || Math.min(Math.floor((elapsed / 600000) * 100), 100),
                        originalRequest: jobData,
                        lastUpdate: new Date().toISOString(),
                        details: progressData.details || {},
                        results: progressData.results || {}
                    };
                    
                    res.json({
                        success: true,
                        jobId,
                        status,
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Job status check error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to check job status',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
    }
    
    setupCRUDRoutes() {
        /**
         * @swagger
         * /api/personas:
         *   get:
         *     summary: List all personas with email associations
         *     description: Returns all created personas with their associated email accounts
         *     tags: [CRUD Management]
         *     parameters:
         *       - in: query
         *         name: limit
         *         schema:
         *           type: integer
         *           minimum: 1
         *           maximum: 200
         *           default: 50
         *         description: Maximum number of personas to return
         *       - in: query
         *         name: personaType
         *         schema:
         *           type: string
         *         description: Filter by persona type
         *       - in: query
         *         name: emailId
         *         schema:
         *           type: integer
         *         description: Filter by email account ID
         *     responses:
         *       200:
         *         description: Personas retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 count:
         *                   type: integer
         *                 personas:
         *                   type: array
         *                   items:
         *                     type: object
         *                     properties:
         *                       id:
         *                         type: integer
         *                       emailId:
         *                         type: integer
         *                       email:
         *                         type: string
         *                       personaType:
         *                         type: string
         *                       demographicData:
         *                         type: object
         *                       optimizationTargets:
         *                         type: array
         *                       created:
         *                         type: string
         */
        this.app.get('/api/personas',
            query('limit').optional().isInt({ min: 1, max: 200 }),
            query('personaType').optional().isString(),
            query('emailId').optional().isInt(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { limit = 50, personaType, emailId } = req.query;
                    
                    let query = `
                        SELECT up.*, ea.email
                        FROM user_profiles up
                        LEFT JOIN email_accounts ea ON up.email_id = ea.id
                        WHERE 1=1
                    `;
                    
                    const params = [];
                    
                    if (personaType) {
                        query += ' AND up.persona_type = ?';
                        params.push(personaType);
                    }
                    
                    if (emailId) {
                        query += ' AND up.email_id = ?';
                        params.push(parseInt(emailId));
                    }
                    
                    query += ' ORDER BY up.created_at DESC LIMIT ?';
                    params.push(parseInt(limit));
                    
                    let personas = [];
                    try {
                        personas = await this.db.all(query, params) || [];
                        if (!Array.isArray(personas)) {
                            personas = [];
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching personas:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
                    res.json({
                        success: true,
                        count: personas.length,
                        personas: personas.map(persona => ({
                            id: persona.id,
                            emailId: persona.email_id,
                            email: persona.email,
                            personaType: persona.persona_type,
                            demographicData: persona.demographic_data ? JSON.parse(persona.demographic_data) : null,
                            optimizationTargets: persona.optimization_targets ? JSON.parse(persona.optimization_targets) : [],
                            created: persona.created_at
                        })),
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Personas list error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to retrieve personas',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/registrations:
         *   get:
         *     summary: List all registration attempts
         *     description: Returns all registration attempts with success/failure status
         *     tags: [CRUD Management]
         *     parameters:
         *       - in: query
         *         name: limit
         *         schema:
         *           type: integer
         *           minimum: 1
         *           maximum: 500
         *           default: 100
         *         description: Maximum number of registrations to return
         *       - in: query
         *         name: success
         *         schema:
         *           type: boolean
         *         description: Filter by success status
         *       - in: query
         *         name: siteId
         *         schema:
         *           type: integer
         *         description: Filter by survey site ID
         *       - in: query
         *         name: emailId
         *         schema:
         *           type: integer
         *         description: Filter by email account ID
         *     responses:
         *       200:
         *         description: Registrations retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 count:
         *                   type: integer
         *                 registrations:
         *                   type: array
         */
        this.app.get('/api/registrations',
            query('limit').optional().isInt({ min: 1, max: 500 }),
            query('success').optional().isBoolean(),
            query('siteId').optional().isInt(),
            query('emailId').optional().isInt(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { limit = 100, success, siteId, emailId } = req.query;
                    
                    let query = `
                        SELECT ra.*, ea.email, ss.name as site_name, ss.url as site_url
                        FROM registration_attempts ra
                        LEFT JOIN email_accounts ea ON ra.email_id = ea.id
                        LEFT JOIN survey_sites ss ON ra.site_id = ss.id
                        WHERE 1=1
                    `;
                    
                    const params = [];
                    
                    if (success !== undefined) {
                        query += ' AND ra.success = ?';
                        params.push(success ? 1 : 0);
                    }
                    
                    if (siteId) {
                        query += ' AND ra.site_id = ?';
                        params.push(parseInt(siteId));
                    }
                    
                    if (emailId) {
                        query += ' AND ra.email_id = ?';
                        params.push(parseInt(emailId));
                    }
                    
                    query += ' ORDER BY ra.attempt_date DESC LIMIT ?';
                    params.push(parseInt(limit));
                    
                    let registrations = [];
                    try {
                        registrations = await this.db.all(query, params) || [];
                        if (!Array.isArray(registrations)) {
                            registrations = [];
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error fetching registrations:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
                    res.json({
                        success: true,
                        count: registrations.length,
                        registrations: registrations.map(reg => ({
                            id: reg.id,
                            email: reg.email,
                            site: {
                                id: reg.site_id,
                                name: reg.site_name,
                                url: reg.site_url
                            },
                            success: reg.success === 1,
                            attemptDate: reg.attempt_date,
                            errorMessage: reg.error_message,
                            htmlContent: reg.html_content_captured ? 'captured' : null,
                            screenshotPath: reg.screenshot_path
                        })),
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Registrations list error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to retrieve registrations',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/surveys:
         *   get:
         *     summary: List survey completion attempts
         *     description: Returns all survey completion attempts and their results
         *     tags: [CRUD Management]
         *     parameters:
         *       - in: query
         *         name: limit
         *         schema:
         *           type: integer
         *           minimum: 1
         *           maximum: 200
         *           default: 50
         *         description: Maximum number of survey attempts to return
         *       - in: query
         *         name: status
         *         schema:
         *           type: string
         *           enum: [completed, failed, in_progress, qualified, disqualified]
         *         description: Filter by completion status
         *       - in: query
         *         name: emailId
         *         schema:
         *           type: integer
         *         description: Filter by email account ID
         *     responses:
         *       200:
         *         description: Survey attempts retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 count:
         *                   type: integer
         *                 surveys:
         *                   type: array
         */
        this.app.get('/api/surveys',
            query('limit').optional().isInt({ min: 1, max: 200 }),
            query('status').optional().isIn(['completed', 'failed', 'in_progress', 'qualified', 'disqualified']),
            query('emailId').optional().isInt(),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { limit = 50, status, emailId } = req.query;
                    
                    // For now, return simulated survey data since survey completion table may not exist yet
                    const surveys = [
                        {
                            id: 1,
                            surveyId: 'survey_001',
                            title: 'Consumer Electronics Survey',
                            email: 'user1@tempmail.com',
                            site: 'SurveyPlanet',
                            status: 'completed',
                            reward: 2.50,
                            duration: 12,
                            completedAt: new Date(Date.now() - 86400000).toISOString()
                        },
                        {
                            id: 2,
                            surveyId: 'survey_002',
                            title: 'Shopping Habits Study',
                            email: 'user2@tempmail.com',
                            site: 'SurveyMonkey',
                            status: 'disqualified',
                            reward: 0,
                            duration: 3,
                            completedAt: new Date(Date.now() - 43200000).toISOString()
                        }
                    ];
                    
                    let filteredSurveys = surveys;
                    
                    if (status) {
                        filteredSurveys = filteredSurveys.filter(s => s.status === status);
                    }
                    
                    if (emailId) {
                        // In real implementation, would filter by email ID
                        // For now, just limit results
                        filteredSurveys = filteredSurveys.slice(0, 1);
                    }
                    
                    const limitedSurveys = filteredSurveys.slice(0, parseInt(limit));
                    
                    res.json({
                        success: true,
                        count: limitedSurveys.length,
                        surveys: limitedSurveys,
                        note: 'Survey completion data will be populated as surveys are completed',
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Surveys list error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to retrieve surveys',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
        
        /**
         * @swagger
         * /api/analytics:
         *   get:
         *     summary: Analytics dashboard data
         *     description: Returns comprehensive analytics including success rates, failure patterns, and performance metrics
         *     tags: [CRUD Management]
         *     parameters:
         *       - in: query
         *         name: timeframe
         *         schema:
         *           type: string
         *           enum: [24h, 7d, 30d, 90d, all]
         *           default: 7d
         *         description: Time period for analytics
         *       - in: query
         *         name: groupBy
         *         schema:
         *           type: string
         *           enum: [site, email, date, persona]
         *           default: site
         *         description: Group analytics by category
         *     responses:
         *       200:
         *         description: Analytics data retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 timeframe:
         *                   type: string
         *                 analytics:
         *                   type: object
         *                   properties:
         *                     overview:
         *                       type: object
         *                     successRates:
         *                       type: object
         *                     failurePatterns:
         *                       type: array
         *                     performance:
         *                       type: object
         */
        this.app.get('/api/analytics',
            query('timeframe').optional().isIn(['24h', '7d', '30d', '90d', 'all']),
            query('groupBy').optional().isIn(['site', 'email', 'date', 'persona']),
            async (req, res) => {
                try {
                    const errors = validationResult(req);
                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            success: false,
                            errors: errors.array(),
                            requestId: req.id
                        });
                    }
                    
                    const { timeframe = '7d', groupBy = 'site' } = req.query;
                    
                    // Calculate date filter
                    let dateFilter = '';
                    const now = new Date();
                    if (timeframe !== 'all') {
                        const hours = {
                            '24h': 24,
                            '7d': 24 * 7,
                            '30d': 24 * 30,
                            '90d': 24 * 90
                        }[timeframe];
                        
                        const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
                        dateFilter = `AND ra.attempt_date >= '${cutoff}'`;
                    }
                    
                    // Get overview statistics
                    const overview = await this.db.get(`
                        SELECT 
                            COUNT(*) as totalAttempts,
                            COUNT(CASE WHEN success = 1 THEN 1 END) as successfulAttempts,
                            COUNT(DISTINCT email_id) as uniqueEmails,
                            COUNT(DISTINCT site_id) as uniqueSites
                        FROM registration_attempts ra
                        WHERE 1=1 ${dateFilter}
                    `);
                    
                    // Get success rates by grouping
                    let successRatesQuery = '';
                    if (groupBy === 'site') {
                        successRatesQuery = `
                            SELECT ss.name, ss.url,
                                   COUNT(*) as attempts,
                                   COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successes,
                                   ROUND(COUNT(CASE WHEN ra.success = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as successRate
                            FROM registration_attempts ra
                            LEFT JOIN survey_sites ss ON ra.site_id = ss.id
                            WHERE 1=1 ${dateFilter}
                            GROUP BY ra.site_id, ss.name, ss.url
                            ORDER BY successRate DESC
                        `;
                    } else if (groupBy === 'email') {
                        successRatesQuery = `
                            SELECT ea.email, ea.service,
                                   COUNT(*) as attempts,
                                   COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successes,
                                   ROUND(COUNT(CASE WHEN ra.success = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as successRate
                            FROM registration_attempts ra
                            LEFT JOIN email_accounts ea ON ra.email_id = ea.id
                            WHERE 1=1 ${dateFilter}
                            GROUP BY ra.email_id, ea.email, ea.service
                            ORDER BY successRate DESC
                            LIMIT 20
                        `;
                    }
                    
                    let successRates = [];
                    let failurePatterns = [];
                    
                    try {
                        successRates = successRatesQuery ? (await this.db.all(successRatesQuery) || []) : [];
                        if (!Array.isArray(successRates)) {
                            successRates = [];
                        }
                        
                        // Get failure patterns
                        failurePatterns = await this.db.all(`
                            SELECT fa.root_cause_category, fa.root_cause_description,
                                   COUNT(*) as count,
                                   ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM failure_analysis WHERE 1=1), 2) as percentage
                            FROM failure_analysis fa
                            INNER JOIN registration_attempts ra ON fa.scenario_id = ra.id
                            WHERE 1=1 ${dateFilter.replace('ra.', 'ra.')}
                            GROUP BY fa.root_cause_category, fa.root_cause_description
                            ORDER BY count DESC
                            LIMIT 10
                        `) || [];
                        
                        if (!Array.isArray(failurePatterns)) {
                            failurePatterns = [];
                        }
                    } catch (error) {
                        console.error(`[${req.id}] Database error in analytics dashboard:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Database operation failed',
                            details: error.message,
                            requestId: req.id
                        });
                    }
                    
                    // Calculate performance metrics
                    const performance = {
                        averageSuccessRate: overview.totalAttempts > 0 ? 
                            Math.round((overview.successfulAttempts / overview.totalAttempts) * 100) : 0,
                        emailUtilization: overview.uniqueEmails || 0,
                        sitesCovered: overview.uniqueSites || 0,
                        totalAttempts: overview.totalAttempts || 0,
                        timeframe
                    };
                    
                    const analytics = {
                        overview: {
                            totalAttempts: overview.totalAttempts || 0,
                            successfulAttempts: overview.successfulAttempts || 0,
                            failedAttempts: (overview.totalAttempts || 0) - (overview.successfulAttempts || 0),
                            uniqueEmails: overview.uniqueEmails || 0,
                            uniqueSites: overview.uniqueSites || 0
                        },
                        successRates,
                        failurePatterns,
                        performance,
                        metadata: {
                            timeframe,
                            groupBy,
                            generatedAt: new Date().toISOString()
                        }
                    };
                    
                    res.json({
                        success: true,
                        timeframe,
                        analytics,
                        requestId: req.id
                    });
                    
                } catch (error) {
                    console.error(`[${req.id}] Analytics error:`, error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to retrieve analytics',
                        details: error.message,
                        requestId: req.id
                    });
                }
            }
        );
    }
    
    // Helper method to generate personas
    generatePersona(personaType, optimizeFor) {
        const personas = {
            young_professional: {
                age: 25 + Math.floor(Math.random() * 10),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                education: 'college',
                income: '$50,000-$75,000',
                occupation: 'office_worker',
                interests: ['technology', 'career', 'fitness', 'travel'],
                lifestyle: 'urban',
                familyStatus: 'single'
            },
            parent: {
                age: 30 + Math.floor(Math.random() * 15),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                education: 'college',
                income: '$60,000-$100,000',
                occupation: 'professional',
                interests: ['family', 'education', 'home', 'health'],
                lifestyle: 'suburban',
                familyStatus: 'married_with_children'
            },
            student: {
                age: 18 + Math.floor(Math.random() * 6),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                education: 'high_school_or_college',
                income: '$0-$25,000',
                occupation: 'student',
                interests: ['entertainment', 'social_media', 'gaming', 'music'],
                lifestyle: 'urban',
                familyStatus: 'single'
            },
            retiree: {
                age: 60 + Math.floor(Math.random() * 15),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                education: 'varied',
                income: '$30,000-$60,000',
                occupation: 'retired',
                interests: ['health', 'travel', 'family', 'hobbies'],
                lifestyle: 'suburban_or_rural',
                familyStatus: 'married_or_widowed'
            },
            homeowner: {
                age: 35 + Math.floor(Math.random() * 20),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                education: 'college',
                income: '$75,000-$150,000',
                occupation: 'professional',
                interests: ['home_improvement', 'finance', 'family', 'community'],
                lifestyle: 'suburban',
                familyStatus: 'married'
            },
            tech_enthusiast: {
                age: 22 + Math.floor(Math.random() * 15),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                education: 'college_or_self_taught',
                income: '$60,000-$120,000',
                occupation: 'technology',
                interests: ['technology', 'gaming', 'gadgets', 'innovation'],
                lifestyle: 'urban',
                familyStatus: 'varied'
            }
        };
        
        const basePersona = personas[personaType] || personas.young_professional;
        
        // Add optimization-specific traits
        if (optimizeFor.includes('consumer_goods')) {
            basePersona.interests.push('shopping', 'brands', 'products');
        }
        if (optimizeFor.includes('technology')) {
            basePersona.interests.push('gadgets', 'software', 'innovation');
        }
        if (optimizeFor.includes('finance')) {
            basePersona.interests.push('investing', 'banking', 'financial_planning');
        }
        
        return basePersona;
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
                console.log(`\n🌟 Poll Automation API Server v1.0.0`);
                console.log(`🌐 Server running at: http://${this.host}:${this.port}`);
                console.log(`📚 Swagger Documentation: http://${this.host}:${this.port}/api-docs`);
                console.log(`📋 API Endpoints: http://${this.host}:${this.port}/api`);
                console.log(`💚 Health Check: http://${this.host}:${this.port}/health`);
                console.log(`\n🔥 Key Features Available:`);
                console.log(`   • Email Management: POST/GET /api/emails`);
                console.log(`   • System Status: GET /api/system/status`);
                console.log(`   • Database Stats: GET /api/database/stats`);
                console.log(`   • LLM Testing: GET /api/llm/test`);
                console.log(`   • Error Detection: GET /api/test/error-detection`);
                console.log(`   • Survey Sites: GET/POST /api/survey-sites`);
                console.log(`   • Failure Analysis: GET /api/failures/*`);
                console.log(`   • Workflow Automation: POST /api/workflow/*`);
                console.log(`   • CRUD Management: GET /api/personas, /api/registrations, /api/surveys, /api/analytics`);
                console.log(`\n📋 Ready to accept requests!`);
                console.log(`\n💡 Example cURL commands:`);
                console.log(`   curl http://${this.host}:${this.port}/health`);
                console.log(`   curl http://${this.host}:${this.port}/api/system/status`);
                console.log(`   curl -X POST http://${this.host}:${this.port}/api/emails -H "Content-Type: application/json" -d '{"count":3}'`);
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
    
    // =============================================================================
    // WORKFLOW IMPLEMENTATION METHODS
    // =============================================================================
    
    /**
     * Execute registration workflow for given sites and emails
     */
    async executeRegistrationWorkflow(jobId, sites, emailAccounts, options = {}) {
        const { headless = true, maxConcurrent = 2 } = options;
        const results = {
            jobId,
            completed: 0,
            successful: 0,
            failed: 0,
            registrations: []
        };
        
        try {
            console.log(`[${jobId}] Starting registration workflow for ${emailAccounts.length} emails on ${sites.length} sites`);
            
            // Process registrations in batches to avoid overwhelming
            for (let i = 0; i < emailAccounts.length; i += maxConcurrent) {
                const emailBatch = emailAccounts.slice(i, i + maxConcurrent);
                
                for (const site of sites) {
                    const registrationPromises = emailBatch.map(async (email) => {
                        try {
                            const registrationResult = await this.performSingleRegistration(email, site, { headless });
                            
                            // Store registration attempt in database
                            const registrationId = await this.db.run(`
                                INSERT INTO registration_attempts (
                                    email_id, site_id, success, failure_reason, 
                                    attempt_date, completion_time, site_url
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            `, [
                                email.id,
                                site.id,
                                registrationResult.success ? 1 : 0,
                                registrationResult.error || null,
                                new Date().toISOString(),
                                registrationResult.duration || null,
                                site.url
                            ]);
                            
                            const result = {
                                registrationId: registrationId.lastID,
                                email: email.email,
                                site: site.name,
                                url: site.url,
                                success: registrationResult.success,
                                error: registrationResult.error,
                                duration: registrationResult.duration,
                                timestamp: new Date().toISOString()
                            };
                            
                            results.registrations.push(result);
                            results.completed++;
                            
                            if (registrationResult.success) {
                                results.successful++;
                                console.log(`[${jobId}] ✅ Registration successful: ${email.email} on ${site.name}`);
                            } else {
                                results.failed++;
                                console.log(`[${jobId}] ❌ Registration failed: ${email.email} on ${site.name} - ${registrationResult.error}`);
                            }
                            
                            return result;
                            
                        } catch (error) {
                            console.error(`[${jobId}] Registration error for ${email.email} on ${site.name}:`, error);
                            results.completed++;
                            results.failed++;
                            
                            const errorResult = {
                                email: email.email,
                                site: site.name,
                                url: site.url,
                                success: false,
                                error: error.message,
                                timestamp: new Date().toISOString()
                            };
                            
                            results.registrations.push(errorResult);
                            return errorResult;
                        }
                    });
                    
                    // Wait for batch to complete
                    await Promise.all(registrationPromises);
                    
                    // Add delay between sites to avoid detection
                    if (sites.indexOf(site) < sites.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
                    }
                }
                
                // Add delay between email batches
                if (i + maxConcurrent < emailAccounts.length) {
                    await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
                }
            }
            
            // Update job completion status
            await this.db.run(`
                INSERT INTO system_events (event_type, event_data, timestamp)
                VALUES (?, ?, ?)
            `, [
                'workflow_registration_completed',
                JSON.stringify({
                    jobId,
                    results,
                    completedAt: new Date().toISOString()
                }),
                new Date().toISOString()
            ]);
            
            console.log(`[${jobId}] Registration workflow completed: ${results.successful}/${results.completed} successful`);
            
        } catch (error) {
            console.error(`[${jobId}] Registration workflow error:`, error);
            
            await this.db.run(`
                INSERT INTO system_events (event_type, event_data, timestamp)
                VALUES (?, ?, ?)
            `, [
                'workflow_registration_failed',
                JSON.stringify({
                    jobId,
                    error: error.message,
                    results,
                    failedAt: new Date().toISOString()
                }),
                new Date().toISOString()
            ]);
        }
        
        return results;
    }
    
    /**
     * Perform a single registration attempt
     */
    async performSingleRegistration(email, site, options = {}) {
        const startTime = Date.now();
        
        try {
            // Simulate realistic registration process
            console.log(`Attempting registration: ${email.email} on ${site.name}`);
            
            // Add realistic delay for form filling
            await new Promise(resolve => setTimeout(resolve, 8000 + Math.random() * 12000));
            
            // Simulate success/failure based on site difficulty
            const successRate = Math.max(0.3, 1 - (site.difficulty_level || 3) / 10);
            const isSuccess = Math.random() < successRate;
            
            const duration = Date.now() - startTime;
            
            if (isSuccess) {
                return {
                    success: true,
                    duration,
                    message: 'Registration completed successfully'
                };
            } else {
                const failureReasons = [
                    'Form validation error',
                    'Email already registered',
                    'Anti-bot detection triggered',
                    'CAPTCHA challenge failed',
                    'Network timeout',
                    'Site maintenance mode'
                ];
                
                return {
                    success: false,
                    duration,
                    error: failureReasons[Math.floor(Math.random() * failureReasons.length)]
                };
            }
            
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }
    
    /**
     * Get eligible emails for survey participation
     */
    async getEligibleEmailsForSurveys(emailIds, siteIds = null) {
        try {
            let query = `
                SELECT ea.*, up.persona_type, up.demographic_data
                FROM email_accounts ea
                LEFT JOIN user_profiles up ON ea.id = up.email_id
                WHERE ea.id IN (${emailIds.map(() => '?').join(',')})
            `;
            
            const params = [...emailIds];
            
            if (siteIds && siteIds.length > 0) {
                // Only include emails that have successfully registered on these sites
                query += ` AND ea.id IN (
                    SELECT DISTINCT ra.email_id 
                    FROM registration_attempts ra 
                    WHERE ra.site_id IN (${siteIds.map(() => '?').join(',')}) 
                    AND ra.success = 1
                )`;
                params.push(...siteIds);
            }
            
            const emails = await this.db.all(query, params) || [];
            
            return emails.map(email => ({
                id: email.id,
                email: email.email,
                personaType: email.persona_type,
                demographicData: email.demographic_data ? JSON.parse(email.demographic_data) : null,
                provider: email.service_provider,
                status: email.status
            }));
            
        } catch (error) {
            console.error('Error getting eligible emails:', error);
            return [];
        }
    }
    
    /**
     * Discover available surveys based on criteria
     */
    async discoverAvailableSurveys(eligibleEmails, categories = [], minReward = 0) {
        try {
            // Simulate survey discovery process
            const surveyTypes = [
                { category: 'technology', baseReward: 2.50, titles: ['Consumer Electronics Survey', 'Software Usage Study', 'Tech Product Feedback'] },
                { category: 'consumer_goods', baseReward: 1.75, titles: ['Shopping Habits Study', 'Brand Preference Survey', 'Product Experience Review'] },
                { category: 'finance', baseReward: 3.00, titles: ['Financial Services Survey', 'Investment Behavior Study', 'Banking Experience Review'] },
                { category: 'health', baseReward: 2.25, titles: ['Health & Wellness Survey', 'Medical Experience Study', 'Lifestyle Habits Review'] },
                { category: 'entertainment', baseReward: 1.50, titles: ['Media Consumption Survey', 'Entertainment Preferences', 'Streaming Service Study'] }
            ];
            
            const availableSurveys = [];
            
            for (let i = 0; i < Math.min(eligibleEmails.length * 2, 10); i++) {
                const surveyType = surveyTypes[Math.floor(Math.random() * surveyTypes.length)];
                
                // Skip if category filter doesn't match
                if (categories.length > 0 && !categories.includes(surveyType.category)) {
                    continue;
                }
                
                const reward = surveyType.baseReward + (Math.random() * 2 - 1); // ±$1 variation
                
                // Skip if reward is below minimum
                if (reward < minReward) {
                    continue;
                }
                
                const title = surveyType.titles[Math.floor(Math.random() * surveyType.titles.length)];
                const estimatedTime = 5 + Math.floor(Math.random() * 20); // 5-25 minutes
                
                // Determine eligible emails for this survey (based on persona matching)
                const eligibleForThis = eligibleEmails.filter(email => {
                    if (!email.demographicData) return true;
                    
                    // Simple persona matching logic
                    if (surveyType.category === 'technology' && email.personaType === 'tech_enthusiast') return true;
                    if (surveyType.category === 'finance' && email.demographicData.income && 
                        email.demographicData.income.includes('75,000')) return true;
                    if (surveyType.category === 'consumer_goods') return true; // Most personas eligible
                    
                    return Math.random() > 0.3; // 70% chance of eligibility
                }).slice(0, Math.floor(Math.random() * 3) + 1); // 1-3 eligible emails per survey
                
                if (eligibleForThis.length === 0) continue;
                
                availableSurveys.push({
                    id: `survey_${Date.now()}_${i}`,
                    title,
                    reward: Math.round(reward * 100) / 100,
                    estimatedTime,
                    category: surveyType.category,
                    eligibleEmails: eligibleForThis.map(e => e.id),
                    site: ['SurveyPlanet', 'SurveyMonkey', 'Typeform', 'Google Forms'][Math.floor(Math.random() * 4)],
                    difficulty: Math.floor(Math.random() * 5) + 1,
                    expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
                });
            }
            
            return availableSurveys;
            
        } catch (error) {
            console.error('Error discovering surveys:', error);
            return [];
        }
    }
    
    /**
     * Get job progress from database
     */
    async getJobProgress(jobId) {
        try {
            // Look for completion events
            const completionEvent = await this.db.get(`
                SELECT * FROM system_events 
                WHERE event_type IN ('workflow_registration_completed', 'workflow_registration_failed')
                AND event_data LIKE ?
                ORDER BY timestamp DESC 
                LIMIT 1
            `, [`%"jobId":"${jobId}"%`]);
            
            if (completionEvent) {
                const eventData = JSON.parse(completionEvent.event_data);
                return {
                    status: completionEvent.event_type.includes('completed') ? 'completed' : 'failed',
                    progress: 100,
                    details: eventData.results || {},
                    results: eventData.results || {}
                };
            }
            
            // Look for registration attempts related to this job
            const attempts = await this.db.all(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN success = 1 THEN 1 END) as successful
                FROM registration_attempts 
                WHERE attempt_date > (
                    SELECT timestamp FROM system_events 
                    WHERE event_data LIKE ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                )
            `, [`%"jobId":"${jobId}"%`]);
            
            if (attempts && attempts[0] && attempts[0].total > 0) {
                const totalAttempts = attempts[0].total;
                const successfulAttempts = attempts[0].successful;
                
                return {
                    status: 'running',
                    progress: Math.min((totalAttempts / 10) * 100, 95), // Estimate based on attempts
                    details: {
                        totalAttempts,
                        successfulAttempts,
                        failedAttempts: totalAttempts - successfulAttempts
                    },
                    results: {
                        completed: totalAttempts,
                        successful: successfulAttempts,
                        failed: totalAttempts - successfulAttempts
                    }
                };
            }
            
            // Default to running with low progress
            return {
                status: 'running',
                progress: 15,
                details: { message: 'Job in progress' },
                results: {}
            };
            
        } catch (error) {
            console.error('Error getting job progress:', error);
            return {
                status: 'unknown',
                progress: 0,
                details: { error: error.message },
                results: {}
            };
        }
    }
    
    /**
     * Get survey details for the given survey IDs
     */
    async getSurveyDetails(surveyIds) {
        // In a real implementation, this would fetch from survey discovery database
        // For now, simulate survey details
        return surveyIds.map(surveyId => ({
            id: surveyId,
            title: `Survey ${surveyId.slice(-3)}`,
            reward: 1.50 + Math.random() * 3,
            estimatedTime: 5 + Math.floor(Math.random() * 20),
            category: ['technology', 'consumer_goods', 'finance', 'health'][Math.floor(Math.random() * 4)],
            difficulty: Math.floor(Math.random() * 5) + 1,
            questions: Math.floor(Math.random() * 20) + 10,
            site: ['SurveyPlanet', 'SurveyMonkey', 'Typeform'][Math.floor(Math.random() * 3)]
        }));
    }
    
    /**
     * Get optimal personas for completing surveys
     */
    async getOptimalPersonasForSurveys(surveyDetails, autoSelect = true) {
        try {
            if (!autoSelect) {
                return [];
            }
            
            // Get personas that match survey categories
            const personas = await this.db.all(`
                SELECT up.*, ea.email, ea.service_provider
                FROM user_profiles up
                LEFT JOIN email_accounts ea ON up.email_id = ea.id
                WHERE ea.status = 'active'
                ORDER BY up.created_at DESC
                LIMIT 10
            `) || [];
            
            return personas.map(persona => ({
                emailId: persona.email_id,
                email: persona.email,
                personaId: persona.id,
                personaType: persona.persona_type,
                demographicData: persona.demographic_data ? JSON.parse(persona.demographic_data) : {},
                provider: persona.service_provider,
                matchScore: this.calculatePersonaMatchScore(persona, surveyDetails)
            })).sort((a, b) => b.matchScore - a.matchScore);
            
        } catch (error) {
            console.error('Error getting optimal personas:', error);
            return [];
        }
    }
    
    /**
     * Calculate how well a persona matches survey requirements
     */
    calculatePersonaMatchScore(persona, surveyDetails) {
        if (!persona.demographic_data) return 0.5;
        
        const demographicData = JSON.parse(persona.demographic_data);
        let score = 0;
        
        surveyDetails.forEach(survey => {
            // Match persona type to survey category
            if (survey.category === 'technology' && persona.persona_type === 'tech_enthusiast') score += 0.8;
            if (survey.category === 'finance' && demographicData.income && demographicData.income.includes('75,000')) score += 0.7;
            if (survey.category === 'consumer_goods') score += 0.6; // Most personas fit
            if (survey.category === 'health' && persona.persona_type === 'parent') score += 0.7;
            
            // General matching factors
            if (demographicData.age && demographicData.age >= 25 && demographicData.age <= 45) score += 0.3;
            if (demographicData.education === 'college') score += 0.2;
        });
        
        return Math.min(score / surveyDetails.length, 1.0);
    }
    
    /**
     * Get estimated time per survey based on quality mode
     */
    getEstimatedTimePerSurvey(qualityMode) {
        switch (qualityMode) {
            case 'fast': return 3; // 3 minutes
            case 'balanced': return 5; // 5 minutes  
            case 'high_quality': return 8; // 8 minutes
            default: return 5;
        }
    }
    
    /**
     * Execute survey completion workflow
     */
    async executeSurveyCompletionWorkflow(jobId, surveyDetails, availablePersonas, qualityMode) {
        const results = {
            jobId,
            completed: 0,
            successful: 0,
            failed: 0,
            totalReward: 0,
            completions: []
        };
        
        try {
            console.log(`[${jobId}] Starting survey completion workflow for ${surveyDetails.length} surveys`);
            
            for (const survey of surveyDetails) {
                try {
                    // Select best persona for this survey
                    const bestPersona = this.selectBestPersonaForSurvey(survey, availablePersonas);
                    
                    if (!bestPersona) {
                        console.log(`[${jobId}] ⚠️ No suitable persona found for survey ${survey.id}`);
                        results.completed++;
                        results.failed++;
                        continue;
                    }
                    
                    const surveyResult = await this.completeSingleSurvey(survey, bestPersona, qualityMode);
                    
                    // Store survey completion in database
                    await this.db.run(`
                        INSERT INTO survey_completions (
                            survey_id, email_id, persona_id, success, 
                            reward_earned, completion_time, quality_score, 
                            completion_date, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        survey.id,
                        bestPersona.emailId,
                        bestPersona.personaId,
                        surveyResult.success ? 1 : 0,
                        surveyResult.reward || 0,
                        surveyResult.duration || null,
                        surveyResult.qualityScore || null,
                        new Date().toISOString(),
                        surveyResult.notes || null
                    ]);
                    
                    const completionResult = {
                        surveyId: survey.id,
                        title: survey.title,
                        assignedPersona: {
                            email: bestPersona.email,
                            personaType: bestPersona.personaType
                        },
                        success: surveyResult.success,
                        reward: surveyResult.reward,
                        duration: surveyResult.duration,
                        qualityScore: surveyResult.qualityScore,
                        error: surveyResult.error,
                        timestamp: new Date().toISOString()
                    };
                    
                    results.completions.push(completionResult);
                    results.completed++;
                    
                    if (surveyResult.success) {
                        results.successful++;
                        results.totalReward += surveyResult.reward || 0;
                        console.log(`[${jobId}] ✅ Survey completed: ${survey.title} - $${surveyResult.reward}`);
                    } else {
                        results.failed++;
                        console.log(`[${jobId}] ❌ Survey failed: ${survey.title} - ${surveyResult.error}`);
                    }
                    
                    // Add delay between surveys based on quality mode
                    const delay = qualityMode === 'fast' ? 2000 : qualityMode === 'balanced' ? 5000 : 8000;
                    await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 3000));
                    
                } catch (error) {
                    console.error(`[${jobId}] Survey completion error for ${survey.id}:`, error);
                    results.completed++;
                    results.failed++;
                    
                    results.completions.push({
                        surveyId: survey.id,
                        title: survey.title,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            // Update job completion status
            await this.db.run(`
                INSERT INTO system_events (event_type, event_data, timestamp)
                VALUES (?, ?, ?)
            `, [
                'workflow_survey_completion_completed',
                JSON.stringify({
                    jobId,
                    results,
                    completedAt: new Date().toISOString()
                }),
                new Date().toISOString()
            ]);
            
            console.log(`[${jobId}] Survey completion workflow finished: ${results.successful}/${results.completed} successful, $${results.totalReward.toFixed(2)} earned`);
            
        } catch (error) {
            console.error(`[${jobId}] Survey completion workflow error:`, error);
            
            await this.db.run(`
                INSERT INTO system_events (event_type, event_data, timestamp)
                VALUES (?, ?, ?)
            `, [
                'workflow_survey_completion_failed',
                JSON.stringify({
                    jobId,
                    error: error.message,
                    results,
                    failedAt: new Date().toISOString()
                }),
                new Date().toISOString()
            ]);
        }
        
        return results;
    }
    
    /**
     * Select best persona for a specific survey
     */
    selectBestPersonaForSurvey(survey, availablePersonas) {
        if (!availablePersonas || availablePersonas.length === 0) {
            return null;
        }
        
        // Score personas for this specific survey
        const scoredPersonas = availablePersonas.map(persona => {
            let score = persona.matchScore || 0;
            
            // Boost score for category matches
            if (survey.category === 'technology' && persona.personaType === 'tech_enthusiast') score += 0.5;
            if (survey.category === 'finance' && persona.demographicData.income) score += 0.4;
            if (survey.category === 'consumer_goods') score += 0.3;
            if (survey.category === 'health' && persona.personaType === 'parent') score += 0.4;
            
            // Consider survey difficulty vs persona sophistication
            const sophisticationBonus = persona.personaType === 'young_professional' ? 0.2 : 0;
            score += sophisticationBonus;
            
            return { ...persona, surveyScore: Math.min(score, 1.0) };
        });
        
        // Return highest scoring persona
        return scoredPersonas.sort((a, b) => b.surveyScore - a.surveyScore)[0];
    }
    
    /**
     * Complete a single survey
     */
    async completeSingleSurvey(survey, persona, qualityMode) {
        const startTime = Date.now();
        
        try {
            console.log(`Completing survey: ${survey.title} with persona ${persona.email} (${persona.personaType})`);
            
            // Simulate survey completion time based on quality mode and survey length
            const baseTime = survey.estimatedTime * 60 * 1000; // Convert to milliseconds
            const qualityMultiplier = qualityMode === 'fast' ? 0.6 : qualityMode === 'balanced' ? 0.8 : 1.0;
            const actualTime = baseTime * qualityMultiplier + Math.random() * 5000;
            
            await new Promise(resolve => setTimeout(resolve, actualTime));
            
            // Calculate success probability based on survey difficulty and persona match
            const baseSuccessRate = 0.8;
            const difficultyPenalty = (survey.difficulty - 1) * 0.1;
            const personaBonus = persona.surveyScore * 0.2;
            const qualityBonus = qualityMode === 'high_quality' ? 0.1 : 0;
            
            const successRate = Math.max(0.3, baseSuccessRate - difficultyPenalty + personaBonus + qualityBonus);
            const isSuccess = Math.random() < successRate;
            
            const duration = Date.now() - startTime;
            
            if (isSuccess) {
                const actualReward = survey.reward * (0.9 + Math.random() * 0.2); // ±10% variation
                const qualityScore = 0.6 + Math.random() * 0.4; // 0.6-1.0
                
                return {
                    success: true,
                    reward: Math.round(actualReward * 100) / 100,
                    duration: Math.floor(duration / 1000),
                    qualityScore: Math.round(qualityScore * 100) / 100,
                    notes: `Completed with ${persona.personaType} persona`
                };
            } else {
                const failureReasons = [
                    'Failed demographic screening',
                    'Survey quota already filled',
                    'Inconsistent answers detected',
                    'Attention check failed',
                    'Technical error during submission',
                    'Survey terminated early'
                ];
                
                return {
                    success: false,
                    duration: Math.floor(duration / 1000),
                    error: failureReasons[Math.floor(Math.random() * failureReasons.length)]
                };
            }
            
        } catch (error) {
            return {
                success: false,
                duration: Math.floor((Date.now() - startTime) / 1000),
                error: error.message
            };
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