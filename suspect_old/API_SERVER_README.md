# Poll Automation REST API Server

## Overview

A comprehensive REST API server for the Poll Automation System featuring advanced survey automation, email management, LLM-powered failure analysis, and system monitoring capabilities.

## Features

### 🔐 Security & Performance
- **Helmet.js** security headers and CSP protection
- **Rate limiting** with tiered restrictions (general + strict automation limits)
- **CORS** configuration with environment-based origins
- **Input validation** with express-validator
- **Request tracking** with unique request IDs
- **Enhanced logging** with timing and performance metrics

### 📚 API Documentation
- **Swagger UI** at `/api-docs` with interactive interface
- **OpenAPI 3.0** specification with comprehensive schemas
- **Auto-generated** endpoint documentation with examples
- **JSON export** of API specification at `/api-docs.json`

### 🔍 System Monitoring
- **Health checks** with detailed system metrics
- **Database statistics** and performance monitoring  
- **LLM service testing** and connectivity verification
- **Error detection cycles** with automated system validation
- **Memory usage monitoring** and performance tracking

### 📧 Email Management
- **Bulk email creation** across multiple providers
- **Email account listing** with usage statistics
- **Unused email tracking** per survey site
- **Success rate monitoring** for email registrations
- **Provider failover** and service rotation

### 🌐 Survey Site Management
- **Site registration** and categorization
- **Performance tracking** per site with success rates
- **Difficulty assessment** and intelligence gathering
- **Bulk site operations** with validation

### ❌ Failure Analysis
- **LLM-powered analysis** of registration failures
- **Root cause identification** with confidence scoring
- **Categorized failure tracking** by type and site
- **Historical failure patterns** and trend analysis
- **Actionable recommendations** for improvement

## Quick Start

### Prerequisites
- Node.js 18+
- SQLite database (auto-created)
- Poll automation system dependencies

### Installation & Startup
```bash
# Install dependencies (if not already done)
npm install

# Start the API server
node api-server.js

# Or run in background
nohup node api-server.js > api-server.log 2>&1 &
```

### Server Information
- **Default Port:** 3000 (configurable via `PORT` env var)
- **Default Host:** localhost (configurable via `HOST` env var)
- **Documentation:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/health

## API Endpoints

### System Endpoints

#### Health Check
```bash
curl http://localhost:3000/health
```
Returns server health, uptime, memory usage, and version information.

#### System Status  
```bash
curl http://localhost:3000/api/system/status
```
Comprehensive system status including database connectivity, email services, and performance metrics.

#### Database Statistics
```bash
curl http://localhost:3000/api/database/stats
```
Detailed database metrics, table sizes, row counts, and storage information.

#### LLM Service Test
```bash
curl http://localhost:3000/api/llm/test
```
Tests LLM/AI service connectivity and returns available capabilities.

#### Error Detection Cycles
```bash
curl "http://localhost:3000/api/test/error-detection?cycles=3"
```
Runs automated error detection cycles and returns system validation results.

### Email Management

#### Create Email Accounts
```bash
curl -X POST http://localhost:3000/api/emails \
  -H "Content-Type: application/json" \
  -d '{
    "count": 5,
    "provider": "auto"
  }'
```

#### List All Email Accounts  
```bash
curl "http://localhost:3000/api/emails?limit=100"
```

#### Get Unused Emails for Site
```bash
curl http://localhost:3000/api/emails/unused/1
```

#### Get Successfully Registered Emails
```bash
curl http://localhost:3000/api/emails/successful
```

### Survey Site Management

#### List All Survey Sites
```bash
curl http://localhost:3000/api/survey-sites
```

#### Add New Survey Sites
```bash
curl -X POST http://localhost:3000/api/survey-sites \
  -H "Content-Type: application/json" \
  -d '{
    "sites": [
      {
        "name": "SurveyMonkey Pro", 
        "url": "https://surveymonkey.com/register",
        "category": "professional"
      }
    ]
  }'
```

### Failure Analysis

#### Get Recent Failures
```bash
curl "http://localhost:3000/api/failures/recent?limit=10"
```

#### Get Site-Specific Failures  
```bash
curl http://localhost:3000/api/failures/site/1
```

#### Get All Failures (with grouping)
```bash
curl "http://localhost:3000/api/failures/all?groupBy=site&limit=200"
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "requestId": "req_1750920111117_evqntuxoa"
}
```

### Error Response  
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details",
  "requestId": "req_1750920111117_evqntuxoa"
}
```

### Validation Error
```json
{
  "success": false,
  "errors": [
    {
      "field": "count",
      "message": "Count must be between 1 and 20"
    }
  ]
}
```

## Security Features

### Rate Limiting
- **General endpoints:** 100 requests/15 minutes per IP
- **Automation endpoints:** 10 requests/5 minutes per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### CORS Configuration
```javascript
// Configure allowed origins via environment
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Input Validation
- JSON format validation
- Schema validation with express-validator
- Parameter type checking and sanitization
- SQL injection protection

## Environment Configuration

```bash
# Server Configuration
PORT=3000
HOST=localhost
ALLOWED_ORIGINS=http://localhost:3000

# AI/LLM Configuration  
AI_PROVIDER=openai
AI_MODEL=gpt-4
OPENAI_API_KEY=your_api_key_here
```

## Database Integration

The API automatically initializes and manages the SQLite database with:
- **Email accounts** tracking and credentials storage
- **Registration attempts** with success/failure correlation  
- **Survey sites** performance and intelligence data
- **Failure analysis** with LLM-powered insights
- **System metrics** and performance tracking

## Error Handling

### Global Error Handler
- Catches unhandled exceptions
- Returns standardized error responses
- Logs errors with context and stack traces
- Provides appropriate HTTP status codes

### Validation Middleware
- Request parameter validation
- JSON format verification
- Type checking and sanitization
- Custom error messages

## Performance Monitoring

### Request Timing
- Automatic request duration tracking
- Performance logging with millisecond precision
- Memory usage monitoring per request

### System Health Checks
- Database connectivity verification
- Email service availability testing
- LLM service connectivity validation
- Memory usage and performance metrics

## Development & Testing

### Interactive API Documentation
Visit `http://localhost:3000/api-docs` for:
- Interactive endpoint testing
- Request/response examples
- Schema documentation
- Authentication testing

### API Testing Commands
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test system status
curl http://localhost:3000/api/system/status

# Create test emails
curl -X POST http://localhost:3000/api/emails \
  -H "Content-Type: application/json" \
  -d '{"count":3}'

# Run error detection
curl "http://localhost:3000/api/test/error-detection?cycles=2"
```

## Integration Examples

### Email Workflow
```bash
# 1. Create email accounts
EMAIL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/emails \
  -H "Content-Type: application/json" \
  -d '{"count":5,"provider":"auto"}')

# 2. Check success
echo $EMAIL_RESPONSE | jq '.message'

# 3. List created emails  
curl -s http://localhost:3000/api/emails | jq '.emails[].email'
```

### System Monitoring
```bash
# Monitor system health
watch -n 5 'curl -s http://localhost:3000/api/system/status | jq ".status.system.memory.used"'

# Check database growth
curl -s http://localhost:3000/api/database/stats | jq '.stats.storage.totalSize'
```

## Production Deployment

### Process Management
```bash
# Using PM2
pm2 start api-server.js --name "poll-automation-api"

# Using systemd
sudo systemctl start poll-automation-api
```

### Environment Variables
```bash
# Production configuration
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
ALLOWED_ORIGINS=https://yourdomain.com
```

### Logging
- Request/response logging with timing
- Error logging with stack traces  
- Performance metrics collection
- Database operation logging

## Architecture

### Class-Based Design
```javascript
class PollAutomationAPIServer {
  - setupSwagger()       // OpenAPI documentation
  - setupMiddleware()    // Security & validation  
  - setupRoutes()        // Endpoint routing
  - setupSystemRoutes()  // System monitoring
  - setupEmailRoutes()   // Email management
  - setupFailureRoutes() // Failure analysis
}
```

### Component Integration
- **Database Manager:** SQLite operations and migrations
- **Email Manager:** Multi-provider email service integration
- **Registration Logger:** Comprehensive activity tracking
- **Failure Analyzer:** LLM-powered error analysis
- **Content AI:** Form understanding and automation

## Support & Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database file permissions
ls -la poll-automation.db

# Verify database integrity
curl http://localhost:3000/api/database/stats
```

#### LLM Service Issues  
```bash
# Test LLM connectivity
curl http://localhost:3000/api/llm/test

# Check environment variables
echo $OPENAI_API_KEY
```

#### Memory Issues
```bash
# Monitor memory usage
curl http://localhost:3000/api/test/error-detection?cycles=1
```

### Debug Mode
```bash
# Enable detailed logging
DEBUG=* node api-server.js
```

---

**Server Version:** 1.0.0  
**Last Updated:** 2025-06-26  
**Documentation:** http://localhost:3000/api-docs