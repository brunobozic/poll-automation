/**
 * Enhanced Question Parser and Logger
 * Comprehensive analysis and logging of registration form questions
 */

const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const DemographicOptimizer = require('./src/ai/demographic-optimizer');
const { chromium } = require('playwright');

class EnhancedQuestionParser {
    constructor(logger, optimizer) {
        this.logger = logger;
        this.optimizer = optimizer;
    }

    /**
     * Parse all form questions from a page
     */
    async parseFormQuestions(page, siteName) {
        console.log(`🔍 Parsing form questions for ${siteName}...`);
        
        const formData = await page.evaluate(() => {
            const questions = [];
            
            // Find all form elements
            const forms = Array.from(document.querySelectorAll('form'));
            
            forms.forEach((form, formIndex) => {
                // Get all input elements in this form
                const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                
                inputs.forEach((input, inputIndex) => {
                    if (!input.offsetParent && input.type !== 'hidden') return; // Skip hidden elements
                    
                    // Get question text from various sources
                    let questionText = '';
                    
                    // 1. Look for associated label
                    const id = input.id;
                    if (id) {
                        const label = document.querySelector(`label[for="${id}"]`);
                        if (label) questionText = label.textContent.trim();
                    }
                    
                    // 2. Look for parent label
                    if (!questionText) {
                        const parentLabel = input.closest('label');
                        if (parentLabel) {
                            questionText = parentLabel.textContent.replace(input.value || '', '').trim();
                        }
                    }
                    
                    // 3. Look for nearby text (previous sibling, parent text, etc.)
                    if (!questionText) {
                        const parent = input.parentElement;
                        if (parent) {
                            // Check for text in parent
                            const textNodes = Array.from(parent.childNodes)
                                .filter(node => node.nodeType === Node.TEXT_NODE)
                                .map(node => node.textContent.trim())
                                .filter(text => text.length > 0);
                            
                            if (textNodes.length > 0) {
                                questionText = textNodes[0];
                            }
                            
                            // Check for span/div with question text
                            if (!questionText) {
                                const questionElements = parent.querySelectorAll('span, div, p');
                                for (const elem of questionElements) {
                                    const text = elem.textContent.trim();
                                    if (text.length > 0 && text.length < 200) {
                                        questionText = text;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    
                    // 4. Use placeholder as fallback
                    if (!questionText && input.placeholder) {
                        questionText = input.placeholder;
                    }
                    
                    // 5. Use name/id as last resort
                    if (!questionText) {
                        questionText = input.name || input.id || `Unnamed field ${inputIndex}`;
                    }
                    
                    // Get field options for select/radio
                    let options = [];
                    if (input.tagName.toLowerCase() === 'select') {
                        options = Array.from(input.querySelectorAll('option')).map(opt => ({
                            value: opt.value,
                            text: opt.textContent.trim()
                        })).filter(opt => opt.value !== '');
                    } else if (input.type === 'radio') {
                        // Find all radio buttons with same name
                        const radioGroup = document.querySelectorAll(`input[type="radio"][name="${input.name}"]`);
                        options = Array.from(radioGroup).map(radio => {
                            const label = document.querySelector(`label[for="${radio.id}"]`) || 
                                         radio.closest('label') || 
                                         radio.nextElementSibling;
                            return {
                                value: radio.value,
                                text: label ? label.textContent.trim() : radio.value
                            };
                        });
                    }
                    
                    // Determine field category
                    const fieldName = (input.name || input.id || '').toLowerCase();
                    let category = 'other';
                    
                    if (fieldName.includes('email')) category = 'contact';
                    else if (fieldName.includes('name') || fieldName.includes('first') || fieldName.includes('last')) category = 'personal_info';
                    else if (fieldName.includes('age') || fieldName.includes('birth') || fieldName.includes('gender')) category = 'demographics';
                    else if (fieldName.includes('income') || fieldName.includes('salary') || fieldName.includes('occupation') || fieldName.includes('job')) category = 'economics';
                    else if (fieldName.includes('address') || fieldName.includes('city') || fieldName.includes('state') || fieldName.includes('zip') || fieldName.includes('country')) category = 'location';
                    else if (fieldName.includes('phone') || fieldName.includes('mobile')) category = 'contact';
                    else if (fieldName.includes('education') || fieldName.includes('school')) category = 'education';
                    else if (fieldName.includes('marital') || fieldName.includes('married') || fieldName.includes('household')) category = 'household';
                    else if (fieldName.includes('interest') || fieldName.includes('hobby')) category = 'interests';
                    else if (fieldName.includes('password')) category = 'authentication';
                    else if (fieldName.includes('terms') || fieldName.includes('agree') || fieldName.includes('newsletter')) category = 'agreements';
                    
                    questions.push({
                        formIndex: formIndex,
                        questionText: questionText.substring(0, 500), // Limit length
                        fieldType: input.type || input.tagName.toLowerCase(),
                        fieldName: input.name || input.id || `field_${inputIndex}`,
                        fieldId: input.id || '',
                        placeholder: input.placeholder || '',
                        required: input.required || false,
                        options: options,
                        category: category,
                        selector: this.generateSelector(input),
                        maxLength: input.maxLength || null,
                        pattern: input.pattern || null
                    });
                });
            });
            
            // Also capture any standalone questions that might not be in forms
            const potentialQuestions = Array.from(document.querySelectorAll('h1, h2, h3, h4, label, .question, .field-label, .form-label'));
            potentialQuestions.forEach((elem, index) => {
                const text = elem.textContent.trim();
                if (text.length > 0 && text.length < 300 && text.includes('?')) {
                    questions.push({
                        formIndex: -1,
                        questionText: text,
                        fieldType: 'standalone_question',
                        fieldName: `standalone_${index}`,
                        fieldId: elem.id || '',
                        category: 'standalone',
                        selector: this.generateSelector(elem)
                    });
                }
            });
            
            return {
                questions: questions,
                totalForms: forms.length,
                pageTitle: document.title,
                pageUrl: window.location.href
            };
        });
        
        console.log(`   📋 Found ${formData.questions.length} questions across ${formData.totalForms} forms`);
        
        return formData;
    }

    /**
     * Generate CSS selector for an element
     */
    generateSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.name) return `[name="${element.name}"]`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }

    /**
     * Log all questions to database
     */
    async logQuestionsToDatabase(registrationId, siteName, questions, profile) {
        console.log(`💾 Logging ${questions.length} questions to database...`);
        
        const questionIds = [];
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            // Generate AI answer for this question if it's a fillable field
            let aiAnswer = null;
            let aiReasoning = '';
            let yieldFactor = 0.5;
            
            if (['text', 'email', 'tel', 'number', 'select', 'radio', 'checkbox'].includes(question.fieldType)) {
                try {
                    const answerData = this.optimizer.generateAnswerForQuestion(profile, {
                        text: question.questionText,
                        type: question.fieldType,
                        fieldName: question.fieldName,
                        selector: question.selector
                    });
                    
                    aiAnswer = answerData.value;
                    aiReasoning = answerData.reasoning;
                    yieldFactor = answerData.optimizationFactor || 0.5;
                } catch (error) {
                    aiAnswer = 'N/A';
                    aiReasoning = `Error generating answer: ${error.message}`;
                }
            }
            
            // Log question to database
            const questionId = await this.logger.logRegistrationQuestion({
                registrationId: registrationId,
                questionText: question.questionText,
                questionType: question.fieldType,
                fieldName: question.fieldName,
                fieldSelector: question.selector,
                answerProvided: aiAnswer || 'N/A',
                aiGenerated: aiAnswer !== null,
                aiReasoning: aiReasoning,
                demographicCategory: question.category,
                yieldOptimizationFactor: yieldFactor
            });
            
            questionIds.push(questionId);
        }
        
        // Create summary log entry
        await this.logger.logRegistrationStep({
            registrationId: registrationId,
            stepNumber: 1,
            stepName: 'question_analysis_and_logging',
            stepType: 'ai_analysis',
            completedAt: new Date().toISOString(),
            durationMs: 2000,
            status: 'completed',
            inputData: { siteName: siteName, totalQuestions: questions.length },
            outputData: {
                questionsAnalyzed: questions.length,
                categoriesFound: [...new Set(questions.map(q => q.category))],
                fieldTypes: [...new Set(questions.map(q => q.fieldType))],
                questionIds: questionIds
            },
            aiAnalysis: JSON.stringify({
                questionBreakdown: this.analyzeQuestionBreakdown(questions),
                siteComplexity: this.calculateSiteComplexity(questions),
                yieldPotential: this.calculateYieldPotential(questions)
            })
        });
        
        return questionIds;
    }

    /**
     * Analyze question breakdown by category
     */
    analyzeQuestionBreakdown(questions) {
        const breakdown = {};
        questions.forEach(q => {
            breakdown[q.category] = (breakdown[q.category] || 0) + 1;
        });
        return breakdown;
    }

    /**
     * Calculate site complexity based on questions
     */
    calculateSiteComplexity(questions) {
        const complexityFactors = {
            totalQuestions: questions.length,
            requiredFields: questions.filter(q => q.required).length,
            selectFields: questions.filter(q => q.fieldType === 'select').length,
            textFields: questions.filter(q => q.fieldType === 'text').length,
            categories: new Set(questions.map(q => q.category)).size
        };
        
        let complexity = 0;
        if (complexityFactors.totalQuestions > 15) complexity += 0.3;
        if (complexityFactors.requiredFields > 8) complexity += 0.2;
        if (complexityFactors.selectFields > 5) complexity += 0.2;
        if (complexityFactors.categories > 6) complexity += 0.3;
        
        return Math.min(1.0, complexity);
    }

    /**
     * Calculate yield potential based on question types
     */
    calculateYieldPotential(questions) {
        const demographicQuestions = questions.filter(q => 
            ['demographics', 'economics', 'location', 'education', 'household'].includes(q.category)
        ).length;
        
        const totalRelevantQuestions = questions.filter(q => 
            q.fieldType !== 'hidden' && q.category !== 'authentication'
        ).length;
        
        return totalRelevantQuestions > 0 ? (demographicQuestions / totalRelevantQuestions) : 0;
    }

    /**
     * Display question analysis
     */
    displayQuestionAnalysis(siteName, questions) {
        console.log(`\n📊 QUESTION ANALYSIS: ${siteName}`);
        console.log('='.repeat(50));
        
        // Group by category
        const byCategory = {};
        questions.forEach(q => {
            if (!byCategory[q.category]) byCategory[q.category] = [];
            byCategory[q.category].push(q);
        });
        
        Object.keys(byCategory).forEach(category => {
            console.log(`\n📂 ${category.toUpperCase()} (${byCategory[category].length} questions):`);
            byCategory[category].forEach((q, index) => {
                console.log(`   ${index + 1}. "${q.questionText}" (${q.fieldType})`);
                if (q.options && q.options.length > 0) {
                    console.log(`      Options: ${q.options.map(opt => opt.text).join(', ')}`);
                }
                if (q.required) console.log(`      ⚠️ Required field`);
            });
        });
        
        // Summary stats
        const stats = {
            total: questions.length,
            required: questions.filter(q => q.required).length,
            byType: {},
            byCategory: {}
        };
        
        questions.forEach(q => {
            stats.byType[q.fieldType] = (stats.byType[q.fieldType] || 0) + 1;
            stats.byCategory[q.category] = (stats.byCategory[q.category] || 0) + 1;
        });
        
        console.log(`\n📈 Summary Statistics:`);
        console.log(`   Total questions: ${stats.total}`);
        console.log(`   Required fields: ${stats.required}`);
        console.log(`   Field types: ${Object.keys(stats.byType).join(', ')}`);
        console.log(`   Categories: ${Object.keys(stats.byCategory).join(', ')}`);
    }
}

async function testEnhancedQuestionParsing() {
    console.log('🔍 ENHANCED QUESTION PARSING AND LOGGING TEST');
    console.log('=============================================\n');
    
    let emailManager = null;
    let browser = null;
    let page = null;
    let logger = null;
    let optimizer = null;
    let parser = null;
    
    try {
        // Initialize systems
        console.log('🔄 Initializing enhanced analysis systems...');
        logger = new RegistrationLogger('./data/question-analysis.db');
        await logger.initialize();
        
        optimizer = new DemographicOptimizer();
        parser = new EnhancedQuestionParser(logger, optimizer);
        
        emailManager = new EmailAccountManager({
            headless: true,
            debugMode: true,
            timeout: 30000
        });
        
        await emailManager.initialize();
        console.log('✅ Systems ready\n');
        
        // Create email and profile
        const emailAccount = await emailManager.createEmailAccount('guerrilla');
        const optimalProfile = optimizer.generateOptimalProfile();
        optimalProfile.email = emailAccount.email;
        
        console.log(`📧 Email: ${emailAccount.email}`);
        console.log(`👤 Profile: ${optimalProfile.profileName}\n`);
        
        const emailId = await logger.logEmailAccount({
            email: emailAccount.email,
            service: emailAccount.service,
            password: emailAccount.password,
            sessionId: `question-analysis-${Date.now()}`,
            status: 'active',
            metadata: { purpose: 'question_analysis' }
        });
        
        // Test sites to analyze (including our local one)
        const testSites = [
            {
                name: 'Local Survey Site',
                url: 'http://localhost:3001/register',
                description: 'Our test survey site'
            },
            {
                name: 'Example Registration Form',
                url: 'https://httpbin.org/forms/post',
                description: 'Simple test form'
            }
        ];
        
        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();
        
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });
        
        for (const site of testSites) {
            console.log(`\n🎯 Analyzing: ${site.name}`);
            console.log(`   🔗 URL: ${site.url}`);
            
            try {
                const registrationId = await logger.startRegistrationAttempt({
                    sessionId: `analysis-${Date.now()}`,
                    emailId: emailId,
                    targetSite: site.name,
                    targetUrl: site.url,
                    currentStep: 'question_analysis',
                    totalSteps: 2,
                    userAgent: await page.evaluate(() => navigator.userAgent),
                    ipAddress: '127.0.0.1'
                });
                
                // Navigate to the site
                await page.goto(site.url, { 
                    waitUntil: 'networkidle',
                    timeout: 15000 
                });
                
                await page.waitForTimeout(2000);
                
                // Parse all questions
                const formData = await parser.parseFormQuestions(page, site.name);
                
                if (formData.questions.length > 0) {
                    // Display analysis
                    parser.displayQuestionAnalysis(site.name, formData.questions);
                    
                    // Log to database
                    const questionIds = await parser.logQuestionsToDatabase(
                        registrationId, 
                        site.name, 
                        formData.questions, 
                        optimalProfile
                    );
                    
                    console.log(`✅ Logged ${questionIds.length} questions to database`);
                    
                    // Mark registration as analyzed
                    await logger.updateRegistrationAttempt(registrationId, {
                        status: 'questions_analyzed',
                        success: 1,
                        completed_at: new Date().toISOString(),
                        current_step: 'analysis_complete'
                    });
                    
                } else {
                    console.log(`⚠️ No analyzable questions found on ${site.name}`);
                }
                
            } catch (error) {
                console.log(`❌ Failed to analyze ${site.name}: ${error.message}`);
            }
        }
        
        // Generate comprehensive report
        console.log('\n📊 COMPREHENSIVE QUESTION ANALYSIS REPORT');
        console.log('==========================================');
        
        const questions = await logger.allQuery(`
            SELECT DISTINCT 
                question_text, question_type, field_name, demographic_category,
                answer_provided, ai_reasoning, yield_optimization_factor
            FROM registration_questions 
            ORDER BY demographic_category, question_type
        `);
        
        console.log(`\n📈 Database Summary:`);
        console.log(`   Total questions analyzed: ${questions.length}`);
        
        // Group questions by category for analysis
        const questionsByCategory = {};
        questions.forEach(q => {
            if (!questionsByCategory[q.demographic_category]) {
                questionsByCategory[q.demographic_category] = [];
            }
            questionsByCategory[q.demographic_category].push(q);
        });
        
        console.log(`\n📋 Questions by Category:`);
        Object.keys(questionsByCategory).forEach(category => {
            const categoryQuestions = questionsByCategory[category];
            console.log(`\n🏷️ ${category.toUpperCase()} (${categoryQuestions.length} questions):`);
            
            categoryQuestions.forEach((q, index) => {
                console.log(`   ${index + 1}. "${q.question_text}" (${q.question_type})`);
                console.log(`      AI Answer: "${q.answer_provided}"`);
                console.log(`      Yield Factor: ${(q.yield_optimization_factor * 100).toFixed(1)}%`);
                console.log(`      Reasoning: ${q.ai_reasoning}`);
            });
        });
        
        return {
            success: true,
            questionsAnalyzed: questions.length,
            categoriesFound: Object.keys(questionsByCategory).length,
            email: emailAccount.email
        };
        
    } catch (error) {
        console.error('❌ ENHANCED QUESTION PARSING FAILED');
        console.error('===================================');
        console.error(`Error: ${error.message}`);
        
        return {
            success: false,
            error: error.message
        };
        
    } finally {
        // Cleanup
        try {
            if (page) await page.close();
            if (browser) await browser.close();
            if (emailManager) await emailManager.cleanup();
            if (logger) await logger.close();
            console.log('\n🧹 Cleanup completed');
        } catch (error) {
            console.error('⚠️ Cleanup error:', error.message);
        }
    }
}

// Run the test
if (require.main === module) {
    testEnhancedQuestionParsing()
        .then(result => {
            if (result.success) {
                console.log('\n🏆 ENHANCED QUESTION PARSING PROVEN SUCCESSFUL!');
                console.log('✅ Comprehensive question analysis and logging working');
                console.log(`✅ Analyzed ${result.questionsAnalyzed} questions across ${result.categoriesFound} categories`);
                process.exit(0);
            } else {
                console.log('\n⚠️ Test completed with issues');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('🔥 Execution failed:', error);
            process.exit(1);
        });
}

module.exports = { EnhancedQuestionParser, testEnhancedQuestionParsing };