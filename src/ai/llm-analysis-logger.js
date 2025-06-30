/**
 * LLM Analysis Logger
 * Comprehensive logging and analysis of all LLM interactions for form automation
 * Tracks prompts, responses, accuracy, and identifies improvement opportunities
 */

const crypto = require('crypto');

class LLMAnalysisLogger {
    constructor(database) {
        this.db = database;
        this.currentFormSession = null;
        this.promptTemplates = new Map();
        
        // Load prompt templates on initialization
        this.loadPromptTemplates();
    }
    
    /**
     * Start a new form analysis session
     */
    async startFormSession(registrationId, siteId, pageData) {
        console.log('🧠 Starting LLM form analysis session...');
        
        try {
            // Create HTML hash for deduplication
            const htmlHash = crypto.createHash('sha256')
                .update(pageData.html || '')
                .digest('hex')
                .substring(0, 16);
            
            const stmt = this.db.prepare(`
                INSERT INTO form_analysis_sessions (
                    registration_id, site_id, page_url, page_title,
                    raw_html_hash, raw_html_content, form_selector,
                    screenshot_before_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run([
                registrationId,
                siteId,
                pageData.url,
                pageData.title,
                htmlHash,
                pageData.html,
                pageData.formSelector || 'form',
                pageData.screenshotPath
            ]);
            
            this.currentFormSession = {
                id: result.lastInsertRowid,
                registrationId,
                siteId,
                startTime: Date.now(),
                interactions: [],
                fieldsDetected: 0,
                fieldsSuccessful: 0,
                honeypotsDetected: 0,
                honeypotsAvoided: 0
            };
            
            console.log(`✅ Form session started (ID: ${this.currentFormSession.id})`);
            return this.currentFormSession.id;
            
        } catch (error) {
            console.error('❌ Failed to start form session:', error);
            throw error;
        }
    }
    
    /**
     * Log an LLM interaction with comprehensive analysis
     */
    async logLLMInteraction(interactionData) {
        console.log('📝 Logging LLM interaction...');
        
        try {
            const startTime = Date.now();
            
            // Store the basic AI interaction
            const aiInteractionStmt = this.db.prepare(`
                INSERT INTO ai_interactions (
                    registration_id, interaction_type, prompt_text, response_text,
                    model_used, tokens_used, cost_usd, processing_time_ms,
                    confidence_score, form_analysis_context, input_field_mapping,
                    prompt_version, success
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const aiResult = aiInteractionStmt.run([
                this.currentFormSession?.registrationId,
                interactionData.type,
                interactionData.prompt,
                interactionData.response,
                interactionData.model || 'gpt-4',
                interactionData.tokensUsed || 0,
                interactionData.cost || 0.0,
                interactionData.processingTime || 0,
                interactionData.confidence || 0.0,
                JSON.stringify(interactionData.context || {}),
                JSON.stringify(interactionData.fieldMapping || {}),
                interactionData.promptVersion || '1.0',
                interactionData.success !== false
            ]);
            
            const aiInteractionId = aiResult.lastInsertRowid;
            
            // If this is form analysis, perform detailed analysis
            if (interactionData.type === 'form_analysis' && this.currentFormSession) {
                await this.analyzeFormAnalysisResponse(aiInteractionId, interactionData);
            }
            
            // Track interaction in current session
            if (this.currentFormSession) {
                this.currentFormSession.interactions.push({
                    id: aiInteractionId,
                    type: interactionData.type,
                    timestamp: Date.now(),
                    success: interactionData.success !== false
                });
            }
            
            // Update prompt template statistics
            if (interactionData.promptTemplateId) {
                await this.updatePromptTemplateStats(
                    interactionData.promptTemplateId,
                    interactionData.success !== false,
                    interactionData.confidence || 0.0,
                    interactionData.processingTime || 0
                );
            }
            
            console.log(`✅ LLM interaction logged (ID: ${aiInteractionId})`);
            return aiInteractionId;
            
        } catch (error) {
            console.error('❌ Failed to log LLM interaction:', error);
            throw error;
        }
    }
    
    /**
     * Analyze form analysis response quality and accuracy
     */
    async analyzeFormAnalysisResponse(aiInteractionId, interactionData) {
        console.log('🔍 Analyzing form analysis response...');
        
        try {
            // Validate aiInteractionId before proceeding
            if (!aiInteractionId || typeof aiInteractionId !== 'number') {
                console.log('⚠️ Invalid aiInteractionId, skipping response analysis');
                return;
            }
            const response = interactionData.parsedResponse || {};
            const actualFields = interactionData.actualFields || [];
            const context = interactionData.context || {};
            
            // Parse LLM's field identification
            const llmFields = response.fields || [];
            const llmHoneypots = response.honeypots || [];
            
            // Calculate accuracy metrics
            const analysis = this.calculateFieldAccuracy(llmFields, actualFields, llmHoneypots);
            
            // Store detailed response analysis
            const stmt = this.db.prepare(`
                INSERT INTO llm_response_analysis (
                    ai_interaction_id, form_session_id, analysis_type,
                    prompt_template_id, expected_fields, llm_identified_fields,
                    missing_fields, incorrect_fields, extra_fields,
                    honeypot_accuracy, selector_validity, field_type_accuracy,
                    comprehension_score, response_coherence_score, actionability_score,
                    error_analysis, improvement_suggestions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                aiInteractionId,
                this.currentFormSession?.id,
                'field_mapping',
                interactionData.promptTemplateId,
                JSON.stringify(actualFields),
                JSON.stringify(llmFields),
                JSON.stringify(analysis.missingFields),
                JSON.stringify(analysis.incorrectFields),
                JSON.stringify(analysis.extraFields),
                JSON.stringify(analysis.honeypotAccuracy),
                JSON.stringify(analysis.selectorValidity),
                JSON.stringify(analysis.fieldTypeAccuracy),
                analysis.comprehensionScore,
                analysis.coherenceScore,
                analysis.actionabilityScore,
                JSON.stringify(analysis.errors),
                JSON.stringify(analysis.improvements)
            ]);
            
            // Log individual field identification accuracy
            for (const field of llmFields) {
                await this.logFieldIdentificationAccuracy(field, analysis, interactionData);
            }
            
            // Check for common comprehension issues
            await this.identifyComprehensionIssues(aiInteractionId, analysis, interactionData);
            
            console.log(`✅ Form analysis response analyzed (Score: ${analysis.comprehensionScore.toFixed(2)})`);
            
        } catch (error) {
            console.error('❌ Failed to analyze form response:', error);
        }
    }
    
    /**
     * Calculate field identification accuracy metrics
     */
    calculateFieldAccuracy(llmFields, actualFields, llmHoneypots) {
        const analysis = {
            missingFields: [],
            incorrectFields: [],
            extraFields: [],
            honeypotAccuracy: { detected: 0, missed: 0, falsePositives: 0 },
            selectorValidity: { valid: 0, invalid: 0 },
            fieldTypeAccuracy: { correct: 0, incorrect: 0 },
            comprehensionScore: 0.0,
            coherenceScore: 0.0,
            actionabilityScore: 0.0,
            errors: [],
            improvements: []
        };
        
        // Create maps for easier comparison
        const actualFieldMap = new Map(actualFields.map(f => [f.selector, f]));
        const llmFieldMap = new Map(llmFields.map(f => [f.selector, f]));
        
        // Find missing fields (actual fields LLM didn't identify)
        for (const [selector, field] of actualFieldMap) {
            if (!llmFieldMap.has(selector)) {
                analysis.missingFields.push(field);
                analysis.errors.push(`Missed required field: ${selector} (${field.purpose})`);
            }
        }
        
        // Find extra fields (fields LLM identified that don't exist or aren't needed)
        for (const [selector, field] of llmFieldMap) {
            if (!actualFieldMap.has(selector)) {
                analysis.extraFields.push(field);
                analysis.errors.push(`Identified non-existent field: ${selector}`);
            }
        }
        
        // Check field type and purpose accuracy
        let correctIdentifications = 0;
        let totalComparisons = 0;
        
        for (const [selector, llmField] of llmFieldMap) {
            const actualField = actualFieldMap.get(selector);
            if (actualField) {
                totalComparisons++;
                
                // Check if purpose/type identification was correct
                const purposeMatch = llmField.purpose === actualField.purpose;
                const typeMatch = llmField.type === actualField.type;
                
                if (purposeMatch && typeMatch) {
                    correctIdentifications++;
                    analysis.fieldTypeAccuracy.correct++;
                } else {
                    analysis.fieldTypeAccuracy.incorrect++;
                    analysis.incorrectFields.push({
                        selector,
                        expected: actualField,
                        identified: llmField
                    });
                }
            }
        }
        
        // Calculate overall scores
        const totalActualFields = actualFields.length;
        const totalLLMFields = llmFields.length;
        
        if (totalActualFields > 0) {
            analysis.comprehensionScore = Math.max(0, 
                (correctIdentifications - analysis.extraFields.length) / totalActualFields
            );
        }
        
        // Coherence score based on response structure
        analysis.coherenceScore = this.calculateCoherenceScore(llmFields);
        
        // Actionability score based on usable selectors
        analysis.actionabilityScore = this.calculateActionabilityScore(llmFields);
        
        // Generate improvement suggestions
        analysis.improvements = this.generateImprovementSuggestions(analysis);
        
        return analysis;
    }
    
    /**
     * Log detailed field identification accuracy
     */
    async logFieldIdentificationAccuracy(field, analysis, interactionData) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO field_identification_accuracy (
                    form_session_id, field_selector, field_html, field_attributes,
                    surrounding_context, llm_identified_as, llm_confidence,
                    actual_field_purpose, was_honeypot, llm_detected_honeypot,
                    honeypot_detection_correct, llm_reasoning, accuracy_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const actualField = interactionData.actualFields?.find(f => f.selector === field.selector);
            const wasHoneypot = actualField?.isHoneypot || false;
            const llmDetectedHoneypot = field.isHoneypot || false;
            const honeypotCorrect = wasHoneypot === llmDetectedHoneypot;
            
            let accuracyScore = 0.0;
            if (actualField) {
                accuracyScore = (actualField.purpose === field.purpose ? 0.5 : 0) +
                              (actualField.type === field.type ? 0.3 : 0) +
                              (honeypotCorrect ? 0.2 : 0);
            }
            
            stmt.run([
                this.currentFormSession?.id,
                field.selector,
                field.html || '',
                JSON.stringify(field.attributes || {}),
                field.context || '',
                field.purpose,
                field.confidence || 0.0,
                actualField?.purpose || 'unknown',
                wasHoneypot,
                llmDetectedHoneypot,
                honeypotCorrect,
                field.reasoning || '',
                accuracyScore
            ]);
            
        } catch (error) {
            console.error('Failed to log field accuracy:', error);
        }
    }
    
    /**
     * Identify and log common LLM comprehension issues
     */
    async identifyComprehensionIssues(aiInteractionId, analysis, interactionData) {
        try {
            const issues = [];
            
            // Common issue patterns
            if (analysis.missingFields.length > 0) {
                issues.push({
                    category: 'missing_field',
                    description: `LLM missed ${analysis.missingFields.length} required fields`,
                    severity: analysis.missingFields.length > 2 ? 'high' : 'medium'
                });
            }
            
            if (analysis.extraFields.length > 0) {
                issues.push({
                    category: 'extra_field',
                    description: `LLM identified ${analysis.extraFields.length} non-existent fields`,
                    severity: 'medium'
                });
            }
            
            if (analysis.comprehensionScore < 0.7) {
                issues.push({
                    category: 'low_comprehension',
                    description: `Overall comprehension score low: ${analysis.comprehensionScore.toFixed(2)}`,
                    severity: 'high'
                });
            }
            
            // Store each issue
            for (const issue of issues) {
                await this.storeComprehensionIssue(aiInteractionId, issue, interactionData);
            }
            
        } catch (error) {
            console.error('Failed to identify comprehension issues:', error);
        }
    }
    
    /**
     * Store comprehension issue in database
     */
    async storeComprehensionIssue(aiInteractionId, issue, interactionData) {
        try {
            // Check if this issue pattern exists
            const existing = await this.db.get(`
                SELECT id, frequency_count 
                FROM llm_comprehension_issues 
                WHERE issue_category = ? AND html_pattern = ?
            `, [issue.category, interactionData.htmlPattern || '']);
            
            if (existing) {
                // Update frequency
                await this.db.run(`
                    UPDATE llm_comprehension_issues 
                    SET frequency_count = frequency_count + 1,
                        last_seen = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [existing.id]);
            } else {
                // Create new issue
                const stmt = this.db.prepare(`
                    INSERT INTO llm_comprehension_issues (
                        ai_interaction_id, issue_category, issue_description,
                        html_pattern, expected_behavior, actual_behavior,
                        impact_severity
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                
                stmt.run([
                    aiInteractionId,
                    issue.category,
                    issue.description,
                    interactionData.htmlPattern || '',
                    issue.expectedBehavior || '',
                    issue.actualBehavior || '',
                    issue.severity
                ]);
            }
            
        } catch (error) {
            console.error('Failed to store comprehension issue:', error);
        }
    }
    
    /**
     * End form session and calculate final metrics
     */
    async endFormSession(success, finalData = {}) {
        if (!this.currentFormSession) return;
        
        console.log('🏁 Ending LLM form analysis session...');
        
        try {
            const duration = Date.now() - this.currentFormSession.startTime;
            
            const stmt = this.db.prepare(`
                UPDATE form_analysis_sessions 
                SET session_end = CURRENT_TIMESTAMP,
                    total_duration_ms = ?,
                    total_fields_detected = ?,
                    fields_successfully_filled = ?,
                    honeypots_detected = ?,
                    honeypots_avoided = ?,
                    validation_errors_encountered = ?,
                    success = ?,
                    failure_reason = ?,
                    llm_analysis_chain = ?,
                    final_assessment = ?,
                    lessons_learned = ?,
                    screenshot_after_path = ?
                WHERE id = ?
            `);
            
            stmt.run([
                duration,
                finalData.totalFieldsDetected || this.currentFormSession.fieldsDetected,
                finalData.fieldsSuccessful || this.currentFormSession.fieldsSuccessful,
                finalData.honeypotsDetected || this.currentFormSession.honeypotsDetected,
                finalData.honeypotsAvoided || this.currentFormSession.honeypotsAvoided,
                finalData.validationErrors || 0,
                success,
                finalData.failureReason || null,
                JSON.stringify(this.currentFormSession.interactions),
                JSON.stringify(finalData.assessment || {}),
                JSON.stringify(finalData.lessonsLearned || {}),
                finalData.screenshotAfterPath || null,
                this.currentFormSession.id
            ]);
            
            console.log(`✅ Form session ended (Duration: ${duration}ms, Success: ${success})`);
            
            // Generate session insights
            await this.generateSessionInsights(this.currentFormSession.id);
            
            this.currentFormSession = null;
            
        } catch (error) {
            console.error('❌ Failed to end form session:', error);
        }
    }
    
    /**
     * Generate insights from completed session
     */
    async generateSessionInsights(sessionId) {
        try {
            // This would analyze the session and generate actionable insights
            // For example: prompt improvements, pattern recognition, success factors
            console.log(`🔍 Generating insights for session ${sessionId}...`);
            
            // Implementation would analyze the session data and create improvement recommendations
            
        } catch (error) {
            console.error('Failed to generate session insights:', error);
        }
    }
    
    /**
     * Helper methods for scoring
     */
    calculateCoherenceScore(fields) {
        // Analyze response structure and consistency
        let score = 1.0;
        
        // Check for required fields
        const hasSelector = fields.every(f => f.selector);
        const hasPurpose = fields.every(f => f.purpose);
        
        if (!hasSelector) score -= 0.3;
        if (!hasPurpose) score -= 0.3;
        
        // Check for duplicate selectors
        const selectors = fields.map(f => f.selector);
        const uniqueSelectors = new Set(selectors);
        if (selectors.length !== uniqueSelectors.size) score -= 0.2;
        
        return Math.max(0, score);
    }
    
    calculateActionabilityScore(fields) {
        // Assess how usable the response is for automation
        let score = 0.0;
        
        for (const field of fields) {
            let fieldScore = 0.0;
            
            // Valid selector format
            if (field.selector && field.selector.length > 0) fieldScore += 0.3;
            
            // Specific purpose
            if (field.purpose && field.purpose !== 'unknown') fieldScore += 0.3;
            
            // Confidence score
            if (field.confidence && field.confidence > 0.5) fieldScore += 0.2;
            
            // Reasoning provided
            if (field.reasoning && field.reasoning.length > 10) fieldScore += 0.2;
            
            score += fieldScore;
        }
        
        return fields.length > 0 ? score / fields.length : 0.0;
    }
    
    generateImprovementSuggestions(analysis) {
        const suggestions = [];
        
        if (analysis.missingFields.length > 0) {
            suggestions.push('Add examples of field detection patterns to prompt');
            suggestions.push('Emphasize importance of finding ALL form fields');
        }
        
        if (analysis.extraFields.length > 0) {
            suggestions.push('Add validation step to check if selectors actually exist');
            suggestions.push('Improve field filtering to focus on form inputs only');
        }
        
        if (analysis.honeypotAccuracy.missed > 0) {
            suggestions.push('Enhance honeypot detection examples in prompt');
            suggestions.push('Add more hidden field detection patterns');
        }
        
        if (analysis.comprehensionScore < 0.7) {
            suggestions.push('Simplify prompt structure and reduce complexity');
            suggestions.push('Add step-by-step field analysis instructions');
        }
        
        return suggestions;
    }
    
    /**
     * Load prompt templates from database
     */
    async loadPromptTemplates() {
        try {
            const templates = await this.db.all(`
                SELECT * FROM llm_prompt_templates WHERE is_active = 1
            `);
            
            for (const template of templates) {
                this.promptTemplates.set(template.id, template);
            }
            
            console.log(`📋 Loaded ${templates.length} prompt templates`);
            
        } catch (error) {
            console.error('Failed to load prompt templates:', error);
        }
    }
    
    /**
     * Update prompt template statistics
     */
    async updatePromptTemplateStats(templateId, success, confidence, responseTime) {
        try {
            const stmt = this.db.prepare(`
                UPDATE llm_prompt_templates 
                SET total_uses = total_uses + 1,
                    successful_uses = successful_uses + ?,
                    success_rate = CAST(successful_uses AS REAL) / total_uses,
                    average_confidence_score = (average_confidence_score * (total_uses - 1) + ?) / total_uses,
                    average_response_time_ms = (average_response_time_ms * (total_uses - 1) + ?) / total_uses,
                    last_used = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            
            stmt.run([
                success ? 1 : 0,
                confidence,
                responseTime,
                templateId
            ]);
            
        } catch (error) {
            console.error('Failed to update prompt template stats:', error);
        }
    }
    
    /**
     * Get analysis dashboard data
     */
    async getAnalysisDashboard(timeframe = '7 days') {
        try {
            return {
                // Recent LLM interactions
                recentInteractions: await this.db.all(`
                    SELECT * FROM ai_interactions 
                    WHERE timestamp > datetime('now', '-${timeframe}')
                    ORDER BY timestamp DESC 
                    LIMIT 50
                `),
                
                // Prompt template performance
                promptPerformance: await this.db.all(`
                    SELECT * FROM llm_prompt_templates 
                    WHERE total_uses > 0
                    ORDER BY success_rate DESC, total_uses DESC
                `),
                
                // Common comprehension issues
                comprehensionIssues: await this.db.all(`
                    SELECT issue_category, COUNT(*) as frequency,
                           AVG(CASE WHEN impact_severity = 'critical' THEN 4
                                   WHEN impact_severity = 'high' THEN 3
                                   WHEN impact_severity = 'medium' THEN 2
                                   ELSE 1 END) as avg_severity
                    FROM llm_comprehension_issues 
                    WHERE first_seen > datetime('now', '-${timeframe}')
                    GROUP BY issue_category
                    ORDER BY frequency DESC
                `),
                
                // Field identification accuracy trends
                fieldAccuracy: await this.db.all(`
                    SELECT DATE(created_at) as date,
                           AVG(accuracy_score) as avg_accuracy,
                           COUNT(*) as total_fields,
                           SUM(CASE WHEN honeypot_detection_correct = 1 THEN 1 ELSE 0 END) as correct_honeypot_detection
                    FROM field_identification_accuracy
                    WHERE created_at > datetime('now', '-${timeframe}')
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `)
            };
            
        } catch (error) {
            console.error('Failed to get analysis dashboard:', error);
            return {};
        }
    }
}

module.exports = LLMAnalysisLogger;