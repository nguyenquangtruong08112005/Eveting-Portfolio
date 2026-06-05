const express = require('express');
const router = express.Router();
const { verifyAuthToken, optionalAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const reviewsRouter = require('../../routes/reviews.routes');
const eventController = require('./event.controller');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
const mediaRouter = require('../../routes/media.routes');

router.get('/search', publicApiLimiter ,eventController.searchEvents);

router.get('/nearby', publicApiLimiter, eventController.findNearbyEvents);

router.get('/recommendations', verifyAuthToken, eventController.getRecommendations);

router.get('/', publicApiLimiter, eventController.getAllEvents);

router.get('/:eventId/weather', publicApiLimiter, eventController.getEventWeather);

router.get('/:eventId', publicApiLimiter, optionalAuthToken, eventController.getEventById);

router.post('/', verifyAuthToken, isOrganizer, eventController.createEvent);

router.put('/:eventId', verifyAuthToken, eventController.updateEvent);

router.delete('/:eventId', verifyAuthToken, eventController.cancelEventController);

router.use('/:eventId/reviews', reviewsRouter);

router.use('/:eventId/media', mediaRouter);

module.exports = router;
