-- Migration 001: Complete Schema
-- Creates ALL tables, indexes, and constraints for the poll automation system
-- This migration ensures we have every table that has been used in any database

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Core Email & Registration Tracking Tables
CREATE TABLE IF NOT EXISTS email_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    service TEXT NOT NULL,
    password TEXT,
    inbox_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    verification_attempts INTEGER DEFAULT 0,
    last_verified DATETIME,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS survey_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    name TEXT,
    category TEXT,
    difficulty_level TEXT,
    last_attempt DATETIME,
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    average_completion_time INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER,
    site_url TEXT NOT NULL,
    site_name TEXT,
    success BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_seconds INTEGER,
    user_agent TEXT,
    session_id TEXT,
    FOREIGN KEY (email_id) REFERENCES email_accounts(id)
);

CREATE TABLE IF NOT EXISTS registration_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    duration_ms INTEGER,
    screenshot_path TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
);

CREATE TABLE IF NOT EXISTS form_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    field_selector TEXT NOT NULL,
    field_type TEXT,
    field_name TEXT,
    value_filled TEXT,
    success BOOLEAN DEFAULT FALSE,
    ai_generated BOOLEAN DEFAULT FALSE,
    human_like_delay_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
);

CREATE TABLE IF NOT EXISTS registration_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT,
    answer_provided TEXT,
    ai_reasoning TEXT,
    confidence_score REAL,
    field_selector TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    first_name TEXT,
    last_name TEXT,
    age INTEGER,
    gender TEXT,
    country TEXT,
    education TEXT,
    occupation TEXT,
    income_range TEXT,
    interests TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
);

-- AI & Intelligence Tracking Tables
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    prompt_type TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    response_text TEXT,
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
);

-- Site Intelligence & Countermeasures Tables
CREATE TABLE IF NOT EXISTS site_defenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    defense_type TEXT NOT NULL,
    defense_description TEXT,
    detection_method TEXT,
    bypass_strategy TEXT,
    bypass_success_rate REAL,
    first_detected DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_detected DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

CREATE TABLE IF NOT EXISTS site_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT,
    field_type TEXT,
    frequency INTEGER DEFAULT 1,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    successful_answers INTEGER DEFAULT 0,
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

CREATE TABLE IF NOT EXISTS detection_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    site_id INTEGER,
    event_type TEXT NOT NULL,
    event_description TEXT,
    response_taken TEXT,
    success BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id),
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    measurement_date DATE DEFAULT (date('now')),
    notes TEXT,
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_description TEXT,
    severity TEXT DEFAULT 'info',
    metadata TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Failure Analysis & Learning Tables
CREATE TABLE IF NOT EXISTS failure_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_name TEXT UNIQUE NOT NULL,
    description TEXT,
    site_url TEXT,
    failure_type TEXT,
    reproduction_steps TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failure_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER,
    registration_id INTEGER,
    analysis_type TEXT NOT NULL,
    root_cause TEXT,
    technical_details TEXT,
    impact_assessment TEXT,
    recommendations TEXT,
    confidence_score REAL,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    analyzed_by TEXT DEFAULT 'ai_system',
    FOREIGN KEY (scenario_id) REFERENCES failure_scenarios(id),
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
);

CREATE TABLE IF NOT EXISTS improvement_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    failure_analysis_id INTEGER,
    recommendation_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    description TEXT NOT NULL,
    implementation_effort TEXT,
    expected_impact TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    implemented_at DATETIME,
    FOREIGN KEY (failure_analysis_id) REFERENCES failure_analysis(id)
);

CREATE TABLE IF NOT EXISTS reproduction_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    test_steps TEXT,
    expected_result TEXT,
    actual_result TEXT,
    success BOOLEAN DEFAULT FALSE,
    execution_time_ms INTEGER,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    executed_by TEXT DEFAULT 'automated_system',
    notes TEXT,
    FOREIGN KEY (scenario_id) REFERENCES failure_scenarios(id)
);

CREATE TABLE IF NOT EXISTS feedback_loop_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    measurement_unit TEXT,
    site_url TEXT,
    measurement_context TEXT,
    measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    baseline_value REAL,
    improvement_percentage REAL
);

-- Form Analysis & Intelligence Tables
CREATE TABLE IF NOT EXISTS form_analysis_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    site_url TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    form_structure TEXT,
    field_count INTEGER,
    complexity_score REAL,
    success_probability REAL,
    analysis_duration_ms INTEGER,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
);

-- LLM & AI Analytics Tables
CREATE TABLE IF NOT EXISTS llm_comprehension_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    issue_type TEXT NOT NULL,
    description TEXT NOT NULL,
    prompt_text TEXT,
    expected_response TEXT,
    actual_response TEXT,
    severity TEXT DEFAULT 'medium',
    resolution_status TEXT DEFAULT 'open',
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT UNIQUE NOT NULL,
    template_type TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    success_rate REAL DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    average_response_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    effectiveness_score REAL
);

CREATE TABLE IF NOT EXISTS llm_response_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_interaction_id INTEGER,
    analysis_type TEXT NOT NULL,
    quality_score REAL,
    relevance_score REAL,
    accuracy_score REAL,
    completeness_score REAL,
    issues_identified TEXT,
    improvement_suggestions TEXT,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions(id)
);

-- Advanced Analytics & Intelligence Tables
CREATE TABLE IF NOT EXISTS prompt_effectiveness_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    usage_context TEXT,
    success_rate REAL,
    average_quality_score REAL,
    token_efficiency REAL,
    response_time_ms INTEGER,
    measured_period_start DATE,
    measured_period_end DATE,
    sample_size INTEGER,
    FOREIGN KEY (template_id) REFERENCES llm_prompt_templates(id)
);

CREATE TABLE IF NOT EXISTS prompt_optimization_experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baseline_template_id INTEGER,
    experiment_template_id INTEGER,
    experiment_name TEXT NOT NULL,
    hypothesis TEXT,
    test_group_size INTEGER,
    control_group_size INTEGER,
    improvement_percentage REAL,
    statistical_significance REAL,
    experiment_start DATE,
    experiment_end DATE,
    status TEXT DEFAULT 'running',
    FOREIGN KEY (baseline_template_id) REFERENCES llm_prompt_templates(id),
    FOREIGN KEY (experiment_template_id) REFERENCES llm_prompt_templates(id)
);

CREATE TABLE IF NOT EXISTS field_identification_accuracy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_url TEXT NOT NULL,
    field_selector TEXT NOT NULL,
    predicted_type TEXT,
    actual_type TEXT,
    prediction_confidence REAL,
    accuracy_score REAL,
    llm_reasoning TEXT,
    validation_method TEXT,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cross-iteration Learning Tables
CREATE TABLE IF NOT EXISTS learning_iterations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_number INTEGER NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    sites_tested INTEGER,
    success_rate REAL,
    improvements_identified INTEGER,
    adaptations_made INTEGER,
    knowledge_gained TEXT,
    iteration_summary TEXT
);

CREATE TABLE IF NOT EXISTS cross_iteration_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id INTEGER,
    insight_type TEXT NOT NULL,
    insight_description TEXT NOT NULL,
    confidence_level REAL,
    supporting_evidence TEXT,
    actionable_recommendations TEXT,
    impact_priority TEXT DEFAULT 'medium',
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (iteration_id) REFERENCES learning_iterations(id)
);

CREATE TABLE IF NOT EXISTS learning_pattern_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_frequency INTEGER DEFAULT 1,
    success_correlation REAL,
    context_factors TEXT,
    adaptation_suggestions TEXT,
    pattern_strength REAL,
    last_observed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard & Reporting Tables
CREATE TABLE IF NOT EXISTS site_intelligence_dashboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    intelligence_type TEXT NOT NULL,
    intelligence_value TEXT,
    confidence_score REAL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    trend_direction TEXT,
    importance_weight REAL,
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

CREATE TABLE IF NOT EXISTS recommendation_dashboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_type TEXT NOT NULL,
    recommendation_text TEXT NOT NULL,
    priority_score REAL,
    expected_impact TEXT,
    implementation_complexity TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    target_completion DATE
);

-- Predictive Analytics Tables
CREATE TABLE IF NOT EXISTS predictive_model_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    prediction_accuracy REAL,
    training_data_size INTEGER,
    feature_importance TEXT,
    model_version TEXT,
    last_trained DATETIME,
    performance_metrics TEXT
);

CREATE TABLE IF NOT EXISTS survey_discovery_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    discovery_method TEXT NOT NULL,
    surveys_found INTEGER,
    qualification_rate REAL,
    average_completion_time INTEGER,
    discovery_success_rate REAL,
    last_discovery DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

-- Advanced Intelligence Tables
CREATE TABLE IF NOT EXISTS platform_behavior_intelligence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_type TEXT NOT NULL,
    behavior_pattern TEXT NOT NULL,
    trigger_conditions TEXT,
    response_strategy TEXT,
    success_rate REAL,
    confidence_level REAL,
    intelligence_source TEXT,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_complexity_intelligence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    complexity_type TEXT NOT NULL,
    complexity_score REAL,
    contributing_factors TEXT,
    mitigation_strategies TEXT,
    processing_time_impact INTEGER,
    success_rate_impact REAL,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

-- Adaptive Strategy Tables
CREATE TABLE IF NOT EXISTS adaptive_strategy_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_name TEXT NOT NULL,
    strategy_type TEXT NOT NULL,
    effectiveness_score REAL,
    usage_frequency INTEGER DEFAULT 0,
    success_contexts TEXT,
    failure_contexts TEXT,
    optimization_suggestions TEXT,
    last_used DATETIME,
    performance_trend TEXT
);

CREATE TABLE IF NOT EXISTS countermeasure_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    countermeasure_type TEXT NOT NULL,
    detection_confidence REAL,
    bypass_difficulty TEXT,
    bypass_success_rate REAL,
    evolution_tracking TEXT,
    mitigation_strategies TEXT,
    threat_level TEXT,
    last_encountered DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

-- Email Performance & Correlation Tables
CREATE TABLE IF NOT EXISTS email_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER,
    site_id INTEGER,
    registration_success_rate REAL,
    verification_success_rate REAL,
    survey_invitation_rate REAL,
    longevity_days INTEGER,
    performance_score REAL,
    last_performance_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES email_accounts(id),
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

CREATE TABLE IF NOT EXISTS email_site_correlation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER,
    site_id INTEGER,
    relationship_type TEXT NOT NULL,
    correlation_strength REAL,
    interaction_count INTEGER DEFAULT 0,
    success_rate REAL,
    last_interaction DATETIME,
    notes TEXT,
    FOREIGN KEY (email_id) REFERENCES email_accounts(id),
    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
);

-- Learning Intelligence Tables
CREATE TABLE IF NOT EXISTS learning_intelligence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intelligence_type TEXT NOT NULL,
    intelligence_data TEXT NOT NULL,
    confidence_score REAL,
    source_interactions INTEGER,
    validation_status TEXT DEFAULT 'pending',
    practical_value REAL,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_validated DATETIME
);

CREATE TABLE IF NOT EXISTS question_intelligence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_pattern TEXT NOT NULL,
    question_category TEXT,
    optimal_response_strategy TEXT,
    success_rate REAL,
    context_factors TEXT,
    response_examples TEXT,
    intelligence_confidence REAL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent & Prompt Analytics Tables
CREATE TABLE IF NOT EXISTS agent_prompt_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type TEXT NOT NULL,
    prompt_category TEXT NOT NULL,
    prompt_effectiveness REAL,
    response_quality_score REAL,
    usage_frequency INTEGER DEFAULT 0,
    optimization_potential REAL,
    best_practices TEXT,
    common_issues TEXT,
    last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ALL PERFORMANCE INDEXES
-- Primary performance indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_id ON registration_attempts(email_id);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_site_url ON registration_attempts(site_url);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_success ON registration_attempts(success);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_started_at ON registration_attempts(started_at);

CREATE INDEX IF NOT EXISTS idx_registration_steps_registration_id ON registration_steps(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_steps_success ON registration_steps(success);
CREATE INDEX IF NOT EXISTS idx_registration_steps_step_order ON registration_steps(step_order);

CREATE INDEX IF NOT EXISTS idx_form_interactions_registration_id ON form_interactions(registration_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_success ON form_interactions(success);
CREATE INDEX IF NOT EXISTS idx_form_interactions_field_type ON form_interactions(field_type);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_registration_id ON ai_interactions(registration_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_prompt_type ON ai_interactions(prompt_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_success ON ai_interactions(success);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_timestamp ON ai_interactions(timestamp);

CREATE INDEX IF NOT EXISTS idx_site_defenses_site_id ON site_defenses(site_id);
CREATE INDEX IF NOT EXISTS idx_site_defenses_defense_type ON site_defenses(defense_type);

CREATE INDEX IF NOT EXISTS idx_detection_events_site_id ON detection_events(site_id);
CREATE INDEX IF NOT EXISTS idx_detection_events_registration_id ON detection_events(registration_id);
CREATE INDEX IF NOT EXISTS idx_detection_events_event_type ON detection_events(event_type);
CREATE INDEX IF NOT EXISTS idx_detection_events_timestamp ON detection_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_site_id ON performance_metrics(site_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_measurement_date ON performance_metrics(measurement_date);

CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email);
CREATE INDEX IF NOT EXISTS idx_email_accounts_service ON email_accounts(service);
CREATE INDEX IF NOT EXISTS idx_email_accounts_status ON email_accounts(status);
CREATE INDEX IF NOT EXISTS idx_email_accounts_created_at ON email_accounts(created_at);

CREATE INDEX IF NOT EXISTS idx_survey_sites_url ON survey_sites(url);
CREATE INDEX IF NOT EXISTS idx_survey_sites_success_rate ON survey_sites(success_rate);
CREATE INDEX IF NOT EXISTS idx_survey_sites_total_attempts ON survey_sites(total_attempts);

CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp);

-- Failure analysis indexes
CREATE INDEX IF NOT EXISTS idx_failure_scenarios_site_url ON failure_scenarios(site_url);
CREATE INDEX IF NOT EXISTS idx_failure_scenarios_failure_type ON failure_scenarios(failure_type);
CREATE INDEX IF NOT EXISTS idx_failure_scenarios_status ON failure_scenarios(status);

CREATE INDEX IF NOT EXISTS idx_failure_analysis_scenario_id ON failure_analysis(scenario_id);
CREATE INDEX IF NOT EXISTS idx_failure_analysis_registration_id ON failure_analysis(registration_id);
CREATE INDEX IF NOT EXISTS idx_failure_analysis_analysis_type ON failure_analysis(analysis_type);

-- Learning and intelligence indexes
CREATE INDEX IF NOT EXISTS idx_learning_iterations_iteration_number ON learning_iterations(iteration_number);
CREATE INDEX IF NOT EXISTS idx_cross_iteration_insights_iteration_id ON cross_iteration_insights(iteration_id);
CREATE INDEX IF NOT EXISTS idx_learning_pattern_analytics_pattern_type ON learning_pattern_analytics(pattern_type);

-- LLM and AI indexes
CREATE INDEX IF NOT EXISTS idx_llm_prompt_templates_template_type ON llm_prompt_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_templates_success_rate ON llm_prompt_templates(success_rate);
CREATE INDEX IF NOT EXISTS idx_llm_response_analysis_ai_interaction_id ON llm_response_analysis(ai_interaction_id);

-- Email correlation indexes
CREATE INDEX IF NOT EXISTS idx_email_site_correlation_email_id ON email_site_correlation(email_id);
CREATE INDEX IF NOT EXISTS idx_email_site_correlation_site_id ON email_site_correlation(site_id);
CREATE INDEX IF NOT EXISTS idx_email_performance_email_id ON email_performance(email_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_site ON registration_attempts(email_id, site_url);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_success_site ON registration_attempts(success, site_url);
CREATE INDEX IF NOT EXISTS idx_form_interactions_reg_field ON form_interactions(registration_id, field_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_reg_type ON ai_interactions(registration_id, prompt_type);

-- Time-based composite indexes
CREATE INDEX IF NOT EXISTS idx_registration_attempts_date_success ON registration_attempts(date(started_at), success);
CREATE INDEX IF NOT EXISTS idx_system_events_date_type ON system_events(date(timestamp), event_type);
CREATE INDEX IF NOT EXISTS idx_detection_events_date_site ON detection_events(date(timestamp), site_id);