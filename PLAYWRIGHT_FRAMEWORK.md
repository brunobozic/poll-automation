# Enhanced Playwright Framework for Poll Automation

## Overview

This advanced Playwright framework provides sophisticated abstractions for modern web automation, specifically designed for poll and survey sites. It addresses complex scenarios including SPAs, iframes, CAPTCHAs, and modern JavaScript frameworks while maintaining human-like behavior patterns.

## Architecture

### Core Components

```
src/playwright/
├── base-page.js          # Base Page Object Model with advanced interactions
├── poll-page.js          # Specialized poll/survey page handler  
├── captcha-handler.js    # CAPTCHA detection and handling
├── iframe-handler.js     # Advanced iframe management
└── spa-handler.js        # Single Page Application support
```

### Key Features

#### 🛡️ **Anti-Detection & Stealth**
- Advanced browser fingerprint masking
- Human-like interaction patterns
- Randomized timing and behavior
- Stealth script injection
- Bot detection evasion

#### 🕷️ **CAPTCHA Handling**
- Google reCAPTCHA v2/v3 detection
- hCAPTCHA support
- Cloudflare Turnstile handling
- Simple math CAPTCHA solving
- Human verification checkboxes
- Audio CAPTCHA support (experimental)

#### 🖼️ **Iframe Management**
- Automatic iframe detection and categorization
- Cross-origin iframe handling
- Nested iframe navigation
- Iframe content monitoring
- Payment processor integration

#### ⚛️ **SPA Framework Support**
- React, Vue, Angular detection
- Router state monitoring
- Component lifecycle awareness
- State management integration
- Framework-specific waiting strategies

## Usage Examples

### Basic Page Interaction

```javascript
const StealthBrowser = require('./src/browser/stealth');

// Initialize browser with enhanced capabilities
const browser = new StealthBrowser();
await browser.launch();

// Create base page for general interactions
const basePage = await browser.newPage('base');

// Navigate with SPA support
await basePage.navigateTo('https://example.com', {
    waitForSPA: true,
    timeout: 30000
});

// Enhanced element interaction
await basePage.clickElement('.button', {
    humanLike: true,
    waitForStable: true,
    retries: 3
});

// Human-like form filling
await basePage.fillInput('#email', 'test@example.com', {
    humanLike: true,
    validate: true
});
```

### Poll-Specific Operations

```javascript
// Create specialized poll page
const pollPage = await browser.newPollPage();

// Initialize with full framework detection
await pollPage.initializePoll({
    detectFramework: true,
    handleCaptcha: true,
    extractMetadata: true
});

// Extract all questions with trick detection
const questions = await pollPage.extractQuestions({
    detectTrickQuestions: true,
    extractOptions: true,
    includeHidden: false
});

// Answer questions intelligently
for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    if (!question.isTrick) {
        let answer = generateAnswer(question);
        await pollPage.answerQuestion(i, answer, {
            humanLike: true,
            validate: true
        });
    }
}

// Submit with validation
await pollPage.submitPoll({
    validateAll: true,
    waitForConfirmation: true,
    handleRedirects: true
});
```

### CAPTCHA Handling

```javascript
// Automatic CAPTCHA detection and handling
const captchaResult = await pollPage.captchaHandler.detectAndHandleCaptcha({
    skipComplexCaptcha: true,  // Skip image selection challenges
    useAudio: false,           // Don't attempt audio CAPTCHAs
    timeout: 30000
});

console.log(`CAPTCHA result: ${captchaResult.success ? 'Solved' : 'Failed'}`);
console.log(`CAPTCHA type: ${captchaResult.type}`);
```

### Iframe Operations

```javascript
// Detect and categorize all iframes
const iframes = await pollPage.iframeHandler.detectIframes();

// Work within specific iframe
await pollPage.iframeHandler.executeInFrame('survey-frame', async (frame) => {
    const questions = await frame.$$('.question');
    console.log(`Found ${questions.length} questions in iframe`);
});

// Click element inside iframe
await pollPage.iframeHandler.clickInFrame(
    { url: 'surveymonkey.com' },  // Find iframe by URL pattern
    '.submit-button',
    { humanLike: true }
);
```

### SPA State Management

```javascript
// Detect framework and wait for readiness
await pollPage.spaHandler.detectFramework();
await pollPage.spaHandler.waitForSPAReady({
    waitForRouter: true,
    waitForComponents: true
});

// Navigate within SPA
await pollPage.spaHandler.navigateToRoute('/next-page', {
    method: 'programmatic',  // Use router instead of clicking
    waitForComplete: true
});

// Monitor state changes
pollPage.spaHandler.startStateMonitoring((change) => {
    console.log(`Route changed: ${change.from} -> ${change.to}`);
});

// Wait for specific state
await pollPage.spaHandler.waitForStateChange('user.isLoggedIn', true, {
    timeout: 15000
});
```

## Advanced Features

### Human Behavior Simulation

The framework includes sophisticated human behavior patterns:

```javascript
// Realistic typing with variable speeds
await basePage.fillInput('#comment', 'Long text response...', {
    humanLike: true,  // Enables variable typing speed, pauses, corrections
    validate: true
});

// Mouse movement simulation
await basePage.clickElement('.option', {
    humanLike: true,  // Moves mouse in realistic arc, adds micro-pauses
    waitForStable: true
});

// Reading time calculation
const readingTime = humanSim.calculateReadingTime('Question text here');
await page.waitForTimeout(readingTime);
```

### Element Stability Detection

```javascript
// Wait for element to stop moving/resizing
const element = await basePage.waitForElement('.dynamic-content', {
    state: 'visible',
    stable: true,        // Wait for position/size stability
    stableTime: 500      // Stable for 500ms
});
```

### Network Request Monitoring

```javascript
// Wait for specific API calls
await basePage.waitForNetworkRequests('/api/submit', {
    method: 'POST',
    status: 200,
    timeout: 15000
});

// Monitor all requests
basePage.page.on('response', response => {
    if (response.url().includes('/api/')) {
        console.log(`API call: ${response.status()} ${response.url()}`);
    }
});
```

### Error Handling and Recovery

```javascript
// Retry mechanism with exponential backoff
await basePage.clickElement('.submit', {
    retries: 3,           // Try up to 3 times
    timeout: 10000,       // 10s timeout per attempt
    humanLike: true
});

// Automatic error screenshot
try {
    await pollPage.submitPoll();
} catch (error) {
    const screenshot = await basePage.takeScreenshot('error', {
        fullPage: true
    });
    console.log(`Error screenshot saved: ${screenshot}`);
    throw error;
}
```

## Performance Monitoring

### Metrics Collection

```javascript
// Get comprehensive performance data
const metrics = await pollPage.getPerformanceMetrics();
console.log(`Page load time: ${metrics.loadTime}ms`);
console.log(`First paint: ${metrics.firstPaint}ms`);

// SPA-specific metrics
const spaMetrics = await pollPage.spaHandler.getSPAMetrics();
console.log(`Route transitions: ${spaMetrics.routeHistory.length}`);

// Framework detection results
console.log(`Detected frameworks: ${JSON.stringify(spaMetrics.frameworkInfo)}`);
```

### Logging and Debugging

```javascript
// Get detailed operation logs
const logs = basePage.getLogs();
const captchaLogs = pollPage.captchaHandler.getLogs();
const iframeLogs = pollPage.iframeHandler.getLogs();

// Filter logs by type
const errorLogs = basePage.getLogs('error');
const requestLogs = basePage.getLogs('request');
```

## Configuration Options

### Browser Launch Options

```javascript
const browser = new StealthBrowser();
await browser.launch({
    // Proxy configuration
    server: 'http://proxy-server:8080',
    username: 'user',
    password: 'pass'
});
```

### Page Behavior Configuration

```javascript
// Configure human simulation
const humanSim = new HumanSimulation({
    typingSpeed: 'medium',     // slow, medium, fast
    readingSpeed: 'average',   // slow, average, fast
    thinkingTime: 'normal',    // quick, normal, careful
    errorRate: 0.02           // 2% chance of typos
});
```

### CAPTCHA Handling Options

```javascript
const captchaConfig = {
    skipComplexCaptcha: true,     // Skip image selection
    useAudio: false,              // Attempt audio CAPTCHAs
    fallbackToManual: false,      // Wait for manual solving
    timeout: 30000,               // Max wait time
    retries: 3                    // Retry attempts
};
```

## Best Practices

### 1. **Page Object Patterns**
- Use `PollPage` for survey/poll interactions
- Use `BasePage` for general web automation
- Extend base classes for site-specific functionality

### 2. **Error Handling**
- Always use try-catch blocks
- Implement retry mechanisms
- Take screenshots on failures
- Log detailed error information

### 3. **Human-Like Behavior**
- Enable `humanLike: true` for important interactions
- Use appropriate delays between actions
- Randomize interaction patterns
- Simulate reading and thinking time

### 4. **Performance Optimization**
- Cache frame references
- Reuse page objects when possible
- Monitor network requests
- Use efficient selectors

### 5. **Stealth Operations**
- Rotate user agents and proxies
- Vary timing patterns
- Avoid predictable sequences
- Monitor for detection indicators

## Integration with Existing System

The enhanced framework integrates seamlessly with the existing poll automation system:

```javascript
// In poll automation service
const browser = new StealthBrowser();
const pollPage = await browser.newPollPage();

// Initialize poll page with full capabilities
await pollPage.initializePoll();

// Use existing question extraction with enhancements
const questions = await pollPage.extractQuestions({
    detectTrickQuestions: true
});

// Continue with existing automation flow...
```

## Troubleshooting

### Common Issues

1. **CAPTCHA Detection Fails**
   - Check if selectors match the site's implementation
   - Verify iframe content is accessible
   - Enable debug logging for CAPTCHA handler

2. **SPA Not Detected**
   - Ensure framework scripts are loaded
   - Check for custom SPA implementations
   - Add site-specific detection patterns

3. **Iframe Content Inaccessible**
   - Verify cross-origin policies
   - Check for nested iframe structures
   - Use alternative identification methods

4. **Element Interactions Fail**
   - Enable element stability waiting
   - Increase timeout values
   - Use more specific selectors
   - Check for dynamic content loading

This enhanced framework provides enterprise-grade web automation capabilities while maintaining the stealth and human-like behavior essential for poll automation systems.