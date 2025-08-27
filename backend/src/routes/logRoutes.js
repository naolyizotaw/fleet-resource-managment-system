const express = require("express");



const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// All fuel routes require a valid token
router.use(verifyToken);





module.exports = router;