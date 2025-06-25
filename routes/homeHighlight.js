const express = require('express')
const router = express.Router()
const HomeHighlight = require('../models/HomeHighlight')

// GET /api/home-features
router.get('/home-features', async (req, res) => {
    try {
        const features = await HomeHighlight.find({ type: 'feature', isActive: true })
            .sort({ order: 1 })
            .select('title description icon') // omit _id if needed
        res.json({ success: true, data: features })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' })
    }
})

// GET /api/home-services
router.get('/home-services', async (req, res) => {
    try {
        const services = await HomeHighlight.find({ type: 'service', isActive: true })
            .sort({ order: 1 })
            .select('title description icon price') // omit _id if needed
        res.json({
            success: true, data: services.map(s => ({
                name: s.title,
                description: s.description,
                icon: s.icon,
                price: s.price,
            }))
        })
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' })
    }
})

module.exports = router