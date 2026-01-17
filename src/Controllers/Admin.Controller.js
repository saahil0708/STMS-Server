const AdminModel = require('../Models/Admin.Model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { RedisUtils } = require('../Config/Redis');

const AdminController = {
    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;

            const existingAdmin = await AdminModel.findOne({ email });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Admin already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newAdmin = new AdminModel({
                name,
                email,
                password: hashedPassword
            });

            await newAdmin.save();

            const token = jwt.sign(
                { id: newAdmin._id, role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(201).json({
                message: 'Admin registered successfully',
                token,
                user: {
                    id: newAdmin._id,
                    name: newAdmin.name,
                    email: newAdmin.email,
                    role: 'admin'
                }
            });
        } catch (error) {
            console.error('Admin Registration Error:', error);
            res.status(500).json({ message: 'Server error during registration' });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const admin = await AdminModel.findOne({ email });
            if (!admin) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: admin._id, role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Store session in Redis (Non-blocking)
            try {
                const sessionData = {
                    userId: admin._id,
                    role: 'admin',
                    token
                };
                await RedisUtils.setSession(admin._id, sessionData, 86400);
            } catch (redisError) {
                console.error('Redis Caching Error (Non-fatal):', redisError.message);
                // Continue login even if Redis fails
            }

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: 'admin'
                }
            });
        } catch (error) {
            console.error('Admin Login Error:', error);
            res.status(500).json({ message: 'Server error during login' });
        }
    },

    getAdminById: async (req, res) => {
        try {
            const admin = await AdminModel.findById(req.params.id)
                .select('-password')
                .populate('organizationId', 'name code description'); // Populate full org details
            if (!admin) {
                return res.status(404).json({ message: 'Admin not found' });
            }
            res.json(admin);
        } catch (error) {
            console.error('Get Admin Error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getStudentResults: async (req, res) => {
        try {
            const Submission = require('../Models/Submission.Model');
            const results = await Submission.find()
                .populate('studentId', 'name email')
                .populate('assignmentId', 'title type maxScore')
                .sort({ createdAt: -1 });
            res.json(results);
        } catch (error) {
            console.error('Get Results Error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getFeedback: async (req, res) => {
        try {
            const Feedback = require('../Models/Feedback.Model');
            const feedbacks = await Feedback.find()
                .populate('studentId', 'name email')
                .populate('courseId', 'title')
                .sort({ createdAt: -1 });
            res.json(feedbacks);
        } catch (error) {
            console.error('Get Feedback Error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getAttendance: async (req, res) => {
        try {
            const Attendance = require('../Models/Attendance.Model');
            const attendance = await Attendance.find()
                .populate('studentId', 'name email')
                .populate('courseId', 'title')
                .populate('lectureId', 'topic startTime') // Assuming Lecture has topic/time
                .sort({ createdAt: -1 });
            res.json(attendance);
        } catch (error) {
            console.error('Get Attendance Error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    logout: async (req, res) => {
        try {
            const userId = req.user.id;
            await RedisUtils.redisClient.del(`session:${userId}`);
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ message: 'Server error during logout' });
        }
    },

    getStudentDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const Student = require('../Models/Student.Model');
            const Attendance = require('../Models/Attendance.Model');
            const Submission = require('../Models/Submission.Model');
            const Feedback = require('../Models/Feedback.Model');

            const studentPromise = Student.findById(id).select('-password');
            const attendancePromise = Attendance.find({ studentId: id }).populate('courseId', 'title').sort({ joinTime: -1 });
            const submissionPromise = Submission.find({ studentId: id }).populate('assignmentId', 'title').sort({ submittedAt: -1 });
            const feedbackPromise = Feedback.find({ studentId: id }).populate('courseId', 'title').sort({ createdAt: -1 });

            const [student, attendance, submissions, feedbacks] = await Promise.all([
                studentPromise,
                attendancePromise,
                submissionPromise,
                feedbackPromise
            ]);

            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            res.json({
                student,
                attendance,
                submissions,
                feedbacks
            });

        } catch (error) {
            console.error('Get Student Details Error:', error);
            res.status(500).json({ message: 'Server error fetching student details' });
        }
    }
};

module.exports = AdminController;
