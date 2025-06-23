/**
 * Database Migration Manager
 * Handles database schema creation, updates, and migrations
 * Following best practices with versioned migrations
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class MigrationManager {
    constructor(dbPath = './poll-automation.db') {
        this.dbPath = dbPath;
        this.migrationsPath = path.join(__dirname, 'migrations');
        this.db = null;
        
        // Ensure migrations directory exists
        if (!fs.existsSync(this.migrationsPath)) {
            fs.mkdirSync(this.migrationsPath, { recursive: true });
        }
    }
    
    /**
     * Initialize database connection and migration system
     */
    async initialize() {
        console.log('🗄️ Initializing Database Migration Manager...');
        
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err);
                    reject(err);
                } else {
                    console.log('✅ Database connected successfully');
                    this.setupMigrationTable().then(resolve).catch(reject);
                }
            });
        });
    }
    
    /**
     * Setup the migrations tracking table
     */
    async setupMigrationTable() {
        return new Promise((resolve, reject) => {
            const createMigrationTable = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT UNIQUE NOT NULL,
                    version INTEGER NOT NULL,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    checksum TEXT NOT NULL
                )
            `;
            
            this.db.run(createMigrationTable, (err) => {
                if (err) {
                    console.error('❌ Failed to create migrations table:', err);
                    reject(err);
                } else {
                    console.log('✅ Migrations table ready');
                    resolve();
                }
            });
        });
    }
    
    /**
     * Run all pending migrations
     */
    async runMigrations() {
        console.log('🚀 Running database migrations...');
        
        try {
            // Get all available migrations
            const availableMigrations = this.getAvailableMigrations();
            
            // Get executed migrations
            const executedMigrations = await this.getExecutedMigrations();
            const executedNames = new Set(executedMigrations.map(m => m.migration_name));
            
            // Find pending migrations
            const pendingMigrations = availableMigrations.filter(
                migration => !executedNames.has(migration.name)
            );
            
            if (pendingMigrations.length === 0) {
                console.log('✅ All migrations are up to date');
                return;
            }
            
            console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
            
            // Execute pending migrations in order
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            
            console.log('✅ All migrations completed successfully');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
    
    /**
     * Get all available migration files
     */
    getAvailableMigrations() {
        if (!fs.existsSync(this.migrationsPath)) {
            return [];
        }
        
        const migrationFiles = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.js'))
            .sort(); // Ensure consistent order
        
        return migrationFiles.map(file => {
            const version = parseInt(file.split('_')[0]);
            return {
                name: file.replace('.js', ''),
                version: isNaN(version) ? 0 : version,
                filePath: path.join(this.migrationsPath, file)
            };
        }).sort((a, b) => a.version - b.version);
    }
    
    /**
     * Get executed migrations from database
     */
    async getExecutedMigrations() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM migrations ORDER BY version ASC',
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }
    
    /**
     * Execute a single migration
     */
    async executeMigration(migration) {
        console.log(`  📄 Executing migration: ${migration.name}`);
        
        try {
            // Load and execute migration
            const migrationModule = require(migration.filePath);
            
            if (typeof migrationModule.up !== 'function') {
                throw new Error(`Migration ${migration.name} missing 'up' function`);
            }
            
            // Calculate checksum for verification
            const fileContent = fs.readFileSync(migration.filePath, 'utf8');
            const checksum = require('crypto')
                .createHash('sha256')
                .update(fileContent)
                .digest('hex');
            
            // Execute migration within transaction
            await this.executeInTransaction(async () => {
                // Run the migration
                await migrationModule.up(this.db);
                
                // Record migration execution
                await this.recordMigration(migration.name, migration.version, checksum);
            });
            
            console.log(`  ✅ Migration ${migration.name} completed`);
            
        } catch (error) {
            console.error(`  ❌ Migration ${migration.name} failed:`, error);
            throw error;
        }
    }
    
    /**
     * Execute code within database transaction
     */
    async executeInTransaction(callback) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                Promise.resolve(callback())
                    .then(() => {
                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    })
                    .catch((error) => {
                        this.db.run('ROLLBACK', () => {
                            reject(error);
                        });
                    });
            });
        });
    }
    
    /**
     * Record migration execution
     */
    async recordMigration(name, version, checksum) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO migrations (migration_name, version, checksum) VALUES (?, ?, ?)',
                [name, version, checksum],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }
    
    /**
     * Rollback migrations to a specific version
     */
    async rollbackTo(targetVersion) {
        console.log(`🔄 Rolling back to version ${targetVersion}...`);
        
        try {
            const executedMigrations = await this.getExecutedMigrations();
            const migrationsToRollback = executedMigrations
                .filter(m => m.version > targetVersion)
                .sort((a, b) => b.version - a.version); // Reverse order for rollback
            
            if (migrationsToRollback.length === 0) {
                console.log('✅ Already at target version');
                return;
            }
            
            for (const migration of migrationsToRollback) {
                await this.rollbackMigration(migration);
            }
            
            console.log(`✅ Rollback to version ${targetVersion} completed`);
            
        } catch (error) {
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
    
    /**
     * Rollback a single migration
     */
    async rollbackMigration(migration) {
        console.log(`  🔄 Rolling back migration: ${migration.migration_name}`);
        
        try {
            const migrationPath = path.join(this.migrationsPath, `${migration.migration_name}.js`);
            
            if (!fs.existsSync(migrationPath)) {
                throw new Error(`Migration file not found: ${migrationPath}`);
            }
            
            const migrationModule = require(migrationPath);
            
            if (typeof migrationModule.down !== 'function') {
                throw new Error(`Migration ${migration.migration_name} missing 'down' function`);
            }
            
            await this.executeInTransaction(async () => {
                // Execute rollback
                await migrationModule.down(this.db);
                
                // Remove migration record
                await this.removeMigrationRecord(migration.migration_name);
            });
            
            console.log(`  ✅ Migration ${migration.migration_name} rolled back`);
            
        } catch (error) {
            console.error(`  ❌ Rollback failed for ${migration.migration_name}:`, error);
            throw error;
        }
    }
    
    /**
     * Remove migration record
     */
    async removeMigrationRecord(name) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM migrations WHERE migration_name = ?',
                [name],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }
    
    /**
     * Get migration status
     */
    async getStatus() {
        const available = this.getAvailableMigrations();
        const executed = await this.getExecutedMigrations();
        const executedNames = new Set(executed.map(m => m.migration_name));
        
        return {
            total: available.length,
            executed: executed.length,
            pending: available.filter(m => !executedNames.has(m.name)).length,
            migrations: available.map(migration => ({
                name: migration.name,
                version: migration.version,
                executed: executedNames.has(migration.name),
                executedAt: executed.find(e => e.migration_name === migration.name)?.executed_at
            }))
        };
    }
    
    /**
     * Create a new migration file template
     */
    async createMigration(name) {
        const timestamp = Date.now();
        const version = Math.floor(timestamp / 1000); // Unix timestamp as version
        const fileName = `${version}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.js`;
        const filePath = path.join(this.migrationsPath, fileName);
        
        const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

/**
 * Apply the migration
 */
async function up(db) {
    return new Promise((resolve, reject) => {
        // Add your migration code here
        // Example:
        // db.run(\`
        //     CREATE TABLE example (
        //         id INTEGER PRIMARY KEY AUTOINCREMENT,
        //         name TEXT NOT NULL,
        //         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        //     )
        // \`, (err) => {
        //     if (err) reject(err);
        //     else resolve();
        // });
        
        resolve(); // Remove this when you add real migration code
    });
}

/**
 * Rollback the migration
 */
async function down(db) {
    return new Promise((resolve, reject) => {
        // Add your rollback code here
        // Example:
        // db.run('DROP TABLE IF EXISTS example', (err) => {
        //     if (err) reject(err);
        //     else resolve();
        // });
        
        resolve(); // Remove this when you add real rollback code
    });
}

module.exports = { up, down };
`;
        
        fs.writeFileSync(filePath, template);
        console.log(`✅ Migration created: ${fileName}`);
        
        return filePath;
    }
    
    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = MigrationManager;