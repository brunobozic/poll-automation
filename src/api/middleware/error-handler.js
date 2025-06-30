/**
 * Global Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
    console.error('API Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    let details = null;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        details = err.details;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized access';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Resource not found';
    } else if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message;
    }

    // Don't leak error details in production
    const response = {
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    if (process.env.NODE_ENV === 'development') {
        response.details = details || err.message;
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

module.exports = errorHandler;