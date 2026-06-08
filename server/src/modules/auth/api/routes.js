const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');
const authController = require('@/modules/auth/api/controller');
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');

router.post('/register', [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('name').optional({ values: 'null' }).isString().withMessage('Name must be a string'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.register);

router.post('/login', [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], authController.login);

router.post('/refresh', [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validateRequest
], authController.refresh);

router.post('/logout', [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validateRequest
], authController.logout);

router.post('/google-login', [
    body('idToken').notEmpty().withMessage('Google ID token is required'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.googleLogin);

router.post('/facebook-login', [
    body('accessToken').notEmpty().withMessage('Facebook access token is required'),
    body('role').optional({ values: 'null' }).isIn(['user', 'organizer']).withMessage('Role must be user or organizer'),
    validateRequest
], authController.facebookLogin);

router.post('/password-reset/request', [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    validateRequest
], authController.passwordResetRequest);

router.post('/password-reset/confirm', [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').notEmpty().withMessage('New password is required'),
    validateRequest
], authController.passwordResetConfirm);

router.post('/email-verification/request', [
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    validateRequest
], authController.emailVerificationRequest);

router.post('/email-verification/confirm', [
    body('token').notEmpty().withMessage('Token is required'),
    validateRequest
], authController.emailVerificationConfirm);

router.post('/logout-all', verifyAuthToken, authController.logoutAll);

module.exports = router;
