/**
 * Configuration Manager
 * Centralized configuration management with validation and environment support
 * Eliminates scattered configuration and provides consistent access patterns
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ConfigurationManager {
    constructor(options = {}) {
        this.configPath = options.configPath || path.join(__dirname, '../../config');
        this.environment = options.environment || process.env.NODE_ENV || 'development';
        this.config = {};
        this.isLoaded = false;
        this.watchers = new Map();
        this.validators = new Map();
        this.secrets = new Map();
    }

    /**
     * Load configuration from multiple sources
     */
    async initialize() {
        if (this.isLoaded) return;

        console.log('⚙️ Loading configuration...');

        try {
            // Load base configuration
            await this.loadBaseConfig();
            
            // Load environment-specific configuration
            await this.loadEnvironmentConfig();
            
            // Load secrets
            await this.loadSecrets();
            
            // Apply environment variables
            this.applyEnvironmentVariables();
            
            // Validate configuration
            await this.validateConfiguration();
            
            // Set up file watchers for hot reload
            if (this.environment === 'development') {
                await this.setupFileWatchers();
            }

            this.isLoaded = true;
            console.log(`✅ Configuration loaded for environment: ${this.environment}`);
            
        } catch (error) {
            console.error('❌ Configuration loading failed:', error.message);
            throw error;
        }
    }

    /**
     * Load base configuration
     */
    async loadBaseConfig() {
        const baseConfigPath = path.join(this.configPath, 'base.json');
        
        try {
            const baseConfigData = await fs.readFile(baseConfigPath, 'utf8');
            this.config = JSON.parse(baseConfigData);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            // Use default configuration if base.json doesn't exist
            this.config = this.getDefaultConfiguration();
        }
    }

    /**
     * Load environment-specific configuration
     */
    async loadEnvironmentConfig() {
        const envConfigPath = path.join(this.configPath, `${this.environment}.json`);
        
        try {
            const envConfigData = await fs.readFile(envConfigPath, 'utf8');
            const envConfig = JSON.parse(envConfigData);
            
            // Deep merge environment config with base config
            this.config = this.deepMerge(this.config, envConfig);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            console.log(`ℹ️ No environment-specific config found for: ${this.environment}`);
        }
    }

    /**
     * Load secrets from secure storage
     */
    async loadSecrets() {
        const secretsPath = path.join(this.configPath, 'secrets.json');
        
        try {
            const secretsData = await fs.readFile(secretsPath, 'utf8');
            const secrets = JSON.parse(secretsData);
            
            // Store secrets separately for security
            for (const [key, value] of Object.entries(secrets)) {
                this.secrets.set(key, value);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn('⚠️ Could not load secrets file:', error.message);
            }
        }
    }

    /**
     * Apply environment variables to configuration
     */
    applyEnvironmentVariables() {
        const envMappings = {
            'TWOCAPTCHA_API_KEY': 'captcha.twoCaptchaKey',
            'ANTICAPTCHA_API_KEY': 'captcha.antiCaptchaKey',
            'PYTHON_SERVICE_URL': 'ai.serviceUrl',
            'DATABASE_PATH': 'database.path',
            'DEBUG_MODE': 'app.debugMode',
            'HEADLESS_MODE': 'browser.headless',
            'STEALTH_LEVEL': 'stealth.level',
            'PROXY_ROTATION': 'proxy.enabled',
            'LEARNING_ENABLED': 'ai.learningEnabled'
        };

        for (const [envVar, configPath] of Object.entries(envMappings)) {
            if (process.env[envVar]) {
                this.setNestedValue(this.config, configPath, this.parseEnvironmentValue(process.env[envVar]));
            }
        }
    }

    /**
     * Parse environment variable values to correct types
     */
    parseEnvironmentValue(value) {
        // Boolean values
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // Number values
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        
        // String values
        return value;
    }

    /**
     * Get configuration value by path
     */
    get(path, defaultValue = undefined) {
        return this.getNestedValue(this.config, path) ?? defaultValue;
    }

    /**
     * Set configuration value by path
     */
    set(path, value) {
        this.setNestedValue(this.config, path, value);
        this.notifyWatchers(path, value);
    }

    /**
     * Get secret value
     */
    getSecret(key) {
        return this.secrets.get(key);
    }

    /**
     * Check if configuration key exists
     */
    has(path) {
        return this.getNestedValue(this.config, path) !== undefined;
    }

    /**
     * Get entire configuration section
     */
    getSection(sectionName) {
        return this.get(sectionName, {});
    }

    /**
     * Register configuration validator
     */
    registerValidator(path, validatorFn) {
        this.validators.set(path, validatorFn);
        return this;
    }

    /**
     * Validate configuration
     */
    async validateConfiguration() {
        const errors = [];

        // Run custom validators
        for (const [path, validator] of this.validators.entries()) {
            try {
                const value = this.get(path);
                const result = await validator(value, this.config);
                if (result !== true) {
                    errors.push(`Validation failed for '${path}': ${result}`);
                }
            } catch (error) {
                errors.push(`Validator error for '${path}': ${error.message}`);
            }
        }

        // Built-in validations
        await this.runBuiltInValidations(errors);

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
    }

    /**
     * Run built-in configuration validations
     */
    async runBuiltInValidations(errors) {
        // Validate required paths
        const requiredPaths = [
            'app.name',
            'database.path',
            'browser.headless'
        ];

        for (const path of requiredPaths) {
            if (!this.has(path)) {
                errors.push(`Required configuration missing: ${path}`);
            }
        }

        // Validate stealth level
        const stealthLevel = this.get('stealth.level');
        if (stealthLevel && !['low', 'medium', 'high', 'maximum'].includes(stealthLevel)) {
            errors.push(`Invalid stealth level: ${stealthLevel}`);
        }

        // Validate timeout values
        const timeouts = ['app.timeout', 'browser.timeout', 'captcha.timeout'];
        for (const timeoutPath of timeouts) {
            const timeout = this.get(timeoutPath);
            if (timeout && (typeof timeout !== 'number' || timeout < 1000)) {
                errors.push(`Invalid timeout value for ${timeoutPath}: ${timeout}`);
            }
        }

        // Validate URLs
        const urls = ['ai.serviceUrl'];
        for (const urlPath of urls) {
            const url = this.get(urlPath);
            if (url && !this.isValidUrl(url)) {
                errors.push(`Invalid URL for ${urlPath}: ${url}`);
            }
        }
    }

    /**
     * Watch configuration changes
     */
    watch(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, new Set());
        }
        this.watchers.get(path).add(callback);
        
        return () => {
            const callbacks = this.watchers.get(path);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.watchers.delete(path);
                }
            }
        };
    }

    /**
     * Notify watchers of configuration changes
     */
    notifyWatchers(path, value) {
        const callbacks = this.watchers.get(path);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(value, path);
                } catch (error) {
                    console.error(`Configuration watcher error for ${path}:`, error);
                }
            });
        }
    }

    /**
     * Setup file watchers for hot reload
     */
    async setupFileWatchers() {
        const fs = require('fs');
        
        const watchFiles = [
            path.join(this.configPath, 'base.json'),
            path.join(this.configPath, `${this.environment}.json`)
        ];

        for (const filePath of watchFiles) {
            try {
                fs.watch(filePath, async (eventType) => {
                    if (eventType === 'change') {
                        console.log(`📝 Configuration file changed: ${filePath}`);
                        await this.reload();
                    }
                });
            } catch (error) {
                console.warn(`⚠️ Could not watch file: ${filePath}`);
            }
        }
    }

    /**
     * Reload configuration
     */
    async reload() {
        console.log('🔄 Reloading configuration...');
        this.isLoaded = false;
        this.config = {};
        await this.initialize();
    }

    /**
     * Export configuration for debugging
     */
    export(includeSensitive = false) {
        const exported = JSON.parse(JSON.stringify(this.config));
        
        if (!includeSensitive) {
            // Remove sensitive information
            this.redactSensitiveData(exported);
        }
        
        return exported;
    }

    /**
     * Redact sensitive data from configuration
     */
    redactSensitiveData(config) {
        const sensitiveKeys = ['password', 'key', 'secret', 'token', 'api'];
        
        const redact = (obj) => {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    redact(value);
                } else if (typeof value === 'string' && 
                          sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                    obj[key] = '*'.repeat(Math.min(value.length, 8));
                }
            }
        };
        
        redact(config);
    }

    /**
     * Helper methods
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    deepMerge(target, source) {
        const result = { ...target };
        
        for (const [key, value] of Object.entries(source)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.deepMerge(result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfiguration() {
        return {
            app: {
                name: 'Enhanced Poll Automation System',
                version: '2.0.0',
                debugMode: false,
                timeout: 30000,
                maxRetries: 3
            },
            browser: {
                headless: true,
                timeout: 30000,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            },
            stealth: {
                level: 'high',
                behaviorSimulation: true,
                fingerprintSpoofing: true,
                canvasNoise: true
            },
            behavioral: {
                mouseSimulation: true,
                keystrokeSimulation: true,
                personality: 'adaptive',
                errorRate: 0.02
            },
            proxy: {
                enabled: false,
                rotationInterval: 300000,
                healthCheckInterval: 60000,
                retryAttempts: 3
            },
            captcha: {
                enabled: true,
                timeout: 60000,
                retryAttempts: 3,
                twoCaptchaKey: null,
                antiCaptchaKey: null
            },
            ai: {
                serviceUrl: 'http://127.0.0.1:5000',
                learningEnabled: true,
                cachingEnabled: true,
                batchProcessing: true,
                costOptimization: true
            },
            database: {
                path: './data/enhanced-poll-automation.db',
                backupEnabled: true,
                compressionEnabled: true
            },
            logging: {
                level: 'info',
                format: 'json',
                file: './logs/app.log',
                console: true
            },
            session: {
                persistence: true,
                recovery: true,
                timeout: 3600000 // 1 hour
            }
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up configuration manager...');
        this.watchers.clear();
        this.validators.clear();
        this.secrets.clear();
        this.isLoaded = false;
    }
}

module.exports = ConfigurationManager;