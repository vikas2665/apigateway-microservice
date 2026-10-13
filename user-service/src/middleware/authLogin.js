const jwt = require("jsonwebtoken");
function authlogin(req,res,next){
    // if token is not exist in header 
    if(!req.headers.authorization){
        return res.status(401).send("token is not provided");
    }
    // express stores token in header 
    try{
        const authHeader = req.headers.authorization.split(" ");
        const token = authHeader[1]; // extracting the token 

        // verify the token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // put userinfo into req,user
        req.user = decoded;
        next();

    }
    catch(err){
        res.status(401).send("invalid token")
    }
}
module.exports = {authlogin}