const Users = require("../models/user");
const bcrypt = require("bcrypt");

async function registerUser(req,res){
    try{
     

        // check if email is already exists
        
        const user = await Users.findOne({
            email : req.body.email
        });
        if(user){
            return res.status(409).send("user with this email is already exists");
        }

        // hash password 
        const hashedPassword = await bcrypt.hash(req.body.password,10);

        // create user
        const createduser = await Users.create(
            {
                name : req.body.name,
                email : req.body.email,
                password : hashedPassword
            }
        );
        res.status(201).json({
            id: createduser._id,
            name: createduser.name,
            email: createduser.email
        })
        
    }
    catch(err){
        console.log(err);
        res.status(500).send("database error");
    }
}
module.exports = {registerUser}