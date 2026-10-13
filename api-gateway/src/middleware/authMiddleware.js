const jwt = require("jsonwebtoken");
const config = require("../config/env");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Token is not provided"
        });
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid authorization header"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid or expired token"
        });
    }
}

module.exports = { authMiddleware };