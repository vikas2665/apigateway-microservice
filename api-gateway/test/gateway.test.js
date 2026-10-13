const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { app } = require("../src/app");
const { redisClient } = require("../src/config/redis");

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

function makeRequest(server, options, bodyData = null) {
    return new Promise((resolve, reject) => {
        const port = server.address().port;
        const reqOptions = {
            hostname: "127.0.0.1",
            port,
            path: options.path,
            method: options.method || "GET",
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                let parsedBody = data;
                try {
                    parsedBody = JSON.parse(data);
                } catch {
                    // keep raw text if not json
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsedBody
                });
            });
        });

        req.on("error", reject);

        if (bodyData) {
            req.write(typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData));
        }
        req.end();
    });
}

test("API Gateway integration tests", async (t) => {
    let server;
    const originalEval = redisClient.eval;

    t.before(() => {
        // Mock redisClient.eval by default for fast in-memory rate limiting tests
        redisClient.eval = async () => [1, 60];
        server = http.createServer(app);
        return new Promise((resolve) => server.listen(0, resolve));
    });

    t.after(() => {
        redisClient.eval = originalEval;
        return new Promise((resolve) => server.close(resolve));
    });

    await t.test("rejects /api/users/profile when no authorization header is provided", async () => {
        const res = await makeRequest(server, { path: "/api/users/profile" });
        assert.equal(res.statusCode, 401);
        assert.equal(res.headers["x-ratelimit-limit"], "100");
    });

    await t.test("rejects /api/users/admin when user is not admin", async () => {
        const userToken = jwt.sign({ id: "123", role: "user" }, JWT_SECRET);
        const res = await makeRequest(server, {
            path: "/api/users/admin",
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        });
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.message, "Access denied");
    });

    await t.test("rate limit headers are present on /api routes", async () => {
        redisClient.eval = async () => [1, 55];
        const res = await makeRequest(server, { path: "/api/users/profile" });
        assert.equal(res.headers["x-ratelimit-limit"], "100");
        assert.equal(res.headers["x-ratelimit-remaining"], "99");
        assert.equal(res.headers["x-ratelimit-reset"], "55");
    });

    await t.test("returns 429 when rate limit is exceeded on /api/users/login", async () => {
        // authRateLimiter triggers when count > 5
        redisClient.eval = async () => [6, 42];

        const res = await makeRequest(server, {
            path: "/api/users/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { email: "test@example.com", password: "password123" });

        assert.equal(res.statusCode, 429);
        assert.equal(res.headers["retry-after"], "42");
        assert.equal(res.headers["x-ratelimit-limit"], "5");
        assert.equal(res.headers["x-ratelimit-remaining"], "0");
        assert.equal(res.headers["x-ratelimit-reset"], "42");
        assert.deepEqual(res.body, {
            error: "Too many requests",
            retryAfter: 42
        });
    });

    await t.test("returns 429 when rate limit is exceeded on /api/users/register", async () => {
        redisClient.eval = async () => [6, 38];

        const res = await makeRequest(server, {
            path: "/api/users/register",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { name: "Test", email: "test@example.com", password: "password123" });

        assert.equal(res.statusCode, 429);
        assert.equal(res.headers["retry-after"], "38");
        assert.equal(res.headers["x-ratelimit-limit"], "5");
        assert.equal(res.headers["x-ratelimit-remaining"], "0");
        assert.equal(res.headers["x-ratelimit-reset"], "38");
        assert.deepEqual(res.body, {
            error: "Too many requests",
            retryAfter: 38
        });
    });
});
