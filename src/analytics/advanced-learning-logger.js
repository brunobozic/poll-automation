/**
 * Advanced Learning Logger
 * Enhanced SQLite logging for deep learning analytics and agent prompt optimization
 * Facilitates better introspection and adaptation based on learning patterns
 */

const Database = require('better-sqlite3');
const path = require('path');

class AdvancedLearningLogger {
    constructor() {
        this.db = new Database('./poll-automation.db');
        this.initializeLearningTables();
    }

    /**
     * Initialize advanced learning analytics tables
     */
    initializeLearningTables() {
        console.log('🔧 Initializing advanced learning analytics tables...');

        // Learning iterations tracking
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS learning_iterations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iteration_id TEXT UNIQUE,
                start_time TEXT,
                end_time TEXT,
                phase_completed INTEGER,
                surveys_discovered INTEGER,
                platform_behaviors_analyzed INTEGER,
                form_complexities_mapped INTEGER,
                adaptive_strategies_developed INTEGER,
                success_predictions_made INTEGER,
                adaptations_applied INTEGER,
                total_discoveries INTEGER,
                learning_rate REAL,
                success_rate REAL,
                key_insights TEXT,
                next_focus_areas TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Survey discovery analytics
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS survey_discovery_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iteration_id TEXT,
                hunting_strategy TEXT,
                target_url TEXT,
                surveys_found INTEGER,
                discovery_time_ms INTEGER,
                success BOOLEAN,
                failure_reason TEXT,
                patterns_identified TEXT,
                confidence_score REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
            )
        `);

        // Platform behavior intelligence
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS platform_behavior_intelligence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iteration_id TEXT,
                platform_name TEXT,
                survey_count INTEGER,
                avg_load_time REAL,
                js_frameworks TEXT,
                security_measures TEXT,
                form_structures TEXT,
                common_patterns TEXT,
                success_indicators TEXT,
                failure_patterns TEXT,
                behavioral_score REAL,
                learning_confidence REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
            )
        `);

        // Form complexity intelligence
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS form_complexity_intelligence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iteration_id TEXT,
                survey_url TEXT,
                platform TEXT,
                complexity_score INTEGER,
                form_count INTEGER,
                input_count INTEGER,
                element_variety INTEGER,
                has_validation BOOLEAN,
                has_multi_page BOOLEAN,
                has_dynamic_content BOOLEAN,
                js_framework TEXT,
                security_features TEXT,
                prediction_difficulty REAL,
                automation_feasibility REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
            )
        `);

        // Predictive model analytics
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS predictive_model_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iteration_id TEXT,
                model_version TEXT,
                feature_count INTEGER,
                features TEXT,
                model_confidence REAL,
                predictions_made INTEGER,
                prediction_accuracy REAL,
                feature_weights TEXT,
                model_recommendations TEXT,
                validation_score REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
            )
        `);

        // Adaptive strategy analytics
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS adaptive_strategy_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iteration_id TEXT,
                strategy_name TEXT,
                strategy_type TEXT,
                target_platform TEXT,
                target_complexity TEXT,
                strategy_description TEXT,
                effectiveness_score REAL,
                usage_count INTEGER,
                success_rate REAL,
                learning_source TEXT,
                optimization_suggestions TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
            )
        `);

        // Agent prompt optimization analytics
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS agent_prompt_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iteration_id TEXT,
                agent_type TEXT,
                prompt_version TEXT,
                prompt_text TEXT,
                context_provided TEXT,
                response_quality REAL,
                response_accuracy REAL,
                response_time_ms INTEGER,
                tokens_used INTEGER,
                success_indicators TEXT,
                failure_indicators TEXT,
                optimization_suggestions TEXT,
                next_prompt_version TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (iteration_id) REFERENCES learning_iterations(iteration_id)
            )
        `);

        // Learning pattern analytics
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS learning_pattern_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_type TEXT,
                pattern_description TEXT,
                frequency INTEGER,
                confidence_score REAL,
                success_correlation REAL,
                failure_correlation REAL,
                actionable_insights TEXT,
                recommended_adaptations TEXT,
                first_observed TEXT,
                last_observed TEXT,
                trend_direction TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Cross-iteration learning insights
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cross_iteration_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_type TEXT,
                insight_description TEXT,
                supporting_data TEXT,
                confidence_level REAL,
                actionability_score REAL,
                implementation_complexity TEXT,
                expected_impact REAL,
                validation_method TEXT,
                status TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Advanced learning analytics tables initialized successfully');
    }

    /**
     * Log learning iteration data
     */
    logLearningIteration(iterationData) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO learning_iterations (
                iteration_id, start_time, end_time, phase_completed,
                surveys_discovered, platform_behaviors_analyzed, form_complexities_mapped,
                adaptive_strategies_developed, success_predictions_made, adaptations_applied,
                total_discoveries, learning_rate, success_rate, key_insights, next_focus_areas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            iterationData.id,
            iterationData.startTime,
            iterationData.endTime || new Date().toISOString(),
            iterationData.phaseCompleted || 6,
            iterationData.surveysDiscovered || 0,
            iterationData.platformBehaviorsAnalyzed || 0,
            iterationData.formComplexitiesMapped || 0,
            iterationData.adaptiveStrategiesDeveloped || 0,
            iterationData.successPredictionsMade || 0,
            iterationData.adaptationsApplied || 0,
            iterationData.totalDiscoveries || 0,
            iterationData.learningRate || 0.0,
            iterationData.successRate || 0.0,
            JSON.stringify(iterationData.keyInsights || []),
            JSON.stringify(iterationData.nextFocusAreas || [])
        );
    }

    /**
     * Log survey discovery analytics
     */
    logSurveyDiscovery(iterationId, discoveryData) {
        const stmt = this.db.prepare(`
            INSERT INTO survey_discovery_analytics (
                iteration_id, hunting_strategy, target_url, surveys_found,
                discovery_time_ms, success, failure_reason, patterns_identified,
                confidence_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            iterationId,
            discoveryData.strategy,
            discoveryData.targetUrl,
            discoveryData.surveysFound || 0,
            discoveryData.discoveryTime || 0,
            discoveryData.success ? 1 : 0,
            discoveryData.failureReason || null,
            JSON.stringify(discoveryData.patterns || []),
            discoveryData.confidenceScore || 0.0
        );
    }

    /**
     * Log platform behavior intelligence
     */
    logPlatformBehavior(iterationId, behaviorData) {
        const stmt = this.db.prepare(`
            INSERT INTO platform_behavior_intelligence (
                iteration_id, platform_name, survey_count, avg_load_time,
                js_frameworks, security_measures, form_structures,
                common_patterns, success_indicators, failure_patterns,
                behavioral_score, learning_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            iterationId,
            behaviorData.platform,
            behaviorData.surveyCount || 0,
            behaviorData.avgLoadTime || 0,
            JSON.stringify(behaviorData.jsFrameworks || []),
            JSON.stringify(behaviorData.securityMeasures || []),
            JSON.stringify(behaviorData.formStructures || []),
            JSON.stringify(behaviorData.commonPatterns || []),
            JSON.stringify(behaviorData.successIndicators || []),
            JSON.stringify(behaviorData.failurePatterns || []),
            behaviorData.behavioralScore || 0.0,
            behaviorData.learningConfidence || 0.0
        );
    }

    /**
     * Log form complexity intelligence
     */
    logFormComplexity(iterationId, complexityData) {
        const stmt = this.db.prepare(`
            INSERT INTO form_complexity_intelligence (
                iteration_id, survey_url, platform, complexity_score,
                form_count, input_count, element_variety, has_validation,
                has_multi_page, has_dynamic_content, js_framework,
                security_features, prediction_difficulty, automation_feasibility
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            iterationId,
            complexityData.url,
            complexityData.platform,
            complexityData.score || 0,
            complexityData.formCount || 0,
            complexityData.inputCount || 0,
            complexityData.elementVariety || 0,
            complexityData.hasValidation || false,
            complexityData.hasMultiPage || false,
            complexityData.hasDynamicContent || false,
            complexityData.jsFramework || null,
            JSON.stringify(complexityData.securityFeatures || []),
            complexityData.predictionDifficulty || 0.0,
            complexityData.automationFeasibility || 0.0
        );
    }

    /**
     * Log predictive model analytics
     */
    logPredictiveModel(iterationId, modelData) {
        const stmt = this.db.prepare(`
            INSERT INTO predictive_model_analytics (
                iteration_id, model_version, feature_count, features,
                model_confidence, predictions_made, prediction_accuracy,
                feature_weights, model_recommendations, validation_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            iterationId,
            modelData.version || '1.0',
            modelData.featureCount || 0,
            JSON.stringify(modelData.features || []),
            modelData.confidence || 0.0,
            modelData.predictionsMade || 0,
            modelData.accuracy || 0.0,
            JSON.stringify(modelData.weights || {}),
            JSON.stringify(modelData.recommendations || []),
            modelData.validationScore || 0.0
        );
    }

    /**
     * Log adaptive strategy analytics
     */
    logAdaptiveStrategy(iterationId, strategyData) {
        const stmt = this.db.prepare(`
            INSERT INTO adaptive_strategy_analytics (
                iteration_id, strategy_name, strategy_type, target_platform,
                target_complexity, strategy_description, effectiveness_score,
                usage_count, success_rate, learning_source, optimization_suggestions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            iterationId,
            strategyData.name,
            strategyData.type || 'platform_optimized',
            strategyData.targetPlatform || null,
            strategyData.targetComplexity || null,
            strategyData.description || '',
            strategyData.effectivenessScore || 0.0,
            strategyData.usageCount || 0,
            strategyData.successRate || 0.0,
            strategyData.learningSource || 'iteration_analysis',
            JSON.stringify(strategyData.optimizationSuggestions || [])
        );
    }

    /**
     * Log agent prompt analytics for optimization
     */
    logAgentPrompt(iterationId, promptData) {
        const stmt = this.db.prepare(`
            INSERT INTO agent_prompt_analytics (
                iteration_id, agent_type, prompt_version, prompt_text,
                context_provided, response_quality, response_accuracy,
                response_time_ms, tokens_used, success_indicators,
                failure_indicators, optimization_suggestions, next_prompt_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            iterationId,
            promptData.agentType,
            promptData.version || '1.0',
            promptData.promptText,
            JSON.stringify(promptData.context || {}),
            promptData.responseQuality || 0.0,
            promptData.responseAccuracy || 0.0,
            promptData.responseTime || 0,
            promptData.tokensUsed || 0,
            JSON.stringify(promptData.successIndicators || []),
            JSON.stringify(promptData.failureIndicators || []),
            JSON.stringify(promptData.optimizationSuggestions || []),
            promptData.nextVersion || null
        );
    }

    /**
     * Analyze learning patterns across iterations
     */
    analyzeLearningPatterns() {
        console.log('🔍 Analyzing learning patterns across iterations...');

        // Discovery pattern analysis
        const discoveryPatterns = this.db.prepare(`
            SELECT 
                hunting_strategy,
                COUNT(*) as usage_count,
                AVG(surveys_found) as avg_surveys_found,
                AVG(confidence_score) as avg_confidence,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
            FROM survey_discovery_analytics
            GROUP BY hunting_strategy
            ORDER BY avg_surveys_found DESC, success_rate DESC
        `).all();

        // Platform behavior patterns
        const platformPatterns = this.db.prepare(`
            SELECT 
                platform_name,
                COUNT(*) as iterations_analyzed,
                AVG(avg_load_time) as avg_load_time,
                AVG(behavioral_score) as avg_behavioral_score,
                AVG(learning_confidence) as avg_learning_confidence
            FROM platform_behavior_intelligence
            GROUP BY platform_name
            ORDER BY avg_behavioral_score DESC
        `).all();

        // Complexity patterns
        const complexityPatterns = this.db.prepare(`
            SELECT 
                platform,
                COUNT(*) as surveys_analyzed,
                AVG(complexity_score) as avg_complexity,
                AVG(automation_feasibility) as avg_feasibility,
                AVG(prediction_difficulty) as avg_difficulty
            FROM form_complexity_intelligence
            GROUP BY platform
            ORDER BY avg_feasibility DESC
        `).all();

        // Model accuracy trends
        const modelTrends = this.db.prepare(`
            SELECT 
                iteration_id,
                model_confidence,
                prediction_accuracy,
                validation_score,
                created_at
            FROM predictive_model_analytics
            ORDER BY created_at
        `).all();

        return {
            discoveryPatterns,
            platformPatterns,
            complexityPatterns,
            modelTrends,
            analysis: {
                topDiscoveryStrategy: discoveryPatterns[0]?.hunting_strategy || 'none',
                topPlatform: platformPatterns[0]?.platform_name || 'none',
                mostFeasiblePlatform: complexityPatterns[0]?.platform || 'none',
                learningTrend: this.calculateLearningTrend(modelTrends)
            }
        };
    }

    /**
     * Generate cross-iteration insights
     */
    generateCrossIterationInsights() {
        console.log('🧠 Generating cross-iteration insights...');

        const patterns = this.analyzeLearningPatterns();
        const insights = [];

        // Discovery strategy insights
        if (patterns.discoveryPatterns.length > 0) {
            const topStrategy = patterns.discoveryPatterns[0];
            insights.push({
                type: 'discovery_optimization',
                description: `${topStrategy.hunting_strategy} is the most effective discovery strategy with ${topStrategy.avg_surveys_found.toFixed(1)} avg surveys found and ${topStrategy.success_rate.toFixed(1)}% success rate`,
                confidence: topStrategy.avg_confidence,
                actionability: 0.9,
                expectedImpact: 0.7
            });
        }

        // Platform behavior insights
        if (patterns.platformPatterns.length > 0) {
            const topPlatform = patterns.platformPatterns[0];
            insights.push({
                type: 'platform_prioritization',
                description: `${topPlatform.platform_name} shows highest behavioral score (${topPlatform.avg_behavioral_score.toFixed(2)}) and should be prioritized`,
                confidence: topPlatform.avg_learning_confidence,
                actionability: 0.8,
                expectedImpact: 0.6
            });
        }

        // Complexity optimization insights
        if (patterns.complexityPatterns.length > 0) {
            const feasiblePlatform = patterns.complexityPatterns[0];
            insights.push({
                type: 'complexity_optimization',
                description: `${feasiblePlatform.platform} has highest automation feasibility (${feasiblePlatform.avg_feasibility.toFixed(2)}) - focus automation efforts here`,
                confidence: 0.8,
                actionability: 0.9,
                expectedImpact: 0.8
            });
        }

        // Save insights to database
        const stmt = this.db.prepare(`
            INSERT INTO cross_iteration_insights (
                insight_type, insight_description, supporting_data,
                confidence_level, actionability_score, expected_impact,
                implementation_complexity, validation_method, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insights.forEach(insight => {
            stmt.run(
                insight.type,
                insight.description,
                JSON.stringify(patterns),
                insight.confidence,
                insight.actionability,
                insight.expectedImpact,
                'low',
                'automated_analysis',
                'pending_implementation'
            );
        });

        return insights;
    }

    /**
     * Calculate learning trend
     */
    calculateLearningTrend(modelTrends) {
        if (modelTrends.length < 2) return 'insufficient_data';
        
        const recent = modelTrends.slice(-3);
        const avgRecentAccuracy = recent.reduce((sum, m) => sum + (m.prediction_accuracy || 0), 0) / recent.length;
        const avgRecentConfidence = recent.reduce((sum, m) => sum + (m.model_confidence || 0), 0) / recent.length;
        
        if (avgRecentAccuracy > 0.7 && avgRecentConfidence > 0.7) return 'improving';
        if (avgRecentAccuracy > 0.5 && avgRecentConfidence > 0.5) return 'stable';
        return 'needs_improvement';
    }

    /**
     * Generate optimization recommendations for agent prompts
     */
    generatePromptOptimizationRecommendations() {
        console.log('🎯 Generating agent prompt optimization recommendations...');

        const promptAnalytics = this.db.prepare(`
            SELECT 
                agent_type,
                AVG(response_quality) as avg_quality,
                AVG(response_accuracy) as avg_accuracy,
                AVG(response_time_ms) as avg_response_time,
                AVG(tokens_used) as avg_tokens,
                COUNT(*) as usage_count
            FROM agent_prompt_analytics
            GROUP BY agent_type
            ORDER BY avg_quality DESC, avg_accuracy DESC
        `).all();

        const recommendations = promptAnalytics.map(analytics => {
            const suggestions = [];
            
            if (analytics.avg_quality < 0.7) {
                suggestions.push('Improve prompt clarity and specificity');
                suggestions.push('Add more context and examples');
            }
            
            if (analytics.avg_accuracy < 0.8) {
                suggestions.push('Enhance validation criteria in prompts');
                suggestions.push('Add error handling instructions');
            }
            
            if (analytics.avg_response_time > 5000) {
                suggestions.push('Optimize prompt length for faster responses');
                suggestions.push('Pre-compute common context elements');
            }
            
            if (analytics.avg_tokens > 1000) {
                suggestions.push('Reduce prompt verbosity while maintaining clarity');
                suggestions.push('Use more efficient prompt structures');
            }

            return {
                agentType: analytics.agent_type,
                currentPerformance: {
                    quality: analytics.avg_quality,
                    accuracy: analytics.avg_accuracy,
                    responseTime: analytics.avg_response_time,
                    tokenUsage: analytics.avg_tokens
                },
                optimizationSuggestions: suggestions,
                priority: analytics.avg_quality < 0.5 ? 'high' : analytics.avg_quality < 0.7 ? 'medium' : 'low'
            };
        });

        return recommendations;
    }

    /**
     * Export comprehensive learning analytics report
     */
    exportLearningReport() {
        console.log('📊 Exporting comprehensive learning analytics report...');

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalIterations: this.db.prepare('SELECT COUNT(*) as count FROM learning_iterations').get().count,
                totalSurveysDiscovered: this.db.prepare('SELECT SUM(surveys_discovered) as total FROM learning_iterations').get().total || 0,
                totalPlatformsAnalyzed: this.db.prepare('SELECT COUNT(DISTINCT platform_name) as count FROM platform_behavior_intelligence').get().count,
                totalStrategiesDeveloped: this.db.prepare('SELECT SUM(adaptive_strategies_developed) as total FROM learning_iterations').get().total || 0
            },
            patterns: this.analyzeLearningPatterns(),
            insights: this.generateCrossIterationInsights(),
            promptOptimizations: this.generatePromptOptimizationRecommendations(),
            recommendations: this.generateActionableRecommendations()
        };

        // Save report to file
        const fs = require('fs');
        fs.writeFileSync('./advanced-learning-report.json', JSON.stringify(report, null, 2));
        
        return report;
    }

    /**
     * Generate actionable recommendations
     */
    generateActionableRecommendations() {
        const patterns = this.analyzeLearningPatterns();
        const recommendations = [];

        // High-impact recommendations
        if (patterns.analysis.topDiscoveryStrategy !== 'none') {
            recommendations.push({
                category: 'discovery_optimization',
                priority: 'high',
                action: `Focus 70% of discovery efforts on ${patterns.analysis.topDiscoveryStrategy}`,
                expectedImpact: 'Increase discovery rate by 40-60%',
                implementationComplexity: 'low'
            });
        }

        if (patterns.analysis.mostFeasiblePlatform !== 'none') {
            recommendations.push({
                category: 'automation_prioritization',
                priority: 'high',
                action: `Prioritize automation development for ${patterns.analysis.mostFeasiblePlatform}`,
                expectedImpact: 'Improve success rate by 30-50%',
                implementationComplexity: 'medium'
            });
        }

        // Learning optimization recommendations
        if (patterns.analysis.learningTrend === 'needs_improvement') {
            recommendations.push({
                category: 'learning_enhancement',
                priority: 'high',
                action: 'Enhance data collection and model features',
                expectedImpact: 'Improve prediction accuracy by 20-30%',
                implementationComplexity: 'medium'
            });
        }

        return recommendations;
    }

    close() {
        this.db.close();
    }
}

module.exports = AdvancedLearningLogger;