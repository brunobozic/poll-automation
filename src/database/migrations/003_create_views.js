/**
 * Migration: Create Database Views
 * Creates views for complex queries and reporting
 * Created: 2025-06-22
 */

/**
 * Apply the migration - Create analytical views
 */
async function up(db) {
    console.log('  📊 Creating database views for analytics...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Email-Site correlation view for unused emails
            db.run(`
                CREATE VIEW IF NOT EXISTS email_site_correlation AS
                SELECT 
                    ea.id as email_id,
                    ea.email,
                    ea.service as email_provider,
                    ss.id as site_id,
                    ss.name as site_name,
                    ss.url as site_url,
                    COUNT(ra.id) as total_attempts,
                    COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successful_attempts,
                    MAX(ra.attempt_date) as last_attempt_date,
                    CASE 
                        WHEN COUNT(ra.id) = 0 THEN 'unused'
                        WHEN COUNT(CASE WHEN ra.success = 1 THEN 1 END) > 0 THEN 'successful'
                        ELSE 'failed'
                    END as status
                FROM email_accounts ea
                CROSS JOIN survey_sites ss
                LEFT JOIN registration_attempts ra ON ea.id = ra.email_id AND ss.id = ra.site_id
                WHERE ea.is_active = 1 AND ss.is_active = 1
                GROUP BY ea.id, ss.id
            `);
            
            // Failure summary view for quick analysis
            db.run(`
                CREATE VIEW IF NOT EXISTS failure_summary AS
                SELECT 
                    fs.id as scenario_id,
                    fs.failure_type,
                    fs.severity_level,
                    fs.occurrence_count,
                    fs.first_occurrence,
                    fs.last_occurrence,
                    ss.name as site_name,
                    ss.url as site_url,
                    ea.email,
                    fa.root_cause_category,
                    fa.root_cause_description,
                    fa.confidence_score,
                    fs.is_resolved,
                    COUNT(ir.id) as recommendation_count,
                    COUNT(rt.id) as test_case_count
                FROM failure_scenarios fs
                LEFT JOIN survey_sites ss ON fs.site_id = ss.id
                LEFT JOIN email_accounts ea ON fs.email_id = ea.id
                LEFT JOIN failure_analysis fa ON fs.id = fa.scenario_id
                LEFT JOIN improvement_recommendations ir ON fs.id = ir.scenario_id
                LEFT JOIN reproduction_tests rt ON fs.id = rt.scenario_id
                GROUP BY fs.id
            `);
            
            // Site intelligence dashboard view
            db.run(`
                CREATE VIEW IF NOT EXISTS site_intelligence_dashboard AS
                SELECT 
                    ss.id,
                    ss.name,
                    ss.url,
                    ss.category,
                    ss.difficulty_level,
                    ss.success_rate,
                    ss.total_attempts,
                    ss.successful_attempts,
                    ss.last_successful_attempt,
                    COUNT(DISTINCT sd.id) as defense_count,
                    COUNT(DISTINCT sq.id) as unique_questions,
                    COUNT(DISTINCT fs.id) as failure_scenarios,
                    AVG(fs.severity_level) as avg_failure_severity,
                    COUNT(DISTINCT ra.email_id) as unique_emails_used,
                    MAX(ra.attempt_date) as last_activity,
                    CASE 
                        WHEN ss.success_rate >= 0.8 THEN 'easy'
                        WHEN ss.success_rate >= 0.5 THEN 'medium'
                        WHEN ss.success_rate >= 0.2 THEN 'hard'
                        ELSE 'very_hard'
                    END as difficulty_assessment
                FROM survey_sites ss
                LEFT JOIN site_defenses sd ON ss.id = sd.site_id AND sd.is_active = 1
                LEFT JOIN site_questions sq ON ss.id = sq.site_id
                LEFT JOIN failure_scenarios fs ON ss.id = fs.site_id
                LEFT JOIN registration_attempts ra ON ss.id = ra.site_id
                WHERE ss.is_active = 1
                GROUP BY ss.id
            `);
            
            // Learning intelligence view for tracking AI improvement
            db.run(`
                CREATE VIEW IF NOT EXISTS learning_intelligence AS
                SELECT 
                    DATE(ai.timestamp) as date,
                    ai.interaction_type,
                    COUNT(*) as interaction_count,
                    AVG(ai.confidence_score) as avg_confidence,
                    SUM(ai.tokens_used) as total_tokens,
                    SUM(ai.cost_usd) as total_cost,
                    AVG(ai.processing_time_ms) as avg_processing_time,
                    COUNT(CASE WHEN ai.success = 1 THEN 1 END) as successful_interactions,
                    CAST(COUNT(CASE WHEN ai.success = 1 THEN 1 END) AS REAL) / COUNT(*) as success_rate
                FROM ai_interactions ai
                GROUP BY DATE(ai.timestamp), ai.interaction_type
                ORDER BY date DESC, interaction_type
            `);
            
            // Recommendation dashboard view
            db.run(`
                CREATE VIEW IF NOT EXISTS recommendation_dashboard AS
                SELECT 
                    ir.id,
                    ir.recommendation_type,
                    ir.priority_score,
                    ir.status,
                    ir.effort_estimate,
                    ir.impact_potential,
                    ir.target_component,
                    ir.suggested_changes,
                    ir.claude_code_prompt,
                    ir.created_at,
                    ir.implemented_at,
                    fs.failure_type as related_failure_type,
                    ss.name as related_site,
                    fa.confidence_score as analysis_confidence,
                    CASE 
                        WHEN ir.status = 'completed' THEN 0
                        WHEN ir.impact_potential = 'critical' THEN ir.priority_score + 3
                        WHEN ir.impact_potential = 'high' THEN ir.priority_score + 2
                        WHEN ir.impact_potential = 'medium' THEN ir.priority_score + 1
                        ELSE ir.priority_score
                    END as weighted_priority
                FROM improvement_recommendations ir
                JOIN failure_analysis fa ON ir.analysis_id = fa.id
                JOIN failure_scenarios fs ON ir.scenario_id = fs.id
                LEFT JOIN survey_sites ss ON fs.site_id = ss.id
                ORDER BY weighted_priority DESC, ir.created_at ASC
            `);
            
            // Performance metrics view for monitoring system health
            db.run(`
                CREATE VIEW IF NOT EXISTS performance_metrics AS
                SELECT 
                    DATE(ra.attempt_date) as date,
                    COUNT(*) as total_attempts,
                    COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successful_attempts,
                    CAST(COUNT(CASE WHEN ra.success = 1 THEN 1 END) AS REAL) / COUNT(*) as success_rate,
                    AVG(ra.execution_time_ms) as avg_execution_time,
                    COUNT(DISTINCT ra.site_id) as sites_attempted,
                    COUNT(DISTINCT ra.email_id) as emails_used,
                    COUNT(CASE WHEN ra.verification_required = 1 THEN 1 END) as verification_required_count,
                    COUNT(CASE WHEN ra.verification_completed = 1 THEN 1 END) as verification_completed_count,
                    SUM(ai.tokens_used) as ai_tokens_used,
                    SUM(ai.cost_usd) as ai_cost_usd
                FROM registration_attempts ra
                LEFT JOIN ai_interactions ai ON ra.id = ai.registration_id
                GROUP BY DATE(ra.attempt_date)
                ORDER BY date DESC
            `);
            
            // Anti-bot countermeasure analysis view
            db.run(`
                CREATE VIEW IF NOT EXISTS countermeasure_analysis AS
                SELECT 
                    sd.defense_type,
                    sd.difficulty_score,
                    COUNT(DISTINCT sd.site_id) as sites_using_defense,
                    SUM(sd.encounter_count) as total_encounters,
                    AVG(sd.bypass_success_rate) as avg_bypass_rate,
                    COUNT(DISTINCT de.id) as detection_events,
                    ss.name as example_site,
                    MAX(sd.last_encountered) as last_encountered
                FROM site_defenses sd
                LEFT JOIN detection_events de ON sd.site_id = de.site_id 
                    AND de.event_type LIKE '%' || sd.defense_type || '%'
                LEFT JOIN survey_sites ss ON sd.site_id = ss.id
                WHERE sd.is_active = 1
                GROUP BY sd.defense_type, sd.difficulty_score
                ORDER BY total_encounters DESC, avg_bypass_rate ASC
            `);
            
            // Question intelligence view for building answer database
            db.run(`
                CREATE VIEW IF NOT EXISTS question_intelligence AS
                SELECT 
                    sq.question_text,
                    sq.question_category,
                    sq.field_type,
                    sq.is_required,
                    sq.appearance_frequency,
                    COUNT(DISTINCT sq.site_id) as appears_on_sites,
                    COUNT(DISTINCT rq.id) as answer_instances,
                    COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successful_answers,
                    CAST(COUNT(CASE WHEN ra.success = 1 THEN 1 END) AS REAL) / COUNT(DISTINCT rq.id) as answer_success_rate,
                    GROUP_CONCAT(DISTINCT ss.name) as site_names,
                    MAX(sq.last_seen) as last_seen
                FROM site_questions sq
                LEFT JOIN registration_questions rq ON sq.question_hash = 
                    (SELECT SUBSTR(HEX(RANDOMBLOB(16)), 1, 16)) -- Simplified hash matching
                LEFT JOIN registration_attempts ra ON rq.registration_id = ra.id
                LEFT JOIN survey_sites ss ON sq.site_id = ss.id
                GROUP BY sq.question_text, sq.question_category, sq.field_type
                ORDER BY appearance_frequency DESC, answer_success_rate DESC
            `);
            
            // Email performance view for tracking email effectiveness
            db.run(`
                CREATE VIEW IF NOT EXISTS email_performance AS
                SELECT 
                    ea.id,
                    ea.email,
                    ea.service,
                    ea.is_verified,
                    ea.daily_usage_count,
                    ea.last_used_date,
                    COUNT(ra.id) as total_uses,
                    COUNT(CASE WHEN ra.success = 1 THEN 1 END) as successful_uses,
                    CAST(COUNT(CASE WHEN ra.success = 1 THEN 1 END) AS REAL) / 
                        NULLIF(COUNT(ra.id), 0) as success_rate,
                    COUNT(DISTINCT ra.site_id) as sites_used_on,
                    AVG(ra.execution_time_ms) as avg_execution_time,
                    MAX(ra.attempt_date) as last_activity,
                    CASE 
                        WHEN COUNT(ra.id) = 0 THEN 'unused'
                        WHEN CAST(COUNT(CASE WHEN ra.success = 1 THEN 1 END) AS REAL) / COUNT(ra.id) >= 0.8 THEN 'high_performer'
                        WHEN CAST(COUNT(CASE WHEN ra.success = 1 THEN 1 END) AS REAL) / COUNT(ra.id) >= 0.5 THEN 'average_performer'
                        ELSE 'low_performer'
                    END as performance_category
                FROM email_accounts ea
                LEFT JOIN registration_attempts ra ON ea.id = ra.email_id
                WHERE ea.is_active = 1
                GROUP BY ea.id
                ORDER BY success_rate DESC, total_uses DESC
            `);
            
            console.log('  ✅ Created all analytical views');
            resolve();
        });
    });
}

/**
 * Rollback the migration - Drop all views
 */
async function down(db) {
    console.log('  🗑️ Dropping all views...');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const views = [
                'email_performance',
                'question_intelligence',
                'countermeasure_analysis',
                'performance_metrics',
                'recommendation_dashboard',
                'learning_intelligence',
                'site_intelligence_dashboard',
                'failure_summary',
                'email_site_correlation'
            ];
            
            views.forEach(view => {
                db.run(`DROP VIEW IF EXISTS ${view}`);
            });
            
            console.log('  ✅ Dropped all views');
            resolve();
        });
    });
}

module.exports = { up, down };