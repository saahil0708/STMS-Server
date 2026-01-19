const socketIo = require('socket.io');
const { markAttendanceInternal } = require('../Controllers/Attendance.Controller');

let io;
const userSessions = new Map(); // socketId -> { userId, roomId, joinTime }

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: ['http://localhost:5173', 'https://stms-frontend.example.com'], // Add your frontend origins
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
        socket.on('end-class', ({ roomId }) => {
            console.log(`Class ended for room ${roomId}`);
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
