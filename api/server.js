// --- Imports ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// --- App Initialization ---
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
// The paths are corrected to use the standard require from the root directory.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/coupons', require('./routes/coupon.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard')); 

// --- Export for Vercel ---
module.exports = app;
