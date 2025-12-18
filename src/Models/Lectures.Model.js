const mongoose = require('mongoose');

const LectureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Lecture', LectureSchema);