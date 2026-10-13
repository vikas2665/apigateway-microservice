const jwt = require("jsonwebtoken");
const config = require("../config/env");

function authlogin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Token is not provided"
        });
    }

    try {
        const parts = authHeader.split(" ");
        const token = parts[1];

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

module.exports = { authlogin };