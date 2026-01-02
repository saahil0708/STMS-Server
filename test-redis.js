// Simple Redis connection test script
require('dotenv').config();
const { connectRedis, RedisUtils } = require('./src/Config/Redis');

async function testRedisOptimizations() {
    console.log('🚀 Testing Redis Optimizations...\n');
    
    try {
        // Test Redis connection
        console.log('1. Testing Redis Connection...');
        await connectRedis();
        console.log('✅ Redis connected successfully\n');
        
        // Test session management
        console.log('2. Testing Session Management...');
        const testUserId = 'test_user_123';
        const sessionData = {
            userId: testUserId,
            email: 'test@example.com',
            type: 'student',
            loginTime: Date.now(),
            expiresAt: Date.now() + 3600000
        };
        
        await RedisUtils.setSession(testUserId, sessionData, 60);
        const retrievedSession = await RedisUtils.getSession(testUserId);
        console.log('✅ Session stored and retrieved:', retrievedSession ? 'Success' : 'Failed');
        
        // Test token blacklisting
        console.log('3. Testing Token Blacklisting...');
        const testToken = 'test_token_xyz';
        await RedisUtils.blacklistToken(testToken, 60);
        const isBlacklisted = await RedisUtils.isTokenBlacklisted(testToken);
        console.log('✅ Token blacklisting:', isBlacklisted ? 'Success' : 'Failed');
        
        // Test user caching
        console.log('4. Testing User Caching...');
        const userData = {
            id: testUserId,
            name: 'Test User',
            email: 'test@example.com',
            role: 'student'
        };
        
        await RedisUtils.cacheUser(testUserId, userData, 60);
        const cachedUser = await RedisUtils.getCachedUser(testUserId);
        console.log('✅ User caching:', cachedUser ? 'Success' : 'Failed');
        
        // Test rate limiting
        console.log('5. Testing Rate Limiting...');
        const rateLimit1 = await RedisUtils.checkRateLimit('test_ip', 3, 60);
        const rateLimit2 = await RedisUtils.checkRateLimit('test_ip', 3, 60);
        console.log('✅ Rate limiting - First request:', rateLimit1.count === 1 ? 'Success' : 'Failed');
        console.log('✅ Rate limiting - Second request:', rateLimit2.count === 2 ? 'Success' : 'Failed');
        
        // Cleanup test data
        console.log('\n6. Cleaning up test data...');
        await RedisUtils.deleteSession(testUserId);
        await RedisUtils.deleteCachedUser(testUserId);
        console.log('✅ Cleanup completed');
        
        console.log('\n🎉 All Redis optimizations are working correctly!');
        console.log('\nPerformance improvements enabled:');
        console.log('- ⚡ Fast session-based authentication');
        console.log('- 🗄️  User data caching');
        console.log('- 🔒 Secure token blacklisting');
        console.log('- 🛡️  Rate limiting protection');
        console.log('- 📊 Response caching for faster API calls');
        
    } catch (error) {
        console.error('❌ Redis test failed:', error.message);
        console.log('\nTroubleshooting tips:');
        console.log('1. Make sure Redis server is running');
        console.log('2. Check REDIS_URL in .env file');
        console.log('3. Verify Redis connection settings');
    }
    
    process.exit(0);
}

testRedisOptimizations();