const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Service = require('../models/Service');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET all active services with filtering and pagination
router.get('/', [
  query('category')
    .optional()
    .isIn(['Cable', 'Silver', 'Snacks', 'Internet', 'Gaming', 'Design', 'Development'])
    .withMessage('Invalid category'),
  query('minPrice').optional().isNumeric(),
  query('maxPrice').optional().isNumeric(),
  query('search').optional().trim().isLength({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'ratings.average']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      category,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { 'availability.isActive': true };
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) query['price.amount'].$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortField = sortBy === 'price' ? 'price.amount' : sortBy;
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const services = await Service.find(query)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalServices = await Service.countDocuments(query);
    const totalPages = Math.ceil(totalServices / parseInt(limit));

    const servicesWithAvailability = services.map(service => ({
      ...service,
      isAvailable: service.availability.isActive &&
        (!service.availability.maxSubscriptions ||
          service.availability.currentSubscriptions < service.availability.maxSubscriptions)
    }));

    res.json({
      success: true,
      data: {
        services: servicesWithAvailability,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalServices,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        filters: { category, minPrice, maxPrice, search }
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching services' });
  }
});

// GET categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { 'availability.isActive': true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price.amount' },
          minPrice: { $min: '$price.amount' },
          maxPrice: { $max: '$price.amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map(cat => ({
          name: cat._id,
          count: cat.count,
          priceRange: {
            min: Math.round(cat.minPrice),
            max: Math.round(cat.maxPrice),
            average: Math.round(cat.avgPrice)
          }
        }))
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching categories' });
  }
});

// GET featured services
router.get('/featured', async (req, res) => {
  try {
    const featuredServices = await Service.find({
      'availability.isActive': true,
      $or: [
        { 'ratings.average': { $gte: 4.0 } },
        { 'availability.currentSubscriptions': { $gte: 10 } }
      ]
    })
      .populate('createdBy', 'name')
      .sort({ 'ratings.average': -1, 'availability.currentSubscriptions': -1 })
      .limit(6)
      .lean();

    res.json({ success: true, data: { services: featuredServices } });
  } catch (error) {
    console.error('Get featured services error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching featured services' });
  }
});

// GET single service by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!service || (!service.availability.isActive && (!req.user || req.user.role !== 'admin'))) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, data: { service } });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching service' });
  }
});

// GET single service by slug
router.get('/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const service = await Service.findOne({ 'seo.slug': req.params.slug })
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!service || (!service.availability.isActive && (!req.user || req.user.role !== 'admin'))) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, data: { service } });
  } catch (error) {
    console.error('Get service by slug error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching service' });
  }
});

// GET service availability
router.get('/:id/availability', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const isAvailable = service.isAvailable;
    const info = {
      isAvailable,
      isActive: service.availability.isActive,
      currentSubscriptions: service.availability.currentSubscriptions,
      maxSubscriptions: service.availability.maxSubscriptions,
      regions: service.availability.regions
    };

    if (service.category === 'Silver' && service.constraints.maxOnlineOrderValue) {
      info.maxOnlineOrderValue = service.constraints.maxOnlineOrderValue;
      info.requiresQuoteAbove = service.constraints.maxOnlineOrderValue;
    }

    res.json({ success: true, data: { availability: info } });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ success: false, message: 'Server error while checking availability' });
  }
});

// GET similar services
router.get('/:id/similar', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const priceRange = service.price.amount * 0.3;
    const similarServices = await Service.find({
      _id: { $ne: service._id },
      'availability.isActive': true,
      $or: [
        { category: service.category },
        { 'price.amount': { $gte: service.price.amount - priceRange, $lte: service.price.amount + priceRange } },
        { tags: { $in: service.tags } }
      ]
    })
      .limit(4)
      .select('name description category price media ratings seo')
      .lean();

    res.json({ success: true, data: { services: similarServices } });
  } catch (error) {
    console.error('Get similar services error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching similar services' });
  }
});

module.exports = router;