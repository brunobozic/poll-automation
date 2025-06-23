/**
 * Migration: Enhanced LLM Interaction Tracking
 * Adds comprehensive LLM prompt/response analysis for form automation improvement
 * Created: 2025-06-22
 */

/**
 * Apply the migration - Enhance LLM tracking capabilities
 */
async function up(db) {
    console.log('  🧠 Enhancing LLM interaction tracking...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Enhanced AI interactions with detailed form analysis tracking
            db.run(`
                ALTER TABLE ai_interactions ADD COLUMN form_analysis_context JSON
            `);
            
            db.run(`
                ALTER TABLE ai_interactions ADD COLUMN input_field_mapping JSON
            `);
            
            db.run(`
                ALTER TABLE ai_interactions ADD COLUMN selector_accuracy_score REAL DEFAULT 0.0
            `);
            
            db.run(`
                ALTER TABLE ai_interactions ADD COLUMN honeypot_detection_accuracy REAL DEFAULT 0.0
            `);
            
            db.run(`
                ALTER TABLE ai_interactions ADD COLUMN field_identification_errors JSON
            `);
            
            db.run(`
                ALTER TABLE ai_interactions ADD COLUMN prompt_version TEXT
            `);
            
            db.run(`
                ALTER TABLE ai_interactions ADD COLUMN response_quality_score REAL DEFAULT 0.0
            `);
            
            // Form analysis sessions for tracking complete form processing workflows
            db.run(`
                CREATE TABLE IF NOT EXISTS form_analysis_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER NOT NULL,
                    site_id INTEGER NOT NULL,
                    session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
                    session_end DATETIME,
                    total_duration_ms INTEGER,
                    page_url TEXT NOT NULL,
                    page_title TEXT,
                    raw_html_hash TEXT, -- Hash of the original HTML for deduplication
                    raw_html_content TEXT, -- Store actual HTML for analysis
                    screenshot_before_path TEXT,
                    screenshot_after_path TEXT,
                    form_selector TEXT,
                    total_fields_detected INTEGER DEFAULT 0,
                    fields_successfully_filled INTEGER DEFAULT 0,
                    honeypots_detected INTEGER DEFAULT 0,
                    honeypots_avoided INTEGER DEFAULT 0,
                    validation_errors_encountered INTEGER DEFAULT 0,
                    success BOOLEAN DEFAULT 0,
                    failure_reason TEXT,
                    llm_analysis_chain JSON, -- Complete chain of LLM interactions
                    final_assessment JSON, -- Overall success/failure analysis
                    lessons_learned JSON, -- What we learned for next time
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
                    FOREIGN KEY (site_id) REFERENCES survey_sites (id)
                )
            `);
            
            // LLM prompt templates and their effectiveness tracking
            db.run(`
                CREATE TABLE IF NOT EXISTS llm_prompt_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    template_name TEXT UNIQUE NOT NULL,
                    template_version TEXT NOT NULL,
                    prompt_category TEXT NOT NULL, -- 'form_analysis', 'field_identification', 'honeypot_detection', etc.
                    prompt_template TEXT NOT NULL, -- The actual prompt template with placeholders
                    expected_response_format JSON, -- What we expect the LLM to return
                    success_rate REAL DEFAULT 0.0,
                    total_uses INTEGER DEFAULT 0,
                    successful_uses INTEGER DEFAULT 0,
                    average_confidence_score REAL DEFAULT 0.0,
                    average_response_time_ms INTEGER DEFAULT 0,
                    last_used DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT
                )
            `);
            
            // LLM response analysis for understanding how well LLM comprehends our requests
            db.run(`
                CREATE TABLE IF NOT EXISTS llm_response_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ai_interaction_id INTEGER NOT NULL,
                    form_session_id INTEGER,
                    analysis_type TEXT NOT NULL, -- 'field_mapping', 'honeypot_detection', 'validation_error', etc.
                    prompt_template_id INTEGER,
                    expected_fields JSON, -- What fields we actually needed to fill
                    llm_identified_fields JSON, -- What fields LLM said to fill
                    missing_fields JSON, -- Fields LLM missed
                    incorrect_fields JSON, -- Fields LLM got wrong
                    extra_fields JSON, -- Fields LLM added that weren't needed
                    honeypot_accuracy JSON, -- How well LLM detected honeypots
                    selector_validity JSON, -- Which selectors actually worked
                    field_type_accuracy JSON, -- How well LLM identified field types
                    comprehension_score REAL DEFAULT 0.0, -- Overall score of LLM understanding
                    response_coherence_score REAL DEFAULT 0.0, -- How well-structured the response was
                    actionability_score REAL DEFAULT 0.0, -- How usable the response was for automation
                    error_analysis JSON, -- Detailed breakdown of what went wrong
                    improvement_suggestions JSON, -- How to improve the prompt
                    human_verification BOOLEAN DEFAULT 0, -- Whether human verified the analysis
                    human_notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions (id),
                    FOREIGN KEY (form_session_id) REFERENCES form_analysis_sessions (id),
                    FOREIGN KEY (prompt_template_id) REFERENCES llm_prompt_templates (id)
                )
            `);
            
            // Prompt optimization tracking for A/B testing different prompts
            db.run(`
                CREATE TABLE IF NOT EXISTS prompt_optimization_experiments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    experiment_name TEXT NOT NULL,
                    experiment_description TEXT,
                    control_prompt_template_id INTEGER NOT NULL,
                    test_prompt_template_id INTEGER NOT NULL,
                    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_date DATETIME,
                    target_metric TEXT NOT NULL, -- 'success_rate', 'accuracy', 'speed', etc.
                    control_metric_value REAL,
                    test_metric_value REAL,
                    statistical_significance REAL,
                    sample_size INTEGER DEFAULT 0,
                    experiment_status TEXT DEFAULT 'running', -- 'running', 'completed', 'paused'
                    winner TEXT, -- 'control', 'test', 'inconclusive'
                    conclusions TEXT,
                    next_actions JSON,
                    FOREIGN KEY (control_prompt_template_id) REFERENCES llm_prompt_templates (id),
                    FOREIGN KEY (test_prompt_template_id) REFERENCES llm_prompt_templates (id)
                )
            `);
            
            // Field identification accuracy tracking
            db.run(`
                CREATE TABLE IF NOT EXISTS field_identification_accuracy (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    form_session_id INTEGER NOT NULL,
                    field_selector TEXT NOT NULL,
                    field_html TEXT, -- The actual HTML of the field
                    field_attributes JSON, -- All attributes (name, id, class, type, etc.)
                    surrounding_context TEXT, -- HTML context around the field
                    llm_identified_as TEXT, -- What LLM said this field was for
                    llm_confidence REAL DEFAULT 0.0,
                    actual_field_purpose TEXT, -- What we determined it actually was
                    was_honeypot BOOLEAN DEFAULT 0,
                    llm_detected_honeypot BOOLEAN DEFAULT 0,
                    honeypot_detection_correct BOOLEAN DEFAULT 0,
                    field_filled_successfully BOOLEAN DEFAULT 0,
                    selector_worked BOOLEAN DEFAULT 0,
                    validation_error TEXT, -- If filling this field caused validation errors
                    llm_reasoning TEXT, -- LLM's explanation for its decision
                    accuracy_score REAL DEFAULT 0.0, -- 0-1 score for this field identification
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (form_session_id) REFERENCES form_analysis_sessions (id)
                )
            `);
            
            // LLM comprehension issues tracking for specific problem patterns
            db.run(`
                CREATE TABLE IF NOT EXISTS llm_comprehension_issues (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ai_interaction_id INTEGER NOT NULL,
                    issue_category TEXT NOT NULL, -- 'missing_field', 'wrong_selector', 'honeypot_miss', etc.
                    issue_description TEXT NOT NULL,
                    html_pattern TEXT, -- The HTML pattern that confused the LLM
                    prompt_section TEXT, -- Which part of the prompt may have caused confusion
                    expected_behavior TEXT, -- What we expected LLM to do
                    actual_behavior TEXT, -- What LLM actually did
                    impact_severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
                    frequency_count INTEGER DEFAULT 1, -- How often we've seen this issue
                    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    resolution_status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved'
                    resolution_approach TEXT, -- How we plan to fix this
                    test_prompt_variations JSON, -- Different prompts to test
                    resolution_notes TEXT,
                    FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions (id)
                )
            `);
            
            // Prompt effectiveness metrics for continuous improvement
            db.run(`
                CREATE TABLE IF NOT EXISTS prompt_effectiveness_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_date DATE NOT NULL,
                    prompt_template_id INTEGER NOT NULL,
                    total_uses INTEGER DEFAULT 0,
                    successful_field_identifications INTEGER DEFAULT 0,
                    missed_fields INTEGER DEFAULT 0,
                    incorrect_selectors INTEGER DEFAULT 0,
                    honeypot_detection_accuracy REAL DEFAULT 0.0,
                    average_response_time_ms INTEGER DEFAULT 0,
                    average_token_usage INTEGER DEFAULT 0,
                    average_cost_usd REAL DEFAULT 0.0,
                    overall_effectiveness_score REAL DEFAULT 0.0,
                    top_issues JSON, -- Most common problems with this prompt
                    improvement_opportunities JSON, -- Identified areas for enhancement
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (prompt_template_id) REFERENCES llm_prompt_templates (id),
                    UNIQUE(metric_date, prompt_template_id)
                )
            `);
            
            console.log('  ✅ Enhanced LLM tracking tables created');
            resolve();
        });
    });
}

/**
 * Rollback the migration - Remove LLM enhancement tables
 */
async function down(db) {
    console.log('  🗑️ Rolling back LLM tracking enhancements...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Drop new tables
            const tables = [
                'prompt_effectiveness_metrics',
                'llm_comprehension_issues', 
                'field_identification_accuracy',
                'prompt_optimization_experiments',
                'llm_response_analysis',
                'llm_prompt_templates',
                'form_analysis_sessions'
            ];
            
            tables.forEach(table => {
                db.run(`DROP TABLE IF EXISTS ${table}`);
            });
            
            // Remove added columns (SQLite doesn't support DROP COLUMN easily)
            // Note: In production, this would require recreating the table
            console.log('  ⚠️ Column removal requires table recreation in SQLite');
            
            console.log('  ✅ LLM tracking enhancements rolled back');
            resolve();
        });
    });
}

module.exports = { up, down };