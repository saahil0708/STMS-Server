const express = require('express');
const { submitAssignment, gradeSubmission, getMySubmissions, getTrainerPendingSubmissions } = require('../Controllers/Submission.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/submit', verifyTokenWithSession, submitAssignment);
router.post('/grade', verifyTokenWithSession, gradeSubmission);
router.get('/teacher/pending', verifyTokenWithSession, getTrainerPendingSubmissions);
router.get('/my-submissions', verifyTokenWithSession, getMySubmissions);

module.exports = router;
