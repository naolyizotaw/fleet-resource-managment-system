const WorkOrder = require('../models/workOrderModel');
const MaintenanceRequest = require('../models/maintenanceRequest');
const Vehicle = require('../models/vehicleModel');
const Inventory = require('../models/inventoryModel');
const User = require('../models/userModel');
const Notification = require('../models/notification');
const mongoose = require('mongoose');

// Helper function to generate work order number
const generateWorkOrderNumber = async () => {
    const year = new Date().getFullYear();
    const count = await WorkOrder.countDocuments({
        workOrderNumber: new RegExp(`^WO-${year}-`)
    });
    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `WO-${year}-${nextNumber}`;
};

//@desc Convert approved maintenance request to work order
//@route POST /api/work-orders/convert/:maintenanceId
//@access manager, admin
const convertMaintenanceToWorkOrder = async (req, res) => {
    try {
        const { maintenanceId } = req.params;

        if (!mongoose.isValidObjectId(maintenanceId)) {
            return res.status(400).json({ message: 'Invalid maintenance request ID' });
        }

        // Find maintenance request
        const maintenanceRequest = await MaintenanceRequest.findById(maintenanceId)
            .populate('vehicleId', 'plateNumber model year manufacturer make');

        if (!maintenanceRequest) {
            return res.status(404).json({ message: 'Maintenance request not found' });
        }

        // Check if already approved
        if (maintenanceRequest.status !== 'approved') {
            return res.status(400).json({
                message: 'Only approved maintenance requests can be converted to work orders'
            });
        }

        // Check if work order already exists for this maintenance request
        const existingWorkOrder = await WorkOrder.findOne({ maintenanceRequestId: maintenanceId });
        if (existingWorkOrder) {
            return res.status(409).json({
                message: 'Work order already exists for this maintenance request',
                workOrderId: existingWorkOrder._id,
                workOrderNumber: existingWorkOrder.workOrderNumber
            });
        }

        // Generate work order number
        const workOrderNumber = await generateWorkOrderNumber();

        // Create work order
        const workOrder = new WorkOrder({
            workOrderNumber,
            maintenanceRequestId: maintenanceRequest._id,
            vehicleId: maintenanceRequest.vehicleId,
            description: maintenanceRequest.description,
            priority: maintenanceRequest.priority,
            category: maintenanceRequest.category,
            createdBy: req.user.id,
        });

        // Add history entry
        workOrder.addHistoryEntry(
            'Work order created',
            req.user.id,
            {
                fromMaintenanceRequest: maintenanceRequest._id,
                workOrderNumber
            }
        );

        await workOrder.save();

        // Notify requester
        try {
            await Notification.create({
                user: maintenanceRequest.requestedBy,
                type: 'maintenance',
                entityId: workOrder._id,
                title: 'Work order created',
                message: `Work order ${workOrderNumber} has been created for your maintenance request`,
                actionUrl: `/work-orders?highlight=${workOrder._id}`,
                meta: {
                    workOrderNumber,
                    vehiclePlate: maintenanceRequest.vehicleId?.plateNumber,
                }
            });
        } catch (e) {
            console.error('Notification error:', e.message);
        }

        return res.status(201).json({
            message: 'Work order created successfully',
            workOrder,
        });
    } catch (err) {
        console.error('Error converting maintenance to work order:', err);
        return res.status(500).json({
            message: 'Server error',
            error: err.message
        });
    }
};

//@desc Get all work orders
//@route GET /api/work-orders
//@access manager, admin
const getAllWorkOrders = async (req, res) => {
    try {
        const { status, vehicleId, mechanicId, startDate, endDate } = req.query;

        // Build filter
        const filter = {};
        if (status) filter.status = status;
        if (vehicleId) filter.vehicleId = vehicleId;
        if (mechanicId) filter.assignedMechanics = mechanicId;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const workOrders = await WorkOrder.find(filter)
            .populate('vehicleId', 'plateNumber model year manufacturer make currentKm')
            .populate('maintenanceRequestId', 'description category requestedDate')
            .populate('assignedMechanics', 'fullName username email')
            .populate('createdBy', 'fullName username')
            .populate('spareParts.itemId', 'name partNumber')
            .populate('spareParts.addedBy', 'fullName username')
            .populate('laborCosts.mechanicId', 'fullName username')
            .populate('laborCosts.addedBy', 'fullName username')
            .populate('progressNotes.addedBy', 'fullName username')
            .populate('history.performedBy', 'fullName username')
            .sort({ createdAt: -1 });

        return res.status(200).json(workOrders);
    } catch (err) {
        console.error('Error fetching work orders:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Get work order by ID
//@route GET /api/work-orders/:id
//@access authenticated
const getWorkOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid work order ID' });
        }

        const workOrder = await WorkOrder.findById(id)
            .populate('vehicleId', 'plateNumber model year manufacturer make currentKm')
            .populate('maintenanceRequestId', 'description category requestedDate priority')
            .populate('assignedMechanics', 'fullName username email phone')
            .populate('createdBy', 'fullName username')
            .populate('spareParts.itemId', 'name partNumber category')
            .populate('spareParts.addedBy', 'fullName username')
            .populate('laborCosts.mechanicId', 'fullName username')
            .populate('laborCosts.addedBy', 'fullName username')
            .populate('progressNotes.addedBy', 'fullName username')
            .populate('history.performedBy', 'fullName username');

        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }

        return res.status(200).json(workOrder);
    } catch (err) {
        console.error('Error fetching work order:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Assign mechanic to work order
//@route PATCH /api/work-orders/:id/assign
//@access manager, admin
const assignMechanic = async (req, res) => {
    try {
        const { id } = req.params;
        const { mechanicIds } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid work order ID' });
        }

        if (!mechanicIds || !Array.isArray(mechanicIds) || mechanicIds.length === 0) {
            return res.status(400).json({ message: 'At least one mechanic ID is required' });
        }

        const workOrder = await WorkOrder.findById(id);
        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }

        if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
            return res.status(400).json({
                message: `Cannot assign mechanics to a ${workOrder.status} work order`
            });
        }

        // Verify mechanics exist
        const mechanics = await User.find({ _id: { $in: mechanicIds } });
        if (mechanics.length !== mechanicIds.length) {
            return res.status(404).json({ message: 'One or more mechanics not found' });
        }

        // Add new mechanics (avoid duplicates)
        const existingIds = workOrder.assignedMechanics.map(id => id.toString());
        const newMechanics = mechanicIds.filter(id => !existingIds.includes(id.toString()));

        workOrder.assignedMechanics.push(...newMechanics);

        // Update status to in_progress if this is the first assignment
        if (workOrder.status === 'open' && workOrder.assignedMechanics.length > 0) {
            workOrder.status = 'in_progress';
            workOrder.startedDate = new Date();
        }

        // Add history entry
        workOrder.addHistoryEntry(
            'Mechanics assigned',
            req.user.id,
            {
                mechanicIds: newMechanics,
                mechanicNames: mechanics.filter(m => newMechanics.includes(m._id.toString())).map(m => m.fullName || m.username)
            }
        );

        await workOrder.save();

        // Notify assigned mechanics
        try {
            for (const mechanicId of newMechanics) {
                await Notification.create({
                    user: mechanicId,
                    type: 'maintenance',
                    entityId: workOrder._id,
                    title: 'Work order assigned',
                    message: `You have been assigned to work order ${workOrder.workOrderNumber}`,
                    actionUrl: `/work-orders?highlight=${workOrder._id}`,
                    meta: {
                        workOrderNumber: workOrder.workOrderNumber,
                    }
                });
            }
        } catch (e) {
            console.error('Notification error:', e.message);
        }

        const populated = await WorkOrder.findById(workOrder._id)
            .populate('assignedMechanics', 'fullName username email');

        return res.status(200).json({
            message: 'Mechanics assigned successfully',
            workOrder: populated,
        });
    } catch (err) {
        console.error('Error assigning mechanic:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Add spare parts to work order
//@route PATCH /api/work-orders/:id/parts
//@access manager, admin
const addSpareParts = async (req, res) => {
    try {
        const { id } = req.params;
        const { parts } = req.body; // Array of { itemId, quantity }

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid work order ID' });
        }

        if (!parts || !Array.isArray(parts) || parts.length === 0) {
            return res.status(400).json({ message: 'Parts array is required' });
        }

        const workOrder = await WorkOrder.findById(id);
        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }

        if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
            return res.status(400).json({
                message: `Cannot add parts to a ${workOrder.status} work order`
            });
        }

        const addedParts = [];

        // Process each part
        for (const part of parts) {
            const { itemId, quantity } = part;

            if (!mongoose.isValidObjectId(itemId)) {
                return res.status(400).json({ message: `Invalid item ID: ${itemId}` });
            }

            if (!quantity || quantity < 1) {
                return res.status(400).json({ message: 'Quantity must be at least 1' });
            }

            // Find inventory item
            const inventoryItem = await Inventory.findById(itemId);
            if (!inventoryItem) {
                return res.status(404).json({ message: `Inventory item not found: ${itemId}` });
            }

            // Check stock availability
            if (inventoryItem.currentStock < quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${inventoryItem.itemName}. Available: ${inventoryItem.currentStock}, Requested: ${quantity}`
                });
            }

            // Record previous stock before deduction
            const previousStock = inventoryItem.currentStock;

            // Deduct from inventory
            inventoryItem.currentStock -= quantity;

            // Add to stock history (using correct field name and format)
            inventoryItem.stockHistory.push({
                type: 'usage',
                quantity: -quantity,
                previousStock: previousStock,
                newStock: inventoryItem.currentStock,
                reason: `Used in work order ${workOrder.workOrderNumber}`,
                vehicleId: workOrder.vehicleId,
                performedBy: req.user.id,
            });

            await inventoryItem.save();

            // Add to work order
            const unitCost = inventoryItem.unitPrice || 0;
            const totalCost = unitCost * quantity;

            workOrder.spareParts.push({
                itemId: inventoryItem._id,
                itemName: inventoryItem.itemName,
                quantity,
                unitCost,
                totalCost,
                addedBy: req.user.id,
            });

            addedParts.push({
                name: inventoryItem.itemName,
                quantity,
                totalCost,
            });
        }

        // Add history entry
        workOrder.addHistoryEntry(
            'Spare parts added',
            req.user.id,
            { parts: addedParts }
        );

        await workOrder.save();

        const populated = await WorkOrder.findById(workOrder._id)
            .populate('spareParts.itemId', 'name partNumber')
            .populate('spareParts.addedBy', 'fullName username');

        return res.status(200).json({
            message: 'Spare parts added successfully',
            workOrder: populated,
        });
    } catch (err) {
        console.error('Error adding spare parts:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Add labor cost to work order
//@route PATCH /api/work-orders/:id/labor
//@access manager, admin
const addLaborCost = async (req, res) => {
    try {
        const { id } = req.params;
        const { mechanicId, hours, hourlyRate, description } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid work order ID' });
        }

        if (!mechanicId || !hours || !hourlyRate) {
            return res.status(400).json({
                message: 'Mechanic ID, hours, and hourly rate are required'
            });
        }

        if (hours < 0 || hourlyRate < 0) {
            return res.status(400).json({ message: 'Hours and hourly rate must be non-negative' });
        }

        const workOrder = await WorkOrder.findById(id);
        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }

        if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
            return res.status(400).json({
                message: `Cannot add labor cost to a ${workOrder.status} work order`
            });
        }

        // Verify mechanic exists
        const mechanic = await User.findById(mechanicId);
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }

        const totalCost = hours * hourlyRate;

        workOrder.laborCosts.push({
            mechanicId,
            hours,
            hourlyRate,
            totalCost,
            description: description || '',
            addedBy: req.user.id,
        });

        // Add history entry
        workOrder.addHistoryEntry(
            'Labor cost added',
            req.user.id,
            {
                mechanic: mechanic.fullName || mechanic.username,
                hours,
                hourlyRate,
                totalCost
            }
        );

        await workOrder.save();

        const populated = await WorkOrder.findById(workOrder._id)
            .populate('laborCosts.mechanicId', 'fullName username')
            .populate('laborCosts.addedBy', 'fullName username');

        return res.status(200).json({
            message: 'Labor cost added successfully',
            workOrder: populated,
        });
    } catch (err) {
        console.error('Error adding labor cost:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Update work order progress
//@route PATCH /api/work-orders/:id/progress
//@access manager, admin, assigned mechanic
const updateProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { note, status } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid work order ID' });
        }

        if (!note || note.trim() === '') {
            return res.status(400).json({ message: 'Progress note is required' });
        }

        const workOrder = await WorkOrder.findById(id);
        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }

        if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
            return res.status(400).json({
                message: `Cannot update progress for a ${workOrder.status} work order`
            });
        }

        // Check if user is assigned mechanic (or admin/manager)
        const isAssignedMechanic = workOrder.assignedMechanics.some(
            mechId => mechId.toString() === req.user.id
        );
        const isManagerOrAdmin = ['admin', 'manager'].includes(req.user.role);

        if (!isAssignedMechanic && !isManagerOrAdmin) {
            return res.status(403).json({
                message: 'Only assigned mechanics or managers can update progress'
            });
        }

        // Add progress note
        workOrder.progressNotes.push({
            note: note.trim(),
            addedBy: req.user.id,
        });

        // Update status if provided
        if (status && ['open', 'in_progress', 'on_hold'].includes(status)) {
            const oldStatus = workOrder.status;
            workOrder.status = status;

            workOrder.addHistoryEntry(
                'Status changed',
                req.user.id,
                { from: oldStatus, to: status }
            );
        }

        // Add history entry
        workOrder.addHistoryEntry(
            'Progress updated',
            req.user.id,
            { note: note.trim() }
        );

        await workOrder.save();

        const populated = await WorkOrder.findById(workOrder._id)
            .populate('progressNotes.addedBy', 'fullName username');

        return res.status(200).json({
            message: 'Progress updated successfully',
            workOrder: populated,
        });
    } catch (err) {
        console.error('Error updating progress:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Complete work order
//@route PATCH /api/work-orders/:id/complete
//@access manager, admin
const completeWorkOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { finalNotes } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid work order ID' });
        }

        const workOrder = await WorkOrder.findById(id)
            .populate('vehicleId');

        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }

        if (workOrder.status === 'completed') {
            return res.status(400).json({ message: 'Work order is already completed' });
        }

        if (workOrder.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot complete a cancelled work order' });
        }

        // Update status and completion date
        workOrder.status = 'completed';
        workOrder.completedDate = new Date();

        // Add final notes if provided
        if (finalNotes && finalNotes.trim() !== '') {
            workOrder.progressNotes.push({
                note: `[COMPLETION] ${finalNotes.trim()}`,
                addedBy: req.user.id,
            });
        }

        // Add history entry
        workOrder.addHistoryEntry(
            'Work order completed',
            req.user.id,
            {
                totalCost: workOrder.totalCost,
                totalPartsCost: workOrder.totalPartsCost,
                totalLaborCost: workOrder.totalLaborCost,
            }
        );

        await workOrder.save();

        // Update vehicle status back to active
        if (workOrder.vehicleId) {
            const vehicle = await Vehicle.findById(workOrder.vehicleId);
            if (vehicle && vehicle.status === 'under_maintenance') {
                vehicle.status = 'active';
                await vehicle.save();
            }
        }

        // Update maintenance request to completed
        try {
            const maintenanceRequest = await MaintenanceRequest.findById(workOrder.maintenanceRequestId);
            if (maintenanceRequest && maintenanceRequest.status !== 'completed') {
                maintenanceRequest.status = 'completed';
                maintenanceRequest.completedDate = new Date();
                maintenanceRequest.cost = workOrder.totalCost;
                await maintenanceRequest.save();
            }
        } catch (e) {
            console.error('Error updating maintenance request:', e.message);
        }

        // Notify assigned mechanics
        try {
            for (const mechanicId of workOrder.assignedMechanics) {
                await Notification.create({
                    user: mechanicId,
                    type: 'maintenance',
                    entityId: workOrder._id,
                    title: 'Work order completed',
                    message: `Work order ${workOrder.workOrderNumber} has been marked as completed`,
                    actionUrl: `/work-orders?highlight=${workOrder._id}`,
                    meta: {
                        workOrderNumber: workOrder.workOrderNumber,
                        totalCost: workOrder.totalCost,
                    }
                });
            }
        } catch (e) {
            console.error('Notification error:', e.message);
        }

        const populated = await WorkOrder.findById(workOrder._id)
            .populate('vehicleId', 'plateNumber model year manufacturer make')
            .populate('assignedMechanics', 'fullName username')
            .populate('progressNotes.addedBy', 'fullName username');

        return res.status(200).json({
            message: 'Work order completed successfully',
            workOrder: populated,
        });
    } catch (err) {
        console.error('Error completing work order:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

//@desc Delete work order
//@route DELETE /api/work-orders/:id
//@access admin
const deleteWorkOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid work order ID' });
        }

        const workOrder = await WorkOrder.findByIdAndDelete(id);
        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }

        return res.status(200).json({ message: 'Work order deleted successfully' });
    } catch (err) {
        console.error('Error deleting work order:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = {
    convertMaintenanceToWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    assignMechanic,
    addSpareParts,
    addLaborCost,
    updateProgress,
    completeWorkOrder,
    deleteWorkOrder,
};
