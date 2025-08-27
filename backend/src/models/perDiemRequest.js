const mongoose = require("mongoose");

const perDiemRequestSchema = new mongoose.Schema ({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    purpose: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    numberOfDays: {
        type: Number,
        required: true,
    },

    calculatedAmount: {
        type: Number 
    },
    approvedAmount: {
        type: Number,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    issuedDate: {
        type: Date,
    }

}, { timestamps: true });

const PerDiemRequest = mongoose.model("PerDiemRequest", perDiemRequestSchema);
module.exports = PerDiemRequest;