const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Service = require('../models/Service');
const Subscription = require('../models/Subscription');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    // Get basic counts
    const [
      totalUsers,
      totalServices,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Service.countDocuments({ 'availability.isActive': true }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ])
    ]);

    // Get recent subscriptions
    const recentSubscriptions = await Subscription.find()
      .populate('userId', 'name email')
      .populate('services.serviceId', 'name category')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get service category distribution
    const categoryStats = await Service.aggregate([
      { $match: { 'availability.isActive': true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSubscriptions: { $sum: '$availability.currentSubscriptions' }
        }
      }
    ]);

    // Get monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$pricing.total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalServices,
          totalSubscriptions,
          activeSubscriptions,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        recentSubscriptions,
        categoryStats,
        monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
router.get('/users', [
  query('role')
    .optional()
    .isIn(['customer', 'admin'])
    .withMessage('Invalid role'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query cannot be empty'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users
    const users = await User.find(query)
      .select('-password')
      .populate('activeSubscriptionsCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put('/users/:id/status', [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });

  } catch (error) {
    console.error('Admin update user status error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
});

// @route   POST /api/admin/services
// @desc    Create a new service
// @access  Private (Admin only)
router.post('/services', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Service name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('category')
    .isIn(['Cable', 'Silver', 'Snacks', 'Internet', 'Gaming', 'Design', 'Development'])
    .withMessage('Invalid category'),
  body('price.amount')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Price amount must be a positive number'),
  body('price.billingCycle')
    .optional()
    .isIn(['one-time', 'monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid billing cycle')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const serviceData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Set Silver service constraints
    if (req.body.category === 'Silver') {
      serviceData.constraints = {
        ...serviceData.constraints,
        maxOnlineOrderValue: 10000,
        requiresQuote: true
      };
    }

    const service = new Service(serviceData);
    await service.save();

    await service.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });

  } catch (error) {
    console.error('Admin create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating service'
    });
  }
});

// @route   PUT /api/admin/services/:id
// @desc    Update a service
// @access  Private (Admin only)
router.put('/services/:id', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Service name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('price.amount')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Price amount must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: req.user._id
    };

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate(['createdBy', 'lastModifiedBy'], 'name email');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service }
    });

  } catch (error) {
    console.error('Admin update service error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating service'
    });
  }
});

// @route   DELETE /api/admin/services/:id
// @desc    Delete a service (soft delete by deactivating)
// @access  Private (Admin only)
router.delete('/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { 
        'availability.isActive': false,
        lastModifiedBy: req.user._id
      },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service deactivated successfully',
      data: { service }
    });

  } catch (error) {
    console.error('Admin delete service error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting service'
    });
  }
});

// @route   GET /api/admin/subscriptions
// @desc    Get all subscriptions with filtering
// @access  Private (Admin only)
router.get('/subscriptions', [
  query('status')
    .optional()
    .isIn(['pending', 'active', 'paused', 'cancelled', 'expired', 'failed'])
    .withMessage('Invalid status'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      status,
      userId,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get subscriptions
    const subscriptions = await Subscription.find(query)
      .populate('userId', 'name email phone')
      .populate('services.serviceId', 'name category price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalSubscriptions = await Subscription.countDocuments(query);
    const totalPages = Math.ceil(totalSubscriptions / parseInt(limit));

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalSubscriptions,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Admin get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subscriptions'
    });
  }
});

// @route   PUT /api/admin/subscriptions/:id/status
// @desc    Update subscription status
// @access  Private (Admin only)
router.put('/subscriptions/:id/status', [
  body('status')
    .isIn(['pending', 'active', 'paused', 'cancelled', 'expired', 'failed'])
    .withMessage('Invalid status'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, reason = 'Admin action' } = req.body;

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Update status based on the requested status
    switch (status) {
      case 'cancelled':
        await subscription.cancel(reason);
        break;
      case 'paused':
        await subscription.pause(reason);
        break;
      case 'active':
        if (subscription.status === 'paused') {
          await subscription.resume();
        } else {
          subscription.status = status;
          await subscription.save();
        }
        break;
      default:
        subscription.status = status;
        await subscription.save();
    }

    await subscription.populate([
      { path: 'userId', select: 'name email phone' },
      { path: 'services.serviceId', select: 'name category price' }
    ]);

    res.json({
      success: true,
      message: 'Subscription status updated successfully',
      data: { subscription }
    });

  } catch (error) {
    console.error('Admin update subscription status error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating subscription status'
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics
// @access  Private (Admin only)
router.get('/analytics', async (req, res) => {
  try {
    // User analytics
    const userAnalytics = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    // Service analytics
    const serviceAnalytics = await Service.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$availability.isActive', 1, 0] } },
          totalSubscriptions: { $sum: '$availability.currentSubscriptions' },
          avgPrice: { $avg: '$price.amount' }
        }
      }
    ]);

    // Subscription analytics
    const subscriptionAnalytics = await Subscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    // Monthly growth
    const monthlyGrowth = await Subscription.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          subscriptions: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        userAnalytics,
        serviceAnalytics,
        subscriptionAnalytics,
        monthlyGrowth
      }
    });

  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

module.exports = router;
