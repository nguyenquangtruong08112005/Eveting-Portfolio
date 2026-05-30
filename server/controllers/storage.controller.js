// controllers/storage.controller.js
const storageService = require('../services/storage.service');

/**
 * Handle POST /storage/upload
 */
const uploadFile = async (req, res) => {
  try {
    // Authenticated upload only - verifyAuthToken guarantees req.user is set
    const userId = req.user && req.user.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: No user credentials found.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Validate mimetype: allow image/* and video/* only by default
    if (!file.mimetype || (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))) {
      return res.status(400).json({ error: 'Unsupported file type. Only image/* and video/* are allowed.' });
    }

    // Limit file size to 10MB
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return res.status(400).json({ error: 'File size limit exceeded. Max 10MB allowed.' });
    }

    const { purpose } = req.body;

    const result = await storageService.uploadFile(userId, file, purpose);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

module.exports = {
  uploadFile,
};
