const express = require("express");
const {
    createInventoryItem,
    getInventoryItems,
    getInventoryById,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,
    getLowStockItems,
    getStockHistory,
    getInventoryStats,
} = require("../controllers/inventoryController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// Statistics endpoint (must be before /:id to avoid route conflict)
router.get(
    "/stats",
    verifyToken,
    authorizeRoles("admin", "manager"),
    getInventoryStats
);

// Low stock items endpoint
router.get(
    "/low-stock",
    verifyToken,
    authorizeRoles("admin", "manager"),
    getLowStockItems
);

// CRUD operations
router.post(
    "/",
    verifyToken,
    authorizeRoles("admin", "manager"),
    createInventoryItem
);

router.get(
    "/",
    verifyToken,
    authorizeRoles("admin", "manager", "user"),
    getInventoryItems
);

router.get(
    "/:id",
    verifyToken,
    authorizeRoles("admin", "manager", "user"),
    getInventoryById
);

router.put(
    "/:id",
    verifyToken,
    authorizeRoles("admin", "manager"),
    updateInventoryItem
);

router.delete(
    "/:id",
    verifyToken,
    authorizeRoles("admin"),
    deleteInventoryItem
);

// Stock adjustment endpoint
router.patch(
    "/:id/adjust",
    verifyToken,
    authorizeRoles("admin", "manager"),
    adjustStock
);

// Stock history endpoint
router.get(
    "/:id/history",
    verifyToken,
    authorizeRoles("admin", "manager"),
    getStockHistory
);

module.exports = router;
