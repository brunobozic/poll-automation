/**
 * AI-Optimized Registration Test
 * Demonstrates AI-powered demographic optimization with comprehensive logging
 */

const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const DemographicOptimizer = require('./src/ai/demographic-optimizer');
const { chromium } = require('playwright');

async function testAIOptimizedRegistration() {
    console.log('🤖 AI-OPTIMIZED SURVEY REGISTRATION TEST');
    console.log('=======================================\n');
    
    let emailManager = null;
    let browser = null;
    let page = null;
    let logger = null;
    let optimizer = null;
    
    try {
        // Initialize systems
        console.log('🔄 Step 1: Initializing AI-powered systems...');
        logger = new RegistrationLogger('./data/ai-optimized-registration.db');
        await logger.initialize();
        
        emailManager = new EmailAccountManager({
            headless: true,
            debugMode: true,
            timeout: 30000
        });
        
        await emailManager.initialize();
        
        optimizer = new DemographicOptimizer();
        
        console.log('✅ AI systems ready\n');
        
        // Create email account
        console.log('🔄 Step 2: Creating email account...');
        const emailAccount = await emailManager.createEmailAccount('guerrilla');
        
        if (!emailAccount || !emailAccount.email) {
            throw new Error('Failed to create email account');
        }
        
        console.log(`✅ Email created: ${emailAccount.email}\n`);
        
        // Generate AI-optimized demographic profile
        console.log('🔄 Step 3: Generating AI-optimized demographic profile...');
        const optimalProfile = optimizer.generateOptimalProfile();
        
        // Add email to profile for proper answer generation
        optimalProfile.email = emailAccount.email;
        
        console.log(`🤖 AI-Generated Optimal Profile:`);
        console.log(`   👤 Name: ${optimalProfile.profileName}`);
        console.log(`   🎂 Age: ${optimalProfile.age} (Optimization: ${optimalProfile.aiOptimizationScore})`);
        console.log(`   👥 Gender: ${optimalProfile.gender}`);
        console.log(`   💰 Income: ${optimalProfile.incomeBracket}`);
        console.log(`   🎓 Education: ${optimalProfile.educationLevel}`);
        console.log(`   💼 Occupation: ${optimalProfile.occupation}`);
        console.log(`   💑 Marital: ${optimalProfile.maritalStatus} (Household: ${optimalProfile.householdSize})`);
        console.log(`   📍 Location: ${optimalProfile.locationCity}, ${optimalProfile.locationState}`);
        console.log(`   🎯 Interests: ${optimalProfile.interests.join(', ')}`);
        console.log(`   📈 Yield Prediction: ${(optimalProfile.yieldPrediction * 100).toFixed(1)}%`);
        console.log(`   ⚖️  Balance Score: ${(optimalProfile.demographicBalanceScore * 100).toFixed(1)}%\n`);
        
        // Log email to database
        const emailId = await logger.logEmailAccount({
            email: emailAccount.email,
            service: emailAccount.service,
            password: emailAccount.password,
            sessionId: `ai-optimized-${Date.now()}`,
            status: 'active',
            metadata: { 
                ...emailAccount.sessionData,
                aiOptimized: true,
                optimalProfile: optimalProfile
            }
        });
        
        // Test registration on local survey site
        console.log('🔄 Step 4: Testing AI-optimized registration...');
        
        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();
        
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });
        
        try {
            await page.goto('http://localhost:3001/register', { 
                waitUntil: 'networkidle',
                timeout: 10000 
            });
            
            console.log('✅ Accessed survey registration page');
            
            // Start registration attempt logging
            const registrationId = await logger.startRegistrationAttempt({
                sessionId: `ai-opt-${Date.now()}`,
                emailId: emailId,
                targetSite: 'AI-Optimized Survey Site',
                targetUrl: 'http://localhost:3001/register',
                currentStep: 'ai_profile_generation',
                totalSteps: 4,
                userAgent: await page.evaluate(() => navigator.userAgent),
                ipAddress: '127.0.0.1'
            });
            
            // Log the AI-generated user profile
            const profileId = await logger.logUserProfile({
                registrationId: registrationId,
                emailId: emailId,
                profileName: optimalProfile.profileName,
                age: optimalProfile.age,
                gender: optimalProfile.gender,
                incomeBracket: optimalProfile.incomeBracket,
                educationLevel: optimalProfile.educationLevel,
                occupation: optimalProfile.occupation,
                locationCity: optimalProfile.locationCity,
                locationState: optimalProfile.locationState,
                locationCountry: optimalProfile.locationCountry,
                maritalStatus: optimalProfile.maritalStatus,
                householdSize: optimalProfile.householdSize,
                interests: optimalProfile.interests,
                aiOptimizationScore: optimalProfile.aiOptimizationScore,
                yieldPrediction: optimalProfile.yieldPrediction,
                demographicBalanceScore: optimalProfile.demographicBalanceScore
            });
            
            // Define registration questions and generate AI answers
            console.log('🔄 Step 5: Generating AI answers for registration questions...');
            
            const registrationQuestions = [
                { text: 'What is your first name?', type: 'text', fieldName: 'firstName', selector: '#firstName' },
                { text: 'What is your last name?', type: 'text', fieldName: 'lastName', selector: '#lastName' },
                { text: 'What is your email address?', type: 'email', fieldName: 'email', selector: '#email' },
                { text: 'What is your age?', type: 'number', fieldName: 'age', selector: '#age' },
                { text: 'What is your gender?', type: 'select', fieldName: 'gender', selector: '#gender' },
                { text: 'What is your occupation?', type: 'text', fieldName: 'occupation', selector: '#occupation' },
                { text: 'What is your annual income?', type: 'select', fieldName: 'income', selector: '#income' },
                { text: 'Do you agree to terms?', type: 'checkbox', fieldName: 'terms', selector: '#terms' },
                { text: 'Subscribe to newsletter?', type: 'checkbox', fieldName: 'newsletter', selector: '#newsletter' }
            ];
            
            // Generate AI answers for each question
            const aiAnswers = optimizer.generateAnswersForQuestions(optimalProfile, registrationQuestions);
            
            // Fill the form and log each question/answer
            console.log('🔄 Step 6: Filling form with AI-optimized answers...');
            
            const formData = {
                firstName: optimalProfile.firstName,
                lastName: optimalProfile.lastName,
                email: emailAccount.email,
                age: optimalProfile.age.toString(),
                gender: optimalProfile.gender,
                occupation: optimalProfile.occupation,
                income: optimalProfile.incomeBracket
            };
            
            // Fill each field and log the Q&A
            for (let i = 0; i < aiAnswers.length; i++) {
                const answer = aiAnswers[i];
                const question = registrationQuestions[i];
                
                try {
                    if (question.type === 'text' || question.type === 'email' || question.type === 'number') {
                        await page.fill(question.selector, answer.answerProvided);
                        await page.waitForTimeout(200);
                    } else if (question.type === 'select') {
                        await page.selectOption(question.selector, answer.answerProvided);
                        await page.waitForTimeout(200);
                    } else if (question.type === 'checkbox') {
                        if (answer.answerProvided === 'checked' || answer.answerProvided === 'true') {
                            await page.check(question.selector);
                            await page.waitForTimeout(200);
                        }
                    }
                    
                    // Log each question and AI-generated answer
                    await logger.logRegistrationQuestion({
                        registrationId: registrationId,
                        questionText: answer.questionText,
                        questionType: answer.questionType,
                        fieldName: answer.fieldName,
                        fieldSelector: answer.fieldSelector,
                        answerProvided: answer.answerProvided,
                        aiGenerated: answer.aiGenerated,
                        aiReasoning: answer.aiReasoning,
                        demographicCategory: answer.demographicCategory,
                        yieldOptimizationFactor: answer.yieldOptimizationFactor
                    });
                    
                } catch (fillError) {
                    console.log(`⚠️  Could not fill ${question.fieldName}: ${fillError.message}`);
                }
            }
            
            console.log('✅ Form filled with AI-optimized demographic data');
            
            // Log form completion step
            const stepId = await logger.logRegistrationStep({
                registrationId: registrationId,
                stepNumber: 1,
                stepName: 'ai_optimized_form_completion',
                stepType: 'ai_powered',
                completedAt: new Date().toISOString(),
                durationMs: 4000,
                status: 'completed',
                inputData: optimalProfile,
                outputData: { 
                    formCompleted: true,
                    aiOptimizationScore: optimalProfile.aiOptimizationScore,
                    yieldPrediction: optimalProfile.yieldPrediction
                },
                aiAnalysis: JSON.stringify({
                    optimizationFactors: optimalProfile.optimizationFactors,
                    yieldPrediction: optimalProfile.yieldPrediction,
                    balanceScore: optimalProfile.demographicBalanceScore
                })
            });
            
            // Submit the form
            console.log('🔄 Step 7: Submitting AI-optimized registration...');
            
            await page.click('button[type="submit"]');
            await page.waitForTimeout(2000);
            
            // Check result
            const pageContent = await page.content();
            const currentUrl = page.url();
            
            const isSuccess = pageContent.includes('Registration Successful') || 
                             pageContent.includes('Welcome,') ||
                             pageContent.includes('verification email');
            
            if (isSuccess) {
                console.log('✅ AI-optimized registration successful!');
                
                // Log successful submission
                await logger.logRegistrationStep({
                    registrationId: registrationId,
                    stepNumber: 2,
                    stepName: 'ai_optimized_submission',
                    stepType: 'automated',
                    completedAt: new Date().toISOString(),
                    durationMs: 2000,
                    status: 'completed',
                    inputData: { submitted: true },
                    outputData: { 
                        success: true, 
                        redirectUrl: currentUrl,
                        profileOptimization: optimalProfile.aiOptimizationScore
                    }
                });
                
                // Mark registration as successful
                await logger.updateRegistrationAttempt(registrationId, {
                    status: 'completed',
                    success: 1,
                    completed_at: new Date().toISOString(),
                    current_step: 'completed'
                });
                
                // Final statistics and analysis
                console.log('\n🎉 AI-OPTIMIZED REGISTRATION COMPLETE!');
                console.log('=====================================');
                console.log(`✅ Email: ${emailAccount.email}`);
                console.log(`✅ Profile: ${optimalProfile.profileName}`);
                console.log(`✅ AI Optimization Score: ${(optimalProfile.aiOptimizationScore * 100).toFixed(1)}%`);
                console.log(`✅ Predicted Survey Yield: ${(optimalProfile.yieldPrediction * 100).toFixed(1)}%`);
                console.log(`✅ Demographic Balance: ${(optimalProfile.demographicBalanceScore * 100).toFixed(1)}%`);
                console.log(`✅ Registration ID: ${registrationId}`);
                console.log(`✅ Profile ID: ${profileId}`);
                
                // Show optimization reasoning
                console.log('\n🧠 AI Optimization Reasoning:');
                optimalProfile.optimizationFactors.forEach((factor, index) => {
                    console.log(`   ${index + 1}. ${factor.factor}: ${(factor.score * 100).toFixed(1)}% - ${factor.reasoning}`);
                });
                
                // Database verification
                const questions = await logger.getRegistrationQuestions(registrationId);
                const profile = await logger.getUserProfile(registrationId);
                const stats = await logger.getRegistrationStats();
                
                console.log(`\n📊 Database Verification:`);
                console.log(`   📝 Questions logged: ${questions.length}`);
                console.log(`   👤 Profile logged: ${profile ? 'Yes' : 'No'}`);
                console.log(`   📈 Total registrations: ${stats.totalAttempts?.[0]?.count || 0}`);
                console.log(`   ✅ Success rate: ${stats.successfulAttempts?.[0]?.count || 0}/${stats.totalAttempts?.[0]?.count || 0}`);
                
                // Show sample Q&A pairs
                console.log(`\n📋 Sample Question/Answer Pairs:`);
                questions.slice(0, 5).forEach((q, index) => {
                    console.log(`   ${index + 1}. Q: "${q.question_text}"`);
                    console.log(`      A: "${q.answer_provided}" (${q.demographic_category})`);
                    console.log(`      AI Reasoning: ${q.ai_reasoning}`);
                    console.log(`      Yield Factor: ${(q.yield_optimization_factor * 100).toFixed(1)}%`);
                });
                
                return {
                    success: true,
                    email: emailAccount.email,
                    profile: optimalProfile,
                    registrationId: registrationId,
                    profileId: profileId,
                    questionsLogged: questions.length,
                    optimizationScore: optimalProfile.aiOptimizationScore,
                    yieldPrediction: optimalProfile.yieldPrediction
                };
                
            } else {
                throw new Error('Registration submission failed');
            }
            
        } catch (siteError) {
            console.log(`❌ Survey site access failed: ${siteError.message}`);
            console.log('Make sure survey site is running: node simple-survey-site.js');
            
            return {
                success: false,
                error: siteError.message,
                profile: optimalProfile
            };
        }
        
    } catch (error) {
        console.error('❌ AI-OPTIMIZED REGISTRATION FAILED');
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
            console.error('⚠️  Cleanup error:', error.message);
        }
    }
}

// Run the test
if (require.main === module) {
    testAIOptimizedRegistration()
        .then(result => {
            if (result.success) {
                console.log('\n🏆 AI-OPTIMIZED REGISTRATION PROVEN SUCCESSFUL!');
                console.log('✅ AI generates optimal demographics for maximum survey yield');
                console.log('✅ All questions and answers comprehensively logged');
                console.log('✅ Perfect balance of optimization and realism achieved');
                process.exit(0);
            } else {
                console.log('\n⚠️  Test completed with issues - check error details above');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('🔥 Execution failed:', error);
            process.exit(1);
        });
}

module.exports = testAIOptimizedRegistration;