-- Persona Consistency Tracking Database Schema
-- Creates tables for maintaining data consistency across registration and surveys

-- Persona consistency tracking table
CREATE TABLE IF NOT EXISTS persona_consistency_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consistency_id TEXT UNIQUE NOT NULL,
    persona_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('registration', 'survey', 'verification')),
    data_content TEXT NOT NULL, -- JSON data
    cross_reference_points TEXT, -- JSON of key data points for cross-referencing
    created_at TEXT NOT NULL,
    metadata TEXT, -- JSON metadata
    
    FOREIGN KEY (persona_id) REFERENCES user_profiles(persona_id)
);

-- Consistency validation checks
CREATE TABLE IF NOT EXISTS consistency_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    question_type TEXT NOT NULL,
    question_data TEXT NOT NULL, -- JSON
    response_data TEXT NOT NULL, -- JSON
    validation_result TEXT NOT NULL, -- JSON with valid/invalid, warnings, errors
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (persona_id) REFERENCES user_profiles(persona_id)
);

-- Enhanced user profiles table (if not exists)
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    age INTEGER,
    income INTEGER,
    education TEXT,
    job_title TEXT,
    company TEXT,
    location TEXT, -- JSON location data
    phone TEXT,
    demographics_data TEXT, -- JSON
    response_patterns TEXT, -- JSON
    background_story TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT -- JSON
);

-- Site-specific persona usage tracking
CREATE TABLE IF NOT EXISTS persona_site_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id TEXT NOT NULL,
    site_name TEXT NOT NULL,
    registration_date TEXT,
    last_survey_date TEXT,
    survey_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    consistency_score REAL DEFAULT 1.0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (persona_id) REFERENCES user_profiles(persona_id),
    UNIQUE(persona_id, site_name)
);

-- Cross-reference violation tracking
CREATE TABLE IF NOT EXISTS consistency_violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id TEXT NOT NULL,
    site_name TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    violation_description TEXT NOT NULL,
    original_value TEXT,
    conflicting_value TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (persona_id) REFERENCES user_profiles(persona_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_persona_consistency_persona_id ON persona_consistency_tracking(persona_id);
CREATE INDEX IF NOT EXISTS idx_persona_consistency_site_id ON persona_consistency_tracking(site_id);
CREATE INDEX IF NOT EXISTS idx_persona_consistency_data_type ON persona_consistency_tracking(data_type);
CREATE INDEX IF NOT EXISTS idx_consistency_checks_persona_id ON consistency_checks(persona_id);
CREATE INDEX IF NOT EXISTS idx_consistency_checks_site_id ON consistency_checks(site_id);
CREATE INDEX IF NOT EXISTS idx_persona_site_usage_persona_id ON persona_site_usage(persona_id);
CREATE INDEX IF NOT EXISTS idx_persona_site_usage_site_name ON persona_site_usage(site_name);
CREATE INDEX IF NOT EXISTS idx_consistency_violations_persona_id ON consistency_violations(persona_id);
CREATE INDEX IF NOT EXISTS idx_consistency_violations_severity ON consistency_violations(severity);

-- Create views for easy data analysis
CREATE VIEW IF NOT EXISTS persona_consistency_summary AS
SELECT 
    p.persona_id,
    p.email,
    p.first_name,
    p.last_name,
    p.job_title,
    p.company,
    COUNT(DISTINCT psu.site_name) as sites_used,
    AVG(psu.consistency_score) as avg_consistency_score,
    COUNT(cv.id) as violation_count,
    COUNT(CASE WHEN cv.severity = 'critical' THEN 1 END) as critical_violations,
    p.created_at
FROM user_profiles p
LEFT JOIN persona_site_usage psu ON p.persona_id = psu.persona_id
LEFT JOIN consistency_violations cv ON p.persona_id = cv.persona_id
GROUP BY p.persona_id;

-- Create view for recent consistency issues
CREATE VIEW IF NOT EXISTS recent_consistency_issues AS
SELECT 
    cv.persona_id,
    p.email,
    p.first_name,
    p.last_name,
    cv.site_name,
    cv.violation_type,
    cv.violation_description,
    cv.severity,
    cv.created_at
FROM consistency_violations cv
JOIN user_profiles p ON cv.persona_id = p.persona_id
WHERE cv.created_at > datetime('now', '-7 days')
AND cv.resolved = FALSE
ORDER BY cv.created_at DESC, cv.severity DESC;

-- Data integrity triggers
CREATE TRIGGER IF NOT EXISTS update_persona_updated_at
    AFTER UPDATE ON user_profiles
    FOR EACH ROW
BEGIN
    UPDATE user_profiles SET updated_at = datetime('now') WHERE persona_id = NEW.persona_id;
END;

CREATE TRIGGER IF NOT EXISTS update_site_usage_updated_at
    AFTER UPDATE ON persona_site_usage
    FOR EACH ROW
BEGIN
    UPDATE persona_site_usage SET updated_at = datetime('now') WHERE id = NEW.id;
END;