/**
 * Page Analysis Logger
 * Stores comprehensive page analysis data to SQLite for debugging and improvement
 */

const { getDatabaseManager } = require('../database/database-manager.js');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class PageAnalysisLogger {
    constructor(dbPath = './poll-automation.db') {
        // Database path managed by DatabaseManager
        this.dbPath = dbPath;
        this.db = null; // Will be initialized with DatabaseManager
        }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Page Analysis Logger DB error:', err);
                    reject(err);
                } else {
                    console.log('📊 Page Analysis Logger connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    /**
     * Store comprehensive page analysis data
     */
    async storePageAnalysis(analysisData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database not initialized'));
            }

            const {
                sessionId,
                url,
                title,
                questionsFound,
                questionDetails,
                pageStructure,
                summaryMetrics
            } = analysisData;

            // Parse the page structure to extract detailed metrics
            let structureData = {};
            try {
                structureData = typeof pageStructure === 'string' 
                    ? JSON.parse(pageStructure) 
                    : pageStructure;
            } catch (e) {
                console.warn('Failed to parse page structure:', e.message);
            }

            const sql = `
                INSERT INTO page_analysis (
                    session_id, url, title, questions_found, question_details, page_structure,
                    total_forms, total_inputs, total_buttons,
                    input_radio, input_checkbox, input_text, input_email, 
                    input_select, input_textarea, input_submit,
                    body_text_length, question_marks_count, heading_count, paragraph_count,
                    question_classes, field_classes, survey_classes, poll_classes, form_groups,
                    has_error_messages, has_loading_elements, has_success_messages, has_modal_dialogs,
                    first_paragraph, first_heading, body_start, visible_forms,
                    analysis_success, analysis_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                sessionId,
                url,
                title,
                questionsFound || 0,
                JSON.stringify(questionDetails || []),
                JSON.stringify(structureData),
                
                // Form/input metrics
                summaryMetrics?.totalForms || 0,
                summaryMetrics?.totalInputs || 0,
                summaryMetrics?.totalButtons || 0,
                
                // Input type breakdown
                structureData.inputs?.byType?.radio || 0,
                structureData.inputs?.byType?.checkbox || 0,
                structureData.inputs?.byType?.text || 0,
                structureData.inputs?.byType?.email || 0,
                structureData.inputs?.byType?.select || 0,
                structureData.inputs?.byType?.textarea || 0,
                structureData.inputs?.byType?.submit || 0,
                
                // Content metrics
                summaryMetrics?.bodyTextLength || 0,
                structureData.content?.hasQuestionMarks || 0,
                structureData.content?.headingCount || 0,
                structureData.content?.paragraphCount || 0,
                
                // Survey indicators
                structureData.content?.potentialQuestions?.questionClasses || 0,
                structureData.content?.potentialQuestions?.fieldClasses || 0,
                structureData.content?.potentialQuestions?.surveyClasses || 0,
                structureData.content?.potentialQuestions?.pollClasses || 0,
                structureData.content?.potentialQuestions?.formGroups || 0,
                
                // Page state
                summaryMetrics?.errorState || false,
                summaryMetrics?.loadingState || false,
                structureData.indicators?.hasSuccessMessages || false,
                structureData.indicators?.hasModalDialogs || false,
                
                // Sample content
                structureData.samples?.firstParagraph || null,
                structureData.samples?.firstHeading || null,
                structureData.samples?.bodyStart || null,
                JSON.stringify(structureData.samples?.visibleForms || []),
                
                // Analysis metadata
                !structureData.error,
                structureData.error || null
            ];

            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('❌ Failed to store page analysis:', err);
                    reject(err);
                } else {
                    console.log(`✅ Stored page analysis for ${url} (ID: ${this.lastID})`);
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Get recent page analysis data for debugging
     */
    async getRecentAnalysis(limit = 10) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database not initialized'));
            }

            const sql = `
                SELECT 
                    id, session_id, url, title, timestamp,
                    questions_found, total_forms, total_inputs, total_buttons,
                    body_text_length, question_marks_count,
                    question_classes, field_classes, survey_classes, poll_classes,
                    has_error_messages, has_loading_elements,
                    first_heading, analysis_success, analysis_error
                FROM page_analysis 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Get analysis statistics for improvement insights
     */
    async getAnalysisStats() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database not initialized'));
            }

            const sql = `
                SELECT 
                    COUNT(*) as total_pages_analyzed,
                    SUM(questions_found) as total_questions_found,
                    AVG(questions_found) as avg_questions_per_page,
                    SUM(CASE WHEN questions_found > 0 THEN 1 ELSE 0 END) as pages_with_questions,
                    SUM(total_forms) as total_forms_seen,
                    SUM(total_inputs) as total_inputs_seen,
                    SUM(CASE WHEN question_classes > 0 THEN 1 ELSE 0 END) as pages_with_question_classes,
                    SUM(CASE WHEN survey_classes > 0 THEN 1 ELSE 0 END) as pages_with_survey_classes,
                    SUM(CASE WHEN has_error_messages THEN 1 ELSE 0 END) as pages_with_errors,
                    SUM(CASE WHEN analysis_success THEN 1 ELSE 0 END) as successful_analyses
                FROM page_analysis
            `;

            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Find pages with specific characteristics for debugging
     */
    async findPagesWithQuestions() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database not initialized'));
            }

            const sql = `
                SELECT url, title, questions_found, total_inputs, question_classes, survey_classes, first_heading
                FROM page_analysis 
                WHERE questions_found > 0 OR question_classes > 0 OR survey_classes > 0 OR total_inputs > 3
                ORDER BY questions_found DESC, question_classes DESC
                LIMIT 20
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing page analysis database:', err);
                    } else {
                        console.log('📊 Page Analysis Logger database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = PageAnalysisLogger;