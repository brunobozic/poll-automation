/**
 * Enhanced Survey Detector
 * Better detection of actual survey elements vs login/system forms
 */

class EnhancedSurveyDetector {
    constructor(page) {
        this.page = page;
        this.surveyIndicators = {
            // Survey-specific selectors
            elements: [
                // SurveyPlanet
                '.question-container', '.survey-question', '[data-question-id]',
                // Typeform
                '[data-qa="question"]', '.question-group', '[data-testid*="question"]',
                // Google Forms
                '.freebirdFormviewerViewItemsItemItem', '.m2', '[role="radiogroup"]', '[role="listbox"]',
                // SurveyMonkey
                '.question', '.survey-element', '[data-qid]',
                // Generic survey patterns
                '[class*="question"]', '[id*="question"]', '[data-question]',
                'fieldset', '.form-group', '.poll-question'
            ],
            
            // Survey-specific text patterns
            textPatterns: [
                /rate.*(?:experience|service|product)/i,
                /how.*(?:satisfied|likely|often)/i,
                /please.*(?:select|choose|rate|indicate)/i,
                /on a scale of/i,
                /which.*(?:best describes|applies)/i,
                /what.*(?:your opinion|do you think)/i
            ],
            
            // Anti-patterns (things that indicate NOT a survey)
            antiPatterns: [
                /sign in/i,
                /log in/i,
                /forgot password/i,
                /create account/i,
                /register/i,
                /captcha/i,
                /verification/i
            ]
        };
    }

    /**
     * Detect if page contains actual survey content
     */
    async isSurveyPage() {
        return await this.page.evaluate((indicators) => {
            // Check for survey-specific elements
            const surveyElements = indicators.elements.some(selector => {
                try {
                    return document.querySelectorAll(selector).length > 0;
                } catch (e) {
                    return false;
                }
            });

            // Check for survey-specific text patterns
            const pageText = document.body.textContent.toLowerCase();
            const hasSurveyText = indicators.textPatterns.some(pattern => pattern.test(pageText));
            
            // Check for anti-patterns
            const hasAntiPatterns = indicators.antiPatterns.some(pattern => pattern.test(pageText));

            // Must have survey indicators and not have anti-patterns
            return (surveyElements || hasSurveyText) && !hasAntiPatterns;
        }, this.surveyIndicators);
    }

    /**
     * Find actual survey questions (not login/system forms)
     */
    async findSurveyQuestions() {
        return await this.page.evaluate((indicators) => {
            const questions = [];
            
            // Strategy 1: Find questions by survey-specific containers
            for (const selector of indicators.elements) {
                try {
                    const containers = document.querySelectorAll(selector);
                    
                    containers.forEach(container => {
                        const inputs = container.querySelectorAll('input:not([type="hidden"]), select, textarea');
                        if (inputs.length === 0) return;
                        
                        // Filter out system inputs
                        const surveyInputs = Array.from(inputs).filter(input => {
                            if (input.type === 'hidden') return false;
                            if (input.name && (
                                input.name.includes('csrf') ||
                                input.name.includes('token') ||
                                input.name.includes('_method') ||
                                input.name.includes('password')
                            )) return false;
                            
                            return true;
                        });
                        
                        if (surveyInputs.length === 0) return;
                        
                        // Extract question text
                        let questionText = '';
                        const label = container.querySelector('label, legend, .question-text, .question-title');
                        if (label) {
                            questionText = label.textContent?.trim() || '';
                        } else {
                            questionText = container.textContent?.trim() || '';
                            // Clean up the text
                            questionText = questionText.replace(/\s+/g, ' ').substring(0, 200);
                        }
                        
                        // Skip if no meaningful text
                        if (!questionText || questionText.length < 3) return;
                        
                        // Skip if contains anti-patterns
                        const hasAntiPattern = indicators.antiPatterns.some(pattern => 
                            pattern.test(questionText)
                        );
                        if (hasAntiPattern) return;
                        
                        questions.push({
                            text: questionText,
                            inputs: surveyInputs.map(inp => ({
                                element: inp,
                                type: inp.type || inp.tagName.toLowerCase(),
                                name: inp.name,
                                id: inp.id,
                                selector: this.generateSelector(inp)
                            })),
                            container: container,
                            confidence: 0.9
                        });
                    });
                } catch (e) {
                    console.warn(`Survey selector failed: ${selector}`, e);
                }
            }
            
            // Strategy 2: Find by radio/checkbox groups (common in surveys)
            const radioGroups = {};
            const checkboxGroups = {};
            
            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                if (!radio.name) return;
                if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
                radioGroups[radio.name].push(radio);
            });
            
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                if (!checkbox.name) return;
                if (!checkboxGroups[checkbox.name]) checkboxGroups[checkbox.name] = [];
                checkboxGroups[checkbox.name].push(checkbox);
            });
            
            // Process radio groups
            Object.entries(radioGroups).forEach(([name, radios]) => {
                if (radios.length < 2) return; // Need multiple options for a real question
                
                const parent = radios[0].closest('fieldset, .question, .form-group, div') || radios[0].parentElement;
                if (!parent) return;
                
                const questionText = this.extractQuestionText(parent);
                if (!questionText || questionText.length < 3) return;
                
                questions.push({
                    text: questionText,
                    inputs: radios.map(r => ({
                        element: r,
                        type: 'radio',
                        name: r.name,
                        id: r.id,
                        selector: this.generateSelector(r)
                    })),
                    container: parent,
                    confidence: 0.8
                });
            });
            
            // Helper function to generate selectors
            this.generateSelector = function(element) {
                if (element.id) return `#${element.id}`;
                if (element.className) {
                    const classes = element.className.split(' ').filter(c => c.length > 0);
                    if (classes.length > 0) return `.${classes[0]}`;
                }
                return element.tagName.toLowerCase();
            };
            
            // Helper function to extract question text
            this.extractQuestionText = function(parent) {
                const label = parent.querySelector('label, legend');
                if (label) return label.textContent?.trim();
                
                let text = parent.textContent?.trim() || '';
                text = text.replace(/\s+/g, ' ').substring(0, 200);
                
                // Filter out non-question text
                const antiPatterns = indicators.antiPatterns;
                if (antiPatterns.some(pattern => pattern.test(text))) return '';
                
                return text;
            };
            
            return questions.filter(q => q.inputs.length > 0);
            
        }, this.surveyIndicators);
    }

    /**
     * Get survey platform specific information
     */
    async getSurveyPlatform() {
        return await this.page.evaluate(() => {
            const url = window.location.href;
            const domain = window.location.hostname;
            
            if (domain.includes('surveyplanet.com')) {
                return { platform: 'SurveyPlanet', type: 'survey' };
            } else if (domain.includes('typeform.com')) {
                return { platform: 'Typeform', type: 'survey' };
            } else if (domain.includes('surveymonkey.com')) {
                return { platform: 'SurveyMonkey', type: 'survey' };
            } else if (domain.includes('forms.google.com')) {
                return { platform: 'Google Forms', type: 'form' };
            } else if (domain.includes('microsoft.com') && url.includes('forms')) {
                return { platform: 'Microsoft Forms', type: 'form' };
            }
            
            return { platform: 'Unknown', type: 'unknown' };
        });
    }
}

module.exports = EnhancedSurveyDetector;