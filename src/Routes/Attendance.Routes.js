const express = require('express');
const { markAttendance, getStudentAttendance, markOfflineAttendance } = require('../Controllers/Attendance.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/mark', verifyTokenWithSession, markAttendance);
router.post('/offline', verifyTokenWithSession, markOfflineAttendance);
router.get('/my-attendance', verifyTokenWithSession, getStudentAttendance);

module.exports = router;
