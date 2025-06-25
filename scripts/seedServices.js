const mongoose = require('mongoose');
const Service = require('../models/Service');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const services = [
    {
        name: "Cable TV Basic",
        description: "Essential cable TV package with popular channels",
        category: "Cable",
        price: {
            amount: 299,
            currency: "INR",
            billingCycle: "monthly"
        },
        features: [
            { name: "150+ Channels" },
            { name: "HD Quality" },
            { name: "24/7 Support" },
            { name: "Free Installation" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.5, count: 1250 },
        seo: {
            slug: "cable-tv-basic",
            metaTitle: "Cable TV Basic Plan",
            metaDescription: "150+ HD channels, support, and free setup.",
            keywords: ["cable", "tv", "basic"]
        },
        tags: ["tv", "cable", "basic"]
    },
    {
        name: "Cable TV Premium",
        description: "Complete entertainment package with premium channels",
        category: "Cable",
        price: {
            amount: 599,
            currency: "INR",
            billingCycle: "monthly"
        },
        features: [
            { name: "300+ Channels" },
            { name: "4K Quality" },
            { name: "Sports Channels" },
            { name: "Movie Channels" },
            { name: "Kids Channels" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.8, count: 890 },
        seo: {
            slug: "cable-tv-premium",
            metaTitle: "Cable TV Premium Plan",
            metaDescription: "300+ 4K channels with sports and movie packages.",
            keywords: ["cable", "tv", "premium"]
        },
        tags: ["tv", "cable", "premium"]
    },
    {
        name: "Internet Basic",
        description: "High-speed internet for home use",
        category: "Internet",
        price: {
            amount: 499,
            currency: "INR",
            billingCycle: "monthly"
        },
        features: [
            { name: "50 Mbps Speed" },
            { name: "Unlimited Data" },
            { name: "Free Router" },
            { name: "24/7 Support" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.3, count: 2100 },
        seo: {
            slug: "internet-basic",
            metaTitle: "Internet Basic Plan",
            metaDescription: "Affordable 50 Mbps plan with unlimited data.",
            keywords: ["internet", "basic", "router"]
        },
        tags: ["internet", "basic"]
    },
    {
        name: "Internet Premium",
        description: "Ultra-high-speed internet for heavy users",
        category: "Internet",
        price: {
            amount: 899,
            currency: "INR",
            billingCycle: "monthly"
        },
        features: [
            { name: "200 Mbps Speed" },
            { name: "Unlimited Data" },
            { name: "Gaming Optimized" },
            { name: "Business Support" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.7, count: 1560 },
        seo: {
            slug: "internet-premium",
            metaTitle: "Internet Premium Plan",
            metaDescription: "High-speed plan for gamers and professionals.",
            keywords: ["internet", "premium", "gaming"]
        },
        tags: ["internet", "premium"]
    },
    {
        name: "Silver Care Basic",
        description: "Professional silver utensil cleaning service",
        category: "Silver",
        price: {
            amount: 1299,
            currency: "INR",
            billingCycle: "one-time"
        },
        features: [
            { name: "Up to 10 Items" },
            { name: "Pickup & Delivery" },
            { name: "Professional Cleaning" },
            { name: "1 Week Guarantee" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.6, count: 750 },
        seo: {
            slug: "silver-care-basic",
            metaTitle: "Silver Care Basic Service",
            metaDescription: "Expert silver cleaning with guaranteed quality.",
            keywords: ["silver", "cleaning", "basic"]
        },
        tags: ["silver", "cleaning"]
    },
    {
        name: "Silver Care Premium",
        description: "Complete silver maintenance with insurance",
        category: "Silver",
        price: {
            amount: 2999,
            currency: "INR",
            billingCycle: "monthly"
        },
        features: [
            { name: "Unlimited Items" },
            { name: "Insurance Coverage" },
            { name: "Premium Cleaning" },
            { name: "Monthly Service" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.9, count: 425 },
        seo: {
            slug: "silver-care-premium",
            metaTitle: "Silver Care Premium Service",
            metaDescription: "All-inclusive silver service with insurance.",
            keywords: ["silver", "premium", "maintenance"]
        },
        tags: ["silver", "premium"]
    },
    {
        name: "Daily Snacks",
        description: "Fresh snacks delivered daily to your doorstep",
        category: "Snacks",
        price: {
            amount: 199,
            currency: "INR",
            billingCycle: "monthly"
        },
        features: [
            { name: "3 Snack Types" },
            { name: "Fresh Daily" },
            { name: "Healthy Options" },
            { name: "Custom Preferences" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.4, count: 1890 },
        seo: {
            slug: "daily-snacks",
            metaTitle: "Daily Snacks Service",
            metaDescription: "Daily healthy snacks with personalized options.",
            keywords: ["snacks", "daily", "healthy"]
        },
        tags: ["snacks", "daily", "healthy"]
    },
    {
        name: "Weekly Snack Box",
        description: "Curated weekly snack box with variety",
        category: "Snacks",
        price: {
            amount: 999,
            currency: "INR",
            billingCycle: "monthly"
        },
        features: [
            { name: "20+ Snack Types" },
            { name: "International Brands" },
            { name: "Surprise Items" },
            { name: "Family Pack" }
        ],
        availability: { isActive: true, regions: ["India"] },
        constraints: {},
        ratings: { average: 4.7, count: 920 },
        seo: {
            slug: "weekly-snack-box",
            metaTitle: "Weekly Snack Box",
            metaDescription: "Diverse snacks from around the world delivered weekly.",
            keywords: ["snacks", "weekly", "box"]
        },
        tags: ["snacks", "weekly", "box"]
    }
];

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    await Service.deleteMany({});
    await Service.insertMany(services);
    console.log('✅ Services seeded successfully');
    mongoose.disconnect();
}).catch(err => {
    console.error('❌ Error seeding services:', err);
});