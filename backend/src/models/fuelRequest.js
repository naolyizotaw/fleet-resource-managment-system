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
    // Price per litre to be used to calculate the total cost
    pricePerLitre: {
        type: Number,
        default: null
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

// Auto-calculate cost when quantity and pricePerLitre are provided
fuelRequestSchema.pre('save', function(next) {
    if (typeof this.quantity === 'number' && typeof this.pricePerLitre === 'number') {
        const raw = this.quantity * this.pricePerLitre;
        // round to 2 decimals
        this.cost = Math.round(raw * 100) / 100;
    }
    next();
});

const FuelRequest = mongoose.model("FuelRequest", fuelRequestSchema);
module.exports = FuelRequest;