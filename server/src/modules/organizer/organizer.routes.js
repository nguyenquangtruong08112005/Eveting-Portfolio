// src/modules/organizer/organizer.routes.js
const express = require('express');
const router = express.Router();
const { verifyAuthToken, isOrganizer } = require('../../middleware/auth.middleware');
const organizerController = require('./organizer.controller');

const multer = require('multer');
// Sử dụng memoryStorage để lấy buffer xử lý trực tiếp, không cần lưu file tạm
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyAuthToken);

// [POST] /organizer/register
router.post('/register', organizerController.registerOrganizer);

// --- Khu vực Organizer ---
router.use(isOrganizer);

// [GET] /organizer/me
router.get('/me', organizerController.getOrganizerProfile);

// [PUT] /organizer/me - Cập nhật thông tin Organizer (MỚI)
router.put('/me', organizerController.updateOrganizerProfile);

// [GET] /organizer/me/events
router.get('/me/events', organizerController.getMyEvents);

// [GET] /organizer/me/stats
router.get('/me/stats', organizerController.getStatsOverview);

// [GET] /organizer/events/:eventId/stats
router.get(
    '/events/:eventId/stats',
    organizerController.verifyEventOwnership,
    organizerController.getEventStats
);

// [GET] /organizer/events/:eventId/attendees (Đã được gắn controller)
router.get(
    '/events/:eventId/attendees',
    organizerController.verifyEventOwnership,
    organizerController.getEventAttendees
);

// [POST] /organizer/check-in-qr
router.post(
    '/check-in-qr',
    organizerController.checkInByQr
);

// [POST] Import Attendees (Upload file)
// Key của file trong form-data phải là 'file'
router.post(
    '/events/:eventId/attendees/import',
    organizerController.verifyEventOwnership, // Chỉ chủ sự kiện mới được import
    upload.single('file'),
    organizerController.importAttendees
);

// [GET] Export Attendees
router.get(
    '/events/:eventId/attendees/export',
    organizerController.verifyEventOwnership,
    organizerController.exportAttendees
);

// [POST] Broadcast Notification
router.post(
    '/events/:eventId/broadcast',
    organizerController.verifyEventOwnership,
    organizerController.broadcastNotification
);

module.exports = router;
