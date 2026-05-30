const express = require('express');
const { verifyAuthToken } = require('../middleware/auth.middleware');
const storageController = require('../controllers/storage.controller');
const multer = require('multer');

// Configure multer memory storage with a 10MB file size limit and single file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// Custom error handling middleware for multer to return a clean 400 Bad Request
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

// [POST] /storage/upload
router.post('/upload', verifyAuthToken, uploadMiddleware, storageController.uploadFile);

module.exports = router;
