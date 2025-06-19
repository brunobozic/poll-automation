/**
 * Simple Survey Site for Testing
 * A basic survey site with minimal countermeasures for testing our automation
 */

const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Simple in-memory storage for demo
const registrations = new Map();
const surveyResponses = new Map();

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Simple Survey Site</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
            <h1>🎯 Simple Survey Site</h1>
            <p>A basic survey platform for testing automation.</p>
            
            <div style="margin: 30px 0;">
                <h2>Available Actions:</h2>
                <ul>
                    <li><a href="/register">📝 Register for an Account</a></li>
                    <li><a href="/surveys">📊 Take Surveys</a> (requires registration)</li>
                    <li><a href="/admin">🔧 Admin Panel</a></li>
                </ul>
            </div>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                <h3>🎭 Testing Features:</h3>
                <ul>
                    <li>Simple registration form</li>
                    <li>Basic survey questions</li>
                    <li>Minimal anti-bot measures</li>
                    <li>Easy-to-detect form elements</li>
                </ul>
            </div>
        </body>
        </html>
    `);
});

// Registration page
app.get('/register', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Register - Simple Survey Site</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .form-group { margin: 15px 0; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
                button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
                button:hover { background: #0056b3; }
                .checkbox-group { display: flex; align-items: center; gap: 8px; }
                .checkbox-group input { width: auto; }
            </style>
        </head>
        <body>
            <h1>📝 Register for Survey Site</h1>
            <p>Create your account to participate in surveys and earn rewards!</p>
            
            <form action="/register" method="POST" id="registrationForm">
                <div class="form-group">
                    <label for="firstName">First Name *</label>
                    <input type="text" id="firstName" name="firstName" required>
                </div>
                
                <div class="form-group">
                    <label for="lastName">Last Name *</label>
                    <input type="text" id="lastName" name="lastName" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email Address *</label>
                    <input type="email" id="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="age">Age</label>
                    <input type="number" id="age" name="age" min="18" max="100">
                </div>
                
                <div class="form-group">
                    <label for="gender">Gender</label>
                    <select id="gender" name="gender">
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="occupation">Occupation</label>
                    <input type="text" id="occupation" name="occupation" placeholder="e.g., Software Engineer">
                </div>
                
                <div class="form-group">
                    <label for="income">Annual Income</label>
                    <select id="income" name="income">
                        <option value="">Select...</option>
                        <option value="under-25k">Under $25,000</option>
                        <option value="25k-50k">$25,000 - $50,000</option>
                        <option value="50k-75k">$50,000 - $75,000</option>
                        <option value="75k-100k">$75,000 - $100,000</option>
                        <option value="over-100k">Over $100,000</option>
                    </select>
                </div>
                
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="terms" name="terms" required>
                    <label for="terms">I agree to the Terms of Service and Privacy Policy *</label>
                </div>
                
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="newsletter" name="newsletter">
                    <label for="newsletter">Subscribe to our newsletter for survey opportunities</label>
                </div>
                
                <div class="form-group">
                    <button type="submit">Create Account</button>
                </div>
            </form>
            
            <script>
                // Simple client-side validation
                document.getElementById('registrationForm').onsubmit = function(e) {
                    const email = document.getElementById('email').value;
                    const terms = document.getElementById('terms').checked;
                    
                    if (!email.includes('@')) {
                        alert('Please enter a valid email address');
                        e.preventDefault();
                        return false;
                    }
                    
                    if (!terms) {
                        alert('You must agree to the Terms of Service');
                        e.preventDefault();
                        return false;
                    }
                    
                    return true;
                };
            </script>
        </body>
        </html>
    `);
});

// Handle registration
app.post('/register', (req, res) => {
    const { firstName, lastName, email, age, gender, occupation, income, terms, newsletter } = req.body;
    
    // Simple validation
    if (!firstName || !lastName || !email || !terms) {
        return res.status(400).send(`
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h1>❌ Registration Failed</h1>
                <p>Missing required fields. Please <a href="/register">try again</a>.</p>
            </body>
            </html>
        `);
    }
    
    // Check if email already exists
    if (registrations.has(email)) {
        return res.status(400).send(`
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h1>❌ Registration Failed</h1>
                <p>Email already registered. Please <a href="/register">try again</a> with a different email.</p>
            </body>
            </html>
        `);
    }
    
    // Store registration
    const userId = Date.now().toString();
    registrations.set(email, {
        id: userId,
        firstName,
        lastName,
        email,
        age: parseInt(age) || null,
        gender,
        occupation,
        income,
        newsletter: !!newsletter,
        registeredAt: new Date().toISOString()
    });
    
    console.log(`📧 New registration: ${firstName} ${lastName} (${email})`);
    
    // Success page
    res.send(`
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h1>✅ Registration Successful!</h1>
            <p>Welcome, ${firstName}! Your account has been created successfully.</p>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>✉️ Email Verification</h3>
                <p>A verification email has been sent to <strong>${email}</strong>.</p>
                <p>Please check your inbox and click the verification link to activate your account.</p>
            </div>
            
            <div style="margin: 30px 0;">
                <a href="/surveys" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    Start Taking Surveys
                </a>
                <a href="/" style="margin-left: 15px; color: #007bff; text-decoration: none;">
                    Back to Home
                </a>
            </div>
        </body>
        </html>
    `);
});

// Surveys page
app.get('/surveys', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
            <h1>📊 Available Surveys</h1>
            <p>Complete surveys to earn points and rewards!</p>
            
            <div style="display: grid; gap: 20px; margin: 30px 0;">
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h3>🛍️ Consumer Preferences Survey</h3>
                    <p>Share your shopping habits and preferences. <strong>Estimated time: 5 minutes</strong></p>
                    <p>Reward: 50 points</p>
                    <a href="/survey/consumer" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
                        Start Survey
                    </a>
                </div>
                
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h3>🎬 Entertainment Survey</h3>
                    <p>Tell us about your entertainment preferences. <strong>Estimated time: 3 minutes</strong></p>
                    <p>Reward: 30 points</p>
                    <a href="/survey/entertainment" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
                        Start Survey
                    </a>
                </div>
                
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h3>💼 Work & Lifestyle Survey</h3>
                    <p>Help us understand modern work-life balance. <strong>Estimated time: 7 minutes</strong></p>
                    <p>Reward: 75 points</p>
                    <a href="/survey/lifestyle" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
                        Start Survey
                    </a>
                </div>
            </div>
            
            <p><a href="/">← Back to Home</a></p>
        </body>
        </html>
    `);
});

// Simple survey
app.get('/survey/:type', (req, res) => {
    const surveyType = req.params.type;
    const surveys = {
        consumer: {
            title: 'Consumer Preferences Survey',
            questions: [
                { id: 'q1', text: 'How often do you shop online?', type: 'radio', options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
                { id: 'q2', text: 'What is your preferred payment method?', type: 'radio', options: ['Credit Card', 'PayPal', 'Cash', 'Mobile Payment'] },
                { id: 'q3', text: 'Which factors influence your purchasing decisions? (Select all that apply)', type: 'checkbox', options: ['Price', 'Quality', 'Brand', 'Reviews', 'Convenience'] }
            ]
        },
        entertainment: {
            title: 'Entertainment Survey',
            questions: [
                { id: 'q1', text: 'What is your favorite type of entertainment?', type: 'radio', options: ['Movies', 'TV Shows', 'Books', 'Video Games', 'Sports'] },
                { id: 'q2', text: 'How many hours per week do you spend watching TV/streaming?', type: 'radio', options: ['0-5 hours', '6-10 hours', '11-20 hours', '20+ hours'] }
            ]
        },
        lifestyle: {
            title: 'Work & Lifestyle Survey',
            questions: [
                { id: 'q1', text: 'Do you work from home?', type: 'radio', options: ['Yes, always', 'Yes, sometimes', 'No, never'] },
                { id: 'q2', text: 'How satisfied are you with your work-life balance?', type: 'radio', options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'] },
                { id: 'q3', text: 'What would improve your work experience?', type: 'text', placeholder: 'Type your answer here...' }
            ]
        }
    };
    
    const survey = surveys[surveyType];
    if (!survey) {
        return res.status(404).send('Survey not found');
    }
    
    let questionsHtml = '';
    survey.questions.forEach((q, index) => {
        questionsHtml += `<div class="question" style="margin: 25px 0; padding: 20px; border: 1px solid #eee; border-radius: 8px;">`;
        questionsHtml += `<h3>${index + 1}. ${q.text}</h3>`;
        
        if (q.type === 'radio') {
            q.options.forEach(option => {
                questionsHtml += `
                    <div style="margin: 8px 0;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="${q.id}" value="${option}" required>
                            ${option}
                        </label>
                    </div>
                `;
            });
        } else if (q.type === 'checkbox') {
            q.options.forEach(option => {
                questionsHtml += `
                    <div style="margin: 8px 0;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" name="${q.id}" value="${option}">
                            ${option}
                        </label>
                    </div>
                `;
            });
        } else if (q.type === 'text') {
            questionsHtml += `
                <textarea name="${q.id}" placeholder="${q.placeholder || ''}" 
                         style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            `;
        }
        
        questionsHtml += `</div>`;
    });
    
    res.send(`
        <html>
        <head>
            <title>${survey.title}</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
                button:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <h1>📋 ${survey.title}</h1>
            <p>Please answer all questions honestly. Your responses help us improve our services.</p>
            
            <form action="/survey/${surveyType}" method="POST">
                ${questionsHtml}
                
                <div style="margin: 30px 0;">
                    <button type="submit">Submit Survey</button>
                    <a href="/surveys" style="margin-left: 15px; color: #007bff; text-decoration: none;">Cancel</a>
                </div>
            </form>
        </body>
        </html>
    `);
});

// Handle survey submission
app.post('/survey/:type', (req, res) => {
    const surveyType = req.params.type;
    const responses = req.body;
    
    // Store response
    const responseId = Date.now().toString();
    surveyResponses.set(responseId, {
        surveyType,
        responses,
        submittedAt: new Date().toISOString()
    });
    
    console.log(`📊 Survey completed: ${surveyType} (Response ID: ${responseId})`);
    
    res.send(`
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h1>✅ Survey Completed!</h1>
            <p>Thank you for completing the ${surveyType} survey!</p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>🎉 Reward Earned!</h3>
                <p>You've earned points for completing this survey. Points will be added to your account within 24 hours.</p>
            </div>
            
            <div style="margin: 30px 0;">
                <a href="/surveys" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    Take Another Survey
                </a>
                <a href="/" style="margin-left: 15px; color: #007bff; text-decoration: none;">
                    Back to Home
                </a>
            </div>
        </body>
        </html>
    `);
});

// Admin panel
app.get('/admin', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
            <h1>🔧 Admin Panel</h1>
            
            <div style="display: grid; gap: 20px; margin: 30px 0;">
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h3>📊 Statistics</h3>
                    <p>Total Registrations: ${registrations.size}</p>
                    <p>Total Survey Responses: ${surveyResponses.size}</p>
                </div>
                
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h3>📝 Recent Registrations</h3>
                    ${Array.from(registrations.values()).slice(-5).map(reg => 
                        `<p>${reg.firstName} ${reg.lastName} (${reg.email}) - ${new Date(reg.registeredAt).toLocaleString()}</p>`
                    ).join('') || '<p>No registrations yet</p>'}
                </div>
            </div>
            
            <p><a href="/">← Back to Home</a></p>
        </body>
        </html>
    `);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🌐 Simple Survey Site running on http://localhost:${PORT}`);
    console.log('🎯 Perfect for testing automation systems!');
    console.log('');
    console.log('Available endpoints:');
    console.log(`   📝 Registration: http://localhost:${PORT}/register`);
    console.log(`   📊 Surveys: http://localhost:${PORT}/surveys`);
    console.log(`   🔧 Admin: http://localhost:${PORT}/admin`);
});

module.exports = app;