#!/usr/bin/env node

/**
 * LLM Prompt Analysis Tool
 * Examines logged LLM interactions to improve prompt effectiveness
 */

const { getDatabaseManager } = require('./src/database/database-manager');

class LLMPromptAnalyzer {
    constructor() {
        this.db = null;
        this.analysis = {
            totalInteractions: 0,
            successfulInteractions: 0,
            failedInteractions: 0,
            avgConfidence: 0,
            commonIssues: [],
            promptPatterns: {},
            improvements: []
        };
    }
    
    async initialize() {
        this.db = getDatabaseManager();
        await this.db.initialize();
        console.log('📊 Database connected for LLM analysis');
    }
    
    async analyzeAllInteractions() {
        console.log('🧠 ANALYZING LLM PROMPT EFFECTIVENESS');
        console.log('====================================');
        
        try {
            // Get all AI interactions
            const interactions = await this.db.all(`
                SELECT * FROM ai_interactions 
                ORDER BY timestamp DESC
            `);
            
            console.log(`📋 Found ${interactions.length} LLM interactions to analyze`);
            
            if (interactions.length === 0) {
                console.log('⚠️ No LLM interactions found. Running sample analysis...');
                await this.analyzeSamplePrompts();
                return;
            }
            
            this.analysis.totalInteractions = interactions.length;
            
            // Analyze each interaction
            for (const interaction of interactions) {
                await this.analyzeInteraction(interaction);
            }
            
            // Generate insights
            await this.generateInsights();
            
            // Create improved prompts
            await this.generateImprovedPrompts();
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
        }
    }
    
    async analyzeInteraction(interaction) {
        console.log(`\n🔍 Analyzing interaction ${interaction.id}:`);
        console.log(`   Type: ${interaction.interaction_type}`);
        console.log(`   Success: ${interaction.success ? '✅' : '❌'}`);
        console.log(`   Confidence: ${interaction.confidence_score || 'N/A'}`);
        
        if (interaction.success) {
            this.analysis.successfulInteractions++;
        } else {
            this.analysis.failedInteractions++;
            
            // Analyze failure reasons
            await this.analyzeFailureReasons(interaction);
        }
        
        // Analyze prompt patterns
        this.analyzePromptStructure(interaction);
        
        // Check response quality
        this.analyzeResponseQuality(interaction);
    }
    
    async analyzeFailureReasons(interaction) {
        console.log(`   📋 Failure analysis:`);
        
        const prompt = interaction.prompt_text || '';
        const response = interaction.response_text || '';
        
        // Common failure patterns
        const issues = [];
        
        if (prompt.length > 4000) {
            issues.push('Prompt too long - may cause truncation');
        }
        
        if (prompt.length < 100) {
            issues.push('Prompt too short - lacks context');
        }
        
        if (!prompt.includes('JSON')) {
            issues.push('No clear output format specification');
        }
        
        if (!prompt.includes('example')) {
            issues.push('No examples provided');
        }
        
        if (response.includes('error') || response.includes('Error')) {
            issues.push('Response contains error indicators');
        }
        
        issues.forEach(issue => {
            console.log(`      • ${issue}`);
            if (!this.analysis.commonIssues.includes(issue)) {
                this.analysis.commonIssues.push(issue);
            }
        });
    }
    
    analyzePromptStructure(interaction) {
        const prompt = interaction.prompt_text || '';
        
        // Identify prompt patterns
        const patterns = {
            hasRole: prompt.includes('You are') || prompt.includes('expert'),
            hasContext: prompt.includes('HTML') || prompt.includes('website'),
            hasFormat: prompt.includes('JSON') || prompt.includes('format'),
            hasExamples: prompt.includes('example') || prompt.includes('Example'),
            hasConstraints: prompt.includes('must') || prompt.includes('required'),
            hasSteps: prompt.includes('Step') || prompt.includes('1.') || prompt.includes('First')
        };
        
        // Store pattern analysis
        Object.entries(patterns).forEach(([pattern, present]) => {
            if (!this.analysis.promptPatterns[pattern]) {
                this.analysis.promptPatterns[pattern] = { present: 0, absent: 0 };
            }
            
            if (present) {
                this.analysis.promptPatterns[pattern].present++;
            } else {
                this.analysis.promptPatterns[pattern].absent++;
            }
        });
    }
    
    analyzeResponseQuality(interaction) {
        const response = interaction.response_text || '';
        const confidence = interaction.confidence_score || 0;
        
        this.analysis.avgConfidence = 
            (this.analysis.avgConfidence * (this.analysis.totalInteractions - 1) + confidence) / 
            this.analysis.totalInteractions;
        
        // Check response structure
        let isValidJSON = false;
        try {
            JSON.parse(response);
            isValidJSON = true;
        } catch (e) {
            // Not valid JSON
        }
        
        console.log(`   📄 Response quality:`);
        console.log(`      Valid JSON: ${isValidJSON ? '✅' : '❌'}`);
        console.log(`      Length: ${response.length} characters`);
        console.log(`      Confidence: ${confidence}`);
    }
    
    async generateInsights() {
        console.log('\n📊 PROMPT EFFECTIVENESS ANALYSIS');
        console.log('=================================');
        
        const successRate = (this.analysis.successfulInteractions / this.analysis.totalInteractions * 100).toFixed(1);
        
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`📊 Average Confidence: ${this.analysis.avgConfidence.toFixed(2)}`);
        console.log(`✅ Successful: ${this.analysis.successfulInteractions}`);
        console.log(`❌ Failed: ${this.analysis.failedInteractions}`);
        
        console.log('\n🔍 Common Issues Identified:');
        this.analysis.commonIssues.forEach(issue => {
            console.log(`   • ${issue}`);
        });
        
        console.log('\n📋 Prompt Pattern Analysis:');
        Object.entries(this.analysis.promptPatterns).forEach(([pattern, stats]) => {
            const total = stats.present + stats.absent;
            const percentage = total > 0 ? (stats.present / total * 100).toFixed(1) : 0;
            console.log(`   ${pattern}: ${percentage}% (${stats.present}/${total})`);
        });
    }
    
    async generateImprovedPrompts() {
        console.log('\n🚀 IMPROVED PROMPT TEMPLATES');
        console.log('=============================');
        
        // Create improved form analysis prompt
        const improvedFormPrompt = this.createImprovedFormAnalysisPrompt();
        console.log('\n📝 Improved Form Analysis Prompt:');
        console.log('─'.repeat(50));
        console.log(improvedFormPrompt);
        
        // Save improved prompts to database
        await this.saveImprovedPrompts(improvedFormPrompt);
        
        // Generate recommendations
        this.generateRecommendations();
    }
    
    createImprovedFormAnalysisPrompt() {
        return `# 🎯 Expert Form Analysis Specialist

You are a world-class web form analysis expert specializing in automated form filling. Your task is to analyze HTML content and identify ALL fillable form fields with perfect accuracy.

## 🎯 CRITICAL SUCCESS FACTORS:
1. **ACCURACY**: Identify every single fillable field
2. **PRECISION**: Provide working CSS selectors
3. **COMPLETENESS**: Include all field types (text, email, password, etc.)
4. **SAFETY**: Detect and avoid honeypot traps

## 📋 ANALYSIS INSTRUCTIONS:

### Step 1: Scan for Form Elements
- Look for \`<form>\` tags and their contents
- Identify ALL \`<input>\`, \`<textarea>\`, \`<select>\` elements
- Check for fields outside forms (modern SPAs)

### Step 2: Classify Each Field
- **Email fields**: type="email", name contains "email", placeholder mentions email
- **Password fields**: type="password" 
- **Name fields**: name/placeholder contains "name", "first", "last"
- **Text fields**: type="text" or no type specified
- **Hidden fields**: type="hidden" (potential honeypots)

### Step 3: Honeypot Detection
- Fields with display:none or visibility:hidden
- Fields positioned off-screen (left: -9999px)
- Fields with suspicious names (company, website, url)
- Fields with tabindex="-1"

### Step 4: Generate Selectors
- Use specific CSS selectors that target visible elements
- Prefer ID selectors, then name, then type
- Add :visible pseudo-selector when needed

## 📤 REQUIRED OUTPUT FORMAT:

\`\`\`json
{
  "analysis_confidence": 0.95,
  "form_detected": true,
  "fields": [
    {
      "selector": "#email",
      "type": "email", 
      "purpose": "email_address",
      "label": "Email Address",
      "required": true,
      "placeholder": "Enter your email",
      "confidence": 0.98,
      "reasoning": "Clear email input with proper validation"
    }
  ],
  "checkboxes": [
    {
      "selector": "#terms",
      "purpose": "terms_agreement",
      "label": "I agree to terms",
      "required": true,
      "confidence": 0.95
    }
  ],
  "honeypots": [
    {
      "selector": "#company",
      "reason": "Hidden field with suspicious name",
      "confidence": 0.90
    }
  ],
  "submit_button": "#submit-btn",
  "form_container": "#registration-form"
}
\`\`\`

## 🎯 QUALITY REQUIREMENTS:
- **Confidence scores**: Always provide 0.0-1.0 confidence
- **Working selectors**: Test-ready CSS selectors
- **Complete reasoning**: Explain your decisions
- **Honeypot safety**: Flag all suspicious fields
- **Field coverage**: Find every fillable element

## 📋 HTML TO ANALYZE:
{HTML_CONTENT}

Analyze this HTML and provide the complete JSON response following the exact format above.`;
    }
    
    async saveImprovedPrompts(formPrompt) {
        try {
            // Save to prompt templates table
            await this.db.run(`
                INSERT OR REPLACE INTO llm_prompt_templates 
                (template_name, template_version, prompt_category, prompt_template, expected_response_format, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'improved_form_analysis',
                '2.0',
                'form_analysis',
                formPrompt,
                JSON.stringify({
                    type: 'object',
                    required: ['analysis_confidence', 'fields', 'checkboxes', 'honeypots']
                }),
                1
            ]);
            
            console.log('✅ Improved prompts saved to database');
            
        } catch (error) {
            console.log(`⚠️ Failed to save prompts: ${error.message}`);
        }
    }
    
    generateRecommendations() {
        console.log('\n💡 PROMPT IMPROVEMENT RECOMMENDATIONS');
        console.log('====================================');
        
        const recommendations = [
            '🎯 **Structure**: Use clear role definition + context + instructions + format',
            '📋 **Examples**: Always include concrete examples of desired output',
            '🔍 **Specificity**: Provide detailed field detection criteria',
            '⚡ **Confidence**: Require confidence scores for all identifications',
            '🛡️ **Safety**: Emphasize honeypot detection and avoidance',
            '📊 **Format**: Use structured JSON with consistent field names',
            '🧠 **Reasoning**: Ask for explanations of decisions',
            '✅ **Validation**: Include format validation requirements',
            '🎨 **Clarity**: Use emojis and formatting for better readability',
            '🔄 **Iteration**: Test prompts and refine based on results'
        ];
        
        recommendations.forEach(rec => console.log(`   ${rec}`));
        
        console.log('\n🚀 Next Steps:');
        console.log('   1. Test improved prompts on real sites');
        console.log('   2. Measure improvement in accuracy');
        console.log('   3. Iterate based on results');
        console.log('   4. Create prompt templates for different scenarios');
    }
    
    async analyzeSamplePrompts() {
        console.log('\n📝 ANALYZING CURRENT PROMPT PATTERNS');
        console.log('===================================');
        
        // Analyze prompts from our codebase
        const samplePrompts = await this.findPromptsInCode();
        
        for (const prompt of samplePrompts) {
            console.log(`\n🔍 Analyzing: ${prompt.source}`);
            console.log(`📏 Length: ${prompt.content.length} characters`);
            
            // Analyze prompt quality
            const quality = this.assessPromptQuality(prompt.content);
            console.log(`📊 Quality Score: ${quality.score}/10`);
            
            quality.issues.forEach(issue => {
                console.log(`   ⚠️ ${issue}`);
            });
            
            quality.strengths.forEach(strength => {
                console.log(`   ✅ ${strength}`);
            });
        }
    }
    
    async findPromptsInCode() {
        // Sample prompts from our codebase analysis
        return [
            {
                source: 'Form Analysis (test-real-automation.js)',
                content: `# Advanced Form Analysis Expert

Analyze this HTML content from {url} to identify all form fields that need to be filled for registration.

## HTML Content (relevant sections):
{html}

## Analysis Requirements:

Provide your analysis in JSON format:
{
  "fields": [
    {
      "selector": "CSS selector for the field",
      "type": "input type (text, email, password, etc.)",
      "purpose": "what this field is for (name, email, password, etc.)",
      "required": true/false,
      "confidence": 0.9
    }
  ]
}`
            },
            {
                source: 'Failure Analysis (intelligent-failure-analyzer.js)',
                content: `# 🔍 Intelligent Failure Analysis Expert

You are an expert automation failure analyst. Analyze this failure scenario and provide comprehensive root cause analysis.

## 🎯 FAILURE SCENARIO
**Failure Type**: {type}
**Error**: {error}

## 📋 ANALYSIS REQUIREMENTS
Provide your analysis in JSON format with root cause identification.`
            }
        ];
    }
    
    assessPromptQuality(prompt) {
        const issues = [];
        const strengths = [];
        let score = 10;
        
        // Check length
        if (prompt.length < 200) {
            issues.push('Prompt too short - lacks sufficient context');
            score -= 2;
        } else if (prompt.length > 3000) {
            issues.push('Prompt too long - may hit token limits');
            score -= 1;
        } else {
            strengths.push('Good prompt length');
        }
        
        // Check structure
        if (prompt.includes('You are') || prompt.includes('expert')) {
            strengths.push('Clear role definition');
        } else {
            issues.push('Missing clear role definition');
            score -= 1;
        }
        
        // Check format specification
        if (prompt.includes('JSON')) {
            strengths.push('Specifies output format');
        } else {
            issues.push('No clear output format');
            score -= 2;
        }
        
        // Check for examples
        if (prompt.includes('example') || prompt.includes('Example')) {
            strengths.push('Includes examples');
        } else {
            issues.push('No examples provided');
            score -= 1;
        }
        
        // Check for requirements
        if (prompt.includes('required') || prompt.includes('must')) {
            strengths.push('Clear requirements');
        } else {
            issues.push('Vague requirements');
            score -= 1;
        }
        
        return { score: Math.max(0, score), issues, strengths };
    }
    
    async cleanup() {
        if (this.db) {
            await this.db.close();
        }
    }
}

// Run the analysis
async function runAnalysis() {
    const analyzer = new LLMPromptAnalyzer();
    
    try {
        await analyzer.initialize();
        await analyzer.analyzeAllInteractions();
        
    } catch (error) {
        console.error('💥 Analysis failed:', error);
    } finally {
        await analyzer.cleanup();
    }
}

if (require.main === module) {
    runAnalysis().catch(console.error);
}

module.exports = LLMPromptAnalyzer;