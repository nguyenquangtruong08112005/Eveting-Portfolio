const express = require('express');
const router = express.Router();
const promoController = require('@/modules/promotions/api/controller');
const { verifyAuthToken, isOrganizer } = require('@/shared/middleware/auth.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');

router.get('/', publicApiLimiter, promoController.getAllPromotions);
router.post('/apply', verifyAuthToken, promoController.applyPromotion);
router.get('/organizer', verifyAuthToken, isOrganizer, promoController.getOrganizerPromotions);
router.post('/organizer', verifyAuthToken, isOrganizer, promoController.createPromotion);
router.put('/organizer/:id', verifyAuthToken, isOrganizer, promoController.updatePromotion);
router.delete('/organizer/:id', verifyAuthToken, isOrganizer, promoController.deletePromotion);

module.exports = router;
