const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
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
    type: {
        type: String,
        enum: ['homework', 'mcq', 'code'],
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    content: {
        type: Object, // Stores JSON structure for questions or instructions
        required: true
    },
    maxScore: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
