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

            let submissions;

            if (RedisUtils.redisClient?.isOpen) {
                try {
                    const cachedSubmissions = await RedisUtils.redisClient.get(cacheKey);
                    if (cachedSubmissions) {
                        return res.status(200).json(JSON.parse(cachedSubmissions));
                    }
                } catch (redisError) {
                    console.error("Redis get error:", redisError);
                }
            }

            submissions = await Submission.find({ studentId })
                .populate('assignmentId', 'title dueDate maxScore');

            if (RedisUtils.redisClient?.isOpen) {
                try {
                    await RedisUtils.redisClient.setEx(cacheKey, 1800, JSON.stringify(submissions));
                } catch (redisError) {
                    console.error("Redis set error:", redisError);
                }
            }

            res.status(200).json(submissions);
        } catch (error) {
            console.error("Error in getMySubmissions:", error);
            res.status(500).json({ message: 'Error fetching submissions', error: error.message });
        }
    },

    getTrainerPendingSubmissions: async (req, res) => {
        try {
            const trainerId = req.user.id;
            const Course = require('../Models/Course.Model');

            // 1. Get Trainer's Courses
            const courses = await Course.find({ trainerId }).select('_id');
            const courseIds = courses.map(c => c._id);

            // 2. Get Assignments for these courses
            const assignments = await Assignment.find({ courseId: { $in: courseIds } }).select('_id title');
            const assignmentIds = assignments.map(a => a._id);

            // 3. Find submissions for these assignments
            // Only 'submitted' status needs grading. 'graded' is history.
            const submissions = await Submission.find({
                assignmentId: { $in: assignmentIds },
                status: 'submitted'
            })
                .populate('studentId', 'name email')
                .populate('assignmentId', 'title')
                .sort({ createdAt: 1 });

            // Format for frontend
            const formatted = submissions.map(sub => ({
                _id: sub._id,
                studentName: sub.studentId?.name || 'Unknown',
                studentEmail: sub.studentId?.email,
                assignmentTitle: sub.assignmentId?.title,
                content: sub.content?.text || JSON.stringify(sub.content), // Simplify content preview
                fileUrl: sub.content?.fileUrl, // If exists
                submittedAt: sub.createdAt
            }));

            res.status(200).json({ data: formatted });
        } catch (error) {
            console.error('Error fetching pending submissions:', error);
            res.status(500).json({ message: 'Error fetching pending submissions' });
        }
    }
};

module.exports = { ...SubmissionController, getTrainerPendingSubmissions: SubmissionController.getTrainerPendingSubmissions };
