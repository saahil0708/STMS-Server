const express = require('express');
const { submitAssignment, gradeSubmission, getMySubmissions } = require('../Controllers/Submission.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/submit', verifyTokenWithSession, submitAssignment);
router.post('/grade', verifyTokenWithSession, gradeSubmission);
router.get('/my-submissions', verifyTokenWithSession, getMySubmissions);

module.exports = router;
