const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, unique: true },
    pic: {
        type: String,
        default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    },
    role: { type: String, default: "user" }, // admin, manager, etc.
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

module.exports = User;
