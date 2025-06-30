/**
 * Enhanced Database Setup
 * Comprehensive SQLite schema for email-site correlation and intelligence tracking
 */

const { getDatabaseManager } = require('./database-manager.js');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../../data/polls.db');

const createEnhancedTables = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('🗄️ Connected to SQLite database for enhanced setup');
    });

    const enhancedSchema = `
      -- ===========================================
      -- EMAIL MANAGEMENT & CORRELATION TABLES
      -- ===========================================
      
      -- Enhanced email accounts with full access credentials
      CREATE TABLE IF NOT EXISTS email_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        service TEXT NOT NULL,
        password TEXT,
        session_id TEXT NOT NULL,
        inbox_url TEXT,
        login_url TEXT,
        username_for_service TEXT,
        password_for_service TEXT,
        access_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_at DATETIME,
        last_accessed DATETIME,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'blocked', 'suspended')),
        verification_attempts INTEGER DEFAULT 0,
        last_checked DATETIME,
        rate_limit_reset DATETIME,
        usage_count INTEGER DEFAULT 0,
        max_usage_limit INTEGER DEFAULT 10,
        metadata TEXT, -- JSON
        notes TEXT
      );

      -- Site credentials storage for logged-in accounts
      CREATE TABLE IF NOT EXISTS site_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        email_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        login_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        login_successful BOOLEAN DEFAULT 1,
        session_data TEXT, -- JSON for cookies/tokens
        notes TEXT,
        FOREIGN KEY (site_id) REFERENCES survey_sites (id),
        FOREIGN KEY (email_id) REFERENCES email_accounts (id),
        UNIQUE(site_id, email_id)
      );

      -- ===========================================
      -- SURVEY SITES INTELLIGENCE TABLES
      -- ===========================================
      
      -- Comprehensive survey sites tracking
      CREATE TABLE IF NOT EXISTS survey_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_name TEXT NOT NULL UNIQUE,
        base_url TEXT NOT NULL,
        registration_url TEXT,
        login_url TEXT,
        site_category TEXT DEFAULT 'survey',
        site_type TEXT, -- form_builder, enterprise, survey_platform, etc.
        first_visited DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_visited DATETIME DEFAULT CURRENT_TIMESTAMP,
        visit_count INTEGER DEFAULT 1,
        successful_registrations INTEGER DEFAULT 0,
        failed_registrations INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        average_complexity REAL DEFAULT 0,
        yield_potential REAL DEFAULT 0,
        accessibility_score REAL DEFAULT 0,
        defense_level INTEGER DEFAULT 1, -- 1=low, 5=high
        requires_verification BOOLEAN DEFAULT 0,
        supports_social_login BOOLEAN DEFAULT 0,
        has_captcha BOOLEAN DEFAULT 0,
        has_multi_step_flow BOOLEAN DEFAULT 0,
        estimated_completion_time INTEGER, -- minutes
        notes TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'blocked', 'monitoring', 'inactive'))
      );

      -- Site defensive measures and countermeasures
      CREATE TABLE IF NOT EXISTS site_defenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        registration_id INTEGER,
        defense_type TEXT NOT NULL, -- captcha, honeypot, rate_limit, js_check, etc.
        defense_subtype TEXT,
        severity_level INTEGER NOT NULL CHECK(severity_level BETWEEN 1 AND 5),
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        bypass_attempted BOOLEAN DEFAULT 0,
        bypass_successful BOOLEAN DEFAULT 0,
        bypass_method TEXT,
        detection_details TEXT, -- JSON
        screenshot_path TEXT,
        pattern_signature TEXT, -- for automated detection
        FOREIGN KEY (site_id) REFERENCES survey_sites (id),
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
      );

      -- Site questions repository
      CREATE TABLE IF NOT EXISTS site_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL, -- text, select, radio, checkbox, etc.
        field_name TEXT NOT NULL,
        field_selector TEXT,
        demographic_category TEXT, -- age, income, location, interests, etc.
        is_required BOOLEAN DEFAULT 0,
        has_options BOOLEAN DEFAULT 0,
        question_options TEXT, -- JSON array
        validation_rules TEXT, -- JSON
        frequency_seen INTEGER DEFAULT 1,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        yield_importance REAL DEFAULT 0.5,
        ai_difficulty_score REAL DEFAULT 0.5,
        FOREIGN KEY (site_id) REFERENCES survey_sites (id)
      );

      -- ===========================================
      -- REGISTRATION TRACKING TABLES  
      -- ===========================================
      
      -- Registration attempts with full correlation
      CREATE TABLE IF NOT EXISTS registration_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        email_id INTEGER,
        site_id INTEGER,
        target_site TEXT NOT NULL,
        target_url TEXT NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        status TEXT DEFAULT 'started' CHECK(status IN ('started', 'in_progress', 'completed', 'failed', 'blocked', 'timeout')),
        current_step TEXT,
        total_steps INTEGER,
        success BOOLEAN DEFAULT 0,
        error_message TEXT,
        failure_reason TEXT, -- LLM-generated explanation
        llm_failure_analysis TEXT, -- Detailed LLM reasoning
        user_agent TEXT,
        ip_address TEXT,
        proxy_used TEXT,
        browser_fingerprint TEXT,
        registration_data TEXT, -- JSON of all form data used
        verification_required BOOLEAN DEFAULT 0,
        verification_completed BOOLEAN DEFAULT 0,
        verification_method TEXT,
        completion_time_seconds INTEGER,
        questions_answered INTEGER DEFAULT 0,
        honeypots_avoided INTEGER DEFAULT 0,
        FOREIGN KEY (email_id) REFERENCES email_accounts (id),
        FOREIGN KEY (site_id) REFERENCES survey_sites (id)
      );

      -- Detailed registration steps
      CREATE TABLE IF NOT EXISTS registration_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER NOT NULL,
        step_number INTEGER NOT NULL,
        step_name TEXT NOT NULL,
        step_type TEXT NOT NULL, -- navigation, form_fill, verification, etc.
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        duration_ms INTEGER,
        status TEXT DEFAULT 'started' CHECK(status IN ('started', 'completed', 'failed', 'skipped')),
        input_data TEXT, -- JSON
        output_data TEXT, -- JSON
        ai_analysis TEXT,
        error_details TEXT,
        screenshot_path TEXT,
        page_url TEXT,
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
      );

      -- Form interactions tracking
      CREATE TABLE IF NOT EXISTS form_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        step_id INTEGER NOT NULL,
        registration_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        field_type TEXT NOT NULL,
        field_selector TEXT,
        field_label TEXT,
        input_value TEXT,
        ai_generated BOOLEAN DEFAULT 0,
        interaction_type TEXT NOT NULL, -- fill, click, select, etc.
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT 1,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        response_time_ms INTEGER,
        validation_passed BOOLEAN DEFAULT 1,
        honeypot_detected BOOLEAN DEFAULT 0,
        FOREIGN KEY (step_id) REFERENCES registration_steps (id),
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
      );

      -- Registration questions and answers
      CREATE TABLE IF NOT EXISTS registration_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER NOT NULL,
        site_question_id INTEGER,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_selector TEXT,
        answer_provided TEXT NOT NULL,
        ai_generated BOOLEAN DEFAULT 1,
        ai_reasoning TEXT,
        demographic_category TEXT,
        yield_optimization_factor REAL,
        confidence_score REAL,
        response_time_ms INTEGER,
        validation_passed BOOLEAN DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
        FOREIGN KEY (site_question_id) REFERENCES site_questions (id)
      );

      -- User demographic profiles
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
        postal_code TEXT,
        marital_status TEXT,
        household_size INTEGER,
        interests TEXT, -- JSON array
        ai_optimization_score REAL,
        yield_prediction REAL,
        demographic_balance_score REAL,
        profile_consistency_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
        FOREIGN KEY (email_id) REFERENCES email_accounts (id)
      );

      -- ===========================================
      -- AI & LLM INTERACTION TABLES
      -- ===========================================
      
      -- AI interactions and prompts
      CREATE TABLE IF NOT EXISTS ai_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER,
        step_id INTEGER,
        interaction_type TEXT NOT NULL, -- form_analysis, failure_analysis, question_answering, etc.
        prompt TEXT NOT NULL,
        prompt_length INTEGER,
        response TEXT,
        response_length INTEGER,
        model_used TEXT NOT NULL,
        tokens_used INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cost_usd DECIMAL(10, 6),
        processing_time_ms INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT 1,
        error_message TEXT,
        confidence_score REAL,
        response_quality_score REAL,
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
        FOREIGN KEY (step_id) REFERENCES registration_steps (id)
      );

      -- LLM insights and reasoning logs (from enhanced logging)
      CREATE TABLE IF NOT EXISTS llm_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interaction_id INTEGER NOT NULL,
        insight_type TEXT NOT NULL, -- token_analysis, complexity_metrics, reasoning_patterns, etc.
        insight_data TEXT NOT NULL, -- JSON
        analysis_version TEXT DEFAULT '1.0',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interaction_id) REFERENCES ai_interactions (id)
      );

      -- ===========================================
      -- SYSTEM MONITORING TABLES
      -- ===========================================
      
      -- System events and logs
      CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        event_type TEXT NOT NULL,
        event_data TEXT, -- JSON
        severity TEXT DEFAULT 'info' CHECK(severity IN ('debug', 'info', 'warning', 'error', 'critical')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source_component TEXT,
        source_file TEXT,
        message TEXT,
        stack_trace TEXT
      );

      -- Performance metrics
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_unit TEXT,
        metric_category TEXT, -- timing, success_rate, resource_usage, etc.
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_context TEXT, -- JSON
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
      );

      -- Detection events for anti-bot measures
      CREATE TABLE IF NOT EXISTS detection_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER,
        site_id INTEGER,
        detection_type TEXT NOT NULL,
        severity_level INTEGER NOT NULL CHECK(severity_level BETWEEN 1 AND 5),
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        detection_method TEXT,
        details TEXT, -- JSON
        countermeasure_applied TEXT,
        countermeasure_successful BOOLEAN DEFAULT 0,
        response_time_ms INTEGER,
        impact_on_registration TEXT,
        FOREIGN KEY (registration_id) REFERENCES registration_attempts (id),
        FOREIGN KEY (site_id) REFERENCES survey_sites (id)
      );

      -- ===========================================
      -- EMAIL-SITE CORRELATION VIEWS
      -- ===========================================
      
      -- Create view for email-site correlation summary
      CREATE VIEW IF NOT EXISTS email_site_correlation AS
      SELECT 
        ea.email,
        ea.service,
        ea.usage_count,
        ss.site_name,
        ss.site_category,
        ra.success,
        ra.started_at as registration_date,
        ra.failure_reason,
        COUNT(rq.id) as questions_answered,
        up.yield_prediction,
        sc.username as site_username,
        sc.password as site_password
      FROM email_accounts ea
      LEFT JOIN registration_attempts ra ON ea.id = ra.email_id
      LEFT JOIN survey_sites ss ON ra.site_id = ss.id
      LEFT JOIN registration_questions rq ON ra.id = rq.registration_id
      LEFT JOIN user_profiles up ON ra.id = up.registration_id
      LEFT JOIN site_credentials sc ON (ea.id = sc.email_id AND ss.id = sc.site_id)
      GROUP BY ea.email, ss.site_name, ra.id;

      -- Create view for site intelligence summary
      CREATE VIEW IF NOT EXISTS site_intelligence_summary AS
      SELECT 
        ss.site_name,
        ss.site_category,
        ss.successful_registrations,
        ss.failed_registrations,
        ss.defense_level,
        COUNT(DISTINCT sd.defense_type) as unique_defenses,
        COUNT(DISTINCT sq.demographic_category) as question_categories,
        AVG(ra.completion_time_seconds) as avg_completion_time,
        COUNT(DISTINCT ea.email) as unique_emails_attempted
      FROM survey_sites ss
      LEFT JOIN site_defenses sd ON ss.id = sd.site_id
      LEFT JOIN site_questions sq ON ss.id = sq.site_id
      LEFT JOIN registration_attempts ra ON ss.id = ra.site_id
      LEFT JOIN email_accounts ea ON ra.email_id = ea.id
      GROUP BY ss.id;

      -- ===========================================
      -- INDEXES FOR PERFORMANCE
      -- ===========================================
      
      CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email);
      CREATE INDEX IF NOT EXISTS idx_email_accounts_service ON email_accounts(service);
      CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_site ON registration_attempts(email_id, site_id);
      CREATE INDEX IF NOT EXISTS idx_registration_attempts_success ON registration_attempts(success);
      CREATE INDEX IF NOT EXISTS idx_registration_attempts_started_at ON registration_attempts(started_at);
      CREATE INDEX IF NOT EXISTS idx_site_defenses_site_type ON site_defenses(site_id, defense_type);
      CREATE INDEX IF NOT EXISTS idx_registration_questions_registration ON registration_questions(registration_id);
      CREATE INDEX IF NOT EXISTS idx_ai_interactions_registration ON ai_interactions(registration_id);
      CREATE INDEX IF NOT EXISTS idx_site_questions_site_category ON site_questions(site_id, demographic_category);
      CREATE INDEX IF NOT EXISTS idx_form_interactions_registration ON form_interactions(registration_id);
      CREATE INDEX IF NOT EXISTS idx_detection_events_site_severity ON detection_events(site_id, severity_level);
    `;

    db.exec(enhancedSchema, (err) => {
      if (err) {
        console.error('❌ Error creating enhanced tables:', err);
        reject(err);
      } else {
        console.log('✅ Enhanced database tables created successfully');
        resolve();
      }
      db.close();
    });
  });
};

const insertEnhancedSampleData = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const sampleData = `
      -- Sample survey sites
      INSERT OR IGNORE INTO survey_sites (
        site_name, base_url, registration_url, site_category, site_type,
        defense_level, requires_verification, has_captcha
      ) VALUES 
      ('Wufoo', 'https://wufoo.com', 'https://wufoo.com/signup/', 'form_builder', 'enterprise', 3, 1, 0),
      ('SurveyPlanet', 'https://surveyplanet.com', 'https://surveyplanet.com/register', 'survey', 'survey_platform', 2, 1, 0),
      ('Typeform', 'https://typeform.com', 'https://typeform.com/signup/', 'form_builder', 'enterprise', 4, 1, 1),
      ('SurveyMonkey', 'https://surveymonkey.com', 'https://surveymonkey.com/mp/take-a-tour/', 'survey', 'enterprise', 5, 1, 1);

      -- Sample defense types
      INSERT OR IGNORE INTO site_defenses (
        site_id, defense_type, defense_subtype, severity_level, description
      ) VALUES 
      (1, 'honeypot', 'hidden_fields', 2, 'Hidden form fields to detect bots'),
      (1, 'rate_limiting', 'temporal', 3, 'Time-based registration limits'),
      (2, 'email_verification', 'required', 2, 'Email verification required for activation'),
      (3, 'captcha', 'recaptcha_v3', 4, 'Google reCAPTCHA v3 integration'),
      (4, 'fingerprinting', 'browser_analysis', 5, 'Advanced browser fingerprinting');
    `;

    db.exec(sampleData, (err) => {
      if (err) {
        console.error('❌ Error inserting enhanced sample data:', err);
        reject(err);
      } else {
        console.log('✅ Enhanced sample data inserted successfully');
        resolve();
      }
      db.close();
    });
  });
};

const setupEnhancedDatabase = async () => {
  try {
    console.log('🚀 Setting up Enhanced Database Schema...');
    console.log('=====================================');
    
    const dataDir = path.join(__dirname, '../../data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    await createEnhancedTables();
    await insertEnhancedSampleData();
    
    console.log('\n✅ Enhanced Database Setup Complete!');
    console.log('=====================================');
    console.log('📊 New Capabilities:');
    console.log('   • Email-Site correlation tracking');
    console.log('   • Comprehensive site intelligence');
    console.log('   • LLM interaction logging');
    console.log('   • Failure reason analysis');
    console.log('   • Anti-bot countermeasure detection');
    console.log('   • Registration question repository');
    console.log('   • Site credential storage');
    console.log('   • Performance analytics');
    console.log('\n📋 Available Views:');
    console.log('   • email_site_correlation');
    console.log('   • site_intelligence_summary');
    console.log('\n🔍 Database Location:', DB_PATH);
  } catch (error) {
    console.error('❌ Enhanced database setup failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  setupEnhancedDatabase();
}

module.exports = { 
  setupEnhancedDatabase, 
  createEnhancedTables, 
  insertEnhancedSampleData,
  DB_PATH 
};