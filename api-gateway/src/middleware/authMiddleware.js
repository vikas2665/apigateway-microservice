const jwt = require("jsonwebtoken");
function authMiddleware(req,res,next){
    // if token is not exist in header 
    if(!req.headers.authorization){
        return res.status(401).send("token is not provided");
    }
    // express stores token in header 
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                message:"invalid authorization header "
            });
        } 
        const token = authHeader.split(" ")[1];

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
       return res.status(401).json({
          message:"invalid or expired token"
       });
    }
}
module.exports = {authMiddleware};