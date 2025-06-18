const { chromium } = require('playwright');
const BasePage = require('../playwright/base-page');
const PollPage = require('../playwright/poll-page');

class StealthBrowser {
  constructor() {
    this.browser = null;
    this.context = null;
    this.pages = new Map();
  }

  async launch(proxyConfig = null) {
    const launchOptions = {
      headless: true, // Set to false for debugging
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };

    // Add proxy if provided
    if (proxyConfig) {
      launchOptions.proxy = proxyConfig;
    }

    this.browser = await chromium.launch(launchOptions);

    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      geolocation: { latitude: 40.7128, longitude: -74.0060 },
      colorScheme: 'light',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    // Add stealth scripts to every page
    await this.context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format" },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format" },
            description: "Portable Document Format", 
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          }
        ],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Hide automation indicators
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;

      // Override chrome property
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Random mouse movements
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'mousemove') {
          const randomDelay = Math.random() * 100;
          setTimeout(() => originalAddEventListener.call(this, type, listener, options), randomDelay);
        } else {
          originalAddEventListener.call(this, type, listener, options);
        }
      };
    });

    return this.context;
  }

  async newPage(pageType = 'base') {
    if (!this.context) {
      await this.launch();
    }
    
    const page = await this.context.newPage();
    
    // Add human-like behavior
    await this.addHumanBehavior(page);
    
    // Create appropriate page object
    let pageObject;
    switch (pageType) {
      case 'poll':
        pageObject = new PollPage(page, this.context);
        break;
      case 'base':
      default:
        pageObject = new BasePage(page, this.context);
        break;
    }
    
    // Store page reference
    const pageId = Date.now().toString();
    this.pages.set(pageId, pageObject);
    
    return pageObject;
  }

  async newPollPage() {
    return await this.newPage('poll');
  }

  async getPage(pageId) {
    return this.pages.get(pageId);
  }

  async closePage(pageId) {
    const pageObject = this.pages.get(pageId);
    if (pageObject) {
      await pageObject.page.close();
      this.pages.delete(pageId);
    }
  }

  async addHumanBehavior(page) {
    // Random delays between actions
    page.humanDelay = async () => {
      const delay = Math.random() * 2000 + 500; // 500-2500ms
      await page.waitForTimeout(delay);
    };

    // Human-like typing
    page.humanType = async (selector, text) => {
      await page.click(selector);
      await this.randomDelay(100, 300);
      
      for (const char of text) {
        await page.keyboard.type(char);
        await this.randomDelay(50, 150);
      }
    };

    // Human-like clicking with mouse movement
    page.humanClick = async (selector) => {
      const element = await page.locator(selector);
      const box = await element.boundingBox();
      
      if (box) {
        // Move mouse to random point near element
        const x = box.x + Math.random() * box.width;
        const y = box.y + Math.random() * box.height;
        
        await page.mouse.move(x, y);
        await this.randomDelay(100, 300);
        await page.mouse.click(x, y);
      }
    };

    // Random scrolling
    page.humanScroll = async () => {
      const scrollAmount = Math.random() * 500 + 200;
      await page.mouse.wheel(0, scrollAmount);
      await this.randomDelay(500, 1500);
    };
  }

  async randomDelay(min = 100, max = 500) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async close() {
    // Close all pages first
    for (const [pageId, pageObject] of this.pages.entries()) {
      try {
        await pageObject.page.close();
      } catch (error) {
        console.log(`Error closing page ${pageId}: ${error.message}`);
      }
    }
    this.pages.clear();
    
    // Close browser
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Get browser statistics
  getBrowserStats() {
    return {
      totalPages: this.pages.size,
      isLaunched: !!this.browser,
      hasContext: !!this.context,
      pages: Array.from(this.pages.keys())
    };
  }
}

module.exports = StealthBrowser;