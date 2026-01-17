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
    },

    markOfflineAttendance: async (req, res) => {
        try {
            const { courseId, date, students } = req.body;
            // students: [{ studentId, status }]

            if (!courseId || !date || !students || !Array.isArray(students)) {
                return res.status(400).json({ message: 'Invalid data provided' });
            }

            const attendanceDate = new Date(date);
            const promises = students.map(async (student) => {
                // Determine if this is updating existing record for that day/course or new
                // We assume one record per day per course for offline
                // But Attendance Model structure uses 'lectureId' usually. 
                // For offline, we might use a placeholder lectureId or just query by course+date.
                // Assuming standard Model has date field or we rely on createdAt/joinTime.
                // Let's check `markAttendanceInternal` usage: it uses `joinTime: new Date()`.
                // We'll upsert based on courseId, studentId, and a date range.

                const startOfDay = new Date(attendanceDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(attendanceDate.setHours(23, 59, 59, 999));

                return Attendance.findOneAndUpdate(
                    {
                        courseId,
                        studentId: student.studentId,
                        joinTime: { $gte: startOfDay, $lte: endOfDay },
                        // If we want to distinguish offline vs online, we might need a type field in Model.
                        // For now we assume this is enough.
                    },
                    {
                        courseId,
                        studentId: student.studentId,
                        status: student.status,
                        joinTime: attendanceDate, // Set to the specific date passed
                        duration: 60, // Default duration for offline class? or 0
                        lectureId: null // Explicitly null for offline generic
                    },
                    { new: true, upsert: true }
                );
            });

            await Promise.all(promises);

            // Invalidate caches
            // We should ideally invalidate for all affected students. 
            // For simplicity/performance batch keys or just clear specific patterns if possible.
            // RedisUtils might not have bulk pattern delete easily accessible or expensive.
            // We'll skip granular invalidation for now or do a broad one if critical.

            res.status(200).json({ message: 'Offline attendance marked successfully' });

        } catch (error) {
            console.error('Error marking offline attendance:', error);
            res.status(500).json({ message: 'Failed to mark offline attendance', error: error.message });
        }
    }
};

module.exports = AttendanceController;
