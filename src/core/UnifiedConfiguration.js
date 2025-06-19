/**
 * Unified Configuration System
 * Consolidates all configuration management across the application
 */

const fs = require('fs').promises;
const path = require('path');

class UnifiedConfiguration {
    constructor(options = {}) {
        this.environment = options.environment || process.env.NODE_ENV || 'development';
        this.configDir = options.configDir || path.join(__dirname, '../../config');
        this.config = {};
        this.watchers = new Map();
        this.listeners = new Set();
        this.initialized = false;
    }
    
    /**
     * Initialize configuration system
     */
    async initialize() {
        if (this.initialized) return this.config;
        
        console.log(`🔧 Initializing Unified Configuration (${this.environment})...`);
        
        try {
            // Load base configuration
            await this.loadConfiguration('base.json');
            
            // Load environment-specific overrides
            await this.loadConfiguration(`${this.environment}.json`);
            
            // Load local overrides if they exist
            await this.loadConfiguration('local.json', true);
            
            // Validate configuration
            this.validateConfiguration();
            
            // Setup file watching in development
            if (this.environment === 'development') {
                await this.setupFileWatching();
            }
            
            this.initialized = true;
            console.log('✅ Unified Configuration initialized');
            
            return this.config;
            
        } catch (error) {
            console.error('❌ Configuration initialization failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Load configuration from file
     */
    async loadConfiguration(filename, optional = false) {
        const filepath = path.join(this.configDir, filename);
        
        try {
            const content = await fs.readFile(filepath, 'utf8');
            const config = JSON.parse(content);
            
            // Deep merge with existing config
            this.config = this.deepMerge(this.config, config);
            
            console.log(`📋 Loaded configuration: ${filename}`);
            
        } catch (error) {
            if (!optional) {
                throw new Error(`Failed to load required configuration ${filename}: ${error.message}`);
            }
            // Optional files can fail silently
        }
    }
    
    /**
     * Deep merge configuration objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    /**
     * Get configuration value with dot notation support
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current[key] === undefined) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }
    
    /**
     * Set configuration value with dot notation support
     */
    set(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // Notify listeners
        this.notifyChange(path, value);
    }
    
    /**
     * Check if configuration key exists
     */
    has(path) {
        return this.get(path) !== null;
    }
    
    /**
     * Get all configuration
     */
    getAll() {
        return { ...this.config };
    }
    
    /**
     * Get configuration for specific service
     */
    getServiceConfig(serviceName) {
        return this.get(`services.${serviceName}`, {});
    }
    
    /**
     * Get stealth configuration
     */
    getStealthConfig() {
        return {
            level: this.get('stealth.level', 'high'),
            browserStealth: this.get('stealth.browser', {}),
            humanBehavior: this.get('stealth.humanBehavior', {}),
            proxyRotation: this.get('stealth.proxy', {}),
            captchaSolving: this.get('stealth.captcha', {})
        };
    }
    
    /**
     * Get database configuration
     */
    getDatabaseConfig() {
        return this.get('database', {
            path: './data/unified-poll-automation.db',
            enableWAL: true,
            timeout: 10000
        });
    }
    
    /**
     * Get AI service configuration
     */
    getAIConfig() {
        return this.get('ai', {
            enabled: true,
            costOptimization: true,
            cachingEnabled: true,
            batchProcessing: true
        });
    }
    
    /**
     * Get logging configuration
     */
    getLoggingConfig() {
        return this.get('logging', {
            level: 'info',
            console: true,
            file: true,
            path: './logs'
        });
    }
    
    /**
     * Validate configuration
     */
    validateConfiguration() {
        const required = [
            'app.name',
            'app.version',
            'database.path',
            'stealth.level'
        ];
        
        const missing = required.filter(path => !this.has(path));
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        // Validate stealth level
        const stealthLevel = this.get('stealth.level');
        const validLevels = ['low', 'medium', 'high', 'maximum'];
        if (!validLevels.includes(stealthLevel)) {
            throw new Error(`Invalid stealth level: ${stealthLevel}. Must be one of: ${validLevels.join(', ')}`);
        }
        
        console.log('✅ Configuration validation passed');
    }
    
    /**
     * Setup file watching for configuration changes
     */
    async setupFileWatching() {
        if (!fs.watch) return; // Not supported in all environments
        
        try {
            const filesToWatch = [
                'base.json',
                `${this.environment}.json`,
                'local.json'
            ];
            
            for (const filename of filesToWatch) {
                const filepath = path.join(this.configDir, filename);
                
                try {
                    const watcher = fs.watch(filepath, async (eventType) => {
                        if (eventType === 'change') {
                            console.log(`🔄 Configuration file changed: ${filename}`);
                            await this.reloadConfiguration();
                        }
                    });
                    
                    this.watchers.set(filename, watcher);
                    
                } catch (error) {
                    // File might not exist, that's ok
                }
            }
            
            console.log('👀 Configuration file watching enabled');
            
        } catch (error) {
            console.log('⚠️ File watching not available:', error.message);
        }
    }
    
    /**
     * Reload configuration from files
     */
    async reloadConfiguration() {
        try {
            const oldConfig = { ...this.config };
            this.config = {};
            
            // Reload all configurations
            await this.loadConfiguration('base.json');
            await this.loadConfiguration(`${this.environment}.json`);
            await this.loadConfiguration('local.json', true);
            
            this.validateConfiguration();
            
            // Notify listeners of changes
            this.notifyChange('*', this.config);
            
            console.log('✅ Configuration reloaded');
            
        } catch (error) {
            console.error('❌ Configuration reload failed:', error.message);
            // Keep old configuration on failure
        }
    }
    
    /**
     * Add configuration change listener
     */
    onChange(callback) {
        this.listeners.add(callback);
        
        return () => {
            this.listeners.delete(callback);
        };
    }
    
    /**
     * Notify listeners of configuration changes
     */
    notifyChange(path, value) {
        for (const listener of this.listeners) {
            try {
                listener(path, value, this.config);
            } catch (error) {
                console.error('Configuration listener error:', error.message);
            }
        }
    }
    
    /**
     * Export configuration to JSON
     */
    toJSON() {
        return JSON.stringify(this.config, null, 2);
    }
    
    /**
     * Get configuration summary for debugging
     */
    getSummary() {
        return {
            environment: this.environment,
            initialized: this.initialized,
            configKeys: Object.keys(this.config),
            stealthLevel: this.get('stealth.level'),
            databasePath: this.get('database.path'),
            servicesCount: Object.keys(this.get('services', {})).length,
            watchersActive: this.watchers.size
        };
    }
    
    /**
     * Clean shutdown
     */
    shutdown() {
        // Close file watchers
        for (const [filename, watcher] of this.watchers) {
            try {
                watcher.close();
            } catch (error) {
                console.log(`⚠️ Error closing watcher for ${filename}:`, error.message);
            }
        }
        
        this.watchers.clear();
        this.listeners.clear();
        
        console.log('✅ Unified Configuration shutdown complete');
    }
}

module.exports = UnifiedConfiguration;