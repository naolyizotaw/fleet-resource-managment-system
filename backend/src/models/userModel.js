const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim:true,
    },
    username: {
        type: String,
        required: [true, "Please enter username"],
        unique: true,
    },
    password: {
        type: String,
        required: [true, "Please enter password!"],
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        sparse: true,
    },
    department: {
        type: String,
        default: null,
    },
    role: {
        type: String,
        required: true,
        enum: ["admin", "manager", "user"],
    },
    status: {
    type: String,
    enum: ["active", "inactive", "pending", "suspended"],
    default: "active",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    

}, {
    timestamps: true,
}
);

module.exports = mongoose.model("User", userSchema);