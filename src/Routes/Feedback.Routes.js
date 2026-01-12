const express = require('express');
const { submitFeedback, getCourseFeedback } = require('../Controllers/Feedback.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/submit', verifyTokenWithSession, submitFeedback);
router.get('/course/:courseId', verifyTokenWithSession, getCourseFeedback);

module.exports = router;
