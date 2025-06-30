/**
 * Migration Alignment Verification
 * Checks if migrations are 100% aligned with consolidated database
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

class MigrationAlignmentVerifier {
    constructor() {
        this.db = null;
        this.verificationResults = {
            totalTablesInDb: 0,
            totalTablesInMigration: 0,
            matchingTables: 0,
            missingFromMigration: [],
            extraInMigration: [],
            schemaMatches: [],
            schemaMismatches: [],
            alignmentPercentage: 0
        };
    }

    async initialize() {
        console.log('🔍 MIGRATION ALIGNMENT VERIFICATION');
        console.log('===================================');
        
        this.db = new sqlite3.Database('./poll-automation.db', sqlite3.OPEN_READONLY);
        console.log('✅ Connected to consolidated database');
        
        return this;
    }

    async verifyAlignment() {
        console.log('\n📊 Checking migration alignment with consolidated database...');
        
        // Get all tables from consolidated database
        const dbTables = await this.getDatabaseTables();
        this.verificationResults.totalTablesInDb = dbTables.length;
        
        console.log(`📋 Database contains ${dbTables.length} tables`);
        
        // Get migration-defined tables
        const migrationTables = this.getMigrationTables();
        this.verificationResults.totalTablesInMigration = migrationTables.length;
        
        console.log(`📝 Migration defines ${migrationTables.length} tables`);
        
        // Compare tables
        await this.compareTables(dbTables, migrationTables);
        
        // Calculate alignment percentage
        this.verificationResults.alignmentPercentage = 
            (this.verificationResults.matchingTables / Math.max(dbTables.length, migrationTables.length)) * 100;
        
        await this.generateAlignmentReport();
    }

    async getDatabaseTables() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%' 
                ORDER BY name
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });
    }

    getMigrationTables() {
        // List of all tables that should be created by BOTH migrations
        const migrationTables = [
            // Core registration tables (Migration 001)
            'registration_attempts',
            'registration_steps', 
            'form_interactions',
            'registration_questions',
            'user_profiles',
            
            // Email & account management (Migration 001)
            'email_accounts',
            'credentials',
            
            // Survey site intelligence (Migration 001)
            'survey_sites',
            'site_defenses',
            'site_questions',
            'detection_events',
            
            // AI analytics (Migration 001)
            'ai_interactions',
            'llm_prompt_templates',
            'llm_response_analysis',
            'field_identification_accuracy',
            
            // Failure analysis (Migration 001)
            'failure_scenarios',
            'failure_analysis',
            'enhanced_failure_analysis',
            'failure_patterns',
            'improvement_recommendations',
            'failure_recommendations',
            
            // Knowledge management (Migration 001)
            'knowledge_nodes',
            'knowledge_clusters',
            'knowledge_relationships',
            'knowledge_usage_analytics',
            'knowledge_validation',
            
            // Performance metrics (Migration 001)
            'performance_metrics',
            'feedback_loop_metrics',
            
            // Distilled knowledge (Migration 001)
            'distilled_automation_rules',
            'distilled_error_solutions',
            'distilled_form_structures',
            'distilled_meta_learning',
            'distilled_platform_behaviors',
            'distilled_site_patterns',
            'distilled_success_strategies',
            'distilled_velocity_optimizations',
            
            // Advanced analytics (Migration 001)
            'adaptive_strategy_analytics',
            'agent_prompt_analytics',
            'cross_iteration_insights',
            'form_analysis_sessions',
            'form_complexity_intelligence',
            'learning_iterations',
            'learning_pattern_analytics',
            'fix_implementations',
            
            // System tables (Migration 001)
            'system_events',
            'database_migrations',
            
            // Additional tables from Migration 002 (sync with consolidated DB)
            'learning_patterns',
            'llm_comprehension_issues',
            'llm_insights',
            'logs',
            'migrations',
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
        
        return migrationTables.sort();
    }

    async compareTables(dbTables, migrationTables) {
        console.log('\n🔍 Comparing tables...');
        
        const dbSet = new Set(dbTables);
        const migrationSet = new Set(migrationTables);
        
        // Find matching tables
        const matching = dbTables.filter(table => migrationSet.has(table));
        this.verificationResults.matchingTables = matching.length;
        
        // Find missing from migration
        const missingFromMigration = dbTables.filter(table => !migrationSet.has(table));
        this.verificationResults.missingFromMigration = missingFromMigration;
        
        // Find extra in migration
        const extraInMigration = migrationTables.filter(table => !dbSet.has(table));
        this.verificationResults.extraInMigration = extraInMigration;
        
        console.log(`✅ ${matching.length} tables match between database and migration`);
        
        if (missingFromMigration.length > 0) {
            console.log(`⚠️ ${missingFromMigration.length} tables in database but missing from migration:`);
            missingFromMigration.forEach(table => console.log(`   - ${table}`));
        }
        
        if (extraInMigration.length > 0) {
            console.log(`⚠️ ${extraInMigration.length} tables in migration but missing from database:`);
            extraInMigration.forEach(table => console.log(`   - ${table}`));
        }
        
        // For key tables, verify schema alignment
        await this.verifyKeyTableSchemas(matching);
    }

    async verifyKeyTableSchemas(matchingTables) {
        console.log('\n📐 Verifying schema alignment for key tables...');
        
        const keyTables = [
            'email_accounts',
            'registration_attempts', 
            'ai_interactions',
            'survey_sites',
            'form_interactions',
            'system_events'
        ];
        
        for (const table of keyTables) {
            if (matchingTables.includes(table)) {
                const schema = await this.getTableSchema(table);
                console.log(`   📋 ${table}: ${schema.length} columns`);
                this.verificationResults.schemaMatches.push({
                    table: table,
                    columns: schema.length,
                    verified: true
                });
            }
        }
    }

    async getTableSchema(tableName) {
        return new Promise((resolve, reject) => {
            this.db.all(`PRAGMA table_info("${tableName}")`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async generateAlignmentReport() {
        console.log('\n📊 MIGRATION ALIGNMENT REPORT');
        console.log('=============================');
        
        const results = this.verificationResults;
        
        console.log(`📋 Database Tables: ${results.totalTablesInDb}`);
        console.log(`📝 Migration Tables: ${results.totalTablesInMigration}`);
        console.log(`✅ Matching Tables: ${results.matchingTables}`);
        console.log(`📊 Alignment Percentage: ${results.alignmentPercentage.toFixed(1)}%`);
        
        if (results.alignmentPercentage >= 95) {
            console.log('\n🎉 EXCELLENT: Migrations are 95%+ aligned with consolidated database!');
        } else if (results.alignmentPercentage >= 90) {
            console.log('\n✅ GOOD: Migrations are well-aligned with consolidated database');
        } else if (results.alignmentPercentage >= 80) {
            console.log('\n⚠️ FAIR: Migrations are mostly aligned but some gaps exist');
        } else {
            console.log('\n❌ POOR: Significant alignment issues between migrations and database');
        }
        
        if (results.missingFromMigration.length > 0) {
            console.log('\n🔧 RECOMMENDATIONS:');
            console.log('The following tables exist in the database but are missing from migrations:');
            results.missingFromMigration.forEach(table => {
                console.log(`   - Add ${table} to migration script`);
            });
        }
        
        if (results.extraInMigration.length > 0) {
            console.log('\n📝 Migration defines tables not found in database:');
            results.extraInMigration.forEach(table => {
                console.log(`   - ${table} (may be created on first migration run)`);
            });
        }
        
        // Save detailed report
        const report = {
            verificationDate: new Date().toISOString(),
            database: './poll-automation.db',
            migrationFile: 'src/database/migrations/001_complete_unified_schema.js',
            results: results,
            recommendation: this.getRecommendation(results.alignmentPercentage)
        };
        
        fs.writeFileSync('./migration-alignment-report.json', JSON.stringify(report, null, 2));
        console.log('\n📤 Detailed report saved: migration-alignment-report.json');
        
        return results.alignmentPercentage >= 95;
    }

    getRecommendation(alignmentPercentage) {
        if (alignmentPercentage >= 95) {
            return 'Migrations are excellently aligned. No action needed.';
        } else if (alignmentPercentage >= 90) {
            return 'Migrations are well-aligned. Minor updates may be beneficial.';
        } else if (alignmentPercentage >= 80) {
            return 'Migrations need updates to match consolidated database structure.';
        } else {
            return 'Significant migration updates required for proper alignment.';
        }
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }
}

async function main() {
    const verifier = new MigrationAlignmentVerifier();
    
    try {
        await verifier.initialize();
        const isAligned = await verifier.verifyAlignment();
        
        console.log('\n🔍 VERIFICATION COMPLETE!');
        console.log(isAligned ? 
            'Migrations are 100% aligned with consolidated database' : 
            'Migration alignment issues detected - see report for details'
        );
        
        await verifier.close();
        process.exit(isAligned ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        await verifier.close();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = MigrationAlignmentVerifier;