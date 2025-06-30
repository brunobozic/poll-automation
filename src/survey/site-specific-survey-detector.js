/**
 * Site-Specific Survey Detector
 * 
 * Intelligent system for detecting survey entry points and demographics forms across different survey platforms.
 * This system adapts to each site's unique structure to find:
 * 1. Where surveys are initiated/started
 * 2. Demographics/profile setup forms
 * 3. Survey availability indicators
 * 4. Hidden survey entry points
 */

class SiteSpecificSurveyDetector {
    constructor(page, contentAI, options = {}) {
        this.page = page;
        this.contentAI = contentAI;
        this.options = {
            analysisTimeout: 30000,
            deepScanEnabled: true,
            debugMode: false,
            ...options
        };
        
        // Site-specific patterns for major survey platforms
        this.sitePatterns = {
            'surveyplanet.com': {
                surveyEntryPoints: [
                    '.survey-item', '.survey-card', '.survey-link',
                    '[href*="/survey/"]', '.take-survey', '.start-survey'
                ],
                demographicsIndicators: [
                    '.profile-form', '.demographics', '.user-info',
                    '.personal-info', '.setup-profile', '.user-profile'
                ],
                surveyStartButtons: [
                    '.start-survey', '.begin-survey', '.take-survey',
                    '.survey-start', '.start-button'
                ],
                hiddenSurveySelectors: [
                    '[style*="display:none"]', '.hidden-survey',
                    '.survey-list-item', '.available-survey'
                ],
                demographicsFields: [
                    'age', 'gender', 'income', 'education', 'location',
                    'occupation', 'marital_status', 'household_size'
                ]
            },
            'swagbucks.com': {
                surveyEntryPoints: [
                    '.survey-card', '.sb-survey', '.survey-item',
                    '[href*="/survey"]', '.survey-opportunity'
                ],
                demographicsIndicators: [
                    '.profile-center', '.member-profile', '.demographics-form',
                    '.profile-survey', '.qualification-survey'
                ],
                surveyStartButtons: [
                    '.start-survey', '.take-survey', '.survey-start',
                    '.begin-btn', '.start-btn'
                ],
                hiddenSurveySelectors: [
                    '.survey-wall-item', '.hidden-opportunity',
                    '.available-survey[style*="display"]'
                ]
            },
            'toluna.com': {
                surveyEntryPoints: [
                    '.survey-tile', '.survey-opportunity', '.poll-item',
                    '.survey-card', '.available-survey'
                ],
                demographicsIndicators: [
                    '.profile-completion', '.member-profile',
                    '.personal-details', '.profile-survey'
                ],
                surveyStartButtons: [
                    '.participate-btn', '.start-survey', '.take-part',
                    '.join-survey', '.participate'
                ]
            },
            'surveyjunkie.com': {
                surveyEntryPoints: [
                    '.survey-opportunity', '.survey-card', '.available-survey',
                    '.survey-item', '.opportunity-card'
                ],
                demographicsIndicators: [
                    '.profile-questions', '.member-profile',
                    '.demographic-survey', '.profile-completion'
                ],
                surveyStartButtons: [
                    '.start-survey', '.take-survey', '.begin-survey',
                    '.survey-start', '.opportunity-start'
                ]
            },
            'inboxdollars.com': {
                surveyEntryPoints: [
                    '.survey-offer', '.survey-opportunity', '.paid-survey',
                    '.survey-card', '.earning-opportunity'
                ],
                demographicsIndicators: [
                    '.member-profile', '.profile-survey', '.qualification-questions',
                    '.demographic-info', '.profile-setup'
                ]
            }
        };
        
        // Universal patterns that work across most sites
        this.universalPatterns = {
            surveyEntryPoints: [
                // Text-based indicators
                '[text*="survey" i]', '[text*="poll" i]', '[text*="questionnaire" i]',
                // Common CSS classes
                '.survey', '.poll', '.questionnaire', '.quiz',
                // Links and buttons
                'a[href*="survey"]', 'a[href*="poll"]', 'button[class*="survey"]',
                // Hidden elements that might contain surveys
                'div[style*="display:none"]', '.hidden', '.invisible'
            ],
            demographicsIndicators: [
                // Profile-related terms
                '[text*="profile" i]', '[text*="demographic" i]', '[text*="personal" i]',
                '[text*="about you" i]', '[text*="tell us" i]', '[text*="qualification" i]',
                // Common form indicators
                '.profile', '.demographics', '.personal-info', '.user-info',
                // Setup/completion indicators
                '.setup', '.complete-profile', '.finish-profile'
            ],
            surveyStartIndicators: [
                // Action words
                '[text*="start" i]', '[text*="begin" i]', '[text*="take" i]',
                '[text*="participate" i]', '[text*="join" i]', '[text*="answer" i]',
                // Button classes
                '.start', '.begin', '.take', '.participate', '.join'
            ]
        };
        
        this.log('🔍 Site-Specific Survey Detector initialized');
    }

    /**
     * Comprehensive survey detection for a specific site
     */
    async detectSurveyOpportunities() {
        this.log('🎯 Starting comprehensive survey detection...');
        
        const url = await this.page.url();
        const domain = this.extractDomain(url);
        
        const results = {
            domain: domain,
            url: url,
            timestamp: new Date().toISOString(),
            surveyEntryPoints: [],
            demographicsForm: null,
            hiddenSurveys: [],
            surveyInitiationMethods: [],
            analysisDetails: {}
        };
        
        try {
            // Step 1: Detect visible survey entry points
            results.surveyEntryPoints = await this.detectSurveyEntryPoints(domain);
            
            // Step 2: Detect demographics/profile setup requirements
            results.demographicsForm = await this.detectDemographicsForm(domain);
            
            // Step 3: Find hidden or dynamically loaded surveys
            results.hiddenSurveys = await this.detectHiddenSurveys(domain);
            
            // Step 4: Analyze survey initiation methods
            results.surveyInitiationMethods = await this.analyzeSurveyInitiationMethods(domain);
            
            // Step 5: Use LLM for advanced analysis
            if (this.contentAI) {
                results.analysisDetails = await this.performLLMAnalysis();
            }
            
            this.log(`✅ Survey detection completed: ${results.surveyEntryPoints.length} entry points, ${results.hiddenSurveys.length} hidden surveys`);
            
        } catch (error) {
            this.log(`❌ Survey detection failed: ${error.message}`);
            results.error = error.message;
        }
        
        return results;
    }

    /**
     * Detect visible survey entry points
     */
    async detectSurveyEntryPoints(domain) {
        this.log('🎯 Detecting survey entry points...');
        
        const entryPoints = [];
        const patterns = this.sitePatterns[domain] || this.universalPatterns;
        const selectors = patterns.surveyEntryPoints || this.universalPatterns.surveyEntryPoints;
        
        for (const selector of selectors) {
            try {
                const elements = await this.page.locator(selector).all();
                
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    const isVisible = await element.isVisible();
                    
                    if (isVisible) {
                        const entryPoint = await this.analyzeSurveyEntryPoint(element, i);
                        if (entryPoint && this.isValidSurveyEntry(entryPoint)) {
                            entryPoints.push(entryPoint);
                        }
                    }
                }
            } catch (error) {
                this.log(`⚠️ Error checking selector ${selector}: ${error.message}`);
            }
        }
        
        // Remove duplicates and sort by confidence
        const uniqueEntryPoints = this.deduplicateEntryPoints(entryPoints);
        uniqueEntryPoints.sort((a, b) => b.confidence - a.confidence);
        
        this.log(`📊 Found ${uniqueEntryPoints.length} valid survey entry points`);
        return uniqueEntryPoints;
    }

    /**
     * Detect demographics/profile setup forms
     */
    async detectDemographicsForm(domain) {
        this.log('👤 Detecting demographics form requirements...');
        
        const patterns = this.sitePatterns[domain] || this.universalPatterns;
        const selectors = patterns.demographicsIndicators || this.universalPatterns.demographicsIndicators;
        
        for (const selector of selectors) {
            try {
                const elements = await this.page.locator(selector).all();
                
                for (const element of elements) {
                    const isVisible = await element.isVisible();
                    
                    if (isVisible) {
                        const demographics = await this.analyzeDemographicsForm(element);
                        
                        if (demographics && demographics.confidence > 0.7) {
                            this.log(`✅ Found demographics form: ${demographics.type}`);
                            return demographics;
                        }
                    }
                }
            } catch (error) {
                this.log(`⚠️ Error checking demographics selector ${selector}: ${error.message}`);
            }
        }
        
        // Check for profile completion indicators
        const profileCompletionInfo = await this.checkProfileCompletionStatus();
        if (profileCompletionInfo) {
            this.log('📋 Found profile completion requirements');
            return profileCompletionInfo;
        }
        
        this.log('ℹ️ No demographics form detected on current page');
        return null;
    }

    /**
     * Detect hidden or dynamically loaded surveys
     */
    async detectHiddenSurveys(domain) {
        this.log('🕵️ Detecting hidden surveys...');
        
        const hiddenSurveys = [];
        const patterns = this.sitePatterns[domain] || {};
        const selectors = patterns.hiddenSurveySelectors || [
            '[style*="display:none"]', '.hidden', '.invisible',
            '[class*="hidden"]', '[style*="visibility:hidden"]'
        ];
        
        for (const selector of selectors) {
            try {
                const elements = await this.page.locator(selector).all();
                
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    const hiddenSurvey = await this.analyzeHiddenSurvey(element, i);
                    
                    if (hiddenSurvey && hiddenSurvey.confidence > 0.6) {
                        hiddenSurveys.push(hiddenSurvey);
                    }
                }
            } catch (error) {
                this.log(`⚠️ Error checking hidden selector ${selector}: ${error.message}`);
            }
        }
        
        // Check for surveys that might be loaded via JavaScript
        const dynamicSurveys = await this.detectDynamicSurveys();
        hiddenSurveys.push(...dynamicSurveys);
        
        this.log(`🔍 Found ${hiddenSurveys.length} hidden/dynamic surveys`);
        return hiddenSurveys;
    }

    /**
     * Analyze survey initiation methods for the site
     */
    async analyzeSurveyInitiationMethods(domain) {
        this.log('🚀 Analyzing survey initiation methods...');
        
        const methods = [];
        const patterns = this.sitePatterns[domain] || {};
        
        // Check for direct start buttons
        const startButtons = await this.findSurveyStartButtons(patterns);
        if (startButtons.length > 0) {
            methods.push({
                type: 'direct_button',
                method: 'Click survey start button',
                elements: startButtons,
                confidence: 0.9
            });
        }
        
        // Check for navigation-based initiation
        const navigationMethods = await this.findNavigationBasedInitiation();
        methods.push(...navigationMethods);
        
        // Check for form-based initiation (qualification surveys)
        const formMethods = await this.findFormBasedInitiation();
        methods.push(...formMethods);
        
        // Check for URL-based initiation
        const urlMethods = await this.findUrlBasedInitiation();
        methods.push(...urlMethods);
        
        this.log(`📋 Found ${methods.length} survey initiation methods`);
        return methods;
    }

    /**
     * Perform LLM-powered analysis of the page
     */
    async performLLMAnalysis() {
        this.log('🧠 Performing LLM-powered page analysis...');
        
        try {
            const pageContent = await this.page.content();
            const url = await this.page.url();
            
            const prompt = `
SURVEY SITE ANALYSIS TASK:

Analyze this survey platform page and identify:

1. SURVEY ENTRY POINTS: Where can users start taking surveys?
2. DEMOGRAPHICS SETUP: Where does the site collect user demographics/profile info?
3. SURVEY INITIATION: How are new surveys started or accessed?
4. HIDDEN OPPORTUNITIES: Any surveys or opportunities not immediately visible?

URL: ${url}

HTML CONTENT:
${pageContent.substring(0, 10000)}

Please provide analysis in this JSON format:
{
    "surveyEntryPoints": [
        {
            "selector": "CSS selector",
            "description": "What this entry point does",
            "confidence": 0.9,
            "method": "click|navigate|form"
        }
    ],
    "demographicsSetup": {
        "found": true/false,
        "location": "Where demographics are collected",
        "requiredFields": ["age", "gender", "income"],
        "importance": "required|optional|beneficial"
    },
    "surveyInitiation": [
        {
            "method": "How surveys are started",
            "selector": "CSS selector if applicable",
            "description": "Detailed process"
        }
    ],
    "hiddenOpportunities": [
        {
            "type": "Type of hidden content",
            "location": "Where it's located",
            "access_method": "How to access it"
        }
    ],
    "insights": {
        "platformType": "rewards|research|academic|commercial",
        "surveyAvailability": "high|medium|low",
        "profileRequirement": "mandatory|optional|none",
        "recommendations": ["Strategic recommendations for automation"]
    }
}

Focus on actionable, specific information for survey automation.`;

            const response = await this.contentAI.generateResponse(prompt);
            
            try {
                const analysis = JSON.parse(response);
                this.log('✅ LLM analysis completed successfully');
                return analysis;
            } catch (parseError) {
                this.log(`⚠️ LLM response parsing failed: ${parseError.message}`);
                return { rawResponse: response, error: 'Failed to parse JSON' };
            }
            
        } catch (error) {
            this.log(`❌ LLM analysis failed: ${error.message}`);
            return { error: error.message };
        }
    }

    /**
     * Analyze a potential survey entry point
     */
    async analyzeSurveyEntryPoint(element, index) {
        try {
            const text = await element.textContent() || '';
            const href = await element.getAttribute('href') || '';
            const className = await element.getAttribute('class') || '';
            const id = await element.getAttribute('id') || '';
            
            // Calculate confidence based on content
            let confidence = 0;
            
            // Text analysis
            const surveyKeywords = ['survey', 'poll', 'questionnaire', 'quiz', 'study', 'research'];
            const actionKeywords = ['take', 'start', 'begin', 'participate', 'join', 'answer'];
            
            const lowerText = text.toLowerCase();
            const hasSurvey = surveyKeywords.some(keyword => lowerText.includes(keyword));
            const hasAction = actionKeywords.some(keyword => lowerText.includes(keyword));
            
            if (hasSurvey) confidence += 0.4;
            if (hasAction) confidence += 0.3;
            if (href.includes('survey') || href.includes('poll')) confidence += 0.3;
            if (className.includes('survey') || className.includes('poll')) confidence += 0.2;
            
            // Determine entry method
            let method = 'unknown';
            if (href) method = 'navigate';
            else if (element.tagName?.toLowerCase() === 'button') method = 'click';
            else if (element.tagName?.toLowerCase() === 'form') method = 'form';
            
            return {
                id: `entry_${index}_${Date.now()}`,
                selector: await this.generateSelector(element),
                text: text.trim(),
                href: href,
                className: className,
                method: method,
                confidence: confidence,
                element: element,
                detectedAt: new Date().toISOString()
            };
            
        } catch (error) {
            this.log(`⚠️ Error analyzing entry point: ${error.message}`);
            return null;
        }
    }

    /**
     * Analyze a demographics form
     */
    async analyzeDemographicsForm(element) {
        try {
            const text = await element.textContent() || '';
            const className = await element.getAttribute('class') || '';
            
            // Look for demographics-related fields within or near the element
            const demographicsFields = await this.findDemographicsFields(element);
            
            let confidence = 0;
            const demographicsKeywords = [
                'demographics', 'profile', 'personal', 'about you',
                'age', 'gender', 'income', 'education', 'occupation'
            ];
            
            const lowerText = text.toLowerCase();
            const hasKeywords = demographicsKeywords.some(keyword => lowerText.includes(keyword));
            
            if (hasKeywords) confidence += 0.4;
            if (demographicsFields.length > 0) confidence += 0.4;
            if (className.includes('profile') || className.includes('demographic')) confidence += 0.2;
            
            return {
                selector: await this.generateSelector(element),
                text: text.trim(),
                fields: demographicsFields,
                type: this.determineDemographicsType(text, demographicsFields),
                confidence: confidence,
                element: element,
                detectedAt: new Date().toISOString()
            };
            
        } catch (error) {
            this.log(`⚠️ Error analyzing demographics form: ${error.message}`);
            return null;
        }
    }

    /**
     * Find demographics fields within an element
     */
    async findDemographicsFields(parentElement) {
        const fields = [];
        const fieldSelectors = [
            'input', 'select', 'textarea',
            '[name*="age"]', '[name*="gender"]', '[name*="income"]',
            '[name*="education"]', '[name*="occupation"]', '[name*="location"]'
        ];
        
        for (const selector of fieldSelectors) {
            try {
                const fieldElements = await parentElement.locator(selector).all();
                
                for (const fieldElement of fieldElements) {
                    const fieldInfo = await this.analyzeFormField(fieldElement);
                    if (fieldInfo && this.isDemographicsField(fieldInfo)) {
                        fields.push(fieldInfo);
                    }
                }
            } catch (error) {
                // Continue checking other selectors
            }
        }
        
        return fields;
    }

    /**
     * Check if a form field is demographics-related
     */
    isDemographicsField(fieldInfo) {
        const demographicsPatterns = [
            'age', 'gender', 'sex', 'income', 'salary', 'education',
            'occupation', 'job', 'location', 'city', 'state', 'country',
            'marital', 'married', 'household', 'children', 'family',
            'ethnicity', 'race', 'religion', 'language'
        ];
        
        const name = fieldInfo.name?.toLowerCase() || '';
        const label = fieldInfo.label?.toLowerCase() || '';
        const placeholder = fieldInfo.placeholder?.toLowerCase() || '';
        
        return demographicsPatterns.some(pattern => 
            name.includes(pattern) || 
            label.includes(pattern) || 
            placeholder.includes(pattern)
        );
    }

    /**
     * Analyze a form field
     */
    async analyzeFormField(element) {
        try {
            return {
                name: await element.getAttribute('name') || '',
                id: await element.getAttribute('id') || '',
                type: await element.getAttribute('type') || '',
                label: await this.getFieldLabel(element),
                placeholder: await element.getAttribute('placeholder') || '',
                required: await element.getAttribute('required') !== null,
                selector: await this.generateSelector(element)
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get label text for a form field
     */
    async getFieldLabel(element) {
        try {
            // Look for associated label
            const id = await element.getAttribute('id');
            if (id) {
                const label = await this.page.locator(`label[for="${id}"]`).first();
                if (await label.isVisible()) {
                    return await label.textContent();
                }
            }
            
            // Look for parent label
            const parentLabel = await element.locator('..').locator('label').first();
            if (await parentLabel.isVisible()) {
                return await parentLabel.textContent();
            }
            
            return '';
        } catch (error) {
            return '';
        }
    }

    /**
     * Validate if an entry point is actually for surveys
     */
    isValidSurveyEntry(entryPoint) {
        // Minimum confidence threshold
        if (entryPoint.confidence < 0.5) return false;
        
        // Must have some survey-related content
        const text = entryPoint.text?.toLowerCase() || '';
        const href = entryPoint.href?.toLowerCase() || '';
        
        const surveyIndicators = ['survey', 'poll', 'questionnaire', 'quiz', 'study'];
        const hasIndicator = surveyIndicators.some(indicator => 
            text.includes(indicator) || href.includes(indicator)
        );
        
        return hasIndicator;
    }

    /**
     * Remove duplicate entry points
     */
    deduplicateEntryPoints(entryPoints) {
        const unique = [];
        const seen = new Set();
        
        for (const point of entryPoints) {
            const key = `${point.text}_${point.href}_${point.method}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(point);
            }
        }
        
        return unique;
    }

    /**
     * Generate a reliable CSS selector for an element
     */
    async generateSelector(element) {
        try {
            // Try ID first
            const id = await element.getAttribute('id');
            if (id) return `#${id}`;
            
            // Try class if unique enough
            const className = await element.getAttribute('class');
            if (className && className.split(' ').length <= 3) {
                const selector = `.${className.split(' ').join('.')}`;
                const matches = await this.page.locator(selector).count();
                if (matches === 1) return selector;
            }
            
            // Try data attributes
            const dataAttrs = await element.evaluate(el => {
                const attrs = [];
                for (const attr of el.attributes) {
                    if (attr.name.startsWith('data-')) {
                        attrs.push(`[${attr.name}="${attr.value}"]`);
                    }
                }
                return attrs;
            });
            
            for (const attr of dataAttrs) {
                const matches = await this.page.locator(attr).count();
                if (matches === 1) return attr;
            }
            
            // Fallback to tag with text content
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());
            const text = await element.textContent();
            
            if (text && text.length < 50) {
                return `${tagName}:has-text("${text.substring(0, 30)}")`;
            }
            
            // Final fallback
            return tagName;
            
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return '';
        }
    }

    /**
     * Additional helper methods for specific detection tasks
     */
    
    async findSurveyStartButtons(patterns) {
        // Implementation for finding survey start buttons
        return [];
    }
    
    async findNavigationBasedInitiation() {
        // Implementation for navigation-based survey initiation
        return [];
    }
    
    async findFormBasedInitiation() {
        // Implementation for form-based survey initiation
        return [];
    }
    
    async findUrlBasedInitiation() {
        // Implementation for URL-based survey initiation
        return [];
    }
    
    async detectDynamicSurveys() {
        // Implementation for dynamic survey detection
        return [];
    }
    
    async checkProfileCompletionStatus() {
        // Implementation for profile completion checking
        return null;
    }
    
    async analyzeHiddenSurvey(element, index) {
        // Implementation for hidden survey analysis
        return null;
    }
    
    determineDemographicsType(text, fields) {
        // Determine the type of demographics form
        if (fields.some(f => f.name.includes('age') || f.name.includes('income'))) {
            return 'comprehensive_profile';
        } else if (fields.some(f => f.name.includes('location'))) {
            return 'basic_profile';
        } else {
            return 'qualification_survey';
        }
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[SiteSpecificSurveyDetector] ${message}`);
        }
    }
}

module.exports = SiteSpecificSurveyDetector;