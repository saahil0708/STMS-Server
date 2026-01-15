require('dotenv').config();
const express = require('express');
const http = require('http'); // Import http module
const { connectDB } = require('./src/Config/Db');
const { connectRedis } = require('./src/Config/Redis');
const RedisMonitor = require('./src/Utils/RedisMonitor');
const { initializeSocket } = require('./src/Sockets/SocketManager'); // Import SocketManager
const cors = require('cors');

const app = express();
const server = http.createServer(app); // Create HTTP server

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
const OrganizationRoutes = require('./src/Routes/Organization.Routes');
const CourseRoutes = require('./src/Routes/Course.Routes');
const AssignmentRoutes = require('./src/Routes/Assignment.Routes');
const SubmissionRoutes = require('./src/Routes/Submission.Routes');
const FeedbackRoutes = require('./src/Routes/Feedback.Routes');
const AttendanceRoutes = require('./src/Routes/Attendance.Routes');
const AdminRoutes = require('./src/Routes/Admin.Routes');

// Connect to Database and Redis
connectDB();
connectRedis();

// Initialize Socket.IO
const io = initializeSocket(server);

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
app.use('/api/org', OrganizationRoutes);
app.use('/api/course', CourseRoutes);
app.use('/api/assignment', AssignmentRoutes);
app.use('/api/submission', SubmissionRoutes);
app.use('/api/feedback', FeedbackRoutes);
app.use('/api/attendance', AttendanceRoutes);
app.use('/api/auth/admin', AdminRoutes);

// Cleanup expired sessions every hour
setInterval(async () => {
    await RedisMonitor.clearExpiredSessions();
}, 3600000);

// Warmup cache on startup
setTimeout(async () => {
    await RedisMonitor.warmupCache();
}, 5000);

server.listen(PORT, () => {
    console.log('Server is running on PORT:', PORT);
    console.log('Socket.IO initialized for Virtual Classes');
    console.log('Redis optimizations enabled for faster authentication and data fetching');
});