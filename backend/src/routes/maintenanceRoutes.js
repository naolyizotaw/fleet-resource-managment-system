const express = require("express");
const {
    createMaintenance,
    getMaintenances,
    getMaintenanceById,
    updateMaintenance,
    deleteMaintenance
} = require("../controllers/maintenanceController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// All maintenance routes require a valid token
router.use(verifyToken);

// Create request: driver, manager, admin
router.post("/", authorizeRoles("driver", "manager", "admin"), createMaintenance);
router.get("/", authorizeRoles("manager", "admin"), getMaintenances);
router.get("/:id", getMaintenanceById);
router.put("/:id", authorizeRoles("manager", "admin"), updateMaintenance);
router.delete("/:id", authorizeRoles("admin"), deleteMaintenance);


module.exports = router;