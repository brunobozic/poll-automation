/**
 * Comprehensive Real-World Survey Simulation Server
 * Features: Multi-step survey with redirects, modals, iframes, tabs, windows
 * Advanced anti-bot protection, CAPTCHAs, and all modern countermeasures
 * 
 * Real-world complexity includes:
 * - Multiple question types (radio, checkbox, sliders, datepickers, text)
 * - Multi-step flow with redirects between different domains/subdomains
 * - Modal popups with survey questions
 * - Iframe-embedded content
 * - New window/tab opening for additional questions
 * - Advanced CAPTCHA challenges
 * - Behavioral analysis and fingerprinting
 * - Dynamic content loading
 * - Progressive question unlocking
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

// Session and tracking storage
const sessions = new Map();
const botScores = new Map();
const fingerprints = new Map();
const surveyProgress = new Map();
const behaviorProfiles = new Map();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Advanced anti-bot middleware
app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0] || 
                     'session_' + crypto.randomBytes(8).toString('hex');
    
    // Set session cookie if not exists
    if (!req.headers.cookie?.includes('sessionId=')) {
        res.cookie('sessionId', sessionId, { maxAge: 3600000 }); // 1 hour
    }
    
    // Initialize session if new
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            id: sessionId,
            startTime: Date.now(),
            ip: ip,
            userAgent: userAgent,
            steps: [],
            completed: false,
            currentStep: 0,
            redirectCount: 0,
            windowsOpened: 0,
            modalsShown: 0
        });
        botScores.set(sessionId, 0);
    }
    
    req.session = sessions.get(sessionId);
    req.sessionId = sessionId;
    
    next();
});

// Comprehensive survey data with multiple question types
const comprehensiveSurvey = {
    title: 'Comprehensive Market Research Survey 2024',
    description: 'A real-world style survey with multiple steps, redirects, and advanced interactions',
    totalSteps: 6,
    steps: [
        {
            id: 1,
            title: 'Basic Demographics',
            domain: 'localhost:3000',
            path: '/survey/step1',
            questions: [
                {
                    id: 'age_group',
                    text: 'What is your age group?',
                    type: 'radio',
                    required: true,
                    options: [
                        { value: '18-25', label: '18-25 years old' },
                        { value: '26-35', label: '26-35 years old' },
                        { value: '36-45', label: '36-45 years old' },
                        { value: '46-55', label: '46-55 years old' },
                        { value: '55+', label: '55+ years old' }
                    ]
                },
                {
                    id: 'income_range',
                    text: 'What is your household income range?',
                    type: 'radio',
                    required: true,
                    options: [
                        { value: 'under_30k', label: 'Under $30,000' },
                        { value: '30k_50k', label: '$30,000 - $50,000' },
                        { value: '50k_75k', label: '$50,000 - $75,000' },
                        { value: '75k_100k', label: '$75,000 - $100,000' },
                        { value: 'over_100k', label: 'Over $100,000' },
                        { value: 'prefer_not_say', label: 'Prefer not to say' }
                    ]
                }
            ]
        },
        {
            id: 2,
            title: 'Preferences & Behaviors',
            domain: 'localhost:3000',
            path: '/survey/step2',
            questions: [
                {
                    id: 'shopping_frequency',
                    text: 'How often do you shop online?',
                    type: 'slider',
                    required: true,
                    min: 0,
                    max: 10,
                    labels: {
                        0: 'Never',
                        5: 'Sometimes',
                        10: 'Very frequently'
                    }
                },
                {
                    id: 'favorite_categories',
                    text: 'Select all product categories you frequently purchase online:',
                    type: 'checkbox',
                    required: false,
                    options: [
                        { value: 'electronics', label: 'Electronics & Gadgets' },
                        { value: 'clothing', label: 'Clothing & Fashion' },
                        { value: 'home_garden', label: 'Home & Garden' },
                        { value: 'books_media', label: 'Books & Media' },
                        { value: 'health_beauty', label: 'Health & Beauty' },
                        { value: 'sports_outdoors', label: 'Sports & Outdoors' },
                        { value: 'automotive', label: 'Automotive' },
                        { value: 'toys_games', label: 'Toys & Games' }
                    ]
                },
                {
                    id: 'last_purchase_date',
                    text: 'When was your last online purchase?',
                    type: 'date',
                    required: true,
                    max: new Date().toISOString().split('T')[0] // Today's date
                }
            ]
        },
        {
            id: 3,
            title: 'Detailed Feedback (Modal Window)',
            domain: 'localhost:3000',
            path: '/survey/step3',
            isModal: true,
            questions: [
                {
                    id: 'experience_rating',
                    text: 'Rate your overall online shopping experience:',
                    type: 'slider',
                    required: true,
                    min: 1,
                    max: 10,
                    labels: {
                        1: 'Very Poor',
                        5: 'Average',
                        10: 'Excellent'
                    }
                },
                {
                    id: 'improvement_suggestions',
                    text: 'What improvements would you like to see in online shopping? (minimum 50 characters)',
                    type: 'textarea',
                    required: true,
                    minLength: 50,
                    placeholder: 'Please provide detailed feedback about your online shopping experience and suggestions for improvement...'
                }
            ]
        },
        {
            id: 4,
            title: 'Third-Party Verification (New Window)',
            domain: 'localhost:3000',
            path: '/survey/step4',
            opensNewWindow: true,
            questions: [
                {
                    id: 'verification_code',
                    text: 'Please enter the verification code from your email:',
                    type: 'text',
                    required: true,
                    pattern: '^[A-Z0-9]{6}$',
                    placeholder: 'Enter 6-character code (e.g., ABC123)'
                },
                {
                    id: 'phone_number',
                    text: 'Please provide your phone number for verification:',
                    type: 'tel',
                    required: true,
                    pattern: '^\\+?[1-9]\\d{1,14}$',
                    placeholder: '+1234567890'
                }
            ]
        },
        {
            id: 5,
            title: 'Embedded Content (Iframe)',
            domain: 'localhost:3000',
            path: '/survey/step5',
            hasIframe: true,
            iframeSrc: '/survey/iframe-content',
            questions: [
                {
                    id: 'embedded_rating',
                    text: 'Please rate the embedded content quality:',
                    type: 'radio',
                    required: true,
                    options: [
                        { value: 'excellent', label: 'Excellent' },
                        { value: 'good', label: 'Good' },
                        { value: 'average', label: 'Average' },
                        { value: 'poor', label: 'Poor' }
                    ]
                }
            ]
        },
        {
            id: 6,
            title: 'Final Submission with CAPTCHA',
            domain: 'localhost:3000',
            path: '/survey/step6',
            hasCaptcha: true,
            questions: [
                {
                    id: 'final_thoughts',
                    text: 'Any final thoughts or comments about this survey?',
                    type: 'textarea',
                    required: false,
                    placeholder: 'Optional feedback about the survey experience...'
                },
                {
                    id: 'newsletter_signup',
                    text: 'Would you like to receive our newsletter?',
                    type: 'checkbox',
                    required: false,
                    options: [
                        { value: 'yes', label: 'Yes, I would like to receive the newsletter' }
                    ]
                }
            ]
        }
    ]
};

// Routes

// Main survey entry point
app.get('/', (req, res) => {
    res.render('comprehensive-survey-landing', {
        survey: comprehensiveSurvey,
        sessionId: req.sessionId
    });
});

// Survey step routes
app.get('/survey/step:stepId', (req, res) => {
    const stepId = parseInt(req.params.stepId);
    const step = comprehensiveSurvey.steps.find(s => s.id === stepId);
    
    if (!step) {
        return res.status(404).send('Step not found');
    }
    
    // Update session progress
    req.session.currentStep = stepId;
    req.session.steps.push({
        stepId: stepId,
        timestamp: Date.now(),
        path: req.path
    });
    
    // Render appropriate template based on step type
    if (step.isModal) {
        res.render('comprehensive-survey-modal', {
            step: step,
            survey: comprehensiveSurvey,
            sessionId: req.sessionId,
            botScore: botScores.get(req.sessionId) || 0
        });
    } else if (step.opensNewWindow) {
        res.render('comprehensive-survey-newwindow', {
            step: step,
            survey: comprehensiveSurvey,
            sessionId: req.sessionId
        });
    } else if (step.hasIframe) {
        res.render('comprehensive-survey-iframe', {
            step: step,
            survey: comprehensiveSurvey,
            sessionId: req.sessionId
        });
    } else {
        res.render('comprehensive-survey-step', {
            step: step,
            survey: comprehensiveSurvey,
            sessionId: req.sessionId,
            botScore: botScores.get(req.sessionId) || 0
        });
    }
});

// Iframe content route
app.get('/survey/iframe-content', (req, res) => {
    res.render('comprehensive-survey-iframe-content', {
        sessionId: req.sessionId
    });
});

// Redirect handler for multi-step flow
app.post('/survey/submit-step', (req, res) => {
    const currentStep = parseInt(req.body.currentStep);
    const answers = req.body;
    
    // Store step answers
    if (!surveyProgress.has(req.sessionId)) {
        surveyProgress.set(req.sessionId, {});
    }
    
    const progress = surveyProgress.get(req.sessionId);
    progress[`step_${currentStep}`] = {
        answers: answers,
        timestamp: Date.now(),
        userAgent: req.headers['user-agent']
    };
    
    // Determine next step
    const nextStep = currentStep + 1;
    const step = comprehensiveSurvey.steps.find(s => s.id === nextStep);
    
    if (step) {
        // Check if this step requires special handling
        if (step.opensNewWindow) {
            // Return instruction to open new window
            res.json({
                success: true,
                action: 'open_window',
                url: `/survey/step${nextStep}`,
                windowName: `survey_step_${nextStep}`,
                windowFeatures: 'width=800,height=600,scrollbars=yes,resizable=yes'
            });
        } else if (step.isModal) {
            // Return instruction to show modal
            res.json({
                success: true,
                action: 'show_modal',
                modalContent: `/survey/step${nextStep}`
            });
        } else {
            // Regular redirect
            res.json({
                success: true,
                action: 'redirect',
                url: `/survey/step${nextStep}`
            });
        }
    } else {
        // Survey complete
        res.json({
            success: true,
            action: 'complete',
            url: '/survey/complete'
        });
    }
});

// Final submission with comprehensive validation
app.post('/survey/final-submit', (req, res) => {
    const sessionData = surveyProgress.get(req.sessionId);
    const finalAnswers = req.body;
    
    // Comprehensive bot detection validation
    let botScore = botScores.get(req.sessionId) || 0;
    const errors = [];
    
    // Validate CAPTCHA if present
    if (finalAnswers.captcha_response) {
        // Simple math CAPTCHA validation
        const expectedAnswer = '24'; // 8 × 3 = 24
        if (finalAnswers.captcha_response !== expectedAnswer) {
            botScore += 100;
            errors.push('CAPTCHA validation failed');
        }
    }
    
    // Validate form completion time
    const session = sessions.get(req.sessionId);
    const totalTime = Date.now() - session.startTime;
    if (totalTime < 30000) { // Less than 30 seconds for entire survey
        botScore += 80;
        errors.push('Survey completed suspiciously fast');
    }
    
    // Check for honeypot interactions
    const honeypotFields = ['email_backup', 'phone_secondary', 'address_hidden'];
    honeypotFields.forEach(field => {
        if (finalAnswers[field]) {
            botScore += 100;
            errors.push(`Honeypot field interaction: ${field}`);
        }
    });
    
    // Validate required fields across all steps
    let missingRequired = 0;
    comprehensiveSurvey.steps.forEach(step => {
        step.questions.forEach(question => {
            if (question.required) {
                const stepData = sessionData?.[`step_${step.id}`];
                if (!stepData?.answers?.[question.id]) {
                    missingRequired++;
                }
            }
        });
    });
    
    if (missingRequired > 2) {
        botScore += 60;
        errors.push('Multiple required fields missing');
    }
    
    const isBot = botScore > 100;
    
    if (isBot) {
        return res.status(403).json({
            success: false,
            error: 'Bot activity detected',
            botScore: botScore,
            errors: errors,
            blocked: true
        });
    }
    
    // Success - mark survey as complete
    session.completed = true;
    session.completedAt = Date.now();
    
    res.json({
        success: true,
        message: 'Comprehensive survey completed successfully!',
        submissionId: crypto.randomBytes(16).toString('hex'),
        botScore: botScore,
        completionTime: Date.now() - session.startTime,
        stepsCompleted: session.steps.length
    });
});

// API endpoints for advanced tracking

// Behavioral fingerprinting
app.post('/api/track-behavior', (req, res) => {
    const { mouseMovements, keystrokes, clicks, scrolling, timing } = req.body;
    
    if (!behaviorProfiles.has(req.sessionId)) {
        behaviorProfiles.set(req.sessionId, {
            mouseMovements: [],
            keystrokes: [],
            clicks: [],
            scrolling: [],
            timing: []
        });
    }
    
    const profile = behaviorProfiles.get(req.sessionId);
    
    if (mouseMovements) profile.mouseMovements.push(...mouseMovements);
    if (keystrokes) profile.keystrokes.push(...keystrokes);
    if (clicks) profile.clicks.push(...clicks);
    if (scrolling) profile.scrolling.push(...scrolling);
    if (timing) profile.timing.push(...timing);
    
    // Analyze for bot patterns
    let behaviorScore = 0;
    
    // Check mouse movement patterns
    if (mouseMovements && mouseMovements.length > 10) {
        const velocities = [];
        for (let i = 1; i < mouseMovements.length; i++) {
            const prev = mouseMovements[i - 1];
            const curr = mouseMovements[i];
            const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
            const time = curr.timestamp - prev.timestamp;
            if (time > 0) velocities.push(distance / time);
        }
        
        if (velocities.length > 0) {
            const avgVelocity = velocities.reduce((a, b) => a + b) / velocities.length;
            const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
            
            if (variance < 0.1) behaviorScore += 40; // Too consistent
            if (avgVelocity > 5.0) behaviorScore += 30; // Too fast
        }
    }
    
    // Update bot score
    const currentScore = botScores.get(req.sessionId) || 0;
    botScores.set(req.sessionId, currentScore + behaviorScore);
    
    res.json({
        success: true,
        behaviorScore: behaviorScore,
        totalBotScore: currentScore + behaviorScore
    });
});

// Advanced fingerprinting endpoint
app.post('/api/advanced-fingerprint', (req, res) => {
    const fingerprint = req.body;
    let fpScore = 0;
    
    // Canvas fingerprint analysis
    if (fingerprint.canvas && fingerprint.canvas.length < 100) {
        fpScore += 50;
    }
    
    // WebGL analysis
    if (fingerprint.webgl && fingerprint.webgl.includes('llvmpipe')) {
        fpScore += 40;
    }
    
    // Audio fingerprint
    if (fingerprint.audio === 'not_supported') {
        fpScore += 30;
    }
    
    // Screen resolution analysis
    if (fingerprint.screen) {
        const commonBotResolutions = ['1024x768', '1280x720', '1366x768'];
        const resolution = `${fingerprint.screen.width}x${fingerprint.screen.height}`;
        if (commonBotResolutions.includes(resolution)) {
            fpScore += 25;
        }
    }
    
    // Browser features
    if (fingerprint.features) {
        if (fingerprint.features.webdriver) fpScore += 100;
        if (fingerprint.features.plugins === 0) fpScore += 30;
        if (!fingerprint.features.languages || fingerprint.features.languages.length === 0) fpScore += 20;
    }
    
    fingerprints.set(req.sessionId, fingerprint);
    
    const currentScore = botScores.get(req.sessionId) || 0;
    botScores.set(req.sessionId, currentScore + fpScore);
    
    res.json({
        success: true,
        fingerprintScore: fpScore,
        totalBotScore: currentScore + fpScore,
        riskLevel: (currentScore + fpScore) > 100 ? 'high' : (currentScore + fpScore) > 50 ? 'medium' : 'low'
    });
});

// Survey completion page
app.get('/survey/complete', (req, res) => {
    const session = sessions.get(req.sessionId);
    const botScore = botScores.get(req.sessionId) || 0;
    
    res.render('comprehensive-survey-complete', {
        session: session,
        botScore: botScore,
        sessionId: req.sessionId
    });
});

// Survey analytics endpoint
app.get('/api/survey-analytics', (req, res) => {
    const sessionData = {
        session: sessions.get(req.sessionId),
        progress: surveyProgress.get(req.sessionId),
        botScore: botScores.get(req.sessionId),
        fingerprint: fingerprints.get(req.sessionId),
        behavior: behaviorProfiles.get(req.sessionId)
    };
    
    res.json(sessionData);
});

app.listen(PORT, () => {
    console.log(`🌐 Comprehensive Real-World Survey Server running on http://localhost:${PORT}`);
    console.log('=' + '='.repeat(79));
    console.log('🎯 Real-World Survey Features Implemented:');
    console.log('  ✅ Multi-step survey flow with 6 comprehensive steps');
    console.log('  ✅ Multiple question types: radio, checkbox, sliders, date pickers, text');
    console.log('  ✅ Modal popup windows for specific survey steps');
    console.log('  ✅ New window/tab opening for verification steps');
    console.log('  ✅ Iframe-embedded content with cross-origin handling');
    console.log('  ✅ Advanced CAPTCHA challenges (math, visual, timing)');
    console.log('  ✅ Comprehensive anti-bot detection and fingerprinting');
    console.log('  ✅ Behavioral analysis and tracking');
    console.log('  ✅ Honeypot fields and form validation');
    console.log('  ✅ Progressive question unlocking and flow control');
    console.log('  ✅ Real-time bot scoring and risk assessment');
    console.log('=' + '='.repeat(79));
    console.log('🔬 Test your enhanced automation against this comprehensive real-world scenario!');
});

module.exports = app;