const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Coupon = require('../models/coupon.model');
const User = require('../models/User');
const History = require('../models/PointsHistory');

// --- GET ALL AVAILABLE COUPONS ---
// @route   GET /api/coupons
router.get('/', async (req, res) => {
    try {
        const availableCoupons = await Coupon.find({
            isActive: true,
            quantity: { $gt: 0 }, // $gt means "greater than"
            $or: [
                { expiryDate: { $exists: false } },
                { expiryDate: { $gt: new Date() } }
            ]
        });
        res.json(availableCoupons);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- REDEEM A COUPON ---
// @route   POST /api/coupons/redeem
router.post('/redeem', authMiddleware, async (req, res) => {
    const { couponId } = req.body;
    
    try {
        const user = await User.findById(req.user.id);
        const coupon = await Coupon.findById(couponId);

        // --- Validation Checks ---
        if (!coupon) {
            return res.status(404).json({ message: "Sorry, this coupon does not exist." });
        }
        if (coupon.quantity <= 0) {
            return res.status(400).json({ message: "This coupon is out of stock!" });
        }
        if (user.points < coupon.pointsRequired) {
            return res.status(400).json({ message: "You don't have enough points." });
        }
        
        // --- Perform Transaction ---
        user.points -= coupon.pointsRequired;
        coupon.quantity -= 1;

        await user.save();
        await coupon.save();

        // --- Create a history record for the transaction ---
        const historyRecord = new History({
            userId: user._id, // ✅ CORRECTED THIS LINE
            action: 'coupon_redeem',
            points_change: -coupon.pointsRequired,
            description: `Redeemed coupon: ${coupon.name}`
        });
        await historyRecord.save();
        
        // Generate a unique redeem code for the user to show
        const redeemCode = `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        res.json({
            message: "Coupon redeemed successfully!",
            newPoints: user.points,
            redeemCode: redeemCode
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;