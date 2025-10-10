const express = require('express');
const { verifyAuthToken } = require('../middleware/authMiddleware');

// Tạo router với mergeParams: true để có thể truy cập :eventId từ parent router (events.routes.js)
const router = express.Router({ mergeParams: true });

// [GET] /events/:eventId/reviews - Lấy tất cả đánh giá cho một sự kiện
router.get('/', (req, res) => {
  // Logic: Truy vấn collection 'Reviews' với eventId = req.params.eventId
  res.send(`GET reviews for event ${req.params.eventId}`);
});

// [POST] /events/:eventId/reviews - Gửi một đánh giá mới (yêu cầu đã tham gia)
router.post('/', verifyAuthToken, (req, res) => {
  // Logic: Kiểm tra user (req.user.uid) có vé đã mua cho event (req.params.eventId) không
  res.status(201).send(`POST review for event ${req.params.eventId} by user ${req.user.uid}`);
});

module.exports = router;