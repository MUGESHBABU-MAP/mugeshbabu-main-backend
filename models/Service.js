const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: {
      values: ['Cable', 'Silver', 'Snacks', 'Internet', 'Gaming', 'Design', 'Development'],
      message: 'Category must be one of: Cable, Silver, Snacks, Internet, Gaming, Design, Development'
    }
  },
  subcategory: {
    type: String,
    trim: true
  },
  price: {
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    },
    billingCycle: {
      type: String,
      enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    }
  },
  features: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    included: {
      type: Boolean,
      default: true
    }
  }],
  specifications: {
    type: Map,
    of: String
  },
  availability: {
    isActive: {
      type: Boolean,
      default: true
    },
    regions: [{
      type: String,
      trim: true
    }],
    maxSubscriptions: {
      type: Number,
      default: null
    },
    currentSubscriptions: {
      type: Number,
      default: 0
    }
  },
  constraints: {
    maxQuantityPerUser: {
      type: Number,
      default: 1
    },
    minSubscriptionPeriod: {
      type: Number,
      default: 1
    },
    maxOnlineOrderValue: {
      type: Number,
      default: null
    },
    requiresQuote: {
      type: Boolean,
      default: false
    }
  },
  media: {
    images: [{
      url: String,
      alt: String,
      isPrimary: { type: Boolean, default: false }
    }],
    videos: [{
      url: String,
      title: String,
      duration: Number
    }]
  },
  seo: {
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for seed purposes
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

serviceSchema.virtual('isAvailable').get(function () {
  if (!this.availability.isActive) return false;
  if (
    this.availability.maxSubscriptions &&
    this.availability.currentSubscriptions >= this.availability.maxSubscriptions
  ) {
    return false;
  }
  return true;
});

serviceSchema.virtual('formattedPrice').get(function () {
  const symbol = this.price.currency === 'INR' ? '₹' : '$';
  return `${symbol}${this.price.amount.toLocaleString()}`;
});

serviceSchema.index({ category: 1, 'availability.isActive': 1 });
serviceSchema.index({ 'price.amount': 1 });
serviceSchema.index({ tags: 1 });
serviceSchema.index({ 'seo.slug': 1 });
serviceSchema.index({ createdAt: -1 });

serviceSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.seo.slug) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

serviceSchema.statics.findActive = function () {
  return this.find({ 'availability.isActive': true });
};

serviceSchema.statics.findByCategory = function (category) {
  return this.find({ category, 'availability.isActive': true });
};

serviceSchema.statics.search = function (query) {
  return this.find({
    $and: [
      { 'availability.isActive': true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  });
};

serviceSchema.methods.canOrderOnline = function (orderValue = 0) {
  if (!this.availability.isActive) return false;
  if (
    this.constraints.maxOnlineOrderValue &&
    orderValue > this.constraints.maxOnlineOrderValue
  ) {
    return false;
  }
  return true;
};

serviceSchema.methods.incrementSubscriptions = function () {
  this.availability.currentSubscriptions += 1;
  return this.save();
};

serviceSchema.methods.decrementSubscriptions = function () {
  if (this.availability.currentSubscriptions > 0) {
    this.availability.currentSubscriptions -= 1;
  }
  return this.save();
};

module.exports = mongoose.model('Service', serviceSchema);