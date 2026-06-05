const express = require('express');
const router = express.Router();
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const organizerController = require('@/modules/organizer/api/controller');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyAuthToken);

router.post('/register', organizerController.registerOrganizer);

router.use(isOrganizer);

router.get('/me', organizerController.getOrganizerProfile);

router.put('/me', organizerController.updateOrganizerProfile);

router.get('/me/events', organizerController.getMyEvents);

router.get('/me/stats', organizerController.getStatsOverview);

router.get(
    '/events/:eventId/stats',
    organizerController.verifyEventOwnership,
    organizerController.getEventStats
);

router.get(
    '/events/:eventId/attendees',
    organizerController.verifyEventOwnership,
    organizerController.getEventAttendees
);

router.post(
    '/check-in-qr',
    organizerController.checkInByQr
);

router.post(
    '/events/:eventId/attendees/import',
    organizerController.verifyEventOwnership,
    upload.single('file'),
    organizerController.importAttendees
);

router.get(
    '/events/:eventId/attendees/export',
    organizerController.verifyEventOwnership,
    organizerController.exportAttendees
);

router.post(
    '/events/:eventId/broadcast',
    organizerController.verifyEventOwnership,
    organizerController.broadcastNotification
);

module.exports = router;
