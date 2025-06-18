/**
 * Intelligent Question Classification and Answering System
 * Analyzes survey questions to determine response strategies and generate appropriate answers
 */

const fs = require('fs').promises;
const path = require('path');

class AIQuestionClassifier {
    constructor(aiService, cacheDir = './data/question-cache') {
        this.ai = aiService;
        this.cacheDir = cacheDir;
        this.questionCache = new Map();
        this.responsePatterns = new Map();
        this.personas = new Map();
        this.initializeCache();
        this.loadPersonas();
    }

    async initializeCache() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            
            // Load cached classifications
            const cacheFile = path.join(this.cacheDir, 'question-classifications.json');
            try {
                const data = await fs.readFile(cacheFile, 'utf8');
                const classifications = JSON.parse(data);
                for (const [key, classification] of Object.entries(classifications)) {
                    this.questionCache.set(key, classification);
                }
            } catch (error) {
                // Cache doesn't exist yet
            }

            // Load response patterns
            const patternsFile = path.join(this.cacheDir, 'response-patterns.json');
            try {
                const data = await fs.readFile(patternsFile, 'utf8');
                const patterns = JSON.parse(data);
                for (const [key, pattern] of Object.entries(patterns)) {
                    this.responsePatterns.set(key, pattern);
                }
            } catch (error) {
                // Patterns don't exist yet
            }

        } catch (error) {
            console.error('Failed to initialize question classifier cache:', error);
        }
    }

    async loadPersonas() {
        // Load default personas for consistent responses
        this.personas.set('default', {
            age: 28,
            gender: 'male',
            location: 'suburban',
            education: 'college',
            income: 'middle',
            interests: ['technology', 'sports', 'movies'],
            politicalLean: 'moderate',
            brand_preferences: ['mainstream'],
            lifestyle: 'active',
            family_status: 'single'
        });

        this.personas.set('female_professional', {
            age: 32,
            gender: 'female',
            location: 'urban',
            education: 'graduate',
            income: 'upper_middle',
            interests: ['career', 'health', 'travel'],
            politicalLean: 'liberal',
            brand_preferences: ['premium'],
            lifestyle: 'busy_professional',
            family_status: 'married'
        });

        this.personas.set('young_student', {
            age: 21,
            gender: 'non-binary',
            location: 'urban',
            education: 'some_college',
            income: 'low',
            interests: ['gaming', 'social_media', 'music'],
            politicalLean: 'progressive',
            brand_preferences: ['trendy', 'affordable'],
            lifestyle: 'social',
            family_status: 'single'
        });
    }

    /**
     * Analyze questions and determine response strategies
     */
    async analyzeQuestions(questions, context = {}) {
        console.log(`🧠 Analyzing ${questions.length} questions...`);
        
        const results = [];
        const batchSize = 5; // Process in batches for cost efficiency
        
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            const batchResults = await this.processBatch(batch, context);
            results.push(...batchResults);
        }

        return results;
    }

    async processBatch(questions, context) {
        const classifications = [];
        
        for (const question of questions) {
            // Check cache first
            const cacheKey = this.generateQuestionKey(question);
            const cached = this.questionCache.get(cacheKey);
            
            if (cached && this.isCacheValid(cached)) {
                classifications.push({
                    ...cached,
                    answer: await this.generateAnswer(question, cached, context),
                    source: 'cache'
                });
                continue;
            }

            // Classify question with AI
            const classification = await this.classifyQuestion(question, context);
            
            // Cache classification
            this.questionCache.set(cacheKey, classification);
            
            // Generate answer
            const answer = await this.generateAnswer(question, classification, context);
            
            classifications.push({
                ...classification,
                answer,
                source: 'ai'
            });
        }

        // Save cache
        await this.saveCache();
        
        return classifications;
    }

    async classifyQuestion(question, context = {}) {
        const prompt = `Analyze this survey question and classify it according to the following categories:

Question: "${question.text}"
Options: ${question.options ? question.options.map(o => o.text || o.value).join(', ') : 'None'}
Question Type: ${question.type}
Required: ${question.required || false}

Provide a JSON response with this structure:
{
  "category": "demographic|preference|behavior|opinion|satisfaction|factual|trick|screening",
  "subcategory": "specific type within category",
  "difficulty": "simple|moderate|complex",
  "isTrick": boolean,
  "isScreener": boolean,
  "sensitivityLevel": "low|medium|high",
  "responseStrategy": "honest|random|pattern|skip|careful",
  "demographicType": "age|gender|location|income|education|employment|family",
  "riskLevel": "safe|moderate|risky",
  "consistency_requirements": {
    "mustMatchPrevious": boolean,
    "relatedQuestions": [],
    "logicalConstraints": []
  },
  "answer_guidelines": {
    "preferredStyle": "specific|general|middle_ground|varied",
    "avoidPatterns": ["pattern1", "pattern2"],
    "mustInclude": [],
    "mustAvoid": []
  }
}

Classification rules:
1. "trick" questions: Impossible knowledge, catch questions, consistency traps
2. "screening" questions: Designed to filter participants
3. "demographic" questions: Personal information gathering
4. "preference" questions: Likes/dislikes, brand choices
5. "behavior" questions: Past actions, habits
6. "opinion" questions: Subjective views, ratings
7. "satisfaction" questions: Rating products/services
8. "factual" questions: Verifiable information

Consider context: Site type is "${context.siteType || 'survey'}", Previous questions: ${context.previousQuestions || 0}`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model: 'gpt-3.5-turbo',
                temperature: 0.1,
                maxTokens: 800
            });

            const classification = JSON.parse(response);
            
            // Add metadata
            classification.timestamp = Date.now();
            classification.questionHash = this.generateQuestionKey(question);
            classification.cost = this.estimateCost('gpt-3.5-turbo', prompt.length, 800);
            
            return classification;

        } catch (error) {
            console.error('Question classification failed:', error);
            return this.getFallbackClassification(question);
        }
    }

    async generateAnswer(question, classification, context = {}) {
        // Skip dangerous questions
        if (classification.isTrick || classification.riskLevel === 'risky') {
            return {
                action: 'skip',
                reason: classification.isTrick ? 'trick_question' : 'high_risk',
                value: null
            };
        }

        // Select persona
        const persona = this.selectPersona(context, classification);
        
        // Generate appropriate answer based on question type and strategy
        switch (classification.responseStrategy) {
            case 'honest':
                return await this.generateHonestAnswer(question, classification, persona);
            case 'random':
                return this.generateRandomAnswer(question, classification);
            case 'pattern':
                return this.generatePatternAnswer(question, classification, context);
            case 'skip':
                return { action: 'skip', reason: 'strategy_skip', value: null };
            case 'careful':
                return await this.generateCarefulAnswer(question, classification, persona, context);
            default:
                return await this.generateHonestAnswer(question, classification, persona);
        }
    }

    async generateHonestAnswer(question, classification, persona) {
        const prompt = `Generate a realistic answer for this survey question based on the persona:

Question: "${question.text}"
Type: ${question.type}
Options: ${question.options ? question.options.map(o => o.text || o.value).join(', ') : 'None'}

Persona:
- Age: ${persona.age}
- Gender: ${persona.gender}
- Location: ${persona.location}
- Education: ${persona.education}
- Income: ${persona.income}
- Interests: ${persona.interests.join(', ')}
- Lifestyle: ${persona.lifestyle}

For multiple choice: Return the exact option text/value
For rating scales: Return a number (1-5 or 1-10)
For text input: Return 1-3 sentences, realistic and consistent with persona
For yes/no: Return "yes" or "no"

Keep responses:
- Realistic for the persona
- Appropriately detailed but not suspicious
- Consistent with typical human responses
- Natural language, not robotic

Answer:`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 200
            });

            return {
                action: 'answer',
                value: response.trim(),
                confidence: 0.8,
                persona: persona,
                reasoning: 'ai_generated_honest'
            };

        } catch (error) {
            console.error('Answer generation failed:', error);
            return this.generateFallbackAnswer(question, classification);
        }
    }

    generateRandomAnswer(question, classification) {
        switch (question.type) {
            case 'single-choice':
            case 'multiple-choice':
                if (question.options && question.options.length > 0) {
                    const randomOption = question.options[Math.floor(Math.random() * question.options.length)];
                    return {
                        action: 'answer',
                        value: randomOption.value || randomOption.text,
                        confidence: 0.5,
                        reasoning: 'random_selection'
                    };
                }
                break;
                
            case 'rating':
                const min = 1;
                const max = question.scale || 5;
                const rating = Math.floor(Math.random() * (max - min + 1)) + min;
                return {
                    action: 'answer',
                    value: rating.toString(),
                    confidence: 0.5,
                    reasoning: 'random_rating'
                };
                
            case 'yes-no':
                return {
                    action: 'answer',
                    value: Math.random() > 0.5 ? 'yes' : 'no',
                    confidence: 0.5,
                    reasoning: 'random_boolean'
                };
                
            case 'text':
                const textResponses = [
                    "I think it's okay.",
                    "No particular opinion.",
                    "It depends on the situation.",
                    "I'm not sure about this.",
                    "It's fine I guess."
                ];
                return {
                    action: 'answer',
                    value: textResponses[Math.floor(Math.random() * textResponses.length)],
                    confidence: 0.4,
                    reasoning: 'random_text'
                };
        }

        return { action: 'skip', reason: 'unknown_type', value: null };
    }

    generatePatternAnswer(question, classification, context) {
        // Use patterns based on previous answers
        const pattern = this.getResponsePattern(classification.category, context);
        
        if (pattern) {
            return {
                action: 'answer',
                value: pattern.value,
                confidence: pattern.confidence,
                reasoning: 'pattern_based'
            };
        }

        return this.generateRandomAnswer(question, classification);
    }

    async generateCarefulAnswer(question, classification, persona, context) {
        // For sensitive questions, be extra careful
        if (classification.sensitivityLevel === 'high') {
            return {
                action: 'skip',
                reason: 'high_sensitivity',
                value: null
            };
        }

        // Use more conservative persona-based generation
        return await this.generateHonestAnswer(question, classification, persona);
    }

    generateFallbackAnswer(question, classification) {
        // Safe fallback answers
        const safeFallbacks = {
            'single-choice': () => question.options ? question.options[0] : null,
            'yes-no': () => 'no', // Conservative choice
            'rating': () => '3', // Middle rating
            'text': () => 'No comment',
            'multiple-choice': () => question.options ? [question.options[0]] : null
        };

        const fallback = safeFallbacks[question.type];
        if (fallback) {
            return {
                action: 'answer',
                value: fallback(),
                confidence: 0.3,
                reasoning: 'fallback'
            };
        }

        return { action: 'skip', reason: 'no_fallback', value: null };
    }

    selectPersona(context, classification) {
        // Select appropriate persona based on context and question
        if (context.persona) {
            return this.personas.get(context.persona) || this.personas.get('default');
        }

        // Smart persona selection based on question category
        if (classification.demographicType === 'gender' && classification.category === 'demographic') {
            // Use varied personas for demographic questions
            const personas = Array.from(this.personas.keys());
            const randomPersona = personas[Math.floor(Math.random() * personas.length)];
            return this.personas.get(randomPersona);
        }

        return this.personas.get('default');
    }

    getResponsePattern(category, context) {
        const patterns = this.responsePatterns.get(category);
        if (patterns && patterns.length > 0) {
            return patterns[Math.floor(Math.random() * patterns.length)];
        }
        return null;
    }

    generateQuestionKey(question) {
        // Generate consistent key for caching
        const questionText = question.text.toLowerCase().replace(/[^a-z0-9]/g, '');
        const questionType = question.type || 'unknown';
        const optionsHash = question.options ? 
            question.options.map(o => o.text || o.value).join('').replace(/[^a-z0-9]/g, '') : '';
        
        return `${questionType}_${questionText.substring(0, 50)}_${optionsHash.substring(0, 20)}`;
    }

    isCacheValid(cached, maxAge = 24 * 60 * 60 * 1000) {
        return (Date.now() - cached.timestamp) < maxAge;
    }

    getFallbackClassification(question) {
        return {
            category: 'opinion',
            subcategory: 'general',
            difficulty: 'simple',
            isTrick: false,
            isScreener: false,
            sensitivityLevel: 'low',
            responseStrategy: 'honest',
            riskLevel: 'safe',
            consistency_requirements: {
                mustMatchPrevious: false,
                relatedQuestions: [],
                logicalConstraints: []
            },
            answer_guidelines: {
                preferredStyle: 'general',
                avoidPatterns: [],
                mustInclude: [],
                mustAvoid: []
            },
            timestamp: Date.now(),
            confidence: 0.3,
            source: 'fallback'
        };
    }

    estimateCost(model, promptLength, maxTokens) {
        const costs = {
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
        };
        
        const pricing = costs[model] || costs['gpt-3.5-turbo'];
        const inputTokens = Math.ceil(promptLength / 4);
        const outputTokens = maxTokens;
        
        return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
    }

    async saveCache() {
        try {
            // Save question classifications
            const classificationsFile = path.join(this.cacheDir, 'question-classifications.json');
            const classifications = Object.fromEntries(this.questionCache);
            await fs.writeFile(classificationsFile, JSON.stringify(classifications, null, 2));

            // Save response patterns
            const patternsFile = path.join(this.cacheDir, 'response-patterns.json');
            const patterns = Object.fromEntries(this.responsePatterns);
            await fs.writeFile(patternsFile, JSON.stringify(patterns, null, 2));

        } catch (error) {
            console.error('Failed to save question classifier cache:', error);
        }
    }

    // Learning methods
    async learnFromSuccess(questions, answers, outcome) {
        // Learn successful response patterns
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const answer = answers[i];
            
            if (answer.action === 'answer' && outcome.success) {
                const category = question.classification?.category || 'unknown';
                
                if (!this.responsePatterns.has(category)) {
                    this.responsePatterns.set(category, []);
                }
                
                this.responsePatterns.get(category).push({
                    value: answer.value,
                    confidence: 0.7,
                    successCount: 1,
                    timestamp: Date.now()
                });
            }
        }
        
        await this.saveCache();
    }

    async learnFromFailure(questions, answers, failure) {
        // Learn from failures to avoid problematic patterns
        console.log(`Learning from failure: ${failure.reason}`);
        
        // Mark risky questions/patterns
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const cacheKey = this.generateQuestionKey(question);
            const cached = this.questionCache.get(cacheKey);
            
            if (cached) {
                cached.riskLevel = 'risky';
                cached.lastFailure = Date.now();
                this.questionCache.set(cacheKey, cached);
            }
        }
        
        await this.saveCache();
    }

    getStats() {
        const classifications = Array.from(this.questionCache.values());
        const patterns = Array.from(this.responsePatterns.values());
        
        return {
            totalQuestions: classifications.length,
            categoryDistribution: this.getCategoryDistribution(classifications),
            averageConfidence: this.getAverageConfidence(classifications),
            totalPatterns: patterns.reduce((sum, p) => sum + p.length, 0),
            totalCost: classifications.reduce((sum, c) => sum + (c.cost || 0), 0),
            cacheHitRate: this.getCacheHitRate()
        };
    }

    getCategoryDistribution(classifications) {
        const distribution = {};
        classifications.forEach(c => {
            distribution[c.category] = (distribution[c.category] || 0) + 1;
        });
        return distribution;
    }

    getAverageConfidence(classifications) {
        if (classifications.length === 0) return 0;
        return classifications.reduce((sum, c) => sum + (c.confidence || 0), 0) / classifications.length;
    }

    getCacheHitRate() {
        // This would need to be tracked during runtime
        return 0.75; // Placeholder
    }
}

module.exports = AIQuestionClassifier;