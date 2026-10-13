const crypto = require("crypto");

/**
 * Ensures each incoming request has a unique X-Request-Id.
 * Adopts existing incoming header if provided, otherwise generates a UUID.
 */
function requestIdMiddleware(req, res, next) {
    const requestId = req.headers["x-request-id"] || crypto.randomUUID();
    
    req.id = requestId;
    req.headers["x-request-id"] = requestId;
    res.setHeader("X-Request-Id", requestId);

    next();
}

module.exports = requestIdMiddleware;
