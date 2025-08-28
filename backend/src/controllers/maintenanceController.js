const Vehicle = require('../models/vehicleModel'); // vehicle model
const MaintenanceRequest = require('../models/maintenanceRequest'); // maintenance request model
const mongoose = require('mongoose');
//const categoryOptions = require('../config/categoryOption'); // category options


//@desc Create Maintenance Request
//@route POST /api/maintenance/
//@access driver, manager, admin
const createMaintenance = async (req, res) => {
  try {
    const { vehicleId, category, description } = req.body;

    if (!vehicleId || !category || !description) {
      return res.status(400).json({ 
        message: "vehicleId, category, and description are required" 
      });
    }

    // Find vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // existing check
  
    const existing = await MaintenanceRequest.findOne({
      vehicleId,
      category,
      status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      return res.status(409).json({
        message: "An open maintenance request for this vehicle and category already exists",
        requestId: existing._id,
        status: existing.status,
      });
    }

    const request = new MaintenanceRequest({
      vehicleId,
      driverId: vehicle.assignedDriver || null,   
      requestedBy: req.user.id,
      category,
      description,
    });

    await request.save();

    // update vehicle status → under_maintenance
    vehicle.status = "under_maintenance";
    await vehicle.save();

 
    return res.status(201).json({
      message: "Maintenance request submitted successfully",
      request,
    });

  } catch (err) {
    console.error("Error creating maintenance request:", err);
    res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

//@desc Get maintenance requests
//@route GET /api/maintenance/
//@access admin/manager
const getMaintenances = async (req, res) => {
    try {
        const request = await MaintenanceRequest.find({});
        return res.status(200).json(request);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


//@desc Get maintenance requests by id
//@route GET /api/maintenance/:id
//@access private (admin, manager)
const getMaintenanceById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid Request id' });
    }
    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }
    return res.status(200).json(request);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

//@desc UPDATE maintenance requests by id
//@route PUT /api/maintenance/:id
//@access private (admin, manager)
const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid Request id' });
    }
    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    const { status, remarks, cost } = req.body;

     if (request.status !== 'pending') {
            return res.status(400).json({ message: `This request has already been ${request.status}.` });
        }
   
    if (remarks) {
      request.remarks = remarks;
    }

    
    if (status) {
     
      if (status === "approved" && !request.approvedBy) {
        request.approvedBy = req.user.id;
        request.approvedDate = new Date();
      }

      
      if (status === "completed") {
        request.completedDate = new Date();
        if (cost !== undefined) {
          request.cost = cost;
        }
      }
      
      
      request.status = status;
    }

    await request.save();

   
    if (status === "completed" || status === "rejected") {
      const vehicle = await Vehicle.findById(request.vehicleId);
      if (vehicle) {
        vehicle.status = "active";
        await vehicle.save();
      }
    }

    return res.status(200).json({
            message: `Maintenance request has been ${status}.`,
           request
        });
  } catch (err) {
    console.error("Error updating maintenance request:", err);
    return res.status(500).json({ message: "Error updating maintenance request", error: err.message });
  }
}



//@desc DELETE maintenance requests by id
//@route DELETE /api/maintenance/:id
//@access private (admin, manager)
const deleteMaintenance = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid Request id' });
    }
    const deletedMaintenance = await MaintenanceRequest.findByIdAndDelete(id);
    if (!deletedMaintenance) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }
    return res.status(200).json({ message: 'Request deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

//@desc Get maintenance requests for the current user
//@route GET /api/maintenance/my
//@access private (driver)
const getMyMaintenanceRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await MaintenanceRequest.find({ requestedBy: userId })
            .populate('vehicleId', 'plateNumber model');

        if (!requests || requests.length === 0) {
            return res.status(404).json({ message: "No maintenance requests found for this user" });
        }

        res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching user maintenance requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = {
  createMaintenance,
  getMaintenances,
  getMaintenanceById,
  updateMaintenance,  
  deleteMaintenance,
  getMyMaintenanceRequests
};




