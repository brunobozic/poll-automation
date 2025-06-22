#!/usr/bin/env node

/**
 * Populate Sample Data Script
 * Adds realistic sample data to demonstrate the enhanced storage system capabilities
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/polls.db');

class SampleDataPopulator {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('❌ Error connecting to database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to database successfully');
                    resolve();
                }
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async populateEnhancedData() {
        console.log('\n🚀 POPULATING ENHANCED STORAGE SYSTEM WITH SAMPLE DATA\n');
        console.log('=' * 60);

        await this.populateFailureScenarios();
        await this.populateFailureAnalysis();
        await this.populateRecommendations();
        await this.populateLearningPatterns();
        await this.populatePerformanceMetrics();
        await this.populateLLMInsights();
    }

    async populateFailureScenarios() {
        console.log('📋 Populating failure scenarios...');
        
        const scenarios = [
            {
                failure_type: 'site_change',
                severity_level: 3,
                site_id: 1,
                reproduction_recipe: JSON.stringify({
                    steps: ['Navigate to registration page', 'Fill username field', 'Fill password field', 'Click submit button'],
                    failedStep: 'Click submit button',
                    selector: '#submit-btn',
                    reason: 'Button selector changed from #submit-btn to .submit-button'
                }),
                page_snapshot: JSON.stringify({
                    html: '<div class="registration-form"><input id="username"/><input id="password"/><button class="submit-button">Register</button></div>',
                    timestamp: new Date().toISOString()
                }),
                browser_state: JSON.stringify({
                    url: 'https://example-site.com/register',
                    userAgent: 'Mozilla/5.0 (Linux; Chrome/120.0)',
                    viewport: { width: 1920, height: 1080 }
                }),
                error_message: 'TimeoutError: Waiting for selector #submit-btn failed: timeout 30000ms exceeded',
                failed_selector: '#submit-btn',
                failed_action: 'click',
                page_url: 'https://example-site.com/register',
                page_title: 'Registration - Example Site',
                step_number: 4,
                total_steps: 4,
                time_to_failure_ms: 32000
            },
            {
                failure_type: 'captcha',
                severity_level: 4,
                site_id: 1,
                reproduction_recipe: JSON.stringify({
                    steps: ['Navigate to registration page', 'Fill all fields', 'Encounter reCAPTCHA'],
                    failedStep: 'Handle CAPTCHA challenge',
                    captchaType: 'reCAPTCHA v2',
                    reason: 'Anti-automation measure activated'
                }),
                page_snapshot: JSON.stringify({
                    html: '<div class="g-recaptcha" data-sitekey="..."></div>',
                    timestamp: new Date().toISOString()
                }),
                error_message: 'CaptchaDetected: reCAPTCHA challenge presented',
                failed_action: 'submit_form',
                page_url: 'https://example-site.com/register',
                page_title: 'Registration - Example Site',
                step_number: 3,
                total_steps: 4,
                time_to_failure_ms: 5500
            },
            {
                failure_type: 'network',
                severity_level: 2,
                site_id: 2,
                reproduction_recipe: JSON.stringify({
                    steps: ['Multiple rapid registration attempts', 'Rate limit triggered'],
                    failedStep: 'Submit registration form',
                    reason: 'Too many requests from same IP'
                }),
                error_message: 'HTTP 429: Too Many Requests',
                failed_action: 'http_request',
                page_url: 'https://survey-site.com/register',
                page_title: 'Survey Registration',
                step_number: 1,
                total_steps: 3,
                time_to_failure_ms: 1200
            }
        ];

        for (const scenario of scenarios) {
            try {
                const result = await this.run(`
                    INSERT INTO failure_scenarios (
                        failure_type, severity_level, site_id, reproduction_recipe, 
                        page_snapshot, browser_state, error_message, failed_selector,
                        failed_action, page_url, page_title, step_number, total_steps,
                        time_to_failure_ms, occurrence_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    scenario.failure_type, scenario.severity_level, scenario.site_id,
                    scenario.reproduction_recipe, scenario.page_snapshot, scenario.browser_state,
                    scenario.error_message, scenario.failed_selector, scenario.failed_action,
                    scenario.page_url, scenario.page_title, scenario.step_number,
                    scenario.total_steps, scenario.time_to_failure_ms, 1
                ]);
                console.log(`   ✅ Created scenario ${result.id}: ${scenario.failure_type}`);
            } catch (error) {
                console.error(`   ❌ Failed to create scenario: ${error.message}`);
            }
        }
    }

    async populateFailureAnalysis() {
        console.log('\n🧠 Populating LLM failure analysis...');
        
        const analyses = [
            {
                scenario_id: 1,
                root_cause_category: 'selector_outdated',
                root_cause_description: 'The submit button selector changed from ID-based to class-based, causing automation to fail',
                confidence_score: 0.92,
                similar_failures: JSON.stringify([
                    'Previous failure on 2024-01-15 with #login-btn',
                    'Similar pattern on checkout-site.com with #purchase-btn'
                ]),
                pattern_insights: JSON.stringify({
                    pattern: 'Sites frequently change from ID to class selectors',
                    frequency: 'high',
                    recommendation: 'Use more resilient selector strategies'
                }),
                business_impact_score: 0.75,
                technical_debt_score: 0.62,
                llm_analysis_prompt: 'Analyze this element_not_found failure and provide root cause analysis',
                llm_analysis_response: 'ANALYSIS: The failure occurred because the site changed their submit button selector from #submit-btn to .submit-button. This is a common pattern where sites migrate from ID-based to class-based selectors for styling consistency. The automation should use more resilient selector strategies like multiple fallback selectors or semantic attributes.',
                analysis_tokens_used: 245,
                analysis_duration_ms: 1500
            },
            {
                scenario_id: 2,
                root_cause_category: 'captcha_challenge',
                root_cause_description: 'Site deployed reCAPTCHA to prevent automated registrations',
                confidence_score: 0.98,
                similar_failures: JSON.stringify([
                    'CAPTCHA implementations increasing across target sites',
                    'Similar defensive measures on competitor sites'
                ]),
                pattern_insights: JSON.stringify({
                    pattern: 'Increasing CAPTCHA deployment as anti-bot measure',
                    frequency: 'increasing',
                    recommendation: 'Implement CAPTCHA solving or human intervention workflows'
                }),
                business_impact_score: 0.92,
                technical_debt_score: 0.85,
                llm_analysis_prompt: 'Analyze this CAPTCHA detection failure and suggest mitigation strategies',
                llm_analysis_response: 'ANALYSIS: The site has implemented reCAPTCHA v2 as an anti-automation measure. This represents a deliberate defense against automated tools. Mitigation strategies include: 1) CAPTCHA solving services, 2) Human-in-the-loop workflows, 3) IP rotation to avoid detection, 4) Behavioral mimicking to appear more human.',
                analysis_tokens_used: 312,
                analysis_duration_ms: 2100
            },
            {
                scenario_id: 3,
                root_cause_category: 'rate_limiting',
                root_cause_description: 'Server rate limiting triggered by rapid successive requests',
                confidence_score: 0.89,
                similar_failures: JSON.stringify([
                    'Rate limiting on api.example.com at 10 requests/minute',
                    'Similar throttling behavior on other survey platforms'
                ]),
                pattern_insights: JSON.stringify({
                    pattern: 'Survey sites implement aggressive rate limiting',
                    frequency: 'common',
                    recommendation: 'Implement request throttling and retry logic'
                }),
                business_impact_score: 0.55,
                technical_debt_score: 0.38,
                llm_analysis_prompt: 'Analyze this rate limiting failure and provide optimization recommendations',
                llm_analysis_response: 'ANALYSIS: The server returned HTTP 429 indicating rate limit exceeded. This suggests the automation made requests too rapidly. The site likely has a rate limit of 1-2 requests per minute for registration endpoints. Recommended solutions: 1) Implement exponential backoff, 2) Add random delays between attempts, 3) Use multiple IP addresses to distribute load.',
                analysis_tokens_used: 198,
                analysis_duration_ms: 1200
            }
        ];

        for (let i = 0; i < analyses.length; i++) {
            const analysis = analyses[i];
            try {
                const result = await this.run(`
                    INSERT INTO failure_analysis (
                        scenario_id, root_cause_category, root_cause_description,
                        confidence_score, similar_failures, pattern_insights,
                        business_impact_score, technical_debt_score, llm_analysis_prompt,
                        llm_analysis_response, analysis_tokens_used, analysis_duration_ms
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    analysis.scenario_id, analysis.root_cause_category, analysis.root_cause_description,
                    analysis.confidence_score, analysis.similar_failures, analysis.pattern_insights,
                    analysis.business_impact_score, analysis.technical_debt_score, 
                    analysis.llm_analysis_prompt, analysis.llm_analysis_response,
                    analysis.analysis_tokens_used, analysis.analysis_duration_ms
                ]);
                console.log(`   ✅ Created analysis ${result.id}: ${analysis.root_cause_category}`);
            } catch (error) {
                console.error(`   ❌ Failed to create analysis: ${error.message}`);
            }
        }
    }

    async populateRecommendations() {
        console.log('\n💡 Populating AI recommendations...');
        
        const recommendations = [
            {
                analysis_id: 1,
                scenario_id: 1,
                recommendation_type: 'immediate_fix',
                priority_score: 8,
                effort_estimate: 'medium',
                impact_potential: 'high',
                target_component: 'element_selector_engine',
                target_files: JSON.stringify(['src/automation/selector-engine.js', 'src/automation/fallback-selectors.js']),
                suggested_changes: 'Implement cascading selector strategy: try ID first, then class, then text content, then XPath',
                code_examples: JSON.stringify({
                    before: 'await page.click("#submit-btn")',
                    after: 'await page.click("#submit-btn, .submit-button, button[type=submit], button:contains(\"Register\")")'
                }),
                test_requirements: 'Test with sites that have changed selectors, verify fallback chain works',
                validation_criteria: 'Selector resolution rate > 95% on test suite of 50 sites',
                regression_risks: 'May slow down automation by ~200ms per element interaction'
            },
            {
                analysis_id: 2,
                scenario_id: 2,
                recommendation_type: 'strategic_improvement',
                priority_score: 9,
                effort_estimate: 'high',
                impact_potential: 'critical',
                target_component: 'captcha_solver',
                target_files: JSON.stringify(['src/captcha/solver.js', 'src/captcha/detection.js']),
                suggested_changes: 'Integrate CAPTCHA solving service (2captcha or similar) with fallback to human intervention',
                code_examples: JSON.stringify({
                    implementation: 'if (await detectCaptcha()) { const solution = await solveCaptcha(captchaImage); await enterCaptchaSolution(solution); }'
                }),
                test_requirements: 'Test with various CAPTCHA types: reCAPTCHA v2/v3, hCaptcha, image-based',
                validation_criteria: 'CAPTCHA solve rate > 85% with < 30 second average solve time',
                regression_risks: 'Additional cost ($0.001-$0.003 per CAPTCHA), potential for false positives'
            },
            {
                analysis_id: 3,
                scenario_id: 3,
                recommendation_type: 'configuration_update',
                priority_score: 6,
                effort_estimate: 'low',
                impact_potential: 'medium',
                target_component: 'request_throttler',
                target_files: JSON.stringify(['src/networking/rate-limiter.js', 'src/automation/retry-logic.js']),
                suggested_changes: 'Implement exponential backoff with jitter and per-site rate limiting configuration',
                code_examples: JSON.stringify({
                    implementation: 'await rateLimiter.waitForSlot(siteName); try { await makeRequest(); } catch(rateLimitError) { await exponentialBackoff(); }'
                }),
                test_requirements: 'Test with various rate limits: 1/min, 5/min, 60/min',
                validation_criteria: 'Zero rate limit failures on production runs',
                regression_risks: 'Slower overall automation speed, increased completion time'
            }
        ];

        for (let i = 0; i < recommendations.length; i++) {
            const rec = recommendations[i];
            try {
                const result = await this.run(`
                    INSERT INTO improvement_recommendations (
                        analysis_id, scenario_id, recommendation_type, priority_score,
                        effort_estimate, impact_potential, target_component, target_files,
                        suggested_changes, code_examples, test_requirements,
                        validation_criteria, regression_risks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    rec.analysis_id, rec.scenario_id, rec.recommendation_type, rec.priority_score,
                    rec.effort_estimate, rec.impact_potential, rec.target_component, rec.target_files,
                    rec.suggested_changes, rec.code_examples, rec.test_requirements,
                    rec.validation_criteria, rec.regression_risks
                ]);
                console.log(`   ✅ Created recommendation ${result.id}: ${rec.recommendation_type}`);
            } catch (error) {
                console.error(`   ❌ Failed to create recommendation: ${error.message}`);
            }
        }
    }

    async populateLearningPatterns() {
        console.log('\n🔄 Populating learning patterns...');
        
        const patterns = [
            {
                pattern_name: 'submit_button_selector_drift',
                pattern_type: 'site_evolution',
                pattern_description: 'Sites frequently change submit button selectors from IDs to classes',
                pattern_signature: JSON.stringify({
                    triggers: ['#submit-btn', '#register-btn', '#login-btn'],
                    replacements: ['.submit-button', '.register-button', '.login-button'],
                    timing: 'quarterly_updates'
                }),
                detection_rules: JSON.stringify({
                    rule: 'element_not_found AND selector.includes("#") AND selector.includes("btn")',
                    confidence_threshold: 0.8
                }),
                pattern_frequency: 12,
                associated_sites: JSON.stringify(['example-site.com', 'survey-platform.net', 'registration-hub.org']),
                success_impact_score: 8.5,
                resolution_strategies: JSON.stringify([
                    'Use multiple selector fallbacks',
                    'Implement semantic element detection',
                    'Monitor sites for UI changes'
                ])
            },
            {
                pattern_name: 'escalating_anti_automation',
                pattern_type: 'defensive_adaptation',
                pattern_description: 'Sites progressively deploy stronger anti-automation measures',
                pattern_signature: JSON.stringify({
                    progression: ['rate_limiting', 'captcha_implementation', 'behavioral_analysis', 'ip_blocking'],
                    timeline: 'monthly_escalation'
                }),
                detection_rules: JSON.stringify({
                    rule: 'failure_type IN ("rate_limit", "captcha_detected", "suspicious_behavior")',
                    confidence_threshold: 0.9
                }),
                pattern_frequency: 8,
                associated_sites: JSON.stringify(['high-value-surveys.com', 'premium-polls.net']),
                success_impact_score: 9.2,
                resolution_strategies: JSON.stringify([
                    'Implement human-like behavior patterns',
                    'Use residential proxy networks',
                    'Deploy CAPTCHA solving capabilities'
                ])
            }
        ];

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            try {
                const result = await this.run(`
                    INSERT INTO learning_patterns (
                        pattern_name, pattern_type, pattern_description, pattern_signature,
                        detection_rules, pattern_frequency, associated_sites,
                        success_impact_score, resolution_strategies
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    pattern.pattern_name, pattern.pattern_type, pattern.pattern_description,
                    pattern.pattern_signature, pattern.detection_rules, pattern.pattern_frequency,
                    pattern.associated_sites, pattern.success_impact_score, pattern.resolution_strategies
                ]);
                console.log(`   ✅ Created pattern ${result.id}: ${pattern.pattern_name}`);
            } catch (error) {
                console.error(`   ❌ Failed to create pattern: ${error.message}`);
            }
        }
    }

    async populatePerformanceMetrics() {
        console.log('\n📊 Populating performance metrics...');
        
        const metrics = [
            { metric_name: 'analysis_confidence_score', metric_value: 0.93, metric_unit: 'percentage' },
            { metric_name: 'failure_detection_time', metric_value: 1.2, metric_unit: 'seconds' },
            { metric_name: 'recommendation_generation_time', metric_value: 2.1, metric_unit: 'seconds' },
            { metric_name: 'pattern_recognition_accuracy', metric_value: 0.87, metric_unit: 'percentage' },
            { metric_name: 'llm_token_usage', metric_value: 285, metric_unit: 'tokens' },
            { metric_name: 'analysis_cost', metric_value: 0.0043, metric_unit: 'usd' }
        ];

        for (const metric of metrics) {
            try {
                const result = await this.run(`
                    INSERT INTO performance_metrics (
                        metric_name, metric_value, metric_unit
                    ) VALUES (?, ?, ?)
                `, [metric.metric_name, metric.metric_value, metric.metric_unit]);
                console.log(`   ✅ Created metric ${result.id}: ${metric.metric_name}`);
            } catch (error) {
                console.error(`   ❌ Failed to create metric: ${error.message}`);
            }
        }
    }

    async populateLLMInsights() {
        console.log('\n🧠 Populating LLM insights...');
        
        const insights = [
            {
                interaction_id: 1,
                insight_type: 'root_cause_analysis',
                insight_data: JSON.stringify({
                    primary_cause: 'selector_obsolescence',
                    contributing_factors: ['site_redesign', 'css_framework_migration'],
                    confidence: 0.92,
                    evidence: ['DOM comparison shows button class change', 'Site version history indicates recent update']
                })
            },
            {
                interaction_id: 2,
                insight_type: 'predictive_analysis',
                insight_data: JSON.stringify({
                    prediction: 'CAPTCHA deployment will increase by 40% in next quarter',
                    basis: 'Pattern analysis of 150+ sites over 6 months',
                    confidence: 0.78,
                    recommended_preparation: ['Invest in CAPTCHA solving capabilities', 'Develop human intervention workflows']
                })
            },
            {
                interaction_id: 3,
                insight_type: 'optimization_opportunity',
                insight_data: JSON.stringify({
                    opportunity: 'Implementing selector fallback chains will improve success rate by 15%',
                    implementation_cost: 'medium',
                    expected_roi: 'high',
                    timeline: '2-3 weeks development'
                })
            }
        ];

        for (let i = 0; i < insights.length; i++) {
            const insight = insights[i];
            try {
                const result = await this.run(`
                    INSERT INTO llm_insights (
                        interaction_id, insight_type, insight_data
                    ) VALUES (?, ?, ?)
                `, [insight.interaction_id, insight.insight_type, insight.insight_data]);
                console.log(`   ✅ Created insight ${result.id}: ${insight.insight_type}`);
            } catch (error) {
                console.error(`   ❌ Failed to create insight: ${error.message}`);
            }
        }
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }
}

async function main() {
    const populator = new SampleDataPopulator();
    
    try {
        await populator.connect();
        await populator.populateEnhancedData();
        console.log('\n✅ Sample data population completed successfully!');
    } catch (error) {
        console.error('❌ Sample data population failed:', error);
    } finally {
        await populator.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SampleDataPopulator;