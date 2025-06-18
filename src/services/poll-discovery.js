const HumanSimulation = require('../behavior/human-simulation');
const DatabaseManager = require('../database/manager');

class PollDiscoveryService {
  constructor() {
    this.db = new DatabaseManager();
    this.humanSim = new HumanSimulation();
  }

  async initialize() {
    await this.db.connect();
  }

  // Main function to discover polls on a site
  async discoverPolls(siteId, authSession) {
    try {
      console.log(`Starting poll discovery for site ID: ${siteId}`);
      
      const siteConfig = await this.db.getPollSiteById(siteId);
      if (!siteConfig) {
        throw new Error(`Site configuration not found for ID: ${siteId}`);
      }

      const { page } = authSession;
      const polls = [];

      // Navigate to polls page
      if (siteConfig.polls_page_url) {
        await this.navigateToPolls(page, siteConfig.polls_page_url);
      }

      // Discover polls using different strategies
      const discoveredPolls = await this.findPolls(page, siteConfig);
      
      // Process and save discovered polls
      for (const pollData of discoveredPolls) {
        const pollId = await this.db.savePoll({
          site_id: siteId,
          poll_url: pollData.url,
          title: pollData.title,
          questions: [],
          answers: [],
          status: 'pending'
        });

        polls.push({
          id: pollId,
          ...pollData
        });
      }

      console.log(`Discovered ${polls.length} polls`);
      await this.db.logAction(siteId, 'poll_discovery', `Found ${polls.length} polls`, true);

      return polls;

    } catch (error) {
      console.error('Poll discovery failed:', error);
      await this.db.logAction(siteId, 'poll_discovery_failed', error.message, false);
      throw error;
    }
  }

  // Navigate to polls page
  async navigateToPolls(page, pollsUrl) {
    try {
      console.log(`Navigating to polls page: ${pollsUrl}`);
      
      await page.goto(pollsUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Simulate human behavior
      await this.humanSim.simulatePageBehavior(page);

    } catch (error) {
      console.error('Failed to navigate to polls page:', error);
      throw error;
    }
  }

  // Find polls using multiple strategies
  async findPolls(page, siteConfig) {
    const polls = [];
    const selectors = JSON.parse(siteConfig.poll_selectors || '{}');

    // Strategy 1: Use configured selectors
    if (selectors.poll_links) {
      const configuredPolls = await this.findPollsBySelector(page, selectors.poll_links);
      polls.push(...configuredPolls);
    }

    // Strategy 2: Common poll patterns
    if (polls.length === 0) {
      const commonPatterns = [
        'a[href*="/poll/"]',
        'a[href*="/survey/"]',
        'a[href*="/questionnaire/"]',
        '.poll-item a',
        '.survey-item a',
        '[data-poll-id] a',
        '.poll-list a',
        'a[class*="poll"]'
      ];

      for (const pattern of commonPatterns) {
        const foundPolls = await this.findPollsBySelector(page, pattern);
        if (foundPolls.length > 0) {
          polls.push(...foundPolls);
          break; // Use first successful pattern
        }
      }
    }

    // Strategy 3: Text-based discovery
    if (polls.length === 0) {
      const textBasedPolls = await this.findPollsByText(page);
      polls.push(...textBasedPolls);
    }

    // Strategy 4: Form-based discovery
    if (polls.length === 0) {
      const formBasedPolls = await this.findPollsByForms(page);
      polls.push(...formBasedPolls);
    }

    // Remove duplicates
    const uniquePolls = this.removeDuplicatePolls(polls);
    
    console.log(`Found ${uniquePolls.length} unique polls`);
    return uniquePolls;
  }

  // Find polls by CSS selector
  async findPollsBySelector(page, selector) {
    try {
      const elements = await page.$$(selector);
      const polls = [];

      for (const element of elements) {
        try {
          const href = await element.getAttribute('href');
          const title = await element.textContent();
          
          if (href && title) {
            // Convert relative URLs to absolute
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, page.url()).href;
            
            polls.push({
              url: absoluteUrl,
              title: title.trim(),
              discoveryMethod: 'selector',
              selector: selector
            });
          }
        } catch (error) {
          // Skip this element if there's an error
          continue;
        }
      }

      return polls;
    } catch (error) {
      console.error(`Error finding polls by selector ${selector}:`, error);
      return [];
    }
  }

  // Find polls by text content
  async findPollsByText(page) {
    try {
      const polls = [];
      const pollKeywords = [
        'poll', 'survey', 'questionnaire', 'feedback', 'opinion',
        'vote', 'quiz', 'assessment', 'evaluation'
      ];

      // Look for links with poll-related text
      const links = await page.$$('a');
      
      for (const link of links) {
        try {
          const text = await link.textContent();
          const href = await link.getAttribute('href');
          
          if (text && href) {
            const lowerText = text.toLowerCase();
            const containsPollKeyword = pollKeywords.some(keyword => 
              lowerText.includes(keyword)
            );

            if (containsPollKeyword) {
              const absoluteUrl = href.startsWith('http') ? href : new URL(href, page.url()).href;
              
              polls.push({
                url: absoluteUrl,
                title: text.trim(),
                discoveryMethod: 'text',
                matchedKeyword: pollKeywords.find(k => lowerText.includes(k))
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return polls;
    } catch (error) {
      console.error('Error finding polls by text:', error);
      return [];
    }
  }

  // Find polls by form elements
  async findPollsByForms(page) {
    try {
      const polls = [];
      const forms = await page.$$('form');

      for (const form of forms) {
        try {
          // Check if form contains poll-like elements
          const radioButtons = await form.$$('input[type="radio"]');
          const checkboxes = await form.$$('input[type="checkbox"]');
          const selects = await form.$$('select');
          
          const totalInputs = radioButtons.length + checkboxes.length + selects.length;
          
          // If form has multiple choice elements, it might be a poll
          if (totalInputs >= 3) {
            const formTitle = await this.extractFormTitle(form);
            const formAction = await form.getAttribute('action');
            
            if (formAction) {
              const absoluteUrl = formAction.startsWith('http') ? 
                formAction : new URL(formAction, page.url()).href;
              
              polls.push({
                url: absoluteUrl,
                title: formTitle || 'Embedded Poll',
                discoveryMethod: 'form',
                inputCount: totalInputs,
                isEmbedded: true
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return polls;
    } catch (error) {
      console.error('Error finding polls by forms:', error);
      return [];
    }
  }

  // Extract title from form
  async extractFormTitle(form) {
    try {
      // Look for title in various places
      const titleSelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        '.title', '.heading', '[class*="title"]',
        'legend', 'fieldset > legend'
      ];

      for (const selector of titleSelectors) {
        try {
          const titleElement = await form.$(selector);
          if (titleElement) {
            const title = await titleElement.textContent();
            if (title && title.trim().length > 0) {
              return title.trim();
            }
          }
        } catch (error) {
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Remove duplicate polls
  removeDuplicatePolls(polls) {
    const seen = new Set();
    return polls.filter(poll => {
      const key = poll.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Extract questions from a poll page
  async extractQuestions(page, siteConfig) {
    try {
      const questions = [];
      const selectors = JSON.parse(siteConfig.poll_selectors || '{}');

      // Wait for content to load
      await page.waitForLoadState('networkidle');
      await this.humanSim.simulatePageBehavior(page);

      // Strategy 1: Use configured selectors
      if (selectors.questions) {
        const configuredQuestions = await this.extractQuestionsBySelector(page, selectors);
        if (configuredQuestions.length > 0) {
          return configuredQuestions;
        }
      }

      // Strategy 2: Common question patterns
      const questionPatterns = [
        '.question',
        '[class*="question"]',
        '.poll-question',
        '.survey-question',
        'fieldset',
        '.form-group',
        '.quiz-question'
      ];

      for (const pattern of questionPatterns) {
        const foundQuestions = await this.extractQuestionsByPattern(page, pattern);
        if (foundQuestions.length > 0) {
          questions.push(...foundQuestions);
          break;
        }
      }

      // Strategy 3: Form-based extraction
      if (questions.length === 0) {
        const formQuestions = await this.extractQuestionsFromForms(page);
        questions.push(...formQuestions);
      }

      console.log(`Extracted ${questions.length} questions`);
      return questions;

    } catch (error) {
      console.error('Error extracting questions:', error);
      return [];
    }
  }

  // Extract questions using configured selectors
  async extractQuestionsBySelector(page, selectors) {
    const questions = [];

    try {
      const questionElements = await page.$$(selectors.questions);
      
      for (let i = 0; i < questionElements.length; i++) {
        const element = questionElements[i];
        
        const questionText = await element.textContent();
        if (!questionText || questionText.trim().length === 0) continue;

        // Find options for this question
        const options = await this.extractOptionsForQuestion(element, selectors);
        
        questions.push({
          id: i + 1,
          text: questionText.trim(),
          type: this.determineQuestionType(options),
          options: options,
          required: await this.isQuestionRequired(element)
        });
      }

    } catch (error) {
      console.error('Error extracting questions by selector:', error);
    }

    return questions;
  }

  // Extract options for a specific question
  async extractOptionsForQuestion(questionElement, selectors) {
    const options = [];

    try {
      // Look for options within the question element
      const optionSelectors = [
        selectors.options || 'input[type="radio"], input[type="checkbox"]',
        'label',
        '.option',
        '[class*="option"]'
      ];

      for (const selector of optionSelectors) {
        const optionElements = await questionElement.$$(selector);
        
        for (const optionElement of optionElements) {
          const value = await optionElement.getAttribute('value') || 
                       await optionElement.getAttribute('data-value');
          const label = await this.getOptionLabel(optionElement);
          
          if (label && label.trim().length > 0) {
            options.push({
              value: value || label,
              label: label.trim(),
              type: await optionElement.getAttribute('type') || 'text'
            });
          }
        }

        if (options.length > 0) break;
      }

    } catch (error) {
      console.error('Error extracting options:', error);
    }

    return options;
  }

  // Get label for an option element
  async getOptionLabel(element) {
    try {
      // Try different ways to get the label
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'label') {
        return await element.textContent();
      }
      
      // Look for associated label
      const id = await element.getAttribute('id');
      if (id) {
        const label = await element.$(`xpath=//label[@for="${id}"]`);
        if (label) {
          return await label.textContent();
        }
      }
      
      // Look for nearby text
      const parent = await element.$('xpath=..');
      if (parent) {
        const text = await parent.textContent();
        return text;
      }
      
      return await element.getAttribute('value') || '';
      
    } catch (error) {
      return '';
    }
  }

  // Determine question type based on options
  determineQuestionType(options) {
    if (options.length === 0) return 'text';
    
    const hasRadio = options.some(opt => opt.type === 'radio');
    const hasCheckbox = options.some(opt => opt.type === 'checkbox');
    
    if (hasRadio) return 'single-choice';
    if (hasCheckbox) return 'multiple-choice';
    if (options.length === 2 && 
        options.some(opt => opt.label.toLowerCase().includes('yes')) &&
        options.some(opt => opt.label.toLowerCase().includes('no'))) {
      return 'yes-no';
    }
    
    return 'single-choice';
  }

  // Check if question is required
  async isQuestionRequired(element) {
    try {
      const required = await element.$('[required]') || 
                      await element.$('.required') ||
                      await element.$('[class*="required"]');
      return !!required;
    } catch (error) {
      return false;
    }
  }

  // Extract questions using common patterns
  async extractQuestionsByPattern(page, pattern) {
    // Similar implementation to extractQuestionsBySelector
    // but using common patterns instead of configured selectors
    return [];
  }

  // Extract questions from forms
  async extractQuestionsFromForms(page) {
    // Implementation for extracting questions from form elements
    return [];
  }
}

module.exports = PollDiscoveryService;