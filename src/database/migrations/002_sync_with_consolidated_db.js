/**
 * Migration 002: Sync with Consolidated Database
 * Adds ALL missing tables found in the consolidated database
 * Ensures 100% alignment between migrations and actual database structure
 */

module.exports = {
    name: '002_sync_with_consolidated_db',
    description: 'Add all missing tables to achieve 100% alignment with consolidated database',
    
    async up(db) {
        console.log('🔧 Syncing migration with consolidated database structure...');
        
        // Disable foreign keys during schema creation
        await this.run(db, 'PRAGMA foreign_keys = OFF');
        
        try {
            // Add missing tables that exist in consolidated DB but not in migration
            await this.createMissingTables(db);
            
        } finally {
            // Re-enable foreign keys
            await this.run(db, 'PRAGMA foreign_keys = ON');
        }
        
        console.log('✅ Migration synced with consolidated database');
    },
    
    async createMissingTables(db) {
        console.log('📋 Creating missing tables...');
        
        // learning_patterns - Learning pattern analytics
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS learning_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_id TEXT NOT NULL,
                pattern_type TEXT NOT NULL,
                pattern_description TEXT,
                confidence_score REAL,
                frequency INTEGER DEFAULT 1,
                success_rate REAL,
                last_observed DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        `);
        
        // llm_comprehension_issues - LLM comprehension tracking
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS llm_comprehension_issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ai_interaction_id INTEGER,
                issue_type TEXT NOT NULL,
                issue_description TEXT NOT NULL,
                prompt_context TEXT,
                response_context TEXT,
                severity_level INTEGER DEFAULT 1,
                resolution_status TEXT DEFAULT 'open',
                resolution_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME,
                FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions(id)
            )
        `);
        
        // llm_insights - Core LLM analysis insights
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS llm_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_type TEXT NOT NULL,
                insight_category TEXT,
                insight_description TEXT NOT NULL,
                confidence_score REAL,
                evidence TEXT,
                source_data TEXT,
                actionable_recommendations TEXT,
                impact_assessment TEXT,
                validation_status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata JSON
            )
        `);
        
        // logs - System operation logs
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_level TEXT NOT NULL,
                log_message TEXT NOT NULL,
                log_source TEXT,
                context_data JSON,
                error_details TEXT,
                stack_trace TEXT,
                session_id TEXT,
                user_agent TEXT,
                ip_address TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                correlation_id TEXT
            )
        `);
        
        // migrations - Migration tracking (system table)
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT UNIQUE NOT NULL,
                migration_version TEXT,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                success BOOLEAN DEFAULT TRUE,
                error_message TEXT,
                checksum TEXT
            )
        `);
        
        // page_analysis - Web page analysis results
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS page_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                page_title TEXT,
                analysis_type TEXT NOT NULL,
                analysis_results JSON NOT NULL,
                page_hash TEXT,
                form_count INTEGER DEFAULT 0,
                input_count INTEGER DEFAULT 0,
                complexity_score REAL,
                automation_feasibility REAL,
                honeypot_indicators JSON,
                security_features JSON,
                javascript_frameworks JSON,
                analysis_duration_ms INTEGER,
                analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                analyzer_version TEXT
            )
        `);
        
        // performance_analytics - Performance metrics and analytics
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS performance_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metric_unit TEXT,
                measurement_context TEXT,
                tags JSON,
                measurement_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                aggregation_period TEXT,
                site_id INTEGER,
                registration_id INTEGER,
                session_id TEXT,
                FOREIGN KEY (site_id) REFERENCES survey_sites(id),
                FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
            )
        `);
        
        // platform_behavior_intelligence - Platform-specific behavior analysis
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS platform_behavior_intelligence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform_name TEXT NOT NULL,
                behavior_type TEXT NOT NULL,
                behavior_signature TEXT NOT NULL,
                detection_method TEXT,
                confidence_level REAL,
                adaptation_strategy TEXT,
                success_rate REAL,
                observation_count INTEGER DEFAULT 1,
                first_observed DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_observed DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                metadata JSON
            )
        `);
        
        // poll_sites - Poll/survey site registry
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS poll_sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                name TEXT,
                platform_type TEXT,
                status TEXT DEFAULT 'active',
                difficulty_level INTEGER,
                success_rate REAL DEFAULT 0.0,
                total_attempts INTEGER DEFAULT 0,
                successful_attempts INTEGER DEFAULT 0,
                last_attempt DATETIME,
                registration_url TEXT,
                login_url TEXT,
                notes TEXT,
                metadata JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // predictive_insights - AI-generated predictive insights
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS predictive_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_id TEXT NOT NULL,
                prediction_type TEXT NOT NULL,
                prediction_description TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                prediction_horizon TEXT,
                target_metric TEXT,
                predicted_value REAL,
                actual_value REAL,
                prediction_accuracy REAL,
                model_used TEXT,
                input_features JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                validated_at DATETIME,
                validation_result TEXT
            )
        `);
        
        // predictive_model_analytics - Model performance analytics
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS predictive_model_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL,
                model_version TEXT,
                model_type TEXT NOT NULL,
                training_data_size INTEGER,
                feature_count INTEGER,
                accuracy_score REAL,
                precision_score REAL,
                recall_score REAL,
                f1_score REAL,
                validation_method TEXT,
                training_duration_ms INTEGER,
                inference_time_ms REAL,
                model_size_bytes INTEGER,
                hyperparameters JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_trained DATETIME,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);
        
        // prompt_effectiveness_metrics - LLM prompt performance tracking
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS prompt_effectiveness_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_template_id INTEGER,
                prompt_hash TEXT NOT NULL,
                success_rate REAL,
                average_response_time_ms INTEGER,
                token_efficiency REAL,
                semantic_accuracy REAL,
                task_completion_rate REAL,
                user_satisfaction_score REAL,
                usage_count INTEGER DEFAULT 0,
                last_used DATETIME,
                measurement_period_start DATETIME,
                measurement_period_end DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (prompt_template_id) REFERENCES llm_prompt_templates(id)
            )
        `);
        
        // prompt_optimization_experiments - Prompt A/B testing and optimization
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS prompt_optimization_experiments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_name TEXT NOT NULL,
                experiment_type TEXT NOT NULL,
                control_prompt TEXT NOT NULL,
                variant_prompt TEXT NOT NULL,
                success_metric TEXT NOT NULL,
                control_performance REAL,
                variant_performance REAL,
                statistical_significance REAL,
                sample_size INTEGER,
                experiment_duration_hours INTEGER,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                conclusion TEXT,
                recommended_action TEXT,
                implemented BOOLEAN DEFAULT FALSE
            )
        `);
        
        // reproduction_tests - Test reproduction scenarios
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS reproduction_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_name TEXT NOT NULL,
                test_category TEXT,
                scenario_description TEXT NOT NULL,
                reproduction_steps JSON NOT NULL,
                expected_outcome TEXT,
                actual_outcome TEXT,
                success BOOLEAN,
                execution_time_ms INTEGER,
                environment_data JSON,
                prerequisites JSON,
                cleanup_steps JSON,
                last_run_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                run_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // survey_discovery_analytics - Survey discovery and analysis
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS survey_discovery_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discovery_session_id TEXT NOT NULL,
                discovery_method TEXT NOT NULL,
                sites_discovered INTEGER DEFAULT 0,
                sites_analyzed INTEGER DEFAULT 0,
                viable_sites INTEGER DEFAULT 0,
                avg_complexity_score REAL,
                discovery_duration_ms INTEGER,
                analysis_insights JSON,
                quality_score REAL,
                discovery_source TEXT,
                geographical_region TEXT,
                industry_category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata JSON
            )
        `);
        
        console.log('✅ All missing tables created');
        
        // Create indexes for the new tables
        await this.createNewTableIndexes(db);
    },
    
    async createNewTableIndexes(db) {
        console.log('📊 Creating indexes for new tables...');
        
        const indexes = [
            // learning_patterns indexes
            'CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON learning_patterns(pattern_type)',
            'CREATE INDEX IF NOT EXISTS idx_learning_patterns_confidence ON learning_patterns(confidence_score)',
            'CREATE INDEX IF NOT EXISTS idx_learning_patterns_frequency ON learning_patterns(frequency)',
            
            // llm_insights indexes
            'CREATE INDEX IF NOT EXISTS idx_llm_insights_type ON llm_insights(insight_type)',
            'CREATE INDEX IF NOT EXISTS idx_llm_insights_category ON llm_insights(insight_category)',
            'CREATE INDEX IF NOT EXISTS idx_llm_insights_confidence ON llm_insights(confidence_score)',
            
            // logs indexes
            'CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(log_level)',
            'CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(log_source)',
            'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id)',
            
            // page_analysis indexes
            'CREATE INDEX IF NOT EXISTS idx_page_analysis_url ON page_analysis(url)',
            'CREATE INDEX IF NOT EXISTS idx_page_analysis_type ON page_analysis(analysis_type)',
            'CREATE INDEX IF NOT EXISTS idx_page_analysis_complexity ON page_analysis(complexity_score)',
            'CREATE INDEX IF NOT EXISTS idx_page_analysis_feasibility ON page_analysis(automation_feasibility)',
            
            // performance_analytics indexes
            'CREATE INDEX IF NOT EXISTS idx_performance_analytics_metric ON performance_analytics(metric_name)',
            'CREATE INDEX IF NOT EXISTS idx_performance_analytics_timestamp ON performance_analytics(measurement_timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_performance_analytics_site ON performance_analytics(site_id)',
            
            // poll_sites indexes
            'CREATE INDEX IF NOT EXISTS idx_poll_sites_url ON poll_sites(url)',
            'CREATE INDEX IF NOT EXISTS idx_poll_sites_platform ON poll_sites(platform_type)',
            'CREATE INDEX IF NOT EXISTS idx_poll_sites_success_rate ON poll_sites(success_rate)',
            'CREATE INDEX IF NOT EXISTS idx_poll_sites_status ON poll_sites(status)',
            
            // predictive_insights indexes
            'CREATE INDEX IF NOT EXISTS idx_predictive_insights_type ON predictive_insights(prediction_type)',
            'CREATE INDEX IF NOT EXISTS idx_predictive_insights_confidence ON predictive_insights(confidence_score)',
            'CREATE INDEX IF NOT EXISTS idx_predictive_insights_accuracy ON predictive_insights(prediction_accuracy)',
            
            // survey_discovery_analytics indexes
            'CREATE INDEX IF NOT EXISTS idx_survey_discovery_session ON survey_discovery_analytics(discovery_session_id)',
            'CREATE INDEX IF NOT EXISTS idx_survey_discovery_method ON survey_discovery_analytics(discovery_method)',
            'CREATE INDEX IF NOT EXISTS idx_survey_discovery_quality ON survey_discovery_analytics(quality_score)'
        ];
        
        for (const indexSql of indexes) {
            try {
                await this.run(db, indexSql);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.log(`⚠️ Index creation warning: ${error.message}`);
                }
            }
        }
        
        console.log(`✅ Created ${indexes.length} new indexes`);
    },
    
    async down(db) {
        console.log('🗑️ Rolling back consolidated database sync...');
        
        const tablesToDrop = [
            'learning_patterns',
            'llm_comprehension_issues', 
            'llm_insights',
            'logs',
            'page_analysis',
            'performance_analytics',
            'platform_behavior_intelligence',
            'poll_sites',
            'predictive_insights',
            'predictive_model_analytics',
            'prompt_effectiveness_metrics',
            'prompt_optimization_experiments',
            'reproduction_tests',
            'survey_discovery_analytics'
        ];
        
        await this.run(db, 'PRAGMA foreign_keys = OFF');
        
        try {
            for (const table of tablesToDrop) {
                await this.run(db, `DROP TABLE IF EXISTS ${table}`);
            }
        } finally {
            await this.run(db, 'PRAGMA foreign_keys = ON');
        }
        
        console.log('✅ Sync rollback complete');
    },
    
    // Helper method
    async run(db, sql) {
        return new Promise((resolve, reject) => {
            db.run(sql, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }
};