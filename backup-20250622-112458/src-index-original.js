#!/usr/bin/env node

const EnhancedPollAutomationService = require('./services/enhanced-poll-automation');
const DatabaseManager = require('./database/manager');
const { setupDatabase } = require('./database/setup');
require('dotenv').config();

class PollAutomationCLI {
  constructor() {
    this.automationService = new EnhancedPollAutomationService();
    this.db = new DatabaseManager();
  }

  async initialize() {
    try {
      console.log('🚀 Enhanced Poll Automation System v2.0.0');
      console.log('==========================================');
      console.log('🧠 AI-Powered • 🎭 Neural Behavior • 🛡️ Anti-Detection');
      console.log('🧩 Challenge Solving • 🌐 Proxy Rotation • 🎯 Multi-Tab\n');
      
      // Setup database if needed
      await setupDatabase();
      
      // Initialize services
      await this.automationService.initialize();
      await this.db.connect();
      
      console.log('✅ System initialized successfully\n');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    }
  }

  async runCommand(command, args = []) {
    try {
      switch (command) {
        case 'run':
          await this.runAutomation(args);
          break;
          
        case 'add-site':
          await this.addSite(args);
          break;
          
        case 'add-credentials':
          await this.addCredentials(args);
          break;
          
        case 'list-sites':
          await this.listSites();
          break;
          
        case 'stats':
          await this.showStats();
          break;
          
        case 'logs':
          await this.showLogs(args);
          break;
          
        case 'test-llm':
          await this.testLLMService();
          break;
          
        case 'help':
        default:
          this.showHelp();
          break;
      }
      
    } catch (error) {
      console.error(`❌ Command failed: ${error.message}`);
      process.exit(1);
    }
  }

  async runAutomation(args) {
    const siteId = args[0];
    
    if (siteId) {
      console.log(`🎯 Running automation for site ID: ${siteId}\n`);
      const result = await this.automationService.runAutomationForSite(parseInt(siteId));
      this.displayResult(result);
    } else {
      console.log('🌐 Running automation for all sites\n');
      const result = await this.automationService.runAutomationForAllSites();
      this.displayAllSitesResult(result);
    }
  }

  async addSite(args) {
    if (args.length < 2) {
      console.error('Usage: add-site <name> <base_url> [login_url]');
      return;
    }

    const siteData = {
      name: args[0],
      base_url: args[1],
      login_url: args[2] || null,
      username_selector: '#username',
      password_selector: '#password',
      submit_selector: 'button[type="submit"]',
      polls_page_url: null,
      poll_selectors: {}
    };

    const siteId = await this.db.addPollSite(siteData);
    console.log(`✅ Site added successfully with ID: ${siteId}`);
    console.log(`Next step: Add credentials with: add-credentials ${siteId} <username> <password>`);
  }

  async addCredentials(args) {
    if (args.length < 3) {
      console.error('Usage: add-credentials <site_id> <username> <password>');
      return;
    }

    const siteId = parseInt(args[0]);
    const username = args[1];
    const password = args[2];

    await this.db.saveCredentials(siteId, username, password);
    console.log(`✅ Credentials added for site ID: ${siteId}`);
  }

  async listSites() {
    const sites = await this.db.getPollSites();
    
    if (sites.length === 0) {
      console.log('No sites configured');
      return;
    }

    console.log('📋 Configured Sites:');
    console.log('===================');
    
    for (const site of sites) {
      const credentials = await this.db.getCredentials(site.id);
      const hasCredentials = !!credentials;
      
      console.log(`ID: ${site.id}`);
      console.log(`Name: ${site.name}`);
      console.log(`URL: ${site.base_url}`);
      console.log(`Credentials: ${hasCredentials ? '✅' : '❌'}`);
      console.log(`Created: ${site.created_at}`);
      console.log('---');
    }
  }

  async showStats() {
    const stats = await this.db.getStats();
    const enhancedStats = this.automationService.getEnhancedStats();
    
    console.log('📊 Enhanced System Statistics:');
    console.log('==============================');
    console.log(`Total Sites: ${stats.totalSites}`);
    console.log(`Total Polls: ${stats.totalPolls}`);
    console.log(`Completed Polls: ${stats.completedPolls}`);
    console.log(`Failed Polls: ${stats.failedPolls}`);
    console.log(`Active Sessions: ${stats.activeSessions}`);
    console.log('');
    console.log('🎭 Advanced Features:');
    console.log(`Success Rate: ${enhancedStats.successRate}%`);
    console.log(`Questions Answered: ${enhancedStats.questionsAnswered}`);
    console.log(`Challenges Solved: ${enhancedStats.challengesSolved}`);
    console.log(`CAPTCHAs Solved: ${enhancedStats.captchasSolved}`);
    console.log(`Attention Checks Passed: ${enhancedStats.attentionChecksPassed}`);
    console.log(`Trick Questions Detected: ${enhancedStats.trickQuestionsDetected}`);
    console.log(`Proxy Rotations: ${enhancedStats.proxyRotations}`);
    console.log(`Multi-Tab Sessions: ${enhancedStats.multiTabSessions}`);
    console.log('');
    console.log('🧠 AI Performance:');
    console.log(`Total AI Cost: $${enhancedStats.aiCostTotal.toFixed(4)}`);
    console.log(`AI Calls: ${enhancedStats.aiCallsTotal}`);
    console.log(`Cost per Poll: $${enhancedStats.costPerPoll}`);
    console.log(`AI Calls per Poll: ${enhancedStats.systemEfficiency.aiCallsPerPoll}`);
    console.log('');
    console.log('⚡ Performance:');
    console.log(`Average Questions per Poll: ${enhancedStats.avgQuestionsPerPoll}`);
    console.log(`Average Challenges per Poll: ${enhancedStats.avgChallengesPerPoll}`);
    console.log(`Average Session Time: ${enhancedStats.systemEfficiency.avgSessionTime}s`);
    console.log(`Detection Avoidance Rate: ${(enhancedStats.detectionAvoidanceRate * 100).toFixed(1)}%`);
    console.log(`Total Runtime: ${Math.round(enhancedStats.totalRuntime / 1000)}s`);
  }

  async showLogs(args) {
    const limit = args[0] ? parseInt(args[0]) : 20;
    const logs = await this.db.getRecentLogs(null, limit);
    
    console.log(`📋 Recent Logs (last ${limit}):`);
    console.log('===============================');
    
    for (const log of logs) {
      const status = log.success ? '✅' : '❌';
      console.log(`${status} ${log.timestamp} - ${log.action}`);
      if (log.details) {
        console.log(`   ${log.details}`);
      }
    }
  }

  async testLLMService() {
    console.log('🧪 Testing LLM Service...');
    
    const testQuestion = {
      questions: [{
        id: 1,
        text: 'Do you like automated polls?',
        type: 'yes-no',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' }
        ]
      }]
    };

    try {
      const axios = require('axios');
      const llmUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5000';
      
      const response = await axios.post(`${llmUrl}/test-question`, testQuestion, {
        timeout: 10000
      });

      console.log('✅ LLM Service is working!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ LLM Service test failed:', error.message);
      console.log('Make sure the Python service is running:');
      console.log('cd python && python api_server.py');
    }
  }

  displayResult(result) {
    console.log('\n📈 Enhanced Automation Results:');
    console.log('===============================');
    
    if (result.success) {
      console.log(`✅ Site automation completed successfully`);
      console.log(`Total polls: ${result.totalPolls}`);
      console.log(`Completed: ${result.results.filter(r => r.success).length}`);
      console.log(`Failed: ${result.results.filter(r => !r.success).length}`);
      
      if (result.enhancedStats) {
        console.log('\n🎭 Advanced Features Performance:');
        console.log(`   Challenges Solved: ${result.enhancedStats.challengesSolved}`);
        console.log(`   CAPTCHAs Solved: ${result.enhancedStats.captchasSolved}`);
        console.log(`   Attention Checks: ${result.enhancedStats.attentionChecksPassed}`);
        console.log(`   AI Cost: $${result.enhancedStats.aiCostTotal.toFixed(4)}`);
        console.log(`   Behavior Score: ${(result.enhancedStats.detectionAvoidanceRate * 100).toFixed(1)}%`);
      }
      
      if (result.results.length > 0) {
        console.log('\nPoll Details:');
        for (const pollResult of result.results) {
          const status = pollResult.success ? '✅' : '❌';
          console.log(`  ${status} Poll ${pollResult.pollId}`);
          if (pollResult.questionsAnswered) {
            console.log(`     Questions: ${pollResult.questionsAnswered}`);
          }
          if (pollResult.challengesSolved) {
            console.log(`     Challenges: ${pollResult.challengesSolved}`);
          }
          if (pollResult.behaviorScore) {
            console.log(`     Behavior: ${(pollResult.behaviorScore * 100).toFixed(1)}%`);
          }
          if (pollResult.duration) {
            console.log(`     Time: ${Math.round(pollResult.duration / 1000)}s`);
          }
          if (pollResult.error) {
            console.log(`     Error: ${pollResult.error}`);
          }
        }
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
      
    } else {
      console.log(`❌ Site automation failed: ${result.error}`);
    }
  }

  displayAllSitesResult(result) {
    console.log('\n📈 Multi-Site Automation Results:');
    console.log('=================================');
    
    console.log(`Total sites: ${result.totalSites}`);
    console.log(`Successful sites: ${result.results.filter(r => r.success).length}`);
    console.log(`Failed sites: ${result.results.filter(r => !r.success).length}`);
    
    console.log('\nSite Details:');
    for (const siteResult of result.results) {
      const status = siteResult.success ? '✅' : '❌';
      console.log(`  ${status} ${siteResult.site}`);
      if (siteResult.totalPolls) {
        console.log(`     Polls: ${siteResult.totalPolls}`);
      }
      if (siteResult.error) {
        console.log(`     Error: ${siteResult.error}`);
      }
    }
    
    if (result.overallStats) {
      console.log('\nOverall Statistics:');
      console.log(`  Total polls processed: ${result.overallStats.totalPolls}`);
      console.log(`  Questions answered: ${result.overallStats.questionsAnswered}`);
      console.log(`  Trick questions detected: ${result.overallStats.trickQuestionsDetected}`);
    }
  }

  showHelp() {
    console.log('📖 Enhanced Poll Automation System - Help');
    console.log('==========================================');
    console.log('🧠 AI-Powered • 🎭 Neural Behavior • 🛡️ Anti-Detection\n');
    
    console.log('Commands:');
    console.log('  run [site_id]           - Run enhanced automation (all sites if no ID)');
    console.log('  add-site <name> <url>   - Add new poll site');
    console.log('  add-credentials <id>    - Add login credentials for site');
    console.log('  list-sites              - List all configured sites');
    console.log('  stats                   - Show enhanced system statistics');
    console.log('  logs [limit]            - Show recent logs');
    console.log('  test-llm                - Test LLM service connection');
    console.log('  help                    - Show this help message\n');
    
    console.log('🎭 Enhanced Features:');
    console.log('  • Neural Mouse Movement - Human-like cursor patterns');
    console.log('  • Advanced Keystroke Dynamics - Realistic typing behavior');
    console.log('  • Multi-Tier AI Decision Making - GPT-4V + GPT-3.5 optimization');
    console.log('  • Comprehensive Challenge Solving - CAPTCHA, attention checks');
    console.log('  • Intelligent Proxy Rotation - Geolocation matching');
    console.log('  • Multi-Tab Coordination - Parallel poll processing');
    console.log('  • Behavioral Pattern Learning - Continuous improvement\n');
    
    console.log('Examples:');
    console.log('  node src/index.js add-site "Survey Site" "https://surveys.com"');
    console.log('  node src/index.js add-credentials 1 "myuser" "mypass"');
    console.log('  node src/index.js run 1');
    console.log('  node src/index.js run');
    console.log('');
    
    console.log('Environment Variables:');
    console.log('  OPENAI_API_KEY          - OpenAI API key for LLM');
    console.log('  ANTHROPIC_API_KEY       - Anthropic API key for LLM');
    console.log('  PYTHON_SERVICE_URL      - Python LLM service URL');
    console.log('  ENCRYPTION_KEY          - Key for credential encryption');
  }

  async cleanup() {
    try {
      await this.automationService.cleanup();
      await this.db.close();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Main execution
async function main() {
  const cli = new PollAutomationCLI();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down gracefully...');
    await cli.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n⏹️  Received SIGTERM, shutting down...');
    await cli.cleanup();
    process.exit(0);
  });

  try {
    await cli.initialize();
    
    const command = process.argv[2] || 'help';
    const args = process.argv.slice(3);
    
    await cli.runCommand(command, args);
    
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  } finally {
    await cli.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PollAutomationCLI;