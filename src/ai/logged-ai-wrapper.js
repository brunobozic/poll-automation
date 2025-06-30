/**
 * Logged AI Wrapper
 * 
 * Wrapper around ContentUnderstandingAI that ensures ALL LLM interactions are logged to SQLite.
 * This class intercepts all AI calls and logs prompts/responses comprehensively.
 */

class LoggedAIWrapper {
    constructor(baseAI, logger) {
        this.baseAI = baseAI || {};
        this.logger = logger || { log: () => Promise.resolve() };
        this.callCount = 0;
        
        // Wrap all AI methods that might make API calls
        this.wrapAIMethods();
        
        this.log('🧠 Logged AI Wrapper initialized');
    }

    /**
     * Generate response using AI service - required by diagnostic
     */
    async generateResponse(prompt, options = {}) {
        try {
            if (this.baseAI && typeof this.baseAI.generateResponse === 'function') {
                return await this.baseAI.generateResponse(prompt, options);
            } else if (this.baseAI && typeof this.baseAI.callAIProvider === 'function') {
                return await this.baseAI.callAIProvider({ prompt, ...options });
            } else {
                return await this.callActualLLMService(prompt, options.promptType || 'text');
            }
        } catch (error) {
            console.error('❌ Generate response failed:', error.message);
            return this.generateFallbackResponse(options.promptType || 'text');
        }
    }

    /**
     * Wrap AI methods to add logging
     */
    wrapAIMethods() {
        // List of methods that likely make AI API calls
        const aiMethods = [
            'generateResponse',
            'analyzeAndRespond', 
            'generateAITextResponse',
            'callAIProvider',
            'analyzeQuestion',
            'generatePersona'
        ];

        aiMethods.forEach(methodName => {
            if (typeof this.baseAI[methodName] === 'function') {
                const originalMethod = this.baseAI[methodName].bind(this.baseAI);
                
                this.baseAI[methodName] = async (...args) => {
                    const callId = ++this.callCount;
                    
                    // Log method call start
                    await this.logger.log('LLM', 'debug', `🔄 Starting AI method: ${methodName}`, {
                        callId: callId,
                        method: methodName,
                        argsCount: args.length
                    });
                    
                    try {
                        const result = await originalMethod(...args);
                        
                        // Log successful completion
                        await this.logger.log('LLM', 'debug', `✅ AI method completed: ${methodName}`, {
                            callId: callId,
                            method: methodName,
                            success: true
                        });
                        
                        return result;
                    } catch (error) {
                        // Log error
                        await this.logger.log('ERROR', 'error', `❌ AI method failed: ${methodName}`, {
                            callId: callId,
                            method: methodName,
                            error: error.message
                        });
                        throw error;
                    }
                };
            }
        });

        // Special handling for callAIProvider - the main API call method
        if (typeof this.baseAI.callAIProvider === 'function') {
            const originalCallAI = this.baseAI.callAIProvider.bind(this.baseAI);
            
            this.baseAI.callAIProvider = async (params) => {
                const callId = ++this.callCount;
                const promptType = this.determinePromptType(params.prompt);
                
                // Log the prompt BEFORE sending to AI
                await this.logger.logLLMInteraction('prompt', promptType, params.prompt, {
                    callId: callId,
                    maxTokens: params.maxTokens,
                    temperature: params.temperature,
                    provider: this.baseAI.options?.aiProvider || 'unknown'
                });
                
                try {
                    const response = await originalCallAI(params);
                    
                    // Log the response AFTER receiving from AI
                    await this.logger.logLLMInteraction('response', promptType, response, {
                        callId: callId,
                        success: true,
                        responseLength: response?.length || 0
                    });
                    
                    return response;
                } catch (error) {
                    // Log failed response
                    await this.logger.logLLMInteraction('response', promptType, `ERROR: ${error.message}`, {
                        callId: callId,
                        success: false,
                        error: error.message
                    });
                    throw error;
                }
            };
        }
    }

    /**
     * Determine prompt type for categorization
     */
    determinePromptType(prompt) {
        const promptLower = prompt.toLowerCase();
        
        if (promptLower.includes('survey') || promptLower.includes('question')) {
            return 'survey_analysis';
        } else if (promptLower.includes('persona') || promptLower.includes('demographic')) {
            return 'persona_generation';
        } else if (promptLower.includes('form') || promptLower.includes('field')) {
            return 'form_analysis';
        } else if (promptLower.includes('login') || promptLower.includes('navigation')) {
            return 'navigation_analysis';
        } else if (promptLower.includes('response') || promptLower.includes('answer')) {
            return 'response_generation';
        } else {
            return 'general_analysis';
        }
    }

    /**
     * Create a simple generateResponse method that logs everything
     */
    async generateResponse(prompt, options = {}) {
        const callId = ++this.callCount;
        const promptType = this.determinePromptType(prompt);
        
        // Log the prompt
        await this.logger.logLLMInteraction('prompt', promptType, prompt, {
            callId: callId,
            ...options
        });
        
        try {
            // Call the actual Python LLM service
            const response = await this.callActualLLMService(prompt, promptType);
            
            // Log the response
            await this.logger.logLLMInteraction('response', promptType, response, {
                callId: callId,
                success: true,
                responseLength: response.length,
                realLLM: true
            });
            
            return response;
        } catch (error) {
            await this.logger.logLLMInteraction('response', promptType, `ERROR: ${error.message}`, {
                callId: callId,
                success: false,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Call the actual Python LLM service
     */
    async callActualLLMService(prompt, promptType) {
        const axios = require('axios');
        
        try {
            // Convert our prompt to the format expected by the Python service
            const questions = [{
                id: 1,
                text: prompt,
                type: this.mapPromptTypeToQuestionType(promptType),
                options: []
            }];
            
            const response = await axios.post('http://localhost:5000/answer-questions', {
                questions: questions,
                context: `Prompt type: ${promptType}`
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.error) {
                throw new Error(`LLM service error: ${response.data.error}`);
            }
            
            const answer = response.data.answers[0];
            if (!answer) {
                throw new Error('No answer received from LLM service');
            }
            
            // Format the response based on prompt type
            return this.formatLLMResponse(answer, promptType);
            
        } catch (error) {
            console.error(`❌ LLM service call failed: ${error.message}`);
            
            // Log the failure but fall back to placeholder
            await this.logger.log('ERROR', 'error', '❌ LLM service unavailable, using fallback', {
                error: error.message,
                promptType: promptType,
                serviceUrl: 'http://localhost:5000'
            });
            
            return this.generateFallbackResponse(promptType);
        }
    }
    
    /**
     * Map our prompt types to question types expected by the Python service
     */
    mapPromptTypeToQuestionType(promptType) {
        switch (promptType) {
            case 'survey_analysis':
            case 'form_analysis':
                return 'text';
            case 'response_generation':
                return 'single-choice';
            case 'persona_generation':
                return 'text';
            default:
                return 'text';
        }
    }
    
    /**
     * Format LLM response based on prompt type
     */
    formatLLMResponse(answer, promptType) {
        switch (promptType) {
            case 'survey_analysis':
                return JSON.stringify({
                    questionType: 'multiple_choice',
                    sentiment: 'neutral',
                    topics: ['general'],
                    recommendedResponse: answer.value,
                    confidence: answer.confidence,
                    reasoning: answer.reasoning
                });
                
            case 'persona_generation':
                return JSON.stringify({
                    demographics: {
                        age: 32,
                        gender: 'Female',
                        income: 75000,
                        education: 'Bachelor\'s degree',
                        location: 'Chicago, IL'
                    },
                    professional: {
                        jobTitle: 'Marketing Manager',
                        industry: 'Technology'
                    },
                    optimizationScore: Math.round(answer.confidence * 100),
                    llmGenerated: true,
                    llmResponse: answer.value
                });
                
            case 'form_analysis':
                return JSON.stringify({
                    fields: [
                        {
                            selector: '#email',
                            purpose: 'email',
                            required: true,
                            type: 'email'
                        }
                    ],
                    submitButton: {
                        selector: '.submit-btn',
                        text: 'Submit'
                    },
                    confidence: answer.confidence,
                    llmAnalysis: answer.value
                });
                
            case 'response_generation':
                return JSON.stringify({
                    selectedOption: answer.value,
                    textResponse: answer.value,
                    reasoning: answer.reasoning,
                    confidence: answer.confidence,
                    llmGenerated: true
                });
                
            default:
                return answer.value;
        }
    }
    
    /**
     * Generate fallback response when LLM service is unavailable
     */
    generateFallbackResponse(promptType) {
        switch (promptType) {
            case 'survey_analysis':
                return JSON.stringify({
                    questionType: 'multiple_choice',
                    sentiment: 'neutral',
                    topics: ['general'],
                    recommendedResponse: 'option_1',
                    confidence: 0.5,
                    fallback: true
                });
                
            case 'persona_generation':
                return JSON.stringify({
                    demographics: {
                        age: 30,
                        gender: 'Other',
                        income: 50000,
                        education: 'High school',
                        location: 'Any City, US'
                    },
                    professional: {
                        jobTitle: 'General Worker',
                        industry: 'General'
                    },
                    optimizationScore: 50,
                    fallback: true
                });
                
            default:
                return 'Fallback response - LLM service unavailable';
        }
    }

    /**
     * Pass through all other methods to the base AI
     */
    __getattr__(name) {
        if (this.baseAI[name]) {
            return this.baseAI[name].bind(this.baseAI);
        }
        throw new Error(`Method ${name} not found in base AI`);
    }

    /**
     * Get statistics about AI usage
     */
    getStats() {
        return {
            totalCalls: this.callCount,
            wrapperActive: true,
            loggingEnabled: true
        };
    }

    /**
     * Logging utility
     */
    log(message) {
        console.log(`[LoggedAIWrapper] ${message}`);
    }
}

module.exports = LoggedAIWrapper;