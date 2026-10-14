const config = require("../config/env");

/**
 * Middleware ensuring requests originate from the API Gateway
 * by validating the shared X-Internal-Key header.
 */
function verifyInternalKey(req, res, next) {
    const internalKey = req.headers["x-internal-key"];

    if (!internalKey || internalKey !== config.internalApiKey) {
        return res.status(403).json({
            error: "Forbidden",
            message: "Direct access forbidden: missing or invalid internal key"
        });
    }

    next();
}

module.exports = verifyInternalKey;
