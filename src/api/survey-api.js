/**
 * Survey API Server
 * 
 * REST API for programmatic survey automation.
 * Provides endpoints for:
 * - Starting new surveys
 * - Checking survey status
 * - Managing personas
 * - Retrieving registered sites
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

class SurveyAPI {
    constructor(surveyOrchestrator, registrationLogger, options = {}) {
        this.surveyOrchestrator = surveyOrchestrator;
        this.registrationLogger = registrationLogger;
        this.options = {
            port: 3000,
            enableCors: true,
            enableRateLimit: true,
            enableAuth: false, // Could be enabled for production
            debugMode: false,
            ...options
        };
        
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        
        this.activeSurveys = new Map(); // Track active survey sessions
        
        this.log('🌐 Survey API initialized');
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // JSON parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // CORS
        if (this.options.enableCors) {
            this.app.use(cors({
                origin: true,
                credentials: true
            }));
        }

        // Rate limiting
        if (this.options.enableRateLimit) {
            const limiter = rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // Limit each IP to 100 requests per windowMs
                message: {
                    error: 'Too many requests, please try again later'
                }
            });
            this.app.use('/api/', limiter);
        }

        // Request logging
        this.app.use((req, res, next) => {
            this.log(`${req.method} ${req.path} - ${req.ip}`);
            next();
        });
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Survey operations
        this.app.post('/api/survey/start', 
            this.validateSurveyStart(),
            this.handleSurveyStart.bind(this)
        );

        this.app.get('/api/survey/status/:surveyId',
            this.validateSurveyStatus(),
            this.handleSurveyStatus.bind(this)
        );

        this.app.get('/api/survey/list',
            this.validateSurveyList(),
            this.handleSurveyList.bind(this)
        );

        this.app.post('/api/survey/complete/:surveyId',
            this.validateSurveyComplete(),
            this.handleSurveyComplete.bind(this)
        );

        // Persona operations
        this.app.get('/api/personas/:email',
            this.validatePersonaGet(),
            this.handlePersonaGet.bind(this)
        );

        this.app.post('/api/personas/:email/optimize',
            this.validatePersonaOptimize(),
            this.handlePersonaOptimize.bind(this)
        );

        // Site operations
        this.app.get('/api/sites/:email/registered',
            this.validateSitesGet(),
            this.handleRegisteredSites.bind(this)
        );

        this.app.get('/api/sites/:email/:site/status',
            this.validateSiteStatus(),
            this.handleSiteStatus.bind(this)
        );

        // System operations
        this.app.get('/api/system/status',
            this.handleSystemStatus.bind(this)
        );

        this.app.get('/api/system/statistics',
            this.handleSystemStatistics.bind(this)
        );
    }

    /**
     * Validation middleware
     */
    validateSurveyStart() {
        return [
            body('email').isEmail().withMessage('Valid email required'),
            body('site').isURL().withMessage('Valid site URL required'),
            body('autoComplete').optional().isBoolean(),
            body('headless').optional().isBoolean(),
            this.handleValidationErrors
        ];
    }

    validateSurveyStatus() {
        return [
            param('surveyId').notEmpty().withMessage('Survey ID required'),
            this.handleValidationErrors
        ];
    }

    validateSurveyList() {
        return [
            query('email').isEmail().withMessage('Valid email required'),
            query('site').optional().isURL().withMessage('Valid site URL required'),
            this.handleValidationErrors
        ];
    }

    validateSurveyComplete() {
        return [
            param('surveyId').notEmpty().withMessage('Survey ID required'),
            body('responses').optional().isArray(),
            this.handleValidationErrors
        ];
    }

    validatePersonaGet() {
        return [
            param('email').isEmail().withMessage('Valid email required'),
            this.handleValidationErrors
        ];
    }

    validatePersonaOptimize() {
        return [
            param('email').isEmail().withMessage('Valid email required'),
            body('site').optional().isURL(),
            this.handleValidationErrors
        ];
    }

    validateSitesGet() {
        return [
            param('email').isEmail().withMessage('Valid email required'),
            this.handleValidationErrors
        ];
    }

    validateSiteStatus() {
        return [
            param('email').isEmail().withMessage('Valid email required'),
            param('site').notEmpty().withMessage('Site required'),
            this.handleValidationErrors
        ];
    }

    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        next();
    }

    /**
     * API Route Handlers
     */

    /**
     * POST /api/survey/start
     * Start a new survey for an email/site combination
     */
    async handleSurveyStart(req, res) {
        try {
            const { email, site, autoComplete = false, headless = true } = req.body;
            
            this.log(`🚀 Starting survey for ${email} on ${site}`);
            
            // Check if email is registered for this site
            const registrationStatus = await this.checkRegistrationStatus(email, site);
            if (!registrationStatus.isRegistered) {
                return res.status(400).json({
                    success: false,
                    error: 'Email not registered for this site',
                    details: {
                        email: email,
                        site: site,
                        suggestion: 'Please register first using the registration endpoint'
                    }
                });
            }

            // Generate unique survey session ID
            const surveyId = this.generateSurveyId();

            // Start survey automation
            const surveySession = await this.surveyOrchestrator.startSurvey({
                surveyId: surveyId,
                email: email,
                site: site,
                autoComplete: autoComplete,
                headless: headless,
                credentials: registrationStatus.credentials,
                persona: registrationStatus.persona
            });

            // Track active survey
            this.activeSurveys.set(surveyId, {
                ...surveySession,
                startedAt: new Date().toISOString(),
                status: 'starting'
            });

            // Log survey start
            await this.logSurveyEvent('survey_started', {
                surveyId: surveyId,
                email: email,
                site: site,
                autoComplete: autoComplete
            });

            res.json({
                success: true,
                surveyId: surveyId,
                status: 'starting',
                estimatedDuration: surveySession.estimatedDuration || '5-15 minutes',
                message: 'Survey automation started successfully'
            });

        } catch (error) {
            this.log(`❌ Survey start failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to start survey',
                details: error.message
            });
        }
    }

    /**
     * GET /api/survey/status/:surveyId
     * Get status of an active survey
     */
    async handleSurveyStatus(req, res) {
        try {
            const { surveyId } = req.params;

            const surveySession = this.activeSurveys.get(surveyId);
            if (!surveySession) {
                return res.status(404).json({
                    success: false,
                    error: 'Survey not found',
                    surveyId: surveyId
                });
            }

            // Get latest status from orchestrator
            const currentStatus = await this.surveyOrchestrator.getSurveyStatus(surveyId);

            // Update cached status
            surveySession.status = currentStatus.status;
            surveySession.progress = currentStatus.progress;
            surveySession.lastUpdated = new Date().toISOString();

            res.json({
                success: true,
                surveyId: surveyId,
                status: currentStatus.status,
                progress: currentStatus.progress,
                questionsAnswered: currentStatus.questionsAnswered || 0,
                estimatedTimeRemaining: currentStatus.estimatedTimeRemaining,
                currentQuestion: currentStatus.currentQuestion,
                errors: currentStatus.errors || []
            });

        } catch (error) {
            this.log(`❌ Survey status check failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to get survey status',
                details: error.message
            });
        }
    }

    /**
     * GET /api/survey/list
     * List available surveys for an email/site combination
     */
    async handleSurveyList(req, res) {
        try {
            const { email, site } = req.query;

            this.log(`📋 Listing surveys for ${email}${site ? ` on ${site}` : ''}`);

            // Get available surveys
            const surveys = await this.surveyOrchestrator.getAvailableSurveys({
                email: email,
                site: site
            });

            res.json({
                success: true,
                email: email,
                site: site || 'all',
                surveys: surveys,
                count: surveys.length
            });

        } catch (error) {
            this.log(`❌ Survey listing failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to list surveys',
                details: error.message
            });
        }
    }

    /**
     * POST /api/survey/complete/:surveyId
     * Mark survey as complete or provide additional responses
     */
    async handleSurveyComplete(req, res) {
        try {
            const { surveyId } = req.params;
            const { responses } = req.body;

            const result = await this.surveyOrchestrator.completeSurvey(surveyId, responses);

            // Remove from active surveys
            this.activeSurveys.delete(surveyId);

            // Log completion
            await this.logSurveyEvent('survey_completed', {
                surveyId: surveyId,
                success: result.success,
                responses: responses?.length || 0
            });

            res.json({
                success: true,
                surveyId: surveyId,
                status: 'completed',
                result: result
            });

        } catch (error) {
            this.log(`❌ Survey completion failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to complete survey',
                details: error.message
            });
        }
    }

    /**
     * GET /api/personas/:email
     * Get persona information for an email
     */
    async handlePersonaGet(req, res) {
        try {
            const { email } = req.params;

            const persona = await this.getPersonaForEmail(email);

            if (!persona) {
                return res.status(404).json({
                    success: false,
                    error: 'Persona not found for email',
                    email: email
                });
            }

            res.json({
                success: true,
                email: email,
                persona: persona
            });

        } catch (error) {
            this.log(`❌ Persona retrieval failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to get persona',
                details: error.message
            });
        }
    }

    /**
     * GET /api/sites/:email/registered
     * Get list of sites this email is registered for
     */
    async handleRegisteredSites(req, res) {
        try {
            const { email } = req.params;

            const sites = await this.getRegisteredSitesForEmail(email);

            res.json({
                success: true,
                email: email,
                sites: sites,
                count: sites.length
            });

        } catch (error) {
            this.log(`❌ Registered sites retrieval failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to get registered sites',
                details: error.message
            });
        }
    }

    /**
     * Helper methods
     */

    async checkRegistrationStatus(email, site) {
        // Implementation to check if email is registered for site
        // This would query the database for registration records
        try {
            const registration = await this.registrationLogger.getRegistrationByEmailAndSite(email, site);
            
            if (registration) {
                return {
                    isRegistered: true,
                    credentials: {
                        email: email,
                        password: registration.password,
                        loginUrl: registration.login_url
                    },
                    persona: await this.getPersonaForEmail(email)
                };
            }
            
            return { isRegistered: false };
            
        } catch (error) {
            this.log(`⚠️ Registration status check failed: ${error.message}`);
            return { isRegistered: false };
        }
    }

    async getPersonaForEmail(email) {
        // Implementation to retrieve persona for email
        try {
            return await this.registrationLogger.getPersonaByEmail(email);
        } catch (error) {
            this.log(`⚠️ Persona retrieval failed: ${error.message}`);
            return null;
        }
    }

    async getRegisteredSitesForEmail(email) {
        // Implementation to get all sites this email is registered for
        try {
            return await this.registrationLogger.getRegisteredSitesByEmail(email);
        } catch (error) {
            this.log(`⚠️ Registered sites retrieval failed: ${error.message}`);
            return [];
        }
    }

    generateSurveyId() {
        return `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async logSurveyEvent(eventType, data) {
        try {
            await this.registrationLogger.logSurveyEvent({
                event_type: eventType,
                data: JSON.stringify(data),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.log(`⚠️ Survey event logging failed: ${error.message}`);
        }
    }

    /**
     * Error handling
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.path
            });
        });

        // General error handler
        this.app.use((error, req, res, next) => {
            this.log(`💥 Server error: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: this.options.debugMode ? error.message : 'Please contact support'
            });
        });
    }

    /**
     * Start the API server
     */
    async start() {
        return new Promise((resolve, reject) => {
            const server = this.app.listen(this.options.port, (error) => {
                if (error) {
                    this.log(`❌ Failed to start API server: ${error.message}`);
                    reject(error);
                } else {
                    this.log(`🚀 Survey API server started on port ${this.options.port}`);
                    this.log(`📍 Health check: http://localhost:${this.options.port}/health`);
                    this.log(`📍 API docs: http://localhost:${this.options.port}/api/`);
                    resolve(server);
                }
            });
        });
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[SurveyAPI] ${message}`);
        }
    }
}

module.exports = SurveyAPI;