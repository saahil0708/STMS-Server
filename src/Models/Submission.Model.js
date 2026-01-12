const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    content: {
        type: Object, // Stores answers or code submissions
        required: true
    },
    score: {
        type: Number,
        default: null
    },
    status: {
        type: String,
        enum: ['submitted', 'graded', 'pending'],
        default: 'submitted'
    },
    feedback: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
