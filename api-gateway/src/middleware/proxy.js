const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../config/env");

const proxy = createProxyMiddleware({
    target: config.userServiceUrl,
    changeOrigin: true,
    pathRewrite: {
        "^/api": ""
    },
    on: {
        proxyReq: (proxyReq, req) => {
            if (req.id) {
                proxyReq.setHeader("x-request-id", req.id);
            }
        }
    }
});

module.exports = proxy;
