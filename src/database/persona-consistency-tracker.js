/**
 * Persona Consistency Tracker
 * Maintains consistency between registration data and survey responses
 * Prevents detection by cross-referencing systems
 */

class PersonaConsistencyTracker {
    constructor(registrationLogger) {
        this.registrationLogger = registrationLogger;
        this.consistencyRules = this.initializeConsistencyRules();
        this.crossReferencePoints = new Map();
    }

    /**
     * Initialize consistency validation rules
     */
    initializeConsistencyRules() {
        return {
            // Demographic consistency rules
            age_income_correlation: {
                validate: (age, income) => {
                    if (age < 25 && income > 80000) return { valid: false, reason: 'Income too high for age' };
                    if (age > 45 && income < 30000) return { valid: false, reason: 'Income too low for age' };
                    return { valid: true };
                }
            },
            
            // Education-job consistency
            education_job_alignment: {
                validate: (education, jobTitle) => {
                    if (education === 'high_school' && jobTitle.includes('Director')) {
                        return { valid: false, reason: 'Job level too high for education' };
                    }
                    return { valid: true };
                }
            },
            
            // Geographic consistency  
            location_consistency: {
                validate: (city, state, zip, phone) => {
                    // Basic area code validation
                    const areaCodes = {
                        'TX': ['512', '214', '713', '281'],
                        'CA': ['213', '310', '415', '619'],
                        'NY': ['212', '718', '347', '917']
                    };
                    
                    if (phone && areaCodes[state]) {
                        const phoneAreaCode = phone.match(/\d{3}/)?.[0];
                        if (phoneAreaCode && !areaCodes[state].includes(phoneAreaCode)) {
                            return { valid: false, reason: 'Phone area code mismatch with state' };
                        }
                    }
                    return { valid: true };
                }
            },
            
            // Response pattern consistency
            response_pattern_consistency: {
                validate: (previousResponses, newResponse, questionType) => {
                    if (questionType === 'likert_scale') {
                        const avgPrevious = this.calculateAverageLikert(previousResponses);
                        const deviation = Math.abs(newResponse - avgPrevious);
                        if (deviation > 2) {
                            return { valid: false, reason: 'Response pattern deviation too high' };
                        }
                    }
                    return { valid: true };
                }
            }
        };
    }

    /**
     * Store registration data for future consistency checking
     */
    async storeRegistrationData(personaId, siteId, registrationData) {
        try {
            const consistencyId = `consistency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await this.registrationLogger.query(`
                INSERT INTO persona_consistency_tracking (
                    consistency_id, persona_id, site_id, data_type, data_content,
                    cross_reference_points, created_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                consistencyId,
                personaId,
                siteId,
                'registration',
                JSON.stringify(registrationData),
                JSON.stringify(this.extractCrossReferencePoints(registrationData)),
                new Date().toISOString(),
                JSON.stringify({ source: 'registration_form' })
            ]);

            // Store in memory for quick access
            this.crossReferencePoints.set(personaId, {
                ...this.crossReferencePoints.get(personaId) || {},
                registration: registrationData
            });

            console.log(`✅ Registration data stored for persona ${personaId} on ${siteId}`);
            return { success: true, consistencyId };

        } catch (error) {
            console.error('Failed to store registration data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate survey response for consistency with registration data
     */
    async validateSurveyResponse(personaId, siteId, questionData, responseData) {
        try {
            // Get stored registration data
            const registrationData = await this.getRegistrationData(personaId, siteId);
            if (!registrationData) {
                return { valid: true, warning: 'No registration data found for comparison' };
            }

            // Run consistency checks
            const validationResults = [];

            // Check demographic consistency
            if (questionData.category === 'demographics') {
                const demoValidation = this.validateDemographicConsistency(
                    registrationData, 
                    questionData, 
                    responseData
                );
                validationResults.push(demoValidation);
            }

            // Check professional consistency
            if (questionData.category === 'professional') {
                const profValidation = this.validateProfessionalConsistency(
                    registrationData,
                    questionData,
                    responseData
                );
                validationResults.push(profValidation);
            }

            // Check behavioral consistency
            if (questionData.category === 'behavioral') {
                const behaviorValidation = this.validateBehavioralConsistency(
                    personaId,
                    questionData,
                    responseData
                );
                validationResults.push(behaviorValidation);
            }

            // Compile results
            const failedValidations = validationResults.filter(v => !v.valid);
            const warnings = validationResults.filter(v => v.warning);

            const result = {
                valid: failedValidations.length === 0,
                warnings: warnings.map(w => w.warning),
                errors: failedValidations.map(f => f.reason),
                recommendations: this.generateConsistencyRecommendations(failedValidations)
            };

            // Log validation result
            await this.logConsistencyCheck(personaId, siteId, questionData, responseData, result);

            return result;

        } catch (error) {
            console.error('Consistency validation failed:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Generate corrected response that maintains consistency
     */
    async generateConsistentResponse(personaId, siteId, questionData, originalResponse) {
        try {
            const registrationData = await this.getRegistrationData(personaId, siteId);
            const persona = await this.getPersonaProfile(personaId);

            if (!registrationData || !persona) {
                return { response: originalResponse, changes: [] };
            }

            let correctedResponse = originalResponse;
            const changes = [];

            // Apply consistency corrections based on question type
            switch (questionData.type) {
                case 'age_range':
                    correctedResponse = this.correctAgeResponse(persona.demographics.age, originalResponse);
                    break;

                case 'income_range':
                    correctedResponse = this.correctIncomeResponse(persona.demographics.income, originalResponse);
                    break;

                case 'education_level':
                    correctedResponse = this.correctEducationResponse(persona.demographics.education, originalResponse);
                    break;

                case 'job_title':
                    correctedResponse = this.correctJobTitleResponse(persona.identity.jobTitle, originalResponse);
                    break;

                case 'location':
                    correctedResponse = this.correctLocationResponse(persona.demographics.location, originalResponse);
                    break;

                case 'company_size':
                    correctedResponse = this.correctCompanySizeResponse(persona.identity.company, originalResponse);
                    break;
            }

            if (correctedResponse !== originalResponse) {
                changes.push({
                    field: questionData.type,
                    original: originalResponse,
                    corrected: correctedResponse,
                    reason: 'Consistency with registration data'
                });
            }

            return { response: correctedResponse, changes };

        } catch (error) {
            console.error('Response correction failed:', error);
            return { response: originalResponse, changes: [], error: error.message };
        }
    }

    /**
     * Extract key data points for cross-referencing
     */
    extractCrossReferencePoints(data) {
        return {
            age_indicators: this.extractAgeIndicators(data),
            income_indicators: this.extractIncomeIndicators(data),
            education_indicators: this.extractEducationIndicators(data),
            location_indicators: this.extractLocationIndicators(data),
            professional_indicators: this.extractProfessionalIndicators(data),
            lifestyle_indicators: this.extractLifestyleIndicators(data)
        };
    }

    /**
     * Validate demographic consistency
     */
    validateDemographicConsistency(registrationData, questionData, responseData) {
        const persona = registrationData.persona || registrationData;
        
        switch (questionData.field) {
            case 'age':
                return this.validateAge(persona.demographics?.age, responseData);
            case 'income':
                return this.validateIncome(persona.demographics?.income, responseData);
            case 'education':
                return this.validateEducation(persona.demographics?.education, responseData);
            case 'location':
                return this.validateLocation(persona.demographics?.location, responseData);
            default:
                return { valid: true };
        }
    }

    /**
     * Validate professional consistency
     */
    validateProfessionalConsistency(registrationData, questionData, responseData) {
        const persona = registrationData.persona || registrationData;
        
        switch (questionData.field) {
            case 'job_title':
                return this.validateJobTitle(persona.identity?.jobTitle, responseData);
            case 'company':
                return this.validateCompany(persona.identity?.company, responseData);
            case 'industry':
                return this.validateIndustry(persona.background?.professional_background?.industry, responseData);
            default:
                return { valid: true };
        }
    }

    /**
     * Get stored registration data for persona
     */
    async getRegistrationData(personaId, siteId) {
        try {
            const result = await this.registrationLogger.query(`
                SELECT data_content FROM persona_consistency_tracking 
                WHERE persona_id = ? AND site_id = ? AND data_type = 'registration'
                ORDER BY created_at DESC LIMIT 1
            `, [personaId, siteId]);

            if (result.length > 0) {
                return JSON.parse(result[0].data_content);
            }
            return null;
        } catch (error) {
            console.error('Failed to retrieve registration data:', error);
            return null;
        }
    }

    /**
     * Get persona profile
     */
    async getPersonaProfile(personaId) {
        try {
            const result = await this.registrationLogger.query(`
                SELECT * FROM user_profiles WHERE persona_id = ? LIMIT 1
            `, [personaId]);

            if (result.length > 0) {
                const profile = result[0];
                return {
                    identity: {
                        firstName: profile.first_name,
                        lastName: profile.last_name,
                        email: profile.email,
                        jobTitle: profile.job_title,
                        company: profile.company,
                        phone: profile.phone
                    },
                    demographics: JSON.parse(profile.demographics_data || '{}'),
                    background: JSON.parse(profile.background_story || '{}'),
                    response_patterns: JSON.parse(profile.response_patterns || '{}')
                };
            }
            return null;
        } catch (error) {
            console.error('Failed to retrieve persona profile:', error);
            return null;
        }
    }

    /**
     * Specific validation methods
     */
    validateAge(registeredAge, responseData) {
        if (!registeredAge || !responseData.age_range) {
            return { valid: true };
        }

        const [minAge, maxAge] = responseData.age_range.split('-').map(Number);
        if (registeredAge < minAge || registeredAge > maxAge) {
            return {
                valid: false,
                reason: `Age ${registeredAge} not in selected range ${responseData.age_range}`
            };
        }
        return { valid: true };
    }

    validateIncome(registeredIncome, responseData) {
        if (!registeredIncome || !responseData.income_range) {
            return { valid: true };
        }

        const [minIncome, maxIncome] = responseData.income_range.split('-').map(i => parseInt(i.replace(/[$,]/g, '')));
        if (registeredIncome < minIncome || registeredIncome > maxIncome) {
            return {
                valid: false,
                reason: `Income $${registeredIncome} not in selected range ${responseData.income_range}`
            };
        }
        return { valid: true };
    }

    /**
     * Response correction methods
     */
    correctAgeResponse(actualAge, responseOptions) {
        if (!actualAge || !Array.isArray(responseOptions)) return responseOptions;

        return responseOptions.filter(option => {
            const [min, max] = option.split('-').map(Number);
            return actualAge >= min && actualAge <= max;
        })[0] || responseOptions[0];
    }

    correctIncomeResponse(actualIncome, responseOptions) {
        if (!actualIncome || !Array.isArray(responseOptions)) return responseOptions;

        return responseOptions.filter(option => {
            const [min, max] = option.split('-').map(i => parseInt(i.replace(/[$,]/g, '')));
            return actualIncome >= min && actualIncome <= max;
        })[0] || responseOptions[0];
    }

    /**
     * Log consistency check results
     */
    async logConsistencyCheck(personaId, siteId, questionData, responseData, validationResult) {
        try {
            await this.registrationLogger.query(`
                INSERT INTO consistency_checks (
                    persona_id, site_id, question_type, question_data,
                    response_data, validation_result, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                personaId,
                siteId,
                questionData.type,
                JSON.stringify(questionData),
                JSON.stringify(responseData),
                JSON.stringify(validationResult),
                new Date().toISOString()
            ]);
        } catch (error) {
            console.error('Failed to log consistency check:', error);
        }
    }

    /**
     * Helper methods for data extraction
     */
    extractAgeIndicators(data) {
        const indicators = [];
        if (data.age) indicators.push({ type: 'exact', value: data.age });
        if (data.birth_year) indicators.push({ type: 'birth_year', value: data.birth_year });
        if (data.graduation_year) indicators.push({ type: 'graduation_year', value: data.graduation_year });
        return indicators;
    }

    extractIncomeIndicators(data) {
        const indicators = [];
        if (data.income) indicators.push({ type: 'exact', value: data.income });
        if (data.salary) indicators.push({ type: 'salary', value: data.salary });
        if (data.job_level) indicators.push({ type: 'job_level', value: data.job_level });
        return indicators;
    }

    extractEducationIndicators(data) {
        const indicators = [];
        if (data.education) indicators.push({ type: 'level', value: data.education });
        if (data.degree) indicators.push({ type: 'degree', value: data.degree });
        if (data.school) indicators.push({ type: 'institution', value: data.school });
        return indicators;
    }

    extractLocationIndicators(data) {
        const indicators = [];
        if (data.city) indicators.push({ type: 'city', value: data.city });
        if (data.state) indicators.push({ type: 'state', value: data.state });
        if (data.zip) indicators.push({ type: 'zip', value: data.zip });
        if (data.phone) indicators.push({ type: 'area_code', value: data.phone.substring(0, 3) });
        return indicators;
    }

    extractProfessionalIndicators(data) {
        const indicators = [];
        if (data.job_title) indicators.push({ type: 'title', value: data.job_title });
        if (data.company) indicators.push({ type: 'company', value: data.company });
        if (data.industry) indicators.push({ type: 'industry', value: data.industry });
        return indicators;
    }

    extractLifestyleIndicators(data) {
        const indicators = [];
        if (data.marital_status) indicators.push({ type: 'marital', value: data.marital_status });
        if (data.children) indicators.push({ type: 'children', value: data.children });
        if (data.homeowner) indicators.push({ type: 'housing', value: data.homeowner });
        return indicators;
    }

    calculateAverageLikert(responses) {
        if (!responses || responses.length === 0) return 3; // Neutral default
        const sum = responses.reduce((acc, r) => acc + (r.value || 3), 0);
        return sum / responses.length;
    }

    generateConsistencyRecommendations(failedValidations) {
        return failedValidations.map(validation => ({
            issue: validation.reason,
            recommendation: `Update response to maintain consistency with registration data`,
            severity: 'high'
        }));
    }

    validateBehavioralConsistency(personaId, questionData, responseData) {
        // Implement behavioral pattern validation
        return { valid: true };
    }

    validateJobTitle(registeredTitle, responseData) {
        if (!registeredTitle || !responseData.job_category) {
            return { valid: true };
        }

        // Map job titles to categories for consistency
        const titleCategories = {
            'Manager': 'management',
            'Director': 'management',
            'Developer': 'technology',
            'Designer': 'creative',
            'Marketing': 'marketing'
        };

        const registeredCategory = Object.entries(titleCategories)
            .find(([title, _]) => registeredTitle.includes(title))?.[1];

        if (registeredCategory && registeredCategory !== responseData.job_category) {
            return {
                valid: false,
                reason: `Job title ${registeredTitle} doesn't match selected category ${responseData.job_category}`
            };
        }

        return { valid: true };
    }

    validateCompany(registeredCompany, responseData) {
        // Basic company validation - could be enhanced
        return { valid: true };
    }

    validateIndustry(registeredIndustry, responseData) {
        if (!registeredIndustry || !responseData.industry) {
            return { valid: true };
        }

        if (registeredIndustry !== responseData.industry) {
            return {
                valid: false,
                reason: `Industry mismatch: registered ${registeredIndustry}, responded ${responseData.industry}`
            };
        }

        return { valid: true };
    }

    validateEducation(registeredEducation, responseData) {
        if (!registeredEducation || !responseData.education_level) {
            return { valid: true };
        }

        // Map education levels for comparison
        const educationLevels = {
            'high_school': 1,
            'some_college': 2,
            'bachelor': 3,
            'master': 4,
            'phd': 5
        };

        const registeredLevel = educationLevels[registeredEducation] || 3;
        const responseLevel = educationLevels[responseData.education_level] || 3;

        if (Math.abs(registeredLevel - responseLevel) > 1) {
            return {
                valid: false,
                reason: `Education level mismatch: registered ${registeredEducation}, responded ${responseData.education_level}`
            };
        }

        return { valid: true };
    }

    validateLocation(registeredLocation, responseData) {
        if (!registeredLocation || !responseData.location) {
            return { valid: true };
        }

        // Check state consistency
        if (registeredLocation.state !== responseData.state) {
            return {
                valid: false,
                reason: `State mismatch: registered ${registeredLocation.state}, responded ${responseData.state}`
            };
        }

        return { valid: true };
    }

    correctEducationResponse(actualEducation, responseOptions) {
        if (!actualEducation || !Array.isArray(responseOptions)) return responseOptions;

        // Find matching education level
        const educationMap = {
            'high_school': ['High School', 'Diploma', 'GED'],
            'some_college': ['Some College', 'Associate'],
            'bachelor': ['Bachelor', 'Undergraduate', 'BA', 'BS'],
            'master': ['Master', 'Graduate', 'MA', 'MS', 'MBA'],
            'phd': ['PhD', 'Doctorate', 'Doctoral']
        };

        const keywords = educationMap[actualEducation] || [];
        const match = responseOptions.find(option => 
            keywords.some(keyword => option.toLowerCase().includes(keyword.toLowerCase()))
        );

        return match || responseOptions[0];
    }

    correctJobTitleResponse(actualJobTitle, responseOptions) {
        if (!actualJobTitle || !Array.isArray(responseOptions)) return responseOptions;

        // Find best matching job category
        const match = responseOptions.find(option => 
            actualJobTitle.toLowerCase().includes(option.toLowerCase()) ||
            option.toLowerCase().includes(actualJobTitle.toLowerCase())
        );

        return match || responseOptions[0];
    }

    correctLocationResponse(actualLocation, responseOptions) {
        if (!actualLocation || !Array.isArray(responseOptions)) return responseOptions;

        // Find matching location option
        const match = responseOptions.find(option => 
            option.includes(actualLocation.state) || 
            option.includes(actualLocation.city)
        );

        return match || responseOptions[0];
    }

    correctCompanySizeResponse(actualCompany, responseOptions) {
        if (!actualCompany || !Array.isArray(responseOptions)) return responseOptions;

        // Estimate company size based on name patterns
        if (actualCompany.includes('Inc') || actualCompany.includes('Corp')) {
            return responseOptions.find(opt => opt.includes('50-200')) || responseOptions[0];
        }
        
        return responseOptions.find(opt => opt.includes('10-50')) || responseOptions[0];
    }
}

module.exports = PersonaConsistencyTracker;