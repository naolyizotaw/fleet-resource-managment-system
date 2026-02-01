const mongoose = require("mongoose");

const sparePartUsedSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
    },
    itemName: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    unitCost: {
        type: Number,
        required: true,
        min: 0,
    },
    totalCost: {
        type: Number,
        required: true,
        min: 0,
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

const laborCostSchema = new mongoose.Schema({
    mechanicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    hours: {
        type: Number,
        required: true,
        min: 0,
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: 0,
    },
    totalCost: {
        type: Number,
        required: true,
        min: 0,
    },
    description: {
        type: String,
        trim: true,
        default: "",
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

const progressNoteSchema = new mongoose.Schema({
    note: {
        type: String,
        required: true,
        trim: true,
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

const historyEntrySchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
    },
});

const workOrderSchema = new mongoose.Schema(
    {
        workOrderNumber: {
            type: String,
            required: true,
            unique: true,
        },
        maintenanceRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MaintenanceRequest",
            required: true,
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
            required: true,
        },
        assignedMechanics: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        status: {
            type: String,
            enum: ["open", "in_progress", "on_hold", "completed", "cancelled"],
            default: "open",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: [
                "Engine",
                "Tires & Wheels",
                "Brakes",
                "Service",
                "Electrical",
                "Cargo",
                "Machinery",
                "Other",
            ],
        },
        spareParts: [sparePartUsedSchema],
        laborCosts: [laborCostSchema],
        totalPartsCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalLaborCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        progressNotes: [progressNoteSchema],
        startedDate: {
            type: Date,
            default: null,
        },
        completedDate: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        history: [historyEntrySchema],
    },
    { timestamps: true }
);

// Method to calculate total costs
workOrderSchema.methods.calculateTotalCosts = function () {
    this.totalPartsCost = this.spareParts.reduce(
        (sum, part) => sum + (part.totalCost || 0),
        0
    );
    this.totalLaborCost = this.laborCosts.reduce(
        (sum, labor) => sum + (labor.totalCost || 0),
        0
    );
    this.totalCost = this.totalPartsCost + this.totalLaborCost;
};

// Method to add history entry
workOrderSchema.methods.addHistoryEntry = function (action, performedBy, details = {}) {
    this.history.push({
        action,
        performedBy,
        timestamp: new Date(),
        details,
    });
};

// Pre-save hook to ensure costs are calculated
workOrderSchema.pre("save", function (next) {
    this.calculateTotalCosts();
    next();
});

module.exports = mongoose.model("WorkOrder", workOrderSchema);
