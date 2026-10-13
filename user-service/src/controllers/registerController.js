const Users = require("../models/user");
const bcrypt = require("bcrypt");

async function registerUser(req, res) {
    try {
        const user = await Users.findOne({
            email: req.body.email
        });

        if (user) {
            return res.status(409).json({
                error: "Conflict",
                message: "User with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const createduser = await Users.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        });

        return res.status(201).json({
            id: createduser._id,
            name: createduser.name,
            email: createduser.email
        });
    } catch (err) {
        console.error("User registration error:", err);
        return res.status(500).json({
            error: "InternalServerError",
            message: "Database error"
        });
    }
}

module.exports = { registerUser };