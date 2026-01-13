const Attendance = require('../Models/Attendance.Model');
const { RedisUtils } = require('../Config/Redis');

const AttendanceController = {
    // Internal helper for SocketManager
    markAttendanceInternal: async ({ lectureId, courseId, studentId, status, duration }) => {
        try {
            return await Attendance.findOneAndUpdate(
                { lectureId, studentId },
                {
                    lectureId,
                    courseId,
                    studentId,
                    status,
                    duration,
                    joinTime: new Date()
                },
                { new: true, upsert: true }
            );
        } catch (error) {
            console.error('Error in markAttendanceInternal:', error);
            throw error;
        }
    },

    markAttendance: async (req, res) => {
        try {
            const { lectureId, courseId, status, duration } = req.body;
            const studentId = req.user.id;

            // Upsert attendance record
            const attendance = await AttendanceController.markAttendanceInternal({
                lectureId,
                courseId,
                studentId,
                status,
                duration
            });

            await RedisUtils.clearCachePattern(`attendance:student:${studentId}`);

            res.status(200).json({ message: 'Attendance marked successfully', attendance });
        } catch (error) {
            res.status(500).json({ message: 'Error marking attendance', error: error.message });
        }
    },

    getStudentAttendance: async (req, res) => {
        try {
            const studentId = req.user.id;
            const cacheKey = `attendance:student:${studentId}`;

            const cachedAttendance = await RedisUtils.redisClient.get(cacheKey);
            if (cachedAttendance) {
                return res.status(200).json(JSON.parse(cachedAttendance));
            }

            // Group by course or just list all? Listing all for now, optimized for stats later
            const attendanceRecords = await Attendance.find({ studentId })
                .populate('courseId', 'title')
                .sort({ createdAt: -1 });

            await RedisUtils.redisClient.setEx(cacheKey, 1800, JSON.stringify(attendanceRecords));

            res.status(200).json(attendanceRecords);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching attendance', error: error.message });
        }
    }
};

module.exports = AttendanceController;
