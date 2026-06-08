const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const userController = require('./controller');
const ticketController = require('@/modules/tickets').controller;
const { validateProfileUpdate } = require('@/utils/validators/user.validator');

router.post('/register', verifyAuthToken, [
    body('name').optional({ values: 'null' }).isString().withMessage('Name must be a string'),
    body('profilePicUrl').optional({ values: 'null' }).isURL().withMessage('Profile picture must be a valid URL'),
    body('bio').optional({ values: 'null' }).isString().withMessage('Bio must be a string'),
    body('interests').optional({ values: 'null' }).isArray().withMessage('Interests must be an array'),
    body('ageRange').optional({ values: 'null' }).isString().withMessage('Age range must be a string'),
    validateRequest
], userController.registerUser);

router.get('/me', verifyAuthToken, userController.getCurrentUserProfile);

router.put('/me', verifyAuthToken, validateProfileUpdate, userController.updateUserProfile);

router.get('/me/tickets', verifyAuthToken, ticketController.getCurrentUserTickets);

router.post('/me/follow', verifyAuthToken, [
    body('profileId').notEmpty().withMessage('profileId is required'),
    validateRequest
], userController.followProfile);

router.delete('/me/follow/:profileId', verifyAuthToken, [
    param('profileId').notEmpty().withMessage('profileId is required'),
    validateRequest
], userController.unfollowProfile);

router.post('/me/device-token/remove', verifyAuthToken, [
    body('fcmToken').notEmpty().withMessage('fcmToken is required'),
    validateRequest
], userController.removeDeviceToken);

module.exports = router;
