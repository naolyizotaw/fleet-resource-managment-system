const express = require("express");
const { verifyToken } = require('../middlewares/authMiddleware');
const authorizeRoles = require("../middlewares/roleMiddleware");


const router = express.Router();

// only for Admin 
router.get("/admin", verifyToken, authorizeRoles("admin"), (req, res) => {
    res.json({message: "Welcome Admin!"})
});

// only for Admin and  manager 
router.get("/manager", verifyToken, authorizeRoles("admin", "manager"), (req, res) => {
    res.json({message: "Welcome Manager!"})
});

// only for all aceess
router.get("/user", verifyToken, authorizeRoles("admin", "manager", "user"), (req, res) => {
    res.json({message: "Welcome User!"})
});

// current user info
router.get('/me', verifyToken, (req, res) => {
    // req.user comes from verifyToken (decoded token)
    res.json({ id: req.user.id, role: req.user.role, username: req.user.username });
});

module.exports = router;