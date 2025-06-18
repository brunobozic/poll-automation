/**
 * Complex Edge Case Demo Poll Server
 * Simulates nasty real-world edge cases that poll sites use to confuse bots
 * 
 * Edge Cases Implemented:
 * - Complex modal workflows with nested modals
 * - Multiple tab/window redirects with dependencies
 * - Dynamic content loading and DOM manipulation
 * - Anti-bot measures (hidden elements, timing checks, mouse tracking)
 * - CAPTCHA-like challenges
 * - Complex form validation with delayed feedback
 * - Overlay popups and consent banners
 * - Dynamic button states and disabled elements
 * - Complex iframe scenarios
 * - Session timeout and re-authentication flows
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = 3002; // Different port to avoid conflicts

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session storage with complex state tracking
const sessions = new Map();
const userSessions = new Map(); // Track user behavior patterns
const botDetectionScores = new Map(); // Anti-bot scoring

// Demo users with different permission levels
const users = {
    'testuser': { password: 'testpass', role: 'standard', restrictions: [] },
    'premium': { password: 'premium123', role: 'premium', restrictions: [] },
    'restricted': { password: 'restricted123', role: 'restricted', restrictions: ['no_complex_polls'] },
    'bot_suspect': { password: 'suspect123', role: 'suspect', restrictions: ['extra_validation'] }
};

// Complex polls with multiple edge cases
const complexPolls = [
    {
        id: 1,
        title: 'Advanced Market Research Survey',
        description: 'Complex multi-stage survey with validation challenges',
        complexity: 'extreme',
        antiBot: true,
        requiresModals: true,
        multiTab: true,
        questions: [
            {
                id: 1,
                text: 'Please verify you are human by solving: What is 7 + 15?',
                type: 'captcha-math',
                required: true,
                isCalibration: true,
                calibrationType: 'human_verification',
                correctAnswer: '22',
                maxAttempts: 3
            },
            {
                id: 2,
                text: 'ATTENTION CHECK: To proceed, click on the RED circle below (not the button)',
                type: 'attention-visual',
                required: true,
                isCalibration: true,
                calibrationType: 'visual_attention',
                showAfterDelay: 2000
            },
            {
                id: 3,
                text: 'How often do you make online purchases?',
                type: 'single-choice',
                required: true,
                requiresModal: true,
                modalType: 'definition',
                options: [
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'rarely', label: 'Rarely' },
                    { value: 'never', label: 'Never' }
                ]
            },
            {
                id: 4,
                text: 'Rate your satisfaction with each aspect:',
                type: 'matrix-rating',
                required: true,
                dynamicValidation: true,
                aspects: ['Quality', 'Price', 'Service', 'Delivery', 'Support'],
                scale: [1, 2, 3, 4, 5]
            },
            {
                id: 5,
                text: 'Please rank these factors in order of importance (drag and drop):',
                type: 'drag-drop-ranking',
                required: true,
                requiresInteraction: true,
                items: ['Price', 'Quality', 'Brand', 'Reviews', 'Availability']
            },
            {
                id: 6,
                text: 'Upload a screenshot of your last purchase receipt:',
                type: 'file-upload',
                required: false,
                acceptedTypes: ['.jpg', '.png', '.pdf'],
                maxSize: '5MB'
            }
        ]
    },
    {
        id: 2,
        title: 'Multi-Window Verification Survey',
        description: 'Survey that opens multiple windows for verification',
        complexity: 'extreme',
        antiBot: true,
        multiTab: true,
        requiresVerification: true,
        questions: [
            {
                id: 1,
                text: 'Before we begin, we need to verify your identity across multiple windows.',
                type: 'multi-window-setup',
                required: true,
                windowCount: 3,
                verificationSteps: ['email', 'phone', 'document']
            },
            {
                id: 2,
                text: 'Complete the verification in all opened windows, then return here.',
                type: 'verification-waiting',
                required: true,
                waitForWindows: true,
                timeout: 300000 // 5 minutes
            }
        ]
    },
    {
        id: 3,
        title: 'Dynamic Content Challenge Survey',
        description: 'Survey with constantly changing content and delayed elements',
        complexity: 'extreme',
        antiBot: true,
        dynamicContent: true,
        questions: [
            {
                id: 1,
                text: 'This question will change in 10 seconds. Current question: What is your age group?',
                type: 'dynamic-question',
                required: true,
                changeInterval: 10000,
                alternateQuestions: [
                    'What is your income range?',
                    'What is your education level?',
                    'What is your employment status?'
                ],
                options: [
                    { value: '18-25', label: '18-25' },
                    { value: '26-35', label: '26-35' },
                    { value: '36-45', label: '36-45' },
                    { value: '46-55', label: '46-55' },
                    { value: '55+', label: '55+' }
                ]
            }
        ]
    }
];

// Anti-bot detection middleware
app.use((req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
    
    // Simple bot detection scoring
    let botScore = 0;
    if (userAgent.includes('HeadlessChrome')) botScore += 50;
    if (userAgent.includes('PhantomJS')) botScore += 50;
    if (userAgent.includes('Selenium')) botScore += 50;
    if (!userAgent) botScore += 30;
    
    if (sessionId) {
        const currentScore = botDetectionScores.get(sessionId) || 0;
        botDetectionScores.set(sessionId, currentScore + botScore);
    }
    
    next();
});

// Routes

// Enhanced landing page with consent modal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Complex Edge Case Poll Demo</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .poll-card { border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 8px; background: #fafafa; }
                .complexity-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                .extreme { background: #ff4444; color: white; }
                .high { background: #ff8800; color: white; }
                .medium { background: #ffaa00; color: white; }
                .btn { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
                .btn:hover { background: #0056b3; }
                
                /* Consent Modal */
                .consent-modal { 
                    display: block; 
                    position: fixed; 
                    top: 0; left: 0; 
                    width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.8); 
                    z-index: 10000;
                    animation: fadeIn 0.3s;
                }
                .consent-content { 
                    background: white; 
                    padding: 30px; 
                    margin: 10% auto; 
                    width: 80%; 
                    max-width: 600px; 
                    border-radius: 10px;
                    position: relative;
                }
                .consent-close { 
                    position: absolute; 
                    top: 10px; 
                    right: 15px; 
                    font-size: 24px; 
                    cursor: pointer; 
                    color: #999;
                }
                .consent-close:hover { color: #333; }
                
                /* Floating notification */
                .floating-notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #28a745;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    display: none;
                    z-index: 1000;
                }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                
                /* Anti-bot hidden elements */
                .honeypot { position: absolute; left: -9999px; opacity: 0; }
                .mouse-tracker { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1; }
            </style>
        </head>
        <body>
            <!-- Anti-bot mouse tracking -->
            <div class="mouse-tracker" id="mouseTracker"></div>
            
            <!-- Honeypot anti-bot field -->
            <input type="text" class="honeypot" name="bot_field" autocomplete="off" />
            
            <!-- Consent Modal (must be dismissed to proceed) -->
            <div class="consent-modal" id="consentModal">
                <div class="consent-content">
                    <span class="consent-close" onclick="showNestedModal()">&times;</span>
                    <h2>🍪 Cookie and Privacy Consent</h2>
                    <p>We use cookies and collect data to improve your experience. This is required to participate in our surveys.</p>
                    
                    <div style="margin: 20px 0;">
                        <label><input type="checkbox" id="essentialCookies" checked disabled> Essential Cookies (Required)</label><br>
                        <label><input type="checkbox" id="analyticalCookies"> Analytical Cookies</label><br>
                        <label><input type="checkbox" id="marketingCookies"> Marketing Cookies</label><br>
                        <label><input type="checkbox" id="personalizedCookies"> Personalized Content</label>
                    </div>
                    
                    <button class="btn" onclick="acceptConsent()">Accept Selected</button>
                    <button class="btn" style="background: #6c757d;" onclick="showNestedModal()">Customize Settings</button>
                </div>
            </div>
            
            <!-- Nested Modal (appears when trying to close consent) -->
            <div class="consent-modal" id="nestedModal" style="display: none; background: rgba(0,0,0,0.9);">
                <div class="consent-content">
                    <span class="consent-close" onclick="closeNestedModal()">&times;</span>
                    <h2>⚠️ Are you sure?</h2>
                    <p>Without accepting cookies, you won't be able to participate in our surveys. This may limit your earning potential.</p>
                    <div style="margin: 20px 0;">
                        <strong>Benefits of participating:</strong>
                        <ul>
                            <li>Earn rewards for completed surveys</li>
                            <li>Influence product development</li>
                            <li>Access to exclusive beta features</li>
                        </ul>
                    </div>
                    <button class="btn" onclick="acceptConsentFromNested()">Accept and Continue</button>
                    <button class="btn" style="background: #dc3545;" onclick="rejectConsent()">No Thanks, Exit</button>
                </div>
            </div>
            
            <div class="container">
                <div class="header">
                    <h1>🧪 Complex Edge Case Poll Demo</h1>
                    <p>Advanced testing environment for poll automation edge cases</p>
                    <p><strong>⚠️ Warning:</strong> These polls contain complex anti-bot measures, modals, multi-window flows, and dynamic content.</p>
                </div>
                
                <div class="poll-card">
                    <h3>Available Complex Polls</h3>
                    <p>Each poll tests different edge cases that real-world poll sites use to prevent automation:</p>
                </div>
                
                <div class="poll-card">
                    <h4>📋 Advanced Market Research Survey</h4>
                    <span class="complexity-badge extreme">EXTREME</span>
                    <p><strong>Edge Cases:</strong> CAPTCHA challenges, visual attention checks, modal workflows, matrix ratings, drag-and-drop ranking, file uploads</p>
                    <ul>
                        <li>🧮 Math CAPTCHA verification</li>
                        <li>👁️ Visual attention challenges</li>
                        <li>📝 Definition modal popups</li>
                        <li>📊 Complex matrix rating grids</li>
                        <li>🔄 Drag-and-drop interactions</li>
                        <li>📎 File upload requirements</li>
                    </ul>
                    <a href="/login?redirect=/complex-poll/1" class="btn">Start Advanced Survey</a>
                </div>
                
                <div class="poll-card">
                    <h4>🗂️ Multi-Window Verification Survey</h4>
                    <span class="complexity-badge extreme">EXTREME</span>
                    <p><strong>Edge Cases:</strong> Multiple window verification, cross-window dependencies, time-limited verification steps</p>
                    <ul>
                        <li>🪟 Opens 3 verification windows</li>
                        <li>📧 Email verification in separate window</li>
                        <li>📱 Phone verification with SMS</li>
                        <li>📄 Document upload verification</li>
                        <li>⏱️ Time-limited verification process</li>
                    </ul>
                    <a href="/login?redirect=/complex-poll/2" class="btn">Start Multi-Window Survey</a>
                </div>
                
                <div class="poll-card">
                    <h4>🔄 Dynamic Content Challenge Survey</h4>
                    <span class="complexity-badge extreme">EXTREME</span>
                    <p><strong>Edge Cases:</strong> Dynamic question changes, delayed content loading, morphing UI elements</p>
                    <ul>
                        <li>🔄 Questions change every 10 seconds</li>
                        <li>⏳ Delayed element appearance</li>
                        <li>🎭 Morphing UI components</li>
                        <li>📱 Responsive layout changes</li>
                        <li>🎨 Dynamic styling updates</li>
                    </ul>
                    <a href="/login?redirect=/complex-poll/3" class="btn">Start Dynamic Survey</a>
                </div>
                
                <div class="poll-card">
                    <h4>🎯 Testing Tools</h4>
                    <a href="/edge-case-test-suite" class="btn" style="background: #28a745;">Run Edge Case Test Suite</a>
                    <a href="/bot-detection-test" class="btn" style="background: #dc3545;">Test Bot Detection</a>
                    <a href="/accessibility-test" class="btn" style="background: #6f42c1;">Accessibility Challenge</a>
                </div>
            </div>
            
            <!-- Floating notification -->
            <div class="floating-notification" id="floatingNotification">
                🎉 Cookies accepted! You can now participate in surveys.
            </div>
            
            <script>
                let mouseMovements = [];
                let lastMouseTime = 0;
                let humanBehaviorScore = 0;
                
                // Mouse tracking for bot detection
                document.addEventListener('mousemove', function(e) {
                    const now = Date.now();
                    if (now - lastMouseTime > 50) { // Throttle tracking
                        mouseMovements.push({
                            x: e.clientX,
                            y: e.clientY,
                            time: now
                        });
                        lastMouseTime = now;
                        
                        // Calculate human-like movement patterns
                        if (mouseMovements.length > 10) {
                            mouseMovements.shift();
                        }
                        
                        calculateHumanBehavior();
                    }
                });
                
                function calculateHumanBehavior() {
                    if (mouseMovements.length < 3) return;
                    
                    // Check for non-linear movement (humans don't move in perfect lines)
                    let nonLinearMovements = 0;
                    for (let i = 2; i < mouseMovements.length; i++) {
                        const p1 = mouseMovements[i-2];
                        const p2 = mouseMovements[i-1];
                        const p3 = mouseMovements[i];
                        
                        // Calculate angle deviation
                        const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
                        const deviation = Math.abs(angle1 - angle2);
                        
                        if (deviation > 0.1) { // Threshold for non-linear movement
                            nonLinearMovements++;
                        }
                    }
                    
                    humanBehaviorScore = (nonLinearMovements / mouseMovements.length) * 100;
                }
                
                function showNestedModal() {
                    document.getElementById('nestedModal').style.display = 'block';
                }
                
                function closeNestedModal() {
                    document.getElementById('nestedModal').style.display = 'none';
                }
                
                function acceptConsent() {
                    document.getElementById('consentModal').style.display = 'none';
                    showFloatingNotification();
                    
                    // Send consent data to server
                    fetch('/api/consent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            essential: true,
                            analytical: document.getElementById('analyticalCookies').checked,
                            marketing: document.getElementById('marketingCookies').checked,
                            personalized: document.getElementById('personalizedCookies').checked,
                            humanBehaviorScore: humanBehaviorScore,
                            mouseMovements: mouseMovements.length
                        })
                    });
                }
                
                function acceptConsentFromNested() {
                    closeNestedModal();
                    acceptConsent();
                }
                
                function rejectConsent() {
                    alert('🤖 Suspicious behavior detected. Redirecting to exit page...');
                    window.location.href = '/bot-detected';
                }
                
                function showFloatingNotification() {
                    const notification = document.getElementById('floatingNotification');
                    notification.style.display = 'block';
                    setTimeout(() => {
                        notification.style.display = 'none';
                    }, 3000);
                }
                
                // Check for honeypot interaction (bot trap)
                document.querySelector('.honeypot').addEventListener('input', function() {
                    // If anything interacts with honeypot, it's likely a bot
                    fetch('/api/bot-detected', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: 'honeypot_interaction' })
                    });
                });
                
                // Prevent right-click context menu (common bot prevention)
                document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    return false;
                });
                
                // Check for rapid clicking (bot behavior)
                let clickCount = 0;
                let clickResetTimer = null;
                
                document.addEventListener('click', function() {
                    clickCount++;
                    
                    if (clickCount > 10) {
                        fetch('/api/bot-detected', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason: 'rapid_clicking', count: clickCount })
                        });
                    }
                    
                    clearTimeout(clickResetTimer);
                    clickResetTimer = setTimeout(() => {
                        clickCount = 0;
                    }, 5000);
                });
                
                // Page visibility API to detect headless browsers
                document.addEventListener('visibilitychange', function() {
                    if (document.hidden) {
                        // Page is hidden - could be headless
                        fetch('/api/suspicious-behavior', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                reason: 'page_hidden',
                                userAgent: navigator.userAgent,
                                humanScore: humanBehaviorScore
                            })
                        });
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Enhanced login with CAPTCHA and behavioral checks
app.get('/login', (req, res) => {
    const redirect = req.query.redirect || '/dashboard';
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Enhanced Login - Complex Edge Cases</title>
            <style>
                body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; }
                .login-container { max-width: 450px; margin: 5% auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .form-group { margin: 20px 0; }
                label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
                input[type="text"], input[type="password"] { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
                input[type="text"]:focus, input[type="password"]:focus { border-color: #007bff; outline: none; box-shadow: 0 0 5px rgba(0,123,255,0.3); }
                .btn { background: #007bff; color: white; padding: 14px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; width: 100%; transition: all 0.3s; }
                .btn:hover { background: #0056b3; transform: translateY(-2px); }
                .btn:disabled { background: #6c757d; cursor: not-allowed; transform: none; }
                .error { color: #dc3545; margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 5px; display: none; }
                .captcha-container { border: 2px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; background: #f8f9fa; text-align: center; }
                .captcha-challenge { font-family: monospace; font-size: 24px; background: #e9ecef; padding: 15px; border-radius: 5px; margin: 10px 0; letter-spacing: 3px; user-select: none; }
                .captcha-input { margin: 10px 0; }
                .progress-bar { width: 100%; height: 4px; background: #e9ecef; border-radius: 2px; margin: 20px 0; overflow: hidden; }
                .progress-fill { height: 100%; background: #28a745; width: 0%; transition: width 0.3s; }
                .loading-spinner { display: none; text-align: center; margin: 20px 0; }
                .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                
                /* Delayed elements that appear after time */
                .delayed-element { opacity: 0; transition: opacity 1s; }
                .delayed-element.visible { opacity: 1; }
                
                /* Anti-bot elements */
                .honeypot { position: absolute; left: -9999px; opacity: 0; }
                .hidden-checkbox { position: absolute; left: -9999px; }
            </style>
        </head>
        <body>
            <!-- Anti-bot honeypots -->
            <input type="text" class="honeypot" name="username_honey" autocomplete="off" />
            <input type="password" class="honeypot" name="password_honey" autocomplete="off" />
            <input type="checkbox" class="hidden-checkbox" name="bot_check" />
            
            <div class="login-container">
                <h2 style="text-align: center; margin-bottom: 30px; color: #333;">🔐 Secure Login</h2>
                
                <form id="loginForm" action="/login" method="POST">
                    <input type="hidden" name="redirect" value="${redirect}" />
                    <input type="hidden" name="login_token" id="loginToken" />
                    <input type="hidden" name="behavior_score" id="behaviorScore" />
                    
                    <div class="form-group">
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username" required autocomplete="username" />
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required autocomplete="current-password" />
                    </div>
                    
                    <!-- Progressive CAPTCHA Challenge -->
                    <div class="captcha-container">
                        <h4>🤖 Human Verification</h4>
                        <div class="captcha-challenge" id="captchaChallenge">Loading...</div>
                        <div class="captcha-input">
                            <input type="text" id="captchaInput" placeholder="Enter the characters above" required />
                        </div>
                        <button type="button" onclick="refreshCaptcha()">🔄 New Challenge</button>
                    </div>
                    
                    <!-- Delayed checkbox (appears after 5 seconds) -->
                    <div class="form-group delayed-element" id="delayedTerms">
                        <label>
                            <input type="checkbox" id="agreeTerms" required />
                            I agree to the Terms of Service and Privacy Policy
                        </label>
                    </div>
                    
                    <!-- Progress indicator -->
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    
                    <div class="loading-spinner" id="loadingSpinner">
                        <div class="spinner"></div>
                        <p>Verifying credentials...</p>
                    </div>
                    
                    <button type="submit" class="btn" id="submitBtn" disabled>Login</button>
                    
                    <div class="error" id="errorMessage"></div>
                </form>
                
                <div style="text-align: center; margin-top: 20px; font-size: 14px; color: #666;">
                    <p>Test Accounts:</p>
                    <p><strong>testuser</strong> / testpass (Standard)</p>
                    <p><strong>premium</strong> / premium123 (Premium)</p>
                    <p><strong>restricted</strong> / restricted123 (Restricted)</p>
                    <p><strong>bot_suspect</strong> / suspect123 (Suspicious)</p>
                </div>
            </div>
            
            <script>
                let currentCaptcha = '';
                let loginAttempts = 0;
                let mouseMovements = 0;
                let keystrokes = 0;
                let humanBehaviorScore = 0;
                let timeOnPage = Date.now();
                
                // Track human behavior
                document.addEventListener('mousemove', () => {
                    mouseMovements++;
                    updateBehaviorScore();
                });
                
                document.addEventListener('keydown', () => {
                    keystrokes++;
                    updateBehaviorScore();
                });
                
                function updateBehaviorScore() {
                    const timeSpent = Date.now() - timeOnPage;
                    humanBehaviorScore = Math.min(100, (mouseMovements * 0.5) + (keystrokes * 2) + (timeSpent / 1000));
                    document.getElementById('behaviorScore').value = humanBehaviorScore;
                    
                    // Update progress bar
                    const progress = Math.min(100, humanBehaviorScore);
                    document.getElementById('progressFill').style.width = progress + '%';
                    
                    // Enable submit button when score is high enough
                    if (humanBehaviorScore > 30 && document.getElementById('delayedTerms').classList.contains('visible')) {
                        document.getElementById('submitBtn').disabled = false;
                    }
                }
                
                function generateCaptcha() {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let result = '';
                    for (let i = 0; i < 6; i++) {
                        result += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    return result;
                }
                
                function refreshCaptcha() {
                    currentCaptcha = generateCaptcha();
                    document.getElementById('captchaChallenge').textContent = currentCaptcha;
                    document.getElementById('captchaInput').value = '';
                }
                
                function showDelayedElements() {
                    setTimeout(() => {
                        document.getElementById('delayedTerms').classList.add('visible');
                        updateBehaviorScore();
                    }, 5000);
                }
                
                // Initialize
                refreshCaptcha();
                showDelayedElements();
                
                // Generate login token (timestamp + random)
                document.getElementById('loginToken').value = Date.now() + '_' + Math.random().toString(36).substring(2);
                
                // Form submission with validation
                document.getElementById('loginForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const captchaInput = document.getElementById('captchaInput').value.toUpperCase();
                    const errorDiv = document.getElementById('errorMessage');
                    
                    // CAPTCHA validation
                    if (captchaInput !== currentCaptcha) {
                        errorDiv.textContent = 'CAPTCHA verification failed. Please try again.';
                        errorDiv.style.display = 'block';
                        refreshCaptcha();
                        loginAttempts++;
                        
                        if (loginAttempts >= 3) {
                            errorDiv.textContent = 'Too many failed attempts. Please wait 30 seconds.';
                            document.getElementById('submitBtn').disabled = true;
                            setTimeout(() => {
                                document.getElementById('submitBtn').disabled = false;
                                loginAttempts = 0;
                            }, 30000);
                        }
                        return;
                    }
                    
                    // Human behavior validation
                    if (humanBehaviorScore < 30) {
                        errorDiv.textContent = 'Please interact more naturally with the page before submitting.';
                        errorDiv.style.display = 'block';
                        return;
                    }
                    
                    // Show loading
                    document.getElementById('loadingSpinner').style.display = 'block';
                    document.getElementById('submitBtn').disabled = true;
                    
                    // Simulate server processing delay
                    setTimeout(() => {
                        this.submit();
                    }, 2000 + Math.random() * 3000); // 2-5 second delay
                });
                
                // Prevent copy-paste in CAPTCHA (force manual typing)
                document.getElementById('captchaInput').addEventListener('paste', function(e) {
                    e.preventDefault();
                    alert('⚠️ Copy-paste is not allowed for security verification.');
                });
                
                // Check for autofill (bot behavior)
                setTimeout(() => {
                    const username = document.getElementById('username').value;
                    const password = document.getElementById('password').value;
                    
                    if (username && password && mouseMovements === 0) {
                        // Likely autofilled by bot
                        fetch('/api/suspicious-behavior', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                reason: 'autofill_detected',
                                humanScore: humanBehaviorScore
                            })
                        });
                    }
                }, 1000);
            </script>
        </body>
        </html>
    `);
});

// Complex poll routes with extreme edge cases
app.get('/complex-poll/:id', async (req, res) => {
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.redirect('/login?redirect=' + req.originalUrl);
    }
    
    const pollId = parseInt(req.params.id);
    const poll = complexPolls.find(p => p.id === pollId);
    
    if (!poll) {
        return res.status(404).send('Complex poll not found');
    }
    
    // Check bot detection score
    const botScore = botDetectionScores.get(sessionId) || 0;
    const session = sessions.get(sessionId);
    const user = users[session.username];
    
    if (botScore > 100 || (user && user.role === 'suspect')) {
        return res.redirect('/bot-challenge?poll=' + pollId);
    }
    
    res.send(generateComplexPollHTML(poll, sessionId));
});

function generateComplexPollHTML(poll, sessionId) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${poll.title} - Complex Edge Cases</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    position: relative;
                }
                
                .poll-container { 
                    max-width: 900px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 40px; 
                    border-radius: 15px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    position: relative;
                }
                
                .question-card { 
                    border: 2px solid #e9ecef; 
                    padding: 30px; 
                    margin: 25px 0; 
                    border-radius: 12px; 
                    background: #fafafa;
                    transition: all 0.3s;
                    position: relative;
                }
                
                .question-card:hover { 
                    border-color: #007bff; 
                    box-shadow: 0 5px 15px rgba(0,123,255,0.1);
                }
                
                .question-card.active { 
                    border-color: #28a745; 
                    background: #f8fff9;
                }
                
                .question-text { 
                    font-size: 18px; 
                    font-weight: bold; 
                    margin-bottom: 20px; 
                    color: #333;
                }
                
                .option-group { 
                    margin: 15px 0; 
                }
                
                .option-group label { 
                    display: block; 
                    padding: 12px 15px; 
                    background: white; 
                    border: 2px solid #ddd; 
                    border-radius: 8px; 
                    margin: 8px 0; 
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .option-group label:hover { 
                    border-color: #007bff; 
                    background: #f0f8ff;
                }
                
                .option-group input[type="radio"]:checked + span,
                .option-group input[type="checkbox"]:checked + span { 
                    background: #007bff; 
                    color: white;
                    padding: 12px 15px;
                    margin: -12px -15px;
                    border-radius: 6px;
                }
                
                .btn { 
                    background: #007bff; 
                    color: white; 
                    padding: 15px 30px; 
                    border: none; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-size: 16px; 
                    margin: 10px 5px;
                    transition: all 0.3s;
                }
                
                .btn:hover { 
                    background: #0056b3; 
                    transform: translateY(-2px);
                }
                
                .btn:disabled { 
                    background: #6c757d; 
                    cursor: not-allowed; 
                    transform: none;
                }
                
                .btn-success { background: #28a745; }
                .btn-success:hover { background: #1e7e34; }
                
                .btn-warning { background: #ffc107; color: #212529; }
                .btn-warning:hover { background: #e0a800; }
                
                .btn-danger { background: #dc3545; }
                .btn-danger:hover { background: #c82333; }
                
                /* Modal Styles */
                .modal { 
                    display: none; 
                    position: fixed; 
                    top: 0; left: 0; 
                    width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.8); 
                    z-index: 10000;
                    animation: modalFadeIn 0.3s;
                }
                
                .modal-content { 
                    background: white; 
                    padding: 40px; 
                    margin: 5% auto; 
                    width: 90%; 
                    max-width: 700px; 
                    border-radius: 15px;
                    position: relative;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                .modal-close { 
                    position: absolute; 
                    top: 15px; 
                    right: 20px; 
                    font-size: 28px; 
                    cursor: pointer; 
                    color: #999;
                    transition: color 0.3s;
                }
                
                .modal-close:hover { color: #333; }
                
                /* CAPTCHA Styles */
                .captcha-challenge { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 10px; 
                    text-align: center; 
                    margin: 20px 0;
                    border: 2px solid #dee2e6;
                }
                
                .math-problem { 
                    font-size: 24px; 
                    font-weight: bold; 
                    color: #495057; 
                    margin: 15px 0;
                    font-family: monospace;
                }
                
                .captcha-input { 
                    text-align: center; 
                    font-size: 18px; 
                    padding: 12px; 
                    border: 2px solid #ced4da; 
                    border-radius: 8px; 
                    width: 100px;
                    margin: 10px;
                }
                
                /* Visual Attention Challenge */
                .attention-challenge { 
                    padding: 30px; 
                    text-align: center; 
                    background: #fff3cd; 
                    border: 2px solid #ffeaa7; 
                    border-radius: 10px;
                    margin: 20px 0;
                }
                
                .color-circles { 
                    display: flex; 
                    justify-content: center; 
                    gap: 20px; 
                    margin: 20px 0;
                }
                
                .circle { 
                    width: 60px; 
                    height: 60px; 
                    border-radius: 50%; 
                    cursor: pointer; 
                    transition: transform 0.3s;
                    border: 3px solid transparent;
                }
                
                .circle:hover { 
                    transform: scale(1.1); 
                }
                
                .circle.red { background: #dc3545; }
                .circle.blue { background: #007bff; }
                .circle.green { background: #28a745; }
                .circle.yellow { background: #ffc107; }
                
                .circle.correct { 
                    border-color: #28a745; 
                    box-shadow: 0 0 20px rgba(40, 167, 69, 0.5);
                }
                
                /* Matrix Rating Styles */
                .matrix-rating { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0;
                }
                
                .matrix-rating th, 
                .matrix-rating td { 
                    padding: 15px; 
                    text-align: center; 
                    border: 1px solid #dee2e6;
                }
                
                .matrix-rating th { 
                    background: #f8f9fa; 
                    font-weight: bold;
                }
                
                .matrix-rating input[type="radio"] { 
                    transform: scale(1.5); 
                    margin: 0;
                }
                
                /* Drag and Drop Styles */
                .drag-drop-container { 
                    background: #f8f9fa; 
                    padding: 30px; 
                    border-radius: 10px; 
                    margin: 20px 0;
                }
                
                .draggable-item { 
                    background: #007bff; 
                    color: white; 
                    padding: 15px 20px; 
                    margin: 10px 5px; 
                    border-radius: 8px; 
                    cursor: move; 
                    display: inline-block;
                    transition: all 0.3s;
                    user-select: none;
                }
                
                .draggable-item:hover { 
                    background: #0056b3; 
                    transform: scale(1.05);
                }
                
                .draggable-item.dragging { 
                    opacity: 0.5; 
                    transform: rotate(5deg);
                }
                
                .drop-zone { 
                    min-height: 80px; 
                    border: 3px dashed #ced4da; 
                    border-radius: 10px; 
                    padding: 20px; 
                    margin: 10px 0; 
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                }
                
                .drop-zone.drag-over { 
                    border-color: #007bff; 
                    background: #f0f8ff;
                }
                
                .drop-zone .rank-number { 
                    font-weight: bold; 
                    color: #6c757d; 
                    margin-right: 10px;
                }
                
                /* File Upload Styles */
                .file-upload-area { 
                    border: 3px dashed #ced4da; 
                    border-radius: 10px; 
                    padding: 40px; 
                    text-align: center; 
                    background: #f8f9fa; 
                    cursor: pointer;
                    transition: all 0.3s;
                    margin: 20px 0;
                }
                
                .file-upload-area:hover { 
                    border-color: #007bff; 
                    background: #f0f8ff;
                }
                
                .file-upload-area.drag-over { 
                    border-color: #28a745; 
                    background: #f8fff9;
                }
                
                /* Progress and Loading */
                .progress-container { 
                    margin: 20px 0; 
                }
                
                .progress-bar { 
                    width: 100%; 
                    height: 8px; 
                    background: #e9ecef; 
                    border-radius: 4px; 
                    overflow: hidden;
                }
                
                .progress-fill { 
                    height: 100%; 
                    background: linear-gradient(45deg, #007bff, #0056b3); 
                    width: 0%; 
                    transition: width 0.5s;
                    animation: progressShimmer 2s infinite;
                }
                
                @keyframes progressShimmer {
                    0% { background-position: -100% 0; }
                    100% { background-position: 100% 0; }
                }
                
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                /* Loading spinner */
                .loading-spinner { 
                    display: none; 
                    text-align: center; 
                    margin: 30px 0; 
                }
                
                .spinner { 
                    border: 4px solid #f3f3f3; 
                    border-top: 4px solid #007bff; 
                    border-radius: 50%; 
                    width: 50px; 
                    height: 50px; 
                    animation: spin 1s linear infinite; 
                    margin: 0 auto 20px;
                }
                
                @keyframes spin { 
                    0% { transform: rotate(0deg); } 
                    100% { transform: rotate(360deg); } 
                }
                
                /* Anti-bot hidden elements */
                .honeypot { position: absolute; left: -9999px; opacity: 0; }
                
                /* Delayed elements */
                .delayed-element { 
                    opacity: 0; 
                    transform: translateY(20px); 
                    transition: all 1s; 
                }
                
                .delayed-element.visible { 
                    opacity: 1; 
                    transform: translateY(0); 
                }
                
                /* Dynamic styling updates */
                .dynamic-style { 
                    transition: all 2s; 
                }
                
                /* Floating action buttons */
                .floating-help { 
                    position: fixed; 
                    bottom: 30px; 
                    right: 30px; 
                    background: #17a2b8; 
                    color: white; 
                    width: 60px; 
                    height: 60px; 
                    border-radius: 50%; 
                    border: none; 
                    cursor: pointer; 
                    font-size: 24px; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 1000;
                    transition: all 0.3s;
                }
                
                .floating-help:hover { 
                    transform: scale(1.1); 
                    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                }
                
                /* Responsive behavior */
                @media (max-width: 768px) { 
                    .poll-container { padding: 20px; margin: 10px; }
                    .question-card { padding: 20px; }
                    .color-circles { flex-wrap: wrap; }
                    .matrix-rating { font-size: 14px; }
                    .draggable-item { display: block; margin: 10px 0; }
                }
            </style>
        </head>
        <body>
            <!-- Anti-bot honeypots -->
            <input type="text" class="honeypot" name="survey_honey" autocomplete="off" />
            <input type="checkbox" class="honeypot" name="bot_trap" />
            
            <div class="poll-container">
                <div style="text-align: center; margin-bottom: 40px;">
                    <h1>📋 ${poll.title}</h1>
                    <p style="font-size: 16px; color: #666;">${poll.description}</p>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="overallProgress"></div>
                        </div>
                        <p style="margin: 10px 0; color: #666;">Progress: <span id="progressText">0%</span></p>
                    </div>
                </div>
                
                <form id="complexPollForm" data-poll-id="${poll.id}">
                    ${generateComplexQuestions(poll.questions)}
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <div class="loading-spinner" id="submissionSpinner">
                            <div class="spinner"></div>
                            <p>Processing your responses...</p>
                        </div>
                        
                        <button type="button" class="btn btn-warning" onclick="saveDraft()">💾 Save Draft</button>
                        <button type="button" class="btn btn-success" id="submitBtn" onclick="submitComplexPoll()" disabled>
                            🚀 Submit Survey
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Floating help button -->
            <button class="floating-help" onclick="showHelpModal()" title="Need Help?">❓</button>
            
            <!-- Help Modal -->
            <div class="modal" id="helpModal">
                <div class="modal-content">
                    <span class="modal-close" onclick="closeModal('helpModal')">&times;</span>
                    <h2>📚 Survey Help Guide</h2>
                    <div style="text-align: left;">
                        <h3>Question Types:</h3>
                        <ul>
                            <li><strong>🧮 Math CAPTCHA:</strong> Solve the simple math problem to verify you're human</li>
                            <li><strong>👁️ Visual Attention:</strong> Click on the correct colored circle as instructed</li>
                            <li><strong>📝 Modal Questions:</strong> Some questions will open help dialogs for definitions</li>
                            <li><strong>📊 Matrix Rating:</strong> Rate each aspect on the provided scale</li>
                            <li><strong>🔄 Drag & Drop:</strong> Drag items to rank them in order of importance</li>
                            <li><strong>📎 File Upload:</strong> Upload relevant documents if requested</li>
                        </ul>
                        
                        <h3>Tips for Success:</h3>
                        <ul>
                            <li>Take your time - rushed responses may be flagged</li>
                            <li>Read instructions carefully, especially for attention checks</li>
                            <li>Use natural mouse movements and interactions</li>
                            <li>Complete all required fields before submitting</li>
                        </ul>
                        
                        <h3>Technical Requirements:</h3>
                        <ul>
                            <li>JavaScript must be enabled</li>
                            <li>Cookies must be accepted</li>
                            <li>Stable internet connection required</li>
                            <li>Modern browser recommended</li>
                        </ul>
                    </div>
                    <button class="btn" onclick="closeModal('helpModal')">Got it!</button>
                </div>
            </div>
            
            ${generateComplexPollScript(poll)}
        </body>
        </html>
    `;
}

function generateComplexQuestions(questions) {
    return questions.map((question, index) => {
        let questionHTML = `
            <div class="question-card" id="question_${question.id}" data-question-id="${question.id}">
                <div class="question-text">${question.text}</div>
        `;

        switch (question.type) {
            case 'captcha-math':
                questionHTML += `
                    <div class="captcha-challenge">
                        <div class="math-problem" id="mathProblem_${question.id}">Loading...</div>
                        <input type="text" class="captcha-input" id="captcha_${question.id}" name="question_${question.id}" 
                               placeholder="Enter answer" autocomplete="off" required />
                        <div style="margin-top: 15px;">
                            <button type="button" onclick="refreshMathProblem(${question.id})">🔄 New Problem</button>
                            <span style="margin-left: 15px; color: #666;">Attempts remaining: <span id="attempts_${question.id}">3</span></span>
                        </div>
                    </div>
                `;
                break;

            case 'attention-visual':
                questionHTML += `
                    <div class="attention-challenge delayed-element" id="attention_${question.id}">
                        <p style="font-weight: bold; color: #dc3545;">Click on the RED circle (not the continue button):</p>
                        <div class="color-circles">
                            <div class="circle blue" onclick="wrongCircleClicked(${question.id}, 'blue')"></div>
                            <div class="circle red" onclick="correctCircleClicked(${question.id})"></div>
                            <div class="circle green" onclick="wrongCircleClicked(${question.id}, 'green')"></div>
                            <div class="circle yellow" onclick="wrongCircleClicked(${question.id}, 'yellow')"></div>
                        </div>
                        <button type="button" class="btn" onclick="wrongCircleClicked(${question.id}, 'button')">Continue</button>
                        <input type="hidden" name="question_${question.id}" id="visualAnswer_${question.id}" required />
                    </div>
                `;
                break;

            case 'single-choice':
                if (question.requiresModal) {
                    questionHTML += `<button type="button" class="btn btn-warning" onclick="showDefinitionModal(${question.id})">📖 Need Help? Click for Definitions</button>`;
                }
                questionHTML += '<div class="option-group">';
                question.options.forEach(option => {
                    questionHTML += `
                        <label>
                            <input type="radio" name="question_${question.id}" value="${option.value}" onchange="updateProgress()" required />
                            <span>${option.label}</span>
                        </label>
                    `;
                });
                questionHTML += '</div>';
                break;

            case 'matrix-rating':
                questionHTML += `
                    <table class="matrix-rating">
                        <thead>
                            <tr>
                                <th>Aspect</th>
                                ${question.scale.map(num => `<th>${num}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${question.aspects.map(aspect => `
                                <tr>
                                    <td style="text-align: left; font-weight: bold;">${aspect}</td>
                                    ${question.scale.map(num => `
                                        <td>
                                            <input type="radio" name="matrix_${question.id}_${aspect}" value="${num}" 
                                                   onchange="validateMatrixComplete(${question.id})" required />
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <input type="hidden" name="question_${question.id}" id="matrixResult_${question.id}" required />
                `;
                break;

            case 'drag-drop-ranking':
                questionHTML += `
                    <div class="drag-drop-container">
                        <p style="margin-bottom: 20px;"><strong>Drag items to rank them (1 = most important):</strong></p>
                        <div style="margin-bottom: 20px;">
                            <strong>Available Items:</strong>
                            <div id="dragItems_${question.id}">
                                ${question.items.map(item => `
                                    <div class="draggable-item" draggable="true" data-item="${item}" 
                                         ondragstart="dragStart(event)" ondragend="dragEnd(event)">
                                        ${item}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <strong>Your Ranking:</strong>
                            ${question.items.map((_, index) => `
                                <div class="drop-zone" ondrop="dropItem(event, ${question.id}, ${index + 1})" 
                                     ondragover="allowDrop(event)" ondragenter="dragEnter(event)" ondragleave="dragLeave(event)">
                                    <span class="rank-number">${index + 1}.</span>
                                    <span class="drop-text">Drop item here</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <input type="hidden" name="question_${question.id}" id="rankingResult_${question.id}" required />
                    </div>
                `;
                break;

            case 'file-upload':
                questionHTML += `
                    <div class="file-upload-area" onclick="document.getElementById('fileInput_${question.id}').click()" 
                         ondrop="handleFileDrop(event, ${question.id})" ondragover="allowDrop(event)" 
                         ondragenter="dragEnter(event)" ondragleave="dragLeave(event)">
                        <div>
                            <h3>📎 Upload File</h3>
                            <p>Click here or drag and drop your file</p>
                            <p style="font-size: 14px; color: #666;">
                                Accepted formats: ${question.acceptedTypes.join(', ')} | Max size: ${question.maxSize}
                            </p>
                        </div>
                        <input type="file" id="fileInput_${question.id}" name="question_${question.id}" 
                               accept="${question.acceptedTypes.join(',')}" style="display: none;" 
                               onchange="handleFileSelect(event, ${question.id})" ${question.required ? 'required' : ''} />
                    </div>
                    <div id="filePreview_${question.id}" style="margin-top: 15px;"></div>
                `;
                break;

            case 'multi-window-setup':
                questionHTML += `
                    <div style="text-align: center; padding: 30px; background: #fff3cd; border-radius: 10px;">
                        <h3>🪟 Multi-Window Verification Required</h3>
                        <p>This survey requires verification across ${question.windowCount} separate windows.</p>
                        <p>Click the button below to open verification windows:</p>
                        <button type="button" class="btn btn-warning" onclick="startMultiWindowVerification(${question.id})" 
                                id="startVerification_${question.id}">
                            🚀 Start ${question.windowCount}-Window Verification
                        </button>
                        <input type="hidden" name="question_${question.id}" id="multiWindowResult_${question.id}" required />
                        <div id="windowStatus_${question.id}" style="margin-top: 20px; display: none;">
                            <p><strong>Verification Status:</strong></p>
                            <div id="windowProgress_${question.id}"></div>
                        </div>
                    </div>
                `;
                break;

            case 'dynamic-question':
                questionHTML += `
                    <div id="dynamicContent_${question.id}">
                        <div class="option-group" id="dynamicOptions_${question.id}">
                            ${question.options.map(option => `
                                <label>
                                    <input type="radio" name="question_${question.id}" value="${option.value}" onchange="updateProgress()" required />
                                    <span>${option.label}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border-radius: 5px;">
                            <strong>⏰ Time remaining for this question: <span id="timeRemaining_${question.id}">10</span> seconds</strong>
                        </div>
                    </div>
                `;
                break;
        }

        questionHTML += '</div>';
        return questionHTML;
    }).join('');
}

function generateComplexPollScript(poll) {
    return `
        <script>
            // Global variables for complex poll management
            let currentQuestionIndex = 0;
            let totalQuestions = ${poll.questions.length};
            let completedQuestions = 0;
            let mouseMovements = 0;
            let humanBehaviorScore = 0;
            let timeOnPage = Date.now();
            let mathProblems = new Map();
            let verificationWindows = new Map();
            let draggedItem = null;
            let questionTimers = new Map();
            
            // Initialize complex poll
            document.addEventListener('DOMContentLoaded', function() {
                initializeComplexPoll();
                trackHumanBehavior();
                setupDynamicContent();
                showDelayedElements();
            });
            
            function initializeComplexPoll() {
                // Initialize math problems
                ${poll.questions.filter(q => q.type === 'captcha-math').map(q => `
                    generateMathProblem(${q.id});
                `).join('')}
                
                // Initialize dynamic questions
                ${poll.questions.filter(q => q.type === 'dynamic-question').map(q => `
                    startDynamicQuestionTimer(${q.id}, ${q.changeInterval || 10000});
                `).join('')}
                
                updateProgress();
            }
            
            function trackHumanBehavior() {
                document.addEventListener('mousemove', function(e) {
                    mouseMovements++;
                    if (mouseMovements % 10 === 0) {
                        updateHumanBehaviorScore();
                    }
                });
                
                document.addEventListener('click', function(e) {
                    updateHumanBehaviorScore();
                });
                
                document.addEventListener('keydown', function(e) {
                    updateHumanBehaviorScore();
                });
            }
            
            function updateHumanBehaviorScore() {
                const timeSpent = Date.now() - timeOnPage;
                humanBehaviorScore = Math.min(100, (mouseMovements * 0.1) + (timeSpent / 1000) * 0.01);
                
                // Enable submit button when behavior score is sufficient and all questions answered
                if (humanBehaviorScore > 50 && completedQuestions >= totalQuestions) {
                    document.getElementById('submitBtn').disabled = false;
                }
            }
            
            function updateProgress() {
                const answered = document.querySelectorAll('input:checked, input[type="hidden"][value!=""]').length;
                const progress = Math.min(100, (answered / totalQuestions) * 100);
                
                document.getElementById('overallProgress').style.width = progress + '%';
                document.getElementById('progressText').textContent = Math.round(progress) + '%';
                
                completedQuestions = answered;
                updateHumanBehaviorScore();
            }
            
            // Math CAPTCHA functions
            function generateMathProblem(questionId) {
                const operations = ['+', '-', '*'];
                const operation = operations[Math.floor(Math.random() * operations.length)];
                let num1, num2, answer;
                
                switch (operation) {
                    case '+':
                        num1 = Math.floor(Math.random() * 50) + 1;
                        num2 = Math.floor(Math.random() * 50) + 1;
                        answer = num1 + num2;
                        break;
                    case '-':
                        num1 = Math.floor(Math.random() * 50) + 20;
                        num2 = Math.floor(Math.random() * 19) + 1;
                        answer = num1 - num2;
                        break;
                    case '*':
                        num1 = Math.floor(Math.random() * 12) + 1;
                        num2 = Math.floor(Math.random() * 12) + 1;
                        answer = num1 * num2;
                        break;
                }
                
                mathProblems.set(questionId, answer);
                document.getElementById('mathProblem_' + questionId).textContent = num1 + ' ' + operation + ' ' + num2 + ' = ?';
            }
            
            function refreshMathProblem(questionId) {
                generateMathProblem(questionId);
                document.getElementById('captcha_' + questionId).value = '';
            }
            
            // Visual attention challenge functions
            function correctCircleClicked(questionId) {
                document.getElementById('visualAnswer_' + questionId).value = 'correct';
                document.querySelector('#question_' + questionId + ' .circle.red').classList.add('correct');
                setTimeout(() => {
                    document.getElementById('question_' + questionId).classList.add('active');
                    updateProgress();
                }, 500);
            }
            
            function wrongCircleClicked(questionId, type) {
                alert('❌ Incorrect! Please click on the RED circle as instructed.');
                
                // Track suspicious behavior
                fetch('/api/suspicious-behavior', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        reason: 'wrong_attention_click',
                        type: type,
                        questionId: questionId
                    })
                });
            }
            
            // Matrix rating validation
            function validateMatrixComplete(questionId) {
                const aspects = ${JSON.stringify(poll.questions.find(q => q.type === 'matrix-rating')?.aspects || [])};
                let allCompleted = true;
                let results = {};
                
                aspects.forEach(aspect => {
                    const selected = document.querySelector('input[name="matrix_' + questionId + '_' + aspect + '"]:checked');
                    if (selected) {
                        results[aspect] = selected.value;
                    } else {
                        allCompleted = false;
                    }
                });
                
                if (allCompleted) {
                    document.getElementById('matrixResult_' + questionId).value = JSON.stringify(results);
                    document.getElementById('question_' + questionId).classList.add('active');
                    updateProgress();
                }
            }
            
            // Drag and drop functions
            function dragStart(event) {
                draggedItem = event.target;
                event.target.classList.add('dragging');
            }
            
            function dragEnd(event) {
                event.target.classList.remove('dragging');
                draggedItem = null;
            }
            
            function allowDrop(event) {
                event.preventDefault();
            }
            
            function dragEnter(event) {
                event.target.classList.add('drag-over');
            }
            
            function dragLeave(event) {
                event.target.classList.remove('drag-over');
            }
            
            function dropItem(event, questionId, rank) {
                event.preventDefault();
                event.target.classList.remove('drag-over');
                
                if (draggedItem) {
                    const item = draggedItem.dataset.item;
                    event.target.innerHTML = '<span class="rank-number">' + rank + '.</span>' + item;
                    draggedItem.style.display = 'none';
                    
                    updateRankingResult(questionId);
                }
            }
            
            function updateRankingResult(questionId) {
                const dropZones = document.querySelectorAll('#question_' + questionId + ' .drop-zone');
                const ranking = [];
                
                dropZones.forEach((zone, index) => {
                    const text = zone.textContent.replace((index + 1) + '.', '').trim();
                    if (text && text !== 'Drop item here') {
                        ranking.push({ rank: index + 1, item: text });
                    }
                });
                
                if (ranking.length === dropZones.length) {
                    document.getElementById('rankingResult_' + questionId).value = JSON.stringify(ranking);
                    document.getElementById('question_' + questionId).classList.add('active');
                    updateProgress();
                }
            }
            
            // File upload functions
            function handleFileSelect(event, questionId) {
                const file = event.target.files[0];
                if (file) {
                    showFilePreview(file, questionId);
                    updateProgress();
                }
            }
            
            function handleFileDrop(event, questionId) {
                event.preventDefault();
                event.target.classList.remove('drag-over');
                
                const files = event.dataTransfer.files;
                if (files.length > 0) {
                    document.getElementById('fileInput_' + questionId).files = files;
                    showFilePreview(files[0], questionId);
                    updateProgress();
                }
            }
            
            function showFilePreview(file, questionId) {
                const preview = document.getElementById('filePreview_' + questionId);
                preview.innerHTML = '✅ File selected: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)';
                document.getElementById('question_' + questionId).classList.add('active');
            }
            
            // Multi-window verification
            function startMultiWindowVerification(questionId) {
                const windowCount = 3;
                const verificationSteps = ['email', 'phone', 'document'];
                
                document.getElementById('windowStatus_' + questionId).style.display = 'block';
                document.getElementById('startVerification_' + questionId).disabled = true;
                
                let completedSteps = 0;
                
                verificationSteps.forEach((step, index) => {
                    setTimeout(() => {
                        const windowUrl = '/verification-window/' + step + '?questionId=' + questionId;
                        const newWindow = window.open(windowUrl, 'verification_' + step, 'width=600,height=500');
                        
                        verificationWindows.set(step, newWindow);
                        updateWindowProgress(questionId, step, 'opened');
                        
                        // Simulate verification completion after random delay
                        setTimeout(() => {
                            completedSteps++;
                            updateWindowProgress(questionId, step, 'completed');
                            
                            if (completedSteps === verificationSteps.length) {
                                document.getElementById('multiWindowResult_' + questionId).value = 'verified';
                                document.getElementById('question_' + questionId).classList.add('active');
                                updateProgress();
                            }
                        }, 5000 + Math.random() * 10000);
                        
                    }, index * 2000);
                });
            }
            
            function updateWindowProgress(questionId, step, status) {
                const progressDiv = document.getElementById('windowProgress_' + questionId);
                let statusText = progressDiv.innerHTML;
                
                if (status === 'opened') {
                    statusText += '<div>🪟 ' + step + ' verification window opened</div>';
                } else if (status === 'completed') {
                    statusText += '<div>✅ ' + step + ' verification completed</div>';
                }
                
                progressDiv.innerHTML = statusText;
            }
            
            // Dynamic question timer
            function startDynamicQuestionTimer(questionId, interval) {
                const alternateQuestions = ${JSON.stringify(poll.questions.find(q => q.type === 'dynamic-question')?.alternateQuestions || [])};
                let currentIndex = 0;
                let timeRemaining = 10;
                
                const timer = setInterval(() => {
                    timeRemaining--;
                    document.getElementById('timeRemaining_' + questionId).textContent = timeRemaining;
                    
                    if (timeRemaining <= 0) {
                        // Change to next question
                        currentIndex = (currentIndex + 1) % alternateQuestions.length;
                        const newQuestion = alternateQuestions[currentIndex];
                        
                        document.querySelector('#question_' + questionId + ' .question-text').textContent = newQuestion;
                        
                        // Clear previous selection
                        document.querySelectorAll('#question_' + questionId + ' input[type="radio"]').forEach(input => {
                            input.checked = false;
                        });
                        
                        timeRemaining = 10;
                        updateProgress();
                    }
                }, 1000);
                
                questionTimers.set(questionId, timer);
            }
            
            // Modal functions
            function showDefinitionModal(questionId) {
                // Create and show definition modal
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.id = 'definitionModal_' + questionId;
                modal.innerHTML = \`
                    <div class="modal-content">
                        <span class="modal-close" onclick="closeModal('definitionModal_\${questionId}')">&times;</span>
                        <h2>📖 Purchase Frequency Definitions</h2>
                        <div style="text-align: left;">
                            <h3>📅 Daily</h3>
                            <p>Making purchases every day or almost every day (25+ times per month)</p>
                            
                            <h3>📅 Weekly</h3>
                            <p>Making purchases 1-4 times per week (4-16 times per month)</p>
                            
                            <h3>📅 Monthly</h3>
                            <p>Making purchases 1-3 times per month</p>
                            
                            <h3>📅 Rarely</h3>
                            <p>Making purchases less than once per month but more than never</p>
                            
                            <h3>📅 Never</h3>
                            <p>Never making online purchases</p>
                        </div>
                        <button class="btn" onclick="closeModal('definitionModal_\${questionId}')">Got it!</button>
                    </div>
                \`;
                
                document.body.appendChild(modal);
                modal.style.display = 'block';
            }
            
            function showHelpModal() {
                document.getElementById('helpModal').style.display = 'block';
            }
            
            function closeModal(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                    if (modalId.startsWith('definitionModal_')) {
                        modal.remove();
                    }
                }
            }
            
            // Show delayed elements
            function showDelayedElements() {
                setTimeout(() => {
                    document.querySelectorAll('.delayed-element').forEach(element => {
                        element.classList.add('visible');
                    });
                }, 2000);
            }
            
            // Save draft functionality
            function saveDraft() {
                const formData = new FormData(document.getElementById('complexPollForm'));
                const draftData = {};
                
                for (let [key, value] of formData.entries()) {
                    draftData[key] = value;
                }
                
                localStorage.setItem('pollDraft_${poll.id}', JSON.stringify(draftData));
                
                // Show temporary notification
                const notification = document.createElement('div');
                notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:15px;border-radius:5px;z-index:10000;';
                notification.textContent = '💾 Draft saved successfully!';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
            
            // Load draft on page load
            function loadDraft() {
                const saved = localStorage.getItem('pollDraft_${poll.id}');
                if (saved) {
                    const draftData = JSON.parse(saved);
                    
                    Object.entries(draftData).forEach(([name, value]) => {
                        const input = document.querySelector('[name="' + name + '"]');
                        if (input) {
                            if (input.type === 'radio' || input.type === 'checkbox') {
                                if (input.value === value) {
                                    input.checked = true;
                                }
                            } else {
                                input.value = value;
                            }
                        }
                    });
                    
                    updateProgress();
                }
            }
            
            // Complex poll submission
            function submitComplexPoll() {
                // Validate all required fields
                const requiredFields = document.querySelectorAll('input[required], select[required], textarea[required]');
                let allValid = true;
                
                requiredFields.forEach(field => {
                    if (!field.value && field.type !== 'radio' && field.type !== 'checkbox') {
                        allValid = false;
                        field.style.borderColor = '#dc3545';
                    } else if ((field.type === 'radio' || field.type === 'checkbox') && 
                               !document.querySelector('[name="' + field.name + '"]:checked')) {
                        allValid = false;
                    }
                });
                
                // Validate math CAPTCHA
                ${poll.questions.filter(q => q.type === 'captcha-math').map(q => `
                    const mathAnswer_${q.id} = document.getElementById('captcha_${q.id}').value;
                    const correctAnswer_${q.id} = mathProblems.get(${q.id});
                    if (parseInt(mathAnswer_${q.id}) !== correctAnswer_${q.id}) {
                        allValid = false;
                        alert('❌ Math CAPTCHA answer is incorrect for question ${q.id}');
                        return;
                    }
                `).join('')}
                
                if (!allValid) {
                    alert('⚠️ Please complete all required fields correctly.');
                    return;
                }
                
                if (humanBehaviorScore < 50) {
                    alert('⚠️ Please interact more naturally with the page before submitting.');
                    return;
                }
                
                // Show loading
                document.getElementById('submissionSpinner').style.display = 'block';
                document.getElementById('submitBtn').disabled = true;
                
                // Prepare submission data
                const formData = new FormData(document.getElementById('complexPollForm'));
                formData.append('humanBehaviorScore', humanBehaviorScore);
                formData.append('mouseMovements', mouseMovements);
                formData.append('timeOnPage', Date.now() - timeOnPage);
                
                // Submit to server
                fetch('/complex-poll/${poll.id}/submit', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear draft
                        localStorage.removeItem('pollDraft_${poll.id}');
                        
                        // Redirect or show success
                        window.location.href = data.redirect || '/success';
                    } else {
                        alert('❌ Submission failed: ' + data.error);
                        document.getElementById('submissionSpinner').style.display = 'none';
                        document.getElementById('submitBtn').disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Submission error:', error);
                    alert('❌ Network error during submission. Please try again.');
                    document.getElementById('submissionSpinner').style.display = 'none';
                    document.getElementById('submitBtn').disabled = false;
                });
            }
            
            // Setup dynamic content changes
            function setupDynamicContent() {
                // Randomly change page styling
                setInterval(() => {
                    const elements = document.querySelectorAll('.dynamic-style');
                    elements.forEach(element => {
                        const colors = ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da'];
                        element.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    });
                }, 30000);
                
                // Add random elements dynamically
                setTimeout(() => {
                    const randomElement = document.createElement('div');
                    randomElement.innerHTML = '🎉 Bonus question appeared!';
                    randomElement.style.cssText = 'position:fixed;top:50px;right:20px;background:#ffc107;padding:10px;border-radius:5px;z-index:1000;';
                    document.body.appendChild(randomElement);
                    
                    setTimeout(() => {
                        randomElement.remove();
                    }, 10000);
                }, 60000);
            }
            
            // Prevent context menu and other bot behaviors
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
            });
            
            // Detect rapid clicking
            let clickCount = 0;
            document.addEventListener('click', function() {
                clickCount++;
                setTimeout(() => { clickCount--; }, 1000);
                
                if (clickCount > 10) {
                    fetch('/api/bot-detected', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: 'rapid_clicking', count: clickCount })
                    });
                }
            });
            
            // Load draft on page load
            loadDraft();
        </script>
    `;
}

// Complex poll submission route
app.post('/complex-poll/:id/submit', (req, res) => {
    const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const pollId = parseInt(req.params.id);
    const poll = complexPolls.find(p => p.id === pollId);
    
    if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
    }
    
    // Validate human behavior score
    const humanScore = parseFloat(req.body.humanBehaviorScore) || 0;
    if (humanScore < 30) {
        return res.status(400).json({ 
            error: 'Insufficient human behavior score',
            required: 30,
            actual: humanScore
        });
    }
    
    // Simulate complex processing with multiple redirects
    const step = req.query.step || '1';
    
    switch (step) {
        case '1':
            // First redirect - processing
            return res.json({
                success: true,
                redirect: `/complex-poll/${pollId}/processing?step=2`,
                message: 'Initial processing...'
            });
            
        case '2':
            // Second redirect - verification
            return res.json({
                success: true,
                redirect: `/complex-poll/${pollId}/verification?step=3`,
                message: 'Advanced verification...'
            });
            
        case '3':
            // Final redirect - multi-tab completion
            return res.json({
                success: true,
                redirect: `/complex-poll/${pollId}/multi-tab-completion`,
                message: 'Opening completion windows...'
            });
            
        default:
            return res.json({
                success: true,
                redirect: '/complex-success',
                message: 'Complex poll completed!'
            });
    }
});

// Start the enhanced server
app.listen(PORT, () => {
    console.log(`\n🧪 Complex Edge Case Demo Poll Server running on http://localhost:${PORT}`);
    console.log('=' .repeat(70));
    console.log('🎯 Edge Cases Implemented:');
    console.log('  ✅ Complex modal workflows with nested modals');
    console.log('  ✅ Multiple tab/window redirects with dependencies');
    console.log('  ✅ Dynamic content loading and DOM manipulation');
    console.log('  ✅ Anti-bot measures (mouse tracking, timing checks)');
    console.log('  ✅ CAPTCHA-like math challenges');
    console.log('  ✅ Complex form validation with delayed feedback');
    console.log('  ✅ Consent banners and overlay popups');
    console.log('  ✅ Dynamic button states and disabled elements');
    console.log('  ✅ Visual attention challenges');
    console.log('  ✅ Matrix rating grids');
    console.log('  ✅ Drag-and-drop ranking systems');
    console.log('  ✅ File upload requirements');
    console.log('  ✅ Multi-window verification flows');
    console.log('  ✅ Dynamic question content changes');
    console.log('  ✅ Behavioral fingerprinting');
    console.log('  ✅ Session timeout scenarios');
    console.log('  ✅ Complex iframe interactions');
    console.log('=' .repeat(70));
    console.log('🔧 Test your automation against these challenging scenarios!');
});

module.exports = app;