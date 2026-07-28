const express = require('express');
const { body, param } = require('express-validator');
const { verifyAuthToken, requireVerifiedEmail } = require('@/shared/middleware/auth.middleware');
const ticketController = require('@/modules/tickets/api/controller');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const idempotency = require('@/shared/middleware/idempotency.middleware');
const { bookingLimiter } = require('@/shared/middleware/rateLimit.middleware');
const { auditLog } = require('@/shared/middleware/authz.middleware');

const router = express.Router();

// Canonical web order namespace. Ticket application services remain the owner
// so legacy mobile ticket routes and response DTOs remain unchanged.
router.post(
  '/checkout',
  verifyAuthToken,
  requireVerifiedEmail,
  bookingLimiter,
  auditLog('order:checkout', 'event', 'eventId'),
  body('eventId').notEmpty().withMessage('eventId is required'),
  body('items').isArray({ min: 1, max: 20 }).withMessage('items must contain between 1 and 20 ticket types'),
  body('items.*.ticketType').isString().notEmpty().withMessage('each item ticketType is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('each item quantity must be a positive integer'),
  body('promoCode').optional({ values: 'null' }).isString(),
  body('voucherCode').optional({ values: 'null' }).isString(),
  body('attendees').optional().isArray(),
  body('seatHold').optional().isObject(),
  validateRequest,
  idempotency(),
  ticketController.createCheckout
);

router.put(
  '/:orderId/attendees',
  verifyAuthToken,
  requireVerifiedEmail,
  bookingLimiter,
  auditLog('order:attendees', 'order', 'orderId'),
  param('orderId').notEmpty().withMessage('orderId is required'),
  body('eventId').notEmpty().withMessage('eventId is required'),
  body('attendees').isArray().withMessage('attendees must be an array'),
  validateRequest,
  idempotency(),
  ticketController.submitOrderAttendees
);

module.exports = router;
