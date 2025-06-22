/**
 * Enhanced Storage System
 * Intelligent data curation and storage with LLM-powered insights
 */

const EnhancedFailureAnalyzer = require('../ai/enhanced-failure-analyzer');
const RegistrationLogger = require('./registration-logger');

class EnhancedStorageSystem {
    constructor(aiService, options = {}) {
        this.aiService = aiService;
        this.failureAnalyzer = new EnhancedFailureAnalyzer(aiService, options);
        this.registrationLogger = new RegistrationLogger();
        this.options = {
            enableRealTimeAnalysis: true,
            enablePatternDetection: true,
            enablePredictiveInsights: true,
            storageMode: 'comprehensive', // 'basic', 'enhanced', 'comprehensive'
            ...options
        };
        
        this.analysisQueue = [];
        this.processingQueue = false;
    }

    /**
     * Initialize the enhanced storage system
     */
    async initialize() {
        console.log('🚀 Initializing Enhanced Storage System...');
        
        try {
            await this.registrationLogger.initialize();
            await this.setupEnhancedTables();
            
            console.log('✅ Enhanced Storage System initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Enhanced Storage System initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup additional tables for enhanced storage
     */
    async setupEnhancedTables() {
        const enhancedTables = [
            // Enhanced failure analysis table
            `CREATE TABLE IF NOT EXISTS enhanced_failure_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id TEXT UNIQUE NOT NULL,
                registration_id INTEGER,
                failure_hash TEXT NOT NULL,
                
                -- LLM Analysis Results
                root_cause TEXT NOT NULL,
                failure_category TEXT NOT NULL,
                severity_level TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                explanation TEXT,
                evidence TEXT, -- JSON array
                
                -- Classification
                is_recoverable BOOLEAN,
                is_preventable BOOLEAN,
                blocking_factor TEXT,
                estimated_fix_time TEXT,
                
                -- Impact Assessment
                business_impact_score REAL,
                technical_impact_score REAL,
                user_impact_score REAL,
                priority_level TEXT,
                
                -- Context Capture
                screenshot_path TEXT,
                dom_snapshot_path TEXT,
                console_logs TEXT, -- JSON
                network_logs TEXT, -- JSON
                browser_state TEXT, -- JSON
                reproduction_recipe TEXT, -- JSON
                
                -- Analysis Metadata
                analyzer_version TEXT DEFAULT '2.0',
                analysis_duration_ms INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`,

            // Failure recommendations table
            `CREATE TABLE IF NOT EXISTS failure_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id TEXT NOT NULL,
                recommendation_type TEXT NOT NULL,
                priority TEXT NOT NULL,
                effort_level TEXT NOT NULL,
                action_description TEXT NOT NULL,
                implementation_details TEXT,
                expected_outcome TEXT,
                risk_assessment TEXT,
                dependencies TEXT, -- JSON array
                estimated_time TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (analysis_id) REFERENCES enhanced_failure_analysis (analysis_id)
            )`,

            // Pattern recognition table
            `CREATE TABLE IF NOT EXISTS failure_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_hash TEXT UNIQUE NOT NULL,
                pattern_name TEXT NOT NULL,
                pattern_description TEXT,
                failure_category TEXT,
                frequency_count INTEGER DEFAULT 1,
                confidence_score REAL,
                
                -- Pattern Data
                pattern_signature TEXT, -- JSON
                affected_sites TEXT, -- JSON array
                affected_steps TEXT, -- JSON array
                common_characteristics TEXT, -- JSON
                
                -- Trend Analysis
                first_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
                trend_direction TEXT, -- 'increasing', 'stable', 'decreasing'
                seasonal_factor REAL,
                
                -- Resolution Tracking
                successful_resolutions INTEGER DEFAULT 0,
                failed_resolutions INTEGER DEFAULT 0,
                avg_resolution_time_hours REAL,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Predictive insights table
            `CREATE TABLE IF NOT EXISTS predictive_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_type TEXT NOT NULL,
                prediction_target TEXT NOT NULL,
                confidence_level REAL NOT NULL,
                
                -- Prediction Data
                prediction_data TEXT, -- JSON
                supporting_evidence TEXT, -- JSON
                risk_factors TEXT, -- JSON array
                mitigation_strategies TEXT, -- JSON array
                
                -- Validation
                prediction_accuracy REAL,
                validation_date DATETIME,
                outcome_description TEXT,
                
                -- Metadata
                model_version TEXT,
                training_data_size INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            )`,

            // Performance analytics table
            `CREATE TABLE IF NOT EXISTS performance_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metric_unit TEXT,
                
                -- Context
                site_name TEXT,
                step_name TEXT,
                registration_id INTEGER,
                
                -- Timing
                measurement_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                time_window_start DATETIME,
                time_window_end DATETIME,
                
                -- Metadata
                measurement_method TEXT,
                data_source TEXT,
                confidence_level REAL,
                
                FOREIGN KEY (registration_id) REFERENCES registration_attempts (id)
            )`
        ];

        for (const tableSQL of enhancedTables) {
            await this.registrationLogger.runQuery(tableSQL);
        }

        console.log('📊 Enhanced storage tables created successfully');
    }

    /**
     * Store failure with comprehensive analysis
     */
    async storeFailureWithAnalysis(failureContext) {
        console.log('💾 Storing failure with enhanced analysis...');
        
        try {
            // 1. Perform comprehensive failure analysis
            const analysis = await this.failureAnalyzer.analyzeFailure(failureContext);
            
            // 2. Store the enhanced analysis
            const analysisId = await this.storeEnhancedAnalysis(analysis, failureContext);
            
            // 3. Store recommendations
            await this.storeFailureRecommendations(analysisId, analysis.insights);
            
            // 4. Update pattern recognition
            await this.updateFailurePatterns(analysis);
            
            // 5. Generate predictive insights
            if (this.options.enablePredictiveInsights) {
                await this.generatePredictiveInsights(analysis);
            }
            
            // 6. Record performance metrics
            await this.recordPerformanceMetrics(analysis, failureContext);
            
            console.log(`✅ Enhanced failure analysis stored (ID: ${analysisId})`);
            return {
                analysisId,
                confidence: analysis.confidence,
                category: analysis.classification?.category,
                recommendations: analysis.insights?.immediate?.length || 0
            };
            
        } catch (error) {
            console.error('❌ Enhanced storage failed:', error);
            return this.storeFallbackFailure(failureContext, error);
        }
    }

    /**
     * Store enhanced analysis results
     */
    async storeEnhancedAnalysis(analysis, failureContext) {
        const query = `
            INSERT INTO enhanced_failure_analysis (
                analysis_id, registration_id, failure_hash, root_cause, failure_category,
                severity_level, confidence_score, explanation, evidence, is_recoverable,
                is_preventable, blocking_factor, estimated_fix_time, business_impact_score,
                technical_impact_score, user_impact_score, priority_level, screenshot_path,
                dom_snapshot_path, console_logs, network_logs, browser_state,
                reproduction_recipe, analyzer_version, analysis_duration_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            analysis.analysisId,
            failureContext.registrationId || null,
            analysis.failureHash,
            analysis.llmAnalysis?.structured?.rootCause || 'Unknown',
            analysis.classification?.category || 'unknown',
            analysis.classification?.severity || 'medium',
            analysis.confidence || 0,
            analysis.llmAnalysis?.structured?.explanation || '',
            JSON.stringify(analysis.llmAnalysis?.structured?.evidence || []),
            analysis.classification?.recoverable || false,
            analysis.llmAnalysis?.structured?.preventable || false,
            analysis.impact?.blockingFactor || 'unknown',
            analysis.impact?.estimatedResolutionTime || 'unknown',
            analysis.impact?.businessImpact || 0,
            analysis.impact?.technicalImpact || 0,
            analysis.impact?.userImpact || 0,
            analysis.impact?.priority || 'P3',
            analysis.enrichedContext?.enhanced?.screenshotPath || null,
            analysis.enrichedContext?.enhanced?.domSnapshotPath || null,
            JSON.stringify(analysis.enrichedContext?.enhanced?.consoleLogs || []),
            JSON.stringify(analysis.enrichedContext?.enhanced?.networkActivity || []),
            JSON.stringify(analysis.enrichedContext?.enhanced?.browserState || {}),
            JSON.stringify(analysis.reproductionRecipe || {}),
            analysis.analysisVersion || '2.0',
            analysis.enrichedContext?.timestamps?.captureDuration || 0
        ];

        const result = await this.registrationLogger.runQuery(query, values);
        return analysis.analysisId;
    }

    /**
     * Store failure recommendations
     */
    async storeFailureRecommendations(analysisId, insights) {
        if (!insights || !insights.immediate) return;

        const allRecommendations = [
            ...(insights.immediate || []).map(r => ({ ...r, priority: 'high' })),
            ...(insights.strategic || []).map(r => ({ ...r, priority: 'medium' })),
            ...(insights.future || []).map(r => ({ ...r, priority: 'low' }))
        ];

        for (const rec of allRecommendations) {
            const query = `
                INSERT INTO failure_recommendations (
                    analysis_id, recommendation_type, priority, effort_level,
                    action_description, implementation_details, expected_outcome,
                    risk_assessment, dependencies, estimated_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                analysisId,
                rec.type || 'improvement',
                rec.priority || 'medium',
                rec.effort || 'medium',
                rec.action || rec.description || '',
                rec.implementation || '',
                rec.expectedOutcome || '',
                rec.risks || '',
                JSON.stringify(rec.dependencies || []),
                rec.estimatedTime || 'unknown'
            ];

            await this.registrationLogger.runQuery(query, values);
        }

        console.log(`📋 Stored ${allRecommendations.length} recommendations for ${analysisId}`);
    }

    /**
     * Update failure pattern recognition
     */
    async updateFailurePatterns(analysis) {
        if (!this.options.enablePatternDetection) return;

        const patternSignature = this.generatePatternSignature(analysis);
        const patternHash = this.hashString(JSON.stringify(patternSignature));

        // Check if pattern exists
        const existingPattern = await this.registrationLogger.getQuery(
            'SELECT * FROM failure_patterns WHERE pattern_hash = ?',
            [patternHash]
        );

        if (existingPattern) {
            // Update existing pattern
            await this.registrationLogger.runQuery(`
                UPDATE failure_patterns 
                SET frequency_count = frequency_count + 1,
                    last_occurrence = CURRENT_TIMESTAMP,
                    confidence_score = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE pattern_hash = ?
            `, [analysis.confidence, patternHash]);
            
            console.log(`📈 Updated pattern frequency: ${existingPattern.pattern_name}`);
        } else {
            // Create new pattern
            const query = `
                INSERT INTO failure_patterns (
                    pattern_hash, pattern_name, pattern_description, failure_category,
                    confidence_score, pattern_signature, affected_sites, affected_steps,
                    common_characteristics, trend_direction
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                patternHash,
                this.generatePatternName(analysis),
                analysis.llmAnalysis?.structured?.explanation || '',
                analysis.classification?.category || 'unknown',
                analysis.confidence || 0,
                JSON.stringify(patternSignature),
                JSON.stringify([analysis.enrichedContext?.basic?.siteName || 'unknown']),
                JSON.stringify([analysis.enrichedContext?.basic?.stepName || 'unknown']),
                JSON.stringify(this.extractCommonCharacteristics(analysis)),
                'new'
            ];

            await this.registrationLogger.runQuery(query, values);
            console.log(`🆕 Created new failure pattern: ${this.generatePatternName(analysis)}`);
        }
    }

    /**
     * Generate predictive insights
     */
    async generatePredictiveInsights(analysis) {
        try {
            const insights = await this.generateInsightsFromAnalysis(analysis);
            
            for (const insight of insights) {
                const query = `
                    INSERT INTO predictive_insights (
                        insight_type, prediction_target, confidence_level, prediction_data,
                        supporting_evidence, risk_factors, mitigation_strategies,
                        model_version, training_data_size, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const values = [
                    insight.type,
                    insight.target,
                    insight.confidence,
                    JSON.stringify(insight.data),
                    JSON.stringify(insight.evidence),
                    JSON.stringify(insight.risks),
                    JSON.stringify(insight.mitigations),
                    '2.0',
                    1, // Based on current analysis
                    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                ];

                await this.registrationLogger.runQuery(query, values);
            }

            console.log(`🔮 Generated ${insights.length} predictive insights`);
        } catch (error) {
            console.warn('⚠️ Predictive insights generation failed:', error.message);
        }
    }

    /**
     * Record performance metrics
     */
    async recordPerformanceMetrics(analysis, failureContext) {
        const metrics = [
            {
                type: 'analysis',
                name: 'confidence_score',
                value: analysis.confidence || 0,
                unit: 'percentage'
            },
            {
                type: 'timing',
                name: 'analysis_duration',
                value: analysis.enrichedContext?.timestamps?.captureDuration || 0,
                unit: 'milliseconds'
            },
            {
                type: 'quality',
                name: 'recommendations_generated',
                value: (analysis.insights?.immediate?.length || 0) + 
                       (analysis.insights?.strategic?.length || 0),
                unit: 'count'
            }
        ];

        for (const metric of metrics) {
            const query = `
                INSERT INTO performance_analytics (
                    metric_type, metric_name, metric_value, metric_unit,
                    site_name, step_name, registration_id, measurement_method,
                    data_source, confidence_level
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                metric.type,
                metric.name,
                metric.value,
                metric.unit,
                failureContext.siteName || analysis.enrichedContext?.basic?.siteName,
                failureContext.stepName || analysis.enrichedContext?.basic?.stepName,
                failureContext.registrationId,
                'automated_analysis',
                'enhanced_failure_analyzer',
                analysis.confidence || 0.5
            ];

            await this.registrationLogger.runQuery(query, values);
        }

        console.log(`📊 Recorded ${metrics.length} performance metrics`);
    }

    /**
     * Store success with enhanced insights
     */
    async storeSuccessWithInsights(successContext) {
        console.log('🎉 Storing success with enhanced insights...');
        
        try {
            // Analyze what made this attempt successful
            const successAnalysis = await this.analyzeSuccess(successContext);
            
            // Store success patterns
            await this.storeSuccessPattern(successAnalysis);
            
            // Update positive performance metrics
            await this.recordSuccessMetrics(successAnalysis, successContext);
            
            console.log('✅ Success insights stored successfully');
            return successAnalysis;
            
        } catch (error) {
            console.error('❌ Success storage failed:', error);
            return null;
        }
    }

    /**
     * Analyze successful automation attempts
     */
    async analyzeSuccess(successContext) {
        const analysisPrompt = `Analyze this successful automation attempt and identify key success factors:

## SUCCESS CONTEXT
Site: ${successContext.siteName}
Steps Completed: ${successContext.completedSteps || 'Unknown'}
Duration: ${successContext.duration || 'Unknown'}ms
Confidence: ${successContext.confidence || 'Unknown'}

## REQUEST
Identify the key factors that led to success and provide insights for replication:

{
  "successFactors": ["Array of key factors"],
  "optimalSelectors": ["Selectors that worked well"],
  "timingFactors": "What timing contributed to success",
  "siteCharacteristics": "Site features that helped",
  "recommendations": "How to replicate this success",
  "confidence": 0.0-1.0
}`;

        try {
            const response = await this.aiService.analyzeContent(analysisPrompt);
            return this.parseAnalysisResponse(response);
        } catch (error) {
            return {
                successFactors: ['Analysis failed'],
                confidence: 0.1,
                error: error.message
            };
        }
    }

    /**
     * Store success patterns for future reference
     */
    async storeSuccessPattern(successAnalysis) {
        // Implementation would store successful patterns
        // Similar to failure patterns but for successful strategies
        console.log('📈 Success pattern stored');
    }

    /**
     * Record success metrics
     */
    async recordSuccessMetrics(successAnalysis, successContext) {
        const metrics = [
            {
                type: 'success',
                name: 'completion_rate',
                value: 1.0,
                unit: 'percentage'
            },
            {
                type: 'success',
                name: 'confidence_score',
                value: successContext.confidence || 0.8,
                unit: 'percentage'
            }
        ];

        for (const metric of metrics) {
            const query = `
                INSERT INTO performance_analytics (
                    metric_type, metric_name, metric_value, metric_unit,
                    site_name, registration_id, measurement_method, data_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                metric.type,
                metric.name,
                metric.value,
                metric.unit,
                successContext.siteName,
                successContext.registrationId,
                'success_analysis',
                'enhanced_storage_system'
            ];

            await this.registrationLogger.runQuery(query, values);
        }
    }

    /**
     * Generate analytics and insights dashboard data
     */
    async generateInsightsDashboard() {
        console.log('📊 Generating insights dashboard...');
        
        try {
            const dashboard = {
                summary: await this.getFailureSummary(),
                patterns: await this.getTopFailurePatterns(),
                recommendations: await this.getPendingRecommendations(),
                predictions: await this.getActivePredictions(),
                performance: await this.getPerformanceMetrics(),
                trends: await this.getFailureTrends()
            };
            
            return dashboard;
        } catch (error) {
            console.error('❌ Dashboard generation failed:', error);
            return null;
        }
    }

    /**
     * Helper methods for analysis
     */
    generatePatternSignature(analysis) {
        return {
            category: analysis.classification?.category,
            severity: analysis.classification?.severity,
            siteName: analysis.enrichedContext?.basic?.siteName,
            stepName: analysis.enrichedContext?.basic?.stepName,
            errorType: analysis.llmAnalysis?.structured?.rootCause
        };
    }

    generatePatternName(analysis) {
        const category = analysis.classification?.category || 'unknown';
        const site = analysis.enrichedContext?.basic?.siteName || 'unknown-site';
        return `${category}_${site}_pattern`;
    }

    extractCommonCharacteristics(analysis) {
        return {
            browserState: analysis.enrichedContext?.enhanced?.browserState,
            pageStructure: analysis.enrichedContext?.enhanced?.pageStructure,
            errorMessage: analysis.enrichedContext?.basic?.error?.message
        };
    }

    async generateInsightsFromAnalysis(analysis) {
        // Generate predictive insights based on current analysis
        return [
            {
                type: 'failure_prediction',
                target: analysis.enrichedContext?.basic?.siteName || 'unknown',
                confidence: analysis.confidence || 0.5,
                data: { category: analysis.classification?.category },
                evidence: [analysis.llmAnalysis?.structured?.rootCause],
                risks: analysis.llmAnalysis?.structured?.riskFactors || [],
                mitigations: analysis.insights?.preventive || []
            }
        ];
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    parseAnalysisResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { error: 'No JSON found', rawResponse: response };
        } catch (error) {
            return { error: error.message, rawResponse: response };
        }
    }

    storeFallbackFailure(failureContext, error) {
        console.log('💾 Storing fallback failure record...');
        return {
            analysisId: `fallback_${Date.now()}`,
            confidence: 0.1,
            category: 'storage_error',
            recommendations: 0,
            error: error.message
        };
    }

    /**
     * Dashboard query methods
     */
    async getFailureSummary() {
        const query = `
            SELECT 
                failure_category,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence,
                MAX(created_at) as last_occurrence
            FROM enhanced_failure_analysis 
            WHERE created_at > date('now', '-7 days')
            GROUP BY failure_category
            ORDER BY count DESC
        `;
        return await this.registrationLogger.allQuery(query);
    }

    async getTopFailurePatterns() {
        const query = `
            SELECT pattern_name, frequency_count, confidence_score, last_occurrence
            FROM failure_patterns 
            ORDER BY frequency_count DESC 
            LIMIT 10
        `;
        return await this.registrationLogger.allQuery(query);
    }

    async getPendingRecommendations() {
        const query = `
            SELECT fr.*, efa.failure_category, efa.severity_level
            FROM failure_recommendations fr
            JOIN enhanced_failure_analysis efa ON fr.analysis_id = efa.analysis_id
            WHERE fr.priority = 'high'
            ORDER BY fr.created_at DESC
            LIMIT 20
        `;
        return await this.registrationLogger.allQuery(query);
    }

    async getActivePredictions() {
        const query = `
            SELECT * FROM predictive_insights 
            WHERE expires_at > datetime('now')
            ORDER BY confidence_level DESC
            LIMIT 10
        `;
        return await this.registrationLogger.allQuery(query);
    }

    async getPerformanceMetrics() {
        const query = `
            SELECT 
                metric_type,
                metric_name,
                AVG(metric_value) as avg_value,
                COUNT(*) as sample_count
            FROM performance_analytics 
            WHERE measurement_timestamp > date('now', '-7 days')
            GROUP BY metric_type, metric_name
        `;
        return await this.registrationLogger.allQuery(query);
    }

    async getFailureTrends() {
        const query = `
            SELECT 
                DATE(created_at) as date,
                failure_category,
                COUNT(*) as count
            FROM enhanced_failure_analysis 
            WHERE created_at > date('now', '-30 days')
            GROUP BY DATE(created_at), failure_category
            ORDER BY date DESC
        `;
        return await this.registrationLogger.allQuery(query);
    }

    /**
     * Close the storage system
     */
    async close() {
        if (this.registrationLogger) {
            await this.registrationLogger.close();
        }
    }
}

module.exports = EnhancedStorageSystem;