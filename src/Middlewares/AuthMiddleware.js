const jwt = require('jsonwebtoken');
const { RedisUtils } = require('../Config/Redis');

// Enhanced token verification with Redis session management
const verifyTokenWithSession = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            return res.status(401).json({ message: 'Malformed token' });
        }

        const token = parts[1];
        
        // Check if token is blacklisted
        const isBlacklisted = await RedisUtils.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(401).json({ message: 'Token has been invalidated' });
        }

        const secret = process.env.JWT_SECRET || 'change_this_secret';
        
        jwt.verify(token, secret, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            // Check if session exists in Redis
            const session = await RedisUtils.getSession(decoded.id);
            if (!session) {
                return res.status(401).json({ message: 'Session expired. Please login again.' });
            }

            // Extend session if it's about to expire (less than 10 minutes left)
            if (session.expiresAt && (session.expiresAt - Date.now()) < 600000) {
                const newExpiresAt = Date.now() + 3600000; // 1 hour from now
                await RedisUtils.setSession(decoded.id, {
                    ...session,
                    expiresAt: newExpiresAt
                }, 3600);
            }

            req.user = decoded;
            req.session = session;
            next();
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Authentication error' });
    }
};

// Rate limiting middleware
const rateLimitMiddleware = (maxRequests = 10, windowInSeconds = 300) => {
    return async (req, res, next) => {
        try {
            const identifier = req.ip || req.connection.remoteAddress;
            const rateLimit = await RedisUtils.checkRateLimit(identifier, maxRequests, windowInSeconds);
            
            if (rateLimit.exceeded) {
                return res.status(429).json({ 
                    message: 'Too many requests. Please try again later.',
                    retryAfter: windowInSeconds
                });
            }

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': maxRequests,
                'X-RateLimit-Remaining': rateLimit.remaining,
                'X-RateLimit-Reset': new Date(Date.now() + windowInSeconds * 1000).toISOString()
            });

            next();
        } catch (error) {
            console.error('Rate limit error:', error);
            next(); // Continue on error
        }
    };
};

module.exports = { 
    verifyTokenWithSession, 
    rateLimitMiddleware 
};