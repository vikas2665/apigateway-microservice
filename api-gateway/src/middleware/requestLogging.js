function logger(req, res, next) {
    const startTime = Date.now();
    const reqId = req.id || req.headers["x-request-id"] || "-";

    res.on("finish", () => {
        const duration = Date.now() - startTime;
        console.log(
            `${req.method} ${req.originalUrl} [${reqId}] | Status: ${res.statusCode} | Time: ${duration}ms`
        );
    });

    next();
}

module.exports = logger;