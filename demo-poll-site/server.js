const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session storage (in production use proper session management)
const sessions = new Map();

// Demo users
const users = {
    'testuser': 'testpass',
    'demo': 'demo123',
    'bbozic': 'password123'
};

// Sample polls data with calibration questions and redirect challenges
const polls = [
    {
        id: 1,
        title: 'Customer Satisfaction Survey',
        description: 'Help us improve our services',
        questions: [
            {
                id: 1,
                text: 'To ensure you are reading carefully, please select "Option C" from the choices below.',
                type: 'single-choice',
                required: true,
                isCalibration: true,
                calibrationType: 'attention_check',
                options: [
                    { value: 'option_a', label: 'Option A' },
                    { value: 'option_b', label: 'Option B' },
                    { value: 'option_c', label: 'Option C' },
                    { value: 'option_d', label: 'Option D' }
                ]
            },
            {
                id: 2,
                text: 'What is the capital of France?',
                type: 'single-choice',
                required: true,
                isCalibration: true,
                calibrationType: 'knowledge_test',
                options: [
                    { value: 'london', label: 'London' },
                    { value: 'berlin', label: 'Berlin' },
                    { value: 'paris', label: 'Paris' },
                    { value: 'madrid', label: 'Madrid' }
                ]
            },
            {
                id: 3,
                text: 'How satisfied are you with our service?',
                type: 'single-choice',
                required: true,
                options: [
                    { value: 'very_satisfied', label: 'Very Satisfied' },
                    { value: 'satisfied', label: 'Satisfied' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'dissatisfied', label: 'Dissatisfied' },
                    { value: 'very_dissatisfied', label: 'Very Dissatisfied' }
                ]
            },
            {
                id: 4,
                text: 'How likely are you to recommend us to a friend?',
                type: 'rating',
                required: true,
                options: Array.from({length: 10}, (_, i) => ({ 
                    value: (i + 1).toString(), 
                    label: (i + 1).toString() 
                }))
            },
            {
                id: 5,
                text: 'What features would you like to see improved?',
                type: 'multiple-choice',
                required: false,
                options: [
                    { value: 'speed', label: 'Speed' },
                    { value: 'design', label: 'Design' },
                    { value: 'functionality', label: 'Functionality' },
                    { value: 'support', label: 'Customer Support' },
                    { value: 'pricing', label: 'Pricing' }
                ]
            },
            {
                id: 6,
                text: 'Please provide any additional feedback:',
                type: 'text',
                required: false,
                options: []
            }
        ]
    },
    {
        id: 2,
        title: 'Product Feedback Survey',
        description: 'Tell us about your experience with our product',
        questions: [
            {
                id: 1,
                text: 'Do you find our product easy to use?',
                type: 'yes-no',
                required: true,
                options: [
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' }
                ]
            },
            {
                id: 2,
                text: 'How often do you use our product?',
                type: 'single-choice',
                required: true,
                options: [
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'rarely', label: 'Rarely' }
                ]
            },
            {
                id: 3,
                text: 'List all the capitals of European countries in alphabetical order:',
                type: 'text',
                required: true,
                options: [],
                isTrick: true
            },
            {
                id: 4,
                text: 'Rate the following features (1-10):',
                type: 'rating',
                required: true,
                options: Array.from({length: 10}, (_, i) => ({ 
                    value: (i + 1).toString(), 
                    label: (i + 1).toString() 
                }))
            }
        ]
    },
    {
        id: 3,
        title: 'Market Research Survey',
        description: 'Advanced market research questionnaire',
        questions: [
            {
                id: 1,
                text: 'What is your age group?',
                type: 'single-choice',
                required: true,
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
                text: 'Calculate 347 × 892 × 1,456 × 2,891 to 8 decimal places:',
                type: 'text',
                required: true,
                options: [],
                isTrick: true
            },
            {
                id: 3,
                text: 'Which brands do you recognize?',
                type: 'multiple-choice',
                required: false,
                options: [
                    { value: 'apple', label: 'Apple' },
                    { value: 'samsung', label: 'Samsung' },
                    { value: 'google', label: 'Google' },
                    { value: 'microsoft', label: 'Microsoft' },
                    { value: 'amazon', label: 'Amazon' }
                ]
            },
            {
                id: 4,
                text: 'Name every US president in chronological order since 1789:',
                type: 'text',
                required: true,
                options: [],
                isTrick: true
            },
            {
                id: 5,
                text: 'How important is brand reputation to you?',
                type: 'single-choice',
                required: true,
                options: [
                    { value: 'very_important', label: 'Very Important' },
                    { value: 'important', label: 'Important' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'not_important', label: 'Not Important' }
                ]
            }
        ]
    }
];

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (users[username] && users[username] === password) {
        const sessionId = Math.random().toString(36).substring(2);
        sessions.set(sessionId, { username, loginTime: Date.now() });
        
        res.cookie('sessionId', sessionId, { httpOnly: true });
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});

app.get('/dashboard', (req, res) => {
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.redirect('/login');
    }
    
    const session = sessions.get(sessionId);
    res.render('dashboard', { user: session, polls: polls });
});

app.get('/poll/:id', (req, res) => {
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.redirect('/login');
    }
    
    const pollId = parseInt(req.params.id);
    const poll = polls.find(p => p.id === pollId);
    
    if (!poll) {
        return res.status(404).send('Poll not found');
    }
    
    res.render('poll', { poll: poll });
});

app.post('/poll/:id/submit', (req, res) => {
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const pollId = parseInt(req.params.id);
    const poll = polls.find(p => p.id === pollId);
    
    if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
    }
    
    const answers = req.body;
    
    // Validate required questions
    const requiredQuestions = poll.questions.filter(q => q.required);
    const missingAnswers = requiredQuestions.filter(q => !answers[`question_${q.id}`]);
    
    if (missingAnswers.length > 0) {
        return res.status(400).json({ 
            error: 'Missing required answers',
            missing: missingAnswers.map(q => q.id)
        });
    }
    
    // Check calibration questions for correct answers
    const calibrationErrors = [];
    poll.questions.forEach(question => {
        if (question.isCalibration && question.calibrationType === 'attention_check') {
            const answer = answers[`question_${question.id}`];
            if (question.id === 1 && answer !== 'option_c') {
                calibrationErrors.push('Failed attention check: must select Option C');
            }
        }
        if (question.isCalibration && question.calibrationType === 'knowledge_test') {
            const answer = answers[`question_${question.id}`];
            if (question.id === 2 && answer !== 'paris') {
                calibrationErrors.push('Failed knowledge test: incorrect answer about France');
            }
        }
    });
    
    if (calibrationErrors.length > 0) {
        return res.status(400).json({ 
            error: 'Calibration questions failed',
            details: calibrationErrors
        });
    }
    
    // For demo: simulate redirect-based submission process
    const redirectStep = req.query.step || '1';
    
    switch (redirectStep) {
        case '1':
            // First step: redirect to processing page
            setTimeout(() => {
                res.json({ 
                    success: true,
                    redirect: `/poll/${pollId}/process?step=2`,
                    message: 'Redirecting to processing...'
                });
            }, 500);
            break;
            
        case '2':
            // Second step: redirect to verification page
            setTimeout(() => {
                res.json({ 
                    success: true,
                    redirect: `/poll/${pollId}/verify?step=3`,
                    message: 'Redirecting to verification...'
                });
            }, 1000);
            break;
            
        case '3':
            // Final step: completion
            setTimeout(() => {
                res.json({ 
                    success: true, 
                    message: 'Poll submitted successfully!',
                    answers: answers,
                    completed: true
                });
            }, 1500);
            break;
            
        default:
            res.json({ 
                success: true, 
                message: 'Poll submitted successfully!',
                answers: answers
            });
    }
});

// Add redirect handling routes
app.get('/poll/:id/process', (req, res) => {
    const step = req.query.step || '2';
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Processing Submission</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 50px; text-align: center; }
                .loading { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .hidden-continue { position: absolute; left: -9999px; opacity: 0.01; }
                .continue-text { color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <h2>Processing your submission...</h2>
            <div class="loading">⏳</div>
            <p>Please wait while we process your responses.</p>
            
            <!-- Non-standard continue button (anti-bot) -->
            <div style="margin-top: 50px;">
                <button class="hidden-continue" onclick="continueProcess()" data-continue="true">Hidden Continue</button>
                <span class="continue-text" onclick="continueProcess()" style="cursor: pointer;">
                    Click here to continue →
                </span>
            </div>
            
            <script>
                function continueProcess() {
                    setTimeout(() => {
                        window.location.href = '/poll/${req.params.id}/verify?step=3';
                    }, 1000);
                }
                
                // Auto-redirect after 5 seconds if no interaction
                setTimeout(() => {
                    window.location.href = '/poll/${req.params.id}/verify?step=3';
                }, 5000);
            </script>
        </body>
        </html>
    `);
});

app.get('/poll/:id/verify', (req, res) => {
    const step = req.query.step || '3';
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Verification Step</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 50px; text-align: center; }
                .verify-button { 
                    background: linear-gradient(45deg, #28a745, #20c997); 
                    color: white; 
                    padding: 15px 30px; 
                    border: none; 
                    border-radius: 5px; 
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                }
                .fake-button { 
                    background: #6c757d; 
                    color: white; 
                    padding: 15px 30px; 
                    border: none; 
                    border-radius: 5px; 
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                }
                .weird-submit {
                    background: transparent;
                    color: #007bff;
                    border: 2px dashed #007bff;
                    padding: 20px;
                    cursor: pointer;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <h2>Almost Done!</h2>
            <p>Please verify your submission by clicking the correct button below:</p>
            
            <!-- Multi-tab trigger buttons -->
            <div style="margin: 30px 0;">
                <button class="verify-button" onclick="openMultipleTabs()">Start Multi-Tab Verification</button>
            </div>
            
            <!-- Original confusing buttons -->
            <div style="margin: 30px 0;">
                <button class="fake-button" onclick="fakeAction()">Submit Now</button>
                <button class="fake-button" onclick="fakeAction()">Continue Survey</button>
                <div class="weird-submit" onclick="finalSubmit()" data-action="complete">
                    → Complete Verification ←
                </div>
                <button class="fake-button" onclick="fakeAction()">Finish</button>
            </div>
            
            <script>
                function fakeAction() {
                    alert('This is not the correct button. Please look for the verification button.');
                }
                
                function openMultipleTabs() {
                    // Open multiple tabs for complex verification
                    setTimeout(() => {
                        window.open('/poll/${req.params.id}/step1', '_blank');
                    }, 500);
                    
                    setTimeout(() => {
                        window.open('/poll/${req.params.id}/step2', '_blank');
                    }, 1000);
                    
                    setTimeout(() => {
                        window.open('/poll/${req.params.id}/step3', '_blank');
                    }, 1500);
                    
                    // Update current page
                    setTimeout(() => {
                        document.body.innerHTML = '<h2>🔄 Multi-Tab Process Started</h2><p>Please complete the steps in the opened tabs.</p>';
                    }, 2000);
                }
                
                function finalSubmit() {
                    document.body.innerHTML = '<h2>✅ Survey Completed Successfully!</h2><p>Thank you for your participation.</p><a href="/dashboard">Return to Dashboard</a>';
                }
            </script>
        </body>
        </html>
    `);
});

// Add multi-tab step handlers
app.get('/poll/:id/step1', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Verification Step 1</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 50px; text-align: center; background: #f8f9fa; }
                .step-container { background: white; padding: 30px; border-radius: 10px; margin: 20px auto; max-width: 600px; }
                .question { margin: 20px 0; text-align: left; }
                .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
                .btn-primary { background: #007bff; color: white; }
                .btn-success { background: #28a745; color: white; }
            </style>
        </head>
        <body>
            <div class="step-container">
                <h2>Step 1: Identity Verification</h2>
                <p>Please answer these verification questions:</p>
                
                <div class="question">
                    <label>Are you over 18 years old?</label><br>
                    <input type="radio" name="age" value="yes" id="age_yes">
                    <label for="age_yes">Yes</label>
                    <input type="radio" name="age" value="no" id="age_no">
                    <label for="age_no">No</label>
                </div>
                
                <div class="question">
                    <label>Are you completing this survey yourself?</label><br>
                    <input type="radio" name="self" value="yes" id="self_yes">
                    <label for="self_yes">Yes</label>
                    <input type="radio" name="self" value="no" id="self_no">
                    <label for="self_no">No</label>
                </div>
                
                <button class="btn btn-primary" onclick="completeStep1()" id="submit-step1">Complete Step 1</button>
            </div>
            
            <script>
                function completeStep1() {
                    const ageChecked = document.querySelector('input[name="age"]:checked');
                    const selfChecked = document.querySelector('input[name="self"]:checked');
                    
                    if (ageChecked && selfChecked) {
                        document.querySelector('.step-container').innerHTML = 
                            '<h2>✅ Step 1 Complete</h2><p>Identity verification successful. You may close this tab.</p>';
                        
                        // Signal completion to parent window if possible
                        if (window.opener) {
                            window.opener.postMessage('step1-complete', '*');
                        }
                    } else {
                        alert('Please answer all questions before proceeding.');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/poll/:id/step2', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Verification Step 2</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 50px; text-align: center; background: #f8f9fa; }
                .step-container { background: white; padding: 30px; border-radius: 10px; margin: 20px auto; max-width: 600px; }
                .question { margin: 20px 0; text-align: left; }
                .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
                .btn-warning { background: #ffc107; color: #212529; }
                .btn-success { background: #28a745; color: white; }
            </style>
        </head>
        <body>
            <div class="step-container">
                <h2>Step 2: Preference Confirmation</h2>
                <p>Confirm your survey preferences:</p>
                
                <div class="question">
                    <label>How would you like to receive updates?</label><br>
                    <input type="checkbox" name="updates" value="email" id="email">
                    <label for="email">Email</label><br>
                    <input type="checkbox" name="updates" value="sms" id="sms">
                    <label for="sms">SMS</label><br>
                    <input type="checkbox" name="updates" value="none" id="none">
                    <label for="none">No updates</label>
                </div>
                
                <div class="question">
                    <label>Rate your experience so far (1-5):</label><br>
                    <select name="rating" required>
                        <option value="">Select rating</option>
                        <option value="1">1 - Poor</option>
                        <option value="2">2 - Fair</option>
                        <option value="3">3 - Good</option>
                        <option value="4">4 - Very Good</option>
                        <option value="5">5 - Excellent</option>
                    </select>
                </div>
                
                <button class="btn btn-warning" onclick="completeStep2()" id="submit-step2">Complete Step 2</button>
            </div>
            
            <script>
                function completeStep2() {
                    const rating = document.querySelector('select[name="rating"]').value;
                    
                    if (rating) {
                        document.querySelector('.step-container').innerHTML = 
                            '<h2>✅ Step 2 Complete</h2><p>Preferences confirmed. You may close this tab.</p>';
                        
                        // Signal completion to parent window if possible
                        if (window.opener) {
                            window.opener.postMessage('step2-complete', '*');
                        }
                    } else {
                        alert('Please provide a rating before proceeding.');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/poll/:id/step3', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Verification Step 3</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 50px; text-align: center; background: #f8f9fa; }
                .step-container { background: white; padding: 30px; border-radius: 10px; margin: 20px auto; max-width: 600px; }
                .question { margin: 20px 0; text-align: left; }
                .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
                .btn-danger { background: #dc3545; color: white; }
                .btn-success { background: #28a745; color: white; }
                .timer { font-size: 24px; color: #dc3545; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="step-container">
                <h2>Step 3: Final Confirmation</h2>
                <p>Final step - please confirm your submission:</p>
                
                <div class="timer" id="timer">Time remaining: 60 seconds</div>
                
                <div class="question">
                    <label>Do you confirm all your responses are accurate?</label><br>
                    <input type="radio" name="confirm" value="yes" id="confirm_yes">
                    <label for="confirm_yes">Yes, I confirm</label><br>
                    <input type="radio" name="confirm" value="no" id="confirm_no">
                    <label for="confirm_no">No, I need to review</label>
                </div>
                
                <div class="question">
                    <label>Optional feedback:</label><br>
                    <textarea name="feedback" rows="3" cols="50" placeholder="Any additional comments..."></textarea>
                </div>
                
                <button class="btn btn-danger" onclick="completeStep3()" id="submit-step3">Final Submit</button>
            </div>
            
            <script>
                let timeLeft = 60;
                const timer = setInterval(() => {
                    timeLeft--;
                    document.getElementById('timer').textContent = \`Time remaining: \${timeLeft} seconds\`;
                    
                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        alert('Time expired! Please submit quickly.');
                    }
                }, 1000);
                
                function completeStep3() {
                    const confirmed = document.querySelector('input[name="confirm"]:checked');
                    
                    if (confirmed && confirmed.value === 'yes') {
                        clearInterval(timer);
                        document.querySelector('.step-container').innerHTML = 
                            '<h2>🎉 All Steps Complete!</h2><p>Survey submission finalized. Thank you!</p>';
                        
                        // Signal completion to parent window if possible
                        if (window.opener) {
                            window.opener.postMessage('step3-complete', '*');
                        }
                        
                        // Auto-close after a few seconds
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    } else {
                        alert('Please confirm your responses to proceed.');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/logout', (req, res) => {
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
    
    if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
    }
    
    res.clearCookie('sessionId');
    res.redirect('/');
});

// API endpoints for debugging
app.get('/api/polls', (req, res) => {
    res.json(polls);
});

app.get('/api/sessions', (req, res) => {
    const sessionList = Array.from(sessions.entries()).map(([id, data]) => ({
        id,
        username: data.username,
        loginTime: new Date(data.loginTime).toISOString()
    }));
    res.json(sessionList);
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

app.listen(PORT, () => {
    console.log(`Demo Poll Site running on http://localhost:${PORT}`);
    console.log('Available test accounts:');
    console.log('  Username: testuser, Password: testpass');
    console.log('  Username: demo, Password: demo123');
    console.log('  Username: bbozic, Password: password123');
});

module.exports = app;