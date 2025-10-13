// routes/organizer.routes.js
const express = require('express');
const router = express.Router();
const { verifyAuthToken, isOrganizer } = require('../middleware/auth.middleware');
const organizerController = require('../controllers/organizer.controller');

// Tất cả các route trong file này đều yêu cầu đăng nhập và có vai trò organizer
router.use(verifyAuthToken, isOrganizer);

// [GET] /organizer/events/:eventId/attendees - Lấy danh sách người tham gia
router.get(
    '/events/:eventId/attendees', 
    organizerController.verifyEventOwnership, 
    organizerController.getEventAttendees
);

// [POST] /organizer/tickets/:ticketId/check-in - Check-in vé
router.post(
    '/tickets/:ticketId/check-in',
    organizerController.checkInTicket
);

module.exports = router;