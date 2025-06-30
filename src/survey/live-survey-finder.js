/**
 * Live Survey Finder
 * Discovers actual fillable surveys instead of example/demo pages
 */

class LiveSurveyFinder {
    constructor(page) {
        this.page = page;
        this.surveyPlatforms = [
            {
                name: 'SurveyPlanet',
                baseUrl: 'https://surveyplanet.com',
                patterns: {
                    live: /^https:\/\/surveyplanet\.com\/s\/[a-zA-Z0-9]+$/,
                    examples: /\/examples\//,
                    discover: [
                        'https://surveyplanet.com/discover',
                        'https://surveyplanet.com/public-surveys',
                        'https://surveyplanet.com/s/'
                    ]
                }
            },
            {
                name: 'Typeform',
                baseUrl: 'https://typeform.com',
                patterns: {
                    live: /^https:\/\/[a-zA-Z0-9]+\.typeform\.com\/to\/[a-zA-Z0-9]+$/,
                    examples: /\/examples\/|\/templates\//
                }
            },
            {
                name: 'SurveyMonkey',
                baseUrl: 'https://surveymonkey.com',
                patterns: {
                    live: /^https:\/\/www\.surveymonkey\.com\/r\/[a-zA-Z0-9]+$/,
                    examples: /\/templates\/|\/examples\//
                }
            },
            {
                name: 'Google Forms',
                baseUrl: 'https://forms.google.com',
                patterns: {
                    live: /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9_-]+\/viewform/
                }
            }
        ];
    }

    /**
     * Find live surveys from various sources
     */
    async findLiveSurveys(options = {}) {
        const { maxSurveys = 10, platforms = ['SurveyPlanet'] } = options;
        const liveSurveys = [];

        for (const platformName of platforms) {
            const platform = this.surveyPlatforms.find(p => p.name === platformName);
            if (!platform) continue;

            try {
                const surveys = await this.findSurveysForPlatform(platform, maxSurveys);
                liveSurveys.push(...surveys);
                
                if (liveSurveys.length >= maxSurveys) break;
            } catch (error) {
                console.log(`⚠️ Failed to find surveys for ${platformName}: ${error.message}`);
            }
        }

        return liveSurveys.slice(0, maxSurveys);
    }

    /**
     * Find live surveys for a specific platform
     */
    async findSurveysForPlatform(platform, maxSurveys) {
        console.log(`🔍 Finding live surveys for ${platform.name}...`);
        
        if (platform.name === 'SurveyPlanet') {
            return await this.findSurveyPlanetSurveys(maxSurveys);
        }
        
        // Add more platform-specific discovery methods here
        return [];
    }

    /**
     * Find live SurveyPlanet surveys
     */
    async findSurveyPlanetSurveys(maxSurveys) {
        const surveys = [];
        
        // Strategy 1: Try to access public survey directory
        try {
            console.log('🎯 Searching SurveyPlanet public surveys...');
            await this.page.goto('https://surveyplanet.com/s/', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            
            // Look for survey links in the page
            const surveyLinks = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/s/"]'));
                return links
                    .map(link => link.href)
                    .filter(href => /\/s\/[a-zA-Z0-9]+$/.test(href))
                    .slice(0, 20);
            });
            
            console.log(`📋 Found ${surveyLinks.length} potential survey links`);
            surveys.push(...surveyLinks.map(url => ({ url, platform: 'SurveyPlanet', type: 'public' })));
            
        } catch (error) {
            console.log(`⚠️ Public survey search failed: ${error.message}`);
        }

        // Strategy 2: Generate common survey IDs
        if (surveys.length < maxSurveys) {
            console.log('🎯 Trying common survey ID patterns...');
            const commonIds = this.generateSurveyIds(20);
            
            for (const id of commonIds) {
                const surveyUrl = `https://surveyplanet.com/s/${id}`;
                
                try {
                    const response = await this.page.goto(surveyUrl, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 10000 
                    });
                    
                    if (response.status() === 200) {
                        // Check if this is actually a survey page
                        const isValidSurvey = await this.validateSurveyPage();
                        if (isValidSurvey) {
                            surveys.push({ url: surveyUrl, platform: 'SurveyPlanet', type: 'generated' });
                            console.log(`✅ Found live survey: ${surveyUrl}`);
                        }
                    }
                } catch (error) {
                    // Survey doesn't exist or is private
                    continue;
                }
                
                if (surveys.length >= maxSurveys) break;
            }
        }

        // Strategy 3: Search for surveys via search engines (if needed)
        if (surveys.length === 0) {
            console.log('🔍 Attempting search-based discovery...');
            surveys.push(...await this.searchBasedDiscovery('SurveyPlanet', maxSurveys));
        }

        return surveys.slice(0, maxSurveys);
    }

    /**
     * Validate if a page is actually a fillable survey
     */
    async validateSurveyPage() {
        return await this.page.evaluate(() => {
            // Check for survey indicators
            const hasQuestions = document.querySelectorAll('.question, [class*="question"], input, select, textarea').length > 0;
            const hasSubmitButton = document.querySelectorAll('button[type="submit"], input[type="submit"], [class*="submit"]').length > 0;
            const hasForm = document.querySelectorAll('form').length > 0;
            const notErrorPage = !document.body.textContent.toLowerCase().includes('not found');
            const notExamplePage = !window.location.href.includes('/examples/');
            
            return hasQuestions && (hasSubmitButton || hasForm) && notErrorPage && notExamplePage;
        });
    }

    /**
     * Generate common survey ID patterns
     */
    generateSurveyIds(count) {
        const ids = [];
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        // Common patterns: short alphanumeric IDs
        for (let i = 0; i < count; i++) {
            let id = '';
            const length = Math.floor(Math.random() * 4) + 4; // 4-7 characters
            
            for (let j = 0; j < length; j++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            ids.push(id);
        }
        
        // Add some common survey IDs if we know any patterns
        ids.push('test', 'demo', 'survey', 'poll', 'feedback', 'research');
        
        return ids;
    }

    /**
     * Search-based survey discovery using search engines
     */
    async searchBasedDiscovery(platform, maxSurveys) {
        const surveys = [];
        
        try {
            // Use DuckDuckGo to search for live surveys
            const searchQuery = `site:surveyplanet.com/s/ -examples -templates`;
            await this.page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            
            // Extract survey URLs from search results
            const searchResults = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="surveyplanet.com/s/"]'));
                return links
                    .map(link => link.href)
                    .filter(href => /surveyplanet\.com\/s\/[a-zA-Z0-9]+/.test(href))
                    .slice(0, 10);
            });
            
            for (const url of searchResults) {
                surveys.push({ url, platform: 'SurveyPlanet', type: 'search' });
                if (surveys.length >= maxSurveys) break;
            }
            
        } catch (error) {
            console.log(`⚠️ Search-based discovery failed: ${error.message}`);
        }
        
        return surveys;
    }

    /**
     * Check if a URL is a live survey vs an example
     */
    isLiveSurvey(url) {
        for (const platform of this.surveyPlatforms) {
            if (platform.patterns.live.test(url)) {
                return !platform.patterns.examples?.test(url);
            }
        }
        return false;
    }

    /**
     * Get platform info for a URL
     */
    getPlatformInfo(url) {
        for (const platform of this.surveyPlatforms) {
            if (url.includes(platform.baseUrl.replace('https://', ''))) {
                return platform;
            }
        }
        return null;
    }
}

module.exports = LiveSurveyFinder;