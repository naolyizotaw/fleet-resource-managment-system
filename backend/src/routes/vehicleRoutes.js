const express = require("express");
const {
    createVehicle,
    getVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
    markVehicleService,
    getVehicleLocations,
    updateVehicleLocation,
    generateTrackingToken,
    getVehicleRoute,
    getVehicleTrips,
    clearLocationHistory
} = require("../controllers/vehicleController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// Per-route auth: allow drivers to fetch their vehicles, others limited
router.post("/", verifyToken, authorizeRoles("admin", "manager"), createVehicle);
router.get("/", verifyToken, authorizeRoles("admin", "manager"), getVehicles);
// Get all vehicle locations for map display
router.get("/locations", verifyToken, authorizeRoles("admin", "manager"), getVehicleLocations);
// Add a route for drivers/users to get their assigned vehicle(s)
router.get("/mine", verifyToken, authorizeRoles("admin", "manager", "driver", "user"), async (req, res) => {
    try {
        const Vehicle = require("../models/vehicleModel");
        const query = (req.user.role === 'admin' || req.user.role === 'manager')
            ? {}
            : { assignedDriver: req.user.id };
        const vehicles = await Vehicle.find(query).populate({ path: 'assignedDriver', select: 'username role' });
        return res.status(200).json(vehicles);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});
router.get("/:id", verifyToken, authorizeRoles("admin", "manager"), getVehicleById);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager"), updateVehicle);
// Update vehicle location manually (for map feature)
router.put("/:id/location", verifyToken, authorizeRoles("admin", "manager"), updateVehicleLocation);
// Generate or regenerate tracking token for GPS tracking
router.post("/:id/tracking-token", verifyToken, authorizeRoles("admin", "manager"), generateTrackingToken);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteVehicle);
// record a service event
router.post('/:id/service', verifyToken, authorizeRoles('admin', 'manager'), markVehicleService);

// GPS Route History endpoints
router.get('/:id/route', verifyToken, authorizeRoles('admin', 'manager'), getVehicleRoute);
router.get('/:id/trips', verifyToken, authorizeRoles('admin', 'manager'), getVehicleTrips);
router.delete('/:id/location-history', verifyToken, authorizeRoles('admin'), clearLocationHistory);



module.exports = router;