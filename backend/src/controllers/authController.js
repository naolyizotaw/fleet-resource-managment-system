const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//@desc createVehicle 
//@route POST /api/vehicles/create
//@access public
const register = async (req, res) => {
    try {
        const { username, password, role, fullName, email, phone, department, status } = req.body;

        if (!username || !password || !fullName) {
            return res.status(400).json({ message: 'username, password and fullName are required' });
        }

        // hashed password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create new user and save it to database
        const newUser = new User({
            username,
            password: hashedPassword,
            role: role || 'user',
            fullName,
            email: email || undefined,
            phone: phone || undefined,
            department: department || null,
            status: status || 'active',
        });

        await newUser.save();

        const userToReturn = newUser.toObject();
        delete userToReturn.password;

        res.status(201).json(userToReturn);
    } catch (err) {
        // Duplicate username/email error (E11000)
        if (err && err.code === 11000) {
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        // Mongoose validation errors
        if (err && err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({ message: messages });
        }

        console.error('Register error:', err);
        res.status(500).json({ message: 'Failed to register user' });
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
        const { username, role, fullName, email, phone, department, status } = req.body;

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

        res.json(updated);
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        console.error('Update user error:', err);
        res.status(500).json({ message: 'Failed to update user' });
    }
};

module.exports = { register, login, updateUser };