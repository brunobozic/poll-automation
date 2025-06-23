/**
 * Intelligent Failure Analyzer
 * LLM-powered failure analysis engine for automated root cause identification
 * and improvement recommendation generation
 */

const crypto = require('crypto');

class IntelligentFailureAnalyzer {
    constructor(llmService, feedbackDatabase, options = {}) {
        this.llmService = llmService;
        this.db = feedbackDatabase;
        this.options = {
            enableAdvancedPatterns: true,
            enablePredictiveAnalysis: true,
            confidenceThreshold: 0.7,
            maxSimilarFailures: 10,
            enableAutomaticRecommendations: true,
            ...options
        };
        
        this.analysisPromptTemplates = {
            rootCause: 'Root cause analysis prompt template',
            patternRecognition: 'Pattern recognition prompt template',
            improvementSuggestions: 'Improvement suggestions prompt template',
            testGeneration: 'Test generation prompt template'
        };
    }
    
    /**
     * Main entry point: Capture and analyze a failure with full context
     */
    async captureAndAnalyzeFailure(failureContext) {
        console.log('🔍 Capturing and analyzing failure...');
        
        try {
            // Step 1: Generate unique scenario hash for deduplication
            const scenarioHash = this.generateScenarioHash(failureContext);
            
            // Step 2: Check if this failure has been seen before
            const existingScenario = await this.findExistingScenario(scenarioHash);
            
            let scenarioId;
            if (existingScenario) {
                // Update occurrence count for existing scenario
                scenarioId = await this.updateExistingScenario(existingScenario.id, failureContext);
                console.log(`📈 Updated existing failure scenario (ID: ${scenarioId})`);
            } else {
                // Create new failure scenario
                scenarioId = await this.createFailureScenario(scenarioHash, failureContext);
                console.log(`📝 Created new failure scenario (ID: ${scenarioId})`);
            }
            
            // Step 3: Perform comprehensive LLM analysis
            const analysisResult = await this.performLLMAnalysis(scenarioId, failureContext);
            
            // Step 4: Generate improvement recommendations
            const recommendations = await this.generateRecommendations(analysisResult, failureContext);
            
            // Step 5: Create automated test cases
            const testCases = await this.generateTestCases(scenarioId, failureContext, recommendations);
            
            // Step 6: Update learning patterns
            await this.updateLearningPatterns(scenarioId, analysisResult);
            
            // Step 7: Update system metrics
            await this.updateSystemMetrics(analysisResult, recommendations);
            
            console.log('✅ Failure analysis complete');
            
            return {
                scenarioId,
                analysisId: analysisResult.id,
                recommendations: recommendations.map(r => r.id),
                testCases: testCases.map(t => t.id),
                insights: {
                    rootCause: analysisResult.root_cause_category,
                    confidence: analysisResult.confidence_score,
                    similarFailures: analysisResult.similar_failures.length,
                    recommendationCount: recommendations.length,
                    testCaseCount: testCases.length
                }
            };
            
        } catch (error) {
            console.error('❌ Error in failure analysis:', error);
            throw error;
        }
    }
    
    /**
     * Generate unique hash for failure scenario deduplication
     */
    generateScenarioHash(context) {
        const hashData = {
            failureType: context.failureType,
            siteId: context.siteId,
            errorMessage: context.errorMessage?.substring(0, 100),
            failedSelector: context.failedSelector,
            failedAction: context.failedAction,
            pageUrl: context.pageUrl?.split('?')[0], // Remove query params
            stepNumber: context.stepNumber
        };
        
        return crypto.createHash('sha256')
            .update(JSON.stringify(hashData))
            .digest('hex')
            .substring(0, 16);
    }
    
    /**
     * Find existing failure scenario by hash
     */
    async findExistingScenario(scenarioHash) {
        return this.db.get(
            'SELECT * FROM failure_scenarios WHERE scenario_hash = ?',
            [scenarioHash]
        );
    }
    
    /**
     * Update existing failure scenario with new occurrence
     */
    async updateExistingScenario(scenarioId, context) {
        const stmt = this.db.prepare(`
            UPDATE failure_scenarios 
            SET occurrence_count = occurrence_count + 1,
                last_occurrence = CURRENT_TIMESTAMP,
                page_snapshot = COALESCE(?, page_snapshot),
                browser_state = COALESCE(?, browser_state),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run([
            context.pageSnapshot,
            JSON.stringify(context.browserState),
            scenarioId
        ]);
        
        return scenarioId;
    }
    
    /**
     * Create new failure scenario with complete context
     */
    async createFailureScenario(scenarioHash, context) {
        const stmt = this.db.prepare(`
            INSERT INTO failure_scenarios (
                registration_id, scenario_hash, failure_type, severity_level,
                site_id, email_id, reproduction_recipe, page_snapshot,
                page_screenshot_path, browser_state, automation_state,
                llm_interaction_chain, defense_context, environment_data,
                error_message, error_stack, error_code, failed_selector,
                failed_action, timeout_duration, page_url, page_title,
                step_number, total_steps, time_to_failure_ms
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `);
        
        const result = stmt.run([
            context.registrationId,
            scenarioHash,
            context.failureType || 'unknown',
            context.severityLevel || 3,
            context.siteId,
            context.emailId,
            JSON.stringify(context.reproductionRecipe || {}),
            context.pageSnapshot,
            context.pageScreenshotPath,
            JSON.stringify(context.browserState || {}),
            JSON.stringify(context.automationState || {}),
            JSON.stringify(context.llmInteractionChain || []),
            JSON.stringify(context.defenseContext || {}),
            JSON.stringify(context.environmentData || {}),
            context.errorMessage,
            context.errorStack,
            context.errorCode,
            context.failedSelector,
            context.failedAction,
            context.timeoutDuration,
            context.pageUrl,
            context.pageTitle,
            context.stepNumber,
            context.totalSteps,
            context.timeToFailureMs
        ]);
        
        return result.lastInsertRowid;
    }
    
    /**
     * Perform comprehensive LLM analysis of the failure
     */
    async performLLMAnalysis(scenarioId, context) {
        console.log('🧠 Performing LLM root cause analysis...');
        
        try {
            // Get scenario details
            const scenario = this.db.get('SELECT * FROM failure_scenarios WHERE id = ?', [scenarioId]);
            
            // Find similar failures for pattern analysis
            const similarFailures = await this.findSimilarFailures(scenario);
            
            // Construct comprehensive analysis prompt
            const analysisPrompt = this.buildAnalysisPrompt(scenario, context, similarFailures);
            
            // Get LLM analysis
            const startTime = Date.now();
            const llmResponse = await this.callLLMForAnalysis(analysisPrompt);
            const analysisTime = Date.now() - startTime;
            
            // Parse and validate LLM response
            const analysisData = this.parseLLMAnalysisResponse(llmResponse);
            
            // Store analysis results
            const analysisId = await this.storeAnalysisResults(
                scenarioId, 
                analysisData, 
                analysisPrompt, 
                llmResponse, 
                analysisTime, 
                similarFailures
            );
            
            console.log(`✅ LLM analysis complete (ID: ${analysisId}, Confidence: ${(analysisData.confidence * 100).toFixed(1)}%)`);
            
            return {
                id: analysisId,
                ...analysisData,
                similar_failures: similarFailures,
                analysis_time_ms: analysisTime
            };
            
        } catch (error) {
            console.error('❌ Error in LLM analysis:', error);
            // Store failed analysis attempt
            await this.storeFailedAnalysis(scenarioId, error);
            throw error;
        }
    }
    
    /**
     * Build comprehensive analysis prompt for LLM
     */
    buildAnalysisPrompt(scenario, context, similarFailures) {
        const errorStack = scenario.error_stack || 'No stack trace available';
        const automationState = scenario.automation_state || '{}';
        const browserState = scenario.browser_state || '{}';
        const defenseContext = scenario.defense_context || '{}';
        
        const similarFailuresText = similarFailures.length > 0 ? 
            similarFailures.map(f => `- ${f.failure_type}: ${f.error_message} (${f.occurrence_count} times)`).join('\n') : 
            'No similar failures found';
        
        return `# 🔍 Intelligent Failure Analysis Expert

You are an expert automation failure analyst specializing in web scraping, form automation, and anti-bot countermeasure analysis. Analyze this failure scenario and provide comprehensive root cause analysis.

## 🎯 FAILURE SCENARIO

**Failure Type**: ${scenario.failure_type}
**Site**: ${context.siteName || 'Unknown'}
**Error**: ${scenario.error_message || 'No error message'}
**Failed Action**: ${scenario.failed_action || 'Unknown'}
**Failed Selector**: ${scenario.failed_selector || 'None'}
**Step**: ${scenario.step_number}/${scenario.total_steps}
**Occurrence Count**: ${scenario.occurrence_count}

## 📄 TECHNICAL CONTEXT

**Page URL**: ${scenario.page_url}
**Page Title**: ${scenario.page_title}
**Time to Failure**: ${scenario.time_to_failure_ms}ms
**Timeout Duration**: ${scenario.timeout_duration || 'N/A'}ms

**Error Stack Trace**:
\`\`\`
${errorStack}
\`\`\`

**Automation State**:
\`\`\`json
${automationState}
\`\`\`

**Browser State**:
\`\`\`json
${browserState}
\`\`\`

**Defense Context**:
\`\`\`json
${defenseContext}
\`\`\`

## 🔄 SIMILAR FAILURES
${similarFailuresText}

## 📋 ANALYSIS REQUIREMENTS

Provide your analysis in the following JSON format:

\`\`\`json
{
  "root_cause_category": "selector_outdated|timing_issue|anti_bot_detection|site_structure_change|logic_error|network_failure|captcha_challenge|honeypot_triggered|rate_limiting|javascript_error|authentication_required|unknown",
  "root_cause_description": "Detailed explanation of the primary cause",
  "confidence_score": 0.85,
  "contributing_factors": ["List of secondary factors that contributed to the failure"],
  "failure_frequency_trend": "increasing|stable|decreasing",
  "impact_assessment": {
    "severity": "low|medium|high|critical",
    "scope": "isolated|site_specific|cross_site|systemic",
    "business_impact": "Description of impact on automation goals"
  },
  "pattern_insights": {
    "is_new_pattern": true,
    "pattern_type": "Description if this represents a new failure pattern",
    "trend_indicators": ["Signs that this might become more common"]
  },
  "immediate_indicators": {
    "anti_bot_signals": ["Specific indicators of anti-bot detection"],
    "site_changes": ["Evidence of site structure or behavior changes"],
    "technical_issues": ["Technical problems in our automation"]
  },
  "contextual_analysis": {
    "environmental_factors": ["Browser, network, timing factors"],
    "automation_factors": ["Issues with our automation logic"],
    "site_factors": ["Site-specific behaviors or defenses"]
  }
}
\`\`\`

## 🎯 ANALYSIS FOCUS AREAS

1. **Root Cause Identification**: What is the primary reason this failed?
2. **Pattern Recognition**: Does this fit known failure patterns?
3. **Trend Analysis**: Is this failure becoming more common?
4. **Anti-Bot Assessment**: Are there signs of detection or countermeasures?
5. **Technical Debt**: Are there systemic issues in our automation?
6. **Predictive Insights**: What does this tell us about future failures?

Provide detailed, actionable analysis that will help improve our automation system.
`;
    }
    
    /**
     * Find similar failures for pattern analysis
     */
    async findSimilarFailures(scenario) {
        const query = `
            SELECT * FROM failure_scenarios 
            WHERE id != ? 
            AND (
                failure_type = ? OR
                site_id = ? OR
                failed_selector = ? OR
                failed_action = ? OR
                error_message LIKE ?
            )
            ORDER BY 
                CASE WHEN failure_type = ? THEN 1 ELSE 2 END,
                occurrence_count DESC,
                last_occurrence DESC
            LIMIT ?
        `;
        
        return this.db.all(query, [
            scenario.id,
            scenario.failure_type,
            scenario.site_id,
            scenario.failed_selector,
            scenario.failed_action,
            `%${scenario.error_message?.substring(0, 50) || ''}%`,
            scenario.failure_type,
            this.options.maxSimilarFailures
        ]);
    }
    
    /**
     * Call LLM service for analysis
     */
    async callLLMForAnalysis(prompt) {
        if (!this.llmService) {
            // Fallback analysis if no LLM service available
            return this.generateFallbackAnalysis(prompt);
        }
        
        try {
            return await this.llmService.generateResponse(prompt, {
                maxTokens: 2000,
                temperature: 0.1, // Low temperature for analytical consistency
                model: 'gpt-4' // Use most capable model for analysis
            });
        } catch (error) {
            console.warn('⚠️ LLM service failed, using fallback analysis');
            return this.generateFallbackAnalysis(prompt);
        }
    }
    
    /**
     * Generate fallback analysis when LLM is unavailable
     */
    generateFallbackAnalysis(prompt) {
        // Extract key information from prompt for basic analysis
        const failureType = prompt.match(/\\*\\*Failure Type\\*\\*: (.+)/)?.[1] || 'unknown';
        const errorMessage = prompt.match(/\\*\\*Error\\*\\*: (.+)/)?.[1] || 'No error message';
        const failedSelector = prompt.match(/\\*\\*Failed Selector\\*\\*: (.+)/)?.[1] || 'None';
        
        // Basic rule-based analysis
        let rootCause = 'unknown';
        let confidence = 0.5;
        
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            rootCause = 'timing_issue';
            confidence = 0.8;
        } else if (errorMessage.includes('selector') || failedSelector !== 'None') {
            rootCause = 'selector_outdated';
            confidence = 0.7;
        } else if (errorMessage.includes('captcha') || errorMessage.includes('CAPTCHA')) {
            rootCause = 'captcha_challenge';
            confidence = 0.9;
        } else if (errorMessage.includes('blocked') || errorMessage.includes('detected')) {
            rootCause = 'anti_bot_detection';
            confidence = 0.8;
        }
        
        return JSON.stringify({
            root_cause_category: rootCause,
            root_cause_description: `Fallback analysis suggests ${rootCause} based on error patterns: ${errorMessage}`,
            confidence_score: confidence,
            contributing_factors: ['LLM analysis unavailable - using rule-based fallback'],
            failure_frequency_trend: 'stable',
            impact_assessment: {
                severity: 'medium',
                scope: 'isolated',
                business_impact: 'Automated fallback analysis - manual review recommended'
            },
            pattern_insights: {
                is_new_pattern: false,
                pattern_type: 'Standard failure requiring LLM analysis',
                trend_indicators: ['LLM analysis needed for trend identification']
            },
            immediate_indicators: {
                anti_bot_signals: [],
                site_changes: [],
                technical_issues: [errorMessage]
            },
            contextual_analysis: {
                environmental_factors: ['Analysis limited without LLM'],
                automation_factors: ['Manual review required'],
                site_factors: ['LLM analysis needed']
            }
        });
    }
    
    /**
     * Parse and validate LLM analysis response
     */
    parseLLMAnalysisResponse(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/```json\\s*([\\s\\S]*?)\\s*```/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }
            
            const analysisData = JSON.parse(jsonMatch[1]);
            
            // Validate required fields
            const required = ['root_cause_category', 'root_cause_description', 'confidence_score'];
            for (const field of required) {
                if (!analysisData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Validate confidence score
            if (analysisData.confidence_score < 0 || analysisData.confidence_score > 1) {
                analysisData.confidence_score = Math.max(0, Math.min(1, analysisData.confidence_score));
            }
            
            return analysisData;
            
        } catch (error) {
            console.warn('⚠️ Failed to parse LLM response, using fallback:', error.message);
            return {
                root_cause_category: 'unknown',
                root_cause_description: 'Failed to parse LLM analysis response',
                confidence_score: 0.3,
                contributing_factors: ['LLM response parsing error'],
                failure_frequency_trend: 'stable',
                impact_assessment: {
                    severity: 'medium',
                    scope: 'isolated',
                    business_impact: 'Manual review required due to parsing error'
                }
            };
        }
    }
    
    /**
     * Store analysis results in database
     */
    async storeAnalysisResults(scenarioId, analysisData, prompt, response, analysisTime, similarFailures) {
        const stmt = this.db.prepare(`
            INSERT INTO failure_analysis (
                scenario_id, root_cause_category, root_cause_description,
                confidence_score, similar_failures, pattern_insights,
                failure_frequency_trend, impact_assessment,
                llm_analysis_prompt, llm_analysis_response,
                analysis_tokens_used, analysis_duration_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run([
            scenarioId,
            analysisData.root_cause_category,
            analysisData.root_cause_description,
            analysisData.confidence_score,
            JSON.stringify(similarFailures.map(f => f.id)),
            JSON.stringify(analysisData.pattern_insights || {}),
            analysisData.failure_frequency_trend || 'stable',
            JSON.stringify(analysisData.impact_assessment || {}),
            prompt,
            response,
            this.estimateTokens(prompt + response),
            analysisTime
        ]);
        
        return result.lastInsertRowid;
    }
    
    /**
     * Store failed analysis attempt
     */
    async storeFailedAnalysis(scenarioId, error) {
        const stmt = this.db.prepare(`
            INSERT INTO failure_analysis (
                scenario_id, root_cause_category, root_cause_description,
                confidence_score, llm_analysis_prompt, llm_analysis_response
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            scenarioId,
            'unknown',
            `Analysis failed: ${error.message}`,
            0.0,
            'Analysis failed due to error',
            error.stack
        ]);
    }
    
    /**
     * Generate improvement recommendations based on analysis
     */
    async generateRecommendations(analysisResult, context) {
        console.log('💡 Generating improvement recommendations...');
        
        const recommendations = [];
        
        // Generate recommendations based on root cause
        switch (analysisResult.root_cause_category) {
            case 'selector_outdated':
                recommendations.push(await this.createSelectorUpdateRecommendation(analysisResult, context));
                break;
            case 'timing_issue':
                recommendations.push(await this.createTimingRecommendation(analysisResult, context));
                break;
            case 'anti_bot_detection':
                recommendations.push(await this.createAntiDetectionRecommendation(analysisResult, context));
                break;
            case 'site_structure_change':
                recommendations.push(await this.createStructureAdaptationRecommendation(analysisResult, context));
                break;
            default:
                recommendations.push(await this.createGenericRecommendation(analysisResult, context));
        }
        
        // Generate strategic recommendations based on patterns
        if (analysisResult.similar_failures.length >= 3) {
            recommendations.push(await this.createPatternBasedRecommendation(analysisResult, context));
        }
        
        return recommendations;
    }
    
    /**
     * Create selector update recommendation
     */
    async createSelectorUpdateRecommendation(analysisResult, context) {
        const recommendationData = {
            analysisId: analysisResult.id,
            scenarioId: context.scenarioId,
            recommendationType: 'immediate_fix',
            priorityScore: 8,
            effortEstimate: 'low',
            impactPotential: 'high',
            targetComponent: 'selector_engine',
            suggestedChanges: `Update selector strategy for ${context.failedSelector}. Implement fallback selectors and dynamic selector discovery.`,
            claudeCodePrompt: `Fix selector issue: The selector '${context.failedSelector}' is failing. Please update the selector strategy to be more resilient and add fallback options.`,
            testRequirements: 'Verify selector works on target site and similar sites',
            validationCriteria: 'Selector successfully identifies target element with >95% reliability'
        };
        
        return await this.storeRecommendation(recommendationData);
    }
    
    /**
     * Create timing recommendation
     */
    async createTimingRecommendation(analysisResult, context) {
        const recommendationData = {
            analysisId: analysisResult.id,
            scenarioId: context.scenarioId,
            recommendationType: 'immediate_fix',
            priorityScore: 7,
            effortEstimate: 'low',
            impactPotential: 'medium',
            targetComponent: 'timing_engine',
            suggestedChanges: 'Increase wait times and implement adaptive timing based on site performance',
            claudeCodePrompt: 'Fix timing issue: Add dynamic wait times and better element availability detection',
            testRequirements: 'Test with various network conditions and site load times',
            validationCriteria: 'Timing-related failures reduced by >80%'
        };
        
        return await this.storeRecommendation(recommendationData);
    }
    
    /**
     * Create anti-detection recommendation
     */
    async createAntiDetectionRecommendation(analysisResult, context) {
        const recommendationData = {
            analysisId: analysisResult.id,
            scenarioId: context.scenarioId,
            recommendationType: 'strategic_improvement',
            priorityScore: 9,
            effortEstimate: 'high',
            impactPotential: 'critical',
            targetComponent: 'evasion_engine',
            suggestedChanges: 'Implement advanced anti-detection measures: behavioral mimicry, fingerprint randomization',
            claudeCodePrompt: 'Enhance anti-bot evasion: Add human-like behavior patterns and detection avoidance',
            testRequirements: 'Test against known anti-bot systems and monitor detection rates',
            validationCriteria: 'Bot detection incidents reduced by >70%'
        };
        
        return await this.storeRecommendation(recommendationData);
    }
    
    /**
     * Create structure adaptation recommendation
     */
    async createStructureAdaptationRecommendation(analysisResult, context) {
        const recommendationData = {
            analysisId: analysisResult.id,
            scenarioId: context.scenarioId,
            recommendationType: 'architecture_change',
            priorityScore: 6,
            effortEstimate: 'medium',
            impactPotential: 'high',
            targetComponent: 'adaptation_engine',
            suggestedChanges: 'Implement dynamic site structure adaptation and change detection',
            claudeCodePrompt: 'Add site change detection: Monitor for layout changes and adapt automatically',
            testRequirements: 'Test with sites that have recent structure changes',
            validationCriteria: 'Automatic adaptation to site changes >90% successful'
        };
        
        return await this.storeRecommendation(recommendationData);
    }
    
    /**
     * Create generic recommendation
     */
    async createGenericRecommendation(analysisResult, context) {
        const recommendationData = {
            analysisId: analysisResult.id,
            scenarioId: context.scenarioId,
            recommendationType: 'investigation',
            priorityScore: 5,
            effortEstimate: 'medium',
            impactPotential: 'medium',
            targetComponent: 'general',
            suggestedChanges: 'Further investigation required to determine specific fix',
            claudeCodePrompt: 'Investigate and fix: Review the failure scenario and implement appropriate solution',
            testRequirements: 'Create specific test cases based on investigation results',
            validationCriteria: 'Failure rate reduction >50%'
        };
        
        return await this.storeRecommendation(recommendationData);
    }
    
    /**
     * Create pattern-based recommendation
     */
    async createPatternBasedRecommendation(analysisResult, context) {
        const recommendationData = {
            analysisId: analysisResult.id,
            scenarioId: context.scenarioId,
            recommendationType: 'strategic_improvement',
            priorityScore: 8,
            effortEstimate: 'high',
            impactPotential: 'high',
            targetComponent: 'pattern_recognition',
            suggestedChanges: 'Address recurring failure pattern detected across multiple sites',
            claudeCodePrompt: 'Fix pattern: Address the common failure pattern that affects multiple scenarios',
            testRequirements: 'Test across all sites that exhibit this pattern',
            validationCriteria: 'Pattern-related failures reduced by >70%'
        };
        
        return await this.storeRecommendation(recommendationData);
    }
    
    /**
     * Create validation test
     */
    async createValidationTest(scenarioId, recommendation, context) {
        const testCode = `
// Auto-generated validation test for recommendation ${recommendation.id}
const { test, expect } = require('@playwright/test');

test('Validate fix for ${recommendation.targetComponent}', async ({ page }) => {
    // Navigate to test page
    await page.goto('${context.pageUrl}');
    
    // Apply the fix and test
    ${recommendation.testRequirements || '// Add validation steps'}
    
    // Verify the fix works
    // ${recommendation.validationCriteria}
});
`;
        
        return await this.storeTestCase({
            scenarioId,
            testName: `validate_fix_${recommendation.id}`,
            testType: 'validation',
            testCode,
            expectedBehavior: recommendation.validationCriteria,
            expectedOutcome: 'pass'
        });
    }
    
    /**
     * Store recommendation in database
     */
    async storeRecommendation(data) {
        const stmt = this.db.prepare(`
            INSERT INTO improvement_recommendations (
                analysis_id, scenario_id, recommendation_type, priority_score,
                effort_estimate, impact_potential, target_component,
                suggested_changes, claude_code_prompt, test_requirements,
                validation_criteria
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run([
            data.analysisId,
            data.scenarioId,
            data.recommendationType,
            data.priorityScore,
            data.effortEstimate,
            data.impactPotential,
            data.targetComponent,
            data.suggestedChanges,
            data.claudeCodePrompt,
            data.testRequirements,
            data.validationCriteria
        ]);
        
        return {
            id: result.lastInsertRowid,
            ...data
        };
    }
    
    /**
     * Generate automated test cases for validation
     */
    async generateTestCases(scenarioId, context, recommendations) {
        console.log('🧪 Generating automated test cases...');
        
        const testCases = [];
        
        // Create reproduction test
        testCases.push(await this.createReproductionTest(scenarioId, context));
        
        // Create validation tests for each recommendation
        for (const recommendation of recommendations) {
            testCases.push(await this.createValidationTest(scenarioId, recommendation, context));
        }
        
        return testCases;
    }
    
    /**
     * Create reproduction test case
     */
    async createReproductionTest(scenarioId, context) {
        const testCode = `
// Auto-generated reproduction test for scenario ${scenarioId}
const { test, expect } = require('@playwright/test');

test('Reproduce failure scenario ${scenarioId}', async ({ page }) => {
    // Navigate to failure page
    await page.goto('${context.pageUrl}');
    
    // Reproduce the exact failure conditions
    ${context.reproductionSteps || '// Add reproduction steps'}
    
    // Verify the failure occurs
    await expect(async () => {
        ${context.failedAction ? `await page.${context.failedAction}` : '// Add failed action'}
    }).toThrow();
});
`;
        
        return await this.storeTestCase({
            scenarioId,
            testName: `reproduce_failure_${scenarioId}`,
            testType: 'reproduction',
            testCode,
            expectedBehavior: 'Should reproduce the original failure',
            expectedOutcome: 'fail'
        });
    }
    
    /**
     * Store test case in database
     */
    async storeTestCase(data) {
        const stmt = this.db.prepare(`
            INSERT INTO reproduction_tests (
                scenario_id, test_name, test_type, test_code,
                expected_behavior, expected_outcome
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run([
            data.scenarioId,
            data.testName,
            data.testType,
            data.testCode,
            data.expectedBehavior,
            data.expectedOutcome
        ]);
        
        return {
            id: result.lastInsertRowid,
            ...data
        };
    }
    
    /**
     * Update learning patterns based on analysis
     */
    async updateLearningPatterns(scenarioId, analysisResult) {
        // Implementation for pattern learning
        console.log('🎯 Updating learning patterns...');
    }
    
    /**
     * Update system metrics
     */
    async updateSystemMetrics(analysisResult, recommendations) {
        const today = new Date().toISOString().split('T')[0];
        
        // Update or insert daily metrics
        const stmt = this.db.prepare(`
            INSERT INTO feedback_loop_metrics (
                metric_date, total_failures, analyzed_failures,
                generated_recommendations, system_learning_score
            ) VALUES (?, 1, 1, ?, ?)
            ON CONFLICT(metric_date) DO UPDATE SET
                total_failures = total_failures + 1,
                analyzed_failures = analyzed_failures + 1,
                generated_recommendations = generated_recommendations + ?,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        stmt.run([
            today,
            recommendations.length,
            analysisResult.confidence_score,
            recommendations.length
        ]);
    }
    
    /**
     * Estimate token count for cost tracking
     */
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    
    /**
     * Get failure analysis dashboard data
     */
    async getFailureDashboard(timeframe = '7 days') {
        return {
            recentFailures: this.db.all(`
                SELECT * FROM failure_summary 
                WHERE first_occurrence > datetime('now', '-${timeframe}')
                ORDER BY last_occurrence DESC
                LIMIT 20
            `),
            topFailureTypes: this.db.all(`
                SELECT failure_type, COUNT(*) as count
                FROM failure_scenarios
                WHERE first_occurrence > datetime('now', '-${timeframe}')
                GROUP BY failure_type
                ORDER BY count DESC
            `),
            learningProgress: this.db.all(`
                SELECT * FROM learning_intelligence
                WHERE date > date('now', '-${timeframe}')
                ORDER BY date DESC
            `),
            pendingRecommendations: this.db.all(`
                SELECT * FROM recommendation_dashboard
                WHERE status = 'pending'
                ORDER BY priority_score DESC
                LIMIT 10
            `)
        };
    }
}

// Helper functions for specific recommendation types
class RecommendationGenerators {
    static async createTimingRecommendation(analysisResult, context) {
        return {
            recommendationType: 'immediate_fix',
            priorityScore: 7,
            effortEstimate: 'low',
            impactPotential: 'medium',
            targetComponent: 'timing_engine',
            suggestedChanges: 'Increase wait times and implement adaptive timing based on site performance',
            claudeCodePrompt: 'Fix timing issue: Add dynamic wait times and better element availability detection',
            testRequirements: 'Test with various network conditions and site load times',
            validationCriteria: 'Timing-related failures reduced by >80%'
        };
    }
    
    static async createAntiDetectionRecommendation(analysisResult, context) {
        return {
            recommendationType: 'strategic_improvement',
            priorityScore: 9,
            effortEstimate: 'high',
            impactPotential: 'critical',
            targetComponent: 'evasion_engine',
            suggestedChanges: 'Implement advanced anti-detection measures: behavioral mimicry, fingerprint randomization',
            claudeCodePrompt: 'Enhance anti-bot evasion: Add human-like behavior patterns and detection avoidance',
            testRequirements: 'Test against known anti-bot systems and monitor detection rates',
            validationCriteria: 'Bot detection incidents reduced by >70%'
        };
    }
    
    static async createStructureAdaptationRecommendation(analysisResult, context) {
        return {
            recommendationType: 'architecture_change',
            priorityScore: 6,
            effortEstimate: 'medium',
            impactPotential: 'high',
            targetComponent: 'adaptation_engine',
            suggestedChanges: 'Implement dynamic site structure adaptation and change detection',
            claudeCodePrompt: 'Add site change detection: Monitor for layout changes and adapt automatically',
            testRequirements: 'Test with sites that have recent structure changes',
            validationCriteria: 'Automatic adaptation to site changes >90% successful'
        };
    }
}

module.exports = IntelligentFailureAnalyzer;