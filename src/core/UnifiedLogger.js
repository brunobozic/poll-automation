/**
 * Unified Logging and Error Handling System
 * Consolidates all logging across the application with structured error handling
 */

const fs = require('fs').promises;
const path = require('path');

class UnifiedLogger {
    constructor(config = {}) {
        this.config = {
            level: config.level || 'info',
            console: config.console !== false,
            file: config.file !== false,
            path: config.path || './logs',
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
            maxFiles: config.maxFiles || 5,
            format: config.format || 'json',
            ...config
        };
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        this.currentLevel = this.levels[this.config.level] || 2;
        this.logBuffer = [];
        this.errorBuffer = [];
        this.initialized = false;
        
        // Error tracking
        this.errorCounts = new Map();
        this.errorPatterns = new Map();
        this.lastErrors = [];
        
        // Performance tracking
        this.performanceMetrics = {
            operationsLogged: 0,
            errorsLogged: 0,
            warningsLogged: 0,
            startTime: Date.now()
        };
    }
    
    /**
     * Initialize logger
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Create logs directory
            if (this.config.file) {
                await fs.mkdir(this.config.path, { recursive: true });
            }
            
            // Setup global error handlers
            this.setupGlobalErrorHandlers();
            
            this.initialized = true;
            this.info('UnifiedLogger initialized', { config: this.config });
            
        } catch (error) {
            console.error('Failed to initialize UnifiedLogger:', error.message);
            throw error;
        }
    }
    
    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.error('Unhandled Promise Rejection', {
                reason: reason?.message || reason,
                stack: reason?.stack,
                promise: promise.toString()
            });
        });
        
        // Uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.error('Uncaught Exception', {
                message: error.message,
                stack: error.stack,
                code: error.code
            });
            
            // Give logger time to write before exiting
            setTimeout(() => process.exit(1), 1000);
        });
        
        // Memory warnings
        process.on('warning', (warning) => {
            this.warn('Process Warning', {
                name: warning.name,
                message: warning.message,
                stack: warning.stack
            });
        });
    }
    
    /**
     * Log error with structured data
     */
    error(message, data = {}, error = null) {
        const logData = this.createLogEntry('error', message, data, error);
        this.writeLog(logData);
        
        // Track error patterns
        this.trackError(logData);
        
        this.performanceMetrics.errorsLogged++;
        return logData.id;
    }
    
    /**
     * Log warning
     */
    warn(message, data = {}) {
        if (this.currentLevel < 1) return;
        
        const logData = this.createLogEntry('warn', message, data);
        this.writeLog(logData);
        
        this.performanceMetrics.warningsLogged++;
        return logData.id;
    }
    
    /**
     * Log info message
     */
    info(message, data = {}) {
        if (this.currentLevel < 2) return;
        
        const logData = this.createLogEntry('info', message, data);
        this.writeLog(logData);
        
        this.performanceMetrics.operationsLogged++;
        return logData.id;
    }
    
    /**
     * Log debug message
     */
    debug(message, data = {}) {
        if (this.currentLevel < 3) return;
        
        const logData = this.createLogEntry('debug', message, data);
        this.writeLog(logData);
        
        return logData.id;
    }
    
    /**
     * Log trace message
     */
    trace(message, data = {}) {
        if (this.currentLevel < 4) return;
        
        const logData = this.createLogEntry('trace', message, data);
        this.writeLog(logData);
        
        return logData.id;
    }
    
    /**
     * Create structured log entry
     */
    createLogEntry(level, message, data = {}, error = null) {
        const timestamp = new Date().toISOString();
        const id = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        
        const logEntry = {
            id,
            timestamp,
            level,
            message,
            data: { ...data },
            process: {
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            }
        };
        
        // Add error details if provided
        if (error) {
            logEntry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code || null
            };
        }
        
        // Add stack trace for errors
        if (level === 'error' && !error) {
            const stack = new Error().stack;
            logEntry.stack = stack.split('\\n').slice(2); // Remove Error() and this function
        }
        
        return logEntry;
    }
    
    /**
     * Write log to outputs
     */
    writeLog(logData) {
        // Console output
        if (this.config.console) {
            this.writeConsole(logData);
        }
        
        // File output
        if (this.config.file) {
            this.writeFile(logData);
        }
        
        // Buffer for retrieval
        this.logBuffer.push(logData);
        if (this.logBuffer.length > 1000) {
            this.logBuffer = this.logBuffer.slice(-500); // Keep last 500
        }
    }
    
    /**
     * Write to console with colors
     */
    writeConsole(logData) {
        const colors = {
            error: '\\x1b[31m', // Red
            warn: '\\x1b[33m',  // Yellow
            info: '\\x1b[36m',  // Cyan
            debug: '\\x1b[35m', // Magenta
            trace: '\\x1b[37m'  // White
        };
        
        const reset = '\\x1b[0m';
        const color = colors[logData.level] || '';
        
        let output;
        if (this.config.format === 'json') {
            output = JSON.stringify(logData, null, 2);
        } else {
            output = `[${logData.timestamp}] ${logData.level.toUpperCase()}: ${logData.message}`;
            if (Object.keys(logData.data).length > 0) {
                output += ` ${JSON.stringify(logData.data)}`;
            }
        }
        
        console.log(`${color}${output}${reset}`);
    }
    
    /**
     * Write to file
     */
    async writeFile(logData) {
        try {
            const filename = `${logData.level}-${new Date().toISOString().split('T')[0]}.log`;
            const filepath = path.join(this.config.path, filename);
            
            let output;
            if (this.config.format === 'json') {
                output = JSON.stringify(logData) + '\\n';
            } else {
                output = `[${logData.timestamp}] ${logData.level.toUpperCase()}: ${logData.message}`;
                if (Object.keys(logData.data).length > 0) {
                    output += ` ${JSON.stringify(logData.data)}`;
                }
                output += '\\n';
            }
            
            await fs.appendFile(filepath, output);
            
            // Check file size and rotate if needed
            await this.rotateLogFile(filepath);
            
        } catch (error) {
            console.error('Failed to write log file:', error.message);
        }
    }
    
    /**
     * Rotate log file if too large
     */
    async rotateLogFile(filepath) {
        try {
            const stats = await fs.stat(filepath);
            if (stats.size > this.config.maxFileSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedPath = `${filepath}.${timestamp}`;
                await fs.rename(filepath, rotatedPath);
                
                // Clean up old rotated files
                await this.cleanupOldLogs();
            }
        } catch (error) {
            // File might not exist yet, that's ok
        }
    }
    
    /**
     * Clean up old log files
     */
    async cleanupOldLogs() {
        try {
            const files = await fs.readdir(this.config.path);
            const logFiles = files
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.path, file),
                    mtime: fs.stat(path.join(this.config.path, file)).then(s => s.mtime)
                }));
            
            const sortedFiles = await Promise.all(
                logFiles.map(async file => ({
                    ...file,
                    mtime: await file.mtime
                }))
            );
            
            sortedFiles.sort((a, b) => b.mtime - a.mtime);
            
            // Remove excess files
            if (sortedFiles.length > this.config.maxFiles) {
                const filesToDelete = sortedFiles.slice(this.config.maxFiles);
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old logs:', error.message);
        }
    }
    
    /**
     * Track error patterns for analysis
     */
    trackError(logData) {
        if (logData.level !== 'error') return;
        
        // Track error frequency
        const errorKey = logData.message;
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);
        
        // Track error patterns
        if (logData.error) {
            const patternKey = `${logData.error.name}:${logData.error.code}`;
            const patternCount = this.errorPatterns.get(patternKey) || 0;
            this.errorPatterns.set(patternKey, patternCount + 1);
        }
        
        // Keep recent errors
        this.lastErrors.push(logData);
        if (this.lastErrors.length > 50) {
            this.lastErrors = this.lastErrors.slice(-25);
        }
        
        // Store in error buffer
        this.errorBuffer.push(logData);
        if (this.errorBuffer.length > 100) {
            this.errorBuffer = this.errorBuffer.slice(-50);
        }
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        const topErrors = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([error, count]) => ({ error, count }));
        
        const topPatterns = Array.from(this.errorPatterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([pattern, count]) => ({ pattern, count }));
        
        return {
            totalErrors: this.performanceMetrics.errorsLogged,
            totalWarnings: this.performanceMetrics.warningsLogged,
            totalOperations: this.performanceMetrics.operationsLogged,
            uptime: Date.now() - this.performanceMetrics.startTime,
            topErrors,
            topPatterns,
            recentErrors: this.lastErrors.slice(-5)
        };
    }
    
    /**
     * Get recent logs
     */
    getRecentLogs(count = 50, level = null) {
        let logs = this.logBuffer;
        
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        
        return logs.slice(-count);
    }
    
    /**
     * Search logs
     */
    searchLogs(query, options = {}) {
        const {
            level = null,
            startTime = null,
            endTime = null,
            limit = 100
        } = options;
        
        let results = this.logBuffer;
        
        // Filter by level
        if (level) {
            results = results.filter(log => log.level === level);
        }
        
        // Filter by time range
        if (startTime) {
            results = results.filter(log => new Date(log.timestamp) >= new Date(startTime));
        }
        
        if (endTime) {
            results = results.filter(log => new Date(log.timestamp) <= new Date(endTime));
        }
        
        // Search in message and data
        if (query) {
            const queryLower = query.toLowerCase();
            results = results.filter(log => {
                return log.message.toLowerCase().includes(queryLower) ||
                       JSON.stringify(log.data).toLowerCase().includes(queryLower);
            });
        }
        
        return results.slice(-limit);
    }
    
    /**
     * Create child logger with context
     */
    child(context = {}) {
        return new ChildLogger(this, context);
    }
    
    /**
     * Flush all pending logs
     */
    async flush() {
        // Implementation would flush any buffered logs
        return Promise.resolve();
    }
    
    /**
     * Shutdown logger
     */
    async shutdown() {
        await this.flush();
        
        this.info('UnifiedLogger shutting down', {
            stats: this.getErrorStats()
        });
        
        // Remove global handlers
        process.removeAllListeners('unhandledRejection');
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('warning');
        
        console.log('✅ UnifiedLogger shutdown complete');
    }
}

/**
 * Child logger with inherited context
 */
class ChildLogger {
    constructor(parent, context) {
        this.parent = parent;
        this.context = context;
    }
    
    error(message, data = {}, error = null) {
        return this.parent.error(message, { ...this.context, ...data }, error);
    }
    
    warn(message, data = {}) {
        return this.parent.warn(message, { ...this.context, ...data });
    }
    
    info(message, data = {}) {
        return this.parent.info(message, { ...this.context, ...data });
    }
    
    debug(message, data = {}) {
        return this.parent.debug(message, { ...this.context, ...data });
    }
    
    trace(message, data = {}) {
        return this.parent.trace(message, { ...this.context, ...data });
    }
}

module.exports = UnifiedLogger;