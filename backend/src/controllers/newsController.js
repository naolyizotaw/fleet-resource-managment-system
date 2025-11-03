const News = require('../models/newsModel');

// Get all news posts (admins see all, others see only active)
exports.getAllNews = async (req, res) => {
  try {
    const { type, limit = 10, page = 1 } = req.query;
    const query = {};
    
    // Non-admins only see active posts
    if (req.user?.role !== 'admin') {
      query.isActive = true;
    }
    
    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const news = await News.find(query)
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      data: news,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get recent news for dashboard (last 4 items)
exports.getRecentNews = async (req, res) => {
  try {
    const news = await News.find({ isActive: true })
      .populate('createdBy', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(4);

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single news post
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('createdBy', 'fullName username');

    if (!news) {
      return res.status(404).json({ success: false, message: 'News post not found' });
    }

    res.json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create news post (admin only)
exports.createNews = async (req, res) => {
  try {
    const { title, content, type, eventDate, priority } = req.body;

    const news = new News({
      title,
      content,
      type,
      eventDate,
      priority,
      createdBy: req.user.id,
    });

    await news.save();
    await news.populate('createdBy', 'fullName username');

    res.status(201).json({
      success: true,
      message: 'News post created successfully',
      data: news,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update news post (admin only)
exports.updateNews = async (req, res) => {
  try {
    const { title, content, type, eventDate, priority, isActive } = req.body;

    const news = await News.findByIdAndUpdate(
      req.params.id,
      { title, content, type, eventDate, priority, isActive, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName username');

    if (!news) {
      return res.status(404).json({ success: false, message: 'News post not found' });
    }

    res.json({
      success: true,
      message: 'News post updated successfully',
      data: news,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete news post (admin only)
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);

    if (!news) {
      return res.status(404).json({ success: false, message: 'News post not found' });
    }

    res.json({
      success: true,
      message: 'News post deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle active status (admin only)
exports.toggleActive = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({ success: false, message: 'News post not found' });
    }

    news.isActive = !news.isActive;
    news.updatedAt = Date.now();
    await news.save();

    res.json({
      success: true,
      message: `News post ${news.isActive ? 'activated' : 'deactivated'} successfully`,
      data: news,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

