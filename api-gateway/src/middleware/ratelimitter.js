const { redisClient } = require("../config/redis");

const RATE_LIMIT_LUA_SCRIPT = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('TTL', KEYS[1])
    if ttl == -1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
        ttl = tonumber(ARGV[1])
    end
    return { current, ttl }
`;

/**
 * Creates a rate limiter middleware for a specific route or scope.
 * 
 * @param {Object} options
 * @param {number} [options.windowSeconds] - Window duration in seconds
 * @param {number} [options.max] - Max requests permitted in the window
 * @param {string} [options.keyPrefix] - Redis key prefix
 * @param {boolean} [options.failOpen] - Fail-open behavior when Redis is down
 */
function createRateLimiter(options = {}) {
    return async function rateLimiterMiddleware(req, res, next) {
        const windowSeconds = Number(
            options.windowSeconds ??
            process.env.RATE_LIMIT_WINDOW ??
            60
        );
        const max = Number(
            options.max ??
            process.env.RATE_LIMIT_MAX ??
            100
        );
        const keyPrefix = options.keyPrefix || "rate_limit:global";

        // Default behavior when Redis is down: fail-open (true)
        const failOpen = options.failOpen !== undefined
            ? options.failOpen
            : (process.env.RATE_LIMIT_FAIL_OPEN === undefined
                ? true
                : process.env.RATE_LIMIT_FAIL_OPEN === "true");

        const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
        const key = `${keyPrefix}:${ip}`;

        try {
            const result = await redisClient.eval(RATE_LIMIT_LUA_SCRIPT, {
                keys: [key],
                arguments: [String(windowSeconds)]
            });

            const count = Array.isArray(result) ? Number(result[0]) : Number(result);
            const ttl = Array.isArray(result) && result[1] !== undefined
                ? Math.max(0, Number(result[1]))
                : windowSeconds;

            if (count > max) {
                res.set({
                    "Retry-After": String(ttl),
                    "X-RateLimit-Limit": String(max),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": String(ttl)
                });

                return res.status(429).json({
                    error: "Too many requests",
                    retryAfter: ttl
                });
            }

            const remaining = Math.max(0, max - count);
            res.set({
                "X-RateLimit-Limit": String(max),
                "X-RateLimit-Remaining": String(remaining),
                "X-RateLimit-Reset": String(ttl)
            });

            return next();

        } catch (error) {
            console.error(`Rate limiter Redis error [${keyPrefix}]:`, error);

            if (failOpen) {
                return next();
            }

            return res.status(500).json({
                error: "Rate limiter error",
                message: "Rate limiting service unavailable"
            });
        }
    };
}

// Global rate limiter: 100 per minute by default
const globalRateLimiter = createRateLimiter({
    get max() {
        return Number(process.env.RATE_LIMIT_MAX || 100);
    },
    get windowSeconds() {
        return Number(process.env.RATE_LIMIT_WINDOW || 60);
    },
    keyPrefix: "rate_limit:global"
});

// Stricter rate limiter for sensitive auth routes (login, register): 5 per minute by default
const authRateLimiter = createRateLimiter({
    get max() {
        return Number(process.env.AUTH_RATE_LIMIT_MAX || 5);
    },
    get windowSeconds() {
        return Number(process.env.AUTH_RATE_LIMIT_WINDOW || 60);
    },
    keyPrefix: "rate_limit:auth"
});

// Maintain backward compatibility for existing `require('./middleware/ratelimitter')`
const defaultLimiter = globalRateLimiter;
defaultLimiter.createRateLimiter = createRateLimiter;
defaultLimiter.globalRateLimiter = globalRateLimiter;
defaultLimiter.authRateLimiter = authRateLimiter;

module.exports = defaultLimiter;