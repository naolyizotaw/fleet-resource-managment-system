const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
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
    // Service interval in kilometers for regular maintenance (e.g., 5000 km)
    serviceIntervalKm: {
        type: Number,
        min: 0,
        default: 5000,
    },
    // Record the odometer reading at the previous (last) service
    previousServiceKm: {
        type: Number,
        min: 0,
        default: 0,
    },
    // Record the odometer reading at vehicle creation (first known KM)
    initialKm: {
        type: Number,
        min: 0,
        // leave undefined by default; we'll set it on create to the provided currentKm
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
    // History of individual service events (odometer reading at service, date, notes, who performed)
    serviceHistory: [
        {
            km: { type: Number, required: true, min: 0 },
            date: { type: Date, default: Date.now },
            notes: { type: String },
            performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // GPS Location for map tracking (current/latest position)
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        updatedAt: { type: Date, default: null }
    },
    // GPS Location History - stores path/route history
    locationHistory: [{
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now, index: true },
        speed: { type: Number, default: null }, // km/h if available from GPS
        accuracy: { type: Number, default: null }, // accuracy in meters
        source: { type: String, enum: ['gps', 'manual'], default: 'gps' }
    }],
    // Tracking token for mobile GPS updates (unique per vehicle)
    trackingToken: {
        type: String,
        unique: true,
        sparse: true, // allows null values
        default: null
    },
    // Tracking status
    isTracking: {
        type: Boolean,
        default: false
    },
    // Last time location was updated (for online/offline status)
    lastLocationUpdate: {
        type: Date,
        default: null
    }

},

    { timestamps: true }

);

// Create a sparse unique index to ensure a driver id can appear at most once
// across vehicles, while allowing null/unset assignedDriver values.
vehicleSchema.index({ assignedDriver: 1 }, { unique: true, sparse: true });

// Include virtuals in JSON and Object outputs so API responses contain
// computed service information.
vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

// On creation, if initialKm wasn't explicitly provided, populate it from currentKm
vehicleSchema.pre('save', function (next) {
    if (this.isNew) {
        // only set initialKm when creating a new document and initialKm is not provided
        if ((this.initialKm === undefined || this.initialKm === null) && (this.currentKm !== undefined && this.currentKm !== null)) {
            this.initialKm = this.currentKm;
        }
    }
    next();
});

// Virtual that computes service-related information using currentKm,
// previousServiceKm and serviceIntervalKm.
vehicleSchema.virtual('serviceInfo').get(function () {
    const currentKm = Number(this.currentKm || 0);
    // If there's no recorded previousServiceKm use the initialKm (the currentKm when the vehicle was created)
    // Treat 0 or undefined previousServiceKm as "no previous service" and fall back to initialKm when available.
    let prev;
    if (this.previousServiceKm !== undefined && this.previousServiceKm !== null && this.previousServiceKm > 0) {
        prev = Number(this.previousServiceKm);
    } else if (this.initialKm !== undefined && this.initialKm !== null) {
        prev = Number(this.initialKm);
    } else {
        prev = 0;
    }
    const interval = Number(this.serviceIntervalKm || 0);

    if (!interval || interval <= 0) {
        return null;
    }

    const delta = currentKm - prev;
    // number of whole intervals that have passed since last service
    const intervalsPassed = delta > 0 ? Math.floor(delta / interval) : 0;
    // next service milestone at or after currentKm
    const nCeil = delta > 0 ? Math.ceil(delta / interval) : 0;
    const nextServiceKm = prev + nCeil * interval;
    const kilometersUntilNextService = nextServiceKm - currentKm;

    return {
        lastServiceKm: prev,
        nextServiceKm,
        kilometersUntilNextService,
        servicesDue: intervalsPassed
    };
});

// Virtual field to determine if vehicle is currently online (location updated within last 5 minutes)
vehicleSchema.virtual('isOnline').get(function () {
    if (!this.lastLocationUpdate) {
        return false;
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastLocationUpdate > fiveMinutesAgo;
});

module.exports = mongoose.model("Vehicle", vehicleSchema);