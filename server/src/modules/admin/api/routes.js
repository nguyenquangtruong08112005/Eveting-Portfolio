const express = require('express');
const router = express.Router();
const { param, body, query } = require('express-validator');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { isAdmin } = require('@/shared/middleware/admin.middleware');
const { requireRole, auditLog } = require('@/shared/middleware/authz.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const adminController = require('@/modules/admin/api/controller');
const idempotency = require('@/shared/middleware/idempotency.middleware');

router.use(verifyAuthToken, isAdmin, requireRole('admin'));

router.get('/events/pending', adminController.getPendingEvents);

router.post('/events/:id/approve', [
    param('id').notEmpty().withMessage('id is required'),
    validateRequest
], auditLog('event:approve', 'event', 'id'), adminController.approveEvent);

router.post('/events/:id/reject', [
    param('id').notEmpty().withMessage('id is required'),
    validateRequest
], auditLog('event:reject', 'event', 'id'), adminController.rejectEvent);

router.get(
    '/payouts',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isIn(['submitting', 'pending_provider_submission', 'pending_admin_approval', 'processing', 'completed', 'failed']),
        validateRequest
    ],
    adminController.getPayoutList
);

router.post(
    '/payouts/:id/approve',
    idempotency(),
    [
        param('id').notEmpty().withMessage('payout id is required'),
        body('reason').optional().isString(),
        validateRequest
    ],
    auditLog('payout:approve', 'payout', 'id'),
    adminController.approvePayout
);

module.exports = router;
