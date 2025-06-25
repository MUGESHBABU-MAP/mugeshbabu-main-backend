const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Service = require('../models/Service');
const Subscription = require('../models/Subscription');

// Sample data
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@mugesh.media',
    password: 'admin123',
    role: 'admin',
    phone: '9876543210',
    address: {
      street: '123 Admin Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001'
    }
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'customer',
    phone: '9876543211',
    address: {
      street: '456 Customer Lane',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    }
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'customer',
    phone: '9876543212',
    address: {
      street: '789 User Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    }
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    password: 'password123',
    role: 'customer',
    phone: '9876543213',
    address: {
      street: '321 Service Road',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001'
    }
  }
];

const sampleServices = [
  // Cable Services
  {
    name: 'Basic Cable TV Package',
    description: 'Essential cable TV package with 100+ channels including news, entertainment, and sports.',
    category: 'Cable',
    subcategory: 'Basic',
    price: {
      amount: 299,
      currency: 'INR',
      billingCycle: 'monthly'
    },
    features: [
      { name: '100+ Channels', description: 'Wide variety of entertainment channels' },
      { name: 'HD Quality', description: 'High definition viewing experience' },
      { name: 'Free Installation', description: 'Professional installation included' }
    ],
    specifications: new Map([
      ['channels', '100+'],
      ['quality', 'HD'],
      ['installation', 'Free']
    ]),
    availability: {
      isActive: true,
      regions: ['Chennai', 'Bangalore', 'Mumbai', 'Delhi'],
      maxSubscriptions: null
    },
    constraints: {
      maxQuantityPerUser: 3,
      minSubscriptionPeriod: 1
    },
    tags: ['cable', 'tv', 'entertainment', 'basic'],
    media: {
      images: [
        { url: '/images/cable-basic.jpg', alt: 'Basic Cable Package', isPrimary: true }
      ]
    }
  },
  {
    name: 'Premium Cable TV Package',
    description: 'Premium cable TV package with 200+ channels, premium sports, and movie channels.',
    category: 'Cable',
    subcategory: 'Premium',
    price: {
      amount: 599,
      currency: 'INR',
      billingCycle: 'monthly'
    },
    features: [
      { name: '200+ Channels', description: 'Extensive channel lineup' },
      { name: '4K Quality', description: 'Ultra HD viewing experience' },
      { name: 'Premium Sports', description: 'All major sports channels' },
      { name: 'Movie Channels', description: 'Latest movies and series' }
    ],
    specifications: new Map([
      ['channels', '200+'],
      ['quality', '4K'],
      ['sports', 'Premium'],
      ['movies', 'Latest']
    ]),
    availability: {
      isActive: true,
      regions: ['Chennai', 'Bangalore', 'Mumbai', 'Delhi'],
      maxSubscriptions: null
    },
    constraints: {
      maxQuantityPerUser: 2,
      minSubscriptionPeriod: 3
    },
    tags: ['cable', 'tv', 'premium', 'sports', 'movies'],
    media: {
      images: [
        { url: '/images/cable-premium.jpg', alt: 'Premium Cable Package', isPrimary: true }
      ]
    }
  },
  // Internet Services
  {
    name: 'High-Speed Broadband 50 Mbps',
    description: 'Reliable high-speed internet connection perfect for home and small office use.',
    category: 'Internet',
    subcategory: 'Broadband',
    price: {
      amount: 799,
      currency: 'INR',
      billingCycle: 'monthly'
    },
    features: [
      { name: '50 Mbps Speed', description: 'Fast download and upload speeds' },
      { name: 'Unlimited Data', description: 'No data caps or limits' },
      { name: '24/7 Support', description: 'Round the clock technical support' },
      { name: 'Free Router', description: 'WiFi router included' }
    ],
    specifications: new Map([
      ['speed', '50 Mbps'],
      ['data', 'Unlimited'],
      ['support', '24/7'],
      ['equipment', 'Free Router']
    ]),
    availability: {
      isActive: true,
      regions: ['Chennai', 'Bangalore', 'Mumbai', 'Delhi'],
      maxSubscriptions: null
    },
    constraints: {
      maxQuantityPerUser: 2,
      minSubscriptionPeriod: 6
    },
    tags: ['internet', 'broadband', 'wifi', 'unlimited'],
    media: {
      images: [
        { url: '/images/internet-50mbps.jpg', alt: '50 Mbps Internet', isPrimary: true }
      ]
    }
  },
  // Silver Services
  {
    name: 'Silver Utensil Care - Basic',
    description: 'Professional cleaning and maintenance service for your silver utensils and jewelry.',
    category: 'Silver',
    subcategory: 'Care',
    price: {
      amount: 1500,
      currency: 'INR',
      billingCycle: 'one-time'
    },
    features: [
      { name: 'Professional Cleaning', description: 'Expert silver cleaning techniques' },
      { name: 'Polishing Service', description: 'Restore original shine' },
      { name: 'Home Pickup', description: 'Convenient pickup and delivery' },
      { name: 'Insurance Coverage', description: 'Items insured during service' }
    ],
    specifications: new Map([
      ['service', 'Professional'],
      ['pickup', 'Home'],
      ['insurance', 'Covered'],
      ['turnaround', '3-5 days']
    ]),
    availability: {
      isActive: true,
      regions: ['Chennai', 'Bangalore', 'Mumbai'],
      maxSubscriptions: 50
    },
    constraints: {
      maxQuantityPerUser: 5,
      minSubscriptionPeriod: 1,
      maxOnlineOrderValue: 10000,
      requiresQuote: true
    },
    tags: ['silver', 'cleaning', 'utensils', 'jewelry', 'care'],
    media: {
      images: [
        { url: '/images/silver-care.jpg', alt: 'Silver Care Service', isPrimary: true }
      ]
    }
  },
  // Snack Services
  {
    name: 'Healthy Snack Box - Monthly',
    description: 'Curated selection of healthy and delicious snacks delivered monthly to your doorstep.',
    category: 'Snacks',
    subcategory: 'Subscription',
    price: {
      amount: 899,
      currency: 'INR',
      billingCycle: 'monthly'
    },
    features: [
      { name: '15+ Snack Items', description: 'Variety of healthy snacks' },
      { name: 'Nutritionist Curated', description: 'Expert selected items' },
      { name: 'Home Delivery', description: 'Delivered to your doorstep' },
      { name: 'Customizable', description: 'Dietary preferences considered' }
    ],
    specifications: new Map([
      ['items', '15+'],
      ['curation', 'Nutritionist'],
      ['delivery', 'Home'],
      ['customization', 'Available']
    ]),
    availability: {
      isActive: true,
      regions: ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Pune'],
      maxSubscriptions: null
    },
    constraints: {
      maxQuantityPerUser: 3,
      minSubscriptionPeriod: 1
    },
    tags: ['snacks', 'healthy', 'subscription', 'delivery', 'monthly'],
    media: {
      images: [
        { url: '/images/snack-box.jpg', alt: 'Healthy Snack Box', isPrimary: true }
      ]
    }
  },
  // Gaming Services
  {
    name: 'Gaming Setup Consultation',
    description: 'Professional gaming setup consultation and optimization for the ultimate gaming experience.',
    category: 'Gaming',
    subcategory: 'Consultation',
    price: {
      amount: 2500,
      currency: 'INR',
      billingCycle: 'one-time'
    },
    features: [
      { name: 'Hardware Assessment', description: 'Complete system evaluation' },
      { name: 'Performance Optimization', description: 'Maximize gaming performance' },
      { name: 'Setup Configuration', description: 'Optimal gaming setup' },
      { name: 'Follow-up Support', description: '30 days support included' }
    ],
    specifications: new Map([
      ['assessment', 'Complete'],
      ['optimization', 'Performance'],
      ['support', '30 days'],
      ['consultation', '2-3 hours']
    ]),
    availability: {
      isActive: true,
      regions: ['Chennai', 'Bangalore', 'Mumbai', 'Delhi'],
      maxSubscriptions: 20
    },
    constraints: {
      maxQuantityPerUser: 2,
      minSubscriptionPeriod: 1
    },
    tags: ['gaming', 'consultation', 'setup', 'optimization'],
    media: {
      images: [
        { url: '/images/gaming-setup.jpg', alt: 'Gaming Setup', isPrimary: true }
      ]
    }
  },
  // Design Services
  {
    name: 'Logo Design Package',
    description: 'Professional logo design service with multiple concepts and unlimited revisions.',
    category: 'Design',
    subcategory: 'Branding',
    price: {
      amount: 5000,
      currency: 'INR',
      billingCycle: 'one-time'
    },
    features: [
      { name: '3 Logo Concepts', description: 'Multiple design options' },
      { name: 'Unlimited Revisions', description: 'Perfect your design' },
      { name: 'Vector Files', description: 'High-quality scalable formats' },
      { name: 'Brand Guidelines', description: 'Usage guidelines included' }
    ],
    specifications: new Map([
      ['concepts', '3'],
      ['revisions', 'Unlimited'],
      ['formats', 'Vector + Raster'],
      ['turnaround', '5-7 days']
    ]),
    availability: {
      isActive: true,
      regions: ['All India'],
      maxSubscriptions: null
    },
    constraints: {
      maxQuantityPerUser: 5,
      minSubscriptionPeriod: 1
    },
    tags: ['design', 'logo', 'branding', 'graphics'],
    media: {
      images: [
        { url: '/images/logo-design.jpg', alt: 'Logo Design', isPrimary: true }
      ]
    }
  },
  // Development Services
  {
    name: 'Website Development - Basic',
    description: 'Professional website development service for small businesses and personal use.',
    category: 'Development',
    subcategory: 'Web',
    price: {
      amount: 15000,
      currency: 'INR',
      billingCycle: 'one-time'
    },
    features: [
      { name: 'Responsive Design', description: 'Mobile-friendly website' },
      { name: '5 Pages Included', description: 'Complete website structure' },
      { name: 'SEO Optimized', description: 'Search engine friendly' },
      { name: '1 Year Support', description: 'Maintenance and updates' }
    ],
    specifications: new Map([
      ['pages', '5'],
      ['responsive', 'Yes'],
      ['seo', 'Optimized'],
      ['support', '1 Year']
    ]),
    availability: {
      isActive: true,
      regions: ['All India'],
      maxSubscriptions: null
    },
    constraints: {
      maxQuantityPerUser: 3,
      minSubscriptionPeriod: 1
    },
    tags: ['development', 'website', 'responsive', 'seo'],
    media: {
      images: [
        { url: '/images/web-development.jpg', alt: 'Website Development', isPrimary: true }
      ]
    }
  }
];

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mugesh_media', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Service.deleteMany({});
    await Subscription.deleteMany({});
    console.log('🗑️  Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    const users = [];
    
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      users.push(user);
    }
    
    console.log(`👥 Created ${users.length} users`);
    return users;
  } catch (error) {
    console.error('Error seeding users:', error);
    return [];
  }
};

// Seed services
const seedServices = async (users) => {
  try {
    const adminUser = users.find(user => user.role === 'admin');
    const services = [];
    
    for (const serviceData of sampleServices) {
      const service = new Service({
        ...serviceData,
        createdBy: adminUser._id,
        ratings: {
          average: Math.random() * 2 + 3, // Random rating between 3-5
          count: Math.floor(Math.random() * 50) + 10 // Random count between 10-60
        }
      });
      await service.save();
      services.push(service);
    }
    
    console.log(`🛍️  Created ${services.length} services`);
    return services;
  } catch (error) {
    console.error('Error seeding services:', error);
    return [];
  }
};

// Seed subscriptions
const seedSubscriptions = async (users, services) => {
  try {
    const customerUsers = users.filter(user => user.role === 'customer');
    const subscriptions = [];
    
    // Create sample subscriptions
    for (let i = 0; i < customerUsers.length; i++) {
      const user = customerUsers[i];
      const numSubscriptions = Math.floor(Math.random() * 3) + 1; // 1-3 subscriptions per user
      
      for (let j = 0; j < numSubscriptions; j++) {
        const randomServices = services
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 2) + 1); // 1-2 services per subscription
        
        const subscriptionServices = randomServices.map(service => ({
          serviceId: service._id,
          quantity: 1,
          priceAtSubscription: {
            amount: service.price.amount,
            currency: service.price.currency,
            billingCycle: service.price.billingCycle
          }
        }));
        
        const subtotal = subscriptionServices.reduce((sum, s) => {
          const service = services.find(srv => srv._id.equals(s.serviceId));
          return sum + (service.price.amount * s.quantity);
        }, 0);
        
        const taxes = Math.round(subtotal * 0.18);
        const total = subtotal + taxes;
        
        const subscription = new Subscription({
          userId: user._id,
          services: subscriptionServices,
          planName: `Custom Plan - ${user.name}`,
          pricing: {
            subtotal,
            taxes,
            total,
            currency: 'INR'
          },
          billingCycle: 'monthly',
          status: ['pending', 'active', 'paused'][Math.floor(Math.random() * 3)],
          paymentStatus: ['pending', 'paid'][Math.floor(Math.random() * 2)],
          address: user.address,
          installation: {
            isRequired: randomServices.some(s => ['Cable', 'Internet'].includes(s.category)),
            status: 'not-required'
          },
          metadata: {
            source: 'web'
          }
        });
        
        await subscription.save();
        subscriptions.push(subscription);
        
        // Update service subscription counts
        for (const service of randomServices) {
          await service.incrementSubscriptions();
        }
      }
    }
    
    console.log(`📋 Created ${subscriptions.length} subscriptions`);
    return subscriptions;
  } catch (error) {
    console.error('Error seeding subscriptions:', error);
    return [];
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearDatabase();
    
    const users = await seedUsers();
    const services = await seedServices(users);
    const subscriptions = await seedSubscriptions(users, services);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Services: ${services.length}`);
    console.log(`   Subscriptions: ${subscriptions.length}`);
    
    console.log('\n🔐 Admin Credentials:');
    console.log('   Email: admin@mugesh.media');
    console.log('   Password: admin123');
    
    console.log('\n👤 Sample Customer Credentials:');
    console.log('   Email: john@example.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
