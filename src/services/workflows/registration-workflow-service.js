/**
 * Registration Workflow Service - Stub
 */

class RegistrationWorkflowService {
    static async startBatchRegistration(params) {
        console.log('📝 Starting batch registration workflow...');
        return 'reg-workflow-' + Date.now();
    }
}

module.exports = RegistrationWorkflowService;