const Notification = require('../models/notification');
const FuelRequest = require('../models/fuelRequest');
const MaintenanceRequest = require('../models/maintenanceRequest');
const PerDiemRequest = require('../models/perDiemRequest');

// List notifications for current user
const listMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { user: req.user.id };
    if (status) query.status = status;
    const docs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    const total = await Notification.countDocuments(query);
    res.json({ data: docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
};

// Get unread count for current user
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user.id, status: 'unread' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unread count', error: err.message });
  }
};

// Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $set: { status: 'read' } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Notification not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification', error: err.message });
  }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, status: 'unread' }, { $set: { status: 'read' } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notifications as read', error: err.message });
  }
};

module.exports = { listMyNotifications, getUnreadCount, markAsRead, markAllAsRead };
 
// Aggregate pending requests for bell panel (virtual notifications)
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const isApprover = role === 'admin' || role === 'manager';

    const filter = isApprover
      ? { status: 'pending' }
      : { status: 'pending', requestedBy: userId };

    const [fuel, maint, perdiem] = await Promise.all([
      FuelRequest.find(filter).sort({ createdAt: -1 }).limit(10).populate('vehicleId', 'plateNumber'),
      MaintenanceRequest.find(filter).sort({ createdAt: -1 }).limit(10).populate('vehicleId', 'plateNumber'),
      PerDiemRequest.find(filter).sort({ createdAt: -1 }).limit(10).populate('vehicleId', 'plateNumber'),
    ]);

    const mapItem = (type, doc) => ({
      _id: String(doc._id),
      type,
      status: 'pending',
      title: `${type === 'fuel' ? 'Fuel' : type === 'maintenance' ? 'Maintenance' : 'Per diem'} request pending`,
      message:
        type === 'fuel'
          ? `Fuel request for vehicle ${doc.vehicleId?.plateNumber || ''}`
          : type === 'maintenance'
          ? `Maintenance request for vehicle ${doc.vehicleId?.plateNumber || ''}`
          : `Per diem request to ${doc.destination || ''}`,
      createdAt: doc.createdAt,
      actionUrl:
        type === 'fuel'
          ? `/fuel?highlight=${doc._id}`
          : type === 'maintenance'
          ? `/maintenance?highlight=${doc._id}`
          : `/perdiem?highlight=${doc._id}`,
    });

    const data = [
      ...fuel.map((d) => mapItem('fuel', d)),
      ...maint.map((d) => mapItem('maintenance', d)),
      ...perdiem.map((d) => mapItem('perDiem', d)),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending requests', error: err.message });
  }
};

module.exports.getPendingRequests = getPendingRequests;
