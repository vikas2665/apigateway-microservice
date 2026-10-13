const express = require('express');
const app = express();
const PORT = process.env.PORT;
// app.use(express.json());
require("dotenv").config();

const rateLimiter = require('./middleware/ratelimitter');

const proxy = require('./middleware/proxy');
const logger = require('./middleware/requestLogging');
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require("./middleware/authMiddleware");
const { isAdmin } = require('./middleware/isAdmin');
const { connectRedis} = require("./config/redis");


app.use(logger);

app.get("/api/users/profile",
    rateLimiter,
    authMiddleware,
    proxy
);
app.get("/api/users/admin",
    authMiddleware,
    isAdmin,
    proxy,
)
app.use("/api", proxy); // when a request comes to /api/users give it to proxy middleware and the procy takes care of forwarding it 

app.use(errorHandler);

async function startServer() {

    await connectRedis();
    app.listen(PORT, () => {
        console.log(`api gateway is running on ${PORT}`);
    });

}

startServer();