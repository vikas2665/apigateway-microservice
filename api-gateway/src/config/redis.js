const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                return new Error("Max Redis reconnection attempts reached");
            }
            return Math.min(retries * 200, 2000);
        }
    }
});

redisClient.on("error", (err) => {
    console.error("Redis client error:", err.message || err);
});

async function connectRedis() {
    try {
        await Promise.race([
            redisClient.connect(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timeout")), 1500)
            )
        ]);
        console.log("Redis connected successfully");
    } catch (err) {
        console.error(`Failed to connect to Redis at ${redisUrl}:`, err.message || err);
    }
}

module.exports = {
    redisClient,
    connectRedis
};