const express = require('express');
const { body } = require('express-validator');
const voucherController = require('@/modules/vouchers/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

const router = express.Router();

const rejectClientDiscount = body().custom((payload) => {
  const forbiddenFields = [
    'discount',
    'discountAmount',
    'discountValue',
    'totalAmount',
    'breakdown',
  ];
  if (
    payload &&
    forbiddenFields.some((field) => Object.prototype.hasOwnProperty.call(payload, field))
  ) {
    throw new Error('Client-provided discount amounts are not accepted');
  }
  return true;
});

router.post(
  '/validate',
  verifyAuthToken,
  publicApiLimiter,
  [
    body('code')
      .isString()
      .trim()
      .matches(/^[A-Za-z0-9_]+$/)
      .withMessage('code contains unsupported characters'),
    body('orderTotal')
      .isInt({ min: 0 })
      .withMessage('orderTotal must be a non-negative integer VND amount'),
    body('eventId').optional({ nullable: true }).isString(),
    body('ticketQuantity').optional().isInt({ min: 1 }),
    rejectClientDiscount,
    validateRequest,
  ],
  voucherController.validateVoucher
);

router.post(
  '/quote',
  verifyAuthToken,
  publicApiLimiter,
  [
    body('code').optional().isString(),
    body('promoCode').optional().isString(),
    body('voucherCode').optional().isString(),
    body('codes').optional().isArray({ max: 1 }),
    body('subtotalVnd')
      .isInt({ min: 0 })
      .withMessage('subtotalVnd must be a non-negative integer VND amount'),
    body('eventId').isString().notEmpty(),
    body('ticketQuantity').optional().isInt({ min: 1 }),
    rejectClientDiscount,
    validateRequest,
  ],
  voucherController.quoteVoucher
);

module.exports = router;
