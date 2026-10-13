const express = require('express')
const router = express.Router();

const { registerUser } = require('../controllers/registerController')
const validateRegister = require('../middleware/validateRegister');
const validateLogin = require('../middleware/validateLogin');
const { loginUser } = require('../controllers/loginController');



router.post("/register",validateRegister,registerUser);
router.post("/login",validateLogin,loginUser);



module.exports = router;