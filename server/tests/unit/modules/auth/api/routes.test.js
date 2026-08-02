'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, authController, verifyAuthToken, validateRequest, authLimiter, resendVerificationLimiter;

function isPost(r, p) { return r.method === 'POST' && r.path === p; }
function isGet(r, p) { return r.method === 'GET' && r.path === p; }

function expectValidationArray(arr, vr) {
  expect(Array.isArray(arr)).toBe(true);
  expect(arr[arr.length - 1]).toBe(vr);
}

beforeEach(() => {
  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/auth/api/controller', () => ({
    register: jest.fn(), login: jest.fn(), refresh: jest.fn(), logout: jest.fn(),
    logoutAll: jest.fn(), googleLogin: jest.fn(), facebookLogin: jest.fn(),
    passwordResetRequest: jest.fn(), passwordResetConfirm: jest.fn(),
    emailVerificationRequest: jest.fn(), resendVerification: jest.fn(),
    verifyEmail: jest.fn(), getMobileNonce: jest.fn(), attestMobileApp: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({ verifyAuthToken: jest.fn() }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({
    authLimiter: jest.fn(), resendVerificationLimiter: jest.fn(),
  }));

  authController = require('@/modules/auth/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  const rl = require('@/shared/middleware/rateLimit.middleware');
  authLimiter = rl.authLimiter;
  resendVerificationLimiter = rl.resendVerificationLimiter;
});

afterEach(() => { jest.resetModules(); });

test('auth api routes', () => {
  require('@/modules/auth/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(21);

  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9,
         r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20] = rs;

  // POST /register — authLimiter + validation array + register
  expect(isPost(r0, '/register')).toBe(true);
  expect(r0.handlers[0]).toBe(authLimiter);
  expectValidationArray(r0.handlers[1], validateRequest);
  expect(r0.handlers[2]).toBe(authController.register);

  // POST /login
  expect(isPost(r1, '/login')).toBe(true);
  expect(r1.handlers[0]).toBe(authLimiter);
  expectValidationArray(r1.handlers[1], validateRequest);
  expect(r1.handlers[2]).toBe(authController.login);

  // POST /refresh
  expect(isPost(r2, '/refresh')).toBe(true);
  expectValidationArray(r2.handlers[0], validateRequest);
  expect(r2.handlers[1]).toBe(authController.refresh);

  // POST /logout
  expect(isPost(r3, '/logout')).toBe(true);
  expectValidationArray(r3.handlers[0], validateRequest);
  expect(r3.handlers[1]).toBe(authController.logout);

  // POST /google
  expect(isPost(r4, '/google')).toBe(true);
  expect(r4.handlers[0]).toBe(authLimiter);
  expectValidationArray(r4.handlers[1], validateRequest);
  expect(r4.handlers[2]).toBe(authController.googleLogin);

  // POST /google-login
  expect(isPost(r5, '/google-login')).toBe(true);
  expect(r5.handlers[0]).toBe(authLimiter);
  expectValidationArray(r5.handlers[1], validateRequest);
  expect(r5.handlers[2]).toBe(authController.googleLogin);

  // POST /facebook
  expect(isPost(r6, '/facebook')).toBe(true);
  expect(r6.handlers[0]).toBe(authLimiter);
  expectValidationArray(r6.handlers[1], validateRequest);
  expect(r6.handlers[2]).toBe(authController.facebookLogin);

  // POST /facebook-login
  expect(isPost(r7, '/facebook-login')).toBe(true);
  expect(r7.handlers[0]).toBe(authLimiter);
  expectValidationArray(r7.handlers[1], validateRequest);
  expect(r7.handlers[2]).toBe(authController.facebookLogin);

  // POST /password-reset/request
  expect(isPost(r8, '/password-reset/request')).toBe(true);
  expect(r8.handlers[0]).toBe(authLimiter);
  expectValidationArray(r8.handlers[1], validateRequest);
  expect(r8.handlers[2]).toBe(authController.passwordResetRequest);

  // POST /password-reset/confirm
  expect(isPost(r9, '/password-reset/confirm')).toBe(true);
  expectValidationArray(r9.handlers[0], validateRequest);
  expect(r9.handlers[1]).toBe(authController.passwordResetConfirm);

  // POST /resend-verification
  expect(isPost(r10, '/resend-verification')).toBe(true);
  expect(r10.handlers[0]).toBe(resendVerificationLimiter);
  expectValidationArray(r10.handlers[1], validateRequest);
  expect(r10.handlers[2]).toBe(authController.resendVerification);

  // POST /email-verification/request
  expect(isPost(r11, '/email-verification/request')).toBe(true);
  expect(r11.handlers[0]).toBe(resendVerificationLimiter);
  expectValidationArray(r11.handlers[1], validateRequest);
  expect(r11.handlers[2]).toBe(authController.emailVerificationRequest);

  // GET /verify-email
  expect(isGet(r12, '/verify-email')).toBe(true);
  expect(r12.handlers[0]).toBe(authController.verifyEmail);

  // POST /verify-email
  expect(isPost(r13, '/verify-email')).toBe(true);
  expect(r13.handlers[0]).toBe(authController.verifyEmail);

  // GET /email-verification/confirm
  expect(isGet(r14, '/email-verification/confirm')).toBe(true);
  expect(r14.handlers[0]).toBe(authController.verifyEmail);

  // POST /email-verification/confirm
  expect(isPost(r15, '/email-verification/confirm')).toBe(true);
  expect(r15.handlers[0]).toBe(authController.verifyEmail);

  // POST /logout-all — verifyAuthToken
  expect(isPost(r16, '/logout-all')).toBe(true);
  expect(r16.handlers[0]).toBe(verifyAuthToken);
  expect(r16.handlers[1]).toBe(authController.logoutAll);

  // GET /mobile/nonce
  expect(isGet(r17, '/mobile/nonce')).toBe(true);
  expect(r17.handlers[0]).toBe(authController.getMobileNonce);

  // GET /auth/mobile/nonce
  expect(isGet(r18, '/auth/mobile/nonce')).toBe(true);
  expect(r18.handlers[0]).toBe(authController.getMobileNonce);

  // POST /mobile/attest
  expect(isPost(r19, '/mobile/attest')).toBe(true);
  expect(r19.handlers[0]).toBe(authController.attestMobileApp);

  // POST /auth/mobile/attest
  expect(isPost(r20, '/auth/mobile/attest')).toBe(true);
  expect(r20.handlers[0]).toBe(authController.attestMobileApp);
});
