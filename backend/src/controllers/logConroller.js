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

        // Normalize the intended log date and restrict to one log per vehicle per day
        const logDate = date ? new Date(date) : new Date();
        const dayStart = new Date(logDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(logDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingLogSameDay = await DriverLog.findOne({
            vehicleId,
            date: { $gte: dayStart, $lte: dayEnd }
        });
        if (existingLogSameDay) {
            return res.status(409).json({ message: "A log for this vehicle already exists for this date" });
        }

        const lastLog = await DriverLog.findOne({ vehicleId }).sort({ date: -1 });

        // Determine the expected start KM for this new log
        let startKmToUse;
        if (lastLog) {
            startKmToUse = lastLog.endKm;
            if (date) {
                const providedLogDate = new Date(date);
                if (providedLogDate < lastLog.date) {
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
            driverId: vehicle.assignedDriver,
            loggedBy: userId,
            vehicleId,
            date: logDate,
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
        if (error && error.code === 11000) {
            return res.status(409).json({ message: "A log for this vehicle already exists for this date" });
        }
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

        // Determine target date for the update (either provided or existing)
        const targetDate = date ? new Date(date) : new Date(log.date);

        // Prevent multiple logs for the same vehicle in the same day (exclude current log)
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const conflictingLog = await DriverLog.findOne({
            vehicleId: log.vehicleId,
            date: { $gte: dayStart, $lte: dayEnd },
            _id: { $ne: id }
        });
        if (conflictingLog) {
            return res.status(409).json({ message: "Another log for this vehicle already exists for this date" });
        }

        const prevLog = await DriverLog.findOne({
            vehicleId: log.vehicleId,
            date: { $lt: targetDate }
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
        if (date) log.date = targetDate;
        log.distance = endKmNum - startKmNum;
        await log.save();

        const latestLog = await DriverLog.findOne({ vehicleId: log.vehicleId }).sort({ date: -1 });
        if (latestLog && latestLog._id.toString() === log._id.toString()) {
            await Vehicle.findByIdAndUpdate(log.vehicleId, { currentKm: endKmNum });
        }

        res.json({ message: `Log updated successfully!`, log });

    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({ message: "Another log for this vehicle already exists for this date" });
        }
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
            .populate('vehicleId', 'plateNumber manufacturer model year')
            .populate('loggedBy', 'name fullName username');
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

        // First, find the log to be deleted to get its details
        const logToDelete = await DriverLog.findById(id);
        if (!logToDelete) {
            return res.status(404).json({ message: "Log not found" });
        }

        // Permission checks: admins can delete any, managers can delete any, users can delete only their own editable logs
        const role = req.user && req.user.role;
        const requesterId = req.user && req.user.id;
        const isAdmin = role === 'admin';
        const isManager = role === 'manager';
        const isOwner = requesterId && logToDelete.driverId && logToDelete.driverId.toString() === requesterId.toString();

        // Note: roleMiddleware maps 'driver' to 'user' for checks, but token role may be 'user' for drivers
        if (!isAdmin && !isManager) {
            // Only owner may delete and only if editable
            if (!isOwner) {
                return res.status(403).json({ message: "You can only delete your own log" });
            }
            if (!logToDelete.isEditable) {
                return res.status(403).json({ message: "This log is locked and cannot be deleted" });
            }
        }

        const { vehicleId } = logToDelete;

        // Find the current latest log for the vehicle
        const latestLog = await DriverLog.findOne({ vehicleId }).sort({ date: -1, createdAt: -1 });

        // Now, delete the log
        await DriverLog.findByIdAndDelete(id);

        // Check if the deleted log was the latest one
        if (latestLog && latestLog._id.toString() === id) {
            // The deleted log was the most recent one. We need to find the *new* latest log.
            const newLatestLog = await DriverLog.findOne({ vehicleId }).sort({ date: -1, createdAt: -1 });

            let newCurrentKm;

            if (newLatestLog) {
                // If there's a new latest log, use its endKm
                newCurrentKm = newLatestLog.endKm;
            } else {
                // No logs are left for this vehicle.
                // Revert to the vehicle's initial KM.
                // We can find the oldest log to get the initial startKm.
                const oldestLog = await DriverLog.findOne({ vehicleId }).sort({ date: 1, createdAt: 1 });
                
                // The startKm of the very first log should be the original Km of the vehicle.
                // If even that is gone (or never existed), we look at the vehicle itself.
                // But since we just deleted the last log, we can look at the deleted log's details.
                // A better approach is to find the first log ever created for the vehicle to find its initial state.
                // However, an even simpler logic is to use the startKm of the log we are deleting if it was the only one.
                
                // Let's find the vehicle to update it.
                const vehicle = await Vehicle.findById(vehicleId);
                if (vehicle) {
                    // To be safe, let's find the first log ever created for this vehicle to determine the original Km
                    // This is a bit tricky because we've already deleted one.
                    // The logToDelete holds the data of the deleted log.
                    // If it was the only log, its startKm should be the vehicle's original Km.
                    
                    // Let's check if any logs remain. We already did with newLatestLog.
                    // If newLatestLog is null, no logs remain.
                    // We will set the currentKm to the startKm of the log we just deleted,
                    // as it represents the state before that trip.
                    newCurrentKm = logToDelete.startKm;
                }
            }

            if (newCurrentKm !== undefined) {
                await Vehicle.findByIdAndUpdate(vehicleId, { currentKm: newCurrentKm });
            }
        }

        res.status(200).json({ message: "Log deleted successfully" });
    } catch (error) {
        console.error("Error deleting log:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

//@desc Get logs for the current user
//@route GET /api/logs/my
//@access private (driver, user)
const getMyLogs = async (req, res) => {
    try {
        const userId = req.user.id;

        const logs = await DriverLog.find({ driverId: userId })
            .populate('driverId', 'name fullName username')
            .populate('vehicleId', 'plateNumber manufacturer model year')
            .populate('loggedBy', 'name fullName username');

        // Return empty list instead of 404 so frontend can render gracefully
        return res.status(200).json(logs || []);
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