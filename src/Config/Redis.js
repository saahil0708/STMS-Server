const redis = require('redis');

// Create a Redis client.
// Use the REDIS_URL from .env if available (for Cloud), otherwise default to localhost:6379
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Event listener for successful connection
redisClient.on('connect', () => {
    console.log('Connected to Redis Cache!');
});

// Event listener for errors
redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
});

// Function to connect to Redis, we will call this in server.js
const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.log('Could not connect to Redis:', error);
    }
};

module.exports = { redisClient, connectRedis };
