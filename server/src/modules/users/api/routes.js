const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const userController = require('./controller');
const ticketController = require('@/modules/tickets').controller;
const { validateProfileUpdate } = require('@/utils/validators/user.validator');

router.post('/register', verifyAuthToken, userController.registerUser);

router.get('/me', verifyAuthToken, userController.getCurrentUserProfile);

router.put('/me', verifyAuthToken, validateProfileUpdate, userController.updateUserProfile);

router.get('/me/tickets', verifyAuthToken, ticketController.getCurrentUserTickets);

router.post('/me/follow', verifyAuthToken, userController.followProfile);

router.delete('/me/follow/:profileId', verifyAuthToken, userController.unfollowProfile);

router.post('/me/device-token/remove', verifyAuthToken, userController.removeDeviceToken);

module.exports = router;
