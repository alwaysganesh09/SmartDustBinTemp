// server.js

// --- Imports ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // To use environment variables

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

// --- Database Connection ---
// In server.js

// --- Database Connection ---

// In server.js

// --- Database Connection ---

// Use the long, standard string and your NEW password here
const connectionString = 'mongodb://neelig552:Ganesh9391864598@ac-gokgxlo-shard-00-00.unewaxi.mongodb.net:27017,ac-gokgxlo-shard-00-01.unewaxi.mongodb.net:27017,ac-gokgxlo-shard-00-02.unewaxi.mongodb.net:27017/?ssl=true&replicaSet=atlas-2f9dp3-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(connectionString)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});