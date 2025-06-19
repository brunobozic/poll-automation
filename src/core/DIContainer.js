/**
 * Dependency Injection Container
 * Manages all service dependencies and their lifecycles
 * Eliminates circular dependencies and provides proper service resolution
 */

class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factoryFunctions = new Map();
        this.initializationOrder = [];
        this.isInitialized = false;
    }

    /**
     * Register a service with its dependencies
     */
    register(name, serviceClass, dependencies = [], options = {}) {
        this.services.set(name, {
            serviceClass,
            dependencies,
            lifecycle: options.lifecycle || 'singleton', // singleton, transient, scoped
            initialized: false,
            options: options.options || {}
        });

        if (options.initOrder !== undefined) {
            this.initializationOrder[options.initOrder] = name;
        }

        return this;
    }

    /**
     * Register a factory function for complex service creation
     */
    registerFactory(name, factoryFn, dependencies = [], options = {}) {
        this.factoryFunctions.set(name, {
            factory: factoryFn,
            dependencies,
            lifecycle: options.lifecycle || 'singleton',
            initialized: false,
            options: options.options || {}
        });

        if (options.initOrder !== undefined) {
            this.initializationOrder[options.initOrder] = name;
        }

        return this;
    }

    /**
     * Register a singleton instance
     */
    registerInstance(name, instance) {
        this.singletons.set(name, instance);
        return this;
    }

    /**
     * Resolve a service and its dependencies
     */
    resolve(name) {
        // Check if it's already a singleton instance
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Check if it's a factory function
        if (this.factoryFunctions.has(name)) {
            return this.resolveFactory(name);
        }

        // Check if it's a registered service
        if (this.services.has(name)) {
            return this.resolveService(name);
        }

        throw new Error(`Service '${name}' not found in container`);
    }

    /**
     * Resolve service from factory function
     */
    resolveFactory(name) {
        const factoryConfig = this.factoryFunctions.get(name);
        
        if (factoryConfig.lifecycle === 'singleton' && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Resolve dependencies
        const dependencies = factoryConfig.dependencies.map(dep => this.resolve(dep));
        
        // Create instance using factory
        const instance = factoryConfig.factory(...dependencies, factoryConfig.options);

        // Store as singleton if needed
        if (factoryConfig.lifecycle === 'singleton') {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    /**
     * Resolve service from class
     */
    resolveService(name) {
        const serviceConfig = this.services.get(name);
        
        if (serviceConfig.lifecycle === 'singleton' && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Resolve dependencies
        const dependencies = serviceConfig.dependencies.map(dep => this.resolve(dep));
        
        // Create instance
        const instance = new serviceConfig.serviceClass(...dependencies, serviceConfig.options);

        // Store as singleton if needed
        if (serviceConfig.lifecycle === 'singleton') {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    /**
     * Initialize all services in dependency order
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🔧 Initializing dependency injection container...');

        // Initialize services in order
        const orderedServices = this.initializationOrder.filter(name => name);
        
        for (const serviceName of orderedServices) {
            try {
                const service = this.resolve(serviceName);
                
                // Call initialize method if it exists
                if (service && typeof service.initialize === 'function') {
                    await service.initialize();
                    console.log(`  ✅ ${serviceName} initialized`);
                }
            } catch (error) {
                console.error(`  ❌ Failed to initialize ${serviceName}:`, error.message);
                throw error;
            }
        }

        this.isInitialized = true;
        console.log('✅ Dependency injection container initialized');
    }

    /**
     * Get all services of a specific type/interface
     */
    getServicesOfType(type) {
        const services = [];
        
        for (const [name, config] of this.services.entries()) {
            if (config.serviceClass.prototype instanceof type || config.serviceClass === type) {
                services.push(this.resolve(name));
            }
        }

        return services;
    }

    /**
     * Check if service is registered
     */
    has(name) {
        return this.services.has(name) || 
               this.factoryFunctions.has(name) || 
               this.singletons.has(name);
    }

    /**
     * Get service configuration
     */
    getConfig(name) {
        if (this.services.has(name)) {
            return this.services.get(name);
        }
        if (this.factoryFunctions.has(name)) {
            return this.factoryFunctions.get(name);
        }
        return null;
    }

    /**
     * Cleanup all services
     */
    async cleanup() {
        console.log('🧹 Cleaning up dependency injection container...');

        // Cleanup singletons in reverse order
        const cleanupOrder = [...this.initializationOrder].reverse().filter(name => name);
        
        for (const serviceName of cleanupOrder) {
            try {
                if (this.singletons.has(serviceName)) {
                    const service = this.singletons.get(serviceName);
                    
                    if (service && typeof service.cleanup === 'function') {
                        await service.cleanup();
                        console.log(`  ✅ ${serviceName} cleaned up`);
                    } else if (service && typeof service.destroy === 'function') {
                        await service.destroy();
                        console.log(`  ✅ ${serviceName} destroyed`);
                    } else if (service && typeof service.close === 'function') {
                        await service.close();
                        console.log(`  ✅ ${serviceName} closed`);
                    }
                }
            } catch (error) {
                console.error(`  ⚠️ Error cleaning up ${serviceName}:`, error.message);
            }
        }

        // Clear all references
        this.singletons.clear();
        this.isInitialized = false;
        
        console.log('✅ Dependency injection container cleanup complete');
    }

    /**
     * Get container statistics
     */
    getStats() {
        return {
            registeredServices: this.services.size,
            registeredFactories: this.factoryFunctions.size,
            activeSingletons: this.singletons.size,
            isInitialized: this.isInitialized,
            initializationOrder: this.initializationOrder.filter(name => name)
        };
    }

    /**
     * Validate container configuration
     */
    validateConfiguration() {
        const errors = [];
        const warnings = [];

        // Check for circular dependencies
        for (const [serviceName, config] of this.services.entries()) {
            const visited = new Set();
            const stack = new Set();
            
            if (this.hasCircularDependency(serviceName, visited, stack)) {
                errors.push(`Circular dependency detected for service: ${serviceName}`);
            }
        }

        // Check for missing dependencies
        for (const [serviceName, config] of this.services.entries()) {
            for (const dependency of config.dependencies) {
                if (!this.has(dependency)) {
                    errors.push(`Service '${serviceName}' depends on missing service '${dependency}'`);
                }
            }
        }

        // Check for factory dependencies
        for (const [factoryName, config] of this.factoryFunctions.entries()) {
            for (const dependency of config.dependencies) {
                if (!this.has(dependency)) {
                    errors.push(`Factory '${factoryName}' depends on missing service '${dependency}'`);
                }
            }
        }

        // Check initialization order
        const orderedServices = this.initializationOrder.filter(name => name);
        for (const serviceName of orderedServices) {
            if (!this.has(serviceName)) {
                warnings.push(`Service '${serviceName}' in initialization order but not registered`);
            }
        }

        return { errors, warnings };
    }

    /**
     * Check for circular dependencies using DFS
     */
    hasCircularDependency(serviceName, visited, stack) {
        if (stack.has(serviceName)) {
            return true; // Circular dependency found
        }

        if (visited.has(serviceName)) {
            return false; // Already processed
        }

        visited.add(serviceName);
        stack.add(serviceName);

        const config = this.services.get(serviceName) || this.factoryFunctions.get(serviceName);
        if (config && config.dependencies) {
            for (const dependency of config.dependencies) {
                if (this.hasCircularDependency(dependency, visited, stack)) {
                    return true;
                }
            }
        }

        stack.delete(serviceName);
        return false;
    }
}

module.exports = DIContainer;