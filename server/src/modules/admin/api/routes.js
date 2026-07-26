const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { isAdmin } = require('@/shared/middleware/admin.middleware');
const { requireRole, auditLog } = require('@/shared/middleware/authz.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const adminController = require('@/modules/admin/api/controller');

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

module.exports = router;
