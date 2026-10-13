const { redisClient } = require("../config/redis");

async function rateLimiter(req, res, next) {
    try {
        const ip = req.ip;

        const key = `rate_limit:${ip}`;

        const script = `
            local count = redis.call('INCR', KEYS[1])

            if count == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end

            return count
        `;

        const count = await redisClient.eval(script, {
            keys: [key],
            arguments: ['60']
        });

        // Check limit
        if (count > 5) {
            if (count > 5) {
                return res
                    .status(429)
                    .set({
                        "Retry-After": "60",
                        "X-RateLimit-Limit": "5",
                        "X-RateLimit-Remaining": "0"
                    })
                    .json({
                        error: "Too Many Requests",
                        message: "Rate limit exceeded"
                    });
            }
        }

        next();
        
    } catch (error) {
        console.log("rate limiter error:", error);
        return res.status(500).send("Rate limiter error");
    }
}

module.exports = rateLimiter;