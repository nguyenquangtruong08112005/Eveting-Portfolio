const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
const voucherController = require('@/modules/vouchers/api/controller');

router.post('/validate', publicApiLimiter, [
    body('code').isString().notEmpty().withMessage('code is required'),
    body('orderTotal').isNumeric().withMessage('orderTotal must be a number'),
    body('eventId').optional().isString(),
    validateRequest
], voucherController.validateVoucher);

module.exports = router;
