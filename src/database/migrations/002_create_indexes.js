/**
 * Migration: Create Database Indexes
 * Creates indexes for optimal query performance
 * Created: 2025-06-22
 */

/**
 * Apply the migration - Create performance indexes
 */
async function up(db) {
    console.log('  📈 Creating database indexes for performance...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Email accounts indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_email_accounts_service ON email_accounts(service)');
            db.run('CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(is_active)');
            db.run('CREATE INDEX IF NOT EXISTS idx_email_accounts_last_used ON email_accounts(last_used_date)');
            
            // Survey sites indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_survey_sites_domain ON survey_sites(domain)');
            db.run('CREATE INDEX IF NOT EXISTS idx_survey_sites_category ON survey_sites(category)');
            db.run('CREATE INDEX IF NOT EXISTS idx_survey_sites_active ON survey_sites(is_active)');
            db.run('CREATE INDEX IF NOT EXISTS idx_survey_sites_success_rate ON survey_sites(success_rate)');
            
            // Registration attempts indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_attempts_site_email ON registration_attempts(site_id, email_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_attempts_success ON registration_attempts(success)');
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_attempts_date ON registration_attempts(attempt_date)');
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_attempts_session ON registration_attempts(session_id)');
            
            // Registration steps indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_steps_registration ON registration_steps(registration_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_steps_status ON registration_steps(step_status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_steps_step_number ON registration_steps(step_number)');
            
            // Form interactions indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_form_interactions_registration ON form_interactions(registration_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_form_interactions_field_type ON form_interactions(field_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_form_interactions_honeypot ON form_interactions(is_honeypot)');
            db.run('CREATE INDEX IF NOT EXISTS idx_form_interactions_success ON form_interactions(interaction_success)');
            
            // Registration questions indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_questions_registration ON registration_questions(registration_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_questions_type ON registration_questions(question_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_questions_required ON registration_questions(is_required)');
            
            // User profiles indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active)');
            db.run('CREATE INDEX IF NOT EXISTS idx_user_profiles_success_rate ON user_profiles(success_rate)');
            
            // AI interactions indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_ai_interactions_registration ON ai_interactions(registration_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON ai_interactions(interaction_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_ai_interactions_model ON ai_interactions(model_used)');
            db.run('CREATE INDEX IF NOT EXISTS idx_ai_interactions_timestamp ON ai_interactions(timestamp)');
            db.run('CREATE INDEX IF NOT EXISTS idx_ai_interactions_cost ON ai_interactions(cost_usd)');
            
            // Failure scenarios indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_scenarios_hash ON failure_scenarios(scenario_hash)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_scenarios_type ON failure_scenarios(failure_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_scenarios_site ON failure_scenarios(site_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_scenarios_severity ON failure_scenarios(severity_level)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_scenarios_occurrence ON failure_scenarios(last_occurrence)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_scenarios_resolved ON failure_scenarios(is_resolved)');
            
            // Failure analysis indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_analysis_scenario ON failure_analysis(scenario_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_analysis_category ON failure_analysis(root_cause_category)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_analysis_confidence ON failure_analysis(confidence_score)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_analysis_created ON failure_analysis(created_at)');
            
            // Improvement recommendations indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_analysis ON improvement_recommendations(analysis_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_priority ON improvement_recommendations(priority_score)');
            db.run('CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_status ON improvement_recommendations(status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_type ON improvement_recommendations(recommendation_type)');
            
            // Reproduction tests indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_reproduction_tests_scenario ON reproduction_tests(scenario_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_reproduction_tests_type ON reproduction_tests(test_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_reproduction_tests_active ON reproduction_tests(is_active)');
            db.run('CREATE INDEX IF NOT EXISTS idx_reproduction_tests_last_run ON reproduction_tests(last_run_at)');
            
            // Feedback loop metrics indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_feedback_loop_metrics_date ON feedback_loop_metrics(metric_date)');
            db.run('CREATE INDEX IF NOT EXISTS idx_feedback_loop_metrics_success_rate ON feedback_loop_metrics(average_success_rate)');
            db.run('CREATE INDEX IF NOT EXISTS idx_feedback_loop_metrics_learning ON feedback_loop_metrics(system_learning_score)');
            
            // Site defenses indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_site_defenses_site ON site_defenses(site_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_site_defenses_type ON site_defenses(defense_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_site_defenses_active ON site_defenses(is_active)');
            db.run('CREATE INDEX IF NOT EXISTS idx_site_defenses_difficulty ON site_defenses(difficulty_score)');
            
            // Site questions indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_site_questions_site ON site_questions(site_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_site_questions_hash ON site_questions(question_hash)');
            db.run('CREATE INDEX IF NOT EXISTS idx_site_questions_category ON site_questions(question_category)');
            db.run('CREATE INDEX IF NOT EXISTS idx_site_questions_frequency ON site_questions(appearance_frequency)');
            
            // Detection events indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_detection_events_registration ON detection_events(registration_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_detection_events_site ON detection_events(site_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_detection_events_type ON detection_events(event_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_detection_events_timestamp ON detection_events(event_timestamp)');
            
            // System events indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_system_events_category ON system_events(event_category)');
            db.run('CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity)');
            db.run('CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp)');
            db.run('CREATE INDEX IF NOT EXISTS idx_system_events_session ON system_events(session_id)');
            
            // Composite indexes for common query patterns
            db.run('CREATE INDEX IF NOT EXISTS idx_registration_attempts_site_success_date ON registration_attempts(site_id, success, attempt_date)');
            db.run('CREATE INDEX IF NOT EXISTS idx_failure_scenarios_site_type_occurrence ON failure_scenarios(site_id, failure_type, last_occurrence)');
            db.run('CREATE INDEX IF NOT EXISTS idx_ai_interactions_type_timestamp ON ai_interactions(interaction_type, timestamp)');
            db.run('CREATE INDEX IF NOT EXISTS idx_form_interactions_type_success ON form_interactions(field_type, interaction_success)');
            
            console.log('  ✅ Created all performance indexes');
            resolve();
        });
    });
}

/**
 * Rollback the migration - Drop all indexes
 */
async function down(db) {
    console.log('  🗑️ Dropping all indexes...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Note: SQLite automatically drops indexes when tables are dropped
            // But we can explicitly drop them if needed
            const indexes = [
                'idx_email_accounts_service',
                'idx_email_accounts_active',
                'idx_email_accounts_last_used',
                'idx_survey_sites_domain',
                'idx_survey_sites_category',
                'idx_survey_sites_active',
                'idx_survey_sites_success_rate',
                'idx_registration_attempts_site_email',
                'idx_registration_attempts_success',
                'idx_registration_attempts_date',
                'idx_registration_attempts_session',
                'idx_registration_steps_registration',
                'idx_registration_steps_status',
                'idx_registration_steps_step_number',
                'idx_form_interactions_registration',
                'idx_form_interactions_field_type',
                'idx_form_interactions_honeypot',
                'idx_form_interactions_success',
                'idx_registration_questions_registration',
                'idx_registration_questions_type',
                'idx_registration_questions_required',
                'idx_user_profiles_active',
                'idx_user_profiles_success_rate',
                'idx_ai_interactions_registration',
                'idx_ai_interactions_type',
                'idx_ai_interactions_model',
                'idx_ai_interactions_timestamp',
                'idx_ai_interactions_cost',
                'idx_failure_scenarios_hash',
                'idx_failure_scenarios_type',
                'idx_failure_scenarios_site',
                'idx_failure_scenarios_severity',
                'idx_failure_scenarios_occurrence',
                'idx_failure_scenarios_resolved',
                'idx_failure_analysis_scenario',
                'idx_failure_analysis_category',
                'idx_failure_analysis_confidence',
                'idx_failure_analysis_created',
                'idx_improvement_recommendations_analysis',
                'idx_improvement_recommendations_priority',
                'idx_improvement_recommendations_status',
                'idx_improvement_recommendations_type',
                'idx_reproduction_tests_scenario',
                'idx_reproduction_tests_type',
                'idx_reproduction_tests_active',
                'idx_reproduction_tests_last_run',
                'idx_feedback_loop_metrics_date',
                'idx_feedback_loop_metrics_success_rate',
                'idx_feedback_loop_metrics_learning',
                'idx_site_defenses_site',
                'idx_site_defenses_type',
                'idx_site_defenses_active',
                'idx_site_defenses_difficulty',
                'idx_site_questions_site',
                'idx_site_questions_hash',
                'idx_site_questions_category',
                'idx_site_questions_frequency',
                'idx_detection_events_registration',
                'idx_detection_events_site',
                'idx_detection_events_type',
                'idx_detection_events_timestamp',
                'idx_system_events_type',
                'idx_system_events_category',
                'idx_system_events_severity',
                'idx_system_events_timestamp',
                'idx_system_events_session',
                'idx_registration_attempts_site_success_date',
                'idx_failure_scenarios_site_type_occurrence',
                'idx_ai_interactions_type_timestamp',
                'idx_form_interactions_type_success'
            ];
            
            indexes.forEach(index => {
                db.run(`DROP INDEX IF EXISTS ${index}`);
            });
            
            console.log('  ✅ Dropped all indexes');
            resolve();
        });
    });
}

module.exports = { up, down };