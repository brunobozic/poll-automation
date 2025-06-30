#!/usr/bin/env node

/**
 * POLL AUTOMATION API SERVER
 * Enterprise-grade REST API for poll automation workflows
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');

// Import route modules
const workflowRoutes = require('../src/api/routes/workflows');
const emailRoutes = require('../src/api/routes/emails');
const trainingRoutes = require('../src/api/routes/training');
const analyticsRoutes = require('../src/api/routes/analytics');
const sitesRoutes = require('../src/api/routes/sites');

// Import middleware
const errorHandler = require('../src/api/middleware/error-handler');
const requestLogger = require('../src/api/middleware/request-logger');
const authMiddleware = require('../src/api/middleware/auth');

// Import services
const ConfigManager = require('../src/core/config/config-manager');
const DatabaseManager = require('../src/data/database-manager');
const ServiceRegistry = require('../src/core/service-registry');

class PollAutomationAPIServer {
    constructor(options = {}) {
        this.config = new ConfigManager();
        this.app = express();
        this.server = null;
        this.port = options.port || this.config.get('server.port', 3000);
        this.env = process.env.NODE_ENV || 'development';
        
        this.setupSecurity();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupSecurity() {
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
            origin: this.config.get('cors.allowedOrigins', ['http://localhost:3000']),
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: this.env === 'production' ? 100 : 1000, // requests per window
            message: {
                error: 'Too many requests from this IP',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api/', limiter);
    }

    setupMiddleware() {
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use(requestLogger);

        // Health check (no auth required)
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: require('../package.json').version,
                environment: this.env,
                uptime: process.uptime(),
                database: 'connected' // TODO: actual DB health check
            });
        });

        // API info
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'Poll Automation API',
                version: require('../package.json').version,
                description: 'Enterprise-grade survey automation workflows',
                documentation: '/api/docs',
                endpoints: {
                    workflows: '/api/workflows',
                    emails: '/api/emails', 
                    training: '/api/training',
                    analytics: '/api/analytics',
                    sites: '/api/sites'
                }
            });
        });
    }

    setupRoutes() {
        // API Routes with authentication
        this.app.use('/api/workflows', authMiddleware, workflowRoutes);
        this.app.use('/api/emails', authMiddleware, emailRoutes);
        this.app.use('/api/training', authMiddleware, trainingRoutes);
        this.app.use('/api/analytics', authMiddleware, analyticsRoutes);
        this.app.use('/api/sites', authMiddleware, sitesRoutes);

        // API Documentation
        this.app.get('/api/docs', (req, res) => {
            res.json({
                title: 'Poll Automation API Documentation',
                version: '1.0.0',
                endpoints: {
                    'POST /api/workflows/training/start': {
                        description: 'Start automated survey training workflow',
                        body: {
                            sites: ['array of site identifiers'],
                            config: {
                                registrationsPerSite: 'number',
                                surveysPerRegistration: 'number',
                                enableMLLogging: 'boolean'
                            }
                        }
                    },
                    'POST /api/workflows/registration/batch': {
                        description: 'Execute batch registration workflow',
                        body: {
                            sites: ['array of URLs'],
                            emailStrategy: 'reuse-existing|create-new',
                            profiles: 'auto-generate|provided'
                        }
                    },
                    'POST /api/workflows/survey-completion/start': {
                        description: 'Start survey completion workflow',
                        body: {
                            surveyUrls: ['array of survey URLs'],
                            completionStrategy: 'realistic|fast|comprehensive'
                        }
                    },
                    'GET /api/workflows/{id}/status': {
                        description: 'Get workflow execution status'
                    },
                    'POST /api/emails/create-batch': {
                        description: 'Create multiple email accounts',
                        body: {
                            count: 'number',
                            providers: ['TempMail', '10MinuteMail'],
                            strategy: 'distributed|single-provider'
                        }
                    },
                    'GET /api/training/results': {
                        description: 'Get comprehensive training results and analytics'
                    },
                    'POST /api/analytics/performance': {
                        description: 'Generate performance analytics report'
                    }
                }
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                method: req.method,
                path: req.path,
                availableEndpoints: [
                    'GET /health',
                    'GET /api',
                    'GET /api/docs',
                    'POST /api/workflows/*',
                    'GET /api/training/results',
                    'POST /api/emails/create-batch'
                ]
            });
        });
    }

    setupErrorHandling() {
        this.app.use(errorHandler);
    }

    async initialize() {
        console.log('🚀 Initializing Poll Automation API Server...');
        
        try {
            // Initialize database
            console.log('📊 Connecting to database...');
            await DatabaseManager.initialize();
            
            // Initialize service registry
            console.log('⚙️ Starting services...');
            await ServiceRegistry.initialize();
            
            console.log('✅ Server initialization complete');
            
        } catch (error) {
            console.error('❌ Server initialization failed:', error);
            throw error;
        }
    }

    async start() {
        try {
            await this.initialize();
            
            this.server = createServer(this.app);
            
            return new Promise((resolve, reject) => {
                this.server.listen(this.port, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`
🎯 Poll Automation API Server Started Successfully!
===================================================
🌐 Server: http://localhost:${this.port}
📚 API Docs: http://localhost:${this.port}/api/docs
🔍 Health: http://localhost:${this.port}/health
⚙️ Environment: ${this.env}
📊 Database: Connected
🛡️ Security: Enabled (Helmet + CORS + Rate Limiting)

Available Workflows:
• Training: POST /api/workflows/training/start
• Registration: POST /api/workflows/registration/batch  
• Survey Completion: POST /api/workflows/survey-completion/start
• Analytics: GET /api/analytics/performance

Ready to process automation requests! 🚀
`);
                        resolve(this.server);
                    }
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
                    console.log('🛑 Poll Automation API Server stopped');
                    resolve();
                });
            });
        }
    }

    async restart() {
        await this.stop();
        await this.start();
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new PollAutomationAPIServer();
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('📨 SIGTERM received, shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    process.on('SIGINT', async () => {
        console.log('📨 SIGINT received, shutting down gracefully...');
        await server.stop();
        process.exit(0);
    });
    
    // Handle uncaught errors
    process.on('unhandledRejection', (err) => {
        console.error('❌ Unhandled Promise Rejection:', err);
        process.exit(1);
    });
    
    process.on('uncaughtException', (err) => {
        console.error('❌ Uncaught Exception:', err);
        process.exit(1);
    });
    
    server.start().catch((error) => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = PollAutomationAPIServer;