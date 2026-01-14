const TrainerModel = require('../Models/Trainer.Model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { RedisUtils } = require('../Config/Redis');
const { clearCache } = require('../Middlewares/RedisCache');

const registerTrainer = async (req, res) => {
    try {
        const { name, email, password, phoneNo, gender } = req.body;

        // Check rate limiting for registration
        const rateLimit = await RedisUtils.checkRateLimit(`register:trainer:${req.ip}`, 3, 900);
        if (rateLimit.exceeded) {
            return res.status(429).json({ message: 'Too many registration attempts. Please try again later.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await TrainerModel.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User Already Exists!' });

        const newUser = new TrainerModel({
            name,
            email,
            password: hashedPassword,
            phoneNo,
            gender,
        });

        await newUser.save();

        // Clear related caches
        await clearCache('all_trainers');

        res.status(201).json({ message: 'User Registered Successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const loginTrainer = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check rate limiting for login attempts
        const rateLimit = await RedisUtils.checkRateLimit(`login:trainer:${email}`, 5, 900);
        if (rateLimit.exceeded) {
            return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
        }

        // First check cache for user data
        let user = await RedisUtils.getCachedUser(`trainer:${email}`);

        if (!user) {
            user = await TrainerModel.findOne({ email }).lean();
            if (!user) return res.status(404).json({ message: 'User Not Found!' });

            // Cache user data (without password)
            const userToCache = { ...user };
            delete userToCache.password;
            await RedisUtils.cacheUser(`trainer:${email}`, userToCache, 1800);
        }

        // For cached users, get password from DB for comparison
        if (!user.password) {
            const fullUser = await TrainerModel.findOne({ email }).select('+password').lean();
            user.password = fullUser.password;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid Password!' });

        const payload = {
            id: user._id,
            email: user.email,
            type: 'trainer',
            name: user.name
        };
        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        // Create session in Redis
        const sessionData = {
            userId: user._id,
            email: user.email,
            type: 'trainer',
            loginTime: Date.now(),
            expiresAt: Date.now() + 3600000,
            lastActivity: Date.now()
        };

        await RedisUtils.setSession(user._id, sessionData, 3600);

        // Cache user profile data
        const userProfile = { ...user };
        delete userProfile.password;
        await RedisUtils.cacheUser(user._id, userProfile, 1800);

        res.json({
            token,
            expiresIn: 3600,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNo: user.phoneNo,
                gender: user.gender
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const logoutTrainer = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];

        if (authHeader) {
            const token = authHeader.split(' ')[1];

            if (token) {
                // Blacklist the token
                await RedisUtils.blacklistToken(token, 3600);

                // Clear session and cache
                if (req.user) {
                    await RedisUtils.deleteSession(req.user.id);
                    await RedisUtils.deleteCachedUser(req.user.id);
                }
            }
        }

        res.json({ message: 'Logout Successful!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getAllTrainers = async (req, res) => {
    try {
        const trainers = await TrainerModel.find({}).select('-password').lean();
        res.json(trainers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getSingleTrainer = async (req, res) => {
    try {
        const { id } = req.params;

        // Try cache first
        let trainer = await RedisUtils.getCachedUser(id);

        if (!trainer) {
            trainer = await TrainerModel.findById(id).select('-password').lean();
            if (!trainer) return res.status(404).json({ message: 'User Not Found!' });

            // Cache the trainer data
            await RedisUtils.cacheUser(id, trainer, 1800);
        }

        res.json(trainer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const updateTrainer = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Hash password if being updated
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const trainer = await TrainerModel.findByIdAndUpdate(id, updateData, { new: true }).select('-password').lean();
        if (!trainer) return res.status(404).json({ message: 'User Not Found!' });

        // Update cache
        await RedisUtils.cacheUser(id, trainer, 1800);

        // Clear related caches
        await clearCache('all_trainers');
        await clearCache('single_trainer');

        res.json(trainer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const deleteTrainer = async (req, res) => {
    try {
        const { id } = req.params;
        const trainer = await TrainerModel.findByIdAndDelete(id).select('-password').lean();
        if (!trainer) return res.status(404).json({ message: 'User Not Found!' });

        // Clear caches
        await RedisUtils.deleteCachedUser(id);
        await RedisUtils.deleteSession(id);
        await clearCache('all_trainers');
        await clearCache('single_trainer');

        res.json({ message: 'User Deleted Successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getDashboardStats = async (req, res) => {
    try {
        // Assume req.user is populated by verifyTokenWithSession middleware
        const trainerId = req.user.id;

        // 1. Get Active Courses count and Total Students (active enrollments)
        const CourseModel = require('../Models/Course.Model');
        const courses = await CourseModel.find({ trainerId }).lean();

        const activeCoursesCount = courses.length;

        // Calculate unique students across all courses
        const allStudents = courses.reduce((acc, course) => {
            if (course.students && course.students.length > 0) {
                return acc.concat(course.students.map(id => id.toString()));
            }
            return acc;
        }, []);
        const totalStudentsCount = new Set(allStudents).size;

        // 2. Get Recent Submissions
        // We need assignments for these courses first
        const AssignmentModel = require('../Models/Assignment.Model');
        const SubmissionModel = require('../Models/Submission.Model');

        const courseIds = courses.map(c => c._id);
        const assignments = await AssignmentModel.find({ courseId: { $in: courseIds } }).select('_id title courseId').lean();
        const assignmentIds = assignments.map(a => a._id);

        // Map assignment ID back to assignment details for easy lookup
        const assignmentMap = {};
        assignments.forEach(a => {
            assignmentMap[a._id] = a;
        });

        const recentSubmissions = await SubmissionModel.find({ assignmentId: { $in: assignmentIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('studentId', 'name email') // Populate student details
            .lean();

        // Format submissions
        const formattedSubmissions = recentSubmissions.map(sub => ({
            id: sub._id,
            studentName: sub.studentId ? sub.studentId.name : 'Unknown Student',
            assignmentTitle: assignmentMap[sub.assignmentId] ? assignmentMap[sub.assignmentId].title : 'Unknown Assignment',
            status: sub.status,
            createdAt: sub.createdAt
        }));

        res.json({
            activeCourses: activeCoursesCount,
            totalStudents: totalStudentsCount,
            averageRating: 4.8, // Hardcoded for now as Rating model might not be linked yet
            recentSubmissions: formattedSubmissions
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = { registerTrainer, loginTrainer, logoutTrainer, getAllTrainers, getSingleTrainer, updateTrainer, deleteTrainer, getDashboardStats };