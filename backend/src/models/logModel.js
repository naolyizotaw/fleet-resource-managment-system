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
    remarks: {
        type: String,
    },
    isEditable: {
        type: Boolean,
        default: true,
    }
}, {timestamps: true}); 

driverLogSchema.pre("save", function(next) { 
    if(this.startKm && this.endKm) {
        this.distance = this.endKm - this.startKm;
    }
    next();
});

module.exports = mongoose.model("DriverLog", driverLogSchema);
