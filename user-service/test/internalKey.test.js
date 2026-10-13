const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../src/app");
const config = require("../src/config/env");

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
                } catch {}
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

test("User Service internal authorization tests", async (t) => {
    let server;

    t.before(() => {
        server = http.createServer(app);
        return new Promise((resolve) => server.listen(0, resolve));
    });

    t.after(() => {
        return new Promise((resolve) => server.close(resolve));
    });

    await t.test("rejects direct requests lacking X-Internal-Key with 403", async () => {
        const res = await makeRequest(server, { path: "/users/profile" });
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Direct access forbidden: missing or invalid internal key"
        });
    });

    await t.test("rejects direct requests with invalid X-Internal-Key with 403", async () => {
        const res = await makeRequest(server, {
            path: "/users/profile",
            headers: {
                "x-internal-key": "wrong-secret-key"
            }
        });
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Direct access forbidden: missing or invalid internal key"
        });
    });

    await t.test("allows request with valid X-Internal-Key and receives forwarded identity", async () => {
        const res = await makeRequest(server, {
            path: "/users/profile",
            headers: {
                "x-internal-key": config.internalApiKey,
                "x-user-id": "user-abc-123",
                "x-user-role": "admin"
            }
        });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.message, "you reached the user profile");
        assert.equal(res.body.userId, "user-abc-123");
        assert.equal(res.body.role, "admin");
    });
});
