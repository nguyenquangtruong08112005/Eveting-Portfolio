const express = require('express');
const router = express.Router();
const venueController = require('@/modules/venues/api/controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');

router.get('/', verifyAuthToken, isOrganizer, venueController.getVenues);

router.post('/', verifyAuthToken, isOrganizer, venueController.createVenue);

module.exports = router;
