function isAdmin(req,res,next){
    if(req.user.role !== "admin"){
        return res.status(403).send("access denied") // 403 is for forbidden --> you are auithenticated but you dont have permission 
    }
    next();
}
module.exports = {isAdmin};