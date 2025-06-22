/**
 * Feedback Loop Database Setup
 * Enhanced schema for intelligent failure analysis and continuous improvement
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function setupFeedbackLoopDatabase(dbPath = './data/polls.db') {
    console.log('🧠 Setting up Intelligent Feedback Loop Database...');
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log('📊 Connected to SQLite database');
            
            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON', (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                setupTables();
            });
        });
        
        function setupTables() {
            try {
        
        // 1. Failure Scenarios - Complete failure capture with reproduction context
        console.log('📸 Creating failure_scenarios table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS failure_scenarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER REFERENCES registration_attempts(id),
                scenario_hash TEXT UNIQUE,
                failure_type TEXT NOT NULL CHECK(failure_type IN ('technical', 'anti_bot', 'logic', 'site_change', 'network', 'timeout', 'captcha', 'honeypot')),
                severity_level INTEGER NOT NULL CHECK(severity_level BETWEEN 1 AND 5),
                first_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                occurrence_count INTEGER DEFAULT 1,
                site_id INTEGER REFERENCES survey_sites(id),
                email_id INTEGER REFERENCES email_accounts(id),
                
                -- Reproduction Context
                reproduction_recipe TEXT, -- JSON with exact steps to recreate
                page_snapshot TEXT, -- HTML at failure point
                page_screenshot_path TEXT, -- Screenshot file path
                browser_state TEXT, -- JSON: cookies, localStorage, sessionStorage
                automation_state TEXT, -- JSON: current step, attempted actions, selector chains
                llm_interaction_chain TEXT, -- JSON: all prompts/responses leading to failure
                defense_context TEXT, -- JSON: active countermeasures detected
                environment_data TEXT, -- JSON: browser, IP, user agent, fingerprint
                
                -- Error Details
                error_message TEXT,
                error_stack TEXT,
                error_code TEXT,
                failed_selector TEXT,
                failed_action TEXT,
                timeout_duration INTEGER,
                
                -- Context
                page_url TEXT,
                page_title TEXT,
                step_number INTEGER,
                total_steps INTEGER,
                time_to_failure_ms INTEGER,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                resolution_notes TEXT
            )
        `);
        
        // 2. Failure Analysis - LLM-powered root cause analysis
        console.log('🔍 Creating failure_analysis table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS failure_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_id INTEGER NOT NULL REFERENCES failure_scenarios(id),
                analysis_version TEXT DEFAULT 'v1.0',
                
                -- Root Cause Analysis
                root_cause_category TEXT NOT NULL CHECK(root_cause_category IN (
                    'selector_outdated', 'timing_issue', 'anti_bot_detection', 
                    'site_structure_change', 'logic_error', 'network_failure',
                    'captcha_challenge', 'honeypot_triggered', 'rate_limiting',
                    'javascript_error', 'authentication_required', 'unknown'
                )),
                root_cause_description TEXT NOT NULL,
                confidence_score REAL NOT NULL CHECK(confidence_score BETWEEN 0.0 AND 1.0),
                
                -- Pattern Recognition
                similar_failures TEXT, -- JSON array of related scenario IDs
                pattern_insights TEXT, -- JSON with cross-failure patterns
                failure_frequency_trend TEXT, -- 'increasing', 'stable', 'decreasing'
                affected_site_types TEXT, -- JSON array of site categories
                
                -- Impact Assessment
                impact_assessment TEXT, -- JSON: severity, scope, affected_users
                business_impact_score REAL CHECK(business_impact_score BETWEEN 0.0 AND 1.0),
                technical_debt_score REAL CHECK(technical_debt_score BETWEEN 0.0 AND 1.0),
                
                -- LLM Analysis Details
                llm_analysis_prompt TEXT NOT NULL,
                llm_analysis_response TEXT NOT NULL,
                llm_model_used TEXT DEFAULT 'gpt-4',
                analysis_tokens_used INTEGER,
                analysis_cost_usd REAL,
                analysis_duration_ms INTEGER,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                analyst_type TEXT DEFAULT 'llm_automated',
                review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'reviewed', 'approved', 'rejected')),
                reviewer_notes TEXT
            )
        `);
        
        // 3. Improvement Recommendations - Actionable fix suggestions
        console.log('💡 Creating improvement_recommendations table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS improvement_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id INTEGER NOT NULL REFERENCES failure_analysis(id),
                scenario_id INTEGER NOT NULL REFERENCES failure_scenarios(id),
                
                -- Recommendation Classification
                recommendation_type TEXT NOT NULL CHECK(recommendation_type IN (
                    'immediate_fix', 'strategic_improvement', 'architecture_change',
                    'configuration_update', 'dependency_upgrade', 'algorithm_enhancement'
                )),
                priority_score INTEGER NOT NULL CHECK(priority_score BETWEEN 1 AND 10),
                effort_estimate TEXT NOT NULL CHECK(effort_estimate IN ('low', 'medium', 'high', 'epic')),
                impact_potential TEXT NOT NULL CHECK(impact_potential IN ('low', 'medium', 'high', 'critical')),
                
                -- Implementation Details
                target_component TEXT NOT NULL, -- Which system component to modify
                target_files TEXT, -- JSON array of specific files
                suggested_changes TEXT NOT NULL, -- Detailed implementation steps
                code_examples TEXT, -- Sample code snippets
                configuration_changes TEXT, -- JSON with config updates
                
                -- Testing Requirements
                test_requirements TEXT, -- How to validate the fix
                test_scenarios TEXT, -- JSON array of test cases
                validation_criteria TEXT, -- Success metrics and acceptance criteria
                regression_risks TEXT, -- Potential side effects
                
                -- Claude Code Integration
                claude_code_prompt TEXT, -- Ready-to-use prompt for Claude Code
                github_issue_template TEXT, -- Formatted issue description
                implementation_checklist TEXT, -- JSON array of implementation steps
                
                -- Tracking
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                implemented_at TIMESTAMP,
                implementation_result TEXT,
                effectiveness_score REAL CHECK(effectiveness_score BETWEEN 0.0 AND 1.0),
                implementation_notes TEXT,
                rollback_instructions TEXT
            )
        `);
        
        // 4. Reproduction Tests - Automated test generation
        console.log('🧪 Creating reproduction_tests table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS reproduction_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_id INTEGER NOT NULL REFERENCES failure_scenarios(id),
                recommendation_id INTEGER REFERENCES improvement_recommendations(id),
                
                -- Test Definition
                test_name TEXT NOT NULL,
                test_type TEXT NOT NULL CHECK(test_type IN (
                    'reproduction', 'regression', 'validation', 'performance', 'integration'
                )),
                test_description TEXT,
                test_category TEXT, -- 'unit', 'integration', 'e2e'
                
                -- Test Implementation
                test_code TEXT NOT NULL, -- Executable test code (JavaScript)
                test_environment TEXT, -- JSON: required environment setup
                test_dependencies TEXT, -- JSON: required packages, services
                test_data TEXT, -- JSON: test data and fixtures
                setup_code TEXT, -- Code to run before test
                teardown_code TEXT, -- Code to run after test
                
                -- Expected Behavior
                expected_behavior TEXT NOT NULL,
                expected_outcome TEXT, -- 'pass', 'fail', 'error'
                success_criteria TEXT, -- JSON: specific success metrics
                failure_criteria TEXT, -- JSON: conditions that indicate failure
                
                -- Execution History
                last_run_result TEXT, -- 'pass', 'fail', 'error', 'timeout'
                last_run_timestamp TIMESTAMP,
                last_run_duration_ms INTEGER,
                last_run_output TEXT,
                last_run_error TEXT,
                
                -- Statistics
                run_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                failure_count INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                avg_runtime_ms REAL,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                test_timeout_ms INTEGER DEFAULT 30000,
                retry_count INTEGER DEFAULT 3
            )
        `);
        
        // 5. Feedback Loop Metrics - System performance tracking
        console.log('📊 Creating feedback_loop_metrics table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS feedback_loop_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_date DATE NOT NULL,
                metric_hour INTEGER CHECK(metric_hour BETWEEN 0 AND 23),
                
                -- Failure Metrics
                total_failures INTEGER DEFAULT 0,
                new_failures INTEGER DEFAULT 0,
                analyzed_failures INTEGER DEFAULT 0,
                resolved_failures INTEGER DEFAULT 0,
                recurring_failures INTEGER DEFAULT 0,
                
                -- Analysis Metrics
                generated_recommendations INTEGER DEFAULT 0,
                high_priority_recommendations INTEGER DEFAULT 0,
                implemented_fixes INTEGER DEFAULT 0,
                successful_fixes INTEGER DEFAULT 0,
                failed_fixes INTEGER DEFAULT 0,
                
                -- Performance Metrics
                success_rate_improvement REAL DEFAULT 0.0,
                avg_analysis_time_ms INTEGER,
                avg_fix_implementation_time_hours REAL,
                avg_test_creation_time_minutes REAL,
                
                -- Learning Metrics
                pattern_recognition_accuracy REAL,
                recommendation_effectiveness REAL,
                system_learning_score REAL CHECK(system_learning_score BETWEEN 0.0 AND 1.0),
                
                -- Categories
                top_failure_categories TEXT, -- JSON array with counts
                top_affected_sites TEXT, -- JSON array with site names and failure counts
                emerging_patterns TEXT, -- JSON array of new patterns detected
                
                -- Cost Metrics
                llm_analysis_cost_usd REAL DEFAULT 0.0,
                total_tokens_used INTEGER DEFAULT 0,
                cost_per_resolution_usd REAL,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 6. Learning Patterns - Pattern recognition and trend analysis
        console.log('🎯 Creating learning_patterns table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS learning_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_name TEXT NOT NULL,
                pattern_type TEXT NOT NULL CHECK(pattern_type IN (
                    'failure_sequence', 'site_evolution', 'countermeasure_trend',
                    'seasonal_pattern', 'success_factor', 'defensive_adaptation'
                )),
                
                -- Pattern Definition
                pattern_description TEXT NOT NULL,
                pattern_signature TEXT, -- JSON representation of the pattern
                detection_rules TEXT, -- JSON with detection logic
                confidence_threshold REAL DEFAULT 0.7,
                
                -- Pattern Data
                supporting_scenarios TEXT, -- JSON array of scenario IDs that match this pattern
                counter_examples TEXT, -- JSON array of scenarios that don't match
                pattern_frequency INTEGER DEFAULT 1,
                first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Impact Analysis
                associated_sites TEXT, -- JSON array of affected site IDs
                success_impact_score REAL, -- How much this pattern affects success rates
                resolution_strategies TEXT, -- JSON array of effective countermeasures
                
                -- Evolution Tracking
                pattern_evolution TEXT, -- JSON with how pattern has changed over time
                prediction_accuracy REAL, -- How well this pattern predicts failures
                adaptation_required BOOLEAN DEFAULT 0,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                creator TEXT DEFAULT 'system',
                validation_status TEXT DEFAULT 'pending'
            )
        `);
        
        // 7. Fix Implementation Tracking
        console.log('🔧 Creating fix_implementations table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS fix_implementations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recommendation_id INTEGER NOT NULL REFERENCES improvement_recommendations(id),
                
                -- Implementation Details
                implementation_method TEXT CHECK(implementation_method IN ('automatic', 'claude_code', 'manual', 'hybrid')),
                implementer TEXT, -- 'system', 'claude_code', 'human_developer'
                implementation_start TIMESTAMP,
                implementation_end TIMESTAMP,
                implementation_duration_hours REAL,
                
                -- Changes Made
                files_modified TEXT, -- JSON array of file paths
                lines_changed INTEGER,
                functions_added INTEGER,
                functions_modified INTEGER,
                configuration_updates TEXT, -- JSON with config changes
                dependencies_added TEXT, -- JSON array of new dependencies
                
                -- Validation Results
                tests_created INTEGER DEFAULT 0,
                tests_passed INTEGER DEFAULT 0,
                tests_failed INTEGER DEFAULT 0,
                validation_score REAL CHECK(validation_score BETWEEN 0.0 AND 1.0),
                
                -- Impact Measurement
                before_success_rate REAL,
                after_success_rate REAL,
                success_rate_delta REAL,
                performance_impact TEXT, -- 'improved', 'neutral', 'degraded'
                
                -- Post-Implementation Monitoring
                monitoring_start TIMESTAMP,
                monitoring_duration_hours INTEGER DEFAULT 168, -- 1 week default
                new_failures_introduced INTEGER DEFAULT 0,
                regressions_detected INTEGER DEFAULT 0,
                
                -- Status
                status TEXT DEFAULT 'planned' CHECK(status IN (
                    'planned', 'in_progress', 'completed', 'failed', 'rolled_back', 'monitoring'
                )),
                success BOOLEAN,
                rollback_reason TEXT,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        `);
        
        // Create Indexes for Performance
        console.log('🚀 Creating performance indexes...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_hash ON failure_scenarios(scenario_hash)',
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_type ON failure_scenarios(failure_type)',
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_occurrence ON failure_scenarios(last_occurrence)',
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_site ON failure_scenarios(site_id)',
            'CREATE INDEX IF NOT EXISTS idx_failure_analysis_scenario ON failure_analysis(scenario_id)',
            'CREATE INDEX IF NOT EXISTS idx_failure_analysis_confidence ON failure_analysis(confidence_score)',
            'CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON improvement_recommendations(priority_score)',
            'CREATE INDEX IF NOT EXISTS idx_recommendations_type ON improvement_recommendations(recommendation_type)',
            'CREATE INDEX IF NOT EXISTS idx_tests_scenario ON reproduction_tests(scenario_id)',
            'CREATE INDEX IF NOT EXISTS idx_tests_type ON reproduction_tests(test_type)',
            'CREATE INDEX IF NOT EXISTS idx_metrics_date ON feedback_loop_metrics(metric_date)',
            'CREATE INDEX IF NOT EXISTS idx_patterns_type ON learning_patterns(pattern_type)',
            'CREATE INDEX IF NOT EXISTS idx_patterns_active ON learning_patterns(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_implementations_recommendation ON fix_implementations(recommendation_id)',
            'CREATE INDEX IF NOT EXISTS idx_implementations_status ON fix_implementations(status)'
        ];
        
        indexes.forEach(index => db.exec(index));
        
        // Create Views for Common Queries
        console.log('🔍 Creating intelligent analysis views...');
        
        // Failure Summary View
        db.exec(`
            CREATE VIEW IF NOT EXISTS failure_summary AS
            SELECT 
                fs.id,
                fs.scenario_hash,
                fs.failure_type,
                fs.severity_level,
                fs.occurrence_count,
                ss.site_name,
                ea.email,
                fa.root_cause_category,
                fa.confidence_score,
                COUNT(ir.id) as recommendation_count,
                COUNT(rt.id) as test_count,
                fs.first_occurrence,
                fs.last_occurrence,
                CASE WHEN fs.resolved_at IS NOT NULL THEN 'resolved' ELSE 'open' END as status
            FROM failure_scenarios fs
            LEFT JOIN survey_sites ss ON fs.site_id = ss.id
            LEFT JOIN email_accounts ea ON fs.email_id = ea.id
            LEFT JOIN failure_analysis fa ON fs.id = fa.scenario_id
            LEFT JOIN improvement_recommendations ir ON fs.id = ir.scenario_id
            LEFT JOIN reproduction_tests rt ON fs.id = rt.scenario_id
            GROUP BY fs.id
        `);
        
        // Learning Intelligence View
        db.exec(`
            CREATE VIEW IF NOT EXISTS learning_intelligence AS
            SELECT 
                DATE(metric_date) as date,
                SUM(total_failures) as daily_failures,
                SUM(analyzed_failures) as daily_analyzed,
                SUM(resolved_failures) as daily_resolved,
                AVG(success_rate_improvement) as avg_improvement,
                AVG(system_learning_score) as learning_score,
                COUNT(DISTINCT metric_date) as data_points
            FROM feedback_loop_metrics
            GROUP BY DATE(metric_date)
            ORDER BY date DESC
        `);
        
        // Recommendation Dashboard View
        db.exec(`
            CREATE VIEW IF NOT EXISTS recommendation_dashboard AS
            SELECT 
                ir.recommendation_type,
                ir.priority_score,
                ir.effort_estimate,
                ir.impact_potential,
                fa.root_cause_category,
                ss.site_name,
                fs.failure_type,
                ir.created_at,
                CASE WHEN ir.implemented_at IS NOT NULL THEN 'implemented' ELSE 'pending' END as status,
                ir.effectiveness_score,
                COUNT(*) OVER (PARTITION BY ir.recommendation_type) as type_count
            FROM improvement_recommendations ir
            JOIN failure_analysis fa ON ir.analysis_id = fa.id
            JOIN failure_scenarios fs ON ir.scenario_id = fs.id
            LEFT JOIN survey_sites ss ON fs.site_id = ss.id
            ORDER BY ir.priority_score DESC, ir.created_at DESC
        `);
        
        console.log('✅ Feedback Loop Database Setup Complete!');
        console.log('📊 New Tables Created:');
        console.log('   🔍 failure_scenarios - Complete failure capture with reproduction context');
        console.log('   🧠 failure_analysis - LLM-powered root cause analysis');
        console.log('   💡 improvement_recommendations - Actionable fix suggestions');
        console.log('   🧪 reproduction_tests - Automated test generation');
        console.log('   📈 feedback_loop_metrics - System performance tracking');
        console.log('   🎯 learning_patterns - Pattern recognition and trends');
        console.log('   🔧 fix_implementations - Implementation tracking');
        console.log('   📋 Intelligent views for analysis and reporting');
        
        resolve(db);
        
            } catch (error) {
                console.error('❌ Error setting up feedback loop database:', error);
                reject(error);
            }
        }
    });
}

module.exports = {
    setupFeedbackLoopDatabase
};