const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
    url: redisUrl
});

redisClient.on("error", (err) => {
    console.error("Redis client error:", err.message);
});

async function connectRedis() {
    try {
        await redisClient.connect();
        console.log("Redis connected successfully");
    } catch (err) {
        console.error(`Failed to connect to Redis at ${redisUrl}:`, err.message);
    }
}

module.exports = {
    redisClient,
    connectRedis
};