const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('../middleware/authMiddleware');

// [GET] /tickets - Lấy danh sách vé của người dùng đang đăng nhập
router.get('/', (req, res) => {
  // Logic: Truy vấn collection 'Tickets' với điều kiện userId == req.user.uid
  // Route này có thể được đặt tại /users/me/tickets để rõ ràng hơn, nhưng để ở đây cũng được.
  res.send('GET tickets for the current user');
});

// [POST] /tickets/book - Đặt vé cho một sự kiện
router.post('/book', verifyAuthToken, (req, res) => {
  // Logic: Dùng Firestore Transaction
  // 1. Đọc thông tin event để kiểm tra số lượng vé còn lại
  // 2. Nếu còn, tạo document mới trong 'Tickets' (status: 'pending')
  // 3. Giảm số lượng vé 'available' trong document của Event
  res.status(201).send(`User ${req.user.uid} is booking a ticket.`);
});

// Lưu ý: Route check-in đã được chuyển sang organizer.routes.js để quản lý tập trung.

module.exports = router;