// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // FIXED: Was a string, now correctly required
const nodemailer = require('nodemailer'); // FIXED: Was a string, now correctly required
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');

// --- Configuration Variables (Hardcoded) ---
// WARNING: This is not secure for production. Use environment variables instead.
const JWT_SECRET = 'your_super_secret_jwt_key_here'; // IMPORTANT: Use the SAME secret as in your other files
const EMAIL_USER = 'your_email@gmail.com';         // Your full Gmail address
const EMAIL_PASS = 'your_gmail_app_password';    // The 16-character password from Google
const FRONTEND_URL = 'https://smartdustbin-ten.vercel.app'; // UPDATED: Now points to your Vercel app

const router = express.Router();

// --- Register a new user (Your Original Code) ---
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            points: 100 // Welcome points!
        });

        await user.save();

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

// --- Login user (Your Original Code) ---
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

        // Note: The secret is now a constant defined at the top of the file
        const token = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- NEW: Endpoint 1: Request a Password Reset ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // Security best practice: don't reveal if an email is registered or not.
            return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // Create a special, short-lived token for password reset
        const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });
        const resetURL = `${FRONTEND_URL}/index.html?token=${resetToken}`;

        // Set up Nodemailer to send the email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request for Smart Dustbin',
            html: `
                <p>Hello ${user.username},</p>
                <p>You requested a password reset. Please click the link below to set a new password. This link will expire in 15 minutes.</p>
                <a href="${resetURL}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block;">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- NEW: Endpoint 2: Set the New Password ---
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Missing token or password.' });
    }

    try {
        // Verify the token is valid and not expired
        const decoded = jwt.verify(token, JWT_SECRET);

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Find user by the ID from the token and update their password
        await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        // This will catch errors for invalid or expired tokens
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired password reset token.' });
        }
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;