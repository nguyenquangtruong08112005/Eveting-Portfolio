const express = require('express');
const router = express.Router();
const profileController = require('@/modules/featuredProfile/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
const {
  normalizeProfilePayload,
  profileIdValidation,
  listValidation,
  slugValidation,
  createValidation,
  updateValidation,
} = require('./validation');

router.get('/', publicApiLimiter, listValidation, profileController.getAllProfiles);
router.get('/slug/:slug', publicApiLimiter, slugValidation, profileController.getProfileBySlug);
router.get('/:profileId', publicApiLimiter, profileIdValidation, profileController.getProfileById);
router.post('/', verifyAuthToken, normalizeProfilePayload, createValidation, profileController.createProfile);
router.put('/:profileId', verifyAuthToken, normalizeProfilePayload, updateValidation, profileController.updateProfile);
router.delete('/:profileId', verifyAuthToken, profileIdValidation, profileController.deleteProfile);

module.exports = router;
