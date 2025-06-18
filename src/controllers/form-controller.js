const HumanSimulation = require('../behavior/human-simulation');
const DatabaseManager = require('../database/manager');

class FormController {
  constructor() {
    this.humanSim = new HumanSimulation();
    this.db = new DatabaseManager();
    this.answeredQuestions = new Set(); // Track which questions have been answered
  }

  async initialize() {
    await this.db.connect();
  }

  // Main function to fill out a poll form
  async fillPollForm(page, questions, answers, pollId) {
    try {
      console.log(`Starting form filling for poll ${pollId} with ${questions.length} questions`);
      
      // Log poll start
      await this.db.logAction(null, 'poll_start', `Starting poll ${pollId} with ${questions.length} questions`, true);
      
      // Reset tracking
      this.answeredQuestions.clear();
      
      // Process each question-answer pair
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = answers.find(a => a.question_id === question.index + 1);
        
        if (!answer) {
          console.warn(`No answer found for question ${question.index + 1}`);
          await this.db.logAction(null, 'question_no_answer', `Question ${question.index + 1}: "${question.text}"`, false);
          continue;
        }

        // Log question details
        await this.logQuestionDetails(pollId, question, answer);

        // Check if this is a trick question
        if (question.isTrick) {
          console.log(`🚨 Handling trick question: ${question.text}`);
          await this.handleTrickQuestion(page, question, answer, pollId);
        } else {
          await this.answerQuestion(page, question, answer, pollId);
        }

        // Mark as answered
        this.answeredQuestions.add(question.index);
        
        // Human-like delay between questions
        await this.humanSim.simulateActionDelay('navigate');
      }

      // Verify all required questions are answered before proceeding
      const allAnswered = await this.verifyAllQuestionsAnswered(page, questions);
      
      if (!allAnswered) {
        throw new Error('Not all required questions have been answered');
      }

      console.log('✅ All questions answered successfully');
      await this.db.logAction(null, 'poll_form_completed', `All ${questions.length} questions answered`, true);
      
      return true;

    } catch (error) {
      console.error('Form filling failed:', error);
      await this.db.logAction(null, 'poll_form_failed', error.message, false);
      throw error;
    }
  }

  // Answer individual question based on type
  async answerQuestion(page, question, answer, pollId) {
    try {
      console.log(`Answering question ${question.index + 1}: ${question.type}`);
      
      // Scroll question into view
      await this.scrollToQuestion(page, question);
      
      // Wait for human reading time
      const readingTime = this.humanSim.calculateReadingTime(question.text);
      await this.humanSim.sleep(readingTime);

      // Answer based on question type
      switch (question.type) {
        case 'single-choice':
        case 'yes-no':
          await this.answerSingleChoice(page, question, answer);
          break;
          
        case 'multiple-choice':
          await this.answerMultipleChoice(page, question, answer);
          break;
          
        case 'text':
          await this.answerTextQuestion(page, question, answer);
          break;
          
        case 'rating':
          await this.answerRatingQuestion(page, question, answer);
          break;
          
        default:
          console.warn(`Unknown question type: ${question.type}`);
          await this.answerFallback(page, question, answer);
      }

      // Log successful answer
      await this.db.logAction(null, 'question_answered', 
        `Q${question.index + 1}: "${question.text}" -> "${answer.value}"`, true);

    } catch (error) {
      console.error(`Failed to answer question ${question.index + 1}:`, error);
      await this.db.logAction(null, 'question_answer_failed', 
        `Q${question.index + 1}: ${error.message}`, false);
      throw error;
    }
  }

  // Handle trick questions with human-like responses
  async handleTrickQuestion(page, question, answer, pollId) {
    try {
      console.log(`🚨 Using human response for trick question: "${question.humanResponse}"`);
      
      // Log trick question detection
      await this.db.logAction(null, 'trick_question_detected', 
        `Q${question.index + 1}: "${question.text}" | Flags: ${question.trickFlags.join(', ')}`, true);

      // Scroll to question
      await this.scrollToQuestion(page, question);

      // Longer thinking time for complex questions
      const thinkingTime = this.humanSim.calculateThinkingTime('complex', 'complex');
      await this.humanSim.sleep(thinkingTime);

      // Use human response instead of LLM answer
      const humanAnswer = {
        question_id: answer.question_id,
        value: question.humanResponse || "I'm not sure about this",
        confidence: 0.3
      };

      await this.answerQuestion(page, question, humanAnswer, pollId);

      // Log human response usage
      await this.db.logAction(null, 'human_response_used', 
        `Q${question.index + 1}: Used human response "${humanAnswer.value}"`, true);

    } catch (error) {
      console.error('Trick question handling failed:', error);
      await this.db.logAction(null, 'trick_question_failed', error.message, false);
      throw error;
    }
  }

  // Answer single choice questions (radio buttons, select)
  async answerSingleChoice(page, question, answer) {
    try {
      // Find the option that matches our answer
      const targetOption = question.options.find(opt => 
        opt.value === answer.value || 
        opt.label.toLowerCase() === answer.value.toLowerCase()
      );

      if (!targetOption) {
        throw new Error(`Answer "${answer.value}" not found in options`);
      }

      // Look for radio buttons first
      const radioButtons = await question.element.$$('input[type="radio"]');
      
      for (const radio of radioButtons) {
        const value = await radio.getAttribute('value');
        if (value === targetOption.value) {
          await this.humanClickElement(page, radio);
          return;
        }
      }

      // Try select dropdown
      const selectElement = await question.element.$('select');
      if (selectElement) {
        await selectElement.selectOption(targetOption.value);
        await this.humanSim.simulateActionDelay('click');
        return;
      }

      throw new Error('No suitable input element found for single choice');

    } catch (error) {
      console.error('Single choice answer failed:', error);
      throw error;
    }
  }

  // Answer multiple choice questions (checkboxes)
  async answerMultipleChoice(page, question, answer) {
    try {
      const values = Array.isArray(answer.value) ? answer.value : [answer.value];
      const checkboxes = await question.element.$$('input[type="checkbox"]');
      
      for (const value of values) {
        const targetOption = question.options.find(opt => 
          opt.value === value || opt.label.toLowerCase() === value.toLowerCase()
        );

        if (!targetOption) {
          console.warn(`Option "${value}" not found, skipping`);
          continue;
        }

        for (const checkbox of checkboxes) {
          const checkboxValue = await checkbox.getAttribute('value');
          if (checkboxValue === targetOption.value) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
              await this.humanClickElement(page, checkbox);
            }
            break;
          }
        }
      }

    } catch (error) {
      console.error('Multiple choice answer failed:', error);
      throw error;
    }
  }

  // Answer text questions
  async answerTextQuestion(page, question, answer) {
    try {
      // Find text input or textarea
      const textInput = await question.element.$('input[type="text"], textarea, input:not([type])');
      
      if (!textInput) {
        throw new Error('No text input found');
      }

      // Clear existing content
      await textInput.click();
      await this.humanSim.simulateActionDelay('click');
      
      // Select all and delete
      await page.keyboard.press('Control+A');
      await this.humanSim.sleep(100);
      
      // Type the answer with human-like behavior
      await this.humanSim.simulateTyping(page, textInput, answer.value);

    } catch (error) {
      console.error('Text answer failed:', error);
      throw error;
    }
  }

  // Answer rating questions
  async answerRatingQuestion(page, question, answer) {
    try {
      // Try radio buttons first (common for rating scales)
      const radioButtons = await question.element.$$('input[type="radio"]');
      
      for (const radio of radioButtons) {
        const value = await radio.getAttribute('value');
        if (value === answer.value) {
          await this.humanClickElement(page, radio);
          return;
        }
      }

      // Try range input
      const rangeInput = await question.element.$('input[type="range"]');
      if (rangeInput) {
        await rangeInput.fill(answer.value);
        return;
      }

      // Try number input
      const numberInput = await question.element.$('input[type="number"]');
      if (numberInput) {
        await numberInput.fill(answer.value);
        return;
      }

      throw new Error('No suitable rating input found');

    } catch (error) {
      console.error('Rating answer failed:', error);
      throw error;
    }
  }

  // Fallback answer method
  async answerFallback(page, question, answer) {
    console.warn(`Using fallback method for question type: ${question.type}`);
    
    // Try to find any input and fill it
    const anyInput = await question.element.$('input, select, textarea');
    if (anyInput) {
      const tagName = await anyInput.evaluate(el => el.tagName.toLowerCase());
      const inputType = await anyInput.getAttribute('type');
      
      if (tagName === 'select') {
        await anyInput.selectOption(answer.value);
      } else if (inputType === 'radio' || inputType === 'checkbox') {
        await this.humanClickElement(page, anyInput);
      } else {
        await anyInput.fill(answer.value);
      }
    }
  }

  // Human-like element clicking
  async humanClickElement(page, element) {
    try {
      // Scroll element into view
      await element.scrollIntoViewIfNeeded();
      await this.humanSim.simulateActionDelay('scroll');
      
      // Human-like mouse movement and click
      await this.humanSim.simulateMouseMovement(page, element);
      await element.click();
      await this.humanSim.simulateActionDelay('click');
      
    } catch (error) {
      console.error('Human click failed:', error);
      // Fallback to simple click
      await element.click();
    }
  }

  // Scroll question into view
  async scrollToQuestion(page, question) {
    try {
      await question.element.scrollIntoViewIfNeeded();
      await this.humanSim.simulateActionDelay('scroll');
      
      // Small additional scroll for better visibility
      await page.mouse.wheel(0, -100);
      await this.humanSim.sleep(500);
      
    } catch (error) {
      console.error('Scroll to question failed:', error);
    }
  }

  // Verify all required questions are answered before proceeding
  async verifyAllQuestionsAnswered(page, questions) {
    try {
      console.log('Verifying all questions are answered...');
      
      let allAnswered = true;
      const unansweredQuestions = [];

      for (const question of questions) {
        if (question.required && !this.answeredQuestions.has(question.index)) {
          allAnswered = false;
          unansweredQuestions.push(question.index + 1);
          continue;
        }

        // Double-check by inspecting form elements
        const isActuallyAnswered = await this.checkIfQuestionAnswered(question);
        if (question.required && !isActuallyAnswered) {
          allAnswered = false;
          unansweredQuestions.push(question.index + 1);
          
          console.warn(`Question ${question.index + 1} marked as answered but form validation failed`);
        }
      }

      if (!allAnswered) {
        console.error(`❌ Unanswered required questions: ${unansweredQuestions.join(', ')}`);
        await this.db.logAction(null, 'questions_incomplete', 
          `Unanswered questions: ${unansweredQuestions.join(', ')}`, false);
        return false;
      }

      console.log('✅ All required questions verified as answered');
      await this.db.logAction(null, 'questions_verified', 'All required questions answered', true);
      return true;

    } catch (error) {
      console.error('Question verification failed:', error);
      return false;
    }
  }

  // Check if question is actually answered in the form
  async checkIfQuestionAnswered(question) {
    try {
      switch (question.type) {
        case 'single-choice':
        case 'yes-no':
          const radioButtons = await question.element.$$('input[type="radio"]');
          for (const radio of radioButtons) {
            if (await radio.isChecked()) return true;
          }
          
          const selectElement = await question.element.$('select');
          if (selectElement) {
            const value = await selectElement.inputValue();
            return value && value.length > 0;
          }
          return false;

        case 'multiple-choice':
          const checkboxes = await question.element.$$('input[type="checkbox"]');
          for (const checkbox of checkboxes) {
            if (await checkbox.isChecked()) return true;
          }
          return false;

        case 'text':
          const textInput = await question.element.$('input[type="text"], textarea, input:not([type])');
          if (textInput) {
            const value = await textInput.inputValue();
            return value && value.trim().length > 0;
          }
          return false;

        case 'rating':
          const ratingInputs = await question.element.$$('input[type="radio"], input[type="range"], input[type="number"]');
          for (const input of ratingInputs) {
            const inputType = await input.getAttribute('type');
            if (inputType === 'radio' && await input.isChecked()) return true;
            if ((inputType === 'range' || inputType === 'number')) {
              const value = await input.inputValue();
              if (value && value.length > 0) return true;
            }
          }
          return false;

        default:
          return true; // Assume answered for unknown types
      }

    } catch (error) {
      console.error(`Error checking if question ${question.index} is answered:`, error);
      return false;
    }
  }

  // Log detailed question information
  async logQuestionDetails(pollId, question, answer) {
    const questionLog = {
      poll_id: pollId,
      question_index: question.index + 1,
      question_text: question.text,
      question_type: question.type,
      options: JSON.stringify(question.options),
      is_required: question.required,
      is_trick: question.isTrick,
      trick_flags: question.trickFlags ? question.trickFlags.join(', ') : null,
      answer_value: answer ? answer.value : null,
      answer_confidence: answer ? answer.confidence : null,
      answer_reasoning: answer ? answer.reasoning : null
    };

    await this.db.logAction(null, 'question_details', JSON.stringify(questionLog), true);
  }

  // Get form submission elements (Next, Submit, Continue buttons)
  async findSubmissionElements(page) {
    const submissionSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Proceed")',
      'a:has-text("Next")',
      'a:has-text("Continue")',
      '.submit-btn',
      '.next-btn',
      '[class*="submit"]',
      '[class*="next"]'
    ];

    const elements = [];
    
    for (const selector of submissionSelectors) {
      try {
        const foundElements = await page.$$(selector);
        elements.push(...foundElements);
      } catch (error) {
        // Ignore selector errors
      }
    }

    return elements;
  }

  // Submit form only after all questions are verified
  async submitForm(page, questions) {
    try {
      // Final verification before submission
      const allAnswered = await this.verifyAllQuestionsAnswered(page, questions);
      
      if (!allAnswered) {
        throw new Error('Cannot submit: not all required questions are answered');
      }

      // Find submission button
      const submitElements = await this.findSubmissionElements(page);
      
      if (submitElements.length === 0) {
        throw new Error('No submit button found');
      }

      // Use the first visible submission element
      let submitButton = null;
      for (const element of submitElements) {
        if (await element.isVisible()) {
          submitButton = element;
          break;
        }
      }

      if (!submitButton) {
        throw new Error('No visible submit button found');
      }

      console.log('📤 Submitting form...');
      await this.db.logAction(null, 'form_submit_attempt', 'Attempting to submit form', true);

      // Human-like submission
      await this.humanSim.simulateActionDelay('navigate');
      await this.humanClickElement(page, submitButton);

      // Wait for submission to process
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('✅ Form submitted successfully');
      await this.db.logAction(null, 'form_submitted', 'Form submission completed', true);

      return true;

    } catch (error) {
      console.error('Form submission failed:', error);
      await this.db.logAction(null, 'form_submit_failed', error.message, false);
      throw error;
    }
  }

  // Cleanup
  async cleanup() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = FormController;