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
    // NOTE: we add a sparse unique index at the schema level below to
    // enforce the business rule "one driver per vehicle" at the DB layer.
    // This will cause MongoDB to reject inserts/updates that would assign
    // the same driver to multiple vehicles. Be careful: applying this
    // index to an existing collection with duplicate assignments will
    // fail until duplicates are removed or the index is created with
    // background/migration steps.
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

// Create a sparse unique index to ensure a driver id can appear at most once
// across vehicles, while allowing null/unset assignedDriver values.
vehicleSchema.index({ assignedDriver: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);