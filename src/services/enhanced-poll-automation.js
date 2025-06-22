/**
 * Enhanced Poll Automation Service
 * Properly integrates all our advanced AI countermeasures and sophisticated systems
 * 
 * This replaces the basic poll-automation.js with full integration of:
 * - Unified Poll Orchestrator
 * - Master Bypass Coordinator  
 * - Neural Behavioral Simulation
 * - Advanced Challenge Solving
 * - Multi-Tier AI Decision Making
 * - Consolidated Proxy Management
 */

const UnifiedPollOrchestrator = require('../core/unified-poll-orchestrator');
const MasterBypassCoordinator = require('../integration/master-bypass-coordinator');
const ConsolidatedProxyManager = require('../core/consolidated-proxy-manager');
const ConsolidatedMultiTabHandler = require('../core/consolidated-multi-tab-handler');
const NeuralMouseSimulator = require('../behavioral/neural-mouse-simulator');
const AdvancedKeystrokeSimulator = require('../behavioral/advanced-keystroke-simulator');
const ComprehensiveChallengerSolver = require('../verification/comprehensive-challenge-solver');
const { AdvancedAttentionHandler } = require('../verification/advanced-attention-handler');
const AIService = require('../ai/ai-service');
const DatabaseManager = require('../database/manager');
const StealthBrowser = require('../browser/stealth');
const EnhancedSelectorEngine = require('../automation/enhanced-selector-engine');
const AdaptiveTimeoutManager = require('../automation/adaptive-timeout-manager');
const StealthAutomationEngine = require('../automation/stealth-automation-engine');
const axios = require('axios');

class EnhancedPollAutomationService {
    constructor() {
        this.db = new DatabaseManager();
        this.aiService = new AIService();
        this.stealthBrowser = new StealthBrowser();
        
        // Advanced systems
        this.proxyManager = null;
        this.multiTabHandler = null;
        this.mouseSimulator = null;
        this.keystrokeSimulator = null;
        this.challengeSolver = null;
        this.attentionHandler = null;
        this.masterCoordinator = null;
        this.orchestrator = null;
        
        // New adaptive components
        this.selectorEngine = null;
        this.timeoutManager = null;
        this.stealthEngine = null;
        
        // Configuration
        this.llmServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5000';
        this.isInitialized = false;
        
        // Enhanced statistics
        this.stats = {
            totalPolls: 0,
            completedPolls: 0,
            failedPolls: 0,
            questionsAnswered: 0,
            trickQuestionsDetected: 0,
            challengesSolved: 0,
            captchasSolved: 0,
            attentionChecksPassed: 0,
            behaviorScoreAvg: 0,
            totalRuntime: 0,
            aiCostTotal: 0,
            aiCallsTotal: 0,
            proxyRotations: 0,
            multiTabSessions: 0
        };
        
        // AI cost optimization
        this.aiCache = new Map();
        this.siteAnalysisCache = new Map();
        this.batchProcessor = new AIBatchProcessor();
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('🚀 Initializing Enhanced Poll Automation Service...');
            console.log('   📋 Loading advanced AI countermeasures...');
            
            // Initialize database
            await this.db.connect();
            
            // Initialize AI service (no initialization needed for basic AIService)
            // await this.aiService.initialize();
            
            // Initialize browser with advanced stealth
            const context = await this.stealthBrowser.launch();
            const pageObject = await this.stealthBrowser.newPage('base');
            const page = pageObject.page;
            
            // Initialize advanced proxy management
            this.proxyManager = new ConsolidatedProxyManager({
                enableRotation: true,
                sessionPersistence: true,
                geolocationMatching: true,
                performanceOptimization: true,
                healthCheckInterval: 300000 // 5 minutes
            });
            await this.proxyManager.initialize();
            console.log('   ✅ Proxy management system loaded');
            
            // Initialize multi-tab coordination
            this.multiTabHandler = new ConsolidatedMultiTabHandler(this.stealthBrowser.browser, {
                maxTabs: 15,
                parallelProcessing: true,
                tabSyncTimeout: 15000,
                closeUnusedTabs: true
            });
            await this.multiTabHandler.initialize(page);
            console.log('   ✅ Multi-tab coordination system loaded');
            
            // Initialize neural behavioral simulation
            this.mouseSimulator = new NeuralMouseSimulator();
            await this.mouseSimulator.init();
            console.log('   ✅ Neural mouse simulation loaded');
            
            this.keystrokeSimulator = new AdvancedKeystrokeSimulator();
            // Note: AdvancedKeystrokeSimulator may not have initialize method
            console.log('   ✅ Advanced keystroke dynamics loaded');
            
            // Initialize challenge solving systems
            this.challengeSolver = new ComprehensiveChallengerSolver();
            // Note: ComprehensiveChallengerSolver may not have initialize method
            console.log('   ✅ Comprehensive challenge solver loaded');
            
            this.attentionHandler = new AdvancedAttentionHandler();
            // Note: AdvancedAttentionHandler may not have initialize method
            console.log('   ✅ Attention verification handler loaded');
            
            // Initialize new adaptive components
            this.selectorEngine = new EnhancedSelectorEngine(page, {
                timeout: 30000,
                adaptiveTimeout: true,
                enableFallbacks: true,
                enableLearning: true,
                debugMode: true
            });
            console.log('   ✅ Enhanced selector engine loaded');
            
            this.timeoutManager = new AdaptiveTimeoutManager(page, {
                baseTimeout: 30000,
                minTimeout: 5000,
                maxTimeout: 120000,
                enableNetworkAdaptation: true,
                enableSiteProfile: true,
                enableProgressiveTimeout: true,
                debugMode: true
            });
            console.log('   ✅ Adaptive timeout manager loaded');
            
            this.stealthEngine = new StealthAutomationEngine(page, {
                enableMouseSimulation: true,
                enableTypingVariation: true,
                enableBehavioralMimicry: true,
                enableFingerprintRandomization: true,
                humanLikeDelays: true,
                debugMode: true
            });
            await this.stealthEngine.initialize();
            console.log('   ✅ Stealth automation engine loaded');
            
            // Initialize master bypass coordinator with pre-initialized components
            this.masterCoordinator = new MasterBypassCoordinator();
            
            // Pass already initialized components to bypass coordinator
            await this.masterCoordinator.initialize({
                mouseSimulator: this.mouseSimulator,
                keystrokeSimulator: this.keystrokeSimulator,
                challengeSolver: this.challengeSolver,
                attentionHandler: this.attentionHandler,
                proxyManager: this.proxyManager,
                multiTabHandler: this.multiTabHandler,
                aiService: this.aiService,
                skipIndividualInit: true // Flag to skip re-initialization of components
            });
            console.log('   ✅ Master bypass coordinator loaded');
            
            // Initialize unified poll orchestrator
            this.orchestrator = new UnifiedPollOrchestrator(page, {
                enableLearning: true,
                debugMode: true,
                adaptiveDelay: true,
                enableAdvancedAnalysis: true,
                maxRetries: 5,
                questionDetectionTimeout: 45000,
                responseGenerationTimeout: 30000
            });
            
            await this.orchestrator.initialize({
                antiDetectionSystem: this.masterCoordinator,
                questionProcessor: this.challengeSolver,
                humanBehaviorSystem: this.mouseSimulator,
                multiTabHandler: this.multiTabHandler,
                configManager: this.proxyManager,
                selectorEngine: this.selectorEngine,
                timeoutManager: this.timeoutManager,
                stealthEngine: this.stealthEngine
            });
            console.log('   ✅ Unified poll orchestrator loaded');
            
            // Test AI service connectivity with enhanced verification
            await this.testAdvancedAIService();
            
            // Load learning data from previous sessions
            await this.loadLearningData();
            
            // Store browser references
            this.context = context;
            this.page = page;
            this.pageObject = pageObject;
            
            this.isInitialized = true;
            console.log('✅ Enhanced Poll Automation Service initialized successfully');
            console.log('   🧠 AI-powered decision making: ACTIVE');
            console.log('   🎭 Neural behavioral simulation: ACTIVE');
            console.log('   🛡️ Advanced anti-detection: ACTIVE');
            console.log('   🧩 Challenge solving capabilities: ACTIVE');
            console.log('   🌐 Intelligent proxy rotation: ACTIVE');
            console.log('   🎯 Multi-tab coordination: ACTIVE');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Poll Automation Service:', error);
            throw error;
        }
    }

    /**
     * Enhanced automation for a specific site using all advanced capabilities
     */
    async runAutomationForSite(siteId, options = {}) {
        const sessionStart = Date.now();
        let sessionId = null;
        
        try {
            console.log(`\n🎯 Starting enhanced automation for site ID: ${siteId}`);
            
            // Get site configuration
            const site = await this.db.getPollSite(siteId);
            if (!site) {
                throw new Error(`Site not found: ${siteId}`);
            }
            
            console.log(`📋 Site: ${site.name} (${site.base_url})`);
            
            // Create enhanced session
            sessionId = await this.createEnhancedSession(siteId, options);
            
            // Step 1: AI-powered site analysis and strategy generation
            console.log('🧠 Step 1: AI-powered site analysis...');
            const siteStrategy = await this.generateSiteStrategy(site);
            
            // Step 2: Advanced authentication with behavioral simulation
            console.log('🔐 Step 2: Advanced authentication...');
            const authResult = await this.performAdvancedAuthentication(site, siteStrategy);
            
            // Step 3: Intelligent poll discovery with AI assistance
            console.log('🔍 Step 3: AI-assisted poll discovery...');
            const polls = await this.discoverPollsWithAI(site, authResult.page);
            
            if (polls.length === 0) {
                console.log('ℹ️  No polls discovered');
                await this.updateSessionStatus(sessionId, 'completed', { reason: 'No polls found' });
                return { success: true, message: 'No polls available', polls: 0 };
            }
            
            console.log(`📊 Discovered ${polls.length} polls for processing`);
            
            // Step 4: Advanced poll processing with full orchestration
            console.log('🎭 Step 4: Advanced poll processing...');
            const results = [];
            
            for (const poll of polls) {
                try {
                    const pollResult = await this.processAdvancedPoll(poll, authResult, sessionId);
                    results.push(pollResult);
                    
                    if (pollResult.success) {
                        this.stats.completedPolls++;
                        this.stats.questionsAnswered += pollResult.questionsAnswered || 0;
                        this.stats.challengesSolved += pollResult.challengesSolved || 0;
                        this.stats.captchasSolved += pollResult.captchasSolved || 0;
                        this.stats.attentionChecksPassed += pollResult.attentionChecksPassed || 0;
                    } else {
                        this.stats.failedPolls++;
                    }
                    
                    // Adaptive delay between polls
                    if (polls.indexOf(poll) < polls.length - 1) {
                        const delay = await this.calculateAdaptiveDelay(pollResult, results);
                        console.log(`⏳ Adaptive delay: ${Math.round(delay/1000)}s`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                } catch (error) {
                    console.error(`❌ Poll ${poll.id} failed:`, error);
                    results.push({
                        pollId: poll.id,
                        success: false,
                        error: error.message,
                        errorType: error.constructor.name
                    });
                    this.stats.failedPolls++;
                }
            }
            
            // Calculate session metrics
            const sessionDuration = Date.now() - sessionStart;
            this.stats.totalRuntime += sessionDuration;
            this.stats.totalPolls += polls.length;
            
            // Update final session data
            await this.updateSessionStatus(sessionId, 'completed', {
                totalPolls: polls.length,
                completedPolls: results.filter(r => r.success).length,
                failedPolls: results.filter(r => !r.success).length,
                sessionDuration: sessionDuration,
                behaviorScore: await this.masterCoordinator.getFinalBehaviorScore(),
                detectionEvents: await this.masterCoordinator.getDetectionEvents()
            });
            
            // Save learning data
            await this.saveLearningData(sessionId, results);
            
            console.log('\n📈 Enhanced Automation Summary:');
            console.log(`   ✅ Polls completed: ${results.filter(r => r.success).length}/${polls.length}`);
            console.log(`   🧩 Challenges solved: ${this.stats.challengesSolved}`);
            console.log(`   🔒 CAPTCHAs solved: ${this.stats.captchasSolved}`);
            console.log(`   👁️ Attention checks passed: ${this.stats.attentionChecksPassed}`);
            console.log(`   🎭 Behavior score: ${(await this.masterCoordinator.getFinalBehaviorScore() * 100).toFixed(1)}%`);
            console.log(`   💰 AI cost: $${this.stats.aiCostTotal.toFixed(4)}`);
            console.log(`   ⏱️ Runtime: ${Math.round(sessionDuration / 1000)}s`);
            
            return {
                success: true,
                siteId: siteId,
                sessionId: sessionId,
                totalPolls: polls.length,
                results: results,
                enhancedStats: this.getEnhancedStats(),
                behaviorAnalysis: await this.masterCoordinator.getBehaviorAnalysis(),
                recommendations: await this.generateSessionRecommendations(results)
            };
            
        } catch (error) {
            console.error(`❌ Enhanced site automation failed for site ${siteId}:`, error);
            
            if (sessionId) {
                await this.updateSessionStatus(sessionId, 'failed', { 
                    error: error.message,
                    errorType: error.constructor.name,
                    stack: error.stack
                });
            }
            
            await this.db.logAction(siteId, null, 'enhanced_automation_failed', error.message, false);
            
            return {
                success: false,
                siteId: siteId,
                sessionId: sessionId,
                error: error.message,
                enhancedStats: this.getEnhancedStats()
            };
            
        } finally {
            // Enhanced cleanup
            try {
                if (this.masterCoordinator) {
                    await this.masterCoordinator.cleanup();
                }
                if (this.multiTabHandler) {
                    await this.multiTabHandler.closeAllExceptMain();
                }
            } catch (error) {
                console.error('Enhanced cleanup error:', error);
            }
        }
    }

    /**
     * Advanced poll processing using unified orchestrator
     */
    async processAdvancedPoll(poll, authSession, sessionId) {
        const pollStart = Date.now();
        
        try {
            console.log(`\n📋 Processing poll with advanced orchestration: "${poll.title || poll.url}"`);
            
            // Use our unified orchestrator for the entire poll automation
            const orchestrationResult = await this.orchestrator.automatePoll(poll.url, {
                sessionId: `${sessionId}_${poll.id}`,
                siteStrategy: poll.strategy,
                adaptiveStrategy: true,
                thoroughMode: true,
                enableChallengesolving: true,
                enableAttentionHandling: true,
                enableBehavioralSimulation: true
            });
            
            if (!orchestrationResult.success) {
                throw new Error(`Orchestration failed: ${orchestrationResult.error || 'Unknown error'}`);
            }
            
            const pollDuration = Date.now() - pollStart;
            
            // Update database with enhanced results
            await this.db.updatePollStatus(poll.id, 'completed', {
                orchestrationResult: orchestrationResult,
                enhancedMetrics: {
                    duration: pollDuration,
                    behaviorScore: orchestrationResult.behaviorScore,
                    challengesSolved: orchestrationResult.challengesSolved,
                    detectionEvents: orchestrationResult.detectionEvents
                }
            });
            
            console.log(`✅ Advanced poll completed in ${Math.round(pollDuration / 1000)}s`);
            
            return {
                pollId: poll.id,
                success: true,
                questionsAnswered: orchestrationResult.questionsProcessed || 0,
                responsesGenerated: orchestrationResult.responsesGenerated || 0,
                challengesSolved: orchestrationResult.challengesSolved || 0,
                captchasSolved: orchestrationResult.captchasSolved || 0,
                attentionChecksPassed: orchestrationResult.attentionChecksPassed || 0,
                behaviorScore: orchestrationResult.behaviorScore || 0,
                detectionEvents: orchestrationResult.detectionEvents || [],
                duration: pollDuration,
                metadata: orchestrationResult
            };
            
        } catch (error) {
            console.error(`❌ Advanced poll processing failed: ${error.message}`);
            
            await this.db.logAction(null, poll.id, 'advanced_poll_failed', error.message, false);
            
            return {
                pollId: poll.id,
                success: false,
                error: error.message,
                errorType: error.constructor.name,
                duration: Date.now() - pollStart
            };
        }
    }

    /**
     * AI-powered site strategy generation
     */
    async generateSiteStrategy(site) {
        const cacheKey = `site_strategy_${site.id}`;
        
        // Check cache first (30-day TTL)
        if (this.siteAnalysisCache.has(cacheKey)) {
            const cached = this.siteAnalysisCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 30 * 24 * 60 * 60 * 1000) {
                console.log('   📋 Using cached site strategy');
                return cached.strategy;
            }
        }
        
        try {
            // Use AI for site analysis
            const strategy = await this.aiService.analyzeSiteStructure({
                url: site.base_url,
                siteType: site.site_type || 'unknown',
                historicalData: await this.db.getSiteAnalytics(site.id),
                model: 'gpt-3.5-turbo' // Cost-effective for site analysis
            });
            
            // Cache the strategy
            this.siteAnalysisCache.set(cacheKey, {
                strategy: strategy,
                timestamp: Date.now()
            });
            
            this.stats.aiCallsTotal++;
            this.stats.aiCostTotal += strategy.cost || 0;
            
            console.log('   🧠 AI site strategy generated');
            return strategy;
            
        } catch (error) {
            console.warn('   ⚠️ AI site analysis failed, using fallback strategy');
            
            // Fallback strategy
            return {
                approach: 'standard',
                complexity: 'medium',
                expectedChallenges: ['basic_forms'],
                recommendedBehavior: 'confident',
                proxyStrategy: 'standard_rotation'
            };
        }
    }

    /**
     * Advanced authentication with behavioral simulation
     */
    async performAdvancedAuthentication(site, strategy) {
        try {
            const credentials = await this.db.getCredentials(site.id);
            if (!credentials) {
                console.log('   ℹ️ No credentials - proceeding without authentication');
                return { success: true, page: this.page };
            }
            
            console.log('   🔐 Performing behavioral authentication...');
            
            // Navigate to login page with human-like behavior
            await this.mouseSimulator.simulateNaturalMouseMovement(
                this.page,
                { x: 100, y: 100 },
                { x: 200, y: 200 },
                strategy.recommendedBehavior || 'confident'
            );
            
            await this.page.goto(site.login_url || site.base_url, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            
            // Human-like login process
            const usernameField = await this.page.$(site.username_selector || '#username');
            const passwordField = await this.page.$(site.password_selector || '#password');
            
            if (usernameField && passwordField) {
                // Simulate human typing patterns
                await this.keystrokeSimulator.simulateHumanTyping(
                    this.page,
                    usernameField,
                    credentials.username,
                    'professional'
                );
                
                await this.page.waitForTimeout(1000 + Math.random() * 2000);
                
                await this.keystrokeSimulator.simulateHumanTyping(
                    this.page,
                    passwordField,
                    credentials.password,
                    'careful'
                );
                
                await this.page.waitForTimeout(500 + Math.random() * 1500);
                
                // Human-like submit
                const submitButton = await this.page.$(site.submit_selector || 'button[type="submit"]');
                if (submitButton) {
                    await this.mouseSimulator.simulateNaturalClick(this.page, submitButton, 'confident');
                    await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
                }
                
                console.log('   ✅ Behavioral authentication completed');
            }
            
            return { success: true, page: this.page };
            
        } catch (error) {
            console.warn(`   ⚠️ Authentication failed: ${error.message}`);
            return { success: false, page: this.page, error: error.message };
        }
    }

    /**
     * AI-assisted poll discovery
     */
    async discoverPollsWithAI(site, page) {
        try {
            // Use AI to find polls on the page
            const pageContent = await page.content();
            const screenshot = await page.screenshot({ quality: 60 });
            
            const pollAnalysis = await this.aiService.discoverPolls({
                html: pageContent,
                url: page.url(),
                screenshot: screenshot,
                siteConfig: site,
                model: 'gpt-3.5-turbo'
            });
            
            this.stats.aiCallsTotal++;
            this.stats.aiCostTotal += pollAnalysis.cost || 0;
            
            return pollAnalysis.polls || [];
            
        } catch (error) {
            console.warn('   ⚠️ AI poll discovery failed, using fallback method');
            
            // Fallback: look for common poll patterns
            const polls = await page.evaluate(() => {
                const pollLinks = [];
                const selectors = [
                    'a[href*="poll"]',
                    'a[href*="survey"]',
                    'a[href*="questionnaire"]',
                    '.poll-link',
                    '.survey-link'
                ];
                
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach((el, index) => {
                        pollLinks.push({
                            id: `poll_${index}`,
                            title: el.textContent?.trim() || 'Unknown Poll',
                            url: el.href
                        });
                    });
                });
                
                return pollLinks;
            });
            
            return polls;
        }
    }

    /**
     * Enhanced session management
     */
    async createEnhancedSession(siteId, options) {
        const sessionData = {
            site_id: siteId,
            session_type: 'enhanced_automation',
            start_time: new Date().toISOString(),
            options: JSON.stringify(options),
            status: 'active',
            enhanced_features: JSON.stringify({
                neural_behavior: true,
                challenge_solving: true,
                ai_orchestration: true,
                proxy_rotation: true,
                multi_tab_coordination: true
            })
        };
        
        const query = `
            INSERT INTO enhanced_sessions (
                site_id, session_type, start_time, options, status, enhanced_features
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        return new Promise((resolve, reject) => {
            this.db.db.run(query, Object.values(sessionData), function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async updateSessionStatus(sessionId, status, metadata = {}) {
        const query = `
            UPDATE enhanced_sessions 
            SET status = ?, end_time = ?, metadata = ?
            WHERE id = ?
        `;
        
        const values = [
            status,
            new Date().toISOString(),
            JSON.stringify(metadata),
            sessionId
        ];
        
        return new Promise((resolve, reject) => {
            this.db.db.run(query, values, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Calculate adaptive delay between polls based on performance
     */
    async calculateAdaptiveDelay(lastPollResult, allResults) {
        let baseDelay = 15000; // 15 seconds base
        
        // Adjust based on success rate
        const successRate = allResults.filter(r => r.success).length / allResults.length;
        if (successRate < 0.7) {
            baseDelay *= 2; // Slow down if failing
        }
        
        // Adjust based on behavior score
        if (lastPollResult.behaviorScore && lastPollResult.behaviorScore < 0.6) {
            baseDelay *= 1.5; // Slow down if behavior looks suspicious
        }
        
        // Add randomization
        const randomization = 0.5 + Math.random(); // 0.5x to 1.5x
        
        return Math.floor(baseDelay * randomization);
    }

    /**
     * Advanced AI service testing
     */
    async testAdvancedAIService() {
        try {
            // Test basic connectivity
            const healthResponse = await axios.get(`${this.llmServiceUrl}/health`, { timeout: 5000 });
            
            // Test advanced capabilities
            const testResponse = await axios.post(`${this.llmServiceUrl}/test-advanced`, {
                test_type: 'enhanced_automation',
                capabilities: ['site_analysis', 'challenge_solving', 'behavior_generation']
            }, { timeout: 10000 });
            
            console.log('   ✅ Advanced AI service verified');
            console.log(`   🧠 Capabilities: ${testResponse.data.capabilities?.join(', ')}`);
            
            return true;
        } catch (error) {
            console.warn('   ⚠️ Advanced AI service not available, using fallback capabilities');
            return false;
        }
    }

    /**
     * Learning data management
     */
    async loadLearningData() {
        try {
            const learningData = await this.db.getLearningData();
            if (learningData) {
                await this.orchestrator.loadLearningData();
                await this.masterCoordinator.loadLearningData();
                console.log('   📚 Learning data loaded from previous sessions');
            }
        } catch (error) {
            console.log('   📝 No previous learning data found');
        }
    }

    async saveLearningData(sessionId, results) {
        try {
            const learningData = {
                sessionId: sessionId,
                results: results,
                behaviorPatterns: await this.masterCoordinator.getBehaviorPatterns(),
                siteAdaptations: await this.orchestrator.getSiteAdaptations(),
                challengeSolutions: await this.challengeSolver.getLearnedSolutions(),
                timestamp: Date.now()
            };
            
            await this.db.saveLearningData(learningData);
            console.log('   💾 Learning data saved for future sessions');
        } catch (error) {
            console.warn('   ⚠️ Failed to save learning data:', error.message);
        }
    }

    /**
     * Enhanced statistics
     */
    getEnhancedStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalPolls > 0 ? 
                Math.round((this.stats.completedPolls / this.stats.totalPolls) * 100) : 0,
            avgQuestionsPerPoll: this.stats.completedPolls > 0 ? 
                Math.round(this.stats.questionsAnswered / this.stats.completedPolls) : 0,
            avgChallengesPerPoll: this.stats.completedPolls > 0 ?
                Math.round(this.stats.challengesSolved / this.stats.completedPolls) : 0,
            costPerPoll: this.stats.completedPolls > 0 ?
                (this.stats.aiCostTotal / this.stats.completedPolls).toFixed(4) : 0,
            detectionAvoidanceRate: this.stats.behaviorScoreAvg,
            systemEfficiency: {
                aiCallsPerPoll: this.stats.totalPolls > 0 ? (this.stats.aiCallsTotal / this.stats.totalPolls).toFixed(1) : 0,
                avgSessionTime: this.stats.totalPolls > 0 ? Math.round(this.stats.totalRuntime / this.stats.totalPolls / 1000) : 0
            }
        };
    }

    /**
     * Generate session recommendations based on results
     */
    async generateSessionRecommendations(results) {
        const recommendations = [];
        
        const successRate = results.filter(r => r.success).length / results.length;
        if (successRate < 0.8) {
            recommendations.push('Consider adjusting behavioral patterns for better success rate');
        }
        
        const avgBehaviorScore = results.reduce((sum, r) => sum + (r.behaviorScore || 0), 0) / results.length;
        if (avgBehaviorScore < 0.7) {
            recommendations.push('Enhance behavioral simulation to avoid detection');
        }
        
        const challengeFailures = results.filter(r => r.challengesSolved === 0 && r.success === false).length;
        if (challengeFailures > 0) {
            recommendations.push('Improve challenge solving capabilities');
        }
        
        if (this.stats.aiCostTotal > 1.00) {
            recommendations.push('Optimize AI usage to reduce costs - consider more caching');
        }
        
        return recommendations;
    }

    /**
     * Enhanced cleanup
     */
    async cleanup() {
        try {
            console.log('🧹 Enhanced cleanup starting...');
            
            if (this.orchestrator) {
                await this.orchestrator.shutdown();
            }
            
            if (this.masterCoordinator) {
                await this.masterCoordinator.cleanup();
            }
            
            if (this.multiTabHandler) {
                await this.multiTabHandler.closeAllExceptMain();
            }
            
            if (this.proxyManager) {
                await this.proxyManager.destroy();
            }
            
            if (this.stealthBrowser) {
                await this.stealthBrowser.close();
            }
            
            await this.db.close();
            
            console.log('✅ Enhanced cleanup completed');
        } catch (error) {
            console.error('❌ Enhanced cleanup error:', error);
        }
    }
}

/**
 * AI Batch Processor for cost optimization
 */
class AIBatchProcessor {
    constructor() {
        this.batchQueue = [];
        this.batchSize = 10;
        this.batchTimeout = 5000; // 5 seconds
        this.processing = false;
    }
    
    async addToBatch(request) {
        this.batchQueue.push(request);
        
        if (this.batchQueue.length >= this.batchSize || !this.processing) {
            return await this.processBatch();
        }
        
        return new Promise((resolve) => {
            request.resolve = resolve;
        });
    }
    
    async processBatch() {
        if (this.processing || this.batchQueue.length === 0) return;
        
        this.processing = true;
        const batch = this.batchQueue.splice(0, this.batchSize);
        
        try {
            // Process batch requests together
            const batchResult = await this.executeBatchRequest(batch);
            
            // Resolve individual requests
            batch.forEach((request, index) => {
                if (request.resolve) {
                    request.resolve(batchResult[index]);
                }
            });
            
        } catch (error) {
            batch.forEach(request => {
                if (request.resolve) {
                    request.resolve({ error: error.message });
                }
            });
        } finally {
            this.processing = false;
        }
    }
    
    async executeBatchRequest(batch) {
        // Implementation for batch AI processing
        return batch.map(() => ({ success: true }));
    }
}

module.exports = EnhancedPollAutomationService;