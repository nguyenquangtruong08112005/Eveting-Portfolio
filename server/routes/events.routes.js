const express = require('express');
const router = express.Router();
const { verifyAuthToken, isOrganizer } = require('../middleware/auth.middleware');
const reviewsRouter = require('./reviews.routes'); 
const eventController = require('../controllers/event.controller');
const { isEventExists, isEventOwner } = require('../middleware/event.middleware');

// [GET] /events/search - Tìm kiếm sự kiện với các tham số query
router.get('/search', eventController.searchEvents);

// [GET] /events - Lấy danh sách tất cả sự kiện (công khai)
// Hỗ trợ query: /events?category=music&page=1
router.get('/', eventController.getAllEvents);

// [GET] /events/:eventId - Lấy chi tiết một sự kiện (công khai)
router.get('/:eventId', eventController.getEventById);

// [POST] /events - Tạo một sự kiện mới (yêu cầu quyền Organizer)
router.post('/', verifyAuthToken, isOrganizer, eventController.createEvent);

// [PUT] /events/:eventId - Cập nhật sự kiện (yêu cầu là chủ sự kiện)
router.put('/:eventId', verifyAuthToken, isOrganizer, isEventExists, isEventOwner, eventController.updateEvent);

// [DELETE] /events/:eventId - Xoá sự kiện (yêu cầu là chủ sự kiện)
router.delete('/:eventId', verifyAuthToken, isOrganizer, isEventExists, isEventOwner, eventController.deleteEvent);

// --- Nested Routes ---
// Gắn route cho reviews vào dưới một sự kiện cụ thể: /events/:eventId/reviews
router.use('/:eventId/reviews', reviewsRouter);

module.exports = router;