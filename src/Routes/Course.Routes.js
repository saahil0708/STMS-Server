const express = require('express');
const { createCourse, enrollStudent, getCourse, getTrainerCourses } = require('../Controllers/Course.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/create', verifyTokenWithSession, createCourse);
router.post('/enroll', verifyTokenWithSession, enrollStudent);
router.get('/trainer', verifyTokenWithSession, getTrainerCourses);
router.get('/:id', verifyTokenWithSession, getCourse);

module.exports = router;
