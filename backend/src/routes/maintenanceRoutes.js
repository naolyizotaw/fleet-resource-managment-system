const express = require("express");
const {
    createMaintenance,
    getMaintenances,
    getMaintenanceById,
    updateMaintenance,
    deleteMaintenance,
    getMyMaintenanceRequests
} = require("../controllers/maintenanceController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { uploadMaintenanceImages } = require("../middlewares/upload");

const router = express.Router();

// All maintenance routes require a valid token
router.use(verifyToken);

// Create request: driver, manager, admin (with image upload support)
router.post("/", authorizeRoles("driver", "manager", "admin", "user"), uploadMaintenanceImages, createMaintenance);
router.get("/my", authorizeRoles("driver", "user"), getMyMaintenanceRequests);
router.get("/", authorizeRoles("manager", "admin"), getMaintenances);
router.get("/:id", getMaintenanceById);
router.patch("/:id", authorizeRoles("manager", "admin"), updateMaintenance);
router.delete("/:id", authorizeRoles("admin"), deleteMaintenance);


module.exports = router;