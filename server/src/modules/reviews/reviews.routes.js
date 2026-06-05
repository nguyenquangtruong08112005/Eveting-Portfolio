// routes/reviews.routes.js
const express = require('express');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const reviewController = require('./review.controller');

// mergeParams: true là BẮT BUỘC để lấy được :eventId từ router cha
const router = express.Router({ mergeParams: true });

// [GET] /events/:eventId/reviews
router.get('/', reviewController.getEventReviews);

// [POST] /events/:eventId/reviews
router.post('/', verifyAuthToken, reviewController.createReview);

module.exports = router;
