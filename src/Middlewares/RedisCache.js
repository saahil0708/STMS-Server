const { redisClient, RedisUtils } = require('../Config/Redis');

/**
 * Enhanced middleware to cache responses using Redis with better performance
 * @param {string} keyPrefix - A unique prefix for the cache keys
 * @param {number} duration - Cache duration in seconds
 * @param {object} options - Additional options for caching
 */
const cache = (keyPrefix, duration, options = {}) => {
    return async (req, res, next) => {
        // Skip caching for non-GET requests unless explicitly allowed
        if (req.method !== 'GET' && !options.allowNonGet) {
            return next();
        }

        // Create a unique key based on URL and user context
        let key = keyPrefix ? `${keyPrefix}:${req.originalUrl}` : req.originalUrl;
        
        // Include user ID in cache key for user-specific data
        if (options.userSpecific && req.user) {
            key = `${key}:user:${req.user.id}`;
        }

        try {
            // Try to get cached data
            const cachedData = await redisClient.get(key);

            if (cachedData) {
                console.log(`Cache Hit for ${key}`);
                const parsedData = JSON.parse(cachedData);
                
                // Add cache headers
                res.set({
                    'X-Cache': 'HIT',
                    'X-Cache-Key': key
                });
                
                return res.json(parsedData);
            }

            console.log(`Cache Miss for ${key}`);

            // Capture response for caching
            const originalJson = res.json;
            const originalSend = res.send;

            res.json = function(data) {
                if (res.statusCode === 200 && data) {
                    // Cache successful responses
                    redisClient.setEx(key, duration, JSON.stringify(data)).catch(err => {
                        console.error('Error saving to cache:', err);
                    });
                }
                
                res.set({
                    'X-Cache': 'MISS',
                    'X-Cache-Key': key
                });
                
                return originalJson.call(this, data);
            };

            res.send = function(body) {
                if (res.statusCode === 200 && body && typeof body === 'string') {
                    try {
                        const data = JSON.parse(body);
                        redisClient.setEx(key, duration, body).catch(err => {
                            console.error('Error saving to cache:', err);
                        });
                    } catch (e) {
                        // Not JSON, cache as is
                        redisClient.setEx(key, duration, body).catch(err => {
                            console.error('Error saving to cache:', err);
                        });
                    }
                }
                
                res.set({
                    'X-Cache': 'MISS',
                    'X-Cache-Key': key
                });
                
                return originalSend.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Redis Cache Error:', error);
            next();
        }
    };
};

// Enhanced cache clearing with pattern support
const clearCache = async (keyPattern) => {
    try {
        await RedisUtils.clearCachePattern(`${keyPattern}:*`);
        console.log(`Cleared cache for pattern: ${keyPattern}`);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

// Cache warming function for frequently accessed data
const warmCache = async (key, dataFetcher, duration) => {
    try {
        const data = await dataFetcher();
        await redisClient.setEx(key, duration, JSON.stringify(data));
        console.log(`Cache warmed for key: ${key}`);
    } catch (error) {
        console.error('Error warming cache:', error);
    }
};

// Middleware to invalidate cache on data modifications
const invalidateCacheOnUpdate = (patterns = []) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        const originalSend = res.send;

        const clearRelatedCache = async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                for (const pattern of patterns) {
                    await clearCache(pattern);
                }
            }
        };

        res.json = function(data) {
            clearRelatedCache();
            return originalJson.call(this, data);
        };

        res.send = function(body) {
            clearRelatedCache();
            return originalSend.call(this, body);
        };

        next();
    };
};

module.exports = { 
    cache, 
    clearCache, 
    warmCache, 
    invalidateCacheOnUpdate 
};
