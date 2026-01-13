const express = require('express');
const { createCourse, enrollStudent, getCourse, getTrainerCourses, getStudentCourses, updateCourse, deleteCourse } = require('../Controllers/Course.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/create', verifyTokenWithSession, createCourse);
router.post('/enroll', verifyTokenWithSession, enrollStudent);
router.get('/trainer', verifyTokenWithSession, getTrainerCourses);
router.get('/my-courses', verifyTokenWithSession, getStudentCourses);
router.get('/:id', verifyTokenWithSession, getCourse);
router.put('/:id', verifyTokenWithSession, updateCourse);
router.delete('/:id', verifyTokenWithSession, deleteCourse);

module.exports = router;
