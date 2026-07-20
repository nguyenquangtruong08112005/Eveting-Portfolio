const express = require('express');
const router = express.Router();
const venueController = require('@/modules/venues/api/controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');

router.get('/', verifyAuthToken, isOrganizer, venueController.getVenues);
router.get('/:id', verifyAuthToken, isOrganizer, venueController.getVenueById);
router.post('/', verifyAuthToken, isOrganizer, venueController.createVenue);
router.put('/:id', verifyAuthToken, isOrganizer, venueController.updateVenue);
router.delete('/:id', verifyAuthToken, isOrganizer, venueController.deleteVenue);

module.exports = router;
