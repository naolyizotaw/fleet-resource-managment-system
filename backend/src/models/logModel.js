const mongoose = require("mongoose");

const driverLogSchema = new mongoose.Schema ({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    // Normalized date string (YYYY-MM-DD) used for enforcing unique log per vehicle per day
    dateKey: {
        type: String,
        index: true,
    },
    startKm: {
        type: Number,
        required: true,
    },
    endKm: {
        type: Number,
        required: true,
    },
    distance: {
        type:Number,
    },
    loggedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
    },
    remarks: {
        type: String,
    },
    isEditable: {
        type: Boolean,
        default: true,
    }
}, {timestamps: true}); 

// Ensure one log per vehicle per day (only when dateKey exists)
driverLogSchema.index(
    { vehicleId: 1, dateKey: 1 },
    { unique: true, partialFilterExpression: { dateKey: { $exists: true } } }
);

driverLogSchema.pre("save", function(next) { 
    if (this.date) {
        try {
            const d = new Date(this.date);
            const key = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0,10);
            this.dateKey = key;
        } catch (e) {
            // leave dateKey as is if date is invalid
        }
    }
    if (this.startKm != null && this.endKm != null) {
        this.distance = this.endKm - this.startKm;
    }
    next();
});

module.exports = mongoose.model("DriverLog", driverLogSchema);
