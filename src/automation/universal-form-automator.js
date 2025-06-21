/**
 * Universal Form Automator
 * 
 * The complete integration of LLM-based form analysis and smart form filling.
 * This is the main class that provides simple methods to automate any form on any website.
 */

const UniversalFormAnalyzer = require('../ai/universal-form-analyzer');
const SmartFormFiller = require('./smart-form-filler');

class UniversalFormAutomator {
    constructor(contentAI, options = {}) {
        this.contentAI = contentAI;
        this.options = {
            debugMode: true,
            cacheAnalysis: true,
            retryOnFailure: true,
            humanLikeDelays: true,
            avoidHoneypots: true,
            ...options
        };
        
        this.analyzer = new UniversalFormAnalyzer(contentAI, {
            debugMode: this.options.debugMode,
            enableHoneypotDetection: this.options.avoidHoneypots
        });
        
        this.log('🚀 Universal Form Automator initialized');
    }

    /**
     * The main method: Analyze and fill any form on any page
     * 
     * @param {Page} page - Playwright page object
     * @param {Object} userData - User data for form filling
     * @param {string} siteName - Name of the site for caching
     * @param {Object} options - Additional options
     */
    async autoFillForm(page, userData, siteName = 'unknown', options = {}) {
        this.log(`🎯 Starting universal form automation for ${siteName}`);
        
        try {
            // Step 1: Analyze the page with LLM
            this.log('🧠 Step 1: Analyzing page with LLM...');
            const analysis = await this.analyzer.analyzePage(page, siteName, options);
            
            if (!analysis || analysis.fields.length === 0) {
                throw new Error('No fillable fields found on the page');
            }
            
            this.log(`📊 Analysis complete: ${analysis.fields.length} fields, ${analysis.checkboxes?.length || 0} checkboxes, ${analysis.honeypots?.length || 0} honeypots identified`);
            
            // Step 2: Create smart form filler
            this.log('🤖 Step 2: Initializing smart form filler...');
            const filler = new SmartFormFiller(page, analysis, {
                humanLikeDelays: this.options.humanLikeDelays,
                debugMode: this.options.debugMode,
                skipHoneypots: this.options.avoidHoneypots
            });
            
            // Step 3: Fill the form intelligently
            this.log('📝 Step 3: Filling form with human-like behavior...');
            const fillResult = await filler.fillForm(userData);
            
            // Step 4: Submit if requested
            if (options.autoSubmit !== false) {
                this.log('📤 Step 4: Submitting form...');
                await filler.submitForm();
            }
            
            const result = {
                success: true,
                analysis: analysis,
                fillResults: fillResult,
                summary: {
                    fieldsProcessed: fillResult.fieldsProcessed,
                    checkboxesProcessed: fillResult.checkboxesProcessed,
                    honepotsAvoided: fillResult.honeypotsSKipped,
                    validationErrors: fillResult.validationErrors,
                    submitted: options.autoSubmit !== false
                }
            };
            
            this.log('✅ Universal form automation completed successfully');
            this.logSummary(result.summary);
            
            return result;
            
        } catch (error) {
            this.log(`❌ Form automation failed: ${error.message}`);
            
            if (this.options.retryOnFailure) {
                this.log('🔄 Retrying with fallback methods...');
                return await this.retryWithFallback(page, userData, siteName, options);
            }
            
            throw error;
        }
    }

    /**
     * Just analyze a form without filling it
     */
    async analyzeForm(page, siteName = 'unknown') {
        this.log(`🔍 Analyzing form on ${siteName}...`);
        
        const analysis = await this.analyzer.analyzePage(page, siteName);
        
        this.log(`📊 Analysis complete for ${siteName}:`);
        this.log(`   📝 Fields found: ${analysis.fields.length}`);
        this.log(`   ☑️ Checkboxes found: ${analysis.checkboxes?.length || 0}`);
        this.log(`   🍯 Honeypots detected: ${analysis.honeypots?.length || 0}`);
        this.log(`   🎯 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        
        return analysis;
    }

    /**
     * Fill specific fields by purpose
     */
    async fillSpecificFields(page, fieldPurposes, userData, siteName = 'unknown') {
        this.log(`📝 Filling specific fields: ${fieldPurposes.join(', ')}`);
        
        const analysis = await this.analyzer.analyzePage(page, siteName);
        const filler = new SmartFormFiller(page, analysis, this.options);
        
        // Filter fields to only the requested purposes
        const filteredAnalysis = {
            ...analysis,
            fields: analysis.fields.filter(field => fieldPurposes.includes(field.purpose))
        };
        
        const filteredFiller = new SmartFormFiller(page, filteredAnalysis, this.options);
        return await filteredFiller.fillAllFields(userData);
    }

    /**
     * Check what honeypots exist on a page (for debugging/research)
     */
    async detectHoneypots(page, siteName = 'unknown') {
        this.log(`🍯 Detecting honeypots on ${siteName}...`);
        
        const analysis = await this.analyzer.analyzePage(page, siteName);
        const honeypots = analysis.honeypots || [];
        
        this.log(`🍯 Found ${honeypots.length} honeypots:`);
        honeypots.forEach((honeypot, i) => {
            this.log(`   ${i + 1}. ${honeypot.selector} (${honeypot.trapType}) - ${honeypot.reasoning}`);
        });
        
        return honeypots;
    }

    /**
     * Test form filling without actually submitting
     */
    async testFormFilling(page, userData, siteName = 'unknown') {
        this.log(`🧪 Testing form filling on ${siteName}...`);
        
        return await this.autoFillForm(page, userData, siteName, { 
            autoSubmit: false 
        });
    }

    /**
     * Get a summary of what the automator would do (without actually doing it)
     */
    async previewFormAutomation(page, userData, siteName = 'unknown') {
        this.log(`👁️ Previewing form automation for ${siteName}...`);
        
        const analysis = await this.analyzer.analyzePage(page, siteName);
        
        const preview = {
            siteName: siteName,
            pageType: analysis.pageType,
            formStrategy: analysis.formStrategy,
            confidence: analysis.confidence,
            
            fieldsToFill: analysis.fields.map(field => ({
                purpose: field.purpose,
                selector: field.selector,
                value: this.previewValue(field.purpose, userData),
                importance: field.importance,
                isHoneypot: this.isFieldHoneypot(field, analysis.honeypots)
            })),
            
            checkboxesToHandle: (analysis.checkboxes || []).map(checkbox => ({
                purpose: checkbox.purpose,
                selector: checkbox.selector,
                action: checkbox.action,
                importance: checkbox.importance
            })),
            
            honepotsToAvoid: (analysis.honeypots || []).map(honeypot => ({
                selector: honeypot.selector,
                trapType: honeypot.trapType,
                reasoning: honeypot.reasoning
            })),
            
            submitButton: analysis.submitButton
        };
        
        this.log('👁️ Preview generated:');
        this.log(`   📝 Will fill ${preview.fieldsToFill.filter(f => !f.isHoneypot).length} fields`);
        this.log(`   ☑️ Will handle ${preview.checkboxesToHandle.length} checkboxes`);
        this.log(`   🍯 Will avoid ${preview.honepotsToAvoid.length} honeypots`);
        
        return preview;
    }

    /**
     * Retry with fallback methods
     */
    async retryWithFallback(page, userData, siteName, options) {
        this.log('🔄 Attempting fallback automation...');
        
        try {
            // Use fallback analysis
            const fallbackAnalysis = await this.analyzer.performFallbackAnalysis(page, siteName);
            
            const filler = new SmartFormFiller(page, fallbackAnalysis, {
                ...this.options,
                retryOnValidationErrors: false // Avoid infinite loops
            });
            
            const fillResult = await filler.fillForm(userData);
            
            return {
                success: true,
                fallback: true,
                analysis: fallbackAnalysis,
                fillResults: fillResult
            };
            
        } catch (fallbackError) {
            this.log(`❌ Fallback also failed: ${fallbackError.message}`);
            throw new Error(`Both primary and fallback automation failed. Last error: ${fallbackError.message}`);
        }
    }

    /**
     * Helper: Check if a field is a honeypot
     */
    isFieldHoneypot(field, honeypots) {
        if (!honeypots) return false;
        return honeypots.some(h => h.selector === field.selector);
    }

    /**
     * Helper: Preview what value would be used for a field
     */
    previewValue(purpose, userData) {
        const filler = new SmartFormFiller(null, null, this.options);
        return filler.generateFieldValue(purpose, userData, { type: 'text' });
    }

    /**
     * Log summary of automation results
     */
    logSummary(summary) {
        this.log('📊 AUTOMATION SUMMARY:');
        this.log(`   ✅ Fields processed: ${summary.fieldsProcessed}`);
        this.log(`   ☑️ Checkboxes handled: ${summary.checkboxesProcessed}`);
        this.log(`   🍯 Honeypots avoided: ${summary.honepotsAvoided}`);
        this.log(`   ⚠️ Validation errors: ${summary.validationErrors}`);
        this.log(`   📤 Form submitted: ${summary.submitted ? 'Yes' : 'No'}`);
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[UniversalFormAutomator] ${message}`);
        }
    }
}

module.exports = UniversalFormAutomator;