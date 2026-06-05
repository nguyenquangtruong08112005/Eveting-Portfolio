const express = require('express');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const mediaController = require('./controller');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
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

router.get('/', mediaController.getGallery);
router.post('/', verifyAuthToken, uploadMiddleware, mediaController.uploadMedia);

module.exports = router;
