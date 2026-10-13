const mongoose = require('mongoose');

// creating userSchema 
const userSchema = new mongoose.Schema({
    name : {
        type : String ,
        required : true,
        trim : true
    },
    email : {
        type :String,
        required : true,
        unique : true,
        trim : true
    },
    password : {
        type : String,
        required : true
    },
    role : {
        type : String,
        enum : ["user","admin"],
        default : "user" // if the user will not send the role then then the default will be user 
    }
});

// creating and exporting the model 
const Users = mongoose.model("User",userSchema);
module.exports = Users;
