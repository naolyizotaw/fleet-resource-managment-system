const Vehicle = require('../models/vehicleModel'); // vehicle model
const mongoose = require('mongoose');

//@desc Register New Vehicle 
//@route POST /api/vehicles/
//@access private
const createVehicle = async (req, res) => {
    try {
        const data = req.body;

        // Duplicate check by plateNumber 
        if (data?.plateNumber) {
            const exists = await Vehicle.findOne({ plateNumber: data.plateNumber });
            if (exists) {
                return res.status(409).json({ message: `Vehicle with plateNumber: ${data.plateNumber} already exists` });
            }
        } 
        // Business rule: a driver can be assigned to only one vehicle
        if (data?.assignedDriver) {
            const taken = await Vehicle.findOne({ assignedDriver: data.assignedDriver });
            if (taken) {
                // Prefer plateNumber for a readable error; fall back to id to match other messages
                if (taken.plateNumber) {
                    return res.status(409).json({ message: `Driver is already assigned to vehicle with plateNumber: ${taken.plateNumber}` });
                }
                return res.status(409).json({ message: `Driver is already assigned to vehicle with id: ${taken._id}` });
            }
        }
    const vehicle = await Vehicle.create(data);
    const populated = await vehicle.populate({ path: 'assignedDriver', select: 'fullName username role' });
        console.log(populated);
        return res.status(201).json(populated);
         
        
    } catch (err) {
        // Duplicate key from MongoDB unique index (fallback)
        if (err && err.code === 11000) {
            const field = Object.keys(err.keyValue || {})[0] || 'plateNumber';
            return res.status(409).json({ message: `Vehicle with this ${field} already exists` });
        }

        const status = err.name === 'ValidationError' ? 400 : 500;
        return res.status(status).json({ message: err.message });
    }
};



//@desc Get vehicle List
//@route POST /api/vehicles/get
//@access admin/manager
const getVehicles = async (req, res) => {
    try {
    const vehicles = await Vehicle.find({}).populate({ path: 'assignedDriver', select: 'fullName username role' });
        return res.status(200).json(vehicles);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};



//@desc Get vehicle by id
//@route GET /api/vehicles/:id
//@access private (admin, manager)
const getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid vehicle id' });
        }
    const vehicle = await Vehicle.findById(id).populate({ path: 'assignedDriver', select: 'fullName username role' });
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        return res.status(200).json(vehicle);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

//@desc createVehicle 
//@route POST /api/vehicles/create
//@access public
const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid vehicle id' });
        }
        // If attempting to assign a driver, ensure that driver is not already assigned
        if (req.body && req.body.hasOwnProperty('assignedDriver') && req.body.assignedDriver) {
            const existing = await Vehicle.findOne({ assignedDriver: req.body.assignedDriver });
            if (existing && existing._id.toString() !== id) {
                if (existing.plateNumber) {
                    return res.status(409).json({ message: `Driver is already assigned to vehicle with plateNumber: ${existing.plateNumber}` });
                }
                return res.status(409).json({ message: `Driver is already assigned to vehicle with id: ${existing._id}` });
            }
        }

        const updatedVehicle = await Vehicle.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
            .populate({ path: 'assignedDriver', select: 'fullName username role' });
        if (!updatedVehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        return res.status(200).json(updatedVehicle);
    } catch (err) {
        const status = err.name === 'ValidationError' ? 400 : 500;
        return res.status(status).json({ message: err.message });
    }
};

//@desc createVehicle 
//@route POST /api/vehicles/create
//@access public
const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid vehicle id' });
        }
        const deletedVehicle = await Vehicle.findByIdAndDelete(id);
        if (!deletedVehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        return res.status(200).json({ message: 'Vehicle deleted successfully' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createVehicle,
    getVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle
};
