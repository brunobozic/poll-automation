const AuthenticationService = require('./auth-service');
const PollDiscoveryService = require('./poll-discovery');
const QuestionExtractor = require('../agents/question-extractor');
const FormController = require('../controllers/form-controller');
const RedirectHandler = require('./redirect-handler');
const DatabaseManager = require('../database/manager');
const axios = require('axios');

class PollAutomationService {
  constructor() {
    this.authService = new AuthenticationService();
    this.pollDiscovery = new PollDiscoveryService();
    this.questionExtractor = new QuestionExtractor();
    this.formController = new FormController();
    this.redirectHandler = new RedirectHandler();
    this.db = new DatabaseManager();
    
    // Python LLM service config
    this.llmServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5000';
    
    // Statistics
    this.stats = {
      totalPolls: 0,
      completedPolls: 0,
      failedPolls: 0,
      questionsAnswered: 0,
      trickQuestionsDetected: 0,
      totalRuntime: 0
    };
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Poll Automation Service...');
      
      await this.db.connect();
      await this.authService.initialize();
      await this.pollDiscovery.initialize();
      await this.formController.initialize();
      await this.redirectHandler.initialize();
      
      // Test LLM service connection
      await this.testLLMService();
      
      console.log('✅ Poll Automation Service initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Poll Automation Service:', error);
      throw error;
    }
  }

  // Main function to run automation for a specific site
  async runAutomationForSite(siteId) {
    const sessionStart = Date.now();
    let pollSessionId = null;
    
    try {
      console.log(`\n🎯 Starting automation for site ID: ${siteId}`);
      
      // Step 1: Login to the site
      console.log('📝 Step 1: Authenticating...');
      const authSession = await this.authService.loginToSite(siteId);
      
      // Step 2: Discover available polls
      console.log('🔍 Step 2: Discovering polls...');
      const polls = await this.pollDiscovery.discoverPolls(siteId, authSession);
      
      if (polls.length === 0) {
        console.log('ℹ️  No polls found on this site');
        return { success: true, message: 'No polls available', polls: 0 };
      }

      console.log(`📊 Found ${polls.length} polls to process`);
      
      // Step 3: Process each poll
      const results = [];
      for (const poll of polls) {
        try {
          const result = await this.processPoll(poll, authSession, siteId);
          results.push(result);
          
          if (result.success) {
            this.stats.completedPolls++;
          } else {
            this.stats.failedPolls++;
          }
          
        } catch (error) {
          console.error(`❌ Failed to process poll ${poll.id}:`, error);
          results.push({
            pollId: poll.id,
            success: false,
            error: error.message
          });
          this.stats.failedPolls++;
        }
      }

      // Update total runtime
      this.stats.totalRuntime = Date.now() - sessionStart;
      this.stats.totalPolls += polls.length;

      console.log('\n📈 Automation Summary:');
      console.log(`   Total polls: ${polls.length}`);
      console.log(`   Completed: ${results.filter(r => r.success).length}`);
      console.log(`   Failed: ${results.filter(r => !r.success).length}`);
      console.log(`   Runtime: ${Math.round(this.stats.totalRuntime / 1000)}s`);

      return {
        success: true,
        siteId: siteId,
        totalPolls: polls.length,
        results: results,
        stats: this.stats
      };

    } catch (error) {
      console.error(`❌ Site automation failed for site ${siteId}:`, error);
      
      await this.db.logAction(siteId, null, 'site_automation_failed', error.message, false);
      
      return {
        success: false,
        siteId: siteId,
        error: error.message,
        stats: this.stats
      };

    } finally {
      // Cleanup
      try {
        await this.authService.logout(siteId);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  }

  // Process individual poll
  async processPoll(poll, authSession, siteId) {
    let pollSessionId = null;
    const sessionStart = Date.now();
    
    try {
      console.log(`\n📋 Processing poll: "${poll.title || poll.url}"`);
      
      // Create poll session record
      pollSessionId = await this.createPollSession(poll.id, siteId);
      
      // Handle poll start with redirects and modals
      const { page } = authSession;
      const finalPollUrl = await this.redirectHandler.handlePollStart(page, poll.url, poll.id);
      
      await this.db.logAction(siteId, poll.id, 'poll_navigation', 
        `Final poll URL: ${finalPollUrl}`, true);

      // Step 1: Extract all questions
      console.log('📝 Extracting questions...');
      const questions = await this.questionExtractor.extractAllQuestions(page);
      
      if (questions.length === 0) {
        throw new Error('No questions found on poll page');
      }

      console.log(`   Found ${questions.length} questions`);
      
      // Update session with question count
      await this.updatePollSession(pollSessionId, {
        total_questions: questions.length,
        trick_questions_detected: questions.filter(q => q.isTrick).length,
        status: 'in_progress'
      });

      // Step 2: Get answers from LLM service
      console.log('🤖 Getting answers from LLM...');
      const answers = await this.getAnswersFromLLM(questions, poll);
      
      // Step 3: Log all questions and answers
      await this.logQuestionsAndAnswers(pollSessionId, questions, answers);

      // Step 4: Fill out the form
      console.log('✏️  Filling out poll form...');
      await this.formController.fillPollForm(page, questions, answers, poll.id);
      
      // Step 5: Submit the form
      console.log('📤 Submitting poll...');
      await this.formController.submitForm(page, questions);

      // Calculate completion time
      const completionTime = Math.round((Date.now() - sessionStart) / 1000);
      
      // Mark session as completed
      await this.updatePollSession(pollSessionId, {
        status: 'completed',
        answered_questions: questions.length,
        completion_time_seconds: completionTime,
        session_end: new Date().toISOString()
      });

      console.log(`✅ Poll completed successfully in ${completionTime}s`);
      
      // Update poll status in database
      await this.db.updatePollStatus(poll.id, 'completed', answers);
      
      // Update stats
      this.stats.questionsAnswered += questions.length;
      this.stats.trickQuestionsDetected += questions.filter(q => q.isTrick).length;

      return {
        pollId: poll.id,
        success: true,
        questionsAnswered: questions.length,
        trickQuestions: questions.filter(q => q.isTrick).length,
        completionTime: completionTime
      };

    } catch (error) {
      console.error(`❌ Poll processing failed: ${error.message}`);
      
      // Log error details
      if (pollSessionId) {
        await this.logPollError(pollSessionId, error, authSession.page);
        await this.updatePollSession(pollSessionId, {
          status: 'failed',
          error_message: error.message,
          session_end: new Date().toISOString()
        });
      }

      await this.db.logAction(siteId, poll.id, 'poll_processing_failed', error.message, false);
      
      return {
        pollId: poll.id,
        success: false,
        error: error.message
      };
    }
  }

  // Get answers from Python LLM service
  async getAnswersFromLLM(questions, pollContext = {}) {
    try {
      const questionsData = questions.map((q, index) => ({
        id: index + 1,
        text: q.text,
        type: q.type,
        options: q.options || [],
        required: q.required
      }));

      const requestData = {
        questions: questionsData,
        context: `Poll: ${pollContext.title || 'Untitled Poll'}`
      };

      console.log(`   Sending ${questionsData.length} questions to LLM service...`);
      
      const response = await axios.post(`${this.llmServiceUrl}/answer-questions`, requestData, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.error) {
        throw new Error(`LLM service error: ${response.data.error}`);
      }

      const answers = response.data.answers || [];
      console.log(`   Received ${answers.length} answers from LLM`);
      
      if (response.data.stats) {
        console.log(`   LLM cost: $${response.data.stats.total_cost || 0}`);
      }

      return answers;

    } catch (error) {
      console.error('LLM service request failed:', error.message);
      
      // Fallback: generate simple random answers
      console.log('   Using fallback answer generation...');
      return this.generateFallbackAnswers(questions);
    }
  }

  // Generate fallback answers when LLM service fails
  generateFallbackAnswers(questions) {
    return questions.map((question, index) => {
      let value = "I'm not sure";
      
      if (question.type === 'yes-no') {
        value = Math.random() > 0.5 ? 'yes' : 'no';
      } else if (question.type === 'single-choice' && question.options.length > 0) {
        const randomOption = question.options[Math.floor(Math.random() * question.options.length)];
        value = randomOption.value || randomOption.label;
      } else if (question.type === 'rating') {
        value = Math.floor(Math.random() * 5) + 3; // 3-7 rating
      }

      return {
        question_id: index + 1,
        value: value,
        confidence: 0.3,
        reasoning: 'Fallback answer due to LLM service failure'
      };
    });
  }

  // Test LLM service connectivity
  async testLLMService() {
    try {
      const response = await axios.get(`${this.llmServiceUrl}/health`, { timeout: 5000 });
      console.log('✅ LLM service connection successful');
      return true;
    } catch (error) {
      console.warn('⚠️  LLM service not available, will use fallback answers');
      return false;
    }
  }

  // Create poll session record
  async createPollSession(pollId, siteId) {
    const query = `
      INSERT INTO poll_sessions (poll_id, site_id, status)
      VALUES (?, ?, 'started')
    `;

    return new Promise((resolve, reject) => {
      this.db.db.run(query, [pollId, siteId], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  // Update poll session
  async updatePollSession(sessionId, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(sessionId);

    const query = `UPDATE poll_sessions SET ${fields} WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db.db.run(query, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Log questions and answers in detail
  async logQuestionsAndAnswers(pollSessionId, questions, answers) {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = answers.find(a => a.question_id === i + 1);

      const query = `
        INSERT INTO question_responses (
          poll_session_id, question_index, question_text, question_type,
          question_options, is_required, is_trick_question, trick_detection_flags,
          answer_value, answer_confidence, answer_reasoning, human_response_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        pollSessionId,
        i + 1,
        question.text,
        question.type,
        JSON.stringify(question.options || []),
        question.required || false,
        question.isTrick || false,
        question.trickFlags ? question.trickFlags.join(', ') : null,
        answer ? answer.value : null,
        answer ? answer.confidence : null,
        answer ? answer.reasoning : null,
        question.isTrick || false
      ];

      await new Promise((resolve, reject) => {
        this.db.db.run(query, values, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  // Log poll errors with details
  async logPollError(pollSessionId, error, page) {
    try {
      const pageUrl = page ? page.url() : null;
      let screenshotPath = null;

      // Take screenshot for debugging
      if (page) {
        try {
          screenshotPath = `./screenshots/error_${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
        } catch (screenshotError) {
          console.error('Failed to take error screenshot:', screenshotError);
        }
      }

      const query = `
        INSERT INTO poll_errors (
          poll_session_id, error_type, error_message, error_stack,
          page_url, screenshot_path
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [
        pollSessionId,
        error.constructor.name,
        error.message,
        error.stack,
        pageUrl,
        screenshotPath
      ];

      await new Promise((resolve, reject) => {
        this.db.db.run(query, values, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

    } catch (logError) {
      console.error('Failed to log error details:', logError);
    }
  }

  // Run automation for all configured sites
  async runAutomationForAllSites() {
    try {
      console.log('🌐 Starting automation for all sites...');
      
      const sites = await this.db.getPollSites();
      const results = [];

      for (const site of sites) {
        try {
          console.log(`\n🎯 Processing site: ${site.name}`);
          const result = await this.runAutomationForSite(site.id);
          results.push({ site: site.name, ...result });
          
          // Delay between sites to avoid detection
          if (sites.indexOf(site) < sites.length - 1) {
            const delay = Math.random() * 30000 + 10000; // 10-40 seconds
            console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next site...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (error) {
          console.error(`❌ Site ${site.name} failed:`, error);
          results.push({
            site: site.name,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        totalSites: sites.length,
        results: results,
        overallStats: this.stats
      };

    } catch (error) {
      console.error('❌ Automation for all sites failed:', error);
      throw error;
    }
  }

  // Get automation statistics
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalPolls > 0 ? 
        Math.round((this.stats.completedPolls / this.stats.totalPolls) * 100) : 0,
      avgQuestionsPerPoll: this.stats.completedPolls > 0 ? 
        Math.round(this.stats.questionsAnswered / this.stats.completedPolls) : 0
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      totalPolls: 0,
      completedPolls: 0,
      failedPolls: 0,
      questionsAnswered: 0,
      trickQuestionsDetected: 0,
      totalRuntime: 0
    };
  }

  // Cleanup resources
  async cleanup() {
    try {
      await this.authService.cleanup();
      await this.formController.cleanup();
      await this.db.close();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

module.exports = PollAutomationService;