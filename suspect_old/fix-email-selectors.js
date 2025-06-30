#!/usr/bin/env node

/**
 * FIX EMAIL SELECTORS
 * Update the email account manager with working selectors
 */

const fs = require('fs');

console.log('🔧 FIXING EMAIL SELECTORS');
console.log('==========================');

const emailManagerPath = './src/email/email-account-manager.js';
let content = fs.readFileSync(emailManagerPath, 'utf8');

// Fix TempMail selector and logic
const newTempMailMethod = `
    async tempmailCreateAccount(sessionId, options = {}) {
        this.log(\`📨 Creating TempMail account (\${sessionId})...\`);
        
        try {
            this.log(\`🌐 Navigating to https://temp-mail.org...\`);
            const response = await this.page.goto('https://temp-mail.org', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            this.log(\`📡 Navigation response: \${response.status()} \${response.statusText()}\`);
            
            this.log(\`⏳ Waiting for page to stabilize...\`);
            await this.page.waitForTimeout(5000);
            
            // Handle any modal popups or consent dialogs
            this.log(\`🔍 Checking for modals on TempMail...\`);
            await this.handleModalPopups();
            await this.page.waitForTimeout(2000);
            
            this.log(\`🔍 Current URL: \${this.page.url()}\`);
            this.log(\`📋 Page title: \${await this.page.title()}\`);

            // Try to find the copy button which contains the email
            let email = null;
            const emailSelectors = [
                '#copy',           // Copy button might have the email
                '.address',        // Address container
                '#mail',          // Original selector
                '.email-addr'     // Alternative
            ];
            
            this.log(\`🔍 Looking for email in copy button...\`);
            
            // Wait for any email to load and try copy button approach
            await this.page.waitForTimeout(3000);
            
            try {
                // Try clicking the copy button and reading clipboard
                const copyButton = await this.page.$('#copy');
                if (copyButton) {
                    this.log(\`✅ Found copy button, attempting to get email\`);
                    await copyButton.click();
                    await this.page.waitForTimeout(1000);
                    
                    // Try to get the email from the input field after copy action
                    const emailInput = await this.page.$('#mail');
                    if (emailInput) {
                        email = await emailInput.inputValue();
                        this.log(\`📧 Email from input after copy: \${email}\`);
                    }
                }
            } catch (e) {
                this.log(\`⚠️ Copy button approach failed: \${e.message}\`);
            }
            
            // If still no email, try alternative approach
            if (!email || email === 'Loading..' || !email.includes('@')) {
                this.log(\`🔄 Trying alternative email extraction...\`);
                
                // Wait longer for email to generate
                let attempts = 0;
                const maxAttempts = 15;
                
                while (attempts < maxAttempts && (!email || email === 'Loading..' || !email.includes('@'))) {
                    await this.page.waitForTimeout(2000);
                    
                    // Try multiple selectors
                    for (const selector of emailSelectors) {
                        try {
                            const element = await this.page.$(selector);
                            if (element) {
                                const value = await element.inputValue().catch(() => null);
                                const text = await element.textContent().catch(() => null);
                                
                                if (value && value !== 'Loading..' && value.includes('@')) {
                                    email = value;
                                    this.log(\`✅ Found email with \${selector}: \${email}\`);
                                    break;
                                } else if (text && text.includes('@')) {
                                    email = text.trim();
                                    this.log(\`✅ Found email text with \${selector}: \${email}\`);
                                    break;
                                }
                            }
                        } catch (e) {
                            // Continue with next selector
                        }
                    }
                    
                    attempts++;
                    this.log(\`📧 Email attempt \${attempts}: \${email || 'not found'}\`);
                }
            }

            if (!email || email === 'Loading..' || !email.includes('@')) {
                throw new Error(\`Could not retrieve valid email address from TempMail after extensive attempts\`);
            }

            // Check if inbox is accessible
            this.log(\`🔍 Verifying inbox access...\`);
            try {
                await this.page.waitForSelector('#inbox, .inbox, .messages', { timeout: 5000 });
                this.log(\`✅ Inbox found and accessible\`);
            } catch (e) {
                this.log(\`⚠️ Inbox not immediately accessible, but email retrieved successfully\`);
            }
            
            return {
                success: true,
                email: email,
                password: null, // TempMail doesn't use passwords
                inbox: 'https://temp-mail.org',
                sessionData: {
                    serviceUrl: 'https://temp-mail.org',
                    inboxSelector: '#inbox'
                }
            };

        } catch (error) {
            this.log(\`❌ TempMail creation failed: \${error.message}\`);
            return {
                success: false,
                error: error.message
            };
        }
    }`;

// Fix 10MinuteMail method with better selectors
const new10MinuteMethod = `
    async tenminuteCreateAccount(sessionId, options = {}) {
        this.log(\`📨 Creating 10MinuteMail account (\${sessionId})...\`);
        
        try {
            await this.page.goto('https://10minutemail.com', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            await this.page.waitForTimeout(5000);

            // Handle any modal popups or consent dialogs
            this.log(\`🔍 Checking for modals on 10MinuteMail...\`);
            await this.handleModalPopups();
            await this.page.waitForTimeout(3000);

            this.log(\`🔍 Current URL: \${this.page.url()}\`);
            this.log(\`📋 Page title: \${await this.page.title()}\`);

            // 10MinuteMail uses different selectors - try these
            const emailSelectors = [
                '.emailaddressbox input',   // Main email input
                '#fe_text',                 // Alternative input
                '.email-address',           // Email display
                'input[readonly]',          // Readonly email input
                '.copy-button',             // Copy button area
                '[data-clipboard-text]'     // Clipboard data attribute
            ];
            
            let email = null;
            
            // Wait for page to fully load
            await this.page.waitForTimeout(5000);
            
            // Try to find email with various selectors
            for (const selector of emailSelectors) {
                try {
                    this.log(\`🔍 Trying selector: \${selector}\`);
                    const element = await this.page.$(selector);
                    if (element) {
                        // Try different ways to get the email
                        const value = await element.inputValue().catch(() => null);
                        const text = await element.textContent().catch(() => null);
                        const dataClipboard = await element.getAttribute('data-clipboard-text').catch(() => null);
                        
                        this.log(\`📧 Element found - value: "\${value}" text: "\${text}" clipboard: "\${dataClipboard}"\`);
                        
                        if (value && value.includes('@')) {
                            email = value;
                            this.log(\`✅ Found email via value: \${email}\`);
                            break;
                        } else if (text && text.includes('@')) {
                            email = text.trim();
                            this.log(\`✅ Found email via text: \${email}\`);
                            break;
                        } else if (dataClipboard && dataClipboard.includes('@')) {
                            email = dataClipboard;
                            this.log(\`✅ Found email via clipboard: \${email}\`);
                            break;
                        }
                    } else {
                        this.log(\`❌ Selector not found: \${selector}\`);
                    }
                } catch (e) {
                    this.log(\`⚠️ Selector \${selector} failed: \${e.message}\`);
                    continue;
                }
            }

            // If no email found, dump page content for debugging
            if (!email) {
                this.log(\`🔍 No email found, dumping page content for analysis...\`);
                const bodyText = await this.page.$eval('body', el => el.textContent).catch(() => 'No body text');
                this.log(\`📄 Page text: \${bodyText.substring(0, 200)}...\`);
                
                const bodyHTML = await this.page.$eval('body', el => el.innerHTML).catch(() => 'No body HTML');
                this.log(\`📄 Page HTML: \${bodyHTML.substring(0, 300)}...\`);
                
                throw new Error('Could not retrieve email address from 10MinuteMail - see debug output above');
            }

            // Verify inbox is working
            this.log(\`🔍 Verifying inbox access...\`);
            try {
                const inboxSelector = '.messages, .mail-list, .inbox, #inboxTable';
                await this.page.waitForSelector(inboxSelector, { timeout: 5000 });
                this.log(\`✅ Inbox verified\`);
            } catch (e) {
                this.log(\`⚠️ Inbox verification failed: \${e.message}\`);
            }
            
            return {
                success: true,
                email: email,
                password: null,
                inbox: 'https://10minutemail.com',
                sessionData: {
                    serviceUrl: 'https://10minutemail.com',
                    inboxSelector: '.messages'
                }
            };

        } catch (error) {
            this.log(\`❌ 10MinuteMail creation failed: \${error.message}\`);
            return {
                success: false,
                error: error.message
            };
        }
    }`;

// Replace the methods in the file
content = content.replace(
    /async tempmailCreateAccount\(sessionId, options = \{\}\) \{[\s\S]*?\n    \}/,
    newTempMailMethod.trim()
);

content = content.replace(
    /async tenminuteCreateAccount\(sessionId, options = \{\}\) \{[\s\S]*?\n    \}/,
    new10MinuteMethod.trim()
);

// Write the updated file
fs.writeFileSync(emailManagerPath, content);

console.log('✅ Email selectors updated with better detection logic');
console.log('🔧 TempMail: Added copy button approach and extended waiting');
console.log('🔧 10MinuteMail: Added comprehensive selector search');
console.log('📝 Enhanced debugging output for troubleshooting');