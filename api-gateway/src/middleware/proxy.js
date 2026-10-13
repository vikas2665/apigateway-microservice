const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../config/env");

const proxy = createProxyMiddleware({
    target: config.userServiceUrl,
    changeOrigin: true,
    timeout: config.proxyTimeoutMs,
    proxyTimeout: config.proxyTimeoutMs,
    pathRewrite: {
        "^/api": ""
    },
    on: {
        proxyReq: (proxyReq, req) => {
            if (req.id) {
                proxyReq.setHeader("x-request-id", req.id);
            }
        },
        error: (err, req, res) => {
            console.error(`Proxy error connecting to user-service [${req.id || "-"}]:`, err.message);

            if (res.headersSent) {
                return;
            }

            const isTimeout =
                err.code === "ETIMEDOUT" ||
                err.code === "ECONNTIMEOUT" ||
                err.code === "ESOCKETTIMEDOUT" ||
                err.code === "ECONNRESET" ||
                (typeof err.message === "string" && err.message.toLowerCase().includes("timeout"));

            if (isTimeout) {
                return res.status(504).json({
                    error: "GatewayTimeout",
                    message: "User service timed out"
                });
            }

            return res.status(502).json({
                error: "BadGateway",
                message: "User service is unavailable"
            });
        }
    }
});

module.exports = proxy;
