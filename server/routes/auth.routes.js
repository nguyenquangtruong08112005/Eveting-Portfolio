// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyAuthToken } = require('../middleware/auth.middleware');

// Public routes for password-based backend auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes (requires valid access token)
router.post('/logout-all', verifyAuthToken, authController.logoutAll);

module.exports = router;
