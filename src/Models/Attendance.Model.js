const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late'],
        default: 'present'
    },
    joinTime: {
        type: Date,
        default: Date.now
    },
    duration: {
        type: Number, // In minutes
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
