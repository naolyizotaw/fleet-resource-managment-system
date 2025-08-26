const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//@desc createVehicle 
//@route POST /api/vehicles/create
//@access public
const register = async (req, res) => {
    try {
    const { username, password, role } = req.body;

    //hashed password 
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user and save it to database 
    const newUser = new User({ username, password: hashedPassword, role});
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
        res.status(200).json({token});

} catch {
    res.status(404).json({message: `sth went wrong!`});
};

};

module.exports = { register, login };