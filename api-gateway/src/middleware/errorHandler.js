function errorHandler(err, req, res, next) {
    console.error("Gateway error:", err);
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({
        error: err.name || "InternalServerError",
        message: err.message || "Something went wrong"
    });
}

module.exports = errorHandler;