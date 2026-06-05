const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('../middleware/auth.middleware');
const ticketController = require('../controllers/ticket.controller');

// [GET] /tickets - Lấy danh sách vé của người dùng đang đăng nhập
router.get('/',  verifyAuthToken, ticketController.getCurrentUserTickets);

// [POST] /tickets/book - Đặt vé cho một sự kiện
router.post('/book', verifyAuthToken, ticketController.bookTicket);

// [GET] /tickets/:ticketId - Lấy chi tiết vé (để hiển thị sau khi thanh toán)
// Yêu cầu xác thực để đảm bảo đúng chủ sở hữu
router.get('/:ticketId', verifyAuthToken, ticketController.getTicketDetails);

module.exports = router;