const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const ticketController = require('@/modules/tickets/api/controller');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

router.get('/',
    verifyAuthToken,
    ticketController.getCurrentUserTickets
);

router.post('/book',
    verifyAuthToken,
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('ticketType').notEmpty().withMessage('ticketType is required'),
    body('quantity').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('promoCode').optional({ values: 'null' }).isString().withMessage('promoCode must be a string'),
    validateRequest,
    ticketController.bookTicket
);

router.get('/:ticketId',
    verifyAuthToken,
    param('ticketId').notEmpty().withMessage('ticketId is required'),
    validateRequest,
    ticketController.getTicketDetails
);

router.post('/hold-seat',
    verifyAuthToken,
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('seatId').notEmpty().withMessage('seatId is required'),
    validateRequest,
    ticketController.holdSeat
);

router.post('/release-seat',
    verifyAuthToken,
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('seatId').notEmpty().withMessage('seatId is required'),
    validateRequest,
    ticketController.releaseSeat
);

router.post('/book-held-seats',
    verifyAuthToken,
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('seatIds').isArray({ min: 1 }).withMessage('seatIds must be a non-empty array'),
    body('promoCode').optional({ values: 'null' }).isString().withMessage('promoCode must be a string'),
    validateRequest,
    ticketController.bookHeldSeats
);

module.exports = router;
