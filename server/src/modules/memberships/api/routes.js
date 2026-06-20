const express = require('express');
const router = express.Router();
const membershipController = require('./controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');

router.get('/me', publicApiLimiter, verifyAuthToken, membershipController.getMyMembership);

module.exports = router;
