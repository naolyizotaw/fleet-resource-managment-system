const mongoose = require("mongoose");

const fuelRequestSchema = new mongoose.Schema ({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    fuelType: {
        type: String,
        enum: ["petrol", "diesel", "electric"],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    currentKm: {
        type: Number,
        required: true
    },
    purpose: {
        type: String,
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
    cost: {
        type: Number,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    issuedDate: {
        type: Date,
    }
})

const FuelRequest = mongoose.model("FuelRequest", fuelRequestSchema);
module.exports = FuelRequest;