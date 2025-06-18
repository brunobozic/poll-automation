/**
 * ML-Powered Behavioral Analysis and Human Simulation System
 * Uses machine learning to generate realistic human behavior patterns
 * and adapt strategies based on detection feedback
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class MLBehavioralAnalyzer {
    constructor(options = {}) {
        this.options = {
            learningRate: options.learningRate || 0.01,
            adaptationThreshold: options.adaptationThreshold || 0.7,
            maxSessionMemory: options.maxSessionMemory || 10000,
            behaviorVariation: options.behaviorVariation || 0.3,
            ...options
        };
        
        // Behavioral models
        this.models = {
            keystroke: new KeystrokePatternModel(),
            mouse: new MousePatternModel(),
            attention: new AttentionPatternModel(),
            fatigue: new FatigueModel(),
            typing: new TypingStyleModel()
        };
        
        // Learning data storage
        this.sessionHistory = [];
        this.behaviorProfiles = new Map();
        this.adaptationRules = new Map();
        
        // Performance tracking
        this.performanceMetrics = {
            detectionEvents: 0,
            successfulSessions: 0,
            totalSessions: 0,
            averageDetectionScore: 0,
            adaptationCount: 0
        };
        
        // Behavior generation parameters
        this.behaviorParams = {
            typing: {
                baseWPM: 45,
                wpmVariance: 15,
                errorRate: 0.02,
                pauseFrequency: 0.1,
                correctionDelay: 200
            },
            mouse: {
                baseVelocity: 800,
                velocityVariance: 300,
                curvature: 0.3,
                jitterAmount: 2,
                pauseProbability: 0.05
            },
            attention: {
                readingSpeed: 250, // words per minute
                thinkingTime: 3000, // base thinking time in ms
                distractionProbability: 0.02,
                focusSpan: 300000 // 5 minutes
            },
            fatigue: {
                sessionDuration: 0,
                fatigueRate: 0.1,
                errorIncrease: 0.001,
                slowdownFactor: 0.02
            }
        };
    }

    async initialize() {
        console.log('🧠 Initializing ML Behavioral Analyzer...');
        
        try {
            // Initialize ML models
            await this.initializeModels();
            
            // Load historical data
            await this.loadHistoricalData();
            
            // Initialize behavior profiles
            await this.initializeBehaviorProfiles();
            
            console.log('✅ ML Behavioral Analyzer initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ML Behavioral Analyzer:', error);
            throw error;
        }
    }

    async initializeModels() {
        // Initialize each behavioral model
        for (const [name, model] of Object.entries(this.models)) {
            await model.initialize();
            console.log(`  📊 Initialized ${name} model`);
        }
    }

    async loadHistoricalData() {
        try {
            const dataPath = path.join(__dirname, '../../data/behavioral-data.json');
            const data = await fs.readFile(dataPath, 'utf8');
            const historicalData = JSON.parse(data);
            
            this.sessionHistory = historicalData.sessions || [];
            this.performanceMetrics = { ...this.performanceMetrics, ...historicalData.metrics };
            
            console.log(`  📚 Loaded ${this.sessionHistory.length} historical sessions`);
            
        } catch (error) {
            console.log('  📝 No historical data found, starting fresh');
            this.sessionHistory = [];
        }
    }

    async initializeBehaviorProfiles() {
        // Create diverse behavior profiles for different user types
        const profiles = [
            'tech_savvy_fast',
            'average_user',
            'careful_slow',
            'mobile_user',
            'elderly_user',
            'gaming_expert',
            'office_worker'
        ];
        
        for (const profileName of profiles) {
            this.behaviorProfiles.set(profileName, await this.generateBehaviorProfile(profileName));
        }
        
        console.log(`  👥 Generated ${profiles.length} behavior profiles`);
    }

    async generateBehaviorProfile(profileType) {
        const baseProfile = {
            typing: { ...this.behaviorParams.typing },
            mouse: { ...this.behaviorParams.mouse },
            attention: { ...this.behaviorParams.attention },
            fatigue: { ...this.behaviorParams.fatigue }
        };
        
        // Customize based on profile type
        switch (profileType) {
            case 'tech_savvy_fast':
                baseProfile.typing.baseWPM = 65;
                baseProfile.typing.errorRate = 0.01;
                baseProfile.mouse.baseVelocity = 1200;
                baseProfile.attention.readingSpeed = 350;
                break;
                
            case 'average_user':
                // Use default values
                break;
                
            case 'careful_slow':
                baseProfile.typing.baseWPM = 30;
                baseProfile.typing.errorRate = 0.005;
                baseProfile.mouse.baseVelocity = 500;
                baseProfile.attention.thinkingTime = 5000;
                break;
                
            case 'mobile_user':
                baseProfile.typing.baseWPM = 35;
                baseProfile.typing.errorRate = 0.03;
                baseProfile.mouse.baseVelocity = 600;
                baseProfile.mouse.jitterAmount = 5;
                break;
                
            case 'elderly_user':
                baseProfile.typing.baseWPM = 25;
                baseProfile.typing.errorRate = 0.04;
                baseProfile.mouse.baseVelocity = 400;
                baseProfile.attention.thinkingTime = 8000;
                baseProfile.fatigue.fatigueRate = 0.2;
                break;
                
            case 'gaming_expert':
                baseProfile.typing.baseWPM = 80;
                baseProfile.typing.errorRate = 0.008;
                baseProfile.mouse.baseVelocity = 1500;
                baseProfile.mouse.curvature = 0.1;
                break;
                
            case 'office_worker':
                baseProfile.typing.baseWPM = 55;
                baseProfile.typing.errorRate = 0.015;
                baseProfile.mouse.baseVelocity = 900;
                baseProfile.attention.readingSpeed = 280;
                break;
        }
        
        return {
            ...baseProfile,
            profileType,
            createdAt: Date.now(),
            adaptationHistory: []
        };
    }

    async generateHumanBehavior(context) {
        const { siteComplexity, sessionDuration, userProfile, timeOfDay } = context;
        
        // Select appropriate behavior profile
        const profile = await this.selectBehaviorProfile(context);
        
        // Apply ML-based adaptations
        const adaptedProfile = await this.adaptProfileWithML(profile, context);
        
        // Generate specific behavior patterns
        const behavior = {
            typing: await this.generateTypingBehavior(adaptedProfile, context),
            mouse: await this.generateMouseBehavior(adaptedProfile, context),
            attention: await this.generateAttentionBehavior(adaptedProfile, context),
            timing: await this.generateTimingBehavior(adaptedProfile, context)
        };
        
        console.log(`🎭 Generated behavior for ${profile.profileType} profile`);
        
        return behavior;
    }

    async selectBehaviorProfile(context) {
        // Use ML to select most appropriate profile based on context
        const scores = new Map();
        
        for (const [profileName, profile] of this.behaviorProfiles.entries()) {
            const score = await this.calculateProfileScore(profile, context);
            scores.set(profileName, score);
        }
        
        // Select profile with highest score (with some randomization)
        const sortedProfiles = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1]);
        
        // Apply randomization to top 3 profiles
        const topProfiles = sortedProfiles.slice(0, 3);
        const weights = [0.6, 0.3, 0.1];
        const randomValue = Math.random();
        
        let cumulativeWeight = 0;
        for (let i = 0; i < topProfiles.length; i++) {
            cumulativeWeight += weights[i];
            if (randomValue <= cumulativeWeight) {
                return this.behaviorProfiles.get(topProfiles[i][0]);
            }
        }
        
        return this.behaviorProfiles.get(topProfiles[0][0]);
    }

    async calculateProfileScore(profile, context) {
        let score = 0;
        
        // Time of day factor
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) { // Work hours
            if (profile.profileType === 'office_worker') score += 0.3;
        } else if (hour >= 18 && hour <= 23) { // Evening
            if (profile.profileType === 'tech_savvy_fast' || profile.profileType === 'gaming_expert') score += 0.2;
        }
        
        // Site complexity factor
        if (context.siteComplexity === 'high') {
            if (profile.profileType === 'tech_savvy_fast' || profile.profileType === 'gaming_expert') score += 0.2;
            if (profile.profileType === 'elderly_user') score -= 0.1;
        }
        
        // Session duration factor
        if (context.sessionDuration > 600000) { // 10+ minutes
            if (profile.profileType === 'careful_slow' || profile.profileType === 'office_worker') score += 0.1;
        }
        
        // Add randomization
        score += Math.random() * 0.1;
        
        return score;
    }

    async adaptProfileWithML(profile, context) {
        // Apply ML-based adaptations based on recent session outcomes
        const adaptedProfile = JSON.parse(JSON.stringify(profile));
        
        // Get recent adaptation rules for this profile type
        const adaptationKey = `${profile.profileType}_${context.siteType || 'generic'}`;
        const adaptations = this.adaptationRules.get(adaptationKey) || {};
        
        // Apply learned adaptations
        if (adaptations.typing) {
            adaptedProfile.typing.baseWPM *= (1 + adaptations.typing.speedAdjustment);
            adaptedProfile.typing.errorRate *= (1 + adaptations.typing.errorAdjustment);
        }
        
        if (adaptations.mouse) {
            adaptedProfile.mouse.baseVelocity *= (1 + adaptations.mouse.velocityAdjustment);
            adaptedProfile.mouse.curvature *= (1 + adaptations.mouse.curvatureAdjustment);
        }
        
        if (adaptations.timing) {
            adaptedProfile.attention.thinkingTime *= (1 + adaptations.timing.thinkingAdjustment);
        }
        
        return adaptedProfile;
    }

    async generateTypingBehavior(profile, context) {
        const typing = profile.typing;
        
        // Apply fatigue factor
        const fatigueFactor = this.calculateFatigueFactor(context.sessionDuration);
        const adjustedWPM = typing.baseWPM * (1 - fatigueFactor * typing.fatigueRate);
        
        // Generate keystroke timing patterns
        const keystrokePattern = await this.models.keystroke.generatePattern({
            baseWPM: adjustedWPM,
            variance: typing.wpmVariance,
            errorRate: typing.errorRate * (1 + fatigueFactor),
            sessionDuration: context.sessionDuration
        });
        
        return {
            wpm: adjustedWPM,
            keystrokeTimings: keystrokePattern.timings,
            errorPattern: keystrokePattern.errors,
            pausePattern: keystrokePattern.pauses,
            correctionBehavior: keystrokePattern.corrections
        };
    }

    async generateMouseBehavior(profile, context) {
        const mouse = profile.mouse;
        
        // Apply fatigue and attention factors
        const fatigueFactor = this.calculateFatigueFactor(context.sessionDuration);
        const attentionFactor = this.calculateAttentionFactor(context);
        
        const adjustedVelocity = mouse.baseVelocity * (1 - fatigueFactor * 0.1) * attentionFactor;
        
        // Generate mouse movement patterns
        const mousePattern = await this.models.mouse.generatePattern({
            baseVelocity: adjustedVelocity,
            variance: mouse.velocityVariance,
            curvature: mouse.curvature,
            jitter: mouse.jitterAmount * (1 + fatigueFactor),
            sessionDuration: context.sessionDuration
        });
        
        return {
            velocity: adjustedVelocity,
            movementPattern: mousePattern.movements,
            clickPattern: mousePattern.clicks,
            scrollPattern: mousePattern.scrolling,
            hoverBehavior: mousePattern.hovers
        };
    }

    async generateAttentionBehavior(profile, context) {
        const attention = profile.attention;
        
        // Calculate attention state
        const attentionState = await this.models.attention.calculateState({
            sessionDuration: context.sessionDuration,
            complexity: context.siteComplexity,
            timeOfDay: new Date().getHours()
        });
        
        const thinkingTime = attention.thinkingTime * attentionState.focusMultiplier;
        
        return {
            readingSpeed: attention.readingSpeed * attentionState.processingSpeed,
            thinkingTime: thinkingTime,
            distractionEvents: attentionState.distractions,
            focusLevel: attentionState.focusLevel,
            pageTransitionDelay: thinkingTime * 0.3
        };
    }

    async generateTimingBehavior(profile, context) {
        // Generate realistic timing patterns for various actions
        const baseTiming = {
            questionReadTime: 2000,
            optionConsiderationTime: 500,
            decisionTime: 1500,
            formSubmissionDelay: 800
        };
        
        // Apply profile-specific adjustments
        const profileMultiplier = this.getProfileTimingMultiplier(profile.profileType);
        const fatigueFactor = this.calculateFatigueFactor(context.sessionDuration);
        
        return {
            questionReadTime: baseTiming.questionReadTime * profileMultiplier * (1 + fatigueFactor * 0.5),
            optionConsiderationTime: baseTiming.optionConsiderationTime * profileMultiplier,
            decisionTime: baseTiming.decisionTime * profileMultiplier * (1 + fatigueFactor * 0.3),
            formSubmissionDelay: baseTiming.formSubmissionDelay * profileMultiplier,
            pageLoadWaitTime: 1000 + Math.random() * 2000
        };
    }

    calculateFatigueFactor(sessionDuration) {
        // Calculate fatigue based on session duration (0 to 1)
        const fatigueThreshold = 600000; // 10 minutes
        return Math.min(sessionDuration / fatigueThreshold, 1) * this.behaviorParams.fatigue.fatigueRate;
    }

    calculateAttentionFactor(context) {
        const hour = new Date().getHours();
        let attentionFactor = 1.0;
        
        // Time of day effects
        if (hour < 8 || hour > 22) attentionFactor *= 0.8; // Early morning/late night
        if (hour >= 13 && hour <= 15) attentionFactor *= 0.9; // Post-lunch dip
        
        // Session duration effects
        if (context.sessionDuration > 1800000) attentionFactor *= 0.7; // 30+ minutes
        
        return Math.max(attentionFactor, 0.3);
    }

    getProfileTimingMultiplier(profileType) {
        const multipliers = {
            'tech_savvy_fast': 0.7,
            'average_user': 1.0,
            'careful_slow': 1.5,
            'mobile_user': 1.2,
            'elderly_user': 2.0,
            'gaming_expert': 0.6,
            'office_worker': 0.9
        };
        
        return multipliers[profileType] || 1.0;
    }

    async learnFromSession(sessionData, outcome) {
        // Store session data for learning
        const learningData = {
            sessionId: sessionData.sessionId,
            profileUsed: sessionData.profileUsed,
            siteType: sessionData.siteType,
            behavior: sessionData.behaviorGenerated,
            outcome: {
                success: outcome.success,
                detectionScore: outcome.detectionScore,
                detectionReason: outcome.detectionReason,
                blocked: outcome.blocked
            },
            timestamp: Date.now()
        };
        
        this.sessionHistory.push(learningData);
        
        // Update performance metrics
        this.updatePerformanceMetrics(learningData);
        
        // Adapt strategies if needed
        if (this.shouldAdapt(learningData)) {
            await this.adaptStrategies(learningData);
        }
        
        // Limit session history size
        if (this.sessionHistory.length > this.options.maxSessionMemory) {
            this.sessionHistory = this.sessionHistory.slice(-this.options.maxSessionMemory);
        }
        
        // Save learning data
        await this.saveHistoricalData();
    }

    updatePerformanceMetrics(sessionData) {
        this.performanceMetrics.totalSessions++;
        
        if (sessionData.outcome.success) {
            this.performanceMetrics.successfulSessions++;
        }
        
        if (sessionData.outcome.detectionScore > 0.7) {
            this.performanceMetrics.detectionEvents++;
        }
        
        // Update average detection score
        const totalScore = this.performanceMetrics.averageDetectionScore * (this.performanceMetrics.totalSessions - 1);
        this.performanceMetrics.averageDetectionScore = 
            (totalScore + sessionData.outcome.detectionScore) / this.performanceMetrics.totalSessions;
    }

    shouldAdapt(sessionData) {
        // Adapt if detection score is high or success rate is low
        const recentSessions = this.sessionHistory.slice(-10);
        const recentSuccessRate = recentSessions.filter(s => s.outcome.success).length / recentSessions.length;
        
        return sessionData.outcome.detectionScore > this.options.adaptationThreshold || 
               recentSuccessRate < 0.6;
    }

    async adaptStrategies(triggerSession) {
        console.log('🔄 Adapting behavioral strategies based on recent outcomes...');
        
        const adaptationKey = `${triggerSession.profileUsed}_${triggerSession.siteType}`;
        let adaptations = this.adaptationRules.get(adaptationKey) || {
            typing: { speedAdjustment: 0, errorAdjustment: 0 },
            mouse: { velocityAdjustment: 0, curvatureAdjustment: 0 },
            timing: { thinkingAdjustment: 0 }
        };
        
        // Analyze recent failures
        const recentFailures = this.sessionHistory.slice(-20)
            .filter(s => !s.outcome.success && s.profileUsed === triggerSession.profileUsed);
        
        if (recentFailures.length > 0) {
            // Adapt based on failure patterns
            const avgDetectionScore = recentFailures.reduce((sum, s) => sum + s.outcome.detectionScore, 0) / recentFailures.length;
            
            if (avgDetectionScore > 0.8) {
                // High detection score - make behavior more human-like
                adaptations.typing.speedAdjustment -= this.options.learningRate;
                adaptations.typing.errorAdjustment += this.options.learningRate * 2;
                adaptations.mouse.velocityAdjustment -= this.options.learningRate;
                adaptations.mouse.curvatureAdjustment += this.options.learningRate;
                adaptations.timing.thinkingAdjustment += this.options.learningRate * 3;
                
                console.log(`  📉 Reducing automation detection signals for ${adaptationKey}`);
            }
        }
        
        // Store adaptations
        this.adaptationRules.set(adaptationKey, adaptations);
        this.performanceMetrics.adaptationCount++;
        
        console.log(`✅ Strategy adapted for ${adaptationKey}`);
    }

    async saveHistoricalData() {
        try {
            const dataPath = path.join(__dirname, '../../data');
            await fs.mkdir(dataPath, { recursive: true });
            
            const data = {
                sessions: this.sessionHistory,
                metrics: this.performanceMetrics,
                adaptations: Object.fromEntries(this.adaptationRules),
                lastUpdated: Date.now()
            };
            
            await fs.writeFile(
                path.join(dataPath, 'behavioral-data.json'),
                JSON.stringify(data, null, 2)
            );
            
        } catch (error) {
            console.error('Failed to save behavioral data:', error);
        }
    }

    getPerformanceReport() {
        const successRate = this.performanceMetrics.totalSessions > 0 ? 
            (this.performanceMetrics.successfulSessions / this.performanceMetrics.totalSessions) * 100 : 0;
        
        const detectionRate = this.performanceMetrics.totalSessions > 0 ?
            (this.performanceMetrics.detectionEvents / this.performanceMetrics.totalSessions) * 100 : 0;
        
        return {
            totalSessions: this.performanceMetrics.totalSessions,
            successRate: successRate.toFixed(1) + '%',
            detectionRate: detectionRate.toFixed(1) + '%',
            averageDetectionScore: this.performanceMetrics.averageDetectionScore.toFixed(3),
            adaptationCount: this.performanceMetrics.adaptationCount,
            profilesAvailable: this.behaviorProfiles.size,
            adaptationRules: this.adaptationRules.size
        };
    }
}

// Individual behavior model classes
class KeystrokePatternModel {
    async initialize() {
        this.dwellTimeDistribution = { mean: 75, stdDev: 25 };
        this.flightTimeDistribution = { mean: 120, stdDev: 40 };
    }
    
    async generatePattern(params) {
        const { baseWPM, variance, errorRate, sessionDuration } = params;
        
        // Generate realistic keystroke timing patterns
        const avgInterKeyInterval = 60000 / (baseWPM * 5); // Convert WPM to ms per character
        
        return {
            timings: this.generateKeystrokeTimings(avgInterKeyInterval, variance),
            errors: this.generateErrorPattern(errorRate),
            pauses: this.generatePausePattern(sessionDuration),
            corrections: this.generateCorrectionPattern(errorRate)
        };
    }
    
    generateKeystrokeTimings(avgInterval, variance) {
        // Generate realistic keystroke timing distribution
        const timings = [];
        for (let i = 0; i < 100; i++) {
            const randomVariation = (Math.random() - 0.5) * variance * 2;
            timings.push(Math.max(10, avgInterval + randomVariation));
        }
        return timings;
    }
    
    generateErrorPattern(errorRate) {
        return {
            frequency: errorRate,
            types: ['substitution', 'omission', 'insertion'],
            correctionDelay: 150 + Math.random() * 100
        };
    }
    
    generatePausePattern(sessionDuration) {
        const pauseFrequency = Math.min(0.1, sessionDuration / 3600000); // More pauses in longer sessions
        return {
            frequency: pauseFrequency,
            duration: 500 + Math.random() * 2000
        };
    }
    
    generateCorrectionPattern(errorRate) {
        return {
            detectionDelay: 100 + Math.random() * 200,
            correctionMethod: ['backspace', 'select_delete', 'overwrite'][Math.floor(Math.random() * 3)],
            retryAttempts: Math.random() < errorRate ? 2 : 1
        };
    }
}

class MousePatternModel {
    async initialize() {
        this.velocityDistribution = { mean: 800, stdDev: 200 };
        this.accelerationDistribution = { mean: 1200, stdDev: 400 };
    }
    
    async generatePattern(params) {
        const { baseVelocity, variance, curvature, jitter, sessionDuration } = params;
        
        return {
            movements: this.generateMovementPattern(baseVelocity, variance, curvature, jitter),
            clicks: this.generateClickPattern(),
            scrolling: this.generateScrollPattern(sessionDuration),
            hovers: this.generateHoverPattern()
        };
    }
    
    generateMovementPattern(velocity, variance, curvature, jitter) {
        return {
            velocity: velocity,
            variance: variance,
            curvature: curvature,
            jitter: jitter,
            pauseProbability: 0.05,
            overshootProbability: 0.03
        };
    }
    
    generateClickPattern() {
        return {
            dwellTime: 75 + Math.random() * 50,
            doubleClickThreshold: 250,
            dragThreshold: 5
        };
    }
    
    generateScrollPattern(sessionDuration) {
        const scrollFrequency = Math.min(0.2, sessionDuration / 1800000); // More scrolling in longer sessions
        return {
            frequency: scrollFrequency,
            speed: 100 + Math.random() * 200,
            smoothness: 0.8 + Math.random() * 0.2
        };
    }
    
    generateHoverPattern() {
        return {
            frequency: 0.1,
            duration: 200 + Math.random() * 800,
            elements: ['buttons', 'links', 'form_fields']
        };
    }
}

class AttentionPatternModel {
    async initialize() {
        this.focusDecayRate = 0.1;
        this.distractionThreshold = 0.3;
    }
    
    async calculateState(params) {
        const { sessionDuration, complexity, timeOfDay } = params;
        
        // Calculate attention state based on multiple factors
        let focusLevel = 1.0;
        
        // Time-based attention decay
        focusLevel *= Math.exp(-this.focusDecayRate * (sessionDuration / 600000)); // Decay over 10 minutes
        
        // Time of day effects
        if (timeOfDay < 8 || timeOfDay > 22) focusLevel *= 0.8;
        if (timeOfDay >= 13 && timeOfDay <= 15) focusLevel *= 0.9; // Post-lunch dip
        
        // Complexity effects
        if (complexity === 'high') focusLevel *= 0.85;
        
        return {
            focusLevel: Math.max(focusLevel, 0.3),
            focusMultiplier: focusLevel,
            processingSpeed: focusLevel,
            distractions: this.generateDistractions(1 - focusLevel)
        };
    }
    
    generateDistractions(distractionLevel) {
        const distractionCount = Math.floor(distractionLevel * 5);
        const distractions = [];
        
        for (let i = 0; i < distractionCount; i++) {
            distractions.push({
                type: ['pause', 'tab_switch', 'scroll'][Math.floor(Math.random() * 3)],
                duration: 1000 + Math.random() * 3000,
                probability: distractionLevel
            });
        }
        
        return distractions;
    }
}

class FatigueModel {
    async initialize() {
        this.fatigueAccumulation = 0;
        this.recoveryRate = 0.05;
    }
    
    calculateFatigue(sessionDuration, activityLevel) {
        // Simple fatigue model based on time and activity
        const timeFatigue = sessionDuration / 3600000; // Fatigue per hour
        const activityFatigue = activityLevel * 0.1;
        
        return Math.min(timeFatigue + activityFatigue, 1.0);
    }
}

class TypingStyleModel {
    async initialize() {
        this.styles = {
            hunt_and_peck: { accuracy: 0.85, rhythm: 0.3, burst: false },
            touch_typing: { accuracy: 0.95, rhythm: 0.8, burst: true },
            hybrid: { accuracy: 0.90, rhythm: 0.6, burst: false }
        };
    }
    
    getStyle(profileType) {
        const styleMap = {
            'tech_savvy_fast': 'touch_typing',
            'gaming_expert': 'touch_typing',
            'office_worker': 'hybrid',
            'elderly_user': 'hunt_and_peck',
            'mobile_user': 'hunt_and_peck',
            'average_user': 'hybrid',
            'careful_slow': 'hybrid'
        };
        
        return this.styles[styleMap[profileType] || 'hybrid'];
    }
}

module.exports = MLBehavioralAnalyzer;