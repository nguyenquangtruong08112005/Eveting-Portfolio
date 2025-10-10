const express = require('express');
const router = express.Router();

// GET /analytics?eventId=<id> - Lấy dữ liệu phân tích cho một sự kiện
router.get('/', (req, res) => {
  res.send(`GET /analytics - Lấy dữ liệu phân tích cho sự kiện ${req.query.eventId}`);
});

module.exports = router;