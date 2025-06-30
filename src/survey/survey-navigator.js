/**
 * Survey Navigator
 * 
 * Intelligent survey detection and navigation system that:
 * - Detects available surveys on survey platforms
 * - Navigates to survey pages and handles multi-page surveys
 * - Tracks survey progress and completion
 * - Handles survey platform-specific navigation patterns
 * - Maintains session state across survey pages
 */

class SurveyNavigator {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            maxSurveyPages: 50,
            navigationTimeout: 30000,
            waitBetweenPages: 2000,
            detectSurveyTimeout: 15000,
            debugMode: false,
            ...options
        };
        
        this.currentSurvey = null;
        this.surveyProgress = {
            currentPage: 0,
            totalPages: null,
            questionsAnswered: 0,
            completionPercentage: 0
        };
        
        // Survey platform patterns
        this.platformPatterns = {
            'surveyplanet.com': {
                surveySelectors: ['.survey-link', '.survey-item', '[href*="/survey/"]'],
                nextButtonSelectors: ['.next-button', '.btn-next', '[type="submit"]', '.submit-btn'],
                progressSelectors: ['.progress-bar', '.survey-progress', '.completion-rate'],
                questionSelectors: ['.question', '.survey-question', '.form-group']
            },
            'typeform.com': {
                surveySelectors: ['.typeform-link', '[href*="typeform.com"]', '.form-link'],
                nextButtonSelectors: ['.next-button', '.continue-btn', '[data-qa="next-button"]'],
                progressSelectors: ['.progress', '.typeform-progress'],
                questionSelectors: ['.question-content', '.typeform-question']
            },
            'surveymonkey.com': {
                surveySelectors: ['.survey-tile', '.survey-link', '[href*="/survey/"]'],
                nextButtonSelectors: ['.next-btn', '.continue-button', '#NextButton'],
                progressSelectors: ['.progress-meter', '.survey-progress'],
                questionSelectors: ['.question-wrapper', '.survey-question']
            },
            'google.com': {
                surveySelectors: ['[href*="forms.gle"]', '[href*="docs.google.com/forms"]'],
                nextButtonSelectors: ['.next-button', '[jsname="M2UYVd"]', '.uArJ5e'],
                progressSelectors: ['.progress-bar', '.freebirdFormviewerViewFormProgressIndicator'],
                questionSelectors: ['.freebirdFormviewerViewItemsItemItem', '.question-content']
            }
        };
        
        this.log('🧭 Survey Navigator initialized');
    }

    /**
     * Detect available surveys on the current page
     */
    async detectSurveys() {
        this.log('🔍 Detecting available surveys...');
        
        const url = await this.page.url();
        const domain = this.extractDomain(url);
        const patterns = this.platformPatterns[domain] || this.platformPatterns['surveyplanet.com'];
        
        const surveys = [];
        
        // Look for survey links and buttons
        for (const selector of patterns.surveySelectors) {
            try {
                const elements = await this.page.locator(selector).all();
                
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    const isVisible = await element.isVisible();
                    
                    if (isVisible) {
                        const surveyInfo = await this.extractSurveyInfo(element, i);
                        if (surveyInfo) {
                            surveys.push(surveyInfo);
                        }
                    }
                }
            } catch (error) {
                this.log(`⚠️ Error checking selector ${selector}: ${error.message}`);
            }
        }
        
        // Also check for embedded surveys on the current page
        const embeddedSurvey = await this.detectEmbeddedSurvey();
        if (embeddedSurvey) {
            surveys.unshift(embeddedSurvey); // Add to beginning as primary option
        }
        
        this.log(`🎯 Found ${surveys.length} surveys available`);
        return surveys;
    }

    /**
     * Navigate to a specific survey
     */
    async navigateToSurvey(surveyInfo) {
        this.log(`🚀 Navigating to survey: ${surveyInfo.title || surveyInfo.id}`);
        
        try {
            if (surveyInfo.isEmbedded) {
                // Survey is already on current page
                this.currentSurvey = surveyInfo;
                await this.initializeSurveyTracking();
                return { success: true, message: 'Survey is embedded on current page' };
            }
            
            if (surveyInfo.url) {
                // Navigate to survey URL
                await this.page.goto(surveyInfo.url, { waitUntil: 'networkidle' });
            } else if (surveyInfo.element) {
                // Click survey link/button
                await surveyInfo.element.click();
                await this.page.waitForNavigation({ waitUntil: 'networkidle' });
            } else {
                throw new Error('No navigation method available for survey');
            }
            
            // Wait for survey to load
            await this.waitForSurveyToLoad();
            
            this.currentSurvey = surveyInfo;
            await this.initializeSurveyTracking();
            
            this.log('✅ Successfully navigated to survey');
            return { success: true, message: 'Successfully navigated to survey' };
            
        } catch (error) {
            this.log(`❌ Failed to navigate to survey: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Navigate to the next page/question in the survey
     */
    async navigateToNextPage() {
        if (!this.currentSurvey) {
            throw new Error('No active survey to navigate');
        }
        
        this.log(`📄 Navigating to next page (current: ${this.surveyProgress.currentPage})`);
        
        const url = await this.page.url();
        const domain = this.extractDomain(url);
        const patterns = this.platformPatterns[domain] || this.platformPatterns['surveyplanet.com'];
        
        // Try to find and click next button
        let nextButton = null;
        
        for (const selector of patterns.nextButtonSelectors) {
            try {
                const buttons = await this.page.locator(selector).all();
                
                for (const button of buttons) {
                    const isVisible = await button.isVisible();
                    const isEnabled = await button.isEnabled();
                    
                    if (isVisible && isEnabled) {
                        const text = await button.textContent();
                        const buttonText = text?.toLowerCase() || '';
                        
                        // Check if this looks like a next/continue button
                        if (this.isNextButton(buttonText)) {
                            nextButton = button;
                            break;
                        }
                    }
                }
                
                if (nextButton) break;
                
            } catch (error) {
                this.log(`⚠️ Error checking next button selector ${selector}: ${error.message}`);
            }
        }
        
        if (!nextButton) {
            throw new Error('No next button found on current page');
        }
        
        try {
            // Scroll to button and click
            await nextButton.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(this.options.waitBetweenPages / 2);
            
            await nextButton.click();
            
            // Wait for navigation or page update
            await Promise.race([
                this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: this.options.navigationTimeout }),
                this.page.waitForSelector('.question, .survey-question, .form-group', { timeout: this.options.navigationTimeout }),
                this.page.waitForTimeout(this.options.navigationTimeout)
            ]);
            
            // Update progress tracking
            this.surveyProgress.currentPage++;
            await this.updateSurveyProgress();
            
            this.log(`✅ Successfully navigated to page ${this.surveyProgress.currentPage}`);
            return { success: true, currentPage: this.surveyProgress.currentPage };
            
        } catch (error) {
            this.log(`❌ Failed to navigate to next page: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if the survey is complete
     */
    async isSurveyComplete() {
        if (!this.currentSurvey) {
            return false;
        }
        
        const url = await this.page.url();
        const pageContent = await this.page.content();
        
        // Check for completion indicators
        const completionIndicators = [
            'thank you', 'thanks', 'complete', 'finished', 'submitted',
            'success', 'done', 'ended', 'final', 'congratulations'
        ];
        
        const lowerContent = pageContent.toLowerCase();
        const hasCompletionText = completionIndicators.some(indicator => 
            lowerContent.includes(indicator)
        );
        
        // Check URL for completion patterns
        const hasCompletionUrl = url.includes('complete') || 
                                url.includes('thank') || 
                                url.includes('success') || 
                                url.includes('finished');
        
        // Check for completion elements
        const completionSelectors = [
            '.completion-message', '.thank-you', '.survey-complete',
            '.success-message', '.finished', '.done-message'
        ];
        
        let hasCompletionElement = false;
        for (const selector of completionSelectors) {
            try {
                const element = await this.page.locator(selector).first();
                if (await element.isVisible()) {
                    hasCompletionElement = true;
                    break;
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        const isComplete = hasCompletionText || hasCompletionUrl || hasCompletionElement;
        
        if (isComplete) {
            this.log('🎉 Survey completed successfully!');
            this.surveyProgress.completionPercentage = 100;
        }
        
        return isComplete;
    }

    /**
     * Get current survey progress information
     */
    async getSurveyProgress() {
        if (!this.currentSurvey) {
            return null;
        }
        
        await this.updateSurveyProgress();
        
        return {
            surveyId: this.currentSurvey.id,
            surveyTitle: this.currentSurvey.title,
            currentPage: this.surveyProgress.currentPage,
            totalPages: this.surveyProgress.totalPages,
            questionsAnswered: this.surveyProgress.questionsAnswered,
            completionPercentage: this.surveyProgress.completionPercentage,
            isComplete: await this.isSurveyComplete()
        };
    }

    /**
     * Extract survey information from an element
     */
    async extractSurveyInfo(element, index) {
        try {
            let title = '';
            let url = '';
            let description = '';
            
            // Try to get title
            try {
                title = await element.textContent() || '';
                title = title.trim();
            } catch (e) {
                title = `Survey ${index + 1}`;
            }
            
            // Try to get URL
            try {
                url = await element.getAttribute('href') || '';
            } catch (e) {
                // Element might not be a link
            }
            
            // Try to get description from nearby elements
            try {
                const parent = element.locator('..');
                const siblingText = await parent.textContent();
                if (siblingText && siblingText.length > title.length) {
                    description = siblingText.trim();
                }
            } catch (e) {
                // No description available
            }
            
            return {
                id: `survey_${index}_${Date.now()}`,
                title: title || `Survey ${index + 1}`,
                description: description,
                url: url,
                element: element,
                isEmbedded: false,
                detectedAt: new Date().toISOString()
            };
            
        } catch (error) {
            this.log(`⚠️ Error extracting survey info: ${error.message}`);
            return null;
        }
    }

    /**
     * Detect if there's an embedded survey on the current page
     */
    async detectEmbeddedSurvey() {
        this.log('🔍 Checking for embedded survey...');
        
        const embeddedSelectors = [
            '.survey-form', '.questionnaire', '.poll-form',
            'form[class*="survey"]', 'form[id*="survey"]',
            '.typeform-widget', '.surveymonkey-embed',
            '.google-forms-embed'
        ];
        
        for (const selector of embeddedSelectors) {
            try {
                const element = await this.page.locator(selector).first();
                if (await element.isVisible()) {
                    this.log('🎯 Found embedded survey on current page');
                    
                    return {
                        id: `embedded_survey_${Date.now()}`,
                        title: 'Embedded Survey',
                        description: 'Survey embedded on current page',
                        url: await this.page.url(),
                        element: element,
                        isEmbedded: true,
                        detectedAt: new Date().toISOString()
                    };
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        return null;
    }

    /**
     * Wait for survey to load completely
     */
    async waitForSurveyToLoad() {
        this.log('⏳ Waiting for survey to load...');
        
        const loadingSelectors = [
            '.question', '.survey-question', '.form-group',
            '.typeform-question', '.survey-item',
            'input[type="text"]', 'input[type="email"]',
            'select', 'textarea', 'input[type="radio"]'
        ];
        
        // Wait for at least one survey element to appear
        await Promise.race(
            loadingSelectors.map(selector => 
                this.page.waitForSelector(selector, { timeout: this.options.detectSurveyTimeout })
            )
        );
        
        // Additional wait for dynamic content
        await this.page.waitForTimeout(1000);
        
        this.log('✅ Survey loaded successfully');
    }

    /**
     * Initialize survey progress tracking
     */
    async initializeSurveyTracking() {
        this.log('📊 Initializing survey progress tracking...');
        
        this.surveyProgress = {
            currentPage: 1,
            totalPages: await this.estimateTotalPages(),
            questionsAnswered: 0,
            completionPercentage: 0
        };
        
        this.log(`📈 Survey tracking initialized: ${this.surveyProgress.totalPages} estimated pages`);
    }

    /**
     * Update survey progress information
     */
    async updateSurveyProgress() {
        if (!this.currentSurvey) return;
        
        const url = await this.page.url();
        const domain = this.extractDomain(url);
        const patterns = this.platformPatterns[domain] || this.platformPatterns['surveyplanet.com'];
        
        // Try to get progress from progress bars
        for (const selector of patterns.progressSelectors) {
            try {
                const progressElement = await this.page.locator(selector).first();
                if (await progressElement.isVisible()) {
                    const progressText = await progressElement.textContent();
                    const progressMatch = progressText.match(/(\d+)%/);
                    
                    if (progressMatch) {
                        this.surveyProgress.completionPercentage = parseInt(progressMatch[1]);
                        break;
                    }
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        // Count questions on current page
        const questionsOnPage = await this.countQuestionsOnCurrentPage();
        this.surveyProgress.questionsAnswered += questionsOnPage;
        
        this.log(`📊 Progress updated: ${this.surveyProgress.completionPercentage}% complete, page ${this.surveyProgress.currentPage}`);
    }

    /**
     * Estimate total number of pages in survey
     */
    async estimateTotalPages() {
        // Look for pagination indicators
        const paginationSelectors = [
            '.page-indicator', '.step-indicator', '.pagination',
            '[class*="step"]', '[class*="page"]'
        ];
        
        for (const selector of paginationSelectors) {
            try {
                const element = await this.page.locator(selector).first();
                if (await element.isVisible()) {
                    const text = await element.textContent();
                    const pageMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
                    
                    if (pageMatch) {
                        return parseInt(pageMatch[2]);
                    }
                }
            } catch (e) {
                // Continue checking
            }
        }
        
        // Default estimate based on number of questions
        const questionCount = await this.countQuestionsOnCurrentPage();
        return Math.max(Math.ceil(questionCount / 3), 5); // Estimate 3 questions per page, minimum 5 pages
    }

    /**
     * Count questions on the current page
     */
    async countQuestionsOnCurrentPage() {
        const url = await this.page.url();
        const domain = this.extractDomain(url);
        const patterns = this.platformPatterns[domain] || this.platformPatterns['surveyplanet.com'];
        
        let questionCount = 0;
        
        for (const selector of patterns.questionSelectors) {
            try {
                const questions = await this.page.locator(selector).all();
                for (const question of questions) {
                    if (await question.isVisible()) {
                        questionCount++;
                    }
                }
            } catch (e) {
                // Continue counting
            }
        }
        
        return questionCount;
    }

    /**
     * Check if button text indicates a next/continue button
     */
    isNextButton(buttonText) {
        const nextIndicators = [
            'next', 'continue', 'proceed', 'forward', '>',
            'submit', 'send', 'go', 'advance', 'continue'
        ];
        
        return nextIndicators.some(indicator => 
            buttonText.includes(indicator)
        );
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
     * Reset survey state
     */
    reset() {
        this.currentSurvey = null;
        this.surveyProgress = {
            currentPage: 0,
            totalPages: null,
            questionsAnswered: 0,
            completionPercentage: 0
        };
        this.log('🔄 Survey navigator state reset');
    }

    /**
     * Get current survey information
     */
    getCurrentSurvey() {
        return this.currentSurvey;
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[SurveyNavigator] ${message}`);
        }
    }
}

module.exports = SurveyNavigator;