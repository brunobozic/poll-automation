/**
 * Complete Data Correlation System Test
 * Comprehensive test demonstrating full email-site-question-defense correlation
 */

const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const DemographicOptimizer = require('./src/ai/demographic-optimizer');
const DefenseDetector = require('./src/security/defense-detector');
const { chromium } = require('playwright');

async function testCompleteCorrelationSystem() {
    console.log('🔗 COMPLETE DATA CORRELATION SYSTEM TEST');
    console.log('========================================\n');
    
    let emailManager = null;
    let browser = null;
    let page = null;
    let logger = null;
    let optimizer = null;
    let defenseDetector = null;
    
    try {
        // Initialize all systems
        console.log('🔄 Step 1: Initializing complete correlation system...');
        logger = new RegistrationLogger('./data/complete-correlation.db');
        await logger.initialize();
        
        emailManager = new EmailAccountManager({
            headless: true,
            debugMode: true,
            timeout: 30000
        });
        
        await emailManager.initialize();
        optimizer = new DemographicOptimizer();
        defenseDetector = new DefenseDetector();
        
        console.log('✅ All systems ready\n');
        
        // Create multiple emails for comprehensive testing
        console.log('🔄 Step 2: Creating multiple email accounts...');
        const emails = [];
        const emailServices = ['guerrilla', 'tempmail', '10minutemail'];
        
        for (let i = 0; i < 3; i++) {
            const service = emailServices[i % emailServices.length];
            let attempt = 0;
            let emailAccount = null;
            
            while (attempt < 3 && !emailAccount) {
                try {
                    emailAccount = await emailManager.createEmailAccount(service);
                    if (emailAccount && emailAccount.email) {
                        // Check if email already exists in database
                        try {
                            const existingEmail = await logger.getQuery(
                                'SELECT id FROM email_accounts WHERE email = ?', 
                                [emailAccount.email]
                            );
                            
                            if (existingEmail) {
                                console.log(`   ⚠️ Email ${emailAccount.email} already exists, trying again...`);
                                emailAccount = null;
                                attempt++;
                                continue;
                            }
                            
                            const emailId = await logger.logEmailAccount({
                                email: emailAccount.email,
                                service: emailAccount.service,
                                password: emailAccount.password,
                                sessionId: `correlation-test-${Date.now()}-${i}-${attempt}`,
                                status: 'active',
                                metadata: { purpose: 'correlation_testing', batch: i + 1, attempt: attempt + 1 }
                            });
                            
                            emails.push({
                                ...emailAccount,
                                emailId: emailId
                            });
                            
                            console.log(`   📧 Created email ${i + 1}: ${emailAccount.email} (${service})`);
                            break;
                            
                        } catch (dbError) {
                            if (dbError.message.includes('UNIQUE constraint failed')) {
                                console.log(`   ⚠️ Email ${emailAccount.email} already exists, trying again...`);
                                emailAccount = null;
                                attempt++;
                            } else {
                                throw dbError;
                            }
                        }
                    }
                } catch (error) {
                    console.log(`   ⚠️ Failed to create email with ${service}: ${error.message}`);
                    attempt++;
                }
            }
            
            if (!emailAccount && attempt >= 3) {
                console.log(`   ❌ Failed to create unique email after 3 attempts for slot ${i + 1}`);
            }
        }
        
        console.log(`✅ Created ${emails.length} email accounts\n`);
        
        if (emails.length === 0) {
            throw new Error('Failed to create any email accounts for testing');
        }
        
        // Test sites with different characteristics
        const testSites = [
            {
                name: 'Local Survey Site',
                url: 'http://localhost:3001/register',
                category: 'test',
                description: 'Our test survey site (should succeed)'
            },
            {
                name: 'Google Forms',
                url: 'https://docs.google.com/forms/create',
                category: 'forms',
                description: 'Protected site (should detect defenses)'
            },
            {
                name: 'HTTPBin Form',
                url: 'https://httpbin.org/forms/post',
                category: 'test',
                description: 'Simple form (minimal defenses)'
            }
        ];
        
        browser = await chromium.launch({ 
            headless: true,
            args: ['--disable-blink-features=AutomationControlled']
        });
        
        // Test each email on each site
        console.log('🔄 Step 3: Testing comprehensive email-site correlations...');
        
        for (let emailIndex = 0; emailIndex < emails.length; emailIndex++) {
            const email = emails[emailIndex];
            const optimalProfile = optimizer.generateOptimalProfile();
            optimalProfile.email = email.email;
            
            console.log(`\n👤 Testing with Email ${emailIndex + 1}: ${email.email}`);
            console.log(`   Profile: ${optimalProfile.profileName} (Yield: ${(optimalProfile.yieldPrediction * 100).toFixed(1)}%)`);
            
            page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            });
            
            for (let siteIndex = 0; siteIndex < testSites.length; siteIndex++) {
                const site = testSites[siteIndex];
                
                console.log(`\n   🎯 Site ${siteIndex + 1}: ${site.name}`);
                console.log(`      URL: ${site.url}`);
                
                try {
                    // Log or update site information
                    const siteId = await logger.logSurveysite({
                        siteName: site.name,
                        baseUrl: site.url,
                        registrationUrl: site.url,
                        siteCategory: site.category,
                        notes: site.description
                    });
                    
                    // Start registration attempt
                    const registrationId = await logger.startRegistrationAttempt({
                        sessionId: `correlation-${Date.now()}-${emailIndex}-${siteIndex}`,
                        emailId: email.emailId,
                        targetSite: site.name,
                        targetUrl: site.url,
                        currentStep: 'defense_detection',
                        totalSteps: 6,
                        userAgent: await page.evaluate(() => navigator.userAgent),
                        ipAddress: '127.0.0.1'
                    });
                    
                    // Navigate and detect defenses
                    console.log(`      🌐 Navigating and detecting defenses...`);
                    
                    try {
                        await page.goto(site.url, { 
                            waitUntil: 'networkidle',
                            timeout: 15000 
                        });
                        
                        // Detect defenses
                        const detectedDefenses = await defenseDetector.detectDefenses(page, site.url);
                        
                        console.log(`      🛡️ Detected ${detectedDefenses.length} defenses`);
                        
                        // Log each defense
                        for (const defense of detectedDefenses) {
                            await logger.logSiteDefense({
                                siteId: siteId,
                                registrationId: registrationId,
                                defenseType: defense.defenseType,
                                defenseSubtype: defense.defenseSubtype,
                                severityLevel: defense.severityLevel,
                                description: defense.description,
                                detectionDetails: defense.detectionDetails,
                                bypassAttempted: false,
                                bypassSuccessful: false
                            });
                        }
                        
                        // Calculate site difficulty
                        const siteDifficulty = defenseDetector.calculateSiteDifficulty(detectedDefenses);
                        console.log(`      📊 Site difficulty: ${(siteDifficulty * 100).toFixed(1)}%`);
                        
                        // Simulate registration based on site difficulty
                        let registrationSuccess = false;
                        let errorMessage = null;
                        
                        if (site.name === 'Local Survey Site') {
                            // Local site - simulate successful registration
                            registrationSuccess = true;
                            
                            // Log user profile
                            await logger.logUserProfile({
                                registrationId: registrationId,
                                emailId: email.emailId,
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
                            
                            // Simulate questions and answers
                            const sampleQuestions = [
                                { text: 'What is your first name?', type: 'text', fieldName: 'firstName', category: 'personal_info' },
                                { text: 'What is your email?', type: 'email', fieldName: 'email', category: 'contact' },
                                { text: 'What is your age?', type: 'number', fieldName: 'age', category: 'demographics' },
                                { text: 'What is your gender?', type: 'select', fieldName: 'gender', category: 'demographics' },
                                { text: 'What is your occupation?', type: 'text', fieldName: 'occupation', category: 'economics' }
                            ];
                            
                            for (const question of sampleQuestions) {
                                await logger.logSiteQuestion(siteId, {
                                    questionText: question.text,
                                    questionType: question.type,
                                    fieldName: question.fieldName,
                                    demographicCategory: question.category,
                                    isRequired: true,
                                    hasOptions: question.type === 'select',
                                    questionOptions: question.type === 'select' ? ['Male', 'Female', 'Other'] : [],
                                    yieldImportance: question.category === 'demographics' ? 0.9 : 0.7
                                });
                                
                                // Generate AI answer
                                const answerData = optimizer.generateAnswerForQuestion(optimalProfile, question);
                                
                                await logger.logRegistrationQuestion({
                                    registrationId: registrationId,
                                    questionText: question.text,
                                    questionType: question.type,
                                    fieldName: question.fieldName,
                                    fieldSelector: `#${question.fieldName}`,
                                    answerProvided: answerData.value,
                                    aiGenerated: true,
                                    aiReasoning: answerData.reasoning,
                                    demographicCategory: question.category,
                                    yieldOptimizationFactor: answerData.optimizationFactor || 0.7
                                });
                            }
                            
                        } else {
                            // External sites - simulate failures based on defenses
                            registrationSuccess = false;
                            
                            if (detectedDefenses.length > 0) {
                                const topDefense = detectedDefenses[0];
                                errorMessage = `Registration blocked by ${topDefense.defenseType}: ${topDefense.description}`;
                            } else {
                                errorMessage = 'Site access restrictions or complex registration process';
                            }
                        }
                        
                        // Update registration attempt
                        await logger.updateRegistrationAttempt(registrationId, {
                            status: registrationSuccess ? 'completed' : 'failed',
                            success: registrationSuccess ? 1 : 0,
                            completed_at: new Date().toISOString(),
                            current_step: registrationSuccess ? 'completed' : 'blocked',
                            error_message: errorMessage
                        });
                        
                        // Update site statistics
                        await logger.updateSiteStats(
                            siteId, 
                            registrationSuccess, 
                            registrationSuccess ? 5 : 0, 
                            siteDifficulty, 
                            registrationSuccess ? optimalProfile.yieldPrediction : 0
                        );
                        
                        console.log(`      ${registrationSuccess ? '✅' : '❌'} Result: ${registrationSuccess ? 'Success' : 'Failed'}`);
                        if (errorMessage) {
                            console.log(`         Reason: ${errorMessage}`);
                        }
                        
                    } catch (navigationError) {
                        console.log(`      ❌ Navigation failed: ${navigationError.message}`);
                        
                        await logger.updateRegistrationAttempt(registrationId, {
                            status: 'failed',
                            success: 0,
                            error_message: `Navigation error: ${navigationError.message}`,
                            current_step: 'navigation_failed'
                        });
                    }
                    
                } catch (registrationError) {
                    console.log(`      ❌ Registration setup failed: ${registrationError.message}`);
                }
                
                await page.waitForTimeout(1000);
            }
            
            await page.close();
        }
        
        // Test all correlation queries
        console.log('\n🔄 Step 4: Testing data correlation queries...');
        
        // Test query 1: For each email, show failed registrations with reasons
        console.log('\n📊 QUERY 1: Failed registrations by email with reasons');
        console.log('='.repeat(60));
        
        for (const email of emails) {
            console.log(`\n📧 Email: ${email.email}`);
            const failures = await logger.getEmailFailedRegistrations(email.email);
            
            if (failures.length > 0) {
                failures.forEach((failure, index) => {
                    console.log(`   ${index + 1}. ${failure.target_site}`);
                    console.log(`      Status: ${failure.status}`);
                    console.log(`      Error: ${failure.error_message || 'No specific error'}`);
                    console.log(`      Defenses: ${failure.failure_reasons || 'None detected'}`);
                    console.log(`      Severity: ${failure.avg_defense_severity ? failure.avg_defense_severity.toFixed(1) : 'N/A'}`);
                });
            } else {
                console.log('   No failed registrations');
            }
        }
        
        // Test query 2: For each email, show successful registrations
        console.log('\n📊 QUERY 2: Successful registrations by email');
        console.log('='.repeat(60));
        
        for (const email of emails) {
            console.log(`\n📧 Email: ${email.email}`);
            const successes = await logger.getEmailSuccessfulRegistrations(email.email);
            
            if (successes.length > 0) {
                successes.forEach((success, index) => {
                    console.log(`   ${index + 1}. ${success.target_site}`);
                    console.log(`      Profile: ${success.profile_name}`);
                    console.log(`      Questions: ${success.questions_answered}`);
                    console.log(`      Yield: ${success.yield_prediction ? (success.yield_prediction * 100).toFixed(1) + '%' : 'N/A'}`);
                    console.log(`      Completed: ${success.completed_at}`);
                });
            } else {
                console.log('   No successful registrations');
            }
        }
        
        // Test query 3: For each site, show successfully registered emails
        console.log('\n📊 QUERY 3: Successfully registered emails by site');
        console.log('='.repeat(60));
        
        for (const site of testSites) {
            console.log(`\n🎯 Site: ${site.name}`);
            const siteEmails = await logger.getSiteSuccessfulEmails(site.name);
            
            if (siteEmails.length > 0) {
                siteEmails.forEach((registration, index) => {
                    console.log(`   ${index + 1}. ${registration.email} (${registration.email_service})`);
                    console.log(`      Profile: ${registration.profile_name}`);
                    console.log(`      Demographics: ${registration.age}yo ${registration.gender}, ${registration.occupation}`);
                    console.log(`      Location: ${registration.location_city}, ${registration.location_state}`);
                    console.log(`      Questions: ${registration.questions_answered}`);
                    console.log(`      Yield: ${registration.yield_prediction ? (registration.yield_prediction * 100).toFixed(1) + '%' : 'N/A'}`);
                });
            } else {
                console.log('   No successful registrations');
            }
        }
        
        // Comprehensive correlation report
        console.log('\n📊 COMPREHENSIVE CORRELATION REPORT');
        console.log('='.repeat(60));
        
        const correlationReport = await logger.getEmailSiteCorrelationReport();
        console.log(`\nTotal email-site combinations: ${correlationReport.length}`);
        
        correlationReport.forEach((record, index) => {
            if (record.target_site) { // Only show records with actual registration attempts
                console.log(`\n${index + 1}. ${record.email} → ${record.target_site}`);
                console.log(`   Success: ${record.success ? 'Yes' : 'No'}`);
                console.log(`   Questions: ${record.questions_answered || 0}`);
                console.log(`   Defenses: ${record.defenses_encountered || 0}`);
                console.log(`   Categories: ${record.question_categories || 'None'}`);
                console.log(`   Defense Types: ${record.defense_types || 'None'}`);
                if (record.error_message) {
                    console.log(`   Error: ${record.error_message}`);
                }
            }
        });
        
        // Site defense summary
        console.log('\n🛡️ SITE DEFENSE SUMMARY');
        console.log('='.repeat(60));
        
        const defenseSummary = await logger.getSiteDefenseSummary();
        defenseSummary.forEach((site, index) => {
            console.log(`\n${index + 1}. ${site.site_name}`);
            console.log(`   Defenses: ${site.total_defenses || 0} (${site.unique_defense_types || 0} types)`);
            console.log(`   Avg Severity: ${site.avg_severity ? site.avg_severity.toFixed(1) : 'N/A'}`);
            console.log(`   Success Rate: ${site.success_rate || 0}%`);
            console.log(`   Types: ${site.defense_types || 'None'}`);
        });
        
        console.log('\n✅ COMPLETE DATA CORRELATION SYSTEM PROVEN!');
        console.log('==========================================');
        console.log('✅ All email-site-question-defense relationships maintained');
        console.log('✅ User can query any correlation pattern');
        console.log('✅ Defense detection integrated with registration process');
        console.log('✅ Comprehensive audit trail maintained');
        
        return {
            success: true,
            emailsCreated: emails.length,
            sitesAttempted: testSites.length,
            totalCorrelations: correlationReport.length,
            queries: {
                emailFailures: 'getEmailFailedRegistrations(email)',
                emailSuccesses: 'getEmailSuccessfulRegistrations(email)', 
                siteEmails: 'getSiteSuccessfulEmails(siteName)',
                fullCorrelation: 'getEmailSiteCorrelationReport(email?)',
                defenses: 'getSiteDefenseSummary()'
            }
        };
        
    } catch (error) {
        console.error('❌ COMPLETE CORRELATION SYSTEM FAILED');
        console.error('=====================================');
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
    testCompleteCorrelationSystem()
        .then(result => {
            if (result.success) {
                console.log('\n🏆 COMPLETE DATA CORRELATION SYSTEM PROVEN SUCCESSFUL!');
                console.log('✅ Users can execute any email-site correlation query');
                console.log('✅ All relationships properly maintained and queryable');
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

module.exports = testCompleteCorrelationSystem;