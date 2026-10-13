
const {createProxyMiddleware} = require('http-proxy-middleware');

// creating the middleware 
const proxy = createProxyMiddleware({
    target : process.env.USER_SERVICE_URL, // forward that request to this url 
    pathRewrite : {
        '^/api' : ''                   // whenever the req path starts with /api remove /api
    }
})

module.exports = proxy;
