// routes/venues.routes.js
const express = require('express');
const router = express.Router();
const venueController = require('./venue.controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');

// [GET] /venues - Lấy danh sách venue (cho Organizer chọn khi tạo event)
router.get('/', verifyAuthToken, isOrganizer, venueController.getVenues);

// [POST] /venues - Tạo venue mới (cho Organizer)
router.post('/', verifyAuthToken, isOrganizer, venueController.createVenue);

module.exports = router;
