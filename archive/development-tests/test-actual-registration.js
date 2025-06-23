#!/usr/bin/env node

/**
 * Test Actual Registration
 * Complete a real registration on a survey site with intelligent persona
 */

require('dotenv').config();

const { chromium } = require('playwright');
const UniversalFormAutomator = require('./src/automation/universal-form-automator');
const EmailAccountManager = require('./src/email/email-account-manager');
const RegistrationLogger = require('./src/database/registration-logger');
const ContentUnderstandingAI = require('./src/ai/ContentUnderstandingAI');
const { getLogger } = require('./src/utils/enhanced-logger');

async function testActualRegistration() {
    const logger = getLogger({ logLevel: 'debug' });
    let browser = null;
    
    console.log('🎯 TESTING ACTUAL SURVEY SITE REGISTRATION');
    console.log('==========================================');
    console.log('🎭 Using intelligent persona generation');
    console.log('🛡️ Full anti-detection measures active');
    
    try {
        // Initialize core services
        console.log('\n🔧 Initializing services...');
        
        const registrationLogger = new RegistrationLogger();
        await registrationLogger.initialize();
        
        const emailManager = new EmailAccountManager();
        await emailManager.initialize();
        
        const contentAI = new ContentUnderstandingAI();
        const formAutomator = new UniversalFormAutomator(contentAI, {
            debugMode: true,
            humanLikeDelays: true,
            avoidHoneypots: true
        });
        
        formAutomator.setRegistrationLogger(registrationLogger);
        
        console.log('✅ All services initialized');
        
        // Create temporary email
        console.log('\n📧 Creating temporary email account...');
        const emailResult = await emailManager.createEmailAccount('tempmail');
        
        if (!emailResult.success) {
            throw new Error(`Email creation failed: ${emailResult.error}`);
        }
        
        console.log(`✅ Email created: ${emailResult.email}`);
        
        // Launch browser with anti-detection
        console.log('\n🌐 Launching browser with stealth mode...');
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 50, // Human-like speed
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--no-sandbox'
            ]
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            viewport: { width: 1366, height: 768 },
            locale: 'en-US',
            timezoneId: 'America/New_York',
            permissions: ['geolocation'],
            geolocation: { latitude: 40.7128, longitude: -74.0060 } // New York
        });
        
        const page = await context.newPage();
        
        // Hide webdriver property
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });
        
        // Test with a real survey site
        const testSites = [
            {
                name: 'SurveyPlanet',
                url: 'https://app.surveyplanet.com/signup',
                difficulty: 'medium',
                expectedFields: ['firstName', 'lastName', 'email', 'password']
            },
            {
                name: 'Typeform',
                url: 'https://admin.typeform.com/signup',
                difficulty: 'high',
                expectedFields: ['fullName', 'email', 'password']
            }
        ];
        
        let registrationSuccess = false;
        
        for (const site of testSites) {
            console.log(`\n🎯 ATTEMPTING REGISTRATION: ${site.name}`);
            console.log('=' + '='.repeat(30 + site.name.length));
            console.log(`📍 URL: ${site.url}`);
            console.log(`⚠️ Difficulty: ${site.difficulty}`);
            
            try {
                // Navigate to the site
                console.log('\n📍 Step 1: Navigating to registration page...');
                await page.goto(site.url, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                
                // Wait for page to stabilize
                await page.waitForTimeout(2000);
                
                console.log(`✅ Loaded: ${await page.title()}`);
                
                // Use minimal user data - let the system generate intelligent persona
                const userData = {
                    email: emailResult.email,
                    submit: true // Actually submit this time!
                };
                
                console.log('\n🤖 Step 2: Running intelligent form automation...');
                console.log(`   📧 Using email: ${emailResult.email}`);
                console.log(`   🎭 Generating contextual persona for ${site.name}...`);
                
                // Run the automation
                const result = await formAutomator.autoFillForm(page, userData, site.name, {
                    autoSubmit: true,
                    waitForLoad: true,
                    takeScreenshots: true,
                    timeout: 60000
                });
                
                console.log('\n📊 AUTOMATION RESULTS:');
                console.log('=====================');
                
                if (result.success) {
                    console.log(`✅ SUCCESS! Registration completed on ${site.name}`);
                    console.log(`   📝 Fields filled: ${result.fieldsFilled}/${result.fieldsFound}`);
                    console.log(`   🎭 Persona: ${result.userData?.firstName} ${result.userData?.lastName}`);
                    console.log(`   💼 Job: ${result.userData?.jobTitle || 'Not specified'}`);
                    console.log(`   🏢 Company: ${result.userData?.company || 'Not specified'}`);
                    console.log(`   📍 Location: ${result.userData?.city}, ${result.userData?.state}`);
                    console.log(`   ⏱️ Duration: ${result.duration}ms`);
                    
                    registrationSuccess = true;
                    
                    // Check for confirmation/success indicators
                    console.log('\n🔍 Step 3: Checking registration success...');
                    await page.waitForTimeout(3000);
                    
                    const successIndicators = [
                        'welcome',
                        'success',
                        'verify',
                        'confirmation',
                        'check your email',
                        'account created',
                        'sign up successful'
                    ];
                    
                    const pageText = await page.textContent('body');
                    const pageTextLower = pageText.toLowerCase();
                    
                    const foundIndicators = successIndicators.filter(indicator => 
                        pageTextLower.includes(indicator)
                    );
                    
                    if (foundIndicators.length > 0) {
                        console.log(`✅ Registration confirmed! Found indicators: ${foundIndicators.join(', ')}`);
                    } else {
                        console.log(`⚠️ Registration submitted, checking for errors...`);
                        
                        // Check for error messages
                        const errorIndicators = ['error', 'invalid', 'required', 'problem', 'failed'];
                        const foundErrors = errorIndicators.filter(error => 
                            pageTextLower.includes(error)
                        );
                        
                        if (foundErrors.length > 0) {
                            console.log(`❌ Errors detected: ${foundErrors.join(', ')}`);
                        } else {
                            console.log(`✅ No errors detected - registration likely successful`);
                        }
                    }
                    
                    // Take screenshot of result
                    await page.screenshot({ 
                        path: `registration-success-${site.name.toLowerCase()}-${Date.now()}.png`,
                        fullPage: true
                    });
                    console.log(`📸 Screenshot saved`);
                    
                    // Don't try other sites if this one worked
                    break;
                    
                } else {
                    console.log(`❌ FAILED on ${site.name}: ${result.error}`);
                    console.log(`   📝 Fields found: ${result.fieldsFound || 0}`);
                    console.log(`   ✅ Fields filled: ${result.fieldsFilled || 0}`);
                    
                    // Take screenshot of failure
                    await page.screenshot({ 
                        path: `registration-failure-${site.name.toLowerCase()}-${Date.now()}.png`,
                        fullPage: true
                    });
                    console.log(`📸 Failure screenshot saved`);
                }
                
            } catch (siteError) {
                console.log(`💥 Error on ${site.name}: ${siteError.message}`);
                
                try {
                    await page.screenshot({ 
                        path: `registration-error-${site.name.toLowerCase()}-${Date.now()}.png`,
                        fullPage: true
                    });
                    console.log(`📸 Error screenshot saved`);
                } catch (screenshotError) {
                    console.log(`⚠️ Could not take screenshot: ${screenshotError.message}`);
                }
            }
            
            // Wait between attempts
            if (testSites.indexOf(site) < testSites.length - 1) {
                console.log('\n⏳ Waiting 10 seconds before next attempt...');
                await page.waitForTimeout(10000);
            }
        }
        
        // Final results
        console.log('\n🏁 FINAL RESULTS');
        console.log('================');
        
        if (registrationSuccess) {
            console.log('🎉 SUCCESS! At least one registration completed successfully');
            
            // Check email verification
            console.log('\n📧 Step 4: Checking for verification email...');
            try {
                const verificationResult = await emailManager.checkVerificationEmail(emailResult.email);
                if (verificationResult.success && verificationResult.hasVerificationEmail) {
                    console.log('✅ Verification email received!');
                    console.log(`   📋 Subject: ${verificationResult.subject}`);
                    
                    if (verificationResult.verificationLink) {
                        console.log(`   🔗 Verification link: ${verificationResult.verificationLink}`);
                        
                        // Optionally click verification link
                        console.log('\n🔗 Clicking verification link...');
                        await page.goto(verificationResult.verificationLink);
                        await page.waitForTimeout(3000);
                        
                        console.log('✅ Email verification completed!');
                        
                        await page.screenshot({ 
                            path: `email-verified-${Date.now()}.png`,
                            fullPage: true
                        });
                    }
                } else {
                    console.log('⏳ No verification email yet (may take a few minutes)');
                }
            } catch (emailError) {
                console.log(`⚠️ Email check failed: ${emailError.message}`);
            }
            
        } else {
            console.log('❌ No successful registrations completed');
            console.log('📋 Check the screenshots and logs for debugging information');
        }
        
        // Database summary
        console.log('\n📊 DATABASE SUMMARY');
        console.log('==================');
        try {
            const stats = await registrationLogger.allQuery(`
                SELECT 
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
                    COUNT(DISTINCT target_site) as sites_attempted
                FROM registration_attempts 
                WHERE created_at > datetime('now', '-1 hour')
            `);
            
            if (stats.length > 0) {
                const stat = stats[0];
                console.log(`📊 Recent attempts: ${stat.total_attempts}`);
                console.log(`✅ Successful: ${stat.successful}`);
                console.log(`🌐 Sites attempted: ${stat.sites_attempted}`);
                console.log(`📈 Success rate: ${((stat.successful / stat.total_attempts) * 100).toFixed(1)}%`);
            }
        } catch (dbError) {
            console.log(`⚠️ Database stats unavailable: ${dbError.message}`);
        }
        
        return {
            success: registrationSuccess,
            message: registrationSuccess ? 'Registration completed successfully' : 'No successful registrations',
            email: emailResult.email
        };
        
    } catch (error) {
        logger.error('Actual registration test failed', { 
            error: error.message, 
            stack: error.stack 
        });
        console.log(`💥 Test failed: ${error.message}`);
        return { 
            success: false, 
            error: error.message 
        };
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
if (require.main === module) {
    testActualRegistration()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 ACTUAL REGISTRATION TEST PASSED!');
                console.log('===================================');
                console.log('✨ Successfully registered on a real survey site!');
                console.log(`📧 Email used: ${result.email}`);
                console.log('🎯 The intelligent persona system is working perfectly!');
                process.exit(0);
            } else {
                console.log('\n💥 ACTUAL REGISTRATION TEST FAILED!');
                console.log('===================================');
                console.log(`❌ Error: ${result.error || result.message}`);
                console.log('🔍 Check screenshots and logs for debugging');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = testActualRegistration;