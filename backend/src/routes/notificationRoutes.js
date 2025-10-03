const express = require('express');
const { verifyToken } = require('../middlewares/authMiddleware');
const { listMyNotifications, getUnreadCount, markAsRead, markAllAsRead, getPendingRequests } = require('../controllers/notificationController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);
router.get('/pending-requests', getPendingRequests);

module.exports = router;
