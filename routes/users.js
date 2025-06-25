const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile/:id
// @desc    Get user profile by ID (admin only)
// @access  Private (Admin only)
router.get('/profile/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('activeSubscriptionsCount');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's subscription summary
    const subscriptionSummary = await Subscription.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' }
        }
      }
    ]);

    // Get recent subscriptions
    const recentSubscriptions = await Subscription.find({ userId: user._id })
      .populate('services.serviceId', 'name category price')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        subscriptionSummary,
        recentSubscriptions
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
});

// @route   GET /api/users/:id/subscriptions
// @desc    Get user's subscriptions (admin only)
// @access  Private (Admin only)
router.get('/:id/subscriptions', [
  authenticate,
  requireAdmin,
  query('status')
    .optional()
    .isIn(['pending', 'active', 'paused', 'cancelled', 'expired', 'failed'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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

    const { status, page = 1, limit = 10 } = req.query;

    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build query
    let query = { userId: req.params.id };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get subscriptions
    const subscriptions = await Subscription.find(query)
      .populate('services.serviceId', 'name category price description media')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalSubscriptions = await Subscription.countDocuments(query);
    const totalPages = Math.ceil(totalSubscriptions / parseInt(limit));

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
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
    console.error('Get user subscriptions error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user subscriptions'
    });
  }
});

// @route   GET /api/users/:id/analytics
// @desc    Get user analytics (admin only)
// @access  Private (Admin only)
router.get('/:id/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get subscription analytics
    const subscriptionAnalytics = await Subscription.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.total' },
          avgAmount: { $avg: '$pricing.total' }
        }
      }
    ]);

    // Get service category preferences
    const categoryPreferences = await Subscription.aggregate([
      { $match: { userId: user._id } },
      { $unwind: '$services' },
      {
        $lookup: {
          from: 'services',
          localField: 'services.serviceId',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' },
      {
        $group: {
          _id: '$serviceDetails.category',
          count: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get monthly spending pattern
    const monthlySpending = await Subscription.aggregate([
      { $match: { userId: user._id, paymentStatus: 'paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSpent: { $sum: '$pricing.total' },
          subscriptionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Calculate totals
    const totalSpent = await Subscription.aggregate([
      { $match: { userId: user._id, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);

    const activeSubscriptionsCount = await Subscription.countDocuments({
      userId: user._id,
      status: 'active'
    });

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        analytics: {
          totalSpent: totalSpent[0]?.total || 0,
          activeSubscriptions: activeSubscriptionsCount,
          subscriptionAnalytics,
          categoryPreferences,
          monthlySpending
        }
      }
    });

  } catch (error) {
    console.error('Get user analytics error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user analytics'
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users (admin only)
// @access  Private (Admin only)
router.get('/search', [
  authenticate,
  requireAdmin,
  query('q')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
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

    const { q: searchQuery, limit = 10 } = req.query;

    // Search users by name, email, or phone
    const users = await User.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
            { phone: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email phone role createdAt')
    .limit(parseInt(limit))
    .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        users,
        searchQuery,
        resultCount: users.length
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users'
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private (Admin only)
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get user role distribution
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    // Get user registration trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const registrationTrend = await User.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get users with most subscriptions
    const topUsers = await User.aggregate([
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'userId',
          as: 'subscriptions'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          subscriptionCount: { $size: '$subscriptions' },
          totalSpent: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$subscriptions',
                    cond: { $eq: ['$$this.paymentStatus', 'paid'] }
                  }
                },
                as: 'sub',
                in: '$$sub.pricing.total'
              }
            }
          }
        }
      },
      { $match: { subscriptionCount: { $gt: 0 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    // Get user activity summary
    const activitySummary = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          usersWithSubscriptions: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$subscriptions', []] } }, 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        roleStats,
        registrationTrend,
        topUsers,
        activitySummary: activitySummary[0] || {
          totalUsers: 0,
          activeUsers: 0,
          usersWithSubscriptions: 0
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

module.exports = router;
