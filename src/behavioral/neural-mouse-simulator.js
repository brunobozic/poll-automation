/**
 * Sophisticated Neural Mouse Movement Generator
 * 
 * This module implements a machine learning-based mouse movement simulator
 * that generates human-like cursor movements with personality profiles,
 * fatigue simulation, and adaptive learning capabilities.
 */

class NeuralMouseSimulator {
    constructor(options = {}) {
        this.sessionId = Date.now();
        this.startTime = Date.now();
        
        // Core configuration
        this.config = {
            baseSpeed: options.baseSpeed || 200, // pixels per second
            samplingRate: options.samplingRate || 60, // Hz
            noiseIntensity: options.noiseIntensity || 0.1,
            fatigueFactor: options.fatigueFactor || 1.0,
            learningRate: options.learningRate || 0.01,
            adaptationThreshold: options.adaptationThreshold || 10,
            ...options
        };

        // Initialize components
        this.personalityEngine = new PersonalityEngine();
        this.fatigueSimulator = new FatigueSimulator();
        this.pathGenerator = new NaturalPathGenerator();
        this.distractionEngine = new DistractionEngine();
        this.contextAnalyzer = new ContextAnalyzer();
        this.sessionLearner = new SessionLearner();
        
        // Movement history and state
        this.movementHistory = [];
        this.currentPersonality = this.personalityEngine.getRandomPersonality();
        this.sessionData = {
            totalMovements: 0,
            totalDistance: 0,
            averageSpeed: 0,
            errorRate: 0,
            adaptationScore: 0
        };
        
        // Neural network for movement prediction
        this.neuralNetwork = new SimpleNeuralNetwork();
        
        this.initialized = false;
        this.init();
    }

    async init() {
        console.log('Initializing Neural Mouse Simulator...');
        console.log(`Session ID: ${this.sessionId}`);
        console.log(`Personality: ${this.currentPersonality.type}`);
        
        // Load any existing session data
        await this.sessionLearner.loadSession(this.sessionId);
        
        this.initialized = true;
    }

    // Add initialize method as alias for compatibility
    async initialize() {
        return await this.init();
    }

    /**
     * Generate human-like mouse movement from current position to target
     */
    async generateMovement(fromX, fromY, toX, toY, context = {}) {
        if (!this.initialized) {
            await this.init();
        }

        const movement = await this._generateComplexMovement(fromX, fromY, toX, toY, context);
        
        // Learn from this movement
        this.sessionLearner.recordMovement(movement);
        this._updateSessionData(movement);
        
        return movement;
    }

    async _generateComplexMovement(fromX, fromY, toX, toY, context) {
        const startTime = Date.now();
        
        // Analyze context for movement adaptation
        const contextProfile = this.contextAnalyzer.analyze(context);
        
        // Get current fatigue state
        const fatigueState = this.fatigueSimulator.getCurrentState();
        
        // Generate base path with personality influence
        const basePath = this.pathGenerator.generatePath(
            fromX, fromY, toX, toY, 
            this.currentPersonality, 
            contextProfile
        );
        
        // Apply neural network predictions
        const neuralAdjustments = this.neuralNetwork.predict(basePath, contextProfile);
        
        // Add personality-based modifications
        const personalityPath = this._applyPersonalityModifications(basePath, neuralAdjustments);
        
        // Apply fatigue effects
        const fatiguePath = this._applyFatigueEffects(personalityPath, fatigueState);
        
        // Add distractions and hesitations
        const finalPath = await this._applyDistractions(fatiguePath, contextProfile);
        
        // Calculate timing for each point
        const timedPath = this._calculateTiming(finalPath);
        
        const movement = {
            id: `move_${Date.now()}`,
            from: { x: fromX, y: fromY },
            to: { x: toX, y: toY },
            path: timedPath,
            personality: this.currentPersonality.type,
            context: contextProfile,
            fatigue: fatigueState,
            duration: Date.now() - startTime,
            metadata: {
                totalPoints: timedPath.length,
                totalDistance: this._calculateDistance(timedPath),
                averageSpeed: this._calculateAverageSpeed(timedPath),
                smoothness: this._calculateSmoothness(timedPath)
            }
        };

        return movement;
    }

    _applyPersonalityModifications(path, neuralAdjustments) {
        const personality = this.currentPersonality;
        const modifiedPath = [...path];

        for (let i = 0; i < modifiedPath.length; i++) {
            const point = modifiedPath[i];
            const neuralAdj = neuralAdjustments[i] || { x: 0, y: 0 };
            
            // Apply personality-specific modifications
            const personalityNoise = this._getPersonalityNoise(personality, i / modifiedPath.length);
            const tremor = this._getTremor(personality);
            
            point.x += neuralAdj.x + personalityNoise.x + tremor.x;
            point.y += neuralAdj.y + personalityNoise.y + tremor.y;
            
            // Personality-specific speed adjustments
            point.speed *= personality.speedMultiplier;
            point.confidence = personality.confidence;
        }

        return modifiedPath;
    }

    _applyFatigueEffects(path, fatigueState) {
        const modifiedPath = [...path];
        const fatigueFactor = fatigueState.level;
        
        for (let i = 0; i < modifiedPath.length; i++) {
            const point = modifiedPath[i];
            
            // Fatigue affects precision and speed
            const precisionLoss = fatigueFactor * 0.3;
            const speedReduction = fatigueFactor * 0.2;
            
            // Add fatigue-induced shake
            const shake = this._getFatigueShake(fatigueFactor);
            point.x += shake.x;
            point.y += shake.y;
            
            // Reduce speed
            point.speed *= (1 - speedReduction);
            
            // Add occasional micro-corrections due to fatigue
            if (Math.random() < fatigueFactor * 0.1) {
                point.microCorrection = true;
                point.pauseDuration = Math.random() * 50 + 20; // 20-70ms pause
            }
        }

        return modifiedPath;
    }

    async _applyDistractions(path, contextProfile) {
        const modifiedPath = [...path];
        const distractions = this.distractionEngine.generateDistractions(path, contextProfile);
        
        for (const distraction of distractions) {
            const insertIndex = Math.floor(distraction.position * modifiedPath.length);
            
            switch (distraction.type) {
                case 'hesitation':
                    modifiedPath[insertIndex].pauseDuration = distraction.duration;
                    break;
                    
                case 'overshoot':
                    const overshootPoints = this._generateOvershoot(
                        modifiedPath[insertIndex], 
                        distraction.intensity
                    );
                    modifiedPath.splice(insertIndex, 1, ...overshootPoints);
                    break;
                    
                case 'drift':
                    const driftPoints = this._generateDrift(
                        modifiedPath.slice(insertIndex, insertIndex + 5),
                        distraction.direction
                    );
                    modifiedPath.splice(insertIndex, 5, ...driftPoints);
                    break;
                    
                case 'micro_movement':
                    const microPoints = this._generateMicroMovement(
                        modifiedPath[insertIndex],
                        distraction.intensity
                    );
                    modifiedPath.splice(insertIndex, 1, ...microPoints);
                    break;
            }
        }

        return modifiedPath;
    }

    _calculateTiming(path) {
        const timedPath = [];
        let cumulativeTime = 0;
        
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const prevPoint = i > 0 ? path[i - 1] : point;
            
            // Calculate distance from previous point
            const distance = Math.sqrt(
                Math.pow(point.x - prevPoint.x, 2) + 
                Math.pow(point.y - prevPoint.y, 2)
            );
            
            // Calculate time based on speed and distance
            const baseTime = distance / (point.speed || this.config.baseSpeed);
            const jitter = (Math.random() - 0.5) * 0.02; // ±1% jitter
            const adjustedTime = baseTime * (1 + jitter);
            
            cumulativeTime += adjustedTime * 1000; // Convert to milliseconds
            
            // Add pause duration if specified
            if (point.pauseDuration) {
                cumulativeTime += point.pauseDuration;
            }
            
            timedPath.push({
                x: Math.round(point.x),
                y: Math.round(point.y),
                timestamp: cumulativeTime,
                speed: point.speed,
                confidence: point.confidence,
                microCorrection: point.microCorrection,
                metadata: point.metadata
            });
        }
        
        return timedPath;
    }

    // Personality-specific noise generation
    _getPersonalityNoise(personality, progress) {
        const noiseIntensity = personality.precision * this.config.noiseIntensity;
        
        return {
            x: (Math.random() - 0.5) * noiseIntensity * personality.shakiness,
            y: (Math.random() - 0.5) * noiseIntensity * personality.shakiness
        };
    }

    _getTremor(personality) {
        if (personality.type === 'elderly') {
            const tremorIntensity = 0.5 + Math.random() * 0.5;
            return {
                x: Math.sin(Date.now() * 0.01) * tremorIntensity,
                y: Math.cos(Date.now() * 0.007) * tremorIntensity
            };
        }
        return { x: 0, y: 0 };
    }

    _getFatigueShake(fatigueFactor) {
        const shakeIntensity = fatigueFactor * 2;
        return {
            x: (Math.random() - 0.5) * shakeIntensity,
            y: (Math.random() - 0.5) * shakeIntensity
        };
    }

    _generateOvershoot(point, intensity) {
        const overshootDistance = intensity * 10;
        const angle = Math.random() * Math.PI * 2;
        
        const overshootPoint = {
            x: point.x + Math.cos(angle) * overshootDistance,
            y: point.y + Math.sin(angle) * overshootDistance,
            speed: point.speed * 0.8
        };
        
        const correctionPoint = {
            x: point.x,
            y: point.y,
            speed: point.speed * 0.6,
            microCorrection: true
        };
        
        return [overshootPoint, correctionPoint];
    }

    _generateDrift(points, direction) {
        const driftVector = {
            x: Math.cos(direction) * 2,
            y: Math.sin(direction) * 2
        };
        
        return points.map((point, index) => ({
            ...point,
            x: point.x + driftVector.x * (index / points.length),
            y: point.y + driftVector.y * (index / points.length)
        }));
    }

    _generateMicroMovement(point, intensity) {
        const microPoints = [];
        const steps = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const radius = intensity * 0.5;
            
            microPoints.push({
                x: point.x + Math.cos(angle) * radius,
                y: point.y + Math.sin(angle) * radius,
                speed: point.speed * 0.3
            });
        }
        
        return microPoints;
    }

    _calculateDistance(path) {
        let totalDistance = 0;
        for (let i = 1; i < path.length; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            totalDistance += Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + 
                Math.pow(curr.y - prev.y, 2)
            );
        }
        return totalDistance;
    }

    _calculateAverageSpeed(path) {
        if (path.length < 2) return 0;
        const totalTime = path[path.length - 1].timestamp - path[0].timestamp;
        const totalDistance = this._calculateDistance(path);
        return totalDistance / (totalTime / 1000); // pixels per second
    }

    _calculateSmoothness(path) {
        if (path.length < 3) return 1;
        
        let totalCurvature = 0;
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const next = path[i + 1];
            
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            const curvature = Math.abs(angle2 - angle1);
            
            totalCurvature += curvature;
        }
        
        return 1 / (1 + totalCurvature / path.length);
    }

    _updateSessionData(movement) {
        this.sessionData.totalMovements++;
        this.sessionData.totalDistance += movement.metadata.totalDistance;
        this.sessionData.averageSpeed = 
            (this.sessionData.averageSpeed * (this.sessionData.totalMovements - 1) + 
             movement.metadata.averageSpeed) / this.sessionData.totalMovements;
        
        // Update fatigue simulator
        this.fatigueSimulator.recordMovement(movement);
        
        // Record in movement history
        this.movementHistory.push(movement);
        
        // Maintain history size
        if (this.movementHistory.length > 1000) {
            this.movementHistory = this.movementHistory.slice(-500);
        }
    }

    // Public API methods
    setPersonality(personalityType) {
        this.currentPersonality = this.personalityEngine.getPersonality(personalityType);
        console.log(`Switched to personality: ${personalityType}`);
    }

    getSessionStats() {
        return {
            ...this.sessionData,
            sessionDuration: Date.now() - this.startTime,
            currentPersonality: this.currentPersonality.type,
            fatigueLevel: this.fatigueSimulator.getCurrentState().level,
            movementHistory: this.movementHistory.length
        };
    }

    async adaptToSite(siteContext) {
        return await this.sessionLearner.adaptToSite(siteContext);
    }

    reset() {
        this.movementHistory = [];
        this.sessionData = {
            totalMovements: 0,
            totalDistance: 0,
            averageSpeed: 0,
            errorRate: 0,
            adaptationScore: 0
        };
        this.fatigueSimulator.reset();
        this.startTime = Date.now();
    }
}

/**
 * Personality Engine - Manages different user personality profiles
 */
class PersonalityEngine {
    constructor() {
        this.personalities = {
            cautious: {
                type: 'cautious',
                speedMultiplier: 0.7,
                precision: 0.9,
                confidence: 0.6,
                shakiness: 0.3,
                hesitationRate: 0.8,
                description: 'Careful, deliberate movements with frequent pauses'
            },
            confident: {
                type: 'confident',
                speedMultiplier: 1.3,
                precision: 0.8,
                confidence: 0.9,
                shakiness: 0.1,
                hesitationRate: 0.2,
                description: 'Fast, direct movements with minimal hesitation'
            },
            elderly: {
                type: 'elderly',
                speedMultiplier: 0.5,
                precision: 0.6,
                confidence: 0.5,
                shakiness: 0.8,
                hesitationRate: 0.9,
                description: 'Slow movements with tremor and frequent corrections'
            },
            young: {
                type: 'young',
                speedMultiplier: 1.5,
                precision: 0.7,
                confidence: 0.8,
                shakiness: 0.4,
                hesitationRate: 0.3,
                description: 'Quick, slightly imprecise movements with occasional overshoots'
            },
            professional: {
                type: 'professional',
                speedMultiplier: 1.0,
                precision: 0.95,
                confidence: 0.85,
                shakiness: 0.1,
                hesitationRate: 0.3,
                description: 'Efficient, accurate movements with practiced precision'
            }
        };
    }

    getPersonality(type) {
        return this.personalities[type] || this.personalities.professional;
    }

    getRandomPersonality() {
        const types = Object.keys(this.personalities);
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.personalities[randomType];
    }

    getAllPersonalities() {
        return { ...this.personalities };
    }
}

/**
 * Fatigue Simulator - Models user fatigue over time
 */
class FatigueSimulator {
    constructor() {
        this.fatigueLevel = 0;
        this.maxFatigue = 1.0;
        this.fatigueRate = 0.001; // Fatigue increase per movement
        this.recoveryRate = 0.0001; // Natural recovery rate
        this.lastActivity = Date.now();
        this.sessionStartTime = Date.now();
    }

    getCurrentState() {
        this._updateFatigue();
        
        return {
            level: this.fatigueLevel,
            percentage: (this.fatigueLevel / this.maxFatigue) * 100,
            category: this._getFatigueCategory(),
            effects: this._getFatigueEffects()
        };
    }

    recordMovement(movement) {
        // Increase fatigue based on movement complexity
        const complexityFactor = movement.metadata.totalPoints / 100;
        const distanceFactor = movement.metadata.totalDistance / 1000;
        
        this.fatigueLevel += this.fatigueRate * (1 + complexityFactor + distanceFactor);
        this.fatigueLevel = Math.min(this.fatigueLevel, this.maxFatigue);
        
        this.lastActivity = Date.now();
    }

    _updateFatigue() {
        const now = Date.now();
        const timeSinceActivity = now - this.lastActivity;
        
        // Natural recovery during inactivity
        if (timeSinceActivity > 5000) { // 5 seconds of inactivity
            const recoveryAmount = (timeSinceActivity / 1000) * this.recoveryRate;
            this.fatigueLevel = Math.max(0, this.fatigueLevel - recoveryAmount);
        }
        
        // Circadian rhythm effects
        const sessionHours = (now - this.sessionStartTime) / (1000 * 60 * 60);
        const circadianFactor = Math.sin(sessionHours * Math.PI / 12) * 0.1;
        this.fatigueLevel += circadianFactor;
        this.fatigueLevel = Math.max(0, Math.min(this.maxFatigue, this.fatigueLevel));
    }

    _getFatigueCategory() {
        if (this.fatigueLevel < 0.2) return 'fresh';
        if (this.fatigueLevel < 0.4) return 'slight';
        if (this.fatigueLevel < 0.6) return 'moderate';
        if (this.fatigueLevel < 0.8) return 'tired';
        return 'exhausted';
    }

    _getFatigueEffects() {
        return {
            precisionLoss: this.fatigueLevel * 0.3,
            speedReduction: this.fatigueLevel * 0.2,
            shakiness: this.fatigueLevel * 0.5,
            hesitationIncrease: this.fatigueLevel * 0.4
        };
    }

    reset() {
        this.fatigueLevel = 0;
        this.lastActivity = Date.now();
        this.sessionStartTime = Date.now();
    }
}

/**
 * Natural Path Generator - Creates realistic curved paths
 */
class NaturalPathGenerator {
    constructor() {
        this.pathCache = new Map();
    }

    generatePath(fromX, fromY, toX, toY, personality, context) {
        const cacheKey = `${fromX},${fromY},${toX},${toY},${personality.type}`;
        
        if (this.pathCache.has(cacheKey)) {
            return this._variateCache(this.pathCache.get(cacheKey));
        }

        const path = this._generateBasePath(fromX, fromY, toX, toY, personality, context);
        this.pathCache.set(cacheKey, path);
        
        // Limit cache size
        if (this.pathCache.size > 100) {
            const firstKey = this.pathCache.keys().next().value;
            this.pathCache.delete(firstKey);
        }
        
        return path;
    }

    _generateBasePath(fromX, fromY, toX, toY, personality, context) {
        const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const points = Math.max(10, Math.floor(distance / 5));
        const path = [];

        // Generate control points for Bezier curve
        const controlPoints = this._generateControlPoints(fromX, fromY, toX, toY, personality);
        
        for (let i = 0; i <= points; i++) {
            const t = i / points;
            const point = this._bezierPoint(t, controlPoints);
            
            // Add natural variations
            const noise = this._getNaturalNoise(t, personality);
            point.x += noise.x;
            point.y += noise.y;
            
            // Calculate speed based on position in path
            point.speed = this._calculatePointSpeed(t, personality, context);
            
            path.push(point);
        }

        return path;
    }

    _generateControlPoints(fromX, fromY, toX, toY, personality) {
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        
        // Control point offset based on personality
        const offsetMagnitude = distance * 0.1 * (1 - personality.confidence);
        const offsetAngle = Math.atan2(toY - fromY, toX - fromX) + Math.PI / 2;
        
        const cp1X = fromX + Math.cos(offsetAngle) * offsetMagnitude * 0.5;
        const cp1Y = fromY + Math.sin(offsetAngle) * offsetMagnitude * 0.5;
        
        const cp2X = toX - Math.cos(offsetAngle) * offsetMagnitude * 0.5;
        const cp2Y = toY - Math.sin(offsetAngle) * offsetMagnitude * 0.5;
        
        return [
            { x: fromX, y: fromY },
            { x: cp1X, y: cp1Y },
            { x: cp2X, y: cp2Y },
            { x: toX, y: toY }
        ];
    }

    _bezierPoint(t, controlPoints) {
        const [p0, p1, p2, p3] = controlPoints;
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        
        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
        };
    }

    _getNaturalNoise(t, personality) {
        const noiseIntensity = 2 * personality.shakiness;
        const frequency = 5 + Math.random() * 5;
        
        return {
            x: Math.sin(t * frequency) * noiseIntensity * Math.random(),
            y: Math.cos(t * frequency) * noiseIntensity * Math.random()
        };
    }

    _calculatePointSpeed(t, personality, context) {
        // Speed curve: slow start, fast middle, slow end
        let speedCurve = 4 * t * (1 - t); // Parabolic curve
        
        // Apply personality modifier
        speedCurve *= personality.speedMultiplier;
        
        // Context-based adjustments
        if (context.elementType === 'button') {
            speedCurve *= 0.8; // Slower approach to buttons
        } else if (context.elementType === 'link') {
            speedCurve *= 1.1; // Slightly faster for links
        }
        
        return Math.max(0.1, speedCurve);
    }

    _variateCache(cachedPath) {
        return cachedPath.map(point => ({
            ...point,
            x: point.x + (Math.random() - 0.5) * 2,
            y: point.y + (Math.random() - 0.5) * 2
        }));
    }
}

/**
 * Distraction Engine - Adds realistic human imperfections
 */
class DistractionEngine {
    constructor() {
        this.distractionTypes = [
            'hesitation',
            'overshoot',
            'drift',
            'micro_movement'
        ];
    }

    generateDistractions(path, context) {
        const distractions = [];
        const pathLength = path.length;
        
        // Base distraction probability
        let distractionProb = 0.1;
        
        // Adjust based on context
        if (context.elementType === 'button') {
            distractionProb += 0.05; // More likely to hesitate before buttons
        }
        if (context.isImportant) {
            distractionProb += 0.03; // More careful with important elements
        }
        
        // Generate distractions
        for (let i = 0; i < pathLength; i++) {
            if (Math.random() < distractionProb) {
                const distractionType = this._selectDistractionType(i / pathLength, context);
                
                distractions.push({
                    type: distractionType,
                    position: i / pathLength,
                    intensity: Math.random() * 0.5 + 0.5,
                    duration: this._getDistractionDuration(distractionType),
                    direction: Math.random() * Math.PI * 2
                });
            }
        }
        
        return distractions;
    }

    _selectDistractionType(progress, context) {
        // Different distractions are more likely at different points
        if (progress < 0.2) {
            return Math.random() < 0.6 ? 'hesitation' : 'drift';
        } else if (progress > 0.8) {
            return Math.random() < 0.7 ? 'overshoot' : 'micro_movement';
        } else {
            return this.distractionTypes[Math.floor(Math.random() * this.distractionTypes.length)];
        }
    }

    _getDistractionDuration(type) {
        switch (type) {
            case 'hesitation':
                return Math.random() * 200 + 50; // 50-250ms
            case 'overshoot':
                return Math.random() * 100 + 30; // 30-130ms
            case 'drift':
                return Math.random() * 150 + 20; // 20-170ms
            case 'micro_movement':
                return Math.random() * 80 + 10; // 10-90ms
            default:
                return 50;
        }
    }
}

/**
 * Context Analyzer - Analyzes UI context for movement adaptation
 */
class ContextAnalyzer {
    constructor() {
        this.elementProfiles = {
            button: { precision: 0.9, approach: 'careful' },
            link: { precision: 0.7, approach: 'normal' },
            input: { precision: 0.95, approach: 'precise' },
            slider: { precision: 0.8, approach: 'smooth' },
            menu: { precision: 0.85, approach: 'deliberate' }
        };
    }

    analyze(context) {
        const profile = {
            elementType: context.elementType || 'unknown',
            elementSize: context.elementSize || { width: 100, height: 30 },
            isImportant: context.isImportant || false,
            isVisible: context.isVisible !== false,
            hasHover: context.hasHover || false,
            surroundingElements: context.surroundingElements || 0,
            ...this.elementProfiles[context.elementType] || {}
        };

        // Calculate difficulty score
        profile.difficulty = this._calculateDifficulty(profile);
        
        return profile;
    }

    _calculateDifficulty(profile) {
        let difficulty = 0.5; // Base difficulty
        
        // Size affects difficulty
        const area = profile.elementSize.width * profile.elementSize.height;
        if (area < 500) difficulty += 0.3; // Small targets are harder
        if (area > 5000) difficulty -= 0.1; // Large targets are easier
        
        // Surrounding elements increase difficulty
        difficulty += profile.surroundingElements * 0.05;
        
        // Important elements are approached more carefully
        if (profile.isImportant) difficulty += 0.2;
        
        return Math.max(0, Math.min(1, difficulty));
    }
}

/**
 * Session Learner - Implements adaptive learning
 */
class SessionLearner {
    constructor() {
        this.adaptationData = {
            sitePreferences: new Map(),
            errorPatterns: [],
            successfulPatterns: [],
            adaptationScore: 0
        };
        this.learningEnabled = true;
    }

    async loadSession(sessionId) {
        // In a real implementation, this would load from persistent storage
        console.log(`Loading session data for: ${sessionId}`);
        return this.adaptationData;
    }

    recordMovement(movement) {
        if (!this.learningEnabled) return;

        // Analyze movement success/failure
        const success = this._analyzeMovementSuccess(movement);
        
        if (success) {
            this.adaptationData.successfulPatterns.push({
                personality: movement.personality,
                context: movement.context,
                metadata: movement.metadata,
                timestamp: Date.now()
            });
        } else {
            this.adaptationData.errorPatterns.push({
                personality: movement.personality,
                context: movement.context,
                metadata: movement.metadata,
                timestamp: Date.now()
            });
        }

        // Maintain pattern history size
        this._maintainPatternHistory();
        
        // Update adaptation score
        this._updateAdaptationScore();
    }

    async adaptToSite(siteContext) {
        const siteKey = siteContext.domain || 'unknown';
        
        if (!this.adaptationData.sitePreferences.has(siteKey)) {
            this.adaptationData.sitePreferences.set(siteKey, {
                preferredPersonality: 'professional',
                avgElementSize: { width: 100, height: 30 },
                commonPatterns: [],
                visitCount: 0
            });
        }

        const siteData = this.adaptationData.sitePreferences.get(siteKey);
        siteData.visitCount++;
        
        // Analyze successful patterns for this site
        const sitePatterns = this.adaptationData.successfulPatterns.filter(
            pattern => pattern.context.domain === siteKey
        );
        
        if (sitePatterns.length > 5) {
            // Update preferred personality based on successful patterns
            const personalityCounts = {};
            sitePatterns.forEach(pattern => {
                personalityCounts[pattern.personality] = 
                    (personalityCounts[pattern.personality] || 0) + 1;
            });
            
            const mostSuccessful = Object.keys(personalityCounts)
                .reduce((a, b) => personalityCounts[a] > personalityCounts[b] ? a : b);
            
            siteData.preferredPersonality = mostSuccessful;
        }
        
        return siteData;
    }

    _analyzeMovementSuccess(movement) {
        // Simple success analysis based on movement smoothness and efficiency
        const smoothnessThreshold = 0.7;
        const efficiencyThreshold = 0.6;
        
        const efficiency = movement.metadata.totalDistance / 
            Math.sqrt(Math.pow(movement.to.x - movement.from.x, 2) + 
                     Math.pow(movement.to.y - movement.from.y, 2));
        
        return movement.metadata.smoothness > smoothnessThreshold && 
               efficiency < 1.5; // Not too inefficient
    }

    _maintainPatternHistory() {
        const maxPatterns = 500;
        
        if (this.adaptationData.successfulPatterns.length > maxPatterns) {
            this.adaptationData.successfulPatterns = 
                this.adaptationData.successfulPatterns.slice(-maxPatterns * 0.8);
        }
        
        if (this.adaptationData.errorPatterns.length > maxPatterns) {
            this.adaptationData.errorPatterns = 
                this.adaptationData.errorPatterns.slice(-maxPatterns * 0.8);
        }
    }

    _updateAdaptationScore() {
        const totalPatterns = this.adaptationData.successfulPatterns.length + 
                            this.adaptationData.errorPatterns.length;
        
        if (totalPatterns === 0) {
            this.adaptationData.adaptationScore = 0;
            return;
        }
        
        const successRate = this.adaptationData.successfulPatterns.length / totalPatterns;
        this.adaptationData.adaptationScore = successRate;
    }
}

/**
 * Simple Neural Network for movement prediction
 */
class SimpleNeuralNetwork {
    constructor() {
        this.weights = this._initializeWeights();
        this.learningRate = 0.01;
        this.predictions = [];
    }

    predict(path, context) {
        const predictions = [];
        
        for (let i = 0; i < path.length; i++) {
            const input = this._createInput(path, i, context);
            const output = this._forward(input);
            
            predictions.push({
                x: output[0] || 0,
                y: output[1] || 0
            });
        }
        
        return predictions;
    }

    _createInput(path, index, context) {
        const point = path[index];
        const prevPoint = index > 0 ? path[index - 1] : point;
        const nextPoint = index < path.length - 1 ? path[index + 1] : point;
        
        return [
            point.x / 1000, // Normalized coordinates
            point.y / 1000,
            (point.x - prevPoint.x) / 100, // Velocity
            (point.y - prevPoint.y) / 100,
            (nextPoint.x - point.x) / 100, // Future direction
            (nextPoint.y - point.y) / 100,
            context.difficulty || 0.5,
            index / path.length // Progress through path
        ];
    }

    _forward(input) {
        // Simple feedforward network
        let layer1 = input.map((x, i) => 
            x * (this.weights.layer1[i] || Math.random() - 0.5)
        );
        
        let layer2 = layer1.map((x, i) => 
            Math.tanh(x) * (this.weights.layer2[i] || Math.random() - 0.5)
        );
        
        return [
            layer2.reduce((sum, x) => sum + x, 0) * 0.1, // X adjustment
            layer2.reduce((sum, x, i) => sum + x * (i % 2 ? 1 : -1), 0) * 0.1 // Y adjustment
        ];
    }

    _initializeWeights() {
        return {
            layer1: Array(8).fill().map(() => Math.random() - 0.5),
            layer2: Array(8).fill().map(() => Math.random() - 0.5)
        };
    }
}

// Export the main class
module.exports = NeuralMouseSimulator;