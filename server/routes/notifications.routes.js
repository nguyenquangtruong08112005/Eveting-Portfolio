// routes/notifications.routes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { verifyAuthToken } = require('../middleware/auth.middleware');

// [GET] /notifications - Lấy thông báo cho người dùng đang đăng nhập
router.get('/', verifyAuthToken, notificationController.getUserNotifications);

// TODO: Thêm middleware kiểm tra quyền sở hữu thông báo
// [POST] /notifications/:notificationId/read - Đánh dấu thông báo đã đọc
router.post('/:notificationId/read', verifyAuthToken, notificationController.markAsRead);

module.exports = router;