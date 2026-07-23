const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { isAdmin } = require('@/shared/middleware/admin.middleware');
const { auditLog } = require('@/shared/middleware/authz.middleware');
const adminController = require('@/modules/admin/api/controller');

router.use(verifyAuthToken, isAdmin);

router.get('/events/pending', adminController.getPendingEvents);

router.post('/events/:id/approve', auditLog('event:approve', 'event', 'id'), adminController.approveEvent);

router.post('/events/:id/reject', auditLog('event:reject', 'event', 'id'), adminController.rejectEvent);

module.exports = router;
