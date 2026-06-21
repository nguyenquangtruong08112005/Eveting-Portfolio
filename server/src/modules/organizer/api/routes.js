const express = require('express');
const router = express.Router();
const { param, body, query } = require('express-validator');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const organizerController = require('@/modules/organizer/api/controller');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const { auditLog } = require('@/shared/middleware/authz.middleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyAuthToken);

router.post('/register', auditLog('organizer:register', 'organizer', 'userId'), organizerController.registerOrganizer);

router.use(isOrganizer);

router.get('/me', organizerController.getOrganizerProfile);

router.get('/ledger', organizerController.getLedger);

router.put('/me', organizerController.updateOrganizerProfile);

router.get('/me/events', [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest
], organizerController.getMyEvents);

router.get('/me/stats', organizerController.getStatsOverview);

router.get(
    '/events/:eventId/stats',
    [
        param('eventId').notEmpty().withMessage('eventId is required'),
        validateRequest
    ],
    organizerController.verifyEventOwnership,
    organizerController.getEventStats
);

router.get(
    '/events/:eventId/attendees',
    [
        param('eventId').notEmpty().withMessage('eventId is required'),
        validateRequest
    ],
    organizerController.verifyEventOwnership,
    organizerController.getEventAttendees
);

router.post('/check-in-qr', auditLog('ticket:check-in', 'ticket', 'qrToken'), organizerController.checkInByQr);

router.post(
    '/events/:eventId/attendees/import',
    [
        param('eventId').notEmpty().withMessage('eventId is required'),
        validateRequest
    ],
    organizerController.verifyEventOwnership,
    upload.single('file'),
    auditLog('attendees:import', 'event', 'eventId'),
    organizerController.importAttendees
);

router.get(
    '/events/:eventId/attendees/export',
    [
        param('eventId').notEmpty().withMessage('eventId is required'),
        validateRequest
    ],
    organizerController.verifyEventOwnership,
    auditLog('attendees:export', 'event', 'eventId'),
    organizerController.exportAttendees
);

router.post(
    '/events/:eventId/broadcast',
    [
        param('eventId').notEmpty().withMessage('eventId is required'),
        body('title').notEmpty().withMessage('title is required'),
        body('message').notEmpty().withMessage('message is required'),
        validateRequest
    ],
    organizerController.verifyEventOwnership,
    auditLog('notification:broadcast', 'event', 'eventId'),
    organizerController.broadcastNotification
);

module.exports = router;
