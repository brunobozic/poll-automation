const HumanSimulation = require('../behavior/human-simulation');
const DatabaseManager = require('../database/manager');

class RedirectHandler {
  constructor() {
    this.humanSim = new HumanSimulation();
    this.db = new DatabaseManager();
    this.redirectChain = [];
    this.modalHandlers = [];
    this.maxRedirects = 10;
    this.currentRedirectCount = 0;
  }

  async initialize() {
    await this.db.connect();
    this.setupModalHandlers();
  }

  // Setup common modal handlers
  setupModalHandlers() {
    this.modalHandlers = [
      // Cookie consent modals
      {
        name: 'cookie_consent',
        selectors: [
          '[data-testid="cookie-banner"]',
          '.cookie-consent',
          '.cookie-banner',
          '#cookie-consent',
          '[class*="cookie"]',
          '[id*="cookie"]'
        ],
        acceptSelectors: [
          'button:has-text("Accept")',
          'button:has-text("OK")',
          'button:has-text("Agree")',
          'button:has-text("Continue")',
          '.accept-all',
          '.btn-accept',
          '[data-action="accept"]'
        ]
      },
      
      // Survey intro modals
      {
        name: 'survey_intro',
        selectors: [
          '.survey-intro',
          '.modal',
          '.popup',
          '.overlay',
          '[class*="intro"]',
          '[class*="welcome"]'
        ],
        acceptSelectors: [
          'button:has-text("Start")',
          'button:has-text("Begin")',
          'button:has-text("Continue")',
          'button:has-text("Proceed")',
          'button:has-text("Next")',
          '.btn-start',
          '.btn-continue',
          '.btn-proceed'
        ]
      },
      
      // Terms and conditions
      {
        name: 'terms_conditions',
        selectors: [
          '.terms-modal',
          '.privacy-modal',
          '[class*="terms"]',
          '[class*="privacy"]'
        ],
        acceptSelectors: [
          'button:has-text("Accept")',
          'button:has-text("I Agree")',
          'button:has-text("Continue")',
          '.btn-accept',
          '.btn-agree'
        ]
      },
      
      // Age verification
      {
        name: 'age_verification',
        selectors: [
          '.age-verification',
          '.age-gate',
          '[class*="age"]'
        ],
        acceptSelectors: [
          'button:has-text("Yes")',
          'button:has-text("I am 18+")',
          'button:has-text("Continue")',
          '.btn-yes',
          '.btn-confirm'
        ]
      },
      
      // General "proceed" modals
      {
        name: 'general_proceed',
        selectors: [
          '.modal-dialog',
          '.dialog',
          '.popup-content',
          '[role="dialog"]',
          '[aria-modal="true"]'
        ],
        acceptSelectors: [
          'button:has-text("OK")',
          'button:has-text("Proceed")',
          'button:has-text("Continue")',
          'button:has-text("Yes")',
          'button:has-text("Confirm")',
          '.btn-primary',
          '.btn-ok',
          '.btn-proceed'
        ]
      }
    ];
  }

  // Handle poll start with redirects
  async handlePollStart(page, pollUrl, pollId) {
    try {
      console.log(`🔗 Starting poll with redirect handling: ${pollUrl}`);
      
      this.redirectChain = [];
      this.currentRedirectCount = 0;
      
      // Navigate to initial poll URL
      await page.goto(pollUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.db.logAction(null, pollId, 'poll_redirect_start', `Initial URL: ${pollUrl}`, true);
      
      // Handle redirect chain
      const finalUrl = await this.followRedirectChain(page, pollId);
      
      // Handle any modals on final page
      await this.handlePageModals(page, pollId);
      
      console.log(`✅ Reached final poll page: ${finalUrl}`);
      return finalUrl;
      
    } catch (error) {
      console.error('Poll redirect handling failed:', error);
      await this.db.logAction(null, pollId, 'poll_redirect_failed', error.message, false);
      throw error;
    }
  }

  // Follow redirect chain
  async followRedirectChain(page, pollId) {
    let previousUrl = '';
    let attempts = 0;
    const maxAttempts = 15;
    
    while (attempts < maxAttempts) {
      const currentUrl = page.url();
      
      // Log each step in redirect chain
      this.redirectChain.push({
        step: attempts + 1,
        url: currentUrl,
        timestamp: Date.now()
      });
      
      console.log(`🔗 Redirect step ${attempts + 1}: ${currentUrl}`);
      
      // Check if we've stopped redirecting
      if (currentUrl === previousUrl) {
        console.log('✅ Redirect chain completed - URL stabilized');
        break;
      }
      
      // Handle modals that might block redirects
      await this.handlePageModals(page, pollId);
      
      // Look for redirect triggers
      const redirectTriggered = await this.checkForRedirectTriggers(page, pollId);
      
      if (!redirectTriggered) {
        // Wait for automatic redirects
        try {
          await page.waitForNavigation({ 
            waitUntil: 'networkidle', 
            timeout: 5000 
          });
        } catch (navigationError) {
          // No navigation happened, check if page content changed
          const newUrl = page.url();
          if (newUrl === currentUrl) {
            console.log('✅ No more redirects detected');
            break;
          }
        }
      }
      
      previousUrl = currentUrl;
      attempts++;
      
      // Human-like delay between redirect steps
      await this.humanSim.simulateActionDelay('navigate');
    }
    
    // Log final redirect chain
    await this.db.logAction(null, pollId, 'poll_redirect_chain', 
      JSON.stringify(this.redirectChain), true);
    
    return page.url();
  }

  // Check for elements that trigger redirects
  async checkForRedirectTriggers(page, pollId) {
    const redirectTriggers = [
      // Buttons that might trigger redirects
      'button:has-text("Start Survey")',
      'button:has-text("Begin")',
      'button:has-text("Continue")',
      'button:has-text("Proceed")',
      'button:has-text("Start")',
      'a:has-text("Start Survey")',
      'a:has-text("Continue")',
      
      // Common redirect button classes
      '.start-survey',
      '.btn-start',
      '.btn-continue',
      '.btn-proceed',
      '.survey-start',
      '.begin-survey',
      
      // Form submit buttons
      'input[type="submit"]',
      'button[type="submit"]',
      
      // Data attributes
      '[data-action="start"]',
      '[data-action="continue"]',
      '[data-action="proceed"]'
    ];
    
    for (const selector of redirectTriggers) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`🎯 Found redirect trigger: ${selector}`);
          
          // Scroll to element
          await element.scrollIntoViewIfNeeded();
          await this.humanSim.simulateActionDelay('scroll');
          
          // Human-like click
          await this.humanSim.simulateMouseMovement(page, element);
          await element.click();
          
          await this.db.logAction(null, pollId, 'redirect_trigger_clicked', selector, true);
          
          // Wait for page response
          await this.humanSim.simulateActionDelay('navigate');
          
          return true;
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    
    return false;
  }

  // Handle modals on current page
  async handlePageModals(page, pollId) {
    let modalHandled = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      modalHandled = false;
      
      for (const handler of this.modalHandlers) {
        if (await this.handleModalType(page, handler, pollId)) {
          modalHandled = true;
          break;
        }
      }
      
      if (!modalHandled) {
        break;
      }
      
      attempts++;
      await this.humanSim.simulateActionDelay('click');
    }
    
    // Handle iframe modals
    await this.handleIframeModals(page, pollId);
  }

  // Handle specific modal type
  async handleModalType(page, handler, pollId) {
    try {
      // Check if modal is present
      for (const selector of handler.selectors) {
        const modal = await page.$(selector);
        if (modal && await modal.isVisible()) {
          console.log(`📱 Found ${handler.name} modal: ${selector}`);
          
          // Try to find and click accept button
          for (const acceptSelector of handler.acceptSelectors) {
            try {
              const acceptBtn = await modal.$(acceptSelector);
              if (!acceptBtn) {
                // Try searching in whole page
                const pageAcceptBtn = await page.$(acceptSelector);
                if (pageAcceptBtn && await pageAcceptBtn.isVisible()) {
                  await this.clickModalButton(page, pageAcceptBtn, handler.name, pollId);
                  return true;
                }
              } else if (await acceptBtn.isVisible()) {
                await this.clickModalButton(page, acceptBtn, handler.name, pollId);
                return true;
              }
            } catch (btnError) {
              continue;
            }
          }
          
          // If no accept button found, try closing modal
          const closeSelectors = [
            '.close', '.btn-close', '[aria-label="Close"]', 
            'button:has-text("×")', 'button:has-text("Close")'
          ];
          
          for (const closeSelector of closeSelectors) {
            try {
              const closeBtn = await modal.$(closeSelector);
              if (closeBtn && await closeBtn.isVisible()) {
                await this.clickModalButton(page, closeBtn, `${handler.name}_close`, pollId);
                return true;
              }
            } catch (closeError) {
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error handling ${handler.name} modal:`, error);
    }
    
    return false;
  }

  // Handle modals inside iframes
  async handleIframeModals(page, pollId) {
    try {
      const frames = await page.frames();
      
      for (const frame of frames) {
        if (frame === page.mainFrame()) continue;
        
        try {
          // Check for modals in iframe
          for (const handler of this.modalHandlers) {
            for (const selector of handler.selectors) {
              const modal = await frame.$(selector);
              if (modal) {
                console.log(`📱 Found ${handler.name} modal in iframe`);
                
                for (const acceptSelector of handler.acceptSelectors) {
                  try {
                    const acceptBtn = await frame.$(acceptSelector);
                    if (acceptBtn && await acceptBtn.isVisible()) {
                      await acceptBtn.click();
                      await this.db.logAction(null, pollId, 'iframe_modal_handled', 
                        `${handler.name} in iframe`, true);
                      await this.humanSim.simulateActionDelay('click');
                      return;
                    }
                  } catch (btnError) {
                    continue;
                  }
                }
              }
            }
          }
        } catch (frameError) {
          // Skip this frame
          continue;
        }
      }
    } catch (error) {
      console.error('Error handling iframe modals:', error);
    }
  }

  // Click modal button with human-like behavior
  async clickModalButton(page, button, modalType, pollId) {
    try {
      // Scroll button into view
      await button.scrollIntoViewIfNeeded();
      await this.humanSim.simulateActionDelay('scroll');
      
      // Human-like mouse movement and click
      await this.humanSim.simulateMouseMovement(page, button);
      await button.click();
      
      console.log(`✅ Clicked ${modalType} modal button`);
      await this.db.logAction(null, pollId, 'modal_handled', modalType, true);
      
      // Wait for modal to close
      await this.humanSim.simulateActionDelay('click');
      
    } catch (error) {
      console.error(`Error clicking ${modalType} button:`, error);
      throw error;
    }
  }

  // Check if we've reached the actual poll page
  async isPollPage(page) {
    const pollIndicators = [
      // Form elements
      'form',
      'input[type="radio"]',
      'input[type="checkbox"]',
      'textarea',
      'select',
      
      // Question indicators
      '.question',
      '.survey-question',
      '.poll-question',
      '[class*="question"]',
      
      // Survey-specific text
      ':has-text("Question")',
      ':has-text("Survey")',
      ':has-text("Please select")',
      ':has-text("Rate")',
      
      // Progress indicators
      '.progress',
      '.step',
      '[class*="progress"]'
    ];
    
    for (const selector of pollIndicators) {
      try {
        const element = await page.$(selector);
        if (element) {
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  }

  // Get redirect statistics
  getRedirectStats() {
    return {
      totalRedirects: this.redirectChain.length,
      redirectChain: this.redirectChain,
      finalUrl: this.redirectChain.length > 0 ? 
        this.redirectChain[this.redirectChain.length - 1].url : null
    };
  }

  // Handle specific poll platform redirects
  async handleKnownPlatformRedirects(page, pollId) {
    const currentUrl = page.url();
    
    // CPX Research platform
    if (currentUrl.includes('cpx-research.com')) {
      console.log('🔗 Detected CPX Research platform');
      await this.handleCPXResearchRedirect(page, pollId);
    }
    
    // Splendid Research platform  
    else if (currentUrl.includes('splendid-research.com')) {
      console.log('🔗 Detected Splendid Research platform');
      await this.handleSplendidResearchRedirect(page, pollId);
    }
    
    // SurveyMonkey
    else if (currentUrl.includes('surveymonkey.com')) {
      console.log('🔗 Detected SurveyMonkey platform');
      await this.handleSurveyMonkeyRedirect(page, pollId);
    }
    
    // Add more platform-specific handlers as needed
  }

  // Handle CPX Research specific redirects
  async handleCPXResearchRedirect(page, pollId) {
    // Look for CPX-specific elements
    const cpxSelectors = [
      '.start-survey',
      'button:has-text("Start")',
      'a:has-text("Continue")',
      '[data-action="start"]'
    ];
    
    for (const selector of cpxSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await this.clickModalButton(page, element, 'cpx_start', pollId);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  }

  // Handle Splendid Research specific redirects
  async handleSplendidResearchRedirect(page, pollId) {
    // Handle Splendid Research intro pages
    const splendidSelectors = [
      'button:has-text("Početak")', // Croatian "Start"
      'button:has-text("Start")',
      'button:has-text("Begin")',
      '.btn-start',
      'input[type="submit"]'
    ];
    
    for (const selector of splendidSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await this.clickModalButton(page, element, 'splendid_start', pollId);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  }

  // Handle SurveyMonkey specific redirects
  async handleSurveyMonkeyRedirect(page, pollId) {
    const smSelectors = [
      '.btn-primary',
      'button:has-text("Take Survey")',
      'button:has-text("Start Survey")',
      '.survey-start'
    ];
    
    for (const selector of smSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await this.clickModalButton(page, element, 'surveymonkey_start', pollId);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  }

  // Cleanup
  async cleanup() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = RedirectHandler;