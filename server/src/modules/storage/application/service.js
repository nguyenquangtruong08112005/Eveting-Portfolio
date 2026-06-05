const { v4: uuidv4 } = require('uuid');
const activeStorageProvider = require('@/providers/storage');

const SAFE_PURPOSES = ['profile', 'event', 'media', 'misc'];

const sanitizePathSegment = (val) => {
  return String(val || '').replace(/[^a-zA-Z0-9-_]/g, '').trim();
};

const uploadFile = async (userId, file, purpose) => {
  if (!file || !file.buffer) {
    throw new Error('No file data provided');
  }

  const rawPurpose = purpose ? String(purpose).toLowerCase().trim() : 'misc';
  const finalPurpose = SAFE_PURPOSES.includes(rawPurpose) ? rawPurpose : 'misc';

  const safeUserId = sanitizePathSegment(userId) || 'anonymous';

  const originalName = file.originalname || 'file';
  const fileExt = originalName.includes('.') ? originalName.split('.').pop() : '';
  const safeExt = fileExt ? fileExt.replace(/[^a-zA-Z0-9]/g, '') : '';

  const timestamp = Date.now();
  const uuid = uuidv4();

  const key = `${finalPurpose}/${safeUserId}/${timestamp}_${uuid}${safeExt ? '.' + safeExt : ''}`;

  await activeStorageProvider.uploadBuffer(key, file.buffer, file.mimetype);

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
