const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('../middleware/auth.middleware');
const ticketController = require('../controllers/ticket.controller');

// [GET] /tickets - Lấy danh sách vé của người dùng đang đăng nhập
router.get('/',  verifyAuthToken, ticketController.getCurrentUserTickets);

// [POST] /tickets/book - Đặt vé cho một sự kiện
router.post('/book', verifyAuthToken, ticketController.bookTicket);

// Lưu ý: Route check-in đã được chuyển sang organizer.routes.js để quản lý tập trung.

module.exports = router;