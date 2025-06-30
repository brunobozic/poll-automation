/**
 * Training Workflow Service
 * Orchestrates the survey training workflow - replaces start-survey-training.js
 */

const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const WorkflowManager = require('./workflow-manager');
const EmailService = require('../email/email-service');
const AutomationService = require('../automation/automation-service');
const AnalyticsService = require('../analytics/analytics-service');
const FixedRegistrationLogger = require('../../data/fixed-registration-logger');

class TrainingWorkflowService {
    constructor() {
        this.logger = new FixedRegistrationLogger();
        this.activeWorkflows = new Map();
    }

    async initialize() {
        await this.logger.initialize();
    }

    /**
     * Start comprehensive training workflow
     * Replaces the scattered training scripts with organized workflow
     */
    async startTrainingWorkflow(params) {
        const {
            sites,
            config,
            userId,
            sessionId
        } = params;

        const workflowId = uuidv4();
        
        console.log(`🎯 Starting Training Workflow ${workflowId}`);
        console.log(`   Sites: ${sites.length}`);
        console.log(`   Registrations per site: ${config.registrationsPerSite}`);
        console.log(`   Surveys per registration: ${config.surveysPerRegistration}`);

        // Create workflow record
        const workflow = await WorkflowManager.createWorkflow({
            id: workflowId,
            type: 'training',
            status: 'pending',
            config: {
                sites,
                ...config
            },
            userId,
            sessionId,
            estimatedSteps: sites.length * config.registrationsPerSite * (1 + config.surveysPerRegistration),
            createdAt: new Date().toISOString()
        });

        // Start execution asynchronously
        this.executeTrainingWorkflow(workflowId, sites, config)
            .catch(error => {
                console.error(`❌ Training workflow ${workflowId} failed:`, error);
                WorkflowManager.updateWorkflowStatus(workflowId, 'failed', { error: error.message });
            });

        return workflowId;
    }

    /**
     * Execute the training workflow
     */
    async executeTrainingWorkflow(workflowId, sites, config) {
        try {
            await WorkflowManager.updateWorkflowStatus(workflowId, 'running');
            
            const results = {
                sitesProcessed: 0,
                registrationsAttempted: 0,
                registrationsSuccessful: 0,
                surveysCompleted: 0,
                errorsEncountered: 0,
                mlDataCaptured: 0,
                siteResults: {},
                startTime: new Date().toISOString()
            };

            console.log(`🚀 Executing training workflow ${workflowId}...`);

            // Process each site
            for (const site of sites) {
                try {
                    console.log(`\\n🎯 Training on site: ${site}`);
                    
                    const siteResult = await this.trainOnSite(workflowId, site, config);
                    
                    results.sitesProcessed++;
                    results.registrationsAttempted += siteResult.registrationsAttempted;
                    results.registrationsSuccessful += siteResult.registrationsSuccessful;
                    results.surveysCompleted += siteResult.surveysCompleted;
                    results.errorsEncountered += siteResult.errorsEncountered;
                    results.mlDataCaptured += siteResult.mlDataCaptured;
                    results.siteResults[site] = siteResult;

                    // Update workflow progress
                    const progress = (results.sitesProcessed / sites.length) * 100;
                    await WorkflowManager.updateWorkflowProgress(workflowId, progress, {
                        currentSite: site,
                        sitesCompleted: results.sitesProcessed,
                        totalSites: sites.length
                    });

                    // Brief pause between sites
                    await this.sleep(2000);

                } catch (siteError) {
                    console.error(`❌ Site training failed for ${site}:`, siteError);
                    results.errorsEncountered++;
                    results.siteResults[site] = {
                        error: siteError.message,
                        registrationsAttempted: 0,
                        registrationsSuccessful: 0,
                        surveysCompleted: 0,
                        mlDataCaptured: 0
                    };
                }
            }

            // Generate final results
            results.endTime = new Date().toISOString();
            results.duration = Date.now() - new Date(results.startTime).getTime();
            results.successRate = results.registrationsAttempted > 0 ? 
                (results.registrationsSuccessful / results.registrationsAttempted * 100).toFixed(1) : 0;

            console.log(`\\n📊 Training Workflow ${workflowId} Complete!`);
            console.log(`   Sites processed: ${results.sitesProcessed}/${sites.length}`);
            console.log(`   Registrations: ${results.registrationsSuccessful}/${results.registrationsAttempted} (${results.successRate}%)`);
            console.log(`   Surveys completed: ${results.surveysCompleted}`);
            console.log(`   ML data points: ${results.mlDataCaptured}`);

            // Store comprehensive results
            await WorkflowManager.completeWorkflow(workflowId, results);

            // Generate analytics
            await AnalyticsService.generateTrainingReport(workflowId, results);

            return results;

        } catch (error) {
            console.error(`❌ Training workflow ${workflowId} execution failed:`, error);
            await WorkflowManager.updateWorkflowStatus(workflowId, 'failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Train on a specific site
     */
    async trainOnSite(workflowId, site, config) {
        const siteResult = {
            registrationsAttempted: 0,
            registrationsSuccessful: 0,
            surveysCompleted: 0,
            errorsEncountered: 0,
            mlDataCaptured: 0,
            registrations: []
        };

        // Determine site configuration
        const siteConfig = this.getSiteConfiguration(site);
        
        // Perform multiple registrations per site
        for (let i = 0; i < config.registrationsPerSite; i++) {
            try {
                console.log(`   📝 Registration ${i + 1}/${config.registrationsPerSite} for ${site}`);
                
                siteResult.registrationsAttempted++;

                // Get or create email account
                const emailAccount = await EmailService.getOrCreateEmailAccount();
                
                // Perform registration
                const registrationResult = await AutomationService.performRegistration({
                    site: siteConfig,
                    email: emailAccount,
                    workflowId,
                    enableMLLogging: config.enableMLLogging,
                    stealthLevel: config.stealthLevel
                });

                if (registrationResult.success) {
                    siteResult.registrationsSuccessful++;
                    console.log(`   ✅ Registration successful on ${site}`);

                    // Log registration with ML data
                    if (config.enableMLLogging) {
                        await this.logRegistrationML(site, registrationResult, emailAccount);
                        siteResult.mlDataCaptured++;
                    }

                    // Attempt surveys if registration successful
                    if (config.surveysPerRegistration > 0) {
                        const surveyResults = await this.performSurveys(
                            workflowId, 
                            site, 
                            registrationResult, 
                            config.surveysPerRegistration
                        );
                        siteResult.surveysCompleted += surveyResults.completed;
                        siteResult.mlDataCaptured += surveyResults.mlDataCaptured;
                    }

                    siteResult.registrations.push({
                        email: emailAccount.email,
                        success: true,
                        surveysCompleted: config.surveysPerRegistration,
                        registrationTime: registrationResult.duration
                    });

                } else {
                    console.log(`   ❌ Registration failed on ${site}: ${registrationResult.error}`);
                    
                    // Log failed registration for learning
                    if (config.enableMLLogging) {
                        await this.logRegistrationML(site, registrationResult, emailAccount);
                        siteResult.mlDataCaptured++;
                    }

                    siteResult.registrations.push({
                        email: emailAccount.email,
                        success: false,
                        error: registrationResult.error,
                        failureReason: registrationResult.failureReason
                    });
                }

            } catch (registrationError) {
                console.error(`   ❌ Registration error: ${registrationError.message}`);
                siteResult.errorsEncountered++;
            }

            // Brief pause between registrations
            await this.sleep(1000);
        }

        return siteResult;
    }

    /**
     * Perform surveys after successful registration
     */
    async performSurveys(workflowId, site, registrationResult, surveyCount) {
        const results = {
            attempted: 0,
            completed: 0,
            mlDataCaptured: 0
        };

        try {
            // Discovery surveys on the site
            const availableSurveys = await AutomationService.discoverSurveys(site, registrationResult);
            
            const surveysToComplete = Math.min(surveyCount, availableSurveys.length);
            
            for (let i = 0; i < surveysToComplete; i++) {
                try {
                    results.attempted++;
                    
                    const survey = availableSurveys[i];
                    console.log(`      📋 Completing survey ${i + 1}: ${survey.title || survey.url}`);

                    const surveyResult = await AutomationService.completeSurvey({
                        survey,
                        workflowId,
                        enableMLLogging: true
                    });

                    if (surveyResult.success) {
                        results.completed++;
                        console.log(`      ✅ Survey completed successfully`);

                        // Log survey completion with ML data
                        await this.logSurveyCompletionML(site, survey, surveyResult);
                        results.mlDataCaptured++;
                    } else {
                        console.log(`      ❌ Survey completion failed: ${surveyResult.error}`);
                    }

                } catch (surveyError) {
                    console.error(`      ❌ Survey error: ${surveyError.message}`);
                }
            }

        } catch (discoveryError) {
            console.error(`   ⚠️ Survey discovery failed: ${discoveryError.message}`);
        }

        return results;
    }

    /**
     * Log registration with ML features
     */
    async logRegistrationML(site, registrationResult, emailAccount) {
        await this.logger.logRegistrationAttemptML({
            siteUrl: site,
            siteName: this.getSiteName(site),
            success: registrationResult.success,
            stepsCompleted: registrationResult.stepsCompleted || 0,
            timeSpent: registrationResult.duration || 0,
            failureReason: registrationResult.error,
            
            // ML Features
            difficulty: this.getSiteDifficulty(site),
            formStructure: registrationResult.formAnalysis,
            formFieldCount: registrationResult.formAnalysis?.fieldCount || 0,
            hasHoneypots: registrationResult.formAnalysis?.hasHoneypots || false,
            hasCaptcha: registrationResult.formAnalysis?.hasCaptcha || false,
            hasCloudflare: registrationResult.formAnalysis?.hasCloudflare || false,
            pageLoadTime: registrationResult.pageLoadTime || 0,
            
            // Technical details
            userAgentUsed: registrationResult.userAgent,
            viewportUsed: registrationResult.viewport,
            emailServiceUsed: emailAccount.service
        });
    }

    /**
     * Log survey completion with ML features
     */
    async logSurveyCompletionML(site, survey, surveyResult) {
        await this.logger.logSurveyCompletionML({
            siteUrl: site,
            siteName: this.getSiteName(site),
            surveyUrl: survey.url,
            success: surveyResult.success,
            questionsAnswered: surveyResult.questionsAnswered || 0,
            totalQuestions: surveyResult.totalQuestions || 0,
            timeSpent: surveyResult.duration || 0,
            completionRate: surveyResult.completionRate || 0,
            
            // ML Features
            questionTypes: surveyResult.questionTypes || [],
            difficultyLevel: this.getSiteDifficulty(site),
            surveyLength: surveyResult.totalQuestions || 0,
            hasLogicBranching: surveyResult.hasLogicBranching || false,
            hasValidation: surveyResult.hasValidation || false,
            hasProgressBar: surveyResult.hasProgressBar || false,
            
            // Technical details
            userAgentUsed: surveyResult.userAgent,
            viewportUsed: surveyResult.viewport
        });
    }

    /**
     * Get site configuration
     */
    getSiteConfiguration(site) {
        const siteConfigs = {
            'qualtrics': {
                name: 'Qualtrics',
                baseUrl: 'https://qualtrics.com',
                registrationUrl: 'https://www.qualtrics.com/free-account',
                difficulty: 'high',
                priority: 'high'
            },
            'jotform': {
                name: 'JotForm',
                baseUrl: 'https://jotform.com',
                registrationUrl: 'https://www.jotform.com/signup',
                difficulty: 'medium',
                priority: 'high'
            },
            'surveyplanet': {
                name: 'SurveyPlanet',
                baseUrl: 'https://surveyplanet.com',
                registrationUrl: 'https://surveyplanet.com/auth/register',
                difficulty: 'medium',
                priority: 'high'
            },
            'typeform': {
                name: 'TypeForm',
                baseUrl: 'https://typeform.com',
                registrationUrl: 'https://typeform.com/signup',
                difficulty: 'medium',
                priority: 'medium'
            },
            'surveymonkey': {
                name: 'SurveyMonkey',
                baseUrl: 'https://surveymonkey.com',
                registrationUrl: 'https://surveymonkey.com/user/sign-up',
                difficulty: 'high',
                priority: 'medium'
            },
            'googleforms': {
                name: 'Google Forms',
                baseUrl: 'https://forms.google.com',
                registrationUrl: 'https://accounts.google.com/signup',
                difficulty: 'high',
                priority: 'medium'
            }
        };

        return siteConfigs[site] || {
            name: site,
            baseUrl: site,
            registrationUrl: site,
            difficulty: 'medium',
            priority: 'medium'
        };
    }

    getSiteName(site) {
        return this.getSiteConfiguration(site).name;
    }

    getSiteDifficulty(site) {
        return this.getSiteConfiguration(site).difficulty;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get workflow status
     */
    async getWorkflowStatus(workflowId) {
        return await WorkflowManager.getWorkflowStatus(workflowId, true);
    }

    /**
     * Cancel workflow
     */
    async cancelWorkflow(workflowId, reason) {
        return await WorkflowManager.cancelWorkflow(workflowId, reason);
    }
}

module.exports = new TrainingWorkflowService();