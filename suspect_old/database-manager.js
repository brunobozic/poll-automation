#!/usr/bin/env node

/**
 * Database Manager CLI
 * Command-line interface for database migrations, seeding, and management
 */

const { Command } = require('commander');
const DatabaseMigrator = require('./src/database/database-migrator');

const program = new Command();

// Configure CLI
program
    .name('database-manager')
    .description('Database migration and management tool')
    .version('1.0.0');

// Initialize database with migrations
program
    .command('init')
    .description('Initialize database with all migrations and seeding')
    .action(async () => {
        console.log('🚀 Initializing database...');
        
        const migrator = new DatabaseMigrator();
        
        try {
            await migrator.initialize();
            console.log('✅ Database initialization completed successfully!');
            
            // Show status
            const status = migrator.getDatabaseStatus();
            console.log('\n📊 Database Status:');
            console.log(`   Database: ${status.database_path}`);
            console.log(`   Tables: ${status.total_tables}`);
            console.log(`   Migrations: ${status.executed_migrations}/${status.total_migrations}`);
            console.log(`   Status: ${status.status}`);
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Show database status
program
    .command('status')
    .description('Show database status and migration information')
    .action(async () => {
        const migrator = new DatabaseMigrator();
        
        try {
            migrator.db = require('better-sqlite3')(migrator.dbPath);
            
            const status = migrator.getDatabaseStatus();
            
            console.log('📊 DATABASE STATUS REPORT');
            console.log('='.repeat(50));
            console.log(`Database Path: ${status.database_path}`);
            console.log(`Total Tables: ${status.total_tables}`);
            console.log(`Total Migrations: ${status.total_migrations}`);
            console.log(`Executed Migrations: ${status.executed_migrations}`);
            console.log(`Status: ${status.status.toUpperCase()}`);
            
            if (status.migrations && status.migrations.length > 0) {
                console.log('\n📋 Executed Migrations:');
                status.migrations.forEach((migration, index) => {
                    console.log(`   ${index + 1}. ${migration.migration_name}`);
                    console.log(`      Executed: ${migration.executed_at}`);
                    console.log(`      Description: ${migration.description}`);
                });
            }
            
            if (status.status === 'pending_migrations') {
                console.log('⚠️ Warning: Some migrations are pending. Run "database-manager migrate" to update.');
            }
            
        } catch (error) {
            console.error('❌ Failed to get database status:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Run migrations only
program
    .command('migrate')
    .description('Run pending database migrations')
    .action(async () => {
        console.log('🔄 Running database migrations...');
        
        const migrator = new DatabaseMigrator();
        
        try {
            migrator.db = require('better-sqlite3')(migrator.dbPath);
            await migrator.setupMigrationsTable();
            migrator.defineMigrations();
            await migrator.runMigrations();
            
            console.log('✅ Migrations completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Seed database only
program
    .command('seed')
    .description('Seed database with initial data')
    .action(async () => {
        console.log('🌱 Seeding database...');
        
        const migrator = new DatabaseMigrator();
        
        try {
            migrator.db = require('better-sqlite3')(migrator.dbPath);
            await migrator.seedDatabase();
            
            console.log('✅ Database seeding completed successfully!');
            
        } catch (error) {
            console.error('❌ Seeding failed:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Reset database
program
    .command('reset')
    .description('Reset database (drop all tables and re-run migrations)')
    .option('-f, --force', 'Force reset without confirmation')
    .action(async (options) => {
        if (!options.force) {
            console.log('⚠️ This will delete ALL data in the database!');
            console.log('Use --force flag to confirm this action.');
            process.exit(1);
        }
        
        console.log('🔄 Resetting database...');
        
        const migrator = new DatabaseMigrator();
        
        try {
            migrator.db = require('better-sqlite3')(migrator.dbPath);
            migrator.defineMigrations();
            await migrator.resetDatabase();
            
            console.log('✅ Database reset completed successfully!');
            
        } catch (error) {
            console.error('❌ Database reset failed:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Test database connection
program
    .command('test')
    .description('Test database connection and basic operations')
    .action(async () => {
        console.log('🔍 Testing database connection...');
        
        const migrator = new DatabaseMigrator();
        
        try {
            migrator.db = require('better-sqlite3')(migrator.dbPath);
            
            // Test basic query
            const result = migrator.db.prepare('SELECT datetime() as current_time').get();
            console.log(`✅ Database connection successful`);
            console.log(`   Current time: ${result.current_time}`);
            
            // Test migration table
            try {
                const migrations = migrator.db.prepare('SELECT COUNT(*) as count FROM database_migrations').get();
                console.log(`✅ Migration tracking working: ${migrations.count} migrations recorded`);
            } catch (error) {
                console.log('⚠️ Migration table not found - run "database-manager init" first');
            }
            
            // Test one of the main tables
            try {
                const accounts = migrator.db.prepare('SELECT COUNT(*) as count FROM email_accounts').get();
                console.log(`✅ Core tables accessible: ${accounts.count} email accounts`);
            } catch (error) {
                console.log('⚠️ Core tables not found - run "database-manager init" first');
            }
            
        } catch (error) {
            console.error('❌ Database test failed:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Show table information
program
    .command('tables')
    .description('List all database tables with row counts')
    .action(async () => {
        const migrator = new DatabaseMigrator();
        
        try {
            migrator.db = require('better-sqlite3')(migrator.dbPath);
            
            // Get all tables
            const tables = migrator.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `).all();
            
            console.log('📋 DATABASE TABLES');
            console.log('='.repeat(50));
            
            if (tables.length === 0) {
                console.log('No tables found. Run "database-manager init" to create tables.');
                return;
            }
            
            for (const table of tables) {
                try {
                    const count = migrator.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
                    console.log(`   ${table.name}: ${count.count} rows`);
                } catch (error) {
                    console.log(`   ${table.name}: Error reading table`);
                }
            }
            
            console.log(`\nTotal: ${tables.length} tables`);
            
        } catch (error) {
            console.error('❌ Failed to list tables:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Export data
program
    .command('export')
    .description('Export database data to JSON')
    .option('-o, --output <file>', 'Output file path', './database-export.json')
    .action(async (options) => {
        console.log('📤 Exporting database data...');
        
        const migrator = new DatabaseMigrator();
        const fs = require('fs');
        
        try {
            migrator.db = require('better-sqlite3')(migrator.dbPath);
            
            // Get all tables
            const tables = migrator.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `).all();
            
            const exportData = {
                exported_at: new Date().toISOString(),
                database_path: migrator.dbPath,
                tables: {}
            };
            
            // Export each table
            for (const table of tables) {
                try {
                    const rows = migrator.db.prepare(`SELECT * FROM ${table.name}`).all();
                    exportData.tables[table.name] = rows;
                    console.log(`   ✅ Exported ${table.name}: ${rows.length} rows`);
                } catch (error) {
                    console.log(`   ❌ Failed to export ${table.name}: ${error.message}`);
                }
            }
            
            // Write to file
            fs.writeFileSync(options.output, JSON.stringify(exportData, null, 2));
            
            console.log(`✅ Database exported to: ${options.output}`);
            console.log(`   Tables exported: ${Object.keys(exportData.tables).length}`);
            console.log(`   Total rows: ${Object.values(exportData.tables).reduce((sum, rows) => sum + rows.length, 0)}`);
            
        } catch (error) {
            console.error('❌ Export failed:', error.message);
            process.exit(1);
        } finally {
            migrator.close();
        }
    });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}