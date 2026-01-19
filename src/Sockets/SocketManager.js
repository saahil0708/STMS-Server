const socketIo = require('socket.io');
const { markAttendanceInternal } = require('../Controllers/Attendance.Controller');

let io;
const userSessions = new Map(); // socketId -> { userId, roomId, joinTime }

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: ['https://trainiq-bice.vercel.app', 'http://localhost:5173', 'https://stms-frontend.example.com'], // Add your frontend origins
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        // Join Room (Signaling)
        socket.on('join-room', ({ roomId, userId, userName, courseId }) => {
            socket.join(roomId);
            userSessions.set(socket.id, { userId, userName, roomId, courseId, joinTime: Date.now() });

            // Notify others in the room
            socket.to(roomId).emit('user-connected', { userId, userName });

            console.log(`User ${userId} (${userName}) joined room ${roomId}`);
        });

        // WebRTC Signaling: Offer
        socket.on('offer', (payload) => {
            // payload: { target: targetUserId, caller: myUserId, sdp: sessionDescription }
            io.to(payload.target).emit('offer', payload);
        });

        // WebRTC Signaling: Answer
        socket.on('answer', (payload) => {
            // payload: { target: targetUserId, caller: myUserId, sdp: sessionDescription }
            io.to(payload.target).emit('answer', payload);
        });

        // WebRTC Signaling: ICE Candidate
        socket.on('ice-candidate', (payload) => {
            // payload: { target: targetUserId, candidate: candidate }
            io.to(payload.target).emit('ice-candidate', payload);
        });

        // End Class (Trainer only)
        socket.on('end-class', async ({ roomId }) => {
            console.log(`Class ended for room ${roomId}`);

            // Persist completion status
            try {
                // Find by roomId (custom string) OR _id (if roomId passed is actually _id)
                // We try both to be robust.
                let lecture = await require('../models/Lectures.Model').findOne({ roomId: roomId });

                if (!lecture) {
                    // Try finding by ID if not found by roomId field
                    try {
                        lecture = await require('../models/Lectures.Model').findById(roomId);
                    } catch (e) {
                        // Ignore cast error if roomId is not a valid ObjectId
                    }
                }

                if (lecture) {
                    lecture.status = 'completed';
                    await lecture.save();
                    console.log(`Lecture ${lecture._id} (Room: ${roomId}) marked as completed.`);

                    // Invalidate Cache using RedisUtils
                    try {
                        const { RedisUtils } = require('../Config/Redis');
                        if (RedisUtils) {
                            await RedisUtils.clearCachePattern('today_lectures*');
                            await RedisUtils.clearCachePattern('all_lectures*');
                            // Use actual _id for single lecture cache
                            await RedisUtils.clearCachePattern(`single_lecture:${lecture._id}*`);
                            console.log(`Invalidated lecture cache for lecture ${lecture._id}`);
                        }
                    } catch (cacheErr) {
                        console.error("Redis cache invalidation failed:", cacheErr);
                    }
                } else {
                    console.error(`Lecture not found for room ${roomId} to mark as completed.`);
                }
            } catch (err) {
                console.error(`Failed to mark class ${roomId} as completed:`, err);
            }

            io.to(roomId).emit('class-ended');
            // Optional: Force disconnect sockets or clean up room data
            // socket.in(roomId).disconnectSockets(); // If you want to force disconnect
        });

        // Disconnect
        socket.on('disconnect', async () => {
            const session = userSessions.get(socket.id);
            if (session) {
                const { userId, roomId, courseId, joinTime } = session;
                const duration = Math.round((Date.now() - joinTime) / 60000); // Duration in minutes

                console.log(`User ${userId} disconnected from ${roomId}. Duration: ${duration} mins`);

                // Notify others
                socket.to(roomId).emit('user-disconnected', userId);

                // Auto-mark attendance if duration > 5 mins (threshold)
                if (duration >= 0) { // Set to 0 for testing, change to 5 for prod
                    try {
                        // Assuming roomId map to lectureId (or passed directly)
                        // For simplicity, we assume roomId IS the lectureId
                        await markAttendanceInternal({
                            lectureId: roomId,
                            courseId: courseId,
                            studentId: userId,
                            status: 'present',
                            duration: duration
                        });
                        console.log(`Attendance marked for user ${userId}`);
                    } catch (error) {
                        console.error(`Failed to auto-mark attendance for ${userId}:`, error);
                    }
                }

                userSessions.delete(socket.id);
            }
        });
    });

    return io;
};

module.exports = { initializeSocket };
