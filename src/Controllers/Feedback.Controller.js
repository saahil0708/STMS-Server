const Feedback = require('../Models/Feedback.Model');
const Lecture = require('../Models/Lectures.Model');
const Course = require('../Models/Course.Model');
const { RedisUtils } = require('../Config/Redis');

const FeedbackController = {
    submitFeedback: async (req, res) => {
        try {
            const { courseId, lectureId, rating, comment } = req.body;
            const studentId = req.user.id;

            // 1. Validate Lecture Exists and is Completed
            const lecture = await Lecture.findById(lectureId);
            if (!lecture) return res.status(404).json({ message: 'Lecture not found' });

            if (lecture.status !== 'completed') {
                return res.status(400).json({ message: 'Feedback can only be submitted for completed lectures' });
            }

            // 2. 24-Hour Expiration Check
            const now = new Date();
            // Assuming updatedAt reflects when it was marked completed. 
            // Better: use 'timing' + 'duration' if available, or just rely on updatedAt for status change.
            // Using updatedAt is safer for "when it was marked done".
            const completionTime = new Date(lecture.updatedAt);
            const hoursDiff = (now - completionTime) / (1000 * 60 * 60);

            if (hoursDiff > 24) {
                return res.status(403).json({ message: 'Feedback window has expired (24 hours after completion)' });
            }

            // 3. Duplicate Check
            const existingFeedback = await Feedback.findOne({ lectureId, studentId });
            if (existingFeedback) {
                return res.status(400).json({ message: 'Feedback already submitted for this lecture' });
            }

            const feedback = new Feedback({
                studentId,
                courseId,
                lectureId,
                rating,
                comment
            });

            await feedback.save();
            await RedisUtils.clearCachePattern(`feedback:lecture:${lectureId}`);

            res.status(201).json({ message: 'Feedback submitted successfully', feedback });
        } catch (error) {
            console.error("Submit Feedback Error:", error);
            res.status(500).json({ message: 'Error submitting feedback', error: error.message });
        }
    },

    getLectureFeedback: async (req, res) => {
        try {
            const { lectureId } = req.params;
            const cacheKey = `feedback:lecture:${lectureId}`;

            const cachedFeedback = await RedisUtils.redisClient.get(cacheKey);
            if (cachedFeedback) {
                return res.status(200).json(JSON.parse(cachedFeedback));
            }

            const feedbacks = await Feedback.find({ lectureId }).populate('studentId', 'name email');
            await RedisUtils.redisClient.setEx(cacheKey, 3600, JSON.stringify(feedbacks));

            res.status(200).json(feedbacks);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching feedback', error: error.message });
        }
    },

    getFeedbackStatus: async (req, res) => {
        try {
            const { lectureId } = req.params;

            // 1. Get Lecture to find Course
            const lecture = await Lecture.findById(lectureId);
            if (!lecture) return res.status(404).json({ message: 'Lecture not found' });

            // 2. Get All Students in Course
            const course = await Course.findById(lecture.courseId).populate('students', 'name email _id');
            if (!course) return res.status(404).json({ message: 'Course not found' });

            const allStudents = course.students; // Array of user objects

            // 3. Get All Feedbacks for Lecture
            const feedbacks = await Feedback.find({ lectureId }).select('studentId');
            const submittedStudentIds = feedbacks.map(f => f.studentId.toString());

            // 4. Filter lists
            const submitted = [];
            const pending = [];

            allStudents.forEach(student => {
                if (submittedStudentIds.includes(student._id.toString())) {
                    submitted.push({
                        _id: student._id,
                        name: student.name,
                        email: student.email
                    });
                } else {
                    pending.push({
                        _id: student._id,
                        name: student.name,
                        email: student.email
                    });
                }
            });

            res.status(200).json({
                submitted,
                pending,
                totalStudents: allStudents.length,
                submittedCount: submitted.length,
                pendingCount: pending.length
            });

        } catch (error) {
            console.error("Get Feedback Status Error:", error);
            res.status(500).json({ message: 'Error fetching feedback status', error: error.message });
        }
    },

    // Legacy support or Course-level view
    getCourseFeedback: async (req, res) => {
        try {
            const { courseId } = req.params;
            const feedbacks = await Feedback.find({ courseId }).populate('studentId', 'name');
            res.status(200).json(feedbacks);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching feedback', error: error.message });
        }
    }
};

module.exports = FeedbackController;
