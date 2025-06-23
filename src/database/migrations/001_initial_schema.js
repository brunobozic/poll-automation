/**
 * Migration: Initial Schema
 * Creates all core tables for the poll automation system
 * Created: 2025-06-22
 */

/**
 * Apply the migration - Create all core tables
 */
async function up(db) {
    console.log('  📋 Creating initial database schema...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Core email tracking table
            db.run(`
                CREATE TABLE IF NOT EXISTS email_accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    service TEXT NOT NULL, -- 'guerrilla', 'tempmail', '10minutemail', etc.
                    username TEXT,
                    password TEXT,
                    inbox_url TEXT,
                    service_specific_data JSON, -- Store service-specific access data
                    is_verified BOOLEAN DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    daily_usage_count INTEGER DEFAULT 0,
                    last_used_date DATE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Survey sites information table
            db.run(`
                CREATE TABLE IF NOT EXISTS survey_sites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    url TEXT UNIQUE NOT NULL,
                    domain TEXT NOT NULL,
                    category TEXT DEFAULT 'survey', -- 'survey', 'poll', 'form', etc.
                    difficulty_level INTEGER DEFAULT 3, -- 1-5 scale
                    anti_bot_measures JSON, -- List of detected countermeasures
                    success_rate REAL DEFAULT 0.0,
                    total_attempts INTEGER DEFAULT 0,
                    successful_attempts INTEGER DEFAULT 0,
                    last_successful_attempt DATETIME,
                    site_intelligence JSON, -- Collected intelligence about the site
                    form_structure JSON, -- Analysis of form fields and requirements
                    is_active BOOLEAN DEFAULT 1,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Registration attempts tracking
            db.run(`
                CREATE TABLE IF NOT EXISTS registration_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    email_id INTEGER NOT NULL,
                    attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT 0,
                    error_message TEXT,
                    error_category TEXT, -- 'timeout', 'selector', 'captcha', 'blocked', etc.
                    step_reached INTEGER DEFAULT 0, -- How far we got in the process
                    total_steps INTEGER DEFAULT 0,
                    execution_time_ms INTEGER,
                    user_agent TEXT,
                    proxy_used TEXT,
                    fingerprint_data JSON,
                    automation_metadata JSON, -- Data about the automation run
                    verification_required BOOLEAN DEFAULT 0,
                    verification_completed BOOLEAN DEFAULT 0,
                    verification_method TEXT, -- 'email', 'sms', 'captcha', etc.
                    session_id TEXT, -- Link to automation session
                    FOREIGN KEY (site_id) REFERENCES survey_sites (id),
                    FOREIGN KEY (email_id) REFERENCES email_accounts (id)
                )
            `);
            
            // Detailed step-by-step process logging
            db.run(`
                CREATE TABLE IF NOT EXISTS registration_steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER NOT NULL,
                    step_number INTEGER NOT NULL,
                    step_name TEXT NOT NULL, -- 'navigate', 'fill_form', 'solve_captcha', etc.
                    step_status TEXT NOT NULL, -- 'started', 'completed', 'failed', 'skipped'
                    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_time DATETIME,
                    duration_ms INTEGER,
                    action_details JSON, -- Specific details about what was attempted
                    page_url TEXT,
                    page_title TEXT,
                    screenshot_path TEXT,
                    error_details JSON,
                    ai_reasoning TEXT, -- AI's reasoning for this step
                    retry_count INTEGER DEFAULT 0,
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
                )
            `);
            
            // Form interaction logging for AI learning
            db.run(`
                CREATE TABLE IF NOT EXISTS form_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER NOT NULL,
                    field_selector TEXT NOT NULL,
                    field_type TEXT, -- 'input', 'select', 'checkbox', 'radio', etc.
                    field_name TEXT,
                    field_label TEXT,
                    expected_value TEXT,
                    actual_value TEXT,
                    interaction_type TEXT NOT NULL, -- 'fill', 'click', 'select', etc.
                    interaction_success BOOLEAN DEFAULT 0,
                    is_honeypot BOOLEAN DEFAULT 0, -- AI detected honeypot
                    is_required BOOLEAN DEFAULT 0,
                    validation_error TEXT,
                    ai_confidence REAL DEFAULT 0.0, -- AI confidence in field identification
                    ai_reasoning TEXT, -- Why AI chose this approach
                    retry_count INTEGER DEFAULT 0,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
                )
            `);
            
            // Questions asked during registration for intelligence
            db.run(`
                CREATE TABLE IF NOT EXISTS registration_questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER NOT NULL,
                    question_text TEXT NOT NULL,
                    question_type TEXT, -- 'demographic', 'survey_topic', 'verification', etc.
                    field_name TEXT,
                    answer_provided TEXT,
                    answer_type TEXT, -- 'text', 'select', 'multiple_choice', etc.
                    available_options JSON, -- For select/radio questions
                    is_required BOOLEAN DEFAULT 0,
                    ai_reasoning TEXT, -- AI's reasoning for the answer
                    confidence_score REAL DEFAULT 0.0,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
                )
            `);
            
            // User profiles generated for registrations
            db.run(`
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    profile_name TEXT UNIQUE NOT NULL,
                    demographic_data JSON NOT NULL, -- Age, gender, location, etc.
                    interests JSON, -- Topics of interest for surveys
                    behavioral_pattern TEXT, -- 'cautious', 'eager', 'average', etc.
                    usage_frequency TEXT, -- How often this profile is used
                    success_rate REAL DEFAULT 0.0,
                    total_uses INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // AI/LLM interaction logging for cost and performance tracking
            db.run(`
                CREATE TABLE IF NOT EXISTS ai_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER,
                    interaction_type TEXT NOT NULL, -- 'form_analysis', 'error_analysis', 'question_answering', etc.
                    prompt_text TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    model_used TEXT, -- 'gpt-4', 'gpt-3.5-turbo', etc.
                    tokens_used INTEGER,
                    cost_usd REAL,
                    processing_time_ms INTEGER,
                    confidence_score REAL,
                    success BOOLEAN DEFAULT 1,
                    error_message TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
                )
            `);
            
            // Advanced failure scenario tracking
            db.run(`
                CREATE TABLE IF NOT EXISTS failure_scenarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER,
                    scenario_hash TEXT UNIQUE NOT NULL, -- For deduplication
                    failure_type TEXT NOT NULL, -- 'timeout', 'captcha', 'blocked', etc.
                    severity_level INTEGER DEFAULT 3, -- 1-5 scale
                    site_id INTEGER,
                    email_id INTEGER,
                    occurrence_count INTEGER DEFAULT 1,
                    first_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
                    reproduction_recipe JSON, -- Steps to reproduce the failure
                    page_snapshot TEXT, -- HTML snapshot at failure
                    page_screenshot_path TEXT,
                    browser_state JSON, -- Browser/session state
                    automation_state JSON, -- Our automation state
                    llm_interaction_chain JSON, -- Chain of LLM calls leading to failure
                    defense_context JSON, -- Anti-bot measures encountered
                    environment_data JSON, -- System, network, timing data
                    error_message TEXT,
                    error_stack TEXT,
                    error_code TEXT,
                    failed_selector TEXT,
                    failed_action TEXT,
                    timeout_duration INTEGER,
                    page_url TEXT,
                    page_title TEXT,
                    step_number INTEGER,
                    total_steps INTEGER,
                    time_to_failure_ms INTEGER,
                    is_resolved BOOLEAN DEFAULT 0,
                    resolution_notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
                    FOREIGN KEY (site_id) REFERENCES survey_sites (id),
                    FOREIGN KEY (email_id) REFERENCES email_accounts (id)
                )
            `);
            
            // LLM-powered failure analysis results
            db.run(`
                CREATE TABLE IF NOT EXISTS failure_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario_id INTEGER NOT NULL,
                    root_cause_category TEXT NOT NULL, -- 'selector_outdated', 'timing_issue', etc.
                    root_cause_description TEXT NOT NULL,
                    confidence_score REAL NOT NULL, -- 0.0 to 1.0
                    similar_failures JSON, -- IDs of similar failure scenarios
                    pattern_insights JSON, -- Patterns identified by AI
                    failure_frequency_trend TEXT, -- 'increasing', 'stable', 'decreasing'
                    impact_assessment JSON, -- Severity, scope, business impact
                    llm_analysis_prompt TEXT,
                    llm_analysis_response TEXT,
                    analysis_tokens_used INTEGER,
                    analysis_duration_ms INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (scenario_id) REFERENCES failure_scenarios (id)
                )
            `);
            
            // Improvement recommendations generated from analysis
            db.run(`
                CREATE TABLE IF NOT EXISTS improvement_recommendations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_id INTEGER NOT NULL,
                    scenario_id INTEGER NOT NULL,
                    recommendation_type TEXT NOT NULL, -- 'immediate_fix', 'strategic_improvement', etc.
                    priority_score INTEGER NOT NULL, -- 1-10 scale
                    effort_estimate TEXT NOT NULL, -- 'low', 'medium', 'high'
                    impact_potential TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
                    target_component TEXT, -- Which part of system to improve
                    suggested_changes TEXT NOT NULL,
                    claude_code_prompt TEXT, -- Prompt for Claude Code to implement
                    test_requirements TEXT,
                    validation_criteria TEXT,
                    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
                    implementation_notes TEXT,
                    implemented_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (analysis_id) REFERENCES failure_analysis (id),
                    FOREIGN KEY (scenario_id) REFERENCES failure_scenarios (id)
                )
            `);
            
            // Test cases for validating fixes
            db.run(`
                CREATE TABLE IF NOT EXISTS reproduction_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario_id INTEGER NOT NULL,
                    test_name TEXT NOT NULL,
                    test_type TEXT NOT NULL, -- 'reproduction', 'validation', 'regression'
                    test_code TEXT NOT NULL, -- Playwright test code
                    expected_behavior TEXT,
                    expected_outcome TEXT, -- 'pass', 'fail'
                    last_run_result TEXT, -- 'pass', 'fail', 'error'
                    last_run_at DATETIME,
                    run_count INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (scenario_id) REFERENCES failure_scenarios (id)
                )
            `);
            
            // System performance and learning metrics
            db.run(`
                CREATE TABLE IF NOT EXISTS feedback_loop_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_date DATE UNIQUE NOT NULL,
                    total_registrations INTEGER DEFAULT 0,
                    successful_registrations INTEGER DEFAULT 0,
                    total_failures INTEGER DEFAULT 0,
                    analyzed_failures INTEGER DEFAULT 0,
                    generated_recommendations INTEGER DEFAULT 0,
                    implemented_improvements INTEGER DEFAULT 0,
                    ai_tokens_used INTEGER DEFAULT 0,
                    ai_cost_usd REAL DEFAULT 0.0,
                    average_success_rate REAL DEFAULT 0.0,
                    system_learning_score REAL DEFAULT 0.0, -- How much the system learned
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Site-specific intelligence and countermeasures
            db.run(`
                CREATE TABLE IF NOT EXISTS site_defenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    defense_type TEXT NOT NULL, -- 'captcha', 'rate_limiting', 'fingerprinting', etc.
                    defense_description TEXT,
                    detection_method TEXT, -- How we detected this defense
                    first_detected DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_encountered DATETIME DEFAULT CURRENT_TIMESTAMP,
                    encounter_count INTEGER DEFAULT 1,
                    bypass_success_rate REAL DEFAULT 0.0,
                    bypass_methods JSON, -- Methods that work against this defense
                    difficulty_score INTEGER DEFAULT 3, -- 1-5 scale
                    is_active BOOLEAN DEFAULT 1,
                    notes TEXT,
                    FOREIGN KEY (site_id) REFERENCES survey_sites (id)
                )
            `);
            
            // Repository of all questions seen across sites
            db.run(`
                CREATE TABLE IF NOT EXISTS site_questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    question_text TEXT NOT NULL,
                    question_hash TEXT UNIQUE NOT NULL, -- For deduplication
                    question_category TEXT, -- 'demographic', 'interest', 'screening', etc.
                    field_type TEXT, -- 'text', 'select', 'radio', 'checkbox'
                    available_options JSON, -- For select/radio questions
                    is_required BOOLEAN DEFAULT 0,
                    appearance_frequency INTEGER DEFAULT 1,
                    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    best_answers JSON, -- Successful answers for this question
                    ai_analysis JSON, -- AI analysis of question intent
                    FOREIGN KEY (site_id) REFERENCES survey_sites (id)
                )
            `);
            
            // Real-time detection events
            db.run(`
                CREATE TABLE IF NOT EXISTS detection_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER,
                    site_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL, -- 'captcha_triggered', 'rate_limited', 'blocked', etc.
                    detection_signal TEXT, -- What triggered the detection
                    response_action TEXT, -- How we responded
                    success BOOLEAN DEFAULT 0, -- Did our response work
                    event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    session_data JSON, -- Session state at time of detection
                    countermeasure_used TEXT, -- Which countermeasure we deployed
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
                    FOREIGN KEY (site_id) REFERENCES survey_sites (id)
                )
            `);
            
            // System events and operational logs
            db.run(`
                CREATE TABLE IF NOT EXISTS system_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL, -- 'startup', 'shutdown', 'error', 'warning', etc.
                    event_category TEXT, -- 'database', 'automation', 'ai', 'network', etc.
                    event_message TEXT NOT NULL,
                    event_data JSON, -- Additional structured data
                    severity TEXT DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'
                    source_component TEXT, -- Which component generated the event
                    session_id TEXT, -- Link to automation session if applicable
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            console.log('  ✅ Created all core tables');
            resolve();
        });
    });
}

/**
 * Rollback the migration - Drop all tables
 */
async function down(db) {
    console.log('  🗑️ Dropping all tables...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Drop tables in reverse dependency order
            const tables = [
                'system_events',
                'detection_events',
                'site_questions',
                'site_defenses',
                'feedback_loop_metrics',
                'reproduction_tests',
                'improvement_recommendations',
                'failure_analysis',
                'failure_scenarios',
                'ai_interactions',
                'user_profiles',
                'registration_questions',
                'form_interactions',
                'registration_steps',
                'registration_attempts',
                'survey_sites',
                'email_accounts'
            ];
            
            tables.forEach(table => {
                db.run(`DROP TABLE IF EXISTS ${table}`);
            });
            
            console.log('  ✅ Dropped all tables');
            resolve();
        });
    });
}

module.exports = { up, down };