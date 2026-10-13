function logger(req,res,next){
   const startTime = Date.now();
   // telling express when the response is actuall finished run this logging code 
   res.on('finish',()=>{
      const duration = Date.now() - startTime;

      console.log(
        `${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms`
      );

   })
   next();
}
module.exports = logger;