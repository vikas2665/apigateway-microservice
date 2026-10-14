const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../config/env");
const serviceRoutes = require("../config/routes");

/**
 * Creates an HTTP reverse proxy for an upstream microservice.
 * Configured with timeouts, request ID propagation, internal secret injection,
 * user identity forwarding, and uniform 502/504 error handling.
 */
function defaultPathRewrite(path, req) {
    const original = req && req.originalUrl ? req.originalUrl : path;
    return original.replace(/^\/api/, "");
}

function createServiceProxy(target, serviceName = "upstream service", pathRewrite = defaultPathRewrite) {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        timeout: config.proxyTimeoutMs,
        proxyTimeout: config.proxyTimeoutMs,
        pathRewrite,
        on: {
            proxyReq: (proxyReq, req) => {
                // Forward Request ID
                if (req.id) {
                    proxyReq.setHeader("x-request-id", req.id);
                }

                // Forward Shared Internal Secret so microservices know request passed through Gateway
                if (config.internalApiKey) {
                    proxyReq.setHeader("x-internal-key", config.internalApiKey);
                }

                // Forward verified user identity
                if (req.user) {
                    if (req.user.id) {
                        proxyReq.setHeader("x-user-id", String(req.user.id));
                    }
                    if (req.user.role) {
                        proxyReq.setHeader("x-user-role", String(req.user.role));
                    }
                }
            },
            error: (err, req, res) => {
                console.error(`Proxy error connecting to ${serviceName} [${req.id || "-"}]:`, err.message);

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
                        message: `${serviceName} timed out`
                    });
                }

                return res.status(502).json({
                    error: "BadGateway",
                    message: `${serviceName} is unavailable`
                });
            }
        }
    });
}

// Build proxies dynamically from the routing table
const proxyMap = {};
for (const route of serviceRoutes) {
    proxyMap[route.name] = createServiceProxy(route.target, route.name, route.pathRewrite);
}

const userProxy = proxyMap["user-service"] || createServiceProxy(config.userServiceUrl, "user-service");
const productProxy = proxyMap["product-service"] || createServiceProxy(config.productServiceUrl, "product-service");

// Export userProxy as default for backward compatibility, and named proxies for routing
userProxy.createServiceProxy = createServiceProxy;
userProxy.userProxy = userProxy;
userProxy.productProxy = productProxy;
userProxy.proxyMap = proxyMap;

module.exports = userProxy;
