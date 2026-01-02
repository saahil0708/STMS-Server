const { redisClient } = require('../Config/Redis');

/**
 * Middleware to cache responses using Redis
 * @param {string} keyPrefix - A unique prefix for the cache keys (e.g., 'student_list')
 * @param {number} duration - Cache duration in seconds
 */
const cache = (keyPrefix, duration) => {
    return async (req, res, next) => {
        // Create a unique key based on the URL. 
        // We use the request URL so that different query parameters are cached separately.
        const key = keyPrefix ? `${keyPrefix}:${req.originalUrl}` : req.originalUrl;

        try {
            // Try to get the cached data from Redis
            const cachedData = await redisClient.get(key);

            if (cachedData) {
                // If data exists, send it immediately and skip the controller
                console.log(`Cache Hit for ${key}`);
                return res.json(JSON.parse(cachedData));
            }

            console.log(`Cache Miss for ${key}`);

            // If not found, we need to capture the response that the controller WOULD have sent.
            // We override res.send (which res.json also calls internally) to intercept the data.
            const originalSend = res.send;

            res.send = (body) => {
                // 'body' is the response data. It might be a string or object.
                // We need to store it in Redis.
                if (res.statusCode === 200) {
                    // Only cache successful 200 responses
                    redisClient.setEx(key, duration, body).catch(err => {
                        console.error('Error saving to cache:', err);
                    });
                }

                // Restore original send and call it to actually send response to user
                res.send = originalSend;
                return res.send(body);
            };

            next();
        } catch (error) {
            console.error('Redis Cache Error:', error);
            next(); // In case of error, just proceed without caching
        }
    };
};

// Helper function to clear cache (e.g., when data is updated)
// Usage: await clearCache('student_list');
const clearCache = async (keyPattern) => {
    try {
        // Get all keys matching the pattern
        const keys = await redisClient.keys(`${keyPattern}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`Cleared cache for pattern: ${keyPattern}`);
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

module.exports = { cache, clearCache };
