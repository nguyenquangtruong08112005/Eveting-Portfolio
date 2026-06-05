// routes/events.routes.js
const express = require('express');
const router = express.Router();
const { verifyAuthToken, optionalAuthToken, isOrganizer } = require('../middleware/auth.middleware');
const reviewsRouter = require('./reviews.routes');
const eventController = require('../controllers/event.controller');
const { publicApiLimiter } = require('../middleware/rateLimit.middleware');
const mediaRouter = require('./media.routes'); // <-- Import mới
// --- Đặt các route cụ thể hơn lên trước các route có param động ---

// [GET] /events/search - Tìm kiếm sự kiện với các tham số query
router.get('/search', publicApiLimiter ,eventController.searchEvents);

// [GET] /events/nearby?lat=...&lon=...&radius=... - Tìm sự kiện lân cận
// Middleware verifyAuthToken là tùy chọn ở đây, nếu muốn kết quả cá nhân hóa hơn sau này
router.get('/nearby', publicApiLimiter, eventController.findNearbyEvents);

// [GET] /events/recommendations - Gợi ý sự kiện (Yêu cầu đăng nhập)
router.get('/recommendations', verifyAuthToken, eventController.getRecommendations); 

// --- Các route GET công khai ---

// [GET] /events - Lấy danh sách tất cả sự kiện (công khai, có phân trang)
router.get('/', publicApiLimiter, eventController.getAllEvents);

// [GET] /events/:eventId/weather - Dự báo thời tiết
router.get('/:eventId/weather', publicApiLimiter, eventController.getEventWeather); 

// [GET] /events/:eventId - Lấy chi tiết một sự kiện (có kiểm tra visibility)
// Nhận req.user nếu token hợp lệ, nhưng vẫn cho phép xem event public khi token thiếu/cũ.
router.get('/:eventId', publicApiLimiter, optionalAuthToken, eventController.getEventById);

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

// Media Gallery (Thư viện ảnh/video)
router.use('/:eventId/media', mediaRouter);

module.exports = router;
