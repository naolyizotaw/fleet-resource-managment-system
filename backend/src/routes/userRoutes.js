const express = require("express");
const { verifyToken } = require('../middlewares/authMiddleware');
const authorizeRoles = require("../middlewares/roleMiddleware");
const User = require('../models/userModel');
const { updateUser, updateMe, changePassword } = require('../controllers/authController');


const router = express.Router();

// Admin & Manager: list all drivers (users with role 'user')
router.get('/drivers', verifyToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const drivers = await User.find({ role: 'user' }, { password: 0 });
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch drivers' });
    }
});

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

// current user update profile (must come before `/:id` so 'me' isn't treated as an id)
router.put('/me', verifyToken, updateMe);

// change password for current user
router.put('/me/password', verifyToken, changePassword);

// Admin: reset a user's password (admin only)
router.put('/:id/password', verifyToken, authorizeRoles('admin'), async (req, res, next) => {
    // delegate to controller
    const { adminResetPassword } = require('../controllers/authController');
    return adminResetPassword(req, res, next);
});

// Admin: update user by id (allow updating common profile fields)
router.put('/:id', verifyToken, authorizeRoles('admin'), updateUser);

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

// current user info - fetch from DB to ensure we return up-to-date profile fields
router.get('/me', verifyToken, async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(400).json({ message: 'Invalid token payload' });

        const user = await User.findById(userId, '-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // return selected public profile fields
        res.json({
            id: user._id,
            username: user.username,
            fullName: user.fullName || null,
            role: user.role,
            email: user.email || null,
            phone: user.phone || null,
            department: user.department || null,
            status: user.status || null
        });
    } catch (err) {
        console.error('GET /users/me error:', err);
        res.status(500).json({ message: 'Failed to fetch user profile' });
    }
});

// ...existing code...

module.exports = router;