// modules/storage/storage.service.js
const { v4: uuidv4 } = require('uuid');
const activeStorageProvider = require('../../providers/storage');

const SAFE_PURPOSES = ['profile', 'event', 'media', 'misc'];

/**
 * Sanitize a string to be safe as a path segment
 * @param {string} val
 * @returns {string}
 */
const sanitizePathSegment = (val) => {
  return String(val || '').replace(/[^a-zA-Z0-9-_]/g, '').trim();
};

/**
 * Upload a single file through the active storage provider
 * @param {string} userId
 * @param {object} file - The multer file object
 * @param {string} [purpose] - Optional purpose of the upload
 * @returns {Promise<object>} File metadata including key, url, contentType, originalName, size
 */
const uploadFile = async (userId, file, purpose) => {
  if (!file || !file.buffer) {
    throw new Error('No file data provided');
  }

  // Sanitize purpose and map to safe purposes
  const rawPurpose = purpose ? String(purpose).toLowerCase().trim() : 'misc';
  const finalPurpose = SAFE_PURPOSES.includes(rawPurpose) ? rawPurpose : 'misc';

  // Sanitize userId
  const safeUserId = sanitizePathSegment(userId) || 'anonymous';

  // Generate safe filename extension
  const originalName = file.originalname || 'file';
  const fileExt = originalName.includes('.') ? originalName.split('.').pop() : '';
  const safeExt = fileExt ? fileExt.replace(/[^a-zA-Z0-9]/g, '') : '';

  const timestamp = Date.now();
  const uuid = uuidv4();

  // Create namespaced key: purpose/userId/timestamp_uuid.ext
  const key = `${finalPurpose}/${safeUserId}/${timestamp}_${uuid}${safeExt ? '.' + safeExt : ''}`;

  // Upload buffer to the storage provider
  await activeStorageProvider.uploadBuffer(key, file.buffer, file.mimetype);

  // Get the public URL
  const url = await activeStorageProvider.getPublicUrl(key);

  return {
    key,
    url,
    contentType: file.mimetype,
    originalName,
    size: file.size,
  };
};

module.exports = {
  uploadFile,
  sanitizePathSegment,
};
