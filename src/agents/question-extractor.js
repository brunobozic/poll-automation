const TrickQuestionDetector = require('../detection/trick-questions');
const HumanSimulation = require('../behavior/human-simulation');

class QuestionExtractor {
  constructor() {
    this.trickDetector = new TrickQuestionDetector();
    this.humanSim = new HumanSimulation();
    this.questionCache = new Map(); // Cache questions by page URL
  }

  // Main function to extract ALL questions from current page
  async extractAllQuestions(page, siteConfig = {}) {
    try {
      console.log('Starting comprehensive question extraction...');
      
      const pageUrl = page.url();
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await this.humanSim.simulatePageBehavior(page);

      // Get all questions using multiple strategies
      const questions = await this.findAllQuestions(page, siteConfig);
      
      // Validate we found questions
      if (questions.length === 0) {
        console.log('⚠️  No questions found on page');
        return [];
      }

      // Process each question
      const processedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // Check for trick questions
        const trickAnalysis = this.trickDetector.detectTrickQuestion(question.text, question.options);
        
        const processedQuestion = {
          ...question,
          index: i,
          pageUrl: pageUrl,
          isTrick: trickAnalysis.isTrick,
          trickFlags: trickAnalysis.flags,
          humanResponse: trickAnalysis.humanResponse,
          element: question.element, // Keep reference to DOM element
          isAnswered: false,
          isRequired: question.required
        };

        processedQuestions.push(processedQuestion);
        
        if (trickAnalysis.isTrick) {
          console.log(`🚨 Trick question detected: "${question.text}"`);
          console.log(`   Flags: ${trickAnalysis.flags.join(', ')}`);
        }
      }

      // Cache questions for this page
      this.questionCache.set(pageUrl, processedQuestions);
      
      console.log(`✅ Extracted ${processedQuestions.length} questions`);
      console.log(`   - ${processedQuestions.filter(q => q.isTrick).length} trick questions detected`);
      console.log(`   - ${processedQuestions.filter(q => q.isRequired).length} required questions`);
      
      return processedQuestions;

    } catch (error) {
      console.error('Question extraction failed:', error);
      return [];
    }
  }

  // Find all questions using comprehensive strategies
  async findAllQuestions(page, siteConfig) {
    const questions = [];
    const foundElements = new Set(); // Prevent duplicates

    // Strategy 1: Form-based extraction (most reliable)
    const formQuestions = await this.extractFromForms(page);
    this.addUniqueQuestions(questions, formQuestions, foundElements);

    // Strategy 2: Configured selectors
    if (siteConfig.poll_selectors) {
      const configQuestions = await this.extractFromSelectors(page, siteConfig.poll_selectors);
      this.addUniqueQuestions(questions, configQuestions, foundElements);
    }

    // Strategy 3: Common patterns
    const patternQuestions = await this.extractFromPatterns(page);
    this.addUniqueQuestions(questions, patternQuestions, foundElements);

    // Strategy 4: Text analysis
    const textQuestions = await this.extractFromTextAnalysis(page);
    this.addUniqueQuestions(questions, textQuestions, foundElements);

    return questions;
  }

  // Extract questions from form elements
  async extractFromForms(page) {
    const questions = [];

    try {
      const forms = await page.$$('form');
      
      for (const form of forms) {
        // Look for question groups within forms
        const questionGroups = await this.findQuestionGroups(form);
        
        for (const group of questionGroups) {
          const question = await this.processQuestionGroup(group, page);
          if (question) {
            questions.push(question);
          }
        }
      }

    } catch (error) {
      console.error('Form extraction error:', error);
    }

    return questions;
  }

  // Find logical question groups in forms
  async findQuestionGroups(form) {
    const groups = [];

    try {
      // Common question grouping patterns
      const groupSelectors = [
        'fieldset',
        '.question',
        '.form-group',
        '.poll-question',
        '.survey-question',
        '[data-question]',
        '.question-container',
        '[class*="question"]'
      ];

      for (const selector of groupSelectors) {
        const elements = await form.$$(selector);
        for (const element of elements) {
          groups.push(element);
        }
      }

      // If no grouped elements, look for individual inputs with labels
      if (groups.length === 0) {
        const inputs = await form.$$('input[type="radio"], input[type="checkbox"], select, textarea');
        
        // Group inputs by name attribute
        const inputGroups = new Map();
        
        for (const input of inputs) {
          const name = await input.getAttribute('name');
          if (name) {
            if (!inputGroups.has(name)) {
              inputGroups.set(name, []);
            }
            inputGroups.get(name).push(input);
          } else {
            // Individual input without group
            groups.push(input);
          }
        }

        // Add grouped inputs
        for (const [name, inputs] of inputGroups) {
          if (inputs.length > 1) {
            // Multiple inputs with same name = question group
            groups.push(inputs[0]); // Use first input as representative
          } else {
            groups.push(inputs[0]);
          }
        }
      }

    } catch (error) {
      console.error('Question group finding error:', error);
    }

    return groups;
  }

  // Process individual question group
  async processQuestionGroup(element, page) {
    try {
      // Extract question text
      const questionText = await this.extractQuestionText(element);
      if (!questionText || questionText.trim().length < 3) {
        return null; // Skip if no meaningful question text
      }

      // Determine question type and extract options
      const { type, options, inputElements } = await this.analyzeQuestionType(element);
      
      // Check if required
      const isRequired = await this.isQuestionRequired(element);

      return {
        text: questionText.trim(),
        type: type,
        options: options,
        required: isRequired,
        element: element,
        inputElements: inputElements
      };

    } catch (error) {
      console.error('Question processing error:', error);
      return null;
    }
  }

  // Extract question text from element
  async extractQuestionText(element) {
    try {
      // Try various methods to get question text
      const textSources = [
        // Direct text content
        async () => {
          const text = await element.textContent();
          return this.cleanQuestionText(text);
        },
        
        // Label elements
        async () => {
          const labels = await element.$$('label');
          if (labels.length > 0) {
            const labelText = await labels[0].textContent();
            return this.cleanQuestionText(labelText);
          }
          return null;
        },
        
        // Legend elements (for fieldsets)
        async () => {
          const legend = await element.$('legend');
          if (legend) {
            const legendText = await legend.textContent();
            return this.cleanQuestionText(legendText);
          }
          return null;
        },
        
        // Heading elements
        async () => {
          const headings = await element.$$('h1, h2, h3, h4, h5, h6');
          if (headings.length > 0) {
            const headingText = await headings[0].textContent();
            return this.cleanQuestionText(headingText);
          }
          return null;
        },
        
        // Elements with question-related classes
        async () => {
          const questionEl = await element.$('[class*="question"], [class*="title"], .prompt');
          if (questionEl) {
            const qText = await questionEl.textContent();
            return this.cleanQuestionText(qText);
          }
          return null;
        }
      ];

      for (const source of textSources) {
        const text = await source();
        if (text && text.length > 0) {
          return text;
        }
      }

      return null;

    } catch (error) {
      console.error('Question text extraction error:', error);
      return null;
    }
  }

  // Clean and normalize question text
  cleanQuestionText(text) {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\d+\.\s*/, '') // Remove question numbers
      .replace(/^[-*]\s*/, '') // Remove bullet points
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();
  }

  // Analyze question type and extract options
  async analyzeQuestionType(element) {
    try {
      const inputElements = [];
      const options = [];

      // Find all input elements
      const inputs = await element.$$('input, select, textarea');
      
      let type = 'text'; // default
      
      for (const input of inputs) {
        const inputType = await input.getAttribute('type');
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        
        inputElements.push(input);

        if (tagName === 'select') {
          type = 'single-choice';
          const selectOptions = await input.$$('option');
          for (const option of selectOptions) {
            const value = await option.getAttribute('value');
            const text = await option.textContent();
            if (value && text) {
              options.push({ value, label: text.trim() });
            }
          }
        } else if (inputType === 'radio') {
          type = 'single-choice';
          const value = await input.getAttribute('value');
          const label = await this.getInputLabel(input);
          if (value && label) {
            options.push({ value, label });
          }
        } else if (inputType === 'checkbox') {
          type = 'multiple-choice';
          const value = await input.getAttribute('value');
          const label = await this.getInputLabel(input);
          if (value && label) {
            options.push({ value, label });
          }
        } else if (inputType === 'range' || inputType === 'number') {
          type = 'rating';
          const min = await input.getAttribute('min') || '1';
          const max = await input.getAttribute('max') || '10';
          for (let i = parseInt(min); i <= parseInt(max); i++) {
            options.push({ value: i.toString(), label: i.toString() });
          }
        } else if (tagName === 'textarea' || inputType === 'text') {
          type = 'text';
        }
      }

      // Special case: yes/no questions
      if (type === 'single-choice' && options.length === 2) {
        const labels = options.map(o => o.label.toLowerCase());
        if (labels.some(l => l.includes('yes')) && labels.some(l => l.includes('no'))) {
          type = 'yes-no';
        }
      }

      return { type, options, inputElements };

    } catch (error) {
      console.error('Question type analysis error:', error);
      return { type: 'text', options: [], inputElements: [] };
    }
  }

  // Get label for input element
  async getInputLabel(input) {
    try {
      // Method 1: Associated label
      const id = await input.getAttribute('id');
      if (id) {
        const label = await input.$(`xpath=//label[@for="${id}"]`);
        if (label) {
          const text = await label.textContent();
          return text.trim();
        }
      }

      // Method 2: Parent label
      const parentLabel = await input.$('xpath=ancestor::label[1]');
      if (parentLabel) {
        const text = await parentLabel.textContent();
        return text.trim();
      }

      // Method 3: Next sibling text
      const nextSibling = await input.$('xpath=following-sibling::*[1][self::label or self::span or self::div]');
      if (nextSibling) {
        const text = await nextSibling.textContent();
        return text.trim();
      }

      // Method 4: Parent element text
      const parent = await input.$('xpath=..');
      if (parent) {
        const text = await parent.textContent();
        return text.trim();
      }

      return await input.getAttribute('value') || '';

    } catch (error) {
      return '';
    }
  }

  // Check if question is required
  async isQuestionRequired(element) {
    try {
      // Check for required attribute
      const requiredInput = await element.$('[required]');
      if (requiredInput) return true;

      // Check for required classes
      const requiredClasses = await element.$('.required, [class*="required"]');
      if (requiredClasses) return true;

      // Check for asterisk or "required" text
      const text = await element.textContent();
      if (text.includes('*') || text.toLowerCase().includes('required')) {
        return true;
      }

      return false;

    } catch (error) {
      return false;
    }
  }

  // Add unique questions to array
  addUniqueQuestions(questions, newQuestions, foundElements) {
    for (const question of newQuestions) {
      if (question && question.element) {
        const elementId = question.element.toString();
        if (!foundElements.has(elementId)) {
          foundElements.add(elementId);
          questions.push(question);
        }
      }
    }
  }

  // Extract from configured selectors
  async extractFromSelectors(page, selectors) {
    // Implementation for configured selectors
    return [];
  }

  // Extract from common patterns
  async extractFromPatterns(page) {
    // Implementation for pattern-based extraction
    return [];
  }

  // Extract from text analysis
  async extractFromTextAnalysis(page) {
    // Implementation for text-based extraction
    return [];
  }

  // Get cached questions for page
  getCachedQuestions(pageUrl) {
    return this.questionCache.get(pageUrl) || [];
  }

  // Clear cache
  clearCache() {
    this.questionCache.clear();
  }
}

module.exports = QuestionExtractor;