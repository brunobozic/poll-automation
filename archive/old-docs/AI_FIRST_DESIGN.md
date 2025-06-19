# AI-First Poll Automation Design

## Core Philosophy

**"Let AI think, let Playwright do"**

This design delegates all unreliable, decision-making tasks to cheap AI models while keeping Playwright for reliable mechanical automation. The result is a robust system that can handle any poll site without manual configuration.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Brain      │    │  Orchestrator   │    │   Playwright    │
│                 │    │                 │    │                 │
│ • Analyze page  │◄──►│ • Coordinate    │◄──►│ • Navigate      │
│ • Find questions│    │ • Execute steps │    │ • Click/Type    │
│ • Generate ans. │    │ • Handle errors │    │ • Wait/Scroll   │
│ • Decide next   │    │ • Track progress│    │ • Screenshot    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Responsibility Division

### 🧠 AI Responsibilities (Flaky/Unreliable Tasks)
- **Page Analysis**: Understanding what type of page we're on
- **Question Detection**: Finding real survey questions vs noise
- **Answer Generation**: Creating realistic, human-like responses
- **Flow Control**: Deciding when ready to proceed to next step
- **Error Recovery**: Analyzing failures and suggesting fixes
- **Completion Validation**: Determining if poll is actually finished

### 🤖 Playwright Responsibilities (Reliable Tasks)
- **Navigation**: Loading pages, handling redirects
- **Element Interaction**: Clicking buttons, filling forms
- **Waiting**: Network requests, element appearance
- **Data Extraction**: Screenshots, HTML content, form data
- **Session Management**: Cookies, authentication state

## Workflow Design

### 1. Main Automation Loop

```javascript
while (!isComplete && steps < maxSteps) {
    // AI analyzes current state
    const analysis = await ai.analyzeCurrentPage(screenshot, text, context);
    
    // AI decides what to do next
    const action = analysis.nextAction; // login|find_questions|answer|next|submit
    
    // Execute action (combination of AI + Playwright)
    const result = await executeAction(action, analysis);
    
    // Learn from result
    recordStep(action, result);
}
```

### 2. Step-by-Step Breakdown

#### Step 1: Page Analysis (AI)
```javascript
async analyzeCurrentPage() {
    // Playwright: Get page data
    const screenshot = await page.screenshot({ quality: 60 });
    const visibleText = await extractVisibleText(page);
    const url = page.url();
    
    // AI: Analyze and decide
    const prompt = `
    Analyze this poll page and tell me what to do next:
    URL: ${url}
    Text: ${visibleText.substring(0, 1500)}
    
    Return JSON: {
        "pageType": "login|question_page|completion|error",
        "nextAction": "login|find_questions|answer_questions|click_next|submit",
        "confidence": 0.9,
        "reasoning": "why this action"
    }`;
    
    return await ai.analyze(prompt, 'gpt-3.5-turbo');
}
```

#### Step 2: Question Detection (AI + Playwright)
```javascript
async findQuestions() {
    // Playwright: Extract DOM structure
    const formData = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.question, .form-group')).map(el => ({
            text: el.textContent.trim(),
            selector: generateSelector(el),
            inputs: Array.from(el.querySelectorAll('input, select, textarea')),
            required: el.querySelector('[required]') !== null
        }));
    });
    
    // AI: Filter real questions
    const prompt = `
    Identify real survey questions from this data:
    ${JSON.stringify(formData)}
    
    Return JSON with only valid survey questions, filtering out:
    - Navigation elements
    - Site functionality
    - Advertisements
    `;
    
    return await ai.analyze(prompt, 'gpt-3.5-turbo');
}
```

#### Step 3: Answer Generation (AI)
```javascript
async generateAnswer(question) {
    // Get question options via Playwright
    const options = await page.evaluate(selector => {
        const el = document.querySelector(selector);
        return extractOptionsFromElement(el);
    }, question.selector);
    
    // AI generates appropriate answer
    const prompt = `
    Generate realistic answer for: "${question.text}"
    Options: ${JSON.stringify(options)}
    Persona: 28-year-old professional
    
    Return JSON: {
        "action": "answer|skip",
        "value": "selected value or text",
        "reasoning": "why this answer"
    }`;
    
    return await ai.analyze(prompt, 'gpt-3.5-turbo');
}
```

#### Step 4: Answer Input (Playwright)
```javascript
async inputAnswer(question, answer) {
    // Playwright handles reliable form interaction
    const element = await page.locator(question.selector);
    
    if (answer.type === 'radio') {
        await element.locator(`input[value="${answer.value}"]`).click();
    } else if (answer.type === 'text') {
        await element.locator('input, textarea').fill(answer.value);
    } else if (answer.type === 'select') {
        await element.locator('select').selectOption(answer.value);
    }
    
    await page.waitForTimeout(randomDelay(500, 1500)); // Human-like timing
}
```

#### Step 5: Progress Validation (AI + Playwright)
```javascript
async checkReadiness() {
    // Playwright: Check form state
    const formState = await page.evaluate(() => {
        const required = document.querySelectorAll('[required]');
        const unanswered = Array.from(required).filter(el => !hasValue(el));
        return {
            totalRequired: required.length,
            unanswered: unanswered.map(el => getQuestionText(el))
        };
    });
    
    // AI: Analyze if ready to proceed
    if (formState.unanswered.length > 0) {
        return {
            ready: false,
            reason: `${formState.unanswered.length} required questions unanswered`,
            missingQuestions: formState.unanswered
        };
    }
    
    return { ready: true };
}
```

#### Step 6: Navigation (Playwright + AI validation)
```javascript
async clickNext() {
    // AI: Verify readiness first
    const readiness = await checkReadiness();
    if (!readiness.ready) {
        throw new Error(`Not ready: ${readiness.reason}`);
    }
    
    // Playwright: Find and click next button
    const nextButton = await page.locator([
        'button[type="submit"]',
        '.next', '.continue', '.submit',
        'button:has-text("Next")'
    ].join(', ')).first();
    
    await nextButton.click();
    await page.waitForLoadState('networkidle');
}
```

## Cost Optimization Strategy

### Model Selection
```javascript
const MODEL_COSTS = {
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 }, // $0.001 per 1K tokens
    'gpt-4': { input: 0.03, output: 0.06 },           // $0.03 per 1K tokens
    'gpt-4-vision': { input: 0.01, output: 0.03 }     // $0.01 per 1K tokens
};

// Use cheapest model for most tasks
const AI_MODEL_STRATEGY = {
    pageAnalysis: 'gpt-3.5-turbo',     // ~$0.002 per analysis
    questionDetection: 'gpt-3.5-turbo', // ~$0.003 per page
    answerGeneration: 'gpt-3.5-turbo',  // ~$0.001 per question
    errorRecovery: 'gpt-3.5-turbo',     // ~$0.002 per error
    visualAnalysis: 'gpt-4-vision'      // Only when DOM fails
};
```

### Token Optimization
```javascript
// Limit text analysis for cost control
const optimizePromptData = {
    visibleText: text.substring(0, 1500),        // ~375 tokens
    questionData: questions.slice(0, 10),        // Max 10 questions
    formData: JSON.stringify(data).substring(0, 2000), // ~500 tokens
    maxResponseTokens: 300                       // Limit AI response
};

// Estimated cost per poll: $0.01 - $0.03
```

### Caching Strategy
```javascript
const CACHE_STRATEGY = {
    siteAnalysis: '7 days',      // Site structure rarely changes
    questionClassification: '30 days', // Question types are consistent
    answerPatterns: 'permanent',  // Successful answers can be reused
    errorPatterns: '7 days',     // Learn from recent failures
    
    // Cache hit ratio target: 70%
    // Cost reduction: ~60% vs no caching
};
```

## Error Handling & Recovery

### AI-Driven Error Analysis
```javascript
async handleFailure(error, context) {
    const prompt = `
    Poll automation failed. Analyze and suggest recovery:
    
    Error: ${error.message}
    Step: ${context.currentStep}
    Page: ${context.url}
    Progress: ${context.questionsAnswered}/${context.totalQuestions}
    
    Return JSON: {
        "canContinue": boolean,
        "recovery": "retry|skip|restart|manual",
        "adjustments": ["change1", "change2"],
        "confidence": 0.8
    }`;
    
    const recovery = await ai.analyze(prompt, 'gpt-3.5-turbo');
    
    if (recovery.canContinue) {
        return await executeRecovery(recovery);
    } else {
        throw new Error(`Unrecoverable failure: ${recovery.reason}`);
    }
}
```

### Recovery Strategies
```javascript
const RECOVERY_ACTIONS = {
    retry: async () => {
        await page.waitForTimeout(2000);
        return await retryLastAction();
    },
    
    skip: async () => {
        logSkippedStep(currentStep);
        return await proceedToNext();
    },
    
    restart: async () => {
        await page.reload();
        return await restartFromBeginning();
    },
    
    manual: async () => {
        await takeScreenshot('manual_intervention_needed');
        throw new Error('Manual intervention required');
    }
};
```

## Learning & Adaptation

### Success Pattern Learning
```javascript
async learnFromSuccess(sessionData) {
    const patterns = {
        siteType: sessionData.siteAnalysis.type,
        questionSelectors: sessionData.successfulSelectors,
        navigationFlow: sessionData.stepSequence,
        answerStrategies: sessionData.answerPatterns,
        timingPatterns: sessionData.delays
    };
    
    await updateSiteKnowledge(sessionData.domain, patterns);
    await cacheSuccessfulPatterns(patterns);
}
```

### Failure Pattern Learning
```javascript
async learnFromFailure(sessionData) {
    const analysis = await ai.analyze(`
        Analyze this failure and extract lessons:
        
        Site: ${sessionData.domain}
        Error: ${sessionData.error}
        Context: ${JSON.stringify(sessionData.context)}
        
        What patterns should we avoid?
        What adjustments would help?
    `, 'gpt-3.5-turbo');
    
    await updateErrorPatterns(sessionData.domain, analysis);
}
```

## Implementation Phases

### Phase 1: Core AI Orchestrator
- [x] Basic page analysis with AI
- [x] Question detection and classification
- [x] Answer generation system
- [x] Flow control logic
- [ ] Integration with existing Playwright framework

### Phase 2: Reliability Features
- [ ] Error recovery system
- [ ] Progress validation
- [ ] Completion verification
- [ ] Fallback mechanisms

### Phase 3: Learning System
- [ ] Success pattern caching
- [ ] Failure analysis and adaptation
- [ ] Site-specific optimizations
- [ ] Performance metrics tracking

### Phase 4: Cost Optimization
- [ ] Advanced caching strategies
- [ ] Token usage optimization
- [ ] Model selection refinement
- [ ] Batch processing for efficiency

## Expected Performance

### Success Metrics
- **Completion Rate**: 85-95% across diverse poll sites
- **Cost Per Poll**: $0.01 - $0.03 (vs $0.50+ for manual development)
- **Setup Time**: 0 minutes (vs hours for manual selector configuration)
- **Adaptation Speed**: Immediate for new sites

### Cost Breakdown (per poll)
```
Page Analysis (3-5 calls):     $0.006 - $0.010
Question Detection (1-2 calls): $0.003 - $0.006  
Answer Generation (5-15 calls): $0.005 - $0.015
Error Recovery (0-2 calls):     $0.000 - $0.004
Total Estimated Cost:          $0.014 - $0.035
```

### Reliability Features
- **Automatic Error Recovery**: AI analyzes and suggests fixes
- **Validation**: Ensures all required questions answered
- **Adaptive Learning**: Improves performance over time
- **Fallback Safety**: Manual intervention alerts when needed

## Integration Points

### With Existing System
```javascript
// Replace existing poll automation
const aiOrchestrator = new AIOrchestrator(aiService, page);

// Simple interface
const result = await aiOrchestrator.automatePoll(url, {
    persona: 'default',
    timeout: 300000,
    maxRetries: 3
});

// Backwards compatible
if (result.success) {
    await logPollCompletion(result);
} else {
    await handlePollFailure(result);
}
```

### Performance Monitoring
```javascript
const metrics = {
    costPerPoll: aiOrchestrator.getTotalCost(),
    completionTime: result.duration,
    questionsAnswered: result.questionsAnswered,
    stepsExecuted: result.steps.length,
    errorCount: result.errors.length
};

await trackPerformance(url, metrics);
```

This design transforms poll automation from a manual, site-specific configuration process into an intelligent, adaptive system that can handle any poll site with minimal cost and maximum reliability.