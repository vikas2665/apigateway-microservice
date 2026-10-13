const express = require("express");
const config = require("./config/env");
const connectDB = require("./config/db");
const verifyInternalKey = require("./middleware/verifyInternalKey");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = config.port;

app.use(express.json());

// Reject direct calls that do not provide the shared internal secret
app.use(verifyInternalKey);

// Mount user routes
app.use("/users", userRoutes);

// Profile endpoint (accepts forwarded user identity headers from gateway)
app.get("/users/profile", (req, res) => {
    const response = {
        message: "you reached the user profile"
    };
    if (req.headers["x-user-id"]) {
        response.userId = req.headers["x-user-id"];
    }
    if (req.headers["x-user-role"]) {
        response.role = req.headers["x-user-role"];
    }
    res.json(response);
});

// Admin endpoint (accepts forwarded user identity headers from gateway)
app.get("/users/admin", (req, res) => {
    const response = {
        message: "welcome admin"
    };
    if (req.headers["x-user-id"]) {
        response.userId = req.headers["x-user-id"];
    }
    if (req.headers["x-user-role"]) {
        response.role = req.headers["x-user-role"];
    }
    res.json(response);
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error("User service unhandled error:", err);
    res.status(err.status || 500).json({
        error: err.name || "InternalServerError",
        message: err.message || "Something went wrong"
    });
});

async function startServer() {
    await connectDB();
    return app.listen(PORT, function () {
        console.log("user service is running on " + PORT);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };