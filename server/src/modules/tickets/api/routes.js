const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { verifyAuthToken, requireVerifiedEmail } = require('@/shared/middleware/auth.middleware');
const ticketController = require('@/modules/tickets/api/controller');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const idempotency = require('@/shared/middleware/idempotency.middleware');
const { bookingLimiter } = require('@/shared/middleware/rateLimit.middleware');
const { auditLog, requireOwnership } = require('@/shared/middleware/authz.middleware');

router.get('/',
    verifyAuthToken,
    ticketController.getCurrentUserTickets
);

router.post('/book',
    verifyAuthToken,
    requireVerifiedEmail,
    bookingLimiter,
    auditLog('ticket:book', 'ticket', 'id'),
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('ticketType').notEmpty().withMessage('ticketType is required'),
    body('quantity').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('promoCode').optional({ values: 'null' }).isString().withMessage('promoCode must be a string'),
    validateRequest,
    idempotency(),
    ticketController.bookTicket
);

router.post('/book-order',
    verifyAuthToken,
    requireVerifiedEmail,
    bookingLimiter,
    auditLog('ticket:book-order', 'event', 'eventId'),
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
    body('items.*.ticketType').notEmpty().withMessage('each item.ticketType is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('each item.quantity must be a positive integer'),
    body('promoCode').optional({ values: 'null' }).isString().withMessage('promoCode must be a string'),
    validateRequest,
    idempotency(),
    ticketController.bookOrderAtomic
);

router.post('/checkout',
    verifyAuthToken,
    requireVerifiedEmail,
    bookingLimiter,
    auditLog('ticket:checkout', 'event', 'eventId'),
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

router.put('/orders/:orderId/attendees',
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

router.get('/events/:eventId/seats',
    param('eventId').notEmpty().withMessage('eventId is required'),
    query('performanceId').optional().notEmpty().withMessage('performanceId cannot be empty'),
    validateRequest,
    ticketController.getPerformanceSeatAvailability
);

router.post('/events/:eventId/seats/hold',
    verifyAuthToken,
    requireVerifiedEmail,
    bookingLimiter,
    auditLog('seat:hold', 'event', 'eventId'),
    param('eventId').notEmpty().withMessage('eventId is required'),
    body('performanceId').notEmpty().withMessage('performanceId is required'),
    body('seatIds').isArray({ min: 1, max: 10 }).withMessage('seatIds must contain between 1 and 10 seats'),
    body('seatIds.*').isString().notEmpty().withMessage('each seatId must be a non-empty string'),
    validateRequest,
    idempotency(),
    ticketController.holdPerformanceSeats
);

router.delete('/events/:eventId/seats/hold',
    verifyAuthToken,
    bookingLimiter,
    auditLog('seat:release', 'event', 'eventId'),
    param('eventId').notEmpty().withMessage('eventId is required'),
    body('performanceId').notEmpty().withMessage('performanceId is required'),
    body('holdToken').notEmpty().withMessage('holdToken is required'),
    body('seatIds').optional().isArray({ min: 1, max: 10 }).withMessage('seatIds must contain between 1 and 10 seats'),
    body('seatIds.*').optional().isString().notEmpty().withMessage('each seatId must be a non-empty string'),
    validateRequest,
    ticketController.releasePerformanceSeatHold
);

router.get('/:ticketId',
    verifyAuthToken,
    param('ticketId').notEmpty().withMessage('ticketId is required'),
    validateRequest,
    requireOwnership('Ticket', 'ticketId'),
    ticketController.getTicketDetails
);

router.post('/hold-seat',
    verifyAuthToken,
    requireVerifiedEmail,
    bookingLimiter,
    auditLog('seat:hold', 'event', 'eventId'),
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('seatId').notEmpty().withMessage('seatId is required'),
    validateRequest,
    idempotency(),
    ticketController.holdSeat
);

router.post('/release-seat',
    verifyAuthToken,
    bookingLimiter,
    auditLog('seat:release', 'event', 'eventId'),
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('seatId').notEmpty().withMessage('seatId is required'),
    validateRequest,
    ticketController.releaseSeat
);

router.post('/book-held-seats',
    verifyAuthToken,
    requireVerifiedEmail,
    bookingLimiter,
    auditLog('seat:book-held', 'event', 'eventId'),
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('seatIds').isArray({ min: 1 }).withMessage('seatIds must be a non-empty array'),
    body('promoCode').optional({ values: 'null' }).isString().withMessage('promoCode must be a string'),
    validateRequest,
    idempotency(),
    ticketController.bookHeldSeats
);

router.get('/event/:eventId/seats',
    verifyAuthToken,
    param('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest,
    ticketController.getSeatsWithStatuses
);

module.exports = router;
