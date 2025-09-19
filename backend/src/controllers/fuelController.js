const FuelRequest = require('../models/fuelRequest');
const Vehicle = require('../models/vehicleModel');
const mongoose = require('mongoose');

//@desc Create a new fuel request from a form
//@route POST /api/fuel/
//@access private (driver, manager, admin)
const createFuelRequest = async (req, res) => {
    try {
        const { vehicleId, fuelType, quantity, currentKm, purpose } = req.body;

        if (!vehicleId || !fuelType || quantity === undefined || currentKm === undefined || !purpose) {
            return res.status(400).json({ message: 'vehicleId, fuelType, quantity, currentKm, and purpose are required' });
        }

        
        const existingRequest = await FuelRequest.findOne({
            vehicleId,
            status: 'pending'
        });
        if (existingRequest) {
            return res.status(409).json({ message: 'There is already a pending fuel request for this vehicle.' });
        }

      
        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({ message: 'Invalid vehicle ID format' });
        }
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        
        const fuelRequest = new FuelRequest({
            vehicleId,
            driverId: req.user.id, 
            requestedBy: req.user.id,
            fuelType,
            quantity,
            currentKm,
            purpose
        });

        await fuelRequest.save();

        vehicle.currentKm = currentKm;
        await vehicle.save();

        const populated = await FuelRequest.findById(fuelRequest._id)
            .populate('vehicleId', 'plateNumber manufacturer model year')
            .populate('driverId', 'fullName username')
            .populate('requestedBy', 'fullName username')
            .populate('approvedBy', 'fullName username');

        return res.status(201).json({
            message: 'Fuel request form submitted successfully',
            fuelRequest: populated
        });

    } catch (err) {
        console.error("Error creating fuel request:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed', error: err.message });
        }
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Get all fuel requests
//@route GET /api/fuel/
//@access private (manager, admin)
const getFuelRequests = async (req, res) => {
    try{
        const fuelRequests = await FuelRequest.find({})
            .populate('vehicleId', 'plateNumber manufacturer model year')
            .populate('driverId', 'fullName username')
            .populate('requestedBy', 'fullName username')
            .populate('approvedBy', 'fullName username');
        return res.status(200).json(fuelRequests);
    } catch (err) {
        console.error("Error fetching fuel requests:", err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//@desc Get fuel requests by id
//@route GET /api/fuel/:id
//@access private (admin, manager)
const getFuelRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid fuel request ID format' });
        }
        const fuelRequest = await FuelRequest.findById(id)
            .populate('vehicleId', 'plateNumber manufacturer model year')
            .populate('driverId', 'fullName username')
            .populate('requestedBy', 'fullName username')
            .populate('approvedBy', 'fullName username');
        if (!fuelRequest) {
            return res.status(404).json({ message: 'Fuel request not found' });
        }
        return res.status(200).json(fuelRequest);
    } catch (err) {
        console.error("Error fetching fuel request:", err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Update a fuel request (approve/reject)
//@route PUT /api/fuel/:id
//@access private (manager, admin)
const updateFuelRequest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid fuel request ID format' });
        }

        const fuelRequest = await FuelRequest.findById(id);
        if (!fuelRequest) {
            return res.status(404).json({ message: 'Fuel request not found' });
        }

        const isAdminOrManager = req.user.role === 'admin' || req.user.role === 'manager';
        const isOwner = String(fuelRequest.requestedBy) === String(req.user.id);

        // If a status change is requested, only admin/manager can do it
        if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
            const { status, cost } = req.body;

            if (!isAdminOrManager) {
                return res.status(403).json({ message: 'Only managers/admins can change status' });
            }

            if (fuelRequest.status !== 'pending') {
                return res.status(400).json({ message: `This request has already been ${fuelRequest.status}.` });
            }

            if (status === 'approved') {
                fuelRequest.status = 'approved';
                fuelRequest.approvedBy = req.user.id;
                fuelRequest.issuedDate = new Date();
                if (cost !== undefined) fuelRequest.cost = cost;
            } else if (status === 'rejected') {
                fuelRequest.status = 'rejected';
                fuelRequest.approvedBy = req.user.id;
            } else {
                return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'." });
            }

            await fuelRequest.save();

            const populated = await FuelRequest.findById(id)
                .populate('vehicleId', 'plateNumber manufacturer model year')
                .populate('driverId', 'fullName username')
                .populate('requestedBy', 'fullName username')
                .populate('approvedBy', 'fullName username');

            return res.status(200).json({ message: `Fuel request has been ${status}.`, fuelRequest: populated });
        }

        // Otherwise, treat as a form edit of allowed fields
        if (!isAdminOrManager && !isOwner) {
            return res.status(403).json({ message: 'Not authorized to edit this request' });
        }

        if (fuelRequest.status !== 'pending') {
            return res.status(400).json({ message: `Only pending requests can be edited.` });
        }

        const allowed = ['vehicleId', 'fuelType', 'quantity', 'currentKm', 'purpose', 'cost'];
        const updates = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        }

        // Don't overwrite vehicleId with empty values
        if (Object.prototype.hasOwnProperty.call(updates, 'vehicleId') && !updates.vehicleId) {
            delete updates.vehicleId;
        }

        // Validate vehicle if changed
        if (updates.vehicleId) {
            if (!mongoose.Types.ObjectId.isValid(updates.vehicleId)) {
                return res.status(400).json({ message: 'Invalid vehicle ID format' });
            }
            const vehicle = await Vehicle.findById(updates.vehicleId);
            if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Apply updates
        Object.assign(fuelRequest, updates);
        await fuelRequest.save();

        // Also update vehicle.currentKm if provided
        if (updates.currentKm && fuelRequest.vehicleId) {
            await Vehicle.findByIdAndUpdate(fuelRequest.vehicleId, { currentKm: updates.currentKm });
        }

        const populated = await FuelRequest.findById(id)
            .populate('vehicleId', 'plateNumber manufacturer model year')
            .populate('driverId', 'fullName username')
            .populate('requestedBy', 'fullName username')
            .populate('approvedBy', 'fullName username');

    return res.status(200).json({ message: 'Fuel request updated successfully', fuelRequest: populated });
    } catch (err) {
    console.error('Error updating fuel request:', err);
    const status = err.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ message: err.message });
    }
};

//@desc DELETE fuel requests by id
//@route DELETE /api/fuel/:id
//@access private (admin, manager)
const deleteFuelRequest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid Request id' });
        }
        const deletedFuelRequest = await FuelRequest.findByIdAndDelete(id);
        if (!deletedFuelRequest) {
            return res.status(404).json({ message: 'Fuel request not found' });
        }
        return res.status(200).json({ message: "Request Deleted Successfully!" });
    } catch (err) {
        
        console.error("Error Deleting fuel request:", err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Get fuel requests for the current user
//@route GET /api/fuel/my
//@access private (driver)
const getMyFuelRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find vehicles assigned to the current user
        const userVehicles = await Vehicle.find({ assignedDriver: userId });
        const vehicleIds = userVehicles.map(vehicle => vehicle._id);

        // Find fuel requests for the user's assigned vehicles or requested by the user
        const requests = await FuelRequest.find({
            $or: [
                { vehicleId: { $in: vehicleIds } },
                { requestedBy: userId }
            ]
        })
            .populate('vehicleId', 'plateNumber manufacturer model year')
            .populate('driverId', 'fullName username')
            .populate('requestedBy', 'fullName username')
            .populate('approvedBy', 'fullName username');

        if (!requests || requests.length === 0) {
            return res.status(404).json({ message: "No fuel requests found for this user" });
        }

        res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching user fuel requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createFuelRequest,
    getFuelRequests,
    getFuelRequestById,
    updateFuelRequest,
    deleteFuelRequest,
    getMyFuelRequests
};
