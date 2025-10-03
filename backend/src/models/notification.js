const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['fuel', 'maintenance', 'perDiem', 'system'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: false },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['unread', 'read'], default: 'unread' },
    actionUrl: { type: String },
    meta: { type: Object },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
