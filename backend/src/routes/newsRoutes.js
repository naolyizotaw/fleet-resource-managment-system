const express = require('express');
const router = express.Router();
const {
  getAllNews,
  getRecentNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  toggleActive
} = require('../controllers/newsController');
const { verifyToken: protect } = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// Authenticated routes - specific routes MUST come before dynamic routes
router.get('/recent', protect, getRecentNews);
router.get('/:id', protect, getNewsById);
router.get('/', protect, getAllNews);

// Admin only routes
router.post('/', protect, authorizeRoles('admin'), createNews);
router.put('/:id', protect, authorizeRoles('admin'), updateNews);
router.patch('/:id/toggle', protect, authorizeRoles('admin'), toggleActive);
router.delete('/:id', protect, authorizeRoles('admin'), deleteNews);

module.exports = router;

