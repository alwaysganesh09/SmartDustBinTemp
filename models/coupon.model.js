const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    pointsRequired: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiryDate: {
        type: Date
    },
    // --- Final fields for hybrid coupons ---
    cashPrice: {
        type: Number,
        default: 0
    },
    imageUrl: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;