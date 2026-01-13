const Course = require('../Models/Course.Model');
const { RedisUtils, redisClient } = require('../Config/Redis');

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
            // Optimized Cache Clearing
            // Directly delete the cache key for this specific trainer
            const cacheKey = `courses:trainer:${trainerId}`;
            await redisClient.del(cacheKey);

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

            // Robust check for existing enrollment (ObjectId vs String)
            const isEnrolled = course.students.some(id => id.toString() === studentId);

            if (isEnrolled) {
                // Self-healing: Clear cache just in case it's stale
                await redisClient.del(`courses:student:${studentId}`);
                return res.status(400).json({ message: 'Already enrolled in this course' });
            }

            course.students.push(studentId);
            await course.save();

            // ALSO update the Student model for consistency
            const User = require('../Models/Student.Model');
            await User.findByIdAndUpdate(studentId, { $addToSet: { courses: course._id } });

            await RedisUtils.clearCachePattern(`course:${course._id}*`);
            // Clear the specific student's course list cache
            await redisClient.del(`courses:student:${studentId}`);

            res.status(200).json({ message: 'Enrolled in course successfully', course });
        } catch (error) {
            res.status(500).json({ message: 'Error enrolling in course', error: error.message });
        }
    },

    getCourse: async (req, res) => {
        try {
            const { id } = req.params;
            const cacheKey = `course:${id}`;

            const cachedCourse = await redisClient.get(cacheKey);
            if (cachedCourse) {
                return res.status(200).json(JSON.parse(cachedCourse));
            }

            const course = await Course.findById(id)
                .populate('trainerId', 'name email')
                .populate('students', 'name email');

            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            await redisClient.setEx(cacheKey, 3600, JSON.stringify(course));

            res.status(200).json(course);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching course', error: error.message });
        }
    },

    getTrainerCourses: async (req, res) => {
        try {
            const trainerId = req.user.id;
            const cacheKey = `courses:trainer:${trainerId}`;

            const cachedCourses = await redisClient.get(cacheKey);
            if (cachedCourses) {
                return res.status(200).json(JSON.parse(cachedCourses));
            }

            const courses = await Course.find({ trainerId });
            await redisClient.setEx(cacheKey, 1800, JSON.stringify(courses));

            res.status(200).json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching courses', error: error.message });
        }
    },

    getStudentCourses: async (req, res) => {
        try {
            const studentId = req.user.id;
            const cacheKey = `courses:student:${studentId}`;

            const cachedCourses = await redisClient.get(cacheKey);
            if (cachedCourses) {
                return res.status(200).json(JSON.parse(cachedCourses));
            }

            const courses = await Course.find({ students: studentId })
                .populate('trainerId', 'name email')
                .populate('organizationId', 'name');

            await redisClient.setEx(cacheKey, 1800, JSON.stringify(courses));

            res.status(200).json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching courses', error: error.message });
        }
    },

    updateCourse: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const trainerId = req.user.id;

            const course = await Course.findOne({ _id: id, trainerId });
            if (!course) {
                return res.status(404).json({ message: 'Course not found or unauthorized' });
            }

            Object.keys(updates).forEach((key) => {
                if (key !== 'enrollmentCode' && key !== 'trainerId' && key !== 'organizationId') {
                    course[key] = updates[key];
                }
            });

            await course.save();

            // Clear caches
            await redisClient.del(`course:${id}`);
            await redisClient.del(`courses:trainer:${trainerId}`);
            // Note: Efficiently clearing student caches is harder without tracking all keys. 
            // We can rely on TTL or implement pattern deletion if critical.
            // For now, pattern deletion for this course might be safe enough if keys were structured differently,
            // but `courses:student:{id}` contains multiple courses.
            // We'll let student caches expire or we could iterate students.
            if (course.students && course.students.length > 0) {
                // Best effort: clear cache for enrolled students
                for (const studentId of course.students) {
                    await redisClient.del(`courses:student:${studentId}`);
                }
            }

            res.status(200).json({ message: 'Course updated successfully', course });
        } catch (error) {
            res.status(500).json({ message: 'Error updating course', error: error.message });
        }
    },

    deleteCourse: async (req, res) => {
        try {
            const { id } = req.params;
            const trainerId = req.user.id;

            const course = await Course.findOneAndDelete({ _id: id, trainerId });
            if (!course) {
                return res.status(404).json({ message: 'Course not found or unauthorized' });
            }

            // Clear caches
            await redisClient.del(`course:${id}`);
            await redisClient.del(`courses:trainer:${trainerId}`);
            if (course.students && course.students.length > 0) {
                for (const studentId of course.students) {
                    await redisClient.del(`courses:student:${studentId}`);
                }
            }

            res.status(200).json({ message: 'Course deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting course', error: error.message });
        }
    }
};

module.exports = CourseController;
