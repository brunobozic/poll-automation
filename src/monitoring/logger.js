/**
 * Comprehensive Logging and Monitoring System
 * Tracks all automation activities, performance metrics, and system health
 */

const fs = require('fs').promises;
const path = require('path');

class AutomationLogger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'info';
        this.logDir = options.logDir || './logs';
        this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = options.maxLogFiles || 10;
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
        
        // Log levels
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        // Session tracking
        this.sessionId = this.generateSessionId();
        this.sessionMetrics = {
            startTime: Date.now(),
            events: 0,
            errors: 0,
            warnings: 0,
            aiCalls: 0,
            totalCost: 0
        };
        
        this.initializeLogging();
    }

    /**
     * Initialize logging system
     */
    async initializeLogging() {
        try {
            if (this.enableFile) {
                await fs.mkdir(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to initialize logging:', error);
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Main logging method
     */
    async log(level, message, metadata = {}) {
        if (this.levels[level] > this.levels[this.logLevel]) {
            return; // Skip if below log level
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            level: level.toUpperCase(),
            message,
            metadata,
            pid: process.pid
        };

        // Update session metrics
        this.updateSessionMetrics(level, metadata);

        // Output to console
        if (this.enableConsole) {
            this.logToConsole(logEntry);
        }

        // Output to file
        if (this.enableFile) {
            await this.logToFile(logEntry);
        }
    }

    /**
     * Convenience methods for different log levels
     */
    async error(message, metadata = {}) {
        await this.log('error', message, metadata);
    }

    async warn(message, metadata = {}) {
        await this.log('warn', message, metadata);
    }

    async info(message, metadata = {}) {
        await this.log('info', message, metadata);
    }

    async debug(message, metadata = {}) {
        await this.log('debug', message, metadata);
    }

    async trace(message, metadata = {}) {
        await this.log('trace', message, metadata);
    }

    /**
     * Specialized logging methods for automation events
     */
    async logSessionStart(url, options = {}) {
        await this.info('Automation session started', {
            event: 'session_start',
            url,
            options,
            sessionId: this.sessionId
        });
    }

    async logSessionEnd(result, metrics = {}) {
        const duration = Date.now() - this.sessionMetrics.startTime;
        
        await this.info('Automation session completed', {
            event: 'session_end',
            result,
            metrics: {
                ...this.sessionMetrics,
                duration
            }
        });
    }

    async logStepStart(step, action, context = {}) {
        await this.debug('Automation step started', {
            event: 'step_start',
            step,
            action,
            context
        });
    }

    async logStepEnd(step, action, result, duration, cost = 0) {
        const level = result.success ? 'debug' : 'warn';
        
        await this.log(level, `Step ${step} ${result.success ? 'completed' : 'failed'}`, {
            event: 'step_end',
            step,
            action,
            result,
            duration,
            cost
        });
    }

    async logAICall(model, prompt, response, cost, duration) {
        await this.debug('AI API call completed', {
            event: 'ai_call',
            model,
            promptLength: prompt.length,
            responseLength: response?.length || 0,
            cost,
            duration,
            timestamp: Date.now()
        });

        this.sessionMetrics.aiCalls++;
        this.sessionMetrics.totalCost += cost;
    }

    async logError(error, context = {}) {
        await this.error('Automation error occurred', {
            event: 'error',
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            },
            context
        });
    }

    async logPerformanceMetric(metric, value, unit = '', context = {}) {
        await this.debug('Performance metric recorded', {
            event: 'performance_metric',
            metric,
            value,
            unit,
            context
        });
    }

    async logSiteAnalysis(url, analysis, cost) {
        await this.info('Site analysis completed', {
            event: 'site_analysis',
            url,
            analysis: {
                siteType: analysis.siteType,
                complexity: analysis.complexity,
                framework: analysis.framework,
                confidence: analysis.confidence
            },
            cost
        });
    }

    async logQuestionDetection(questionsFound, cost) {
        await this.info('Questions detected', {
            event: 'question_detection',
            questionsFound: questionsFound.length,
            questions: questionsFound.map(q => ({
                type: q.type,
                text: q.text.substring(0, 100),
                required: q.required
            })),
            cost
        });
    }

    async logAnswerGeneration(question, answer, cost) {
        await this.debug('Answer generated', {
            event: 'answer_generation',
            question: {
                text: question.text.substring(0, 100),
                type: question.type
            },
            answer: {
                action: answer.action,
                value: typeof answer.value === 'string' ? 
                    answer.value.substring(0, 100) : answer.value,
                confidence: answer.confidence
            },
            cost
        });
    }

    async logRecoveryAttempt(error, strategy, result) {
        await this.warn('Error recovery attempted', {
            event: 'recovery_attempt',
            error: error.message,
            strategy,
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Log to console with colors
     */
    logToConsole(entry) {
        const colors = {
            ERROR: '\x1b[31m',   // Red
            WARN: '\x1b[33m',    // Yellow
            INFO: '\x1b[36m',    // Cyan
            DEBUG: '\x1b[32m',   // Green
            TRACE: '\x1b[37m'    // White
        };

        const reset = '\x1b[0m';
        const color = colors[entry.level] || '';
        
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const message = `${color}[${timestamp}] ${entry.level}${reset} ${entry.message}`;
        
        if (entry.level === 'ERROR') {
            console.error(message);
            if (entry.metadata.error?.stack) {
                console.error(entry.metadata.error.stack);
            }
        } else {
            console.log(message);
        }

        // Show metadata for debug/trace levels
        if (this.logLevel === 'debug' || this.logLevel === 'trace') {
            if (Object.keys(entry.metadata).length > 0) {
                console.log('  Metadata:', JSON.stringify(entry.metadata, null, 2));
            }
        }
    }

    /**
     * Log to file
     */
    async logToFile(entry) {
        try {
            const logFileName = `automation_${new Date().toISOString().split('T')[0]}.log`;
            const logFilePath = path.join(this.logDir, logFileName);
            
            const logLine = JSON.stringify(entry) + '\n';
            
            await fs.appendFile(logFilePath, logLine);
            
            // Check file size and rotate if needed
            await this.rotateLogIfNeeded(logFilePath);
            
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Rotate log files if they exceed max size
     */
    async rotateLogIfNeeded(logFilePath) {
        try {
            const stats = await fs.stat(logFilePath);
            
            if (stats.size > this.maxLogSize) {
                const timestamp = Date.now();
                const rotatedPath = logFilePath.replace('.log', `_${timestamp}.log`);
                
                await fs.rename(logFilePath, rotatedPath);
                
                // Clean up old log files
                await this.cleanupOldLogs();
            }
        } catch (error) {
            // Ignore rotation errors
        }
    }

    /**
     * Clean up old log files
     */
    async cleanupOldLogs() {
        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files
                .filter(f => f.endsWith('.log'))
                .map(f => ({
                    name: f,
                    path: path.join(this.logDir, f),
                    time: fs.stat(path.join(this.logDir, f)).then(s => s.mtime)
                }));
            
            const fileStats = await Promise.all(
                logFiles.map(async f => ({
                    ...f,
                    time: await f.time
                }))
            );
            
            // Sort by modification time (newest first)
            fileStats.sort((a, b) => b.time - a.time);
            
            // Remove files beyond maxLogFiles
            if (fileStats.length > this.maxLogFiles) {
                const filesToDelete = fileStats.slice(this.maxLogFiles);
                
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                }
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    /**
     * Update session metrics
     */
    updateSessionMetrics(level, metadata) {
        this.sessionMetrics.events++;
        
        if (level === 'error') {
            this.sessionMetrics.errors++;
        } else if (level === 'warn') {
            this.sessionMetrics.warnings++;
        }
        
        if (metadata.cost) {
            this.sessionMetrics.totalCost += metadata.cost;
        }
    }

    /**
     * Get session metrics
     */
    getSessionMetrics() {
        return {
            ...this.sessionMetrics,
            duration: Date.now() - this.sessionMetrics.startTime,
            sessionId: this.sessionId
        };
    }

    /**
     * Get system health metrics
     */
    async getSystemHealth() {
        const metrics = this.getSessionMetrics();
        
        return {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            metrics,
            health: {
                status: metrics.errors > 10 ? 'unhealthy' : 'healthy',
                errorRate: metrics.events > 0 ? metrics.errors / metrics.events : 0,
                averageCostPerEvent: metrics.events > 0 ? metrics.totalCost / metrics.events : 0
            }
        };
    }

    /**
     * Export logs for analysis
     */
    async exportLogs(startDate, endDate) {
        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files.filter(f => f.endsWith('.log'));
            
            const logs = [];
            
            for (const file of logFiles) {
                const filePath = path.join(this.logDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.trim().split('\n').filter(line => line);
                
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        const entryDate = new Date(entry.timestamp);
                        
                        if ((!startDate || entryDate >= startDate) && 
                            (!endDate || entryDate <= endDate)) {
                            logs.push(entry);
                        }
                    } catch (parseError) {
                        // Skip invalid JSON lines
                    }
                }
            }
            
            return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
        } catch (error) {
            throw new Error(`Failed to export logs: ${error.message}`);
        }
    }

    /**
     * Generate performance report
     */
    async generatePerformanceReport(timeRange = '24h') {
        const endDate = new Date();
        const startDate = new Date();
        
        // Calculate start date based on time range
        switch (timeRange) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                break;
            case '24h':
                startDate.setDate(startDate.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
        }
        
        const logs = await this.exportLogs(startDate, endDate);
        
        const report = {
            timeRange,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalEvents: logs.length,
            sessions: {},
            errors: [],
            performance: {
                averageSessionDuration: 0,
                averageCostPerSession: 0,
                averageQuestionsPerSession: 0,
                successRate: 0
            }
        };
        
        // Analyze logs
        const sessionMap = new Map();
        
        logs.forEach(entry => {
            const sessionId = entry.sessionId;
            
            if (!sessionMap.has(sessionId)) {
                sessionMap.set(sessionId, {
                    id: sessionId,
                    events: [],
                    errors: 0,
                    cost: 0,
                    duration: 0,
                    questionsAnswered: 0,
                    success: false
                });
            }
            
            const session = sessionMap.get(sessionId);
            session.events.push(entry);
            
            if (entry.level === 'ERROR') {
                session.errors++;
                report.errors.push(entry);
            }
            
            if (entry.metadata.cost) {
                session.cost += entry.metadata.cost;
            }
            
            if (entry.metadata.event === 'session_end') {
                session.duration = entry.metadata.metrics?.duration || 0;
                session.questionsAnswered = entry.metadata.metrics?.questionsAnswered || 0;
                session.success = entry.result?.success || false;
            }
        });
        
        report.sessions = Object.fromEntries(sessionMap);
        
        // Calculate performance metrics
        const completedSessions = Array.from(sessionMap.values()).filter(s => s.duration > 0);
        
        if (completedSessions.length > 0) {
            report.performance.averageSessionDuration = 
                completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length;
                
            report.performance.averageCostPerSession = 
                completedSessions.reduce((sum, s) => sum + s.cost, 0) / completedSessions.length;
                
            report.performance.averageQuestionsPerSession = 
                completedSessions.reduce((sum, s) => sum + s.questionsAnswered, 0) / completedSessions.length;
                
            report.performance.successRate = 
                completedSessions.filter(s => s.success).length / completedSessions.length;
        }
        
        return report;
    }

    /**
     * Set log level
     */
    setLogLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
        } else {
            throw new Error(`Invalid log level: ${level}`);
        }
    }

    /**
     * Create child logger with additional context
     */
    createChildLogger(context = {}) {
        const childLogger = Object.create(this);
        childLogger.defaultContext = { ...this.defaultContext, ...context };
        return childLogger;
    }

    /**
     * Flush all pending log writes
     */
    async flush() {
        // In a real implementation, you might have buffered writes to flush
        // For now, this is a no-op since we write immediately
        return Promise.resolve();
    }
}

module.exports = AutomationLogger;