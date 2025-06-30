/**
 * Request Logger Middleware
 */

function requestLogger(req, res, next) {
    const start = Date.now();
    
    // Log request
    console.log(`📨 ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📋 Body: ${JSON.stringify(req.body, null, 2).substring(0, 500)}`);
    }

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusEmoji = res.statusCode >= 400 ? '❌' : res.statusCode >= 300 ? '⚠️' : '✅';
        console.log(`${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });

    next();
}

module.exports = requestLogger;