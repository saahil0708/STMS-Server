const express = require('express');
const router = express.Router();
const AdminController = require('../Controllers/Admin.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');

// Auth Routes
router.post('/register', AdminController.register); // Ideally protect this or use for init only
router.post('/login', AdminController.login);
router.post('/logout', verifyTokenWithSession, AdminController.logout);

// Profile Routes
router.get('/admin/:id', verifyTokenWithSession, AdminController.getAdminById);

// Academic Monitoring Routes
router.get('/results', verifyTokenWithSession, AdminController.getStudentResults);
router.get('/feedback', verifyTokenWithSession, AdminController.getFeedback);
router.get('/attendance', verifyTokenWithSession, AdminController.getAttendance);

module.exports = router;
