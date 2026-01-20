const express = require('express');
const {
    submitFeedback,
    getCourseFeedback,
    getLectureFeedback,
    getFeedbackStatus
} = require('../Controllers/Feedback.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/submit', verifyTokenWithSession, submitFeedback);
router.get('/course/:courseId', verifyTokenWithSession, getCourseFeedback);
router.get('/lecture/:lectureId', verifyTokenWithSession, getLectureFeedback);
router.get('/status/:lectureId', verifyTokenWithSession, getFeedbackStatus);

module.exports = router;
