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
router.get('/student/:id/details', verifyTokenWithSession, AdminController.getStudentDetails);
router.get('/trainer/:id/details', verifyTokenWithSession, AdminController.getTrainerDetails);

// User Management Routes
router.get('/admins', verifyTokenWithSession, AdminController.getAdmins);
router.delete('/user/:role/:id', verifyTokenWithSession, AdminController.deleteUser);
router.put('/user/:role/:id', verifyTokenWithSession, AdminController.updateUser);

module.exports = router;
