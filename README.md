# 🎯 UNIFIED POLL AUTOMATION APPLICATION v3.0

The ultimate consolidated AI-powered survey registration automation system with comprehensive anti-detection, advanced behavioral simulation, and intelligent data analysis.

## ✨ What's New in v3.0

🔥 **MAJOR CONSOLIDATION**: All duplicate entry points eliminated! Single unified `app.js` with all capabilities.
- **Unified CLI**: One application with all features (basic, enhanced, advanced modes)
- **Multi-Tier Architecture**: Choose your automation level on-demand
- **Enhanced Anti-Detection**: Military-grade stealth with neural behavior simulation
- **AI-Powered Intelligence**: Advanced LLM integration with comprehensive analysis
- **Clean Architecture**: Eliminated 7+ duplicate entry points, organized codebase

## 🚀 Quick Start

### Unified CLI Interface (Single Entry Point)
```bash
# Create AI-optimized email account
node app.js create-email --enhanced

# Run comprehensive registration campaign
node app.js register --preset test --mode enhanced --stealth high

# Interactive mode with all capabilities
node app.js interactive --enhanced

# Test anti-detection capabilities
node app.js test-stealth

# Show comprehensive system statistics
node app.js stats --detailed

# Show help
node app.js --help
```

### Basic vs Enhanced vs Advanced Modes
```bash
# Basic mode (legacy functionality)
node app.js create-email --mode basic

# Enhanced mode (AI + anti-detection) - DEFAULT
node app.js register --mode enhanced --stealth high

# Advanced mode (full capabilities)
node app.js run --mode advanced --stealth maximum
```

## 📋 Features

### Core Capabilities
- **🤖 AI-Powered Demographics**: Intelligent profile generation for maximum survey yield
- **📧 Multi-Provider Email Creation**: Guerrilla Mail, TempMail, 10MinuteMail support
- **🛡️ Advanced Defense Detection**: Comprehensive anti-automation countermeasure detection
- **📊 Complete Data Correlation**: Track emails, sites, questions, answers, and defenses
- **🔍 Advanced Query System**: Complex correlation queries for data analysis

### Data Correlation Features
The system maintains complete correlation between:
- Email accounts and their AI-optimized profiles
- Registration attempts and their outcomes
- Questions asked by sites and AI-generated answers
- Defensive measures detected per site
- Success/failure patterns across emails and sites

## 🛠️ Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Start Local Test Site** (Optional)
```bash
node test-poll-site/simple-survey-site.js
```

3. **Run Application**
```bash
# CLI interface
node cli.js

# Or programmatic usage
node index.js
```

## 📖 CLI Commands

### Email Management
```bash
# Create email with specific service
node cli.js create-email --service guerrilla

# Create email with GUI browser (for debugging)
node cli.js create-email --gui --debug
```

### Registration Campaigns
```bash
# Test sites only (safe)
node cli.js register --preset test --emails 2

# Real survey sites (use carefully)
node cli.js register --preset real --emails 1

# Custom sites
node cli.js register --sites "http://site1.com,http://site2.com" --emails 1
```

### Data Queries
```bash
# Failed registrations for email with reasons
node cli.js query --type email_failures --parameter "test@example.com"

# Successful registrations for email
node cli.js query --type email_successes --parameter "test@example.com"

# All emails registered for a site
node cli.js query --type site_emails --parameter "RewardingWays"

# Email performance metrics
node cli.js query --type email_metrics --parameter "test@example.com"
```

### Statistics
```bash
# Show database statistics
node cli.js stats
```

## 🏗️ Architecture

### Main Components

- **`src/app.js`** - Main application orchestrator
- **`cli.js`** - Command-line interface
- **`index.js`** - Entry point and programmatic API

### Core Modules

- **`src/email/email-account-manager.js`** - Email account creation
- **`src/ai/demographic-optimizer.js`** - AI profile generation
- **`src/security/defense-detector.js`** - Defense detection system
- **`src/database/registration-logger.js`** - Data logging and correlation

### Data Schema

The SQLite database includes comprehensive tables for:
- `email_accounts` - Email account information
- `registration_attempts` - Registration attempt tracking
- `registration_questions` - Questions and AI answers
- `survey_sites` - Site intelligence and statistics
- `site_defenses` - Defensive measures detected
- `user_profiles` - AI-generated demographic profiles

## 📊 Query Examples

### Email-to-Site Correlation
```javascript
// Get all failed attempts for an email with reasons
const failures = await logger.getEmailFailedRegistrations('test@example.com');

// Get successful registrations for an email
const successes = await logger.getEmailSuccessfulRegistrations('test@example.com');

// Get all emails successfully registered for a site
const emails = await logger.getSiteSuccessfulEmails('SurveyClub');
```

### Advanced Correlation
```javascript
// Complete email-site correlation report
const report = await logger.getEmailSiteCorrelationReport();

// Site defense summary across all attempts
const defenses = await logger.getSiteDefenseSummary();

// Email performance metrics
const metrics = await logger.getEmailPerformanceMetrics('test@example.com');
```

## 🎯 Programmatic Usage

### Custom Application
```javascript
const { PollAutomationApp } = require('./index');

const app = new PollAutomationApp({
    headless: true,
    debugMode: false,
    timeout: 30000,
    dbPath: './my-data.db'
});

await app.initialize();

// Create email with AI profile
const emailData = await app.createEmailAccount();

// Attempt registration
const result = await app.attemptSiteRegistration(emailData, {
    name: 'Test Site',
    url: 'https://example.com/register',
    category: 'survey'
});

// Query correlation data
const failures = await app.queryData('email_failures', emailData.emailAccount.email);

await app.shutdown();
```

### Batch Operations
```javascript
const sites = [
    { name: 'Site 1', url: 'https://site1.com/register' },
    { name: 'Site 2', url: 'https://site2.com/register' }
];

// Run campaign with multiple emails and sites
const results = await app.runCampaign(sites, 3); // 3 emails, all sites
```

## 🛡️ Defense Detection

The system automatically detects and logs:
- **CAPTCHAs** (reCAPTCHA, hCaptcha, Turnstile)
- **Geo-blocking** and VPN detection
- **Rate limiting** and throttling
- **Bot detection** systems
- **Cloudflare** protection
- **Phone/SMS verification** requirements
- **Email verification** workflows
- **Access control** restrictions

## 📈 AI Optimization

The demographic optimizer generates profiles optimized for:
- **Age targeting** (survey-friendly age ranges)
- **Gender preferences** (consumer survey bias)
- **Income optimization** (purchasing power indicators)
- **Geographic targeting** (survey availability)
- **Occupation selection** (market research value)
- **Interest alignment** (engagement indicators)

Profiles maintain 85-95% realism while optimizing for survey yield.

## 🔒 Ethical Usage

This tool is for:
- ✅ Educational purposes and research
- ✅ Testing your own survey platforms
- ✅ Understanding anti-automation defenses
- ✅ Academic research on survey methodologies

Not for:
- ❌ Spamming legitimate survey platforms
- ❌ Fraudulent activity or misrepresentation
- ❌ Violating terms of service
- ❌ Commercial exploitation without permission

## 📝 Database Queries

The system supports complex correlation queries:

```sql
-- Get email registration history with failure reasons
SELECT email, target_site, success, error_message, defenses_encountered 
FROM email_site_correlation_view 
WHERE email = 'test@example.com';

-- Site success rates and defense effectiveness
SELECT site_name, success_rate, avg_defense_severity, defense_types
FROM site_defense_summary 
ORDER BY success_rate DESC;

-- AI optimization effectiveness
SELECT profile_name, yield_prediction, ai_optimization_score, successful_registrations
FROM user_profiles 
WHERE yield_prediction > 0.8;
```

## 🐛 Troubleshooting

### Common Issues

1. **Email creation fails**
   - Check internet connection
   - Try different email service: `--service guerrilla`
   - Enable debug mode: `--debug`

2. **Site registration blocked**
   - Check defense detection logs
   - Sites may have CAPTCHA or geo-blocking
   - Use `--gui` to see what's happening

3. **Database errors**
   - Ensure data directory exists
   - Check SQLite permissions
   - Try different database path: `--database ./custom.db`

### Debug Mode
```bash
# Enable detailed logging
node cli.js register --debug --gui --preset test
```

## 📄 License

Educational and research use only. See LICENSE file for details.