const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { app } = require("../src/app");
const { redisClient } = require("../src/config/redis");
const config = require("../src/config/env");

const JWT_SECRET = config.jwtSecret;

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
        redisClient.eval = async () => [1, 60];
        server = http.createServer(app);
        return new Promise((resolve) => server.listen(0, resolve));
    });

    t.after(() => {
        redisClient.eval = originalEval;
        return new Promise((resolve) => server.close(resolve));
    });

    await t.test("GET /health reports service status and Redis connectivity", async () => {
        const res = await makeRequest(server, { path: "/health" });
        assert.ok([200, 503].includes(res.statusCode));
        assert.equal(res.body.service, "api-gateway");
        assert.ok(["healthy", "degraded"].includes(res.body.status));
        assert.ok(["connected", "disconnected"].includes(res.body.redis));
        assert.ok(res.body.timestamp);
    });

    await t.test("applies helmet security headers and CORS headers", async () => {
        const res = await makeRequest(server, { path: "/health" });
        assert.equal(res.headers["x-content-type-options"], "nosniff");
        assert.ok(res.headers["access-control-allow-origin"] !== undefined);
    });

    await t.test("generates or propagates X-Request-Id header", async () => {
        // Without incoming header
        const res1 = await makeRequest(server, { path: "/health" });
        assert.ok(res1.headers["x-request-id"]);

        // With incoming header
        const customId = "custom-uuid-test-12345";
        const res2 = await makeRequest(server, {
            path: "/health",
            headers: { "x-request-id": customId }
        });
        assert.equal(res2.headers["x-request-id"], customId);
    });

    await t.test("rejects /api/users/profile with uniform JSON 401 when no token provided", async () => {
        const res = await makeRequest(server, { path: "/api/users/profile" });
        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, {
            error: "Unauthorized",
            message: "Token is not provided"
        });
        assert.equal(res.headers["x-ratelimit-limit"], "100");
    });

    await t.test("rejects /api/users/admin with uniform JSON 403 when user is not admin", async () => {
        const userToken = jwt.sign({ id: "123", role: "user" }, JWT_SECRET);
        const res = await makeRequest(server, {
            path: "/api/users/admin",
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        });
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Access denied"
        });
    });

    await t.test("rate limit headers are present on /api routes", async () => {
        redisClient.eval = async () => [1, 55];
        const res = await makeRequest(server, { path: "/api/users/profile" });
        assert.equal(res.headers["x-ratelimit-limit"], "100");
        assert.equal(res.headers["x-ratelimit-remaining"], "99");
        assert.equal(res.headers["x-ratelimit-reset"], "55");
    });

    await t.test("returns 429 when rate limit is exceeded on /api/users/login", async () => {
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

    await t.test("returns 502 Bad Gateway when downstream service is offline", async () => {
        const userToken = jwt.sign({ id: "123", role: "user" }, JWT_SECRET);
        redisClient.eval = async () => [1, 60];

        const res = await makeRequest(server, {
            path: "/api/users/profile",
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        });

        assert.equal(res.statusCode, 502);
        assert.deepEqual(res.body, {
            error: "BadGateway",
            message: "user-service is unavailable"
        });
    });

    await t.test("rejects /api/products with uniform 401 when unauthenticated", async () => {
        const res = await makeRequest(server, { path: "/api/products" });
        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, {
            error: "Unauthorized",
            message: "Token is not provided"
        });
    });

    await t.test("rejects POST /api/products with uniform 403 when user is not admin", async () => {
        const userToken = jwt.sign({ id: "user-1", role: "user" }, JWT_SECRET);
        const res = await makeRequest(
            server,
            {
                path: "/api/products",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`
                }
            },
            { name: "Gadget", price: 99.99 }
        );
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Access denied"
        });
    });

    await t.test("rejects PUT /api/products/123 with uniform 403 when user is not admin", async () => {
        const userToken = jwt.sign({ id: "user-1", role: "user" }, JWT_SECRET);
        const res = await makeRequest(
            server,
            {
                path: "/api/products/123",
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`
                }
            },
            { name: "Updated Gadget" }
        );
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Access denied"
        });
    });

    await t.test("rejects DELETE /api/products/123 with uniform 403 when user is not admin", async () => {
        const userToken = jwt.sign({ id: "user-1", role: "user" }, JWT_SECRET);
        const res = await makeRequest(server, {
            path: "/api/products/123",
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        });
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Access denied"
        });
    });

    await t.test("POST /api/products allows admin user to pass isAdmin and routes to product-service", async () => {
        const adminToken = jwt.sign({ id: "admin-1", role: "admin" }, JWT_SECRET);
        const res = await makeRequest(
            server,
            {
                path: "/api/products",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                }
            },
            { name: "Super Product", price: 199.99 }
        );
        // Product service is offline during this isolated unit test, so it reaches proxy and returns 502 for product-service
        assert.equal(res.statusCode, 502);
        assert.deepEqual(res.body, {
            error: "BadGateway",
            message: "product-service is unavailable"
        });
    });
});
