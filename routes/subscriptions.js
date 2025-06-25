const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');
const Service = require('../models/Service');
const { authenticate, requireCustomerOrAdmin, validateSubscriptionLimits } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/subscriptions
// @desc    Create a new subscription
// @access  Private
router.post('/', [
  authenticate,
  requireCustomerOrAdmin,
  validateSubscriptionLimits,
  body('services')
    .isArray({ min: 1 })
    .withMessage('At least one service is required'),
  body('services.*.serviceId')
    .isMongoId()
    .withMessage('Valid service ID is required'),
  body('services.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('planName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Plan name cannot exceed 100 characters'),
  body('address.street')
    .notEmpty()
    .trim()
    .withMessage('Street address is required'),
  body('address.city')
    .notEmpty()
    .trim()
    .withMessage('City is required'),
  body('address.state')
    .notEmpty()
    .trim()
    .withMessage('State is required'),
  body('address.pincode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Valid 6-digit pincode is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { services, planName, address, billingCycle = 'monthly' } = req.body;

    // Validate and fetch all services
    const serviceIds = services.map(s => s.serviceId);
    const foundServices = await Service.find({
      _id: { $in: serviceIds },
      'availability.isActive': true
    });

    if (foundServices.length !== serviceIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more services are not available'
      });
    }

    // Check service availability and constraints
    for (const requestedService of services) {
      const service = foundServices.find(s => s._id.toString() === requestedService.serviceId);
      
      // Check quantity constraints
      if (requestedService.quantity > service.constraints.maxQuantityPerUser) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${service.constraints.maxQuantityPerUser} quantity allowed for ${service.name}`
        });
      }

      // Check availability limits
      if (service.availability.maxSubscriptions && 
          service.availability.currentSubscriptions >= service.availability.maxSubscriptions) {
        return res.status(400).json({
          success: false,
          message: `${service.name} is currently not available`
        });
      }

      // Check Silver service online order limit
      if (service.category === 'Silver' && service.constraints.maxOnlineOrderValue) {
        const orderValue = service.price.amount * requestedService.quantity;
        if (orderValue > service.constraints.maxOnlineOrderValue) {
          return res.status(400).json({
            success: false,
            message: `Silver service orders above ₹${service.constraints.maxOnlineOrderValue} require a quote. Please contact us.`
          });
        }
      }
    }

    // Calculate pricing
    let subtotal = 0;
    const subscriptionServices = [];

    for (const requestedService of services) {
      const service = foundServices.find(s => s._id.toString() === requestedService.serviceId);
      const quantity = requestedService.quantity || 1;
      const serviceTotal = service.price.amount * quantity;
      
      subtotal += serviceTotal;
      
      subscriptionServices.push({
        serviceId: service._id,
        quantity,
        customizations: requestedService.customizations || new Map(),
        priceAtSubscription: {
          amount: service.price.amount,
          currency: service.price.currency,
          billingCycle: service.price.billingCycle
        }
      });
    }

    // Calculate taxes (18% GST)
    const taxes = Math.round(subtotal * 0.18);
    const total = subtotal + taxes;

    // Create subscription
    const subscription = new Subscription({
      userId: req.user._id,
      services: subscriptionServices,
      planName: planName || `Custom Plan - ${new Date().toLocaleDateString()}`,
      pricing: {
        subtotal,
        taxes,
        total,
        currency: 'INR'
      },
      billingCycle,
      address,
      installation: {
        isRequired: foundServices.some(s => ['Cable', 'Internet'].includes(s.category))
      },
      metadata: {
        source: 'web'
      }
    });

    await subscription.save();

    // Update service subscription counts
    for (const service of foundServices) {
      await service.incrementSubscriptions();
    }

    // Populate the subscription for response
    await subscription.populate([
      { path: 'userId', select: 'name email phone' },
      { path: 'services.serviceId', select: 'name category price description' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription
      }
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating subscription'
    });
  }
});

// @route   GET /api/subscriptions
// @desc    Get user's subscriptions
// @access  Private
router.get('/', [
  authenticate,
  requireCustomerOrAdmin,
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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    let query = { userId: req.user._id };
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
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subscriptions'
    });
  }
});

// @route   GET /api/subscriptions/:id
// @desc    Get single subscription
// @access  Private
router.get('/:id', authenticate, requireCustomerOrAdmin, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('services.serviceId', 'name category price description media features');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && subscription.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        subscription
      }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subscription'
    });
  }
});

// @route   PUT /api/subscriptions/:id
// @desc    Update subscription
// @access  Private
router.put('/:id', [
  authenticate,
  requireCustomerOrAdmin,
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  body('installation.scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Valid installation date is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow updates for pending or active subscriptions
    if (!['pending', 'active'].includes(subscription.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update subscription in current status'
      });
    }

    const { address, installation } = req.body;

    // Update allowed fields
    if (address) subscription.address = { ...subscription.address, ...address };
    if (installation) subscription.installation = { ...subscription.installation, ...installation };

    await subscription.save();

    // Populate for response
    await subscription.populate([
      { path: 'userId', select: 'name email phone' },
      { path: 'services.serviceId', select: 'name category price description' }
    ]);

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: {
        subscription
      }
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating subscription'
    });
  }
});

// @route   PUT /api/subscriptions/:id/cancel
// @desc    Cancel subscription
// @access  Private
router.put('/:id/cancel', [
  authenticate,
  requireCustomerOrAdmin,
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if subscription can be cancelled
    if (['cancelled', 'expired'].includes(subscription.status)) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled or expired'
      });
    }

    const { reason = 'User requested cancellation' } = req.body;

    // Cancel subscription
    await subscription.cancel(reason);

    // Update service subscription counts
    for (const service of subscription.services) {
      const serviceDoc = await Service.findById(service.serviceId);
      if (serviceDoc) {
        await serviceDoc.decrementSubscriptions();
      }
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling subscription'
    });
  }
});

// @route   PUT /api/subscriptions/:id/pause
// @desc    Pause subscription
// @access  Private
router.put('/:id/pause', [
  authenticate,
  requireCustomerOrAdmin,
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if subscription can be paused
    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active subscriptions can be paused'
      });
    }

    const { reason = 'User requested pause' } = req.body;

    // Pause subscription
    await subscription.pause(reason);

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      data: {
        subscription
      }
    });

  } catch (error) {
    console.error('Pause subscription error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while pausing subscription'
    });
  }
});

// @route   PUT /api/subscriptions/:id/resume
// @desc    Resume paused subscription
// @access  Private
router.put('/:id/resume', authenticate, requireCustomerOrAdmin, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if subscription can be resumed
    if (subscription.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Only paused subscriptions can be resumed'
      });
    }

    // Resume subscription
    await subscription.resume();

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
      data: {
        subscription
      }
    });

  } catch (error) {
    console.error('Resume subscription error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while resuming subscription'
    });
  }
});

module.exports = router;
