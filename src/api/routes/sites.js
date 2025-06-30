/**
 * Sites Routes - Site management endpoints
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/sites/status
 * Check status of survey sites
 */
router.get('/status', async (req, res, next) => {
    try {
        // Stub implementation
        res.json({
            success: true,
            sites: [
                { name: 'SurveyPlanet', status: 'online', lastChecked: new Date().toISOString() },
                { name: 'Qualtrics', status: 'online', lastChecked: new Date().toISOString() },
                { name: 'JotForm', status: 'slow', lastChecked: new Date().toISOString() }
            ]
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;