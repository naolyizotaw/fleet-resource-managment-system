const express = require("express");
const {
    convertMaintenanceToWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    assignMechanic,
    addSpareParts,
    addLaborCost,
    updateProgress,
    completeWorkOrder,
    deleteWorkOrder,
} = require("../controllers/workOrderController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// All work order routes require a valid token
router.use(verifyToken);

// Convert maintenance request to work order
router.post("/convert/:maintenanceId", authorizeRoles("manager", "admin"), convertMaintenanceToWorkOrder);

// Get all work orders
router.get("/", authorizeRoles("manager", "admin"), getAllWorkOrders);

// Get work order by ID
router.get("/:id", getWorkOrderById);

// Assign mechanic
router.patch("/:id/assign", authorizeRoles("manager", "admin"), assignMechanic);

// Add spare parts
router.patch("/:id/parts", authorizeRoles("manager", "admin"), addSpareParts);

// Add labor cost
router.patch("/:id/labor", authorizeRoles("manager", "admin"), addLaborCost);

// Update progress (mechanics can also update)
router.patch("/:id/progress", updateProgress);

// Complete work order
router.patch("/:id/complete", authorizeRoles("manager", "admin"), completeWorkOrder);

// Delete work order
router.delete("/:id", authorizeRoles("admin"), deleteWorkOrder);

module.exports = router;
