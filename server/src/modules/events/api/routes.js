const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const { verifyAuthToken, optionalAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const reviewsRouter = require('@/modules/reviews').router;
const eventController = require('@/modules/events/api/controller');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const mediaRouter = require('@/modules/media').router;

router.get('/search', publicApiLimiter, [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest
], eventController.searchEvents);

router.get('/nearby', publicApiLimiter, [
    query('lat').isFloat().withMessage('lat must be a valid number'),
    query('lon').isFloat().withMessage('lon must be a valid number'),
    query('radius').optional().isFloat({ min: 0 }).withMessage('radius must be a non-negative number'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest
], eventController.findNearbyEvents);

router.get('/recommendations', verifyAuthToken, [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest
], eventController.getRecommendations);

router.get('/', publicApiLimiter, [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest
], eventController.getAllEvents);

router.get('/:eventId/weather', publicApiLimiter, [
    param('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest
], eventController.getEventWeather);

router.get('/:eventId', publicApiLimiter, optionalAuthToken, [
    param('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest
], eventController.getEventById);

router.post('/', verifyAuthToken, isOrganizer, eventController.createEvent);

router.put('/:eventId', verifyAuthToken, [
    param('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest
], eventController.updateEvent);

router.delete('/:eventId', verifyAuthToken, [
    param('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest
], eventController.cancelEventController);

router.post('/:eventId/submit-draft', verifyAuthToken, [
    param('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest
], eventController.submitDraftController);

router.use('/:eventId/reviews', reviewsRouter);

router.use('/:eventId/media', mediaRouter);

module.exports = router;
