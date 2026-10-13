const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("../src/middleware/ratelimitter");
const { redisClient } = require("../src/config/redis");

test("Rate limiter middleware tests", async (t) => {
    const originalEval = redisClient.eval;

    t.afterEach(() => {
        redisClient.eval = originalEval;
    });

    await t.test("allows requests within limit and sets rate limit headers", async () => {
        // Mock redisClient.eval returning count = 1, ttl = 60
        redisClient.eval = async () => [1, 60];

        const limiter = createRateLimiter({
            windowSeconds: 60,
            max: 5,
            keyPrefix: "rate_limit:test"
        });

        const req = {
            ip: "192.168.1.100",
            socket: {}
        };
        const headers = {};
        const res = {
            set: (obj) => Object.assign(headers, obj),
            status: () => res,
            json: () => res
        };

        let nextCalled = false;
        await limiter(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
        assert.equal(headers["X-RateLimit-Limit"], "5");
        assert.equal(headers["X-RateLimit-Remaining"], "4");
        assert.equal(headers["X-RateLimit-Reset"], "60");
    });

    await t.test("returns 429 with correct headers and JSON body when limit exceeded", async () => {
        // Mock redisClient.eval returning count = 6, ttl = 45
        redisClient.eval = async () => [6, 45];

        const limiter = createRateLimiter({
            windowSeconds: 60,
            max: 5,
            keyPrefix: "rate_limit:test"
        });

        const req = {
            ip: "192.168.1.100",
            socket: {}
        };
        const headers = {};
        let statusCode = 200;
        let responseBody = null;

        const res = {
            set: (obj) => {
                Object.assign(headers, obj);
                return res;
            },
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (body) => {
                responseBody = body;
                return res;
            }
        };

        let nextCalled = false;
        await limiter(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(statusCode, 429);
        assert.equal(headers["Retry-After"], "45");
        assert.equal(headers["X-RateLimit-Limit"], "5");
        assert.equal(headers["X-RateLimit-Remaining"], "0");
        assert.equal(headers["X-RateLimit-Reset"], "45");
        assert.deepEqual(responseBody, {
            error: "Too many requests",
            retryAfter: 45
        });
    });

    await t.test("fails open when Redis encounters an error and failOpen is true", async () => {
        // Mock redisClient.eval throwing an error
        redisClient.eval = async () => {
            throw new Error("Redis connection lost");
        };

        const limiter = createRateLimiter({
            windowSeconds: 60,
            max: 5,
            keyPrefix: "rate_limit:test",
            failOpen: true
        });

        const req = { ip: "192.168.1.100", socket: {} };
        const res = {};
        let nextCalled = false;

        await limiter(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true, "Should call next() when failOpen is true");
    });

    await t.test("fails closed with 500 when Redis encounters an error and failOpen is false", async () => {
        redisClient.eval = async () => {
            throw new Error("Redis connection lost");
        };

        const limiter = createRateLimiter({
            windowSeconds: 60,
            max: 5,
            keyPrefix: "rate_limit:test",
            failOpen: false
        });

        const req = { ip: "192.168.1.100", socket: {} };
        let statusCode = 200;
        let responseBody = null;

        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (body) => {
                responseBody = body;
                return res;
            }
        };

        let nextCalled = false;
        await limiter(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(statusCode, 500);
        assert.equal(responseBody.error, "Rate limiter error");
    });
});
