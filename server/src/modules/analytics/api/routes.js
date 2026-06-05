const express = require('express');
const router = express.Router();
const analyticsController = require('@/modules/analytics/api/controller');
const organizerController = require('@/controllers/organizer.controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');

router.get(
  '/',
  verifyAuthToken,
  isOrganizer,
  organizerController.verifyEventOwnership,
  analyticsController.getEventAnalytics
);

module.exports = router;
