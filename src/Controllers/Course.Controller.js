const Course = require('../Models/Course.Model');
const { RedisUtils } = require('../Config/Redis');

const CourseController = {
    createCourse: async (req, res) => {
        try {
            const { title, description, organizationId, enrollmentCode, schedule } = req.body;
            const trainerId = req.user.id;

            const existingCourse = await Course.findOne({ enrollmentCode });
            if (existingCourse) {
                return res.status(400).json({ message: 'Enrollment code already exists' });
            }

            const newCourse = new Course({
                title,
                description,
                trainerId,
                organizationId,
                enrollmentCode,
                schedule
            });

            await newCourse.save();
            await RedisUtils.clearCachePattern('courses:*');

            res.status(201).json({ message: 'Course created successfully', course: newCourse });
        } catch (error) {
            res.status(500).json({ message: 'Error creating course', error: error.message });
        }
    },

    enrollStudent: async (req, res) => {
        try {
            const { enrollmentCode } = req.body;
            const studentId = req.user.id;

            const course = await Course.findOne({ enrollmentCode });
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            if (course.students.includes(studentId)) {
                return res.status(400).json({ message: 'Already enrolled in this course' });
            }

            course.students.push(studentId);
            await course.save();
            await RedisUtils.clearCachePattern(`course:${course._id}*`);

            res.status(200).json({ message: 'Enrolled in course successfully', course });
        } catch (error) {
            res.status(500).json({ message: 'Error enrolling in course', error: error.message });
        }
    },

    getCourse: async (req, res) => {
        try {
            const { id } = req.params;
            const cacheKey = `course:${id}`;

            const cachedCourse = await RedisUtils.redisClient.get(cacheKey);
            if (cachedCourse) {
                return res.status(200).json(JSON.parse(cachedCourse));
            }

            const course = await Course.findById(id)
                .populate('trainerId', 'name email')
                .populate('students', 'name email');

            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            await RedisUtils.redisClient.setEx(cacheKey, 3600, JSON.stringify(course));

            res.status(200).json(course);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching course', error: error.message });
        }
    },

    getTrainerCourses: async (req, res) => {
        try {
            const trainerId = req.user.id;
            const cacheKey = `courses:trainer:${trainerId}`;

            const cachedCourses = await RedisUtils.redisClient.get(cacheKey);
            if (cachedCourses) {
                return res.status(200).json(JSON.parse(cachedCourses));
            }

            const courses = await Course.find({ trainerId });
            await RedisUtils.redisClient.setEx(cacheKey, 1800, JSON.stringify(courses));

            res.status(200).json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching courses', error: error.message });
        }
    },

    getStudentCourses: async (req, res) => {
        try {
            const studentId = req.user.id;
            const cacheKey = `courses:student:${studentId}`;

            const cachedCourses = await RedisUtils.redisClient.get(cacheKey);
            if (cachedCourses) {
                return res.status(200).json(JSON.parse(cachedCourses));
            }

            const courses = await Course.find({ students: studentId })
                .populate('trainerId', 'name email')
                .populate('organizationId', 'name');

            await RedisUtils.redisClient.setEx(cacheKey, 1800, JSON.stringify(courses));

            res.status(200).json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching courses', error: error.message });
        }
    }
};

module.exports = CourseController;
