const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const HomeHighlight = require('../../models/HomeHighlight')

const highlights = [
    // FEATURES
    {
        type: 'feature',
        title: 'Premium Quality',
        description: 'Top-notch services with guaranteed satisfaction and quality assurance.',
        icon: 'Star',
        order: 1
    },
    {
        type: 'feature',
        title: 'Expert Support',
        description: '24/7 customer support with experienced professionals ready to help.',
        icon: 'Users',
        order: 2
    },
    {
        type: 'feature',
        title: 'Secure & Reliable',
        description: 'Your data and services are protected with enterprise-grade security.',
        icon: 'Shield',
        order: 3
    },
    {
        type: 'feature',
        title: 'Fast Installation',
        description: 'Quick and professional installation by certified technicians.',
        icon: 'Zap',
        order: 4
    },

    // SERVICES (for homepage banner)
    {
        type: 'service',
        title: 'Cable TV',
        description: 'Premium cable TV packages with 100+ channels',
        icon: '📺',
        price: 'Starting from ₹299/month',
        order: 1
    },
    {
        type: 'service',
        title: 'High-Speed Internet',
        description: 'Reliable broadband connection for home and office',
        icon: '🌐',
        price: 'Starting from ₹799/month',
        order: 2
    },
    {
        type: 'service',
        title: 'Silver Care',
        description: 'Professional silver utensil cleaning service',
        icon: '🥈',
        price: 'Starting from ₹1,500',
        order: 3
    },
    {
        type: 'service',
        title: 'Snack Delivery',
        description: 'Healthy snacks delivered monthly to your door',
        icon: '🍿',
        price: 'Starting from ₹899/month',
        order: 4
    },
    {
        type: 'service',
        title: 'Gaming Setup',
        description: 'Professional gaming setup consultation',
        icon: '🎮',
        price: 'Starting from ₹2,500',
        order: 5
    },
    {
        type: 'service',
        title: 'Design Services',
        description: 'Logo design and branding solutions',
        icon: '🎨',
        price: 'Starting from ₹5,000',
        order: 6
    },
]

mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(async () => {
        console.log('🚀 Connected to MongoDB')

        await HomeHighlight.deleteMany({})
        await HomeHighlight.insertMany(highlights)

        console.log('✅ Home highlights seeded successfully')
        mongoose.disconnect()
    })
    .catch((err) => {
        console.error('❌ Failed to seed home highlights:', err)
        process.exit(1)
    })