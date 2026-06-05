const express = require('express');
const router = express.Router();
const authController = require('@/modules/auth/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');

// Public routes for password-based backend auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/google-login', authController.googleLogin);
router.post('/facebook-login', authController.facebookLogin);
router.post('/password-reset/request', authController.passwordResetRequest);
router.post('/password-reset/confirm', authController.passwordResetConfirm);
router.post('/email-verification/request', authController.emailVerificationRequest);
router.post('/email-verification/confirm', authController.emailVerificationConfirm);

// Protected routes (requires valid access token)
router.post('/logout-all', verifyAuthToken, authController.logoutAll);

module.exports = router;
