/**
 * Advanced Keystroke Dynamics Simulation System
 * For legitimate research and testing purposes only
 * 
 * Features:
 * - Realistic typing patterns based on human behavior research
 * - Multiple user profiles and personality types
 * - Language-specific typing patterns and keyboard layouts
 * - Fatigue simulation affecting typing speed and accuracy
 * - Natural error generation and correction behaviors
 * - Contextual typing adaptation
 * - Adaptive learning from typing sessions
 * - Comprehensive biometric simulation
 * - Word familiarity effects
 * - Emotional state influence on typing patterns
 */

class AdvancedKeystrokeSimulator {
    constructor(options = {}) {
        this.options = {
            // Default configuration
            userProfile: 'average',
            language: 'en',
            keyboardLayout: 'qwerty',
            learningEnabled: true,
            fatigueEnabled: true,
            emotionalStateEnabled: true,
            ...options
        };

        // Initialize core components
        this.initializeProfiles();
        this.initializeKeyboardLayouts();
        this.initializeLanguageModels();
        this.initializeFatigueModel();
        this.initializeEmotionalModel();
        this.initializeLearningSystem();
        this.initializeContextualAdaptation();
        
        // Session tracking
        this.sessionData = {
            startTime: Date.now(),
            keystrokes: [],
            errors: [],
            corrections: [],
            totalCharacters: 0,
            sessionDuration: 0,
            fatigueLevel: 0,
            emotionalState: 'neutral'
        };

        // Adaptive learning data
        this.learningData = {
            wordFamiliarity: new Map(),
            bigramTimings: new Map(),
            errorPatterns: new Map(),
            correctionBehaviors: new Map()
        };
    }

    /**
     * Initialize user typing profiles based on research data
     */
    initializeProfiles() {
        this.profiles = {
            // Professional fast typist
            expert: {
                baseWPM: 85,
                wpmVariance: 15,
                accuracy: 0.96,
                dwellTimeRange: [60, 120],
                flightTimeRange: [40, 100],
                rhythmConsistency: 0.9,
                errorRecoverySpeed: 0.8,
                pressureVariance: 0.15,
                bursts: true,
                pauseFrequency: 0.05
            },
            
            // Average computer user
            average: {
                baseWPM: 45,
                wpmVariance: 20,
                accuracy: 0.92,
                dwellTimeRange: [80, 180],
                flightTimeRange: [60, 150],
                rhythmConsistency: 0.7,
                errorRecoverySpeed: 0.6,
                pressureVariance: 0.25,
                bursts: false,
                pauseFrequency: 0.12
            },
            
            // Hunt and peck typist
            huntPeck: {
                baseWPM: 25,
                wpmVariance: 10,
                accuracy: 0.88,
                dwellTimeRange: [120, 300],
                flightTimeRange: [200, 500],
                rhythmConsistency: 0.4,
                errorRecoverySpeed: 0.4,
                pressureVariance: 0.35,
                bursts: false,
                pauseFrequency: 0.25,
                searchTime: true
            },
            
            // Mobile device user
            mobile: {
                baseWPM: 35,
                wpmVariance: 12,
                accuracy: 0.89,
                dwellTimeRange: [100, 220],
                flightTimeRange: [80, 180],
                rhythmConsistency: 0.6,
                errorRecoverySpeed: 0.5,
                pressureVariance: 0.3,
                bursts: false,
                pauseFrequency: 0.15,
                autocorrectReliance: 0.7
            },
            
            // Elderly user
            elderly: {
                baseWPM: 20,
                wpmVariance: 8,
                accuracy: 0.85,
                dwellTimeRange: [150, 400],
                flightTimeRange: [250, 600],
                rhythmConsistency: 0.5,
                errorRecoverySpeed: 0.3,
                pressureVariance: 0.4,
                bursts: false,
                pauseFrequency: 0.3,
                deliberate: true
            },
            
            // Programmer/Technical user
            programmer: {
                baseWPM: 65,
                wpmVariance: 18,
                accuracy: 0.94,
                dwellTimeRange: [70, 140],
                flightTimeRange: [50, 120],
                rhythmConsistency: 0.8,
                errorRecoverySpeed: 0.7,
                pressureVariance: 0.2,
                bursts: true,
                pauseFrequency: 0.08,
                specialCharProficiency: 0.9
            }
        };

        this.currentProfile = this.profiles[this.options.userProfile] || this.profiles.average;
    }

    /**
     * Initialize keyboard layout mappings
     */
    initializeKeyboardLayouts() {
        this.keyboardLayouts = {
            qwerty: {
                rows: [
                    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
                    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
                ],
                fingerMapping: this.createFingerMapping('qwerty'),
                commonBigrams: ['th', 'he', 'in', 'er', 're', 'an', 'nd', 'on', 'en', 'at'],
                difficultCombinations: ['qw', 'zx', 'cv', 'bn']
            },
            
            dvorak: {
                rows: [
                    ["'", ',', '.', 'p', 'y', 'f', 'g', 'c', 'r', 'l'],
                    ['a', 'o', 'e', 'u', 'i', 'd', 'h', 't', 'n', 's'],
                    [';', 'q', 'j', 'k', 'x', 'b', 'm', 'w', 'v', 'z']
                ],
                fingerMapping: this.createFingerMapping('dvorak'),
                commonBigrams: ['th', 'he', 'in', 'er', 're', 'an', 'nd', 'on', 'en', 'at'],
                difficultCombinations: ['qj', 'kx', 'bm', 'wv']
            },
            
            colemak: {
                rows: [
                    ['q', 'w', 'f', 'p', 'g', 'j', 'l', 'u', 'y', ';'],
                    ['a', 'r', 's', 't', 'd', 'h', 'n', 'e', 'i', 'o'],
                    ['z', 'x', 'c', 'v', 'b', 'k', 'm']
                ],
                fingerMapping: this.createFingerMapping('colemak'),
                commonBigrams: ['th', 'he', 'in', 'er', 're', 'an', 'nd', 'on', 'en', 'at'],
                difficultCombinations: ['qw', 'fg', 'jl', 'uy']
            }
        };

        this.currentLayout = this.keyboardLayouts[this.options.keyboardLayout] || this.keyboardLayouts.qwerty;
    }

    /**
     * Create finger mapping for keyboard layouts
     */
    createFingerMapping(layout) {
        const mapping = new Map();
        
        if (layout === 'qwerty') {
            // Left hand
            mapping.set('q', 'leftPinky');
            mapping.set('w', 'leftRing');
            mapping.set('e', 'leftMiddle');
            mapping.set('r', 'leftIndex');
            mapping.set('t', 'leftIndex');
            mapping.set('a', 'leftPinky');
            mapping.set('s', 'leftRing');
            mapping.set('d', 'leftMiddle');
            mapping.set('f', 'leftIndex');
            mapping.set('g', 'leftIndex');
            mapping.set('z', 'leftPinky');
            mapping.set('x', 'leftRing');
            mapping.set('c', 'leftMiddle');
            mapping.set('v', 'leftIndex');
            mapping.set('b', 'leftIndex');
            
            // Right hand
            mapping.set('y', 'rightIndex');
            mapping.set('u', 'rightIndex');
            mapping.set('i', 'rightMiddle');
            mapping.set('o', 'rightRing');
            mapping.set('p', 'rightPinky');
            mapping.set('h', 'rightIndex');
            mapping.set('j', 'rightIndex');
            mapping.set('k', 'rightMiddle');
            mapping.set('l', 'rightRing');
            mapping.set('n', 'rightIndex');
            mapping.set('m', 'rightIndex');
        }
        
        return mapping;
    }

    /**
     * Initialize language-specific models
     */
    initializeLanguageModels() {
        this.languageModels = {
            en: {
                commonWords: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'],
                frequentBigrams: ['th', 'he', 'in', 'er', 're', 'an', 'nd', 'on', 'en', 'at', 'es', 'of', 'te', 'ti', 'or', 'st', 'ar', 'ou', 'it', 'be'],
                frequentTrigrams: ['the', 'and', 'ing', 'her', 'hat', 'his', 'tha', 'ere', 'for', 'ent', 'ion', 'ter', 'was', 'you', 'ith', 'ver', 'all', 'wit', 'thi', 'tio'],
                avgWordLength: 4.7,
                spaceFrequency: 0.167,
                punctuationPatterns: ['.', ',', '!', '?', ';', ':']
            },
            
            es: {
                commonWords: ['que', 'con', 'para', 'una', 'por', 'como', 'del', 'los', 'las', 'pero', 'todo', 'muy', 'más', 'sus', 'fue', 'son', 'dos', 'año', 'día', 'vez', 'ser', 'han', 'hay', 'sin', 'van', 'ver', 'dar', 'tus'],
                frequentBigrams: ['es', 'en', 'de', 'el', 'la', 'ar', 'er', 'ir', 'or', 'an', 'al', 'te', 're', 'ra', 'ta', 'ro', 'do', 'co', 'st', 'qu'],
                frequentTrigrams: ['que', 'con', 'par', 'del', 'los', 'las', 'est', 'ent', 'aci', 'ion', 'ada', 'ido', 'ado', 'era', 'aba', 'ría', 'nte', 'res', 'tra', 'pre'],
                avgWordLength: 5.1,
                spaceFrequency: 0.158,
                punctuationPatterns: ['.', ',', '¡', '!', '¿', '?', ';', ':']
            },
            
            fr: {
                commonWords: ['que', 'des', 'les', 'une', 'son', 'pour', 'sur', 'avec', 'ses', 'tout', 'mais', 'par', 'pas', 'dans', 'aux', 'ces', 'mes', 'tes', 'nos', 'vos', 'ils', 'ont', 'été', 'dit', 'fait', 'peut', 'bien', 'sans'],
                frequentBigrams: ['es', 'en', 'de', 're', 'le', 'nt', 'er', 'te', 'on', 'an', 'ti', 'ou', 'ai', 'se', 'it', 'me', 'is', 'et', 'in', 'ne'],
                frequentTrigrams: ['que', 'des', 'les', 'ent', 'ion', 'ons', 'ait', 'est', 'ell', 'iss', 'ant', 'eur', 'our', 'ier', 'ous', 'tre', 'ave', 'con', 'par', 'men'],
                avgWordLength: 5.3,
                spaceFrequency: 0.162,
                punctuationPatterns: ['.', ',', '!', '?', ';', ':', '«', '»']
            }
        };

        this.currentLanguage = this.languageModels[this.options.language] || this.languageModels.en;
    }

    /**
     * Initialize fatigue simulation model
     */
    initializeFatigueModel() {
        this.fatigueModel = {
            // Fatigue accumulation rate (per minute)
            accumulationRate: 0.02,
            
            // Maximum fatigue level (0-1)
            maxFatigue: 0.8,
            
            // Effects of fatigue on typing
            effects: {
                speedReduction: 0.3,      // 30% speed reduction at max fatigue
                accuracyReduction: 0.15,   // 15% accuracy reduction at max fatigue
                rhythmDisruption: 0.4,     // 40% rhythm disruption at max fatigue
                pauseIncrease: 2.0         // 200% increase in pause frequency
            },
            
            // Recovery rate when taking breaks
            recoveryRate: 0.05,
            
            // Current fatigue level
            currentLevel: 0
        };
    }

    /**
     * Initialize emotional state model
     */
    initializeEmotionalModel() {
        this.emotionalModel = {
            states: {
                calm: {
                    speedMultiplier: 1.0,
                    accuracyMultiplier: 1.0,
                    rhythmStability: 1.0,
                    errorRecovery: 1.0
                },
                
                stressed: {
                    speedMultiplier: 1.15,
                    accuracyMultiplier: 0.85,
                    rhythmStability: 0.7,
                    errorRecovery: 0.8,
                    burstiness: 1.3
                },
                
                tired: {
                    speedMultiplier: 0.8,
                    accuracyMultiplier: 0.9,
                    rhythmStability: 0.6,
                    errorRecovery: 0.7,
                    pauseIncrease: 1.8
                },
                
                excited: {
                    speedMultiplier: 1.2,
                    accuracyMultiplier: 0.9,
                    rhythmStability: 0.8,
                    errorRecovery: 1.1,
                    burstiness: 1.5
                },
                
                frustrated: {
                    speedMultiplier: 0.9,
                    accuracyMultiplier: 0.8,
                    rhythmStability: 0.5,
                    errorRecovery: 0.6,
                    errorRate: 1.4
                }
            },
            
            currentState: 'calm',
            stateIntensity: 0.5,  // 0-1 scale
            
            // State transition probabilities
            transitions: {
                calm: { stressed: 0.1, tired: 0.05, excited: 0.05, frustrated: 0.05 },
                stressed: { calm: 0.3, tired: 0.15, frustrated: 0.2 },
                tired: { calm: 0.2, stressed: 0.1 },
                excited: { calm: 0.4, stressed: 0.1 },
                frustrated: { stressed: 0.3, calm: 0.2, tired: 0.1 }
            }
        };
    }

    /**
     * Initialize adaptive learning system
     */
    initializeLearningSystem() {
        this.learningSystem = {
            // Learning rates for different aspects
            rates: {
                wordFamiliarity: 0.1,
                bigramSpeed: 0.05,
                errorReduction: 0.08,
                rhythmImprovement: 0.03
            },
            
            // Memory decay rates
            decayRates: {
                wordFamiliarity: 0.01,
                bigramSpeed: 0.005,
                errorPatterns: 0.02
            },
            
            // Minimum sessions before learning takes effect
            minimumSessions: 3,
            
            // Current session count
            sessionCount: 0
        };
    }

    /**
     * Initialize contextual adaptation system
     */
    initializeContextualAdaptation() {
        this.contextualAdaptation = {
            contexts: {
                password: {
                    speedReduction: 0.3,
                    accuracyIncrease: 0.1,
                    pauseIncrease: 0.5,
                    deliberateTyping: true,
                    visualFeedbackLimited: true
                },
                
                search: {
                    speedIncrease: 0.1,
                    burstTyping: true,
                    commonQueries: true,
                    autocompleteExpectation: true
                },
                
                form: {
                    fieldSpecificBehavior: true,
                    tabNavigation: true,
                    validationAwareness: true
                },
                
                code: {
                    specialCharacters: true,
                    indentationAware: true,
                    syntaxPausing: true,
                    precisionTyping: true
                },
                
                chat: {
                    informal: true,
                    abbreviations: true,
                    emoticons: true,
                    quickResponses: true
                }
            },
            
            currentContext: 'normal'
        };
    }

    /**
     * Simulate typing a string with all behavioral models
     */
    async simulateTyping(text, context = 'normal', options = {}) {
        const typingOptions = {
            realTime: false,
            includeCorrections: true,
            adaptToContent: true,
            ...options
        };

        // Update context
        this.contextualAdaptation.currentContext = context;
        
        // Initialize typing session
        const typingSession = {
            text,
            context,
            keystrokes: [],
            startTime: Date.now(),
            options: typingOptions
        };

        // Process text word by word
        const words = this.tokenizeText(text);
        let currentPosition = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isLastWord = i === words.length - 1;
            
            // Simulate word typing
            const wordKeystrokes = await this.simulateWordTyping(
                word, 
                currentPosition, 
                context,
                typingOptions
            );
            
            typingSession.keystrokes.push(...wordKeystrokes);
            currentPosition += word.length;
            
            // Add space after word (except for last word)
            if (!isLastWord && !this.isPunctuation(word)) {
                const spaceKeystroke = await this.simulateKeystroke(
                    ' ', 
                    currentPosition, 
                    context
                );
                typingSession.keystrokes.push(spaceKeystroke);
                currentPosition++;
            }
            
            // Update fatigue and emotional state
            if (this.options.fatigueEnabled) {
                this.updateFatigue(word.length);
            }
            
            if (this.options.emotionalStateEnabled && Math.random() < 0.05) {
                this.updateEmotionalState();
            }
        }

        // Finalize session
        typingSession.endTime = Date.now();
        typingSession.duration = typingSession.endTime - typingSession.startTime;
        
        // Update learning data
        if (this.options.learningEnabled) {
            this.updateLearningData(typingSession);
        }
        
        // Update session statistics
        this.updateSessionData(typingSession);
        
        return typingSession;
    }

    /**
     * Simulate typing a single word
     */
    async simulateWordTyping(word, startPosition, context, options) {
        const keystrokes = [];
        let position = startPosition;
        
        // Check word familiarity
        const familiarity = this.getWordFamiliarity(word);
        const isCommonWord = this.currentLanguage.commonWords.includes(word.toLowerCase());
        
        // Adjust typing parameters based on familiarity
        const familiarityMultiplier = Math.min(1 + (familiarity * 0.3), 1.5);
        const speedMultiplier = isCommonWord ? 1.2 : 1.0;
        
        // Pre-word pause (thinking time)
        const preWordPause = this.calculatePreWordPause(word, familiarity, context);
        if (preWordPause > 0) {
            keystrokes.push({
                type: 'pause',
                duration: preWordPause,
                timestamp: Date.now(),
                position
            });
        }

        // Type each character
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const isFirstChar = i === 0;
            const isLastChar = i === word.length - 1;
            
            // Calculate if error should occur
            const shouldError = this.shouldMakeError(char, position, context);
            
            if (shouldError && options.includeCorrections) {
                // Simulate typing error and correction
                const errorSequence = await this.simulateTypingError(
                    char, 
                    position, 
                    context,
                    familiarity
                );
                keystrokes.push(...errorSequence);
            } else {
                // Normal keystroke
                const keystroke = await this.simulateKeystroke(
                    char, 
                    position, 
                    context,
                    {
                        familiarityMultiplier,
                        speedMultiplier,
                        isFirstChar,
                        isLastChar
                    }
                );
                keystrokes.push(keystroke);
            }
            
            position++;
        }
        
        // Update word familiarity
        if (this.options.learningEnabled) {
            this.updateWordFamiliarity(word);
        }
        
        return keystrokes;
    }

    /**
     * Simulate a single keystroke with comprehensive biometric data
     */
    async simulateKeystroke(character, position, context, modifiers = {}) {
        const profile = this.currentProfile;
        const layout = this.currentLayout;
        const emotional = this.emotionalModel.states[this.emotionalModel.currentState];
        const contextMod = this.contextualAdaptation.contexts[context] || {};
        
        // Base timing calculations
        const baseInterval = 60000 / (profile.baseWPM * 5); // Convert WPM to ms per character
        
        // Apply various multipliers
        let interval = baseInterval;
        interval *= this.getRandomVariance(1, profile.wpmVariance / 100);
        interval *= emotional.speedMultiplier || 1;
        interval *= modifiers.familiarityMultiplier || 1;
        interval *= modifiers.speedMultiplier || 1;
        
        // Apply fatigue effects
        if (this.options.fatigueEnabled) {
            const fatigueEffect = 1 + (this.fatigueModel.currentLevel * this.fatigueModel.effects.speedReduction);
            interval *= fatigueEffect;
        }
        
        // Apply contextual modifications
        if (contextMod.speedReduction) {
            interval *= (1 + contextMod.speedReduction);
        }
        if (contextMod.speedIncrease) {
            interval *= (1 - contextMod.speedIncrease);
        }
        
        // Calculate dwell time (key press duration)
        const dwellTime = this.calculateDwellTime(character, profile, emotional);
        
        // Calculate flight time (time between key release and next key press)
        const flightTime = Math.max(0, interval - dwellTime);
        
        // Calculate pressure (simulated)
        const pressure = this.calculatePressure(character, profile, emotional);
        
        // Calculate finger used
        const finger = layout.fingerMapping.get(character.toLowerCase()) || 'unknown';
        
        // Calculate keystroke dynamics features
        const dynamics = this.calculateKeystrokeDynamics(character, position, interval, dwellTime);
        
        // Create keystroke object
        const keystroke = {
            character,
            position,
            timestamp: Date.now(),
            interval,
            dwellTime,
            flightTime,
            pressure,
            finger,
            dynamics,
            
            // Biometric features
            biometrics: {
                dwellTime,
                flightTime,
                pressure,
                velocity: this.calculateVelocity(interval),
                acceleration: this.calculateAcceleration(interval, dwellTime),
                rhythm: this.calculateRhythm(position),
                consistency: this.calculateConsistency(character)
            },
            
            // Context information
            context: {
                type: context,
                position,
                isSpecialChar: this.isSpecialCharacter(character),
                requiresShift: this.requiresShift(character),
                finger,
                hand: this.getHand(finger)
            },
            
            // Emotional and physical state
            state: {
                fatigue: this.fatigueModel.currentLevel,
                emotional: this.emotionalModel.currentState,
                intensity: this.emotionalModel.stateIntensity
            }
        };
        
        return keystroke;
    }

    /**
     * Simulate typing error and correction behavior
     */
    async simulateTypingError(intendedChar, position, context, familiarity) {
        const sequence = [];
        const profile = this.currentProfile;
        
        // Determine error type
        const errorTypes = ['substitution', 'insertion', 'omission', 'transposition'];
        const errorType = this.weightedChoice(errorTypes, [0.4, 0.3, 0.2, 0.1]);
        
        let errorChar, correction;
        
        switch (errorType) {
            case 'substitution':
                errorChar = this.getSubstitutionError(intendedChar);
                break;
            case 'insertion':
                errorChar = this.getInsertionError(intendedChar);
                break;
            case 'omission':
                // Skip character entirely
                return sequence;
            case 'transposition':
                // Handle in pair context
                errorChar = intendedChar;
                break;
        }
        
        // Type the error
        const errorKeystroke = await this.simulateKeystroke(
            errorChar, 
            position, 
            context,
            { isError: true }
        );
        sequence.push(errorKeystroke);
        
        // Detection delay (time before noticing error)
        const detectionDelay = this.calculateErrorDetectionDelay(familiarity, profile);
        
        if (detectionDelay > 0) {
            sequence.push({
                type: 'pause',
                duration: detectionDelay,
                timestamp: Date.now(),
                position: position + 1,
                reason: 'error_detection'
            });
        }
        
        // Correction behavior
        const correctionBehavior = this.chooseCorrectionBehavior(errorType, context);
        
        switch (correctionBehavior) {
            case 'immediate_backspace':
                // Backspace and retype
                const backspaceKeystroke = await this.simulateKeystroke(
                    'Backspace', 
                    position + 1, 
                    context,
                    { isCorrection: true }
                );
                sequence.push(backspaceKeystroke);
                
                // Retype correct character
                const correctKeystroke = await this.simulateKeystroke(
                    intendedChar, 
                    position, 
                    context,
                    { isCorrection: true }
                );
                sequence.push(correctKeystroke);
                break;
                
            case 'continue_and_correct':
                // Continue typing, correct later
                // This would be handled at word/sentence level
                break;
                
            case 'select_and_replace':
                // Select error and replace (more complex correction)
                // Simulate selection and replacement
                break;
        }
        
        // Update error patterns for learning
        if (this.options.learningEnabled) {
            this.updateErrorPatterns(intendedChar, errorChar, errorType);
        }
        
        return sequence;
    }

    /**
     * Calculate dwell time (key press duration)
     */
    calculateDwellTime(character, profile, emotional) {
        const baseRange = profile.dwellTimeRange;
        let dwellTime = this.randomBetween(baseRange[0], baseRange[1]);
        
        // Apply emotional state effects
        if (emotional.speedMultiplier) {
            dwellTime /= emotional.speedMultiplier;
        }
        
        // Apply fatigue effects
        if (this.options.fatigueEnabled) {
            const fatigueIncrease = 1 + (this.fatigueModel.currentLevel * 0.2);
            dwellTime *= fatigueIncrease;
        }
        
        // Character-specific adjustments
        if (this.isSpecialCharacter(character)) {
            dwellTime *= 1.2; // Special characters take longer
        }
        
        if (this.requiresShift(character)) {
            dwellTime *= 1.15; // Shift characters take slightly longer
        }
        
        return Math.round(dwellTime);
    }

    /**
     * Calculate pressure simulation
     */
    calculatePressure(character, profile, emotional) {
        const basePressure = 0.5; // Normalized base pressure
        let pressure = basePressure + this.getRandomVariance(0, profile.pressureVariance);
        
        // Emotional state effects
        if (this.emotionalModel.currentState === 'stressed' || 
            this.emotionalModel.currentState === 'frustrated') {
            pressure *= 1.3;
        } else if (this.emotionalModel.currentState === 'tired') {
            pressure *= 0.8;
        }
        
        // Fatigue effects
        if (this.options.fatigueEnabled) {
            pressure -= this.fatigueModel.currentLevel * 0.2;
        }
        
        // Character-specific adjustments
        if (this.isSpecialCharacter(character)) {
            pressure *= 1.1;
        }
        
        return Math.max(0.1, Math.min(1.0, pressure));
    }

    /**
     * Calculate keystroke dynamics features
     */
    calculateKeystrokeDynamics(character, position, interval, dwellTime) {
        return {
            // Timing features
            interKeyInterval: interval,
            dwellTime: dwellTime,
            flightTime: interval - dwellTime,
            
            // Speed features
            instantaneousSpeed: 60000 / interval, // WPM
            
            // Rhythm features
            rhythmRatio: this.calculateRhythmRatio(position),
            
            // Pressure features (simulated)
            peakPressure: this.calculatePressure(character, this.currentProfile, 
                this.emotionalModel.states[this.emotionalModel.currentState]),
            
            // Positional features
            fingerDistance: this.calculateFingerDistance(character, position),
            handAlternation: this.calculateHandAlternation(character, position)
        };
    }

    /**
     * Update fatigue level based on typing activity
     */
    updateFatigue(charactersTyped) {
        const sessionMinutes = (Date.now() - this.sessionData.startTime) / 60000;
        const fatigueIncrease = this.fatigueModel.accumulationRate * (sessionMinutes / 60);
        
        this.fatigueModel.currentLevel = Math.min(
            this.fatigueModel.maxFatigue,
            this.fatigueModel.currentLevel + fatigueIncrease
        );
        
        // Add burst-based fatigue
        if (charactersTyped > 50) { // Long burst
            this.fatigueModel.currentLevel += 0.01;
        }
    }

    /**
     * Update emotional state based on various factors
     */
    updateEmotionalState() {
        const currentState = this.emotionalModel.currentState;
        const transitions = this.emotionalModel.transitions[currentState];
        
        // Calculate transition probability based on context
        let transitionProbability = 0.1; // Base probability
        
        // Increase probability based on fatigue
        if (this.fatigueModel.currentLevel > 0.5) {
            transitionProbability += 0.15;
        }
        
        // Increase probability based on errors
        const recentErrors = this.sessionData.errors.length;
        if (recentErrors > 5) {
            transitionProbability += 0.2;
        }
        
        if (Math.random() < transitionProbability) {
            // Select new state based on transition probabilities
            const states = Object.keys(transitions);
            const probabilities = Object.values(transitions);
            const newState = this.weightedChoice(states, probabilities);
            
            if (newState) {
                this.emotionalModel.currentState = newState;
                this.emotionalModel.stateIntensity = Math.random() * 0.5 + 0.5; // 0.5-1.0
            }
        }
    }

    /**
     * Update word familiarity for learning system
     */
    updateWordFamiliarity(word) {
        const currentFamiliarity = this.learningData.wordFamiliarity.get(word) || 0;
        const learningRate = this.learningSystem.rates.wordFamiliarity;
        
        const newFamiliarity = Math.min(1.0, currentFamiliarity + learningRate);
        this.learningData.wordFamiliarity.set(word, newFamiliarity);
    }

    /**
     * Update error patterns for learning system
     */
    updateErrorPatterns(intended, actual, errorType) {
        const key = `${intended}->${actual}`;
        const currentCount = this.learningData.errorPatterns.get(key) || 0;
        this.learningData.errorPatterns.set(key, currentCount + 1);
    }

    /**
     * Calculate word familiarity score
     */
    getWordFamiliarity(word) {
        return this.learningData.wordFamiliarity.get(word) || 0;
    }

    /**
     * Determine if an error should occur
     */
    shouldMakeError(character, position, context) {
        let errorProbability = 1 - this.currentProfile.accuracy;
        
        // Apply emotional state effects
        const emotional = this.emotionalModel.states[this.emotionalModel.currentState];
        if (emotional.accuracyMultiplier) {
            errorProbability *= (2 - emotional.accuracyMultiplier);
        }
        
        // Apply fatigue effects
        if (this.options.fatigueEnabled) {
            errorProbability += this.fatigueModel.currentLevel * this.fatigueModel.effects.accuracyReduction;
        }
        
        // Character-specific error rates
        if (this.isSpecialCharacter(character)) {
            errorProbability *= 1.5;
        }
        
        // Context-specific adjustments
        const contextMod = this.contextualAdaptation.contexts[context];
        if (contextMod && contextMod.accuracyIncrease) {
            errorProbability *= (1 - contextMod.accuracyIncrease);
        }
        
        return Math.random() < errorProbability;
    }

    /**
     * Get substitution error for character
     */
    getSubstitutionError(character) {
        const layout = this.currentLayout;
        const adjacentKeys = this.getAdjacentKeys(character, layout);
        
        if (adjacentKeys.length > 0) {
            return adjacentKeys[Math.floor(Math.random() * adjacentKeys.length)];
        }
        
        // Fallback to random character
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        return alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    /**
     * Get adjacent keys for substitution errors
     */
    getAdjacentKeys(character, layout) {
        const adjacent = [];
        const rows = layout.rows;
        
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const index = row.indexOf(character.toLowerCase());
            
            if (index !== -1) {
                // Same row adjacent keys
                if (index > 0) adjacent.push(row[index - 1]);
                if (index < row.length - 1) adjacent.push(row[index + 1]);
                
                // Adjacent row keys
                if (r > 0 && rows[r - 1][index]) adjacent.push(rows[r - 1][index]);
                if (r < rows.length - 1 && rows[r + 1][index]) adjacent.push(rows[r + 1][index]);
                
                break;
            }
        }
        
        return adjacent;
    }

    /**
     * Calculate error detection delay
     */
    calculateErrorDetectionDelay(familiarity, profile) {
        const baseDelay = 200; // Base detection time in ms
        const recoverySpeed = profile.errorRecoverySpeed;
        
        let delay = baseDelay / recoverySpeed;
        delay *= (1 - familiarity * 0.3); // Familiar words detected faster
        
        // Add randomness
        delay *= this.getRandomVariance(1, 0.5);
        
        return Math.round(delay);
    }

    /**
     * Choose correction behavior
     */
    chooseCorrectionBehavior(errorType, context) {
        const behaviors = ['immediate_backspace', 'continue_and_correct', 'select_and_replace'];
        const probabilities = [0.7, 0.2, 0.1]; // Most people backspace immediately
        
        // Adjust probabilities based on context
        if (context === 'password') {
            probabilities[0] = 0.9; // Almost always immediate correction for passwords
            probabilities[1] = 0.1;
            probabilities[2] = 0.0;
        }
        
        return this.weightedChoice(behaviors, probabilities);
    }

    /**
     * Calculate pre-word pause
     */
    calculatePreWordPause(word, familiarity, context) {
        const profile = this.currentProfile;
        let basePause = 0;
        
        // Thinking time for unfamiliar words
        if (familiarity < 0.5) {
            basePause += 100 + (Math.random() * 200);
        }
        
        // Hunt-and-peck users have search time
        if (profile.searchTime) {
            basePause += 50 + (Math.random() * 150);
        }
        
        // Context-specific pauses
        if (context === 'password') {
            basePause += 200; // Extra thinking time for passwords
        }
        
        // Emotional state effects
        if (this.emotionalModel.currentState === 'stressed') {
            basePause *= 1.5;
        }
        
        return Math.round(basePause);
    }

    /**
     * Tokenize text into words and punctuation
     */
    tokenizeText(text) {
        // Simple tokenization - can be made more sophisticated
        return text.match(/\S+/g) || [];
    }

    /**
     * Utility functions
     */
    
    isPunctuation(char) {
        return /[.,!?;:]/.test(char);
    }
    
    isSpecialCharacter(char) {
        return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(char);
    }
    
    requiresShift(char) {
        return /[A-Z!@#$%^&*()_+{}:"<>?~|]/.test(char);
    }
    
    getHand(finger) {
        return finger && finger.startsWith('left') ? 'left' : 'right';
    }
    
    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    getRandomVariance(base, variance) {
        return base + (Math.random() - 0.5) * 2 * variance;
    }
    
    weightedChoice(options, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < options.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return options[i];
            }
        }
        
        return options[options.length - 1];
    }

    // Additional calculation methods for biometric features
    calculateVelocity(interval) {
        return 1000 / interval; // Characters per second
    }
    
    calculateAcceleration(interval, dwellTime) {
        // Simplified acceleration calculation
        return (1000 / interval) / (dwellTime / 1000);
    }
    
    calculateRhythm(position) {
        // Simplified rhythm calculation based on position
        return Math.sin(position * 0.1) * 0.1 + 1;
    }
    
    calculateConsistency(character) {
        // Simplified consistency based on character frequency
        return this.currentLanguage.commonWords.includes(character.toLowerCase()) ? 0.9 : 0.7;
    }
    
    calculateRhythmRatio(position) {
        // Ratio of current interval to average interval
        return 1 + Math.sin(position * 0.05) * 0.2;
    }
    
    calculateFingerDistance(character, position) {
        // Simplified finger travel distance
        return Math.random() * 10 + 5; // mm
    }
    
    calculateHandAlternation(character, position) {
        // Whether this keystroke alternates hands from previous
        return Math.random() > 0.5;
    }

    /**
     * Update session data with typing session results
     */
    updateSessionData(typingSession) {
        this.sessionData.keystrokes.push(...typingSession.keystrokes);
        this.sessionData.totalCharacters += typingSession.text.length;
        this.sessionData.sessionDuration = Date.now() - this.sessionData.startTime;
        
        // Calculate session statistics
        const errors = typingSession.keystrokes.filter(k => k.context && k.context.isError);
        this.sessionData.errors.push(...errors);
        
        // Update learning system session count
        this.learningSystem.sessionCount++;
    }

    /**
     * Get comprehensive session statistics
     */
    getSessionStatistics() {
        const duration = this.sessionData.sessionDuration / 1000 / 60; // minutes
        const totalKeystrokes = this.sessionData.keystrokes.length;
        const totalCharacters = this.sessionData.totalCharacters;
        const errors = this.sessionData.errors.length;
        
        const wpm = totalCharacters / 5 / duration; // Standard WPM calculation
        const accuracy = (totalCharacters - errors) / totalCharacters;
        
        return {
            duration: duration,
            totalKeystrokes: totalKeystrokes,
            totalCharacters: totalCharacters,
            wpm: Math.round(wpm),
            accuracy: Math.round(accuracy * 100),
            errorsCount: errors,
            fatigueLevel: this.fatigueModel.currentLevel,
            emotionalState: this.emotionalModel.currentState,
            profile: this.options.userProfile,
            language: this.options.language,
            keyboardLayout: this.options.keyboardLayout
        };
    }

    /**
     * Export typing session data for analysis
     */
    exportSessionData(format = 'json') {
        const data = {
            sessionInfo: {
                startTime: this.sessionData.startTime,
                endTime: Date.now(),
                duration: this.sessionData.sessionDuration,
                profile: this.options.userProfile,
                language: this.options.language,
                keyboardLayout: this.options.keyboardLayout
            },
            keystrokes: this.sessionData.keystrokes,
            statistics: this.getSessionStatistics(),
            learningData: {
                wordFamiliarity: Array.from(this.learningData.wordFamiliarity.entries()),
                errorPatterns: Array.from(this.learningData.errorPatterns.entries()),
                sessionCount: this.learningSystem.sessionCount
            },
            biometricFeatures: this.extractBiometricFeatures()
        };

        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data.keystrokes);
            default:
                return data;
        }
    }

    /**
     * Extract biometric features for analysis
     */
    extractBiometricFeatures() {
        const keystrokes = this.sessionData.keystrokes.filter(k => k.biometrics);
        
        if (keystrokes.length === 0) return null;
        
        const features = {
            dwellTimes: keystrokes.map(k => k.biometrics.dwellTime),
            flightTimes: keystrokes.map(k => k.biometrics.flightTime),
            pressures: keystrokes.map(k => k.biometrics.pressure),
            velocities: keystrokes.map(k => k.biometrics.velocity),
            rhythmScores: keystrokes.map(k => k.biometrics.rhythm)
        };
        
        // Calculate statistical measures
        const stats = {};
        Object.keys(features).forEach(feature => {
            const values = features[feature];
            stats[feature] = {
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                std: this.calculateStandardDeviation(values),
                min: Math.min(...values),
                max: Math.max(...values),
                median: this.calculateMedian(values)
            };
        });
        
        return {
            raw: features,
            statistics: stats,
            featureCount: keystrokes.length
        };
    }

    /**
     * Convert keystroke data to CSV format
     */
    convertToCSV(keystrokes) {
        const headers = [
            'timestamp', 'character', 'position', 'interval', 'dwellTime', 
            'flightTime', 'pressure', 'finger', 'context', 'fatigue', 
            'emotionalState', 'isError', 'isCorrection'
        ];
        
        const rows = keystrokes.map(k => [
            k.timestamp,
            k.character,
            k.position,
            k.interval || 0,
            k.dwellTime || 0,
            k.flightTime || 0,
            k.pressure || 0,
            k.finger || '',
            k.context?.type || '',
            k.state?.fatigue || 0,
            k.state?.emotional || '',
            k.context?.isError || false,
            k.context?.isCorrection || false
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Utility statistical functions
     */
    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }
    
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    /**
     * Reset session data for new typing session
     */
    resetSession() {
        this.sessionData = {
            startTime: Date.now(),
            keystrokes: [],
            errors: [],
            corrections: [],
            totalCharacters: 0,
            sessionDuration: 0,
            fatigueLevel: 0,
            emotionalState: 'neutral'
        };
        
        this.fatigueModel.currentLevel = 0;
        this.emotionalModel.currentState = 'calm';
        this.emotionalModel.stateIntensity = 0.5;
    }
}

// Export for use in research and testing environments
module.exports = AdvancedKeystrokeSimulator;

// Example usage for research purposes
if (require.main === module) {
    // Demonstration of the advanced keystroke simulator
    async function demonstrateSimulator() {
        console.log('Advanced Keystroke Dynamics Simulation System');
        console.log('For Research and Testing Purposes Only\n');
        
        // Create simulator instances with different profiles
        const profiles = ['expert', 'average', 'huntPeck', 'mobile', 'elderly'];
        
        for (const profile of profiles) {
            console.log(`\n=== Testing ${profile.toUpperCase()} Profile ===`);
            
            const simulator = new AdvancedKeystrokeSimulator({
                userProfile: profile,
                language: 'en',
                keyboardLayout: 'qwerty',
                learningEnabled: true,
                fatigueEnabled: true,
                emotionalStateEnabled: true
            });
            
            // Simulate typing a sample text
            const sampleText = "The quick brown fox jumps over the lazy dog.";
            const session = await simulator.simulateTyping(sampleText, 'normal');
            
            // Display results
            const stats = simulator.getSessionStatistics();
            console.log(`WPM: ${stats.wpm}`);
            console.log(`Accuracy: ${stats.accuracy}%`);
            console.log(`Total Keystrokes: ${stats.totalKeystrokes}`);
            console.log(`Errors: ${stats.errorsCount}`);
            console.log(`Fatigue Level: ${(stats.fatigueLevel * 100).toFixed(1)}%`);
            console.log(`Emotional State: ${stats.emotionalState}`);
            
            // Show first few keystrokes for analysis
            console.log('\nSample Keystroke Data:');
            session.keystrokes.slice(0, 5).forEach((k, i) => {
                if (k.character) {
                    console.log(`  ${i + 1}. '${k.character}' - Dwell: ${k.dwellTime}ms, Flight: ${k.flightTime}ms, Pressure: ${k.pressure?.toFixed(2)}`);
                }
            });
        }
        
        console.log('\n=== Contextual Adaptation Demo ===');
        
        const contextSimulator = new AdvancedKeystrokeSimulator({
            userProfile: 'average'
        });
        
        const contexts = ['password', 'search', 'form', 'code', 'chat'];
        
        for (const context of contexts) {
            const session = await contextSimulator.simulateTyping('test123', context);
            const stats = contextSimulator.getSessionStatistics();
            console.log(`${context}: WPM=${stats.wpm}, Accuracy=${stats.accuracy}%`);
            contextSimulator.resetSession();
        }
        
        console.log('\nSimulation complete. Data can be exported for further analysis.');
    }
    
    demonstrateSimulator().catch(console.error);
}