const express = require("express");
const { register, login } = require("../controllers/authController");


const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();


// Only admin can register users/managers
router.post("/register", verifyToken, authorizeRoles("admin"), register);
router.post("/login", login);


module.exports = router;