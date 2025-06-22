/**
 * Enhanced Failure Analyzer
 * Advanced LLM-powered failure interpretation and intelligent data curation
 */

class EnhancedFailureAnalyzer {
    constructor(aiService, options = {}) {
        this.aiService = aiService;
        this.options = {
            enableScreenshots: true,
            enableDOMSnapshot: true,
            enableNetworkLogs: true,
            enableConsoleCapture: true,
            enableReproductionScript: true,
            minAnalysisConfidence: 0.7,
            ...options
        };
        
        this.failureCategories = {
            'selector_failure': {
                description: 'Element selectors failed to find target elements',
                severity: 'medium',
                recoverable: true
            },
            'anti_bot_detection': {
                description: 'Site detected automation and blocked access',
                severity: 'high',
                recoverable: true
            },
            'network_timeout': {
                description: 'Network requests timed out or failed',
                severity: 'medium', 
                recoverable: true
            },
            'javascript_error': {
                description: 'JavaScript errors prevented execution',
                severity: 'high',
                recoverable: false
            },
            'site_structure_change': {
                description: 'Site structure changed breaking automation',
                severity: 'high',
                recoverable: true
            },
            'captcha_challenge': {
                description: 'Captcha or human verification required',
                severity: 'critical',
                recoverable: false
            }
        };
    }

    /**
     * Comprehensive failure analysis with LLM interpretation
     */
    async analyzeFailure(failureContext) {
        console.log('🔍 Starting enhanced failure analysis...');
        
        try {
            // 1. Capture comprehensive context
            const enrichedContext = await this.captureEnhancedContext(failureContext);
            
            // 2. Generate LLM-powered analysis
            const llmAnalysis = await this.performLLMFailureAnalysis(enrichedContext);
            
            // 3. Classify and categorize failure
            const classification = await this.classifyFailure(llmAnalysis, enrichedContext);
            
            // 4. Generate actionable insights
            const insights = await this.generateActionableInsights(llmAnalysis, classification);
            
            // 5. Create reproduction recipe
            const reproductionRecipe = await this.generateReproductionRecipe(enrichedContext);
            
            // 6. Assess impact and priority
            const impact = await this.assessFailureImpact(classification, enrichedContext);
            
            const analysis = {
                analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                failureHash: this.generateFailureHash(enrichedContext),
                
                // Core Analysis
                llmAnalysis,
                classification,
                insights,
                reproductionRecipe,
                impact,
                
                // Enhanced Context
                enrichedContext,
                
                // Metadata
                confidence: llmAnalysis.confidence || 0,
                analysisVersion: '2.0',
                analyzer: 'enhanced_llm_analyzer'
            };
            
            console.log(`✅ Enhanced failure analysis completed (confidence: ${analysis.confidence})`);
            return analysis;
            
        } catch (error) {
            console.error('❌ Enhanced failure analysis failed:', error);
            return this.generateFallbackAnalysis(failureContext, error);
        }
    }

    /**
     * Capture enhanced context including visual and technical data
     */
    async captureEnhancedContext(failureContext) {
        const context = {
            basic: failureContext,
            enhanced: {},
            timestamps: {
                captureStart: Date.now()
            }
        };

        try {
            const page = failureContext.page;
            
            // Screenshot capture
            if (this.options.enableScreenshots && page) {
                console.log('   📸 Capturing failure screenshot...');
                try {
                    const screenshotPath = `./data/screenshots/failure_${Date.now()}.png`;
                    await page.screenshot({ 
                        path: screenshotPath, 
                        fullPage: true,
                        type: 'png'
                    });
                    context.enhanced.screenshotPath = screenshotPath;
                } catch (error) {
                    console.warn('   ⚠️ Screenshot capture failed:', error.message);
                }
            }

            // DOM snapshot
            if (this.options.enableDOMSnapshot && page) {
                console.log('   🌐 Capturing DOM snapshot...');
                try {
                    const domSnapshot = await page.content();
                    context.enhanced.domSnapshot = domSnapshot;
                    context.enhanced.domSize = domSnapshot.length;
                    
                    // Extract key elements for analysis
                    const keyElements = await page.evaluate(() => {
                        return {
                            forms: Array.from(document.forms).length,
                            inputs: Array.from(document.querySelectorAll('input')).length,
                            buttons: Array.from(document.querySelectorAll('button')).length,
                            links: Array.from(document.querySelectorAll('a')).length,
                            scripts: Array.from(document.querySelectorAll('script')).length,
                            iframes: Array.from(document.querySelectorAll('iframe')).length,
                            title: document.title,
                            url: window.location.href
                        };
                    });
                    context.enhanced.pageStructure = keyElements;
                } catch (error) {
                    console.warn('   ⚠️ DOM snapshot failed:', error.message);
                }
            }

            // Console logs
            if (this.options.enableConsoleCapture && page) {
                console.log('   📝 Capturing console logs...');
                try {
                    // This would need to be set up as event listeners during automation
                    context.enhanced.consoleLogs = failureContext.consoleLogs || [];
                } catch (error) {
                    console.warn('   ⚠️ Console capture failed:', error.message);
                }
            }

            // Network activity
            if (this.options.enableNetworkLogs && page) {
                console.log('   🌐 Capturing network activity...');
                try {
                    context.enhanced.networkActivity = failureContext.networkLogs || [];
                } catch (error) {
                    console.warn('   ⚠️ Network capture failed:', error.message);
                }
            }

            // Browser state
            try {
                const browserState = await page.evaluate(() => {
                    return {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        platform: navigator.platform,
                        cookieEnabled: navigator.cookieEnabled,
                        onLine: navigator.onLine,
                        viewportWidth: window.innerWidth,
                        viewportHeight: window.innerHeight,
                        devicePixelRatio: window.devicePixelRatio,
                        localStorage: Object.keys(localStorage).length,
                        sessionStorage: Object.keys(sessionStorage).length
                    };
                });
                context.enhanced.browserState = browserState;
            } catch (error) {
                console.warn('   ⚠️ Browser state capture failed:', error.message);
            }

            context.timestamps.captureEnd = Date.now();
            context.timestamps.captureDuration = context.timestamps.captureEnd - context.timestamps.captureStart;

        } catch (error) {
            console.error('   ❌ Enhanced context capture failed:', error);
            context.enhanced.captureError = error.message;
        }

        return context;
    }

    /**
     * Perform deep LLM-powered failure analysis
     */
    async performLLMFailureAnalysis(enrichedContext) {
        console.log('   🤖 Performing LLM failure analysis...');

        const analysisPrompt = this.buildFailureAnalysisPrompt(enrichedContext);
        
        try {
            const response = await this.aiService.analyzeContent(analysisPrompt);
            
            // Parse and structure the LLM response
            const structuredAnalysis = this.parseAnalysisResponse(response);
            
            return {
                rawResponse: response,
                structured: structuredAnalysis,
                confidence: structuredAnalysis.confidence || 0.5,
                analysisTime: Date.now(),
                model: 'gpt-4-failure-analysis'
            };
            
        } catch (error) {
            console.error('   ❌ LLM analysis failed:', error);
            return {
                error: error.message,
                confidence: 0.1,
                structured: {
                    rootCause: 'LLM analysis failed',
                    category: 'analysis_error',
                    severity: 'unknown'
                }
            };
        }
    }

    /**
     * Build comprehensive prompt for failure analysis
     */
    buildFailureAnalysisPrompt(enrichedContext) {
        const { basic, enhanced } = enrichedContext;
        
        return `You are an expert automation failure analyst. Analyze this comprehensive failure scenario and provide detailed insights.

## FAILURE CONTEXT
**Site**: ${basic.siteName || basic.url}
**Error**: ${basic.error?.message || basic.errorMessage}
**Step**: ${basic.stepName || basic.currentStep}
**Timestamp**: ${basic.timestamp}

## TECHNICAL DETAILS
**Failed Action**: ${basic.failedAction || 'Unknown'}
**Failed Selector**: ${basic.failedSelector || 'None'}
**Timeout Duration**: ${basic.timeoutDuration || 'N/A'}ms
**Browser**: ${enhanced.browserState?.userAgent || 'Unknown'}

## PAGE STRUCTURE
**Forms**: ${enhanced.pageStructure?.forms || 0}
**Inputs**: ${enhanced.pageStructure?.inputs || 0}
**Buttons**: ${enhanced.pageStructure?.buttons || 0}
**Scripts**: ${enhanced.pageStructure?.scripts || 0}
**Page Title**: ${enhanced.pageStructure?.title || 'Unknown'}

## BROWSER STATE
**Viewport**: ${enhanced.browserState?.viewportWidth}x${enhanced.browserState?.viewportHeight}
**Device Pixel Ratio**: ${enhanced.browserState?.devicePixelRatio}
**Online**: ${enhanced.browserState?.onLine}
**Cookies Enabled**: ${enhanced.browserState?.cookieEnabled}

## ANALYSIS REQUEST
Provide a comprehensive analysis in JSON format with:

{
  "rootCause": "Primary reason for failure",
  "category": "One of: selector_failure, anti_bot_detection, network_timeout, javascript_error, site_structure_change, captcha_challenge",
  "severity": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "explanation": "Detailed explanation of what went wrong",
  "evidence": ["Array of evidence supporting your analysis"],
  "recommendations": [
    {
      "action": "Specific action to take",
      "priority": "high|medium|low",
      "effort": "low|medium|high",
      "description": "Detailed description"
    }
  ],
  "similarFailures": "Pattern this failure matches",
  "preventable": true/false,
  "recoverable": true/false,
  "estimatedFixTime": "Time estimate to resolve",
  "riskFactors": ["Factors that contributed to failure"],
  "learningPoints": ["Key insights for future automation"]
}

Focus on actionable insights and specific technical recommendations.`;
    }

    /**
     * Parse and structure LLM analysis response
     */
    parseAnalysisResponse(response) {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback to basic parsing
            return {
                rootCause: this.extractField(response, 'rootCause') || 'Unknown',
                category: this.extractField(response, 'category') || 'unknown',
                severity: this.extractField(response, 'severity') || 'medium',
                confidence: parseFloat(this.extractField(response, 'confidence')) || 0.5,
                explanation: this.extractField(response, 'explanation') || response,
                rawResponse: response
            };
            
        } catch (error) {
            console.warn('   ⚠️ Failed to parse LLM response, using fallback');
            return {
                rootCause: 'Analysis parsing failed',
                category: 'analysis_error', 
                confidence: 0.3,
                explanation: response,
                error: error.message
            };
        }
    }

    /**
     * Extract field from text response
     */
    extractField(text, field) {
        const regex = new RegExp(`"${field}":\\s*"([^"]*)"`, 'i');
        const match = text.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Classify failure into structured categories
     */
    async classifyFailure(llmAnalysis, enrichedContext) {
        const category = llmAnalysis.structured?.category || 'unknown';
        const baseClassification = this.failureCategories[category] || {
            description: 'Unknown failure type',
            severity: 'medium',
            recoverable: true
        };

        return {
            category,
            ...baseClassification,
            confidence: llmAnalysis.confidence,
            subCategory: llmAnalysis.structured?.subCategory,
            tags: this.generateFailureTags(llmAnalysis, enrichedContext),
            fingerprint: this.generateFailureFingerprint(enrichedContext)
        };
    }

    /**
     * Generate actionable insights
     */
    async generateActionableInsights(llmAnalysis, classification) {
        const recommendations = llmAnalysis.structured?.recommendations || [];
        
        return {
            immediate: recommendations.filter(r => r.priority === 'high'),
            strategic: recommendations.filter(r => r.priority === 'medium'),
            future: recommendations.filter(r => r.priority === 'low'),
            preventive: this.generatePreventiveMeasures(classification),
            learningPoints: llmAnalysis.structured?.learningPoints || [],
            patterns: this.identifyFailurePatterns(llmAnalysis, classification)
        };
    }

    /**
     * Generate reproduction recipe
     */
    async generateReproductionRecipe(enrichedContext) {
        const { basic, enhanced } = enrichedContext;
        
        return {
            environment: {
                browser: enhanced.browserState?.userAgent,
                viewport: `${enhanced.browserState?.viewportWidth}x${enhanced.browserState?.viewportHeight}`,
                platform: enhanced.browserState?.platform
            },
            steps: [
                `Navigate to: ${basic.url || basic.siteName}`,
                `Wait for page load`,
                `Attempt action: ${basic.failedAction || 'Unknown action'}`,
                ...(basic.stepsToReproduce || [])
            ],
            expectedResult: 'Failure should occur',
            actualResult: basic.error?.message || basic.errorMessage,
            preconditions: basic.preconditions || [],
            testData: basic.testData || {}
        };
    }

    /**
     * Assess failure impact and priority
     */
    async assessFailureImpact(classification, enrichedContext) {
        const severity = classification.severity;
        const recoverable = classification.recoverable;
        
        return {
            severity,
            recoverable,
            businessImpact: this.calculateBusinessImpact(severity, recoverable),
            technicalImpact: this.calculateTechnicalImpact(classification),
            userImpact: this.calculateUserImpact(classification),
            priority: this.calculatePriority(severity, recoverable),
            estimatedResolutionTime: this.estimateResolutionTime(classification),
            blockingFactor: this.assessBlockingFactor(classification)
        };
    }

    /**
     * Calculate business impact score
     */
    calculateBusinessImpact(severity, recoverable) {
        const severityScore = {
            'low': 0.2,
            'medium': 0.5,
            'high': 0.8,
            'critical': 1.0
        }[severity] || 0.5;
        
        const recoverableMultiplier = recoverable ? 0.7 : 1.0;
        
        return severityScore * recoverableMultiplier;
    }

    /**
     * Calculate technical impact
     */
    calculateTechnicalImpact(classification) {
        const category = classification.category;
        
        const impactMap = {
            'selector_failure': 0.4,
            'anti_bot_detection': 0.8,
            'network_timeout': 0.3,
            'javascript_error': 0.9,
            'site_structure_change': 0.7,
            'captcha_challenge': 1.0
        };
        
        return impactMap[category] || 0.5;
    }

    /**
     * Calculate user impact
     */
    calculateUserImpact(classification) {
        // For automation systems, user impact is typically on developers/operators
        return classification.recoverable ? 0.3 : 0.8;
    }

    /**
     * Calculate overall priority
     */
    calculatePriority(severity, recoverable) {
        if (severity === 'critical') return 'P0';
        if (severity === 'high' && !recoverable) return 'P1';
        if (severity === 'high' && recoverable) return 'P2';
        if (severity === 'medium') return 'P3';
        return 'P4';
    }

    /**
     * Estimate resolution time
     */
    estimateResolutionTime(classification) {
        const timeMap = {
            'selector_failure': '2-4 hours',
            'anti_bot_detection': '1-2 days',
            'network_timeout': '1-4 hours',
            'javascript_error': '4-8 hours',
            'site_structure_change': '2-6 hours',
            'captcha_challenge': '2-5 days'
        };
        
        return timeMap[classification.category] || '1-2 days';
    }

    /**
     * Assess blocking factor
     */
    assessBlockingFactor(classification) {
        const blocking = {
            'captcha_challenge': 'complete_block',
            'anti_bot_detection': 'major_block', 
            'javascript_error': 'major_block',
            'site_structure_change': 'partial_block',
            'network_timeout': 'intermittent_block',
            'selector_failure': 'minor_block'
        };
        
        return blocking[classification.category] || 'minor_block';
    }

    /**
     * Generate failure tags for categorization
     */
    generateFailureTags(llmAnalysis, enrichedContext) {
        const tags = [];
        
        // Add category-based tags
        if (llmAnalysis.structured?.category) {
            tags.push(`cat:${llmAnalysis.structured.category}`);
        }
        
        // Add site-based tags
        if (enrichedContext.basic.siteName) {
            tags.push(`site:${enrichedContext.basic.siteName}`);
        }
        
        // Add step-based tags
        if (enrichedContext.basic.stepName) {
            tags.push(`step:${enrichedContext.basic.stepName}`);
        }
        
        // Add severity tags
        if (llmAnalysis.structured?.severity) {
            tags.push(`severity:${llmAnalysis.structured.severity}`);
        }
        
        return tags;
    }

    /**
     * Generate failure fingerprint for deduplication
     */
    generateFailureFingerprint(enrichedContext) {
        const { basic, enhanced } = enrichedContext;
        
        const fingerprint = [
            basic.siteName || basic.url,
            basic.stepName,
            basic.failedSelector,
            basic.error?.message,
            enhanced.pageStructure?.title
        ].filter(Boolean).join('|');
        
        return this.hashString(fingerprint);
    }

    /**
     * Generate failure hash
     */
    generateFailureHash(enrichedContext) {
        const content = JSON.stringify(enrichedContext);
        return this.hashString(content);
    }

    /**
     * Simple hash function
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Generate preventive measures
     */
    generatePreventiveMeasures(classification) {
        const measures = {
            'selector_failure': [
                'Implement more robust selector strategies',
                'Add intelligent element discovery',
                'Create site-specific selector libraries'
            ],
            'anti_bot_detection': [
                'Enhance stealth automation techniques',
                'Implement better behavioral mimicry',
                'Use residential proxy rotation'
            ],
            'network_timeout': [
                'Implement adaptive timeout strategies',
                'Add retry mechanisms with exponential backoff',
                'Monitor network conditions'
            ]
        };
        
        return measures[classification.category] || ['Monitor and review regularly'];
    }

    /**
     * Identify failure patterns
     */
    identifyFailurePatterns(llmAnalysis, classification) {
        return {
            category: classification.category,
            severity: classification.severity,
            recoverable: classification.recoverable,
            confidence: llmAnalysis.confidence,
            timestamp: Date.now()
        };
    }

    /**
     * Generate fallback analysis when LLM fails
     */
    generateFallbackAnalysis(failureContext, error) {
        return {
            analysisId: `fallback_${Date.now()}`,
            timestamp: new Date().toISOString(),
            failureHash: this.generateFailureHash({ basic: failureContext }),
            
            llmAnalysis: {
                error: error.message,
                confidence: 0.1,
                structured: {
                    rootCause: 'Analysis system failure',
                    category: 'analysis_error',
                    severity: 'high',
                    explanation: 'Unable to perform LLM analysis'
                }
            },
            
            classification: {
                category: 'analysis_error',
                severity: 'high',
                recoverable: true,
                confidence: 0.1
            },
            
            enrichedContext: { basic: failureContext },
            analyzer: 'fallback_analyzer'
        };
    }
}

module.exports = EnhancedFailureAnalyzer;