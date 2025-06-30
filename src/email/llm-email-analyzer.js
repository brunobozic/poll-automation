/**
 * LLM-Powered Email Site Analyzer
 * Uses AI to dynamically understand and interact with email service pages
 */

const axios = require('axios');

class LLMEmailAnalyzer {
    constructor(options = {}) {
        this.options = {
            llmServiceUrl: 'http://localhost:5000',
            timeout: 30000,
            debugMode: true,
            ...options
        };
    }

    /**
     * Analyze email service page and find email elements using LLM
     */
    async analyzeEmailPage(page, serviceName) {
        try {
            this.log(`🧠 Using LLM to analyze ${serviceName} page...`);
            
            // Get page content for LLM analysis
            const pageContent = await this.getPageContent(page);
            
            // Ask LLM to analyze the page and find email elements
            const analysis = await this.askLLMToAnalyzeEmailPage(pageContent, serviceName);
            
            this.log(`✅ LLM analysis completed for ${serviceName}`);
            return analysis;
            
        } catch (error) {
            this.log(`❌ LLM analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get comprehensive page content for LLM analysis
     */
    async getPageContent(page) {
        const content = {
            url: page.url(),
            title: await page.title(),
            html: await page.content(),
            visibleText: await page.$eval('body', el => el.textContent).catch(() => ''),
            inputs: [],
            buttons: [],
            clickableElements: []
        };

        // Extract all input elements with details
        try {
            content.inputs = await page.$$eval('input', inputs => 
                inputs.map((input, index) => ({
                    index,
                    type: input.type,
                    name: input.name,
                    id: input.id,
                    className: input.className,
                    placeholder: input.placeholder,
                    value: input.value,
                    readonly: input.readOnly,
                    disabled: input.disabled,
                    visible: input.offsetParent !== null,
                    selector: input.id ? `#${input.id}` : 
                             input.name ? `input[name="${input.name}"]` : 
                             input.className ? `.${input.className.split(' ')[0]}` : 
                             `input:nth-of-type(${index + 1})`
                }))
            );
        } catch (e) {
            this.log(`⚠️ Could not extract inputs: ${e.message}`);
        }

        // Extract all buttons
        try {
            content.buttons = await page.$$eval('button, input[type="button"], input[type="submit"]', buttons => 
                buttons.map((btn, index) => ({
                    index,
                    type: btn.type,
                    text: btn.textContent?.trim(),
                    id: btn.id,
                    className: btn.className,
                    visible: btn.offsetParent !== null,
                    selector: btn.id ? `#${btn.id}` : 
                             btn.className ? `.${btn.className.split(' ')[0]}` : 
                             `button:nth-of-type(${index + 1})`
                }))
            );
        } catch (e) {
            this.log(`⚠️ Could not extract buttons: ${e.message}`);
        }

        // Extract other clickable elements
        try {
            content.clickableElements = await page.$$eval('a, [data-clipboard-text], .copy, .copy-button', elements => 
                elements.map((el, index) => ({
                    index,
                    tagName: el.tagName,
                    text: el.textContent?.trim(),
                    id: el.id,
                    className: el.className,
                    dataClipboard: el.getAttribute('data-clipboard-text'),
                    href: el.href,
                    visible: el.offsetParent !== null,
                    selector: el.id ? `#${el.id}` : 
                             el.className ? `.${el.className.split(' ')[0]}` : 
                             `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`
                }))
            );
        } catch (e) {
            this.log(`⚠️ Could not extract clickable elements: ${e.message}`);
        }

        return content;
    }

    /**
     * Ask LLM to analyze email page and provide actionable selectors
     */
    async askLLMToAnalyzeEmailPage(pageContent, serviceName) {
        const prompt = `ANALYZE EMAIL SERVICE PAGE: ${serviceName}

You are analyzing a ${serviceName} temporary email service page to help automate email account creation.

PAGE INFORMATION:
- URL: ${pageContent.url}
- Title: ${pageContent.title}
- Visible Text: ${pageContent.visibleText.substring(0, 500)}...

AVAILABLE INPUTS:
${JSON.stringify(pageContent.inputs, null, 2)}

AVAILABLE BUTTONS:
${JSON.stringify(pageContent.buttons, null, 2)}

CLICKABLE ELEMENTS:
${JSON.stringify(pageContent.clickableElements, null, 2)}

TASK: Analyze this page and identify the best way to get the temporary email address.

For ${serviceName}, I need you to:
1. Find where the email address is displayed/stored
2. Identify the best method to retrieve it (input field, copy button, text element)
3. Provide the most reliable CSS selector
4. Identify any copy buttons or action buttons
5. Detect if the email loads immediately or needs time to generate

RESPOND WITH JSON:
{
  "emailFound": true/false,
  "retrievalMethod": "input_field" | "copy_button" | "text_element" | "data_attribute",
  "primarySelector": "css_selector_here",
  "alternativeSelectors": ["backup_selector_1", "backup_selector_2"],
  "copyButtonSelector": "copy_button_selector_or_null",
  "waitRequired": true/false,
  "expectedLoadTime": seconds_estimate,
  "inboxSelector": "inbox_area_selector",
  "confidence": 0.0-1.0,
  "reasoning": "explanation_of_analysis",
  "instructions": "step_by_step_instructions"
}

Focus on reliability and provide multiple fallback options.`;

        try {
            const response = await axios.post(`${this.options.llmServiceUrl}/answer-questions`, {
                questions: [{
                    id: 1,
                    text: prompt,
                    type: 'text',
                    options: []
                }],
                context: `Email page analysis for ${serviceName}`
            }, {
                timeout: this.options.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const llmResponse = response.data.answers[0].value;
            this.log(`🤖 LLM Response: ${llmResponse.substring(0, 200)}...`);

            // Try to parse JSON response
            try {
                const analysis = this.parseJsonFromLLMResponse(llmResponse);
                
                // Validate the analysis
                if (this.validateAnalysis(analysis)) {
                    return analysis;
                } else {
                    throw new Error('LLM analysis validation failed');
                }
                
            } catch (parseError) {
                this.log(`⚠️ Could not parse LLM JSON response: ${parseError.message}`);
                // Return fallback analysis
                return this.createFallbackAnalysis(pageContent, serviceName);
            }

        } catch (error) {
            this.log(`❌ LLM request failed: ${error.message}`);
            // Return fallback analysis
            return this.createFallbackAnalysis(pageContent, serviceName);
        }
    }

    /**
     * Parse JSON from LLM response that might contain extra text
     */
    parseJsonFromLLMResponse(response) {
        // Try to find JSON block in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        // If no JSON block found, throw error
        throw new Error('No JSON found in LLM response');
    }

    /**
     * Validate LLM analysis structure
     */
    validateAnalysis(analysis) {
        const required = ['emailFound', 'retrievalMethod', 'primarySelector', 'confidence'];
        return required.every(field => analysis.hasOwnProperty(field));
    }

    /**
     * Create fallback analysis when LLM fails
     */
    createFallbackAnalysis(pageContent, serviceName) {
        this.log(`🔄 Creating fallback analysis for ${serviceName}...`);
        
        // Find most promising input for email
        const emailInput = pageContent.inputs.find(input => 
            input.type === 'email' || 
            input.type === 'text' || 
            input.id.includes('mail') ||
            input.name.includes('mail') ||
            input.className.includes('mail')
        );

        // Find copy button
        const copyButton = pageContent.clickableElements.find(el => 
            el.text?.toLowerCase().includes('copy') ||
            el.className?.toLowerCase().includes('copy') ||
            el.id?.toLowerCase().includes('copy') ||
            el.dataClipboard
        );

        return {
            emailFound: !!emailInput,
            retrievalMethod: emailInput ? "input_field" : "text_element",
            primarySelector: emailInput?.selector || pageContent.inputs[0]?.selector || 'input',
            alternativeSelectors: pageContent.inputs.slice(0, 3).map(i => i.selector),
            copyButtonSelector: copyButton?.selector || null,
            waitRequired: true,
            expectedLoadTime: 5,
            inboxSelector: ".inbox, .messages, #inbox",
            confidence: 0.5,
            reasoning: "Fallback analysis - LLM failed",
            instructions: "Use input field selector and wait for email to load"
        };
    }

    /**
     * Execute email retrieval based on LLM analysis
     */
    async retrieveEmailUsingAnalysis(page, analysis, serviceName) {
        this.log(`🎯 Retrieving email using ${analysis.retrievalMethod} method...`);
        
        try {
            // Wait if needed
            if (analysis.waitRequired) {
                this.log(`⏳ Waiting ${analysis.expectedLoadTime} seconds for email to load...`);
                await page.waitForTimeout(analysis.expectedLoadTime * 1000);
            }

            let email = null;

            // Try primary method
            switch (analysis.retrievalMethod) {
                case 'input_field':
                    email = await this.getEmailFromInput(page, analysis);
                    break;
                case 'copy_button':
                    email = await this.getEmailFromCopyButton(page, analysis);
                    break;
                case 'text_element':
                    email = await this.getEmailFromTextElement(page, analysis);
                    break;
                case 'data_attribute':
                    email = await this.getEmailFromDataAttribute(page, analysis);
                    break;
            }

            if (email && email.includes('@')) {
                this.log(`✅ Email retrieved successfully: ${email}`);
                return { success: true, email, method: analysis.retrievalMethod };
            }

            // Try alternative selectors
            this.log(`🔄 Primary method failed, trying alternatives...`);
            for (const selector of analysis.alternativeSelectors || []) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const value = await element.inputValue().catch(() => null);
                        const text = await element.textContent().catch(() => null);
                        
                        if (value && value.includes('@')) {
                            email = value;
                            this.log(`✅ Email found with alternative selector: ${email}`);
                            return { success: true, email, method: 'alternative_selector' };
                        } else if (text && text.includes('@')) {
                            email = text.trim();
                            this.log(`✅ Email found with alternative text: ${email}`);
                            return { success: true, email, method: 'alternative_text' };
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            throw new Error('All email retrieval methods failed');

        } catch (error) {
            this.log(`❌ Email retrieval failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async getEmailFromInput(page, analysis) {
        const element = await page.$(analysis.primarySelector);
        if (element) {
            // Wait for email to actually load
            let email = null;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
                email = await element.inputValue();
                if (email && email !== 'Loading..' && email.includes('@')) {
                    return email;
                }
                await page.waitForTimeout(1000);
                attempts++;
            }
        }
        throw new Error('Input field method failed');
    }

    async getEmailFromCopyButton(page, analysis) {
        if (analysis.copyButtonSelector) {
            const copyButton = await page.$(analysis.copyButtonSelector);
            if (copyButton) {
                await copyButton.click();
                await page.waitForTimeout(1000);
                
                // Try to get email from input after copy
                const input = await page.$(analysis.primarySelector);
                if (input) {
                    return await input.inputValue();
                }
            }
        }
        throw new Error('Copy button method failed');
    }

    async getEmailFromTextElement(page, analysis) {
        const element = await page.$(analysis.primarySelector);
        if (element) {
            const text = await element.textContent();
            if (text && text.includes('@')) {
                // Extract email from text
                const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                if (emailMatch) {
                    return emailMatch[1];
                }
            }
        }
        throw new Error('Text element method failed');
    }

    async getEmailFromDataAttribute(page, analysis) {
        const element = await page.$(analysis.primarySelector);
        if (element) {
            const dataEmail = await element.getAttribute('data-clipboard-text');
            if (dataEmail && dataEmail.includes('@')) {
                return dataEmail;
            }
        }
        throw new Error('Data attribute method failed');
    }

    log(message) {
        if (this.options.debugMode) {
            console.log(`[LLMEmailAnalyzer] ${message}`);
        }
    }
}

module.exports = LLMEmailAnalyzer;