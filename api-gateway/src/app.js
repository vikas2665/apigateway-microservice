const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const config = require("./config/env");
const { redisClient, connectRedis } = require("./config/redis");

const app = express();
const PORT = config.port;

// Configure trust proxy
if (config.trustProxy !== false) {
    app.set("trust proxy", config.trustProxy);
}

// Security headers and CORS with configurable origins
app.use(helmet());

const corsOrigin = config.corsOrigin;
const corsOptions = corsOrigin === "*"
    ? { origin: "*" }
    : {
        origin: corsOrigin.includes(",")
            ? corsOrigin.split(",").map((s) => s.trim())
            : corsOrigin
    };
app.use(cors(corsOptions));

const requestIdMiddleware = require("./middleware/requestId");
const rateLimiter = require("./middleware/ratelimitter");
const proxy = require("./middleware/proxy");
const logger = require("./middleware/requestLogging");
const errorHandler = require("./middleware/errorHandler");
const { authMiddleware } = require("./middleware/authMiddleware");
const { isAdmin } = require("./middleware/isAdmin");

const { globalRateLimiter, authRateLimiter } = rateLimiter;

// 1. Assign unique X-Request-Id and log incoming request
app.use(requestIdMiddleware);
app.use(logger);

// 2. Health check endpoint (checks Redis connectivity)
app.get("/health", async (req, res) => {
    let redisConnected = false;
    try {
        if (redisClient.isOpen) {
            const pong = await redisClient.ping();
            redisConnected = pong === "PONG";
        }
    } catch {
        redisConnected = false;
    }

    const isHealthy = redisConnected;
    const statusCode = isHealthy ? 200 : 503;

    return res.status(statusCode).json({
        status: isHealthy ? "healthy" : "degraded",
        service: "api-gateway",
        redis: redisConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

// 3. Stricter rate limiting for authentication endpoints (/api/users/login & /api/users/register)
app.use("/api/users/login", authRateLimiter);
app.use("/api/users/register", authRateLimiter);

// 4. Global rate limiting applied to all /api routes before auth and proxy
app.use("/api", globalRateLimiter);

// 5. Authenticated & Authorized routes
app.get("/api/users/profile",
    authMiddleware,
    proxy
);

app.get("/api/users/admin",
    authMiddleware,
    isAdmin,
    proxy
);

// 6. Proxy all remaining /api routes to user-service
app.use("/api", proxy);

// 7. Centralized error handling
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