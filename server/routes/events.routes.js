const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('../middleware/auth.middleware');
const reviewsRouter = require('./reviews.routes'); // Import reviews router

// [GET] /events - Lấy danh sách tất cả sự kiện (công khai)
// Hỗ trợ query: /events?category=music&page=1
router.get('/', (req, res) => {
  // Logic: Truy vấn collection 'Events', có thể filter theo query params
  res.send('GET /events - Lấy danh sách sự kiện');
});

// [GET] /events/:eventId - Lấy chi tiết một sự kiện (công khai)
router.get('/:eventId', (req, res) => {
  // Logic: Dùng req.params.eventId để lấy document từ collection 'Events'
  res.send(`GET /events/${req.params.eventId} - Lấy chi tiết sự kiện`);
});

// [POST] /events - Tạo một sự kiện mới (yêu cầu quyền Organizer)
router.post('/', verifyAuthToken, (req, res) => {
  // Logic:
  // 1. Kiểm tra role của user (req.user.uid) có phải 'organizer' không
  // 2. Nếu đúng, tạo document mới trong collection 'Events'
  res.status(201).send(`POST /events - User ${req.user.uid} is creating an event`);
});

// [PUT] /events/:eventId - Cập nhật sự kiện (yêu cầu là chủ sự kiện)
router.put('/:eventId', verifyAuthToken, (req, res) => {
  // Logic:
  // 1. Lấy event từ DB
  // 2. Kiểm tra event.organizerId có bằng req.user.uid không
  // 3. Nếu đúng, cho phép cập nhật
  res.send(`PUT /events/${req.params.eventId} - User ${req.user.uid} is updating event`);
});

// --- Nested Routes ---
// Gắn route cho reviews vào dưới một sự kiện cụ thể: /events/:eventId/reviews
router.use('/:eventId/reviews', reviewsRouter);

module.exports = router;