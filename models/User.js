// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    points: {
        type: Number,
        default: 0,
    },
    lastScans: {
        type: Map,
        of: Date,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);