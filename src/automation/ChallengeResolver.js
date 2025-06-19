/**
 * Challenge Resolver
 * Consolidates challenge solving functionality from:
 * - comprehensive-challenge-solver.js
 * - advanced-captcha-solver.js
 * - advanced-attention-handler.js
 * - Various challenge handling components
 * 
 * Provides unified challenge detection and resolution
 */

const crypto = require('crypto');
const axios = require('axios');

class ChallengeResolver {
    constructor(options = {}) {
        this.options = {
            captchaEnabled: options.captchaEnabled !== false,
            captchaTimeout: options.captchaTimeout || 60000,
            twoCaptchaKey: options.twoCaptchaKey || process.env.TWOCAPTCHA_API_KEY,
            antiCaptchaKey: options.antiCaptchaKey || process.env.ANTICAPTCHA_API_KEY,
            aiService: options.aiService || null,
            networkManager: options.networkManager || null,
            enableLearning: options.enableLearning !== false,
            debugMode: options.debugMode || false,
            maxRetries: options.maxRetries || 3,
            ...options
        };

        // Challenge types
        this.challengeTypes = {
            CAPTCHA: 'captcha',
            RECAPTCHA_V2: 'recaptcha_v2',
            RECAPTCHA_V3: 'recaptcha_v3',
            HCAPTCHA: 'hcaptcha',
            CLOUDFLARE: 'cloudflare',
            ATTENTION_CHECK: 'attention_check',
            RATE_LIMIT: 'rate_limit',
            PROOF_OF_WORK: 'proof_of_work',
            COGNITIVE_PUZZLE: 'cognitive_puzzle',
            MEDIA_VERIFICATION: 'media_verification'
        };

        // Service configurations
        this.captchaServices = {
            twoCaptcha: {
                submitUrl: 'https://2captcha.com/in.php',
                resultUrl: 'https://2captcha.com/res.php',
                key: this.options.twoCaptchaKey,
                enabled: !!this.options.twoCaptchaKey
            },
            antiCaptcha: {
                createTaskUrl: 'https://api.anti-captcha.com/createTask',
                getResultUrl: 'https://api.anti-captcha.com/getTaskResult',
                key: this.options.antiCaptchaKey,
                enabled: !!this.options.antiCaptchaKey
            }
        };

        // State management
        this.isInitialized = false;
        this.activeChallenges = new Map();
        
        // Learning and adaptation
        this.solvedChallenges = new Map();
        this.challengePatterns = new Map();
        this.adaptiveStrategies = new Map();

        // Performance tracking
        this.stats = {
            totalChallenges: 0,
            solvedChallenges: 0,
            failedChallenges: 0,
            captchasSolved: 0,
            attentionChecksPassed: 0,
            avgSolveTime: 0,
            successRate: 0,
            costTotal: 0
        };
    }

    /**
     * Initialize challenge resolver
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🧩 Initializing Challenge Resolver...');

        try {
            // Validate service configurations
            this.validateServiceConfigurations();

            // Load challenge patterns and strategies
            if (this.options.enableLearning) {
                await this.loadChallengePatterns();
            }

            // Setup challenge monitoring
            this.setupChallengeMonitoring();

            this.isInitialized = true;
            console.log('✅ Challenge Resolver initialized');
            this.displayCapabilities();

        } catch (error) {
            console.error('❌ Challenge Resolver initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Solve challenge using appropriate method
     */
    async solveChallenge(page, challenge, options = {}) {
        this.ensureInitialized();

        const challengeId = crypto.randomUUID();
        const startTime = Date.now();

        console.log(`🧩 Solving challenge: ${challenge.type} (${challengeId})`);

        try {
            this.stats.totalChallenges++;
            this.activeChallenges.set(challengeId, {
                id: challengeId,
                type: challenge.type,
                startTime: startTime,
                page: page,
                challenge: challenge,
                status: 'solving'
            });

            let result;

            // Route to appropriate solver
            switch (challenge.type) {
                case this.challengeTypes.CAPTCHA:
                case this.challengeTypes.RECAPTCHA_V2:
                case this.challengeTypes.RECAPTCHA_V3:
                case this.challengeTypes.HCAPTCHA:
                    result = await this.solveCaptcha(page, challenge, options);
                    break;

                case this.challengeTypes.CLOUDFLARE:
                    result = await this.solveCloudflare(page, challenge, options);
                    break;

                case this.challengeTypes.ATTENTION_CHECK:
                    result = await this.solveAttentionCheck(page, challenge, options);
                    break;

                case this.challengeTypes.RATE_LIMIT:
                    result = await this.handleRateLimit(page, challenge, options);
                    break;

                case this.challengeTypes.PROOF_OF_WORK:
                    result = await this.solveProofOfWork(page, challenge, options);
                    break;

                case this.challengeTypes.COGNITIVE_PUZZLE:
                    result = await this.solveCognitivePuzzle(page, challenge, options);
                    break;

                case this.challengeTypes.MEDIA_VERIFICATION:
                    result = await this.solveMediaVerification(page, challenge, options);
                    break;

                default:
                    result = await this.solveGenericChallenge(page, challenge, options);
            }

            const duration = Date.now() - startTime;
            this.updateStats(challenge.type, result.success, duration);

            if (result.success) {
                this.stats.solvedChallenges++;
                console.log(`   ✅ Challenge solved in ${duration}ms`);
                
                // Learn from successful solution
                if (this.options.enableLearning) {
                    await this.learnFromSuccess(challenge, result, duration);
                }
            } else {
                this.stats.failedChallenges++;
                console.log(`   ❌ Challenge failed: ${result.error || 'Unknown error'}`);
            }

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.stats.failedChallenges++;
            console.error(`   ❌ Challenge solver error: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                duration: duration,
                challengeId: challengeId
            };

        } finally {
            this.activeChallenges.delete(challengeId);
        }
    }

    /**
     * Solve CAPTCHA challenges
     */
    async solveCaptcha(page, challenge, options = {}) {
        if (!this.options.captchaEnabled) {
            return {
                success: false,
                error: 'CAPTCHA solving disabled',
                method: 'disabled'
            };
        }

        console.log(`   🔍 Solving CAPTCHA: ${challenge.type}`);

        try {
            // Detect CAPTCHA type and element
            const captchaInfo = await this.analyzeCaptcha(page, challenge);
            
            if (!captchaInfo.element) {
                return {
                    success: false,
                    error: 'CAPTCHA element not found',
                    method: 'detection_failed'
                };
            }

            // Try different solving methods
            const methods = [
                () => this.solveCaptchaWithService(page, captchaInfo, 'twoCaptcha'),
                () => this.solveCaptchaWithService(page, captchaInfo, 'antiCaptcha'),
                () => this.solveCaptchaWithAI(page, captchaInfo)
            ];

            for (const method of methods) {
                try {
                    const result = await method();
                    if (result.success) {
                        this.stats.captchasSolved++;
                        return result;
                    }
                } catch (error) {
                    console.warn(`   ⚠️ CAPTCHA method failed: ${error.message}`);
                    continue;
                }
            }

            return {
                success: false,
                error: 'All CAPTCHA solving methods failed',
                method: 'exhausted'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'error'
            };
        }
    }

    /**
     * Analyze CAPTCHA on page
     */
    async analyzeCaptcha(page, challenge) {
        return await page.evaluate(() => {
            // Common CAPTCHA selectors
            const selectors = [
                '.g-recaptcha',
                '.h-captcha',
                '#captcha',
                '[class*="captcha"]',
                '[id*="captcha"]',
                '.cf-turnstile',
                'iframe[src*="recaptcha"]',
                'iframe[src*="hcaptcha"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    
                    return {
                        element: element,
                        selector: selector,
                        type: selector.includes('recaptcha') ? 'recaptcha' : 
                              selector.includes('hcaptcha') ? 'hcaptcha' : 
                              selector.includes('turnstile') ? 'turnstile' : 'generic',
                        siteKey: element.getAttribute('data-sitekey'),
                        position: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height
                        },
                        visible: element.offsetParent !== null
                    };
                }
            }

            return { element: null };
        });
    }

    /**
     * Solve CAPTCHA using external service
     */
    async solveCaptchaWithService(page, captchaInfo, serviceName) {
        const service = this.captchaServices[serviceName];
        
        if (!service || !service.enabled) {
            throw new Error(`${serviceName} service not available`);
        }

        console.log(`   🔧 Using ${serviceName} service`);

        try {
            // Get page screenshot for image CAPTCHAs
            const screenshot = await page.screenshot({ 
                clip: captchaInfo.position,
                type: 'png'
            });

            let taskId;

            if (serviceName === 'twoCaptcha') {
                taskId = await this.submitToTwoCaptcha(captchaInfo, screenshot);
            } else if (serviceName === 'antiCaptcha') {
                taskId = await this.submitToAntiCaptcha(captchaInfo, screenshot);
            }

            if (!taskId) {
                throw new Error('Failed to submit CAPTCHA to service');
            }

            // Poll for result
            const solution = await this.pollCaptchaSolution(serviceName, taskId);

            if (solution) {
                // Apply solution to page
                await this.applyCaptchaSolution(page, captchaInfo, solution);
                
                return {
                    success: true,
                    solution: solution,
                    method: serviceName,
                    cost: 0.001 // Approximate cost
                };
            }

            throw new Error('No solution received from service');

        } catch (error) {
            throw new Error(`${serviceName} solving failed: ${error.message}`);
        }
    }

    /**
     * Submit CAPTCHA to 2Captcha service
     */
    async submitToTwoCaptcha(captchaInfo, screenshot) {
        const formData = new FormData();
        formData.append('method', 'base64');
        formData.append('key', this.captchaServices.twoCaptcha.key);
        formData.append('body', screenshot.toString('base64'));

        const response = await axios.post(this.captchaServices.twoCaptcha.submitUrl, formData);
        
        if (response.data.startsWith('OK|')) {
            return response.data.split('|')[1];
        }

        throw new Error(response.data);
    }

    /**
     * Submit CAPTCHA to AntiCaptcha service
     */
    async submitToAntiCaptcha(captchaInfo, screenshot) {
        const taskData = {
            clientKey: this.captchaServices.antiCaptcha.key,
            task: {
                type: 'ImageToTextTask',
                body: screenshot.toString('base64')
            }
        };

        const response = await axios.post(this.captchaServices.antiCaptcha.createTaskUrl, taskData);
        
        if (response.data.errorId === 0) {
            return response.data.taskId;
        }

        throw new Error(response.data.errorDescription);
    }

    /**
     * Poll for CAPTCHA solution
     */
    async pollCaptchaSolution(serviceName, taskId) {
        const maxAttempts = 30; // 5 minutes with 10s intervals
        let attempts = 0;

        while (attempts < maxAttempts) {
            await this.delay(10000); // 10 second delay
            attempts++;

            try {
                let result;

                if (serviceName === 'twoCaptcha') {
                    const response = await axios.get(this.captchaServices.twoCaptcha.resultUrl, {
                        params: {
                            key: this.captchaServices.twoCaptcha.key,
                            action: 'get',
                            id: taskId
                        }
                    });

                    if (response.data === 'CAPCHA_NOT_READY') {
                        continue;
                    } else if (response.data.startsWith('OK|')) {
                        result = response.data.split('|')[1];
                    } else {
                        throw new Error(response.data);
                    }
                } else if (serviceName === 'antiCaptcha') {
                    const response = await axios.post(this.captchaServices.antiCaptcha.getResultUrl, {
                        clientKey: this.captchaServices.antiCaptcha.key,
                        taskId: taskId
                    });

                    if (response.data.status === 'processing') {
                        continue;
                    } else if (response.data.status === 'ready') {
                        result = response.data.solution.text;
                    } else {
                        throw new Error(response.data.errorDescription);
                    }
                }

                if (result) {
                    return result;
                }

            } catch (error) {
                console.warn(`   ⚠️ Polling error: ${error.message}`);
            }
        }

        throw new Error('CAPTCHA solving timeout');
    }

    /**
     * Apply CAPTCHA solution to page
     */
    async applyCaptchaSolution(page, captchaInfo, solution) {
        // Find input field for CAPTCHA solution
        const inputSelector = 'input[name*="captcha"], input[id*="captcha"], input[type="text"]:last-of-type';
        
        try {
            const input = await page.$(inputSelector);
            if (input) {
                await input.fill(solution);
                await this.delay(500);
                
                // Try to submit
                const submitButton = await page.$('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                    await submitButton.click();
                }
                
                return true;
            }
        } catch (error) {
            console.warn(`   ⚠️ Failed to apply CAPTCHA solution: ${error.message}`);
        }

        return false;
    }

    /**
     * Solve CAPTCHA using AI
     */
    async solveCaptchaWithAI(page, captchaInfo) {
        if (!this.options.aiService) {
            throw new Error('AI service not available');
        }

        console.log('   🧠 Using AI CAPTCHA solving');

        try {
            // Get CAPTCHA image
            const screenshot = await page.screenshot({
                clip: captchaInfo.position,
                type: 'png'
            });

            // Use AI service to solve
            const solution = await this.options.aiService.solveCaptcha({
                image: screenshot,
                type: captchaInfo.type,
                context: 'poll_automation'
            });

            if (solution && solution.text) {
                await this.applyCaptchaSolution(page, captchaInfo, solution.text);
                
                return {
                    success: true,
                    solution: solution.text,
                    method: 'ai',
                    confidence: solution.confidence || 0.7
                };
            }

            throw new Error('AI CAPTCHA solving failed');

        } catch (error) {
            throw new Error(`AI CAPTCHA solving error: ${error.message}`);
        }
    }

    /**
     * Solve Cloudflare challenges
     */
    async solveCloudflare(page, challenge, options = {}) {
        console.log('   ☁️ Handling Cloudflare challenge');

        try {
            // Wait for Cloudflare to load
            await this.delay(2000);

            // Check for challenge page
            const isChallengePage = await page.evaluate(() => {
                return document.title.includes('Just a moment') || 
                       document.querySelector('.cf-browser-verification') !== null;
            });

            if (!isChallengePage) {
                return {
                    success: true,
                    method: 'no_challenge_detected'
                };
            }

            // Wait for Cloudflare to complete automatically
            console.log('   ⏳ Waiting for Cloudflare verification...');
            
            try {
                await page.waitForFunction(() => {
                    return !document.querySelector('.cf-browser-verification') ||
                           document.querySelector('.cf-challenge-success') ||
                           !document.title.includes('Just a moment');
                }, { timeout: 30000 });

                // Additional wait to ensure page is ready
                await this.delay(2000);

                return {
                    success: true,
                    method: 'automatic_verification'
                };

            } catch (timeoutError) {
                // Try refreshing if stuck
                console.log('   🔄 Cloudflare verification timeout, refreshing...');
                await page.reload({ waitUntil: 'networkidle' });
                await this.delay(5000);

                const stillOnChallenge = await page.evaluate(() => {
                    return document.title.includes('Just a moment');
                });

                return {
                    success: !stillOnChallenge,
                    method: stillOnChallenge ? 'refresh_failed' : 'refresh_success'
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'cloudflare_error'
            };
        }
    }

    /**
     * Solve attention check challenges
     */
    async solveAttentionCheck(page, challenge, options = {}) {
        console.log('   👁️ Solving attention check');

        try {
            // Analyze attention check content
            const checkInfo = await page.evaluate(() => {
                const attentionElements = document.querySelectorAll(
                    '[class*="attention"], [class*="verification"], [class*="check"]'
                );

                for (const element of attentionElements) {
                    const text = element.textContent.toLowerCase();
                    
                    // Look for specific patterns
                    if (text.includes('select') && text.includes('color')) {
                        return {
                            type: 'color_selection',
                            text: text,
                            element: element
                        };
                    } else if (text.includes('click') && text.includes('button')) {
                        return {
                            type: 'button_click',
                            text: text,
                            element: element
                        };
                    } else if (text.includes('type') || text.includes('enter')) {
                        return {
                            type: 'text_input',
                            text: text,
                            element: element
                        };
                    }
                }

                return { type: 'unknown' };
            });

            // Solve based on type
            let result = false;

            switch (checkInfo.type) {
                case 'color_selection':
                    result = await this.solveColorSelection(page, checkInfo);
                    break;
                case 'button_click':
                    result = await this.solveButtonClick(page, checkInfo);
                    break;
                case 'text_input':
                    result = await this.solveTextInput(page, checkInfo);
                    break;
                default:
                    result = await this.solveGenericAttentionCheck(page, checkInfo);
            }

            if (result) {
                this.stats.attentionChecksPassed++;
            }

            return {
                success: result,
                method: checkInfo.type,
                checkType: checkInfo.type
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'attention_check_error'
            };
        }
    }

    /**
     * Solve color selection attention check
     */
    async solveColorSelection(page, checkInfo) {
        try {
            // Extract color from instruction text
            const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white'];
            const targetColor = colors.find(color => checkInfo.text.includes(color));

            if (targetColor) {
                console.log(`   🎨 Selecting color: ${targetColor}`);
                
                // Try to find and click the color
                const colorElement = await page.$(
                    `[style*="${targetColor}"], [class*="${targetColor}"], [data-color="${targetColor}"]`
                );

                if (colorElement) {
                    await colorElement.click();
                    await this.delay(500);
                    return true;
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Solve button click attention check
     */
    async solveButtonClick(page, checkInfo) {
        try {
            // Look for specific button mentioned in text
            const buttonTexts = ['continue', 'proceed', 'next', 'submit', 'verify'];
            
            for (const buttonText of buttonTexts) {
                if (checkInfo.text.includes(buttonText)) {
                    const button = await page.$(`button:has-text("${buttonText}"), input[value*="${buttonText}"]`);
                    if (button) {
                        console.log(`   🔘 Clicking button: ${buttonText}`);
                        await button.click();
                        await this.delay(500);
                        return true;
                    }
                }
            }

            // Fallback: click any visible button
            const anyButton = await page.$('button:visible, input[type="button"]:visible');
            if (anyButton) {
                await anyButton.click();
                await this.delay(500);
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Solve text input attention check
     */
    async solveTextInput(page, checkInfo) {
        try {
            // Common attention check patterns
            const patterns = {
                'type yes': 'yes',
                'type no': 'no',
                'enter yes': 'yes',
                'enter no': 'no',
                'type human': 'human',
                'type continue': 'continue'
            };

            let inputValue = null;
            for (const [pattern, value] of Object.entries(patterns)) {
                if (checkInfo.text.includes(pattern)) {
                    inputValue = value;
                    break;
                }
            }

            if (inputValue) {
                console.log(`   ⌨️ Typing: ${inputValue}`);
                
                const input = await page.$('input[type="text"], textarea');
                if (input) {
                    await input.fill(inputValue);
                    await this.delay(500);
                    
                    // Try to submit
                    const submit = await page.$('button[type="submit"], input[type="submit"]');
                    if (submit) {
                        await submit.click();
                    }
                    
                    return true;
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Solve generic attention check
     */
    async solveGenericAttentionCheck(page, checkInfo) {
        try {
            // Just try clicking the first clickable element
            const clickable = await page.$('button, input[type="button"], input[type="submit"], a');
            if (clickable) {
                await clickable.click();
                await this.delay(500);
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Handle rate limiting
     */
    async handleRateLimit(page, challenge, options = {}) {
        console.log('   ⏱️ Handling rate limit');

        try {
            // Extract wait time from content if possible
            const waitTime = await page.evaluate(() => {
                const text = document.body.textContent;
                const match = text.match(/wait (\d+) (second|minute|hour)/i);
                if (match) {
                    const value = parseInt(match[1]);
                    const unit = match[2].toLowerCase();
                    
                    switch (unit) {
                        case 'second': return value * 1000;
                        case 'minute': return value * 60 * 1000;
                        case 'hour': return value * 60 * 60 * 1000;
                    }
                }
                return 60000; // Default 1 minute
            });

            console.log(`   ⏳ Waiting ${waitTime / 1000}s for rate limit`);
            
            // Wait for the specified time
            await this.delay(Math.min(waitTime, 300000)); // Max 5 minutes

            // Try refreshing the page
            await page.reload({ waitUntil: 'networkidle' });

            return {
                success: true,
                method: 'wait_and_refresh',
                waitTime: waitTime
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'rate_limit_error'
            };
        }
    }

    /**
     * Solve proof of work challenges
     */
    async solveProofOfWork(page, challenge, options = {}) {
        console.log('   ⚡ Solving proof of work');

        try {
            // Look for proof of work parameters
            const powInfo = await page.evaluate(() => {
                const scripts = Array.from(document.scripts);
                for (const script of scripts) {
                    if (script.textContent.includes('proof') && script.textContent.includes('work')) {
                        // Extract parameters
                        const difficultyMatch = script.textContent.match(/difficulty['":\s]*(\d+)/);
                        const targetMatch = script.textContent.match(/target['":\s]*['"]([^'"]+)['"]/);
                        
                        return {
                            difficulty: difficultyMatch ? parseInt(difficultyMatch[1]) : 4,
                            target: targetMatch ? targetMatch[1] : '0000'
                        };
                    }
                }
                return null;
            });

            if (powInfo) {
                // Simple proof of work solving
                const solution = this.calculateProofOfWork(powInfo.target, powInfo.difficulty);
                
                // Submit solution
                await page.evaluate((sol) => {
                    const input = document.querySelector('input[name*="proof"], input[name*="pow"]');
                    if (input) {
                        input.value = sol;
                        const form = input.closest('form');
                        if (form) form.submit();
                    }
                }, solution);

                return {
                    success: true,
                    method: 'calculated',
                    solution: solution
                };
            }

            return {
                success: false,
                error: 'Proof of work parameters not found',
                method: 'detection_failed'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'proof_of_work_error'
            };
        }
    }

    /**
     * Calculate proof of work
     */
    calculateProofOfWork(target, difficulty) {
        const crypto = require('crypto');
        let nonce = 0;
        
        while (nonce < 1000000) { // Reasonable limit
            const hash = crypto.createHash('sha256')
                .update(target + nonce.toString())
                .digest('hex');
            
            if (hash.startsWith('0'.repeat(difficulty))) {
                return nonce.toString();
            }
            
            nonce++;
        }
        
        return '0'; // Fallback
    }

    /**
     * Solve cognitive puzzles
     */
    async solveCognitivePuzzle(page, challenge, options = {}) {
        console.log('   🧠 Solving cognitive puzzle');

        try {
            // Use AI service if available
            if (this.options.aiService) {
                const screenshot = await page.screenshot();
                const solution = await this.options.aiService.solveCognitivePuzzle({
                    image: screenshot,
                    context: 'attention_verification'
                });

                if (solution && solution.answer) {
                    // Apply solution
                    await page.evaluate((answer) => {
                        const input = document.querySelector('input[type="text"]:last-of-type');
                        if (input) {
                            input.value = answer;
                            const submit = document.querySelector('button[type="submit"], input[type="submit"]');
                            if (submit) submit.click();
                        }
                    }, solution.answer);

                    return {
                        success: true,
                        method: 'ai_solved',
                        answer: solution.answer
                    };
                }
            }

            // Fallback: try common patterns
            const commonAnswers = ['human', 'yes', 'correct', '1', 'a'];
            for (const answer of commonAnswers) {
                const input = await page.$('input[type="text"]:last-of-type');
                if (input) {
                    await input.fill(answer);
                    const submit = await page.$('button[type="submit"], input[type="submit"]');
                    if (submit) {
                        await submit.click();
                        await this.delay(1000);
                        
                        // Check if still on puzzle page
                        const stillOnPuzzle = await page.$('.puzzle, [class*="puzzle"]') !== null;
                        if (!stillOnPuzzle) {
                            return {
                                success: true,
                                method: 'pattern_match',
                                answer: answer
                            };
                        }
                    }
                }
            }

            return {
                success: false,
                error: 'Could not solve cognitive puzzle',
                method: 'failed'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'cognitive_puzzle_error'
            };
        }
    }

    /**
     * Solve media verification challenges
     */
    async solveMediaVerification(page, challenge, options = {}) {
        console.log('   📺 Handling media verification');

        try {
            // Look for video elements
            const video = await page.$('video');
            if (video) {
                // Play video and wait for completion
                await page.evaluate(() => {
                    const vid = document.querySelector('video');
                    if (vid) {
                        vid.play();
                        return new Promise(resolve => {
                            vid.addEventListener('ended', resolve);
                            // Timeout after 2 minutes
                            setTimeout(resolve, 120000);
                        });
                    }
                });

                return {
                    success: true,
                    method: 'video_played'
                };
            }

            // Look for audio elements
            const audio = await page.$('audio');
            if (audio) {
                await page.evaluate(() => {
                    const aud = document.querySelector('audio');
                    if (aud) aud.play();
                });

                await this.delay(5000); // Wait 5 seconds

                return {
                    success: true,
                    method: 'audio_played'
                };
            }

            return {
                success: false,
                error: 'No media elements found',
                method: 'no_media'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'media_verification_error'
            };
        }
    }

    /**
     * Solve generic/unknown challenges
     */
    async solveGenericChallenge(page, challenge, options = {}) {
        console.log('   ❓ Solving generic challenge');

        try {
            // Try common interactions
            const interactions = [
                () => page.click('button:visible'),
                () => page.click('input[type="submit"]:visible'),
                () => page.click('a:visible'),
                () => page.fill('input[type="text"]:visible', 'human'),
                () => page.check('input[type="checkbox"]:visible')
            ];

            for (const interaction of interactions) {
                try {
                    await interaction();
                    await this.delay(1000);

                    // Check if challenge is resolved
                    const challengeStillPresent = await page.$(challenge.selector || '.challenge') !== null;
                    if (!challengeStillPresent) {
                        return {
                            success: true,
                            method: 'generic_interaction'
                        };
                    }
                } catch (error) {
                    continue;
                }
            }

            return {
                success: false,
                error: 'Generic challenge solving failed',
                method: 'generic_failed'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'generic_error'
            };
        }
    }

    /**
     * Learning and adaptation methods
     */
    async learnFromSuccess(challenge, result, duration) {
        const pattern = {
            type: challenge.type,
            method: result.method,
            duration: duration,
            success: true,
            timestamp: Date.now()
        };

        const key = `${challenge.type}_${result.method}`;
        if (!this.challengePatterns.has(key)) {
            this.challengePatterns.set(key, []);
        }
        
        this.challengePatterns.get(key).push(pattern);
        
        // Keep only recent patterns
        const patterns = this.challengePatterns.get(key);
        if (patterns.length > 100) {
            patterns.splice(0, patterns.length - 100);
        }
    }

    async loadChallengePatterns() {
        console.log('📚 Loading challenge patterns...');
        // Implementation would load previous patterns
    }

    async saveChallengePatterns() {
        console.log('💾 Saving challenge patterns...');
        // Implementation would save patterns
    }

    /**
     * Utility methods
     */
    validateServiceConfigurations() {
        const availableServices = [];
        
        if (this.captchaServices.twoCaptcha.enabled) {
            availableServices.push('2Captcha');
        }
        if (this.captchaServices.antiCaptcha.enabled) {
            availableServices.push('AntiCaptcha');
        }
        if (this.options.aiService) {
            availableServices.push('AI Service');
        }

        console.log(`   🔧 Available solving services: ${availableServices.join(', ') || 'None'}`);
    }

    displayCapabilities() {
        console.log('   🧩 Challenge solving capabilities:');
        console.log(`      ✅ CAPTCHA: ${this.options.captchaEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`      ✅ Cloudflare: Enabled`);
        console.log(`      ✅ Attention Checks: Enabled`);
        console.log(`      ✅ Rate Limiting: Enabled`);
        console.log(`      ✅ Proof of Work: Enabled`);
        console.log(`      ✅ Cognitive Puzzles: ${this.options.aiService ? 'AI-Powered' : 'Pattern-Based'}`);
        console.log(`      ✅ Media Verification: Enabled`);
    }

    setupChallengeMonitoring() {
        // Setup performance monitoring
        setInterval(() => {
            this.updateSuccessRate();
        }, 60000); // Every minute
    }

    updateStats(challengeType, success, duration) {
        this.stats.avgSolveTime = (this.stats.avgSolveTime + duration) / 2;
        
        if (challengeType === this.challengeTypes.CAPTCHA && success) {
            this.stats.captchasSolved++;
        }
        if (challengeType === this.challengeTypes.ATTENTION_CHECK && success) {
            this.stats.attentionChecksPassed++;
        }
    }

    updateSuccessRate() {
        if (this.stats.totalChallenges > 0) {
            this.stats.successRate = (this.stats.solvedChallenges / this.stats.totalChallenges * 100).toFixed(1) + '%';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test capabilities
     */
    async testCapabilities() {
        this.ensureInitialized();

        try {
            const tests = {
                captcha: this.options.captchaEnabled && (
                    this.captchaServices.twoCaptcha.enabled || 
                    this.captchaServices.antiCaptcha.enabled ||
                    this.options.aiService
                ),
                cloudflare: true,
                attentionCheck: true,
                rateLimit: true,
                proofOfWork: true,
                cognitivePuzzle: !!this.options.aiService,
                mediaVerification: true
            };

            return {
                success: true,
                capabilities: tests,
                services: {
                    twoCaptcha: this.captchaServices.twoCaptcha.enabled,
                    antiCaptcha: this.captchaServices.antiCaptcha.enabled,
                    aiService: !!this.options.aiService
                },
                stats: this.getStats()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get learned solutions (for main engine)
     */
    getLearnedSolutions() {
        const solutions = {};
        
        for (const [key, patterns] of this.challengePatterns.entries()) {
            const successfulPatterns = patterns.filter(p => p.success);
            if (successfulPatterns.length > 0) {
                solutions[key] = {
                    patterns: successfulPatterns,
                    successRate: successfulPatterns.length / patterns.length,
                    avgDuration: successfulPatterns.reduce((sum, p) => sum + p.duration, 0) / successfulPatterns.length
                };
            }
        }
        
        return solutions;
    }

    /**
     * Get statistics
     */
    getStats() {
        this.updateSuccessRate();
        
        return {
            ...this.stats,
            activeChallenges: this.activeChallenges.size,
            knownPatterns: this.challengePatterns.size,
            serviceStatus: {
                twoCaptcha: this.captchaServices.twoCaptcha.enabled,
                antiCaptcha: this.captchaServices.antiCaptcha.enabled,
                aiService: !!this.options.aiService
            }
        };
    }

    /**
     * Utility methods
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Challenge Resolver not initialized. Call initialize() first.');
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Challenge Resolver...');
        
        try {
            // Save learning data
            if (this.options.enableLearning) {
                await this.saveChallengePatterns();
            }
            
            // Clear maps and data
            this.activeChallenges.clear();
            this.solvedChallenges.clear();
            this.challengePatterns.clear();
            this.adaptiveStrategies.clear();
            
            this.isInitialized = false;
            console.log('✅ Challenge Resolver cleanup complete');
            
        } catch (error) {
            console.error('❌ Challenge Resolver cleanup error:', error.message);
        }
    }
}

module.exports = ChallengeResolver;