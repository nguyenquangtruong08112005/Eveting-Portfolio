const express = require('express');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const storageController = require('./controller');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size limit exceeded. Max 10MB allowed.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ error: err.message });
    }
    next();
  });
};

const router = express.Router();

router.post('/upload', verifyAuthToken, uploadMiddleware, storageController.uploadFile);

module.exports = router;
