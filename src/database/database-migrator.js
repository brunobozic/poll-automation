/**
 * Database Migrator
 * Comprehensive migration and seeding system for all database tables
 * Handles both existing poll automation tables and new advanced learning analytics tables
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
    constructor(dbPath = './poll-automation.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.migrations = [];
        this.seedData = [];
    }

    /**
     * Initialize database with automatic migrations
     */
    async initialize() {
        console.log('🗄️ INITIALIZING DATABASE WITH MIGRATIONS...');
        console.log('='.repeat(60));

        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Connect to database
            this.db = new Database(this.dbPath);
            console.log('✅ Database connection established');

            // Set up migrations table
            await this.setupMigrationsTable();

            // Define all migrations
            this.defineMigrations();

            // Run migrations
            await this.runMigrations();

            // Seed initial data
            await this.seedDatabase();

            console.log('🎉 Database initialization complete!');
            return true;

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup migrations tracking table
     */
    setupMigrationsTable() {
        console.log('📋 Setting up migrations table...');
        
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS database_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        `);

        console.log('✅ Migrations table ready');
    }

    /**
     * Define all database migrations
     */
    defineMigrations() {
        console.log('📝 Defining database migrations...');

        // Migration 1: Core email and registration tables
        this.migrations.push({
            name: '001_core_email_registration',
            description: 'Create core email accounts and registration tables',
            sql: `
                -- Email accounts table
                CREATE TABLE IF NOT EXISTS email_accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    service TEXT NOT NULL,
                    password TEXT,
                    session_id TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    verified_at DATETIME,
                    last_used_at DATETIME,
                    usage_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    inbox_url TEXT,
                    access_token TEXT,
                    metadata TEXT
                );

                -- Registration attempts table
                CREATE TABLE IF NOT EXISTS registration_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email_id INTEGER,
                    site_url TEXT NOT NULL,
                    site_name TEXT,
                    attempt_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT 0,
                    error_message TEXT,
                    steps_completed INTEGER DEFAULT 0,
                    total_duration_ms INTEGER,
                    user_agent TEXT,
                    metadata TEXT,
                    FOREIGN KEY (email_id) REFERENCES email_accounts(id)
                );

                -- Registration steps table
                CREATE TABLE IF NOT EXISTS registration_steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    attempt_id INTEGER,
                    step_number INTEGER,
                    step_name TEXT,
                    step_description TEXT,
                    start_time DATETIME,
                    end_time DATETIME,
                    duration_ms INTEGER,
                    success BOOLEAN DEFAULT 0,
                    error_message TEXT,
                    screenshot_path TEXT,
                    metadata TEXT,
                    FOREIGN KEY (attempt_id) REFERENCES registration_attempts(id)
                );

                -- Form interactions table
                CREATE TABLE IF NOT EXISTS form_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    step_id INTEGER,
                    interaction_type TEXT,
                    element_selector TEXT,
                    element_type TEXT,
                    action_performed TEXT,
                    input_value TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT 1,
                    error_message TEXT,
                    ai_generated BOOLEAN DEFAULT 0,
                    FOREIGN KEY (step_id) REFERENCES registration_steps(id)
                );
            `
        });

        // Migration 2: Survey site intelligence
        this.migrations.push({
            name: '002_survey_site_intelligence',
            description: 'Create survey site analysis and intelligence tables',
            sql: `
                -- Survey sites table
                CREATE TABLE IF NOT EXISTS survey_sites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_url TEXT UNIQUE NOT NULL,
                    site_name TEXT,
                    platform_type TEXT,
                    first_discovered DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_analyzed DATETIME,
                    analysis_count INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    avg_completion_time INTEGER,
                    difficulty_score INTEGER DEFAULT 5,
                    anti_bot_measures TEXT,
                    required_fields TEXT,
                    form_structure TEXT,
                    notes TEXT,
                    is_active BOOLEAN DEFAULT 1
                );

                -- Site defenses table
                CREATE TABLE IF NOT EXISTS site_defenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER,
                    defense_type TEXT,
                    detection_method TEXT,
                    severity_level TEXT,
                    bypass_method TEXT,
                    bypass_success_rate REAL,
                    first_detected DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_encountered DATETIME,
                    notes TEXT,
                    FOREIGN KEY (site_id) REFERENCES survey_sites(id)
                );

                -- Registration questions table
                CREATE TABLE IF NOT EXISTS registration_questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    attempt_id INTEGER,
                    question_text TEXT,
                    question_type TEXT,
                    field_name TEXT,
                    required BOOLEAN DEFAULT 0,
                    ai_response TEXT,
                    actual_input TEXT,
                    response_reasoning TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (attempt_id) REFERENCES registration_attempts(id)
                );

                -- User profiles table
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    profile_name TEXT UNIQUE,
                    demographic_data TEXT,
                    preferences TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    usage_count INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    notes TEXT
                );
            `
        });

        // Migration 3: AI interactions and LLM analytics
        this.migrations.push({
            name: '003_ai_llm_analytics',
            description: 'Create AI interaction and LLM analytics tables',
            sql: `
                -- AI interactions table
                CREATE TABLE IF NOT EXISTS ai_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    interaction_type TEXT,
                    prompt_text TEXT,
                    response_text TEXT,
                    model_used TEXT,
                    tokens_used INTEGER,
                    processing_time_ms INTEGER,
                    cost_estimate REAL,
                    success BOOLEAN DEFAULT 1,
                    confidence_score REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    context_data TEXT,
                    metadata TEXT
                );

                -- LLM response analysis table
                CREATE TABLE IF NOT EXISTS llm_response_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ai_interaction_id INTEGER,
                    analysis_type TEXT,
                    quality_score REAL,
                    accuracy_score REAL,
                    relevance_score REAL,
                    improvement_suggestions TEXT,
                    validation_result TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions(id)
                );
            `
        });

        // Migration 4: Advanced learning analytics (new)
        this.migrations.push({
            name: '004_advanced_learning_analytics',
            description: 'Create advanced learning analytics tables for iterative improvement',
            sql: `
                -- Learning iterations tracking
                CREATE TABLE IF NOT EXISTS learning_iterations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    iteration_id TEXT UNIQUE,
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
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                -- Survey discovery analytics
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
                    FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
                );

                -- Platform behavior intelligence
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
                    FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
                );

                -- Form complexity intelligence
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
                    FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
                );
            `
        });

        // Migration 5: Predictive modeling and strategies
        this.migrations.push({
            name: '005_predictive_modeling_strategies',
            description: 'Create predictive modeling and adaptive strategy tables',
            sql: `
                -- Predictive model analytics
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
                    FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
                );

                -- Adaptive strategy analytics
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
                    FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
                );

                -- Agent prompt optimization analytics
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
                    FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
                );
            `
        });

        // Migration 6: Cross-iteration learning insights
        this.migrations.push({
            name: '006_cross_iteration_insights',
            description: 'Create cross-iteration learning and pattern analysis tables',
            sql: `
                -- Learning pattern analytics
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
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                -- Cross-iteration learning insights
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
                );

                -- Performance metrics and monitoring
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_type TEXT,
                    metric_name TEXT,
                    metric_value REAL,
                    unit TEXT,
                    measurement_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    context TEXT,
                    tags TEXT
                );

                -- System events and operational logs
                CREATE TABLE IF NOT EXISTS system_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT,
                    event_description TEXT,
                    severity_level TEXT,
                    component TEXT,
                    event_data TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT 0,
                    resolution_notes TEXT
                );
            `
        });

        console.log(`✅ Defined ${this.migrations.length} migrations`);
    }

    /**
     * Run all pending migrations
     */
    async runMigrations() {
        console.log('🚀 Running database migrations...');

        for (const migration of this.migrations) {
            const isExecuted = this.isMigrationExecuted(migration.name);
            
            if (!isExecuted) {
                console.log(`   📦 Running migration: ${migration.name}`);
                console.log(`      Description: ${migration.description}`);
                
                try {
                    // Execute migration SQL
                    this.db.exec(migration.sql);
                    
                    // Record migration as executed
                    this.recordMigrationExecution(migration.name, migration.description);
                    
                    console.log(`   ✅ Migration ${migration.name} completed successfully`);
                    
                } catch (error) {
                    console.error(`   ❌ Migration ${migration.name} failed:`, error.message);
                    throw error;
                }
            } else {
                console.log(`   ⏭️ Migration ${migration.name} already executed, skipping`);
            }
        }

        console.log('✅ All migrations completed');
    }

    /**
     * Check if migration has been executed
     */
    isMigrationExecuted(migrationName) {
        try {
            const result = this.db.prepare(`
                SELECT COUNT(*) as count 
                FROM database_migrations 
                WHERE migration_name = ?
            `).get(migrationName);
            
            return result.count > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Record migration execution
     */
    recordMigrationExecution(migrationName, description) {
        this.db.prepare(`
            INSERT INTO database_migrations (migration_name, description)
            VALUES (?, ?)
        `).run(migrationName, description);
    }

    /**
     * Seed database with initial data
     */
    async seedDatabase() {
        console.log('🌱 Seeding database with initial data...');

        // Seed user profiles
        await this.seedUserProfiles();

        // Seed known survey sites
        await this.seedKnownSurveySites();

        // Seed system configuration
        await this.seedSystemConfiguration();

        console.log('✅ Database seeding completed');
    }

    /**
     * Seed user profiles
     */
    seedUserProfiles() {
        console.log('   👤 Seeding user profiles...');

        const profiles = [
            {
                profile_name: 'default_professional',
                demographic_data: JSON.stringify({
                    age_range: '25-35',
                    gender: 'prefer_not_to_say',
                    occupation: 'Professional',
                    education: 'Bachelor\'s Degree',
                    income_range: '50k-75k',
                    location: 'United States'
                }),
                preferences: JSON.stringify({
                    survey_types: ['market_research', 'product_feedback'],
                    time_availability: 'evenings_weekends',
                    communication_preference: 'email'
                })
            },
            {
                profile_name: 'student_researcher',
                demographic_data: JSON.stringify({
                    age_range: '18-24',
                    gender: 'prefer_not_to_say',
                    occupation: 'Student',
                    education: 'Some College',
                    income_range: 'under_25k',
                    location: 'United States'
                }),
                preferences: JSON.stringify({
                    survey_types: ['academic_research', 'psychology'],
                    time_availability: 'flexible',
                    communication_preference: 'email'
                })
            }
        ];

        profiles.forEach(profile => {
            try {
                this.db.prepare(`
                    INSERT OR IGNORE INTO user_profiles 
                    (profile_name, demographic_data, preferences)
                    VALUES (?, ?, ?)
                `).run(profile.profile_name, profile.demographic_data, profile.preferences);
            } catch (error) {
                // Profile might already exist, that's okay
            }
        });

        console.log(`   ✅ Seeded ${profiles.length} user profiles`);
    }

    /**
     * Seed known survey sites
     */
    seedKnownSurveySites() {
        console.log('   🌐 Seeding known survey sites...');

        const sites = [
            {
                site_url: 'https://surveyplanet.com',
                site_name: 'SurveyPlanet',
                platform_type: 'survey_platform',
                difficulty_score: 3,
                required_fields: JSON.stringify(['email', 'name']),
                form_structure: JSON.stringify({type: 'single_page', complexity: 'simple'})
            },
            {
                site_url: 'https://www.surveymonkey.com',
                site_name: 'SurveyMonkey',
                platform_type: 'survey_platform',
                difficulty_score: 5,
                required_fields: JSON.stringify(['email', 'name', 'password']),
                form_structure: JSON.stringify({type: 'multi_step', complexity: 'moderate'})
            },
            {
                site_url: 'https://www.typeform.com',
                site_name: 'Typeform',
                platform_type: 'form_builder',
                difficulty_score: 4,
                required_fields: JSON.stringify(['email', 'name']),
                form_structure: JSON.stringify({type: 'interactive', complexity: 'moderate'})
            },
            {
                site_url: 'https://www.jotform.com',
                site_name: 'JotForm',
                platform_type: 'form_builder',
                difficulty_score: 4,
                required_fields: JSON.stringify(['email', 'name']),
                form_structure: JSON.stringify({type: 'traditional', complexity: 'simple'})
            }
        ];

        sites.forEach(site => {
            try {
                this.db.prepare(`
                    INSERT OR IGNORE INTO survey_sites 
                    (site_url, site_name, platform_type, difficulty_score, required_fields, form_structure)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    site.site_url, 
                    site.site_name, 
                    site.platform_type, 
                    site.difficulty_score,
                    site.required_fields,
                    site.form_structure
                );
            } catch (error) {
                // Site might already exist, that's okay
            }
        });

        console.log(`   ✅ Seeded ${sites.length} known survey sites`);
    }

    /**
     * Seed system configuration
     */
    seedSystemConfiguration() {
        console.log('   ⚙️ Seeding system configuration...');

        const configs = [
            { metric_type: 'system', metric_name: 'database_version', metric_value: 1.0, unit: 'version' },
            { metric_type: 'performance', metric_name: 'target_surveys_per_iteration', metric_value: 25, unit: 'count' },
            { metric_type: 'learning', metric_name: 'min_confidence_threshold', metric_value: 0.7, unit: 'score' },
            { metric_type: 'discovery', metric_name: 'quality_filter_threshold', metric_value: 0.3, unit: 'score' }
        ];

        configs.forEach(config => {
            try {
                this.db.prepare(`
                    INSERT INTO performance_metrics 
                    (metric_type, metric_name, metric_value, unit, context)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    config.metric_type,
                    config.metric_name, 
                    config.metric_value,
                    config.unit,
                    'initial_seeding'
                );
            } catch (error) {
                // Config might already exist, that's okay
            }
        });

        console.log(`   ✅ Seeded ${configs.length} system configurations`);
    }

    /**
     * Get database status and migration info
     */
    getDatabaseStatus() {
        try {
            const executedMigrations = this.db.prepare(`
                SELECT migration_name, executed_at, description 
                FROM database_migrations 
                ORDER BY executed_at
            `).all();

            const tableCount = this.db.prepare(`
                SELECT COUNT(*) as count 
                FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `).get();

            return {
                database_path: this.dbPath,
                total_migrations: this.migrations.length,
                executed_migrations: executedMigrations.length,
                total_tables: tableCount.count,
                migrations: executedMigrations,
                status: executedMigrations.length === this.migrations.length ? 'up_to_date' : 'pending_migrations'
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Reset database (drop all tables and re-run migrations)
     */
    async resetDatabase() {
        console.log('🔄 Resetting database...');

        try {
            // Get all table names
            const tables = this.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `).all();

            // Drop all tables
            tables.forEach(table => {
                this.db.exec(`DROP TABLE IF EXISTS ${table.name}`);
            });

            console.log(`   🗑️ Dropped ${tables.length} tables`);

            // Re-run all migrations
            await this.setupMigrationsTable();
            await this.runMigrations();
            await this.seedDatabase();

            console.log('✅ Database reset completed');
            return true;

        } catch (error) {
            console.error('❌ Database reset failed:', error);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('🔒 Database connection closed');
        }
    }
}

module.exports = DatabaseMigrator;