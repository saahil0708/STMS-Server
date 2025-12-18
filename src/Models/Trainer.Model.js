const mongoose = require('mongoose');

const TrainerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNo: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'trainer'
    }
}, { timestamps: true });

module.exports = mongoose.model('Trainer', TrainerSchema);