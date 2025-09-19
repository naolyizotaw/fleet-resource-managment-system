const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const PerDiemRequest = require('../models/perDiemRequest');
const mongoose = require('mongoose');


//@desc Create a new per diem request from a form
//@route POST /api/per-diem/
//@access private (driver, manager, admin)

const createPerDiemRequest = async (req, res) => {
    try {
        const { vehicleId, purpose, destination, startDate, endDate, numberOfDays } = req.body;

        if ( !vehicleId || !purpose || !destination || !startDate || !endDate || !numberOfDays) {
            return res.status(400).json({ message: 'vehicleId, purpose, destination, startDate, endDate, and numberOfDays are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({ message: 'Invalid vehicle ID format' });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingRequest = await PerDiemRequest.findOne({
            driverId: user.id,
            status: 'pending'
        });
        if (existingRequest) {
            return res.status(409).json({ 
                message: 'There is already a pending per diem request for this user.',
                requestId: existingRequest._id,
                status: existingRequest.status
            });
        }

        const perDiemRequest = new PerDiemRequest({
            vehicleId,
            driverId: req.user.id,
            requestedBy: req.user.id,
            purpose,
            destination,
            numberOfDays,
            startDate,
            endDate,
        });

        await perDiemRequest.save();

        const populated = await PerDiemRequest.findById(perDiemRequest._id)
            .populate({ path: 'vehicleId', populate: { path: 'assignedDriver', select: 'fullName username email' } })
            .populate('approvedBy', 'fullName username email')
            .populate('driverId', 'fullName username email')
            .populate('requestedBy', 'fullName username email');

        return res.status(201).json({
            message: 'Per diem request form submitted successfully',
            perDiemRequest: populated
        });

    } catch (err) {
        console.error("Error creating per diem request:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed', error: err.message });
        }
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Get all per diem requests
//@route GET /api/per-diem/
//@access private (manager, admin)
const getPerDiemRequests = async (req, res) => {
    try{
        const perDiemRequest = await PerDiemRequest.find({})
            .populate({ path: 'vehicleId', populate: { path: 'assignedDriver', select: 'fullName username email' } })
            .populate('approvedBy', 'fullName username email')
            .populate('driverId', 'fullName username email')
            .populate('requestedBy', 'fullName username email');
        return res.status(200).json(perDiemRequest);
    } catch (err) {
        console.error("Error fetching per-diem requests:", err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}; 


//@desc Get per-diem requests by id
//@route GET /api/per-diem/:id
//@access private (admin, manager)
const getPerDiemRequestById = async (req, res) => {
    try {
        const { id } = req.params;
         if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid perdiam request ID format' });
         }
        const perDiamRequest = await PerDiemRequest.findById(id)
            .populate({ path: 'vehicleId', populate: { path: 'assignedDriver', select: 'fullName username email' } })
            .populate('approvedBy', 'fullName username email')
            .populate('driverId', 'fullName username email')
            .populate('requestedBy', 'fullName username email');
        if (!perDiamRequest) {
            return res.status(404).json({ message: 'Per-diam request not found' });
        }
        return res.status(200).json(perDiamRequest);
    } catch (err) {
        console.error("Error fetching Per-diam request by ID:", err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Update a per Diem request (approve/reject)
//@route PUT /api/per-diem/:id
//@access private (manager, admin)
const updatePerDiemRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, ...otherUpdatableFields } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid Per Diem request ID format' });
        }

        const perDiemRequest = await PerDiemRequest.findById(id);
        if (!perDiemRequest) {
            return res.status(404).json({ message: 'Per Diem request not found' });
        }

        let message = 'Per Diem request updated successfully.';

        // Handle status updates (approval/rejection)
        if (status) {
            if (perDiemRequest.status !== 'pending') {
                return res.status(400).json({ message: `This request has already been ${perDiemRequest.status}.` });
            }
            if (status === 'approved') {
                perDiemRequest.status = 'approved';
                perDiemRequest.approvedBy = req.user.id;
                perDiemRequest.issuedDate = new Date();
                message = `Per-Diem request has been approved.`;
            } else if (status === 'rejected') {
                perDiemRequest.status = 'rejected';
                perDiemRequest.approvedBy = req.user.id;
                message = `Per-Diem request has been rejected.`;
            } else {
                return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'." });
            }
        }

        // Handle other field updates for editable requests
        if (Object.keys(otherUpdatableFields).length > 0) {
            // Allow edits only if the request is pending or if the user is an admin
            if (perDiemRequest.status !== 'pending' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Cannot edit a request that is not pending.' });
            }
            Object.assign(perDiemRequest, otherUpdatableFields);
        }

    const updatedRequest = await perDiemRequest.save();
    await updatedRequest.populate({ path: 'vehicleId', populate: { path: 'assignedDriver', select: 'fullName username email' } });
    await updatedRequest.populate('approvedBy', 'fullName username email');
    await updatedRequest.populate('driverId', 'fullName username email');
    await updatedRequest.populate('requestedBy', 'fullName username email');

        return res.status(200).json(updatedRequest);

    } catch (err) {
        console.error("Error updating per diem request:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed', error: err.message });
        }
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//@desc Delete per-diem requests by id
//@route DELETE /api/per-diem/:id
//@access private (admin, manager)
const deletePerDiemRequest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid Request id' });
        }
        const deletedPerDiemRequest = await PerDiemRequest.findByIdAndDelete(id);
        if (!deletedPerDiemRequest) {
            return res.status(404).json({ message: 'Per Diem request not found' });
        }
        return res.status(200).json({ message: "Request Deleted Successfully!" });
    } catch (err) {
        
        console.error("Error Deleting Per Diem request:", err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

//@desc Get per diem requests for the current user
//@route GET /api/per-diem/my
//@access private (driver)
const getMyPerDiemRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find vehicles assigned to the current user
        const userVehicles = await Vehicle.find({ assignedDriver: userId });
        const vehicleIds = userVehicles.map(vehicle => vehicle._id);

        // Find per diem requests for the user's assigned vehicles or requested by the user
        const requests = await PerDiemRequest.find({
            $or: [
                { vehicleId: { $in: vehicleIds } },
                { requestedBy: userId }
            ]
        })
            .populate({ path: 'vehicleId', populate: { path: 'assignedDriver', select: 'fullName username email' } })
            .populate('approvedBy', 'fullName username email')
            .populate('driverId', 'fullName username email')
            .populate('requestedBy', 'fullName username email');

        if (!requests || requests.length === 0) {
            return res.status(404).json({ message: "No per diem requests found for this user" });
        }

        res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching user per diem requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createPerDiemRequest,
    getPerDiemRequests,
    getPerDiemRequestById,
    updatePerDiemRequest,
    deletePerDiemRequest,
    getMyPerDiemRequests
};
