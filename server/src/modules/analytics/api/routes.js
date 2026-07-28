const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const analyticsController = require('@/modules/analytics/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const {
  requireEventPermission,
} = require('@/modules/memberships/api/organizer-rbac.middleware');

router.post(
  '/traffic',
  publicApiLimiter,
  [
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('visitorKey').isLength({ min: 8, max: 128 })
      .withMessage('visitorKey must be 8 to 128 characters'),
    body('source').optional().isIn([
      'direct',
      'facebook',
      'zalo',
      'google',
      'referral',
      'other',
    ]).withMessage('source is invalid'),
    body('rawData').optional().isObject().withMessage('rawData must be an object'),
    validateRequest,
  ],
  analyticsController.recordTraffic
);

router.get(
  '/',
  verifyAuthToken,
  [
    query('eventId').notEmpty().withMessage('eventId is required'),
    validateRequest,
  ],
  requireEventPermission('VIEW_ANALYTICS', { fromQuery: true }),
  analyticsController.getEventAnalytics
);

module.exports = router;
