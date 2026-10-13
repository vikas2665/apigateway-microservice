
const {body , validationResult} = require("express-validator");

const validateRegister = [
    // validate name 
    body("name")
    .notEmpty()
    .withMessage("Name is required"),

    // validate email
    body("email")
    .trim()
    .isEmail().
    withMessage("Please enter valid email"),

    // validate password
    body("password")
    .isLength({min : 6})
    .withMessage("Password must be atleast 6 length"),

    (req,res,next)=>{
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({
                errors: errors.array()
            });
        }
        next();

    }
];
module.exports = validateRegister
