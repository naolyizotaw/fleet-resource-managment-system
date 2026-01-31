const SparePartRequest = require("../models/sparePartRequest");
const Inventory = require("../models/inventoryModel");

// @desc Create a new spare part request
// @route POST /api/spare-parts
// @access Driver, Mechanic
const createRequest = async (req, res) => {
  try {
    const { itemId, vehicleId, quantity, reason } = req.body;

    // Validate inputs
    if (!itemId || !vehicleId || !quantity || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if item exists and has enough stock (optional check at request time, but critical at approval)
    // Checking existence is good practice.
    const item = await Inventory.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const newRequest = new SparePartRequest({
      itemId,
      vehicleId,
      requesterId: req.user.id,
      quantity,
      reason,
    });

    await newRequest.save();

    res.status(201).json({
      message: "Spare part request created successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("Error creating spare part request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Get all spare part requests
// @route GET /api/spare-parts
// @access Admin, Manager
const getAllRequests = async (req, res) => {
  try {
    const requests = await SparePartRequest.find()
      .populate("itemId", "itemName itemCode currentStock unit")
      .populate("vehicleId", "plateNumber make model")
      .populate("requesterId", "username fullName email role")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching spare part requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Get requests for the logged-in user
// @route GET /api/spare-parts/my-requests
// @access Driver, Mechanic
const getMyRequests = async (req, res) => {
  try {
    const requests = await SparePartRequest.find({ requesterId: req.user.id })
      .populate("itemId", "itemName itemCode unit")
      .populate("vehicleId", "plateNumber make model")
      .populate("requesterId", "username fullName email role")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching user requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Update request status (Approve/Reject)
// @route PUT /api/spare-parts/:id/status
// @access Admin, Manager
const updateRequestStatus = async (req, res) => {
  try {
    const { status, adminComment } = req.body;
    const { id } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await SparePartRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Request is already ${request.status}` });
    }

    // Handle Approval Logic
    if (status === "approved") {
      const item = await Inventory.findById(request.itemId);
      if (!item) {
        return res
          .status(404)
          .json({ message: "Associated inventory item not found" });
      }

      if (item.currentStock < request.quantity) {
        return res
          .status(400)
          .json({
            message: `Insufficient stock. Current: ${item.currentStock}, Requested: ${request.quantity}`,
          });
      }

      // Deduct stock
      item.currentStock -= request.quantity;
      await item.save();
    }

    // Update Request
    request.status = status;
    request.adminComment = adminComment || "";
    await request.save();

    res.status(200).json({
      message: `Request ${status} successfully`,
      request,
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Delete a pending request
// @route DELETE /api/spare-parts/:id
// @access Owner (Driver/Mechanic) or Admin
const deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await SparePartRequest.findById(id);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Check ownership or admin role
        // Assuming req.user.role is available. 
        // If the user is not the owner AND not an admin/manager, forbid.
        if (request.requesterId.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
             return res.status(403).json({ message: "Not authorized to delete this request" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Cannot delete a processed request" });
        }

        await SparePartRequest.findByIdAndDelete(id); 
        // OR request.deleteOne(); depending on mongoose version, findByIdAndDelete is safer usually.

        res.status(200).json({ message: "Request deleted successfully" });

    } catch (error) {
        console.error("Error deleting request:", error);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
  createRequest,
  getAllRequests,
  getMyRequests,
  updateRequestStatus,
  deleteRequest
};
