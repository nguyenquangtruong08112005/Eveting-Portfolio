// routes/payments.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyAuthToken } = require('../middleware/auth.middleware');

// --- API CHO MOBILE APP GỌI ---
// Mobile app gọi API này để lấy zp_trans_token
router.post(
    '/create-order', 
    verifyAuthToken, // <-- Phải đăng nhập
    paymentController.createPaymentOrder
);

// --- API CHO ZALOPAY SERVER GỌI (WEBHOOK) ---
// ZaloPay gọi API này để báo kết quả thanh toán
// API này KHÔNG cần verifyAuthToken, bảo mật bằng chữ ký (MAC)
router.post(
    '/callback', 
    paymentController.handleZaloPayCallback
);

module.exports = router;