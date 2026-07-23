// routes/payments.routes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('@/modules/payments/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const { bookingLimiter, webhookLimiter } = require('@/shared/middleware/rateLimit.middleware');
const { auditLog } = require('@/shared/middleware/authz.middleware');

router.post(
    '/create-order',
    verifyAuthToken,
    bookingLimiter,
    auditLog('payment:create-order', 'ticket', 'ticketId'),
    body('ticketId').notEmpty().withMessage('ticketId is required'),
    validateRequest,
    paymentController.createPaymentOrder
);

router.get(
    '/redirect-handler',
    paymentController.handleZaloPayRedirect
);

router.post(
    '/callback',
    webhookLimiter,
    auditLog('payment:callback', 'ticket', 'ticketId'),
    paymentController.handleZaloPayCallback
);

router.post(
    '/check-status',
    verifyAuthToken,
    bookingLimiter,
    auditLog('payment:check-status', 'ticket', 'ticketId'),
    body('ticketId').notEmpty().withMessage('ticketId is required'),
    validateRequest,
    paymentController.manualCheckPaymentStatus
);

module.exports = router;
