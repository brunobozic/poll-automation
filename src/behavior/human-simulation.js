class HumanSimulation {
  constructor() {
    this.baseReadingSpeed = 250; // words per minute (average human)
    this.baseThinkingTime = 2000; // ms to think about a question
    this.fatigueLevel = 0; // increases over time, affects response speed
    this.sessionStartTime = Date.now();
  }

  // Calculate reading time based on text length
  calculateReadingTime(text) {
    const wordCount = text.split(/\s+/).length;
    const baseTime = (wordCount / this.baseReadingSpeed) * 60 * 1000; // convert to ms
    
    // Add randomness (+/- 30%)
    const variance = 0.3;
    const randomFactor = 1 + (Math.random() - 0.5) * variance * 2;
    
    // Factor in fatigue (longer sessions = slower reading)
    const fatigueMultiplier = 1 + (this.fatigueLevel * 0.2);
    
    return Math.max(500, baseTime * randomFactor * fatigueMultiplier);
  }

  // Simulate thinking time for different question types
  calculateThinkingTime(questionType = 'multiple-choice', complexity = 'medium') {
    let baseTime = this.baseThinkingTime;
    
    // Adjust for question type
    const typeMultipliers = {
      'multiple-choice': 1.0,
      'rating-scale': 0.8,
      'yes-no': 0.6,
      'text-input': 1.5,
      'ranking': 1.8,
      'matrix': 2.0
    };
    
    // Adjust for complexity
    const complexityMultipliers = {
      'simple': 0.7,
      'medium': 1.0,
      'complex': 1.4
    };
    
    baseTime *= (typeMultipliers[questionType] || 1.0);
    baseTime *= (complexityMultipliers[complexity] || 1.0);
    
    // Add randomness and fatigue
    const randomFactor = 0.5 + Math.random(); // 0.5x to 1.5x
    const fatigueMultiplier = 1 + (this.fatigueLevel * 0.3);
    
    return Math.max(800, baseTime * randomFactor * fatigueMultiplier);
  }

  // Simulate typing speed with realistic variations
  calculateTypingTime(text) {
    const avgTypingSpeed = 40; // words per minute (average)
    const wordCount = text.split(/\s+/).length;
    
    let typingTime = (wordCount / avgTypingSpeed) * 60 * 1000;
    
    // Add pauses for punctuation and thinking
    const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
    typingTime += punctuationCount * (200 + Math.random() * 500);
    
    // Add random pauses (backspacing, corrections)
    const errorRate = 0.05; // 5% chance of error per word
    const corrections = Math.floor(wordCount * errorRate * Math.random());
    typingTime += corrections * (1000 + Math.random() * 2000);
    
    return Math.max(text.length * 50, typingTime); // minimum 50ms per character
  }

  // Simulate realistic delays between actions
  async simulateActionDelay(actionType = 'click') {
    const delays = {
      'click': [200, 800],
      'type': [100, 400],
      'scroll': [500, 1500],
      'navigate': [1000, 3000],
      'read': [2000, 5000]
    };
    
    const [min, max] = delays[actionType] || [200, 800];
    const baseDelay = min + Math.random() * (max - min);
    
    // Add fatigue effect
    const fatigueDelay = this.fatigueLevel * 500;
    
    const totalDelay = baseDelay + fatigueDelay;
    await this.sleep(totalDelay);
    
    // Increase fatigue slightly
    this.increaseFatigue();
  }

  // Simulate human-like page interaction patterns
  async simulatePageBehavior(page) {
    // Random chance to scroll around the page first
    if (Math.random() < 0.3) {
      await this.randomScroll(page);
    }
    
    // Pause to "read" the page
    await this.sleep(1000 + Math.random() * 2000);
    
    // Small chance to go back and re-read something
    if (Math.random() < 0.1) {
      await page.mouse.wheel(0, -200 - Math.random() * 300);
      await this.sleep(500 + Math.random() * 1000);
    }
  }

  // Random scrolling patterns
  async randomScroll(page) {
    const scrollActions = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < scrollActions; i++) {
      const scrollAmount = 100 + Math.random() * 400;
      const direction = Math.random() < 0.8 ? 1 : -1; // mostly scroll down
      
      await page.mouse.wheel(0, scrollAmount * direction);
      await this.sleep(300 + Math.random() * 700);
    }
  }

  // Simulate realistic mouse movements
  async simulateMouseMovement(page, targetSelector) {
    try {
      const element = await page.locator(targetSelector);
      const box = await element.boundingBox();
      
      if (!box) return;
      
      // Get current mouse position (approximate)
      const currentPos = { x: Math.random() * 1366, y: Math.random() * 768 };
      
      // Calculate target position with some randomness
      const targetX = box.x + (box.width * (0.3 + Math.random() * 0.4));
      const targetY = box.y + (box.height * (0.3 + Math.random() * 0.4));
      
      // Move in steps for natural movement
      const steps = 3 + Math.floor(Math.random() * 5);
      
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = currentPos.x + (targetX - currentPos.x) * progress;
        const y = currentPos.y + (targetY - currentPos.y) * progress;
        
        // Add small random deviations
        const jitterX = (Math.random() - 0.5) * 10;
        const jitterY = (Math.random() - 0.5) * 10;
        
        await page.mouse.move(x + jitterX, y + jitterY);
        await this.sleep(20 + Math.random() * 80);
      }
      
      // Small pause before clicking
      await this.sleep(100 + Math.random() * 300);
    } catch (error) {
      console.error('Mouse movement simulation failed:', error);
    }
  }

  // Simulate human typing with realistic pauses and errors
  async simulateTyping(page, selector, text) {
    await page.click(selector);
    await this.sleep(200 + Math.random() * 400);
    
    // Clear existing text
    await page.keyboard.press('Control+A');
    await this.sleep(50);
    
    let currentText = '';
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Type word character by character
      for (const char of word) {
        // Small chance of typo
        if (Math.random() < 0.03) {
          // Type wrong character then correct it
          const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          await page.keyboard.type(wrongChar);
          await this.sleep(100 + Math.random() * 200);
          
          await page.keyboard.press('Backspace');
          await this.sleep(100 + Math.random() * 300);
        }
        
        await page.keyboard.type(char);
        currentText += char;
        
        // Variable typing speed
        await this.sleep(80 + Math.random() * 120);
      }
      
      // Add space between words (except last word)
      if (i < words.length - 1) {
        await page.keyboard.type(' ');
        currentText += ' ';
        
        // Longer pause between words
        await this.sleep(150 + Math.random() * 250);
      }
      
      // Occasional longer pauses (thinking)
      if (Math.random() < 0.1) {
        await this.sleep(500 + Math.random() * 1500);
      }
    }
  }

  // Track fatigue over session duration
  increaseFatigue() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const hoursElapsed = sessionDuration / (1000 * 60 * 60);
    
    // Fatigue increases over time, peaks around 2-3 hours
    this.fatigueLevel = Math.min(1.0, hoursElapsed * 0.2);
  }

  // Reset fatigue (simulate break)
  takeBreak() {
    this.fatigueLevel = Math.max(0, this.fatigueLevel - 0.3);
    console.log('Taking a break, fatigue reduced to:', this.fatigueLevel);
  }

  // Utility sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current behavioral state
  getBehaviorState() {
    return {
      fatigueLevel: this.fatigueLevel,
      sessionDuration: Date.now() - this.sessionStartTime,
      estimatedSpeed: this.baseReadingSpeed * (1 - this.fatigueLevel * 0.2)
    };
  }
}

module.exports = HumanSimulation;