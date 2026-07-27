const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
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
