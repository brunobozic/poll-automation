/**
 * AI-Powered Demographic Optimizer
 * Generates optimal demographics for maximum survey yield while maintaining realism
 */

class DemographicOptimizer {
    constructor() {
        // High-yield demographic patterns based on survey industry research
        this.highYieldDemographics = {
            age: {
                // Ages 25-45 get most surveys
                optimal: [25, 28, 30, 32, 35, 38, 40, 42, 45],
                weights: [0.9, 0.95, 1.0, 0.98, 1.0, 0.95, 0.9, 0.85, 0.8]
            },
            gender: {
                // Females often get more consumer/lifestyle surveys
                optimal: ['female', 'male'],
                weights: [0.6, 0.4] // 60% female for higher yield
            },
            income: {
                // Middle-upper income brackets get most surveys
                optimal: ['25k-50k', '50k-75k', '75k-100k', '100k-150k'],
                weights: [0.7, 1.0, 0.95, 0.8]
            },
            education: {
                // College-educated get more surveys
                optimal: ['some_college', 'bachelors', 'masters'],
                weights: [0.8, 1.0, 0.9]
            },
            occupation: {
                // Professional occupations get more surveys
                optimal: [
                    'Marketing Specialist', 'Software Engineer', 'Accountant', 'Teacher', 
                    'Nurse', 'Sales Representative', 'Project Manager', 'Graphic Designer',
                    'Administrative Assistant', 'Customer Service Representative',
                    'Consultant', 'Analyst', 'Manager', 'Coordinator'
                ],
                weights: [1.0, 0.95, 0.9, 0.95, 0.9, 0.85, 0.95, 0.8, 0.8, 0.75, 0.9, 0.9, 0.85, 0.8]
            },
            maritalStatus: {
                optimal: ['married', 'single', 'divorced'],
                weights: [0.6, 0.3, 0.1] // Married people often targeted more
            },
            householdSize: {
                optimal: [2, 3, 4, 1],
                weights: [0.4, 0.3, 0.2, 0.1]
            }
        };

        // Interests that survey companies target
        this.highYieldInterests = [
            'Shopping', 'Technology', 'Travel', 'Health & Fitness', 'Food & Cooking',
            'Entertainment', 'Finance', 'Home & Garden', 'Fashion', 'Automotive',
            'Sports', 'Beauty & Personal Care', 'Parenting', 'Pets', 'Environmental Issues'
        ];

        // US locations with high survey activity
        this.highYieldLocations = [
            { city: 'New York', state: 'NY', weight: 1.0 },
            { city: 'Los Angeles', state: 'CA', weight: 0.95 },
            { city: 'Chicago', state: 'IL', weight: 0.9 },
            { city: 'Houston', state: 'TX', weight: 0.85 },
            { city: 'Phoenix', state: 'AZ', weight: 0.8 },
            { city: 'Philadelphia', state: 'PA', weight: 0.85 },
            { city: 'San Antonio', state: 'TX', weight: 0.8 },
            { city: 'San Diego', state: 'CA', weight: 0.85 },
            { city: 'Dallas', state: 'TX', weight: 0.85 },
            { city: 'Austin', state: 'TX', weight: 0.9 },
            { city: 'Atlanta', state: 'GA', weight: 0.85 },
            { city: 'Miami', state: 'FL', weight: 0.8 },
            { city: 'Seattle', state: 'WA', weight: 0.9 },
            { city: 'Denver', state: 'CO', weight: 0.85 },
            { city: 'Boston', state: 'MA', weight: 0.9 }
        ];

        this.firstNames = {
            female: ['Sarah', 'Jessica', 'Emily', 'Ashley', 'Amanda', 'Jennifer', 'Stephanie', 'Nicole', 'Elizabeth', 'Rachel', 'Samantha', 'Lauren', 'Megan', 'Brittany', 'Kayla'],
            male: ['Michael', 'Christopher', 'Matthew', 'Joshua', 'David', 'James', 'Daniel', 'Robert', 'John', 'Joseph', 'Andrew', 'Ryan', 'Brandon', 'Jason', 'Justin']
        };

        this.lastNames = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
            'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
            'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
            'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Hall'
        ];
    }

    /**
     * Generate optimal demographic profile for maximum survey yield
     */
    generateOptimalProfile(options = {}) {
        const profile = {};
        let totalOptimizationScore = 0;
        let optimizationFactors = [];

        // Age - Critical for survey targeting
        const ageData = this.selectWeightedOption(this.highYieldDemographics.age);
        profile.age = ageData.value;
        optimizationFactors.push({ factor: 'age', score: ageData.weight, reasoning: `Age ${ageData.value} is in high-demand demographic` });
        totalOptimizationScore += ageData.weight;

        // Gender - Affects survey availability
        const genderData = this.selectWeightedOption(this.highYieldDemographics.gender);
        profile.gender = genderData.value;
        optimizationFactors.push({ factor: 'gender', score: genderData.weight, reasoning: `${genderData.value} gender receives more consumer surveys` });
        totalOptimizationScore += genderData.weight;

        // Income - Major survey targeting factor
        const incomeData = this.selectWeightedOption(this.highYieldDemographics.income);
        profile.incomeBracket = incomeData.value;
        optimizationFactors.push({ factor: 'income', score: incomeData.weight, reasoning: `Income bracket ${incomeData.value} targeted by premium surveys` });
        totalOptimizationScore += incomeData.weight;

        // Education - Influences survey complexity and pay
        const educationData = this.selectWeightedOption(this.highYieldDemographics.education);
        profile.educationLevel = educationData.value;
        optimizationFactors.push({ factor: 'education', score: educationData.weight, reasoning: `${educationData.value} education level preferred by research companies` });
        totalOptimizationScore += educationData.weight;

        // Occupation - Critical for B2B and professional surveys
        const occupationData = this.selectWeightedOption(this.highYieldDemographics.occupation);
        profile.occupation = occupationData.value;
        optimizationFactors.push({ factor: 'occupation', score: occupationData.weight, reasoning: `${occupationData.value} is high-value occupation for surveys` });
        totalOptimizationScore += occupationData.weight;

        // Marital Status
        const maritalData = this.selectWeightedOption(this.highYieldDemographics.maritalStatus);
        profile.maritalStatus = maritalData.value;
        optimizationFactors.push({ factor: 'marital_status', score: maritalData.weight, reasoning: `${maritalData.value} status targeted for household surveys` });
        totalOptimizationScore += maritalData.weight;

        // Household Size
        const householdData = this.selectWeightedOption(this.highYieldDemographics.householdSize);
        profile.householdSize = householdData.value;
        optimizationFactors.push({ factor: 'household_size', score: householdData.weight, reasoning: `Household size ${householdData.value} common in survey panels` });
        totalOptimizationScore += householdData.weight;

        // Location - Geographic targeting
        const locationData = this.selectWeightedOption(this.highYieldLocations, 'weight');
        profile.locationCity = locationData.value.city;
        profile.locationState = locationData.value.state;
        profile.locationCountry = 'United States';
        optimizationFactors.push({ factor: 'location', score: locationData.weight, reasoning: `${locationData.value.city}, ${locationData.value.state} has high survey activity` });
        totalOptimizationScore += locationData.weight;

        // Generate name based on gender
        profile.firstName = this.firstNames[profile.gender][Math.floor(Math.random() * this.firstNames[profile.gender].length)];
        profile.lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        profile.profileName = `${profile.firstName} ${profile.lastName}`;

        // Generate high-yield interests (3-5 interests)
        const numInterests = 3 + Math.floor(Math.random() * 3);
        profile.interests = this.selectRandomItems(this.highYieldInterests, numInterests);
        optimizationFactors.push({ factor: 'interests', score: 0.8, reasoning: `Selected ${numInterests} high-value interest categories` });
        totalOptimizationScore += 0.8;

        // Add realistic imperfections to avoid suspicion
        const improvedProfile = this.addRealisticImperfections(profile);
        Object.assign(profile, improvedProfile);

        // Calculate scores
        const avgOptimizationScore = totalOptimizationScore / optimizationFactors.length;
        profile.aiOptimizationScore = Math.round(avgOptimizationScore * 100) / 100;
        
        // Predict yield based on demographic combination
        profile.yieldPrediction = this.calculateYieldPrediction(profile);
        
        // Balance score (lower = more realistic, higher = more obvious optimization)
        profile.demographicBalanceScore = this.calculateBalanceScore(profile);

        // Add optimization reasoning
        profile.optimizationFactors = optimizationFactors;

        return profile;
    }

    /**
     * Select weighted random option
     */
    selectWeightedOption(data, weightKey = 'weights') {
        let options, weights;
        
        if (Array.isArray(data)) {
            // Handle array of objects (like locations)
            options = data;
            weights = data.map(item => item[weightKey] || item.weight || 1);
        } else {
            // Handle object with optimal and weights properties
            options = data.optimal || [];
            weights = data.weights || [];
        }
        
        if (!options || !weights || options.length === 0 || weights.length === 0) {
            throw new Error('Invalid data structure for weighted selection');
        }
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < options.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return {
                    value: options[i],
                    weight: weights[i]
                };
            }
        }
        
        return {
            value: options[options.length - 1],
            weight: weights[weights.length - 1]
        };
    }

    /**
     * Select random items from array
     */
    selectRandomItems(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /**
     * Add realistic imperfections to avoid appearing too optimized
     */
    addRealisticImperfections(profile) {
        // 20% chance to slightly adjust age to be less perfect
        if (Math.random() < 0.2) {
            const adjustment = Math.random() < 0.5 ? -1 : 1;
            profile.age = Math.max(18, Math.min(65, profile.age + adjustment));
        }

        // 15% chance to pick slightly less optimal income if very high
        if (profile.incomeBracket === '100k-150k' && Math.random() < 0.15) {
            profile.incomeBracket = '75k-100k';
        }

        // 10% chance to add minor inconsistency in education vs occupation
        if (Math.random() < 0.1) {
            if (profile.occupation.includes('Engineer') && profile.educationLevel === 'some_college') {
                profile.educationLevel = 'bachelors'; // Fix obvious inconsistency
            }
        }

        return profile;
    }

    /**
     * Calculate predicted survey yield based on demographic combination
     */
    calculateYieldPrediction(profile) {
        let yieldScore = 0;
        let factors = 0;

        // Age factor
        if (profile.age >= 25 && profile.age <= 45) {
            yieldScore += 0.9;
        } else if (profile.age >= 18 && profile.age <= 55) {
            yieldScore += 0.7;
        } else {
            yieldScore += 0.4;
        }
        factors++;

        // Gender factor (female typically gets more consumer surveys)
        yieldScore += profile.gender === 'female' ? 0.85 : 0.75;
        factors++;

        // Income factor
        const incomeScores = {
            'under-25k': 0.5,
            '25k-50k': 0.7,
            '50k-75k': 0.9,
            '75k-100k': 0.85,
            '100k-150k': 0.8,
            'over-150k': 0.6
        };
        yieldScore += incomeScores[profile.incomeBracket] || 0.5;
        factors++;

        // Education factor
        const educationScores = {
            'high_school': 0.6,
            'some_college': 0.8,
            'bachelors': 0.9,
            'masters': 0.85,
            'doctorate': 0.7
        };
        yieldScore += educationScores[profile.educationLevel] || 0.6;
        factors++;

        // Location factor (major cities = more surveys)
        const majorCities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
        yieldScore += majorCities.includes(profile.locationCity) ? 0.9 : 0.7;
        factors++;

        return Math.round((yieldScore / factors) * 100) / 100;
    }

    /**
     * Calculate balance score (how obvious the optimization is)
     */
    calculateBalanceScore(profile) {
        let suspicionPoints = 0;

        // Perfect demographics raise suspicion
        if (profile.age >= 28 && profile.age <= 35) suspicionPoints += 0.2;
        if (profile.gender === 'female') suspicionPoints += 0.1;
        if (profile.incomeBracket === '50k-75k' || profile.incomeBracket === '75k-100k') suspicionPoints += 0.2;
        if (profile.educationLevel === 'bachelors') suspicionPoints += 0.1;
        if (['New York', 'Los Angeles', 'Chicago'].includes(profile.locationCity)) suspicionPoints += 0.2;

        // Too many high-value interests
        if (profile.interests.length > 4) suspicionPoints += 0.1;

        return Math.round((1 - suspicionPoints) * 100) / 100;
    }

    /**
     * Generate answers for common registration questions
     */
    generateAnswersForQuestions(profile, questions) {
        const answers = [];

        questions.forEach(question => {
            const answer = this.generateAnswerForQuestion(profile, question);
            answers.push({
                questionText: question.text,
                questionType: question.type,
                fieldName: question.fieldName,
                fieldSelector: question.selector,
                answerProvided: answer.value,
                aiGenerated: true,
                aiReasoning: answer.reasoning,
                demographicCategory: answer.category,
                yieldOptimizationFactor: answer.optimizationFactor
            });
        });

        return answers;
    }

    /**
     * Generate answer for specific question
     */
    generateAnswerForQuestion(profile, question) {
        const fieldName = question.fieldName.toLowerCase();
        
        if (fieldName.includes('email')) {
            return {
                value: profile.email || 'test@example.com',
                reasoning: 'Used actual email address for registration',
                category: 'personal_info',
                optimizationFactor: 0.5
            };
        }

        if (fieldName.includes('first') || fieldName.includes('fname')) {
            return {
                value: profile.firstName,
                reasoning: 'Generated realistic first name matching gender demographic',
                category: 'personal_info',
                optimizationFactor: 0.5
            };
        }

        if (fieldName.includes('last') || fieldName.includes('lname')) {
            return {
                value: profile.lastName,
                reasoning: 'Generated common surname for US demographic',
                category: 'personal_info',
                optimizationFactor: 0.5
            };
        }

        if (fieldName.includes('age')) {
            return {
                value: profile.age.toString(),
                reasoning: `Age ${profile.age} selected for optimal survey targeting`,
                category: 'demographics',
                optimizationFactor: 0.9
            };
        }

        if (fieldName.includes('gender')) {
            return {
                value: profile.gender,
                reasoning: `${profile.gender} gender provides higher survey yield`,
                category: 'demographics',
                optimizationFactor: 0.8
            };
        }

        if (fieldName.includes('income')) {
            return {
                value: profile.incomeBracket,
                reasoning: `Income bracket ${profile.incomeBracket} targeted by premium surveys`,
                category: 'demographics',
                optimizationFactor: 0.95
            };
        }

        if (fieldName.includes('occupation') || fieldName.includes('job')) {
            return {
                value: profile.occupation,
                reasoning: `Professional occupation for B2B survey eligibility`,
                category: 'professional',
                optimizationFactor: 0.85
            };
        }

        if (fieldName.includes('education')) {
            return {
                value: profile.educationLevel,
                reasoning: `Education level optimized for survey qualification`,
                category: 'demographics',
                optimizationFactor: 0.8
            };
        }

        if (fieldName.includes('marital') || fieldName.includes('married')) {
            return {
                value: profile.maritalStatus,
                reasoning: `Marital status ${profile.maritalStatus} for household surveys`,
                category: 'household',
                optimizationFactor: 0.7
            };
        }

        if (fieldName.includes('city')) {
            return {
                value: profile.locationCity,
                reasoning: `Major city for geographic survey targeting`,
                category: 'location',
                optimizationFactor: 0.8
            };
        }

        if (fieldName.includes('state')) {
            return {
                value: profile.locationState,
                reasoning: `State with high survey panel activity`,
                category: 'location',
                optimizationFactor: 0.8
            };
        }

        if (fieldName.includes('terms') || fieldName.includes('agree')) {
            return {
                value: 'checked',
                reasoning: 'Agreed to terms and conditions for registration',
                category: 'legal',
                optimizationFactor: 1.0
            };
        }

        if (fieldName.includes('newsletter') || fieldName.includes('subscribe')) {
            return {
                value: 'checked',
                reasoning: 'Subscribed to newsletter for survey opportunities',
                category: 'marketing',
                optimizationFactor: 0.8
            };
        }

        // Default fallback
        return {
            value: 'Other',
            reasoning: 'Fallback answer for unrecognized question type',
            category: 'other',
            optimizationFactor: 0.5
        };
    }
}

module.exports = DemographicOptimizer;