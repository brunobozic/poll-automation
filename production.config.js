/**
 * Production Deployment Configuration
 * Settings for running AI poll automation in production environment
 */

const path = require('path');

module.exports = {
    // Environment configuration
    environment: 'production',
    
    // AI Service Configuration
    ai: {
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'gpt-3.5-turbo',
        maxRetries: 3,
        timeout: 60000,
        rateLimit: {
            requestsPerMinute: 60,
            burstLimit: 10
        },
        costLimits: {
            dailyLimit: 50.00,        // $50 per day
            sessionLimit: 1.00,       // $1 per session
            alertThreshold: 0.80      // Alert at 80% of limits
        }
    },

    // Browser Configuration
    browser: {
        headless: true,
        instances: {
            max: 5,                   // Maximum concurrent browsers
            warmPool: 2               // Keep 2 browsers warm
        },
        timeout: 300000,              // 5 minutes per session
        viewport: {
            width: 1366,
            height: 768
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },

    // Proxy Configuration
    proxy: {
        enabled: true,
        rotation: {
            enabled: true,
            intervalMinutes: 30
        },
        pools: {
            residential: {
                servers: [
                    // Add your proxy servers here
                    // { server: 'http://proxy1:8080', username: 'user', password: 'pass' }
                ],
                weight: 0.7
            },
            datacenter: {
                servers: [
                    // Add datacenter proxies here
                ],
                weight: 0.3
            }
        },
        fallback: {
            enabled: true,
            maxFailures: 3
        }
    },

    // Database Configuration
    database: {
        type: 'sqlite',
        path: './data/production.db',
        pool: {
            min: 2,
            max: 10
        },
        backup: {
            enabled: true,
            interval: '6h',
            retention: '30d',
            location: './backups/'
        }
    },

    // Logging Configuration
    logging: {
        level: 'info',
        console: {
            enabled: true,
            level: 'info'
        },
        file: {
            enabled: true,
            level: 'debug',
            directory: './logs',
            maxSize: '50MB',
            maxFiles: 30,
            rotateDaily: true
        },
        remote: {
            enabled: false,
            // Configure remote logging service (e.g., ELK stack, Datadog)
            endpoint: process.env.LOG_ENDPOINT,
            apiKey: process.env.LOG_API_KEY
        }
    },

    // Monitoring and Alerting
    monitoring: {
        enabled: true,
        healthCheck: {
            interval: 60000,          // 1 minute
            endpoint: '/health',
            port: process.env.HEALTH_PORT || 3000
        },
        metrics: {
            enabled: true,
            interval: 300000,         // 5 minutes
            retention: '7d'
        },
        alerts: {
            enabled: true,
            channels: {
                email: {
                    enabled: false,
                    recipients: ['admin@example.com'],
                    smtp: {
                        host: process.env.SMTP_HOST,
                        port: process.env.SMTP_PORT,
                        user: process.env.SMTP_USER,
                        password: process.env.SMTP_PASSWORD
                    }
                },
                webhook: {
                    enabled: false,
                    url: process.env.WEBHOOK_URL,
                    secret: process.env.WEBHOOK_SECRET
                },
                slack: {
                    enabled: false,
                    webhook: process.env.SLACK_WEBHOOK
                }
            },
            conditions: {
                errorRate: 0.1,           // Alert if >10% error rate
                costOverrun: 0.9,         // Alert at 90% of cost limit
                sessionFailure: 5,        // Alert after 5 consecutive failures
                systemHealth: 'degraded'  // Alert if system health is degraded
            }
        }
    },

    // Security Configuration
    security: {
        encryption: {
            algorithm: 'aes-256-gcm',
            keyRotation: {
                enabled: true,
                interval: '30d'
            }
        },
        apiKeys: {
            rotation: {
                enabled: true,
                interval: '90d'
            }
        },
        rateLimit: {
            enabled: true,
            windowMs: 900000,         // 15 minutes
            maxRequests: 100
        },
        ipWhitelist: {
            enabled: false,
            addresses: []
        }
    },

    // Performance Configuration
    performance: {
        cache: {
            enabled: true,
            ttl: {
                siteAnalysis: '7d',
                questionClassification: '30d',
                responsePatterns: 'permanent'
            },
            maxSize: '500MB'
        },
        optimization: {
            batchProcessing: true,
            maxBatchSize: 10,
            concurrency: {
                maxSessions: 5,
                maxStepsPerSession: 1
            }
        },
        resourceLimits: {
            memory: '2GB',
            cpu: '80%',
            storage: '10GB'
        }
    },

    // Error Handling and Recovery
    errorHandling: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        recovery: {
            enabled: true,
            strategies: ['retry', 'reload', 'skip', 'changeApproach'],
            timeout: 120000           // 2 minutes per recovery attempt
        },
        screenshots: {
            enabled: true,
            onError: true,
            retention: '7d'
        }
    },

    // Queue Management
    queue: {
        enabled: true,
        type: 'memory',              // or 'redis' for distributed
        settings: {
            maxConcurrency: 5,
            maxSize: 1000,
            defaultJobTimeout: 300000,
            removeOnComplete: 100,
            removeOnFail: 50
        },
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0
        }
    },

    // API Configuration
    api: {
        enabled: true,
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        cors: {
            enabled: true,
            origins: ['http://localhost:3000']
        },
        authentication: {
            enabled: true,
            type: 'jwt',
            secret: process.env.JWT_SECRET,
            expiresIn: '24h'
        },
        rateLimit: {
            windowMs: 900000,         // 15 minutes
            max: 100
        }
    },

    // Webhook Configuration
    webhooks: {
        enabled: false,
        endpoints: {
            sessionComplete: process.env.WEBHOOK_SESSION_COMPLETE,
            errorOccurred: process.env.WEBHOOK_ERROR,
            dailyReport: process.env.WEBHOOK_DAILY_REPORT
        },
        retries: 3,
        timeout: 10000
    },

    // Feature Flags
    features: {
        visualAnalysis: {
            enabled: false,           // Disable expensive GPT-4V by default
            fallbackToDom: true
        },
        adaptiveLearning: {
            enabled: true,
            learningRate: 0.1
        },
        proxyRotation: {
            enabled: true,
            aggressive: false
        },
        captchaSolving: {
            enabled: true,
            maxAttempts: 3
        },
        batchProcessing: {
            enabled: true,
            maxBatchSize: 5
        }
    },

    // Development and Testing
    development: {
        mockAI: false,               // Set to true for testing without API costs
        demoMode: false,             // Set to true to only use demo sites
        debugMode: false,            // Enhanced debugging output
        testData: {
            enabled: false,
            seedData: './test/seed-data.json'
        }
    },

    // File Paths
    paths: {
        data: './data',
        logs: './logs',
        screenshots: './data/screenshots',
        backups: './backups',
        cache: './data/cache',
        temp: './tmp'
    },

    // Resource Cleanup
    cleanup: {
        screenshots: {
            enabled: true,
            maxAge: '7d',
            maxSize: '1GB'
        },
        logs: {
            enabled: true,
            maxAge: '30d',
            maxSize: '10GB'
        },
        cache: {
            enabled: true,
            maxAge: '30d',
            maxSize: '500MB'
        },
        temp: {
            enabled: true,
            maxAge: '1d'
        }
    },

    // Scaling Configuration
    scaling: {
        enabled: false,
        type: 'horizontal',          // or 'vertical'
        triggers: {
            cpu: 80,                 // Scale when CPU > 80%
            memory: 85,              // Scale when memory > 85%
            queueLength: 50          // Scale when queue > 50 items
        },
        limits: {
            minInstances: 1,
            maxInstances: 10
        }
    }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
    module.exports.logging.level = 'debug';
    module.exports.browser.headless = false;
    module.exports.development.debugMode = true;
}

if (process.env.NODE_ENV === 'testing') {
    module.exports.development.mockAI = true;
    module.exports.development.demoMode = true;
    module.exports.logging.level = 'trace';
}

// Validation
function validateConfig(config) {
    const required = [
        'ai.apiKey'
    ];

    for (const path of required) {
        const value = path.split('.').reduce((obj, key) => obj?.[key], config);
        if (!value) {
            throw new Error(`Required configuration missing: ${path}`);
        }
    }

    return true;
}

// Export with validation
module.exports.validate = () => validateConfig(module.exports);