/**
 * Fixed Registration Logger - Copy from working implementation
 * Working version with corrected ML logging
 */

const sqlite3 = require('sqlite3').verbose();

class FixedRegistrationLogger {
    constructor(dbPath = './poll-automation.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.isInitialized = true;
                    resolve();
                }
            });
        });
    }

    // FIXED: ML Registration Attempt Logging
    async logRegistrationAttemptML(attemptData) {
        const query = `
            INSERT INTO system_events (
                session_id, event_type, event_data, severity, 
                source_component, event_message
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const eventData = {
            // Core data
            siteUrl: attemptData.siteUrl,
            siteName: attemptData.siteName,
            success: attemptData.success,
            stepsCompleted: attemptData.stepsCompleted,
            timeSpent: attemptData.timeSpent,
            failureReason: attemptData.failureReason,
            
            // ML Features for learning
            difficulty: attemptData.difficulty,
            formStructure: attemptData.formStructure,
            userAgentUsed: attemptData.userAgentUsed,
            viewportUsed: attemptData.viewportUsed,
            timingPattern: attemptData.timingPattern,
            emailServiceUsed: attemptData.emailServiceUsed,
            
            // Success predictors
            formFieldCount: attemptData.formFieldCount,
            hasHoneypots: attemptData.hasHoneypots,
            hasCaptcha: attemptData.hasCaptcha,
            hasCloudflare: attemptData.hasCloudflare,
            pageLoadTime: attemptData.pageLoadTime,
            
            // Behavioral metrics
            mouseMovements: attemptData.mouseMovements,
            keystrokes: attemptData.keystrokes,
            scrollEvents: attemptData.scrollEvents,
            focusEvents: attemptData.focusEvents
        };

        const values = [
            attemptData.sessionId || null,
            'registration_attempt',
            JSON.stringify(eventData),
            attemptData.success ? 'info' : 'warning',
            'training_system',
            `Registration ${attemptData.success ? 'succeeded' : 'failed'} on ${attemptData.siteName || attemptData.siteUrl}`
        ];

        await this.runQuery(query, values);
        console.log(`📝 ML Registration logged: ${attemptData.siteUrl} - ${attemptData.success ? 'SUCCESS' : 'FAILED'}`);
    }

    // FIXED: ML Survey Completion Logging
    async logSurveyCompletionML(surveyData) {
        const query = `
            INSERT INTO system_events (
                session_id, event_type, event_data, severity, 
                source_component, event_message
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const eventData = {
            // Core survey data
            siteUrl: surveyData.siteUrl,
            siteName: surveyData.siteName,
            surveyUrl: surveyData.surveyUrl,
            success: surveyData.success,
            questionsAnswered: surveyData.questionsAnswered,
            totalQuestions: surveyData.totalQuestions,
            timeSpent: surveyData.timeSpent,
            completionRate: surveyData.completionRate,
            
            // ML Features
            questionTypes: surveyData.questionTypes,
            difficultyLevel: surveyData.difficultyLevel,
            surveyLength: surveyData.surveyLength,
            hasLogicBranching: surveyData.hasLogicBranching,
            hasValidation: surveyData.hasValidation,
            hasProgressBar: surveyData.hasProgressBar,
            
            // Technical details
            userAgentUsed: surveyData.userAgentUsed,
            viewportUsed: surveyData.viewportUsed,
            rotationPattern: surveyData.rotationPattern,
            
            // Error analysis
            failureReason: surveyData.failureReason,
            errorStep: surveyData.errorStep,
            lastQuestionType: surveyData.lastQuestionType
        };

        const values = [
            surveyData.sessionId || null,
            'survey_completion',
            JSON.stringify(eventData),
            surveyData.success ? 'info' : 'warning',
            'survey_filler',
            `Survey ${surveyData.success ? 'completed' : 'failed'} on ${surveyData.siteName}`
        ];

        await this.runQuery(query, values);
        console.log(`📋 ML Survey logged: ${surveyData.surveyUrl} - ${surveyData.success ? 'COMPLETED' : 'FAILED'}`);
    }

    // Utility methods
    runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    allQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) console.error('Database close error:', err.message);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = FixedRegistrationLogger;