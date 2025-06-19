/**
 * Unified Behavior Engine
 * Consolidates functionality from:
 * - neural-mouse-simulator.js
 * - advanced-keystroke-simulator.js
 * - human-behavior.js
 * - human-simulation.js
 * 
 * Provides unified human-like behavioral simulation
 */

const crypto = require('crypto');

class UnifiedBehaviorEngine {
    constructor(options = {}) {
        this.options = {
            mouseSimulation: options.mouseSimulation !== false,
            keystrokeSimulation: options.keystrokeSimulation !== false,
            personality: options.personality || 'adaptive',
            errorRate: options.errorRate || 0.02,
            learningEnabled: options.learningEnabled !== false,
            adaptationRate: options.adaptationRate || 0.1,
            browser: options.browser || null,
            debugMode: options.debugMode || false,
            ...options
        };

        // Personality profiles
        this.personalities = {
            cautious: {
                typingSpeed: { min: 80, max: 150, variance: 0.3 },
                mouseSpeed: { min: 100, max: 250, acceleration: 0.8 },
                pauseFrequency: 0.4,
                errorRate: 0.01,
                readingSpeed: 250,
                scrollBehavior: 'careful'
            },
            average: {
                typingSpeed: { min: 120, max: 200, variance: 0.2 },
                mouseSpeed: { min: 150, max: 400, acceleration: 1.0 },
                pauseFrequency: 0.2,
                errorRate: 0.03,
                readingSpeed: 200,
                scrollBehavior: 'normal'
            },
            confident: {
                typingSpeed: { min: 180, max: 280, variance: 0.15 },
                mouseSpeed: { min: 200, max: 600, acceleration: 1.2 },
                pauseFrequency: 0.1,
                errorRate: 0.05,
                readingSpeed: 180,
                scrollBehavior: 'fast'
            },
            expert: {
                typingSpeed: { min: 250, max: 350, variance: 0.1 },
                mouseSpeed: { min: 300, max: 800, acceleration: 1.5 },
                pauseFrequency: 0.05,
                errorRate: 0.02,
                readingSpeed: 300,
                scrollBehavior: 'efficient'
            },
            adaptive: {
                typingSpeed: { min: 120, max: 220, variance: 0.25 },
                mouseSpeed: { min: 150, max: 450, acceleration: 1.1 },
                pauseFrequency: 0.15,
                errorRate: 0.025,
                readingSpeed: 220,
                scrollBehavior: 'adaptive'
            }
        };

        // Current state
        this.currentPersonality = this.personalities[this.options.personality] || this.personalities.adaptive;
        this.sessionId = crypto.randomUUID();
        this.isInitialized = false;

        // Behavioral state
        this.behaviorState = {
            fatigue: 0,
            focus: 1.0,
            stress: 0,
            motivation: 0.8,
            experience: 0.5,
            consistency: 0.7
        };

        // Learning and adaptation
        this.learningData = {
            patterns: new Map(),
            adaptations: new Map(),
            performance: new Map()
        };

        // Statistics
        this.stats = {
            interactions: 0,
            keystrokes: 0,
            mouseMovements: 0,
            errorsSimulated: 0,
            adaptations: 0,
            avgResponseTime: 0,
            consistencyScore: 0.7
        };
    }

    /**
     * Initialize behavior engine
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🎭 Initializing Unified Behavior Engine...');

        try {
            // Initialize personality profile
            this.initializePersonality();
            
            // Load previous learning data
            if (this.options.learningEnabled) {
                await this.loadLearningData();
            }

            // Setup adaptation mechanisms
            this.setupAdaptationMechanisms();

            this.isInitialized = true;
            console.log(`✅ Behavior Engine initialized with ${this.options.personality} personality`);

        } catch (error) {
            console.error('❌ Behavior Engine initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Initialize personality profile
     */
    initializePersonality() {
        console.log(`🎭 Personality: ${this.options.personality}`);
        console.log(`   Typing Speed: ${this.currentPersonality.typingSpeed.min}-${this.currentPersonality.typingSpeed.max} WPM`);
        console.log(`   Mouse Speed: ${this.currentPersonality.mouseSpeed.min}-${this.currentPersonality.mouseSpeed.max} px/s`);
        console.log(`   Error Rate: ${(this.currentPersonality.errorRate * 100).toFixed(1)}%`);
        console.log(`   Pause Frequency: ${(this.currentPersonality.pauseFrequency * 100).toFixed(1)}%`);
    }

    /**
     * Setup adaptation mechanisms
     */
    setupAdaptationMechanisms() {
        // Gradual fatigue simulation
        setInterval(() => {
            this.updateBehaviorState();
        }, 60000); // Update every minute
    }

    /**
     * Update behavioral state based on time and interactions
     */
    updateBehaviorState() {
        // Simulate fatigue over time
        this.behaviorState.fatigue = Math.min(1.0, this.behaviorState.fatigue + 0.01);
        
        // Adjust focus based on fatigue
        this.behaviorState.focus = Math.max(0.3, 1.0 - this.behaviorState.fatigue * 0.5);
        
        // Update motivation based on success/failure patterns
        const recentPerformance = this.getRecentPerformance();
        if (recentPerformance.successRate > 0.8) {
            this.behaviorState.motivation = Math.min(1.0, this.behaviorState.motivation + 0.05);
        } else if (recentPerformance.successRate < 0.5) {
            this.behaviorState.motivation = Math.max(0.2, this.behaviorState.motivation - 0.1);
        }

        // Adapt personality based on current state
        this.adaptPersonalityToState();
    }

    /**
     * Adapt personality based on current behavioral state
     */
    adaptPersonalityToState() {
        const adaptation = this.options.adaptationRate;
        
        // Adjust typing speed based on fatigue and focus
        const speedMultiplier = this.behaviorState.focus * (1 - this.behaviorState.fatigue * 0.3);
        this.currentPersonality.typingSpeed.min *= (1 + (speedMultiplier - 1) * adaptation);
        this.currentPersonality.typingSpeed.max *= (1 + (speedMultiplier - 1) * adaptation);
        
        // Adjust error rate based on fatigue and stress
        const stressMultiplier = 1 + this.behaviorState.fatigue * 0.5 + this.behaviorState.stress * 0.3;
        this.currentPersonality.errorRate *= (1 + (stressMultiplier - 1) * adaptation);
        
        // Adjust pause frequency based on focus
        const pauseMultiplier = 1 + (1 - this.behaviorState.focus) * 0.5;
        this.currentPersonality.pauseFrequency *= (1 + (pauseMultiplier - 1) * adaptation);
    }

    /**
     * Simulate human typing with advanced dynamics
     */
    async simulateTyping(page, element, text, options = {}) {
        this.ensureInitialized();
        
        const startTime = Date.now();
        console.log(`⌨️ Typing: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);

        try {
            // Ensure element is ready
            await element.scrollIntoViewIfNeeded();
            await element.click();
            await this.naturalDelay(100, 300);

            // Clear existing content if needed
            if (options.clearFirst) {
                await this.clearFieldNaturally(page, element);
            }

            // Type with human-like patterns
            await this.typeWithHumanPatterns(page, element, text);

            const duration = Date.now() - startTime;
            this.stats.keystrokes += text.length;
            this.stats.interactions++;
            this.updateResponseTime(duration);

            console.log(`   ✅ Typed in ${duration}ms`);
            return { success: true, duration, keystrokes: text.length };

        } catch (error) {
            console.error(`   ❌ Typing failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Type with human patterns including errors and corrections
     */
    async typeWithHumanPatterns(page, element, text) {
        const chars = text.split('');
        let currentText = '';

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];

            // Simulate typing errors
            if (this.shouldMakeError()) {
                const wrongChar = this.generateTypingError(char);
                await element.type(wrongChar);
                currentText += wrongChar;

                // Notice the error with human-like delay
                await this.naturalDelay(200, 800);

                // Correct the error
                await page.keyboard.press('Backspace');
                currentText = currentText.slice(0, -1);
                await this.naturalDelay(100, 300);

                this.stats.errorsSimulated++;
            }

            // Type the correct character
            await element.type(char);
            currentText += char;

            // Calculate dynamic delay based on character and context
            const delay = this.calculateTypingDelay(char, i, chars);
            await this.naturalDelay(delay * 0.8, delay * 1.2);

            // Random pauses for thinking
            if (this.shouldPause()) {
                await this.naturalDelay(300, 1000);
            }

            // Word boundary pause
            if (char === ' ' && Math.random() < 0.1) {
                await this.naturalDelay(200, 600);
            }
        }
    }

    /**
     * Calculate dynamic typing delay
     */
    calculateTypingDelay(char, position, allChars) {
        const baseWPM = this.currentPersonality.typingSpeed.min + 
                       Math.random() * (this.currentPersonality.typingSpeed.max - this.currentPersonality.typingSpeed.min);
        
        const adjustedWPM = baseWPM * this.behaviorState.focus * (1 - this.behaviorState.fatigue * 0.2);
        let baseDelay = 60000 / (adjustedWPM * 5); // Convert WPM to ms per character

        // Character difficulty adjustments
        let multiplier = 1;
        
        if (char.match(/[A-Z]/)) multiplier *= 1.3; // Capitals slower
        if (char.match(/[0-9]/)) multiplier *= 1.15; // Numbers slightly slower
        if (char.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)) multiplier *= 1.4; // Symbols slower
        if (char === ' ') multiplier *= 0.7; // Spaces faster

        // Position-based adjustments
        if (position < 3) multiplier *= 1.4; // Start slower
        if (position > allChars.length - 3) multiplier *= 1.2; // End slightly slower

        // Digraph and trigraph effects
        if (position > 0) {
            const prevChar = allChars[position - 1];
            const digraph = prevChar + char;
            
            // Common digraphs are faster
            const commonDigraphs = ['th', 'he', 'in', 'er', 'an', 're', 'ed', 'nd', 'ou', 'ea'];
            if (commonDigraphs.includes(digraph.toLowerCase())) {
                multiplier *= 0.85;
            }
            
            // Same finger sequences are slower
            if (this.isSameFingerSequence(prevChar, char)) {
                multiplier *= 1.3;
            }
        }

        return Math.max(50, baseDelay * multiplier);
    }

    /**
     * Simulate human mouse movement with neural patterns
     */
    async simulateMouseMovement(page, targetElement, options = {}) {
        this.ensureInitialized();

        if (!this.options.mouseSimulation) {
            await targetElement.click();
            return { success: true, path: [], duration: 0 };
        }

        const startTime = Date.now();
        console.log(`🖱️ Mouse movement to target element`);

        try {
            // Get target position
            const boundingBox = await targetElement.boundingBox();
            if (!boundingBox) {
                throw new Error('Target element not visible');
            }

            // Calculate target position with some randomness
            const targetX = boundingBox.x + boundingBox.width / 2 + (Math.random() - 0.5) * 20;
            const targetY = boundingBox.y + boundingBox.height / 2 + (Math.random() - 0.5) * 20;

            // Get current mouse position (estimated)
            const startX = Math.random() * 1920; // Assume common screen width
            const startY = Math.random() * 1080; // Assume common screen height

            // Generate human-like path
            const path = this.generateMousePath(startX, startY, targetX, targetY, options);

            // Execute movement
            await this.executeMousePath(page, path);

            // Click with human-like timing
            await this.naturalDelay(50, 200);
            await targetElement.click();
            await this.naturalDelay(100, 300);

            const duration = Date.now() - startTime;
            this.stats.mouseMovements++;
            this.stats.interactions++;

            console.log(`   ✅ Mouse movement completed in ${duration}ms`);
            return { success: true, path: path, duration: duration };

        } catch (error) {
            console.error(`   ❌ Mouse movement failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate human-like mouse path
     */
    generateMousePath(startX, startY, endX, endY, options = {}) {
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const steps = Math.max(10, Math.min(50, Math.floor(distance / 20)));
        
        // Apply personality-based speed
        const speed = this.currentPersonality.mouseSpeed.min + 
                     Math.random() * (this.currentPersonality.mouseSpeed.max - this.currentPersonality.mouseSpeed.min);
        
        const adjustedSpeed = speed * this.behaviorState.focus * (1 - this.behaviorState.fatigue * 0.15);
        
        const path = [];
        
        // Generate control points for smooth curve
        const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 100;
        const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 100;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            // Quadratic Bezier curve
            const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
            const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
            
            // Add natural variation
            const noiseX = (Math.random() - 0.5) * 3;
            const noiseY = (Math.random() - 0.5) * 3;
            
            // Calculate timing based on distance and speed
            const segmentDistance = i > 0 ? 
                Math.sqrt(Math.pow(x - path[i-1].x, 2) + Math.pow(y - path[i-1].y, 2)) : 0;
            const delay = segmentDistance / adjustedSpeed * 1000;
            
            path.push({
                x: x + noiseX,
                y: y + noiseY,
                delay: Math.max(10, delay)
            });
        }
        
        return path;
    }

    /**
     * Execute mouse path
     */
    async executeMousePath(page, path) {
        for (const point of path) {
            await page.mouse.move(point.x, point.y);
            await this.naturalDelay(point.delay * 0.5, point.delay * 1.5);
        }
    }

    /**
     * Fill form with unified behavioral simulation
     */
    async fillFormWithBehavior(page, formData, options = {}) {
        this.ensureInitialized();

        console.log(`📝 Filling form with ${Object.keys(formData).length} fields`);
        const startTime = Date.now();

        try {
            // Analyze form complexity
            const complexity = await this.analyzeFormComplexity(page, formData);
            
            // Adapt behavior based on complexity
            this.adaptBehaviorToComplexity(complexity);

            // Randomize field order if appropriate
            const fields = Object.entries(formData);
            if (complexity.simple && Math.random() < 0.3) {
                this.shuffleArray(fields);
            }

            let fieldsCompleted = 0;

            for (const [selector, value] of fields) {
                try {
                    const element = await page.$(selector);
                    if (!element || !(await element.isVisible())) {
                        console.log(`   ⚠️ Skipping invisible field: ${selector}`);
                        continue;
                    }

                    // Pre-field analysis and preparation
                    await this.prepareForFieldInteraction(page, element, selector);

                    // Move to field with mouse simulation
                    await this.simulateMouseMovement(page, element);

                    // Fill field with typing simulation
                    await this.simulateTyping(page, element, value.toString(), {
                        clearFirst: true
                    });

                    fieldsCompleted++;

                    // Inter-field delay
                    await this.naturalDelay(300, 1000);

                } catch (error) {
                    console.log(`   ⚠️ Error filling field ${selector}: ${error.message}`);
                    continue;
                }
            }

            const duration = Date.now() - startTime;
            console.log(`   ✅ Form completed: ${fieldsCompleted} fields in ${duration}ms`);

            return {
                success: true,
                fieldsCompleted: fieldsCompleted,
                duration: duration,
                complexity: complexity
            };

        } catch (error) {
            console.error(`   ❌ Form filling failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze form complexity
     */
    async analyzeFormComplexity(page, formData) {
        const fieldCount = Object.keys(formData).length;
        
        // Analyze page structure
        const pageAnalysis = await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input, select, textarea');
            const labels = document.querySelectorAll('label');
            
            return {
                formCount: forms.length,
                inputCount: inputs.length,
                labelCount: labels.length,
                hasProgressBar: !!document.querySelector('.progress, [class*="progress"]'),
                hasMultipleSteps: !!document.querySelector('[class*="step"], [class*="page"]')
            };
        });

        return {
            fieldCount: fieldCount,
            simple: fieldCount <= 3 && pageAnalysis.formCount === 1,
            medium: fieldCount > 3 && fieldCount <= 8,
            complex: fieldCount > 8 || pageAnalysis.hasMultipleSteps,
            hasLabels: pageAnalysis.labelCount > 0,
            hasProgressIndicator: pageAnalysis.hasProgressBar,
            multiStep: pageAnalysis.hasMultipleSteps
        };
    }

    /**
     * Adapt behavior to form complexity
     */
    adaptBehaviorToComplexity(complexity) {
        if (complexity.complex) {
            // Slower, more careful approach for complex forms
            this.behaviorState.focus = Math.min(1.0, this.behaviorState.focus + 0.1);
            this.currentPersonality.pauseFrequency *= 1.3;
        } else if (complexity.simple) {
            // Faster approach for simple forms
            this.behaviorState.motivation = Math.min(1.0, this.behaviorState.motivation + 0.05);
            this.currentPersonality.pauseFrequency *= 0.8;
        }
    }

    /**
     * Prepare for field interaction
     */
    async prepareForFieldInteraction(page, element, selector) {
        // Reading delay for field labels
        const label = await this.getFieldLabel(page, selector);
        if (label && this.currentPersonality.readingSpeed > 0) {
            const readingTime = this.calculateReadingTime(label);
            await this.naturalDelay(readingTime * 0.7, readingTime * 1.3);
        }

        // Scroll element into view if needed
        await element.scrollIntoViewIfNeeded();
        
        // Brief pause before interaction
        await this.naturalDelay(100, 400);
    }

    /**
     * Get field label for reading time calculation
     */
    async getFieldLabel(page, selector) {
        try {
            return await page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (!element) return null;

                // Try to find associated label
                const id = element.id;
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label) return label.textContent.trim();
                }

                // Check parent for label
                const parent = element.parentElement;
                if (parent) {
                    const label = parent.querySelector('label');
                    if (label) return label.textContent.trim();
                }

                // Check for placeholder or name
                return element.placeholder || element.name || '';
            }, selector);
        } catch (error) {
            return null;
        }
    }

    /**
     * Calculate reading time for text
     */
    calculateReadingTime(text) {
        const wordCount = text.split(/\s+/).length;
        const readingTimeMs = (wordCount / this.currentPersonality.readingSpeed) * 60000;
        return Math.max(200, Math.min(readingTimeMs, 3000)); // 200ms to 3s range
    }

    /**
     * Clear field naturally
     */
    async clearFieldNaturally(page, element) {
        // Select all text first
        await element.selectText();
        await this.naturalDelay(50, 150);
        
        // Delete with backspace (more human-like than clear)
        await page.keyboard.press('Backspace');
        await this.naturalDelay(50, 100);
    }

    /**
     * Natural delay with personality variation
     */
    async naturalDelay(min = 100, max = 500) {
        // Apply personality and state modifications
        const focusMultiplier = 0.5 + this.behaviorState.focus * 0.5;
        const fatigueMultiplier = 1 + this.behaviorState.fatigue * 0.3;
        
        const adjustedMin = min * focusMultiplier * fatigueMultiplier;
        const adjustedMax = max * focusMultiplier * fatigueMultiplier;
        
        // Use normal distribution for more human-like timing
        const delay = this.normalRandom(adjustedMin, adjustedMax);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Generate normal distributed random number
     */
    normalRandom(min, max) {
        const mean = (min + max) / 2;
        const stdDev = (max - min) / 6; // 99.7% within range
        
        // Box-Muller transformation
        const u = Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        
        const result = mean + z * stdDev;
        return Math.max(min, Math.min(max, result));
    }

    /**
     * Decision methods
     */
    shouldMakeError() {
        const adjustedErrorRate = this.currentPersonality.errorRate * 
                                 (1 + this.behaviorState.fatigue * 0.5 + this.behaviorState.stress * 0.3);
        return Math.random() < adjustedErrorRate;
    }

    shouldPause() {
        const adjustedPauseRate = this.currentPersonality.pauseFrequency * 
                                 (1 + (1 - this.behaviorState.focus) * 0.5);
        return Math.random() < adjustedPauseRate;
    }

    /**
     * Generate typing error
     */
    generateTypingError(char) {
        const adjacentKeys = {
            'a': ['q', 's', 'z'],
            'b': ['v', 'g', 'h', 'n'],
            'c': ['x', 'd', 'f', 'v'],
            'd': ['s', 'e', 'r', 'f', 'c', 'x'],
            'e': ['w', 's', 'd', 'r'],
            'f': ['d', 'r', 't', 'g', 'v', 'c'],
            // ... more mappings for full keyboard
        };
        
        const adjacent = adjacentKeys[char.toLowerCase()] || [];
        if (adjacent.length > 0) {
            return adjacent[Math.floor(Math.random() * adjacent.length)];
        }
        
        // Random character if no adjacent key mapping
        return String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }

    /**
     * Check if two characters use the same finger
     */
    isSameFingerSequence(char1, char2) {
        const fingerMap = {
            'q': 0, 'a': 0, 'z': 0,
            'w': 1, 's': 1, 'x': 1,
            'e': 2, 'd': 2, 'c': 2,
            'r': 3, 'f': 3, 'v': 3, 't': 3, 'g': 3, 'b': 3,
            'y': 6, 'h': 6, 'n': 6, 'u': 6, 'j': 6, 'm': 6,
            'i': 7, 'k': 7,
            'o': 8, 'l': 8,
            'p': 9
        };
        
        return fingerMap[char1.toLowerCase()] === fingerMap[char2.toLowerCase()];
    }

    /**
     * Shuffle array in place
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Learning and adaptation methods
     */
    async loadLearningData() {
        // Implementation would load previous behavioral patterns
        console.log('📚 Loading behavioral learning data...');
    }

    async saveLearningData() {
        // Implementation would save learned behavioral patterns
        console.log('💾 Saving behavioral learning data...');
    }

    getRecentPerformance() {
        // Calculate recent performance metrics
        return {
            successRate: 0.8, // Placeholder
            avgResponseTime: this.stats.avgResponseTime,
            errorRate: this.stats.errorsSimulated / this.stats.keystrokes
        };
    }

    updateResponseTime(duration) {
        this.stats.avgResponseTime = (this.stats.avgResponseTime + duration) / 2;
    }

    /**
     * Test capabilities
     */
    async testCapabilities() {
        this.ensureInitialized();

        try {
            // Test personality switching
            const originalPersonality = this.options.personality;
            this.setPersonality('expert');
            this.setPersonality(originalPersonality);

            // Test behavioral state simulation
            this.updateBehaviorState();

            // Test timing calculations
            const testDelay = this.calculateTypingDelay('a', 0, ['a', 'b', 'c']);

            return {
                success: true,
                personality: this.options.personality,
                behaviorState: this.behaviorState,
                testDelay: testDelay,
                stats: this.getStats()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Set personality
     */
    setPersonality(personality) {
        if (this.personalities[personality]) {
            this.options.personality = personality;
            this.currentPersonality = this.personalities[personality];
            console.log(`🎭 Personality changed to: ${personality}`);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            personality: this.options.personality,
            behaviorState: this.behaviorState,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Utility methods
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Behavior Engine not initialized. Call initialize() first.');
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Unified Behavior Engine...');
        
        try {
            // Save learning data
            if (this.options.learningEnabled) {
                await this.saveLearningData();
            }
            
            // Clear learning data
            this.learningData.patterns.clear();
            this.learningData.adaptations.clear();
            this.learningData.performance.clear();
            
            this.isInitialized = false;
            console.log('✅ Behavior Engine cleanup complete');
            
        } catch (error) {
            console.error('❌ Behavior Engine cleanup error:', error.message);
        }
    }
}

module.exports = UnifiedBehaviorEngine;