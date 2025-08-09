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
// This line correctly uses the secret variable from your Vercel settings.
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
// The paths are corrected to go up one directory from /api to find /routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/user', require('../routes/user'));

// --- ADD THIS LINE ---
// This tells your app to use the new coupon routes we created.
app.use('/api/coupons', require('../routes/coupon.routes')); // Or whatever you named the file

// --- Export for Vercel ---
// This is the standard way to export your app for Vercel's serverless environment.
module.exports = app;