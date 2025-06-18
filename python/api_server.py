from flask import Flask, request, jsonify
import asyncio
import logging
from llm_service import answer_questions_endpoint
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'LLM Poll Answering Service',
        'version': '1.0.0'
    })

@app.route('/answer-questions', methods=['POST'])
def answer_questions():
    """Main endpoint for answering poll questions"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        questions = data.get('questions', [])
        context = data.get('context', None)
        
        if not questions:
            return jsonify({'error': 'No questions provided'}), 400
        
        # Validate question format
        for q in questions:
            required_fields = ['id', 'text', 'type']
            if not all(field in q for field in required_fields):
                return jsonify({
                    'error': f'Question missing required fields: {required_fields}'
                }), 400
        
        # Process questions asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                answer_questions_endpoint(questions, context)
            )
        finally:
            loop.close()
        
        if 'error' in result:
            return jsonify(result), 500
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in answer_questions endpoint: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/test-question', methods=['POST'])
def test_single_question():
    """Test endpoint for a single question"""
    try:
        data = request.get_json()
        
        # Create a test question if none provided
        if not data:
            data = {
                'text': 'Do you like automated polls?',
                'type': 'yes-no',
                'options': [
                    {'value': 'yes', 'label': 'Yes'},
                    {'value': 'no', 'label': 'No'}
                ]
            }
        
        # Add required fields
        test_question = {
            'id': 1,
            'text': data.get('text', 'Test question'),
            'type': data.get('type', 'yes-no'),
            'options': data.get('options', []),
            'required': data.get('required', True)
        }
        
        # Process the question
        questions = [test_question]
        context = data.get('context', 'This is a test question')
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                answer_questions_endpoint(questions, context)
            )
        finally:
            loop.close()
        
        return jsonify({
            'question': test_question,
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error in test_question endpoint: {e}")
        return jsonify({
            'error': 'Test failed',
            'details': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get service statistics"""
    # This would ideally be stored in a persistent way
    # For now, return basic service info
    return jsonify({
        'service': 'LLM Poll Answering Service',
        'endpoints': [
            '/health - Health check',
            '/answer-questions - Answer poll questions',
            '/test-question - Test single question',
            '/stats - Service statistics'
        ],
        'supported_question_types': [
            'yes-no',
            'single-choice',
            'multiple-choice',
            'text',
            'rating'
        ]
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'available_endpoints': [
            '/health',
            '/answer-questions',
            '/test-question',
            '/stats'
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'error': 'Internal server error',
        'details': 'Check server logs for more information'
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PYTHON_SERVICE_PORT', 5000))
    host = os.getenv('PYTHON_SERVICE_HOST', '127.0.0.1')
    debug = os.getenv('PYTHON_SERVICE_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting LLM service on {host}:{port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(
        host=host,
        port=port,
        debug=debug,
        threaded=True
    )