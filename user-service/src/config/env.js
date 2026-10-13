require("dotenv").config();

function parseNumber(value, defaultValue, name) {
    if (value === undefined || value === "") return defaultValue;
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) {
        throw new Error(`Invalid environment variable "${name}": expected non-negative number, got "${value}"`);
    }
    return num;
}

function validateAndLoadConfig() {
    const port = parseNumber(process.env.PORT, 5001, "PORT");
    if (port < 1 || port > 65535) {
        throw new Error(`Invalid PORT "${port}": must be between 1 and 65535`);
    }

    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gateway_project";
    const jwtSecret = process.env.JWT_SECRET || "mysecretkey";
    const internalApiKey = process.env.INTERNAL_API_KEY || "gateway-internal-secret-key";

    return {
        port,
        mongoUri,
        jwtSecret,
        internalApiKey
    };
}

const config = validateAndLoadConfig();

module.exports = config;
