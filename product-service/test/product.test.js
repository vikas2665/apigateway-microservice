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

test("Product Service tests", async (t) => {
    let server;

    t.before(() => {
        server = http.createServer(app);
        return new Promise((resolve) => server.listen(0, resolve));
    });

    t.after(() => {
        return new Promise((resolve) => server.close(resolve));
    });

    await t.test("rejects direct requests lacking X-Internal-Key with 403", async () => {
        const res = await makeRequest(server, { path: "/products" });
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Direct access forbidden: missing or invalid internal key"
        });
    });

    await t.test("rejects direct requests with invalid X-Internal-Key with 403", async () => {
        const res = await makeRequest(server, {
            path: "/products",
            headers: { "x-internal-key": "invalid-secret" }
        });
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            error: "Forbidden",
            message: "Direct access forbidden: missing or invalid internal key"
        });
    });

    await t.test("POST /products validates required fields (name, price)", async () => {
        const res = await makeRequest(
            server,
            {
                path: "/products",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-internal-key": config.internalApiKey
                }
            },
            { description: "Missing name and price" }
        );
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.error, "ValidationError");
    });
});
