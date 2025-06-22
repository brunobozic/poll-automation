/**
 * Registration Logger
 * Comprehensive SQLite logging system for email creation and survey registration
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class RegistrationLogger {
    constructor(dbPath = './data/registrations.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🗄️ Initializing Registration Logger...');
        
        // Ensure data directory exists
        const dbDir = path.dirname(this.dbPath);
        await fs.mkdir(dbDir, { recursive: true });

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Database connected successfully');
                    this.createTables().then(() => {
                        this.isInitialized = true;
                        resolve();
                    }).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            // Email accounts table
            `CREATE TABLE IF NOT EXISTS email_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                service TEXT NOT NULL,
                password TEXT,
                session_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                verified_at DATETIME,
                status TEXT DEFAULT 'active',
                verification_attempts INTEGER DEFAULT 0,
                last_checked DATETIME,
                metadata TEXT,
                notes TEXT
            )`,

            // Registration attempts table
            `CREATE TABLE IF NOT EXISTS registration_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                email_id INTEGER,
                target_site TEXT NOT NULL,
                target_url TEXT NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                status TEXT DEFAULT 'started',
                current_step TEXT,
                total_steps INTEGER,
                success BOOLEAN DEFAULT 0,
                error_message TEXT,
                user_agent TEXT,
                ip_address TEXT,
                FOREIGN KEY (email_id) REFERENCES email_accounts (id)
            )`,

            // Registration steps table
            `CREATE TABLE IF NOT EXISTS registration_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER NOT NULL,
                step_number INTEGER NOT NULL,
                step_name TEXT NOT NULL,
                step_type TEXT NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                duration_ms INTEGER,
                status TEXT DEFAULT 'started',
                input_data TEXT,
                output_data TEXT,
                ai_analysis TEXT,
                error_details TEXT,
                screenshot_path TEXT,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`,

            // Form interactions table
            `CREATE TABLE IF NOT EXISTS form_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                step_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                field_type TEXT NOT NULL,
                field_selector TEXT,
                input_value TEXT,
                ai_generated BOOLEAN DEFAULT 0,
                interaction_type TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT 1,
                error_message TEXT,
                FOREIGN KEY (step_id) REFERENCES registration_steps (id)
            )`,

            // AI interactions table
            `CREATE TABLE IF NOT EXISTS ai_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER,
                step_id INTEGER,
                interaction_type TEXT DEFAULT 'form_analysis',
                prompt TEXT NOT NULL,
                prompt_length INTEGER DEFAULT 0,
                response TEXT,
                response_length INTEGER DEFAULT 0,
                model_used TEXT NOT NULL,
                tokens_used INTEGER,
                input_tokens INTEGER,
                output_tokens INTEGER,
                cost_usd DECIMAL(10, 6),
                processing_time_ms INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT 1,
                error_message TEXT,
                confidence_score REAL,
                response_quality_score REAL,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
                FOREIGN KEY (step_id) REFERENCES registration_steps (id)
            )`,

            // System events table
            `CREATE TABLE IF NOT EXISTS system_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                event_type TEXT NOT NULL,
                event_data TEXT,
                severity TEXT DEFAULT 'info',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                source_component TEXT,
                message TEXT
            )`,

            // Performance metrics table
            `CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metric_unit TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`,

            // Detection events table
            `CREATE TABLE IF NOT EXISTS detection_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER,
                detection_type TEXT NOT NULL,
                severity_level INTEGER NOT NULL,
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                details TEXT,
                countermeasure_applied TEXT,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`,

            // Registration questions and answers table
            `CREATE TABLE IF NOT EXISTS registration_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                question_type TEXT NOT NULL,
                field_name TEXT NOT NULL,
                field_selector TEXT,
                answer_provided TEXT NOT NULL,
                ai_generated BOOLEAN DEFAULT 1,
                ai_reasoning TEXT,
                demographic_category TEXT,
                yield_optimization_factor REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`,

            // User demographic profiles table
            `CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER NOT NULL,
                email_id INTEGER NOT NULL,
                profile_name TEXT NOT NULL,
                age INTEGER,
                gender TEXT,
                income_bracket TEXT,
                education_level TEXT,
                occupation TEXT,
                location_city TEXT,
                location_state TEXT,
                location_country TEXT,
                marital_status TEXT,
                household_size INTEGER,
                interests TEXT,
                ai_optimization_score REAL,
                yield_prediction REAL,
                demographic_balance_score REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
                FOREIGN KEY (email_id) REFERENCES email_accounts (id)
            )`,

            // Survey sites intelligence table
            `CREATE TABLE IF NOT EXISTS survey_sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_name TEXT NOT NULL UNIQUE,
                base_url TEXT NOT NULL,
                registration_url TEXT,
                site_category TEXT,
                first_visited DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_visited DATETIME DEFAULT CURRENT_TIMESTAMP,
                visit_count INTEGER DEFAULT 1,
                successful_registrations INTEGER DEFAULT 0,
                failed_registrations INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 0,
                average_complexity REAL DEFAULT 0,
                yield_potential REAL DEFAULT 0,
                accessibility_score REAL DEFAULT 0,
                notes TEXT,
                status TEXT DEFAULT 'active'
            )`,

            // Site defensive measures table
            `CREATE TABLE IF NOT EXISTS site_defenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                registration_id INTEGER,
                defense_type TEXT NOT NULL,
                defense_subtype TEXT,
                severity_level INTEGER NOT NULL,
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                bypass_attempted BOOLEAN DEFAULT 0,
                bypass_successful BOOLEAN DEFAULT 0,
                bypass_method TEXT,
                detection_details TEXT,
                screenshot_path TEXT,
                FOREIGN KEY (site_id) REFERENCES survey_sites (id),
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`,

            // Site questions mapping table
            `CREATE TABLE IF NOT EXISTS site_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                question_type TEXT NOT NULL,
                field_name TEXT NOT NULL,
                demographic_category TEXT,
                is_required BOOLEAN DEFAULT 0,
                has_options BOOLEAN DEFAULT 0,
                question_options TEXT,
                frequency_seen INTEGER DEFAULT 1,
                first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                yield_importance REAL,
                FOREIGN KEY (site_id) REFERENCES survey_sites (id)
            )`,

            // Registration failures table
            `CREATE TABLE IF NOT EXISTS registration_failures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER,
                step_name TEXT NOT NULL,
                error_message TEXT,
                context TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`,

            // LLM insights table
            `CREATE TABLE IF NOT EXISTS llm_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                interaction_id INTEGER NOT NULL,
                insight_type TEXT NOT NULL,
                insight_data TEXT,
                analysis_version TEXT DEFAULT '1.0',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (interaction_id) REFERENCES ai_interactions (id)
            )`
        ];

        for (const tableSQL of tables) {
            await this.runQuery(tableSQL);
        }

        console.log('✅ Database tables created/verified');
    }

    /**
     * Log new email account creation
     */
    async logEmailAccount(emailData) {
        const query = `
            INSERT INTO email_accounts (
                email, service, password, session_id, verified_at, status, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            emailData.email,
            emailData.service,
            emailData.password,
            emailData.sessionId,
            emailData.verifiedAt || null,
            emailData.status || 'active',
            JSON.stringify(emailData.metadata || {})
        ];

        const result = await this.runQuery(query, values);
        const emailId = result.lastID;
        
        console.log(`📧 Email account logged: ${emailData.email} (ID: ${emailId})`);
        return emailId;
    }

    /**
     * Start registration attempt logging
     */
    async startRegistrationAttempt(registrationData) {
        const query = `
            INSERT INTO registration_attempts (
                session_id, email_id, target_site, target_url, current_step, 
                total_steps, user_agent, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            registrationData.sessionId,
            registrationData.emailId,
            registrationData.targetSite,
            registrationData.targetUrl,
            registrationData.currentStep || 'initialization',
            registrationData.totalSteps || 0,
            registrationData.userAgent || '',
            registrationData.ipAddress || ''
        ];

        const result = await this.runQuery(query, values);
        const registrationId = result.lastID;
        
        console.log(`🎯 Registration attempt started: ${registrationData.targetSite} (ID: ${registrationId})`);
        return registrationId;
    }

    /**
     * Update registration attempt
     */
    async updateRegistrationAttempt(registrationId, updates) {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }

        if (fields.length === 0) return;

        values.push(registrationId);
        const query = `UPDATE registration_attempts SET ${fields.join(', ')} WHERE id = ?`;
        
        await this.runQuery(query, values);
        console.log(`📝 Registration ${registrationId} updated: ${Object.keys(updates).join(', ')}`);
    }

    /**
     * Log registration step
     */
    async logRegistrationStep(stepData) {
        const query = `
            INSERT INTO registration_steps (
                registration_id, step_number, step_name, step_type, 
                completed_at, duration_ms, status, input_data, 
                output_data, ai_analysis, error_details, screenshot_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            stepData.registrationId,
            stepData.stepNumber,
            stepData.stepName,
            stepData.stepType,
            stepData.completedAt || null,
            stepData.durationMs || null,
            stepData.status || 'completed',
            JSON.stringify(stepData.inputData || {}),
            JSON.stringify(stepData.outputData || {}),
            stepData.aiAnalysis || null,
            stepData.errorDetails || null,
            stepData.screenshotPath || null
        ];

        const result = await this.runQuery(query, values);
        const stepId = result.lastID;
        
        console.log(`📝 Step logged: ${stepData.stepName} (ID: ${stepId})`);
        return stepId;
    }

    /**
     * Log form interaction
     */
    async logFormInteraction(interactionData) {
        const query = `
            INSERT INTO form_interactions (
                step_id, registration_id, field_name, field_type, field_selector, field_label,
                input_value, ai_generated, interaction_type, success, retry_count, 
                error_message, response_time_ms, validation_passed, honeypot_detected
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            interactionData.stepId,
            interactionData.registrationId,
            interactionData.fieldName,
            interactionData.fieldType,
            interactionData.fieldSelector,
            interactionData.fieldLabel || null,
            interactionData.inputValue,
            interactionData.aiGenerated ? 1 : 0,
            interactionData.interactionType,
            interactionData.success ? 1 : 0,
            interactionData.retryCount || 0,
            interactionData.errorMessage || null,
            interactionData.responseTimeMs || null,
            interactionData.validationPassed !== false ? 1 : 0,
            interactionData.honeypotDetected ? 1 : 0
        ];

        const result = await this.runQuery(query, values);
        console.log(`🖱️ Form interaction logged: ${interactionData.fieldName} = ${interactionData.inputValue}`);
        return result.lastID;
    }

    /**
     * Log AI interaction
     */
    async logAIInteraction(aiData) {
        const query = `
            INSERT INTO ai_interactions (
                registration_id, step_id, prompt, response, model_used,
                tokens_used, cost_usd, processing_time_ms, success, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            aiData.registrationId || null,
            aiData.stepId || null,
            aiData.prompt,
            aiData.response,
            aiData.modelUsed,
            aiData.tokensUsed || null,
            aiData.costUsd || null,
            aiData.processingTimeMs || null,
            aiData.success ? 1 : 0,
            aiData.errorMessage || null
        ];

        const result = await this.runQuery(query, values);
        console.log(`🤖 AI interaction logged: ${aiData.modelUsed} - ${aiData.prompt.substring(0, 50)}...`);
        return result.lastID;
    }

    /**
     * Log system event
     */
    async logSystemEvent(eventData) {
        const query = `
            INSERT INTO system_events (
                session_id, event_type, event_data, severity, 
                source_component, message
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [
            eventData.sessionId || null,
            eventData.eventType,
            JSON.stringify(eventData.eventData || {}),
            eventData.severity || 'info',
            eventData.sourceComponent || 'unknown',
            eventData.message
        ];

        await this.runQuery(query, values);
        console.log(`📋 System event: [${eventData.severity.toUpperCase()}] ${eventData.message}`);
    }

    /**
     * Log performance metric
     */
    async logPerformanceMetric(metricData) {
        const query = `
            INSERT INTO performance_metrics (
                registration_id, metric_name, metric_value, metric_unit
            ) VALUES (?, ?, ?, ?)
        `;

        const values = [
            metricData.registrationId,
            metricData.metricName,
            metricData.metricValue,
            metricData.metricUnit || ''
        ];

        await this.runQuery(query, values);
    }

    /**
     * Log detection event
     */
    async logDetectionEvent(detectionData) {
        const query = `
            INSERT INTO detection_events (
                registration_id, detection_type, severity_level, 
                details, countermeasure_applied
            ) VALUES (?, ?, ?, ?, ?)
        `;

        const values = [
            detectionData.registrationId,
            detectionData.detectionType,
            detectionData.severityLevel,
            JSON.stringify(detectionData.details || {}),
            detectionData.countermeasureApplied || null
        ];

        await this.runQuery(query, values);
        console.log(`🚨 Detection event: ${detectionData.detectionType} (Level: ${detectionData.severityLevel})`);
    }

    /**
     * Get registration statistics
     */
    async getRegistrationStats() {
        const queries = {
            totalAttempts: 'SELECT COUNT(*) as count FROM registration_attempts',
            successfulAttempts: 'SELECT COUNT(*) as count FROM registration_attempts WHERE success = 1',
            avgDuration: `
                SELECT AVG(JULIANDAY(completed_at) - JULIANDAY(started_at)) * 24 * 60 as avg_minutes 
                FROM registration_attempts 
                WHERE completed_at IS NOT NULL
            `,
            topSites: `
                SELECT target_site, COUNT(*) as attempts, 
                       SUM(success) as successes,
                       ROUND(AVG(CAST(success AS FLOAT)) * 100, 1) as success_rate
                FROM registration_attempts 
                GROUP BY target_site 
                ORDER BY attempts DESC 
                LIMIT 10
            `,
            recentAttempts: `
                SELECT ra.target_site, ra.status, ra.started_at, ea.email, ra.success
                FROM registration_attempts ra
                LEFT JOIN email_accounts ea ON ra.email_id = ea.id
                ORDER BY ra.started_at DESC
                LIMIT 20
            `
        };

        const stats = {};
        
        for (const [key, query] of Object.entries(queries)) {
            try {
                const result = await this.allQuery(query);
                stats[key] = result;
            } catch (error) {
                console.error(`Error getting ${key}:`, error.message);
                stats[key] = null;
            }
        }

        return stats;
    }

    /**
     * Get detailed registration log
     */
    async getRegistrationLog(registrationId) {
        const queries = {
            registration: 'SELECT * FROM registration_attempts WHERE id = ?',
            steps: 'SELECT * FROM registration_steps WHERE registration_id = ? ORDER BY step_number',
            interactions: `
                SELECT fi.*, rs.step_name 
                FROM form_interactions fi
                JOIN registration_steps rs ON fi.step_id = rs.id
                WHERE rs.registration_id = ?
                ORDER BY fi.timestamp
            `,
            aiInteractions: `
                SELECT * FROM ai_interactions 
                WHERE registration_id = ? 
                ORDER BY timestamp
            `,
            events: `
                SELECT de.* FROM detection_events de
                WHERE de.registration_id = ?
                ORDER BY de.detected_at
            `
        };

        const log = {};
        
        for (const [key, query] of Object.entries(queries)) {
            try {
                if (key === 'registration') {
                    log[key] = await this.getQuery(query, [registrationId]);
                } else {
                    log[key] = await this.allQuery(query, [registrationId]);
                }
            } catch (error) {
                console.error(`Error getting ${key}:`, error.message);
                log[key] = null;
            }
        }

        return log;
    }

    /**
     * Export data to JSON
     */
    async exportData(outputPath) {
        console.log('📤 Exporting registration data...');
        
        const data = {
            emailAccounts: await this.allQuery('SELECT * FROM email_accounts ORDER BY created_at DESC'),
            registrationAttempts: await this.allQuery('SELECT * FROM registration_attempts ORDER BY started_at DESC'),
            registrationSteps: await this.allQuery('SELECT * FROM registration_steps ORDER BY started_at DESC'),
            formInteractions: await this.allQuery('SELECT * FROM form_interactions ORDER BY timestamp DESC'),
            aiInteractions: await this.allQuery('SELECT * FROM ai_interactions ORDER BY timestamp DESC'),
            systemEvents: await this.allQuery('SELECT * FROM system_events ORDER BY timestamp DESC'),
            performanceMetrics: await this.allQuery('SELECT * FROM performance_metrics ORDER BY timestamp DESC'),
            detectionEvents: await this.allQuery('SELECT * FROM detection_events ORDER BY detected_at DESC'),
            exportedAt: new Date().toISOString()
        };

        await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
        console.log(`✅ Data exported to: ${outputPath}`);
        
        return data;
    }

    /**
     * Database utility methods
     */
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

    getQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
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

    /**
     * Log registration question and answer
     */
    async logRegistrationQuestion(questionData) {
        const query = `
            INSERT INTO registration_questions (
                registration_id, question_text, question_type, field_name, field_selector,
                answer_provided, ai_generated, ai_reasoning, demographic_category, yield_optimization_factor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            questionData.registrationId,
            questionData.questionText,
            questionData.questionType,
            questionData.fieldName,
            questionData.fieldSelector || null,
            questionData.answerProvided,
            questionData.aiGenerated ? 1 : 0,
            questionData.aiReasoning || null,
            questionData.demographicCategory || null,
            questionData.yieldOptimizationFactor || null
        ];

        const result = await this.runQuery(query, values);
        console.log(`📝 Question logged: ${questionData.fieldName} = ${questionData.answerProvided}`);
        return result.lastID;
    }

    /**
     * Log user demographic profile
     */
    async logUserProfile(profileData) {
        const query = `
            INSERT INTO user_profiles (
                registration_id, email_id, profile_name, age, gender, income_bracket,
                education_level, occupation, location_city, location_state, location_country,
                marital_status, household_size, interests, ai_optimization_score,
                yield_prediction, demographic_balance_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            profileData.registrationId,
            profileData.emailId,
            profileData.profileName,
            profileData.age || null,
            profileData.gender || null,
            profileData.incomeBracket || null,
            profileData.educationLevel || null,
            profileData.occupation || null,
            profileData.locationCity || null,
            profileData.locationState || null,
            profileData.locationCountry || null,
            profileData.maritalStatus || null,
            profileData.householdSize || null,
            JSON.stringify(profileData.interests || []),
            profileData.aiOptimizationScore || null,
            profileData.yieldPrediction || null,
            profileData.demographicBalanceScore || null
        ];

        const result = await this.runQuery(query, values);
        console.log(`👤 User profile logged: ${profileData.profileName} (Yield: ${profileData.yieldPrediction || 'N/A'})`);
        return result.lastID;
    }

    /**
     * Get all registration questions for a registration
     */
    async getRegistrationQuestions(registrationId) {
        const query = 'SELECT * FROM registration_questions WHERE registration_id = ? ORDER BY timestamp';
        return await this.allQuery(query, [registrationId]);
    }

    /**
     * Get user profile for a registration
     */
    async getUserProfile(registrationId) {
        const query = 'SELECT * FROM user_profiles WHERE registration_id = ?';
        return await this.getQuery(query, [registrationId]);
    }

    /**
     * Enhanced method to log email account with full access credentials
     */
    async logEnhancedEmailAccount(emailData) {
        const query = `
            INSERT INTO email_accounts (
                email, service, password, session_id, inbox_url, login_url,
                username_for_service, password_for_service, access_token,
                verified_at, status, metadata, max_usage_limit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            emailData.email,
            emailData.service,
            emailData.password,
            emailData.sessionId,
            emailData.inboxUrl || null,
            emailData.loginUrl || null,
            emailData.usernameForService || null,
            emailData.passwordForService || null,
            emailData.accessToken || null,
            emailData.verifiedAt || null,
            emailData.status || 'active',
            JSON.stringify(emailData.metadata || {}),
            emailData.maxUsageLimit || 10
        ];

        const result = await this.runQuery(query, values);
        const emailId = result.lastID;
        
        console.log(`📧 Enhanced email account logged: ${emailData.email} (ID: ${emailId})`);
        return emailId;
    }

    /**
     * Log site credentials when successfully registering/logging into a site
     */
    async logSiteCredentials(credentialsData) {
        const query = `
            INSERT OR REPLACE INTO site_credentials (
                site_id, email_id, username, password, login_url,
                last_login, login_successful, session_data, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            credentialsData.siteId,
            credentialsData.emailId,
            credentialsData.username,
            credentialsData.password,
            credentialsData.loginUrl,
            new Date().toISOString(),
            credentialsData.loginSuccessful ? 1 : 0,
            JSON.stringify(credentialsData.sessionData || {}),
            credentialsData.notes || null
        ];

        const result = await this.runQuery(query, values);
        console.log(`🔑 Site credentials logged: ${credentialsData.username} for site ${credentialsData.siteId}`);
        return result.lastID;
    }

    /**
     * Enhanced AI interaction logging with detailed insights
     */
    async logEnhancedAIInteraction(aiData) {
        const query = `
            INSERT INTO ai_interactions (
                registration_id, step_id, interaction_type, prompt, prompt_length,
                response, response_length, model_used, tokens_used, input_tokens,
                output_tokens, cost_usd, processing_time_ms, success, error_message,
                confidence_score, response_quality_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            aiData.registrationId || null,
            aiData.stepId || null,
            aiData.interactionType || 'form_analysis',
            aiData.prompt,
            aiData.prompt ? aiData.prompt.length : 0,
            aiData.response,
            aiData.response ? aiData.response.length : 0,
            aiData.modelUsed,
            aiData.tokensUsed || null,
            aiData.inputTokens || null,
            aiData.outputTokens || null,
            aiData.costUsd || null,
            aiData.processingTimeMs || null,
            aiData.success ? 1 : 0,
            aiData.errorMessage || null,
            aiData.confidenceScore || null,
            aiData.responseQualityScore || null
        ];

        const result = await this.runQuery(query, values);
        
        // If we have insight data, log it separately
        if (aiData.insightData) {
            await this.logLLMInsights(result.lastID, aiData.insightData);
        }
        
        console.log(`🤖 Enhanced AI interaction logged: ${aiData.modelUsed} - ${(aiData.prompt || '').substring(0, 50)}...`);
        return result.lastID;
    }

    /**
     * Log LLM insights from enhanced logging system
     */
    async logLLMInsights(interactionId, insightData) {
        for (const [insightType, data] of Object.entries(insightData)) {
            const query = `
                INSERT INTO llm_insights (
                    interaction_id, insight_type, insight_data, analysis_version
                ) VALUES (?, ?, ?, ?)
            `;

            await this.runQuery(query, [
                interactionId,
                insightType,
                JSON.stringify(data),
                '1.0'
            ]);
        }
        
        console.log(`🧠 LLM insights logged: ${Object.keys(insightData).join(', ')}`);
    }

    /**
     * Log registration failure with LLM analysis
     */
    async logRegistrationFailure(registrationId, failureData) {
        const query = `
            UPDATE registration_attempts 
            SET status = 'failed',
                success = 0,
                error_message = ?,
                failure_reason = ?,
                llm_failure_analysis = ?,
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await this.runQuery(query, [
            failureData.errorMessage,
            failureData.failureReason, // LLM-generated explanation
            failureData.llmAnalysis,   // Detailed LLM reasoning
            registrationId
        ]);

        console.log(`❌ Registration failure logged with LLM analysis: ${failureData.failureReason}`);
    }

    /**
     * Enhanced method to get email usage history for a specific site
     */
    async getEmailUsageForSite(siteName) {
        const query = `
            SELECT 
                ea.email,
                ea.service,
                ea.usage_count,
                ra.success,
                ra.started_at,
                ra.failure_reason,
                sc.username as site_username,
                sc.login_successful
            FROM email_accounts ea
            LEFT JOIN registration_attempts ra ON ea.id = ra.email_id
            LEFT JOIN survey_sites ss ON ss.site_name = ra.target_site
            LEFT JOIN site_credentials sc ON (ea.id = sc.email_id AND ss.id = sc.site_id)
            WHERE ss.site_name = ? OR ra.target_site = ?
            ORDER BY ra.started_at DESC
        `;
        
        return await this.allQuery(query, [siteName, siteName]);
    }

    /**
     * Get available emails for reuse (not at usage limit)
     */
    async getAvailableEmails() {
        const query = `
            SELECT 
                ea.*,
                COUNT(ra.id) as total_registrations,
                SUM(ra.success) as successful_registrations
            FROM email_accounts ea
            LEFT JOIN registration_attempts ra ON ea.id = ra.email_id
            WHERE ea.status = 'active' 
            AND ea.usage_count < ea.max_usage_limit
            GROUP BY ea.id
            ORDER BY ea.usage_count ASC, ea.created_at DESC
        `;
        
        return await this.allQuery(query);
    }

    /**
     * Get comprehensive site intelligence with all related data
     */
    async getComprehensiveSiteIntelligence(siteName) {
        const siteQuery = `
            SELECT * FROM survey_sites WHERE site_name = ?
        `;
        
        const site = await this.getQuery(siteQuery, [siteName]);
        if (!site) {
            console.log(`⚠️ Site not found: ${siteName}`);
            return null;
        }

        const intelligence = {
            site: site,
            defenses: await this.getSiteDefenses(site.id),
            questions: await this.getSiteQuestions(site.id),
            registrationHistory: await this.allQuery(`
                SELECT ra.*, ea.email, ea.service
                FROM registration_attempts ra
                JOIN email_accounts ea ON ra.email_id = ea.id
                WHERE ra.site_id = ? OR ra.target_site = ?
                ORDER BY ra.started_at DESC
            `, [site.id, siteName]),
            credentials: await this.allQuery(`
                SELECT sc.*, ea.email
                FROM site_credentials sc
                JOIN email_accounts ea ON sc.email_id = ea.id
                WHERE sc.site_id = ?
            `, [site.id]),
            aiInteractions: await this.allQuery(`
                SELECT ai.*, ra.target_site
                FROM ai_interactions ai
                JOIN registration_attempts ra ON ai.registration_id = ra.id
                WHERE ra.site_id = ? OR ra.target_site = ?
                ORDER BY ai.timestamp DESC
            `, [site.id, siteName])
        };

        return intelligence;
    }

    /**
     * Update email usage count
     */
    async updateEmailUsage(emailId) {
        const query = `
            UPDATE email_accounts 
            SET usage_count = usage_count + 1,
                last_accessed = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.runQuery(query, [emailId]);
        console.log(`📈 Email usage count updated for ID: ${emailId}`);
    }

    /**
     * Get email-site correlation matrix
     */
    async getEmailSiteMatrix() {
        const query = `
            SELECT * FROM email_site_correlation
            ORDER BY registration_date DESC
        `;
        
        return await this.allQuery(query);
    }

    /**
     * Get site intelligence summary
     */
    async getSiteIntelligenceSummary() {
        const query = `
            SELECT * FROM site_intelligence_summary
            ORDER BY successful_registrations DESC, avg_completion_time ASC
        `;
        
        return await this.allQuery(query);
    }

    /**
     * Log or update survey site information
     */
    async logSurveysite(siteData) {
        // Check if site already exists
        const existingSite = await this.getQuery(
            'SELECT * FROM survey_sites WHERE site_name = ?', 
            [siteData.siteName]
        );

        if (existingSite) {
            // Update existing site
            const query = `
                UPDATE survey_sites 
                SET last_visited = CURRENT_TIMESTAMP,
                    visit_count = visit_count + 1,
                    registration_url = COALESCE(?, registration_url),
                    site_category = COALESCE(?, site_category),
                    notes = COALESCE(?, notes)
                WHERE id = ?
            `;
            
            await this.runQuery(query, [
                siteData.registrationUrl,
                siteData.siteCategory,
                siteData.notes,
                existingSite.id
            ]);
            
            console.log(`📊 Updated site: ${siteData.siteName} (Visit #${existingSite.visit_count + 1})`);
            return existingSite.id;
        } else {
            // Insert new site
            const query = `
                INSERT INTO survey_sites (
                    site_name, base_url, registration_url, site_category, notes
                ) VALUES (?, ?, ?, ?, ?)
            `;
            
            const result = await this.runQuery(query, [
                siteData.siteName,
                siteData.baseUrl,
                siteData.registrationUrl,
                siteData.siteCategory || 'survey',
                siteData.notes || ''
            ]);
            
            console.log(`🆕 New site logged: ${siteData.siteName} (ID: ${result.lastID})`);
            return result.lastID;
        }
    }

    /**
     * Log defensive measures detected on a site
     */
    async logSiteDefense(defenseData) {
        const query = `
            INSERT INTO site_defenses (
                site_id, registration_id, defense_type, defense_subtype, severity_level,
                description, bypass_attempted, bypass_successful, bypass_method,
                detection_details, screenshot_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            defenseData.siteId,
            defenseData.registrationId || null,
            defenseData.defenseType,
            defenseData.defenseSubtype || null,
            defenseData.severityLevel,
            defenseData.description || '',
            defenseData.bypassAttempted ? 1 : 0,
            defenseData.bypassSuccessful ? 1 : 0,
            defenseData.bypassMethod || null,
            JSON.stringify(defenseData.detectionDetails || {}),
            defenseData.screenshotPath || null
        ];

        const result = await this.runQuery(query, values);
        console.log(`🛡️ Defense logged: ${defenseData.defenseType} (${defenseData.defenseSubtype || 'general'}) - Severity: ${defenseData.severityLevel}`);
        return result.lastID;
    }

    /**
     * Log or update site questions
     */
    async logSiteQuestion(siteId, questionData) {
        // Check if this exact question already exists for this site
        const existingQuestion = await this.getQuery(`
            SELECT * FROM site_questions 
            WHERE site_id = ? AND question_text = ? AND field_name = ?
        `, [siteId, questionData.questionText, questionData.fieldName]);

        if (existingQuestion) {
            // Update frequency and last seen
            await this.runQuery(`
                UPDATE site_questions 
                SET frequency_seen = frequency_seen + 1,
                    last_seen = CURRENT_TIMESTAMP,
                    yield_importance = COALESCE(?, yield_importance)
                WHERE id = ?
            `, [questionData.yieldImportance, existingQuestion.id]);
            
            return existingQuestion.id;
        } else {
            // Insert new question
            const query = `
                INSERT INTO site_questions (
                    site_id, question_text, question_type, field_name, demographic_category,
                    is_required, has_options, question_options, yield_importance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await this.runQuery(query, [
                siteId,
                questionData.questionText,
                questionData.questionType,
                questionData.fieldName,
                questionData.demographicCategory || 'other',
                questionData.isRequired ? 1 : 0,
                questionData.hasOptions ? 1 : 0,
                JSON.stringify(questionData.questionOptions || []),
                questionData.yieldImportance || 0.5
            ]);

            return result.lastID;
        }
    }

    /**
     * Update site statistics after registration attempt
     */
    async updateSiteStats(siteId, registrationSuccess, questionsCount, complexity, yieldPotential) {
        const updateQuery = `
            UPDATE survey_sites 
            SET successful_registrations = successful_registrations + ?,
                failed_registrations = failed_registrations + ?,
                total_questions = COALESCE(?, total_questions),
                average_complexity = COALESCE(?, average_complexity),
                yield_potential = COALESCE(?, yield_potential),
                accessibility_score = CASE 
                    WHEN ? = 1 THEN MIN(1.0, accessibility_score + 0.1)
                    ELSE MAX(0.0, accessibility_score - 0.1)
                END
            WHERE id = ?
        `;

        await this.runQuery(updateQuery, [
            registrationSuccess ? 1 : 0,
            registrationSuccess ? 0 : 1,
            questionsCount,
            complexity,
            yieldPotential,
            registrationSuccess ? 1 : 0,
            siteId
        ]);
    }

    /**
     * Get all survey sites with their statistics
     */
    async getAllSurveysSites() {
        const query = `
            SELECT ss.*,
                   (SELECT COUNT(*) FROM site_questions sq WHERE sq.site_id = ss.id) as question_count,
                   (SELECT COUNT(*) FROM site_defenses sd WHERE sd.site_id = ss.id) as defense_count
            FROM survey_sites ss
            ORDER BY ss.last_visited DESC
        `;
        return await this.allQuery(query);
    }

    /**
     * Get all questions for a specific site
     */
    async getSiteQuestions(siteId) {
        const query = `
            SELECT * FROM site_questions 
            WHERE site_id = ? 
            ORDER BY demographic_category, question_type, frequency_seen DESC
        `;
        return await this.allQuery(query, [siteId]);
    }

    /**
     * Get all defenses detected for a specific site
     */
    async getSiteDefenses(siteId) {
        const query = `
            SELECT * FROM site_defenses 
            WHERE site_id = ? 
            ORDER BY detected_at DESC
        `;
        return await this.allQuery(query, [siteId]);
    }

    /**
     * Get comprehensive site intelligence report
     */
    async getSiteIntelligenceReport(siteName = null) {
        let siteFilter = '';
        let params = [];
        
        if (siteName) {
            siteFilter = 'WHERE ss.site_name = ?';
            params = [siteName];
        }

        const query = `
            SELECT 
                ss.*,
                COUNT(DISTINCT sq.id) as total_questions,
                COUNT(DISTINCT sd.id) as total_defenses,
                GROUP_CONCAT(DISTINCT sq.demographic_category) as question_categories,
                GROUP_CONCAT(DISTINCT sd.defense_type) as defense_types
            FROM survey_sites ss
            LEFT JOIN site_questions sq ON ss.id = sq.site_id
            LEFT JOIN site_defenses sd ON ss.id = sd.site_id
            ${siteFilter}
            GROUP BY ss.id
            ORDER BY ss.last_visited DESC
        `;

        return await this.allQuery(query, params);
    }

    /**
     * Get all sites attempted for a specific email with failure reasons
     */
    async getEmailRegistrationHistory(email) {
        const query = `
            SELECT 
                ra.id as registration_id,
                ra.target_site,
                ra.target_url,
                ra.started_at,
                ra.completed_at,
                ra.status,
                ra.success,
                ra.error_message,
                ea.email,
                ss.id as site_id,
                ss.site_name,
                COUNT(DISTINCT sd.id) as defense_count,
                GROUP_CONCAT(DISTINCT sd.defense_type) as defenses_encountered,
                GROUP_CONCAT(DISTINCT sd.description) as failure_reasons
            FROM registration_attempts ra
            JOIN email_accounts ea ON ra.email_id = ea.id
            LEFT JOIN survey_sites ss ON ss.site_name = ra.target_site
            LEFT JOIN site_defenses sd ON sd.registration_id = ra.id
            WHERE ea.email = ?
            GROUP BY ra.id
            ORDER BY ra.started_at DESC
        `;
        return await this.allQuery(query, [email]);
    }

    /**
     * Get all failed registration attempts for an email with detailed reasons
     */
    async getEmailFailedRegistrations(email) {
        const query = `
            SELECT 
                ra.target_site,
                ra.target_url,
                ra.started_at,
                ra.error_message,
                ra.status,
                GROUP_CONCAT(DISTINCT sd.defense_type || ': ' || sd.description) as failure_reasons,
                GROUP_CONCAT(DISTINCT sd.defense_subtype) as defense_subtypes,
                AVG(sd.severity_level) as avg_defense_severity
            FROM registration_attempts ra
            JOIN email_accounts ea ON ra.email_id = ea.id
            LEFT JOIN site_defenses sd ON sd.registration_id = ra.id
            WHERE ea.email = ? AND ra.success = 0
            GROUP BY ra.id, ra.target_site
            ORDER BY ra.started_at DESC
        `;
        return await this.allQuery(query, [email]);
    }

    /**
     * Get all successfully registered sites for an email
     */
    async getEmailSuccessfulRegistrations(email) {
        const query = `
            SELECT 
                ra.target_site,
                ra.target_url,
                ra.started_at,
                ra.completed_at,
                ss.site_name,
                ss.site_category,
                COUNT(DISTINCT rq.id) as questions_answered,
                up.profile_name,
                up.yield_prediction,
                up.ai_optimization_score
            FROM registration_attempts ra
            JOIN email_accounts ea ON ra.email_id = ea.id
            LEFT JOIN survey_sites ss ON ss.site_name = ra.target_site
            LEFT JOIN registration_questions rq ON rq.registration_id = ra.id
            LEFT JOIN user_profiles up ON up.registration_id = ra.id
            WHERE ea.email = ? AND ra.success = 1
            GROUP BY ra.id, ra.target_site
            ORDER BY ra.completed_at DESC
        `;
        return await this.allQuery(query, [email]);
    }

    /**
     * Get all emails successfully registered for a specific site
     */
    async getSiteSuccessfulEmails(siteName) {
        const query = `
            SELECT 
                ea.email,
                ea.service as email_service,
                ea.created_at as email_created,
                ra.started_at as registration_started,
                ra.completed_at as registration_completed,
                up.profile_name,
                up.age,
                up.gender,
                up.occupation,
                up.location_city,
                up.location_state,
                up.yield_prediction,
                COUNT(DISTINCT rq.id) as questions_answered
            FROM registration_attempts ra
            JOIN email_accounts ea ON ra.email_id = ea.id
            LEFT JOIN user_profiles up ON up.registration_id = ra.id
            LEFT JOIN registration_questions rq ON rq.registration_id = ra.id
            WHERE ra.target_site = ? AND ra.success = 1
            GROUP BY ea.email, ra.id
            ORDER BY ra.completed_at DESC
        `;
        return await this.allQuery(query, [siteName]);
    }

    /**
     * Get comprehensive email-to-site correlation report
     */
    async getEmailSiteCorrelationReport(email = null) {
        let whereClause = '';
        let params = [];
        
        if (email) {
            whereClause = 'WHERE ea.email = ?';
            params = [email];
        }

        const query = `
            SELECT 
                ea.email,
                ea.service,
                ea.created_at as email_created,
                ra.target_site,
                ra.target_url,
                ra.started_at,
                ra.completed_at,
                ra.success,
                ra.error_message,
                ss.site_category,
                ss.yield_potential,
                up.profile_name,
                up.yield_prediction,
                COUNT(DISTINCT rq.id) as questions_answered,
                COUNT(DISTINCT sd.id) as defenses_encountered,
                GROUP_CONCAT(DISTINCT rq.demographic_category) as question_categories,
                GROUP_CONCAT(DISTINCT sd.defense_type) as defense_types
            FROM email_accounts ea
            LEFT JOIN registration_attempts ra ON ra.email_id = ea.id
            LEFT JOIN survey_sites ss ON ss.site_name = ra.target_site
            LEFT JOIN user_profiles up ON up.registration_id = ra.id
            LEFT JOIN registration_questions rq ON rq.registration_id = ra.id
            LEFT JOIN site_defenses sd ON sd.registration_id = ra.id
            ${whereClause}
            GROUP BY ea.email, ra.target_site
            ORDER BY ea.created_at DESC, ra.started_at DESC
        `;
        return await this.allQuery(query, params);
    }

    /**
     * Get site defense summary for all sites
     */
    async getSiteDefenseSummary() {
        const query = `
            SELECT 
                ss.site_name,
                ss.base_url,
                COUNT(DISTINCT sd.id) as total_defenses,
                COUNT(DISTINCT sd.defense_type) as unique_defense_types,
                AVG(sd.severity_level) as avg_severity,
                MAX(sd.severity_level) as max_severity,
                GROUP_CONCAT(DISTINCT sd.defense_type) as defense_types,
                COUNT(DISTINCT ra.id) as total_attempts,
                SUM(ra.success) as successful_attempts,
                ROUND((SUM(ra.success) * 100.0 / COUNT(DISTINCT ra.id)), 2) as success_rate
            FROM survey_sites ss
            LEFT JOIN site_defenses sd ON sd.site_id = ss.id
            LEFT JOIN registration_attempts ra ON ra.target_site = ss.site_name
            GROUP BY ss.id, ss.site_name
            ORDER BY avg_severity DESC, total_defenses DESC
        `;
        return await this.allQuery(query);
    }

    /**
     * Get detailed question analysis for a site
     */
    async getSiteQuestionAnalysis(siteName) {
        const query = `
            SELECT 
                sq.question_text,
                sq.question_type,
                sq.demographic_category,
                sq.is_required,
                sq.frequency_seen,
                sq.yield_importance,
                COUNT(DISTINCT rq.id) as times_answered,
                GROUP_CONCAT(DISTINCT rq.answer_provided) as sample_answers,
                AVG(rq.yield_optimization_factor) as avg_yield_factor
            FROM site_questions sq
            JOIN survey_sites ss ON sq.site_id = ss.id
            LEFT JOIN registration_questions rq ON (
                rq.question_text = sq.question_text AND 
                rq.field_name = sq.field_name
            )
            WHERE ss.site_name = ?
            GROUP BY sq.id
            ORDER BY sq.demographic_category, sq.frequency_seen DESC
        `;
        return await this.allQuery(query, [siteName]);
    }

    /**
     * Get email performance metrics
     */
    async getEmailPerformanceMetrics(email) {
        const query = `
            SELECT 
                ea.email,
                ea.service,
                ea.created_at,
                COUNT(DISTINCT ra.id) as total_attempts,
                SUM(ra.success) as successful_registrations,
                COUNT(DISTINCT ra.target_site) as unique_sites_attempted,
                AVG(up.yield_prediction) as avg_yield_prediction,
                AVG(up.ai_optimization_score) as avg_optimization_score,
                COUNT(DISTINCT rq.id) as total_questions_answered,
                COUNT(DISTINCT sd.id) as total_defenses_encountered
            FROM email_accounts ea
            LEFT JOIN registration_attempts ra ON ra.email_id = ea.id
            LEFT JOIN user_profiles up ON up.email_id = ea.id
            LEFT JOIN registration_questions rq ON rq.registration_id = ra.id
            LEFT JOIN site_defenses sd ON sd.registration_id = ra.id
            WHERE ea.email = ?
            GROUP BY ea.id
        `;
        return await this.getQuery(query, [email]);
    }

    /**
     * Execute custom correlation query
     */
    async executeCorrelationQuery(queryType, parameter) {
        switch (queryType) {
            case 'email_failures':
                return await this.getEmailFailedRegistrations(parameter);
            case 'email_successes':
                return await this.getEmailSuccessfulRegistrations(parameter);
            case 'site_emails':
                return await this.getSiteSuccessfulEmails(parameter);
            case 'email_history':
                return await this.getEmailRegistrationHistory(parameter);
            case 'email_metrics':
                return await this.getEmailPerformanceMetrics(parameter);
            case 'site_questions':
                return await this.getSiteQuestionAnalysis(parameter);
            default:
                throw new Error(`Unknown query type: ${queryType}`);
        }
    }

    /**
     * Cleanup and close database
     */
    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Database close error:', err.message);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = RegistrationLogger;