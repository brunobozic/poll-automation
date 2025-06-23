/**
 * Enhanced Logger for Poll Automation System
 * Provides comprehensive logging with different levels, formatting, and persistence
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class EnhancedLogger {
    constructor(options = {}) {
        this.options = {
            logLevel: options.logLevel || process.env.LOG_LEVEL || 'info',
            enableConsole: options.enableConsole !== false,
            enableFile: options.enableFile !== false,
            logDirectory: options.logDirectory || './logs',
            maxLogFiles: options.maxLogFiles || 10,
            includeTimestamp: options.includeTimestamp !== false,
            includeStackTrace: options.includeStackTrace || false,
            colorOutput: options.colorOutput !== false,
            ...options
        };
        
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        this.currentLevel = this.logLevels[this.options.logLevel] || 2;
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.logQueue = [];
        this.isInitialized = false;
        
        // Initialize logger
        this.initialize();
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Create logs directory if it doesn't exist
            if (this.options.enableFile) {
                await fs.mkdir(this.options.logDirectory, { recursive: true });
                
                // Clean up old log files
                await this.cleanupOldLogs();
            }
            
            this.isInitialized = true;
            this.info('Enhanced Logger initialized', {
                sessionId: this.sessionId,
                logLevel: this.options.logLevel,
                fileLogging: this.options.enableFile,
                consoleLogging: this.options.enableConsole
            });
            
        } catch (error) {
            console.error('Failed to initialize Enhanced Logger:', error.message);
        }
    }
    
    /**
     * Log error level messages
     */
    error(message, data = {}) {
        this.log('error', message, data);
    }
    
    /**
     * Log warning level messages
     */
    warn(message, data = {}) {
        this.log('warn', message, data);
    }
    
    /**
     * Log info level messages
     */
    info(message, data = {}) {
        this.log('info', message, data);
    }
    
    /**
     * Log debug level messages
     */
    debug(message, data = {}) {
        this.log('debug', message, data);
    }
    
    /**
     * Log trace level messages
     */
    trace(message, data = {}) {
        this.log('trace', message, data);
    }
    
    /**
     * Core logging method
     */
    log(level, message, data = {}) {
        if (this.logLevels[level] > this.currentLevel) {
            return; // Skip if below current log level
        }
        
        const logEntry = this.createLogEntry(level, message, data);
        
        // Console logging
        if (this.options.enableConsole) {
            this.logToConsole(logEntry);
        }
        
        // File logging (async)
        if (this.options.enableFile) {
            this.logToFile(logEntry);
        }
    }
    
    /**
     * Create structured log entry
     */
    createLogEntry(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            sessionId: this.sessionId,
            message,
            data: typeof data === 'object' ? data : { value: data },
            pid: process.pid,
            memory: process.memoryUsage()
        };
        
        // Add stack trace for errors
        if (level === 'error' && this.options.includeStackTrace) {
            const stack = new Error().stack;
            logEntry.stack = stack.split('\n').slice(2); // Remove Error and this function
        }
        
        return logEntry;
    }
    
    /**
     * Log to console with colors and formatting
     */
    logToConsole(logEntry) {
        const { timestamp, level, message, data } = logEntry;
        
        // Format timestamp
        const timeStr = this.options.includeTimestamp ? 
            chalk.gray(`[${new Date(timestamp).toLocaleTimeString()}]`) : '';
        
        // Format level with colors
        let levelStr = '';
        if (this.options.colorOutput) {
            switch (level) {
                case 'ERROR':
                    levelStr = chalk.red.bold(`[${level}]`);
                    break;
                case 'WARN':
                    levelStr = chalk.yellow.bold(`[${level}]`);
                    break;
                case 'INFO':
                    levelStr = chalk.blue.bold(`[${level}]`);
                    break;
                case 'DEBUG':
                    levelStr = chalk.green(`[${level}]`);
                    break;
                case 'TRACE':
                    levelStr = chalk.gray(`[${level}]`);
                    break;
                default:
                    levelStr = `[${level}]`;
            }
        } else {
            levelStr = `[${level}]`;
        }
        
        // Format message
        const messageStr = this.options.colorOutput && level === 'ERROR' ? 
            chalk.red(message) : message;
        
        // Build console output
        let output = `${timeStr} ${levelStr} ${messageStr}`;
        
        // Add data if present
        if (Object.keys(data).length > 0) {
            const dataStr = this.formatDataForConsole(data);
            output += `\n${dataStr}`;
        }
        
        // Output to appropriate stream
        if (level === 'ERROR') {
            console.error(output);
        } else {
            console.log(output);
        }
    }
    
    /**
     * Format data object for console display
     */
    formatDataForConsole(data) {
        const lines = [];
        
        for (const [key, value] of Object.entries(data)) {
            let formattedValue;
            
            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    formattedValue = `[${value.length} items]`;
                } else {
                    formattedValue = JSON.stringify(value, null, 2);
                }
            } else {
                formattedValue = String(value);
            }
            
            lines.push(`  ${chalk.cyan(key)}: ${formattedValue}`);
        }
        
        return lines.join('\n');
    }
    
    /**
     * Log to file
     */
    async logToFile(logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            const logFile = path.join(
                this.options.logDirectory, 
                `app-${new Date().toISOString().split('T')[0]}.log`
            );
            
            await fs.appendFile(logFile, logLine);
            
        } catch (error) {
            // Don't throw from logging - just output to console
            console.error('Failed to write to log file:', error.message);
        }
    }
    
    /**
     * Log system status and diagnostics
     */
    logSystemStatus() {
        const status = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cwd: process.cwd(),
            pid: process.pid,
            env: {
                NODE_ENV: process.env.NODE_ENV,
                LOG_LEVEL: process.env.LOG_LEVEL,
                hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                hasDatabase: !!process.env.DATABASE_PATH
            }
        };
        
        this.info('System Status Check', status);
        return status;
    }
    
    /**
     * Log component initialization
     */
    logComponentInit(componentName, config = {}) {
        this.info(`Component Initialized: ${componentName}`, {
            component: componentName,
            config: config,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Log component error with context
     */
    logComponentError(componentName, error, context = {}) {
        this.error(`Component Error: ${componentName}`, {
            component: componentName,
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            },
            context: context,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Log API call details
     */
    logAPICall(method, url, status, duration, data = {}) {
        const logData = {
            method,
            url,
            status,
            duration,
            timestamp: new Date().toISOString(),
            ...data
        };
        
        if (status >= 400) {
            this.error(`API Call Failed: ${method} ${url}`, logData);
        } else {
            this.info(`API Call: ${method} ${url}`, logData);
        }
    }
    
    /**
     * Log database operations
     */
    logDatabaseOperation(operation, table, success, duration, data = {}) {
        const logData = {
            operation,
            table,
            success,
            duration,
            timestamp: new Date().toISOString(),
            ...data
        };
        
        if (success) {
            this.debug(`Database ${operation}: ${table}`, logData);
        } else {
            this.error(`Database ${operation} Failed: ${table}`, logData);
        }
    }
    
    /**
     * Log browser automation steps
     */
    logBrowserAction(action, selector, success, data = {}) {
        const logData = {
            action,
            selector,
            success,
            timestamp: new Date().toISOString(),
            ...data
        };
        
        if (success) {
            this.debug(`Browser Action: ${action}`, logData);
        } else {
            this.warn(`Browser Action Failed: ${action}`, logData);
        }
    }
    
    /**
     * Clean up old log files
     */
    async cleanupOldLogs() {
        try {
            const files = await fs.readdir(this.options.logDirectory);
            const logFiles = files
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.options.logDirectory, file),
                    time: fs.stat(path.join(this.options.logDirectory, file)).then(stats => stats.mtime)
                }));
            
            // Sort by modification time (newest first)
            const sortedFiles = await Promise.all(
                logFiles.map(async file => ({
                    ...file,
                    time: await file.time
                }))
            );
            
            sortedFiles.sort((a, b) => b.time - a.time);
            
            // Remove excess files
            if (sortedFiles.length > this.options.maxLogFiles) {
                const filesToDelete = sortedFiles.slice(this.options.maxLogFiles);
                
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                    this.debug(`Cleaned up old log file: ${file.name}`);
                }
            }
            
        } catch (error) {
            console.error('Failed to cleanup old logs:', error.message);
        }
    }
    
    /**
     * Get logger statistics
     */
    getStats() {
        return {
            sessionId: this.sessionId,
            currentLevel: this.options.logLevel,
            isInitialized: this.isInitialized,
            options: this.options,
            uptime: Date.now() - parseInt(this.sessionId.split('_')[1])
        };
    }
}

// Create singleton instance
let logger = null;

/**
 * Get or create logger instance
 */
function getLogger(options = {}) {
    if (!logger) {
        logger = new EnhancedLogger(options);
    }
    return logger;
}

module.exports = {
    EnhancedLogger,
    getLogger
};