// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.split(' ')[1];

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        // This line is now fixed to use the hardcoded secret key
        const decoded = jwt.verify(token, 'a_very_secret_and_long_string_for_your_jwt');
        
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};