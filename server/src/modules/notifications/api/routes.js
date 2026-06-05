const express = require('express');
const router = express.Router();
const notificationController = require('@/modules/notifications/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');

router.get('/', verifyAuthToken, notificationController.getUserNotifications);

router.post('/:notificationId/read', verifyAuthToken, notificationController.markAsRead);

module.exports = router;
