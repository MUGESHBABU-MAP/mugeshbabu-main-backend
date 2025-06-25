const mongoose = require('mongoose')

const homeHighlightSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['feature', 'service'],
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    icon: {
        type: String, // For service: emoji | For feature: lucide icon name
        trim: true,
    },
    price: {
        type: String, // Only relevant for service
        trim: true,
    },
    order: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
})

homeHighlightSchema.index({ type: 1, isActive: 1, order: 1 })

module.exports = mongoose.model('HomeHighlight', homeHighlightSchema)