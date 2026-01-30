const Inventory = require("../models/inventoryModel");
const mongoose = require("mongoose");

// @desc Create new inventory item
// @route POST /api/inventory
// @access Admin, Manager
const createInventoryItem = async (req, res) => {
    try {
        const data = req.body;

        // Add createdBy from authenticated user
        data.createdBy = req.user.id;

        // Check for duplicate itemCode
        if (data?.itemCode) {
            const existsByCode = await Inventory.findOne({
                itemCode: data.itemCode.toUpperCase(),
            });
            if (existsByCode) {
                return res.status(409).json({
                    message: `Item with code ${data.itemCode} already exists`,
                });
            }
        }

        // Check for duplicate itemName
        if (data?.itemName) {
            const existsByName = await Inventory.findOne({
                itemName: data.itemName,
            });
            if (existsByName) {
                return res.status(409).json({
                    message: `Item with name "${data.itemName}" already exists`,
                });
            }
        }

        // Create the inventory item
        const item = await Inventory.create(data);

        // Add initial stock to history if stock > 0
        if (item.currentStock > 0) {
            item.stockHistory.push({
                type: "addition",
                quantity: item.currentStock,
                previousStock: 0,
                newStock: item.currentStock,
                reason: "Initial stock",
                performedBy: req.user.id,
                date: new Date(),
            });
            item.lastRestocked = new Date();
            await item.save();
        }

        // Populate and return
        const populated = await Inventory.findById(item._id)
            .populate("createdBy", "fullName username")
            .populate("stockHistory.performedBy", "fullName username")
            .populate("stockHistory.vehicleId", "plateNumber model");

        const output = populated?.toObject
            ? populated.toObject({ virtuals: true })
            : populated;

        return res.status(201).json(output);
    } catch (err) {
        // Handle duplicate key errors from MongoDB
        if (err?.code === 11000) {
            const field = Object.keys(err.keyValue || {})[0] || "field";
            return res.status(409).json({
                message: `Duplicate ${field}: ${err.keyValue[field]}`,
            });
        }

        const status = err.name === "ValidationError" ? 400 : 500;
        return res.status(status).json({ message: err.message });
    }
};

// @desc Get all inventory items
// @route GET /api/inventory
// @access Authenticated
const getInventoryItems = async (req, res) => {
    try {
        const { category, status, lowStock } = req.query;

        // Build query filter
        const filter = {};
        if (category) filter.category = category;
        if (status) filter.status = status;

        // Fetch items
        let items = await Inventory.find(filter)
            .populate("createdBy", "fullName username")
            .sort({ itemName: 1 });

        // Filter for low stock if requested
        if (lowStock === "true") {
            items = items.filter((item) => item.currentStock <= item.minimumStock);
        }

        // Convert to objects with virtuals
        const output = items.map((item) =>
            item?.toObject ? item.toObject({ virtuals: true }) : item
        );

        return res.status(200).json(output);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// @desc Get inventory item by ID
// @route GET /api/inventory/:id
// @access Authenticated
const getInventoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid inventory item ID" });
        }

        const item = await Inventory.findById(id)
            .populate("createdBy", "fullName username email")
            .populate("stockHistory.performedBy", "fullName username")
            .populate("stockHistory.vehicleId", "plateNumber model");

        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const output = item?.toObject ? item.toObject({ virtuals: true }) : item;
        return res.status(200).json(output);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// @desc Update inventory item details
// @route PUT /api/inventory/:id
// @access Admin, Manager
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid inventory item ID" });
        }

        // Prevent direct modification of currentStock (use adjustStock instead)
        if (req.body.hasOwnProperty("currentStock")) {
            return res.status(400).json({
                message:
                    "Cannot directly modify currentStock. Use /adjust endpoint instead.",
            });
        }

        // Prevent modification of stockHistory
        if (req.body.hasOwnProperty("stockHistory")) {
            delete req.body.stockHistory;
        }

        // Check for duplicate itemCode if being updated
        if (req.body?.itemCode) {
            const existsByCode = await Inventory.findOne({
                itemCode: req.body.itemCode.toUpperCase(),
                _id: { $ne: id },
            });
            if (existsByCode) {
                return res.status(409).json({
                    message: `Item with code ${req.body.itemCode} already exists`,
                });
            }
        }

        // Check for duplicate itemName if being updated
        if (req.body?.itemName) {
            const existsByName = await Inventory.findOne({
                itemName: req.body.itemName,
                _id: { $ne: id },
            });
            if (existsByName) {
                return res.status(409).json({
                    message: `Item with name "${req.body.itemName}" already exists`,
                });
            }
        }

        const updatedItem = await Inventory.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        })
            .populate("createdBy", "fullName username")
            .populate("stockHistory.performedBy", "fullName username")
            .populate("stockHistory.vehicleId", "plateNumber model");

        if (!updatedItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const output = updatedItem?.toObject
            ? updatedItem.toObject({ virtuals: true })
            : updatedItem;

        return res.status(200).json(output);
    } catch (err) {
        const status = err.name === "ValidationError" ? 400 : 500;
        return res.status(status).json({ message: err.message });
    }
};

// @desc Delete inventory item
// @route DELETE /api/inventory/:id
// @access Admin
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid inventory item ID" });
        }

        const deletedItem = await Inventory.findByIdAndDelete(id);

        if (!deletedItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        return res
            .status(200)
            .json({ message: "Inventory item deleted successfully" });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// @desc Adjust inventory stock (add/remove)
// @route PATCH /api/inventory/:id/adjust
// @access Admin, Manager
const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, reason, vehicleId } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid inventory item ID" });
        }

        // Validate required fields
        if (!type || !quantity) {
            return res
                .status(400)
                .json({ message: "Type and quantity are required" });
        }

        // Validate type
        const validTypes = ["addition", "usage", "adjustment", "damage", "return"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
            });
        }

        // Validate quantity
        const qty = Number(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res
                .status(400)
                .json({ message: "Quantity must be a positive number" });
        }

        // Validate vehicleId if provided
        if (vehicleId && !mongoose.isValidObjectId(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID" });
        }

        // Fetch the item
        const item = await Inventory.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        const previousStock = item.currentStock;
        let newStock;

        // Calculate new stock based on type
        if (type === "addition" || type === "return") {
            newStock = previousStock + qty;
        } else if (type === "usage" || type === "damage") {
            newStock = previousStock - qty;
            // Prevent negative stock
            if (newStock < 0) {
                return res.status(400).json({
                    message: `Insufficient stock. Available: ${previousStock}, Requested: ${qty}`,
                });
            }
        } else if (type === "adjustment") {
            // For adjustment, quantity can be positive or negative
            newStock = previousStock + qty;
            if (newStock < 0) {
                return res.status(400).json({
                    message: "Adjustment would result in negative stock",
                });
            }
        }

        // Update stock
        item.currentStock = newStock;

        // Update lastRestocked if adding stock
        if (type === "addition" || type === "return") {
            item.lastRestocked = new Date();
        }

        // Add to stock history
        item.stockHistory.push({
            type,
            quantity: qty,
            previousStock,
            newStock,
            reason: reason || `Stock ${type}`,
            vehicleId: vehicleId || null,
            performedBy: req.user.id,
            date: new Date(),
        });

        await item.save();

        // Populate and return
        const populated = await Inventory.findById(id)
            .populate("createdBy", "fullName username")
            .populate("stockHistory.performedBy", "fullName username")
            .populate("stockHistory.vehicleId", "plateNumber model");

        const output = populated?.toObject
            ? populated.toObject({ virtuals: true })
            : populated;

        return res.status(200).json(output);
    } catch (err) {
        const status = err.name === "ValidationError" ? 400 : 500;
        return res.status(status).json({ message: err.message });
    }
};

// @desc Get low stock items
// @route GET /api/inventory/low-stock
// @access Admin, Manager
const getLowStockItems = async (req, res) => {
    try {
        const items = await Inventory.find({
            status: { $ne: "discontinued" },
        })
            .populate("createdBy", "fullName username")
            .sort({ currentStock: 1 });

        // Filter items where currentStock <= minimumStock
        const lowStockItems = items.filter(
            (item) => item.currentStock <= item.minimumStock
        );

        const output = lowStockItems.map((item) =>
            item?.toObject ? item.toObject({ virtuals: true }) : item
        );

        return res.status(200).json(output);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// @desc Get stock history for an item
// @route GET /api/inventory/:id/history
// @access Admin, Manager
const getStockHistory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid inventory item ID" });
        }

        const item = await Inventory.findById(id)
            .select("itemName itemCode stockHistory")
            .populate("stockHistory.performedBy", "fullName username")
            .populate("stockHistory.vehicleId", "plateNumber model");

        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        // Sort history by date descending (most recent first)
        const sortedHistory = item.stockHistory.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        return res.status(200).json({
            itemName: item.itemName,
            itemCode: item.itemCode,
            history: sortedHistory,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// @desc Get inventory statistics
// @route GET /api/inventory/stats
// @access Admin, Manager
const getInventoryStats = async (req, res) => {
    try {
        const items = await Inventory.find({});

        // Calculate statistics
        const totalItems = items.length;
        const totalStockValue = items.reduce(
            (sum, item) => sum + item.currentStock * (item.unitPrice || 0),
            0
        );
        const lowStockCount = items.filter(
            (item) => item.currentStock <= item.minimumStock
        ).length;
        const outOfStockCount = items.filter(
            (item) => item.currentStock === 0
        ).length;

        // Category-wise breakdown
        const categoryBreakdown = items.reduce((acc, item) => {
            const category = item.category || "Other";
            if (!acc[category]) {
                acc[category] = {
                    count: 0,
                    totalStock: 0,
                    totalValue: 0,
                };
            }
            acc[category].count += 1;
            acc[category].totalStock += item.currentStock;
            acc[category].totalValue += item.currentStock * (item.unitPrice || 0);
            return acc;
        }, {});

        // Status breakdown
        const statusBreakdown = items.reduce((acc, item) => {
            const status = item.status || "active";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return res.status(200).json({
            totalItems,
            totalStockValue: Math.round(totalStockValue * 100) / 100,
            lowStockCount,
            outOfStockCount,
            categoryBreakdown,
            statusBreakdown,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createInventoryItem,
    getInventoryItems,
    getInventoryById,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,
    getLowStockItems,
    getStockHistory,
    getInventoryStats,
};
