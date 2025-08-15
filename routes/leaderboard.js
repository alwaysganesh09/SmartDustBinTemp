// routes/leaderboard.js
const express = require('express');
const User = require('../models/User'); // Assuming this is your user model

const router = express.Router();

/**
 * @route   GET /api/leaderboard/top
 * @desc    Get the top users by points and total scans
 * @access  Public
 */
router.get('/top', async (req, res) => {
    try {
        const topUsers = await User.aggregate([
            {
                $match: {
                    username: { $exists: true, $ne: null },
                    points: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    _id: 0,
                    username: 1,
                    points: 1,
                    scans: { $size: { $ifNull: ["$pointsHistory", []] } } 
                }
            },
            {
                $sort: { points: -1 }
            },
            {
                $limit: 10
            }
        ]);
        
        res.json(topUsers);
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        res.status(500).json({ message: "Server error fetching leaderboard" });
    }
});

module.exports = router;
