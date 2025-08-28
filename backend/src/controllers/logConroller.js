const DriverLog = require('../models/logModel');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

//@desc Create a new driver log
//@route POST /api/logs/
//@access private (driver, manager, admin)
const createLog = async (req, res) => {
    try {
        const { vehicleId, startKm, endKm, remarks } = req.body;

        if (!vehicleId || !startKm || !endKm) {
            return res.status(400).json({ message: "vehicleId, startKm, and endKm are required" });
        }

        const vehicle = await Vehicle.findById(vehicleId);
            if (!vehicle) {
              return res.status(404).json({ message: "Vehicle not found" });
            }

        const userId = req.user.id;

        const log = new DriverLog({
            driverId: userId,
            vehicleId, 
            startKm,
            endKm,
            remarks
        });

        await log.save();

        res.status(201).json({ message: "Log created successfully", log });
    } catch (error) {
        console.error("Error creating log:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


//@desc Get all driver logs
//@route GET /api/logs/
//@access private (manager, admin)
const getLogs = async (req, res) => {
    try {
        const logs = await DriverLog.find().populate('driverId', 'name').populate('vehicleId', 'plateNumber');
        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}; 


//@desc Get a driver log by ID
//@route GET /api/logs/:id
//@access private (manager, admin)
const getLogById = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await DriverLog.findById(id).populate('driverId', 'name').populate('vehicleId', 'plateNumber');

        if (!log) {
            return res.status(404).json({ message: "Log not found" });
        }

        res.status(200).json(log);
    } catch (error) {
        console.error("Error fetching log:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

//@desc Get logs by vehicle ID
//@route GET /api/logs/vehicle/:vehicleId
//@access private (manager, admin)
const getLogByVehicle = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        const logs = await DriverLog.find({ vehicleId })
            .populate('driverId', 'name')
            .populate('vehicleId', 'plateNumber');

        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: "No logs found for this vehicle" });
        }

        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching logs by vehicle:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}; 


//@desc Delete a driver log
//@route DELETE /api/logs/:id
//@access private (admin)
const deleteLog = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await DriverLog.findByIdAndDelete(id);

        if (!log) {
            return res.status(404).json({ message: "Log not found" });
        }

        res.status(200).json({ message: "Log deleted successfully" });
    } catch (error) {
        console.error("Error deleting log:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


module.exports = {
    createLog,
    getLogs,
    getLogById,
    getLogByVehicle,
    deleteLog
};