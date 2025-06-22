#!/usr/bin/env node

/**
 * Feedback Pattern Analysis
 * Analyzes captured data to demonstrate the feedback loop intelligence
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/polls.db');

class FeedbackAnalyzer {
    constructor() {
        this.db = null;
        this.analysis = {};
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Connected to feedback database');
                    resolve();
                }
            });
        });
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

    async analyzeAIDecisionPatterns() {
        console.log('\n🧠 === AI DECISION PATTERN ANALYSIS ===');
        
        // Analyze confidence patterns by interaction type
        const confidencePatterns = await this.runQuery(`
            SELECT 
                interaction_type,
                COUNT(*) as interactions,
                AVG(confidence_score) as avg_confidence,
                MIN(confidence_score) as min_confidence,
                MAX(confidence_score) as max_confidence,
                AVG(tokens_used) as avg_tokens,
                SUM(cost_usd) as total_cost
            FROM ai_interactions 
            GROUP BY interaction_type
            ORDER BY avg_confidence DESC
        `);
        
        console.log('\n📊 AI Confidence by Interaction Type:');
        confidencePatterns.forEach(pattern => {
            console.log(`\n   🎯 ${pattern.interaction_type.toUpperCase()}:`);
            console.log(`      Average Confidence: ${(pattern.avg_confidence * 100).toFixed(1)}%`);
            console.log(`      Confidence Range: ${(pattern.min_confidence * 100).toFixed(1)}% - ${(pattern.max_confidence * 100).toFixed(1)}%`);
            console.log(`      Interactions: ${pattern.interactions}`);
            console.log(`      Avg Tokens: ${Math.round(pattern.avg_tokens)}`);
            console.log(`      Total Cost: $${pattern.total_cost.toFixed(4)}`);
        });
        
        return confidencePatterns;
    }

    async analyzeSitePerformancePatterns() {
        console.log('\n🌐 === SITE PERFORMANCE PATTERN ANALYSIS ===');
        
        // Analyze success rates by site
        const sitePerformance = await this.runQuery(`
            SELECT 
                ra.target_site,
                COUNT(*) as total_attempts,
                SUM(ra.success) as successful_attempts,
                ROUND(AVG(CAST(ra.success AS FLOAT)) * 100, 1) as success_rate,
                AVG(ai.confidence_score) as avg_ai_confidence,
                GROUP_CONCAT(DISTINCT rs.step_name) as steps_attempted,
                COUNT(DISTINCT rs.id) as total_steps
            FROM registration_attempts ra
            LEFT JOIN ai_interactions ai ON ra.id = ai.registration_id
            LEFT JOIN registration_steps rs ON ra.id = rs.registration_id
            GROUP BY ra.target_site
            ORDER BY success_rate DESC
        `);
        
        console.log('\n📈 Site Success Rate Analysis:');
        sitePerformance.forEach(site => {
            console.log(`\n   🌐 ${site.target_site.toUpperCase()}:`);
            console.log(`      Success Rate: ${site.success_rate}% (${site.successful_attempts}/${site.total_attempts})`);
            console.log(`      AI Confidence: ${((site.avg_ai_confidence || 0) * 100).toFixed(1)}%`);
            console.log(`      Steps Attempted: ${site.total_steps}`);
            console.log(`      Step Types: ${site.steps_attempted || 'N/A'}`);
        });
        
        return sitePerformance;
    }

    async analyzeLLMInsightPatterns() {
        console.log('\n🔍 === LLM INSIGHT PATTERN ANALYSIS ===');
        
        // Analyze insight distribution and content
        const insightPatterns = await this.runQuery(`
            SELECT 
                li.insight_type,
                COUNT(*) as insight_count,
                GROUP_CONCAT(DISTINCT ai.interaction_type) as source_interactions
            FROM llm_insights li
            JOIN ai_interactions ai ON li.interaction_id = ai.id
            GROUP BY li.insight_type
            ORDER BY insight_count DESC
        `);
        
        console.log('\n🧠 LLM Insight Distribution:');
        insightPatterns.forEach(pattern => {
            console.log(`\n   💡 ${pattern.insight_type.toUpperCase()}:`);
            console.log(`      Generated: ${pattern.insight_count} times`);
            console.log(`      From Interactions: ${pattern.source_interactions}`);
        });
        
        // Get sample insights for each type
        for (const pattern of insightPatterns) {
            const sampleInsights = await this.runQuery(`
                SELECT insight_data, created_at
                FROM llm_insights 
                WHERE insight_type = ?
                ORDER BY created_at DESC
                LIMIT 2
            `, [pattern.insight_type]);
            
            console.log(`\n      📝 Sample ${pattern.insight_type} insights:`);
            sampleInsights.forEach((insight, index) => {
                const data = JSON.parse(insight.insight_data);
                if (typeof data === 'string') {
                    console.log(`         ${index + 1}. "${data}"`);
                } else if (Array.isArray(data)) {
                    console.log(`         ${index + 1}. [${data.join(', ')}]`);
                } else {
                    console.log(`         ${index + 1}. ${JSON.stringify(data)}`);
                }
            });
        }
        
        return insightPatterns;
    }

    async analyzeFailurePatterns() {
        console.log('\n❌ === FAILURE PATTERN ANALYSIS ===');
        
        // Analyze failed steps
        const failurePatterns = await this.runQuery(`
            SELECT 
                rs.step_name,
                rs.step_type,
                COUNT(*) as failure_count,
                GROUP_CONCAT(DISTINCT ra.target_site) as affected_sites,
                AVG(rs.duration_ms) as avg_duration
            FROM registration_steps rs
            JOIN registration_attempts ra ON rs.registration_id = ra.id
            WHERE rs.status = 'failed'
            GROUP BY rs.step_name, rs.step_type
            ORDER BY failure_count DESC
        `);
        
        if (failurePatterns.length > 0) {
            console.log('\n⚠️ Step Failure Analysis:');
            failurePatterns.forEach(pattern => {
                console.log(`\n   🚨 ${pattern.step_name.toUpperCase()} (${pattern.step_type}):`);
                console.log(`      Failures: ${pattern.failure_count}`);
                console.log(`      Affected Sites: ${pattern.affected_sites}`);
                console.log(`      Avg Duration: ${Math.round(pattern.avg_duration)}ms`);
            });
        } else {
            console.log('\n✅ No explicit step failures recorded (this is good!)');
        }
        
        // Analyze unsuccessful registration attempts
        const unsuccessfulAttempts = await this.runQuery(`
            SELECT 
                ra.target_site,
                ra.current_step,
                ra.error_message,
                COUNT(*) as occurrence_count
            FROM registration_attempts ra
            WHERE ra.success = 0
            GROUP BY ra.target_site, ra.current_step, ra.error_message
            ORDER BY occurrence_count DESC
        `);
        
        if (unsuccessfulAttempts.length > 0) {
            console.log('\n🔍 Unsuccessful Attempt Patterns:');
            unsuccessfulAttempts.forEach(attempt => {
                console.log(`\n   ⚠️ ${attempt.target_site} (${attempt.current_step}):`);
                console.log(`      Occurrences: ${attempt.occurrence_count}`);
                console.log(`      Error: ${attempt.error_message || 'No specific error'}`);
            });
        }
        
        return { failurePatterns, unsuccessfulAttempts };
    }

    async generateImprovementRecommendations() {
        console.log('\n💡 === INTELLIGENT IMPROVEMENT RECOMMENDATIONS ===');
        
        const recommendations = [];
        
        // Analyze AI confidence patterns for improvement opportunities
        const lowConfidenceInteractions = await this.runQuery(`
            SELECT 
                interaction_type,
                target_site,
                confidence_score,
                prompt,
                response
            FROM ai_interactions ai
            JOIN registration_attempts ra ON ai.registration_id = ra.id
            WHERE confidence_score < 0.7
            ORDER BY confidence_score ASC
        `);
        
        if (lowConfidenceInteractions.length > 0) {
            console.log('\n🎯 Low Confidence Analysis Improvements:');
            lowConfidenceInteractions.forEach(interaction => {
                console.log(`\n   📊 ${interaction.interaction_type} for ${interaction.target_site}:`);
                console.log(`      Confidence: ${(interaction.confidence_score * 100).toFixed(1)}%`);
                console.log(`      Issue: ${interaction.prompt.substring(0, 100)}...`);
                
                recommendations.push({
                    type: 'ai_improvement',
                    component: interaction.interaction_type,
                    site: interaction.target_site,
                    confidence: interaction.confidence_score,
                    recommendation: `Improve ${interaction.interaction_type} prompts for better analysis of ${interaction.target_site}-style sites`
                });
            });
        }
        
        // Analyze step duration patterns
        const slowSteps = await this.runQuery(`
            SELECT 
                step_name,
                step_type,
                AVG(duration_ms) as avg_duration,
                COUNT(*) as step_count
            FROM registration_steps 
            WHERE duration_ms > 3000
            GROUP BY step_name, step_type
            ORDER BY avg_duration DESC
        `);
        
        if (slowSteps.length > 0) {
            console.log('\n⏱️ Performance Optimization Opportunities:');
            slowSteps.forEach(step => {
                console.log(`\n   🐌 ${step.step_name} (${step.step_type}):`);
                console.log(`      Average Duration: ${Math.round(step.avg_duration)}ms`);
                console.log(`      Occurrences: ${step.step_count}`);
                
                recommendations.push({
                    type: 'performance_improvement',
                    component: step.step_name,
                    avgDuration: step.avg_duration,
                    recommendation: `Optimize ${step.step_name} performance - currently averaging ${Math.round(step.avg_duration)}ms`
                });
            });
        }
        
        // Analyze insight patterns for strategic improvements
        const strategicInsights = await this.runQuery(`
            SELECT DISTINCT
                li.insight_type,
                li.insight_data
            FROM llm_insights li
            WHERE li.insight_type IN ('improvement_suggestions', 'success_probability_improvement')
            ORDER BY li.created_at DESC
        `);
        
        if (strategicInsights.length > 0) {
            console.log('\n🚀 Strategic Improvement Suggestions:');
            strategicInsights.forEach(insight => {
                console.log(`\n   💭 ${insight.insight_type}:`);
                try {
                    const data = JSON.parse(insight.insight_data);
                    if (Array.isArray(data)) {
                        data.forEach((suggestion, index) => {
                            console.log(`      ${index + 1}. ${suggestion}`);
                        });
                    } else {
                        console.log(`      ${data}`);
                    }
                } catch {
                    console.log(`      ${insight.insight_data}`);
                }
            });
        }
        
        return recommendations;
    }

    async generateFeedbackLoopReport() {
        console.log('\n📋 === FEEDBACK LOOP EFFECTIVENESS REPORT ===');
        
        // Calculate overall system metrics
        const systemMetrics = await this.runQuery(`
            SELECT 
                COUNT(DISTINCT ra.id) as total_attempts,
                SUM(ra.success) as successful_attempts,
                COUNT(DISTINCT ai.id) as ai_interactions,
                COUNT(DISTINCT li.id) as insights_generated,
                AVG(ai.confidence_score) as avg_ai_confidence,
                SUM(ai.cost_usd) as total_ai_cost
            FROM registration_attempts ra
            LEFT JOIN ai_interactions ai ON ra.id = ai.registration_id  
            LEFT JOIN llm_insights li ON ai.id = li.interaction_id
        `);
        
        const metrics = systemMetrics[0];
        const successRate = metrics.total_attempts > 0 ? 
            (metrics.successful_attempts / metrics.total_attempts * 100).toFixed(1) : 0;
        
        console.log('\n📊 System Performance Metrics:');
        console.log(`   🎯 Total Registration Attempts: ${metrics.total_attempts}`);
        console.log(`   ✅ Success Rate: ${successRate}%`);
        console.log(`   🤖 AI Interactions Generated: ${metrics.ai_interactions}`);
        console.log(`   🧠 Insights Captured: ${metrics.insights_generated}`);
        console.log(`   📈 Average AI Confidence: ${((metrics.avg_ai_confidence || 0) * 100).toFixed(1)}%`);
        console.log(`   💰 Total AI Cost: $${(metrics.total_ai_cost || 0).toFixed(4)}`);
        
        // Calculate learning effectiveness
        const insightsPerInteraction = metrics.ai_interactions > 0 ? 
            (metrics.insights_generated / metrics.ai_interactions).toFixed(1) : 0;
        
        console.log(`\n🧠 Learning Effectiveness:`);
        console.log(`   📝 Insights per AI Interaction: ${insightsPerInteraction}`);
        console.log(`   💡 Data Quality Score: ${metrics.avg_ai_confidence > 0.7 ? 'High' : metrics.avg_ai_confidence > 0.5 ? 'Medium' : 'Low'}`);
        
        // Assess feedback loop maturity
        const maturityIndicators = {
            dataCapture: metrics.ai_interactions > 0 ? 'Active' : 'Inactive',
            insightGeneration: metrics.insights_generated > 0 ? 'Active' : 'Inactive', 
            patternRecognition: metrics.insights_generated > 5 ? 'Active' : 'Limited',
            adaptiveRecommendations: insightsPerInteraction > 2 ? 'Active' : 'Basic'
        };
        
        console.log(`\n🔄 Feedback Loop Maturity Assessment:`);
        Object.entries(maturityIndicators).forEach(([indicator, status]) => {
            const emoji = status === 'Active' ? '✅' : status === 'Limited' ? '⚠️ ' : '❌';
            console.log(`   ${emoji} ${indicator.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${status}`);
        });
        
        return {
            metrics,
            successRate,
            insightsPerInteraction,
            maturityIndicators
        };
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            
            console.log('🔍 COMPREHENSIVE FEEDBACK LOOP ANALYSIS');
            console.log('='.repeat(80));
            
            const aiPatterns = await this.analyzeAIDecisionPatterns();
            const sitePatterns = await this.analyzeSitePerformancePatterns();
            const insightPatterns = await this.analyzeLLMInsightPatterns();
            const failurePatterns = await this.analyzeFailurePatterns();
            const recommendations = await this.generateImprovementRecommendations();
            const report = await this.generateFeedbackLoopReport();
            
            console.log('\n' + '='.repeat(80));
            console.log('🎉 ANALYSIS COMPLETE');
            console.log('='.repeat(80));
            
            console.log(`\n📊 Key Findings:`);
            console.log(`   🧠 AI Decision Patterns: ${aiPatterns.length} interaction types analyzed`);
            console.log(`   🌐 Site Performance: ${sitePatterns.length} sites evaluated`);
            console.log(`   💡 Insight Categories: ${insightPatterns.length} types captured`);
            console.log(`   🚀 Improvement Opportunities: ${recommendations.length} identified`);
            
            const feedbackLoopWorking = report.metrics.ai_interactions > 0 && 
                                      report.metrics.insights_generated > 0 &&
                                      report.insightsPerInteraction > 1;
            
            console.log(`\n${feedbackLoopWorking ? '✅' : '⚠️ '} FEEDBACK LOOP STATUS: ${feedbackLoopWorking ? 'FULLY OPERATIONAL' : 'DEVELOPING'}`);
            
            if (feedbackLoopWorking) {
                console.log('\n🎉 The feedback loop system is successfully:');
                console.log('   📊 Capturing detailed interaction data');
                console.log('   🧠 Generating structured insights from AI responses');
                console.log('   🔍 Identifying patterns in successes and failures');
                console.log('   💡 Providing actionable improvement recommendations');
                console.log('   📈 Learning from each registration attempt');
            }
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
        } finally {
            await this.close();
        }
    }
}

// Run the analysis
if (require.main === module) {
    const analyzer = new FeedbackAnalyzer();
    analyzer.run().catch(console.error);
}

module.exports = FeedbackAnalyzer;