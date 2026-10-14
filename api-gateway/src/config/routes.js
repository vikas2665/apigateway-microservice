const config = require("./env");

/**
 * Routing table defining service endpoints and upstream target mappings.
 */
const serviceRoutes = [
    {
        name: "user-service",
        prefix: "/api/users",
        target: config.userServiceUrl,
        pathRewrite: { "^/api": "" }
    },
    {
        name: "product-service",
        prefix: "/api/products",
        target: config.productServiceUrl,
        pathRewrite: { "^/api": "" }
    }
];

module.exports = serviceRoutes;
