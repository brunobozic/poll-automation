/**
 * Human Behavior Simulation Engine
 * Advanced human-like interaction patterns to avoid detection
 */

class HumanBehavior {
    constructor(options = {}) {
        this.options = {
            typingSpeed: options.typingSpeed || 'normal', // slow, normal, fast
            mouseMovement: options.mouseMovement !== false,
            randomPauses: options.randomPauses !== false,
            readingDelay: options.readingDelay !== false,
            errorSimulation: options.errorSimulation !== false,
            scrollBehavior: options.scrollBehavior !== false,
            ...options
        };
        
        this.userProfile = this.generateUserProfile();
    }
    
    /**
     * Generate user behavior profile
     */
    generateUserProfile() {
        const profiles = [
            {
                type: 'careful',
                typingSpeed: { min: 80, max: 150 }, // WPM
                errorRate: 0.02,
                readingSpeed: 250, // words per minute
                pauseProbability: 0.3,
                scrollSpeed: { min: 100, max: 300 }
            },
            {
                type: 'average',
                typingSpeed: { min: 120, max: 200 },
                errorRate: 0.04,
                readingSpeed: 200,
                pauseProbability: 0.2,
                scrollSpeed: { min: 200, max: 500 }
            },
            {
                type: 'fast',
                typingSpeed: { min: 180, max: 280 },
                errorRate: 0.06,
                readingSpeed: 180,
                pauseProbability: 0.1,
                scrollSpeed: { min: 300, max: 700 }
            }
        ];
        
        return profiles[Math.floor(Math.random() * profiles.length)];
    }
    
    /**
     * Human-like typing with realistic delays and errors
     */
    async humanType(page, selector, text, options = {}) {
        console.log(`⌨️ Human typing: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
        
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        
        // Ensure element is visible and focused
        await element.scrollIntoViewIfNeeded();
        await element.click();
        await this.randomDelay(100, 300);
        
        // Clear existing content if needed
        if (options.clearFirst) {
            await element.selectText();
            await this.randomDelay(50, 150);
        }
        
        const chars = text.split('');
        let currentText = '';
        
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            
            // Simulate typing errors
            if (this.options.errorSimulation && Math.random() < this.userProfile.errorRate) {
                // Type wrong character
                const wrongChar = this.getRandomChar();
                await element.type(wrongChar);
                currentText += wrongChar;
                
                // Pause to "notice" the error
                await this.randomDelay(200, 500);
                
                // Backspace to correct
                await page.keyboard.press('Backspace');
                currentText = currentText.slice(0, -1);
                await this.randomDelay(100, 200);
            }
            
            // Type the correct character
            await element.type(char);
            currentText += char;
            
            // Variable typing delay based on user profile
            const baseDelay = this.calculateTypingDelay(char, i, chars);
            await this.randomDelay(baseDelay * 0.8, baseDelay * 1.2);
            
            // Random pauses (thinking time)
            if (this.options.randomPauses && Math.random() < this.userProfile.pauseProbability) {
                await this.randomDelay(300, 800);
            }
        }
        
        console.log(`✅ Typed: "${text}"`);
    }
    
    /**
     * Calculate realistic typing delay for character
     */
    calculateTypingDelay(char, position, allChars) {
        const wpm = this.userProfile.typingSpeed.min + 
                   Math.random() * (this.userProfile.typingSpeed.max - this.userProfile.typingSpeed.min);
        
        const baseDelay = 60000 / (wpm * 5); // Convert WPM to ms per character
        
        // Adjust for character difficulty
        let multiplier = 1;
        
        if (char.match(/[A-Z]/)) multiplier *= 1.2; // Capitals slower
        if (char.match(/[0-9]/)) multiplier *= 1.1; // Numbers slightly slower
        if (char.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)) multiplier *= 1.3; // Symbols slower
        if (char === ' ') multiplier *= 0.8; // Spaces faster
        
        // First few characters slower (thinking)
        if (position < 3) multiplier *= 1.3;
        
        // Occasional longer pauses at word boundaries
        if (char === ' ' && Math.random() < 0.15) multiplier *= 2;
        
        return baseDelay * multiplier;
    }
    
    /**
     * Get random character for typing errors
     */
    getRandomChar() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return chars[Math.floor(Math.random() * chars.length)];
    }
    
    /**
     * Human-like mouse movement to element
     */
    async humanMouseMove(page, selector, options = {}) {
        if (!this.options.mouseMovement) {
            return;
        }
        
        console.log(`🖱️ Human mouse movement to: ${selector}`);
        
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        
        const box = await element.boundingBox();
        if (!box) {
            throw new Error(`Element not visible: ${selector}`);
        }
        
        // Get current mouse position (or use viewport center as start)
        const viewport = page.viewportSize();
        const startX = viewport.width / 2;
        const startY = viewport.height / 2;
        
        // Target position with some randomness
        const targetX = box.x + box.width / 2 + (Math.random() - 0.5) * 20;
        const targetY = box.y + box.height / 2 + (Math.random() - 0.5) * 20;
        
        // Generate curved path
        const steps = Math.floor(Math.random() * 20) + 15;
        const path = this.generateMousePath(startX, startY, targetX, targetY, steps);
        
        // Move mouse along path
        for (const point of path) {
            await page.mouse.move(point.x, point.y);
            await this.randomDelay(10, 30);
        }
        
        // Small pause before clicking
        await this.randomDelay(100, 200);
    }
    
    /**
     * Generate realistic curved mouse path
     */
    generateMousePath(startX, startY, endX, endY, steps) {
        const path = [];
        
        // Add control points for curve
        const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 100;
        const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 100;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            // Quadratic Bezier curve
            const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
            const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
            
            // Add small random variations
            path.push({
                x: x + (Math.random() - 0.5) * 5,
                y: y + (Math.random() - 0.5) * 5
            });
        }
        
        return path;
    }
    
    /**
     * Human-like clicking with realistic timing
     */
    async humanClick(page, selector, options = {}) {
        console.log(`👆 Human click: ${selector}`);
        
        // Move mouse to element first
        await this.humanMouseMove(page, selector);
        
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        
        // Ensure element is visible
        await element.scrollIntoViewIfNeeded();
        
        // Random pre-click delay
        await this.randomDelay(50, 150);
        
        // Click with realistic timing
        await element.click();
        
        // Post-click delay
        await this.randomDelay(100, 250);
        
        console.log(`✅ Clicked: ${selector}`);
    }
    
    /**
     * Human-like form filling
     */
    async humanFillForm(page, formData, options = {}) {
        console.log(`📝 Human form filling: ${Object.keys(formData).length} fields`);
        
        // Random order of field filling (sometimes people don't go in order)
        const fields = Object.entries(formData);
        if (Math.random() < 0.3) {
            // 30% chance to fill in random order
            this.shuffleArray(fields);
        }
        
        for (const [selector, value] of fields) {
            try {
                // Check if field exists and is visible
                const element = await page.$(selector);
                if (!element || !(await element.isVisible())) {
                    console.log(`⚠️ Skipping invisible field: ${selector}`);
                    continue;
                }
                
                // Reading delay (user reads the label)
                if (this.options.readingDelay) {
                    const label = await this.getFieldLabel(page, selector);
                    if (label) {
                        const readingTime = this.calculateReadingTime(label);
                        await this.randomDelay(readingTime * 0.8, readingTime * 1.2);
                    }
                }
                
                // Move to field and click
                await this.humanClick(page, selector);
                
                // Type value
                if (value) {
                    await this.humanType(page, selector, value.toString(), {
                        clearFirst: true
                    });
                }
                
                // Random delay between fields
                await this.randomDelay(300, 800);
                
            } catch (error) {
                console.log(`⚠️ Error filling field ${selector}: ${error.message}`);
            }
        }
        
        console.log(`✅ Form filled completely`);
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
                
                // Check for placeholder
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
        const readingTimeMs = (wordCount / this.userProfile.readingSpeed) * 60000;
        return Math.max(readingTimeMs, 200); // Minimum 200ms
    }
    
    /**
     * Human-like scrolling behavior
     */
    async humanScroll(page, options = {}) {
        if (!this.options.scrollBehavior) {
            return;
        }
        
        console.log(`📜 Human scrolling behavior`);
        
        const viewport = page.viewportSize();
        const scrollDistance = options.distance || (viewport.height * 0.3);
        const direction = options.direction || 'down';
        
        // Scroll in small increments
        const steps = Math.floor(Math.random() * 10) + 5;
        const stepDistance = scrollDistance / steps;
        
        for (let i = 0; i < steps; i++) {
            await page.mouse.wheel(0, direction === 'down' ? stepDistance : -stepDistance);
            await this.randomDelay(50, 150);
        }
        
        // Pause after scrolling (reading time)
        await this.randomDelay(500, 1500);
    }
    
    /**
     * Simulate reading page content
     */
    async simulateReading(page, options = {}) {
        console.log(`👁️ Simulating reading behavior`);
        
        // Get page text content
        const textContent = await page.evaluate(() => {
            return document.body.textContent.trim();
        });
        
        const wordCount = textContent.split(/\s+/).length;
        const readingTime = Math.min((wordCount / this.userProfile.readingSpeed) * 60000, 30000); // Max 30 seconds
        
        // Simulate reading with occasional scrolls
        const scrollCount = Math.floor(readingTime / 3000); // Scroll every ~3 seconds
        
        for (let i = 0; i < scrollCount; i++) {
            await this.randomDelay(2000, 4000);
            if (Math.random() < 0.7) { // 70% chance to scroll
                await this.humanScroll(page, { distance: 100 + Math.random() * 200 });
            }
        }
        
        console.log(`✅ Simulated reading for ${Math.round(readingTime / 1000)}s`);
    }
    
    /**
     * Random delay with human-like distribution
     */
    async randomDelay(min, max) {
        // Use normal distribution for more human-like timing
        const delay = this.normalRandom(min, max);
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
     * Shuffle array in place
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * Get user profile
     */
    getUserProfile() {
        return this.userProfile;
    }
}

module.exports = HumanBehavior;