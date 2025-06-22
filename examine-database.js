#!/usr/bin/env node

/**
 * Database Examination Script
 * Examines the SQLite database to understand stored data quality and patterns
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/polls.db');

class DatabaseExaminer {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error connecting to database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async getAllTables() {
        const query = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
        return this.runQuery(query);
    }

    async getTableSchema(tableName) {
        const query = `PRAGMA table_info(${tableName})`;
        return this.runQuery(query);
    }

    async getTableCount(tableName) {
        const query = `SELECT COUNT(*) as count FROM ${tableName}`;
        const result = await this.runQuery(query);
        return result[0]?.count || 0;
    }

    async runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getSampleData(tableName, limit = 5) {
        try {
            const query = `SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT ${limit}`;
            return await this.runQuery(query);
        } catch (error) {
            console.error(`Error getting sample data from ${tableName}:`, error.message);
            return [];
        }
    }

    async examineAIInteractions() {
        console.log('\n🤖 === AI INTERACTIONS ANALYSIS ===');
        
        try {
            const count = await this.getTableCount('ai_interactions');
            console.log(`Total AI interactions: ${count}`);
            
            if (count > 0) {
                // Get sample interactions
                const samples = await this.getSampleData('ai_interactions', 3);
                console.log('\n📝 Sample AI Interactions:');
                samples.forEach((sample, index) => {
                    console.log(`\nInteraction ${index + 1}:`);
                    console.log(`  ID: ${sample.id}`);
                    console.log(`  Type: ${sample.interaction_type || 'form_analysis'}`);
                    console.log(`  Model: ${sample.model_used}`);
                    console.log(`  Prompt (first 100 chars): ${(sample.prompt || '').substring(0, 100)}...`);
                    console.log(`  Response (first 100 chars): ${(sample.response || '').substring(0, 100)}...`);
                    console.log(`  Success: ${sample.success ? 'Yes' : 'No'}`);
                    console.log(`  Tokens Used: ${sample.tokens_used || 'N/A'}`);
                    console.log(`  Cost: $${sample.cost_usd || 'N/A'}`);
                    console.log(`  Processing Time: ${sample.processing_time_ms || 'N/A'}ms`);
                    console.log(`  Confidence: ${sample.confidence_score || 'N/A'}`);
                    console.log(`  Timestamp: ${sample.created_at || sample.timestamp}`);
                });

                // Get interaction type distribution
                const typeStats = await this.runQuery(`
                    SELECT interaction_type, COUNT(*) as count 
                    FROM ai_interactions 
                    GROUP BY interaction_type 
                    ORDER BY count DESC
                `);
                console.log('\n📊 Interaction Types:');
                typeStats.forEach(stat => {
                    console.log(`  ${stat.interaction_type || 'form_analysis'}: ${stat.count}`);
                });

                // Get model usage stats
                const modelStats = await this.runQuery(`
                    SELECT model_used, COUNT(*) as count, AVG(tokens_used) as avg_tokens
                    FROM ai_interactions 
                    GROUP BY model_used 
                    ORDER BY count DESC
                `);
                console.log('\n🧠 Model Usage:');
                modelStats.forEach(stat => {
                    console.log(`  ${stat.model_used}: ${stat.count} interactions, avg ${Math.round(stat.avg_tokens || 0)} tokens`);
                });
            }
        } catch (error) {
            console.log('No ai_interactions table found or error accessing it:', error.message);
        }
    }

    async examineRegistrationAttempts() {
        console.log('\n📋 === REGISTRATION ATTEMPTS ANALYSIS ===');
        
        try {
            const count = await this.getTableCount('registration_attempts');
            console.log(`Total registration attempts: ${count}`);
            
            if (count > 0) {
                // Get sample attempts
                const samples = await this.getSampleData('registration_attempts', 3);
                console.log('\n📝 Sample Registration Attempts:');
                samples.forEach((sample, index) => {
                    console.log(`\nAttempt ${index + 1}:`);
                    console.log(`  ID: ${sample.id}`);
                    console.log(`  Target Site: ${sample.target_site}`);
                    console.log(`  Status: ${sample.status}`);
                    console.log(`  Success: ${sample.success ? 'Yes' : 'No'}`);
                    console.log(`  Started: ${sample.started_at}`);
                    console.log(`  Completed: ${sample.completed_at || 'N/A'}`);
                    console.log(`  Error: ${sample.error_message || 'None'}`);
                    console.log(`  Current Step: ${sample.current_step || 'N/A'}`);
                });

                // Success rate stats
                const successStats = await this.runQuery(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(success) as successful,
                        ROUND(AVG(CAST(success AS FLOAT)) * 100, 2) as success_rate
                    FROM registration_attempts
                `);
                console.log('\n📊 Success Statistics:');
                const stats = successStats[0];
                console.log(`  Total Attempts: ${stats.total}`);
                console.log(`  Successful: ${stats.successful}`);
                console.log(`  Success Rate: ${stats.success_rate}%`);

                // Site-wise stats
                const siteStats = await this.runQuery(`
                    SELECT target_site, COUNT(*) as attempts, SUM(success) as successes
                    FROM registration_attempts 
                    GROUP BY target_site 
                    ORDER BY attempts DESC
                `);
                console.log('\n🌐 Site Statistics:');
                siteStats.forEach(stat => {
                    const rate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : 0;
                    console.log(`  ${stat.target_site}: ${stat.attempts} attempts, ${stat.successes} successes (${rate}%)`);
                });
            }
        } catch (error) {
            console.log('No registration_attempts table found or error accessing it:', error.message);
        }
    }

    async examineRegistrationSteps() {
        console.log('\n👣 === REGISTRATION STEPS ANALYSIS ===');
        
        try {
            const count = await this.getTableCount('registration_steps');
            console.log(`Total registration steps: ${count}`);
            
            if (count > 0) {
                // Get sample steps
                const samples = await this.getSampleData('registration_steps', 3);
                console.log('\n📝 Sample Registration Steps:');
                samples.forEach((sample, index) => {
                    console.log(`\nStep ${index + 1}:`);
                    console.log(`  ID: ${sample.id}`);
                    console.log(`  Registration ID: ${sample.registration_id}`);
                    console.log(`  Step Number: ${sample.step_number}`);
                    console.log(`  Step Name: ${sample.step_name}`);
                    console.log(`  Step Type: ${sample.step_type}`);
                    console.log(`  Status: ${sample.status}`);
                    console.log(`  Duration: ${sample.duration_ms || 'N/A'}ms`);
                    console.log(`  AI Analysis: ${sample.ai_analysis ? 'Yes' : 'No'}`);
                });

                // Step type distribution
                const stepStats = await this.runQuery(`
                    SELECT step_type, COUNT(*) as count 
                    FROM registration_steps 
                    GROUP BY step_type 
                    ORDER BY count DESC
                `);
                console.log('\n📊 Step Types:');
                stepStats.forEach(stat => {
                    console.log(`  ${stat.step_type}: ${stat.count}`);
                });
            }
        } catch (error) {
            console.log('No registration_steps table found or error accessing it:', error.message);
        }
    }

    async examineRegistrationFailures() {
        console.log('\n❌ === REGISTRATION FAILURES ANALYSIS ===');
        
        try {
            const count = await this.getTableCount('registration_failures');
            console.log(`Total registration failures: ${count}`);
            
            if (count > 0) {
                // Get sample failures
                const samples = await this.getSampleData('registration_failures', 5);
                console.log('\n📝 Sample Registration Failures:');
                samples.forEach((sample, index) => {
                    console.log(`\nFailure ${index + 1}:`);
                    console.log(`  ID: ${sample.id}`);
                    console.log(`  Registration ID: ${sample.registration_id}`);
                    console.log(`  Step Name: ${sample.step_name}`);
                    console.log(`  Error Message: ${sample.error_message || 'N/A'}`);
                    console.log(`  Context: ${sample.context || 'N/A'}`);
                    console.log(`  Timestamp: ${sample.created_at}`);
                });

                // Failure reason analysis
                const failureStats = await this.runQuery(`
                    SELECT step_name, COUNT(*) as count 
                    FROM registration_failures 
                    GROUP BY step_name 
                    ORDER BY count DESC
                `);
                console.log('\n📊 Failure Points:');
                failureStats.forEach(stat => {
                    console.log(`  ${stat.step_name}: ${stat.count} failures`);
                });
            }
        } catch (error) {
            console.log('No registration_failures table found or error accessing it:', error.message);
        }
    }

    async examineLLMInsights() {
        console.log('\n🧠 === LLM INSIGHTS ANALYSIS ===');
        
        try {
            const count = await this.getTableCount('llm_insights');
            console.log(`Total LLM insights: ${count}`);
            
            if (count > 0) {
                // Get sample insights
                const samples = await this.getSampleData('llm_insights', 3);
                console.log('\n📝 Sample LLM Insights:');
                samples.forEach((sample, index) => {
                    console.log(`\nInsight ${index + 1}:`);
                    console.log(`  ID: ${sample.id}`);
                    console.log(`  Interaction ID: ${sample.interaction_id}`);
                    console.log(`  Insight Type: ${sample.insight_type}`);
                    console.log(`  Analysis Version: ${sample.analysis_version}`);
                    console.log(`  Insight Data: ${(sample.insight_data || '').substring(0, 200)}...`);
                    console.log(`  Timestamp: ${sample.created_at}`);
                });

                // Insight type distribution
                const insightStats = await this.runQuery(`
                    SELECT insight_type, COUNT(*) as count 
                    FROM llm_insights 
                    GROUP BY insight_type 
                    ORDER BY count DESC
                `);
                console.log('\n📊 Insight Types:');
                insightStats.forEach(stat => {
                    console.log(`  ${stat.insight_type}: ${stat.count}`);
                });
            }
        } catch (error) {
            console.log('No llm_insights table found or error accessing it:', error.message);
        }
    }

    async examineFailureScenarios() {
        console.log('\n🎭 === FAILURE SCENARIOS ANALYSIS ===');
        
        try {
            const count = await this.getTableCount('failure_scenarios');
            console.log(`Total failure scenarios: ${count}`);
            
            if (count > 0) {
                // Get sample scenarios
                const samples = await this.getSampleData('failure_scenarios', 3);
                console.log('\n📝 Sample Failure Scenarios:');
                samples.forEach((sample, index) => {
                    console.log(`\nScenario ${index + 1}:`);
                    console.log(`  ID: ${sample.id}`);
                    console.log(`  Hash: ${sample.scenario_hash}`);
                    console.log(`  Failure Type: ${sample.failure_type}`);
                    console.log(`  Severity: ${sample.severity_level}/5`);
                    console.log(`  Occurrences: ${sample.occurrence_count}`);
                    console.log(`  First Occurred: ${sample.first_occurrence}`);
                    console.log(`  Last Occurred: ${sample.last_occurrence}`);
                    console.log(`  Error: ${sample.error_message || 'N/A'}`);
                    console.log(`  Page URL: ${sample.page_url || 'N/A'}`);
                    console.log(`  Failed Action: ${sample.failed_action || 'N/A'}`);
                });

                // Failure type distribution
                const typeStats = await this.runQuery(`
                    SELECT failure_type, COUNT(*) as count, AVG(severity_level) as avg_severity
                    FROM failure_scenarios 
                    GROUP BY failure_type 
                    ORDER BY count DESC
                `);
                console.log('\n📊 Failure Types:');
                typeStats.forEach(stat => {
                    console.log(`  ${stat.failure_type}: ${stat.count} scenarios, avg severity ${Math.round(stat.avg_severity * 10) / 10}`);
                });
            }
        } catch (error) {
            console.log('No failure_scenarios table found or error accessing it:', error.message);
        }
    }

    async examineFailureAnalysis() {
        console.log('\n🔍 === FAILURE ANALYSIS ANALYSIS ===');
        
        try {
            const count = await this.getTableCount('failure_analysis');
            console.log(`Total failure analyses: ${count}`);
            
            if (count > 0) {
                // Get sample analyses
                const samples = await this.getSampleData('failure_analysis', 2);
                console.log('\n📝 Sample Failure Analyses:');
                samples.forEach((sample, index) => {
                    console.log(`\nAnalysis ${index + 1}:`);
                    console.log(`  ID: ${sample.id}`);
                    console.log(`  Scenario ID: ${sample.scenario_id}`);
                    console.log(`  Root Cause: ${sample.root_cause_category}`);
                    console.log(`  Description: ${(sample.root_cause_description || '').substring(0, 100)}...`);
                    console.log(`  Confidence: ${Math.round((sample.confidence_score || 0) * 100)}%`);
                    console.log(`  Business Impact: ${Math.round((sample.business_impact_score || 0) * 100)}%`);
                    console.log(`  Model Used: ${sample.llm_model_used}`);
                    console.log(`  Analysis Cost: $${sample.analysis_cost_usd || 'N/A'}`);
                });

                // Root cause distribution
                const causeStats = await this.runQuery(`
                    SELECT root_cause_category, COUNT(*) as count, AVG(confidence_score) as avg_confidence
                    FROM failure_analysis 
                    GROUP BY root_cause_category 
                    ORDER BY count DESC
                `);
                console.log('\n📊 Root Causes:');
                causeStats.forEach(stat => {
                    console.log(`  ${stat.root_cause_category}: ${stat.count} analyses, ${Math.round((stat.avg_confidence || 0) * 100)}% avg confidence`);
                });
            }
        } catch (error) {
            console.log('No failure_analysis table found or error accessing it:', error.message);
        }
    }

    async identifyMissingData() {
        console.log('\n🔍 === DATA QUALITY ANALYSIS ===');
        
        const tables = await this.getAllTables();
        const tableCounts = {};
        
        for (const table of tables) {
            tableCounts[table.name] = await this.getTableCount(table.name);
        }
        
        console.log('\n📊 Table Summary:');
        Object.entries(tableCounts).forEach(([table, count]) => {
            console.log(`  ${table}: ${count} records`);
        });
        
        console.log('\n🔍 Data Quality Issues Identified:');
        
        // Check for empty tables that should have data
        const expectedTables = [
            'ai_interactions', 'registration_attempts', 'registration_steps', 
            'registration_failures', 'llm_insights'
        ];
        
        expectedTables.forEach(table => {
            if (!tableCounts[table] || tableCounts[table] === 0) {
                console.log(`  ❌ Missing data in ${table} table`);
            }
        });
        
        // Check AI interaction quality
        if (tableCounts['ai_interactions'] > 0) {
            try {
                const aiQuality = await this.runQuery(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN prompt IS NOT NULL AND LENGTH(prompt) > 0 THEN 1 END) as has_prompt,
                        COUNT(CASE WHEN response IS NOT NULL AND LENGTH(response) > 0 THEN 1 END) as has_response,
                        COUNT(CASE WHEN tokens_used IS NOT NULL THEN 1 END) as has_tokens,
                        COUNT(CASE WHEN cost_usd IS NOT NULL THEN 1 END) as has_cost,
                        COUNT(CASE WHEN confidence_score IS NOT NULL THEN 1 END) as has_confidence
                    FROM ai_interactions
                `);
                
                const quality = aiQuality[0];
                console.log('\n🤖 AI Interaction Data Quality:');
                console.log(`  Prompt Coverage: ${Math.round((quality.has_prompt / quality.total) * 100)}%`);
                console.log(`  Response Coverage: ${Math.round((quality.has_response / quality.total) * 100)}%`);
                console.log(`  Token Tracking: ${Math.round((quality.has_tokens / quality.total) * 100)}%`);
                console.log(`  Cost Tracking: ${Math.round((quality.has_cost / quality.total) * 100)}%`);
                console.log(`  Confidence Scoring: ${Math.round((quality.has_confidence / quality.total) * 100)}%`);
            } catch (error) {
                console.log('  Error analyzing AI interaction quality:', error.message);
            }
        }
    }

    async generateInsights() {
        console.log('\n💡 === IMPROVEMENT OPPORTUNITIES ===');
        
        console.log('\n🚀 Recommendations for Better Data Collection:');
        console.log('  1. Ensure all AI interactions capture:');
        console.log('     - Full prompts and responses');
        console.log('     - Token usage and costs');
        console.log('     - Confidence scores for decisions');
        console.log('     - Processing time metrics');
        console.log('');
        console.log('  2. Enhanced failure tracking should include:');
        console.log('     - Screenshots at failure points');
        console.log('     - Browser state and console logs');
        console.log('     - DOM snapshot before failure');
        console.log('     - Exact reproduction steps');
        console.log('');
        console.log('  3. LLM insights need structured data:');
        console.log('     - Categorized insight types');
        console.log('     - Confidence scores for insights');
        console.log('     - Actionable recommendations');
        console.log('     - Pattern recognition results');
        console.log('');
        console.log('  4. Success metrics to track:');
        console.log('     - Time to completion per step');
        console.log('     - Success rate trends over time');
        console.log('     - Effectiveness of AI decisions');
        console.log('     - Learning curve improvements');
    }

    async close() {
        if (this.db) {
            this.db.close();
            console.log('\n✅ Database connection closed');
        }
    }

    async examine() {
        try {
            await this.connect();
            
            console.log('🔍 === DATABASE EXAMINATION REPORT ===');
            console.log(`Database: ${this.dbPath}`);
            console.log(`Timestamp: ${new Date().toISOString()}`);
            
            // Get all tables first
            const tables = await this.getAllTables();
            console.log(`\n📋 Available Tables: ${tables.map(t => t.name).join(', ')}`);
            
            // Examine each key table
            await this.examineAIInteractions();
            await this.examineRegistrationAttempts();
            await this.examineRegistrationSteps();
            await this.examineRegistrationFailures();
            await this.examineLLMInsights();
            await this.examineFailureScenarios();
            await this.examineFailureAnalysis();
            
            // Analyze data quality
            await this.identifyMissingData();
            await this.generateInsights();
            
            console.log('\n✅ === DATABASE EXAMINATION COMPLETE ===');
            
        } catch (error) {
            console.error('❌ Examination failed:', error.message);
        } finally {
            await this.close();
        }
    }
}

// Run the examination
if (require.main === module) {
    const examiner = new DatabaseExaminer(DB_PATH);
    examiner.examine().catch(console.error);
}

module.exports = DatabaseExaminer;