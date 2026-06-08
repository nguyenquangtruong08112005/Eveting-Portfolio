// routes/payments.routes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('@/modules/payments/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

router.post(
    '/create-order',
    verifyAuthToken,
    body('ticketId').notEmpty().withMessage('ticketId is required'),
    validateRequest,
    paymentController.createPaymentOrder
);

router.post(
    '/callback',
    paymentController.handleZaloPayCallback
);

module.exports = router;
