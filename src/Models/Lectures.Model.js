const mongoose = require('mongoose');

const LectureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    timing: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    duration: {
        type: Number,
        default: 60
    },
    type: {
        type: String,
        enum: ['offline', 'virtual'],
        default: 'virtual'
    },
    roomId: {
        type: String, // Internal room ID for virtual classes
        required: false
    },
    meetingLink: {
        type: String, // Can be external link or location for offline
        required: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Lecture', LectureSchema);