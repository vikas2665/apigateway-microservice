const Users = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function loginUser(req,res){
    try{
        // find email id 
        const loguser = await Users.findOne({
            email : req.body.email
        })
        if(!loguser){
            return res.status(404).send("invalid credentials ");
        }

        // compare password by bcrypt 
        const isMatch = await bcrypt.compare(
            req.body.password,
            loguser.password
        );

        if(!isMatch){
            return res.status(401).send("invalid credentials")

        }
        // JWT assign
        const token = jwt.sign({
            id: loguser._id,
            role : loguser.role // make token with role as later we can divide the work on the basis of role 
        },process.env.JWT_SECRET,{
            expiresIn : "6h"
        });
        res.status(200).json({
            token
        });

    }
    catch(err){
        res.status(500).send("database error")

    }
}
module.exports = {loginUser};

//  for login i will first find email then passwrod comaprison and then jwt sign ann