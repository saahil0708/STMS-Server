const express = require('express');
const { createAssignment, getCourseAssignments, getAssignment } = require('../Controllers/Assignment.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/create', verifyTokenWithSession, createAssignment);
router.get('/course/:courseId', verifyTokenWithSession, getCourseAssignments);
router.get('/:id', verifyTokenWithSession, getAssignment);

module.exports = router;
