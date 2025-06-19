# CLAUDE.md - AI-Enhanced Poll Automation System

## Project Overview

**Goal**: Create best-in-class automatic poll filler using AI at multiple decision points for intelligent, adaptive automation across diverse poll sites.

**Architecture**: Multi-language system (Node.js + Python) with AI integration at strategic points for maximum intelligence and cost efficiency.

## AI Integration Strategy

### Current State: Basic LLM for Answers
- Simple question → answer mapping using cheap models
- Limited to text responses only
- No contextual site understanding

### Enhanced AI Integration Points

#### 🔍 **1. Site Structure Recognition & Adaptation**
**Problem**: Each poll site has unique structures, navigation patterns, and interaction requirements.

**AI Solution**: Vision + Text Analysis
- **Visual AI**: Screenshots → site layout understanding
- **DOM Parser**: HTML structure analysis
- **Pattern Recognition**: Match against known site types
- **Cost**: GPT-4V for initial analysis, cache results, use cheaper models for similar sites

**Implementation**:
```javascript
// AI-powered site classifier
const siteAnalysis = await aiService.analyzeSite({
  screenshot: await page.screenshot(),
  html: await page.content(),
  url: page.url(),
  model: 'gpt-4-vision-preview' // Only for new sites
});

// Cache classification for future visits
siteDB.cacheSitePattern(domain, siteAnalysis.pattern);
```

#### 🕷️ **2. Intelligent Element Detection**
**Problem**: Finding form elements, buttons, questions across different frameworks and designs.

**AI Solution**: Multi-modal Element Finder
- **Vision**: Screenshot-based element detection
- **DOM**: Semantic HTML analysis
- **Context**: Previous successful patterns
- **Cost**: Use vision for complex cases, DOM parsing for standard patterns

**Implementation**:
```javascript
// Smart element finder with AI fallback
const questionElements = await aiService.findElements({
  task: 'find all survey questions',
  screenshot: await page.screenshot(),
  html: await page.$eval('form', el => el.outerHTML),
  fallbackSelectors: ['[data-question]', '.question', '.survey-item'],
  model: 'gpt-3.5-turbo' // Cheaper for most cases
});
```

#### 🧠 **3. Intelligent Question Classification & Strategy**
**Problem**: Questions vary wildly - demographics, preferences, trick questions, required fields.

**AI Solution**: Advanced Question Analyzer
- **Classification**: Question type, difficulty, trick detection
- **Strategy**: How to answer (skip, random, pattern-based, researched)
- **Context**: User profile, previous answers, site requirements
- **Cost**: Batch process questions, use smaller models for classification

**Implementation**:
```javascript
// Intelligent question processor
const questionStrategy = await aiService.analyzeQuestions({
  questions: extractedQuestions,
  context: {
    userProfile: currentUser,
    previousAnswers: answerHistory,
    siteType: siteClassification
  },
  model: 'gpt-3.5-turbo',
  batchSize: 10 // Process multiple questions together
});
```

#### 🛡️ **4. Anti-Detection Intelligence**
**Problem**: Sites use various bot detection methods that evolve constantly.

**AI Solution**: Adaptive Stealth System
- **Pattern Analysis**: Detect new anti-bot measures
- **Behavior Adaptation**: Adjust timing, interaction patterns
- **Success/Failure Learning**: Learn from blocked attempts
- **Cost**: Analyze failed sessions, adapt patterns

**Implementation**:
```javascript
// AI-powered anti-detection
const stealthStrategy = await aiService.generateStealthPattern({
  siteSignature: site.fingerprint,
  recentFailures: failureLog,
  successPatterns: successfulSessions,
  model: 'gpt-3.5-turbo'
});
```

#### 📊 **5. Intelligent Response Generation**
**Problem**: Answers must be realistic, consistent, and varied across multiple polls.

**AI Solution**: Context-Aware Response System
- **Persona Consistency**: Maintain user profile across sessions
- **Response Quality**: Human-like, varied answers
- **Demographic Matching**: Age/location-appropriate responses
- **Cost**: Use cheaper models with good prompting

**Implementation**:
```javascript
// Smart response generator
const response = await aiService.generateResponse({
  question: questionData,
  userPersona: currentPersona,
  previousAnswers: relatedAnswers,
  responseStyle: 'consistent_human',
  model: 'gpt-3.5-turbo'
});
```

#### 🔄 **6. Dynamic Strategy Adaptation**
**Problem**: Sites change layouts, add new protections, modify question formats.

**AI Solution**: Continuous Learning System
- **Change Detection**: Compare current vs cached site structure
- **Adaptation Suggestions**: AI proposes selector/strategy updates
- **Success Rate Monitoring**: Track performance degradation
- **Cost**: Only run when detection fails or success rates drop

### Cost-Effective Model Selection Strategy

#### **Tier 1: Heavy Analysis (GPT-4V)**
- New site initial analysis
- Complex visual element detection
- Anti-bot pattern discovery
- **Usage**: Rare, cache extensively

#### **Tier 2: Standard Intelligence (GPT-3.5-turbo)**
- Question classification
- Response generation
- Strategy adaptation
- **Usage**: Primary workhorse

#### **Tier 3: Simple Tasks (Local/Smaller Models)**
- Known pattern matching
- Simple classifications
- Cached response variations
- **Usage**: High frequency, low cost

### Implementation Phases

#### **Phase 1: Visual Site Analysis**
```javascript
// Smart site analyzer
class AISiteAnalyzer {
  async analyzeSite(url, screenshot, html) {
    // Check cache first
    const cached = this.cache.getSitePattern(url);
    if (cached && !this.needsReanalysis(cached)) {
      return cached;
    }

    // Use AI for analysis
    const analysis = await this.ai.analyze({
      prompt: "Analyze this poll/survey site structure...",
      image: screenshot,
      html: html,
      model: 'gpt-4-vision-preview'
    });

    // Cache results
    this.cache.setSitePattern(url, analysis);
    return analysis;
  }
}
```

#### **Phase 2: Intelligent Question Handling**
```javascript
// Smart question processor
class AIQuestionProcessor {
  async processQuestions(questions, context) {
    const strategies = await this.ai.batchAnalyze({
      prompt: "Classify these survey questions and suggest answering strategies...",
      data: questions,
      context: context,
      model: 'gpt-3.5-turbo'
    });

    return strategies.map((strategy, i) => ({
      question: questions[i],
      strategy: strategy,
      answer: this.generateAnswer(questions[i], strategy, context)
    }));
  }
}
```

#### **Phase 3: Adaptive Learning System**
```javascript
// Learning system
class AILearningSystem {
  async learnFromSession(sessionData) {
    if (sessionData.failed) {
      // Analyze failures
      const insights = await this.ai.analyzeFailure({
        sessionData,
        model: 'gpt-3.5-turbo'
      });
      
      // Update strategies
      this.updateStrategies(insights);
    }
  }
}
```

### Visual AI vs DOM Parsing Analysis

#### **Visual AI Advantages**:
- Works with any site design
- Captures visual context humans see
- Handles dynamic/SPA content naturally
- Immune to anti-scraping measures

#### **Visual AI Disadvantages**:
- Higher token costs
- Slower processing
- Less precise element targeting
- Requires screenshot capabilities

#### **DOM Parsing Advantages**:
- Fast and precise
- Low cost
- Reliable element identification
- Works with hidden elements

#### **DOM Parsing Disadvantages**:
- Breaks with design changes
- Vulnerable to anti-scraping
- Struggles with dynamic content
- Requires site-specific selectors

#### **Hybrid Approach** (Recommended):
1. **Primary**: DOM parsing with semantic selectors
2. **Fallback**: Visual AI when DOM parsing fails
3. **Learning**: AI improves DOM selectors over time
4. **Caching**: Store successful patterns for reuse

### Cost Optimization Strategies

#### **Smart Caching**:
- Site patterns cached for 30 days
- Question classifications cached indefinitely
- Response templates cached by category
- Failed session patterns stored for learning

#### **Batch Processing**:
- Analyze multiple questions simultaneously
- Process entire forms in single API calls
- Batch failure analysis weekly
- Group similar sites for pattern learning

#### **Fallback Hierarchy**:
1. Cached patterns (free)
2. Rule-based logic (free)
3. GPT-3.5-turbo (cheap)
4. GPT-4V (expensive, rare)

#### **Model Selection Matrix**:
| Task | Model | Cost | When To Use |
|------|-------|------|-------------|
| Site Recognition | GPT-4V | High | New sites only |
| Element Detection | GPT-3.5 | Medium | Complex layouts |
| Question Classification | GPT-3.5 | Medium | All questions |
| Answer Generation | GPT-3.5 | Medium | All responses |
| Pattern Learning | GPT-3.5 | Medium | Weekly batch |
| Simple Classification | Local | Free | Known patterns |

### Success Metrics

#### **Intelligence KPIs**:
- Site adaptation speed (time to handle new sites)
- Question classification accuracy
- Answer quality/realism scores
- Anti-detection effectiveness

#### **Cost KPIs**:
- Average AI cost per poll completion
- Cache hit rates
- Model usage distribution
- Cost per successful session

#### **Reliability KPIs**:
- Success rate across different sites
- Adaptation speed to site changes
- False positive detection rate
- Session completion rate

### Future Enhancements

#### **Advanced AI Features**:
- Multi-modal CAPTCHA solving
- Natural language site navigation
- Demographic-specific response personas
- Real-time strategy adaptation

#### **Machine Learning Pipeline**:
- Custom models for poll-specific tasks
- Continuous learning from session data
- Automated pattern discovery
- Predictive failure detection

#### **Enterprise Features**:
- A/B testing of AI strategies
- Performance analytics dashboard
- Custom model fine-tuning
- Multi-tenant AI resource management

## Current System Architecture

### Technologies
- **Frontend Automation**: Node.js + Playwright (enhanced POM)
- **AI Integration**: Python + OpenAI/Anthropic APIs
- **Database**: SQLite with encrypted credentials
- **Browser**: Stealth Chromium with anti-detection
- **Proxies**: Rotation system for IP diversity

### Key Components
- **StealthBrowser**: Anti-detection browser automation
- **PollPage**: Specialized page object for poll interactions
- **CaptchaHandler**: Multi-type CAPTCHA detection/solving
- **IframeHandler**: Cross-origin iframe management
- **SPAHandler**: Single-page application support
- **HumanSimulation**: Realistic behavior patterns
- **AIService**: Intelligent decision-making integration

### File Structure
```
poll-automation/
├── src/
│   ├── browser/stealth.js           # Enhanced browser
│   ├── playwright/                  # Advanced POM framework
│   │   ├── base-page.js            # Core interactions
│   │   ├── poll-page.js            # Poll-specific logic
│   │   ├── captcha-handler.js      # CAPTCHA management
│   │   ├── iframe-handler.js       # Iframe handling
│   │   └── spa-handler.js          # SPA support
│   ├── services/                   # Core services
│   └── ai/                         # AI integration layer
├── demo-poll-site/                 # Testing environment
├── data/                           # Database storage
└── docs/                          # Documentation

## Next Development Priorities

1. **AI Site Analyzer** - Visual + DOM hybrid analysis
2. **Smart Question Classifier** - Context-aware categorization  
3. **Adaptive Response Generator** - Persona-consistent answers
4. **Learning System** - Continuous improvement from failures
5. **Cost Optimization** - Intelligent model selection and caching

## Development Guidelines

### AI Integration Principles
- **Cost-First**: Always use cheapest model that works
- **Cache-Heavy**: Store and reuse AI insights extensively
- **Fallback-Ready**: Multiple strategies for each task
- **Learn-Continuously**: Improve from every session

### Code Organization
- Keep AI logic in separate service layer
- Use dependency injection for model selection
- Implement comprehensive caching strategies
- Build fallback mechanisms for all AI features

### Testing Strategy
- Mock AI responses for unit tests
- Test with multiple poll site types
- Validate cost optimization strategies
- Monitor real-world performance metrics

This system represents a significant evolution from simple automation to intelligent, adaptive poll completion that can handle diverse sites while maintaining cost-effectiveness and reliability.