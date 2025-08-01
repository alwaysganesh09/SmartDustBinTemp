// --- Imports ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Serve the frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// --- Database Connection ---
// Hardcoding the string to ensure it works on Vercel
const connectionString = 'mongodb+srv://neelig552:YourActualPasswordHere@cluster0.unewaxi.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(connectionString)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
// The paths are corrected to go up one directory from /api to find /routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/user', require('../routes/user'));

// --- Start Server ---
// This is how Vercel will run the file, no app.listen is needed for serverless
module.exports = app;