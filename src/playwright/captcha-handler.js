/**
 * CAPTCHA and Human Verification Handler
 * Handles various types of CAPTCHAs and human verification challenges
 */

const HumanSimulation = require('../behavior/human-simulation');

class CaptchaHandler {
    constructor(page) {
        this.page = page;
        this.humanSim = new HumanSimulation();
        this.logs = [];
        
        // Common CAPTCHA service selectors
        this.captchaSelectors = {
            recaptcha: {
                iframe: 'iframe[src*="recaptcha"]',
                checkbox: '.recaptcha-checkbox',
                checkboxContainer: '.recaptcha-checkbox-checkmark',
                challenge: '#rc-imageselect',
                audio: '#recaptcha-audio-button',
                reload: '#recaptcha-reload-button',
                submit: '#recaptcha-verify-button'
            },
            hcaptcha: {
                iframe: 'iframe[src*="hcaptcha"]',
                checkbox: '.hcaptcha-checkbox',
                challenge: '.hcaptcha-challenge',
                submit: '.hcaptcha-submit'
            },
            turnstile: {
                iframe: 'iframe[src*="challenges.cloudflare.com"]',
                container: '.cf-turnstile',
                checkbox: 'input[type="checkbox"]'
            },
            simple: {
                math: 'input[placeholder*="captcha"], input[name*="captcha"], input[id*="captcha"]',
                text: 'input[placeholder*="human"], input[name*="human"], input[id*="verification"]',
                checkbox: 'input[type="checkbox"][name*="human"], input[type="checkbox"][name*="bot"], input[type="checkbox"][name*="verify"]'
            },
            generic: {
                images: 'img[src*="captcha"], img[alt*="captcha"], img[id*="captcha"]',
                containers: '.captcha, #captcha, [class*="captcha"], [id*="verification"]'
            }
        };

        // Human verification patterns
        this.humanVerificationPatterns = [
            /are you (?:a )?human/i,
            /(?:i am|i'm) (?:not )?(?:a )?(?:robot|bot)/i,
            /prove you(?:'re| are) human/i,
            /verify (?:you are|you're) human/i,
            /human verification/i,
            /click (?:here )?if you(?:'re| are) human/i,
            /select all (?:images|pictures)/i,
            /i'm not a robot/i
        ];
    }

    /**
     * Main CAPTCHA detection and handling method
     */
    async detectAndHandleCaptcha(options = {}) {
        const defaultOptions = {
            timeout: 30000,
            retries: 3,
            skipComplexCaptcha: true,
            useAudio: false,
            fallbackToManual: false
        };

        const config = { ...defaultOptions, ...options };
        
        this.log('Starting CAPTCHA detection...');

        try {
            // Check for various CAPTCHA types
            const captchaType = await this.detectCaptchaType();
            
            if (!captchaType) {
                this.log('No CAPTCHA detected');
                return { success: true, type: 'none' };
            }

            this.log(`CAPTCHA detected: ${captchaType}`);

            // Handle based on type
            switch (captchaType) {
                case 'recaptcha':
                    return await this.handleRecaptcha(config);
                case 'hcaptcha':
                    return await this.handleHcaptcha(config);
                case 'turnstile':
                    return await this.handleTurnstile(config);
                case 'simple_math':
                    return await this.handleSimpleMathCaptcha(config);
                case 'simple_text':
                    return await this.handleSimpleTextCaptcha(config);
                case 'human_checkbox':
                    return await this.handleHumanCheckbox(config);
                case 'image_selection':
                    return await this.handleImageSelection(config);
                default:
                    this.log(`Unknown CAPTCHA type: ${captchaType}`);
                    return { success: false, type: captchaType, reason: 'unsupported' };
            }

        } catch (error) {
            this.log(`CAPTCHA handling failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Detect the type of CAPTCHA present on the page
     */
    async detectCaptchaType() {
        // Check for reCAPTCHA
        if (await this.page.$(this.captchaSelectors.recaptcha.iframe)) {
            return 'recaptcha';
        }

        // Check for hCaptcha
        if (await this.page.$(this.captchaSelectors.hcaptcha.iframe)) {
            return 'hcaptcha';
        }

        // Check for Cloudflare Turnstile
        if (await this.page.$(this.captchaSelectors.turnstile.iframe)) {
            return 'turnstile';
        }

        // Check for simple math CAPTCHAs
        const mathCaptcha = await this.detectSimpleMathCaptcha();
        if (mathCaptcha) {
            return 'simple_math';
        }

        // Check for simple text CAPTCHAs
        const textCaptcha = await this.detectSimpleTextCaptcha();
        if (textCaptcha) {
            return 'simple_text';
        }

        // Check for human verification checkboxes
        const humanCheckbox = await this.detectHumanCheckbox();
        if (humanCheckbox) {
            return 'human_checkbox';
        }

        // Check for image selection challenges
        const imageSelection = await this.detectImageSelection();
        if (imageSelection) {
            return 'image_selection';
        }

        return null;
    }

    /**
     * Handle Google reCAPTCHA
     */
    async handleRecaptcha(config) {
        try {
            this.log('Handling reCAPTCHA...');

            // Try to find and click the checkbox first
            const checkboxFrame = await this.page.frameLocator(this.captchaSelectors.recaptcha.iframe);
            const checkbox = checkboxFrame.locator(this.captchaSelectors.recaptcha.checkbox);

            if (await checkbox.isVisible({ timeout: 5000 })) {
                // Simulate human-like interaction
                await this.humanSim.simulateActionDelay('think');
                await checkbox.click();
                await this.humanSim.simulateActionDelay('click');

                // Wait to see if challenge appears
                await this.page.waitForTimeout(2000);

                // Check if challenge iframe appears
                const challengeVisible = await this.page.$(this.captchaSelectors.recaptcha.challenge);
                
                if (!challengeVisible) {
                    this.log('reCAPTCHA solved with checkbox click');
                    return { success: true, type: 'recaptcha', method: 'checkbox' };
                }

                // If challenge appears and we're configured to skip complex ones
                if (config.skipComplexCaptcha) {
                    this.log('reCAPTCHA challenge appeared - skipping complex challenge');
                    return { success: false, type: 'recaptcha', reason: 'complex_challenge_skipped' };
                }

                // Try audio CAPTCHA if enabled
                if (config.useAudio) {
                    return await this.handleRecaptchaAudio();
                }
            }

            return { success: false, type: 'recaptcha', reason: 'checkbox_not_found' };

        } catch (error) {
            this.log(`reCAPTCHA handling failed: ${error.message}`);
            return { success: false, type: 'recaptcha', error: error.message };
        }
    }

    /**
     * Handle hCAPTCHA
     */
    async handleHcaptcha(config) {
        try {
            this.log('Handling hCAPTCHA...');

            const checkboxFrame = await this.page.frameLocator(this.captchaSelectors.hcaptcha.iframe);
            const checkbox = checkboxFrame.locator(this.captchaSelectors.hcaptcha.checkbox);

            if (await checkbox.isVisible({ timeout: 5000 })) {
                await this.humanSim.simulateActionDelay('think');
                await checkbox.click();
                await this.humanSim.simulateActionDelay('click');

                // Wait for potential challenge
                await this.page.waitForTimeout(3000);

                this.log('hCAPTCHA checkbox clicked');
                return { success: true, type: 'hcaptcha', method: 'checkbox' };
            }

            return { success: false, type: 'hcaptcha', reason: 'checkbox_not_found' };

        } catch (error) {
            this.log(`hCAPTCHA handling failed: ${error.message}`);
            return { success: false, type: 'hcaptcha', error: error.message };
        }
    }

    /**
     * Handle Cloudflare Turnstile
     */
    async handleTurnstile(config) {
        try {
            this.log('Handling Cloudflare Turnstile...');

            // Turnstile often resolves automatically, just wait
            await this.page.waitForTimeout(3000);

            // Check if there's a checkbox to click
            const container = await this.page.$(this.captchaSelectors.turnstile.container);
            if (container) {
                const checkbox = await container.$(this.captchaSelectors.turnstile.checkbox);
                if (checkbox && await checkbox.isVisible()) {
                    await this.humanSim.simulateActionDelay('think');
                    await checkbox.click();
                    await this.humanSim.simulateActionDelay('click');
                }
            }

            this.log('Turnstile handled');
            return { success: true, type: 'turnstile', method: 'automatic' };

        } catch (error) {
            this.log(`Turnstile handling failed: ${error.message}`);
            return { success: false, type: 'turnstile', error: error.message };
        }
    }

    /**
     * Detect and handle simple math CAPTCHAs (e.g., "What is 2 + 3?")
     */
    async detectSimpleMathCaptcha() {
        try {
            // Look for math expressions in various page elements
            const mathPatterns = [
                /what is (\d+) ?\+ ?(\d+)/i,
                /(\d+) ?\+ ?(\d+) ?=/i,
                /solve: ?(\d+) ?\+ ?(\d+)/i,
                /(\d+) ?plus ?(\d+)/i,
                /add (\d+) and (\d+)/i
            ];

            const pageText = await this.page.textContent('body');
            
            for (const pattern of mathPatterns) {
                const match = pageText.match(pattern);
                if (match) {
                    return {
                        num1: parseInt(match[1]),
                        num2: parseInt(match[2]),
                        answer: parseInt(match[1]) + parseInt(match[2])
                    };
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    async handleSimpleMathCaptcha(config) {
        try {
            this.log('Handling simple math CAPTCHA...');

            const mathData = await this.detectSimpleMathCaptcha();
            if (!mathData) {
                return { success: false, reason: 'math_not_detected' };
            }

            // Find the input field
            const input = await this.page.$(this.captchaSelectors.simple.math);
            if (!input) {
                return { success: false, reason: 'input_not_found' };
            }

            // Fill in the answer
            await this.humanSim.simulateActionDelay('think');
            await input.fill(mathData.answer.toString());
            await this.humanSim.simulateActionDelay('type');

            this.log(`Math CAPTCHA solved: ${mathData.num1} + ${mathData.num2} = ${mathData.answer}`);
            return { success: true, type: 'simple_math', answer: mathData.answer };

        } catch (error) {
            this.log(`Math CAPTCHA handling failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Detect simple text CAPTCHAs
     */
    async detectSimpleTextCaptcha() {
        try {
            // Look for CAPTCHA images and try to extract text
            const captchaImages = await this.page.$$(this.captchaSelectors.generic.images);
            
            for (const img of captchaImages) {
                const src = await img.getAttribute('src');
                if (src && src.includes('captcha')) {
                    // Basic pattern recognition for simple text CAPTCHAs
                    // This is very limited - real OCR would be needed for complex ones
                    return { hasTextCaptcha: true, image: src };
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    async handleSimpleTextCaptcha(config) {
        try {
            this.log('Simple text CAPTCHA detected - skipping (OCR not implemented)');
            return { success: false, type: 'simple_text', reason: 'ocr_not_implemented' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Detect human verification checkboxes
     */
    async detectHumanCheckbox() {
        try {
            // Look for checkboxes with human verification patterns
            const checkboxes = await this.page.$$('input[type="checkbox"]');
            
            for (const checkbox of checkboxes) {
                const label = await this.getAssociatedLabel(checkbox);
                if (label) {
                    for (const pattern of this.humanVerificationPatterns) {
                        if (pattern.test(label)) {
                            return { checkbox, label };
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    async handleHumanCheckbox(config) {
        try {
            this.log('Handling human verification checkbox...');

            const humanData = await this.detectHumanCheckbox();
            if (!humanData) {
                return { success: false, reason: 'checkbox_not_found' };
            }

            // Click the checkbox
            await this.humanSim.simulateActionDelay('think');
            await humanData.checkbox.click();
            await this.humanSim.simulateActionDelay('click');

            this.log(`Human verification checkbox clicked: ${humanData.label}`);
            return { success: true, type: 'human_checkbox', label: humanData.label };

        } catch (error) {
            this.log(`Human checkbox handling failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Detect image selection challenges
     */
    async detectImageSelection() {
        try {
            const pageText = await this.page.textContent('body');
            const imageSelectionPatterns = [
                /select all images/i,
                /click on all/i,
                /choose all/i,
                /identify.*in.*image/i
            ];

            for (const pattern of imageSelectionPatterns) {
                if (pattern.test(pageText)) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    async handleImageSelection(config) {
        try {
            this.log('Image selection challenge detected - skipping (AI recognition not implemented)');
            return { success: false, type: 'image_selection', reason: 'ai_recognition_not_implemented' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get associated label text for a form element
     */
    async getAssociatedLabel(element) {
        try {
            // Try to find label by 'for' attribute
            const id = await element.getAttribute('id');
            if (id) {
                const label = await this.page.$(`label[for="${id}"]`);
                if (label) {
                    return await label.textContent();
                }
            }

            // Try to find parent label
            const parentLabel = await element.evaluateHandle(el => {
                return el.closest('label');
            });
            
            if (parentLabel) {
                return await parentLabel.textContent();
            }

            // Try to find nearby text
            const parent = await element.evaluateHandle(el => el.parentElement);
            if (parent) {
                const text = await parent.textContent();
                if (text && text.length < 200) {
                    return text.trim();
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Handle reCAPTCHA audio challenge (experimental)
     */
    async handleRecaptchaAudio() {
        try {
            this.log('Attempting reCAPTCHA audio challenge...');
            
            // Click audio button
            const audioButton = await this.page.$(this.captchaSelectors.recaptcha.audio);
            if (audioButton) {
                await audioButton.click();
                await this.page.waitForTimeout(2000);
                
                // Audio processing would require speech-to-text
                this.log('Audio CAPTCHA not implemented - requires speech-to-text');
                return { success: false, reason: 'audio_processing_not_implemented' };
            }

            return { success: false, reason: 'audio_button_not_found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Wait for CAPTCHA to be solved manually (fallback option)
     */
    async waitForManualSolution(timeout = 60000) {
        this.log('Waiting for manual CAPTCHA solution...');
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            // Check if CAPTCHA is no longer present
            const captchaType = await this.detectCaptchaType();
            if (!captchaType) {
                this.log('CAPTCHA appears to be solved');
                return { success: true, method: 'manual' };
            }
            
            await this.page.waitForTimeout(1000);
        }
        
        return { success: false, reason: 'manual_timeout' };
    }

    /**
     * Logging utility
     */
    log(message) {
        const logEntry = {
            timestamp: Date.now(),
            message,
            url: this.page.url()
        };
        
        this.logs.push(logEntry);
        console.log(`[CAPTCHA] ${message}`);
    }

    /**
     * Get CAPTCHA handling logs
     */
    getLogs() {
        return this.logs;
    }
}

module.exports = CaptchaHandler;