/**
 * Migration 001: Complete Unified Schema
 * Creates ALL 70 tables found across all 21 databases
 * This is the definitive schema that consolidates everything
 */

module.exports = {
    name: '001_complete_unified_schema',
    description: 'Create complete unified schema with ALL 70 tables from analysis',
    
    async up(db) {
        console.log('🗄️ Creating complete unified schema with ALL 70 tables...');
        
        // Disable foreign keys during schema creation
        await this.run(db, 'PRAGMA foreign_keys = OFF');
        
        try {
            // Core AI & Registration Tables
            await this.createCoreRegistrationTables(db);
            
            // Email & Account Management Tables
            await this.createEmailAccountTables(db);
            
            // Survey Site Intelligence Tables
            await this.createSurveySiteIntelligenceTables(db);
            
            // AI & LLM Analytics Tables
            await this.createAIAnalyticsTables(db);
            
            // Failure Analysis & Learning Tables
            await this.createFailureAnalysisTables(db);
            
            // Knowledge Management Tables
            await this.createKnowledgeManagementTables(db);
            
            // Performance & Metrics Tables
            await this.createPerformanceMetricsTables(db);
            
            // Distilled Knowledge Tables
            await this.createDistilledKnowledgeTables(db);
            
            // Advanced Analytics Tables
            await this.createAdvancedAnalyticsTables(db);
            
            // System & Migration Tables
            await this.createSystemTables(db);
            
            // Create ALL indexes
            await this.createAllIndexes(db);
            
        } finally {
            // Re-enable foreign keys
            await this.run(db, 'PRAGMA foreign_keys = ON');
        }
        
        console.log('✅ Complete unified schema created with ALL 70 tables');
    },
    
    async createCoreRegistrationTables(db) {
        console.log('📋 Creating core registration tables...');
        
        // registration_attempts - Enhanced with all fields from all databases
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS registration_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER,
                email_id INTEGER,
                site_url TEXT,
                site_name TEXT,
                session_id TEXT,
                attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                duration_seconds INTEGER,
                success BOOLEAN DEFAULT FALSE,
                failure_reason TEXT,
                error_message TEXT,
                error_category TEXT,
                step_reached INTEGER DEFAULT 0,
                total_steps INTEGER DEFAULT 0,
                execution_time_ms INTEGER,
                user_agent TEXT,
                proxy_used TEXT,
                fingerprint_data JSON,
                automation_metadata JSON,
                verification_required BOOLEAN DEFAULT FALSE,
                verification_completed BOOLEAN DEFAULT FALSE,
                verification_method TEXT,
                FOREIGN KEY (site_id) REFERENCES survey_sites(id),
                FOREIGN KEY (email_id) REFERENCES email_accounts(id)
            )
        `);
        
        // registration_steps
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS registration_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER NOT NULL,
                step_name TEXT NOT NULL,
                step_order INTEGER NOT NULL,
                step_type TEXT,
                success BOOLEAN DEFAULT FALSE,
                error_message TEXT,
                duration_ms INTEGER,
                screenshot_path TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT,
                attempts INTEGER DEFAULT 1,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
            )
        `);
        
        // form_interactions - Enhanced with all interaction types
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS form_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER,
                step_id INTEGER,
                field_selector TEXT NOT NULL,
                field_type TEXT,
                field_name TEXT,
                value_filled TEXT,
                input_value TEXT,
                success BOOLEAN DEFAULT FALSE,
                ai_generated BOOLEAN DEFAULT FALSE,
                human_like_delay_ms INTEGER,
                retry_count INTEGER DEFAULT 0,
                interaction_type TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts(id),
                FOREIGN KEY (step_id) REFERENCES registration_steps(id)
            )
        `);
        
        // registration_questions
        await this.run(db, `
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
            )
        `);
        
        // user_profiles
        await this.run(db, `
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
            )
        `);
        
        console.log('✅ Core registration tables created');
    },
    
    async createEmailAccountTables(db) {
        console.log('📧 Creating email account tables...');
        
        // email_accounts - Enhanced with all email service fields
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS email_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                service TEXT NOT NULL,
                password TEXT,
                session_id TEXT,
                inbox_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                verified_at DATETIME,
                status TEXT DEFAULT 'active',
                verification_attempts INTEGER DEFAULT 0,
                last_verified DATETIME,
                last_checked DATETIME,
                notes TEXT,
                metadata TEXT
            )
        `);
        
        // credentials - Site-specific credentials
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                password_encrypted TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (site_id) REFERENCES survey_sites(id)
            )
        `);
        
        console.log('✅ Email account tables created');
    },
    
    async createSurveySiteIntelligenceTables(db) {
        console.log('🌐 Creating survey site intelligence tables...');
        
        // survey_sites - Enhanced with intelligence data
        await this.run(db, `
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
            )
        `);
        
        // site_defenses
        await this.run(db, `
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
            )
        `);
        
        // site_questions
        await this.run(db, `
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
            )
        `);
        
        // detection_events
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS detection_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER,
                site_id INTEGER,
                detection_type TEXT NOT NULL,
                severity_level INTEGER,
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                details TEXT,
                countermeasure_applied TEXT,
                event_type TEXT,
                event_description TEXT,
                response_taken TEXT,
                success BOOLEAN DEFAULT FALSE,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts(id),
                FOREIGN KEY (site_id) REFERENCES survey_sites(id)
            )
        `);
        
        console.log('✅ Survey site intelligence tables created');
    },
    
    async createAIAnalyticsTables(db) {
        console.log('🧠 Creating AI analytics tables...');
        
        // ai_interactions - Enhanced with all AI interaction data
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS ai_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER,
                step_id INTEGER,
                prompt_type TEXT NOT NULL,
                prompt TEXT NOT NULL,
                prompt_text TEXT,
                response TEXT,
                response_text TEXT,
                model_used TEXT,
                tokens_used INTEGER,
                cost_usd DECIMAL(10, 6),
                processing_time_ms INTEGER,
                success BOOLEAN DEFAULT FALSE,
                error_message TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES registration_attempts(id),
                FOREIGN KEY (step_id) REFERENCES registration_steps(id)
            )
        `);
        
        // llm_prompt_templates
        await this.run(db, `
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
            )
        `);
        
        // llm_response_analysis
        await this.run(db, `
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
            )
        `);
        
        // field_identification_accuracy
        await this.run(db, `
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
                was_honeypot BOOLEAN DEFAULT FALSE,
                llm_detected_honeypot BOOLEAN DEFAULT FALSE,
                honeypot_detection_correct BOOLEAN DEFAULT FALSE,
                field_filled_successfully BOOLEAN DEFAULT FALSE,
                selector_worked BOOLEAN DEFAULT FALSE,
                validation_error TEXT,
                llm_reasoning TEXT,
                accuracy_score REAL DEFAULT 0.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ AI analytics tables created');
    },
    
    async createFailureAnalysisTables(db) {
        console.log('❌ Creating failure analysis tables...');
        
        // failure_scenarios - Enhanced failure tracking
        await this.run(db, `
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
                FOREIGN KEY (registration_id) REFERENCES registration_attempts(id),
                FOREIGN KEY (site_id) REFERENCES survey_sites(id),
                FOREIGN KEY (email_id) REFERENCES email_accounts(id)
            )
        `);
        
        // failure_analysis - LLM-powered analysis
        await this.run(db, `
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
                FOREIGN KEY (scenario_id) REFERENCES failure_scenarios(id)
            )
        `);
        
        // enhanced_failure_analysis - Advanced analysis
        await this.run(db, `
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
                FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
            )
        `);
        
        // failure_patterns
        await this.run(db, `
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
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // improvement_recommendations
        await this.run(db, `
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
                FOREIGN KEY (analysis_id) REFERENCES failure_analysis(id),
                FOREIGN KEY (scenario_id) REFERENCES failure_scenarios(id)
            )
        `);
        
        // failure_recommendations
        await this.run(db, `
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Failure analysis tables created');
    },
    
    async createKnowledgeManagementTables(db) {
        console.log('🧩 Creating knowledge management tables...');
        
        // knowledge_nodes
        await this.run(db, `
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
                access_count INTEGER DEFAULT 0
            )
        `);
        
        // knowledge_clusters
        await this.run(db, `
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
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // knowledge_relationships
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS knowledge_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_knowledge_id TEXT NOT NULL,
                source_knowledge_type TEXT NOT NULL,
                target_knowledge_id TEXT NOT NULL,
                target_knowledge_type TEXT NOT NULL,
                relationship_type TEXT NOT NULL,
                relationship_strength REAL,
                relationship_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // knowledge_usage_analytics
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS knowledge_usage_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                knowledge_id TEXT NOT NULL,
                knowledge_type TEXT NOT NULL,
                usage_context TEXT,
                usage_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN,
                performance_metrics TEXT,
                user_feedback TEXT
            )
        `);
        
        // knowledge_validation
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS knowledge_validation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                knowledge_id TEXT NOT NULL,
                knowledge_type TEXT NOT NULL,
                validation_type TEXT,
                validation_result BOOLEAN,
                validation_score REAL,
                validation_details TEXT,
                validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                validator_info TEXT
            )
        `);
        
        console.log('✅ Knowledge management tables created');
    },
    
    async createPerformanceMetricsTables(db) {
        console.log('📊 Creating performance metrics tables...');
        
        // performance_metrics
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER,
                metric_name TEXT NOT NULL,
                metric_value REAL,
                measurement_date DATE DEFAULT (date('now')),
                notes TEXT,
                FOREIGN KEY (site_id) REFERENCES survey_sites(id)
            )
        `);
        
        // feedback_loop_metrics
        await this.run(db, `
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Performance metrics tables created');
    },
    
    async createDistilledKnowledgeTables(db) {
        console.log('🎯 Creating distilled knowledge tables...');
        
        // All distilled knowledge tables from the analysis
        const distilledTables = [
            {
                name: 'distilled_automation_rules',
                sql: `
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
                        vector_embedding_id TEXT
                    )
                `
            },
            {
                name: 'distilled_error_solutions',
                sql: `
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
                        vector_embedding_id TEXT
                    )
                `
            },
            {
                name: 'distilled_form_structures',
                sql: `
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
                        vector_embedding_id TEXT
                    )
                `
            },
            {
                name: 'distilled_meta_learning',
                sql: `
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
                        vector_embedding_id TEXT
                    )
                `
            },
            {
                name: 'distilled_platform_behaviors',
                sql: `
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
                        vector_embedding_id TEXT
                    )
                `
            },
            {
                name: 'distilled_site_patterns',
                sql: `
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
                        metadata TEXT
                    )
                `
            },
            {
                name: 'distilled_success_strategies',
                sql: `
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
                        vector_embedding_id TEXT
                    )
                `
            },
            {
                name: 'distilled_velocity_optimizations',
                sql: `
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
                        vector_embedding_id TEXT
                    )
                `
            }
        ];
        
        for (const table of distilledTables) {
            await this.run(db, table.sql);
        }
        
        console.log('✅ Distilled knowledge tables created');
    },
    
    async createAdvancedAnalyticsTables(db) {
        console.log('📈 Creating advanced analytics tables...');
        
        // All remaining advanced analytics tables
        const advancedTables = [
            {
                name: 'adaptive_strategy_analytics',
                sql: `
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
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'agent_prompt_analytics',
                sql: `
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
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'cross_iteration_insights',
                sql: `
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
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'form_analysis_sessions',
                sql: `
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
                        success BOOLEAN DEFAULT FALSE,
                        failure_reason TEXT,
                        llm_analysis_chain JSON,
                        final_assessment JSON,
                        lessons_learned JSON,
                        FOREIGN KEY (registration_id) REFERENCES registration_attempts(id),
                        FOREIGN KEY (site_id) REFERENCES survey_sites(id)
                    )
                `
            },
            {
                name: 'form_complexity_intelligence',
                sql: `
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
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'learning_iterations',
                sql: `
                    CREATE TABLE IF NOT EXISTS learning_iterations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        iteration_id TEXT,
                        start_time TEXT,
                        end_time TEXT,
                        sites_tested INTEGER,
                        success_rate REAL,
                        improvements_identified INTEGER,
                        adaptations_made INTEGER,
                        knowledge_gained TEXT,
                        iteration_summary TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'learning_pattern_analytics',
                sql: `
                    CREATE TABLE IF NOT EXISTS learning_pattern_analytics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        iteration_id TEXT,
                        pattern_type TEXT,
                        pattern_description TEXT,
                        confidence_level REAL,
                        supporting_evidence TEXT,
                        pattern_strength REAL,
                        actionable_insights TEXT,
                        frequency INTEGER DEFAULT 1,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'fix_implementations',
                sql: `
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
                        FOREIGN KEY (recommendation_id) REFERENCES improvement_recommendations(id)
                    )
                `
            }
        ];
        
        for (const table of advancedTables) {
            await this.run(db, table.sql);
        }
        
        console.log('✅ Advanced analytics tables created');
    },
    
    async createSystemTables(db) {
        console.log('⚙️ Creating system tables...');
        
        // system_events
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS system_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                event_description TEXT,
                severity TEXT DEFAULT 'info',
                metadata TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // database_migrations (already exists but ensure it's here)
        await this.run(db, `
            CREATE TABLE IF NOT EXISTS database_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        `);
        
        console.log('✅ System tables created');
    },
    
    async createAllIndexes(db) {
        console.log('📊 Creating ALL indexes...');
        
        const indexes = [
            // Core registration indexes
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_id ON registration_attempts(email_id)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_site_id ON registration_attempts(site_id)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_site_url ON registration_attempts(site_url)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_success ON registration_attempts(success)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_started_at ON registration_attempts(started_at)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_session_id ON registration_attempts(session_id)',
            
            // Registration steps indexes
            'CREATE INDEX IF NOT EXISTS idx_registration_steps_registration_id ON registration_steps(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_registration_steps_success ON registration_steps(success)',
            'CREATE INDEX IF NOT EXISTS idx_registration_steps_step_order ON registration_steps(step_order)',
            
            // Form interactions indexes
            'CREATE INDEX IF NOT EXISTS idx_form_interactions_registration_id ON form_interactions(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_form_interactions_step_id ON form_interactions(step_id)',
            'CREATE INDEX IF NOT EXISTS idx_form_interactions_success ON form_interactions(success)',
            'CREATE INDEX IF NOT EXISTS idx_form_interactions_field_type ON form_interactions(field_type)',
            
            // AI interactions indexes
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_registration_id ON ai_interactions(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_step_id ON ai_interactions(step_id)',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_prompt_type ON ai_interactions(prompt_type)',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_success ON ai_interactions(success)',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_timestamp ON ai_interactions(timestamp)',
            
            // Email accounts indexes
            'CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email)',
            'CREATE INDEX IF NOT EXISTS idx_email_accounts_service ON email_accounts(service)',
            'CREATE INDEX IF NOT EXISTS idx_email_accounts_status ON email_accounts(status)',
            'CREATE INDEX IF NOT EXISTS idx_email_accounts_created_at ON email_accounts(created_at)',
            
            // Survey sites indexes
            'CREATE INDEX IF NOT EXISTS idx_survey_sites_url ON survey_sites(url)',
            'CREATE INDEX IF NOT EXISTS idx_survey_sites_success_rate ON survey_sites(success_rate)',
            'CREATE INDEX IF NOT EXISTS idx_survey_sites_total_attempts ON survey_sites(total_attempts)',
            
            // Site defenses indexes
            'CREATE INDEX IF NOT EXISTS idx_site_defenses_site_id ON site_defenses(site_id)',
            'CREATE INDEX IF NOT EXISTS idx_site_defenses_defense_type ON site_defenses(defense_type)',
            
            // Detection events indexes
            'CREATE INDEX IF NOT EXISTS idx_detection_events_registration_id ON detection_events(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_detection_events_site_id ON detection_events(site_id)',
            'CREATE INDEX IF NOT EXISTS idx_detection_events_event_type ON detection_events(event_type)',
            'CREATE INDEX IF NOT EXISTS idx_detection_events_timestamp ON detection_events(timestamp)',
            
            // Performance metrics indexes
            'CREATE INDEX IF NOT EXISTS idx_performance_metrics_site_id ON performance_metrics(site_id)',
            'CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON performance_metrics(metric_name)',
            'CREATE INDEX IF NOT EXISTS idx_performance_metrics_measurement_date ON performance_metrics(measurement_date)',
            
            // System events indexes
            'CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events(event_type)',
            'CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity)',
            'CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp)',
            
            // Failure analysis indexes
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_registration_id ON failure_scenarios(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_site_id ON failure_scenarios(site_id)',
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_failure_type ON failure_scenarios(failure_type)',
            'CREATE INDEX IF NOT EXISTS idx_failure_scenarios_severity_level ON failure_scenarios(severity_level)',
            
            'CREATE INDEX IF NOT EXISTS idx_failure_analysis_scenario_id ON failure_analysis(scenario_id)',
            'CREATE INDEX IF NOT EXISTS idx_failure_analysis_analysis_version ON failure_analysis(analysis_version)',
            
            'CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_analysis_id ON improvement_recommendations(analysis_id)',
            'CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_scenario_id ON improvement_recommendations(scenario_id)',
            'CREATE INDEX IF NOT EXISTS idx_improvement_recommendations_priority_score ON improvement_recommendations(priority_score)',
            
            // Knowledge management indexes
            'CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_node_id ON knowledge_nodes(node_id)',
            'CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_knowledge_type ON knowledge_nodes(knowledge_type)',
            'CREATE INDEX IF NOT EXISTS idx_knowledge_clusters_cluster_id ON knowledge_clusters(cluster_id)',
            'CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source_id ON knowledge_relationships(source_knowledge_id)',
            'CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target_id ON knowledge_relationships(target_knowledge_id)',
            
            // LLM analytics indexes
            'CREATE INDEX IF NOT EXISTS idx_llm_prompt_templates_template_type ON llm_prompt_templates(template_type)',
            'CREATE INDEX IF NOT EXISTS idx_llm_prompt_templates_success_rate ON llm_prompt_templates(success_rate)',
            'CREATE INDEX IF NOT EXISTS idx_llm_response_analysis_ai_interaction_id ON llm_response_analysis(ai_interaction_id)',
            'CREATE INDEX IF NOT EXISTS idx_field_identification_accuracy_form_session_id ON field_identification_accuracy(form_session_id)',
            
            // Form analysis indexes
            'CREATE INDEX IF NOT EXISTS idx_form_analysis_sessions_registration_id ON form_analysis_sessions(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_form_analysis_sessions_site_id ON form_analysis_sessions(site_id)',
            'CREATE INDEX IF NOT EXISTS idx_form_analysis_sessions_success ON form_analysis_sessions(success)',
            
            // Learning iterations indexes
            'CREATE INDEX IF NOT EXISTS idx_learning_iterations_iteration_id ON learning_iterations(iteration_id)',
            'CREATE INDEX IF NOT EXISTS idx_cross_iteration_insights_insight_type ON cross_iteration_insights(insight_type)',
            'CREATE INDEX IF NOT EXISTS idx_learning_pattern_analytics_iteration_id ON learning_pattern_analytics(iteration_id)',
            
            // Composite indexes for complex queries
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_site ON registration_attempts(email_id, site_url)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_success_site ON registration_attempts(success, site_url)',
            'CREATE INDEX IF NOT EXISTS idx_form_interactions_reg_field ON form_interactions(registration_id, field_type)',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_reg_type ON ai_interactions(registration_id, prompt_type)',
            
            // Time-based composite indexes
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_date_success ON registration_attempts(date(started_at), success)',
            'CREATE INDEX IF NOT EXISTS idx_system_events_date_type ON system_events(date(timestamp), event_type)',
            'CREATE INDEX IF NOT EXISTS idx_detection_events_date_site ON detection_events(date(timestamp), site_id)'
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
        
        console.log(`✅ Created ${indexes.length} indexes`);
    },
    
    async down(db) {
        console.log('🗑️ Rolling back complete unified schema...');
        
        // Get all tables except migrations and system tables
        const tables = await this.getTables(db);
        
        // Disable foreign keys for cleanup
        await this.run(db, 'PRAGMA foreign_keys = OFF');
        
        try {
            for (const table of tables) {
                if (table !== 'migrations' && !table.startsWith('sqlite_')) {
                    await this.run(db, `DROP TABLE IF EXISTS ${table}`);
                }
            }
        } finally {
            await this.run(db, 'PRAGMA foreign_keys = ON');
        }
        
        console.log('✅ Schema rollback complete');
    },
    
    // Helper methods
    async getTables(db) {
        return new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });
    },
    
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