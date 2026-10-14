const express = require("express");
const config = require("./config/env");
const connectDB = require("./config/db");
const verifyInternalKey = require("./middleware/verifyInternalKey");
const productRoutes = require("./routes/productRoutes");

const app = express();
const PORT = config.port;

app.use(express.json());

// Reject direct calls that do not provide the shared internal secret
app.use(verifyInternalKey);

// Mount product routes
app.use("/products", productRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
    console.error("Product service unhandled error:", err);
    res.status(err.status || 500).json({
        error: err.name || "InternalServerError",
        message: err.message || "Something went wrong"
    });
});

async function startServer() {
    await connectDB();
    return app.listen(PORT, function () {
        console.log("product service is running on " + PORT);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
