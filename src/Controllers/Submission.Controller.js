const Submission = require('../Models/Submission.Model');
const Assignment = require('../Models/Assignment.Model');
const { RedisUtils } = require('../Config/Redis');

const SubmissionController = {
    submitAssignment: async (req, res) => {
        try {
            const { assignmentId, content } = req.body;
            const studentId = req.user.id; // User must be a student

            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({ message: 'Assignment not found' });
            }

            // Check for existing submission
            let submission = await Submission.findOne({ assignmentId, studentId });

            if (submission) {
                // Update existing submission
                submission.content = content;
                submission.status = 'submitted';
            } else {
                // Create new submission
                submission = new Submission({
                    studentId,
                    assignmentId,
                    content,
                    status: 'submitted'
                });
            }

            await submission.save();
            await RedisUtils.clearCachePattern(`submissions:student:${studentId}`);

            res.status(200).json({ message: 'Assignment submitted successfully', submission });
        } catch (error) {
            res.status(500).json({ message: 'Error submitting assignment', error: error.message });
        }
    },

    gradeSubmission: async (req, res) => {
        try {
            const { submissionId, score, feedback } = req.body;
            // Ensure requester is a trainer (middleware should handle this)

            const submission = await Submission.findById(submissionId);
            if (!submission) {
                return res.status(404).json({ message: 'Submission not found' });
            }

            submission.score = score;
            submission.feedback = feedback;
            submission.status = 'graded';

            await submission.save();
            // Invalidate cache for this student's submissions
            await RedisUtils.clearCachePattern(`submissions:student:${submission.studentId}`);

            res.status(200).json({ message: 'Submission graded successfully', submission });
        } catch (error) {
            res.status(500).json({ message: 'Error grading submission', error: error.message });
        }
    },

    getMySubmissions: async (req, res) => {
        try {
            const studentId = req.user.id;
            const cacheKey = `submissions:student:${studentId}`;

            const cachedSubmissions = await RedisUtils.redisClient.get(cacheKey);
            if (cachedSubmissions) {
                return res.status(200).json(JSON.parse(cachedSubmissions));
            }

            const submissions = await Submission.find({ studentId })
                .populate('assignmentId', 'title dueDate maxScore');

            await RedisUtils.redisClient.setEx(cacheKey, 1800, JSON.stringify(submissions));

            res.status(200).json(submissions);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching submissions', error: error.message });
        }
    }
};

module.exports = SubmissionController;
