const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//this is test

//@desc createVehicle 
//@route POST /api/vehicles/create
//@access public
const register = async (req, res) => {
    try {
    const { fullName, username, password, role } = req.body;

    //hashed password 
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user and save it to database 
    const newUser = new User({ fullName, username, password: hashedPassword, role});
    await newUser.save();
    res.status(201).json({message: `User registerd with username: ${username}`});

    } catch (err) {
        // Duplicate username error (E11000)
        if (err && err.code === 11000) {
            return res.status(409).json({ message: 'Username already exists' });
        }
        console.error('Register error:', err);
        res.status(500).json({message: 'Something is wrong!'});
    }
};

//@desc createVehicle 
//@route POST /api/vehicles/create
//@access public
const login = async (req, res) => {
    try {
    const { username, password} = req.body;

    const user = await User.findOne({username});
    
    //compare username with in the database 
    if(!user) {
        return res.status(404).json({message: `User with username: ${username} not found!`})
    }

    //compare password with database 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({message: `Invalid credentials!`});
    }
     
    //Access Token generator
    const token = jwt.sign(
        { id: user._id, role: user.role, username: user.username }, 
        process.env.JWT_SECRET,
         {expiresIn: "1h"}
        );
        res.status(200).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName || undefined,
                email: user.email || undefined,
                phone: user.phone || undefined,
                department: user.department || undefined,
                status: user.status || undefined,
                role: user.role
            }
        });

} catch {
    res.status(404).json({message: `sth went wrong!`});
};

};

// Admin: update user profile (username, role, fullName, email, phone, department, status)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
    const { username, role, fullName, email, phone, department, status, gender } = req.body;

        // Build update object but avoid setting empty-string email (empty string is indexed and can cause duplicate key errors)
        const update = {};
        if (username !== undefined) update.username = username;
        if (role !== undefined) update.role = role;
        if (fullName !== undefined) update.fullName = fullName;
        if (email !== undefined) {
            // treat empty string as "do not change" to avoid creating duplicate empty values
            if (email !== '') update.email = email;
        }
        if (phone !== undefined) update.phone = phone;
    if (gender !== undefined) update.gender = gender;
        if (department !== undefined) update.department = department;
        if (status !== undefined) update.status = status;

        // Pre-check for conflicts: ensure username/email aren't used by another user
        const conflictQuery = [];
        if (update.username) conflictQuery.push({ username: update.username });
        if (update.email) conflictQuery.push({ email: update.email });
        if (conflictQuery.length) {
            const conflict = await User.findOne({ $or: conflictQuery, _id: { $ne: id } });
            if (conflict) {
                return res.status(409).json({ message: 'Username or email already exists' });
            }
        }

        const updated = await User.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true, select: '-password' }
        );

        if (!updated) {
            return res.status(404).json({ message: 'User not found' });
        }

    res.json({ message: 'Profile updated successfully', user: updated });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        console.error('Update user error:', err);
        res.status(500).json({ message: 'Failed to update user' });
    }
};

// current user: update own profile
const updateMe = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(400).json({ message: 'Invalid token payload' });

    const { fullName, email, phone, department, status, gender } = req.body;

        const update = {};
        if (fullName !== undefined) update.fullName = fullName;
        if (email !== undefined && email !== '') update.email = email;
        if (phone !== undefined) update.phone = phone;
    if (gender !== undefined) update.gender = gender;
        if (department !== undefined) update.department = department;
        if (status !== undefined) update.status = status;

        // Prevent updating username/password here for security; separate endpoints
        const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, select: '-password' });
        if (!updated) return res.status(404).json({ message: 'User not found' });

        res.json(updated);
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        console.error('updateMe error', err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

// change current user's password
const changePassword = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(400).json({ message: 'Invalid token payload' });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Provide current and new password' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

    res.json({ message: 'Password updated successfully. Please use your new password on next login.' });
    } catch (err) {
        console.error('changePassword error', err);
        res.status(500).json({ message: 'Failed to change password' });
    }
};

// Admin: reset another user's password without needing current password
const adminResetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ message: 'New password is required' });

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

        res.json({ message: 'Password reset successfully for the user' });
    } catch (err) {
        console.error('adminResetPassword error', err);
        res.status(500).json({ message: 'Failed to reset user password' });
    }
};

module.exports = { register, login, updateUser, updateMe, changePassword, adminResetPassword };