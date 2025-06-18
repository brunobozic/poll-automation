const StealthBrowser = require('../browser/stealth');
const ProxyManager = require('../proxy/manager');
const HumanSimulation = require('../behavior/human-simulation');
const DatabaseManager = require('../database/manager');

class AuthenticationService {
  constructor() {
    this.db = new DatabaseManager();
    this.proxyManager = new ProxyManager();
    this.humanSim = new HumanSimulation();
    this.activeSessions = new Map(); // site_id -> browser instance
  }

  async initialize() {
    await this.db.connect();
    await this.proxyManager.loadProxies(['file', 'premium']); // Skip free proxies for login
  }

  // Main login function
  async loginToSite(siteId) {
    try {
      console.log(`Starting login process for site ID: ${siteId}`);
      
      // Get site configuration and credentials
      const siteConfig = await this.db.getPollSiteById(siteId);
      const credentials = await this.db.getCredentials(siteId);
      
      if (!siteConfig) {
        throw new Error(`Site with ID ${siteId} not found`);
      }
      
      if (!credentials) {
        throw new Error(`No credentials found for site ID ${siteId}`);
      }

      // Check for existing valid session
      const existingSession = await this.db.getSession(siteId);
      if (existingSession && this.isSessionValid(existingSession)) {
        console.log('Using existing valid session');
        return await this.resumeSession(siteId, existingSession);
      }

      // Perform fresh login
      return await this.performLogin(siteConfig, credentials);
      
    } catch (error) {
      console.error('Login failed:', error);
      await this.db.logAction(siteId, 'login_failed', error.message, false);
      throw error;
    }
  }

  // Perform actual login process
  async performLogin(siteConfig, credentials) {
    let browser = null;
    let page = null;

    try {
      // Get proxy for this session
      const proxy = this.proxyManager.getNextProxy();
      const proxyConfig = this.proxyManager.getProxyConfig(proxy);
      
      console.log(`Using proxy: ${proxy ? proxy.id : 'none'}`);

      // Launch stealth browser
      browser = new StealthBrowser();
      await browser.launch(proxyConfig);
      page = await browser.newPage();

      // Navigate to login page
      console.log(`Navigating to login page: ${siteConfig.login_url}`);
      await page.goto(siteConfig.login_url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Simulate human behavior on page load
      await this.humanSim.simulatePageBehavior(page);

      // Wait for login form elements
      await page.waitForSelector(siteConfig.username_selector, { timeout: 10000 });
      await page.waitForSelector(siteConfig.password_selector, { timeout: 10000 });

      // Human-like form filling
      console.log('Filling login form...');
      await this.fillLoginForm(page, siteConfig, credentials);

      // Submit form
      await this.submitLoginForm(page, siteConfig);

      // Verify login success
      const loginSuccess = await this.verifyLoginSuccess(page, siteConfig);
      
      if (!loginSuccess) {
        throw new Error('Login verification failed');
      }

      // Save session data
      await this.saveSessionData(siteConfig.id, page);

      // Store browser instance for reuse
      this.activeSessions.set(siteConfig.id, { browser, page, proxy });

      console.log('Login successful!');
      await this.db.logAction(siteConfig.id, 'login_success', 'Successfully logged in', true);

      return { browser, page, proxy };

    } catch (error) {
      console.error('Login process failed:', error);
      
      // Cleanup on failure
      if (browser) {
        await browser.close();
      }
      
      throw error;
    }
  }

  // Fill login form with human-like behavior
  async fillLoginForm(page, siteConfig, credentials) {
    // Focus on username field
    await page.click(siteConfig.username_selector);
    await this.humanSim.simulateActionDelay('click');

    // Clear any existing text
    await page.keyboard.press('Control+A');
    await this.humanSim.simulateActionDelay('type');

    // Type username with human-like patterns
    await this.humanSim.simulateTyping(page, siteConfig.username_selector, credentials.username);
    
    // Small delay before moving to password
    await this.humanSim.simulateActionDelay('navigate');

    // Focus on password field
    await page.click(siteConfig.password_selector);
    await this.humanSim.simulateActionDelay('click');

    // Type password
    await this.humanSim.simulateTyping(page, siteConfig.password_selector, credentials.password);

    // Random chance to "double-check" by clicking elsewhere then back
    if (Math.random() < 0.2) {
      await page.click('body');
      await this.humanSim.simulateActionDelay('click');
      await page.click(siteConfig.password_selector);
      await this.humanSim.simulateActionDelay('click');
    }
  }

  // Submit login form
  async submitLoginForm(page, siteConfig) {
    // Wait a bit before submitting (human thinking time)
    await this.humanSim.simulateActionDelay('navigate');

    // Try clicking submit button
    try {
      await page.click(siteConfig.submit_selector);
    } catch (error) {
      // Fallback: press Enter
      console.log('Submit button not found, pressing Enter');
      await page.keyboard.press('Enter');
    }

    // Wait for navigation or form response
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle', 
        timeout: 15000 
      });
    } catch (error) {
      // Some sites use AJAX, so navigation might not occur
      console.log('No navigation detected, checking for login success...');
      await page.waitForTimeout(3000);
    }
  }

  // Verify login was successful
  async verifyLoginSuccess(page, siteConfig) {
    try {
      const currentUrl = page.url();
      
      // Check if we're no longer on the login page
      if (!currentUrl.includes(new URL(siteConfig.login_url).pathname)) {
        console.log('Login successful - redirected from login page');
        return true;
      }

      // Look for common login success indicators
      const successIndicators = [
        '[data-testid*="logout"]',
        '[class*="logout"]',
        'a[href*="logout"]',
        '.user-menu',
        '.dashboard',
        '[class*="welcome"]'
      ];

      for (const selector of successIndicators) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          console.log(`Login success confirmed by selector: ${selector}`);
          return true;
        } catch (e) {
          // Continue checking other selectors
        }
      }

      // Check for login error messages
      const errorSelectors = [
        '.error',
        '.alert-danger',
        '[class*="error"]',
        '[class*="invalid"]'
      ];

      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.$(selector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            if (errorText && errorText.length > 0) {
              console.log(`Login error detected: ${errorText}`);
              return false;
            }
          }
        } catch (e) {
          // Continue checking
        }
      }

      // If no clear indicators, assume success if no errors
      console.log('Login status unclear, assuming success');
      return true;

    } catch (error) {
      console.error('Error verifying login:', error);
      return false;
    }
  }

  // Save session cookies and tokens
  async saveSessionData(siteId, page) {
    try {
      const cookies = await page.context().cookies();
      const localStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      });

      // Set expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await this.db.saveSession(
        siteId,
        cookies,
        { localStorage },
        expiresAt.toISOString()
      );

      console.log('Session data saved successfully');
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }

  // Resume existing session
  async resumeSession(siteId, sessionData) {
    try {
      const proxy = this.proxyManager.getNextProxy();
      const proxyConfig = this.proxyManager.getProxyConfig(proxy);

      const browser = new StealthBrowser();
      await browser.launch(proxyConfig);
      const page = await browser.newPage();

      // Restore cookies
      await page.context().addCookies(sessionData.cookies);

      // Restore localStorage if available
      if (sessionData.auth_tokens.localStorage) {
        await page.addInitScript((localStorage) => {
          for (const [key, value] of Object.entries(localStorage)) {
            window.localStorage.setItem(key, value);
          }
        }, sessionData.auth_tokens.localStorage);
      }

      // Update session usage
      await this.db.updateSessionUsage(sessionData.id);

      // Store session
      this.activeSessions.set(siteId, { browser, page, proxy });

      console.log('Session resumed successfully');
      return { browser, page, proxy };

    } catch (error) {
      console.error('Failed to resume session:', error);
      throw error;
    }
  }

  // Check if session is still valid
  isSessionValid(session) {
    const now = new Date();
    const expires = new Date(session.expires_at);
    return expires > now;
  }

  // Get active session for a site
  getActiveSession(siteId) {
    return this.activeSessions.get(siteId);
  }

  // Cleanup sessions
  async cleanup() {
    for (const [siteId, session] of this.activeSessions.entries()) {
      try {
        await session.browser.close();
      } catch (error) {
        console.error(`Error closing session for site ${siteId}:`, error);
      }
    }
    this.activeSessions.clear();
    
    if (this.db) {
      await this.db.close();
    }
  }

  // Logout from a site
  async logout(siteId) {
    const session = this.activeSessions.get(siteId);
    if (session) {
      try {
        await session.browser.close();
        this.activeSessions.delete(siteId);
        console.log(`Logged out from site ${siteId}`);
      } catch (error) {
        console.error(`Error during logout for site ${siteId}:`, error);
      }
    }
  }
}

module.exports = AuthenticationService;