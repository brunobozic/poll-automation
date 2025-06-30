/**
 * Service Registry
 * Central service management and initialization
 */

class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.initialized = false;
    }

    async initialize() {
        console.log('⚙️ Initializing services...');
        
        try {
            // Initialize core services
            await this.initializeService('TrainingWorkflowService', require('../services/workflows/training-workflow-service'));
            
            // Add other services as they're created
            // await this.initializeService('EmailService', require('../services/email/email-service'));
            // await this.initializeService('AutomationService', require('../services/automation/automation-service'));
            
            this.initialized = true;
            console.log('✅ All services initialized successfully');
            
        } catch (error) {
            console.error('❌ Service initialization failed:', error);
            throw error;
        }
    }

    async initializeService(name, service) {
        try {
            if (service.initialize) {
                await service.initialize();
            }
            this.services.set(name, service);
            console.log(`  ✅ ${name} initialized`);
        } catch (error) {
            console.error(`  ❌ ${name} initialization failed:`, error);
            throw error;
        }
    }

    getService(name) {
        return this.services.get(name);
    }

    isInitialized() {
        return this.initialized;
    }
}

module.exports = new ServiceRegistry();