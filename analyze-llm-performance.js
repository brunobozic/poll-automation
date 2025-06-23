#!/usr/bin/env node

/**
 * Analyze LLM Performance and Improve Prompts
 * Examine logged LLM interactions to identify improvement opportunities
 */

require('dotenv').config();

const { getLogger } = require('./src/utils/enhanced-logger');
const RegistrationLogger = require('./src/database/registration-logger');
const fs = require('fs').promises;
const path = require('path');

async function analyzeLLMPerformance() {
    const logger = getLogger({ logLevel: 'debug' });
    
    console.log('🔍 ANALYZING LLM PERFORMANCE FROM DATABASE');
    console.log('==========================================');
    
    try {
        const registrationLogger = new RegistrationLogger();
        await registrationLogger.initialize();
        
        // Get all LLM interactions
        console.log('\n📊 QUERYING LLM INTERACTION DATA');
        console.log('=================================');
        
        const allInteractions = await registrationLogger.allQuery(`
            SELECT 
                id,
                created_at,
                prompt,
                response,
                model_used,
                tokens_used,
                cost_usd,
                processing_time_ms,
                success,
                error_message
            FROM ai_interactions 
            WHERE created_at > datetime('now', '-24 hours')
            ORDER BY created_at DESC
        `);
        
        console.log(`✅ Found ${allInteractions.length} LLM interactions in last 24 hours`);
        
        // Try to get enhanced interactions (table might not exist)
        let enhancedInteractions = [];
        try {
            enhancedInteractions = await registrationLogger.allQuery(`
                SELECT 
                    id,
                    created_at,
                    'enhanced' as interaction_type,
                    prompt,
                    response,
                    model_used as model,
                    tokens_used as tokens,
                    cost_usd as cost,
                    success,
                    '' as context,
                    '' as metadata
                FROM ai_interactions 
                WHERE created_at > datetime('now', '-24 hours')
                AND model_used IS NOT NULL
                ORDER BY created_at DESC
            `);
        } catch (error) {
            console.log('⚠️ Enhanced interactions table not available, using basic data');
        }
        
        console.log(`✅ Found ${enhancedInteractions.length} enhanced LLM interactions`);
        
        // Analyze performance metrics
        console.log('\n📈 PERFORMANCE ANALYSIS');
        console.log('=======================');
        
        const stats = {
            totalInteractions: allInteractions.length + enhancedInteractions.length,
            successfulInteractions: allInteractions.filter(i => i.success).length + enhancedInteractions.filter(i => i.success).length,
            totalTokens: allInteractions.reduce((sum, i) => sum + (i.tokens_used || 0), 0) + enhancedInteractions.reduce((sum, i) => sum + (i.tokens || 0), 0),
            totalCost: allInteractions.reduce((sum, i) => sum + (i.cost_usd || 0), 0) + enhancedInteractions.reduce((sum, i) => sum + (i.cost || 0), 0),
            avgProcessingTime: allInteractions.reduce((sum, i) => sum + (i.processing_time_ms || 0), 0) / allInteractions.length,
            modelUsage: {}
        };
        
        // Analyze model usage
        [...allInteractions, ...enhancedInteractions].forEach(interaction => {
            const model = interaction.model_used || interaction.model || 'unknown';
            if (!stats.modelUsage[model]) {
                stats.modelUsage[model] = { count: 0, tokens: 0, cost: 0 };
            }
            stats.modelUsage[model].count++;
            stats.modelUsage[model].tokens += (interaction.tokens_used || interaction.tokens || 0);
            stats.modelUsage[model].cost += (interaction.cost_usd || interaction.cost || 0);
        });
        
        console.log(`📊 Total interactions: ${stats.totalInteractions}`);
        console.log(`✅ Success rate: ${((stats.successfulInteractions / stats.totalInteractions) * 100).toFixed(1)}%`);
        console.log(`💰 Total tokens: ${stats.totalTokens.toLocaleString()}`);
        console.log(`💸 Total cost: $${stats.totalCost.toFixed(4)}`);
        console.log(`⏱️ Avg processing time: ${Math.round(stats.avgProcessingTime)}ms`);
        
        console.log('\n🤖 MODEL USAGE BREAKDOWN:');
        Object.entries(stats.modelUsage).forEach(([model, data]) => {
            console.log(`   ${model}:`);
            console.log(`     🔄 Calls: ${data.count}`);
            console.log(`     💰 Tokens: ${data.tokens.toLocaleString()}`);
            console.log(`     💸 Cost: $${data.cost.toFixed(4)}`);
            console.log(`     📊 Avg tokens/call: ${Math.round(data.tokens / data.count)}`);
        });
        
        // Analyze prompt patterns
        console.log('\n🔍 PROMPT ANALYSIS');
        console.log('==================');
        
        const promptAnalysis = {
            commonPhrases: {},
            promptLengths: [],
            responseQualities: {},
            errorPatterns: []
        };
        
        allInteractions.forEach(interaction => {
            if (interaction.prompt) {
                promptAnalysis.promptLengths.push(interaction.prompt.length);
                
                // Analyze common phrases
                const phrases = interaction.prompt.toLowerCase().match(/\b\w{4,}\b/g) || [];
                phrases.forEach(phrase => {
                    promptAnalysis.commonPhrases[phrase] = (promptAnalysis.commonPhrases[phrase] || 0) + 1;
                });
                
                // Analyze response quality indicators
                if (interaction.response) {
                    const hasJson = interaction.response.includes('{') && interaction.response.includes('}');
                    const hasFields = interaction.response.toLowerCase().includes('fields');
                    const hasConfidence = interaction.response.toLowerCase().includes('confidence');
                    
                    promptAnalysis.responseQualities[interaction.id] = {
                        hasJson,
                        hasFields,
                        hasConfidence,
                        responseLength: interaction.response.length,
                        success: interaction.success
                    };
                }
                
                if (!interaction.success && interaction.error_message) {
                    promptAnalysis.errorPatterns.push(interaction.error_message);
                }
            }
        });
        
        const avgPromptLength = promptAnalysis.promptLengths.reduce((a, b) => a + b, 0) / promptAnalysis.promptLengths.length;
        console.log(`📏 Average prompt length: ${Math.round(avgPromptLength)} characters`);
        console.log(`📐 Prompt length range: ${Math.min(...promptAnalysis.promptLengths)} - ${Math.max(...promptAnalysis.promptLengths)} chars`);
        
        // Find successful vs failed patterns
        const successfulResponses = Object.values(promptAnalysis.responseQualities).filter(r => r.success);
        const failedResponses = Object.values(promptAnalysis.responseQualities).filter(r => !r.success);
        
        console.log(`✅ Successful responses: ${successfulResponses.length}`);
        console.log(`❌ Failed responses: ${failedResponses.length}`);
        
        if (successfulResponses.length > 0) {
            const successWithJson = successfulResponses.filter(r => r.hasJson).length;
            const successWithFields = successfulResponses.filter(r => r.hasFields).length;
            const successWithConfidence = successfulResponses.filter(r => r.hasConfidence).length;
            
            console.log(`📊 Successful responses with JSON: ${successWithJson}/${successfulResponses.length} (${((successWithJson/successfulResponses.length)*100).toFixed(1)}%)`);
            console.log(`📋 Successful responses with fields: ${successWithFields}/${successfulResponses.length} (${((successWithFields/successfulResponses.length)*100).toFixed(1)}%)`);
            console.log(`🎯 Successful responses with confidence: ${successWithConfidence}/${successfulResponses.length} (${((successWithConfidence/successfulResponses.length)*100).toFixed(1)}%)`);
        }
        
        // Examine actual prompts and responses
        console.log('\n📋 SAMPLE INTERACTIONS');
        console.log('======================');
        
        const recentSuccessful = allInteractions.filter(i => i.success && i.prompt && i.response).slice(0, 3);
        
        recentSuccessful.forEach((interaction, index) => {
            console.log(`\n--- SAMPLE ${index + 1} ---`);
            console.log(`🕐 Time: ${interaction.created_at}`);
            console.log(`🤖 Model: ${interaction.model_used}`);
            console.log(`💰 Tokens: ${interaction.tokens_used}`);
            console.log(`⏱️ Time: ${interaction.processing_time_ms}ms`);
            console.log(`📏 Prompt length: ${interaction.prompt.length} chars`);
            console.log(`📄 Response length: ${interaction.response.length} chars`);
            
            // Show prompt structure
            const promptLines = interaction.prompt.split('\n').filter(line => line.trim());
            console.log(`📝 Prompt structure (${promptLines.length} lines):`);
            promptLines.slice(0, 5).forEach((line, i) => {
                console.log(`   ${i+1}. ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
            });
            if (promptLines.length > 5) {
                console.log(`   ... and ${promptLines.length - 5} more lines`);
            }
            
            // Show response structure
            console.log(`📤 Response preview:`);
            console.log(`   ${interaction.response.substring(0, 200)}${interaction.response.length > 200 ? '...' : ''}`);
        });
        
        // Generate improved prompts
        console.log('\n🚀 GENERATING IMPROVED PROMPTS');
        console.log('==============================');
        
        const improvements = await generateImprovedPrompts(promptAnalysis, stats, allInteractions);
        
        // Save analysis report
        const reportPath = path.join(__dirname, 'llm-analysis-report.json');
        const report = {
            timestamp: new Date().toISOString(),
            statistics: stats,
            promptAnalysis,
            improvements,
            sampleInteractions: recentSuccessful.map(i => ({
                id: i.id,
                model: i.model_used,
                tokens: i.tokens_used,
                processingTime: i.processing_time_ms,
                promptLength: i.prompt.length,
                responseLength: i.response.length,
                success: i.success
            }))
        };
        
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Analysis report saved to: ${reportPath}`);
        
        console.log('\n🎉 LLM PERFORMANCE ANALYSIS COMPLETE');
        console.log('====================================');
        console.log('✅ Database interactions analyzed');
        console.log('✅ Performance metrics calculated');
        console.log('✅ Prompt patterns identified');
        console.log('✅ Improvement recommendations generated');
        
    } catch (error) {
        logger.error('Analysis failed', { error: error.message, stack: error.stack });
        console.log(`💥 Analysis failed: ${error.message}`);
    }
}

async function generateImprovedPrompts(promptAnalysis, stats, interactions) {
    console.log('🔧 Analyzing current prompts for improvement opportunities...');
    
    const improvements = {
        identified_issues: [],
        optimizations: [],
        new_prompts: {}
    };
    
    // Analyze common issues
    if (stats.avgProcessingTime > 10000) {
        improvements.identified_issues.push('High processing time - prompts may be too complex');
        improvements.optimizations.push('Simplify prompts and reduce unnecessary context');
    }
    
    const avgTokensPerCall = stats.totalTokens / stats.totalInteractions;
    if (avgTokensPerCall > 1500) {
        improvements.identified_issues.push('High token usage - prompts may be verbose');
        improvements.optimizations.push('Compress prompts while maintaining effectiveness');
    }
    
    // Check for JSON parsing success
    const jsonFailures = interactions.filter(i => i.response && !i.response.includes('{')).length;
    if (jsonFailures > 0) {
        improvements.identified_issues.push(`${jsonFailures} responses without JSON structure`);
        improvements.optimizations.push('Strengthen JSON format requirements in prompts');
    }
    
    // Generate improved prompts based on analysis
    improvements.new_prompts.form_analysis = `You are an expert web automation specialist. Analyze this HTML form with precision and return ONLY valid JSON.

CRITICAL REQUIREMENTS:
- Return ONLY JSON, no other text
- Always include "confidence" field (0.0-1.0)
- Detect ALL honeypot/trap fields (hidden, off-screen, zero-opacity)
- Identify field purposes from labels, names, and context

HTML FORM:
{HTML_CONTENT}

EXPECTED JSON FORMAT:
{
  "analysis": "Brief form description (max 100 chars)",
  "confidence": 0.95,
  "pageType": "registration|login|survey|contact|other",
  "fields": [
    {
      "purpose": "email|password|firstName|lastName|phone|other",
      "selector": "CSS selector (test with querySelector)",
      "type": "text|email|password|tel|number|url",
      "required": true,
      "label": "Human readable label"
    }
  ],
  "checkboxes": [
    {
      "purpose": "terms|newsletter|notifications|other", 
      "selector": "CSS selector",
      "required": true,
      "label": "Checkbox text"
    }
  ],
  "honeypots": [
    {
      "selector": "CSS selector",
      "reason": "hidden|positioned_offscreen|zero_opacity|suspicious_name"
    }
  ],
  "submitButton": {
    "selector": "CSS selector for submit button",
    "text": "Button text"
  }
}

HONEYPOT DETECTION RULES:
- Fields with display:none, visibility:hidden, opacity:0
- Fields positioned far off-screen (left/top < -1000px)
- Fields with suspicious names: website, url, homepage, bot, spam
- Fields with tabindex="-1"
- Fields inside hidden divs or containers

Respond with JSON only. No markdown, no explanations.`;

    improvements.new_prompts.honeypot_detection = `HONEYPOT DETECTION SPECIALIST

You are analyzing form fields to identify bot traps. Return JSON with honeypot classification.

FORM HTML:
{HTML_CONTENT}

HONEYPOT INDICATORS:
1. CSS hiding: display:none, visibility:hidden, opacity:0
2. Positioning: left/top < -1000px, position absolute off-screen  
3. Size: width/height = 0 or 1px
4. Names: website, url, homepage, bot, spam, trap, honey
5. Accessibility: tabindex="-1", aria-hidden="true"
6. Instructions: "leave blank", "do not fill"

JSON RESPONSE:
{
  "honeypots": [
    {
      "selector": "exact CSS selector",
      "confidence": 0.95,
      "indicators": ["display_none", "suspicious_name"],
      "reasoning": "Hidden field with bot-trap name"
    }
  ],
  "legitimate_fields": [
    {
      "selector": "CSS selector", 
      "purpose": "email|name|password|phone",
      "confidence": 0.90
    }
  ]
}`;

    improvements.new_prompts.field_mapping = `FORM FIELD MAPPER

Map form fields to user data with high accuracy. Return precise JSON.

FORM FIELDS:
{FIELD_DATA}

USER DATA AVAILABLE:
- firstName, lastName, email, password
- phone, address, city, state, zip
- company, title, website

MAPPING RULES:
- Match fields to user data by name, label, placeholder, type
- Handle variations: fname/firstname, email/mail, pwd/password
- Assign confidence based on match quality
- Mark unmappable fields as "skip"

JSON RESPONSE:
{
  "mappings": [
    {
      "selector": "CSS selector",
      "userDataField": "firstName|email|password|skip",
      "confidence": 0.95,
      "reasoning": "Label 'First Name' matches firstName"
    }
  ],
  "fillOrder": ["firstName", "lastName", "email", "password"],
  "estimatedFillTime": 30
}`;

    console.log('✅ Generated 3 improved prompt templates');
    console.log('✅ Identified optimization opportunities');
    console.log('✅ Created specialized prompts for different tasks');
    
    return improvements;
}

// Run the analysis
analyzeLLMPerformance().catch(console.error);