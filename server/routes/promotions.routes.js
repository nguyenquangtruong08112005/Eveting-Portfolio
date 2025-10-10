const express = require('express');
const router = express.Router();

// GET /promotions - Lấy danh sách khuyến mãi
router.get('/', (req, res) => {
  res.send('GET /promotions - Lấy danh sách khuyến mãi');
});

// POST /promotions/apply - Áp dụng mã khuyến mãi
router.post('/apply', (req, res) => {
  res.send('POST /promotions/apply - Áp dụng mã khuyến mãi');
});

module.exports = router;