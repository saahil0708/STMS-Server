const Feedback = require('../Models/Feedback.Model');
const { RedisUtils } = require('../Config/Redis');

const FeedbackController = {
    submitFeedback: async (req, res) => {
        try {
            const { courseId, rating, comment } = req.body;
            const studentId = req.user.id;

            const existingFeedback = await Feedback.findOne({ courseId, studentId });
            if (existingFeedback) {
                return res.status(400).json({ message: 'Feedback already submitted for this course' });
            }

            const feedback = new Feedback({
                studentId,
                courseId,
                rating,
                comment
            });

            await feedback.save();
            await RedisUtils.clearCachePattern(`feedback:course:${courseId}`);

            res.status(201).json({ message: 'Feedback submitted successfully', feedback });
        } catch (error) {
            res.status(500).json({ message: 'Error submitting feedback', error: error.message });
        }
    },

    getCourseFeedback: async (req, res) => {
        try {
            const { courseId } = req.params;
            const cacheKey = `feedback:course:${courseId}`;

            const cachedFeedback = await RedisUtils.redisClient.get(cacheKey);
            if (cachedFeedback) {
                return res.status(200).json(JSON.parse(cachedFeedback));
            }

            const feedbacks = await Feedback.find({ courseId }).populate('studentId', 'name');
            await RedisUtils.redisClient.setEx(cacheKey, 3600, JSON.stringify(feedbacks));

            res.status(200).json(feedbacks);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching feedback', error: error.message });
        }
    }
};

module.exports = FeedbackController;
