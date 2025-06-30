/**
 * Enhanced Logger
 * 
 * Comprehensive logging system for survey automation with:
 * - Multiple log levels and categories
 * - SQLite database integration
 * - Real-time console output with colors
 * - Structured data logging
 * - Performance metrics
 * - Error tracking and context
 */

const fs = require('fs').promises;
const path = require('path');

class EnhancedLogger {
    constructor(registrationLogger, options = {}) {
        this.registrationLogger = registrationLogger;
        this.options = {
            enableConsoleLogging: true,
            enableFileLogging: true,
            enableDatabaseLogging: true,
            logLevel: 'info', // debug, info, warn, error
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxLogFiles: 5,
            logDirectory: './logs',
            ...options
        };
        
        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        this.colors = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            reset: '\x1b[0m'
        };
        
        this.categories = {
            SYSTEM: '🔧',
            LOGIN: '🔐',
            SURVEY: '📝',
            PERSONA: '🎭',
            LLM: '🧠',
            DETECTION: '🔍',
            NAVIGATION: '🧭',
            FORM: '📋',
            DATABASE: '💾',
            API: '🌐',
            ERROR: '❌',
            SUCCESS: '✅',
            WARNING: '⚠️',
            PERFORMANCE: '⏱️'
        };
        
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.startTime = Date.now();
        
        this.initializeLogger();
    }

    /**
     * Initialize logger and create log directory
     */
    async initializeLogger() {
        try {
            if (this.options.enableFileLogging) {
                await fs.mkdir(this.options.logDirectory, { recursive: true });
            }
            
            this.log('SYSTEM', 'info', 'Enhanced Logger initialized', {
                sessionId: this.sessionId,
                logLevel: this.options.logLevel,
                enabledOutputs: {
                    console: this.options.enableConsoleLogging,
                    file: this.options.enableFileLogging,
                    database: this.options.enableDatabaseLogging
                }
            });
            
        } catch (error) {
            console.error(`Failed to initialize logger: ${error.message}`);
        }
    }

    /**
     * Main logging method
     */
    async log(category, level, message, data = {}, component = 'Unknown') {
        // Check log level
        if (this.logLevels[level] < this.logLevels[this.options.logLevel]) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const elapsed = Date.now() - this.startTime;
        
        const logEntry = {
            timestamp: timestamp,
            sessionId: this.sessionId,
            category: category,
            level: level.toUpperCase(),
            component: component,
            message: message,
            data: data,
            elapsed: elapsed,
            pid: process.pid
        };
        
        // Console logging
        if (this.options.enableConsoleLogging) {
            this.logToConsole(logEntry);
        }
        
        // File logging
        if (this.options.enableFileLogging) {
            await this.logToFile(logEntry);
        }
        
        // Database logging
        if (this.options.enableDatabaseLogging && this.registrationLogger) {
            await this.logToDatabase(logEntry);
        }
    }

    /**
     * Console logging with colors and formatting
     */
    logToConsole(logEntry) {
        const { category, level, message, data, elapsed, component } = logEntry;
        const color = this.colors[level.toLowerCase()] || this.colors.reset;
        const categoryIcon = this.categories[category] || '📍';
        const timeStr = `[${this.formatElapsed(elapsed)}]`;
        const componentStr = component !== 'Unknown' ? `[${component}]` : '';
        
        console.log(
            `${color}${categoryIcon} ${timeStr}${componentStr} ${message}${this.colors.reset}`
        );
        
        // Log additional data if present and significant
        if (data && Object.keys(data).length > 0 && level.toLowerCase() !== 'debug') {
            const dataStr = JSON.stringify(data, null, 2);
            if (dataStr.length < 500) { // Only show small data objects
                console.log(`${color}   📊 Data: ${dataStr}${this.colors.reset}`);
            } else {
                console.log(`${color}   📊 Data: [Large object with ${Object.keys(data).length} properties]${this.colors.reset}`);
            }
        }
    }

    /**
     * File logging with rotation
     */
    async logToFile(logEntry) {
        try {
            const logFileName = `survey-automation-${new Date().toISOString().split('T')[0]}.log`;
            const logFilePath = path.join(this.options.logDirectory, logFileName);
            
            const logLine = JSON.stringify(logEntry) + '\n';
            
            // Check file size and rotate if needed
            try {
                const stats = await fs.stat(logFilePath);
                if (stats.size > this.options.maxFileSize) {
                    await this.rotateLogFile(logFilePath);
                }
            } catch (e) {
                // File doesn't exist yet, which is fine
            }
            
            await fs.appendFile(logFilePath, logLine);
            
        } catch (error) {
            console.error(`File logging failed: ${error.message}`);
        }
    }

    /**
     * Database logging
     */
    async logToDatabase(logEntry) {
        try {
            await this.registrationLogger.logSystemEvent({
                session_id: logEntry.sessionId,
                category: logEntry.category,
                level: logEntry.level,
                component: logEntry.component,
                message: logEntry.message,
                data: JSON.stringify(logEntry.data),
                elapsed_ms: logEntry.elapsed,
                timestamp: logEntry.timestamp
            });
        } catch (error) {
            console.error(`Database logging failed: ${error.message}`);
        }
    }

    /**
     * Specialized LLM interaction logging
     */
    async logLLMInteraction(type, promptType, content, metadata = {}) {
        const timestamp = new Date().toISOString();
        
        // Enhanced console logging for LLM interactions
        if (type === 'prompt') {
            await this.log('LLM', 'info', `📤 LLM PROMPT [${promptType}]`, {
                promptType: promptType,
                contentLength: content.length,
                metadata: metadata
            });
            
            // Show prompt preview in debug mode
            if (this.options.logLevel === 'debug') {
                console.log(`\x1b[36m📝 PROMPT CONTENT:\x1b[0m`);
                console.log(`\x1b[36m${content.substring(0, 200)}...\x1b[0m`);
            }
        } else if (type === 'response') {
            await this.log('LLM', 'info', `📥 LLM RESPONSE [${promptType}]`, {
                promptType: promptType,
                responseLength: content.length,
                metadata: metadata
            });
            
            // Show response preview in debug mode
            if (this.options.logLevel === 'debug') {
                console.log(`\x1b[36m📨 RESPONSE CONTENT:\x1b[0m`);
                console.log(`\x1b[36m${content.substring(0, 200)}...\x1b[0m`);
            }
        }
        
        // CRITICAL: Always log to database regardless of log level
        try {
            await this.registrationLogger.logLLMInteraction({
                session_id: this.sessionId,
                interaction_type: type,
                prompt_type: promptType,
                content: content,
                metadata: JSON.stringify(metadata),
                timestamp: timestamp,
                content_length: content.length
            });
            
            await this.log('DATABASE', 'debug', `💾 LLM ${type} logged to database`, {
                promptType: promptType,
                contentLength: content.length
            });
            
        } catch (error) {
            await this.log('ERROR', 'error', `❌ Failed to log LLM ${type} to database`, {
                error: error.message,
                promptType: promptType
            });
        }
    }

    /**
     * Utility methods
     */
    
    formatElapsed(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
    }

    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
        return `${(ms / 3600000).toFixed(2)}h`;
    }

    maskEmail(email) {
        if (!email || !email.includes('@')) return email;
        const [user, domain] = email.split('@');
        return `${user.substring(0, 3)}***@${domain}`;
    }

    async rotateLogFile(filePath) {
        try {
            for (let i = this.options.maxLogFiles - 1; i >= 1; i--) {
                const oldFile = `${filePath}.${i}`;
                const newFile = `${filePath}.${i + 1}`;
                
                try {
                    await fs.rename(oldFile, newFile);
                } catch (e) {
                    // File might not exist, which is fine
                }
            }
            
            await fs.rename(filePath, `${filePath}.1`);
            
        } catch (error) {
            console.error(`Log rotation failed: ${error.message}`);
        }
    }

    /**
     * Convenience methods for direct logging
     */
    info(message, data = {}) {
        return this.log('SYSTEM', 'info', message, data);
    }

    debug(message, data = {}) {
        return this.log('SYSTEM', 'debug', message, data);
    }

    warn(message, data = {}) {
        return this.log('WARNING', 'warn', message, data);
    }

    error(message, data = {}) {
        return this.log('ERROR', 'error', message, data);
    }

    success(message, data = {}) {
        return this.log('SUCCESS', 'info', message, data);
    }

    /**
     * Create child logger for specific component
     */
    createChildLogger(component) {
        return {
            debug: (message, data = {}) => this.log('SYSTEM', 'debug', message, data, component),
            info: (message, data = {}) => this.log('SYSTEM', 'info', message, data, component),
            warn: (message, data = {}) => this.log('WARNING', 'warn', message, data, component),
            error: (message, data = {}) => this.log('ERROR', 'error', message, data, component),
            success: (message, data = {}) => this.logSuccess(message, data, component),
            performance: (operation, duration, data = {}) => this.logPerformance(operation, duration, data),
            llm: (type, promptType, content, metadata = {}) => this.logLLMInteraction(type, promptType, content, metadata)
        };
    }
}

module.exports = EnhancedLogger;