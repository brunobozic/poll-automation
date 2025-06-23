/**
 * Intelligent Persona Generator
 * Creates realistic, contextual personas that adapt to site expectations
 * Ensures consistency across registration and survey interactions
 */

class IntelligentPersonaGenerator {
    constructor(options = {}) {
        this.options = {
            enableLLMGeneration: options.enableLLMGeneration !== false,
            personaComplexity: options.personaComplexity || 'medium',
            consistencyMode: options.consistencyMode || 'strict',
            ...options
        };

        // Realistic name pools by demographics
        this.nameData = {
            // Professional/Business contexts
            professional: {
                male: ['Michael Johnson', 'David Smith', 'Robert Williams', 'James Brown', 'Christopher Davis', 'Matthew Miller', 'Daniel Wilson', 'Anthony Moore', 'Mark Taylor', 'Steven Anderson'],
                female: ['Jennifer Smith', 'Lisa Johnson', 'Michelle Williams', 'Jennifer Brown', 'Amy Davis', 'Angela Wilson', 'Melissa Miller', 'Deborah Moore', 'Sharon Taylor', 'Cynthia Anderson']
            },
            // Consumer/Survey contexts  
            consumer: {
                male: ['Alex Johnson', 'Ryan Smith', 'Jordan Williams', 'Tyler Brown', 'Brandon Davis', 'Justin Miller', 'Kevin Wilson', 'Brian Moore', 'Sean Taylor', 'Aaron Anderson'],
                female: ['Ashley Johnson', 'Jessica Smith', 'Amanda Williams', 'Sarah Brown', 'Rachel Davis', 'Lauren Miller', 'Nicole Wilson', 'Stephanie Moore', 'Megan Taylor', 'Christina Anderson']
            },
            // Academic/Research contexts
            academic: {
                male: ['Dr. Thomas Johnson', 'Prof. Andrew Smith', 'Dr. Richard Williams', 'Andrew Brown', 'Jonathan Davis', 'Benjamin Miller', 'Alexander Wilson', 'Nicholas Moore', 'William Taylor', 'Samuel Anderson'],
                female: ['Dr. Elizabeth Johnson', 'Prof. Rebecca Smith', 'Dr. Catherine Williams', 'Rebecca Brown', 'Katherine Davis', 'Elizabeth Miller', 'Margaret Wilson', 'Patricia Moore', 'Linda Taylor', 'Barbara Anderson']
            }
        };

        // Contextual demographics by site type
        this.contextualProfiles = {
            'surveyplanet': {
                typical_user: 'small_business_owner',
                age_range: [28, 45],
                income_range: [45000, 85000],
                education: ['bachelor', 'some_college'],
                interests: ['business', 'marketing', 'technology'],
                job_titles: ['Manager', 'Owner', 'Director', 'Consultant', 'Coordinator']
            },
            'typeform': {
                typical_user: 'tech_savvy_professional',
                age_range: [25, 40],
                income_range: [55000, 120000],
                education: ['bachelor', 'master'],
                interests: ['technology', 'design', 'startup', 'productivity'],
                job_titles: ['Product Manager', 'Designer', 'Developer', 'Marketing Manager', 'Growth Manager']
            },
            'surveymonkey': {
                typical_user: 'corporate_professional',
                age_range: [30, 50],
                income_range: [65000, 150000],
                education: ['bachelor', 'master', 'mba'],
                interests: ['business', 'analytics', 'research', 'management'],
                job_titles: ['Research Director', 'VP Marketing', 'Analytics Manager', 'Senior Manager', 'Director']
            },
            'default': {
                typical_user: 'general_consumer',
                age_range: [25, 45],
                income_range: [35000, 75000],
                education: ['high_school', 'bachelor', 'some_college'],
                interests: ['family', 'entertainment', 'shopping', 'travel'],
                job_titles: ['Manager', 'Specialist', 'Coordinator', 'Assistant', 'Supervisor']
            }
        };

        // Industry-specific company patterns
        this.industryPatterns = {
            technology: ['TechSoft Solutions', 'DataVision Inc', 'CloudTech Systems', 'InnovateLabs', 'DigitalCore'],
            marketing: ['BrandForward Agency', 'MarketReach Group', 'Creative Solutions Inc', 'Growth Partners', 'Brand Dynamics'],
            consulting: ['Strategic Advisors', 'Business Solutions Group', 'Insight Partners', 'Advisory Services Inc', 'Consulting Plus'],
            healthcare: ['MedTech Solutions', 'HealthCare Partners', 'Wellness Group', 'Medical Associates', 'Care Solutions'],
            education: ['Learning Solutions', 'Education Partners', 'Training Associates', 'Academic Services', 'Knowledge Group']
        };
    }

    /**
     * Generate contextual persona based on site analysis
     */
    async generateContextualPersona(siteContext, registrationLogger = null) {
        try {
            // Analyze site context to determine appropriate persona type
            const siteProfile = this.analyzeSiteContext(siteContext);
            
            // Generate base demographic profile
            const demographics = this.generateDemographics(siteProfile);
            
            // Create realistic identity
            const identity = this.generateRealisticIdentity(demographics, siteProfile);
            
            // Generate consistent background story
            const background = await this.generateBackgroundStory(identity, demographics, siteProfile);
            
            // Create comprehensive persona
            const persona = {
                id: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                created_at: new Date().toISOString(),
                site_context: siteContext,
                
                // Core Identity
                identity: identity,
                
                // Demographics & Background
                demographics: demographics,
                background: background,
                
                // Survey Response Patterns
                response_patterns: this.generateResponsePatterns(demographics, siteProfile),
                
                // Consistency Tracking
                consistency_data: {
                    registration_responses: {},
                    survey_responses: {},
                    cross_references: [],
                    verification_points: []
                },
                
                // Metadata
                metadata: {
                    generation_method: 'intelligent_contextual',
                    complexity_level: this.options.personaComplexity,
                    last_updated: new Date().toISOString()
                }
            };

            // Log persona creation for consistency tracking
            if (registrationLogger) {
                await this.logPersonaCreation(persona, registrationLogger);
            }

            return persona;

        } catch (error) {
            console.error('Persona generation failed:', error);
            // Fallback to basic persona
            return this.generateBasicPersona(siteContext);
        }
    }

    /**
     * Analyze site context to determine appropriate persona characteristics
     */
    analyzeSiteContext(siteContext) {
        const { url, siteName, formFields, pageContent } = siteContext;
        
        // Detect site type from URL and content
        const siteKey = this.detectSiteType(url, siteName);
        const profile = this.contextualProfiles[siteKey] || this.contextualProfiles.default;
        
        // Analyze form complexity and requirements
        const formComplexity = this.analyzeFormComplexity(formFields);
        
        // Detect industry focus from page content
        const industryContext = this.detectIndustryContext(pageContent, formFields);
        
        return {
            siteKey,
            profile,
            formComplexity,
            industryContext,
            professional_level: this.determineProfessionalLevel(profile, formComplexity)
        };
    }

    /**
     * Generate appropriate demographics for the site context
     */
    generateDemographics(siteProfile) {
        const { profile } = siteProfile;
        
        // Select age within appropriate range
        const age = this.randomInRange(profile.age_range[0], profile.age_range[1]);
        
        // Select income within range (influences other characteristics)
        const income = this.randomInRange(profile.income_range[0], profile.income_range[1]);
        
        // Select education level
        const education = this.randomChoice(profile.education);
        
        // Generate location (realistic US locations)
        const location = this.generateRealisticLocation();
        
        return {
            age,
            income,
            education,
            location,
            interests: this.selectRelevantInterests(profile.interests, age, income),
            lifestyle: this.generateLifestyleProfile(age, income, education)
        };
    }

    /**
     * Generate realistic identity that matches demographics
     */
    generateRealisticIdentity(demographics, siteProfile) {
        const { age, income, education } = demographics;
        const { professional_level, industryContext } = siteProfile;
        
        // Choose appropriate name category
        let nameCategory = 'consumer';
        if (professional_level === 'high' || income > 80000) {
            nameCategory = 'professional';
        }
        if (education.includes('phd') || education.includes('master')) {
            nameCategory = 'academic';
        }
        
        // Select gender (influences name selection)
        const gender = Math.random() > 0.5 ? 'female' : 'male';
        
        // Select appropriate name
        const fullName = this.randomChoice(this.nameData[nameCategory][gender]);
        const [firstName, lastName] = fullName.split(' ');
        
        // Generate realistic email
        const emailPrefix = this.generateRealisticEmailPrefix(firstName, lastName, age);
        const emailDomain = this.selectAppropriateEmailDomain(professional_level, age);
        const email = `${emailPrefix}@${emailDomain}`;
        
        // Generate secure but memorable password
        const password = this.generateRealisticPassword(firstName, age);
        
        // Generate job title appropriate for context
        const jobTitle = this.generateJobTitle(siteProfile, demographics);
        
        // Generate company name if needed
        const company = this.generateCompanyName(industryContext, professional_level);
        
        return {
            firstName,
            lastName,
            fullName,
            email,
            password,
            gender,
            jobTitle,
            company,
            phone: this.generateRealisticPhone(demographics.location)
        };
    }

    /**
     * Generate comprehensive background story for consistency
     */
    async generateBackgroundStory(identity, demographics, siteProfile) {
        return {
            professional_background: this.generateProfessionalBackground(identity, demographics),
            personal_interests: this.generatePersonalInterests(demographics),
            technology_usage: this.generateTechUsagePattern(demographics.age, identity.jobTitle),
            survey_motivation: this.generateSurveyMotivation(siteProfile),
            consistency_anchors: this.generateConsistencyAnchors(identity, demographics)
        };
    }

    /**
     * Generate response patterns for survey consistency
     */
    generateResponsePatterns(demographics, siteProfile) {
        return {
            likert_scale_tendency: this.generateLikertTendency(demographics),
            open_text_style: this.generateTextStyle(demographics),
            rating_patterns: this.generateRatingPatterns(demographics),
            time_patterns: this.generateTimePatterns(demographics),
            consistency_rules: this.generateConsistencyRules(demographics)
        };
    }

    /**
     * Detect site type from URL and name
     */
    detectSiteType(url, siteName) {
        const urlLower = url?.toLowerCase() || '';
        const nameLower = siteName?.toLowerCase() || '';
        
        if (urlLower.includes('surveyplanet') || nameLower.includes('surveyplanet')) return 'surveyplanet';
        if (urlLower.includes('typeform') || nameLower.includes('typeform')) return 'typeform';
        if (urlLower.includes('surveymonkey') || nameLower.includes('surveymonkey')) return 'surveymonkey';
        
        return 'default';
    }

    /**
     * Generate realistic email prefix based on name and age
     */
    generateRealisticEmailPrefix(firstName, lastName, age) {
        const patterns = [
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
            `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}`,
            `${firstName.substring(0, 1).toLowerCase()}${lastName.toLowerCase()}`,
            `${firstName.toLowerCase()}${lastName.substring(0, 1).toLowerCase()}${age}`,
        ];
        
        return this.randomChoice(patterns);
    }

    /**
     * Select appropriate email domain based on professional level
     */
    selectAppropriateEmailDomain(professionalLevel, age) {
        const domains = {
            high: ['gmail.com', 'outlook.com', 'yahoo.com'],
            medium: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'],
            low: ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com']
        };
        
        // Younger users prefer Gmail, older users more diverse
        if (age < 30) {
            return Math.random() > 0.7 ? 'gmail.com' : this.randomChoice(domains[professionalLevel]);
        }
        
        return this.randomChoice(domains[professionalLevel]);
    }

    /**
     * Generate realistic but secure password
     */
    generateRealisticPassword(firstName, age) {
        const patterns = [
            `${firstName}${age}!`,
            `${firstName}${Math.floor(Math.random() * 999)}!`,
            `MyPass${age}!`,
            `${firstName.toLowerCase()}${age}$`,
            `Pass${firstName}${Math.floor(Math.random() * 99)}!`
        ];
        
        return this.randomChoice(patterns);
    }

    /**
     * Log persona creation for consistency tracking
     */
    async logPersonaCreation(persona, registrationLogger) {
        try {
            await registrationLogger.query(`
                INSERT INTO user_profiles (
                    persona_id, email, first_name, last_name, age, income, 
                    education, job_title, company, location, phone,
                    demographics_data, response_patterns, background_story,
                    created_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                persona.id,
                persona.identity.email,
                persona.identity.firstName,
                persona.identity.lastName,
                persona.demographics.age,
                persona.demographics.income,
                persona.demographics.education,
                persona.identity.jobTitle,
                persona.identity.company,
                JSON.stringify(persona.demographics.location),
                persona.identity.phone,
                JSON.stringify(persona.demographics),
                JSON.stringify(persona.response_patterns),
                JSON.stringify(persona.background),
                persona.created_at,
                JSON.stringify(persona.metadata)
            ]);

            console.log(`✅ Persona logged: ${persona.identity.fullName} (${persona.id})`);
        } catch (error) {
            console.error('Failed to log persona:', error);
        }
    }

    /**
     * Utility methods
     */
    randomInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    generateRealisticLocation() {
        const cities = [
            { city: 'Austin', state: 'TX', zip: '78701' },
            { city: 'Seattle', state: 'WA', zip: '98101' },
            { city: 'Denver', state: 'CO', zip: '80201' },
            { city: 'Atlanta', state: 'GA', zip: '30301' },
            { city: 'San Diego', state: 'CA', zip: '92101' },
            { city: 'Phoenix', state: 'AZ', zip: '85001' },
            { city: 'Charlotte', state: 'NC', zip: '28201' },
            { city: 'Nashville', state: 'TN', zip: '37201' }
        ];
        
        return this.randomChoice(cities);
    }

    generateJobTitle(siteProfile, demographics) {
        const titles = siteProfile.profile.job_titles;
        return this.randomChoice(titles);
    }

    generateCompanyName(industryContext, professionalLevel) {
        if (professionalLevel === 'low') return null;
        
        const industry = industryContext || 'technology';
        const companies = this.industryPatterns[industry] || this.industryPatterns.technology;
        return this.randomChoice(companies);
    }

    generateProfessionalBackground(identity, demographics) {
        return {
            experience_years: Math.max(demographics.age - 22, 1),
            industry: this.selectIndustry(identity.jobTitle),
            career_stage: this.determineCareerStage(demographics.age, demographics.income),
            skills: this.generateRelevantSkills(identity.jobTitle)
        };
    }

    generateConsistencyAnchors(identity, demographics) {
        return {
            birth_year: new Date().getFullYear() - demographics.age,
            hometown: demographics.location.city,
            education_details: this.expandEducation(demographics.education),
            work_history: this.generateWorkHistory(identity, demographics),
            personal_details: this.generatePersonalDetails(demographics)
        };
    }

    // Additional helper methods for completeness
    analyzeFormComplexity(formFields) {
        if (!formFields) return 'simple';
        const fieldCount = formFields.length;
        if (fieldCount > 10) return 'complex';
        if (fieldCount > 5) return 'medium';
        return 'simple';
    }

    detectIndustryContext(pageContent, formFields) {
        const content = (pageContent || '').toLowerCase();
        if (content.includes('business') || content.includes('enterprise')) return 'business';
        if (content.includes('technology') || content.includes('software')) return 'technology';
        if (content.includes('marketing') || content.includes('advertising')) return 'marketing';
        return 'general';
    }

    determineProfessionalLevel(profile, formComplexity) {
        if (profile.typical_user === 'corporate_professional') return 'high';
        if (formComplexity === 'complex') return 'medium';
        return 'low';
    }

    selectRelevantInterests(profileInterests, age, income) {
        return profileInterests.slice(0, 3);
    }

    generateLifestyleProfile(age, income, education) {
        return {
            tech_savvy: age < 40 && education !== 'high_school',
            price_conscious: income < 50000,
            time_conscious: income > 70000,
            family_oriented: age > 28 && age < 45
        };
    }

    generateLikertTendency(demographics) {
        // Generate consistent response tendencies
        return {
            optimism_bias: this.randomInRange(2, 5), // 1-5 scale
            extreme_avoidance: Math.random() > 0.7, // Avoid 1s and 5s
            consistency_level: 0.8 + Math.random() * 0.2 // High consistency
        };
    }

    generateTextStyle(demographics) {
        return {
            verbosity: demographics.education.includes('master') ? 'high' : 'medium',
            formality: demographics.income > 70000 ? 'formal' : 'casual',
            detail_level: 'medium'
        };
    }

    generateRatingPatterns(demographics) {
        return {
            star_rating_tendency: this.randomInRange(3, 4), // Slightly positive
            nps_tendency: this.randomInRange(7, 9), // Promoter range
            satisfaction_baseline: this.randomInRange(6, 8) // Generally satisfied
        };
    }

    generateTimePatterns(demographics) {
        return {
            response_speed: demographics.age < 35 ? 'fast' : 'medium',
            completion_rate: 0.85 + Math.random() * 0.15,
            attention_span: demographics.age > 40 ? 'high' : 'medium'
        };
    }

    generateConsistencyRules(demographics) {
        return {
            income_bracket_consistency: true,
            age_related_consistency: true,
            education_alignment: true,
            geographic_consistency: true
        };
    }

    selectIndustry(jobTitle) {
        const industryMap = {
            'Manager': 'business',
            'Director': 'business',
            'Developer': 'technology',
            'Designer': 'technology',
            'Marketing': 'marketing',
            'Research': 'academic'
        };
        
        for (const [key, industry] of Object.entries(industryMap)) {
            if (jobTitle.includes(key)) return industry;
        }
        return 'business';
    }

    determineCareerStage(age, income) {
        if (age < 30) return 'early';
        if (age < 45 && income > 80000) return 'senior';
        if (age > 45) return 'executive';
        return 'mid';
    }

    generateRelevantSkills(jobTitle) {
        const skillMap = {
            'Manager': ['leadership', 'project_management', 'communication'],
            'Developer': ['programming', 'problem_solving', 'technical_analysis'],
            'Designer': ['creativity', 'user_experience', 'visual_design'],
            'Marketing': ['analytics', 'communication', 'strategy']
        };
        
        for (const [key, skills] of Object.entries(skillMap)) {
            if (jobTitle.includes(key)) return skills;
        }
        return ['communication', 'teamwork', 'problem_solving'];
    }

    expandEducation(education) {
        const details = {
            'high_school': { degree: 'High School Diploma', institution: 'Local High School' },
            'some_college': { degree: 'Some College', institution: 'State University' },
            'bachelor': { degree: 'Bachelor\'s Degree', institution: 'State University' },
            'master': { degree: 'Master\'s Degree', institution: 'State University' },
            'mba': { degree: 'MBA', institution: 'Business School' }
        };
        return details[education] || details['bachelor'];
    }

    generateWorkHistory(identity, demographics) {
        const yearsExperience = Math.max(demographics.age - 22, 1);
        return {
            current_position: identity.jobTitle,
            years_in_current_role: Math.min(yearsExperience, 5),
            total_experience: yearsExperience,
            industry_experience: Math.max(yearsExperience - 2, 1)
        };
    }

    generatePersonalDetails(demographics) {
        return {
            marital_status: demographics.age > 30 ? 'married' : 'single',
            children: demographics.age > 28 && Math.random() > 0.6,
            homeowner: demographics.income > 50000 && demographics.age > 25,
            vehicle_owner: demographics.age > 21
        };
    }

    generatePersonalInterests(demographics) {
        const { age, income, education } = demographics;
        const interests = [];

        // Age-based interests
        if (age < 30) {
            interests.push('technology', 'social_media', 'gaming', 'travel');
        } else if (age < 45) {
            interests.push('career_development', 'family', 'home_improvement', 'fitness');
        } else {
            interests.push('finance', 'health', 'hobbies', 'community');
        }

        // Income-based interests
        if (income > 75000) {
            interests.push('investing', 'luxury_travel', 'fine_dining');
        } else if (income < 40000) {
            interests.push('budgeting', 'diy_projects', 'local_events');
        }

        // Education-based interests
        if (education.includes('master') || education.includes('phd')) {
            interests.push('research', 'learning', 'professional_development');
        }

        return interests.slice(0, 5); // Return top 5 interests
    }

    generateTechUsagePattern(age, jobTitle) {
        const patterns = {
            social_media_usage: age < 35 ? 'high' : 'medium',
            smartphone_proficiency: age < 40 ? 'expert' : 'intermediate',
            computer_usage: jobTitle.includes('Developer') || jobTitle.includes('Designer') ? 'expert' : 'intermediate',
            online_shopping: age < 50 ? 'frequent' : 'occasional',
            cloud_services: jobTitle.includes('Manager') || age < 35 ? 'advanced' : 'basic'
        };

        return patterns;
    }

    generateSurveyMotivation(siteProfile) {
        const motivations = {
            'surveyplanet': 'Growing my small business and need better customer feedback tools',
            'typeform': 'Creating engaging user experiences for our product team',
            'surveymonkey': 'Conducting market research for strategic business decisions',
            'default': 'Interested in participating in surveys and sharing my opinions'
        };
        
        return motivations[siteProfile.siteKey] || motivations.default;
    }

    generateRealisticPhone(location) {
        const areaCodes = {
            'Austin': '512',
            'Seattle': '206',
            'Denver': '303',
            'Atlanta': '404',
            'San Diego': '619',
            'Phoenix': '602',
            'Charlotte': '704',
            'Nashville': '615'
        };
        
        const areaCode = areaCodes[location.city] || '555';
        const exchange = Math.floor(Math.random() * 900) + 100;
        const number = Math.floor(Math.random() * 9000) + 1000;
        
        return `+1-${areaCode}-${exchange}-${number}`;
    }

    generateSurveyMotivation(siteProfile) {
        const motivations = {
            'surveyplanet': 'Growing my small business and need better customer feedback tools',
            'typeform': 'Creating engaging user experiences for our product team',
            'surveymonkey': 'Conducting market research for strategic business decisions',
            'default': 'Interested in participating in surveys and sharing my opinions'
        };
        
        return motivations[siteProfile.siteKey] || motivations.default;
    }

    /**
     * Generate fallback basic persona if intelligent generation fails
     */
    generateBasicPersona(siteContext) {
        const firstName = 'Alex';
        const lastName = 'Johnson';
        
        return {
            id: `basic_persona_${Date.now()}`,
            identity: {
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`,
                password: 'SecurePass123!',
                gender: 'male',
                jobTitle: 'Manager',
                company: 'Business Solutions Inc',
                phone: '+1-555-0123'
            },
            demographics: {
                age: 32,
                income: 65000,
                education: 'bachelor',
                location: { city: 'Austin', state: 'TX', zip: '78701' }
            },
            metadata: {
                generation_method: 'basic_fallback',
                created_at: new Date().toISOString()
            }
        };
    }
}

module.exports = IntelligentPersonaGenerator;