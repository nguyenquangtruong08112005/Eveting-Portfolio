// routes/media.routes.js
const express = require('express');
const { verifyAuthToken } = require('../middleware/auth.middleware');
const mediaController = require('../controllers/media.controller');

const router = express.Router({ mergeParams: true });

// [GET] /events/:eventId/media - Xem thư viện ảnh
router.get('/', mediaController.getGallery);

// [POST] /events/:eventId/media - Upload ảnh/video vào thư viện
router.post('/', verifyAuthToken, mediaController.uploadMedia);

module.exports = router;