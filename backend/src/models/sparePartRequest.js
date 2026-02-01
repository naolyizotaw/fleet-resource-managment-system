const mongoose = require("mongoose");

const sparePartRequestSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: [true, "Inventory item is required"],
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle information is required"],
    },
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder", // Optional: link to a work order if applicable
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reason: {
      type: String,
      required: [true, "Reason for request is required"],
      trim: true,
    },
    adminComment: {
      type: String, // Reason for rejection or approval notes
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SparePartRequest", sparePartRequestSchema);
