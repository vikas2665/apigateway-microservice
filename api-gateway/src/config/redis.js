const {createClient} = require("redis") // imports the redis client that i installed

const redisClient  = createClient({     // create a client that kwows how to communicate with redis running on port 6379
    url :  "redis://localhost:6379"
});

redisClient.on("error",(err)=>{
    console.log("redis error : ",err);
});

async function connectRedis(){        //  actually establishes the connection
    await redisClient.connect();
    console.log("redis connected");
}

module.exports = {
    redisClient,
    connectRedis
};