const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const authController = require('@/modules/auth/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const { authLimiter, resendVerificationLimiter } = require('@/shared/middleware/rateLimit.middleware');

router.post('/register', authLimiter, [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').optional({ values: 'null' }).isString().withMessage('Name must be a string'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.register);

router.post('/login', authLimiter, [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], authController.login);

router.post('/refresh', [
    body('refreshToken').custom((value, { req }) => {
        const isWeb = (req.baseUrl || req.originalUrl || '').includes('/api/web') || Boolean(req.cookies && (req.cookies.refreshToken || req.cookies.refresh_token));
        if (isWeb) return true;
        if (!value) throw new Error('Refresh token is required');
        return true;
    }),
    validateRequest
], authController.refresh);

router.post('/logout', [
    body('refreshToken').custom((value, { req }) => {
        const isWeb = (req.baseUrl || req.originalUrl || '').includes('/api/web') || Boolean(req.cookies && (req.cookies.refreshToken || req.cookies.refresh_token));
        if (isWeb) return true;
        if (!value) throw new Error('Refresh token is required');
        return true;
    }),
    validateRequest
], authController.logout);

// Social Auth Routes & Aliases
router.post('/google', authLimiter, [
    body('idToken').notEmpty().withMessage('Google ID token is required'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.googleLogin);

router.post('/google-login', authLimiter, [
    body('idToken').notEmpty().withMessage('Google ID token is required'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.googleLogin);

router.post('/facebook', authLimiter, [
    body('accessToken').notEmpty().withMessage('Facebook access token is required'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.facebookLogin);

router.post('/facebook-login', authLimiter, [
    body('accessToken').notEmpty().withMessage('Facebook access token is required'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.facebookLogin);

// Password Reset Routes
router.post('/password-reset/request', authLimiter, [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    validateRequest
], authController.passwordResetRequest);

router.post('/password-reset/confirm', [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').notEmpty().withMessage('New password is required'),
    validateRequest
], authController.passwordResetConfirm);

// Resend Verification Email Routes & Aliases
const resendVerificationValidation = [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    validateRequest
];

router.post('/resend-verification', resendVerificationLimiter, resendVerificationValidation, authController.resendVerification);
router.post('/email-verification/request', resendVerificationLimiter, resendVerificationValidation, authController.emailVerificationRequest);

// Email Verification Confirmation / Activation Routes & Aliases
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email', authController.verifyEmail);
router.get('/email-verification/confirm', authController.verifyEmail);
router.post('/email-verification/confirm', authController.verifyEmail);

// Session Revocation
router.post('/logout-all', verifyAuthToken, authController.logoutAll);

// Mobile Attestation Routes & Aliases
router.get('/mobile/nonce', authController.getMobileNonce);
router.get('/auth/mobile/nonce', authController.getMobileNonce);
router.post('/mobile/attest', authController.attestMobileApp);
router.post('/auth/mobile/attest', authController.attestMobileApp);

module.exports = router;
