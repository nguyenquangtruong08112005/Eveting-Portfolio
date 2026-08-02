'use strict';

const { stubExpress } = require('../../helpers/mockExpressRouter');
let mockExpress, ticketController, verifyAuthToken, requireVerifiedEmail,
  validateRequest, idempotency, bookingLimiter, auditLog;
let mockAuditMiddleware, mockIdempotencyMiddleware;

beforeEach(() => {
  mockAuditMiddleware = jest.fn();
  mockIdempotencyMiddleware = jest.fn();

  mockExpress = stubExpress();
  jest.mock('express', () => mockExpress);
  jest.mock('@/modules/tickets/api/controller', () => ({
    createCheckout: jest.fn(),
    submitOrderAttendees: jest.fn(),
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: jest.fn(),
    requireVerifiedEmail: jest.fn(),
  }));
  jest.mock('@/shared/middleware/validateRequest.middleware', () => ({ validateRequest: jest.fn() }));
  jest.mock('@/shared/middleware/idempotency.middleware', () => jest.fn(() => mockIdempotencyMiddleware));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({ bookingLimiter: jest.fn() }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    auditLog: jest.fn(() => mockAuditMiddleware),
  }));

  ticketController = require('@/modules/tickets/api/controller');
  verifyAuthToken = require('@/shared/middleware/auth.middleware').verifyAuthToken;
  requireVerifiedEmail = require('@/shared/middleware/auth.middleware').requireVerifiedEmail;
  validateRequest = require('@/shared/middleware/validateRequest.middleware').validateRequest;
  idempotency = require('@/shared/middleware/idempotency.middleware');
  bookingLimiter = require('@/shared/middleware/rateLimit.middleware').bookingLimiter;
  auditLog = require('@/shared/middleware/authz.middleware').auditLog;
});

afterEach(() => {
  jest.resetModules();
});

test('tickets order-routes', () => {
  require('@/modules/tickets/api/order-routes');
  const router = mockExpress._servedRouters[0];
  const { _routes: rs } = router;

  expect(rs).toHaveLength(2);

  const [postCheckout, putAttendees] = rs;

  expect(postCheckout.method).toBe('POST');
  expect(postCheckout.path).toBe('/checkout');
  expect(postCheckout.handlers[0]).toBe(verifyAuthToken);
  expect(postCheckout.handlers[1]).toBe(requireVerifiedEmail);
  expect(postCheckout.handlers[2]).toBe(bookingLimiter);
  expect(postCheckout.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('order:checkout', 'event', 'eventId');
  expect(postCheckout.handlers[12]).toBe(validateRequest);
  expect(postCheckout.handlers[13]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(postCheckout.handlers[14]).toBe(ticketController.createCheckout);

  expect(putAttendees.method).toBe('PUT');
  expect(putAttendees.path).toBe('/:orderId/attendees');
  expect(putAttendees.handlers[0]).toBe(verifyAuthToken);
  expect(putAttendees.handlers[1]).toBe(requireVerifiedEmail);
  expect(putAttendees.handlers[2]).toBe(bookingLimiter);
  expect(putAttendees.handlers[3]).toBe(mockAuditMiddleware);
  expect(auditLog).toHaveBeenCalledWith('order:attendees', 'order', 'orderId');
  expect(putAttendees.handlers[7]).toBe(validateRequest);
  expect(putAttendees.handlers[8]).toBe(mockIdempotencyMiddleware);
  expect(idempotency).toHaveBeenCalled();
  expect(putAttendees.handlers[9]).toBe(ticketController.submitOrderAttendees);
});
