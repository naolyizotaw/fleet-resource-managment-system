const express = require("express");
const { verifyToken } = require('../middlewares/authMiddleware');
const authorizeRoles = require("../middlewares/roleMiddleware");
const User = require('../models/userModel');


const router = express.Router();

// Admin: list all users
router.get('/', verifyToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// Admin: delete user by id
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

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