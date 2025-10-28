// routes/payments.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyPaymentWebhook } = require('../middleware/payment.middleware'); 

// [POST] /payments/callback - Xử lý webhook từ cổng thanh toán
router.post(
    '/callback', 
    verifyPaymentWebhook, 
    paymentController.handlePaymentCallback
);

module.exports = router;