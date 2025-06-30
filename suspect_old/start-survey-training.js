/**
 * Survey Training System
 * Automated training for survey site registration and survey filling
 */

const UnifiedPollOrchestrator = require('./src/core/unified-poll-orchestrator');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const FixedRegistrationLogger = require('./src/database/fixed-registration-logger');
const StealthBrowser = require('./src/browser/stealth');
const AIService = require('./src/ai/ai-service');

class SurveyTrainingSystem {
    constructor() {
        this.orchestrator = null;
        this.emailManager = new EmailAccountManager();
        this.logger = new RegistrationLogger();
        this.fixedLogger = new FixedRegistrationLogger();
        this.browser = new StealthBrowser();
        this.aiService = new AIService();
        
        this.trainingStats = {
            sitesProcessed: 0,
            registrationsAttempted: 0,
            registrationsSuccessful: 0,
            surveysCompleted: 0,
            errorsEncountered: 0,
            learningInsights: []
        };
        
        // Training target sites - EXPANDED WITH 6 NEW SITES
        this.trainingSites = [
            {
                name: 'SurveyPlanet',
                baseUrl: 'https://surveyplanet.com',
                registrationUrl: 'https://surveyplanet.com/auth/register',
                sampleSurveys: [
                    'https://surveyplanet.com/examples/customer-satisfaction',
                    'https://surveyplanet.com/examples/market-research'
                ],
                difficulty: 'medium',
                priority: 'high'
            },
            {
                name: 'TypeForm',
                baseUrl: 'https://typeform.com',
                registrationUrl: 'https://typeform.com/signup',
                sampleSurveys: [
                    'https://form.typeform.com/to/lS4nJ5',
                    'https://admin.typeform.com/templates'
                ],
                difficulty: 'medium', 
                priority: 'medium'
            },
            {
                name: 'Google Forms',
                baseUrl: 'https://forms.google.com',
                registrationUrl: 'https://accounts.google.com/signup',
                sampleSurveys: [
                    'https://docs.google.com/forms/d/e/1FAIpQLSf_example',
                    'https://forms.google.com/create'
                ],
                difficulty: 'high',
                priority: 'medium'
            },
            {
                name: 'Survey Monkey',
                baseUrl: 'https://surveymonkey.com',
                registrationUrl: 'https://surveymonkey.com/user/sign-up',
                sampleSurveys: [
                    'https://surveymonkey.com/r/example1',
                    'https://surveymonkey.com/r/example2'
                ],
                difficulty: 'high',
                priority: 'medium'
            },
            // NEW SURVEY SITES ADDED
            {
                name: 'Qualtrics',
                baseUrl: 'https://qualtrics.com',
                registrationUrl: 'https://www.qualtrics.com/free-account',
                sampleSurveys: [
                    'https://example.qualtrics.com/jfe/form/SV_example1',
                    'https://example.qualtrics.com/jfe/form/SV_example2'
                ],
                difficulty: 'high',
                priority: 'high'
            },
            {
                name: 'JotForm',
                baseUrl: 'https://jotform.com',
                registrationUrl: 'https://www.jotform.com/signup',
                sampleSurveys: [
                    'https://form.jotform.com/example1',
                    'https://form.jotform.com/example2'
                ],
                difficulty: 'medium',
                priority: 'high'
            },
            {
                name: 'Formstack',
                baseUrl: 'https://formstack.com',
                registrationUrl: 'https://www.formstack.com/signup',
                sampleSurveys: [
                    'https://example.formstack.com/forms/example1',
                    'https://example.formstack.com/forms/example2'
                ],
                difficulty: 'medium',
                priority: 'high'
            },
            {
                name: 'SurveyGizmo',
                baseUrl: 'https://surveygizmo.com',
                registrationUrl: 'https://app.alchemer.com/signup',
                sampleSurveys: [
                    'https://survey.alchemer.com/s3/example1',
                    'https://survey.alchemer.com/s3/example2'
                ],
                difficulty: 'medium',
                priority: 'high'
            },
            {
                name: 'Wufoo',
                baseUrl: 'https://wufoo.com',
                registrationUrl: 'https://www.wufoo.com/signup',
                sampleSurveys: [
                    'https://example.wufoo.com/forms/example1',
                    'https://example.wufoo.com/forms/example2'
                ],
                difficulty: 'medium',
                priority: 'high'
            },
            {
                name: 'Zoho Survey',
                baseUrl: 'https://survey.zoho.com',
                registrationUrl: 'https://www.zoho.com/survey/signup.html',
                sampleSurveys: [
                    'https://survey.zoho.com/zs/example1',
                    'https://survey.zoho.com/zs/example2'
                ],
                difficulty: 'medium',
                priority: 'high'
            }
        ];
    }

    async initialize() {
        console.log('🚀 SURVEY TRAINING SYSTEM');
        console.log('=========================');
        console.log('🎯 Initializing automated survey site training...');
        
        // Initialize components
        await this.logger.initialize();
        await this.fixedLogger.initialize();
        await this.emailManager.initialize();
        
        // Initialize browser with stealth mode and rotation enabled
        await this.browser.launch();
        
        // Log initial rotation stats
        const rotationStats = this.browser.getBrowserStats().rotationStats;
        if (rotationStats) {
            console.log('🔄 Rotation system initialized with intelligent user-agent, viewport, and timing rotation');
        }
        
        // Initialize unified orchestrator (will be created per page as needed)
        this.orchestrator = null;
        
        console.log('✅ Training system initialized');
        console.log(`📋 Training targets: ${this.trainingSites.length} sites`);
        console.log('🎓 Ready to begin automated training...');
        
        return this;
    }

    async startTraining() {
        console.log('\n🎓 BEGINNING AUTOMATED TRAINING');
        console.log('===============================');
        
        // Start with highest priority sites
        const sortedSites = this.trainingSites.sort((a, b) => {
            const priorityMap = { high: 3, medium: 2, low: 1 };
            return priorityMap[b.priority] - priorityMap[a.priority];
        });
        
        for (const site of sortedSites) {
            try {
                console.log(`\n🎯 Training on: ${site.name}`);
                console.log(`🌐 URL: ${site.baseUrl}`);
                console.log(`📊 Difficulty: ${site.difficulty.toUpperCase()}`);
                
                await this.trainOnSite(site);
                this.trainingStats.sitesProcessed++;
                
                // Brief pause between sites
                console.log('⏱️ Cooling down between sites...');
                await this.sleep(3000);
                
            } catch (error) {
                console.error(`❌ Training failed for ${site.name}:`, error.message);
                this.trainingStats.errorsEncountered++;
                
                // Log the failure for learning
                await this.logTrainingFailure(site, error);
                
                // Short pause before next site even on error
                await this.sleep(2000);
            }
        }
        
        await this.generateTrainingReport();
    }

    async trainOnSite(site) {
        console.log(`\n📚 Training Phase 1: Site Analysis for ${site.name}`);
        
        // Phase 1: Site reconnaissance and analysis
        const siteAnalysis = await this.analyzeSite(site);
        
        console.log(`📚 Training Phase 2: Registration Training`);
        
        // Phase 2: Registration training
        const registrationResult = await this.trainRegistration(site, siteAnalysis);
        
        if (registrationResult.success) {
            console.log(`📚 Training Phase 3: Survey Filling Training`);
            
            // Phase 3: Survey filling training
            await this.trainSurveyFilling(site, registrationResult);
        }
        
        // Phase 4: Learning consolidation
        await this.consolidateLearning(site, siteAnalysis, registrationResult);
    }

    async analyzeSite(site) {
        console.log(`🔍 Analyzing site structure and defenses...`);
        
        let page = null;
        let pageObj = null;
        
        try {
            page = await this.browser.newPage('analysis');
            pageObj = page.page;
            
            // Navigate to main site
            await pageObj.goto(site.baseUrl, { 
                waitUntil: 'networkidle0',
                timeout: 60000 
            });
            
            // Analyze page structure
            const analysis = await pageObj.evaluate(() => {
                return {
                    title: document.title,
                    formCount: document.querySelectorAll('form').length,
                    inputCount: document.querySelectorAll('input').length,
                    hasCloudflare: !!document.querySelector('[data-cf-beacon]'),
                    hasRecaptcha: !!document.querySelector('[data-sitekey]'),
                    frameworkDetected: !!window.React || !!window.Vue || !!window.Angular,
                    bodyClasses: document.body.className,
                    metaTags: Array.from(document.querySelectorAll('meta')).map(m => ({
                        name: m.getAttribute('name'),
                        content: m.getAttribute('content')
                    }))
                };
            });
            
            console.log(`   📋 Page title: ${analysis.title}`);
            console.log(`   📊 Forms detected: ${analysis.formCount}`);
            console.log(`   🔒 Security: ${analysis.hasCloudflare ? 'Cloudflare' : 'None'} ${analysis.hasRecaptcha ? '+ reCAPTCHA' : ''}`);
            
            // Check registration page
            let registrationAnalysis = null;
            if (site.registrationUrl) {
                try {
                    // Use shorter timeout for known problematic sites
                    const timeout = site.name === 'TypeForm' ? 20000 : 60000;
                    await pageObj.goto(site.registrationUrl, { 
                        waitUntil: 'domcontentloaded',  // Less strict wait condition
                        timeout: timeout 
                    });
                    
                    registrationAnalysis = await pageObj.evaluate(() => {
                        const forms = Array.from(document.querySelectorAll('form'));
                        const inputs = Array.from(document.querySelectorAll('input'));
                        
                        return {
                            formCount: forms.length,
                            inputTypes: inputs.map(input => ({
                                type: input.type,
                                name: input.name,
                                placeholder: input.placeholder,
                                required: input.required
                            })),
                            submitButtons: Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]')).length,
                            socialLogins: document.querySelectorAll('[class*="social"], [class*="google"], [class*="facebook"]').length
                        };
                    });
                    
                    console.log(`   📝 Registration form inputs: ${registrationAnalysis.inputTypes.length}`);
                } catch (error) {
                    console.log(`   ⚠️ Registration page analysis failed: ${error.message}`);
                }
            }
            
            // Store analysis in database
            await this.logger.logSystemEvent({
                eventType: 'site_analysis_completed',
                message: `Analysis completed for ${site.name}`,
                eventData: { site, analysis, registrationAnalysis },
                severity: 'info'
            });
            
            return { site, analysis, registrationAnalysis };
            
        } catch (error) {
            console.log(`⚠️ Site analysis error: ${error.message}`);
            throw error;
        } finally {
            if (pageObj && !pageObj.isClosed()) {
                try {
                    await pageObj.close();
                } catch (e) {
                    console.log(`⚠️ Error closing analysis page: ${e.message}`);
                }
            }
        }
    }

    async trainRegistration(site, siteAnalysis) {
        console.log(`🎓 Training registration automation for ${site.name}...`);
        
        this.trainingStats.registrationsAttempted++;
        
        let page = null;
        let pageObj = null;
        
        try {
            // Get or create email account for this training
            const existingAccounts = this.emailManager.listAccounts();
            let emailAccount = null;
            
            if (existingAccounts.length > 0) {
                emailAccount = existingAccounts[0];
            } else {
                // Use rotation for email service selection
                emailAccount = await this.emailManager.createEmailAccount('auto', {
                    rotationManager: this.browser.rotationManager
                });
                if (!emailAccount || !emailAccount.success) {
                    throw new Error('Failed to create email account for training');
                }
                
                // Report success to rotation manager
                this.browser.reportEmailServiceResult(emailAccount.service || 'Unknown', true);
            }
            
            console.log(`📧 Using email: ${emailAccount.email}`);
            
            // Create new page for registration
            page = await this.browser.newPage('registration');
            pageObj = page.page;
            
            // Navigate to registration page
            await pageObj.goto(site.registrationUrl, { 
                waitUntil: 'networkidle0',
                timeout: 60000 
            });
                
                // Create orchestrator for this specific page
                const orchestrator = new UnifiedPollOrchestrator(pageObj, {
                    enableAdvancedAnalysis: true,
                    enableLearning: true,
                    enableBehavioralMimicry: true,
                    debugMode: true
                });
                
                // Initialize orchestrator with minimal dependencies
                await orchestrator.initialize({});
                
                // Use AI to analyze and fill registration form
                const registrationResult = await orchestrator.attemptRegistration(pageObj, {
                    targetSite: site.baseUrl,
                    email: emailAccount.email,
                    userProfile: await this.generateUserProfile(),
                    enableLearning: true,
                    enableDetailedLogging: true
                });
                
                if (registrationResult.success) {
                    console.log(`✅ Registration training successful!`);
                    this.trainingStats.registrationsSuccessful++;
                    
                    // Log successful registration with ML features using FIXED logger
                    await this.fixedLogger.logRegistrationAttemptML({
                        siteUrl: site.baseUrl,
                        siteName: site.name,
                        success: true,
                        stepsCompleted: registrationResult.stepsCompleted || 1,
                        timeSpent: registrationResult.duration || 0,
                        
                        // ML Features
                        difficulty: site.difficulty,
                        formStructure: registrationResult.formAnalysis,
                        formFieldCount: registrationResult.formAnalysis?.inputFields?.length || 0,
                        hasHoneypots: registrationResult.formAnalysis?.hasHoneypots || false,
                        hasCaptcha: siteAnalysis.analysis?.hasRecaptcha || false,
                        hasCloudflare: siteAnalysis.analysis?.hasCloudflare || false,
                        pageLoadTime: registrationResult.duration || 0,
                        
                        // Rotation data
                        userAgentUsed: this.browser.rotationManager?.lastUsed?.userAgent?.substring(0, 100),
                        viewportUsed: this.browser.rotationManager?.lastUsed?.viewport,
                        timingPattern: this.browser.rotationManager?.lastUsed?.timingPattern?.name,
                        emailServiceUsed: emailAccount.service || 'Unknown'
                    });
                    
                } else {
                    console.log(`❌ Registration training failed: ${registrationResult.error}`);
                    
                    // Log failed registration for learning with ML features using FIXED logger
                    await this.fixedLogger.logRegistrationAttemptML({
                        siteUrl: site.baseUrl,
                        siteName: site.name,
                        success: false,
                        failureReason: registrationResult.error,
                        stepsCompleted: registrationResult.stepsCompleted || 0,
                        timeSpent: registrationResult.duration || 0,
                        
                        // ML Features for failure analysis
                        difficulty: site.difficulty,
                        formStructure: registrationResult.formAnalysis,
                        formFieldCount: registrationResult.formAnalysis?.inputFields?.length || 0,
                        hasHoneypots: registrationResult.formAnalysis?.hasHoneypots || false,
                        hasCaptcha: siteAnalysis.analysis?.hasRecaptcha || false,
                        hasCloudflare: siteAnalysis.analysis?.hasCloudflare || false,
                        
                        // Rotation data at failure
                        userAgentUsed: this.browser.rotationManager?.lastUsed?.userAgent?.substring(0, 100),
                        viewportUsed: this.browser.rotationManager?.lastUsed?.viewport,
                        timingPattern: this.browser.rotationManager?.lastUsed?.timingPattern?.name,
                        emailServiceUsed: emailAccount.service || 'Unknown'
                    });
                }
                
            return registrationResult;
            
        } catch (error) {
            console.error(`❌ Registration training error: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            if (pageObj && !pageObj.isClosed()) {
                try {
                    await pageObj.close();
                } catch (e) {
                    console.log(`⚠️ Error closing registration page: ${e.message}`);
                }
            }
        }
    }

    async trainSurveyFilling(site, registrationResult) {
        console.log(`📝 Training survey filling for ${site.name}...`);
        
        if (!site.sampleSurveys || site.sampleSurveys.length === 0) {
            console.log(`⚠️ No sample surveys available for ${site.name}`);
            return;
        }
        
        for (const surveyUrl of site.sampleSurveys) {
            let page = null;
            let pageObj = null;
            
            try {
                console.log(`📋 Training on survey: ${surveyUrl}`);
                
                page = await this.browser.newPage('survey');
                pageObj = page.page;
                
                await pageObj.goto(surveyUrl, { 
                    waitUntil: 'networkidle0',
                    timeout: 60000 
                });
                    
                    // Create orchestrator for this survey page
                    const orchestrator = new UnifiedPollOrchestrator(pageObj, {
                        enableAdvancedAnalysis: true,
                        enableLearning: true,
                        enableBehavioralMimicry: true,
                        debugMode: true
                    });
                    
                    // Initialize orchestrator
                    await orchestrator.initialize({});
                    
                    // Use orchestrator to attempt survey completion
                    const surveyResult = await orchestrator.completeSurvey(pageObj, {
                        targetSite: site.baseUrl,
                        surveyUrl: surveyUrl,
                        enableLearning: true,
                        enableDetailedLogging: true
                    });
                    
                    if (surveyResult.success) {
                        console.log(`✅ Survey training completed successfully`);
                        this.trainingStats.surveysCompleted++;
                        
                        // Log successful survey completion with ML features using FIXED logger
                        await this.fixedLogger.logSurveyCompletionML({
                            siteUrl: site.baseUrl,
                            siteName: site.name,
                            surveyUrl: surveyUrl,
                            success: true,
                            questionsAnswered: surveyResult.questionsAnswered || 0,
                            totalQuestions: surveyResult.surveyAnalysis?.questionCount || 0,
                            timeSpent: surveyResult.duration || 0,
                            completionRate: surveyResult.questionsAnswered / (surveyResult.surveyAnalysis?.questionCount || 1),
                            
                            // ML Features
                            questionTypes: surveyResult.surveyAnalysis?.questionTypes || [],
                            difficultyLevel: site.difficulty,
                            surveyLength: surveyResult.surveyAnalysis?.inputCount || 0,
                            hasLogicBranching: surveyResult.surveyAnalysis?.hasLogicBranching || false,
                            hasValidation: surveyResult.surveyAnalysis?.hasValidation || false,
                            hasProgressBar: surveyResult.surveyAnalysis?.hasProgressBar || false,
                            
                            // Technical details
                            userAgentUsed: this.browser.rotationManager?.lastUsed?.userAgent?.substring(0, 100),
                            viewportUsed: this.browser.rotationManager?.lastUsed?.viewport,
                            rotationPattern: this.browser.rotationManager?.lastUsed?.timingPattern?.name
                        });
                    } else {
                        console.log(`❌ Survey training failed: ${surveyResult.error}`);
                        
                        // Log failed survey completion for learning using FIXED logger
                        await this.fixedLogger.logSurveyCompletionML({
                            siteUrl: site.baseUrl,
                            siteName: site.name,
                            surveyUrl: surveyUrl,
                            success: false,
                            questionsAnswered: surveyResult.questionsAnswered || 0,
                            totalQuestions: surveyResult.surveyAnalysis?.questionCount || 0,
                            timeSpent: surveyResult.duration || 0,
                            completionRate: 0,
                            
                            // Failure analysis
                            failureReason: surveyResult.error,
                            errorStep: surveyResult.errorStep,
                            lastQuestionType: surveyResult.lastQuestionType,
                            difficultyLevel: site.difficulty,
                            
                            // Technical context
                            userAgentUsed: this.browser.rotationManager?.lastUsed?.userAgent?.substring(0, 100),
                            viewportUsed: this.browser.rotationManager?.lastUsed?.viewport,
                            rotationPattern: this.browser.rotationManager?.lastUsed?.timingPattern?.name
                        });
                    }
                    
            } catch (error) {
                console.error(`❌ Survey training error: ${error.message}`);
            } finally {
                if (pageObj && !pageObj.isClosed()) {
                    try {
                        await pageObj.close();
                    } catch (e) {
                        console.log(`⚠️ Error closing survey page: ${e.message}`);
                    }
                }
            }
        }
    }

    async consolidateLearning(site, siteAnalysis, registrationResult) {
        console.log(`🧠 Consolidating learning insights for ${site.name}...`);
        
        const insights = {
            siteName: site.name,
            registrationSuccess: registrationResult.success,
            learningPoints: [],
            improvementAreas: [],
            successFactors: []
        };
        
        // Analyze what worked and what didn't
        if (registrationResult.success) {
            insights.successFactors.push('Registration automation successful');
            insights.learningPoints.push('Site patterns recognized correctly');
        } else {
            insights.improvementAreas.push(registrationResult.error);
            insights.learningPoints.push('Need better error handling');
        }
        
        // Store learning insights
        await this.logger.logSystemEvent({
            eventType: 'training_insights_generated',
            message: `Learning consolidated for ${site.name}`,
            eventData: insights,
            severity: 'info'
        });
        
        this.trainingStats.learningInsights.push(insights);
    }

    async logTrainingFailure(site, error) {
        await this.logger.logSystemEvent({
            eventType: 'training_failure',
            message: `Training failed for ${site.name}: ${error.message}`,
            eventData: { site, error: error.message, stack: error.stack },
            severity: 'error'
        });
    }

    async generateUserProfile() {
        // Generate realistic user profile for training
        const profiles = [
            {
                firstName: 'John',
                lastName: 'Smith',
                age: 28,
                gender: 'male',
                country: 'United States',
                occupation: 'Software Developer'
            },
            {
                firstName: 'Sarah',
                lastName: 'Johnson',
                age: 32,
                gender: 'female',
                country: 'Canada',
                occupation: 'Marketing Manager'
            },
            {
                firstName: 'Michael',
                lastName: 'Brown',
                age: 25,
                gender: 'male',
                country: 'Australia',
                occupation: 'Student'
            }
        ];
        
        return profiles[Math.floor(Math.random() * profiles.length)];
    }

    async generateTrainingReport() {
        console.log('\n📊 TRAINING RESULTS REPORT');
        console.log('==========================');
        
        const stats = this.trainingStats;
        console.log(`🎯 Sites Processed: ${stats.sitesProcessed}`);
        console.log(`📝 Registration Attempts: ${stats.registrationsAttempted}`);
        console.log(`✅ Successful Registrations: ${stats.registrationsSuccessful}`);
        console.log(`📋 Surveys Completed: ${stats.surveysCompleted}`);
        console.log(`❌ Errors Encountered: ${stats.errorsEncountered}`);
        
        const successRate = stats.registrationsAttempted > 0 ? 
            (stats.registrationsSuccessful / stats.registrationsAttempted * 100).toFixed(1) : 0;
        console.log(`📊 Registration Success Rate: ${successRate}%`);
        
        console.log('\n🧠 Learning Insights:');
        stats.learningInsights.forEach((insight, index) => {
            console.log(`   ${index + 1}. ${insight.siteName}: ${insight.learningPoints.join(', ')}`);
        });
        
        // Save detailed report
        const reportData = {
            trainingDate: new Date().toISOString(),
            statistics: stats,
            trainingSites: this.trainingSites,
            recommendations: this.generateRecommendations(stats)
        };
        
        const fs = require('fs');
        fs.writeFileSync('./survey-training-report.json', JSON.stringify(reportData, null, 2));
        
        console.log('\n📤 Detailed report saved: survey-training-report.json');
        console.log('🎓 Training session complete!');
    }

    generateRecommendations(stats) {
        const recommendations = [];
        
        if (stats.registrationsSuccessful === 0) {
            recommendations.push('Focus on improving form detection and filling algorithms');
            recommendations.push('Enhance anti-detection capabilities');
        }
        
        if (stats.errorsEncountered > stats.sitesProcessed * 0.5) {
            recommendations.push('Improve error handling and retry mechanisms');
        }
        
        if (stats.surveysCompleted === 0) {
            recommendations.push('Develop better survey question understanding');
            recommendations.push('Improve answer generation logic');
        }
        
        return recommendations;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        console.log('🧹 Cleaning up training system...');
        
        try {
            // Close email manager first (it has its own browser)
            if (this.emailManager) {
                await this.emailManager.cleanup();
            }
        } catch (error) {
            console.log(`⚠️ Email manager cleanup error: ${error.message}`);
        }
        
        try {
            // Close training browser
            if (this.browser) {
                await this.browser.close();
            }
        } catch (error) {
            console.log(`⚠️ Browser cleanup error: ${error.message}`);
        }
        
        try {
            // Close database loggers
            if (this.logger) {
                await this.logger.close();
            }
            if (this.fixedLogger) {
                await this.fixedLogger.close();
            }
        } catch (error) {
            console.log(`⚠️ Logger cleanup error: ${error.message}`);
        }
        
        console.log('✅ Training system cleanup complete');
    }
}

async function main() {
    const trainingSystem = new SurveyTrainingSystem();
    
    try {
        await trainingSystem.initialize();
        await trainingSystem.startTraining();
        
    } catch (error) {
        console.error('❌ Training system failed:', error);
    } finally {
        await trainingSystem.cleanup();
    }
}

if (require.main === module) {
    main();
}

module.exports = SurveyTrainingSystem;