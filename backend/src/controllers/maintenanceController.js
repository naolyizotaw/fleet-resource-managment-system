const Vehicle = require('../models/vehicleModel'); // vehicle model
const MaintenanceRequest = require('../models/maintenanceRequest'); // maintenance request model
const Notification = require('../models/notification');
const User = require('../models/userModel');
const mongoose = require('mongoose');
//const categoryOptions = require('../config/categoryOption'); // category options


//@desc Create Maintenance Request
//@route POST /api/maintenance/
//@access driver, manager, admin
const createMaintenance = async (req, res) => {
  try {
  const { vehicleId, category, description, priority, serviceKm } = req.body;

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
      priority: priority || 'medium',
      serviceKm: (serviceKm !== undefined && serviceKm !== null && serviceKm !== '') ? Number(serviceKm) : null,
    });

  await request.save();

    // Resolve requester/driver names
    let requesterDoc = null;
    try { requesterDoc = await User.findById(req.user.id).select('fullName username email'); } catch {}
    const requestedByName = requesterDoc?.fullName || requesterDoc?.username || requesterDoc?.email;

    // Notify requester
    try {
      await Notification.create({
        user: req.user.id,
        type: 'maintenance',
        entityId: request._id,
        title: 'Maintenance request submitted',
        message: `Maintenance request created for vehicle ${vehicle.plateNumber || vehicle._id}`,
        actionUrl: `/maintenance?highlight=${request._id}`,
        meta: {
          vehiclePlate: vehicle.plateNumber || undefined,
          category,
          description,
          priority: request.priority,
          newStatus: 'pending',
          requestedByName,
          driverName: requestedByName,
        }
      });
    } catch (e) { console.error('Notif create error:', e.message); }

    // Notify approvers
    try {
      const approvers = await User.find({ role: { $in: ['admin', 'manager'] } }).select('_id');
      if (approvers.length) {
        const docs = approvers.map(u => ({
          user: u._id,
          type: 'maintenance',
          entityId: request._id,
          title: 'New maintenance request pending',
          message: 'A maintenance request requires your review and approval.',
          actionUrl: `/maintenance?highlight=${request._id}`,
          meta: {
            vehiclePlate: vehicle.plateNumber || undefined,
            category,
            description,
            priority: request.priority,
            newStatus: 'pending',
            requestedByName,
            driverName: requestedByName,
          }
        }));
        await Notification.insertMany(docs);
      }
    } catch (e) { console.error('Notif approvers error:', e.message); }

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
    const request = await MaintenanceRequest.find({})
      .populate('vehicleId', 'plateNumber model year manufacturer make')
      .populate('driverId', 'fullName username')
      .populate('requestedBy', 'fullName username')
      .populate('approvedBy', 'fullName username');
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
    const request = await MaintenanceRequest.findById(id)
      .populate('vehicleId', 'plateNumber model year manufacturer make')
      .populate('driverId', 'fullName username')
      .populate('requestedBy', 'fullName username')
      .populate('approvedBy', 'fullName username');
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

    // Validate allowed status transitions
    const currentStatus = request.status;
    const allowedTransitions = {
      pending: ["approved", "rejected", "completed"],
      approved: ["completed", "rejected"],
      rejected: [],
      completed: [],
    };

  if (status) {
      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Cannot change status from ${currentStatus} to ${status}.`,
        });
      }
    }
   
    if (remarks) {
      request.remarks = remarks;
    }

    
    if (status) {
     
      if (status === "approved" && !request.approvedBy) {
        request.approvedBy = req.user.id;
        request.approvedDate = new Date();
        try {
          const reqDoc = await User.findById(request.requestedBy).select('fullName username email');
          const requestedByName = reqDoc?.fullName || reqDoc?.username || reqDoc?.email;
          await Notification.create({
            user: request.requestedBy,
            type: 'maintenance',
            entityId: request._id,
            title: 'Maintenance approved',
            message: 'Your maintenance request has been approved.',
            actionUrl: `/maintenance?highlight=${request._id}`,
            meta: {
              vehiclePlate: (await Vehicle.findById(request.vehicleId).select('plateNumber'))?.plateNumber,
              category: request.category,
              priority: request.priority,
              newStatus: 'approved',
              requestedByName,
              driverName: requestedByName,
            }
          });
        } catch (e) { console.error('Notif create error:', e.message); }
      }

      
      if (status === "completed") {
        request.completedDate = new Date();
        if (cost !== undefined) {
          request.cost = cost;
        }
        try {
          const reqDoc = await User.findById(request.requestedBy).select('fullName username email');
          const requestedByName = reqDoc?.fullName || reqDoc?.username || reqDoc?.email;
          await Notification.create({
            user: request.requestedBy,
            type: 'maintenance',
            entityId: request._id,
            title: 'Maintenance completed',
            message: 'Your maintenance request has been completed.',
            actionUrl: `/maintenance?highlight=${request._id}`,
            meta: {
              vehiclePlate: (await Vehicle.findById(request.vehicleId).select('plateNumber'))?.plateNumber,
              category: request.category,
              priority: request.priority,
              cost: request.cost ?? undefined,
              newStatus: 'completed',
              requestedByName,
              driverName: requestedByName,
            }
          });
        } catch (e) { console.error('Notif create error:', e.message); }
      }
      
      
      request.status = status;
    }

    // Allow updating cost without status change only if not already final (completed/rejected)
  if (!status && cost !== undefined) {
      if (currentStatus === 'completed' || currentStatus === 'rejected') {
        return res.status(400).json({ message: `Cannot update cost for a ${currentStatus} request.` });
      }
      request.cost = cost;
    }

    await request.save();

   
    if (status === "completed" || status === "rejected") {
      const vehicle = await Vehicle.findById(request.vehicleId);
      if (vehicle) {
        vehicle.status = "active";
        // If this was a Service category, compute a safe lastServiceKm and record it
        if (request.category === 'Service') {
          // Prefer provided serviceKm when present, otherwise fall back to vehicle.currentKm
          let proposedKm = (request.serviceKm !== undefined && request.serviceKm !== null) ? Number(request.serviceKm) : (vehicle.currentKm || 0);

          // Ensure we don't regress below the vehicle's currentKm — use the greater of proposed and currentKm
          const currentKmVal = Number(vehicle.currentKm || 0);
          let lastServiceKm = Math.max(proposedKm || 0, currentKmVal);

          // Prevent regression below a previously recorded service (if any)
          const prevRecorded = Number(vehicle.previousServiceKm || 0);
          if (prevRecorded > 0 && lastServiceKm < prevRecorded) {
            // If provided km is less than previous recorded service, clamp to previous recorded value
            lastServiceKm = prevRecorded;
            console.warn(`Service km ${proposedKm} is less than previously recorded service km ${prevRecorded}; clamping to previous.`);
          }

          vehicle.serviceHistory = vehicle.serviceHistory || [];
          vehicle.serviceHistory.push({ km: lastServiceKm, date: request.completedDate || new Date(), notes: request.description || request.remarks || '', performedBy: request.approvedBy || null });

          // Update previousServiceKm so virtuals compute nextServiceKm = previousServiceKm + serviceIntervalKm
          vehicle.previousServiceKm = lastServiceKm;

          // If the service reading is ahead of stored currentKm, update the vehicle's currentKm to keep values consistent
          if (lastServiceKm > currentKmVal) {
            vehicle.currentKm = lastServiceKm;
          }

        }
        await vehicle.save();
      }
      if (status === 'rejected') {
        try {
          const reqDoc = await User.findById(request.requestedBy).select('fullName username email');
          const requestedByName = reqDoc?.fullName || reqDoc?.username || reqDoc?.email;
          await Notification.create({
            user: request.requestedBy,
            type: 'maintenance',
            entityId: request._id,
            title: 'Maintenance rejected',
            message: 'Your maintenance request has been rejected.',
            actionUrl: `/maintenance?highlight=${request._id}`,
            meta: {
              vehiclePlate: (await Vehicle.findById(request.vehicleId).select('plateNumber'))?.plateNumber,
              category: request.category,
              priority: request.priority,
              newStatus: 'rejected',
              requestedByName,
              driverName: requestedByName,
            }
          });
        } catch (e) { console.error('Notif create error:', e.message); }
      }
    }

    // compute next service info if we updated the vehicle above
    let nextServiceInfo = null;
    try {
      const vehicleAfter = await Vehicle.findById(request.vehicleId);
      if (vehicleAfter) {
        const last = Number(vehicleAfter.previousServiceKm || vehicleAfter.initialKm || 0);
        const interval = Number(vehicleAfter.serviceIntervalKm || 0);
        if (interval > 0) {
          const nextKm = last + interval;
          const currentKmVal = Number(vehicleAfter.currentKm || 0);
          nextServiceInfo = {
            lastServiceKm: last,
            nextServiceKm: nextKm,
            kilometersUntilNextService: nextKm - currentKmVal,
          };
        }
      }
    } catch (e) {
      // ignore errors computing next service info
      console.error('Error computing next service info:', e.message);
    }

    return res.status(200).json({
            message: status ? `Maintenance request has been ${status}.` : 'Maintenance request updated.',
           request,
           nextServiceInfo
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

    // Find vehicles assigned to this user (if any)
    const assignedVehicles = await Vehicle.find({ assignedDriver: userId }).select('_id');
    const vehicleIds = assignedVehicles.map(v => v._id);

    // Find maintenance requests either requested by the user OR for vehicles assigned to them
    const query = {
      $or: [
        { requestedBy: userId },
      ],
    };
    if (vehicleIds.length > 0) {
      query.$or.push({ vehicleId: { $in: vehicleIds } });
    }

    const requests = await MaintenanceRequest.find(query)
      .populate('vehicleId', 'plateNumber model year manufacturer make')
      .populate('driverId', 'fullName username')
      .populate('requestedBy', 'fullName username')
      .populate('approvedBy', 'fullName username');

    // Return 200 with an array (empty if none) to simplify client handling
    return res.status(200).json(requests);
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




