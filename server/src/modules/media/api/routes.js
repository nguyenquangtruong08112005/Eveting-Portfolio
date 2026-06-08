const express = require('express');
const { param, query } = require('express-validator');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
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

router.get('/', [
    param('eventId').notEmpty().withMessage('eventId is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest
], mediaController.getGallery);

router.post('/', verifyAuthToken, uploadMiddleware, mediaController.uploadMedia);

module.exports = router;
