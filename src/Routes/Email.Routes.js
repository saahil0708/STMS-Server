const express = require('express');
const EmailController = require('../Controllers/Email.Controller');
const { verifyTokenWithSession, authorizeRole } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

// Only Admins (and maybe Trainers) should be able to trigger emails via API for now
router.post('/send', verifyTokenWithSession, EmailController.sendEmail);

module.exports = router;
