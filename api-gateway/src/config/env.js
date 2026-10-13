require("dotenv").config();

function parseNumber(value, defaultValue, name) {
    if (value === undefined || value === "") return defaultValue;
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) {
        throw new Error(`Invalid environment variable "${name}": expected non-negative number, got "${value}"`);
    }
    return num;
}

function parseUrl(value, defaultValue, name) {
    const raw = value || defaultValue;
    try {
        new URL(raw);
        return raw;
    } catch {
        throw new Error(`Invalid environment variable "${name}": expected valid URL, got "${raw}"`);
    }
}

function parseBoolean(value, defaultValue) {
    if (value === undefined || value === "") return defaultValue;
    return value === "true" || value === true;
}

function parseTrustProxy(value, defaultValue = false) {
    if (value === undefined || value === "") return defaultValue;
    if (value === "true") return true;
    if (value === "false") return false;
    if (!Number.isNaN(Number(value))) return Number(value);
    return value;
}

function validateAndLoadConfig() {
    const port = parseNumber(process.env.PORT, 5000, "PORT");
    if (port < 1 || port > 65535) {
        throw new Error(`Invalid PORT "${port}": must be between 1 and 65535`);
    }

    const userServiceUrl = parseUrl(process.env.USER_SERVICE_URL, "http://localhost:5001", "USER_SERVICE_URL");
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const jwtSecret = process.env.JWT_SECRET || "mysecretkey";
    const internalApiKey = process.env.INTERNAL_API_KEY || "gateway-internal-secret-key";

    const rateLimitMax = parseNumber(process.env.RATE_LIMIT_MAX, 100, "RATE_LIMIT_MAX");
    const rateLimitWindow = parseNumber(process.env.RATE_LIMIT_WINDOW, 60, "RATE_LIMIT_WINDOW");
    const authRateLimitMax = parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 5, "AUTH_RATE_LIMIT_MAX");
    const authRateLimitWindow = parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW, 60, "AUTH_RATE_LIMIT_WINDOW");
    const proxyTimeoutMs = parseNumber(process.env.PROXY_TIMEOUT_MS, 5000, "PROXY_TIMEOUT_MS");

    const rateLimitFailOpen = parseBoolean(process.env.RATE_LIMIT_FAIL_OPEN, true);
    const trustProxy = parseTrustProxy(process.env.TRUST_PROXY, false);
    const corsOrigin = process.env.CORS_ORIGIN || "*";

    return {
        port,
        userServiceUrl,
        redisUrl,
        jwtSecret,
        internalApiKey,
        rateLimitMax,
        rateLimitWindow,
        authRateLimitMax,
        authRateLimitWindow,
        proxyTimeoutMs,
        rateLimitFailOpen,
        trustProxy,
        corsOrigin
    };
}

const config = validateAndLoadConfig();

module.exports = config;
