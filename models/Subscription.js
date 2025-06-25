const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1']
    },
    customizations: {
      type: Map,
      of: String
    },
    priceAtSubscription: {
      amount: Number,
      currency: String,
      billingCycle: String
    }
  }],
  planName: {
    type: String,
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    taxes: {
      type: Number,
      default: 0,
      min: [0, 'Taxes cannot be negative']
    },
    discounts: {
      type: Number,
      default: 0,
      min: [0, 'Discounts cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    }
  },
  billingCycle: {
    type: String,
    enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'active', 'paused', 'cancelled', 'expired', 'failed'],
      message: 'Status must be one of: pending, active, paused, cancelled, expired, failed'
    },
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partial'],
    default: 'pending'
  },
  dates: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    nextBillingDate: {
      type: Date
    },
    lastPaymentDate: {
      type: Date
    },
    cancelledDate: {
      type: Date
    },
    pausedDate: {
      type: Date
    }
  },
  installation: {
    isRequired: {
      type: Boolean,
      default: false
    },
    scheduledDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['not-required', 'scheduled', 'in-progress', 'completed', 'failed'],
      default: 'not-required'
    },
    technician: {
      name: String,
      phone: String,
      email: String
    },
    notes: String
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
    },
    landmark: {
      type: String,
      trim: true
    }
  },
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cash', 'cheque'],
      required: true
    },
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  notifications: {
    emailSent: {
      type: Boolean,
      default: false
    },
    smsSent: {
      type: Boolean,
      default: false
    },
    lastNotificationDate: Date
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin', 'api'],
      default: 'web'
    },
    referralCode: String,
    promoCode: String,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subscription duration in days
subscriptionSchema.virtual('durationInDays').get(function() {
  if (!this.dates.endDate) return null;
  const start = this.dates.startDate || this.createdAt;
  const end = this.dates.endDate;
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.dates.endDate || this.status !== 'active') return null;
  const now = new Date();
  const end = this.dates.endDate;
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
});

// Virtual for total paid amount
subscriptionSchema.virtual('totalPaid').get(function() {
  return this.paymentHistory
    .filter(payment => payment.status === 'success')
    .reduce((total, payment) => total + payment.amount, 0);
});

// Virtual for formatted total price
subscriptionSchema.virtual('formattedTotal').get(function() {
  const symbol = this.pricing.currency === 'INR' ? '₹' : '$';
  return `${symbol}${this.pricing.total.toLocaleString()}`;
});

// Indexes for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, 'dates.nextBillingDate': 1 });
subscriptionSchema.index({ 'services.serviceId': 1 });
subscriptionSchema.index({ createdAt: -1 });
subscriptionSchema.index({ 'dates.endDate': 1 });

// Calculate end date and next billing date before saving
subscriptionSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('dates.startDate') || this.isModified('billingCycle')) {
    const startDate = this.dates.startDate || new Date();
    
    // Calculate next billing date based on billing cycle
    let nextBilling = new Date(startDate);
    switch (this.billingCycle) {
      case 'monthly':
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        break;
      case 'quarterly':
        nextBilling.setMonth(nextBilling.getMonth() + 3);
        break;
      case 'yearly':
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        break;
      case 'one-time':
        nextBilling = null;
        break;
    }
    
    this.dates.nextBillingDate = nextBilling;
  }
  
  next();
});

// Static method to find active subscriptions
subscriptionSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Static method to find subscriptions by user
subscriptionSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).populate('services.serviceId');
};

// Static method to find expiring subscriptions
subscriptionSchema.statics.findExpiring = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    'dates.endDate': { $lte: futureDate, $gte: new Date() }
  });
};

// Static method to find subscriptions due for billing
subscriptionSchema.statics.findDueForBilling = function() {
  return this.find({
    status: 'active',
    'dates.nextBillingDate': { $lte: new Date() }
  });
};

// Instance method to cancel subscription
subscriptionSchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';
  this.dates.cancelledDate = new Date();
  this.metadata.notes = this.metadata.notes ? 
    `${this.metadata.notes}\nCancelled: ${reason}` : 
    `Cancelled: ${reason}`;
  return this.save();
};

// Instance method to pause subscription
subscriptionSchema.methods.pause = function(reason = '') {
  this.status = 'paused';
  this.dates.pausedDate = new Date();
  this.metadata.notes = this.metadata.notes ? 
    `${this.metadata.notes}\nPaused: ${reason}` : 
    `Paused: ${reason}`;
  return this.save();
};

// Instance method to resume subscription
subscriptionSchema.methods.resume = function() {
  this.status = 'active';
  this.dates.pausedDate = null;
  return this.save();
};

// Instance method to add payment
subscriptionSchema.methods.addPayment = function(paymentData) {
  this.paymentHistory.push(paymentData);
  if (paymentData.status === 'success') {
    this.paymentStatus = 'paid';
    this.dates.lastPaymentDate = paymentData.paidAt || new Date();
  }
  return this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
