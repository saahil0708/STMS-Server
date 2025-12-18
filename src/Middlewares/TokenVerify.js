const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return res.status(401).json({ message: 'Malformed token' });

    const token = parts[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) console.warn('Warning: JWT_SECRET is not set. Using fallback secret is insecure in production.');

    jwt.verify(token, secret || 'change_this_secret', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = decoded;
        next();
    });
}

module.exports = { verifyToken };