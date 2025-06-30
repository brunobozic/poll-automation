/**
 * Real Survey Discoverer
 * Finds actual survey pages instead of login/signup forms
 */

class RealSurveyDiscoverer {
    constructor(page) {
        this.page = page;
        this.surveyPlatforms = {
            'SurveyPlanet': {
                baseUrl: 'https://surveyplanet.com',
                searchUrl: 'https://surveyplanet.com/discover',
                patterns: {
                    survey: /\/s\/[a-zA-Z0-9]+$/,
                    public: /\/public-surveys/
                }
            },
            'SurveyMonkey': {
                baseUrl: 'https://surveymonkey.com',
                searchUrl: 'https://www.surveymonkey.com/mp/sample-surveys/',
                patterns: {
                    survey: /\/r\/[a-zA-Z0-9]+$/,
                    template: /\/templates\//
                }
            },
            'Typeform': {
                baseUrl: 'https://typeform.com',
                searchUrl: 'https://www.typeform.com/templates/',
                patterns: {
                    survey: /\/to\/[a-zA-Z0-9]+$/
                }
            },
            'Google Forms': {
                baseUrl: 'https://forms.google.com',
                patterns: {
                    survey: /\/forms\/d\/[a-zA-Z0-9_-]+\/viewform/
                }
            },
            'JotForm': {
                baseUrl: 'https://jotform.com',
                searchUrl: 'https://www.jotform.com/form-templates/',
                patterns: {
                    survey: /\/form\/[0-9]+/
                }
            }
        };
    }

    /**
     * Discover real survey URLs from various sources
     */
    async discoverRealSurveys(options = {}) {
        const { maxSurveys = 10, platforms = ['SurveyPlanet', 'SurveyMonkey'] } = options;
        const surveys = [];

        console.log(`🔍 Discovering real surveys from ${platforms.length} platforms...`);

        for (const platformName of platforms) {
            if (surveys.length >= maxSurveys) break;

            try {
                const platformSurveys = await this.discoverFromPlatform(platformName, maxSurveys - surveys.length);
                surveys.push(...platformSurveys);
                console.log(`📋 Found ${platformSurveys.length} surveys from ${platformName}`);
            } catch (error) {
                console.log(`⚠️ Discovery failed for ${platformName}: ${error.message}`);
            }
        }

        // Add some known survey examples and templates
        const knownSurveys = await this.getKnownSurveyExamples();
        surveys.push(...knownSurveys.slice(0, Math.max(0, maxSurveys - surveys.length)));

        return surveys.slice(0, maxSurveys);
    }

    /**
     * Discover surveys from a specific platform
     */
    async discoverFromPlatform(platformName, maxSurveys) {
        const platform = this.surveyPlatforms[platformName];
        if (!platform) return [];

        const surveys = [];

        try {
            switch (platformName) {
                case 'SurveyPlanet':
                    surveys.push(...await this.discoverSurveyPlanetSurveys(maxSurveys));
                    break;
                case 'SurveyMonkey':
                    surveys.push(...await this.discoverSurveyMonkeySurveys(maxSurveys));
                    break;
                case 'JotForm':
                    surveys.push(...await this.discoverJotFormSurveys(maxSurveys));
                    break;
                default:
                    console.log(`⚠️ No discovery method for ${platformName}`);
            }
        } catch (error) {
            console.log(`❌ Platform discovery failed: ${error.message}`);
        }

        return surveys.slice(0, maxSurveys);
    }

    /**
     * Discover SurveyPlanet surveys
     */
    async discoverSurveyPlanetSurveys(maxSurveys) {
        const surveys = [];

        try {
            // Try to access public survey directory
            console.log('🔍 Searching SurveyPlanet public surveys...');
            await this.page.goto('https://surveyplanet.com/discover', { 
                waitUntil: 'networkidle', 
                timeout: 20000 
            });

            // Look for survey links
            const surveyUrls = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/s/"]'));
                return links
                    .map(link => link.href)
                    .filter(href => /\/s\/[a-zA-Z0-9]+$/.test(href))
                    .slice(0, 20);
            });

            for (const url of surveyUrls) {
                if (surveys.length >= maxSurveys) break;
                
                const isValid = await this.validateSurveyUrl(url);
                if (isValid) {
                    surveys.push({
                        url,
                        platform: 'SurveyPlanet',
                        type: 'discovered',
                        source: 'public_directory'
                    });
                }
            }

        } catch (error) {
            console.log(`⚠️ SurveyPlanet discovery failed: ${error.message}`);
        }

        return surveys;
    }

    /**
     * Discover SurveyMonkey surveys
     */
    async discoverSurveyMonkeySurveys(maxSurveys) {
        const surveys = [];

        try {
            console.log('🔍 Searching SurveyMonkey sample surveys...');
            await this.page.goto('https://www.surveymonkey.com/mp/sample-surveys/', { 
                waitUntil: 'networkidle', 
                timeout: 20000 
            });

            // Look for survey template links that might be live
            const surveyUrls = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/r/"], a[href*="surveymonkey.com"]'));
                return links
                    .map(link => link.href)
                    .filter(href => /\/r\/[a-zA-Z0-9]+/.test(href))
                    .slice(0, 10);
            });

            for (const url of surveyUrls) {
                if (surveys.length >= maxSurveys) break;
                
                const isValid = await this.validateSurveyUrl(url);
                if (isValid) {
                    surveys.push({
                        url,
                        platform: 'SurveyMonkey',
                        type: 'discovered',
                        source: 'sample_surveys'
                    });
                }
            }

        } catch (error) {
            console.log(`⚠️ SurveyMonkey discovery failed: ${error.message}`);
        }

        return surveys;
    }

    /**
     * Discover JotForm surveys
     */
    async discoverJotFormSurveys(maxSurveys) {
        const surveys = [];

        try {
            console.log('🔍 Searching JotForm templates...');
            await this.page.goto('https://www.jotform.com/form-templates/survey', { 
                waitUntil: 'networkidle', 
                timeout: 20000 
            });

            // Look for form template previews
            const formUrls = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="jotform.com/form"], a[href*="/form/"]'));
                return links
                    .map(link => link.href)
                    .filter(href => /\/form\/[0-9]+/.test(href) || href.includes('preview'))
                    .slice(0, 10);
            });

            for (const url of formUrls) {
                if (surveys.length >= maxSurveys) break;
                
                // Convert template URLs to preview URLs if needed
                let previewUrl = url;
                if (!url.includes('preview') && /\/form\/[0-9]+/.test(url)) {
                    previewUrl = url + '/preview';
                }
                
                const isValid = await this.validateSurveyUrl(previewUrl);
                if (isValid) {
                    surveys.push({
                        url: previewUrl,
                        platform: 'JotForm',
                        type: 'discovered',
                        source: 'templates'
                    });
                }
            }

        } catch (error) {
            console.log(`⚠️ JotForm discovery failed: ${error.message}`);
        }

        return surveys;
    }

    /**
     * Get known survey examples
     */
    async getKnownSurveyExamples() {
        return [
            {
                url: 'https://www.jotform.com/form/202052941568154/preview',
                platform: 'JotForm',
                type: 'known',
                source: 'survey_template'
            },
            {
                url: 'https://www.jotform.com/form/221024443341140/preview',
                platform: 'JotForm',
                type: 'known',
                source: 'feedback_template'
            },
            {
                url: 'https://www.typeform.com/templates/c/surveys/',
                platform: 'Typeform',
                type: 'known',
                source: 'template_gallery'
            }
        ];
    }

    /**
     * Validate if a URL contains an actual fillable survey
     */
    async validateSurveyUrl(url) {
        try {
            console.log(`🔍 Validating: ${url}`);
            
            const response = await this.page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 15000 
            });

            if (response.status() !== 200) {
                return false;
            }

            // Check if page contains survey-like content
            const isSurvey = await this.page.evaluate(() => {
                const text = document.body.textContent.toLowerCase();
                
                // Survey indicators
                const surveyKeywords = [
                    'survey', 'questionnaire', 'feedback', 'poll', 'rate', 'opinion',
                    'how satisfied', 'please select', 'on a scale', 'your experience'
                ];
                
                const hasSurveyKeywords = surveyKeywords.some(keyword => text.includes(keyword));
                
                // Form elements
                const hasInputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea').length > 0;
                const hasRadios = document.querySelectorAll('input[type="radio"]').length > 1;
                const hasCheckboxes = document.querySelectorAll('input[type="checkbox"]').length > 1;
                
                // Anti-patterns (things that indicate it's NOT a survey)
                const antiPatterns = [
                    'sign in', 'log in', 'register', 'create account', 
                    'forgot password', 'billing', 'payment'
                ];
                const hasAntiPatterns = antiPatterns.some(pattern => text.includes(pattern));
                
                return (hasSurveyKeywords || hasRadios || hasCheckboxes) && 
                       hasInputs && 
                       !hasAntiPatterns;
            });

            if (isSurvey) {
                console.log(`✅ Valid survey found: ${url}`);
                return true;
            } else {
                console.log(`❌ Not a valid survey: ${url}`);
                return false;
            }

        } catch (error) {
            console.log(`❌ Validation failed for ${url}: ${error.message}`);
            return false;
        }
    }

    /**
     * Search for surveys using search engines
     */
    async searchBasedDiscovery(query, maxResults = 5) {
        const surveys = [];
        
        try {
            // Use DuckDuckGo to search for surveys
            const searchQuery = `${query} survey form -login -signup -register`;
            await this.page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`, {
                waitUntil: 'networkidle',
                timeout: 20000
            });
            
            // Extract relevant URLs from search results
            const resultUrls = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="surveyplanet"], a[href*="surveymonkey"], a[href*="typeform"], a[href*="jotform"]'));
                return links
                    .map(link => link.href)
                    .filter(href => !href.includes('login') && !href.includes('signup'))
                    .slice(0, 10);
            });
            
            for (const url of resultUrls) {
                if (surveys.length >= maxResults) break;
                
                const isValid = await this.validateSurveyUrl(url);
                if (isValid) {
                    surveys.push({
                        url,
                        platform: 'Unknown',
                        type: 'search_discovered',
                        source: 'search_engine'
                    });
                }
            }
            
        } catch (error) {
            console.log(`⚠️ Search-based discovery failed: ${error.message}`);
        }
        
        return surveys;
    }
}

module.exports = RealSurveyDiscoverer;