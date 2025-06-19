/**
 * CAPTCHA Solving System
 * Integrated solution for various CAPTCHA types with multiple solving methods
 */

const fs = require('fs').promises;
const crypto = require('crypto');

class CaptchaSolver {
    constructor(options = {}) {
        this.options = {
            // API keys for solving services
            twoCaptchaKey: options.twoCaptchaKey || process.env.TWOCAPTCHA_API_KEY,
            antiCaptchaKey: options.antiCaptchaKey || process.env.ANTICAPTCHA_API_KEY,
            
            // Solver preferences
            preferredSolver: options.preferredSolver || 'auto', // auto, 2captcha, anticaptcha, local
            timeout: options.timeout || 120000, // 2 minutes
            retryAttempts: options.retryAttempts || 3,
            
            // Local solving options
            useLocalSolver: options.useLocalSolver || false,
            localConfidenceThreshold: options.localConfidenceThreshold || 0.8,
            
            ...options
        };
        
        this.solveHistory = [];
    }
    
    /**
     * Main CAPTCHA solving method - detects type and solves
     */
    async solveCaptcha(page, captchaInfo) {
        console.log(`🔍 Attempting to solve CAPTCHA: ${captchaInfo.type}`);
        
        const startTime = Date.now();
        let solution = null;
        let method = null;
        
        try {
            switch (captchaInfo.type) {
                case 'recaptcha_v2':
                    solution = await this.solveRecaptchaV2(page, captchaInfo);
                    method = 'recaptcha_v2';
                    break;
                    
                case 'recaptcha_v3':
                    solution = await this.solveRecaptchaV3(page, captchaInfo);
                    method = 'recaptcha_v3';
                    break;
                    
                case 'hcaptcha':
                    solution = await this.solveHCaptcha(page, captchaInfo);
                    method = 'hcaptcha';
                    break;
                    
                case 'turnstile':
                    solution = await this.solveTurnstile(page, captchaInfo);
                    method = 'turnstile';
                    break;
                    
                case 'image':
                    solution = await this.solveImageCaptcha(page, captchaInfo);
                    method = 'image';
                    break;
                    
                case 'text':
                    solution = await this.solveTextCaptcha(page, captchaInfo);
                    method = 'text';
                    break;
                    
                default:
                    throw new Error(`Unsupported CAPTCHA type: ${captchaInfo.type}`);
            }
            
            const solveTime = Date.now() - startTime;
            
            // Log successful solve
            this.logSolve({
                type: captchaInfo.type,
                method: method,
                success: true,
                solveTime: solveTime,
                solution: solution ? 'solved' : 'failed'
            });
            
            console.log(`✅ CAPTCHA solved in ${solveTime}ms using ${method}`);
            return solution;
            
        } catch (error) {
            const solveTime = Date.now() - startTime;
            
            this.logSolve({
                type: captchaInfo.type,
                method: method || 'unknown',
                success: false,
                solveTime: solveTime,
                error: error.message
            });
            
            console.log(`❌ CAPTCHA solve failed: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Solve reCAPTCHA v2
     */
    async solveRecaptchaV2(page, captchaInfo) {
        console.log('🔄 Solving reCAPTCHA v2...');
        
        // Extract site key
        const siteKey = await this.extractSiteKey(page, captchaInfo);
        if (!siteKey) {
            throw new Error('Could not extract reCAPTCHA site key');
        }
        
        const pageUrl = page.url();
        
        // Try different solving methods in order of preference
        const solvers = this.getSolverOrder();
        
        for (const solver of solvers) {
            try {
                let solution;
                
                switch (solver) {
                    case '2captcha':
                        solution = await this.solve2CaptchaRecaptcha(siteKey, pageUrl);
                        break;
                        
                    case 'anticaptcha':
                        solution = await this.solveAntiCaptchaRecaptcha(siteKey, pageUrl);
                        break;
                        
                    case 'local':
                        solution = await this.solveLocalRecaptcha(page, captchaInfo);
                        break;
                        
                    default:
                        continue;
                }
                
                if (solution) {
                    // Submit solution
                    await this.submitRecaptchaSolution(page, solution);
                    return solution;
                }
                
            } catch (error) {
                console.log(`⚠️ ${solver} failed: ${error.message}`);
                continue;
            }
        }
        
        throw new Error('All reCAPTCHA solving methods failed');
    }
    
    /**
     * Solve reCAPTCHA v3
     */
    async solveRecaptchaV3(page, captchaInfo) {
        console.log('🔄 Solving reCAPTCHA v3...');
        
        // reCAPTCHA v3 is score-based, often requires different approach
        const siteKey = await this.extractSiteKey(page, captchaInfo);
        const action = captchaInfo.action || 'submit';
        
        if (this.options.twoCaptchaKey) {
            return await this.solve2CaptchaRecaptchaV3(siteKey, page.url(), action);
        }
        
        throw new Error('reCAPTCHA v3 solving requires API key');
    }
    
    /**
     * Solve hCaptcha
     */
    async solveHCaptcha(page, captchaInfo) {
        console.log('🔄 Solving hCaptcha...');
        
        const siteKey = await this.extractHCaptchaSiteKey(page, captchaInfo);
        if (!siteKey) {
            throw new Error('Could not extract hCaptcha site key');
        }
        
        if (this.options.twoCaptchaKey) {
            const solution = await this.solve2CaptchaHCaptcha(siteKey, page.url());
            if (solution) {
                await this.submitHCaptchaSolution(page, solution);
                return solution;
            }
        }
        
        throw new Error('hCaptcha solving failed');
    }
    
    /**
     * Solve Cloudflare Turnstile
     */
    async solveTurnstile(page, captchaInfo) {
        console.log('🔄 Solving Cloudflare Turnstile...');
        
        // Turnstile often auto-solves with proper browser setup
        try {
            // Wait for auto-solve
            await page.waitForSelector('.cf-turnstile-success', { timeout: 10000 });
            console.log('✅ Turnstile auto-solved');
            return true;
        } catch (error) {
            // Try manual solving if available
            const siteKey = await this.extractTurnstileSiteKey(page, captchaInfo);
            if (siteKey && this.options.twoCaptchaKey) {
                return await this.solve2CaptchaTurnstile(siteKey, page.url());
            }
        }
        
        throw new Error('Turnstile solving failed');
    }
    
    /**
     * Solve image CAPTCHA
     */
    async solveImageCaptcha(page, captchaInfo) {
        console.log('🔄 Solving image CAPTCHA...');
        
        // Take screenshot of CAPTCHA
        const captchaImage = await this.extractCaptchaImage(page, captchaInfo);
        if (!captchaImage) {
            throw new Error('Could not extract CAPTCHA image');
        }
        
        // Try local OCR first if enabled
        if (this.options.useLocalSolver) {
            try {
                const localSolution = await this.solveImageLocal(captchaImage);
                if (localSolution.confidence > this.options.localConfidenceThreshold) {
                    return localSolution.text;
                }
            } catch (error) {
                console.log(`⚠️ Local OCR failed: ${error.message}`);
            }
        }
        
        // Use API service
        if (this.options.twoCaptchaKey) {
            return await this.solve2CaptchaImage(captchaImage);
        }
        
        throw new Error('Image CAPTCHA solving failed');
    }
    
    /**
     * Solve text CAPTCHA
     */
    async solveTextCaptcha(page, captchaInfo) {
        console.log('🔄 Solving text CAPTCHA...');
        
        // Extract question text
        const questionText = await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent.trim() : null;
        }, captchaInfo.questionSelector || '.captcha-question');
        
        if (!questionText) {
            throw new Error('Could not extract CAPTCHA question');
        }
        
        // Use API service for text CAPTCHAs
        if (this.options.twoCaptchaKey) {
            return await this.solve2CaptchaText(questionText);
        }
        
        throw new Error('Text CAPTCHA solving failed');
    }
    
    /**
     * Extract reCAPTCHA site key
     */
    async extractSiteKey(page, captchaInfo) {
        return await page.evaluate(() => {
            // Try multiple methods to find site key
            let siteKey = null;
            
            // Method 1: iframe src
            const recaptchaIframe = document.querySelector('iframe[src*="recaptcha"]');
            if (recaptchaIframe) {
                const match = recaptchaIframe.src.match(/k=([a-zA-Z0-9_-]+)/);
                if (match) siteKey = match[1];
            }
            
            // Method 2: data-sitekey attribute
            if (!siteKey) {
                const recaptchaDiv = document.querySelector('[data-sitekey]');
                if (recaptchaDiv) siteKey = recaptchaDiv.getAttribute('data-sitekey');
            }
            
            // Method 3: script content
            if (!siteKey) {
                const scripts = Array.from(document.scripts);
                for (const script of scripts) {
                    const match = script.innerHTML.match(/['""]sitekey['""]:\s*['""]([a-zA-Z0-9_-]+)['""]/) ||
                                 script.innerHTML.match(/grecaptcha\.render\([^,]+,\s*{\s*['""]sitekey['""]:\s*['""]([a-zA-Z0-9_-]+)['""]/) ||
                                 script.innerHTML.match(/data-sitekey=['""]([a-zA-Z0-9_-]+)['""]/) ||
                                 script.innerHTML.match(/sitekey=([a-zA-Z0-9_-]+)/);
                    if (match) {
                        siteKey = match[1];
                        break;
                    }
                }
            }
            
            return siteKey;
        });
    }
    
    /**
     * 2Captcha reCAPTCHA solving
     */
    async solve2CaptchaRecaptcha(siteKey, pageUrl) {
        if (!this.options.twoCaptchaKey) {
            throw new Error('2Captcha API key not provided');
        }
        
        console.log('🔄 Using 2Captcha service...');
        
        // Submit CAPTCHA
        const submitResponse = await fetch('http://2captcha.com/in.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                key: this.options.twoCaptchaKey,
                method: 'userrecaptcha',
                googlekey: siteKey,
                pageurl: pageUrl,
                json: '1'
            })
        });
        
        const submitResult = await submitResponse.json();
        if (submitResult.status !== 1) {
            throw new Error(`2Captcha submit failed: ${submitResult.error_text}`);
        }
        
        const captchaId = submitResult.request;
        
        // Poll for solution
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            
            const resultResponse = await fetch(`http://2captcha.com/res.php?key=${this.options.twoCaptchaKey}&action=get&id=${captchaId}&json=1`);
            const result = await resultResponse.json();
            
            if (result.status === 1) {
                return result.request; // This is the solution token
            }
            
            if (result.error_text && result.error_text !== 'CAPCHA_NOT_READY') {
                throw new Error(`2Captcha error: ${result.error_text}`);
            }
            
            attempts++;
        }
        
        throw new Error('2Captcha timeout');
    }
    
    /**
     * Submit reCAPTCHA solution
     */
    async submitRecaptchaSolution(page, solution) {
        await page.evaluate((token) => {
            // Method 1: Call callback if available
            if (window.grecaptchaCallback) {
                window.grecaptchaCallback(token);
                return;
            }
            
            // Method 2: Set textarea value
            const textarea = document.querySelector('#g-recaptcha-response, [name="g-recaptcha-response"]');
            if (textarea) {
                textarea.style.display = 'block';
                textarea.value = token;
                
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                textarea.dispatchEvent(event);
            }
            
            // Method 3: Try to find and trigger callback
            const recaptchaElement = document.querySelector('.g-recaptcha');
            if (recaptchaElement) {
                const callback = recaptchaElement.getAttribute('data-callback');
                if (callback && window[callback]) {
                    window[callback](token);
                }
            }
        }, solution);
        
        // Wait a moment for the solution to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    /**
     * Extract CAPTCHA image
     */
    async extractCaptchaImage(page, captchaInfo) {
        const selector = captchaInfo.imageSelector || '.captcha-image, #captcha-image, img[alt*="captcha" i]';
        
        try {
            const element = await page.$(selector);
            if (!element) return null;
            
            const screenshot = await element.screenshot({ type: 'png' });
            return screenshot;
        } catch (error) {
            console.log(`⚠️ Error extracting CAPTCHA image: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get solver order based on preferences
     */
    getSolverOrder() {
        if (this.options.preferredSolver !== 'auto') {
            return [this.options.preferredSolver];
        }
        
        const solvers = [];
        
        if (this.options.twoCaptchaKey) solvers.push('2captcha');
        if (this.options.antiCaptchaKey) solvers.push('anticaptcha');
        if (this.options.useLocalSolver) solvers.push('local');
        
        return solvers;
    }
    
    /**
     * Log solving attempt
     */
    logSolve(solveData) {
        this.solveHistory.push({
            ...solveData,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 attempts
        if (this.solveHistory.length > 100) {
            this.solveHistory = this.solveHistory.slice(-100);
        }
    }
    
    /**
     * Get solving statistics
     */
    getStats() {
        const total = this.solveHistory.length;
        const successful = this.solveHistory.filter(s => s.success).length;
        const byType = {};
        const byMethod = {};
        
        this.solveHistory.forEach(solve => {
            byType[solve.type] = (byType[solve.type] || 0) + 1;
            byMethod[solve.method] = (byMethod[solve.method] || 0) + 1;
        });
        
        return {
            total,
            successful,
            successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : '0%',
            averageSolveTime: total > 0 ? 
                Math.round(this.solveHistory.reduce((sum, s) => sum + s.solveTime, 0) / total) + 'ms' : '0ms',
            byType,
            byMethod
        };
    }
    
    /**
     * Check if solver is configured
     */
    isConfigured() {
        return !!(this.options.twoCaptchaKey || this.options.antiCaptchaKey || this.options.useLocalSolver);
    }
}

module.exports = CaptchaSolver;