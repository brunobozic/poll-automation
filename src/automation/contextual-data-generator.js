/**
 * Contextual Data Generator
 * Generates realistic user data that matches site expectations and maintains consistency
 */

const IntelligentPersonaGenerator = require('../ai/intelligent-persona-generator');

class ContextualDataGenerator {
    constructor(options = {}) {
        this.options = {
            enableConsistencyTracking: options.enableConsistencyTracking !== false,
            personaComplexity: options.personaComplexity || 'medium',
            debugMode: options.debugMode || false,
            ...options
        };

        this.personaGenerator = new IntelligentPersonaGenerator({
            personaComplexity: this.options.personaComplexity,
            consistencyMode: 'strict'
        });

        // Track generated personas for consistency
        this.activePersonas = new Map();
    }

    /**
     * Generate contextual user data based on site analysis and form requirements
     */
    async generateContextualUserData(formAnalysis, siteContext, emailOverride = null, registrationLogger = null) {
        try {
            console.log('🧠 Generating contextual user data...');

            // Create site context from form analysis and URL
            const enhancedSiteContext = this.buildSiteContext(formAnalysis, siteContext);

            // Generate intelligent persona
            const persona = await this.personaGenerator.generateContextualPersona(
                enhancedSiteContext, 
                registrationLogger
            );

            // Override email if provided
            if (emailOverride) {
                persona.identity.email = emailOverride;
                // Adjust other data to maintain consistency with new email
                persona.identity = this.adjustPersonaForEmail(persona.identity, emailOverride);
            }

            // Map persona to form fields
            const userData = this.mapPersonaToFormFields(persona, formAnalysis);

            // Store for consistency tracking
            if (this.options.enableConsistencyTracking) {
                this.activePersonas.set(persona.identity.email, persona);
            }

            console.log(`✅ Generated persona: ${persona.identity.fullName} (${persona.identity.email})`);
            console.log(`📊 Context: ${enhancedSiteContext.expectedPersonaType} | Age: ${persona.demographics.age} | Job: ${persona.identity.jobTitle}`);

            return {
                userData,
                persona,
                consistencyAnchors: persona.background.consistency_anchors
            };

        } catch (error) {
            console.error('Contextual data generation failed:', error);
            // Fallback to basic realistic data
            return this.generateFallbackUserData(formAnalysis, emailOverride);
        }
    }

    /**
     * Build comprehensive site context from form analysis
     */
    buildSiteContext(formAnalysis, siteContext) {
        const url = siteContext?.url || formAnalysis?.pageUrl || '';
        const siteName = this.extractSiteName(url);

        // Detect form complexity and requirements
        const formFields = formAnalysis?.fields || [];
        const hasCompanyField = formFields.some(f => 
            f.purpose === 'company' || 
            f.selector?.includes('company') || 
            f.label?.toLowerCase().includes('company')
        );
        const hasProfessionalFields = formFields.some(f => 
            f.purpose === 'jobTitle' || 
            f.selector?.includes('job') || 
            f.label?.toLowerCase().includes('title')
        );

        // Analyze page content for context clues
        const pageContent = siteContext?.pageContent || '';
        const businessKeywords = ['business', 'enterprise', 'professional', 'corporate', 'organization'];
        const consumerKeywords = ['personal', 'individual', 'consumer', 'user', 'member'];
        
        const isBusinessFocused = businessKeywords.some(keyword => 
            pageContent.toLowerCase().includes(keyword) || url.toLowerCase().includes(keyword)
        );
        const isConsumerFocused = consumerKeywords.some(keyword => 
            pageContent.toLowerCase().includes(keyword)
        );

        return {
            url,
            siteName,
            formFields,
            pageContent,
            businessFocused: isBusinessFocused,
            consumerFocused: isConsumerFocused,
            hasCompanyField,
            hasProfessionalFields,
            formComplexity: this.assessFormComplexity(formFields),
            expectedPersonaType: this.determineExpectedPersonaType(siteName, isBusinessFocused, hasProfessionalFields)
        };
    }

    /**
     * Extract site name from URL for context analysis
     */
    extractSiteName(url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            if (hostname.includes('surveyplanet')) return 'surveyplanet';
            if (hostname.includes('typeform')) return 'typeform';
            if (hostname.includes('surveymonkey')) return 'surveymonkey';
            if (hostname.includes('google')) return 'google_forms';
            if (hostname.includes('jotform')) return 'jotform';
            if (hostname.includes('wufoo')) return 'wufoo';
            return 'generic';
        } catch {
            return 'generic';
        }
    }

    /**
     * Assess form complexity based on field count and types
     */
    assessFormComplexity(formFields) {
        const fieldCount = formFields.length;
        const hasAdvancedFields = formFields.some(f => 
            ['select', 'textarea', 'file'].includes(f.type) ||
            ['address', 'phone', 'company', 'jobTitle'].includes(f.purpose)
        );

        if (fieldCount > 10 || hasAdvancedFields) return 'high';
        if (fieldCount > 5) return 'medium';
        return 'simple';
    }

    /**
     * Determine expected persona type based on site and form analysis
     */
    determineExpectedPersonaType(siteName, isBusinessFocused, hasProfessionalFields) {
        // Site-specific patterns
        if (siteName === 'surveyplanet') return 'small_business_owner';
        if (siteName === 'typeform') return 'tech_professional';
        if (siteName === 'surveymonkey') return 'corporate_professional';

        // Form-based detection
        if (hasProfessionalFields && isBusinessFocused) return 'business_professional';
        if (hasProfessionalFields) return 'working_professional';
        if (isBusinessFocused) return 'business_consumer';

        return 'general_consumer';
    }

    /**
     * Map persona data to specific form fields
     */
    mapPersonaToFormFields(persona, formAnalysis) {
        const userData = {
            // Core identity
            email: persona.identity.email,
            firstName: persona.identity.firstName,
            lastName: persona.identity.lastName,
            fullName: persona.identity.fullName,
            password: persona.identity.password,
            phone: persona.identity.phone,

            // Professional
            jobTitle: persona.identity.jobTitle,
            company: persona.identity.company,

            // Demographics 
            age: persona.demographics.age,
            location: persona.demographics.location,

            // Form-specific mappings
            name: persona.identity.fullName,
            first_name: persona.identity.firstName,
            last_name: persona.identity.lastName,
            email_address: persona.identity.email, // Common variation
            username: persona.identity.email, // Often same as email
            
            // Address components
            city: persona.demographics.location.city,
            state: persona.demographics.location.state,
            zip: persona.demographics.location.zip,
            zipcode: persona.demographics.location.zip,
            postal_code: persona.demographics.location.zip,

            // Professional variations
            job_title: persona.identity.jobTitle,
            position: persona.identity.jobTitle,
            organization: persona.identity.company,
            workplace: persona.identity.company,

            // Phone variations
            telephone: persona.identity.phone,
            mobile: persona.identity.phone,
            phone_number: persona.identity.phone,

            // Commonly avoided fields (honeypots)
            website: '', // Intentionally empty
            url: '', // Intentionally empty
            homepage: '', // Intentionally empty
            bot_trap: '', // Intentionally empty
            winnie_the_pooh: '', // Intentionally empty

            // Metadata for consistency tracking
            _personaId: persona.id,
            _generationMethod: 'contextual_intelligent',
            _siteContext: formAnalysis?.siteContext || 'unknown'
        };

        // Add field-specific intelligent mapping
        const formFields = formAnalysis?.fields || [];
        formFields.forEach(field => {
            if (field.purpose && !userData[field.purpose]) {
                userData[field.purpose] = this.mapFieldPurposeToPersona(field.purpose, persona);
            }
        });

        return userData;
    }

    /**
     * Map specific field purposes to persona data
     */
    mapFieldPurposeToPersona(purpose, persona) {
        const mapping = {
            'email': persona.identity.email,
            'firstName': persona.identity.firstName,
            'lastName': persona.identity.lastName,
            'phone': persona.identity.phone,
            'password': persona.identity.password,
            'jobTitle': persona.identity.jobTitle,
            'company': persona.identity.company,
            'address': `${persona.demographics.location.city}, ${persona.demographics.location.state}`,
            'city': persona.demographics.location.city,
            'state': persona.demographics.location.state,
            'zip': persona.demographics.location.zip,
            'age': persona.demographics.age.toString(),
            'income': persona.demographics.income.toString(),
            'education': persona.demographics.education,
            'other': '' // Safe default for unknown fields
        };

        return mapping[purpose] || '';
    }

    /**
     * Adjust persona data to maintain consistency with provided email
     */
    adjustPersonaForEmail(identity, newEmail) {
        // Extract name patterns from email for consistency
        const emailParts = newEmail.split('@')[0].split(/[._-]/);
        
        // Try to match first/last name with email if reasonable
        if (emailParts.length >= 2) {
            const [emailFirst, emailLast] = emailParts;
            if (emailFirst.length > 2 && emailLast.length > 2) {
                // Check if email parts look like real names
                const firstMatch = this.isReasonableName(emailFirst);
                const lastMatch = this.isReasonableName(emailLast);
                
                if (firstMatch && lastMatch) {
                    identity.firstName = this.capitalizeFirst(emailFirst);
                    identity.lastName = this.capitalizeFirst(emailLast);
                    identity.fullName = `${identity.firstName} ${identity.lastName}`;
                }
            }
        }

        return identity;
    }

    /**
     * Check if string looks like a reasonable name
     */
    isReasonableName(str) {
        return /^[a-zA-Z]{2,15}$/.test(str) && !str.includes('123') && !str.includes('test');
    }

    /**
     * Capitalize first letter of string
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Generate fallback user data if intelligent generation fails
     */
    generateFallbackUserData(formAnalysis, emailOverride) {
        console.log('⚠️ Using fallback user data generation');

        const fallbackPersona = {
            firstName: 'Michael',
            lastName: 'Johnson',
            email: emailOverride || 'michael.johnson@gmail.com',
            password: 'SecurePass123!',
            phone: '+1-512-555-0123',
            jobTitle: 'Project Manager',
            company: 'Business Solutions Inc',
            age: 34,
            city: 'Austin',
            state: 'TX',
            zip: '78701'
        };

        return {
            userData: {
                ...fallbackPersona,
                fullName: `${fallbackPersona.firstName} ${fallbackPersona.lastName}`,
                name: `${fallbackPersona.firstName} ${fallbackPersona.lastName}`,
                first_name: fallbackPersona.firstName,
                last_name: fallbackPersona.lastName,
                email_address: fallbackPersona.email,
                username: fallbackPersona.email,
                job_title: fallbackPersona.jobTitle,
                organization: fallbackPersona.company,
                telephone: fallbackPersona.phone,
                zipcode: fallbackPersona.zip,
                postal_code: fallbackPersona.zip,
                
                // Empty honeypot fields
                website: '',
                url: '',
                homepage: '',
                bot_trap: '',
                winnie_the_pooh: '',
                
                _generationMethod: 'fallback'
            },
            persona: fallbackPersona,
            consistencyAnchors: {
                birth_year: new Date().getFullYear() - fallbackPersona.age,
                hometown: fallbackPersona.city,
                work_history: {
                    current_position: fallbackPersona.jobTitle,
                    years_in_current_role: 3,
                    total_experience: 12
                }
            }
        };
    }

    /**
     * Get stored persona for consistency checks
     */
    getStoredPersona(email) {
        return this.activePersonas.get(email);
    }

    /**
     * Validate data consistency with stored persona
     */
    validateConsistency(email, newData) {
        const storedPersona = this.getStoredPersona(email);
        if (!storedPersona) return { valid: true, warnings: [] };

        const warnings = [];
        const errors = [];

        // Check age consistency
        if (newData.age && Math.abs(newData.age - storedPersona.demographics.age) > 2) {
            errors.push(`Age inconsistency: stored ${storedPersona.demographics.age}, new ${newData.age}`);
        }

        // Check location consistency
        if (newData.state && newData.state !== storedPersona.demographics.location.state) {
            errors.push(`State inconsistency: stored ${storedPersona.demographics.location.state}, new ${newData.state}`);
        }

        // Check professional consistency
        if (newData.jobTitle && !this.isJobTitleCompatible(newData.jobTitle, storedPersona.identity.jobTitle)) {
            warnings.push(`Job title variation: stored ${storedPersona.identity.jobTitle}, new ${newData.jobTitle}`);
        }

        return {
            valid: errors.length === 0,
            warnings,
            errors
        };
    }

    /**
     * Check if job titles are reasonably compatible
     */
    isJobTitleCompatible(title1, title2) {
        const normalize = (title) => title.toLowerCase().replace(/[^a-z]/g, '');
        const norm1 = normalize(title1);
        const norm2 = normalize(title2);

        // Exact match
        if (norm1 === norm2) return true;

        // Common variations
        const variations = [
            ['manager', 'mgr', 'director'],
            ['developer', 'engineer', 'programmer'],
            ['analyst', 'researcher', 'specialist'],
            ['coordinator', 'assistant', 'associate']
        ];

        return variations.some(group => 
            group.some(variant => norm1.includes(variant)) &&
            group.some(variant => norm2.includes(variant))
        );
    }

    /**
     * Log debug information
     */
    log(message) {
        if (this.options.debugMode) {
            console.log(`[ContextualDataGenerator] ${message}`);
        }
    }
}

module.exports = ContextualDataGenerator;