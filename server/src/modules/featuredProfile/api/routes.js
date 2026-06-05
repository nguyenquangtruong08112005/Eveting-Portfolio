const express = require('express');
const router = express.Router();
const profileController = require('@/modules/featuredProfile/api/controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');

router.get('/', publicApiLimiter, profileController.getAllProfiles);
router.get('/:profileId', publicApiLimiter, profileController.getProfileById);
router.post('/', verifyAuthToken, isOrganizer, profileController.createProfile);
router.put('/:profileId', verifyAuthToken, profileController.updateProfile);
router.delete('/:profileId', verifyAuthToken, profileController.deleteProfile);

module.exports = router;
