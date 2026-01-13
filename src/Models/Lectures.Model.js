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
}, { timestamps: true });

module.exports = mongoose.model('Lecture', LectureSchema);