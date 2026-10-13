const express = require("express");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(express.json());

connectDB(); // connects the db to the server 

const userRoutes = require("./routes/userRoutes");

app.use("/users", userRoutes);

const PORT = process.env.PORT;
app.get("/users/profile",(req,res)=>{
    res.json({
        message : "you reached the user profile"
    });
});
app.get("/users/admin",(req,res)=>{
    res.json({
        message : "welcome admin"
    })
})

app.listen(PORT, function () {
    console.log("user service is running on " + PORT);
});