/**
 * Workflow Validators
 */

function validateWorkflowConfig(req, res, next) {
    const { config } = req.body;
    
    if (config) {
        // Validate configuration limits
        if (config.registrationsPerSite && config.registrationsPerSite > 10) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'registrationsPerSite cannot exceed 10'
            });
        }
        
        if (config.surveysPerRegistration && config.surveysPerRegistration > 5) {
            return res.status(400).json({
                error: 'Validation failed', 
                message: 'surveysPerRegistration cannot exceed 5'
            });
        }
    }
    
    next();
}

module.exports = {
    validateWorkflowConfig
};