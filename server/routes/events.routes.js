// routes/events.routes.js
const express = require('express');
const router = express.Router();
const { verifyAuthToken, isOrganizer } = require('../middleware/auth.middleware');
const reviewsRouter = require('./reviews.routes');
const eventController = require('../controllers/event.controller');
const { publicApiLimiter } = require('../middleware/rateLimit.middleware');

// --- Đặt các route cụ thể hơn lên trước các route có param động ---

// [GET] /events/search - Tìm kiếm sự kiện với các tham số query
router.get('/search', publicApiLimiter ,eventController.searchEvents);

// [GET] /events/nearby?lat=...&lon=...&radius=... - Tìm sự kiện lân cận
// Middleware verifyAuthToken là tùy chọn ở đây, nếu muốn kết quả cá nhân hóa hơn sau này
router.get('/nearby', publicApiLimiter, eventController.findNearbyEvents);

// --- Các route GET công khai ---

// [GET] /events - Lấy danh sách tất cả sự kiện (công khai, có phân trang)
router.get('/', publicApiLimiter, eventController.getAllEvents);

// [GET] /events/:eventId - Lấy chi tiết một sự kiện (có kiểm tra visibility)
// Thêm verifyAuthToken một cách tùy chọn để controller có thể nhận req.user
// Middleware này cần được thiết kế lại để không báo lỗi nếu không có token
// Tạm thời bỏ verifyAuthToken ở đây, controller sẽ tự kiểm tra req.user
router.get('/:eventId', publicApiLimiter, eventController.getEventById);

// --- Các route yêu cầu xác thực ---

// [POST] /events - Tạo một sự kiện mới (yêu cầu quyền Organizer)
router.post('/', verifyAuthToken, isOrganizer, eventController.createEvent);

// [PUT] /events/:eventId - Cập nhật sự kiện (yêu cầu đăng nhập, quyền kiểm tra trong controller)
// Bỏ isOrganizer, isEventExists, isEventOwner
router.put('/:eventId', verifyAuthToken, eventController.updateEvent);

// [DELETE] /events/:eventId - Hủy sự kiện (yêu cầu đăng nhập, quyền kiểm tra trong controller)
// Bỏ isOrganizer, isEventExists, isEventOwner và đổi tên controller
router.delete('/:eventId', verifyAuthToken, eventController.cancelEventController);

// --- Nested Routes ---
// Gắn route cho reviews vào dưới một sự kiện cụ thể: /events/:eventId/reviews
router.use('/:eventId/reviews', reviewsRouter);

module.exports = router;