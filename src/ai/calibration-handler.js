/**
 * Calibration Question Handler
 * Detects and handles calibration questions that are used to test/qualify participants
 * These often have specific correct answers or are used to filter out bots
 */

class CalibrationHandler {
    constructor(aiService) {
        this.ai = aiService;
        this.calibrationPatterns = new Map();
        this.knownCalibrationQuestions = new Set();
        
        // Known calibration question patterns
        this.calibrationIndicators = [
            // Attention checks
            /please select|click|choose.*option|answer.*specifically|attention.*check/i,
            /select.*following|pick.*correct|choose.*below/i,
            
            // Quality checks
            /how.*attention|paying.*attention|reading.*carefully/i,
            /verify.*human|prove.*not.*robot|confirm.*real/i,
            
            // Knowledge tests
            /capital.*country|president.*united.*states|color.*sky/i,
            /simple.*math|basic.*arithmetic|elementary.*question/i,
            
            // Consistency checks
            /same.*previous|consistent.*answer|match.*response/i,
            
            // Speed traps
            /quickly.*possible|fast.*can|immediate.*response/i
        ];
    }

    /**
     * Analyze if questions are calibration/qualification questions
     */
    async analyzeQuestions(questions, pageContext = {}) {
        console.log('🎯 Analyzing questions for calibration patterns...');
        
        const questionAnalysis = [];
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const analysis = await this.analyzeQuestion(question, i, pageContext);
            questionAnalysis.push(analysis);
        }
        
        // Overall page analysis
        const pageAnalysis = await this.analyzePageForCalibration(questions, pageContext);
        
        return {
            questions: questionAnalysis,
            pageLevel: pageAnalysis,
            totalQuestions: questions.length,
            calibrationQuestions: questionAnalysis.filter(q => q.isCalibration).length,
            confidence: this.calculateOverallConfidence(questionAnalysis, pageAnalysis)
        };
    }

    /**
     * Analyze individual question for calibration indicators
     */
    async analyzeQuestion(question, index, pageContext) {
        const text = question.text.toLowerCase();
        const options = question.options || [];
        
        // Quick pattern check
        const patternMatch = this.calibrationIndicators.some(pattern => pattern.test(text));
        
        // AI analysis for complex calibration detection
        const aiAnalysis = await this.aiAnalyzeQuestion(question, index, pageContext);
        
        return {
            index,
            question: question.text,
            isCalibration: patternMatch || aiAnalysis.isCalibration,
            calibrationType: this.detectCalibrationType(question, aiAnalysis),
            confidence: aiAnalysis.confidence,
            correctAnswer: aiAnalysis.correctAnswer,
            strategy: aiAnalysis.strategy,
            reasoning: aiAnalysis.reasoning,
            patterns: {
                patternMatch,
                hasAttentionCheck: /attention|carefully|select.*following/i.test(text),
                hasKnowledgeTest: /capital|president|color|math/i.test(text),
                hasConsistencyCheck: /same|consistent|match/i.test(text),
                hasSpeedTrap: /quick|fast|immediate/i.test(text)
            }
        };
    }

    /**
     * AI analysis of individual question
     */
    async aiAnalyzeQuestion(question, index, pageContext) {
        const prompt = `Analyze this survey question to determine if it's a calibration/qualification question:

QUESTION ${index + 1}: "${question.text}"
TYPE: ${question.type}
REQUIRED: ${question.required}

OPTIONS:
${question.options ? question.options.map(o => `- ${o.text} (value: ${o.value})`).join('\n') : 'No options (text input)'}

PAGE CONTEXT:
- Total questions: ${pageContext.totalQuestions || 'unknown'}
- Question position: ${index + 1}
- URL contains: ${pageContext.urlKeywords || 'unknown'}

CALIBRATION TYPES TO DETECT:
1. ATTENTION_CHECK - "Please select option 3" or "Choose 'Strongly Agree' to continue"
2. KNOWLEDGE_TEST - "What is the capital of France?" or basic facts
3. CONSISTENCY_CHECK - Questions asking for same info as previous questions  
4. QUALITY_CHECK - "Are you reading this carefully?" 
5. SPEED_TRAP - Questions meant to catch rushed responses
6. BOT_FILTER - Questions designed to catch automated responses
7. TRICK_QUESTION - Impossible or nonsensical questions

RESPOND WITH JSON:
{
  "isCalibration": boolean,
  "calibrationType": "attention_check|knowledge_test|consistency_check|quality_check|speed_trap|bot_filter|trick_question|normal",
  "confidence": 0.0-1.0,
  "correctAnswer": "specific answer if there's a correct one",
  "strategy": "answer_correctly|answer_randomly|skip|answer_consistently",
  "reasoning": "why this is/isn't calibration and what to do",
  "answerGuidance": "specific guidance for answering this question"
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 300
            });

            return JSON.parse(response);
        } catch (error) {
            console.warn('AI calibration analysis failed:', error);
            return {
                isCalibration: false,
                calibrationType: 'normal',
                confidence: 0.1,
                correctAnswer: null,
                strategy: 'answer_randomly',
                reasoning: 'AI analysis failed, treating as normal question'
            };
        }
    }

    /**
     * Analyze entire page for calibration patterns
     */
    async analyzePageForCalibration(questions, pageContext) {
        const totalQuestions = questions.length;
        const shortQuestions = questions.filter(q => q.text.length < 100).length;
        const hasOptionsPattern = questions.filter(q => 
            q.options && q.options.some(opt => /option.*[0-9]|choice.*[a-z]/i.test(opt.text))
        ).length;
        
        const prompt = `Analyze this survey page to determine if it's primarily a calibration/screening page:

SURVEY OVERVIEW:
- Total questions: ${totalQuestions}
- Short questions (< 100 chars): ${shortQuestions}
- Questions with numbered options: ${hasOptionsPattern}
- Page title: ${pageContext.title || 'unknown'}
- URL: ${pageContext.url || 'unknown'}

QUESTIONS SUMMARY:
${questions.slice(0, 5).map((q, i) => `${i + 1}. "${q.text.substring(0, 80)}..." (${q.type})`).join('\n')}
${questions.length > 5 ? `... and ${questions.length - 5} more questions` : ''}

DETECT:
- Is this a calibration/screening phase before main survey?
- Are these attention/quality check questions?
- Is this a bot detection phase?
- Should we be cautious about how we answer?

RESPOND WITH JSON:
{
  "isCalibrationPage": boolean,
  "pageType": "calibration|screening|qualification|attention_test|main_survey|mixed",
  "confidence": 0.0-1.0,
  "riskLevel": "low|medium|high",
  "recommendedStrategy": "answer_carefully|answer_quickly|be_consistent|show_attention",
  "reasoning": "analysis of why this is/isn't calibration",
  "nextExpected": "main_survey|more_calibration|completion|redirect"
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 250
            });

            return JSON.parse(response);
        } catch (error) {
            console.warn('Page calibration analysis failed:', error);
            return {
                isCalibrationPage: false,
                pageType: 'main_survey',
                confidence: 0.1,
                riskLevel: 'low',
                recommendedStrategy: 'answer_randomly',
                reasoning: 'Analysis failed, assuming normal survey'
            };
        }
    }

    /**
     * Detect specific calibration type
     */
    detectCalibrationType(question, aiAnalysis) {
        const text = question.text.toLowerCase();
        
        // Override AI with strong pattern matches
        if (/please select.*option.*[0-9]|choose.*option.*[a-z]/i.test(text)) {
            return 'attention_check';
        }
        
        if (/capital|president|color.*sky|simple.*math/i.test(text)) {
            return 'knowledge_test';
        }
        
        if (/same.*previous|consistent.*answer/i.test(text)) {
            return 'consistency_check';
        }
        
        if (/quick|fast|immediate|speed/i.test(text)) {
            return 'speed_trap';
        }
        
        return aiAnalysis.calibrationType || 'normal';
    }

    /**
     * Generate appropriate answers for calibration questions
     */
    async generateCalibrationAnswer(questionAnalysis, userPersona = null) {
        const { question, isCalibration, calibrationType, correctAnswer, strategy } = questionAnalysis;
        
        if (!isCalibration) {
            return null; // Not a calibration question
        }
        
        console.log(`🎯 Handling calibration question: ${calibrationType}`);
        
        switch (strategy) {
            case 'answer_correctly':
                return await this.generateCorrectAnswer(questionAnalysis, userPersona);
                
            case 'answer_consistently':
                return await this.generateConsistentAnswer(questionAnalysis, userPersona);
                
            case 'skip':
                return { action: 'skip', reason: 'Calibration question should be skipped' };
                
            case 'answer_randomly':
            default:
                return await this.generateRandomAnswer(questionAnalysis, userPersona);
        }
    }

    /**
     * Generate correct answer for knowledge tests and attention checks
     */
    async generateCorrectAnswer(questionAnalysis, userPersona) {
        const { question, correctAnswer, calibrationType, options } = questionAnalysis;
        
        if (correctAnswer) {
            // AI provided specific correct answer
            return {
                action: 'answer',
                value: correctAnswer,
                confidence: 0.9,
                reasoning: `Correct answer for ${calibrationType}: ${correctAnswer}`
            };
        }
        
        // Generate correct answer based on type
        switch (calibrationType) {
            case 'attention_check':
                return await this.handleAttentionCheck(question, options);
                
            case 'knowledge_test':
                return await this.handleKnowledgeTest(question, options);
                
            default:
                return await this.generateRandomAnswer(questionAnalysis, userPersona);
        }
    }

    /**
     * Handle attention check questions
     */
    async handleAttentionCheck(question, options) {
        const text = question.text.toLowerCase();
        
        // Look for specific instructions
        const instructionMatch = text.match(/select.*option.*([0-9])|choose.*option.*([a-z])|pick.*([0-9])/i);
        
        if (instructionMatch) {
            const target = instructionMatch[1] || instructionMatch[2] || instructionMatch[3];
            
            // Find matching option
            const matchingOption = options.find(opt => 
                opt.text.toLowerCase().includes(target.toLowerCase()) ||
                opt.value.toLowerCase().includes(target.toLowerCase())
            );
            
            if (matchingOption) {
                return {
                    action: 'answer',
                    value: matchingOption.value,
                    confidence: 0.95,
                    reasoning: `Attention check: Following instruction to select ${target}`
                };
            }
        }
        
        // Look for "correct" option
        const correctOption = options.find(opt => 
            /correct|yes|agree|continue/i.test(opt.text)
        );
        
        if (correctOption) {
            return {
                action: 'answer',
                value: correctOption.value,
                confidence: 0.8,
                reasoning: 'Attention check: Selecting positive/correct option'
            };
        }
        
        // Fallback to first option
        return {
            action: 'answer',
            value: options[0]?.value,
            confidence: 0.5,
            reasoning: 'Attention check: Fallback to first option'
        };
    }

    /**
     * Handle knowledge test questions
     */
    async handleKnowledgeTest(question, options) {
        const prompt = `Answer this factual question correctly:

QUESTION: "${question.text}"

OPTIONS:
${options.map(o => `- ${o.text}`).join('\n')}

Provide the factually correct answer. If multiple options could be correct, choose the most commonly accepted one.

RESPOND WITH JSON:
{
  "correctOption": "exact option text",
  "confidence": 0.0-1.0,
  "reasoning": "why this is correct"
}`;

        try {
            const response = await this.ai.analyze(prompt, 'gpt-3.5-turbo', {
                temperature: 0.1,
                maxTokens: 150
            });

            const analysis = JSON.parse(response);
            const matchingOption = options.find(opt => opt.text === analysis.correctOption);
            
            if (matchingOption) {
                return {
                    action: 'answer',
                    value: matchingOption.value,
                    confidence: analysis.confidence,
                    reasoning: `Knowledge test: ${analysis.reasoning}`
                };
            }
            
        } catch (error) {
            console.warn('Knowledge test analysis failed:', error);
        }
        
        // Fallback
        return {
            action: 'answer',
            value: options[0]?.value,
            confidence: 0.3,
            reasoning: 'Knowledge test: Could not determine correct answer, using fallback'
        };
    }

    /**
     * Generate consistent answer based on previous responses
     */
    async generateConsistentAnswer(questionAnalysis, userPersona) {
        // This would need access to previous answers to maintain consistency
        // For now, return a default consistent approach
        return {
            action: 'answer',
            value: questionAnalysis.options?.[0]?.value,
            confidence: 0.6,
            reasoning: 'Consistency check: Using default consistent approach'
        };
    }

    /**
     * Generate random but human-like answer
     */
    async generateRandomAnswer(questionAnalysis, userPersona) {
        const options = questionAnalysis.options || [];
        
        if (options.length === 0) {
            return {
                action: 'answer',
                value: 'I prefer not to answer',
                confidence: 0.5,
                reasoning: 'Random answer for text input'
            };
        }
        
        // Avoid obviously wrong or suspicious options
        const safeOptions = options.filter(opt => {
            const text = opt.text.toLowerCase();
            return !text.includes('bot') && 
                   !text.includes('robot') && 
                   !text.includes('automated') &&
                   !text.includes('script');
        });
        
        const selectedOptions = safeOptions.length > 0 ? safeOptions : options;
        const randomOption = selectedOptions[Math.floor(Math.random() * selectedOptions.length)];
        
        return {
            action: 'answer',
            value: randomOption.value,
            confidence: 0.7,
            reasoning: `Random selection from ${selectedOptions.length} safe options`
        };
    }

    /**
     * Calculate overall confidence in calibration detection
     */
    calculateOverallConfidence(questionAnalysis, pageAnalysis) {
        const questionConfidences = questionAnalysis.map(q => q.confidence);
        const avgQuestionConfidence = questionConfidences.reduce((a, b) => a + b, 0) / questionConfidences.length;
        
        // Weight page-level analysis higher
        return (avgQuestionConfidence * 0.4) + (pageAnalysis.confidence * 0.6);
    }

    /**
     * Get calibration handling strategy for the entire page
     */
    getPageStrategy(analysis) {
        const { pageLevel, questions } = analysis;
        
        return {
            isCalibrationPhase: pageLevel.isCalibrationPage,
            riskLevel: pageLevel.riskLevel,
            strategy: pageLevel.recommendedStrategy,
            calibrationQuestions: questions.filter(q => q.isCalibration),
            normalQuestions: questions.filter(q => !q.isCalibration),
            expectedNext: pageLevel.nextExpected,
            confidence: analysis.confidence
        };
    }
}

module.exports = CalibrationHandler;