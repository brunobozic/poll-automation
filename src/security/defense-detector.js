/**
 * Defense Detection System
 * Detects and analyzes various anti-automation defenses on survey sites
 */

class DefenseDetector {
    constructor() {
        this.defensePatterns = {
            captcha: {
                selectors: [
                    '.g-recaptcha',
                    '.h-captcha', 
                    '#captcha',
                    '.captcha',
                    '[data-sitekey]',
                    'iframe[src*="recaptcha"]',
                    'iframe[src*="hcaptcha"]',
                    'iframe[src*="captcha"]',
                    '.cf-turnstile'
                ],
                textPatterns: [
                    'prove you are human',
                    'verify you are not a robot',
                    'complete the captcha',
                    'security check',
                    'i\'m not a robot'
                ],
                severity: {
                    'recaptcha': 8,
                    'hcaptcha': 7,
                    'turnstile': 6,
                    'basic': 4
                }
            },
            
            geoblocking: {
                textPatterns: [
                    'not available in your country',
                    'service not available in your region',
                    'geographic restriction',
                    'country not supported',
                    'vpn detected',
                    'proxy detected'
                ],
                statusCodes: [403, 451],
                severity: 9
            },
            
            rateLimit: {
                textPatterns: [
                    'too many requests',
                    'rate limit exceeded',
                    'slow down',
                    'try again later',
                    'temporarily blocked'
                ],
                statusCodes: [429, 503],
                severity: 6
            },
            
            botDetection: {
                textPatterns: [
                    'automated traffic detected',
                    'bot activity detected',
                    'suspicious activity',
                    'unusual behavior',
                    'automation detected'
                ],
                jsChecks: [
                    'navigator.webdriver',
                    'window.callPhantom',
                    'window._phantom',
                    'window.selenium',
                    'document.$cdc_asdjflasutopfhvcZLmcfl_'
                ],
                severity: 8
            },
            
            cloudflare: {
                selectors: [
                    '.cf-browser-verification',
                    '.cf-checking-browser',
                    '#cf-challenge-stage'
                ],
                textPatterns: [
                    'checking your browser',
                    'cloudflare',
                    'ddos protection by cloudflare',
                    'browser verification'
                ],
                headerPatterns: ['cf-ray', 'cf-cache-status'],
                severity: 7
            },
            
            browserFingerprinting: {
                jsChecks: [
                    'canvas fingerprinting',
                    'webgl fingerprinting', 
                    'audio fingerprinting',
                    'font fingerprinting'
                ],
                severity: 5
            },
            
            honeyPot: {
                selectors: [
                    'input[style*="display:none"]',
                    'input[style*="visibility:hidden"]',
                    'input[style*="position:absolute"][style*="left:-"]',
                    '.honeypot',
                    '.hp-field'
                ],
                severity: 3
            },
            
            csrf: {
                selectors: [
                    'input[name*="csrf"]',
                    'input[name*="_token"]',
                    'meta[name="csrf-token"]'
                ],
                severity: 2
            },
            
            emailVerification: {
                textPatterns: [
                    'verification email sent',
                    'check your email',
                    'email verification required',
                    'confirm your email'
                ],
                severity: 4
            },
            
            phoneVerification: {
                selectors: [
                    'input[type="tel"]',
                    'input[name*="phone"]'
                ],
                textPatterns: [
                    'phone verification',
                    'sms verification',
                    'mobile number required'
                ],
                severity: 6
            },
            
            accessControl: {
                textPatterns: [
                    'access denied',
                    'unauthorized',
                    'permission denied',
                    'login required',
                    'members only'
                ],
                statusCodes: [401, 403],
                severity: 7
            }
        };
    }

    /**
     * Detect all defenses on a page
     */
    async detectDefenses(page, url) {
        console.log('🛡️ Scanning for defensive measures...');
        
        const detectedDefenses = [];
        
        try {
            // Get page content and response info
            const pageContent = await page.content();
            const pageText = await page.evaluate(() => document.body.textContent.toLowerCase());
            const response = await page.goto(url, { waitUntil: 'networkidle' });
            const headers = response.headers();
            const statusCode = response.status();
            
            // Check each defense type
            for (const [defenseType, config] of Object.entries(this.defensePatterns)) {
                const defense = await this.checkDefenseType(page, defenseType, config, {
                    pageContent,
                    pageText,
                    headers,
                    statusCode,
                    url
                });
                
                if (defense) {
                    detectedDefenses.push(defense);
                }
            }
            
            // Advanced behavioral detection
            const behavioralDefenses = await this.detectBehavioralChecks(page);
            detectedDefenses.push(...behavioralDefenses);
            
        } catch (error) {
            console.log(`⚠️ Defense detection error: ${error.message}`);
        }
        
        // Sort by severity (highest first)
        detectedDefenses.sort((a, b) => b.severityLevel - a.severityLevel);
        
        console.log(`🛡️ Detected ${detectedDefenses.length} defensive measures`);
        return detectedDefenses;
    }

    /**
     * Check for a specific defense type
     */
    async checkDefenseType(page, defenseType, config, pageData) {
        const evidence = [];
        let detected = false;
        let subtype = 'general';
        let severity = config.severity || 5;
        
        // Check selectors
        if (config.selectors) {
            for (const selector of config.selectors) {
                try {
                    const element = await page.$(selector);
                    if (element && await element.isVisible()) {
                        evidence.push(`Found selector: ${selector}`);
                        detected = true;
                        
                        // Determine subtype based on selector
                        if (selector.includes('recaptcha')) {
                            subtype = 'recaptcha';
                            severity = config.severity.recaptcha || severity;
                        } else if (selector.includes('hcaptcha')) {
                            subtype = 'hcaptcha';
                            severity = config.severity.hcaptcha || severity;
                        } else if (selector.includes('turnstile')) {
                            subtype = 'turnstile';
                            severity = config.severity.turnstile || severity;
                        }
                    }
                } catch (error) {
                    // Continue checking other selectors
                }
            }
        }
        
        // Check text patterns
        if (config.textPatterns) {
            for (const pattern of config.textPatterns) {
                if (pageData.pageText.includes(pattern.toLowerCase())) {
                    evidence.push(`Found text: "${pattern}"`);
                    detected = true;
                    
                    if (pattern.includes('recaptcha')) subtype = 'recaptcha';
                    else if (pattern.includes('cloudflare')) subtype = 'cloudflare';
                    else if (pattern.includes('country')) subtype = 'geo_restriction';
                }
            }
        }
        
        // Check status codes
        if (config.statusCodes && config.statusCodes.includes(pageData.statusCode)) {
            evidence.push(`Status code: ${pageData.statusCode}`);
            detected = true;
            
            if (pageData.statusCode === 429) subtype = 'rate_limit';
            else if (pageData.statusCode === 403) subtype = 'access_denied';
            else if (pageData.statusCode === 451) subtype = 'geo_blocked';
        }
        
        // Check headers
        if (config.headerPatterns) {
            for (const headerPattern of config.headerPatterns) {
                if (Object.keys(pageData.headers).some(h => h.toLowerCase().includes(headerPattern))) {
                    evidence.push(`Header pattern: ${headerPattern}`);
                    detected = true;
                    subtype = 'cloudflare';
                }
            }
        }
        
        // Check JavaScript-based detections
        if (config.jsChecks) {
            try {
                const jsResults = await page.evaluate((checks) => {
                    const results = [];
                    checks.forEach(check => {
                        if (check.includes('navigator.webdriver') && navigator.webdriver) {
                            results.push('webdriver detected');
                        } else if (check.includes('window.callPhantom') && window.callPhantom) {
                            results.push('phantom detected');
                        } else if (check.includes('window._phantom') && window._phantom) {
                            results.push('phantom detected');
                        } else if (check.includes('selenium') && (window.selenium || document.selenium)) {
                            results.push('selenium detected');
                        }
                    });
                    return results;
                }, config.jsChecks);
                
                if (jsResults.length > 0) {
                    evidence.push(...jsResults);
                    detected = true;
                    subtype = 'js_detection';
                }
            } catch (error) {
                // JS checks failed, continue
            }
        }
        
        if (detected) {
            return {
                defenseType: defenseType,
                defenseSubtype: subtype,
                severityLevel: typeof severity === 'object' ? severity[subtype] || severity.basic || 5 : severity,
                description: `${defenseType} defense detected`,
                detectionDetails: {
                    evidence: evidence,
                    url: pageData.url,
                    statusCode: pageData.statusCode,
                    detectedAt: new Date().toISOString()
                }
            };
        }
        
        return null;
    }

    /**
     * Detect behavioral analysis and timing-based checks
     */
    async detectBehavioralChecks(page) {
        const defenses = [];
        
        try {
            // Check for mouse movement tracking
            const mouseTracking = await page.evaluate(() => {
                const scripts = Array.from(document.scripts).map(s => s.innerHTML).join(' ');
                return scripts.includes('mousemove') || scripts.includes('mouse') || scripts.includes('cursor');
            });
            
            if (mouseTracking) {
                defenses.push({
                    defenseType: 'behavioral_analysis',
                    defenseSubtype: 'mouse_tracking',
                    severityLevel: 4,
                    description: 'Mouse movement tracking detected',
                    detectionDetails: {
                        evidence: ['Mouse event tracking in scripts'],
                        detectedAt: new Date().toISOString()
                    }
                });
            }
            
            // Check for timing analysis
            const timingChecks = await page.evaluate(() => {
                const scripts = Array.from(document.scripts).map(s => s.innerHTML).join(' ');
                return scripts.includes('performance.now') || scripts.includes('Date.now') || scripts.includes('timing');
            });
            
            if (timingChecks) {
                defenses.push({
                    defenseType: 'behavioral_analysis',
                    defenseSubtype: 'timing_analysis',
                    severityLevel: 3,
                    description: 'Timing analysis detected',
                    detectionDetails: {
                        evidence: ['Timing checks in scripts'],
                        detectedAt: new Date().toISOString()
                    }
                });
            }
            
            // Check for form interaction monitoring
            const formMonitoring = await page.evaluate(() => {
                const forms = document.querySelectorAll('form');
                let hasMonitoring = false;
                
                forms.forEach(form => {
                    const inputs = form.querySelectorAll('input');
                    inputs.forEach(input => {
                        if (input.onchange || input.oninput || input.onkeyup) {
                            hasMonitoring = true;
                        }
                    });
                });
                
                return hasMonitoring;
            });
            
            if (formMonitoring) {
                defenses.push({
                    defenseType: 'behavioral_analysis',
                    defenseSubtype: 'form_monitoring',
                    severityLevel: 5,
                    description: 'Form interaction monitoring detected',
                    detectionDetails: {
                        evidence: ['Form event handlers detected'],
                        detectedAt: new Date().toISOString()
                    }
                });
            }
            
        } catch (error) {
            console.log(`⚠️ Behavioral detection error: ${error.message}`);
        }
        
        return defenses;
    }

    /**
     * Suggest bypass strategies for detected defenses
     */
    suggestBypassStrategies(defenses) {
        const strategies = [];
        
        defenses.forEach(defense => {
            switch (defense.defenseType) {
                case 'captcha':
                    if (defense.defenseSubtype === 'recaptcha') {
                        strategies.push({
                            defense: defense.defenseType,
                            strategy: 'Use CAPTCHA solving service (2captcha, AntiCaptcha)',
                            difficulty: 'Hard',
                            cost: 'Medium'
                        });
                    } else {
                        strategies.push({
                            defense: defense.defenseType,
                            strategy: 'OCR-based CAPTCHA solving or manual intervention',
                            difficulty: 'Medium',
                            cost: 'Low'
                        });
                    }
                    break;
                    
                case 'geoblocking':
                    strategies.push({
                        defense: defense.defenseType,
                        strategy: 'Use residential proxies from target geography',
                        difficulty: 'Medium',
                        cost: 'High'
                    });
                    break;
                    
                case 'botDetection':
                    strategies.push({
                        defense: defense.defenseType,
                        strategy: 'Enhanced browser stealth, user-agent rotation, behavioral simulation',
                        difficulty: 'Hard',
                        cost: 'Medium'
                    });
                    break;
                    
                case 'cloudflare':
                    strategies.push({
                        defense: defense.defenseType,
                        strategy: 'Use undetected-chromedriver, residential proxies, session persistence',
                        difficulty: 'Hard',
                        cost: 'High'
                    });
                    break;
                    
                case 'rateLimit':
                    strategies.push({
                        defense: defense.defenseType,
                        strategy: 'Implement delays, rotate IPs, distribute requests over time',
                        difficulty: 'Easy',
                        cost: 'Low'
                    });
                    break;
                    
                case 'phoneVerification':
                    strategies.push({
                        defense: defense.defenseType,
                        strategy: 'Use virtual phone number services (SMS-Activate, 5SIM)',
                        difficulty: 'Medium',
                        cost: 'Medium'
                    });
                    break;
                    
                case 'emailVerification':
                    strategies.push({
                        defense: defense.defenseType,
                        strategy: 'Use temporary email services with API access',
                        difficulty: 'Easy',
                        cost: 'Low'
                    });
                    break;
                    
                default:
                    strategies.push({
                        defense: defense.defenseType,
                        strategy: 'Manual analysis required',
                        difficulty: 'Unknown',
                        cost: 'Unknown'
                    });
            }
        });
        
        return strategies;
    }

    /**
     * Calculate overall site difficulty score
     */
    calculateSiteDifficulty(defenses) {
        if (defenses.length === 0) return 1; // Very easy
        
        const totalSeverity = defenses.reduce((sum, defense) => sum + defense.severityLevel, 0);
        const avgSeverity = totalSeverity / defenses.length;
        const defenseCount = defenses.length;
        
        // Factor in both severity and quantity of defenses
        let difficulty = (avgSeverity / 10) * 0.7 + (Math.min(defenseCount, 10) / 10) * 0.3;
        
        // Cap at 1.0
        return Math.min(difficulty, 1.0);
    }
}

module.exports = DefenseDetector;