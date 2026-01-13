const Assignment = require('../Models/Assignment.Model');
const { RedisUtils } = require('../Config/Redis');

const AssignmentController = {
    createAssignment: async (req, res) => {
        try {
            const { title, description, courseId, type, dueDate, content, maxScore } = req.body;

            const newAssignment = new Assignment({
                title,
                description,
                courseId,
                type,
                dueDate,
                content, // JSON instructions/questions
                maxScore
            });

            await newAssignment.save();
            await RedisUtils.clearCachePattern(`assignments:course:${courseId}`);

            res.status(201).json({ message: 'Assignment created successfully', assignment: newAssignment });
        } catch (error) {
            res.status(500).json({ message: 'Error creating assignment', error: error.message });
        }
    },

    getCourseAssignments: async (req, res) => {
        try {
            const { courseId } = req.params;
            const cacheKey = `assignments:course:${courseId}`;

            const cachedAssignments = await RedisUtils.redisClient.get(cacheKey);
            if (cachedAssignments) {
                return res.status(200).json(JSON.parse(cachedAssignments));
            }

            const assignments = await Assignment.find({ courseId }).sort({ createdAt: -1 });
            await RedisUtils.redisClient.setEx(cacheKey, 3600, JSON.stringify(assignments));

            res.status(200).json(assignments);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching assignments', error: error.message });
        }
    },

    getAssignment: async (req, res) => {
        try {
            const { id } = req.params;
            const cacheKey = `assignment:${id}`;

            const cachedAssignment = await RedisUtils.redisClient.get(cacheKey);
            if (cachedAssignment) {
                return res.status(200).json(JSON.parse(cachedAssignment));
            }

            const assignment = await Assignment.findById(id);
            if (!assignment) {
                return res.status(404).json({ message: 'Assignment not found' });
            }

            await RedisUtils.redisClient.setEx(cacheKey, 3600, JSON.stringify(assignment));

            res.status(200).json(assignment);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching assignment', error: error.message });
        }
    },

    getStudentAssignments: async (req, res) => {
        try {
            const studentId = req.user.id;
            const StudentModel = require('../Models/Student.Model'); // Lazy load to avoid circular deps if any
            const Submission = require('../Models/Submission.Model');

            // 1. Get Student's Courses
            const student = await StudentModel.findById(studentId);
            if (!student) return res.status(404).json({ message: 'Student not found' });

            const enrolledCourseIds = student.courses || [];
            if (enrolledCourseIds.length === 0) {
                return res.status(200).json([]);
            }

            // 2. Get Assignments for these courses
            const assignments = await Assignment.find({
                courseId: { $in: enrolledCourseIds }
            }).populate('courseId', 'title').sort({ dueDate: 1 }).lean();

            // 3. Get Submissions for these assignments by this student
            const assignmentIds = assignments.map(a => a._id);
            const submissions = await Submission.find({
                studentId,
                assignmentId: { $in: assignmentIds }
            }).lean();

            // 4. Merge Data
            const admissionMap = new Map();
            submissions.forEach(s => admissionMap.set(s.assignmentId.toString(), s));

            const result = assignments.map(a => {
                const sub = admissionMap.get(a._id.toString());
                return {
                    ...a,
                    status: sub ? sub.status : 'pending',
                    submittedAt: sub ? sub.createdAt : null,
                    grade: sub ? sub.score : null,
                    feedback: sub ? sub.feedback : null,
                    submissionId: sub ? sub._id : null
                };
            });

            res.status(200).json({ data: result }); // Consistent wrapper
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching assignments' });
        }
    }
};

module.exports = { ...AssignmentController, getStudentAssignments: AssignmentController.getStudentAssignments };
