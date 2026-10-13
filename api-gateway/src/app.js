require("dotenv").config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Configurable trust proxy setting for accurate client IP behind proxies
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv !== undefined) {
    if (trustProxyEnv === "true") {
        app.set("trust proxy", true);
    } else if (trustProxyEnv === "false") {
        app.set("trust proxy", false);
    } else if (!isNaN(Number(trustProxyEnv))) {
        app.set("trust proxy", Number(trustProxyEnv));
    } else {
        app.set("trust proxy", trustProxyEnv);
    }
}

const rateLimiter = require('./middleware/ratelimitter');
const proxy = require('./middleware/proxy');
const logger = require('./middleware/requestLogging');
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require("./middleware/authMiddleware");
const { isAdmin } = require('./middleware/isAdmin');
const { connectRedis } = require("./config/redis");

const { globalRateLimiter, authRateLimiter } = rateLimiter;

// 1. Request logging for all requests
app.use(logger);

// 2. Stricter rate limiting for authentication endpoints (/api/users/login & /api/users/register)
app.use("/api/users/login", authRateLimiter);
app.use("/api/users/register", authRateLimiter);

// 3. Global rate limiting applied to all /api routes before auth and proxy
app.use("/api", globalRateLimiter);

// 4. Authenticated & Authorized routes
app.get("/api/users/profile",
    authMiddleware,
    proxy
);

app.get("/api/users/admin",
    authMiddleware,
    isAdmin,
    proxy
);

// 5. Proxy all remaining /api routes to user-service
app.use("/api", proxy);

// 6. Centralized error handling
app.use(errorHandler);

async function startServer() {
    await connectRedis();
    return app.listen(PORT, () => {
        console.log(`api gateway is running on ${PORT}`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };