require('dotenv').config();
const express = require('express');
const { connectDB } = require('./src/Config/Db');
const { connectRedis } = require('./src/Config/Redis');
const RedisMonitor = require('./src/Utils/RedisMonitor');
const cors = require('cors');
const app = express();

const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://stms-frontend.example.com'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const StudentRoutes = require('./src/Routes/Student.Routes');
const TrainerRoutes = require('./src/Routes/Trainer.Routes');
const LectureRoutes = require('./src/Routes/Lecture.Routes');

// Connect to Database and Redis
connectDB();
connectRedis();

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Welcome to the Server of STMS!');
});

// Health check endpoint with Redis stats
app.get('/health', async (req, res) => {
    try {
        const redisStats = await RedisMonitor.getRedisStats();
        const cacheHitRatio = await RedisMonitor.getCacheHitRatio();
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            redis: {
                ...redisStats,
                cacheHitRatio: `${cacheHitRatio}%`
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API Routes
app.use('/api/auth/student', StudentRoutes);
app.use('/api/auth/trainer', TrainerRoutes);
app.use('/api/auth/lecture', LectureRoutes);

// Cleanup expired sessions every hour
setInterval(async () => {
    await RedisMonitor.clearExpiredSessions();
}, 3600000);

// Warmup cache on startup
setTimeout(async () => {
    await RedisMonitor.warmupCache();
}, 5000);

app.listen(PORT, () => {
    console.log('Server is running on PORT:', PORT);
    console.log('Redis optimizations enabled for faster authentication and data fetching');
});