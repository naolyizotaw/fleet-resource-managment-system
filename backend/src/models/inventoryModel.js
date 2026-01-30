const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      unique: true,
      trim: true,
    },
    itemCode: {
      type: String,
      required: [true, "Item code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Spare Parts",
        "Lubricants",
        "Consumables",
        "Tires",
        "Batteries",
        "Filters",
        "Other",
      ],
      required: [true, "Category is required"],
    },
    description: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      required: [true, "Unit of measurement is required"],
      default: "pieces",
      trim: true,
    },
    currentStock: {
      type: Number,
      required: [true, "Current stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    minimumStock: {
      type: Number,
      default: 10,
      min: [0, "Minimum stock cannot be negative"],
    },
    maximumStock: {
      type: Number,
      min: [0, "Maximum stock cannot be negative"],
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: [0, "Unit price cannot be negative"],
    },
    supplier: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "Main Warehouse",
    },
    status: {
      type: String,
      enum: ["active", "discontinued", "out_of_stock"],
      default: "active",
    },
    lastRestocked: {
      type: Date,
      default: null,
    },
    stockHistory: [
      {
        type: {
          type: String,
          enum: ["addition", "usage", "adjustment", "damage", "return"],
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        previousStock: {
          type: Number,
          required: true,
        },
        newStock: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          trim: true,
        },
        vehicleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vehicle",
          default: null,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
inventorySchema.index({ itemCode: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ currentStock: 1 });

// Include virtuals in JSON and Object outputs
inventorySchema.set("toJSON", { virtuals: true });
inventorySchema.set("toObject", { virtuals: true });

// Virtual field: Stock status based on current vs minimum stock
inventorySchema.virtual("stockStatus").get(function () {
  if (this.currentStock === 0) {
    return "out_of_stock";
  } else if (this.currentStock <= this.minimumStock) {
    return "low_stock";
  } else if (this.maximumStock && this.currentStock >= this.maximumStock) {
    return "overstocked";
  } else {
    return "adequate";
  }
});

// Virtual field: Total stock value
inventorySchema.virtual("stockValue").get(function () {
  return this.currentStock * (this.unitPrice || 0);
});

// Virtual field: Stock percentage (current vs maximum)
inventorySchema.virtual("stockPercentage").get(function () {
  if (!this.maximumStock || this.maximumStock === 0) {
    return null;
  }
  return Math.round((this.currentStock / this.maximumStock) * 100);
});

// Pre-save hook to auto-update status based on stock level
inventorySchema.pre("save", function (next) {
  // Auto-update status to out_of_stock if currentStock is 0
  if (this.currentStock === 0 && this.status !== "discontinued") {
    this.status = "out_of_stock";
  } else if (this.currentStock > 0 && this.status === "out_of_stock") {
    // Restore to active if stock is replenished
    this.status = "active";
  }

  // Validate maximumStock is greater than minimumStock
  if (
    this.maximumStock &&
    this.minimumStock &&
    this.maximumStock < this.minimumStock
  ) {
    return next(
      new Error("Maximum stock must be greater than minimum stock")
    );
  }

  next();
});

module.exports = mongoose.model("Inventory", inventorySchema);
