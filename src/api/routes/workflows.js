/**
 * Workflow Routes - Orchestrated Business Workflows
 * Replaces scattered one-off scripts with proper API endpoints
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

// Import workflow services
const TrainingWorkflowService = require('../../services/workflows/training-workflow-service');
const RegistrationWorkflowService = require('../../services/workflows/registration-workflow-service');
const SurveyCompletionWorkflowService = require('../../services/workflows/survey-completion-workflow-service');
const WorkflowManager = require('../../services/workflows/workflow-manager');

// Import validators
const { validateWorkflowConfig } = require('../validators/workflow-validators');

/**
 * POST /api/workflows/training/start
 * Replaces: start-survey-training.js, test-comprehensive-survey-automation.js
 */
router.post('/training/start', [
    body('sites').isArray().withMessage('Sites must be an array'),
    body('sites.*').isString().withMessage('Each site must be a string'),
    body('config.registrationsPerSite').optional().isInt({ min: 1, max: 10 }),
    body('config.surveysPerRegistration').optional().isInt({ min: 1, max: 5 }),
    body('config.enableMLLogging').optional().isBoolean(),
    body('config.enableRotation').optional().isBoolean(),
    body('config.stealthLevel').optional().isIn(['low', 'medium', 'high']),
    validateWorkflowConfig
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { sites, config = {} } = req.body;
        
        // Default configuration
        const workflowConfig = {
            registrationsPerSite: config.registrationsPerSite || 3,
            surveysPerRegistration: config.surveysPerRegistration || 2,
            enableMLLogging: config.enableMLLogging !== false, // default true
            enableRotation: config.enableRotation !== false,
            stealthLevel: config.stealthLevel || 'medium',
            maxConcurrency: config.maxConcurrency || 2,
            timeoutMinutes: config.timeoutMinutes || 30
        };

        console.log(`🎯 Starting training workflow for ${sites.length} sites...`);
        
        const workflowId = await TrainingWorkflowService.startTrainingWorkflow({
            sites,
            config: workflowConfig,
            userId: req.user?.id,
            sessionId: req.sessionId
        });

        res.status(202).json({
            success: true,
            workflowId,
            message: 'Training workflow started successfully',
            config: workflowConfig,
            estimatedDuration: `${sites.length * workflowConfig.registrationsPerSite * 5} minutes`,
            statusEndpoint: `/api/workflows/${workflowId}/status`
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/workflows/registration/batch
 * Replaces: test-multi-site-registration.js, test-real-survey-registrations.js
 */
router.post('/registration/batch', [
    body('sites').isArray().withMessage('Sites must be an array'),
    body('sites.*').isURL().withMessage('Each site must be a valid URL'),
    body('emailStrategy').optional().isIn(['reuse-existing', 'create-new', 'mixed']),
    body('profiles').optional().isIn(['auto-generate', 'provided', 'consistent']),
    body('concurrency').optional().isInt({ min: 1, max: 5 })
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { sites, emailStrategy = 'reuse-existing', profiles = 'auto-generate', concurrency = 2 } = req.body;

        console.log(`📝 Starting batch registration for ${sites.length} sites...`);

        const workflowId = await RegistrationWorkflowService.startBatchRegistration({
            sites,
            emailStrategy,
            profiles,
            concurrency,
            userId: req.user?.id,
            sessionId: req.sessionId
        });

        res.status(202).json({
            success: true,
            workflowId,
            message: 'Batch registration workflow started',
            sitesCount: sites.length,
            emailStrategy,
            profiles,
            statusEndpoint: `/api/workflows/${workflowId}/status`
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/workflows/survey-completion/start
 * Replaces: test-real-survey-completion.js, test-live-surveys.js
 */
router.post('/survey-completion/start', [
    body('surveyUrls').isArray().withMessage('Survey URLs must be an array'),
    body('surveyUrls.*').isURL().withMessage('Each survey URL must be valid'),
    body('completionStrategy').optional().isIn(['realistic', 'fast', 'comprehensive']),
    body('profileConsistency').optional().isBoolean(),
    body('enableLearning').optional().isBoolean()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { 
            surveyUrls, 
            completionStrategy = 'realistic',
            profileConsistency = true,
            enableLearning = true 
        } = req.body;

        console.log(`📋 Starting survey completion for ${surveyUrls.length} surveys...`);

        const workflowId = await SurveyCompletionWorkflowService.startSurveyCompletion({
            surveyUrls,
            completionStrategy,
            profileConsistency,
            enableLearning,
            userId: req.user?.id,
            sessionId: req.sessionId
        });

        res.status(202).json({
            success: true,
            workflowId,
            message: 'Survey completion workflow started',
            surveysCount: surveyUrls.length,
            completionStrategy,
            statusEndpoint: `/api/workflows/${workflowId}/status`
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workflows/:id/status
 * Get workflow execution status and progress
 */
router.get('/:id/status', [
    param('id').isUUID().withMessage('Workflow ID must be a valid UUID')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const includeDetails = req.query.details === 'true';

        const status = await WorkflowManager.getWorkflowStatus(id, includeDetails);

        if (!status) {
            return res.status(404).json({
                error: 'Workflow not found',
                workflowId: id
            });
        }

        res.json({
            success: true,
            workflow: status,
            actions: {
                cancel: status.status === 'running' ? `/api/workflows/${id}/cancel` : null,
                restart: ['completed', 'failed'].includes(status.status) ? `/api/workflows/${id}/restart` : null,
                results: status.status === 'completed' ? `/api/workflows/${id}/results` : null
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/workflows/:id/cancel
 * Cancel a running workflow
 */
router.post('/:id/cancel', [
    param('id').isUUID().withMessage('Workflow ID must be a valid UUID')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { reason } = req.body;

        const result = await WorkflowManager.cancelWorkflow(id, reason);

        if (!result.success) {
            return res.status(400).json({
                error: result.error,
                workflowId: id
            });
        }

        res.json({
            success: true,
            message: 'Workflow cancelled successfully',
            workflowId: id,
            cancelledAt: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workflows/:id/results
 * Get comprehensive workflow results
 */
router.get('/:id/results', [
    param('id').isUUID().withMessage('Workflow ID must be a valid UUID'),
    query('format').optional().isIn(['json', 'csv', 'detailed'])
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const format = req.query.format || 'json';

        const results = await WorkflowManager.getWorkflowResults(id, format);

        if (!results) {
            return res.status(404).json({
                error: 'Workflow results not found',
                workflowId: id
            });
        }

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="workflow-${id}-results.csv"`);
            return res.send(results);
        }

        res.json({
            success: true,
            workflowId: id,
            results,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workflows
 * List all workflows with filtering
 */
router.get('/', [
    query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled']),
    query('type').optional().isIn(['training', 'registration', 'survey-completion']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const filters = {
            status: req.query.status,
            type: req.query.type,
            userId: req.user?.id,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const workflows = await WorkflowManager.listWorkflows(filters);

        res.json({
            success: true,
            workflows: workflows.items,
            pagination: {
                total: workflows.total,
                limit: filters.limit,
                offset: filters.offset,
                hasMore: workflows.total > (filters.offset + filters.limit)
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;