const express = require('express');
const { createOrganization, joinOrganization, getOrganization } = require('../Controllers/Organization.Controller');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

router.post('/create', verifyTokenWithSession, createOrganization);
router.post('/join', verifyTokenWithSession, joinOrganization);
router.get('/:id', verifyTokenWithSession, getOrganization);

module.exports = router;
