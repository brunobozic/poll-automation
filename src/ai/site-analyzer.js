/**
 * AI-Powered Site Structure Recognition System
 * Analyzes poll sites to understand structure, navigation, and interaction patterns
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AISiteAnalyzer {
    constructor(aiService, cacheDir = './data/site-cache') {
        this.ai = aiService;
        this.cacheDir = cacheDir;
        this.patterns = new Map();
        this.initializeCache();
    }

    async initializeCache() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            
            // Load existing patterns
            const cacheFile = path.join(this.cacheDir, 'site-patterns.json');
            try {
                const data = await fs.readFile(cacheFile, 'utf8');
                const patterns = JSON.parse(data);
                for (const [key, pattern] of Object.entries(patterns)) {
                    this.patterns.set(key, pattern);
                }
            } catch (error) {
                // Cache file doesn't exist yet
            }
        } catch (error) {
            console.error('Failed to initialize site analyzer cache:', error);
        }
    }

    /**
     * Analyze a poll site structure using AI
     */
    async analyzeSite(page, options = {}) {
        const url = page.url();
        const domain = new URL(url).hostname;
        const cacheKey = this.generateCacheKey(domain, url);
        
        // Check cache first
        const cached = this.getCachedPattern(cacheKey);
        if (cached && !this.needsReanalysis(cached, options.forceRefresh)) {
            return {
                ...cached,
                source: 'cache',
                timestamp: cached.timestamp
            };
        }

        console.log(`🔍 Analyzing site structure for: ${domain}`);

        try {
            // Collect site data
            const siteData = await this.collectSiteData(page);
            
            // Determine if we need visual analysis
            const needsVisualAnalysis = this.shouldUseVisualAnalysis(siteData);
            
            let analysis;
            if (needsVisualAnalysis && options.allowVisualAI !== false) {
                analysis = await this.performVisualAnalysis(siteData, options);
            } else {
                analysis = await this.performDOMAnalysis(siteData, options);
            }

            // Enhance with learned patterns
            analysis = await this.enhanceWithPatterns(analysis, domain);

            // Cache the result
            await this.cachePattern(cacheKey, analysis);

            return {
                ...analysis,
                source: needsVisualAnalysis ? 'visual_ai' : 'dom_analysis',
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Site analysis failed:', error);
            return this.getFallbackAnalysis(domain);
        }
    }

    async collectSiteData(page) {
        const url = page.url();
        
        // Collect comprehensive site information
        const [screenshot, html, metadata] = await Promise.all([
            page.screenshot({ fullPage: false, quality: 80 }),
            page.content(),
            page.evaluate(() => ({
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.content || '',
                frameworks: {
                    react: !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__),
                    vue: !!(window.Vue || window.__VUE__),
                    angular: !!(window.angular || window.ng),
                    jquery: !!window.jQuery
                },
                forms: Array.from(document.forms).map(form => ({
                    id: form.id,
                    name: form.name,
                    method: form.method,
                    action: form.action,
                    fieldCount: form.elements.length
                })),
                buttons: Array.from(document.querySelectorAll('button, input[type="submit"]')).length,
                inputs: Array.from(document.querySelectorAll('input, select, textarea')).length,
                iframes: Array.from(document.querySelectorAll('iframe')).length,
                hasModal: !!document.querySelector('.modal, [role="dialog"]'),
                hasOverlay: !!document.querySelector('.overlay, .backdrop'),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }))
        ]);

        return {
            url,
            domain: new URL(url).hostname,
            screenshot,
            html,
            metadata,
            timestamp: Date.now()
        };
    }

    shouldUseVisualAnalysis(siteData) {
        // Use visual analysis for complex sites
        return (
            siteData.metadata.frameworks.react ||
            siteData.metadata.frameworks.vue ||
            siteData.metadata.frameworks.angular ||
            siteData.metadata.iframes > 0 ||
            siteData.metadata.hasModal ||
            siteData.metadata.inputs === 0 || // Dynamic content
            this.isKnownComplexSite(siteData.domain)
        );
    }

    async performVisualAnalysis(siteData, options = {}) {
        const model = options.model || 'gpt-4-vision-preview';
        
        const prompt = `Analyze this poll/survey website and provide a JSON response with the following structure:

{
  "siteType": "survey|poll|form|questionnaire|market_research",
  "complexity": "simple|moderate|complex",
  "framework": "react|vue|angular|jquery|vanilla|unknown",
  "navigation": {
    "type": "linear|branching|adaptive|single_page",
    "hasProgress": boolean,
    "hasBackButton": boolean,
    "requiresAllQuestions": boolean
  },
  "authentication": {
    "required": boolean,
    "type": "login|registration|guest|social",
    "location": "modal|page|embedded"
  },
  "questionTypes": ["single_choice", "multiple_choice", "text", "rating", "yes_no", "demographic"],
  "layout": {
    "questionsPerPage": number,
    "isResponsive": boolean,
    "hasFixedHeader": boolean,
    "usesCards": boolean
  },
  "submitPattern": {
    "buttonSelector": "string",
    "requiresValidation": boolean,
    "hasConfirmation": boolean,
    "redirectsAfterSubmit": boolean
  },
  "antiBot": {
    "hasCaptcha": boolean,
    "hasTimeRestrictions": boolean,
    "hasHoneyPots": boolean,
    "detectsAutomation": boolean
  },
  "selectors": {
    "questions": ["selector1", "selector2"],
    "options": ["selector1", "selector2"],
    "nextButton": ["selector1", "selector2"],
    "submitButton": ["selector1", "selector2"],
    "errorMessages": ["selector1", "selector2"]
  }
}

Site URL: ${siteData.url}
Site has ${siteData.metadata.inputs} input fields, ${siteData.metadata.buttons} buttons, ${siteData.metadata.iframes} iframes.
Detected frameworks: ${Object.entries(siteData.metadata.frameworks).filter(([k,v]) => v).map(([k]) => k).join(', ')}`;

        try {
            const response = await this.ai.analyzeWithVision({
                prompt,
                image: siteData.screenshot,
                model,
                maxTokens: 2000
            });

            return {
                ...JSON.parse(response),
                analysisMethod: 'visual',
                cost: this.estimateCost(model, prompt.length, 2000),
                confidence: 0.9
            };
        } catch (error) {
            console.error('Visual analysis failed, falling back to DOM analysis:', error);
            return await this.performDOMAnalysis(siteData, options);
        }
    }

    async performDOMAnalysis(siteData, options = {}) {
        const model = options.model || 'gpt-3.5-turbo';
        
        // Extract relevant HTML sections
        const relevantHTML = this.extractRelevantHTML(siteData.html);
        
        const prompt = `Analyze this poll/survey website HTML structure and provide site classification:

HTML Structure:
${relevantHTML}

Site Metadata:
- URL: ${siteData.url}
- Forms: ${siteData.metadata.forms.length}
- Inputs: ${siteData.metadata.inputs}
- Buttons: ${siteData.metadata.buttons}
- Frameworks: ${Object.entries(siteData.metadata.frameworks).filter(([k,v]) => v).map(([k]) => k).join(', ')}

Provide JSON response with same structure as visual analysis, but focus on:
1. Identifying question selectors from HTML structure
2. Detecting form patterns and submission flows
3. Finding navigation elements
4. Classifying based on HTML patterns and class names

Be conservative with confidence scores for DOM-only analysis.`;

        try {
            const response = await this.ai.analyze({
                prompt,
                model,
                maxTokens: 1500,
                temperature: 0.1
            });

            return {
                ...JSON.parse(response),
                analysisMethod: 'dom',
                cost: this.estimateCost(model, prompt.length, 1500),
                confidence: 0.7
            };
        } catch (error) {
            console.error('DOM analysis failed:', error);
            return this.getFallbackAnalysis(siteData.domain);
        }
    }

    extractRelevantHTML(html) {
        // Extract key sections for analysis
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const sections = [];
        
        // Forms
        const forms = doc.querySelectorAll('form');
        forms.forEach(form => {
            sections.push(`<form>${form.innerHTML.substring(0, 2000)}</form>`);
        });
        
        // Main content
        const main = doc.querySelector('main, #main, .main-content, .survey-content');
        if (main) {
            sections.push(`<main>${main.innerHTML.substring(0, 3000)}</main>`);
        }
        
        // Navigation
        const nav = doc.querySelector('nav, .navigation, .survey-nav');
        if (nav) {
            sections.push(`<nav>${nav.innerHTML.substring(0, 1000)}</nav>`);
        }
        
        return sections.join('\n').substring(0, 8000); // Limit total size
    }

    async enhanceWithPatterns(analysis, domain) {
        // Find similar domains and apply learned patterns
        const similarPatterns = this.findSimilarPatterns(domain);
        
        if (similarPatterns.length > 0) {
            // Merge successful selectors from similar sites
            analysis.selectors = this.mergeSelectors(analysis.selectors, similarPatterns);
            analysis.confidence = Math.min(0.95, analysis.confidence + 0.1);
        }

        return analysis;
    }

    generateCacheKey(domain, url) {
        const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
        return `${domain}_${urlHash}`;
    }

    getCachedPattern(cacheKey) {
        return this.patterns.get(cacheKey);
    }

    needsReanalysis(cached, forceRefresh = false) {
        if (forceRefresh) return true;
        
        const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
        const maxAge = cached.analysisMethod === 'visual' ? 168 : 72; // 7 days for visual, 3 days for DOM
        
        return ageHours > maxAge || cached.confidence < 0.6;
    }

    async cachePattern(cacheKey, analysis) {
        this.patterns.set(cacheKey, {
            ...analysis,
            timestamp: Date.now()
        });

        // Save to disk
        try {
            const cacheFile = path.join(this.cacheDir, 'site-patterns.json');
            const data = Object.fromEntries(this.patterns);
            await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save pattern cache:', error);
        }
    }

    findSimilarPatterns(domain) {
        const similar = [];
        
        for (const [key, pattern] of this.patterns.entries()) {
            if (key.startsWith(domain) || this.isDomainSimilar(domain, pattern.domain)) {
                similar.push(pattern);
            }
        }
        
        return similar.sort((a, b) => b.confidence - a.confidence);
    }

    isDomainSimilar(domain1, domain2) {
        // Simple similarity check - can be enhanced
        const tld1 = domain1.split('.').slice(-2).join('.');
        const tld2 = domain2.split('.').slice(-2).join('.');
        return tld1 === tld2;
    }

    mergeSelectors(baseSelectors, patterns) {
        const merged = { ...baseSelectors };
        
        patterns.forEach(pattern => {
            if (pattern.selectors && pattern.confidence > 0.8) {
                Object.keys(pattern.selectors).forEach(key => {
                    if (pattern.selectors[key] && Array.isArray(pattern.selectors[key])) {
                        merged[key] = [...(merged[key] || []), ...pattern.selectors[key]];
                        // Remove duplicates
                        merged[key] = [...new Set(merged[key])];
                    }
                });
            }
        });
        
        return merged;
    }

    isKnownComplexSite(domain) {
        const complexSites = [
            'surveymonkey.com',
            'typeform.com',
            'google.com/forms',
            'qualtrics.com',
            'formstack.com'
        ];
        
        return complexSites.some(site => domain.includes(site));
    }

    getFallbackAnalysis(domain) {
        return {
            siteType: 'survey',
            complexity: 'moderate',
            framework: 'unknown',
            navigation: {
                type: 'linear',
                hasProgress: true,
                hasBackButton: false,
                requiresAllQuestions: true
            },
            authentication: {
                required: false,
                type: 'guest'
            },
            questionTypes: ['single_choice', 'multiple_choice', 'text'],
            layout: {
                questionsPerPage: 1,
                isResponsive: true,
                hasFixedHeader: false,
                usesCards: false
            },
            submitPattern: {
                buttonSelector: 'button[type="submit"], .submit-button, .next-button',
                requiresValidation: true,
                hasConfirmation: false,
                redirectsAfterSubmit: true
            },
            antiBot: {
                hasCaptcha: false,
                hasTimeRestrictions: false,
                hasHoneyPots: false,
                detectsAutomation: false
            },
            selectors: {
                questions: ['.question', '[data-question]', '.survey-question'],
                options: ['input[type="radio"]', 'input[type="checkbox"]', '.option'],
                nextButton: ['.next-button', 'button[type="submit"]', '.continue'],
                submitButton: ['.submit-button', 'button[type="submit"]', '.finish'],
                errorMessages: ['.error', '.validation-error', '.alert-danger']
            },
            analysisMethod: 'fallback',
            confidence: 0.3,
            timestamp: Date.now()
        };
    }

    estimateCost(model, promptLength, maxTokens) {
        const costs = {
            'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
        };
        
        const pricing = costs[model] || costs['gpt-3.5-turbo'];
        const inputTokens = Math.ceil(promptLength / 4); // Rough estimate
        const outputTokens = maxTokens;
        
        return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
    }

    // Public methods for integration
    async getPatternForSite(domain) {
        const patterns = this.findSimilarPatterns(domain);
        return patterns[0] || null;
    }

    async updatePatternFromSuccess(domain, selectors, metadata) {
        // Learn from successful automation
        const cacheKey = this.generateCacheKey(domain, metadata.url);
        const existing = this.getCachedPattern(cacheKey);
        
        if (existing) {
            // Merge successful selectors
            existing.selectors = this.mergeSelectors(existing.selectors, { selectors });
            existing.confidence = Math.min(0.95, existing.confidence + 0.05);
            existing.lastSuccess = Date.now();
            
            await this.cachePattern(cacheKey, existing);
        }
    }

    async reportFailure(domain, error, selectors) {
        // Learn from failures
        const cacheKey = this.generateCacheKey(domain, domain);
        const existing = this.getCachedPattern(cacheKey);
        
        if (existing) {
            existing.confidence = Math.max(0.1, existing.confidence - 0.1);
            existing.lastFailure = {
                timestamp: Date.now(),
                error: error.message,
                failedSelectors: selectors
            };
            
            await this.cachePattern(cacheKey, existing);
        }
    }

    getStats() {
        const patterns = Array.from(this.patterns.values());
        
        return {
            totalPatterns: patterns.length,
            avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
            methodDistribution: {
                visual: patterns.filter(p => p.analysisMethod === 'visual').length,
                dom: patterns.filter(p => p.analysisMethod === 'dom').length,
                fallback: patterns.filter(p => p.analysisMethod === 'fallback').length
            },
            totalCost: patterns.reduce((sum, p) => sum + (p.cost || 0), 0)
        };
    }
}

module.exports = AISiteAnalyzer;