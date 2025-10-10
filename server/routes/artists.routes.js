const express = require('express');
const router = express.Router();

// GET /artists - Lấy danh sách tất cả nghệ sĩ
router.get('/', (req, res) => {
  res.send('GET /artists - Lấy danh sách tất cả nghệ sĩ');
});

// GET /artists/:id - Lấy thông tin chi tiết một nghệ sĩ
router.get('/:id', (req, res) => {
  res.send(`GET /artists/${req.params.id} - Lấy thông tin chi tiết nghệ sĩ`);
});

// POST /artists - Thêm nghệ sĩ mới (chức năng cho admin/organizer)
router.post('/', (req, res) => {
  res.status(201).send('POST /artists - Thêm nghệ sĩ mới');
});

module.exports = router;