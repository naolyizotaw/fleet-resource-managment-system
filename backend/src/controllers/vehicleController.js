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
        const vehicle = await Vehicle.create(data);
        console.log(vehicle);
        return res.status(201).json(vehicle);
         
        
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
        const vehicles = await Vehicle.find({});
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
        const vehicle = await Vehicle.findById(id);
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
        const updatedVehicle = await Vehicle.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
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
