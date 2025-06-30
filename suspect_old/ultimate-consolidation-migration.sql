-- Ultimate Database Consolidation Migration
-- Generated: 2025-06-24T07:13:19.244Z
-- Consolidates ALL 1250 records from 21 databases

PRAGMA foreign_keys = OFF;


-- Table: email_accounts (51 records)
CREATE TABLE IF NOT EXISTS email_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    service TEXT NOT NULL,
    password TEXT,
    session_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    status TEXT DEFAULT 'active',
    verification_attempts INTEGER DEFAULT 0,
    last_checked DATETIME,
    metadata TEXT,
    notes TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: registration_attempts (62 records)
CREATE TABLE IF NOT EXISTS registration_attempts (
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
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: registration_steps (114 records)
CREATE TABLE IF NOT EXISTS registration_steps (
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
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: form_interactions (38 records)
CREATE TABLE IF NOT EXISTS form_interactions (
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
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: ai_interactions (95 records)
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    step_id INTEGER,
    prompt TEXT NOT NULL,
    response TEXT,
    model_used TEXT NOT NULL,
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    processing_time_ms INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: system_events (239 records)
CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    severity TEXT DEFAULT 'info',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_component TEXT,
    message TEXT,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: performance_metrics (25 records)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: detection_events (13 records)
CREATE TABLE IF NOT EXISTS detection_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    detection_type TEXT NOT NULL,
    severity_level INTEGER NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    countermeasure_applied TEXT,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: registration_questions (56 records)
CREATE TABLE IF NOT EXISTS registration_questions (
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
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: user_profiles (11 records)
CREATE TABLE IF NOT EXISTS user_profiles (
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
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: survey_sites (15 records)
CREATE TABLE IF NOT EXISTS survey_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT NOT NULL,
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
    status TEXT DEFAULT 'active',
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: site_defenses (12 records)
CREATE TABLE IF NOT EXISTS site_defenses (
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
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: site_questions (13 records)
CREATE TABLE IF NOT EXISTS site_questions (
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
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: distilled_site_patterns (0 records)
CREATE TABLE IF NOT EXISTS distilled_site_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    site_domain TEXT,
    platform_type TEXT,
    pattern_data TEXT NOT NULL,
    confidence_score REAL,
    usage_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    last_validated DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    tags TEXT,
    metadata TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: distilled_form_structures (0 records)
CREATE TABLE IF NOT EXISTS distilled_form_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    structure_id TEXT NOT NULL,
    structure_type TEXT NOT NULL,
    complexity_level INTEGER,
    structure_signature TEXT,
    automation_strategy TEXT,
    field_mapping TEXT,
    success_indicators TEXT,
    failure_patterns TEXT,
    optimization_hints TEXT,
    confidence_score REAL,
    usage_frequency INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: distilled_error_solutions (0 records)
CREATE TABLE IF NOT EXISTS distilled_error_solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solution_id TEXT NOT NULL,
    error_pattern TEXT NOT NULL,
    error_category TEXT,
    solution_strategy TEXT NOT NULL,
    success_probability REAL,
    implementation_complexity TEXT,
    prerequisite_conditions TEXT,
    side_effects TEXT,
    validation_method TEXT,
    usage_count INTEGER DEFAULT 0,
    last_successful DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: distilled_success_strategies (0 records)
CREATE TABLE IF NOT EXISTS distilled_success_strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_id TEXT NOT NULL,
    strategy_name TEXT NOT NULL,
    strategy_type TEXT,
    target_context TEXT,
    strategy_steps TEXT NOT NULL,
    success_rate REAL,
    avg_execution_time INTEGER,
    resource_requirements TEXT,
    optimization_level INTEGER,
    applicability_conditions TEXT,
    usage_count INTEGER DEFAULT 0,
    last_updated DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: distilled_platform_behaviors (0 records)
CREATE TABLE IF NOT EXISTS distilled_platform_behaviors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    behavior_id TEXT NOT NULL,
    platform_name TEXT NOT NULL,
    behavior_type TEXT,
    behavior_pattern TEXT NOT NULL,
    trigger_conditions TEXT,
    response_strategy TEXT,
    adaptation_rules TEXT,
    confidence_level REAL,
    observation_count INTEGER DEFAULT 0,
    last_observed DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: distilled_automation_rules (0 records)
CREATE TABLE IF NOT EXISTS distilled_automation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    rule_category TEXT,
    condition_pattern TEXT NOT NULL,
    action_sequence TEXT NOT NULL,
    priority_level INTEGER,
    execution_context TEXT,
    validation_criteria TEXT,
    rollback_strategy TEXT,
    performance_impact TEXT,
    usage_frequency INTEGER DEFAULT 0,
    effectiveness_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: distilled_meta_learning (0 records)
CREATE TABLE IF NOT EXISTS distilled_meta_learning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_id TEXT NOT NULL,
    insight_type TEXT NOT NULL,
    learning_context TEXT,
    insight_description TEXT NOT NULL,
    applicability_scope TEXT,
    implementation_guidance TEXT,
    validation_method TEXT,
    expected_improvement REAL,
    confidence_level REAL,
    discovery_iteration TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: distilled_velocity_optimizations (0 records)
CREATE TABLE IF NOT EXISTS distilled_velocity_optimizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    optimization_id TEXT NOT NULL,
    optimization_name TEXT NOT NULL,
    optimization_type TEXT,
    target_process TEXT,
    optimization_technique TEXT NOT NULL,
    speed_improvement_factor REAL,
    implementation_complexity TEXT,
    resource_overhead TEXT,
    compatibility_requirements TEXT,
    measurement_criteria TEXT,
    validation_results TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    vector_embedding_id TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: knowledge_relationships (0 records)
CREATE TABLE IF NOT EXISTS knowledge_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_knowledge_id TEXT NOT NULL,
    source_knowledge_type TEXT NOT NULL,
    target_knowledge_id TEXT NOT NULL,
    target_knowledge_type TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    relationship_strength REAL,
    relationship_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: knowledge_usage_analytics (0 records)
CREATE TABLE IF NOT EXISTS knowledge_usage_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    usage_context TEXT,
    usage_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN,
    performance_metrics TEXT,
    user_feedback TEXT,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: knowledge_validation (0 records)
CREATE TABLE IF NOT EXISTS knowledge_validation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    validation_type TEXT,
    validation_result BOOLEAN,
    validation_score REAL,
    validation_details TEXT,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validator_info TEXT,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: knowledge_nodes (0 records)
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    knowledge_id TEXT NOT NULL,
    node_data TEXT,
    embedding_vector TEXT,
    centrality_score REAL DEFAULT 0.0,
    importance_score REAL DEFAULT 0.0,
    creation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: learning_paths (0 records)
CREATE TABLE IF NOT EXISTS learning_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path_id TEXT NOT NULL,
    start_node_id TEXT NOT NULL,
    end_node_id TEXT NOT NULL,
    path_nodes TEXT NOT NULL,
    path_length INTEGER NOT NULL,
    learning_efficiency REAL,
    success_rate REAL DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    optimization_level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: pattern_predictions (0 records)
CREATE TABLE IF NOT EXISTS pattern_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL,
    source_pattern TEXT NOT NULL,
    predicted_pattern TEXT NOT NULL,
    prediction_confidence REAL NOT NULL,
    prediction_type TEXT NOT NULL,
    context_requirements TEXT,
    validation_criteria TEXT,
    prediction_accuracy REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME,
    validation_result TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: meta_learning_insights (0 records)
CREATE TABLE IF NOT EXISTS meta_learning_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_id TEXT NOT NULL,
    insight_type TEXT NOT NULL,
    graph_pattern TEXT NOT NULL,
    learning_rule TEXT NOT NULL,
    applicability_conditions TEXT,
    confidence_level REAL NOT NULL,
    impact_assessment TEXT,
    implementation_strategy TEXT,
    validation_results TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: knowledge_clusters (0 records)
CREATE TABLE IF NOT EXISTS knowledge_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id TEXT NOT NULL,
    cluster_type TEXT NOT NULL,
    member_nodes TEXT NOT NULL,
    cluster_centroid TEXT,
    cohesion_score REAL,
    cluster_size INTEGER,
    dominant_patterns TEXT,
    learning_acceleration_factor REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: poll_sites (2 records)
CREATE TABLE IF NOT EXISTS poll_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    login_url TEXT,
    username_selector TEXT,
    password_selector TEXT,
    submit_selector TEXT,
    polls_page_url TEXT,
    poll_selectors TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: credentials (0 records)
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: sessions (0 records)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    cookies TEXT,
    auth_tokens TEXT,
    expires_at TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: polls (0 records)
CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    poll_url TEXT NOT NULL,
    title TEXT,
    questions TEXT,
    answers TEXT,
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: logs (26 records)
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    poll_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    success BOOLEAN,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: poll_sessions (0 records)
CREATE TABLE IF NOT EXISTS poll_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    status TEXT DEFAULT 'started',
    total_questions INTEGER DEFAULT 0,
    answered_questions INTEGER DEFAULT 0,
    trick_questions_detected INTEGER DEFAULT 0,
    error_message TEXT,
    completion_time_seconds INTEGER,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: question_responses (0 records)
CREATE TABLE IF NOT EXISTS question_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_session_id INTEGER NOT NULL,
    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    question_options TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    is_trick_question BOOLEAN DEFAULT FALSE,
    trick_detection_flags TEXT,
    answer_value TEXT,
    answer_confidence REAL,
    answer_reasoning TEXT,
    response_time_ms INTEGER,
    human_response_used BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: poll_errors (0 records)
CREATE TABLE IF NOT EXISTS poll_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_session_id INTEGER,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    page_url TEXT,
    screenshot_path TEXT,
    recovery_attempted BOOLEAN DEFAULT FALSE,
    recovery_successful BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: registration_failures (0 records)
CREATE TABLE IF NOT EXISTS registration_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    step_name TEXT NOT NULL,
    error_message TEXT,
    context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: llm_insights (359 records)
CREATE TABLE IF NOT EXISTS llm_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id INTEGER NOT NULL,
    insight_type TEXT NOT NULL,
    insight_data TEXT,
    analysis_version TEXT DEFAULT '1.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: failure_scenarios (3 records)
CREATE TABLE IF NOT EXISTS failure_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    scenario_hash TEXT,
    failure_type TEXT NOT NULL,
    severity_level INTEGER NOT NULL,
    first_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    occurrence_count INTEGER DEFAULT 1,
    site_id INTEGER,
    email_id INTEGER,
    reproduction_recipe TEXT,
    page_snapshot TEXT,
    page_screenshot_path TEXT,
    browser_state TEXT,
    automation_state TEXT,
    llm_interaction_chain TEXT,
    defense_context TEXT,
    environment_data TEXT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    recovery_source TEXT
);

-- Table: failure_analysis (6 records)
CREATE TABLE IF NOT EXISTS failure_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    analysis_version TEXT DEFAULT 'v1.0',
    root_cause_category TEXT NOT NULL,
    root_cause_description TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    similar_failures TEXT,
    pattern_insights TEXT,
    failure_frequency_trend TEXT,
    affected_site_types TEXT,
    impact_assessment TEXT,
    business_impact_score REAL,
    technical_debt_score REAL,
    llm_analysis_prompt TEXT NOT NULL,
    llm_analysis_response TEXT NOT NULL,
    llm_model_used TEXT DEFAULT 'gpt-4',
    analysis_tokens_used INTEGER,
    analysis_cost_usd REAL,
    analysis_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analyst_type TEXT DEFAULT 'llm_automated',
    review_status TEXT DEFAULT 'pending',
    reviewer_notes TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: improvement_recommendations (6 records)
CREATE TABLE IF NOT EXISTS improvement_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    scenario_id INTEGER NOT NULL,
    recommendation_type TEXT NOT NULL,
    priority_score INTEGER NOT NULL,
    effort_estimate TEXT NOT NULL,
    impact_potential TEXT NOT NULL,
    target_component TEXT NOT NULL,
    target_files TEXT,
    suggested_changes TEXT NOT NULL,
    code_examples TEXT,
    configuration_changes TEXT,
    test_requirements TEXT,
    test_scenarios TEXT,
    validation_criteria TEXT,
    regression_risks TEXT,
    claude_code_prompt TEXT,
    github_issue_template TEXT,
    implementation_checklist TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    implemented_at TIMESTAMP,
    implementation_result TEXT,
    effectiveness_score REAL,
    implementation_notes TEXT,
    rollback_instructions TEXT,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: reproduction_tests (0 records)
CREATE TABLE IF NOT EXISTS reproduction_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    recommendation_id INTEGER,
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL,
    test_description TEXT,
    test_category TEXT,
    test_code TEXT NOT NULL,
    test_environment TEXT,
    test_dependencies TEXT,
    test_data TEXT,
    setup_code TEXT,
    teardown_code TEXT,
    expected_behavior TEXT NOT NULL,
    expected_outcome TEXT,
    success_criteria TEXT,
    failure_criteria TEXT,
    last_run_result TEXT,
    last_run_timestamp TIMESTAMP,
    last_run_duration_ms INTEGER,
    last_run_output TEXT,
    last_run_error TEXT,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_runtime_ms REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    test_timeout_ms INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    recovery_source TEXT
);

-- Table: feedback_loop_metrics (0 records)
CREATE TABLE IF NOT EXISTS feedback_loop_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_date DATE NOT NULL,
    metric_hour INTEGER,
    total_failures INTEGER DEFAULT 0,
    new_failures INTEGER DEFAULT 0,
    analyzed_failures INTEGER DEFAULT 0,
    resolved_failures INTEGER DEFAULT 0,
    recurring_failures INTEGER DEFAULT 0,
    generated_recommendations INTEGER DEFAULT 0,
    high_priority_recommendations INTEGER DEFAULT 0,
    implemented_fixes INTEGER DEFAULT 0,
    successful_fixes INTEGER DEFAULT 0,
    failed_fixes INTEGER DEFAULT 0,
    success_rate_improvement REAL DEFAULT 0.0,
    avg_analysis_time_ms INTEGER,
    avg_fix_implementation_time_hours REAL,
    avg_test_creation_time_minutes REAL,
    pattern_recognition_accuracy REAL,
    recommendation_effectiveness REAL,
    system_learning_score REAL,
    top_failure_categories TEXT,
    top_affected_sites TEXT,
    emerging_patterns TEXT,
    llm_analysis_cost_usd REAL DEFAULT 0.0,
    total_tokens_used INTEGER DEFAULT 0,
    cost_per_resolution_usd REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT
);

-- Table: learning_patterns (2 records)
CREATE TABLE IF NOT EXISTS learning_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_description TEXT NOT NULL,
    pattern_signature TEXT,
    detection_rules TEXT,
    confidence_threshold REAL DEFAULT 0.7,
    supporting_scenarios TEXT,
    counter_examples TEXT,
    pattern_frequency INTEGER DEFAULT 1,
    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    associated_sites TEXT,
    success_impact_score REAL,
    resolution_strategies TEXT,
    pattern_evolution TEXT,
    prediction_accuracy REAL,
    adaptation_required BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    creator TEXT DEFAULT 'system',
    validation_status TEXT DEFAULT 'pending',
    recovery_source TEXT
);

-- Table: fix_implementations (0 records)
CREATE TABLE IF NOT EXISTS fix_implementations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER NOT NULL,
    implementation_method TEXT,
    implementer TEXT,
    implementation_start TIMESTAMP,
    implementation_end TIMESTAMP,
    implementation_duration_hours REAL,
    files_modified TEXT,
    lines_changed INTEGER,
    functions_added INTEGER,
    functions_modified INTEGER,
    configuration_updates TEXT,
    dependencies_added TEXT,
    tests_created INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,
    validation_score REAL,
    before_success_rate REAL,
    after_success_rate REAL,
    success_rate_delta REAL,
    performance_impact TEXT,
    monitoring_start TIMESTAMP,
    monitoring_duration_hours INTEGER DEFAULT 168,
    new_failures_introduced INTEGER DEFAULT 0,
    regressions_detected INTEGER DEFAULT 0,
    status TEXT DEFAULT 'planned',
    success BOOLEAN,
    rollback_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    recovery_source TEXT
);

-- Table: page_analysis (49 records)
CREATE TABLE IF NOT EXISTS page_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    questions_found INTEGER DEFAULT 0,
    question_details TEXT,
    page_structure TEXT,
    total_forms INTEGER DEFAULT 0,
    total_inputs INTEGER DEFAULT 0,
    total_buttons INTEGER DEFAULT 0,
    input_radio INTEGER DEFAULT 0,
    input_checkbox INTEGER DEFAULT 0,
    input_text INTEGER DEFAULT 0,
    input_email INTEGER DEFAULT 0,
    input_select INTEGER DEFAULT 0,
    input_textarea INTEGER DEFAULT 0,
    input_submit INTEGER DEFAULT 0,
    body_text_length INTEGER DEFAULT 0,
    question_marks_count INTEGER DEFAULT 0,
    heading_count INTEGER DEFAULT 0,
    paragraph_count INTEGER DEFAULT 0,
    question_classes INTEGER DEFAULT 0,
    field_classes INTEGER DEFAULT 0,
    survey_classes INTEGER DEFAULT 0,
    poll_classes INTEGER DEFAULT 0,
    form_groups INTEGER DEFAULT 0,
    has_error_messages BOOLEAN DEFAULT FALSE,
    has_loading_elements BOOLEAN DEFAULT FALSE,
    has_success_messages BOOLEAN DEFAULT FALSE,
    has_modal_dialogs BOOLEAN DEFAULT FALSE,
    first_paragraph TEXT,
    first_heading TEXT,
    body_start TEXT,
    visible_forms TEXT,
    analysis_success BOOLEAN DEFAULT TRUE,
    analysis_error TEXT,
    analysis_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: enhanced_failure_analysis (12 records)
CREATE TABLE IF NOT EXISTS enhanced_failure_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT NOT NULL,
    registration_id INTEGER,
    failure_hash TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    failure_category TEXT NOT NULL,
    severity_level TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    explanation TEXT,
    evidence TEXT,
    is_recoverable BOOLEAN,
    is_preventable BOOLEAN,
    blocking_factor TEXT,
    estimated_fix_time TEXT,
    business_impact_score REAL,
    technical_impact_score REAL,
    user_impact_score REAL,
    priority_level TEXT,
    screenshot_path TEXT,
    dom_snapshot_path TEXT,
    console_logs TEXT,
    network_logs TEXT,
    browser_state TEXT,
    reproduction_recipe TEXT,
    analyzer_version TEXT DEFAULT '2.0',
    analysis_duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: failure_recommendations (28 records)
CREATE TABLE IF NOT EXISTS failure_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    effort_level TEXT NOT NULL,
    action_description TEXT NOT NULL,
    implementation_details TEXT,
    expected_outcome TEXT,
    risk_assessment TEXT,
    dependencies TEXT,
    estimated_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: failure_patterns (6 records)
CREATE TABLE IF NOT EXISTS failure_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_hash TEXT NOT NULL,
    pattern_name TEXT NOT NULL,
    pattern_description TEXT,
    failure_category TEXT,
    frequency_count INTEGER DEFAULT 1,
    confidence_score REAL,
    pattern_signature TEXT,
    affected_sites TEXT,
    affected_steps TEXT,
    common_characteristics TEXT,
    first_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    trend_direction TEXT,
    seasonal_factor REAL,
    successful_resolutions INTEGER DEFAULT 0,
    failed_resolutions INTEGER DEFAULT 0,
    avg_resolution_time_hours REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT
);

-- Table: predictive_insights (6 records)
CREATE TABLE IF NOT EXISTS predictive_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_type TEXT NOT NULL,
    prediction_target TEXT NOT NULL,
    confidence_level REAL NOT NULL,
    prediction_data TEXT,
    supporting_evidence TEXT,
    risk_factors TEXT,
    mitigation_strategies TEXT,
    prediction_accuracy REAL,
    validation_date DATETIME,
    outcome_description TEXT,
    model_version TEXT,
    training_data_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: performance_analytics (22 records)
CREATE TABLE IF NOT EXISTS performance_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    site_name TEXT,
    step_name TEXT,
    registration_id INTEGER,
    measurement_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    time_window_start DATETIME,
    time_window_end DATETIME,
    measurement_method TEXT,
    data_source TEXT,
    confidence_level REAL,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: migrations (6 records)
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL,
    version INTEGER NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT NOT NULL,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: form_analysis_sessions (5 records)
CREATE TABLE IF NOT EXISTS form_analysis_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_end DATETIME,
    total_duration_ms INTEGER,
    page_url TEXT NOT NULL,
    page_title TEXT,
    raw_html_hash TEXT,
    raw_html_content TEXT,
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
    llm_analysis_chain JSON,
    final_assessment JSON,
    lessons_learned JSON,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: llm_prompt_templates (1 records)
CREATE TABLE IF NOT EXISTS llm_prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    template_version TEXT NOT NULL,
    prompt_category TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    expected_response_format JSON,
    success_rate REAL DEFAULT 0.0,
    total_uses INTEGER DEFAULT 0,
    successful_uses INTEGER DEFAULT 0,
    average_confidence_score REAL DEFAULT 0.0,
    average_response_time_ms INTEGER DEFAULT 0,
    last_used DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    recovery_source TEXT
);

-- Table: llm_response_analysis (0 records)
CREATE TABLE IF NOT EXISTS llm_response_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_interaction_id INTEGER NOT NULL,
    form_session_id INTEGER,
    analysis_type TEXT NOT NULL,
    prompt_template_id INTEGER,
    expected_fields JSON,
    llm_identified_fields JSON,
    missing_fields JSON,
    incorrect_fields JSON,
    extra_fields JSON,
    honeypot_accuracy JSON,
    selector_validity JSON,
    field_type_accuracy JSON,
    comprehension_score REAL DEFAULT 0.0,
    response_coherence_score REAL DEFAULT 0.0,
    actionability_score REAL DEFAULT 0.0,
    error_analysis JSON,
    improvement_suggestions JSON,
    human_verification BOOLEAN DEFAULT 0,
    human_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: prompt_optimization_experiments (0 records)
CREATE TABLE IF NOT EXISTS prompt_optimization_experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_name TEXT NOT NULL,
    experiment_description TEXT,
    control_prompt_template_id INTEGER NOT NULL,
    test_prompt_template_id INTEGER NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    target_metric TEXT NOT NULL,
    control_metric_value REAL,
    test_metric_value REAL,
    statistical_significance REAL,
    sample_size INTEGER DEFAULT 0,
    experiment_status TEXT DEFAULT 'running',
    winner TEXT,
    conclusions TEXT,
    next_actions JSON,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: field_identification_accuracy (0 records)
CREATE TABLE IF NOT EXISTS field_identification_accuracy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_session_id INTEGER NOT NULL,
    field_selector TEXT NOT NULL,
    field_html TEXT,
    field_attributes JSON,
    surrounding_context TEXT,
    llm_identified_as TEXT,
    llm_confidence REAL DEFAULT 0.0,
    actual_field_purpose TEXT,
    was_honeypot BOOLEAN DEFAULT 0,
    llm_detected_honeypot BOOLEAN DEFAULT 0,
    honeypot_detection_correct BOOLEAN DEFAULT 0,
    field_filled_successfully BOOLEAN DEFAULT 0,
    selector_worked BOOLEAN DEFAULT 0,
    validation_error TEXT,
    llm_reasoning TEXT,
    accuracy_score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: llm_comprehension_issues (0 records)
CREATE TABLE IF NOT EXISTS llm_comprehension_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_interaction_id INTEGER NOT NULL,
    issue_category TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    html_pattern TEXT,
    prompt_section TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    impact_severity TEXT DEFAULT 'medium',
    frequency_count INTEGER DEFAULT 1,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolution_status TEXT DEFAULT 'open',
    resolution_approach TEXT,
    test_prompt_variations JSON,
    resolution_notes TEXT,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Table: prompt_effectiveness_metrics (0 records)
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
    top_issues JSON,
    improvement_opportunities JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: learning_iterations (7 records)
CREATE TABLE IF NOT EXISTS learning_iterations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id TEXT,
    start_time TEXT,
    end_time TEXT,
    phase_completed INTEGER,
    surveys_discovered INTEGER,
    platform_behaviors_analyzed INTEGER,
    form_complexities_mapped INTEGER,
    adaptive_strategies_developed INTEGER,
    success_predictions_made INTEGER,
    adaptations_applied INTEGER,
    total_discoveries INTEGER,
    learning_rate REAL,
    success_rate REAL,
    key_insights TEXT,
    next_focus_areas TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: survey_discovery_analytics (24 records)
CREATE TABLE IF NOT EXISTS survey_discovery_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id TEXT,
    hunting_strategy TEXT,
    target_url TEXT,
    surveys_found INTEGER,
    discovery_time_ms INTEGER,
    success BOOLEAN,
    failure_reason TEXT,
    patterns_identified TEXT,
    confidence_score REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: platform_behavior_intelligence (0 records)
CREATE TABLE IF NOT EXISTS platform_behavior_intelligence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id TEXT,
    platform_name TEXT,
    survey_count INTEGER,
    avg_load_time REAL,
    js_frameworks TEXT,
    security_measures TEXT,
    form_structures TEXT,
    common_patterns TEXT,
    success_indicators TEXT,
    failure_patterns TEXT,
    behavioral_score REAL,
    learning_confidence REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: form_complexity_intelligence (0 records)
CREATE TABLE IF NOT EXISTS form_complexity_intelligence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id TEXT,
    survey_url TEXT,
    platform TEXT,
    complexity_score INTEGER,
    form_count INTEGER,
    input_count INTEGER,
    element_variety INTEGER,
    has_validation BOOLEAN,
    has_multi_page BOOLEAN,
    has_dynamic_content BOOLEAN,
    js_framework TEXT,
    security_features TEXT,
    prediction_difficulty REAL,
    automation_feasibility REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: predictive_model_analytics (0 records)
CREATE TABLE IF NOT EXISTS predictive_model_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id TEXT,
    model_version TEXT,
    feature_count INTEGER,
    features TEXT,
    model_confidence REAL,
    predictions_made INTEGER,
    prediction_accuracy REAL,
    feature_weights TEXT,
    model_recommendations TEXT,
    validation_score REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: adaptive_strategy_analytics (0 records)
CREATE TABLE IF NOT EXISTS adaptive_strategy_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id TEXT,
    strategy_name TEXT,
    strategy_type TEXT,
    target_platform TEXT,
    target_complexity TEXT,
    strategy_description TEXT,
    effectiveness_score REAL,
    usage_count INTEGER,
    success_rate REAL,
    learning_source TEXT,
    optimization_suggestions TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: agent_prompt_analytics (0 records)
CREATE TABLE IF NOT EXISTS agent_prompt_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iteration_id TEXT,
    agent_type TEXT,
    prompt_version TEXT,
    prompt_text TEXT,
    context_provided TEXT,
    response_quality REAL,
    response_accuracy REAL,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    success_indicators TEXT,
    failure_indicators TEXT,
    optimization_suggestions TEXT,
    next_prompt_version TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: learning_pattern_analytics (0 records)
CREATE TABLE IF NOT EXISTS learning_pattern_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT,
    pattern_description TEXT,
    frequency INTEGER,
    confidence_score REAL,
    success_correlation REAL,
    failure_correlation REAL,
    actionable_insights TEXT,
    recommended_adaptations TEXT,
    first_observed TEXT,
    last_observed TEXT,
    trend_direction TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: cross_iteration_insights (2 records)
CREATE TABLE IF NOT EXISTS cross_iteration_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_type TEXT,
    insight_description TEXT,
    supporting_data TEXT,
    confidence_level REAL,
    actionability_score REAL,
    implementation_complexity TEXT,
    expected_impact REAL,
    validation_method TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    recovery_source TEXT,
    updated_at DATETIME
);

-- Table: database_migrations (6 records)
CREATE TABLE IF NOT EXISTS database_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    recovery_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_accounts_created_at ON email_accounts(created_at);
CREATE INDEX IF NOT EXISTS idx_email_accounts_recovery_source ON email_accounts(recovery_source);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_created_at ON registration_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_recovery_source ON registration_attempts(recovery_source);
CREATE INDEX IF NOT EXISTS idx_registration_steps_created_at ON registration_steps(created_at);
CREATE INDEX IF NOT EXISTS idx_registration_steps_recovery_source ON registration_steps(recovery_source);
CREATE INDEX IF NOT EXISTS idx_form_interactions_created_at ON form_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_interactions_recovery_source ON form_interactions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_recovery_source ON ai_interactions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_recovery_source ON system_events(recovery_source);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recovery_source ON performance_metrics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_detection_events_created_at ON detection_events(created_at);
CREATE INDEX IF NOT EXISTS idx_detection_events_recovery_source ON detection_events(recovery_source);
CREATE INDEX IF NOT EXISTS idx_registration_questions_created_at ON registration_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_registration_questions_recovery_source ON registration_questions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_recovery_source ON user_profiles(recovery_source);
CREATE INDEX IF NOT EXISTS idx_survey_sites_created_at ON survey_sites(created_at);
CREATE INDEX IF NOT EXISTS idx_survey_sites_recovery_source ON survey_sites(recovery_source);
CREATE INDEX IF NOT EXISTS idx_site_defenses_created_at ON site_defenses(created_at);
CREATE INDEX IF NOT EXISTS idx_site_defenses_recovery_source ON site_defenses(recovery_source);
CREATE INDEX IF NOT EXISTS idx_site_questions_created_at ON site_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_site_questions_recovery_source ON site_questions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_site_patterns_created_at ON distilled_site_patterns(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_site_patterns_recovery_source ON distilled_site_patterns(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_form_structures_created_at ON distilled_form_structures(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_form_structures_recovery_source ON distilled_form_structures(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_error_solutions_created_at ON distilled_error_solutions(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_error_solutions_recovery_source ON distilled_error_solutions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_success_strategies_created_at ON distilled_success_strategies(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_success_strategies_recovery_source ON distilled_success_strategies(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_platform_behaviors_created_at ON distilled_platform_behaviors(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_platform_behaviors_recovery_source ON distilled_platform_behaviors(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_automation_rules_created_at ON distilled_automation_rules(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_automation_rules_recovery_source ON distilled_automation_rules(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_meta_learning_created_at ON distilled_meta_learning(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_meta_learning_recovery_source ON distilled_meta_learning(recovery_source);
CREATE INDEX IF NOT EXISTS idx_distilled_velocity_optimizations_created_at ON distilled_velocity_optimizations(created_at);
CREATE INDEX IF NOT EXISTS idx_distilled_velocity_optimizations_recovery_source ON distilled_velocity_optimizations(recovery_source);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_created_at ON knowledge_relationships(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_recovery_source ON knowledge_relationships(recovery_source);
CREATE INDEX IF NOT EXISTS idx_knowledge_usage_analytics_created_at ON knowledge_usage_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_usage_analytics_recovery_source ON knowledge_usage_analytics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_knowledge_validation_created_at ON knowledge_validation(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_validation_recovery_source ON knowledge_validation(recovery_source);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_created_at ON knowledge_nodes(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_recovery_source ON knowledge_nodes(recovery_source);
CREATE INDEX IF NOT EXISTS idx_learning_paths_created_at ON learning_paths(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_paths_recovery_source ON learning_paths(recovery_source);
CREATE INDEX IF NOT EXISTS idx_pattern_predictions_created_at ON pattern_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_pattern_predictions_recovery_source ON pattern_predictions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_meta_learning_insights_created_at ON meta_learning_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_meta_learning_insights_recovery_source ON meta_learning_insights(recovery_source);
CREATE INDEX IF NOT EXISTS idx_knowledge_clusters_created_at ON knowledge_clusters(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_clusters_recovery_source ON knowledge_clusters(recovery_source);
CREATE INDEX IF NOT EXISTS idx_poll_sites_created_at ON poll_sites(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_sites_recovery_source ON poll_sites(recovery_source);
CREATE INDEX IF NOT EXISTS idx_credentials_created_at ON credentials(created_at);
CREATE INDEX IF NOT EXISTS idx_credentials_recovery_source ON credentials(recovery_source);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_recovery_source ON sessions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at);
CREATE INDEX IF NOT EXISTS idx_polls_recovery_source ON polls(recovery_source);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_recovery_source ON logs(recovery_source);
CREATE INDEX IF NOT EXISTS idx_poll_sessions_created_at ON poll_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_sessions_recovery_source ON poll_sessions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_question_responses_created_at ON question_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_question_responses_recovery_source ON question_responses(recovery_source);
CREATE INDEX IF NOT EXISTS idx_poll_errors_created_at ON poll_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_errors_recovery_source ON poll_errors(recovery_source);
CREATE INDEX IF NOT EXISTS idx_registration_failures_created_at ON registration_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_registration_failures_recovery_source ON registration_failures(recovery_source);
CREATE INDEX IF NOT EXISTS idx_llm_insights_created_at ON llm_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_insights_recovery_source ON llm_insights(recovery_source);
CREATE INDEX IF NOT EXISTS idx_failure_scenarios_created_at ON failure_scenarios(created_at);
CREATE INDEX IF NOT EXISTS idx_failure_scenarios_recovery_source ON failure_scenarios(recovery_source);
CREATE INDEX IF NOT EXISTS idx_failure_analysis_created_at ON failure_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_failure_analysis_recovery_source ON failure_analysis(recovery_source);
CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_created_at ON improvement_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_recovery_source ON improvement_recommendations(recovery_source);
CREATE INDEX IF NOT EXISTS idx_reproduction_tests_created_at ON reproduction_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_reproduction_tests_recovery_source ON reproduction_tests(recovery_source);
CREATE INDEX IF NOT EXISTS idx_feedback_loop_metrics_created_at ON feedback_loop_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_loop_metrics_recovery_source ON feedback_loop_metrics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_created_at ON learning_patterns(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_recovery_source ON learning_patterns(recovery_source);
CREATE INDEX IF NOT EXISTS idx_fix_implementations_created_at ON fix_implementations(created_at);
CREATE INDEX IF NOT EXISTS idx_fix_implementations_recovery_source ON fix_implementations(recovery_source);
CREATE INDEX IF NOT EXISTS idx_page_analysis_created_at ON page_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_page_analysis_recovery_source ON page_analysis(recovery_source);
CREATE INDEX IF NOT EXISTS idx_enhanced_failure_analysis_created_at ON enhanced_failure_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_failure_analysis_recovery_source ON enhanced_failure_analysis(recovery_source);
CREATE INDEX IF NOT EXISTS idx_failure_recommendations_created_at ON failure_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_failure_recommendations_recovery_source ON failure_recommendations(recovery_source);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_created_at ON failure_patterns(created_at);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_recovery_source ON failure_patterns(recovery_source);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_created_at ON predictive_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_recovery_source ON predictive_insights(recovery_source);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_created_at ON performance_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_recovery_source ON performance_analytics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_migrations_created_at ON migrations(created_at);
CREATE INDEX IF NOT EXISTS idx_migrations_recovery_source ON migrations(recovery_source);
CREATE INDEX IF NOT EXISTS idx_form_analysis_sessions_created_at ON form_analysis_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_analysis_sessions_recovery_source ON form_analysis_sessions(recovery_source);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_templates_created_at ON llm_prompt_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_templates_recovery_source ON llm_prompt_templates(recovery_source);
CREATE INDEX IF NOT EXISTS idx_llm_response_analysis_created_at ON llm_response_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_response_analysis_recovery_source ON llm_response_analysis(recovery_source);
CREATE INDEX IF NOT EXISTS idx_prompt_optimization_experiments_created_at ON prompt_optimization_experiments(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_optimization_experiments_recovery_source ON prompt_optimization_experiments(recovery_source);
CREATE INDEX IF NOT EXISTS idx_field_identification_accuracy_created_at ON field_identification_accuracy(created_at);
CREATE INDEX IF NOT EXISTS idx_field_identification_accuracy_recovery_source ON field_identification_accuracy(recovery_source);
CREATE INDEX IF NOT EXISTS idx_llm_comprehension_issues_created_at ON llm_comprehension_issues(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_comprehension_issues_recovery_source ON llm_comprehension_issues(recovery_source);
CREATE INDEX IF NOT EXISTS idx_prompt_effectiveness_metrics_created_at ON prompt_effectiveness_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_effectiveness_metrics_recovery_source ON prompt_effectiveness_metrics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_learning_iterations_created_at ON learning_iterations(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_iterations_recovery_source ON learning_iterations(recovery_source);
CREATE INDEX IF NOT EXISTS idx_survey_discovery_analytics_created_at ON survey_discovery_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_survey_discovery_analytics_recovery_source ON survey_discovery_analytics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_platform_behavior_intelligence_created_at ON platform_behavior_intelligence(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_behavior_intelligence_recovery_source ON platform_behavior_intelligence(recovery_source);
CREATE INDEX IF NOT EXISTS idx_form_complexity_intelligence_created_at ON form_complexity_intelligence(created_at);
CREATE INDEX IF NOT EXISTS idx_form_complexity_intelligence_recovery_source ON form_complexity_intelligence(recovery_source);
CREATE INDEX IF NOT EXISTS idx_predictive_model_analytics_created_at ON predictive_model_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_predictive_model_analytics_recovery_source ON predictive_model_analytics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_adaptive_strategy_analytics_created_at ON adaptive_strategy_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_adaptive_strategy_analytics_recovery_source ON adaptive_strategy_analytics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_analytics_created_at ON agent_prompt_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_analytics_recovery_source ON agent_prompt_analytics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_learning_pattern_analytics_created_at ON learning_pattern_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_pattern_analytics_recovery_source ON learning_pattern_analytics(recovery_source);
CREATE INDEX IF NOT EXISTS idx_cross_iteration_insights_created_at ON cross_iteration_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_cross_iteration_insights_recovery_source ON cross_iteration_insights(recovery_source);
CREATE INDEX IF NOT EXISTS idx_database_migrations_created_at ON database_migrations(created_at);
CREATE INDEX IF NOT EXISTS idx_database_migrations_recovery_source ON database_migrations(recovery_source);

PRAGMA foreign_keys = ON;
