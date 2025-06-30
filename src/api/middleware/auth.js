/**
 * Authentication Middleware
 * Simple authentication for API access
 */

const jwt = require('jsonwebtoken');

// Simple auth middleware - can be enhanced with proper user management
function authMiddleware(req, res, next) {
    // For development, allow access without auth
    if (process.env.NODE_ENV === 'development') {
        req.user = { id: 'dev-user', role: 'admin' };
        req.sessionId = req.headers['x-session-id'] || `session-${Date.now()}`;
        return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid Bearer token'
        });
    }

    const token = authHeader.substring(7);

    try {
        // Verify JWT token
        const secretKey = process.env.JWT_SECRET || 'poll-automation-secret-key';
        const decoded = jwt.verify(token, secretKey);
        
        req.user = decoded;
        req.sessionId = req.headers['x-session-id'] || `session-${decoded.id}-${Date.now()}`;
        
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Please provide a valid authentication token'
        });
    }
}

// Generate a simple token for testing
function generateTestToken(userId = 'test-user') {
    const secretKey = process.env.JWT_SECRET || 'poll-automation-secret-key';
    return jwt.sign(
        { 
            id: userId, 
            role: 'user',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }, 
        secretKey
    );
}

module.exports = authMiddleware;
module.exports.generateTestToken = generateTestToken;