#!/usr/bin/env node

/**
 * Test Contextual Persona Generation
 * Verify that the intelligent persona system generates realistic, consistent data
 */

require('dotenv').config();

const ContextualDataGenerator = require('./src/automation/contextual-data-generator');
const RegistrationLogger = require('./src/database/registration-logger');
const PersonaConsistencyTracker = require('./src/database/persona-consistency-tracker');

async function testContextualPersonaGeneration() {
    console.log('🧠 TESTING CONTEXTUAL PERSONA GENERATION');
    console.log('=========================================');
    
    try {
        // Initialize components
        const registrationLogger = new RegistrationLogger();
        await registrationLogger.initialize();
        
        const dataGenerator = new ContextualDataGenerator({
            enableConsistencyTracking: true,
            debugMode: true
        });
        
        const consistencyTracker = new PersonaConsistencyTracker(registrationLogger);
        
        // Test different site contexts
        const testSites = [
            {
                name: 'SurveyPlanet Business Registration',
                context: {
                    url: 'https://surveyplanet.com/register',
                    siteName: 'surveyplanet',
                    pageContent: 'Create business surveys and gather customer feedback',
                    formFields: [
                        { purpose: 'firstName', label: 'First Name' },
                        { purpose: 'lastName', label: 'Last Name' },
                        { purpose: 'email', label: 'Business Email' },
                        { purpose: 'company', label: 'Company Name' },
                        { purpose: 'jobTitle', label: 'Job Title' }
                    ]
                },
                expectedPersonaType: 'small_business_owner'
            },
            {
                name: 'Typeform Designer Registration',
                context: {
                    url: 'https://admin.typeform.com/signup',
                    siteName: 'typeform',
                    pageContent: 'Beautiful forms and surveys for designers and product teams',
                    formFields: [
                        { purpose: 'firstName', label: 'First Name' },
                        { purpose: 'email', label: 'Work Email' },
                        { purpose: 'company', label: 'Company' },
                        { purpose: 'jobTitle', label: 'Role' }
                    ]
                },
                expectedPersonaType: 'tech_professional'
            },
            {
                name: 'SurveyMonkey Enterprise Registration',
                context: {
                    url: 'https://www.surveymonkey.com/user/sign-up/',
                    siteName: 'surveymonkey',
                    pageContent: 'Enterprise research and analytics platform',
                    formFields: [
                        { purpose: 'firstName', label: 'First Name' },
                        { purpose: 'lastName', label: 'Last Name' },
                        { purpose: 'email', label: 'Email Address' },
                        { purpose: 'company', label: 'Organization' },
                        { purpose: 'jobTitle', label: 'Job Title' }
                    ]
                },
                expectedPersonaType: 'corporate_professional'
            }
        ];
        
        const generatedPersonas = [];
        
        for (let i = 0; i < testSites.length; i++) {
            const site = testSites[i];
            console.log(`\n🎭 TEST ${i + 1}/3: ${site.name}`);
            console.log('======================================');
            
            try {
                // Generate contextual persona
                const startTime = Date.now();
                const result = await dataGenerator.generateContextualUserData(
                    { fields: site.context.formFields },
                    site.context,
                    null,
                    registrationLogger
                );
                const generationTime = Date.now() - startTime;
                
                const { userData, persona } = result;
                
                // Display results
                console.log(`✅ Generated in ${generationTime}ms`);
                console.log(`\n👤 PERSONA PROFILE:`);
                console.log(`   Name: ${persona.identity.fullName}`);
                console.log(`   Email: ${persona.identity.email}`);
                console.log(`   Age: ${persona.demographics.age}`);
                console.log(`   Job: ${persona.identity.jobTitle}`);
                console.log(`   Company: ${persona.identity.company || 'N/A'}`);
                console.log(`   Location: ${persona.demographics.location.city}, ${persona.demographics.location.state}`);
                console.log(`   Income: $${persona.demographics.income.toLocaleString()}`);
                console.log(`   Education: ${persona.demographics.education}`);
                
                // Validate realism
                console.log(`\n🔍 REALISM VALIDATION:`);
                const validation = validatePersonaRealism(persona, site.expectedPersonaType);
                validation.forEach(check => {
                    console.log(`   ${check.valid ? '✅' : '❌'} ${check.aspect}: ${check.message}`);
                });
                
                // Test consistency anchors
                console.log(`\n⚓ CONSISTENCY ANCHORS:`);
                Object.entries(persona.background.consistency_anchors).forEach(([key, value]) => {
                    console.log(`   ${key}: ${JSON.stringify(value)}`);
                });
                
                // Store persona for consistency tracking
                await consistencyTracker.storeRegistrationData(
                    persona.id,
                    site.context.siteName,
                    { persona, registrationData: userData }
                );
                
                generatedPersonas.push({
                    site: site.name,
                    persona,
                    userData,
                    validation
                });
                
            } catch (error) {
                console.log(`❌ Failed: ${error.message}`);
            }
        }
        
        // Cross-persona consistency analysis
        console.log(`\n🔬 CROSS-PERSONA ANALYSIS`);
        console.log('==========================');
        
        if (generatedPersonas.length >= 2) {
            const persona1 = generatedPersonas[0].persona;
            const persona2 = generatedPersonas[1].persona;
            
            console.log(`\nComparing personas:`);
            console.log(`Person 1: ${persona1.identity.fullName} (${generatedPersonas[0].site})`);
            console.log(`Person 2: ${persona2.identity.fullName} (${generatedPersonas[1].site})`);
            
            // Check for diversity
            const diversityChecks = [
                {
                    aspect: 'Names',
                    diverse: persona1.identity.fullName !== persona2.identity.fullName,
                    message: `Different names: ${persona1.identity.fullName} vs ${persona2.identity.fullName}`
                },
                {
                    aspect: 'Job Titles',
                    diverse: persona1.identity.jobTitle !== persona2.identity.jobTitle,
                    message: `Different roles: ${persona1.identity.jobTitle} vs ${persona2.identity.jobTitle}`
                },
                {
                    aspect: 'Age Ranges',
                    diverse: Math.abs(persona1.demographics.age - persona2.demographics.age) >= 3,
                    message: `Age difference: ${Math.abs(persona1.demographics.age - persona2.demographics.age)} years`
                },
                {
                    aspect: 'Income Levels',
                    diverse: Math.abs(persona1.demographics.income - persona2.demographics.income) >= 10000,
                    message: `Income difference: $${Math.abs(persona1.demographics.income - persona2.demographics.income).toLocaleString()}`
                }
            ];
            
            diversityChecks.forEach(check => {
                console.log(`   ${check.diverse ? '✅' : '⚠️'} ${check.aspect}: ${check.message}`);
            });
        }
        
        // Summary statistics
        console.log(`\n📊 GENERATION SUMMARY`);
        console.log('=====================');
        console.log(`Total personas generated: ${generatedPersonas.length}`);
        console.log(`Success rate: ${(generatedPersonas.length / testSites.length * 100).toFixed(1)}%`);
        
        const avgAge = generatedPersonas.reduce((sum, p) => sum + p.persona.demographics.age, 0) / generatedPersonas.length;
        const avgIncome = generatedPersonas.reduce((sum, p) => sum + p.persona.demographics.income, 0) / generatedPersonas.length;
        
        console.log(`Average age: ${Math.round(avgAge)} years`);
        console.log(`Average income: $${Math.round(avgIncome).toLocaleString()}`);
        
        // Count validation passes
        const totalValidations = generatedPersonas.reduce((sum, p) => sum + p.validation.length, 0);
        const passedValidations = generatedPersonas.reduce((sum, p) => sum + p.validation.filter(v => v.valid).length, 0);
        
        console.log(`Realism validation: ${passedValidations}/${totalValidations} checks passed (${(passedValidations/totalValidations*100).toFixed(1)}%)`);
        
        // Test consistency tracking retrieval
        console.log(`\n🔄 CONSISTENCY TRACKING TEST`);
        console.log('=============================');
        
        if (generatedPersonas.length > 0) {
            const testPersona = generatedPersonas[0];
            const retrievedData = await consistencyTracker.getRegistrationData(
                testPersona.persona.id,
                testSites[0].context.siteName
            );
            
            if (retrievedData) {
                console.log(`✅ Successfully retrieved stored data for ${testPersona.persona.identity.fullName}`);
                console.log(`   Stored persona ID: ${retrievedData.persona.id}`);
                console.log(`   Stored email: ${retrievedData.persona.identity.email}`);
            } else {
                console.log(`❌ Failed to retrieve stored data`);
            }
        }
        
        console.log(`\n🎉 CONTEXTUAL PERSONA GENERATION TEST COMPLETE`);
        console.log('==============================================');
        return {
            success: true,
            generatedPersonas: generatedPersonas.length,
            totalValidations: totalValidations,
            passedValidations: passedValidations
        };
        
    } catch (error) {
        console.error('Test failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Validate that generated persona data is realistic
 */
function validatePersonaRealism(persona, expectedType) {
    const validations = [];
    
    // Name realism
    const { firstName, lastName } = persona.identity;
    validations.push({
        aspect: 'Name Pattern',
        valid: firstName.length >= 2 && lastName.length >= 2 && 
               !firstName.includes('test') && !lastName.includes('test') &&
               !firstName.includes('123') && !lastName.includes('123'),
        message: `${firstName} ${lastName} looks realistic`
    });
    
    // Email realism
    const email = persona.identity.email;
    const emailParts = email.split('@');
    validations.push({
        aspect: 'Email Format',
        valid: emailParts.length === 2 && emailParts[0].length >= 3 && 
               ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'].includes(emailParts[1]),
        message: `${email} uses realistic domain`
    });
    
    // Age-income correlation
    const { age, income } = persona.demographics;
    const expectedMinIncome = Math.max(25000, (age - 22) * 3000);
    const expectedMaxIncome = Math.min(200000, (age - 22) * 8000 + 40000);
    
    validations.push({
        aspect: 'Age-Income Correlation',
        valid: income >= expectedMinIncome && income <= expectedMaxIncome,
        message: `$${income.toLocaleString()} is reasonable for age ${age}`
    });
    
    // Job title appropriateness
    const jobTitle = persona.identity.jobTitle;
    const seniorTitles = ['Director', 'VP', 'Senior', 'Executive', 'Chief'];
    const isJuniorAge = age < 30;
    const hasSeniorTitle = seniorTitles.some(title => jobTitle.includes(title));
    
    validations.push({
        aspect: 'Job Title Appropriateness',
        valid: !(isJuniorAge && hasSeniorTitle),
        message: `${jobTitle} appropriate for age ${age}`
    });
    
    // Geographic consistency
    const location = persona.demographics.location;
    const phone = persona.identity.phone;
    if (phone && location.state) {
        // Basic area code validation (simplified)
        const areaCode = phone.match(/\d{3}/)?.[0];
        const stateAreaCodes = {
            'TX': ['214', '469', '972', '512', '737'],
            'CA': ['213', '323', '424', '310', '415'],
            'NY': ['212', '347', '646', '718', '917']
        };
        
        const expectedCodes = stateAreaCodes[location.state];
        validations.push({
            aspect: 'Geographic Consistency',
            valid: !expectedCodes || expectedCodes.includes(areaCode),
            message: `Phone area code matches ${location.state}`
        });
    }
    
    // Context appropriateness
    if (expectedType === 'tech_professional') {
        const techJobs = ['Developer', 'Designer', 'Product', 'Engineer', 'Manager'];
        const isTechJob = techJobs.some(tech => jobTitle.includes(tech));
        
        validations.push({
            aspect: 'Context Appropriateness',
            valid: isTechJob,
            message: `${jobTitle} fits tech professional context`
        });
    }
    
    return validations;
}

// Run the test
if (require.main === module) {
    testContextualPersonaGeneration()
        .then(result => {
            if (result.success) {
                console.log(`\n✅ Test completed successfully!`);
                process.exit(0);
            } else {
                console.log(`\n❌ Test failed: ${result.error}`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = testContextualPersonaGeneration;