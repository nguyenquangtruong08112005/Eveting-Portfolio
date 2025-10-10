const express = require('express');
const router = express.Router();

// GET /notifications?userId=<id> - Lấy thông báo cho một người dùng
router.get('/', (req, res) => {
  res.send(`GET /notifications - Lấy thông báo cho người dùng ${req.query.userId}`);
});

// POST /notifications/:id/read - Đánh dấu thông báo đã đọc
router.post('/:id/read', (req, res) => {
  res.send(`POST /notifications/${req.params.id}/read - Đánh dấu đã đọc`);
});

module.exports = router;