const mongoose = require("mongoose");
const config = require("./env");

async function connectDB() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log("Product service MongoDB connected");
    } catch (err) {
        console.error("Product service MongoDB connection error:", err.message);
    }
}

module.exports = connectDB;
