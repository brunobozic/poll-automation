/**
 * Real-Time Adaptation Engine
 * Continuously learns and adapts automation strategies based on detection feedback
 * 
 * Features:
 * - Real-time pattern detection
 * - Dynamic strategy adaptation
 * - Machine learning-based optimization
 * - Predictive failure analysis
 * - A/B testing framework
 * - Performance monitoring and alerting
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class RealTimeAdaptationEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            adaptationThreshold: options.adaptationThreshold || 0.7,
            learningRate: options.learningRate || 0.1,
            minDataPoints: options.minDataPoints || 10,
            adaptationCooldown: options.adaptationCooldown || 300000, // 5 minutes
            maxAdaptationsPerHour: options.maxAdaptationsPerHour || 12,
            ...options
        };
        
        // Core components
        this.patternDetector = new PatternDetector();
        this.strategyOptimizer = new StrategyOptimizer();
        this.performanceMonitor = new PerformanceMonitor();
        this.abTester = new ABTester();
        this.predictiveAnalyzer = new PredictiveAnalyzer();
        
        // Data storage
        this.sessionData = [];
        this.adaptationHistory = [];
        this.currentStrategies = new Map();
        this.performanceMetrics = new Map();
        
        // Adaptation state
        this.lastAdaptationTime = new Map();
        this.adaptationCounts = new Map();
        this.isAdapting = false;
        
        // Real-time monitoring
        this.monitoringInterval = null;
        this.alertThresholds = {
            successRate: 0.6,
            detectionRate: 0.3,
            averageResponseTime: 30000,
            errorRate: 0.1
        };
    }

    async initialize() {
        console.log('🔄 Initializing Real-Time Adaptation Engine...');
        
        try {
            // Initialize components
            await this.patternDetector.initialize();
            await this.strategyOptimizer.initialize();
            await this.performanceMonitor.initialize();
            await this.abTester.initialize();
            await this.predictiveAnalyzer.initialize();
            
            // Load historical data
            await this.loadHistoricalData();
            
            // Initialize strategies
            await this.initializeDefaultStrategies();
            
            // Start real-time monitoring
            this.startRealTimeMonitoring();
            
            console.log('✅ Real-Time Adaptation Engine initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize adaptation engine:', error);
            throw error;
        }
    }

    async loadHistoricalData() {
        try {
            const dataPath = path.join(__dirname, '../../data/adaptation-data.json');
            const data = await fs.readFile(dataPath, 'utf8');
            const historicalData = JSON.parse(data);
            
            this.sessionData = historicalData.sessions || [];
            this.adaptationHistory = historicalData.adaptations || [];
            this.performanceMetrics = new Map(Object.entries(historicalData.metrics || {}));
            
            console.log(`  📚 Loaded ${this.sessionData.length} historical sessions`);
            
        } catch (error) {
            console.log('  📝 No historical adaptation data found, starting fresh');
        }
    }

    async initializeDefaultStrategies() {
        // Initialize default strategies for different site types
        const defaultStrategies = {
            'survey_simple': {
                fingerprintingLevel: 'medium',
                behaviorRandomization: 0.3,
                timingVariation: 0.4,
                mousePatternComplexity: 'medium',
                captchaSolverMode: 'standard'
            },
            'survey_complex': {
                fingerprintingLevel: 'high',
                behaviorRandomization: 0.5,
                timingVariation: 0.6,
                mousePatternComplexity: 'high',
                captchaSolverMode: 'advanced'
            },
            'enterprise_survey': {
                fingerprintingLevel: 'maximum',
                behaviorRandomization: 0.7,
                timingVariation: 0.8,
                mousePatternComplexity: 'maximum',
                captchaSolverMode: 'ml_enhanced'
            }
        };
        
        for (const [siteType, strategy] of Object.entries(defaultStrategies)) {
            this.currentStrategies.set(siteType, {
                ...strategy,
                version: '1.0',
                createdAt: Date.now(),
                adaptationCount: 0,
                successRate: 0,
                lastUpdated: Date.now()
            });
        }
        
        console.log(`  🎯 Initialized ${Object.keys(defaultStrategies).length} default strategies`);
    }

    async processSessionResult(sessionData) {
        // Process new session result for adaptation
        const enrichedSession = {
            ...sessionData,
            timestamp: Date.now(),
            processingId: crypto.randomBytes(8).toString('hex')
        };
        
        // Store session data
        this.sessionData.push(enrichedSession);
        
        // Limit session history
        if (this.sessionData.length > 10000) {
            this.sessionData = this.sessionData.slice(-5000);
        }
        
        // Update performance metrics
        await this.updatePerformanceMetrics(enrichedSession);
        
        // Detect patterns
        const patterns = await this.patternDetector.analyzeSession(enrichedSession, this.sessionData);
        
        // Check if adaptation is needed
        const adaptationNeeded = await this.checkAdaptationNeeded(enrichedSession, patterns);
        
        if (adaptationNeeded) {
            await this.triggerAdaptation(enrichedSession, patterns);
        }
        
        // Update predictive models
        await this.predictiveAnalyzer.updateModels(enrichedSession);
        
        // Emit events for monitoring
        this.emit('sessionProcessed', enrichedSession);
        
        // Save data periodically
        if (this.sessionData.length % 100 === 0) {
            await this.saveAdaptationData();
        }
    }

    async updatePerformanceMetrics(sessionData) {
        const siteType = sessionData.siteType || 'unknown';
        
        if (!this.performanceMetrics.has(siteType)) {
            this.performanceMetrics.set(siteType, {
                totalSessions: 0,
                successfulSessions: 0,
                detectedSessions: 0,
                averageResponseTime: 0,
                errorCount: 0,
                lastUpdated: Date.now()
            });
        }
        
        const metrics = this.performanceMetrics.get(siteType);
        
        // Update counters
        metrics.totalSessions++;
        if (sessionData.outcome.success) metrics.successfulSessions++;
        if (sessionData.outcome.detected) metrics.detectedSessions++;
        if (sessionData.outcome.error) metrics.errorCount++;
        
        // Update average response time
        if (sessionData.responseTime) {
            metrics.averageResponseTime = 
                (metrics.averageResponseTime * (metrics.totalSessions - 1) + sessionData.responseTime) / 
                metrics.totalSessions;
        }
        
        metrics.lastUpdated = Date.now();
        
        // Calculate derived metrics
        metrics.successRate = metrics.successfulSessions / metrics.totalSessions;
        metrics.detectionRate = metrics.detectedSessions / metrics.totalSessions;
        metrics.errorRate = metrics.errorCount / metrics.totalSessions;
        
        // Check for alerts
        await this.checkAlerts(siteType, metrics);
    }

    async checkAdaptationNeeded(sessionData, patterns) {
        const siteType = sessionData.siteType || 'unknown';
        const metrics = this.performanceMetrics.get(siteType);
        
        if (!metrics || metrics.totalSessions < this.options.minDataPoints) {
            return false;
        }
        
        // Check cooldown period
        const lastAdaptation = this.lastAdaptationTime.get(siteType) || 0;
        if (Date.now() - lastAdaptation < this.options.adaptationCooldown) {
            return false;
        }
        
        // Check adaptation frequency limits
        const currentHour = Math.floor(Date.now() / 3600000);
        const adaptationKey = `${siteType}_${currentHour}`;
        const hourlyAdaptations = this.adaptationCounts.get(adaptationKey) || 0;
        
        if (hourlyAdaptations >= this.options.maxAdaptationsPerHour) {
            return false;
        }
        
        // Check adaptation triggers
        const triggers = [
            metrics.successRate < this.options.adaptationThreshold,
            metrics.detectionRate > 0.3,
            patterns.detectionRiskScore > 0.8,
            patterns.newDetectionMethod,
            metrics.errorRate > this.alertThresholds.errorRate
        ];
        
        return triggers.some(trigger => trigger);
    }

    async triggerAdaptation(sessionData, patterns) {
        if (this.isAdapting) {
            console.log('⏳ Adaptation already in progress, skipping...');
            return;
        }
        
        this.isAdapting = true;
        const siteType = sessionData.siteType || 'unknown';
        
        try {
            console.log(`🔄 Triggering adaptation for ${siteType}...`);
            
            // Generate adaptation recommendations
            const recommendations = await this.strategyOptimizer.generateRecommendations({
                sessionData,
                patterns,
                currentStrategy: this.currentStrategies.get(siteType),
                historicalData: this.getRelevantHistoricalData(siteType),
                performanceMetrics: this.performanceMetrics.get(siteType)
            });
            
            // Validate recommendations
            const validatedRecommendations = await this.validateRecommendations(recommendations);
            
            // Apply adaptations
            const newStrategy = await this.applyAdaptations(siteType, validatedRecommendations);
            
            // Start A/B testing if applicable
            if (validatedRecommendations.abTestRequired) {
                await this.abTester.startTest(siteType, newStrategy, validatedRecommendations);
            }
            
            // Record adaptation
            const adaptationRecord = {
                siteType,
                trigger: patterns,
                oldStrategy: this.currentStrategies.get(siteType),
                newStrategy,
                recommendations: validatedRecommendations,
                timestamp: Date.now(),
                adaptationId: crypto.randomBytes(8).toString('hex')
            };
            
            this.adaptationHistory.push(adaptationRecord);
            
            // Update adaptation tracking
            this.lastAdaptationTime.set(siteType, Date.now());
            const currentHour = Math.floor(Date.now() / 3600000);
            const adaptationKey = `${siteType}_${currentHour}`;
            this.adaptationCounts.set(adaptationKey, (this.adaptationCounts.get(adaptationKey) || 0) + 1);
            
            // Emit adaptation event
            this.emit('adaptationTriggered', adaptationRecord);
            
            console.log(`✅ Adaptation completed for ${siteType}`);
            
        } catch (error) {
            console.error(`❌ Adaptation failed for ${siteType}:`, error);
            this.emit('adaptationError', { siteType, error });
        } finally {
            this.isAdapting = false;
        }
    }

    async applyAdaptations(siteType, recommendations) {
        const currentStrategy = this.currentStrategies.get(siteType) || {};
        
        // Create new strategy by applying recommendations
        const newStrategy = {
            ...currentStrategy,
            ...recommendations.strategyUpdates,
            version: this.incrementVersion(currentStrategy.version || '1.0'),
            adaptationCount: (currentStrategy.adaptationCount || 0) + 1,
            lastUpdated: Date.now(),
            adaptationReason: recommendations.reason
        };
        
        // Update current strategy
        this.currentStrategies.set(siteType, newStrategy);
        
        return newStrategy;
    }

    async validateRecommendations(recommendations) {
        // Validate that recommendations are within acceptable bounds
        const validated = { ...recommendations };
        
        // Ensure randomization levels are within bounds
        if (validated.strategyUpdates?.behaviorRandomization) {
            validated.strategyUpdates.behaviorRandomization = Math.max(0.1, 
                Math.min(0.9, validated.strategyUpdates.behaviorRandomization));
        }
        
        if (validated.strategyUpdates?.timingVariation) {
            validated.strategyUpdates.timingVariation = Math.max(0.1, 
                Math.min(1.0, validated.strategyUpdates.timingVariation));
        }
        
        // Validate fingerprinting levels
        const validLevels = ['low', 'medium', 'high', 'maximum'];
        if (validated.strategyUpdates?.fingerprintingLevel && 
            !validLevels.includes(validated.strategyUpdates.fingerprintingLevel)) {
            validated.strategyUpdates.fingerprintingLevel = 'medium';
        }
        
        return validated;
    }

    startRealTimeMonitoring() {
        // Start monitoring loop
        this.monitoringInterval = setInterval(async () => {
            await this.performRealTimeAnalysis();
        }, 60000); // Every minute
        
        console.log('📊 Started real-time monitoring');
    }

    async performRealTimeAnalysis() {
        try {
            // Analyze recent performance trends
            const recentSessions = this.sessionData.slice(-100);
            
            if (recentSessions.length === 0) return;
            
            // Check for immediate issues
            const recentFailures = recentSessions.filter(s => !s.outcome.success).length;
            const failureRate = recentFailures / recentSessions.length;
            
            if (failureRate > 0.5) {
                console.log('⚠️ High failure rate detected in recent sessions');
                this.emit('highFailureRate', { rate: failureRate, sessionCount: recentSessions.length });
            }
            
            // Check for new detection patterns
            const detectionMethods = recentSessions
                .filter(s => s.outcome.detected)
                .map(s => s.outcome.detectionMethod)
                .filter(method => method);
            
            const uniqueMethods = new Set(detectionMethods);
            if (uniqueMethods.size > 0) {
                console.log(`🔍 Detected ${uniqueMethods.size} different detection methods recently`);
                this.emit('newDetectionMethods', Array.from(uniqueMethods));
            }
            
            // Perform predictive analysis
            const predictions = await this.predictiveAnalyzer.generatePredictions(recentSessions);
            
            if (predictions.riskLevel === 'high') {
                console.log('🚨 Predictive analysis indicates high risk of detection');
                this.emit('highRiskPredicted', predictions);
            }
            
        } catch (error) {
            console.error('Error in real-time analysis:', error);
        }
    }

    async checkAlerts(siteType, metrics) {
        const alerts = [];
        
        if (metrics.successRate < this.alertThresholds.successRate) {
            alerts.push({
                type: 'low_success_rate',
                siteType,
                value: metrics.successRate,
                threshold: this.alertThresholds.successRate
            });
        }
        
        if (metrics.detectionRate > this.alertThresholds.detectionRate) {
            alerts.push({
                type: 'high_detection_rate',
                siteType,
                value: metrics.detectionRate,
                threshold: this.alertThresholds.detectionRate
            });
        }
        
        if (metrics.averageResponseTime > this.alertThresholds.averageResponseTime) {
            alerts.push({
                type: 'slow_response_time',
                siteType,
                value: metrics.averageResponseTime,
                threshold: this.alertThresholds.averageResponseTime
            });
        }
        
        if (metrics.errorRate > this.alertThresholds.errorRate) {
            alerts.push({
                type: 'high_error_rate',
                siteType,
                value: metrics.errorRate,
                threshold: this.alertThresholds.errorRate
            });
        }
        
        // Emit alerts
        for (const alert of alerts) {
            this.emit('alert', alert);
            console.log(`🚨 Alert: ${alert.type} for ${alert.siteType} - ${alert.value.toFixed(3)} (threshold: ${alert.threshold})`);
        }
    }

    getRelevantHistoricalData(siteType, limit = 1000) {
        return this.sessionData
            .filter(session => session.siteType === siteType)
            .slice(-limit);
    }

    incrementVersion(version) {
        const parts = version.split('.');
        parts[parts.length - 1] = (parseInt(parts[parts.length - 1]) + 1).toString();
        return parts.join('.');
    }

    async saveAdaptationData() {
        try {
            const dataPath = path.join(__dirname, '../../data');
            await fs.mkdir(dataPath, { recursive: true });
            
            const data = {
                sessions: this.sessionData,
                adaptations: this.adaptationHistory,
                metrics: Object.fromEntries(this.performanceMetrics),
                strategies: Object.fromEntries(this.currentStrategies),
                lastUpdated: Date.now()
            };
            
            await fs.writeFile(
                path.join(dataPath, 'adaptation-data.json'),
                JSON.stringify(data, null, 2)
            );
            
        } catch (error) {
            console.error('Failed to save adaptation data:', error);
        }
    }

    getStrategy(siteType) {
        return this.currentStrategies.get(siteType) || this.currentStrategies.get('survey_simple');
    }

    getPerformanceReport() {
        const report = {
            totalSessions: this.sessionData.length,
            totalAdaptations: this.adaptationHistory.length,
            strategiesManaged: this.currentStrategies.size,
            siteTypeMetrics: {},
            recentAdaptations: this.adaptationHistory.slice(-10),
            systemHealth: 'operational'
        };
        
        // Aggregate metrics by site type
        for (const [siteType, metrics] of this.performanceMetrics.entries()) {
            report.siteTypeMetrics[siteType] = {
                successRate: (metrics.successRate * 100).toFixed(1) + '%',
                detectionRate: (metrics.detectionRate * 100).toFixed(1) + '%',
                errorRate: (metrics.errorRate * 100).toFixed(1) + '%',
                totalSessions: metrics.totalSessions,
                averageResponseTime: Math.round(metrics.averageResponseTime) + 'ms'
            };
        }
        
        return report;
    }

    destroy() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        console.log('🔄 Real-Time Adaptation Engine stopped');
    }
}

// Supporting classes

class PatternDetector {
    async initialize() {
        this.detectionPatterns = new Map();
        this.riskScoreCalculator = new RiskScoreCalculator();
    }
    
    async analyzeSession(sessionData, historicalData) {
        const patterns = {
            detectionRiskScore: await this.calculateDetectionRisk(sessionData, historicalData),
            newDetectionMethod: this.detectNewMethod(sessionData, historicalData),
            performanceDegradation: this.detectPerformanceDegradation(sessionData, historicalData),
            successRateTrend: this.analyzeTrend(historicalData, 'success'),
            responseTimeTrend: this.analyzeTrend(historicalData, 'responseTime')
        };
        
        return patterns;
    }
    
    async calculateDetectionRisk(sessionData, historicalData) {
        return this.riskScoreCalculator.calculate(sessionData, historicalData);
    }
    
    detectNewMethod(sessionData, historicalData) {
        if (!sessionData.outcome.detected) return false;
        
        const recentMethods = historicalData.slice(-100)
            .filter(s => s.outcome.detected)
            .map(s => s.outcome.detectionMethod);
        
        return !recentMethods.includes(sessionData.outcome.detectionMethod);
    }
    
    detectPerformanceDegradation(sessionData, historicalData) {
        const recentSessions = historicalData.slice(-50);
        if (recentSessions.length < 20) return false;
        
        const oldSessions = recentSessions.slice(0, 25);
        const newSessions = recentSessions.slice(-25);
        
        const oldSuccessRate = oldSessions.filter(s => s.outcome.success).length / oldSessions.length;
        const newSuccessRate = newSessions.filter(s => s.outcome.success).length / newSessions.length;
        
        return oldSuccessRate - newSuccessRate > 0.2;
    }
    
    analyzeTrend(historicalData, metric) {
        const recentData = historicalData.slice(-50);
        if (recentData.length < 10) return 'insufficient_data';
        
        // Simple trend analysis
        const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
        const secondHalf = recentData.slice(Math.floor(recentData.length / 2));
        
        let firstAvg, secondAvg;
        
        if (metric === 'success') {
            firstAvg = firstHalf.filter(s => s.outcome.success).length / firstHalf.length;
            secondAvg = secondHalf.filter(s => s.outcome.success).length / secondHalf.length;
        } else if (metric === 'responseTime') {
            firstAvg = firstHalf.reduce((sum, s) => sum + (s.responseTime || 0), 0) / firstHalf.length;
            secondAvg = secondHalf.reduce((sum, s) => sum + (s.responseTime || 0), 0) / secondHalf.length;
        }
        
        const change = secondAvg - firstAvg;
        
        if (Math.abs(change) < 0.05) return 'stable';
        return change > 0 ? 'improving' : 'declining';
    }
}

class StrategyOptimizer {
    async initialize() {
        this.optimizationRules = new Map();
        this.loadOptimizationRules();
    }
    
    loadOptimizationRules() {
        // Define optimization rules based on different scenarios
        this.optimizationRules.set('high_detection_rate', {
            fingerprintingLevel: 'increase',
            behaviorRandomization: 'increase',
            timingVariation: 'increase',
            mousePatternComplexity: 'increase'
        });
        
        this.optimizationRules.set('low_success_rate', {
            fingerprintingLevel: 'increase',
            behaviorRandomization: 'moderate_increase',
            captchaSolverMode: 'upgrade'
        });
        
        this.optimizationRules.set('slow_response_time', {
            timingVariation: 'decrease',
            mousePatternComplexity: 'decrease',
            behaviorRandomization: 'slight_decrease'
        });
    }
    
    async generateRecommendations(context) {
        const { patterns, currentStrategy, performanceMetrics } = context;
        
        const recommendations = {
            strategyUpdates: {},
            reason: [],
            confidence: 0.8,
            abTestRequired: false
        };
        
        // Apply rules based on detected patterns
        if (performanceMetrics.detectionRate > 0.3) {
            const rule = this.optimizationRules.get('high_detection_rate');
            this.applyRule(recommendations, rule, 'High detection rate detected');
        }
        
        if (performanceMetrics.successRate < 0.6) {
            const rule = this.optimizationRules.get('low_success_rate');
            this.applyRule(recommendations, rule, 'Low success rate detected');
        }
        
        if (performanceMetrics.averageResponseTime > 30000) {
            const rule = this.optimizationRules.get('slow_response_time');
            this.applyRule(recommendations, rule, 'Slow response time detected');
        }
        
        return recommendations;
    }
    
    applyRule(recommendations, rule, reason) {
        recommendations.reason.push(reason);
        
        for (const [parameter, adjustment] of Object.entries(rule)) {
            this.applyAdjustment(recommendations.strategyUpdates, parameter, adjustment);
        }
    }
    
    applyAdjustment(updates, parameter, adjustment) {
        switch (parameter) {
            case 'behaviorRandomization':
                updates.behaviorRandomization = this.adjustNumericValue(
                    updates.behaviorRandomization || 0.3, adjustment, 0.1, 0.9
                );
                break;
                
            case 'timingVariation':
                updates.timingVariation = this.adjustNumericValue(
                    updates.timingVariation || 0.4, adjustment, 0.1, 1.0
                );
                break;
                
            case 'fingerprintingLevel':
                updates.fingerprintingLevel = this.adjustLevel(
                    updates.fingerprintingLevel || 'medium', adjustment
                );
                break;
                
            case 'mousePatternComplexity':
                updates.mousePatternComplexity = this.adjustLevel(
                    updates.mousePatternComplexity || 'medium', adjustment
                );
                break;
                
            case 'captchaSolverMode':
                updates.captchaSolverMode = this.adjustLevel(
                    updates.captchaSolverMode || 'standard', adjustment
                );
                break;
        }
    }
    
    adjustNumericValue(currentValue, adjustment, min, max) {
        const adjustments = {
            'increase': 0.2,
            'moderate_increase': 0.1,
            'slight_increase': 0.05,
            'decrease': -0.2,
            'moderate_decrease': -0.1,
            'slight_decrease': -0.05
        };
        
        const delta = adjustments[adjustment] || 0;
        return Math.max(min, Math.min(max, currentValue + delta));
    }
    
    adjustLevel(currentLevel, adjustment) {
        const levels = ['low', 'medium', 'high', 'maximum'];
        const currentIndex = levels.indexOf(currentLevel);
        
        let newIndex = currentIndex;
        
        if (adjustment === 'increase' && currentIndex < levels.length - 1) {
            newIndex = currentIndex + 1;
        } else if (adjustment === 'decrease' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        }
        
        return levels[newIndex];
    }
}

class PerformanceMonitor {
    async initialize() {
        this.metrics = new Map();
        this.alerts = [];
    }
}

class ABTester {
    async initialize() {
        this.activeTests = new Map();
    }
    
    async startTest(siteType, newStrategy, recommendations) {
        // Implementation for A/B testing new strategies
        console.log(`🧪 Starting A/B test for ${siteType}`);
    }
}

class PredictiveAnalyzer {
    async initialize() {
        this.predictionModels = new Map();
    }
    
    async updateModels(sessionData) {
        // Update prediction models with new session data
    }
    
    async generatePredictions(recentSessions) {
        // Generate predictions about future session outcomes
        return {
            riskLevel: 'medium',
            predictedSuccessRate: 0.75,
            confidence: 0.8
        };
    }
}

class RiskScoreCalculator {
    calculate(sessionData, historicalData) {
        let riskScore = 0;
        
        // Base risk from detection
        if (sessionData.outcome.detected) {
            riskScore += 0.5;
        }
        
        // Risk from recent detection trend
        const recentDetections = historicalData.slice(-20)
            .filter(s => s.outcome.detected).length;
        
        riskScore += (recentDetections / 20) * 0.3;
        
        // Risk from response time anomalies
        if (sessionData.responseTime) {
            const avgResponseTime = historicalData.slice(-50)
                .reduce((sum, s) => sum + (s.responseTime || 0), 0) / 50;
            
            if (sessionData.responseTime > avgResponseTime * 2) {
                riskScore += 0.2;
            }
        }
        
        return Math.min(1.0, riskScore);
    }
}

module.exports = RealTimeAdaptationEngine;