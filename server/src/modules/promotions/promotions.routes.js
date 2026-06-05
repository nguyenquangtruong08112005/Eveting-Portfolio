// routes/promotions.routes.js
const express = require('express');
const router = express.Router();
const promoController = require('./promotion.controller');
const { verifyAuthToken, isOrganizer } = require('../../middleware/auth.middleware');
const { publicApiLimiter } = require('../../middleware/rateLimit.middleware');

// --- PUBLIC ROUTES (User) ---

// [GET] /promotions - Lấy danh sách khuyến mãi đang hoạt động (công khai)
router.get('/', publicApiLimiter, promoController.getAllPromotions);

// [POST] /promotions/apply - Áp dụng mã khuyến mãi (yêu cầu đăng nhập)
router.post('/apply', verifyAuthToken, promoController.applyPromotion);


// --- ORGANIZER ROUTES (Quản lý) ---

// [GET] /promotions/organizer - Lấy danh sách mã của tôi
router.get('/organizer', verifyAuthToken, isOrganizer, promoController.getOrganizerPromotions);

// [POST] /promotions/organizer - Tạo mã mới
router.post('/organizer', verifyAuthToken, isOrganizer, promoController.createPromotion);

// [PUT] /promotions/organizer/:id - Cập nhật mã
router.put('/organizer/:id', verifyAuthToken, isOrganizer, promoController.updatePromotion);

// [DELETE] /promotions/organizer/:id - Xóa mã
router.delete('/organizer/:id', verifyAuthToken, isOrganizer, promoController.deletePromotion);

module.exports = router;
