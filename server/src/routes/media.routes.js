const express = require('express');
const { verifyAuthToken } = require('../middleware/auth.middleware');
const mediaController = require('../controllers/media.controller');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  }
});

const uploadMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ error: err.message });
    }
    next();
  });
};

const router = express.Router({ mergeParams: true });

// [GET] /events/:eventId/media - Xem thư viện ảnh
router.get('/', mediaController.getGallery);

// [POST] /events/:eventId/media - Upload ảnh/video vào thư viện
router.post('/', verifyAuthToken, uploadMiddleware, mediaController.uploadMedia);

module.exports = router;
