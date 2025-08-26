const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema ({
    plateNumber: {
        type: String,
        required: true,
        unique: true,
    },
    type: {
        type: String,
        enum: [
            "Automobile",
            "Light Duty",
            "Heavy Duty",
            "Machinery",
            "Other",
        ],
    },
    model: {
        type: String,
        required: true,
    },
    manufacturer: {
        type: String,
    },
    year: {
        type: Number,
    },
    fuelType: {
        type: String,
        enum: ["Petrol", "Diesel", "Electric", "Hybrid"],
        required: true,
    },
    currentKm: {
        type: Number,
        required: true,
    },
    assignedDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    status: {
        type: String,
        enum: [
            "active",
            "under_maintenance",
            "inactive"
        ],
        default: "active",
    },
    maintenanceHistory: [
      {
        requestId: { type: mongoose.Schema.Types.ObjectId, ref: "MaintenanceRequest" },
        category: String,
        description: String,
        cost: Number,
        completedAt: Date,
      },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    }

    }, 

    { timestamps: true }
    
);

module.exports = mongoose.model("Vehicle", vehicleSchema);