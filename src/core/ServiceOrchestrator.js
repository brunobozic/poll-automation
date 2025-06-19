/**
 * Service Orchestrator
 * Consolidates and manages all application services with dependency injection
 */

const UnifiedConfiguration = require('./UnifiedConfiguration');
const UnifiedLogger = require('./UnifiedLogger');
const BrowserManager = require('./BrowserManager');
const AdaptiveLearningEngine = require('../ai/adaptive-learning-engine');
const RegistrationLogger = require('../database/registration-logger');
const DemographicOptimizer = require('../ai/demographic-optimizer');
const DefenseDetector = require('../security/defense-detector');
const EmailAccountManager = require('../email/email-account-manager');

class ServiceOrchestrator {
    constructor(options = {}) {
        this.options = options;
        this.services = new Map();
        this.dependencies = new Map();
        this.initialized = false;
        this.shutdownHooks = new Set();
        
        // Service definitions with dependencies
        this.serviceDefinitions = {
            'config': {
                class: UnifiedConfiguration,
                singleton: true,
                dependencies: [],
                factory: (deps) => new UnifiedConfiguration(this.options.config || {})
            },
            
            'logger': {
                class: UnifiedLogger,
                singleton: true,
                dependencies: ['config'],
                factory: (deps) => new UnifiedLogger(deps.config.getLoggingConfig())
            },
            
            'database': {
                class: RegistrationLogger,
                singleton: true,
                dependencies: ['config', 'logger'],
                factory: (deps) => new RegistrationLogger(deps.config.getDatabaseConfig().path)
            },
            
            'browserManager': {
                class: BrowserManager,
                singleton: true,
                dependencies: ['config', 'logger'],
                factory: (deps) => new BrowserManager(deps.config.getStealthConfig())
            },
            
            'adaptiveLearning': {
                class: AdaptiveLearningEngine,
                singleton: true,
                dependencies: ['config', 'logger'],
                factory: (deps) => new AdaptiveLearningEngine({
                    learningEnabled: deps.config.get('ai.adaptiveLearning.enabled', true),
                    confidenceThreshold: deps.config.get('ai.adaptiveLearning.confidenceThreshold', 0.7)
                })
            },
            
            'defenseDetector': {
                class: DefenseDetector,
                singleton: true,
                dependencies: ['logger'],
                factory: (deps) => new DefenseDetector()
            },
            
            'optimizer': {
                class: DemographicOptimizer,
                singleton: true,
                dependencies: ['config', 'logger'],
                factory: (deps) => new DemographicOptimizer()
            },
            
            'emailManager': {
                class: EmailAccountManager,
                singleton: true,
                dependencies: ['config', 'logger', 'browserManager'],
                factory: (deps) => new EmailAccountManager({
                    headless: deps.config.get('browser.headless', true),
                    debugMode: deps.config.get('debug', false),
                    timeout: deps.config.get('browser.timeout', 45000)
                })
            }
        };
    }
    
    /**
     * Initialize all services
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing Service Orchestrator...');
        
        try {
            // Initialize services in dependency order
            const initOrder = this.resolveDependencyOrder();
            
            for (const serviceName of initOrder) {
                await this.initializeService(serviceName);
            }
            
            this.initialized = true;
            console.log('✅ Service Orchestrator initialized');
            
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ Service Orchestrator initialization failed:', error.message);
            await this.shutdown();
            throw error;
        }
    }
    
    /**
     * Resolve dependency order for initialization
     */
    resolveDependencyOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];
        
        const visit = (serviceName) => {
            if (visited.has(serviceName)) return;
            if (visiting.has(serviceName)) {
                throw new Error(`Circular dependency detected involving ${serviceName}`);
            }
            
            visiting.add(serviceName);
            
            const definition = this.serviceDefinitions[serviceName];
            if (!definition) {
                throw new Error(`Unknown service: ${serviceName}`);
            }
            
            // Visit dependencies first
            for (const dependency of definition.dependencies) {
                visit(dependency);
            }
            
            visiting.delete(serviceName);
            visited.add(serviceName);
            order.push(serviceName);
        };
        
        // Visit all services
        for (const serviceName of Object.keys(this.serviceDefinitions)) {
            visit(serviceName);
        }
        
        return order;
    }
    
    /**
     * Initialize a specific service
     */
    async initializeService(serviceName) {
        if (this.services.has(serviceName)) {
            return this.services.get(serviceName);
        }
        
        const definition = this.serviceDefinitions[serviceName];
        if (!definition) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        console.log(`🔧 Initializing service: ${serviceName}`);
        
        // Resolve dependencies
        const dependencies = {};
        for (const depName of definition.dependencies) {
            dependencies[depName] = await this.getService(depName);
        }
        
        // Create service instance
        let service;
        if (definition.factory) {
            service = definition.factory(dependencies);
        } else {
            service = new definition.class(dependencies);
        }
        
        // Initialize if method exists
        if (service.initialize && typeof service.initialize === 'function') {
            await service.initialize();
        }
        
        // Store service
        this.services.set(serviceName, service);
        
        // Track shutdown hook if available
        if (service.shutdown && typeof service.shutdown === 'function') {
            this.shutdownHooks.add(() => service.shutdown());
        }
        
        console.log(`✅ Service initialized: ${serviceName}`);
        return service;
    }
    
    /**
     * Get a service instance
     */
    async getService(serviceName) {
        if (this.services.has(serviceName)) {
            return this.services.get(serviceName);
        }
        
        return await this.initializeService(serviceName);
    }
    
    /**
     * Register a new service
     */
    registerService(name, definition) {
        this.serviceDefinitions[name] = definition;
    }
    
    /**
     * Check if service exists
     */
    hasService(serviceName) {
        return this.services.has(serviceName);
    }
    
    /**
     * Get all services
     */
    getAllServices() {
        return new Map(this.services);
    }
    
    /**
     * Get service health status
     */
    async getServiceHealth() {
        const health = {};
        
        for (const [name, service] of this.services) {
            try {
                if (service.getHealth && typeof service.getHealth === 'function') {
                    health[name] = await service.getHealth();
                } else {
                    health[name] = { status: 'unknown', message: 'No health check available' };
                }
            } catch (error) {
                health[name] = { status: 'error', message: error.message };
            }
        }
        
        return health;
    }
    
    /**
     * Get service statistics
     */
    getServiceStats() {
        const stats = {
            totalServices: this.services.size,
            initialized: this.initialized,
            services: {}
        };
        
        for (const [name, service] of this.services) {
            if (service.getStats && typeof service.getStats === 'function') {
                try {
                    stats.services[name] = service.getStats();
                } catch (error) {
                    stats.services[name] = { error: error.message };
                }
            } else {
                stats.services[name] = { status: 'no stats available' };
            }
        }
        
        return stats;
    }
    
    /**
     * Create service factory for common patterns
     */
    createServiceFactory(serviceName, config = {}) {
        return async () => {
            const service = await this.getService(serviceName);
            
            // Apply configuration overrides
            if (config && service.configure && typeof service.configure === 'function') {
                await service.configure(config);
            }
            
            return service;
        };
    }
    
    /**
     * Execute workflow across multiple services
     */
    async executeWorkflow(workflowName, context = {}) {
        const logger = await this.getService('logger');
        const childLogger = logger.child({ workflow: workflowName });
        
        childLogger.info('Starting workflow', { context });
        
        try {
            switch (workflowName) {
                case 'emailCreation':
                    return await this.executeEmailCreationWorkflow(context, childLogger);
                    
                case 'siteRegistration':
                    return await this.executeSiteRegistrationWorkflow(context, childLogger);
                    
                case 'adaptiveLearning':
                    return await this.executeAdaptiveLearningWorkflow(context, childLogger);
                    
                default:
                    throw new Error(`Unknown workflow: ${workflowName}`);
            }
            
        } catch (error) {
            childLogger.error('Workflow failed', { error: error.message }, error);
            throw error;
        }
    }
    
    /**
     * Email creation workflow
     */
    async executeEmailCreationWorkflow(context, logger) {
        const emailManager = await this.getService('emailManager');
        const database = await this.getService('database');
        const optimizer = await this.getService('optimizer');
        
        logger.info('Creating email account', { service: context.service });
        
        // Create email account
        const emailAccount = await emailManager.createEmailAccount(context.service);
        
        // Generate AI-optimized profile
        const profile = optimizer.generateOptimalProfile();
        profile.email = emailAccount.email;
        
        // Log to database
        const emailId = await database.logEmailAccount({
            email: emailAccount.email,
            service: emailAccount.service,
            password: emailAccount.password,
            sessionId: `workflow-${Date.now()}`,
            status: 'active',
            metadata: {
                aiOptimized: true,
                profile: profile,
                createdBy: 'ServiceOrchestrator'
            }
        });
        
        logger.info('Email creation workflow completed', {
            email: emailAccount.email,
            emailId: emailId,
            profile: profile.profileName
        });
        
        return {
            emailAccount,
            profile,
            emailId
        };
    }
    
    /**
     * Site registration workflow
     */
    async executeSiteRegistrationWorkflow(context, logger) {
        const browserManager = await this.getService('browserManager');
        const defenseDetector = await this.getService('defenseDetector');
        const adaptiveLearning = await this.getService('adaptiveLearning');
        const database = await this.getService('database');
        
        const { emailData, siteConfig } = context;
        
        logger.info('Starting site registration', { 
            site: siteConfig.name,
            email: emailData.emailAccount.email 
        });
        
        // Get adaptive recommendations
        const recommendations = adaptiveLearning.getAdaptiveRecommendations(siteConfig.name);
        
        // Create browser page with stealth
        const page = await browserManager.createStealthPage();
        
        try {
            // Navigate to site
            await page.goto(siteConfig.url, { waitUntil: 'networkidle' });
            
            // Detect defenses
            const defenses = await defenseDetector.detectDefenses(page, siteConfig.url);
            
            // Perform registration based on recommendations
            // (This would contain the actual registration logic)
            
            logger.info('Site registration workflow completed', {
                defenses: defenses.length,
                recommendations: recommendations
            });
            
            return {
                success: true,
                defenses,
                recommendations
            };
            
        } finally {
            await page.close();
        }
    }
    
    /**
     * Adaptive learning workflow
     */
    async executeAdaptiveLearningWorkflow(context, logger) {
        const adaptiveLearning = await this.getService('adaptiveLearning');
        
        logger.info('Processing adaptive learning', { attempt: context.attemptData });
        
        await adaptiveLearning.learnFromAttempt(context.attemptData);
        
        const stats = adaptiveLearning.getStats();
        logger.info('Adaptive learning completed', { stats });
        
        return { stats };
    }
    
    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\\n🛑 Received ${signal}, shutting down gracefully...`);
                await this.shutdown();
                process.exit(0);
            });
        });
    }
    
    /**
     * Shutdown all services
     */
    async shutdown() {
        console.log('🧹 Shutting down Service Orchestrator...');
        
        // Execute shutdown hooks in reverse order
        const hooks = Array.from(this.shutdownHooks).reverse();
        
        for (const hook of hooks) {
            try {
                await hook();
            } catch (error) {
                console.error('Service shutdown error:', error.message);
            }
        }
        
        this.services.clear();
        this.shutdownHooks.clear();
        this.initialized = false;
        
        console.log('✅ Service Orchestrator shutdown complete');
    }
}

module.exports = ServiceOrchestrator;