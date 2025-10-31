// routes/promotions.routes.js
const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promotion.controller');
const { verifyAuthToken } = require('../middleware/auth.middleware');
const { publicApiLimiter } = require('../middleware/rateLimit.middleware')

// [GET] /promotions - Lấy danh sách khuyến mãi đang hoạt động (công khai)
router.get('/', publicApiLimiter, promoController.getAllPromotions);

// [POST] /promotions/apply - Áp dụng mã khuyến mãi (yêu cầu đăng nhập)
// Client gửi mã code và eventId để kiểm tra
router.post('/apply', verifyAuthToken, promoController.applyPromotion);

module.exports = router;