/**
 * Migration 000: Schema Adaptation
 * Adapts existing database schema to standardized structure
 * Handles both new installations and existing databases
 */

module.exports = {
    name: '000_schema_adaptation',
    description: 'Adapt existing schema to standardized structure',
    
    async up(db) {
        console.log('🔧 Adapting database schema...');
        
        // Disable foreign keys during schema changes
        await this.run(db, 'PRAGMA foreign_keys = OFF');
        
        try {
            // Check what tables exist
            const existingTables = await this.getTables(db);
            console.log('📋 Existing tables:', existingTables);
            
            // Adapt registration_attempts table if it exists
            if (existingTables.includes('registration_attempts')) {
                await this.adaptRegistrationAttempts(db);
            } else {
                await this.createRegistrationAttempts(db);
            }
            
            // Ensure all other essential tables exist
            await this.ensureEssentialTables(db);
            
            // Create essential indexes (skip if they already exist)
            await this.createEssentialIndexes(db);
            
        } finally {
            // Re-enable foreign keys
            await this.run(db, 'PRAGMA foreign_keys = ON');
        }
        
        console.log('✅ Schema adaptation complete');
    },
    
    async adaptRegistrationAttempts(db) {
        console.log('🔧 Adapting registration_attempts table...');
        
        const columns = await this.getTableColumns(db, 'registration_attempts');
        const columnNames = columns.map(c => c.name);
        
        // Add missing columns that the new schema expects
        const columnsToAdd = [
            { name: 'site_url', sql: 'ALTER TABLE registration_attempts ADD COLUMN site_url TEXT' },
            { name: 'site_name', sql: 'ALTER TABLE registration_attempts ADD COLUMN site_name TEXT' },
            { name: 'failure_reason', sql: 'ALTER TABLE registration_attempts ADD COLUMN failure_reason TEXT' },
            { name: 'started_at', sql: 'ALTER TABLE registration_attempts ADD COLUMN started_at DATETIME' },
            { name: 'completed_at', sql: 'ALTER TABLE registration_attempts ADD COLUMN completed_at DATETIME' },
            { name: 'duration_seconds', sql: 'ALTER TABLE registration_attempts ADD COLUMN duration_seconds INTEGER' }
        ];
        
        for (const column of columnsToAdd) {
            if (!columnNames.includes(column.name)) {
                try {
                    await this.run(db, column.sql);
                    console.log(`  ✅ Added column: ${column.name}`);
                } catch (error) {
                    console.log(`  ⚠️ Could not add ${column.name}: ${error.message}`);
                }
            }
        }
        
        // Migrate existing data
        try {
            await this.run(db, `
                UPDATE registration_attempts 
                SET 
                    failure_reason = COALESCE(failure_reason, error_message),
                    started_at = COALESCE(started_at, attempt_date),
                    site_url = COALESCE(site_url, (SELECT url FROM survey_sites WHERE id = registration_attempts.site_id))
                WHERE site_url IS NULL OR started_at IS NULL
            `);
            console.log('  ✅ Migrated existing data');
        } catch (error) {
            console.log(`  ⚠️ Data migration warning: ${error.message}`);
        }
    },
    
    async createRegistrationAttempts(db) {
        console.log('🆕 Creating registration_attempts table...');
        
        await this.run(db, `
            CREATE TABLE registration_attempts (
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
            )
        `);
        
        console.log('  ✅ Created registration_attempts table');
    },
    
    async ensureEssentialTables(db) {
        console.log('🔧 Ensuring essential tables exist...');
        
        const tables = await this.getTables(db);
        
        // Essential tables that must exist
        const essentialTables = {
            email_accounts: `
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
                )
            `,
            survey_sites: `
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
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `,
            form_interactions: `
                CREATE TABLE IF NOT EXISTS form_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER NOT NULL,
                    field_selector TEXT NOT NULL,
                    field_type TEXT,
                    field_name TEXT,
                    value_filled TEXT,
                    success BOOLEAN DEFAULT FALSE,
                    ai_generated BOOLEAN DEFAULT FALSE,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
                )
            `,
            ai_interactions: `
                CREATE TABLE IF NOT EXISTS ai_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    registration_id INTEGER,
                    prompt_type TEXT NOT NULL,
                    prompt_text TEXT NOT NULL,
                    response_text TEXT,
                    tokens_used INTEGER,
                    processing_time_ms INTEGER,
                    success BOOLEAN DEFAULT FALSE,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (registration_id) REFERENCES registration_attempts(id)
                )
            `,
            system_events: `
                CREATE TABLE IF NOT EXISTS system_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    event_description TEXT,
                    severity TEXT DEFAULT 'info',
                    metadata TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `
        };
        
        for (const [tableName, createSql] of Object.entries(essentialTables)) {
            try {
                await this.run(db, createSql);
                console.log(`  ✅ Table: ${tableName}`);
            } catch (error) {
                console.log(`  ⚠️ Table ${tableName}: ${error.message}`);
            }
        }
    },
    
    async createEssentialIndexes(db) {
        console.log('📊 Creating essential indexes...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_email_id ON registration_attempts(email_id)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_success ON registration_attempts(success)',
            'CREATE INDEX IF NOT EXISTS idx_registration_attempts_started_at ON registration_attempts(started_at)',
            'CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email)',
            'CREATE INDEX IF NOT EXISTS idx_email_accounts_service ON email_accounts(service)',
            'CREATE INDEX IF NOT EXISTS idx_survey_sites_url ON survey_sites(url)',
            'CREATE INDEX IF NOT EXISTS idx_form_interactions_registration_id ON form_interactions(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_registration_id ON ai_interactions(registration_id)',
            'CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events(event_type)'
        ];
        
        for (const indexSql of indexes) {
            try {
                await this.run(db, indexSql);
                const indexName = indexSql.match(/idx_\w+/)[0];
                console.log(`  ✅ Index: ${indexName}`);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.log(`  ⚠️ Index error: ${error.message}`);
                }
            }
        }
    },
    
    async down(db) {
        console.log('🔄 Rolling back schema adaptation...');
        // Rollback is complex for schema changes, so we'll just log
        console.log('⚠️ Schema adaptation rollback not implemented');
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
    
    async getTableColumns(db, tableName) {
        return new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
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