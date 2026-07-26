const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const venueController = require('@/modules/venues/api/controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const { requireOwnership } = require('@/shared/middleware/authz.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

router.get('/', verifyAuthToken, isOrganizer, venueController.getVenues);

router.get('/:id', verifyAuthToken, isOrganizer, [
    param('id').notEmpty().withMessage('id is required'),
    validateRequest
], venueController.getVenueById);

router.post('/', verifyAuthToken, isOrganizer, [
    body('name').notEmpty().withMessage('name is required'),
    validateRequest
], venueController.createVenue);

router.put('/:id', verifyAuthToken, isOrganizer, requireOwnership('Venue', 'id'), [
    param('id').notEmpty().withMessage('id is required'),
    validateRequest
], venueController.updateVenue);

router.delete('/:id', verifyAuthToken, isOrganizer, requireOwnership('Venue', 'id'), [
    param('id').notEmpty().withMessage('id is required'),
    validateRequest
], venueController.deleteVenue);

module.exports = router;
