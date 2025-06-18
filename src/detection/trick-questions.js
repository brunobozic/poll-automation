class TrickQuestionDetector {
  constructor() {
    this.suspiciousPatterns = this.initializePatterns();
    this.knowledgeFlags = this.initializeKnowledgeFlags();
  }

  initializePatterns() {
    return {
      // Impossibly specific knowledge requests
      impossibleKnowledge: [
        /list all .* in order/i,
        /name every .* since \d{4}/i,
        /what were the exact .* on .*/i,
        /recall all .* from .*/i,
        /enumerate all .* that .*/i,
        /provide complete list of .*/i,
        /chronological order of all .*/i
      ],

      // Mathematical precision beyond human capability
      precisionMath: [
        /calculate .* to \d+ decimal places/i,
        /what is .* × .* × .* × .*/i,
        /multiply these .* numbers/i,
        /\d+\.\d{5,}/i, // numbers with 5+ decimal places
        /factorial of \d{2,}/i,
        /square root of .* to .* digits/i
      ],

      // Instant recall of obscure facts
      obscureFacts: [
        /population of .* in \d{4}/i,
        /gdp of .* in .*/i,
        /temperature on .* \d{4}/i,
        /price of .* on .*/i,
        /exchange rate .* on .*/i,
        /stock price of .* on .*/i
      ],

      // Superhuman memory tests
      memoryTests: [
        /remember the .* from .* minutes ago/i,
        /what was the .* number in .*/i,
        /recall the sequence .*/i,
        /what did i say about .* earlier/i,
        /in what order did .*/i
      ],

      // Language/processing tricks
      languageTricks: [
        /translate .* to .* to .* to .*/i,
        /reverse the order of .*/i,
        /count the .* in this .*/i,
        /how many times does .* appear/i,
        /alphabetize these .*/i
      ],

      // Time-based impossibilities
      timeImpossible: [
        /what time is it in .* right now/i,
        /current .* price/i,
        /today's .* in .*/i,
        /live .* data/i,
        /real-time .*/i,
        /latest .* news/i
      ],

      // Pattern recognition beyond human speed
      patternRecognition: [
        /find the pattern in .*/i,
        /next number in sequence .*/i,
        /complete this series .*/i,
        /fibonacci .*/i,
        /prime numbers .*/i
      ]
    };
  }

  initializeKnowledgeFlags() {
    return {
      // Topics that require specialized knowledge
      specialized: [
        'molecular biology', 'quantum physics', 'advanced mathematics',
        'chemical formulas', 'medical terminology', 'legal statutes',
        'programming languages', 'historical dates', 'geographical coordinates'
      ],

      // Requests for exhaustive lists
      exhaustiveLists: [
        'all countries', 'every president', 'complete list',
        'all elements', 'every state', 'all capitals',
        'each member', 'total number', 'full roster'
      ],

      // Precision indicators
      precisionIndicators: [
        'exactly', 'precisely', 'to the decimal', 'specific number',
        'exact date', 'precise time', 'accurate to', 'down to the'
      ]
    };
  }

  // Main detection function
  detectTrickQuestion(questionText, options = []) {
    const analysis = {
      isTrick: false,
      suspicionLevel: 0,
      flags: [],
      humanResponse: null,
      confidence: 0
    };

    // Check against all pattern categories
    Object.entries(this.suspiciousPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(questionText)) {
          analysis.flags.push(`${category}: ${pattern.source}`);
          analysis.suspicionLevel += this.getSuspicionWeight(category);
        }
      });
    });

    // Check knowledge flags
    this.checkKnowledgeFlags(questionText, analysis);

    // Analyze options for clues
    this.analyzeOptions(options, analysis);

    // Check for mathematical complexity
    this.checkMathComplexity(questionText, analysis);

    // Final assessment
    analysis.isTrick = analysis.suspicionLevel >= 3;
    analysis.confidence = Math.min(analysis.suspicionLevel / 5, 1);

    if (analysis.isTrick) {
      analysis.humanResponse = this.generateHumanResponse(questionText, analysis);
    }

    return analysis;
  }

  getSuspicionWeight(category) {
    const weights = {
      impossibleKnowledge: 4,
      precisionMath: 3,
      obscureFacts: 2,
      memoryTests: 3,
      languageTricks: 2,
      timeImpossible: 4,
      patternRecognition: 2
    };
    return weights[category] || 1;
  }

  checkKnowledgeFlags(text, analysis) {
    Object.entries(this.knowledgeFlags).forEach(([category, flags]) => {
      flags.forEach(flag => {
        if (text.toLowerCase().includes(flag.toLowerCase())) {
          analysis.flags.push(`knowledge_${category}: ${flag}`);
          analysis.suspicionLevel += 1;
        }
      });
    });
  }

  analyzeOptions(options, analysis) {
    if (options.length === 0) return;

    // Check for inhuman precision in options
    const preciseNumbers = options.filter(opt => 
      /\d+\.\d{3,}/.test(opt) || /\d{10,}/.test(opt)
    );

    if (preciseNumbers.length > 0) {
      analysis.flags.push('precise_numbers_in_options');
      analysis.suspicionLevel += 2;
    }

    // Check for exhaustive lists in options
    const exhaustiveOptions = options.filter(opt =>
      /^all of the above$/i.test(opt) || 
      /^none of the above$/i.test(opt) ||
      opt.split(',').length > 10
    );

    if (exhaustiveOptions.length > 0) {
      analysis.flags.push('exhaustive_options');
      analysis.suspicionLevel += 1;
    }
  }

  checkMathComplexity(text, analysis) {
    // Count mathematical operations
    const mathOperations = (text.match(/[+\-×÷*/]/g) || []).length;
    const numbers = (text.match(/\d+/g) || []).length;

    if (mathOperations > 3 && numbers > 4) {
      analysis.flags.push('complex_mathematics');
      analysis.suspicionLevel += 2;
    }

    // Check for large numbers
    const largeNumbers = text.match(/\d{7,}/g);
    if (largeNumbers && largeNumbers.length > 0) {
      analysis.flags.push('large_numbers');
      analysis.suspicionLevel += 1;
    }
  }

  generateHumanResponse(question, analysis) {
    const responses = {
      // Responses for different types of trick questions
      impossibleKnowledge: [
        "I don't have that level of detailed knowledge",
        "That's too specific for me to know off the top of my head",
        "I'd need to look that up",
        "I'm not sure about all the details"
      ],

      precisionMath: [
        "I can't calculate that precisely in my head",
        "That's beyond my mental math abilities",
        "I'd need a calculator for that",
        "Approximately... but I can't be exact"
      ],

      obscureFacts: [
        "I don't know those specific statistics",
        "That's not something I'd remember",
        "I'm not familiar with those exact details",
        "I'd have to guess"
      ],

      memoryTests: [
        "I don't remember that exactly",
        "My memory isn't that precise",
        "I might be misremembering",
        "I can't recall the exact details"
      ],

      languageTricks: [
        "That would take me some time to work out",
        "I'd need to think about that carefully",
        "That's quite complex to do quickly",
        "I'm not sure I can do that accurately"
      ],

      timeImpossible: [
        "I don't have access to current information",
        "That changes frequently, I wouldn't know",
        "I'm not up to date on that",
        "That information would be outdated quickly"
      ]
    };

    // Find the most relevant response category
    const primaryFlag = analysis.flags[0]?.split(':')[0];
    const categoryResponses = responses[primaryFlag] || responses.impossibleKnowledge;
    
    // Return a random response from the appropriate category
    const randomIndex = Math.floor(Math.random() * categoryResponses.length);
    return categoryResponses[randomIndex];
  }

  // Generate human-like "I don't know" answers
  generateUncertainResponse(question) {
    const uncertainResponses = [
      "I'm not sure",
      "I don't really know",
      "I'm not certain about that",
      "I'd have to guess",
      "I'm not familiar with that",
      "That's not something I know",
      "I don't have that information",
      "I can't say for certain",
      "I'm drawing a blank",
      "I don't recall",
      "I'm not aware of that",
      "I couldn't tell you"
    ];

    return uncertainResponses[Math.floor(Math.random() * uncertainResponses.length)];
  }

  // Check if we should skip this question entirely
  shouldSkipQuestion(question) {
    const skipPatterns = [
      /please verify you are human/i,
      /prove you are not a robot/i,
      /captcha/i,
      /anti-bot/i,
      /verification/i,
      /are you automated/i
    ];

    return skipPatterns.some(pattern => pattern.test(question));
  }

  // Get confidence level for proceeding with automated answer
  getAutomationConfidence(questionText) {
    const analysis = this.detectTrickQuestion(questionText);
    
    if (analysis.isTrick) {
      return 0; // Don't automate trick questions
    }

    // Simple questions are safer to automate
    const simplePatterns = [
      /yes.{0,5}no/i,
      /agree.{0,5}disagree/i,
      /true.{0,5}false/i,
      /good.{0,5}bad/i,
      /like.{0,5}dislike/i
    ];

    const isSimple = simplePatterns.some(pattern => pattern.test(questionText));
    return isSimple ? 0.9 : 0.6;
  }
}

module.exports = TrickQuestionDetector;