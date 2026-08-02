'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, paymentController, verifyAuthToken, requireVerifiedEmail,
  validateRequest, bookingLimiter, webhookLimiter, auditLog, requireOwnership, idempotency;
let mockAuditMiddleware, mockOwnershipMiddleware, mockIdempotencyMiddleware;

beforeEach(() => {
  mockAuditMiddleware = jest.fn();
  mockOwnershipMiddleware = jest.fn();
  mockIdempotencyMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/payments/api/controller', () => ({
    createPaymentOrder: jest.fn(),
    cancelPayment: jest.fn(),
    handleZaloPayRedirect: jest.fn(),
    handleZaloPayCallback: jest.fn(),
    manualCheckPaymentStatus: jest.fn(),
    createBulkPaymentOrder: jest.fn(),
    checkOrderPaymentStatus: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: jest.fn(),
    requireVerifiedEmail: jest.fn(),
  }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({
    bookingLimiter: jest.fn(),
    webhookLimiter: jest.fn(),
  }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    auditLog: jest.fn(() => mockAuditMiddleware),
    requireOwnership: jest.fn(() => mockOwnershipMiddleware),
  }));
  jest.mock('@/shared/middleware/idempotency.middleware', () => jest.fn(() => mockIdempotencyMiddleware));

  paymentController = require('@/modules/payments/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  requireVerifiedEmail = require('@/shared/middleware/auth.middleware').requireVerifiedEmail;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  const rateLimit = require('@/shared/middleware/rateLimit.middleware');
  bookingLimiter = rateLimit.bookingLimiter;
  webhookLimiter = rateLimit.webhookLimiter;
  const authz = require('@/shared/middleware/authz.middleware');
  auditLog = authz.auditLog;
  requireOwnership = authz.requireOwnership;
  idempotency = require('@/shared/middleware/idempotency.middleware');
});

afterEach(() => {
  jest.resetModules();
});

test('payments api routes', () => {
  require('@/modules/payments/api/routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(7);

  const isPost = (r, p) => r.method === 'POST' && r.path === p;
  const isGet = (r, p) => r.method === 'GET' && r.path === p;

  const [postCreateOrder, postCancel, getRedirect, postCallback, postCheckStatus, postBulk, postCheckOrder] = rs;

  // POST /create-order
  expect(isPost(postCreateOrder, '/create-order')).toBe(true);
  expect(postCreateOrder.handlers[0]).toBe(verifyAuthToken);
  expect(postCreateOrder.handlers[1]).toBe(requireVerifiedEmail);
  expect(postCreateOrder.handlers[2]).toBe(bookingLimiter);
  expect(postCreateOrder.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('payment:create-order', 'order', 'orderId');
  expect(postCreateOrder.handlers[5]).toBe(validateRequest);
  expect(postCreateOrder.handlers[6]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(postCreateOrder.handlers[7]).toBe(paymentController.createPaymentOrder);

  // POST /cancel
  expect(isPost(postCancel, '/cancel')).toBe(true);
  expect(postCancel.handlers[0]).toBe(verifyAuthToken);
  expect(postCancel.handlers[1]).toBe(requireVerifiedEmail);
  expect(postCancel.handlers[2]).toBe(bookingLimiter);
  expect(postCancel.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('payment:cancel', 'order', 'orderId');
  expect(postCancel.handlers[5]).toBe(validateRequest);
  expect(postCancel.handlers[6]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(postCancel.handlers[7]).toBe(paymentController.cancelPayment);

  // GET /redirect-handler
  expect(isGet(getRedirect, '/redirect-handler')).toBe(true);
  expect(getRedirect.handlers[0]).toBe(paymentController.handleZaloPayRedirect);

  // POST /callback
  expect(isPost(postCallback, '/callback')).toBe(true);
  expect(postCallback.handlers[0]).toBe(webhookLimiter);
  expect(postCallback.handlers[1]).toBe(mockAuditMiddleware);
  expect(postCallback.handlers[2]).toBe(paymentController.handleZaloPayCallback);

  // POST /check-status
  expect(isPost(postCheckStatus, '/check-status')).toBe(true);
  expect(postCheckStatus.handlers[0]).toBe(verifyAuthToken);
  expect(postCheckStatus.handlers[1]).toBe(bookingLimiter);
  expect(postCheckStatus.handlers[2]).toBe(mockAuditMiddleware);
  expect(postCheckStatus.handlers[4]).toBe(validateRequest);
  expect(postCheckStatus.handlers[5]).toBe(mockOwnershipMiddleware);
  expect(postCheckStatus.handlers[6]).toBe(mockIdempotencyMiddleware);
  expect(postCheckStatus.handlers[7]).toBe(paymentController.manualCheckPaymentStatus);

  // POST /create-order-bulk
  expect(isPost(postBulk, '/create-order-bulk')).toBe(true);
  expect(postBulk.handlers[0]).toBe(verifyAuthToken);
  expect(postBulk.handlers[1]).toBe(requireVerifiedEmail);
  expect(postBulk.handlers[2]).toBe(bookingLimiter);
  expect(postBulk.handlers[3]).toBe(mockAuditMiddleware);
  expect(postBulk.handlers[5]).toBe(validateRequest);
  expect(postBulk.handlers[6]).toBe(mockIdempotencyMiddleware);
  expect(postBulk.handlers[7]).toBe(paymentController.createBulkPaymentOrder);

  // POST /check-order-status
  expect(isPost(postCheckOrder, '/check-order-status')).toBe(true);
  expect(postCheckOrder.handlers[0]).toBe(verifyAuthToken);
  expect(postCheckOrder.handlers[1]).toBe(bookingLimiter);
  expect(postCheckOrder.handlers[2]).toBe(mockAuditMiddleware);
  expect(postCheckOrder.handlers[4]).toBe(validateRequest);
  expect(postCheckOrder.handlers[5]).toBe(mockOwnershipMiddleware);
  expect(postCheckOrder.handlers[6]).toBe(mockIdempotencyMiddleware);
  expect(postCheckOrder.handlers[7]).toBe(paymentController.checkOrderPaymentStatus);
});
