#!/usr/bin/env node

/**
 * LLM Prompt Effectiveness Analysis Report
 * Analyzes prompt quality, response accuracy, and honeypot detection effectiveness
 */

const { getDatabaseManager } = require('./src/database/database-manager');

class PromptEffectivenessAnalyzer {
    constructor() {
        this.db = null;
        this.analysis = {
            totalInteractions: 0,
            successfulInteractions: 0,
            failedInteractions: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            honeypotDetectionStats: {
                sitesWithHoneypots: 0,
                totalHoneypotsDetected: 0,
                detectionPatterns: {},
                averageHoneypotsPerSite: 0
            },
            promptIssues: [],
            improvements: []
        };
    }
    
    async initialize() {
        console.log('📊 LLM PROMPT EFFECTIVENESS ANALYSIS');
        console.log('=====================================');
        
        this.db = getDatabaseManager();
        await this.db.initialize();
        console.log('✅ Database connected');
    }
    
    async runComprehensiveAnalysis() {
        // Analyze recent honeypot detection tests
        await this.analyzeHoneypotDetectionTests();
        
        // Analyze all LLM interactions for prompt patterns
        await this.analyzeLLMInteractionPatterns();
        
        // Evaluate prompt effectiveness
        await this.evaluatePromptEffectiveness();
        
        // Generate improvement recommendations
        await this.generateImprovementRecommendations();
        
        // Create comprehensive report
        await this.generateComprehensiveReport();
    }
    
    async analyzeHoneypotDetectionTests() {
        console.log('\\n🛡️ ANALYZING HONEYPOT DETECTION TESTS');
        console.log('======================================');
        
        const honeypotTests = await this.db.all(`
            SELECT * FROM ai_interactions 
            WHERE interaction_type = 'enhanced_honeypot_test'
            ORDER BY timestamp DESC
        `);
        
        console.log(`📋 Found ${honeypotTests.length} honeypot detection tests`);
        
        for (const test of honeypotTests) {
            await this.analyzeIndividualHoneypotTest(test);
        }
        
        this.calculateHoneypotDetectionStats(honeypotTests);
    }
    
    async analyzeIndividualHoneypotTest(test) {
        try {
            const response = JSON.parse(test.response_text);
            const context = JSON.parse(test.form_analysis_context || '{}');
            
            console.log(`\\n🔍 Analyzing test for: ${context.siteName || 'Unknown Site'}`);
            console.log(`   📊 Confidence: ${((response.confidence || 0) * 100).toFixed(1)}%`);
            console.log(`   ⏱️ Processing: ${test.processing_time_ms || 0}ms`);
            console.log(`   ✅ Success: ${test.success ? 'Yes' : 'No'}`);
            
            // Analyze honeypot detection
            const honeypots = response.honeypots || [];
            console.log(`   🛡️ Honeypots detected: ${honeypots.length}`);
            
            if (honeypots.length > 0) {
                this.analysis.honeypotDetectionStats.sitesWithHoneypots++;
                this.analysis.honeypotDetectionStats.totalHoneypotsDetected += honeypots.length;
                
                honeypots.forEach((honeypot, index) => {
                    const reason = honeypot.reason || honeypot.trapType || 'unknown';
                    console.log(`      ${index + 1}. ${honeypot.selector} - ${reason}`);
                    
                    // Track patterns
                    if (!this.analysis.honeypotDetectionStats.detectionPatterns[reason]) {
                        this.analysis.honeypotDetectionStats.detectionPatterns[reason] = 0;
                    }
                    this.analysis.honeypotDetectionStats.detectionPatterns[reason]++;
                });
            }
            
            // Analyze field detection
            const fields = response.fields || [];
            const checkboxes = response.checkboxes || [];
            console.log(`   📝 Fields detected: ${fields.length} inputs, ${checkboxes.length} checkboxes`);
            
            // Check if this was a fallback analysis
            if (response.source === 'fallback') {
                console.log(`   ⚠️ Used fallback analysis: ${response.fallbackReason || 'unknown reason'}`);
                this.analysis.promptIssues.push(`Fallback used for ${context.siteName}: ${response.fallbackReason}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Failed to analyze test: ${error.message}`);
        }
    }
    
    calculateHoneypotDetectionStats(tests) {
        console.log('\\n📊 HONEYPOT DETECTION STATISTICS');
        console.log('=================================');
        
        const successfulTests = tests.filter(t => t.success);
        this.analysis.totalInteractions = tests.length;
        this.analysis.successfulInteractions = successfulTests.length;
        this.analysis.failedInteractions = tests.length - successfulTests.length;
        
        if (successfulTests.length > 0) {
            const totalConfidence = successfulTests.reduce((sum, t) => {
                const response = JSON.parse(t.response_text);
                return sum + (response.confidence || 0);
            }, 0);
            this.analysis.averageConfidence = totalConfidence / successfulTests.length;
            
            const totalProcessingTime = successfulTests.reduce((sum, t) => sum + (t.processing_time_ms || 0), 0);
            this.analysis.averageProcessingTime = totalProcessingTime / successfulTests.length;
        }
        
        if (this.analysis.honeypotDetectionStats.sitesWithHoneypots > 0) {
            this.analysis.honeypotDetectionStats.averageHoneypotsPerSite = 
                this.analysis.honeypotDetectionStats.totalHoneypotsDetected / 
                this.analysis.honeypotDetectionStats.sitesWithHoneypots;
        }
        
        console.log(`✅ Success Rate: ${this.analysis.successfulInteractions}/${this.analysis.totalInteractions} (${((this.analysis.successfulInteractions / this.analysis.totalInteractions) * 100).toFixed(1)}%)`);
        console.log(`📊 Average Confidence: ${(this.analysis.averageConfidence * 100).toFixed(1)}%`);
        console.log(`⏱️ Average Processing Time: ${this.analysis.averageProcessingTime.toFixed(0)}ms`);
        console.log(`🛡️ Sites with Honeypots: ${this.analysis.honeypotDetectionStats.sitesWithHoneypots}`);
        console.log(`🎯 Total Honeypots Detected: ${this.analysis.honeypotDetectionStats.totalHoneypotsDetected}`);
        console.log(`📈 Average Honeypots per Site: ${this.analysis.honeypotDetectionStats.averageHoneypotsPerSite.toFixed(1)}`);
        
        console.log('\\n🔍 Most Common Detection Patterns:');
        const sortedPatterns = Object.entries(this.analysis.honeypotDetectionStats.detectionPatterns)
            .sort(([,a], [,b]) => b - a);
        
        sortedPatterns.forEach(([pattern, count], index) => {
            if (index < 10) { // Top 10
                console.log(`   ${index + 1}. ${pattern}: ${count} occurrences`);
            }
        });
    }
    
    async analyzeLLMInteractionPatterns() {
        console.log('\\n🧠 ANALYZING ALL LLM INTERACTION PATTERNS');
        console.log('==========================================');
        
        const allInteractions = await this.db.all(`
            SELECT interaction_type, confidence_score, success, processing_time_ms, prompt_text
            FROM ai_interactions 
            WHERE timestamp > datetime('now', '-7 days')
            ORDER BY timestamp DESC
        `);
        
        console.log(`📋 Analyzing ${allInteractions.length} recent LLM interactions`);
        
        const interactionTypes = {};
        const confidenceByType = {};
        const processingTimeByType = {};
        
        for (const interaction of allInteractions) {
            const type = interaction.interaction_type;
            
            if (!interactionTypes[type]) {
                interactionTypes[type] = { total: 0, successful: 0, failed: 0 };
                confidenceByType[type] = [];
                processingTimeByType[type] = [];
            }
            
            interactionTypes[type].total++;
            if (interaction.success) {
                interactionTypes[type].successful++;
                if (interaction.confidence_score) {
                    confidenceByType[type].push(interaction.confidence_score);
                }
                if (interaction.processing_time_ms) {
                    processingTimeByType[type].push(interaction.processing_time_ms);
                }
            } else {
                interactionTypes[type].failed++;
            }
        }
        
        console.log('\\n📊 Interaction Type Analysis:');
        Object.entries(interactionTypes).forEach(([type, stats]) => {
            const successRate = (stats.successful / stats.total * 100).toFixed(1);
            const avgConfidence = confidenceByType[type].length > 0 ? 
                (confidenceByType[type].reduce((a, b) => a + b, 0) / confidenceByType[type].length * 100).toFixed(1) : 'N/A';
            const avgProcessingTime = processingTimeByType[type].length > 0 ?
                (processingTimeByType[type].reduce((a, b) => a + b, 0) / processingTimeByType[type].length).toFixed(0) : 'N/A';
            
            console.log(`   ${type}:`);
            console.log(`      Success Rate: ${successRate}% (${stats.successful}/${stats.total})`);
            console.log(`      Avg Confidence: ${avgConfidence}%`);
            console.log(`      Avg Processing: ${avgProcessingTime}ms`);
        });
    }
    
    async evaluatePromptEffectiveness() {
        console.log('\\n📝 EVALUATING PROMPT EFFECTIVENESS');
        console.log('==================================');
        
        // Analyze stored prompts from recent tests
        const recentPrompts = await this.db.all(`
            SELECT prompt_text, response_text, confidence_score, success, processing_time_ms
            FROM ai_interactions 
            WHERE prompt_text IS NOT NULL AND prompt_text != ''
            ORDER BY timestamp DESC
            LIMIT 20
        `);
        
        console.log(`📋 Analyzing ${recentPrompts.length} recent prompts`);
        
        const promptQualities = [];
        
        for (const prompt of recentPrompts) {
            const quality = this.assessPromptQuality(prompt.prompt_text);
            quality.success = prompt.success;
            quality.confidence = prompt.confidence_score || 0;
            quality.processingTime = prompt.processing_time_ms || 0;
            promptQualities.push(quality);
        }
        
        // Calculate aggregate statistics
        const avgQualityScore = promptQualities.reduce((sum, q) => sum + q.score, 0) / promptQualities.length;
        const highQualityPrompts = promptQualities.filter(q => q.score >= 8).length;
        const lowQualityPrompts = promptQualities.filter(q => q.score <= 5).length;
        
        console.log(`📊 Average Prompt Quality Score: ${avgQualityScore.toFixed(1)}/10`);
        console.log(`✅ High Quality Prompts (8+): ${highQualityPrompts}/${promptQualities.length}`);
        console.log(`⚠️ Low Quality Prompts (≤5): ${lowQualityPrompts}/${promptQualities.length}`);
        
        // Identify common issues
        const allIssues = promptQualities.flatMap(q => q.issues);
        const issueFrequency = {};
        allIssues.forEach(issue => {
            issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
        });
        
        console.log('\\n⚠️ Most Common Prompt Issues:');
        Object.entries(issueFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([issue, count], index) => {
                console.log(`   ${index + 1}. ${issue} (${count} times)`);
            });
        
        // Store analysis results
        this.analysis.promptQuality = {
            averageScore: avgQualityScore,
            highQualityCount: highQualityPrompts,
            lowQualityCount: lowQualityPrompts,
            commonIssues: issueFrequency
        };
    }
    
    assessPromptQuality(promptText) {
        const issues = [];
        const strengths = [];
        let score = 10;
        
        // Check prompt length
        if (promptText.length < 500) {
            issues.push('Prompt too short - may lack context');
            score -= 2;
        } else if (promptText.length > 8000) {
            issues.push('Prompt too long - may hit token limits');
            score -= 1;
        } else {
            strengths.push('Good prompt length');
        }
        
        // Check for enhanced honeypot detection instructions
        if (promptText.includes('HONEYPOT DETECTION') || promptText.includes('honeypot')) {
            strengths.push('Includes honeypot detection guidance');
        } else {
            issues.push('Missing honeypot detection instructions');
            score -= 3;
        }
        
        // Check for specific countermeasure patterns
        const countermeasurePatterns = [
            'display:none', 'visibility:hidden', 'opacity:0',
            'bot', 'spam', 'trap', 'winnie_the_pooh'
        ];
        const mentionedPatterns = countermeasurePatterns.filter(pattern => 
            promptText.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (mentionedPatterns.length >= 5) {
            strengths.push('Comprehensive countermeasure patterns');
        } else if (mentionedPatterns.length >= 3) {
            strengths.push('Good countermeasure coverage');
        } else {
            issues.push('Insufficient countermeasure pattern coverage');
            score -= 2;
        }
        
        // Check for structured output format
        if (promptText.includes('JSON') && promptText.includes('{')) {
            strengths.push('Clear output format specification');
        } else {
            issues.push('No clear output format');
            score -= 2;
        }
        
        // Check for examples
        if (promptText.includes('example') || promptText.includes('Example')) {
            strengths.push('Includes examples');
        } else {
            issues.push('No examples provided');
            score -= 1;
        }
        
        // Check for confidence requirements
        if (promptText.includes('confidence')) {
            strengths.push('Requests confidence scores');
        } else {
            issues.push('No confidence scoring requested');
            score -= 1;
        }
        
        // Check for site-specific guidance
        if (promptText.includes('SurveyPlanet') || promptText.includes('Typeform')) {
            strengths.push('Site-specific guidance provided');
        }
        
        return {
            score: Math.max(0, score),
            issues,
            strengths,
            mentionedPatterns: mentionedPatterns.length
        };
    }
    
    async generateImprovementRecommendations() {
        console.log('\\n💡 GENERATING IMPROVEMENT RECOMMENDATIONS');
        console.log('=========================================');
        
        const recommendations = [];
        
        // Based on honeypot detection performance
        if (this.analysis.honeypotDetectionStats.totalHoneypotsDetected > 0) {
            recommendations.push({
                category: 'Honeypot Detection',
                priority: 'High',
                recommendation: `Excellent honeypot detection performance! ${this.analysis.honeypotDetectionStats.totalHoneypotsDetected} honeypots detected across ${this.analysis.honeypotDetectionStats.sitesWithHoneypots} sites.`,
                action: 'Continue using current enhanced detection patterns and expand to more sites.'
            });
        } else {
            recommendations.push({
                category: 'Honeypot Detection',
                priority: 'Critical',
                recommendation: 'No honeypots detected in recent tests. This could indicate either very clean sites or detection issues.',
                action: 'Test on known honeypot-containing sites and verify detection algorithms.'
            });
        }
        
        // Based on confidence scores
        if (this.analysis.averageConfidence < 0.7) {
            recommendations.push({
                category: 'Confidence Scoring',
                priority: 'High',
                recommendation: `Low average confidence (${(this.analysis.averageConfidence * 100).toFixed(1)}%). This suggests uncertainty in analysis.`,
                action: 'Improve prompt clarity and add more specific guidance for confidence assessment.'
            });
        }
        
        // Based on processing time
        if (this.analysis.averageProcessingTime > 30000) {
            recommendations.push({
                category: 'Performance',
                priority: 'Medium',
                recommendation: `High processing times (${(this.analysis.averageProcessingTime / 1000).toFixed(1)}s average). This may impact user experience.`,
                action: 'Optimize prompts for faster processing and consider prompt length reduction.'
            });
        }
        
        // Based on prompt issues
        if (this.analysis.promptIssues.length > 0) {
            recommendations.push({
                category: 'Prompt Quality',
                priority: 'High',
                recommendation: `${this.analysis.promptIssues.length} prompt issues identified, including fallback usage.`,
                action: 'Review and improve prompt generation logic to reduce fallback reliance.'
            });
        }
        
        // Display recommendations
        recommendations.forEach((rec, index) => {
            console.log(`\\n${index + 1}. ${rec.category} (${rec.priority} Priority)`);
            console.log(`   📋 ${rec.recommendation}`);
            console.log(`   🎯 Action: ${rec.action}`);
        });
        
        this.analysis.recommendations = recommendations;
    }
    
    async generateComprehensiveReport() {
        console.log('\\n📄 COMPREHENSIVE EFFECTIVENESS REPORT');
        console.log('======================================');
        
        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalTests: this.analysis.totalInteractions,
                successRate: (this.analysis.successfulInteractions / this.analysis.totalInteractions * 100).toFixed(1) + '%',
                averageConfidence: (this.analysis.averageConfidence * 100).toFixed(1) + '%',
                averageProcessingTime: this.analysis.averageProcessingTime.toFixed(0) + 'ms'
            },
            honeypotDetection: this.analysis.honeypotDetectionStats,
            promptQuality: this.analysis.promptQuality,
            recommendations: this.analysis.recommendations,
            keyFindings: [
                `Enhanced honeypot detection successfully identified ${this.analysis.honeypotDetectionStats.totalHoneypotsDetected} potential threats`,
                `System shows ${((this.analysis.successfulInteractions / this.analysis.totalInteractions) * 100).toFixed(1)}% success rate in form analysis`,
                `Most common detection patterns: ${Object.keys(this.analysis.honeypotDetectionStats.detectionPatterns).slice(0, 3).join(', ')}`,
                `Average confidence suggests ${this.analysis.averageConfidence > 0.7 ? 'high' : 'moderate'} analysis certainty`
            ]
        };
        
        // Store report in database
        try {
            await this.db.run(`
                INSERT INTO ai_interactions (
                    interaction_type, prompt_text, response_text, 
                    success, confidence_score, form_analysis_context
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'prompt_effectiveness_report',
                'Comprehensive prompt effectiveness analysis',
                JSON.stringify(report),
                1,
                this.analysis.averageConfidence,
                JSON.stringify({ 
                    reportType: 'comprehensive_effectiveness_analysis',
                    analysisDate: report.generatedAt
                })
            ]);
            
            console.log('\\n💾 Report stored in database');
            
        } catch (error) {
            console.log(`⚠️ Failed to store report: ${error.message}`);
        }
        
        // Display summary
        console.log('\\n📊 EXECUTIVE SUMMARY');
        console.log('====================');
        console.log(`📈 Success Rate: ${report.summary.successRate}`);
        console.log(`🎯 Average Confidence: ${report.summary.averageConfidence}`);
        console.log(`⏱️ Average Processing Time: ${report.summary.averageProcessingTime}`);
        console.log(`🛡️ Honeypots Detected: ${this.analysis.honeypotDetectionStats.totalHoneypotsDetected}`);
        console.log(`🎯 Key Achievements:`);
        report.keyFindings.forEach((finding, index) => {
            console.log(`   ${index + 1}. ${finding}`);
        });
        
        console.log('\\n✅ Analysis Complete!');
    }
    
    async cleanup() {
        if (this.db) await this.db.close();
        console.log('🧹 Cleanup completed');
    }
}

// Run the analysis
async function runPromptEffectivenessAnalysis() {
    const analyzer = new PromptEffectivenessAnalyzer();
    
    try {
        await analyzer.initialize();
        await analyzer.runComprehensiveAnalysis();
        
    } catch (error) {
        console.error('💥 Analysis failed:', error);
    } finally {
        await analyzer.cleanup();
    }
}

if (require.main === module) {
    runPromptEffectivenessAnalysis().catch(console.error);
}

module.exports = PromptEffectivenessAnalyzer;