#!/usr/bin/env node

/**
 * Database Examination Script
 * Examines the enhanced storage system tables and compares with basic storage
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/polls.db');

class DatabaseExaminer {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('❌ Error connecting to database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to database successfully');
                    resolve();
                }
            });
        });
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async examineEnhancedTables() {
        console.log('\n🔍 EXAMINING ENHANCED STORAGE SYSTEM TABLES\n');
        console.log('=' * 80);

        // 1. Failure Analysis Table (LLM-powered analysis)
        await this.examineTable('failure_analysis', 'LLM Failure Analysis', [
            'id', 'scenario_id', 'root_cause_analysis', 'confidence_score', 
            'failure_category', 'severity_level', 'preventable', 'business_impact'
        ]);

        // 2. Improvement Recommendations Table
        await this.examineTable('improvement_recommendations', 'AI Recommendations', [
            'id', 'analysis_id', 'recommendation_type', 'priority_level',
            'action_description', 'expected_outcome', 'implementation_effort'
        ]);

        // 3. Learning Patterns Table
        await this.examineTable('learning_patterns', 'Pattern Recognition', [
            'id', 'pattern_name', 'pattern_type', 'confidence_score',
            'pattern_data', 'occurrence_count', 'last_seen'
        ]);

        // 4. Failure Scenarios Table (Enhanced context capture)
        await this.examineTable('failure_scenarios', 'Enhanced Failure Scenarios', [
            'id', 'site_name', 'step_name', 'error_type', 'error_message',
            'reproduction_steps', 'dom_snapshot', 'screenshot_path'
        ]);

        // 5. Performance Metrics Table
        await this.examineTable('performance_metrics', 'Performance Analytics', [
            'id', 'metric_name', 'metric_value', 'measurement_unit',
            'site_name', 'timestamp', 'confidence_level'
        ]);

        // 6. LLM Insights Table
        await this.examineTable('llm_insights', 'LLM Generated Insights', [
            'id', 'insight_type', 'insight_data', 'confidence_score',
            'validation_status', 'created_at'
        ]);
    }

    async examineTable(tableName, displayName, keyColumns) {
        console.log(`\n📊 ${displayName.toUpperCase()}`);
        console.log('-'.repeat(displayName.length + 4));

        try {
            // Check if table exists
            const tableExists = await this.query(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=?
            `, [tableName]);

            if (tableExists.length === 0) {
                console.log(`❌ Table '${tableName}' does not exist`);
                return;
            }

            // Get table schema
            const schema = await this.query(`PRAGMA table_info(${tableName})`);
            console.log(`\n🏗️  Table Schema (${schema.length} columns):`);
            schema.forEach(col => {
                const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
                const defaultValue = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
                console.log(`   ${col.name} (${col.type}) ${nullable}${defaultValue}`);
            });

            // Get row count
            const countResult = await this.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            const rowCount = countResult[0].count;
            console.log(`\n📈 Total Records: ${rowCount}`);

            if (rowCount > 0) {
                // Show sample data
                const sampleData = await this.query(`
                    SELECT ${keyColumns.join(', ')} 
                    FROM ${tableName} 
                    ORDER BY rowid DESC 
                    LIMIT 5
                `);

                console.log(`\n📋 Sample Data (Latest 5 records):`);
                if (sampleData.length > 0) {
                    console.table(sampleData);
                } else {
                    console.log('   No data available');
                }

                // Show some analytics if possible
                await this.showTableAnalytics(tableName, displayName);
            } else {
                console.log('   ℹ️  No data in this table yet');
            }

        } catch (error) {
            console.error(`❌ Error examining table ${tableName}:`, error.message);
        }
    }

    async showTableAnalytics(tableName, displayName) {
        try {
            switch (tableName) {
                case 'failure_analysis':
                    const categoryStats = await this.query(`
                        SELECT failure_category, COUNT(*) as count, AVG(confidence_score) as avg_confidence
                        FROM ${tableName} 
                        GROUP BY failure_category 
                        ORDER BY count DESC
                    `);
                    if (categoryStats.length > 0) {
                        console.log('\n📊 Failure Categories:');
                        console.table(categoryStats);
                    }
                    break;

                case 'improvement_recommendations':
                    const priorityStats = await this.query(`
                        SELECT priority_level, COUNT(*) as count 
                        FROM ${tableName} 
                        GROUP BY priority_level 
                        ORDER BY 
                            CASE priority_level 
                                WHEN 'critical' THEN 1 
                                WHEN 'high' THEN 2 
                                WHEN 'medium' THEN 3 
                                WHEN 'low' THEN 4 
                            END
                    `);
                    if (priorityStats.length > 0) {
                        console.log('\n🎯 Recommendation Priorities:');
                        console.table(priorityStats);
                    }
                    break;

                case 'learning_patterns':
                    const patternStats = await this.query(`
                        SELECT pattern_name, occurrence_count, confidence_score 
                        FROM ${tableName} 
                        ORDER BY occurrence_count DESC 
                        LIMIT 3
                    `);
                    if (patternStats.length > 0) {
                        console.log('\n🔄 Top Learning Patterns:');
                        console.table(patternStats);
                    }
                    break;

                case 'performance_metrics':
                    const metricStats = await this.query(`
                        SELECT metric_name, AVG(metric_value) as avg_value, COUNT(*) as sample_count
                        FROM ${tableName} 
                        GROUP BY metric_name 
                        ORDER BY sample_count DESC
                    `);
                    if (metricStats.length > 0) {
                        console.log('\n⚡ Performance Metrics:');
                        console.table(metricStats);
                    }
                    break;

                case 'llm_insights':
                    const insightStats = await this.query(`
                        SELECT insight_type, COUNT(*) as count, AVG(confidence_score) as avg_confidence
                        FROM ${tableName} 
                        GROUP BY insight_type 
                        ORDER BY count DESC
                    `);
                    if (insightStats.length > 0) {
                        console.log('\n🧠 LLM Insight Types:');
                        console.table(insightStats);
                    }
                    break;
            }
        } catch (error) {
            console.warn(`⚠️  Analytics error for ${tableName}:`, error.message);
        }
    }

    async compareWithBasicStorage() {
        console.log('\n🔄 COMPARISON: ENHANCED vs BASIC STORAGE\n');
        console.log('=' * 50);

        // Basic tables
        const basicTables = ['logs', 'poll_errors', 'polls', 'poll_sessions'];
        const enhancedTables = [
            'failure_analysis', 
            'improvement_recommendations', 
            'learning_patterns', 
            'failure_scenarios', 
            'performance_metrics',
            'llm_insights'
        ];

        console.log('\n📊 BASIC STORAGE SYSTEM:');
        for (const table of basicTables) {
            try {
                const count = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
                const columns = await this.query(`PRAGMA table_info(${table})`);
                console.log(`   ${table}: ${count[0].count} records, ${columns.length} columns`);
            } catch (error) {
                console.log(`   ${table}: Table not found or error`);
            }
        }

        console.log('\n🚀 ENHANCED STORAGE SYSTEM:');
        for (const table of enhancedTables) {
            try {
                const count = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
                const columns = await this.query(`PRAGMA table_info(${table})`);
                console.log(`   ${table}: ${count[0].count} records, ${columns.length} columns`);
            } catch (error) {
                console.log(`   ${table}: Table not found or error`);
            }
        }

        console.log('\n✨ KEY IMPROVEMENTS:');
        console.log('   🧠 LLM-Powered Analysis: Root cause analysis with confidence scores');
        console.log('   📋 Actionable Recommendations: Specific steps to fix issues');
        console.log('   🔄 Pattern Recognition: Automatic detection of recurring problems');
        console.log('   🔮 Predictive Insights: AI-generated predictions for future issues');
        console.log('   📊 Performance Analytics: Detailed metrics and trend analysis');
        console.log('   💡 Intelligence Layer: Context-aware storage with business impact scoring');
    }

    async showDataRichness() {
        console.log('\n💎 DATA RICHNESS ANALYSIS\n');
        console.log('=' * 40);

        try {
            // Show the richness of failure analysis data
            const analysis = await this.query(`
                SELECT 
                    id,
                    failure_category,
                    confidence_score,
                    LENGTH(root_cause_analysis) as analysis_length,
                    LENGTH(technical_details) as technical_details_length,
                    business_impact,
                    severity_level,
                    preventable
                FROM failure_analysis 
                LIMIT 3
            `);

            if (analysis.length > 0) {
                console.log('🔍 Enhanced Analysis Data:');
                console.table(analysis);

                // Show detailed analysis sample
                const analysisDetail = await this.query(`
                    SELECT id, root_cause_analysis, technical_details, recommendations 
                    FROM failure_analysis 
                    WHERE root_cause_analysis IS NOT NULL 
                    LIMIT 1
                `);

                if (analysisDetail.length > 0) {
                    console.log('\n📋 Sample Analysis Detail:');
                    console.log(`Analysis ID: ${analysisDetail[0].id}`);
                    console.log(`Root Cause: ${analysisDetail[0].root_cause_analysis}`);
                    console.log(`Technical Details: ${analysisDetail[0].technical_details}`);
                    console.log(`Recommendations: ${analysisDetail[0].recommendations}`);
                }
            }

            // Show recommendations richness
            const recommendations = await this.query(`
                SELECT 
                    recommendation_type,
                    priority_level,
                    implementation_effort,
                    LENGTH(action_description) as description_length,
                    LENGTH(implementation_steps) as implementation_length
                FROM improvement_recommendations 
                LIMIT 3
            `);

            if (recommendations.length > 0) {
                console.log('\n💡 Recommendation Richness:');
                console.table(recommendations);
            }

            // Show failure scenarios richness
            const scenarios = await this.query(`
                SELECT 
                    id,
                    site_name,
                    step_name,
                    error_type,
                    LENGTH(reproduction_steps) as reproduction_length,
                    LENGTH(dom_snapshot) as dom_length,
                    screenshot_path
                FROM failure_scenarios 
                LIMIT 3
            `);

            if (scenarios.length > 0) {
                console.log('\n🎬 Failure Scenario Richness:');
                console.table(scenarios);
            }

        } catch (error) {
            console.error('❌ Error analyzing data richness:', error.message);
        }
    }

    async close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('\n✅ Database connection closed');
                }
            });
        }
    }
}

async function main() {
    const examiner = new DatabaseExaminer();
    
    try {
        await examiner.connect();
        await examiner.examineEnhancedTables();
        await examiner.compareWithBasicStorage();
        await examiner.showDataRichness();
    } catch (error) {
        console.error('❌ Examination failed:', error);
    } finally {
        await examiner.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DatabaseExaminer;