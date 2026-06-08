// providers/storage/local.js
// In-memory storage provider for development/testing.
// Default when STORAGE_PROVIDER is not set. No env vars required.

const config = require('@/shared/config/env.config');
const store = new Map();

const uploadBuffer = async (key, buffer, contentType) => {
  store.set(key, { buffer, contentType, uploadedAt: Date.now() });
};

const deleteObject = async (key) => {
  store.delete(key);
};

const getPublicUrl = async (key) => {
  const baseUrl = config.appPublicUrl || 'http://localhost:3000';
  return `${baseUrl.replace(/\/+$/, '')}/public/${key}`;
};

const getSignedReadUrl = async (_key, _expiresIn) => {
  return null;
};

const getObjectBuffer = async (key) => {
  const item = store.get(key);
  if (!item) {
    throw new Error(`Object with key "${key}" not found in local storage`);
  }
  return item.buffer;
};

const getObjectMetadata = async (key) => {
  const item = store.get(key);
  if (!item) {
    throw new Error(`Object with key "${key}" not found in local storage`);
  }
  return { contentType: item.contentType };
};

module.exports = { uploadBuffer, deleteObject, getPublicUrl, getSignedReadUrl, getObjectBuffer, getObjectMetadata };
