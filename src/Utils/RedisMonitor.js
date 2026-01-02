const { redisClient, RedisUtils } = require('../Config/Redis');

class RedisMonitor {
    static async getRedisStats() {
        try {
            const info = await redisClient.info();
            const memory = await redisClient.info('memory');
            const keyspace = await redisClient.info('keyspace');
            
            return {
                connected: redisClient.isReady,
                uptime: this.parseInfo(info, 'uptime_in_seconds'),
                memory_used: this.parseInfo(memory, 'used_memory_human'),
                total_keys: this.parseKeyspaceInfo(keyspace),
                connections: this.parseInfo(info, 'connected_clients')
            };
        } catch (error) {
            console.error('Error getting Redis stats:', error);
            return { connected: false, error: error.message };
        }
    }

    static parseInfo(info, key) {
        const lines = info.split('\r\n');
        const line = lines.find(l => l.startsWith(key));
        return line ? line.split(':')[1] : 'N/A';
    }

    static parseKeyspaceInfo(keyspace) {
        const lines = keyspace.split('\r\n');
        const dbLine = lines.find(l => l.startsWith('db0:'));
        if (dbLine) {
            const match = dbLine.match(/keys=(\d+)/);
            return match ? match[1] : '0';
        }
        return '0';
    }

    static async clearExpiredSessions() {
        try {
            const sessionKeys = await redisClient.keys('session:*');
            let clearedCount = 0;

            for (const key of sessionKeys) {
                const session = await redisClient.get(key);
                if (session) {
                    const sessionData = JSON.parse(session);
                    if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
                        await redisClient.del(key);
                        clearedCount++;
                    }
                }
            }

            console.log(`Cleared ${clearedCount} expired sessions`);
            return clearedCount;
        } catch (error) {
            console.error('Error clearing expired sessions:', error);
            return 0;
        }
    }

    static async getCacheHitRatio() {
        try {
            const info = await redisClient.info('stats');
            const hits = parseInt(this.parseInfo(info, 'keyspace_hits')) || 0;
            const misses = parseInt(this.parseInfo(info, 'keyspace_misses')) || 0;
            const total = hits + misses;
            
            return total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';
        } catch (error) {
            console.error('Error calculating cache hit ratio:', error);
            return '0.00';
        }
    }

    static async warmupCache() {
        try {
            console.log('Starting cache warmup...');
            
            // You can add specific cache warming logic here
            // For example, pre-load frequently accessed data
            
            console.log('Cache warmup completed');
        } catch (error) {
            console.error('Error during cache warmup:', error);
        }
    }
}

module.exports = RedisMonitor;