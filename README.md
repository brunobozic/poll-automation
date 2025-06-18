# Poll Automation System

A sophisticated automated poll-filling system that uses LLM AI to answer questions while maintaining human-like behavior and avoiding detection.

## Features

🤖 **Intelligent Question Answering**
- Uses OpenAI/Anthropic LLMs for natural responses
- Detects and handles trick questions appropriately
- Human-like uncertainty patterns and response times

🕵️ **Anti-Detection Technology**
- Stealth browser with realistic fingerprints
- Proxy rotation for IP anonymity
- Human behavior simulation (mouse movements, typing patterns, delays)
- Anti-bot question detection

🔐 **Secure Credential Management**
- Encrypted password storage
- Session management with cookie persistence
- Multi-site authentication automation

📊 **Comprehensive Logging**
- Detailed question and answer tracking
- Error logging with screenshots
- Performance statistics and success rates
- Full audit trail for troubleshooting

## Architecture

- **Node.js**: Browser automation, authentication, form filling
- **Python**: LLM integration and question answering
- **SQLite**: Data storage and session management
- **Playwright**: Modern web automation with stealth features

## Installation

1. **Clone and setup**
```bash
git clone <repository>
cd poll-automation
npm install
cd python && pip install -r requirements.txt
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your API keys and settings
```

3. **Database Setup**
```bash
npm run setup-db
```

## Configuration

### API Keys
Get at least one LLM API key:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

### Encryption Key
Generate a secure encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Usage

### 1. Start the Python LLM Service
```bash
cd python
python api_server.py
```

### 2. Add Poll Sites
```bash
node src/index.js add-site "Survey Site" "https://surveys.example.com" "https://surveys.example.com/login"
```

### 3. Add Credentials
```bash
node src/index.js add-credentials 1 "username" "password"
```

### 4. Run Automation
```bash
# Run for specific site
node src/index.js run 1

# Run for all sites
node src/index.js run
```

## Commands

| Command | Description |
|---------|-------------|
| `add-site <name> <url>` | Add new poll site |
| `add-credentials <id> <user> <pass>` | Add login credentials |
| `list-sites` | Show configured sites |
| `run [site_id]` | Run automation |
| `stats` | Show statistics |
| `logs [limit]` | Show recent logs |
| `test-llm` | Test LLM service |

## How It Works

### 1. Authentication
- Loads site configuration and encrypted credentials
- Uses stealth browser with proxy rotation
- Simulates human login behavior
- Manages session cookies and tokens

### 2. Poll Discovery
- Navigates to poll pages
- Discovers available polls using multiple strategies
- Extracts poll URLs and metadata

### 3. Question Extraction
- Comprehensive question detection from forms
- Identifies question types (multiple choice, text, rating, etc.)
- Detects trick questions and anti-bot measures

### 4. Answer Generation
- Sends questions to LLM service
- Receives natural, human-like answers
- Applies uncertainty patterns and realistic responses

### 5. Form Interaction
- Fills forms with human-like typing and clicking
- Verifies all required questions are answered
- Submits forms only when complete

### 6. Logging & Analytics
- Records all questions, answers, and interactions
- Tracks success rates and performance metrics
- Stores error details with screenshots for debugging

## Trick Question Detection

The system identifies and handles various anti-bot techniques:

- **Impossible Knowledge**: "List all mayors of Croatia in order"
- **Precision Math**: Complex calculations beyond human capability
- **Memory Tests**: Recalling previous information
- **Time-based**: Real-time data requests
- **Pattern Recognition**: Complex sequences

For trick questions, the system responds with human-like uncertainty:
- "I don't have that level of detailed knowledge"
- "I'd need to look that up"
- "That's beyond my mental math abilities"

## Database Schema

### Core Tables
- `poll_sites`: Site configurations and selectors
- `credentials`: Encrypted login credentials
- `polls`: Discovered poll information
- `sessions`: Browser session management

### Detailed Logging
- `poll_sessions`: Complete automation sessions
- `question_responses`: Individual Q&A pairs
- `poll_errors`: Error details with screenshots
- `logs`: System activity logs

## Security Features

- **Credential Encryption**: AES-256-GCM encryption for passwords
- **Proxy Support**: IP rotation to avoid blocking
- **Stealth Browser**: Anti-detection measures
- **Rate Limiting**: Human-like timing between actions
- **Session Management**: Persistent login sessions

## Performance Optimization

- **Concurrent Processing**: Parallel question answering
- **Caching**: Question and session data caching
- **Efficient Selectors**: Smart element detection
- **Resource Cleanup**: Proper browser instance management

## Troubleshooting

### Common Issues

**LLM Service Not Available**
```bash
cd python && python api_server.py
```

**Database Issues**
```bash
npm run setup-db
```

**Authentication Failures**
- Check site selectors in database
- Verify credentials are correct
- Review error logs for details

**Detection Issues**
- Enable proxy rotation
- Adjust human behavior settings
- Check anti-detection measures

### Debugging

1. **Enable Screenshots**: Set `HEADLESS_MODE=false` in .env
2. **Check Logs**: `node src/index.js logs 50`
3. **View Statistics**: `node src/index.js stats`
4. **Test LLM**: `node src/index.js test-llm`

## Development

### Project Structure
```
poll-automation/
├── src/
│   ├── agents/           # Question extraction
│   ├── behavior/         # Human simulation
│   ├── browser/          # Stealth browser
│   ├── controllers/      # Form interaction
│   ├── database/         # Data management
│   ├── detection/        # Trick question detection
│   ├── proxy/           # Proxy management
│   ├── security/        # Encryption
│   └── services/        # Core automation
├── python/              # LLM service
├── data/               # SQLite database
└── logs/               # Log files
```

### Adding New Sites

1. Study the site's structure
2. Identify login and poll selectors
3. Add site configuration
4. Test authentication
5. Verify question extraction

## Legal and Ethical Considerations

⚠️ **Important**: This tool is for educational and research purposes. Users are responsible for:

- Complying with website terms of service
- Respecting rate limits and robot.txt
- Ensuring legitimate use cases
- Following applicable laws and regulations

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Open an issue with relevant logs and configuration