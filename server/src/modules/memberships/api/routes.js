const express = require('express');
const router = express.Router();
const membershipController = require('./controller');
const teamController = require('./team.controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');

router.get('/me', publicApiLimiter, verifyAuthToken, membershipController.getMyMembership);
router.get(
    '/organizer-teams',
    publicApiLimiter,
    verifyAuthToken,
    teamController.getMyTeams
);

module.exports = router;
