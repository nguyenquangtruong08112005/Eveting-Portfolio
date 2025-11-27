const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const adminController = require('../controllers/admin.controller');

// Tất cả route Admin đều cần Login + Quyền Admin
// router.use(verifyAuthToken, isAdmin);

// [GET] /admin/events/pending
router.get('/events/pending', adminController.getPendingEvents);

// [POST] /admin/events/:id/approve
router.post('/events/:id/approve', adminController.approveEvent);

// [POST] /admin/events/:id/reject
router.post('/events/:id/reject', adminController.rejectEvent);

module.exports = router;