# Poll Automation API Test Suite

A comprehensive test suite for the Poll Automation REST API server, providing thorough testing coverage across multiple dimensions including functionality, performance, security, and reliability.

## 🏗️ Test Suite Architecture

### Test Categories

1. **Unit Tests** (`unit/`)
   - Individual endpoint testing
   - Component isolation testing
   - Input validation testing
   - Response format verification

2. **Integration Tests** (`integration/`)
   - Full workflow testing
   - Cross-component interaction testing
   - Database integration testing
   - Email-to-site correlation testing

3. **Performance Tests** (`performance/`)
   - Load testing and stress testing
   - Response time benchmarking
   - Concurrent request handling
   - Memory usage and resource consumption

4. **Security Tests** (`security/`)
   - Input sanitization testing
   - SQL injection protection
   - XSS protection testing
   - Rate limiting verification
   - Authentication and authorization testing

5. **End-to-End Tests** (`e2e/`)
   - Complete automation workflow testing
   - Real-world usage scenario simulation
   - Long-running stability testing
   - Peak usage scenario testing

6. **Contract Tests** (`contract/`)
   - API specification compliance
   - Response format consistency
   - HTTP method semantics
   - Parameter validation contracts

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Poll Automation API server (will be started automatically if not running)

### Installation

```bash
# Navigate to tests directory
cd /home/brunobozic/poll-automation/tests

# Install test dependencies
npm install
```

### Running Tests

```bash
# Run all test suites
node run-tests.js

# Run specific test suite
node run-tests.js --suite unit
node run-tests.js --suite integration
node run-tests.js --suite performance

# Run with coverage
node run-tests.js --coverage

# Run with detailed reporting
node run-tests.js --report --html-report --junit-report

# Run all except performance tests (for quick testing)
node run-tests.js --exclude performance

# Verbose output
node run-tests.js --verbose
```

### Using npm scripts

```bash
# Run all tests
npm test

# Run specific categories
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:security
npm run test:e2e
npm run test:contract

# Run with coverage
npm run test:coverage

# Run in CI mode
npm run test:ci
```

## 📊 Test Coverage

The test suite provides comprehensive coverage across:

### API Endpoints Tested

- `GET /health` - Health check endpoint
- `GET /api` - API information
- `GET /api/system/status` - System status
- `GET /api/database/stats` - Database statistics
- `GET /api/llm/test` - LLM service testing
- `GET /api/test/error-detection` - Error detection cycles
- `POST /api/emails` - Email account creation
- `GET /api/emails` - Email account listing
- `GET /api/emails/unused/:siteId` - Unused email queries
- `GET /api/emails/successful` - Successful email accounts
- `GET /api/survey-sites` - Survey site listing
- `POST /api/survey-sites` - Survey site creation
- `GET /api/failures/recent` - Recent failure analysis
- `GET /api/failures/site/:siteId` - Site-specific failures
- `GET /api/failures/all` - All failure records
- `POST /api/register` - Registration workflow

### Test Scenarios

#### Functional Testing
- ✅ Successful operations with valid data
- ✅ Error handling with invalid data
- ✅ Edge cases and boundary conditions
- ✅ Data validation and sanitization
- ✅ Response format consistency

#### Performance Testing
- ✅ Response time benchmarks (< 100ms for health, < 3s for complex operations)
- ✅ Concurrent request handling (20+ simultaneous requests)
- ✅ Load testing (100+ requests under stress)
- ✅ Memory leak detection
- ✅ Resource cleanup verification

#### Security Testing
- ✅ SQL injection protection
- ✅ XSS attack prevention
- ✅ Input validation and sanitization
- ✅ Rate limiting enforcement
- ✅ Error message sanitization
- ✅ Information disclosure protection

#### Integration Testing
- ✅ Email creation to database persistence
- ✅ Survey site management workflows
- ✅ Cross-endpoint data consistency
- ✅ Failure recovery and error handling
- ✅ Concurrent operation safety

#### End-to-End Testing
- ✅ Complete poll automation lifecycle
- ✅ Multi-provider email management
- ✅ Real-world usage pattern simulation
- ✅ Peak usage scenario handling
- ✅ Long-running stability verification

## 🔧 Configuration

### Test Configuration

The test suite can be configured through environment variables:

```bash
# API server configuration
export TEST_API_URL=http://localhost:3000
export TEST_TIMEOUT=30000

# Database configuration
export TEST_DATABASE_PATH=./test-poll-automation.db

# Test behavior
export VERBOSE_TESTS=true
export SKIP_SLOW_TESTS=false
```

### Test Server Management

The test suite automatically manages the API server:

- Checks if server is already running on port 3000
- Starts a test instance on port 3001 if needed
- Cleans up test database and resources after tests
- Handles graceful shutdown and error recovery

## 📈 Performance Benchmarks

### Expected Performance Metrics

| Endpoint Category | Response Time | Concurrent Capacity | Success Rate |
|-------------------|---------------|-------------------|--------------|
| Health Check | < 100ms | 50+ requests | 99%+ |
| System Status | < 3000ms | 20+ requests | 95%+ |
| Email Creation | < 5000ms | 10+ requests | 90%+ |
| Database Operations | < 2000ms | 15+ requests | 95%+ |

### Load Testing Results

The performance tests validate:
- **Sustained Load**: 15 seconds of continuous requests
- **Burst Capacity**: 50+ concurrent requests
- **Memory Stability**: < 20MB increase during testing
- **Error Rate**: < 5% under normal load, < 10% under stress

## 🛡️ Security Testing

### Security Validation

The security test suite validates protection against:

#### Input Attacks
- SQL injection attempts (15+ different payloads)
- XSS attacks (10+ different vectors)
- Path traversal attempts
- Command injection attempts

#### Resource Attacks
- Large payload attacks (100KB+ requests)
- Rate limiting bypass attempts
- Concurrent resource exhaustion
- Memory exhaustion attempts

#### Information Disclosure
- Error message sanitization
- Stack trace prevention
- Configuration information hiding
- Database schema protection

## 📋 Test Reports

### Report Generation

The test suite generates multiple report formats:

```bash
# Generate all reports
node run-tests.js --report --html-report --junit-report
```

### Report Types

1. **JSON Report** (`reports/test-results.json`)
   - Machine-readable test results
   - Detailed timing and performance data
   - Error information and stack traces

2. **HTML Report** (`reports/test-results.html`)
   - Human-readable visual report
   - Test suite summaries and statistics
   - Interactive result browsing

3. **JUnit XML** (`reports/junit.xml`)
   - CI/CD integration format
   - Compatible with Jenkins, GitHub Actions, etc.
   - Standard test reporting format

4. **Coverage Report** (`coverage/`)
   - Code coverage analysis
   - Line-by-line coverage details
   - Coverage percentage by file

## 🐛 Debugging Tests

### Debugging Options

```bash
# Run tests with verbose output
node run-tests.js --verbose

# Run specific failing test
node run-tests.js --suite unit --verbose

# Debug with Node.js inspector
node run-tests.js --debug

# Run tests serially (easier debugging)
node run-tests.js --run-in-band
```

### Test Debugging Tools

- **Screenshots**: Automatically captured during E2E tests
- **Logs**: Comprehensive logging in `logs/` directory
- **Database Snapshots**: Test database preserved on failure
- **Request/Response Capture**: Full HTTP interaction logging

## 🔄 Continuous Integration

### CI/CD Integration

The test suite is designed for CI/CD environments:

```yaml
# GitHub Actions example
- name: Run API Tests
  run: |
    cd tests
    npm install
    npm run test:ci
  env:
    NODE_ENV: test
    TEST_API_URL: http://localhost:3000
```

### CI-Specific Features

- **Headless Operation**: No GUI dependencies
- **Deterministic Results**: Consistent across environments
- **Fast Feedback**: < 5 minutes for full suite
- **Detailed Reporting**: JUnit XML for CI integration
- **Failure Analysis**: Detailed error reporting and logs

## 🎯 Best Practices

### Test Development Guidelines

1. **Test Independence**: Each test should be independent and repeatable
2. **Clear Assertions**: Use descriptive expect statements
3. **Data Cleanup**: Clean up test data after each test
4. **Error Handling**: Test both success and failure scenarios
5. **Performance Awareness**: Include timing assertions for critical paths

### Maintenance Guidelines

1. **Regular Updates**: Keep tests updated with API changes
2. **Performance Monitoring**: Monitor test execution times
3. **Coverage Tracking**: Maintain high test coverage (80%+)
4. **Documentation**: Keep test documentation current
5. **Refactoring**: Regularly refactor tests for maintainability

## 🤝 Contributing

### Adding New Tests

1. Choose appropriate test category (unit/integration/performance/security/e2e/contract)
2. Follow existing test patterns and naming conventions
3. Include both success and failure scenarios
4. Add performance assertions where relevant
5. Update documentation for new test scenarios

### Test File Structure

```
tests/
├── unit/           # Component-level tests
├── integration/    # Cross-component tests  
├── performance/    # Load and stress tests
├── security/       # Security vulnerability tests
├── e2e/           # Complete workflow tests
├── contract/       # API contract compliance tests
├── helpers/        # Test utilities and helpers
├── fixtures/       # Test data and fixtures
├── reports/        # Generated test reports
└── coverage/       # Coverage reports
```

## 📞 Support

For issues with the test suite:

1. Check the test logs in `logs/` directory
2. Review the test reports in `reports/` directory
3. Run tests with `--verbose` for detailed output
4. Check the API server logs for server-side issues

The test suite is designed to be comprehensive, maintainable, and reliable, providing confidence in the Poll Automation API's functionality, performance, and security.