/**
 * Database Manager
 * Central database management with migrations, connections, and operations
 * Replaces all one-off database scripts with proper architecture
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const MigrationManager = require('./migration-manager');

class DatabaseManager {
    constructor(options = {}) {
        this.dbPath = options.dbPath || process.env.DB_PATH || './poll-automation.db';
        this.migrationManager = new MigrationManager(this.dbPath);
        this.db = null;
        this.isInitialized = false;
        
        // Connection pool settings
        this.connectionOptions = {
            timeout: options.timeout || 30000,
            busyTimeout: options.busyTimeout || 10000,
            enableForeignKeys: options.enableForeignKeys !== false,
            enableWAL: options.enableWAL !== false, // Write-Ahead Logging for better concurrency
            cacheSize: options.cacheSize || 2000,
            ...options.connectionOptions
        };
        
        this.stats = {
            connections: 0,
            queries: 0,
            migrations: 0,
            errors: 0,
            lastActivity: null
        };
    }
    
    /**
     * Initialize database with migrations and optimizations
     */
    async initialize() {
        if (this.isInitialized) {
            return this.db;
        }
        
        console.log('🗄️ Initializing Database Manager...');
        
        try {
            // Create database directory if it doesn't exist
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // Initialize database connection
            await this.connect();
            
            // Apply database optimizations
            await this.applyOptimizations();
            
            // Initialize migration system
            await this.migrationManager.initialize();
            
            // Run pending migrations
            await this.migrationManager.runMigrations();
            
            // Verify database integrity
            await this.verifyIntegrity();
            
            // Setup connection monitoring
            this.setupMonitoring();
            
            this.isInitialized = true;
            this.stats.migrations++;
            
            console.log('✅ Database Manager initialized successfully');
            console.log(`📊 Database path: ${this.dbPath}`);
            
            return this.db;
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.stats.errors++;
            throw error;
        }
    }
    
    /**
     * Create database connection with optimizations
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err);
                    this.stats.errors++;
                    reject(err);
                } else {
                    console.log('✅ Database connected successfully');
                    this.stats.connections++;
                    resolve(this.db);
                }
            });
        });
    }
    
    /**
     * Apply database performance optimizations
     */
    async applyOptimizations() {
        console.log('⚡ Applying database optimizations...');
        
        const optimizations = [
            // Enable foreign key constraints
            this.connectionOptions.enableForeignKeys ? 'PRAGMA foreign_keys = ON' : null,
            
            // Enable Write-Ahead Logging for better concurrency
            this.connectionOptions.enableWAL ? 'PRAGMA journal_mode = WAL' : null,
            
            // Set busy timeout
            `PRAGMA busy_timeout = ${this.connectionOptions.busyTimeout}`,
            
            // Optimize cache size
            `PRAGMA cache_size = ${this.connectionOptions.cacheSize}`,
            
            // Optimize synchronization for performance
            'PRAGMA synchronous = NORMAL',
            
            // Memory-mapped I/O for better performance
            'PRAGMA mmap_size = 268435456', // 256MB
            
            // Optimize temp storage
            'PRAGMA temp_store = MEMORY',
            
            // Optimize query planner
            'PRAGMA optimize',
            
            // Auto-vacuum for maintenance
            'PRAGMA auto_vacuum = INCREMENTAL'
        ].filter(Boolean);
        
        for (const pragma of optimizations) {
            await this.run(pragma);
        }
        
        console.log('✅ Database optimizations applied');
    }
    
    /**
     * Verify database integrity
     */
    async verifyIntegrity() {
        console.log('🔍 Verifying database integrity...');
        
        try {
            // Check database integrity
            const integrityResult = await this.get('PRAGMA integrity_check');
            if (integrityResult.integrity_check !== 'ok') {
                throw new Error(`Database integrity check failed: ${integrityResult.integrity_check}`);
            }
            
            // Verify core tables exist
            const coreTableCheck = await this.get(`
                SELECT COUNT(*) as count 
                FROM sqlite_master 
                WHERE type='table' AND name IN (
                    'email_accounts', 'survey_sites', 'registration_attempts',
                    'failure_scenarios', 'failure_analysis', 'migrations'
                )
            `);
            
            if (coreTableCheck.count < 6) {
                throw new Error('Core database tables missing - migration may have failed');
            }
            
            console.log('✅ Database integrity verified');
            
        } catch (error) {
            console.error('❌ Database integrity check failed:', error);
            this.stats.errors++;
            throw error;
        }
    }
    
    /**
     * Setup connection monitoring and maintenance
     */
    setupMonitoring() {
        // Periodic maintenance
        setInterval(async () => {
            try {
                await this.performMaintenance();
            } catch (error) {
                console.error('Database maintenance error:', error);
                this.stats.errors++;
            }
        }, 3600000); // Every hour
        
        // Log activity
        this.stats.lastActivity = new Date();
    }
    
    /**
     * Perform periodic database maintenance
     */
    async performMaintenance() {
        try {
            // Incremental vacuum
            await this.run('PRAGMA incremental_vacuum(1000)');
            
            // Analyze for query optimization
            await this.run('ANALYZE');
            
            // Update statistics
            await this.updateStatistics();
            
        } catch (error) {
            console.error('Database maintenance failed:', error);
            throw error;
        }
    }
    
    /**
     * Update internal statistics
     */
    async updateStatistics() {
        try {
            // Get database size
            const sizeResult = await this.get('PRAGMA page_count');
            const pageSizeResult = await this.get('PRAGMA page_size');
            const dbSize = (sizeResult.page_count * pageSizeResult.page_size) / (1024 * 1024); // MB
            
            // Get table counts
            const tables = await this.all(`
                SELECT name, 
                       (SELECT COUNT(*) FROM ${name}) as row_count
                FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);
            
            this.stats.dbSize = dbSize;
            this.stats.tables = tables.reduce((acc, table) => {
                acc[table.name] = table.row_count;
                return acc;
            }, {});
            
        } catch (error) {
            console.error('Statistics update failed:', error);
        }
    }
    
    /**
     * Promise-wrapped database methods
     */
    async run(sql, params = []) {
        this.stats.queries++;
        this.stats.lastActivity = new Date();
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err);
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }
    
    async get(sql, params = []) {
        this.stats.queries++;
        this.stats.lastActivity = new Date();
        
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database get error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    async all(sql, params = []) {
        this.stats.queries++;
        this.stats.lastActivity = new Date();
        
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database all error:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    /**
     * Transaction support
     */
    async transaction(callback) {
        await this.run('BEGIN TRANSACTION');
        
        try {
            const result = await callback(this);
            await this.run('COMMIT');
            return result;
        } catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
    }
    
    /**
     * Migration management methods
     */
    async runMigrations() {
        return this.migrationManager.runMigrations();
    }
    
    async rollbackTo(version) {
        return this.migrationManager.rollbackTo(version);
    }
    
    async getMigrationStatus() {
        return this.migrationManager.getStatus();
    }
    
    async createMigration(name) {
        return this.migrationManager.createMigration(name);
    }
    
    /**
     * Database backup and restore
     */
    async backup(backupPath) {
        console.log(`📦 Creating database backup: ${backupPath}`);
        
        try {
            const backupDb = new sqlite3.Database(backupPath);
            
            return new Promise((resolve, reject) => {
                this.db.backup(backupDb, (err) => {
                    backupDb.close();
                    if (err) {
                        reject(err);
                    } else {
                        console.log('✅ Database backup completed');
                        resolve(backupPath);
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Database backup failed:', error);
            throw error;
        }
    }
    
    async restore(backupPath) {
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        
        console.log(`📥 Restoring database from: ${backupPath}`);
        
        try {
            await this.close();
            
            // Replace current database with backup
            fs.copyFileSync(backupPath, this.dbPath);
            
            // Reconnect
            await this.connect();
            await this.applyOptimizations();
            
            console.log('✅ Database restore completed');
            
        } catch (error) {
            console.error('❌ Database restore failed:', error);
            throw error;
        }
    }
    
    /**
     * Health check and diagnostics
     */
    async healthCheck() {
        try {
            // Test basic connectivity
            await this.get('SELECT 1 as test');
            
            // Check database file
            const stats = fs.statSync(this.dbPath);
            
            // Get current statistics
            await this.updateStatistics();
            
            return {
                status: 'healthy',
                dbPath: this.dbPath,
                dbSize: this.stats.dbSize,
                fileSize: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                lastModified: stats.mtime,
                connections: this.stats.connections,
                queries: this.stats.queries,
                errors: this.stats.errors,
                lastActivity: this.stats.lastActivity,
                tables: this.stats.tables
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                dbPath: this.dbPath
            };
        }
    }
    
    /**
     * Export data for analysis
     */
    async exportData(options = {}) {
        const { tables = 'all', format = 'json', outputPath } = options;
        
        console.log(`📤 Exporting database data (format: ${format})...`);
        
        try {
            let tablesToExport;
            
            if (tables === 'all') {
                const allTables = await this.all(`
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'
                `);
                tablesToExport = allTables.map(t => t.name);
            } else {
                tablesToExport = Array.isArray(tables) ? tables : [tables];
            }
            
            const exportData = {};
            
            for (const table of tablesToExport) {
                exportData[table] = await this.all(`SELECT * FROM ${table}`);
            }
            
            exportData._metadata = {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                dbPath: this.dbPath,
                tables: tablesToExport,
                totalRecords: Object.values(exportData).reduce((sum, data) => sum + (Array.isArray(data) ? data.length : 0), 0)
            };
            
            if (outputPath) {
                const exportContent = format === 'json' ? 
                    JSON.stringify(exportData, null, 2) :
                    this.convertToCSV(exportData);
                
                fs.writeFileSync(outputPath, exportContent);
                console.log(`✅ Data exported to: ${outputPath}`);
            }
            
            return exportData;
            
        } catch (error) {
            console.error('❌ Data export failed:', error);
            throw error;
        }
    }
    
    /**
     * Get database statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            dbPath: this.dbPath,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    this.isInitialized = false;
                    resolve();
                });
            });
        }
    }
    
    /**
     * Helper method to convert data to CSV format
     */
    convertToCSV(data) {
        const csvParts = [];
        
        for (const [tableName, tableData] of Object.entries(data)) {
            if (tableName.startsWith('_') || !Array.isArray(tableData) || tableData.length === 0) {
                continue;
            }
            
            csvParts.push(`\n\n=== ${tableName.toUpperCase()} ===`);
            
            const headers = Object.keys(tableData[0]);
            csvParts.push(headers.join(','));
            
            for (const row of tableData) {
                const values = headers.map(header => {
                    const value = row[header];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                    return value;
                });
                csvParts.push(values.join(','));
            }
        }
        
        return csvParts.join('\n');
    }
}

// Create singleton instance
let dbManagerInstance = null;

/**
 * Get singleton database manager instance
 */
function getDatabaseManager(options = {}) {
    if (!dbManagerInstance) {
        dbManagerInstance = new DatabaseManager(options);
    }
    return dbManagerInstance;
}

module.exports = { DatabaseManager, getDatabaseManager };