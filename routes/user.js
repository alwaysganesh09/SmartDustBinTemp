// routes/user.js
const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');

const router = express.Router();

// --- Get user profile ---
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        const history = await PointsHistory.find({ userId: req.user.id }).sort({ created_at: -1 });
        res.json({ user, history });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Handle QR Scan ---
router.post('/scan', auth, async (req, res) => {
    const { qrCode } = req.body;
    const EXPECTED_QR_CODE = 'https://qrco.de/bgBWbc';
    const QR_SCAN_COOLDOWN_MS = 5 * 60 * 1000;

    if (qrCode !== EXPECTED_QR_CODE) {
        return res.status(400).json({ message: 'Invalid QR Code.' });
    }
    
    try {
        const user = await User.findById(req.user.id);
        const scanKey = 'dustbin_qr_1'; // <-- Use a simple key without dots

        const lastScanTime = user.lastScans.get(scanKey);

        if (lastScanTime && (new Date() - lastScanTime < QR_SCAN_COOLDOWN_MS)) {
            const remaining = Math.ceil((QR_SCAN_COOLDOWN_MS - (new Date() - lastScanTime)) / 60000);
            return res.status(429).json({ message: `Please wait ${remaining} more minute(s).` });
        }

        const pointsEarned = 10;
        user.points += pointsEarned;
        user.lastScans.set(scanKey, new Date()); // <-- Use the new safe key here
        await user.save();
        
        await PointsHistory.create({
            userId: user.id,
            action: 'qr_scan',
            points_change: pointsEarned,
            description: 'Scanned Dust Bin QR',
        });
        
        res.json({ points: user.points, message: `+${pointsEarned} points added!` });

    } catch (err) {
        console.error("Error during QR scan:", err);
        res.status(500).json({ message: 'Server error during scan' });
    }
});

// --- Redeem Coupon ---
router.post('/redeem', auth, async (req, res) => {
    const { couponId, pointsRequired, couponName } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (user.points < pointsRequired) {
            return res.status(400).json({ message: 'Insufficient points.' });
        }

        user.points -= pointsRequired;
        await user.save();

        await PointsHistory.create({
            userId: user.id,
            action: 'coupon_redeem',
            points_change: -pointsRequired,
            description: `Redeemed: ${couponName}`,
        });

        res.json({ points: user.points, message: 'Coupon redeemed successfully!' });
    } catch (err) {
        console.error("Error redeeming coupon:", err);
        res.status(500).json({ message: 'Server error during redeem' });
    }
});

module.exports = router;