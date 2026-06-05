const express = require('express');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const reviewController = require('@/modules/reviews/api/controller');

const router = express.Router({ mergeParams: true });

router.get('/', reviewController.getEventReviews);
router.post('/', verifyAuthToken, reviewController.createReview);

module.exports = router;
