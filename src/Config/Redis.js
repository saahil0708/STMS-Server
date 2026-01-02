const redis = require('redis');

// Create a Redis client with optimized configuration
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        connectTimeout: 60000,
        lazyConnect: true,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
});

// Event listener for successful connection
redisClient.on('connect', () => {
    console.log('Connected to Redis Cache!');
});

// Event listener for errors
redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
});

// Function to connect to Redis
const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.log('Could not connect to Redis:', error);
    }
};

// Redis utility functions for session management
const RedisUtils = {
    // Session management
    async setSession(userId, sessionData, expirationInSeconds = 3600) {
        const key = `session:${userId}`;
        await redisClient.setEx(key, expirationInSeconds, JSON.stringify(sessionData));
    },

    async getSession(userId) {
        const key = `session:${userId}`;
        const session = await redisClient.get(key);
        return session ? JSON.parse(session) : null;
    },

    async deleteSession(userId) {
        const key = `session:${userId}`;
        await redisClient.del(key);
    },

    // Token blacklisting for logout
    async blacklistToken(token, expirationInSeconds = 3600) {
        const key = `blacklist:${token}`;
        await redisClient.setEx(key, expirationInSeconds, 'true');
    },

    async isTokenBlacklisted(token) {
        const key = `blacklist:${token}`;
        const result = await redisClient.get(key);
        return result === 'true';
    },

    // User data caching
    async cacheUser(userId, userData, expirationInSeconds = 1800) {
        const key = `user:${userId}`;
        await redisClient.setEx(key, expirationInSeconds, JSON.stringify(userData));
    },

    async getCachedUser(userId) {
        const key = `user:${userId}`;
        const user = await redisClient.get(key);
        return user ? JSON.parse(user) : null;
    },

    async deleteCachedUser(userId) {
        const key = `user:${userId}`;
        await redisClient.del(key);
    },

    // Rate limiting
    async checkRateLimit(identifier, maxRequests = 5, windowInSeconds = 300) {
        const key = `rate_limit:${identifier}`;
        const current = await redisClient.incr(key);
        
        if (current === 1) {
            await redisClient.expire(key, windowInSeconds);
        }
        
        return {
            count: current,
            remaining: Math.max(0, maxRequests - current),
            exceeded: current > maxRequests
        };
    },

    // Clear all cache patterns
    async clearCachePattern(pattern) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    }
};

module.exports = { redisClient, connectRedis, RedisUtils };
