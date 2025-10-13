// routes/analytics.routes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const organizerController = require('../controllers/organizer.controller');
const { verifyAuthToken, isOrganizer } = require('../middleware/auth.middleware');

// [GET] /analytics?eventId=<id> - Lấy dữ liệu phân tích cho một sự kiện
router.get(
  '/',
  verifyAuthToken,
  isOrganizer,
  organizerController.verifyEventOwnership, // Tái sử dụng middleware để kiểm tra quyền
  analyticsController.getEventAnalytics
);

module.exports = router;