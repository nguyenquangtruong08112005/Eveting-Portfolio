const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('../middleware/authMiddleware');

// [POST] /users/register - Tạo thông tin user trong Firestore sau khi đăng ký
router.post('/register', verifyAuthToken, (req, res) => {
  // Logic: Lấy uid, email từ req.user (đã được middleware xác thực)
  // Tạo document mới trong collection 'Users'
  res.status(201).send(`User ${req.user.uid} profile creation initiated.`);
});

// [GET] /users/me - Lấy thông tin hồ sơ của người dùng đang đăng nhập
router.get('/me', verifyAuthToken, (req, res) => {
  // Logic: Dùng req.user.uid để truy vấn collection 'Users'
  res.send(`GET profile for user ${req.user.uid}`);
});

// [PUT] /users/me - Cập nhật thông tin hồ sơ của người dùng
router.put('/me', verifyAuthToken, (req, res) => {
  // Logic: Dùng req.user.uid để cập nhật document tương ứng
  res.send(`Update profile for user ${req.user.uid}`);
});

module.exports = router;
