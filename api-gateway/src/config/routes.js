const config = require("./env");

/**
 * Routing table defining service endpoints and upstream target mappings.
 */
const serviceRoutes = [
    {
        name: "user-service",
        prefix: "/api/users",
        target: config.userServiceUrl
    },
    {
        name: "product-service",
        prefix: "/api/products",
        target: config.productServiceUrl
    }
];

module.exports = serviceRoutes;
