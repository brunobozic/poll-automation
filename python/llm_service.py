import os
import json
import re
import asyncio
import random
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

# LLM Client imports
import openai
from anthropic import Anthropic
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Question:
    id: int
    text: str
    type: str  # 'single-choice', 'multiple-choice', 'yes-no', 'text', 'rating'
    options: List[Dict[str, str]]
    required: bool = True

@dataclass
class Answer:
    question_id: int
    value: Union[str, List[str]]
    confidence: float
    reasoning: Optional[str] = None

class LLMService:
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        self.setup_clients()
        
        # Cost tracking
        self.total_cost = 0.0
        self.request_count = 0
        
        # Response patterns for human-like answers
        self.human_patterns = {
            'uncertainty': [
                "I'm not entirely sure, but I think",
                "If I had to guess, I'd say",
                "From what I remember",
                "I believe",
                "As far as I know"
            ],
            'confidence': [
                "I'm pretty confident that",
                "I'm fairly certain",
                "I think it's safe to say",
                "I'm quite sure"
            ],
            'hedging': [
                "probably", "likely", "I suppose", "perhaps", 
                "it seems to me", "in my opinion", "I'd say"
            ]
        }

    def setup_clients(self):
        """Initialize LLM clients based on available API keys"""
        if os.getenv('OPENAI_API_KEY'):
            self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            logger.info("OpenAI client initialized")
        
        if os.getenv('ANTHROPIC_API_KEY'):
            self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            logger.info("Anthropic client initialized")
        
        if not self.openai_client and not self.anthropic_client:
            logger.warning("No LLM clients available - set OPENAI_API_KEY or ANTHROPIC_API_KEY")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_answer(self, question: Question, context: Optional[str] = None) -> Answer:
        """Generate an answer for a given question"""
        try:
            # Choose the cheapest available model
            if self.openai_client:
                response = await self._generate_openai_answer(question, context)
            elif self.anthropic_client:
                response = await self._generate_anthropic_answer(question, context)
            else:
                raise Exception("No LLM clients available")
            
            self.request_count += 1
            return response
            
        except Exception as e:
            logger.error(f"Failed to generate answer: {e}")
            # Fallback to random answer
            return self._generate_fallback_answer(question)

    async def _generate_openai_answer(self, question: Question, context: Optional[str] = None) -> Answer:
        """Generate answer using OpenAI (cheapest model)"""
        try:
            prompt = self._build_prompt(question, context)
            
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",  # Cheapest option
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150,
                timeout=30
            )
            
            # Track cost (approximate)
            self.total_cost += 0.002  # Rough estimate for gpt-3.5-turbo
            
            content = response.choices[0].message.content
            return self._parse_llm_response(question, content)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def _generate_anthropic_answer(self, question: Question, context: Optional[str] = None) -> Answer:
        """Generate answer using Anthropic Claude"""
        try:
            prompt = self._build_prompt(question, context)
            
            response = self.anthropic_client.messages.create(
                model="claude-3-haiku-20240307",  # Cheapest Claude model
                max_tokens=150,
                temperature=0.7,
                messages=[
                    {"role": "user", "content": f"{self._get_system_prompt()}\n\n{prompt}"}
                ],
                timeout=30
            )
            
            # Track cost (approximate)
            self.total_cost += 0.001  # Rough estimate for Claude Haiku
            
            content = response.content[0].text
            return self._parse_llm_response(question, content)
            
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise

    def _get_system_prompt(self) -> str:
        """Get system prompt for LLM"""
        return """You are answering poll/survey questions as a typical human would. 

IMPORTANT RULES:
1. Give realistic, human-like answers - avoid showing superhuman knowledge
2. For impossible questions (like listing all mayors of a country), respond with uncertainty
3. Add natural human speech patterns like "I think", "probably", "not sure"
4. Keep answers concise and natural
5. For multiple choice, pick the most reasonable option
6. For rating questions, avoid extreme scores unless warranted
7. Show some uncertainty - humans don't know everything

Return your answer in this exact JSON format:
{
    "answer": "your answer here",
    "confidence": 0.8,
    "reasoning": "brief explanation"
}"""

    def _build_prompt(self, question: Question, context: Optional[str] = None) -> str:
        """Build prompt for the LLM"""
        prompt = f"Question: {question.text}\n"
        prompt += f"Type: {question.type}\n"
        
        if question.options:
            prompt += "Options:\n"
            for i, option in enumerate(question.options, 1):
                prompt += f"{i}. {option.get('label', option.get('value', ''))}\n"
        
        if context:
            prompt += f"\nContext: {context}\n"
        
        prompt += "\nPlease provide a human-like answer."
        
        return prompt

    def _parse_llm_response(self, question: Question, response: str) -> Answer:
        """Parse LLM response into Answer object"""
        try:
            # Try to parse as JSON first
            if '{' in response and '}' in response:
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    return Answer(
                        question_id=question.id,
                        value=data.get('answer', ''),
                        confidence=float(data.get('confidence', 0.7)),
                        reasoning=data.get('reasoning', '')
                    )
            
            # Fallback: extract answer directly
            answer_value = self._extract_answer_from_text(question, response)
            
            return Answer(
                question_id=question.id,
                value=answer_value,
                confidence=0.7,
                reasoning="Parsed from text response"
            )
            
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return self._generate_fallback_answer(question)

    def _extract_answer_from_text(self, question: Question, text: str) -> str:
        """Extract answer from free-form text"""
        text = text.strip()
        
        if question.type == 'yes-no':
            if any(word in text.lower() for word in ['yes', 'true', 'agree', 'correct']):
                return 'yes'
            elif any(word in text.lower() for word in ['no', 'false', 'disagree', 'incorrect']):
                return 'no'
            else:
                return random.choice(['yes', 'no'])
        
        elif question.type in ['single-choice', 'multiple-choice'] and question.options:
            # Look for option matches in the response
            for option in question.options:
                option_text = option.get('label', option.get('value', '')).lower()
                if option_text in text.lower():
                    return option.get('value', option.get('label', ''))
            
            # Fallback: return random option
            return random.choice(question.options).get('value', question.options[0].get('label', ''))
        
        elif question.type == 'rating':
            # Extract numbers from response
            numbers = re.findall(r'\b([1-9]|10)\b', text)
            if numbers:
                return numbers[0]
            else:
                return str(random.randint(3, 7))  # Moderate rating
        
        else:
            # For text questions, return the response or a human-like fallback
            if len(text) > 200:
                return text[:200] + "..."
            return text or "I'm not sure about this one."

    def _generate_fallback_answer(self, question: Question) -> Answer:
        """Generate a fallback answer when LLM fails"""
        if question.type == 'yes-no':
            value = random.choice(['yes', 'no'])
        elif question.type in ['single-choice', 'multiple-choice'] and question.options:
            value = random.choice(question.options).get('value', question.options[0].get('label', ''))
        elif question.type == 'rating':
            value = str(random.randint(3, 7))  # Moderate rating
        else:
            value = random.choice([
                "I'm not sure about this",
                "I don't have a strong opinion",
                "I'd need to think about this more",
                "Not really sure"
            ])
        
        return Answer(
            question_id=question.id,
            value=value,
            confidence=0.3,
            reasoning="Fallback answer due to API failure"
        )

    def make_answer_human_like(self, answer: Answer, question: Question) -> Answer:
        """Add human-like patterns to answers"""
        if isinstance(answer.value, str) and question.type == 'text':
            # Add uncertainty patterns for text answers
            if random.random() < 0.3:  # 30% chance to add uncertainty
                pattern = random.choice(self.human_patterns['uncertainty'])
                answer.value = f"{pattern} {answer.value.lower()}"
            
            # Add hedging words
            if random.random() < 0.2:  # 20% chance
                hedge = random.choice(self.human_patterns['hedging'])
                answer.value = f"{answer.value}, {hedge}"
        
        # Reduce confidence slightly to be more human-like
        answer.confidence = max(0.2, answer.confidence - random.uniform(0.1, 0.3))
        
        return answer

    async def process_poll_questions(self, questions: List[Question], context: Optional[str] = None) -> List[Answer]:
        """Process multiple questions efficiently"""
        answers = []
        
        # Process questions in small batches to avoid rate limits
        batch_size = 3
        for i in range(0, len(questions), batch_size):
            batch = questions[i:i + batch_size]
            
            # Process batch concurrently
            tasks = [self.generate_answer(q, context) for q in batch]
            batch_answers = await asyncio.gather(*tasks, return_exceptions=True)
            
            for j, result in enumerate(batch_answers):
                if isinstance(result, Exception):
                    logger.error(f"Error processing question {batch[j].id}: {result}")
                    # Generate fallback answer
                    result = self._generate_fallback_answer(batch[j])
                
                # Make answer more human-like
                result = self.make_answer_human_like(result, batch[j])
                answers.append(result)
            
            # Small delay between batches
            if i + batch_size < len(questions):
                await asyncio.sleep(random.uniform(1, 3))
        
        logger.info(f"Processed {len(questions)} questions. Total cost: ${self.total_cost:.4f}")
        return answers

    def get_stats(self) -> Dict:
        """Get service statistics"""
        return {
            'total_requests': self.request_count,
            'total_cost': round(self.total_cost, 4),
            'avg_cost_per_request': round(self.total_cost / max(1, self.request_count), 4),
            'openai_available': bool(self.openai_client),
            'anthropic_available': bool(self.anthropic_client)
        }

    def reset_stats(self):
        """Reset cost and request tracking"""
        self.total_cost = 0.0
        self.request_count = 0

# API endpoint wrapper for integration with Node.js
async def answer_questions_endpoint(questions_data: List[Dict], context: Optional[str] = None) -> Dict:
    """Main endpoint for answering questions"""
    try:
        # Convert dict data to Question objects
        questions = []
        for q_data in questions_data:
            questions.append(Question(
                id=q_data['id'],
                text=q_data['text'],
                type=q_data['type'],
                options=q_data.get('options', []),
                required=q_data.get('required', True)
            ))
        
        # Initialize service and process questions
        service = LLMService()
        answers = await service.process_poll_questions(questions, context)
        
        # Convert answers to dict format
        result = {
            'answers': [
                {
                    'question_id': a.question_id,
                    'value': a.value,
                    'confidence': a.confidence,
                    'reasoning': a.reasoning
                }
                for a in answers
            ],
            'stats': service.get_stats()
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error in answer_questions_endpoint: {e}")
        return {
            'error': str(e),
            'answers': [],
            'stats': {}
        }

if __name__ == "__main__":
    # Test the service
    async def test_service():
        test_questions = [
            {
                'id': 1,
                'text': 'Do you like pizza?',
                'type': 'yes-no',
                'options': [{'value': 'yes', 'label': 'Yes'}, {'value': 'no', 'label': 'No'}]
            },
            {
                'id': 2,
                'text': 'What is your favorite color?',
                'type': 'single-choice',
                'options': [
                    {'value': 'red', 'label': 'Red'},
                    {'value': 'blue', 'label': 'Blue'},
                    {'value': 'green', 'label': 'Green'}
                ]
            }
        ]
        
        result = await answer_questions_endpoint(test_questions)
        print(json.dumps(result, indent=2))
    
    asyncio.run(test_service())