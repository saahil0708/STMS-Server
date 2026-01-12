const express = require('express');
const { markAttendance, getStudentAttendance } = require('../Controllers/Attendance.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/mark', verifyTokenWithSession, markAttendance);
router.get('/my-attendance', verifyTokenWithSession, getStudentAttendance);

module.exports = router;
