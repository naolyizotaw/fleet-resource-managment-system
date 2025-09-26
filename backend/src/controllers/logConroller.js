const DriverLog = require('../models/logModel');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

//@desc Create a new driver log
//@route POST /api/logs/
//@access private (driver, manager, admin)
const createLog = async (req, res) => {
    try {
        const { vehicleId, startKm: bodyStartKm, endKm: bodyEndKm, remarks, date } = req.body;

        if (!vehicleId || bodyStartKm === undefined || bodyEndKm === undefined) {
            return res.status(400).json({ message: "vehicleId, startKm, and endKm are required" });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
          return res.status(404).json({ message: "Vehicle not found" });
        }

        const userId = req.user.id;

        const lastLog = await DriverLog.findOne({ vehicleId }).sort({ date: -1 });

        // Determine the expected start KM for this new log
        let startKmToUse;
        if (lastLog) {
            startKmToUse = lastLog.endKm;
            if (date) {
                const logDate = new Date(date);
                if (logDate < lastLog.date) {
                    return res.status(400).json({ message: "Log date cannot be earlier than the last log date for this vehicle" });
                }
            }
        } else {
            startKmToUse = vehicle.currentKm ?? 0;
        }

        const startKmNum = parseFloat(bodyStartKm);
        const endKmNum = parseFloat(bodyEndKm);

        if (endKmNum <= startKmToUse) {
            return res.status(400).json({ message: "End KM must be greater than Start Km"});
        }

        const distance = endKmNum - startKmToUse;
        if (distance > 1500) {
            return res.status(400).json({message: `Distance ${distance} Km exceeds daily limit`});
        }

        const log = new DriverLog({
            driverId: userId,
            vehicleId,
            date: date ? new Date(date) : new Date(),
            startKm: startKmToUse,
            endKm: endKmNum,
            distance,
            remarks
        });

        // update vehicle currentKm and save
        vehicle.currentKm = endKmNum;
        await vehicle.save();

        await log.save();

        res.status(201).json({ message: "Log created successfully", log });
    } catch (error) {
        console.error("Error creating log:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


//@desc Update a new driver log
//@route PUT /api/logs/
//@access private (driver, manager, admin)

const updateLog = async (req, res) => {
    try {
        const { id } = req.params;
        const { startKm: bodyStartKm, endKm: bodyEndKm, remarks, date } = req.body;

        const log = await DriverLog.findById(id);
        if (!log) return res.status(404).json({ message: "Log not found!" });

        if (!log.isEditable) return res.status(403).json({ message: "Log is locked" });

        const prevLog = await DriverLog.findOne({
            vehicleId: log.vehicleId,
            date: { $lt: log.date }
        }).sort({ date: -1 });

        const startKmNum = parseFloat(bodyStartKm);
        const endKmNum = parseFloat(bodyEndKm);

        if (prevLog && startKmNum !== prevLog.endKm) {
            return res.status(400).json({ message: `Start Km must match previous day's end Km (${prevLog.endKm})` });
        }

        if (endKmNum <= startKmNum) {
            return res.status(400).json({ message: 'End Km must be greater than Start Km' });
        }

        log.startKm = startKmNum;
        log.endKm = endKmNum;
        if (remarks !== undefined) log.remarks = remarks;
        if (date) log.date = new Date(date);
        log.distance = endKmNum - startKmNum;
        await log.save();

        const latestLog = await DriverLog.findOne({ vehicleId: log.vehicleId }).sort({ date: -1 });
        if (latestLog && latestLog._id.toString() === log._id.toString()) {
            await Vehicle.findByIdAndUpdate(log.vehicleId, { currentKm: endKmNum });
        }

        res.json({ message: `Log updated successfully!`, log });

    } catch (error) {
        console.error("Error updating log:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


//@desc Get all driver logs
//@route GET /api/logs/
//@access private (manager, admin)
const getLogs = async (req, res) => {
    try {
        const logs = await DriverLog.find()
            .populate('driverId', 'name fullName username')
            .populate('vehicleId', 'plateNumber manufacturer model year');
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
        const log = await DriverLog.findById(id)
            .populate('driverId', 'name fullName username')
            .populate('vehicleId', 'plateNumber manufacturer model year');

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
            .populate('driverId', 'name fullName username')
            .populate('vehicleId', 'plateNumber manufacturer model year');

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

//@desc Get logs for the current user
//@route GET /api/logs/my
//@access private (driver)
const getMyLogs = async (req, res) => {
    try {
        const userId = req.user.id;

        const logs = await DriverLog.find({ driverId: userId })
            .populate('vehicleId', 'plateNumber manufacturer model year');

        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: "No logs found for this user" });
        }

        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching user logs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createLog,
    updateLog,
    getLogs,
    getLogById,
    getLogByVehicle,
    deleteLog,
    getMyLogs
};