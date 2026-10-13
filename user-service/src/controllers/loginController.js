const Users = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/env");

async function loginUser(req, res) {
    try {
        const loguser = await Users.findOne({
            email: req.body.email
        });

        if (!loguser) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Invalid credentials"
            });
        }

        const isMatch = await bcrypt.compare(
            req.body.password,
            loguser.password
        );

        if (!isMatch) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            {
                id: loguser._id,
                role: loguser.role
            },
            config.jwtSecret,
            {
                expiresIn: "6h"
            }
        );

        return res.status(200).json({
            token
        });
    } catch (err) {
        console.error("User login error:", err);
        return res.status(500).json({
            error: "InternalServerError",
            message: "Database error"
        });
    }
}

module.exports = { loginUser };