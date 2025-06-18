/**
 * Advanced Demo Site JavaScript
 * Handles modals, popups, CAPTCHA simulation, and complex interactions
 */

// Global state management
window.DemoSiteState = {
    modalsOpen: [],
    cookiesAccepted: localStorage.getItem('cookiesAccepted') === 'true',
    ageVerified: localStorage.getItem('ageVerified') === 'true',
    userPreferences: JSON.parse(localStorage.getItem('userPreferences') || '{}'),
    popupCounter: 0,
    lastActivity: Date.now()
};

// Modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        window.DemoSiteState.modalsOpen.push(modalId);
        
        // Add overlay click handler
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal(modalId);
            }
        });
        
        // Simulate analytics tracking
        trackEvent('modal_opened', { modalId: modalId });
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        const index = window.DemoSiteState.modalsOpen.indexOf(modalId);
        if (index > -1) {
            window.DemoSiteState.modalsOpen.splice(index, 1);
        }
        
        trackEvent('modal_closed', { modalId: modalId });
    }
}

function closeAllModals() {
    window.DemoSiteState.modalsOpen.forEach(modalId => {
        closeModal(modalId);
    });
}

// Login modal functionality
function showLoginModal() {
    showModal('loginModal');
    
    // Auto-fill demo credentials after a delay (simulate user behavior)
    setTimeout(() => {
        const usernameField = document.querySelector('#loginModal input[name="username"]');
        const passwordField = document.querySelector('#loginModal input[name="password"]');
        
        if (usernameField && Math.random() > 0.7) {
            // Simulate typing
            simulateTyping(usernameField, 'testuser');
            setTimeout(() => {
                simulateTyping(passwordField, 'testpass');
            }, 1000);
        }
    }, 2000);
}

function handleQuickLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    // Simulate login delay
    setTimeout(() => {
        if ((username === 'testuser' && password === 'testpass') ||
            (username === 'demo' && password === 'demo123') ||
            (username === 'bbozic' && password === 'password123')) {
            
            // Success
            showNotification('Login successful! Redirecting...', 'success');
            closeModal('loginModal');
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
            
        } else {
            // Error
            showNotification('Invalid username or password', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Shake animation
            const modal = document.getElementById('loginModal');
            modal.querySelector('.modal-content').style.animation = 'shake 0.5s';
            setTimeout(() => {
                modal.querySelector('.modal-content').style.animation = '';
            }, 500);
        }
    }, 1500 + Math.random() * 1000);
}

// Cookie handling
function handleCookies(action) {
    const banner = document.getElementById('cookieBanner');
    
    if (action === 'accept') {
        localStorage.setItem('cookiesAccepted', 'true');
        window.DemoSiteState.cookiesAccepted = true;
        showNotification('Cookies accepted. Thank you!', 'success');
        
        // Simulate cookie setting
        document.cookie = 'demo_preference=accepted; path=/; max-age=31536000';
        
    } else {
        localStorage.setItem('cookiesAccepted', 'false');
        showNotification('Cookies declined. Some features may be limited.', 'info');
    }
    
    banner.style.display = 'none';
    trackEvent('cookie_consent', { action: action });
}

// Age verification
function handleAgeVerification(isAdult) {
    const modal = document.getElementById('ageModal');
    
    if (isAdult) {
        localStorage.setItem('ageVerified', 'true');
        window.DemoSiteState.ageVerified = true;
        closeModal('ageModal');
        showNotification('Age verification completed', 'success');
    } else {
        showNotification('You must be 18 or older to use this site', 'error');
        
        // Redirect to a "not allowed" page or external site
        setTimeout(() => {
            window.location.href = 'https://www.google.com';
        }, 2000);
    }
    
    trackEvent('age_verification', { verified: isAdult });
}

// Newsletter popup
function showNewsletterPopup() {
    showModal('newsletterPopup');
}

function handleNewsletter(event) {
    event.preventDefault();
    
    const email = event.target.querySelector('input[type="email"]').value;
    const agreed = event.target.querySelector('input[type="checkbox"]').checked;
    
    if (!agreed) {
        showNotification('Please agree to receive newsletters', 'error');
        return;
    }
    
    // Simulate subscription
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Subscribing...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        showNotification(`Subscribed successfully! Welcome ${email}`, 'success');
        closeModal('newsletterPopup');
        
        // Store in preferences
        window.DemoSiteState.userPreferences.email = email;
        window.DemoSiteState.userPreferences.newsletter = true;
        localStorage.setItem('userPreferences', JSON.stringify(window.DemoSiteState.userPreferences));
        
    }, 2000);
    
    trackEvent('newsletter_signup', { email: email });
}

// Video modal
function showVideoModal() {
    showModal('videoModal');
    
    // Simulate video loading
    const videoContainer = document.querySelector('#videoModal .video-placeholder');
    videoContainer.innerHTML = `
        <div class="video-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading video...</p>
        </div>
    `;
    
    setTimeout(() => {
        videoContainer.innerHTML = `
            <div class="video-player">
                <i class="fas fa-play-circle"></i>
                <p>Video Player Simulation</p>
                <div class="video-controls">
                    <button class="btn btn-primary" onclick="simulateVideoPlay()">
                        <i class="fas fa-play"></i> Play Demo
                    </button>
                </div>
                <small>This simulates a video player for automation testing</small>
            </div>
        `;
    }, 2000);
}

function simulateVideoPlay() {
    showNotification('Video playback started (simulated)', 'info');
    trackEvent('video_play', { video: 'demo' });
}

// Feature modals
function showFeatureModal(feature) {
    const modal = document.getElementById('featureModal');
    const title = document.getElementById('featureModalTitle');
    const content = document.getElementById('featureModalContent');
    
    const featureData = {
        authentication: {
            title: 'Multi-Modal Authentication Demo',
            content: `
                <div class="feature-demo">
                    <h4>Authentication Challenges</h4>
                    <ul>
                        <li>Login modals with validation</li>
                        <li>Multi-step authentication flows</li>
                        <li>Social login simulations</li>
                        <li>Two-factor authentication</li>
                    </ul>
                    <div class="demo-actions">
                        <button class="btn btn-primary" onclick="demoSocialLogin()">Demo Social Login</button>
                        <button class="btn btn-secondary" onclick="demoTwoFactor()">Demo 2FA</button>
                    </div>
                </div>
            `
        },
        captcha: {
            title: 'CAPTCHA Challenge Demo',
            content: `
                <div class="feature-demo">
                    <h4>CAPTCHA Types</h4>
                    <div class="captcha-demo">
                        <div class="captcha-item" onclick="showMathCaptcha()">
                            <i class="fas fa-calculator"></i>
                            <span>Math CAPTCHA</span>
                        </div>
                        <div class="captcha-item" onclick="showCheckboxCaptcha()">
                            <i class="fas fa-check-square"></i>
                            <span>Checkbox Verification</span>
                        </div>
                        <div class="captcha-item" onclick="showImageCaptcha()">
                            <i class="fas fa-image"></i>
                            <span>Image Selection</span>
                        </div>
                    </div>
                </div>
            `
        },
        spa: {
            title: 'SPA Simulation Demo',
            content: `
                <div class="feature-demo">
                    <h4>Single Page Application Features</h4>
                    <ul>
                        <li>Dynamic content loading</li>
                        <li>Client-side routing</li>
                        <li>State management</li>
                        <li>Component lifecycle</li>
                    </ul>
                    <div class="spa-demo">
                        <button class="btn btn-primary" onclick="simulateSPARoute()">Simulate Route Change</button>
                        <button class="btn btn-secondary" onclick="simulateAsyncLoad()">Async Content Load</button>
                    </div>
                </div>
            `
        },
        iframe: {
            title: 'Iframe Integration Demo',
            content: `
                <div class="feature-demo">
                    <h4>Iframe Challenges</h4>
                    <iframe src="/widget/captcha-demo" width="100%" height="200" frameborder="0"></iframe>
                    <p>This iframe demonstrates cross-origin content handling and nested form interactions.</p>
                </div>
            `
        }
    };
    
    const data = featureData[feature];
    if (data) {
        title.textContent = data.title;
        content.innerHTML = data.content;
        showModal('featureModal');
    }
}

// Help modal
function showHelpModal() {
    showModal('helpModal');
}

// Demo challenges
function demoChallenge(type) {
    switch (type) {
        case 'cookies':
            // Re-show cookie banner
            document.getElementById('cookieBanner').style.display = 'block';
            showNotification('Cookie banner re-displayed for testing', 'info');
            break;
            
        case 'popup':
            // Open popup window
            const popup = window.open('/popup-demo', 'demo-popup', 
                'width=400,height=300,scrollbars=yes,resizable=yes');
            if (popup) {
                showNotification('Popup window opened', 'info');
                
                // Monitor popup
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        showNotification('Popup window was closed', 'info');
                    }
                }, 1000);
            } else {
                showNotification('Popup blocked by browser', 'error');
            }
            break;
            
        case 'modal':
            // Show random modal
            const modals = ['loginModal', 'newsletterPopup', 'helpModal'];
            const randomModal = modals[Math.floor(Math.random() * modals.length)];
            showModal(randomModal);
            break;
            
        case 'redirect':
            // Simulate redirect chain
            showNotification('Starting redirect chain simulation...', 'info');
            
            let step = 1;
            const redirectSteps = [
                '/redirect-step-1',
                '/redirect-step-2', 
                '/final-destination'
            ];
            
            function nextRedirect() {
                if (step <= redirectSteps.length) {
                    showNotification(`Redirect step ${step}/${redirectSteps.length}`, 'info');
                    step++;
                    setTimeout(nextRedirect, 1500);
                } else {
                    showNotification('Redirect chain completed', 'success');
                }
            }
            nextRedirect();
            break;
    }
    
    trackEvent('demo_challenge', { type: type });
}

// Quick poll functionality
function submitQuickPoll(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const tool = formData.get('tool');
    
    if (!tool) {
        showNotification('Please select an option', 'error');
        return;
    }
    
    // Simulate submission
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        showNotification(`Thank you for voting for ${tool}!`, 'success');
        
        // Show results
        const results = document.createElement('div');
        results.className = 'poll-results';
        results.innerHTML = `
            <h4>Current Results:</h4>
            <div class="result-item">Playwright: 45%</div>
            <div class="result-item">Selenium: 35%</div>
            <div class="result-item">Puppeteer: 20%</div>
        `;
        
        event.target.replaceWith(results);
        
    }, 1500);
    
    trackEvent('quick_poll_vote', { tool: tool });
}

// Advanced interactions
function simulateTyping(element, text, speed = 100) {
    element.focus();
    let index = 0;
    
    const typeChar = () => {
        if (index < text.length) {
            element.value += text[index];
            index++;
            
            // Dispatch input event
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(typeChar, speed + Math.random() * 50);
        }
    };
    
    typeChar();
}

function showMathCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Math CAPTCHA</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="captcha-challenge">
                    <p>Please solve: <strong>${num1} + ${num2} = ?</strong></p>
                    <input type="number" id="mathAnswer" placeholder="Enter answer">
                    <button class="btn btn-primary" onclick="checkMathAnswer(${answer}, this)">Verify</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function checkMathAnswer(correctAnswer, button) {
    const userAnswer = parseInt(document.getElementById('mathAnswer').value);
    
    if (userAnswer === correctAnswer) {
        showNotification('CAPTCHA solved correctly!', 'success');
        button.closest('.modal').remove();
    } else {
        showNotification('Incorrect answer. Please try again.', 'error');
        document.getElementById('mathAnswer').value = '';
    }
}

function showCheckboxCaptcha() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Human Verification</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="captcha-challenge">
                    <label class="checkbox-label">
                        <input type="checkbox" id="humanCheck"> 
                        I am not a robot
                    </label>
                    <button class="btn btn-primary" onclick="checkHumanVerification(this)">Verify</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function checkHumanVerification(button) {
    const isChecked = document.getElementById('humanCheck').checked;
    
    if (isChecked) {
        showNotification('Human verification completed!', 'success');
        button.closest('.modal').remove();
    } else {
        showNotification('Please check the verification box', 'error');
    }
}

function showImageCaptcha() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Image CAPTCHA</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="captcha-challenge">
                    <p>Select all images with <strong>cars</strong>:</p>
                    <div class="image-grid">
                        <div class="captcha-image" onclick="toggleImageSelection(this)">🚗</div>
                        <div class="captcha-image" onclick="toggleImageSelection(this)">🏠</div>
                        <div class="captcha-image" onclick="toggleImageSelection(this)">🚙</div>
                        <div class="captcha-image" onclick="toggleImageSelection(this)">🌳</div>
                    </div>
                    <button class="btn btn-primary" onclick="checkImageSelection(this)">Verify</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function toggleImageSelection(element) {
    element.classList.toggle('selected');
}

function checkImageSelection(button) {
    const selected = button.closest('.modal').querySelectorAll('.captcha-image.selected');
    const correctCount = Array.from(selected).filter(el => 
        el.textContent === '🚗' || el.textContent === '🚙'
    ).length;
    
    if (correctCount === 2 && selected.length === 2) {
        showNotification('Image CAPTCHA solved correctly!', 'success');
        button.closest('.modal').remove();
    } else {
        showNotification('Please select all images with cars', 'error');
    }
}

// SPA simulation functions
function simulateSPARoute() {
    showNotification('Simulating route change...', 'info');
    
    // Change URL without reload
    window.history.pushState({}, '', '/demo-route');
    
    // Simulate content change
    const content = document.querySelector('.hero-content h1');
    const originalText = content.textContent;
    
    content.textContent = 'Route Changed - SPA Demo';
    
    setTimeout(() => {
        content.textContent = originalText;
        window.history.pushState({}, '', '/');
        showNotification('Route simulation completed', 'success');
    }, 3000);
}

function simulateAsyncLoad() {
    showNotification('Loading content asynchronously...', 'info');
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'async-loading';
    loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    document.querySelector('.hero-content').appendChild(loadingDiv);
    
    setTimeout(() => {
        loadingDiv.innerHTML = '<i class="fas fa-check"></i> Content loaded!';
        
        setTimeout(() => {
            loadingDiv.remove();
        }, 2000);
    }, 2000);
}

// Social login simulation
function demoSocialLogin() {
    showNotification('Opening social login popup...', 'info');
    
    const popup = window.open('about:blank', 'social-login', 
        'width=500,height=600,scrollbars=yes');
    
    if (popup) {
        popup.document.write(`
            <html>
                <head><title>Social Login Demo</title></head>
                <body style="font-family: Arial; padding: 20px; text-align: center;">
                    <h2>Social Login Simulation</h2>
                    <p>This simulates a social login flow</p>
                    <button onclick="window.close()">Complete Login</button>
                </body>
            </html>
        `);
        
        // Monitor popup closure
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                showNotification('Social login completed (simulated)', 'success');
            }
        }, 1000);
    }
}

function demoTwoFactor() {
    const code = Math.floor(100000 + Math.random() * 900000);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Two-Factor Authentication</h3>
            </div>
            <div class="modal-body">
                <p>Enter the verification code sent to your device:</p>
                <p><strong>Demo code: ${code}</strong></p>
                <input type="text" id="twoFactorCode" placeholder="Enter 6-digit code" maxlength="6">
                <button class="btn btn-primary" onclick="verifyTwoFactor(${code}, this)">Verify</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function verifyTwoFactor(correctCode, button) {
    const userCode = document.getElementById('twoFactorCode').value;
    
    if (userCode === correctCode.toString()) {
        showNotification('Two-factor authentication successful!', 'success');
        button.closest('.modal').remove();
    } else {
        showNotification('Invalid code. Please try again.', 'error');
    }
}

// Analytics simulation
function trackEvent(eventName, properties = {}) {
    console.log('Analytics Event:', eventName, properties);
    
    // Simulate various tracking calls
    if (window.gtag) {
        window.gtag('event', eventName, properties);
    }
    
    if (window.fbq) {
        window.fbq('track', eventName, properties);
    }
    
    // Store in local analytics
    const analytics = JSON.parse(localStorage.getItem('demo_analytics') || '[]');
    analytics.push({
        event: eventName,
        properties: properties,
        timestamp: Date.now(),
        url: window.location.href
    });
    
    // Keep only last 100 events
    if (analytics.length > 100) {
        analytics.splice(0, analytics.length - 100);
    }
    
    localStorage.setItem('demo_analytics', JSON.stringify(analytics));
}

// Notification system (enhanced)
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    }[type] || 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
    
    // Track notification
    trackEvent('notification_shown', { message: message, type: type });
}

// Initialize advanced features
document.addEventListener('DOMContentLoaded', function() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // ESC to close modals
        if (e.key === 'Escape') {
            closeAllModals();
        }
        
        // Ctrl+Shift+D for debug info
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            console.log('Demo Site State:', window.DemoSiteState);
            showNotification('Debug info logged to console', 'info');
        }
    });
    
    // Random popup simulation (for testing popup blockers)
    setInterval(() => {
        if (Math.random() > 0.95 && window.DemoSiteState.popupCounter < 3) {
            // Very rare random popup
            window.DemoSiteState.popupCounter++;
            
            if (window.DemoSiteState.popupCounter === 1) {
                setTimeout(() => {
                    showNewsletterPopup();
                }, 1000);
            }
        }
    }, 30000);
    
    // Activity tracking
    ['click', 'scroll', 'keypress'].forEach(eventType => {
        document.addEventListener(eventType, () => {
            window.DemoSiteState.lastActivity = Date.now();
        });
    });
    
    // Idle detection
    setInterval(() => {
        const idleTime = Date.now() - window.DemoSiteState.lastActivity;
        if (idleTime > 300000) { // 5 minutes
            if (Math.random() > 0.7) {
                showNotification('Are you still there?', 'info');
                window.DemoSiteState.lastActivity = Date.now();
            }
        }
    }, 60000);
});

// Export for testing
window.DemoSiteAdvanced = {
    showModal,
    closeModal,
    handleCookies,
    handleAgeVerification,
    simulateTyping,
    trackEvent,
    showNotification
};