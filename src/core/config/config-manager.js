/**
 * Configuration Manager
 * Centralized configuration management
 */

const path = require('path');
const fs = require('fs');

class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        const defaultConfig = {
            server: {
                port: 3000,
                host: 'localhost'
            },
            cors: {
                allowedOrigins: ['http://localhost:3000', 'http://localhost:3001']
            },
            database: {
                path: './poll-automation.db'
            },
            automation: {
                defaultTimeout: 30000,
                maxConcurrency: 3,
                retryAttempts: 3
            },
            security: {
                rateLimit: {
                    windowMs: 15 * 60 * 1000,
                    max: 100
                }
            }
        };

        // Try to load environment-specific config
        const env = process.env.NODE_ENV || 'development';
        const configPath = path.join(process.cwd(), 'config', `${env}.json`);
        
        if (fs.existsSync(configPath)) {
            try {
                const envConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return this.mergeConfigs(defaultConfig, envConfig);
            } catch (error) {
                console.warn(`⚠️ Failed to load config from ${configPath}:`, error.message);
            }
        }

        return defaultConfig;
    }

    mergeConfigs(defaultConfig, envConfig) {
        return { ...defaultConfig, ...envConfig };
    }

    get(key, defaultValue) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    set(key, value) {
        const keys = key.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    getAll() {
        return { ...this.config };
    }
}

module.exports = ConfigManager;