// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');

const router = express.Router();

// --- Register a new user ---
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check for existing user by email OR username
        let existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Add 100 points for the welcome bonus
        const user = new User({ 
            username, 
            email, 
            password: hashedPassword, 
            points: 100 
        });

        await user.save();

        // Create a history record for the bonus points
        await PointsHistory.create({
            userId: user.id,
            action: 'welcome_bonus',
            points_change: 100,
            description: 'Welcome bonus for registering!',
        });

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Login user ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = { user: { id: user.id } };
        
        // Use the JWT_SECRET from the environment variables
        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ token });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
