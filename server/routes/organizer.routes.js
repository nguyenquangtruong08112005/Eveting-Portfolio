const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('../middleware/auth.middleware');

// Middleware để kiểm tra quyền organizer cho các route trong file này
const isOrganizer = async (req, res, next) => {
    // Logic: Dựa vào req.user.uid, truy vấn DB để xác nhận role là 'organizer'
    console.log(`Checking organizer permissions for user ${req.user.uid}`);
    next();
};

// [GET] /organizer/events/:eventId/attendees - Lấy danh sách người tham gia
router.get('/events/:eventId/attendees', verifyAuthToken, isOrganizer, (req, res) => {
    res.send(`GET attendees for event ${req.params.eventId}`);
});

// [POST] /organizer/tickets/:ticketId/check-in - Check-in vé
router.post('/tickets/:ticketId/check-in', verifyAuthToken, isOrganizer, (req, res) => {
    res.send(`Check-in for ticket ${req.params.ticketId}`);
});

module.exports = router;