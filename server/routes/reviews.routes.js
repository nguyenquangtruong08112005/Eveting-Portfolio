const express = require('express');
const { verifyAuthToken } = require('../middleware/auth.middleware');
const reviewController = require('../controllers/review.controller');

// Tạo router với mergeParams: true để có thể truy cập :eventId từ parent router (events.routes.js)
const router = express.Router({ mergeParams: true });

// [GET] /events/:eventId/reviews - Lấy tất cả đánh giá cho một sự kiện
router.get('/', reviewController.getEventReviews);

// [POST] /events/:eventId/reviews - Gửi một đánh giá mới (yêu cầu xác thực và đã tham gia)
router.post('/', verifyAuthToken, reviewController.createEventReview);

module.exports = router;