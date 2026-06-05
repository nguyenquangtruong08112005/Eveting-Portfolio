const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { isAdmin } = require('@/shared/middleware/admin.middleware');
const adminController = require('@/modules/admin/api/controller');

router.use(verifyAuthToken, isAdmin);

router.get('/events/pending', adminController.getPendingEvents);

router.post('/events/:id/approve', adminController.approveEvent);

router.post('/events/:id/reject', adminController.rejectEvent);

module.exports = router;
