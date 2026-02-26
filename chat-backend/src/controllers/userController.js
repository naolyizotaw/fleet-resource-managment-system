const mongoose = require("mongoose");
const User = require("../models/userModel");

// Create a secondary connection to the Main Backend's database (RBAC)
const mainDbConnection = mongoose.createConnection("mongodb://localhost:27017/RBAC");

// Define a minimal schema for the User in the Main DB
const mainUserSchema = new mongoose.Schema({
    fullName: String,
    username: String,
    email: String,
    role: String,
    pic: String,
});

const MainUser = mainDbConnection.model("User", mainUserSchema);

// Get or create user (Sync)
const syncUser = async (req, res) => {
    try {
        console.log("Sync User Request Payload:", req.user);

        // The main backend JWT contains: { id, role, username }
        const userId = req.user.id || req.user._id;
        const { role, username } = req.user;

        console.log("Extracted UserId:", userId);

        if (!userId) {
            console.log("Error: User ID not found in token");
            return res.status(400).json({ message: "User ID not found in token" });
        }

        let user = await User.findById(userId);
        //...

        if (!user) {
            // Try to fetch specific details from Main DB if not in token
            let mainUser = null;
            try {
                mainUser = await MainUser.findById(userId);
            } catch (err) {
                console.log("Could not fetch from main DB", err);
            }

            // Create new user with data from JWT or Main DB
            user = await User.create({
                _id: userId,
                fullName: req.user.fullName || (mainUser ? mainUser.fullName : username), // Fallback to username
                username: username,
                email: req.user.email || (mainUser ? mainUser.email : undefined),
                role: role || (mainUser ? mainUser.role : "user"),
                pic: req.user.pic || (mainUser ? mainUser.pic : "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg")
            });
        } else {
            // Update if needed
            if (username && user.username !== username) user.username = username;
            if (role && user.role !== role) user.role = role;
            if (req.user.fullName) user.fullName = req.user.fullName;
            if (req.user.email) user.email = req.user.email;
            await user.save();
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Sync user error:", error);
        res.status(400).json({ message: error.message });
    }
};

// Search users
const allUsers = async (req, res) => {
    const userId = req.user.id || req.user._id;

    const keyword = req.query.search
        ? {
            $or: [
                { fullName: { $regex: req.query.search, $options: "i" } },
                { username: { $regex: req.query.search, $options: "i" } },
                { email: { $regex: req.query.search, $options: "i" } },
            ],
        }
        : {};

    try {
        // 1. Search in Main DB (Source of Truth) to get everyone
        const mainUsers = await MainUser.find(keyword).find({ _id: { $ne: userId } });

        // 2. Sync found users to Local Chat DB
        if (mainUsers.length > 0) {
            const bulkOps = mainUsers.map(u => ({
                updateOne: {
                    filter: { _id: u._id },
                    update: {
                        $set: {
                            fullName: u.fullName,
                            username: u.username,
                            email: u.email,
                            role: u.role,
                            pic: u.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
                        }
                    },
                    upsert: true
                }
            }));

            if (bulkOps.length > 0) {
                await User.bulkWrite(bulkOps);
            }
        }

        // 3. Return users from Local Chat DB (now populated)
        // We query local DB because we want the local document structure (timestamps, etc.)
        // and to be consistent with other endpoints
        let users = await User.find(keyword).find({ _id: { $ne: userId } });

        res.send(users);
    } catch (error) {
        console.error("Search users error:", error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = { syncUser, allUsers };
