function isAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "Access denied"
        });
    }

    next();
}

module.exports = { isAdmin };