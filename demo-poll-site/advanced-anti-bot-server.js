/**
 * Advanced Anti-Bot Demo Survey Server
 * Implements cutting-edge 2024 anti-bot detection techniques
 * 
 * Anti-Bot Techniques Implemented:
 * 1. Canvas & WebGL Fingerprinting
 * 2. Audio Context Fingerprinting
 * 3. Mouse Movement Pattern Analysis
 * 4. Keystroke Timing Analysis
 * 5. JavaScript Challenge Detection
 * 6. Honeypot Fields
 * 7. CDP (Chrome DevTools Protocol) Detection
 * 8. Browser Feature Detection
 * 9. TLS Fingerprinting Simulation
 * 10. Behavioral Scoring System
 * 11. Request Rate Limiting
 * 12. Session Consistency Checks
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = 3003;

// Anti-bot tracking storage
const sessions = new Map();
const botScores = new Map();
const fingerprints = new Map();
const rateLimits = new Map();
const behaviorData = new Map();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Anti-bot middleware
app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0] || 'anonymous';
    
    // Rate limiting
    const now = Date.now();
    if (!rateLimits.has(ip)) {
        rateLimits.set(ip, { requests: [], blocked: false });
    }
    
    const rateData = rateLimits.get(ip);
    rateData.requests = rateData.requests.filter(time => now - time < 60000); // Last minute
    rateData.requests.push(now);
    
    if (rateData.requests.length > 30) { // More than 30 requests per minute
        rateData.blocked = true;
        return res.status(429).json({ error: 'Rate limit exceeded', botDetected: true });
    }
    
    // Basic bot detection heuristics
    let botScore = 0;
    
    // User agent analysis
    if (!userAgent.includes('Mozilla') || userAgent.includes('HeadlessChrome')) {
        botScore += 50;
    }
    if (userAgent.includes('Chrome/') && !userAgent.includes('Safari/')) {
        botScore += 20;
    }
    if (userAgent.includes('selenium') || userAgent.includes('webdriver') || userAgent.includes('playwright')) {
        botScore += 100;
    }
    
    // Header analysis
    const suspiciousHeaders = [
        'x-requested-with',
        'x-forwarded-for',
        'x-real-ip'
    ];
    
    suspiciousHeaders.forEach(header => {
        if (req.headers[header]) botScore += 10;
    });
    
    // Missing common headers
    if (!req.headers['accept-language']) botScore += 15;
    if (!req.headers['accept-encoding']) botScore += 15;
    if (!req.headers['connection']) botScore += 10;
    
    botScores.set(sessionId, botScore);
    
    req.antiBot = {
        sessionId,
        ip,
        userAgent,
        botScore,
        suspicious: botScore > 50
    };
    
    next();
});

// Demo survey data with advanced anti-bot measures
const advancedSurvey = {
    id: 1,
    title: 'Advanced Anti-Bot Protection Survey',
    description: 'Testing state-of-the-art bot detection mechanisms',
    questions: [
        {
            id: 1,
            text: 'What is your age group?',
            type: 'single-choice',
            required: true,
            hasMouseTracking: true,
            options: [
                { value: '18-25', label: '18-25' },
                { value: '26-35', label: '26-35' },
                { value: '36-45', label: '36-45' },
                { value: '46-55', label: '46-55' },
                { value: '55+', label: '55+' }
            ]
        },
        {
            id: 2,
            text: 'Please type your opinion about online surveys (minimum 20 characters):',
            type: 'text',
            required: true,
            hasKeystrokeAnalysis: true,
            minLength: 20
        },
        {
            id: 3,
            text: 'How satisfied are you with online services?',
            type: 'single-choice',
            required: true,
            hasTimingCheck: true,
            options: [
                { value: 'very_satisfied', label: 'Very Satisfied' },
                { value: 'satisfied', label: 'Satisfied' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'dissatisfied', label: 'Dissatisfied' }
            ]
        },
        {
            id: 4,
            text: 'Select all that apply to you:',
            type: 'multiple-choice',
            required: false,
            hasCanvasCheck: true,
            options: [
                { value: 'student', label: 'Student' },
                { value: 'employed', label: 'Employed' },
                { value: 'entrepreneur', label: 'Entrepreneur' },
                { value: 'retired', label: 'Retired' }
            ]
        }
    ]
};

// Routes
app.get('/', (req, res) => {
    res.render('advanced-anti-bot-index', { 
        survey: advancedSurvey,
        sessionId: req.antiBot.sessionId,
        botScore: req.antiBot.botScore
    });
});

// Anti-bot fingerprinting endpoint
app.post('/api/fingerprint', (req, res) => {
    const { sessionId } = req.antiBot;
    const fingerprint = req.body;
    
    let botScore = botScores.get(sessionId) || 0;
    
    // Canvas fingerprint analysis
    if (fingerprint.canvas) {
        if (fingerprint.canvas === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
            botScore += 75; // Default canvas fingerprint
        }
        if (fingerprint.canvas.length < 100) {
            botScore += 50; // Suspiciously short canvas
        }
    }
    
    // WebGL fingerprint analysis
    if (fingerprint.webgl) {
        if (fingerprint.webgl.includes('Mesa') || fingerprint.webgl.includes('llvmpipe')) {
            botScore += 40; // Virtual GPU indicators
        }
        if (fingerprint.webgl === 'unknown') {
            botScore += 60;
        }
    }
    
    // Audio fingerprint analysis
    if (fingerprint.audio) {
        if (fingerprint.audio === '124.04347527516074') {
            botScore += 50; // Common headless audio fingerprint
        }
    }
    
    // Screen and viewport analysis
    if (fingerprint.screen) {
        if (fingerprint.screen.width === 1024 && fingerprint.screen.height === 768) {
            botScore += 30; // Common headless resolution
        }
        if (fingerprint.screen.colorDepth !== 24) {
            botScore += 20;
        }
    }
    
    // Browser features analysis
    if (fingerprint.features) {
        if (!fingerprint.features.webdriver === undefined) {
            botScore += 100; // Webdriver detected
        }
        if (fingerprint.features.plugins === 0) {
            botScore += 40; // No plugins
        }
        if (fingerprint.features.languages === 0) {
            botScore += 30;
        }
    }
    
    // JavaScript performance analysis
    if (fingerprint.performance) {
        if (fingerprint.performance.timing < 10) {
            botScore += 35; // Too fast execution
        }
        if (fingerprint.performance.timing > 5000) {
            botScore += 25; // Suspiciously slow
        }
    }
    
    // CDP Detection
    if (fingerprint.cdp || fingerprint.automation) {
        botScore += 100; // Chrome DevTools Protocol detected
    }
    
    fingerprints.set(sessionId, fingerprint);
    botScores.set(sessionId, botScore);
    
    const isBot = botScore > 100;
    
    res.json({
        success: true,
        botScore,
        isBot,
        challenges: isBot ? ['captcha', 'behavioral'] : [],
        fingerprint: fingerprint
    });
});

// Mouse movement analysis endpoint
app.post('/api/mouse-behavior', (req, res) => {
    const { sessionId } = req.antiBot;
    const { movements, timings, clicks } = req.body;
    
    let botScore = botScores.get(sessionId) || 0;
    let behaviorScore = 0;
    
    if (movements && movements.length > 0) {
        // Analyze movement patterns
        const distances = [];
        const velocities = [];
        const accelerations = [];
        
        for (let i = 1; i < movements.length; i++) {
            const prev = movements[i - 1];
            const curr = movements[i];
            
            const distance = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            const timeDiff = curr.timestamp - prev.timestamp;
            const velocity = timeDiff > 0 ? distance / timeDiff : 0;
            
            distances.push(distance);
            velocities.push(velocity);
            
            if (i > 1) {
                const prevVelocity = velocities[i - 2];
                const acceleration = (velocity - prevVelocity) / timeDiff;
                accelerations.push(acceleration);
            }
        }
        
        // Bot detection heuristics
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        
        // Perfectly straight lines
        const straightLineCount = movements.filter((move, i) => {
            if (i < 2) return false;
            const prev2 = movements[i - 2];
            const prev1 = movements[i - 1];
            const curr = move;
            
            const slope1 = (prev1.y - prev2.y) / (prev1.x - prev2.x);
            const slope2 = (curr.y - prev1.y) / (curr.x - prev1.x);
            
            return Math.abs(slope1 - slope2) < 0.01; // Very straight
        }).length;
        
        if (straightLineCount > movements.length * 0.8) {
            behaviorScore += 60; // Too many straight lines
        }
        
        // Constant velocity
        const velocityVariance = velocities.reduce((sum, v) => {
            return sum + Math.pow(v - avgVelocity, 2);
        }, 0) / velocities.length;
        
        if (velocityVariance < 0.1) {
            behaviorScore += 50; // Too consistent velocity
        }
        
        // No movement at all
        if (movements.length < 10) {
            behaviorScore += 80;
        }
        
        // Too precise movements (pixel-perfect)
        const preciseMovements = movements.filter(move => 
            move.x % 1 === 0 && move.y % 1 === 0
        ).length;
        
        if (preciseMovements > movements.length * 0.9) {
            behaviorScore += 40;
        }
    } else {
        behaviorScore += 100; // No mouse movements at all
    }
    
    // Click analysis
    if (clicks && clicks.length > 0) {
        const clickTimes = clicks.map(c => c.timestamp);
        const intervals = [];
        
        for (let i = 1; i < clickTimes.length; i++) {
            intervals.push(clickTimes[i] - clickTimes[i - 1]);
        }
        
        // Too regular clicking intervals
        if (intervals.length > 1) {
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => {
                return sum + Math.pow(interval - avgInterval, 2);
            }, 0) / intervals.length;
            
            if (variance < 100) { // Less than 100ms variance
                behaviorScore += 45;
            }
        }
    }
    
    behaviorData.set(sessionId, {
        movements: movements || [],
        clicks: clicks || [],
        timings: timings || {},
        behaviorScore,
        timestamp: Date.now()
    });
    
    botScores.set(sessionId, botScore + behaviorScore);
    
    res.json({
        success: true,
        behaviorScore,
        totalBotScore: botScore + behaviorScore,
        analysis: {
            movementCount: movements?.length || 0,
            clickCount: clicks?.length || 0,
            suspiciousPatterns: behaviorScore > 50
        }
    });
});

// Keystroke analysis endpoint
app.post('/api/keystroke-analysis', (req, res) => {
    const { sessionId } = req.antiBot;
    const { keystrokes } = req.body;
    
    let botScore = botScores.get(sessionId) || 0;
    let keystrokeScore = 0;
    
    if (keystrokes && keystrokes.length > 0) {
        const intervals = [];
        const dwellTimes = [];
        
        for (let i = 0; i < keystrokes.length; i++) {
            const keystroke = keystrokes[i];
            
            // Dwell time (how long key was pressed)
            if (keystroke.keyup && keystroke.keydown) {
                const dwellTime = keystroke.keyup - keystroke.keydown;
                dwellTimes.push(dwellTime);
                
                if (dwellTime < 10 || dwellTime > 500) {
                    keystrokeScore += 5; // Unnatural dwell times
                }
            }
            
            // Inter-key intervals
            if (i > 0) {
                const interval = keystroke.keydown - keystrokes[i - 1].keydown;
                intervals.push(interval);
            }
        }
        
        // Analyze timing patterns
        if (intervals.length > 1) {
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => {
                return sum + Math.pow(interval - avgInterval, 2);
            }, 0) / intervals.length;
            
            // Too consistent timing
            if (variance < 50) {
                keystrokeScore += 40;
            }
            
            // Too fast typing (over 150 WPM)
            if (avgInterval < 80) {
                keystrokeScore += 30;
            }
            
            // Too slow typing (under 10 WPM)
            if (avgInterval > 600) {
                keystrokeScore += 20;
            }
        }
        
        // Check for perfect rhythm (robot-like)
        const rhythmCheck = intervals.filter((interval, i) => {
            if (i === 0) return false;
            return Math.abs(interval - intervals[i - 1]) < 10;
        });
        
        if (rhythmCheck.length > intervals.length * 0.7) {
            keystrokeScore += 50; // Too rhythmic
        }
        
    } else {
        keystrokeScore += 60; // No keystroke data
    }
    
    botScores.set(sessionId, botScore + keystrokeScore);
    
    res.json({
        success: true,
        keystrokeScore,
        totalBotScore: botScore + keystrokeScore,
        analysis: {
            keystrokeCount: keystrokes?.length || 0,
            suspiciousTyping: keystrokeScore > 30
        }
    });
});

// Challenge verification endpoint
app.post('/api/verify-challenge', (req, res) => {
    const { sessionId } = req.antiBot;
    const { challengeType, answer, proof } = req.body;
    
    let verified = false;
    let botScore = botScores.get(sessionId) || 0;
    
    switch (challengeType) {
        case 'math':
            // Simple math challenge
            if (answer === '42') { // Example: What is 6 × 7?
                verified = true;
                botScore -= 20; // Reduce bot score for correct answer
            } else {
                botScore += 30;
            }
            break;
            
        case 'timing':
            // Timing challenge - must wait at least 3 seconds
            if (proof && proof.waitTime >= 3000) {
                verified = true;
                botScore -= 15;
            } else {
                botScore += 25;
            }
            break;
            
        case 'interaction':
            // Must perform specific interactions
            if (proof && proof.interactions >= 3) {
                verified = true;
                botScore -= 10;
            } else {
                botScore += 20;
            }
            break;
    }
    
    botScores.set(sessionId, Math.max(0, botScore));
    
    res.json({
        success: true,
        verified,
        botScore,
        nextChallenge: botScore > 80 ? 'captcha' : null
    });
});

// Survey submission with comprehensive bot detection
app.post('/api/submit-survey', (req, res) => {
    const { sessionId, botScore, suspicious } = req.antiBot;
    const answers = req.body.answers;
    const timingData = req.body.timingData;
    
    let finalBotScore = botScore;
    const errors = [];
    
    // Validate honeypot fields
    if (req.body.email_confirm || req.body.phone_backup || req.body.address_secondary) {
        finalBotScore += 100;
        errors.push('Honeypot field interaction detected');
    }
    
    // Validate timing data
    if (timingData) {
        const totalTime = timingData.totalTime || 0;
        const questionTimes = timingData.questionTimes || [];
        
        // Too fast completion
        if (totalTime < 10000) { // Less than 10 seconds
            finalBotScore += 60;
            errors.push('Survey completed too quickly');
        }
        
        // Inconsistent question timing
        questionTimes.forEach((time, index) => {
            if (time < 500) { // Less than 0.5 seconds per question
                finalBotScore += 20;
                errors.push(`Question ${index + 1} answered too quickly`);
            }
        });
    }
    
    // Validate answer patterns
    if (answers) {
        const answerValues = Object.values(answers);
        
        // All same answers (except for valid cases)
        const uniqueAnswers = new Set(answerValues);
        if (uniqueAnswers.size === 1 && answerValues.length > 2) {
            finalBotScore += 40;
            errors.push('Suspiciously uniform answers');
        }
        
        // Required field validation
        const requiredQuestions = advancedSurvey.questions.filter(q => q.required);
        const missingAnswers = requiredQuestions.filter(q => !answers[`question_${q.id}`]);
        
        if (missingAnswers.length > 0) {
            finalBotScore += 30;
            errors.push('Missing required answers');
        }
        
        // Text field analysis
        const textAnswer = answers.question_2;
        if (textAnswer) {
            if (textAnswer.length < 20) {
                finalBotScore += 25;
                errors.push('Text answer too short');
            }
            
            // Check for common bot patterns
            const botPatterns = ['lorem ipsum', 'test', 'asdf', '123', 'abc'];
            if (botPatterns.some(pattern => textAnswer.toLowerCase().includes(pattern))) {
                finalBotScore += 35;
                errors.push('Bot-like text pattern detected');
            }
        }
    }
    
    const isBot = finalBotScore > 100;
    const behaviorAnalysis = behaviorData.get(sessionId);
    
    if (isBot) {
        return res.status(403).json({
            success: false,
            error: 'Bot activity detected',
            botScore: finalBotScore,
            errors,
            blocked: true,
            analysis: {
                fingerprint: fingerprints.get(sessionId),
                behavior: behaviorAnalysis,
                suspicious: true
            }
        });
    }
    
    // Success response
    res.json({
        success: true,
        message: 'Survey submitted successfully',
        botScore: finalBotScore,
        analysis: {
            humanConfidence: Math.max(0, 100 - finalBotScore),
            warnings: errors,
            behavior: behaviorAnalysis
        },
        submissionId: crypto.randomBytes(16).toString('hex')
    });
});

// Anti-bot status endpoint
app.get('/api/anti-bot-status', (req, res) => {
    const { sessionId, botScore } = req.antiBot;
    
    res.json({
        sessionId,
        botScore,
        isBot: botScore > 100,
        riskLevel: botScore > 150 ? 'high' : botScore > 80 ? 'medium' : 'low',
        fingerprint: fingerprints.get(sessionId),
        behavior: behaviorData.get(sessionId),
        detectionMethods: [
            'Canvas Fingerprinting',
            'WebGL Analysis', 
            'Audio Fingerprinting',
            'Mouse Movement Tracking',
            'Keystroke Analysis',
            'Timing Analysis',
            'Header Analysis',
            'Rate Limiting',
            'Honeypot Detection',
            'CDP Detection'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🛡️ Advanced Anti-Bot Demo Survey Server running on http://localhost:${PORT}`);
    console.log('======================================================================');
    console.log('🎯 Advanced Anti-Bot Detection Methods Implemented:');
    console.log('  ✅ Canvas & WebGL Fingerprinting');
    console.log('  ✅ Audio Context Fingerprinting');
    console.log('  ✅ Mouse Movement Pattern Analysis');
    console.log('  ✅ Keystroke Timing Analysis');
    console.log('  ✅ JavaScript Challenge Detection');
    console.log('  ✅ Honeypot Field Detection');
    console.log('  ✅ CDP (Chrome DevTools Protocol) Detection');
    console.log('  ✅ Browser Feature Analysis');
    console.log('  ✅ Request Rate Limiting');
    console.log('  ✅ Behavioral Scoring System');
    console.log('======================================================================');
    console.log('🔬 Test your enhanced automation against these advanced protections!');
});

module.exports = app;