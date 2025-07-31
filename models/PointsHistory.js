// models/PointsHistory.js
const mongoose = require('mongoose');

const PointsHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String, // e.g., 'qr_scan', 'coupon_redeem'
        required: true,
    },
    points_change: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('PointsHistory', PointsHistorySchema);